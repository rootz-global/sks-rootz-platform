# AI Discovery Integration — Instructions for Claude

You are helping Adam integrate the AI Discovery v1.2.0 standard into his Odoo-based platform at **19a.verity.one** (Verity One Ltd.). Steven Sprague has published a complete integration kit in the SKSwave GitHub repo that you have access to.

---

## Your Reference Materials

All integration docs are in the `ai-discovery/` directory of the **sks-rootz-platform** GitHub repo (`github.com/rootz-global/sks-rootz-platform.git`):

```
ai-discovery/
├── DESIGN-platform-integration.md     ← MAIN DESIGN DOC — read this first
├── SCANNER-GUIDE.md                   ← How to score 95+ on the scanner
├── spec/
│   └── ai-discovery-v1.2-reference.md ← Every field, required vs optional
├── signing/
│   ├── rootz_signer.py               ← Python signing library (drop into Odoo)
│   └── README.md                      ← Signing library usage + Odoo example
└── examples/
    ├── ai.json                        ← Discovery endpoint template
    ├── knowledge.json                 ← Knowledge endpoint template
    ├── feed.json                      ← Feed endpoint template
    └── content.json                   ← Content endpoint template
```

**Read `DESIGN-platform-integration.md` first.** It covers everything: architecture, field specs, signing, Odoo-specific integration, scanner scoring, and the custodial wallet roadmap.

---

## Current State of 19a.verity.one

Adam's scanner report (Feb 22, 2026) shows:

- **Score: 73/95** (pre-rescan, expected 90-95 after recent fixes)
- **What's working:** Three-tier architecture (discovery + knowledge + feed), epistery-domain-v1 signing on main manifest, JSON-LD, OpenGraph, llms.txt, sitemap (68 entries), AI contact + security contact added, canonical links added, core concepts/glossary added, content endpoint added
- **Serving method:** Static JSON files via Nginx
  - Main manifest: `/opt/veritize-docker/static/.well-known/ai`
  - Knowledge: `/var/www/well-known/ai/knowledge.json`
  - Content: `/var/www/well-known/ai/content.json`
  - Feed: Served by Odoo controller (`verity_ai_authority` module)
- **Signing:** `epistery-domain-v1` method on main manifest only — sub-endpoints (knowledge, content) are unsigned

### File Locations on Server (a02)

| Endpoint | Served From |
|----------|------------|
| `/.well-known/ai` | `/opt/veritize-docker/static/.well-known/ai` |
| `/.well-known/ai/knowledge` | `/var/www/well-known/ai/knowledge.json` |
| `/.well-known/ai/content` | `/var/www/well-known/ai/content.json` |
| `/.well-known/ai/feed` | Odoo controller (`verity_ai_authority` module) |
| `/llms.txt` | `/var/www/well-known/llms.txt` |

Nginx config: `/etc/nginx/conf.d/verity_ai_well_known.conf`

---

## Immediate Fixes Needed (Priority Order)

### Fix 1: Update specVersion to 1.2.0 (CRITICAL)

The scanner at rootz.global expects `specVersion: "1.2.0"` in ALL endpoints. Adam's manifest currently reports `"1.1.0"`. This is the #1 reason the score isn't higher.

**In the main manifest** (`/.well-known/ai`):
```json
"specVersion": "1.2.0"
```

Also update the `$schema` reference if present:
```json
"$schema": "https://rootz.global/ai/schemas/ai-discovery-v1.2.json"
```

**In knowledge.json:**
Change `"version": "1.0"` to `"specVersion": "1.2.0"` (the field name changed in v1.2).

**In content.json:**
Same — add `"specVersion": "1.2.0"`.

**In the feed endpoint** (Odoo controller):
Ensure the response includes `"specVersion": "1.2.0"`.

### Fix 2: Normalize File Paths

All `.well-known/ai/*` files should live in one directory. Currently split between `/opt/veritize-docker/static/` and `/var/www/well-known/`. Consolidate to one location (recommend `/var/www/well-known/ai/`) and update Nginx config.

### Fix 3: Add capabilities Object

The discovery manifest should include a `capabilities` block telling AI agents which endpoints exist:

```json
"capabilities": {
  "knowledge": true,
  "feed": true,
  "content": true,
  "tools": {
    "available": false
  }
}
```

### Fix 4: Populate Feed Items

The feed endpoint currently returns `"items": []` (empty array). Add at least 2-3 items. Pull from recent Veritize announcements or blog posts:

```json
"items": [
  {
    "id": "veritize-platform-launch",
    "title": "Veritize Platform: AI-Validated Supply Chain Verification",
    "url": "https://19a.verity.one/veritize",
    "published": "2026-02-22",
    "category": "announcement",
    "tags": ["veritize", "provenance", "blockchain"],
    "summary": "Verity One launches Veritize, integrating AI validation with blockchain anchoring for supply chain provenance.",
    "keyFacts": [
      "Veritize combines AI validation with blockchain anchoring",
      "Supports ERP workflow integration via Odoo",
      "TRUTH MATTERS certification for verified products"
    ],
    "assertionType": "factual"
  }
]
```

### Fix 5: Add Pages Array with Content Hashes (Bonus Points)

The `pages` array in the discovery manifest is currently empty/missing. List your key pages:

```json
"pages": [
  {
    "path": "/",
    "title": "Verity One Ltd.",
    "purpose": "Company overview and verification platform",
    "contentHash": "sha256:COMPUTE_THIS"
  },
  {
    "path": "/veritize",
    "title": "Veritize Platform",
    "purpose": "Product platform for AI-validated verification",
    "contentHash": "sha256:COMPUTE_THIS"
  }
]
```

To compute contentHash: fetch the page, strip HTML to plain text, normalize whitespace, SHA-256 hash, prefix with `"sha256:"`.

```bash
# Quick way to compute a page hash:
curl -s https://19a.verity.one/ | python3 -c "
import sys, hashlib, re
from html.parser import HTMLParser
class S(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, d):
        self.text.append(d)
s = S()
s.feed(sys.stdin.read())
plain = ' '.join(s.text)
normalized = re.sub(r'\s+', ' ', plain).strip()
print('sha256:' + hashlib.sha256(normalized.encode()).hexdigest())
"
```

---

## Scanner URL

**https://rootz.global/ai-discovery**

Enter `19a.verity.one` in the domain field to scan. The scanner checks all 5 tiers and returns a score out of ~120 points with letter grade.

**Note:** The scanner is NOT at `app.epistery.com` (that domain returns NXDOMAIN). It's at `rootz.global/ai-discovery`.

---

## Signing Upgrade Path (Optional but High-Value)

Adam currently uses `epistery-domain-v1` signing on the main manifest. The scanner awards more points for `ecdsa-secp256k1` full signing with a wallet address.

### Option A: Keep epistery-domain-v1 (Current)
- Works fine, scanner recognizes it
- No code changes needed
- Lower trust score than full ECDSA

### Option B: Add ECDSA Signing via Python Library
The `signing/rootz_signer.py` in the repo is a drop-in Python library that:
- Generates secp256k1 keypairs
- Signs JSON responses with BIP-62 low-s normalization
- Encrypts keys with AES-256-CBC for storage
- Produces signatures byte-compatible with the WordPress plugin

**To integrate into Odoo:**

1. Copy `signing/rootz_signer.py` to your Odoo module's `lib/` directory
2. Install dependencies: `pip install eth-keys eth-utils pycryptodome`
3. Generate a key:
   ```python
   from lib.rootz_signer import RootzSigner
   signer = RootzSigner()
   address = signer.generate_key()
   encrypted, addr = signer.save_key('your-odoo-database-secret')
   # Store encrypted in ir.config_parameter: rootz.signing.key
   # Store addr in ir.config_parameter: rootz.signing.address
   ```
4. Sign responses:
   ```python
   from lib.rootz_signer import RootzSigner, sign_response

   def _get_signer(self):
       signer = RootzSigner()
       encrypted = self.env['ir.config_parameter'].sudo().get_param('rootz.signing.key')
       secret = self.env['ir.config_parameter'].sudo().get_param('database.secret')
       if encrypted and secret:
           signer.load_key(encrypted, secret)
       return signer

   # In your controller:
   data = build_discovery_json()
   signed = sign_response(data, signer=self._get_signer(), network='polygon-mainnet')
   ```

### Option C: Script-Based Signing (Simplest for Static Files)
If keeping static JSON files, create a signing script that:
1. Reads each JSON file
2. Removes any existing `_signature` block
3. Signs the remaining content
4. Writes the signed JSON back

```python
#!/usr/bin/env python3
"""Sign all AI Discovery JSON files."""
import json
from rootz_signer import RootzSigner, sign_response

signer = RootzSigner()
# Load your key (or generate one first time)
signer.load_key('ENCRYPTED_KEY_HERE', 'YOUR_SECRET')

files = [
    '/var/www/well-known/ai/ai.json',
    '/var/www/well-known/ai/knowledge.json',
    '/var/www/well-known/ai/content.json',
    # feed.json if served as static file
]

for path in files:
    with open(path) as f:
        data = json.load(f)

    signed = sign_response(data, signer=signer, network='polygon-mainnet')

    with open(path, 'w') as f:
        json.dump(signed, f, indent=2, ensure_ascii=False)
    print(f'Signed: {path}')
```

Run this after any content update: `python3 sign_manifests.py`

---

## Verification Checklist

After making changes, verify everything:

```bash
# 1. All endpoints return HTTP 200 + valid JSON
curl -s https://19a.verity.one/.well-known/ai | python3 -m json.tool > /dev/null && echo "OK: discovery"
curl -s https://19a.verity.one/.well-known/ai/knowledge | python3 -m json.tool > /dev/null && echo "OK: knowledge"
curl -s https://19a.verity.one/.well-known/ai/content | python3 -m json.tool > /dev/null && echo "OK: content"
curl -s https://19a.verity.one/.well-known/ai/feed | python3 -m json.tool > /dev/null && echo "OK: feed"

# 2. specVersion is 1.2.0 everywhere
for endpoint in "" "/knowledge" "/content" "/feed"; do
  version=$(curl -s "https://19a.verity.one/.well-known/ai${endpoint}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('specVersion','MISSING'))")
  echo "/.well-known/ai${endpoint}: ${version}"
done

# 3. Check signature
curl -s https://19a.verity.one/.well-known/ai | python3 -c "
import sys, json
d = json.load(sys.stdin)
sig = d.get('_signature', {})
print(f'Method: {sig.get(\"method\", \"MISSING\")}')
print(f'Signer: {sig.get(\"signer\", sig.get(\"digitalName\", \"MISSING\"))}')
print(f'Hash: {sig.get(\"contentHash\", \"MISSING\")[:40]}...')
"

# 4. Check capabilities
curl -s https://19a.verity.one/.well-known/ai | python3 -c "
import sys, json
d = json.load(sys.stdin)
caps = d.get('capabilities', {})
print(f'knowledge: {caps.get(\"knowledge\", \"MISSING\")}')
print(f'feed: {caps.get(\"feed\", \"MISSING\")}')
print(f'content: {caps.get(\"content\", \"MISSING\")}')
"

# 5. Run the scanner
echo "Scan at: https://rootz.global/ai-discovery"
echo "Enter: 19a.verity.one"
```

---

## Architecture Context

### What This Is
AI Discovery is an open standard (CC-BY-4.0) that lets websites publish structured, machine-readable data at `/.well-known/ai`. When a user asks ChatGPT, Claude, or Gemini about Verity One, the AI agent can fetch this endpoint and get authoritative information directly — instead of scraping HTML.

### Three-Tier Architecture
- **Tier 1 (Discovery):** `/.well-known/ai` — compact identity, policies, capabilities
- **Tier 2 (Extended):** `/knowledge` + `/feed` — deep encyclopedia + news
- **Tier 3 (Content):** `/content` — full structured site content with hashes

### Signing
Cryptographic signing proves the data came from the domain owner. The WordPress plugin uses secp256k1 ECDSA (Ethereum-compatible). The Python library in `signing/rootz_signer.py` produces byte-identical signatures.

### Future: AI Custodial Wallet
When AI agents need to access protected Odoo data (CRM, invoices), they'll authenticate via OAuth and get a custodial wallet. The wallet signs their requests, creating a verifiable audit trail. This is the bridge between "public AI Discovery" and "authenticated AI access to ERP data."

---

## Contact

- **Steven Sprague** — steven@rootz.global
- **Scanner:** https://rootz.global/ai-discovery
- **Standard:** https://rootz.global/ai-discovery (scroll to specification)
- **WordPress Plugin:** Live at discover.rootz.global (v2.0.1, reference implementation)
- **GitHub:** github.com/rootz-global/sks-rootz-platform (ai-discovery/ directory)
