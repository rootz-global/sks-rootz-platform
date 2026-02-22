# Scanner Guide — How to Score 95+ on AI Discovery

**Scanner URL: https://rootz.global/ai-discovery**

Enter your domain and get scored across 5 tiers. Here's how to maximize your score.

---

## Common Issues (and Quick Fixes)

### 1. specVersion Mismatch (Most Common)

**Problem:** Scanner expects `"1.2.0"` but your manifest says `"1.1.0"` or `"1.0.0"`.

**Fix:** Update ALL endpoints:
```json
"specVersion": "1.2.0"
```

This must be in:
- `/.well-known/ai` (discovery)
- `/.well-known/ai/knowledge`
- `/.well-known/ai/feed`
- `/.well-known/ai/content`
- Any REST tool endpoints

Also update `$schema` if present:
```json
"$schema": "https://rootz.global/ai/schemas/ai-discovery-v1.2.json"
```

### 2. Missing ai_email

**Problem:** Scanner looks for `contact.ai_email` (new in v1.2).

**Fix:** Add to your discovery manifest:
```json
"contact": {
  "email": "info@example.com",
  "ai_email": "ai@example.com"
}
```

### 3. Empty Core Concepts

**Problem:** Scanner checks for `coreConcepts` array with at least 1 item.

**Fix:** Add 3-5 terms:
```json
"coreConcepts": [
  { "term": "Your Product", "definition": "What it does" },
  { "term": "Key Concept", "definition": "What it means in your context" }
]
```

### 4. No Pages Array

**Problem:** Scanner awards points for `pages` with `contentHash`.

**Fix:** List your key pages:
```json
"pages": [
  { "path": "/about", "title": "About", "purpose": "Company info" },
  { "path": "/products", "title": "Products", "purpose": "Product catalog" }
]
```

Adding `contentHash` per page earns bonus points:
```json
{ "path": "/about", "title": "About", "purpose": "Company info",
  "contentHash": "sha256:851d720e..." }
```

### 5. No Signature

**Problem:** No `_signature` block, or method is `"hash-only"`.

**Fix (quick — hash-only):**
```json
"_signature": {
  "contentHash": "sha256:HASH_OF_JSON_WITHOUT_THIS_BLOCK",
  "signedAt": "2026-02-22T12:00:00Z",
  "method": "hash-only",
  "authorization": "none"
}
```

**Fix (full — ECDSA, more points):**
Use the signing library in `signing/rootz_signer.py` to generate real signatures.

### 6. Missing Knowledge or Feed Endpoints

**Problem:** Scanner checks for Tier 2 endpoints.

**Fix:** Ensure these return valid JSON with HTTP 200:
- `/.well-known/ai/knowledge`
- `/.well-known/ai/feed`

Even minimal content scores points. See `examples/knowledge.json` and `examples/feed.json`.

### 7. No llms.txt

**Problem:** Scanner checks for `/llms.txt` (legacy LLM discovery file).

**Fix:** Create a simple text file at `/llms.txt`:
```
# Your Company
> Brief description

## About
- [About](https://example.com/about)
- [Products](https://example.com/products)

## Contact
- Email: info@example.com
```

### 8. Missing Link Tag

**Problem:** Scanner checks for AI Discovery link in HTML `<head>`.

**Fix:** Add to your site's HTML:
```html
<link rel="ai-discovery" href="/.well-known/ai" type="application/json" />
```

For Odoo (website template):
```xml
<xpath expr="//head" position="inside">
    <link rel="ai-discovery" href="/.well-known/ai" type="application/json"/>
</xpath>
```

---

## Scoring Checklist

### Tier 1: Basic Web Presence (~20 pts)
- [ ] HTTPS enabled
- [ ] robots.txt present
- [ ] Sitemap present
- [ ] Meta description on pages
- [ ] OpenGraph tags

### Tier 2: Structured Data (~25 pts)
- [ ] JSON-LD structured data (Schema.org Organization)
- [ ] AI Discovery link tag in `<head>`
- [ ] `/.well-known/ai` returns valid JSON (HTTP 200)
- [ ] `specVersion: "1.2.0"`

### Tier 3: AI Discovery Content (~30 pts)
- [ ] `organization.name` + `organization.domain`
- [ ] `organization.mission`
- [ ] `organization.sector` (array)
- [ ] `aiSummary` (2-3 sentences)
- [ ] `coreConcepts` (3+ terms)
- [ ] `policies.contentLicense`
- [ ] `contact.email` + `contact.ai_email`
- [ ] `pages` array with purposes

### Tier 4: Extended Tiers (~25 pts)
- [ ] `/.well-known/ai/knowledge` returns valid JSON
- [ ] `/.well-known/ai/feed` returns valid JSON
- [ ] Feed has actual items (not empty array)
- [ ] `llms.txt` present
- [ ] Three-tier architecture complete

### Tier 5: Trust & Verification (~20 pts)
- [ ] `_signature` block present
- [ ] `_signature.contentHash` computed
- [ ] `_signature.method: "ecdsa-secp256k1"` (full signing)
- [ ] `_signature.signer` present (wallet address)
- [ ] Pages have per-page `contentHash`

---

## Nginx Configuration Reference

For static JSON serving (works with any platform):

```nginx
# /etc/nginx/conf.d/ai_discovery.conf

# Main discovery endpoint
location = /.well-known/ai {
    alias /var/www/well-known/ai/ai.json;
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
    add_header X-Robots-Tag "index, follow";
}

# Sub-endpoints
location = /.well-known/ai/knowledge {
    alias /var/www/well-known/ai/knowledge.json;
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}

location = /.well-known/ai/feed {
    alias /var/www/well-known/ai/feed.json;
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=1800";
}

location = /.well-known/ai/content {
    alias /var/www/well-known/ai/content.json;
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}

# llms.txt
location = /llms.txt {
    alias /var/www/well-known/llms.txt;
    default_type text/plain;
}
```

---

## Testing Endpoints

```bash
# Verify all endpoints return valid JSON + HTTP 200
curl -s https://yourdomain.com/.well-known/ai | python3 -m json.tool
curl -s https://yourdomain.com/.well-known/ai/knowledge | python3 -m json.tool
curl -s https://yourdomain.com/.well-known/ai/feed | python3 -m json.tool

# Check specVersion in all endpoints
curl -s https://yourdomain.com/.well-known/ai | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('specVersion:', d.get('specVersion', 'MISSING'))
print('signature:', d.get('_signature', {}).get('method', 'MISSING'))
print('org:', d.get('organization', {}).get('name', 'MISSING'))
print('ai_email:', d.get('contact', {}).get('ai_email', 'MISSING'))
print('concepts:', len(d.get('coreConcepts', [])))
print('pages:', len(d.get('pages', [])))
"

# Check headers
curl -I https://yourdomain.com/.well-known/ai
# Should show: Content-Type: application/json
```

---

*Scanner: https://rootz.global/ai-discovery*
*Standard: AI Discovery v1.2.0 — CC-BY-4.0*
