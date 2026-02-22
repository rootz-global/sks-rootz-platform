# Rootz Signing Library — Python

ECDSA secp256k1 signing for AI Discovery endpoints. Compatible with the Rootz WordPress plugin's signature format.

## Install Dependencies

```bash
# Recommended (Ethereum-native)
pip install eth-keys eth-utils pycryptodome

# Alternative (lighter, no eth dependency)
pip install ecdsa pycryptodome pysha3
```

For Odoo, add to your module's `requirements.txt` or install system-wide.

## Quick Start

```python
from rootz_signer import RootzSigner, sign_response

# 1. Generate a keypair
signer = RootzSigner()
address = signer.generate_key()
print(f"Wallet: {address}")

# 2. Save encrypted key (store in database)
encrypted, address = signer.save_key("your-platform-secret")
# Store `encrypted` and `address` in ir.config_parameter (Odoo)

# 3. Load key in future sessions
signer = RootzSigner()
signer.load_key(encrypted, "your-platform-secret")

# 4. Sign a response
data = {
    "specVersion": "1.2.0",
    "organization": {"name": "Your Company", "domain": "example.com"}
}
signed = sign_response(data, signer=signer)
# signed now has _signature block appended
```

## Odoo Integration

```python
# In your Odoo controller:
from .lib.rootz_signer import RootzSigner, sign_response

class AiDiscoveryController(http.Controller):

    def _get_signer(self):
        signer = RootzSigner()
        encrypted = self.env['ir.config_parameter'].sudo().get_param('rootz.signing.key')
        secret = self.env['ir.config_parameter'].sudo().get_param('database.secret')
        if encrypted and secret:
            signer.load_key(encrypted, secret)
        return signer

    @http.route('/.well-known/ai', type='http', auth='public')
    def discovery(self, **kwargs):
        data = self._build_discovery()
        signer = self._get_signer()
        signed = sign_response(data, signer=signer, network='polygon-mainnet')
        return http.Response(
            json.dumps(signed, ensure_ascii=False, indent=2),
            content_type='application/json'
        )
```

## CLI Testing

```bash
# Generate a test keypair
python rootz_signer.py

# Generate + sign test data
python rootz_signer.py --test-sign

# Generate + encrypt/decrypt round-trip
python rootz_signer.py --encrypt
```

## Compatibility

Signatures produced by this library are byte-identical to those from the WordPress plugin's `Rootz_Signer` class:
- Same SHA-256 content hashing
- Same secp256k1 ECDSA signing
- Same BIP-62 low-s normalization
- Same Ethereum address derivation (Keccak-256 + EIP-55)
- Same AES-256-CBC key encryption format

A signature created by this Python library can be verified by the WordPress plugin, and vice versa.
