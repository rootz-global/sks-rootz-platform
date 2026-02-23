"""
Rootz AI Discovery — Signing Library for Python/Odoo

Implements secp256k1 ECDSA signing compatible with the Rootz WordPress plugin.
Produces Ethereum-compatible signatures with BIP-62 low-s normalization.

Usage:
    signer = RootzSigner()
    signer.generate_key('your-platform-secret')
    sig_block = signer.sign_content(data_dict)

Dependencies:
    pip install eth-keys eth-utils pycryptodome

For Odoo: copy this file to your module's lib/ directory.
"""

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from base64 import b64encode, b64decode

# --- Crypto imports ---
# Option A: eth-keys (recommended for Odoo/Django)
try:
    from eth_keys import keys as eth_keys
    from eth_keys.datatypes import PrivateKey, PublicKey
    HAS_ETH_KEYS = True
except ImportError:
    HAS_ETH_KEYS = False

# Option B: ecdsa library (fallback)
try:
    import ecdsa
    from ecdsa.util import sigencode_string, sigdecode_string
    HAS_ECDSA = not HAS_ETH_KEYS  # Only use if eth-keys unavailable
except ImportError:
    HAS_ECDSA = False

# AES encryption for key storage
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad, unpad
    HAS_AES = True
except ImportError:
    try:
        from Cryptodome.Cipher import AES
        from Cryptodome.Util.Padding import pad, unpad
        HAS_AES = True
    except ImportError:
        HAS_AES = False

# Keccak-256 for Ethereum address derivation
try:
    from Crypto.Hash import keccak as keccak_mod
    def keccak256(data: bytes) -> bytes:
        return keccak_mod.new(digest_bits=256, data=data).digest()
except ImportError:
    try:
        from Cryptodome.Hash import keccak as keccak_mod
        def keccak256(data: bytes) -> bytes:
            return keccak_mod.new(digest_bits=256, data=data).digest()
    except ImportError:
        # Last resort: pysha3
        try:
            import sha3
            def keccak256(data: bytes) -> bytes:
                return sha3.keccak_256(data).digest()
        except ImportError:
            keccak256 = None


# secp256k1 curve order (n)
SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
SECP256K1_HALF_N = SECP256K1_N // 2


class RootzSigner:
    """
    Signing and key management for AI Discovery endpoints.

    Compatible with the Rootz WordPress plugin's Rootz_Signer class.
    Produces Ethereum-compatible secp256k1 ECDSA signatures.
    """

    def __init__(self):
        self._private_key_hex = None
        self._address = None

    # ──────────────────────────────────────────────
    # Key Generation
    # ──────────────────────────────────────────────

    def generate_key(self, encryption_secret: str = None) -> str:
        """
        Generate a new secp256k1 keypair.

        Args:
            encryption_secret: Secret for encrypting the private key at rest.
                              For Odoo: use ir.config_parameter secret or
                              Odoo's admin_passwd.

        Returns:
            Ethereum address (EIP-55 checksummed).
        """
        # Generate 32 random bytes as private key
        private_key_bytes = os.urandom(32)
        self._private_key_hex = private_key_bytes.hex()

        # Derive address
        self._address = self._derive_address(private_key_bytes)

        return self._address

    def has_key(self) -> bool:
        """Check if a private key is loaded."""
        return self._private_key_hex is not None

    @property
    def address(self) -> str:
        """Get the signer's Ethereum address."""
        return self._address or ''

    # ──────────────────────────────────────────────
    # Address Derivation (Ethereum-compatible)
    # ──────────────────────────────────────────────

    def _derive_address(self, private_key_bytes: bytes) -> str:
        """
        Derive Ethereum address from private key.

        Process:
            private_key → secp256k1 public key (uncompressed, 64 bytes without prefix)
            → Keccak-256 → last 20 bytes → EIP-55 checksum
        """
        if HAS_ETH_KEYS:
            pk = eth_keys.PrivateKey(private_key_bytes)
            return pk.public_key.to_checksum_address()

        if HAS_ECDSA:
            sk = ecdsa.SigningKey.from_string(private_key_bytes, curve=ecdsa.SECP256k1)
            vk = sk.get_verifying_key()
            # vk.to_string() gives 64 bytes (x + y, no 0x04 prefix)
            pub_bytes = vk.to_string()
            addr_bytes = keccak256(pub_bytes)[-20:]
            return self._eip55_checksum(addr_bytes.hex())

        raise RuntimeError('No secp256k1 library available. Install eth-keys or ecdsa.')

    @staticmethod
    def _eip55_checksum(address_hex: str) -> str:
        """
        Apply EIP-55 mixed-case checksum to an Ethereum address.

        Args:
            address_hex: 40-char hex string (no 0x prefix)

        Returns:
            Checksummed address with 0x prefix.
        """
        address_lower = address_hex.lower()
        hash_hex = hashlib.sha3_256(address_lower.encode()).hexdigest()

        # Note: EIP-55 uses Keccak-256, not SHA3-256
        if keccak256:
            hash_hex = keccak256(address_lower.encode()).hex()

        result = '0x'
        for i, char in enumerate(address_lower):
            if char in '0123456789':
                result += char
            elif int(hash_hex[i], 16) >= 8:
                result += char.upper()
            else:
                result += char

        return result

    # ──────────────────────────────────────────────
    # Signing
    # ──────────────────────────────────────────────

    def sign_content(self, data: dict) -> dict:
        """
        Sign a data dictionary and return a _signature block.

        This is the main method. Pass your endpoint's data dict (without _signature),
        get back a complete _signature block to append.

        Args:
            data: The JSON-serializable data to sign (must not contain _signature).

        Returns:
            dict: Complete _signature block with contentHash, signature, etc.
        """
        if not self.has_key():
            return self._hash_only_block(data)

        # 1. Serialize (matching WordPress: unescaped slashes + unicode)
        content_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))

        # 2. SHA-256 hash
        content_hash = hashlib.sha256(content_json.encode('utf-8')).hexdigest()

        # 3. Sign the hash
        signature, recovery_param = self._sign_hash(bytes.fromhex(content_hash))

        if signature is None:
            return self._hash_only_block(data)

        # 4. Build signature block
        sig_block = {
            'signer': self._address,
            'contentHash': f'sha256:{content_hash}',
            'signedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00'),
            'method': 'ecdsa-secp256k1',
            'signature': signature,
            'authorization': 'self-signed',
        }

        return sig_block

    def sign_content_full(self, data: dict, digital_name: str = '',
                          network: str = '', identity_contract: str = '') -> dict:
        """
        Sign with optional identity metadata.

        Same as sign_content() but includes digitalName, network,
        and identityContract fields.
        """
        sig_block = self.sign_content(data)

        if digital_name:
            sig_block['digitalName'] = digital_name
        if network:
            sig_block['network'] = network
        if identity_contract:
            sig_block['identityContract'] = identity_contract

        return sig_block

    def _sign_hash(self, hash_bytes: bytes):
        """
        Sign a 32-byte hash with secp256k1 ECDSA.

        Returns:
            Tuple of (signature_hex, recovery_param) or (None, None) on failure.
            signature_hex format: "0x" + r(64 hex) + s(64 hex) + v(2 hex)
        """
        private_key_bytes = bytes.fromhex(self._private_key_hex)

        if HAS_ETH_KEYS:
            pk = eth_keys.PrivateKey(private_key_bytes)
            sig = pk.sign_msg_hash(hash_bytes)

            r = sig.r
            s = sig.s
            v = sig.v

            # BIP-62 low-s normalization
            if s > SECP256K1_HALF_N:
                s = SECP256K1_N - s
                v = 1 - v  # flip recovery

            r_hex = format(r, '064x')
            s_hex = format(s, '064x')
            v_hex = format(v + 27, '02x')  # 27 or 28

            return f'0x{r_hex}{s_hex}{v_hex}', v

        if HAS_ECDSA:
            sk = ecdsa.SigningKey.from_string(private_key_bytes, curve=ecdsa.SECP256k1)
            sig_bytes = sk.sign_digest(
                hash_bytes,
                sigencode=sigencode_string
            )

            r = int.from_bytes(sig_bytes[:32], 'big')
            s = int.from_bytes(sig_bytes[32:], 'big')

            # BIP-62 low-s normalization
            v = 27
            if s > SECP256K1_HALF_N:
                s = SECP256K1_N - s
                v = 28

            r_hex = format(r, '064x')
            s_hex = format(s, '064x')
            v_hex = format(v, '02x')

            return f'0x{r_hex}{s_hex}{v_hex}', v - 27

        return None, None

    @staticmethod
    def _hash_only_block(data: dict) -> dict:
        """
        Fallback: content hash without signature.
        Used when no private key is available.
        """
        content_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        content_hash = hashlib.sha256(content_json.encode('utf-8')).hexdigest()

        return {
            'contentHash': f'sha256:{content_hash}',
            'signedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00'),
            'method': 'hash-only',
            'authorization': 'none',
        }

    # ──────────────────────────────────────────────
    # Key Storage (AES-256-CBC)
    # ──────────────────────────────────────────────

    def save_key(self, secret: str) -> tuple:
        """
        Encrypt and return the private key for storage.

        Args:
            secret: Platform secret for encryption.
                   For Odoo: hash of admin_passwd or database.secret

        Returns:
            Tuple of (encrypted_key_b64, address)
        """
        if not HAS_AES:
            raise RuntimeError('PyCryptodome not installed. Run: pip install pycryptodome')

        if not self._private_key_hex:
            raise ValueError('No key to save. Call generate_key() first.')

        # Derive AES key from secret (same approach as WordPress plugin)
        aes_key = hashlib.sha256(secret.encode('utf-8')).digest()  # 32 bytes

        # Generate random IV
        iv = os.urandom(16)

        # Encrypt
        cipher = AES.new(aes_key, AES.MODE_CBC, iv)
        plaintext = self._private_key_hex.encode('utf-8')
        ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))

        # Prepend IV to ciphertext, base64 encode
        encrypted = b64encode(iv + ciphertext).decode('ascii')

        return encrypted, self._address

    def load_key(self, encrypted_b64: str, secret: str) -> bool:
        """
        Decrypt and load a private key from storage.

        Args:
            encrypted_b64: Base64-encoded encrypted key (from save_key)
            secret: Same secret used during save_key

        Returns:
            True if key loaded successfully.
        """
        if not HAS_AES:
            raise RuntimeError('PyCryptodome not installed. Run: pip install pycryptodome')

        try:
            raw = b64decode(encrypted_b64)
            iv = raw[:16]
            ciphertext = raw[16:]

            aes_key = hashlib.sha256(secret.encode('utf-8')).digest()
            cipher = AES.new(aes_key, AES.MODE_CBC, iv)
            plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)

            self._private_key_hex = plaintext.decode('utf-8')
            self._address = self._derive_address(bytes.fromhex(self._private_key_hex))
            return True

        except Exception:
            self._private_key_hex = None
            self._address = None
            return False

    # ──────────────────────────────────────────────
    # Content Hashing Utilities
    # ──────────────────────────────────────────────

    @staticmethod
    def hash_content(text: str) -> str:
        """
        Compute content hash for a page/post.

        Args:
            text: Plain text content (HTML already stripped).

        Returns:
            Prefixed hash string: "sha256:abcdef..."
        """
        # Normalize whitespace (match WordPress behavior)
        import re
        normalized = re.sub(r'\s+', ' ', text).strip()
        hash_hex = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
        return f'sha256:{hash_hex}'

    @staticmethod
    def hash_json(data: dict) -> str:
        """
        Compute content hash for a JSON response.

        Args:
            data: Dict to hash (should NOT contain _signature).

        Returns:
            Prefixed hash string: "sha256:abcdef..."
        """
        content_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        hash_hex = hashlib.sha256(content_json.encode('utf-8')).hexdigest()
        return f'sha256:{hash_hex}'

    # ──────────────────────────────────────────────
    # Verification (for consumers)
    # ──────────────────────────────────────────────

    @staticmethod
    def verify_content_hash(data: dict, signature_block: dict) -> bool:
        """
        Verify that _signature.contentHash matches the data.

        Args:
            data: The data dict (without _signature key).
            signature_block: The _signature block to verify.

        Returns:
            True if content hash matches.
        """
        expected_hash = signature_block.get('contentHash', '')
        if not expected_hash.startswith('sha256:'):
            return False

        content_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        actual_hash = 'sha256:' + hashlib.sha256(content_json.encode('utf-8')).hexdigest()

        return actual_hash == expected_hash


# ──────────────────────────────────────────────
# Convenience: Sign a response dict
# ──────────────────────────────────────────────

def sign_response(data: dict, signer: RootzSigner = None,
                  digital_name: str = '', network: str = '',
                  identity_contract: str = '') -> dict:
    """
    Sign a response dictionary and append _signature block.

    This is the one-liner for Odoo controllers:

        data = build_ai_json()
        signed = sign_response(data, signer=my_signer)
        return json.dumps(signed)

    Args:
        data: Response dict (will be copied, not modified).
        signer: RootzSigner instance with loaded key (or None for hash-only).

    Returns:
        New dict with _signature appended.
    """
    # Remove any existing _signature
    clean = {k: v for k, v in data.items() if k != '_signature'}

    if signer and signer.has_key():
        sig = signer.sign_content_full(
            clean,
            digital_name=digital_name,
            network=network,
            identity_contract=identity_contract,
        )
    else:
        sig = RootzSigner._hash_only_block(clean)

    result = dict(clean)
    result['_signature'] = sig
    return result


# ──────────────────────────────────────────────
# CLI: Generate a key pair for testing
# ──────────────────────────────────────────────

if __name__ == '__main__':
    import sys

    signer = RootzSigner()
    address = signer.generate_key()
    print(f'Generated keypair:')
    print(f'  Address: {address}')
    print(f'  Private: {signer._private_key_hex}')

    if '--test-sign' in sys.argv:
        test_data = {
            'specVersion': '1.2.0',
            'organization': {'name': 'Test Corp', 'domain': 'test.com'},
        }
        sig = signer.sign_content(test_data)
        test_data['_signature'] = sig
        print(f'\nSigned test data:')
        print(json.dumps(test_data, indent=2, ensure_ascii=False))

    if '--encrypt' in sys.argv:
        encrypted, addr = signer.save_key('test-secret-key')
        print(f'\nEncrypted key: {encrypted}')

        # Test round-trip
        signer2 = RootzSigner()
        success = signer2.load_key(encrypted, 'test-secret-key')
        print(f'Decryption: {"OK" if success and signer2.address == address else "FAILED"}')
