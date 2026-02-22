# AI Discovery Platform Integration — Design Document

**Version:** 1.0 | **Date:** 2026-02-22 | **Spec:** AI Discovery v1.2.0
**For:** Platform developers integrating AI Discovery (Odoo, Django, Rails, etc.)
**Reference implementation:** Rootz WordPress Plugin v2.0.1

---

## 1. What is AI Discovery?

AI Discovery is an open standard that lets websites publish structured, machine-readable data about themselves at `/.well-known/ai`. Think of it as "robots.txt, but for AI agents" — except instead of telling crawlers what NOT to do, it tells AI agents what your organization IS and what they CAN do.

When a user asks ChatGPT, Claude, or Gemini about your company, the AI agent can fetch `https://yourdomain.com/.well-known/ai` and get authoritative, structured information directly from you — instead of scraping HTML and guessing.

### Why It Matters

- **Control your narrative**: AI agents use YOUR words, not scraped/hallucinated content
- **Structured data**: JSON endpoints, not HTML parsing
- **Policy enforcement**: Tell AI agents your content license, quoting rules, training preferences
- **Verifiable origin**: Cryptographic signing proves data comes from your domain
- **Discoverable tools**: AI agents can find and use your site's API tools

---

## 2. Architecture — Three-Tier Endpoints

```
Tier 1: Discovery (REQUIRED)
GET /.well-known/ai → ai.json
├── Organization identity
├── Policies (license, quoting, training)
├── Capabilities (what endpoints exist)
├── Core concepts (glossary)
├── Site map with semantic purpose
└── _signature (cryptographic proof)

Tier 2: Extended (RECOMMENDED)
GET /.well-known/ai/knowledge → knowledge.json
├── Full organizational encyclopedia
├── Detailed glossary with categories
├── Product descriptions
├── Team backgrounds
└── Market/technology context

GET /.well-known/ai/feed → feed.json
├── AI-optimized news/update feed
├── Structured items with key facts
├── Tags, categories, related concepts
└── NOT RSS — designed for AI consumption

Tier 3: Content (OPTIONAL)
GET /.well-known/ai/content → content.json
├── Full structured site content
├── Pages, posts, media
├── Per-page content hashes
└── Assertion types (factual, editorial, creative)

Tier 4: Tools (OPTIONAL)
GET /api/tools → tools.json (or REST endpoint)
├── Available API actions
├── Input/output schemas
├── Authentication requirements
└── WebMCP browser integration
```

### Endpoint Requirements

| Endpoint | Path | Required | Content-Type |
|----------|------|----------|--------------|
| Discovery | `/.well-known/ai` | **Yes** | `application/json` |
| Knowledge | `/.well-known/ai/knowledge` | Recommended | `application/json` |
| Feed | `/.well-known/ai/feed` | Recommended | `application/json` |
| Content | `/.well-known/ai/content` | Optional | `application/json` |
| Tools | Platform-specific | Optional | `application/json` |

### HTTP Headers (All Endpoints)

```
Content-Type: application/json
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600
X-Robots-Tag: index, follow
```

---

## 3. Discovery Endpoint — Field Reference

This is the main `/.well-known/ai` response. Every field marked **required** must be present for the scanner to score it.

```json
{
  "$schema": "https://rootz.global/ai/schemas/ai-discovery-v1.2.json",
  "specVersion": "1.2.0",
  "standard": "rootz-ai-discovery",
  "generated": "2026-02-22T12:00:00Z",

  "organization": {
    "name": "Your Company",
    "domain": "example.com",
    "tagline": "Short elevator pitch",
    "mission": "What you do and why",
    "sector": ["Technology", "AI Infrastructure"],
    "legalName": "Your Company Inc.",
    "founded": "2024",
    "headquarters": "City, State, Country"
  },

  "contact": {
    "email": "info@example.com",
    "url": "https://example.com/contact",
    "operator": "Jane Smith",
    "ai_email": "ai@example.com",
    "privacy_email": "privacy@example.com"
  },

  "aiSummary": "Write this as if explaining to an AI agent that needs to answer questions about you. 2-3 sentences, factual, specific.",

  "coreConcepts": [
    {
      "term": "Your Key Term",
      "definition": "What it means in your context"
    }
  ],

  "pages": [
    {
      "path": "/about",
      "title": "About Us",
      "purpose": "Company background and mission",
      "contentHash": "sha256:abc123..."
    }
  ],

  "policies": {
    "contentLicense": "cc-by-4.0",
    "allowQuoting": true,
    "allowTraining": false,
    "attributionRequired": true
  },

  "capabilities": {
    "knowledge": true,
    "feed": true,
    "content": false,
    "tools": {
      "available": true,
      "toolCount": 8,
      "protocols": ["rest-api"],
      "endpoint": "https://example.com/api/v1/tools"
    }
  },

  "knowledge": {
    "url": "https://example.com/.well-known/ai/knowledge",
    "format": "json"
  },

  "feed": {
    "url": "https://example.com/.well-known/ai/feed",
    "format": "json",
    "frequency": "weekly"
  },

  "humanReadable": "https://example.com/about",

  "_signature": {
    "signer": "0xYourWalletAddress",
    "contentHash": "sha256:...",
    "signedAt": "2026-02-22T12:00:00Z",
    "method": "ecdsa-secp256k1",
    "signature": "0x...",
    "authorization": "self-signed",
    "network": "polygon-mainnet"
  }
}
```

### Field Requirements

| Field | Required | Scanner Points | Notes |
|-------|----------|----------------|-------|
| `specVersion` | Yes | — | Must be `"1.2.0"` |
| `organization.name` | Yes | +5 | |
| `organization.domain` | Yes | +5 | |
| `organization.mission` | Yes | +5 | |
| `organization.sector` | Yes | +3 | Array of strings |
| `contact.email` | Yes | +3 | |
| `contact.ai_email` | Recommended | +2 | For AI agent developers |
| `aiSummary` | Recommended | +5 | 2-3 sentences for AI |
| `coreConcepts` | Recommended | +5 | Glossary terms |
| `pages` | Recommended | +5 | Site map with purposes |
| `pages[].contentHash` | Optional | +3 | Per-page SHA-256 |
| `policies` | Yes | +5 | License + permissions |
| `capabilities` | Yes | +3 | What endpoints exist |
| `_signature` | Recommended | +10 | Cryptographic signing |
| `_signature.method = ecdsa-*` | Optional | +5 | Full ECDSA (not hash-only) |

---

## 4. Signing Implementation

Signing is what separates "anyone could have written this JSON" from "this provably came from the domain owner." The scanner awards significant points for signing.

### Algorithm: secp256k1 ECDSA (Ethereum-compatible)

This is the same cryptography used by Ethereum, Bitcoin, and Polygon. Any platform with access to secp256k1 libraries can sign.

### What Gets Signed

1. Build the complete JSON response (all fields except `_signature`)
2. Serialize to JSON with **unescaped slashes** and **unescaped unicode**
3. Compute SHA-256 hash of the JSON string
4. Sign the hash with your private key
5. Append the `_signature` block

### Signature Block Format

```json
"_signature": {
  "signer": "0x5aAeb6053F...",
  "contentHash": "sha256:851d720e59a3281abe8c5ed52dd49105af708fd616b08ec50c7b7acefbfde032",
  "signedAt": "2026-02-22T14:30:00Z",
  "method": "ecdsa-secp256k1",
  "signature": "0xr_hex(64)s_hex(64)v_hex(2)",
  "authorization": "self-signed",
  "digitalName": "0x...",
  "network": "polygon-mainnet",
  "identityContract": "0x..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `signer` | string | Ethereum address (EIP-55 checksummed) |
| `contentHash` | string | `"sha256:" + hex(SHA-256(json_without_signature))` |
| `signedAt` | string | ISO 8601 UTC timestamp |
| `method` | string | `"ecdsa-secp256k1"` or `"hash-only"` |
| `signature` | string | `"0x" + r(64 hex) + s(64 hex) + v(2 hex)` = 132 chars |
| `authorization` | string | `"self-signed"` (Phase 0) or `"delegated"` |
| `digitalName` | string | Optional: human-readable identity |
| `network` | string | Optional: blockchain network |
| `identityContract` | string | Optional: on-chain identity contract |

### BIP-62 Low-S Normalization (Critical)

After signing, check if `s > secp256k1.n / 2`. If so, replace `s` with `n - s` and flip the recovery parameter. This prevents signature malleability and is required for Ethereum compatibility.

### Hash-Only Fallback

If signing isn't available (no crypto library, no key), you can still provide integrity:

```json
"_signature": {
  "contentHash": "sha256:...",
  "signedAt": "2026-02-22T14:30:00Z",
  "method": "hash-only",
  "authorization": "none"
}
```

The scanner gives partial credit for hash-only signatures.

### Key Management

- **Generate**: Create a secp256k1 keypair (32-byte private key)
- **Store**: Encrypt with AES-256-CBC using a platform-specific secret
- **Address**: Derive Ethereum address from public key (Keccak-256 of uncompressed pubkey, take last 20 bytes, EIP-55 checksum)
- **Never expose**: Private key stays server-side, encrypted at rest

See `signing/rootz_signer.py` for a complete Python implementation.

---

## 5. Knowledge Endpoint

The knowledge endpoint is a deep encyclopedia about your organization. Think of it as the "About page, but for AI agents."

```json
{
  "specVersion": "1.2.0",
  "schema": "ai-knowledge",
  "generated": "2026-02-22T12:00:00Z",
  "canonical_url": "https://example.com/.well-known/ai/knowledge",

  "organization": {
    "name": "Your Company",
    "description": "Extended description...",
    "slogan": "Your tagline"
  },

  "summary": "Comprehensive 2-3 paragraph description of what you do...",

  "core_concepts": [
    {
      "term": "Key Term",
      "definition": "Detailed definition",
      "category": "product",
      "synonyms": ["Alternative Name"],
      "related": ["Other Term"]
    }
  ],

  "products": [
    {
      "name": "Product Name",
      "description": "What it does",
      "url": "https://example.com/product",
      "status": "active"
    }
  ],

  "team": [
    {
      "name": "Jane Smith",
      "role": "CEO",
      "background": "Brief bio"
    }
  ],

  "_signature": { }
}
```

### Auto-Generation Strategy

For platforms like Odoo:
- Pull organization data from company settings
- Pull product catalog from `product.template` model
- Pull team from `hr.employee` or `res.users`
- Pull "about" content from website pages
- Generate core_concepts from product categories

---

## 6. Feed Endpoint

AI-optimized news feed. NOT RSS — structured for AI consumption.

```json
{
  "specVersion": "1.2.0",
  "schema": "ai-feed",
  "generated": "2026-02-22T12:00:00Z",

  "items": [
    {
      "id": "unique-id",
      "title": "Article Title",
      "url": "https://example.com/blog/article",
      "published": "2026-02-20",
      "category": "announcement",
      "tags": ["product", "launch"],
      "summary": "2-3 sentence summary of the article.",
      "keyFacts": [
        "First key takeaway",
        "Second key takeaway"
      ],
      "relatedConcepts": ["Product Name"]
    }
  ],

  "_signature": { }
}
```

### For Odoo
- Pull from `blog.post` model (Odoo Website Blog)
- Or from `mail.message` with specific subtypes
- Or from a custom news model

---

## 7. Content Endpoint

Full structured content with per-page hashing.

```json
{
  "specVersion": "1.2.0",
  "schema": "ai-content",
  "generated": "2026-02-22T12:00:00Z",

  "pages": [
    {
      "path": "/about",
      "title": "About Us",
      "type": "page",
      "purpose": "Company background",
      "assertionType": "factual",
      "excerpt": "First 50 words...",
      "fullText": "Complete page content (optional)...",
      "contentHash": "sha256:...",
      "lastModified": "2026-02-20T10:00:00Z"
    }
  ],

  "posts": [
    {
      "path": "/blog/article-slug",
      "title": "Article Title",
      "type": "post",
      "assertionType": "editorial",
      "excerpt": "First 50 words...",
      "contentHash": "sha256:...",
      "published": "2026-02-20",
      "categories": ["News"]
    }
  ],

  "_signature": { }
}
```

### Content Hashing

For each page/post:
1. Get the plain text content (strip HTML tags)
2. Normalize whitespace (collapse multiple spaces/newlines)
3. Compute `sha256:` + hex(SHA-256(normalized_text))

This allows AI agents to verify that content hasn't been tampered with between fetch and use.

### For Odoo
- Pages: `website.page` model → render to plain text → hash
- Posts: `blog.post` model → strip HTML → hash
- Products: `product.template` → description field → hash
- **Crawling alternative**: Fetch rendered pages via internal HTTP, strip HTML, hash

---

## 8. Odoo-Specific Integration Guide

### Architecture Options

**Option A: Static JSON Files (Current — Adam's approach)**
- Generate JSON files via script or Odoo module
- Serve via Nginx at `/.well-known/ai/*`
- Simple, reliable, easy to debug
- Downside: content can go stale

**Option B: Odoo Controller (Dynamic)**
- Odoo HTTP controller serves JSON responses directly
- Content always fresh from database
- Can include signing at response time
- Requires Odoo module development

**Option C: Hybrid (Recommended)**
- Odoo module generates + caches JSON in database
- Nginx serves cached files with fallback to Odoo controller
- Re-generates on content publish (via Odoo signals)
- Best of both: performance + freshness

### Odoo Data Mapping

| AI Discovery Field | Odoo Source |
|-------------------|------------|
| `organization.name` | `res.company.name` |
| `organization.domain` | `res.company.website` |
| `organization.mission` | `res.company.company_tagline` or custom field |
| `contact.email` | `res.company.email` |
| `products` | `product.template` (published) |
| `team` | `hr.employee` (public profiles) |
| `feed.items` | `blog.post` (published) |
| `pages` | `website.page` (published) |
| `content.pages` | Rendered `website.page` → stripped HTML |

### Odoo Module Structure

```
rootz_ai_discovery/
├── __manifest__.py
├── __init__.py
├── models/
│   ├── __init__.py
│   └── rootz_config.py        # Settings storage (ir.config_parameter)
├── controllers/
│   ├── __init__.py
│   └── ai_discovery.py        # HTTP controllers for endpoints
├── lib/
│   └── rootz_signer.py        # Signing library (copy from signing/)
├── data/
│   └── rootz_config_data.xml  # Default settings
├── views/
│   └── rootz_settings.xml     # Admin UI
└── static/
    └── description/
        └── icon.png
```

### Key Controller Routes

```python
from odoo import http

class AiDiscoveryController(http.Controller):

    @http.route('/.well-known/ai', type='http', auth='public',
                methods=['GET'], cors='*', csrf=False)
    def discovery(self, **kwargs):
        # Build and sign ai.json
        data = self._build_discovery()
        return http.Response(
            json.dumps(data, ensure_ascii=False),
            content_type='application/json',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            }
        )

    @http.route('/.well-known/ai/knowledge', type='http', auth='public',
                methods=['GET'], cors='*', csrf=False)
    def knowledge(self, **kwargs):
        data = self._build_knowledge()
        return http.Response(
            json.dumps(data, ensure_ascii=False),
            content_type='application/json',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            }
        )
```

### Settings Storage

Use Odoo's `ir.config_parameter` (system parameters) for configuration:

```python
# Store
self.env['ir.config_parameter'].sudo().set_param(
    'rootz.signing.address', address
)

# Retrieve
address = self.env['ir.config_parameter'].sudo().get_param(
    'rootz.signing.address', default=''
)
```

Key parameters:
- `rootz.signing.key` — AES-encrypted private key
- `rootz.signing.address` — Ethereum address (public, always readable)
- `rootz.organization.name` — Override company name for AI
- `rootz.ai.summary` — AI summary text
- `rootz.content.license` — Content license (e.g., "cc-by-4.0")
- `rootz.manifest.cache` — Cached signed manifest JSON

---

## 9. Scanner Scoring Reference

**Scanner URL: https://rootz.global/ai-discovery**

The scanner evaluates 5 tiers with a maximum score of approximately 120 points:

### Tier 1: Basic Web Presence (20 points)
- HTTPS enabled
- robots.txt present
- Sitemap present
- Meta description
- OpenGraph tags

### Tier 2: Structured Data (25 points)
- JSON-LD / Schema.org markup
- AI Discovery link tag in `<head>`
- `/.well-known/ai` returns valid JSON
- `specVersion: "1.2.0"` (MUST match)

### Tier 3: AI Discovery (30 points)
- Organization fields complete
- AI Summary present
- Core Concepts defined
- Policies declared
- Contact information (including ai_email)
- Pages array with semantic purposes

### Tier 4: Extended (25 points)
- Knowledge endpoint returns valid JSON
- Feed endpoint returns valid JSON
- Content endpoint (optional bonus)
- `llms.txt` present
- Three-tier architecture complete

### Tier 5: Trust & Verification (20 points)
- `_signature` block present
- Content hash computed
- ECDSA signature (not just hash-only)
- Signer address present
- Digital identity linked

### Grading Scale
- **A** (90-100%): Fully discoverable, signed, all tiers
- **B** (75-89%): Good presence, may be missing signing or some fields
- **C** (60-74%): Basic discovery works, missing extended tiers
- **D** (40-59%): Minimal presence
- **F** (<40%): Not discoverable

### Common Scanner Failures

1. **`specVersion` mismatch** — Must be exactly `"1.2.0"`, not `"1.1.0"` or `"1.0.0"`
2. **Missing `_signature`** — Even hash-only is better than nothing
3. **No `ai_email`** in contact — Easy +2 points
4. **Empty `coreConcepts`** — Even 3-5 terms helps significantly
5. **No pages array** — List your key pages with purpose descriptions

---

## 10. Migration from v1.1.0 to v1.2.0

If you have an existing v1.1.0 manifest:

### Required Changes
1. Update `specVersion` from `"1.1.0"` to `"1.2.0"` in ALL endpoints
2. Update `$schema` URL to `ai-discovery-v1.2.json`
3. Add `contact.ai_email` field (new in v1.2)
4. Add `capabilities` object (new in v1.2)

### Recommended Additions
5. Add `pages` array with `contentHash` per page
6. Add `tools` to capabilities (if you have REST API tools)
7. Add `canonical_content` link in discovery manifest
8. Ensure all sub-endpoints (knowledge, feed) also report `specVersion: "1.2.0"`

### Breaking Changes: None
v1.2.0 is fully backward compatible. All v1.1.0 fields still work.

---

## 11. Custodial Wallet Future (AI Authorization)

The current model is: **humans configure, servers sign**. The next evolution:

### AI Custodial Wallet (Phase 2)

```
Current:  Admin → Plugin Settings → Server Signs → Serve to AI Agent
Future:   AI Agent → OAuth → Custodial Wallet → AI Signs Own Queries
```

When an AI agent accesses a protected endpoint (e.g., Odoo CRM data), it needs authorization. The flow:

1. AI agent authenticates via OAuth 2.1
2. OAuth server provisions a custodial wallet for the AI
3. AI's requests are signed with its wallet key
4. Server verifies AI's wallet is authorized
5. Response is signed with server's wallet
6. Both signatures create a verifiable audit trail

This is relevant for platforms like Odoo where:
- Some data is public (products, blog) → unsigned access OK
- Some data requires authorization (CRM, invoices) → wallet-signed access
- AI agents need persistent identity across sessions

Implementation is documented in `docs/DESIGN-ai-custodial-wallet.md`.

---

## 12. Reference Implementations

| Platform | Implementation | Status |
|----------|---------------|--------|
| WordPress | [rootz-ai-discovery](https://rootz.global/ai-discovery) plugin | Production (v2.0.1) |
| Odoo 18/19 | `verity_ai_authority` module | In development (Adam/Verity One) |
| Static files | Nginx + JSON files | Works for any platform |
| Node.js | See `sks-rootz-platform` services | Reference code |

### WordPress Plugin Features (for parity)
- Auto-populates fields from existing site content
- AI-assisted field generation (via Claude API proxy)
- Per-page content hashing (SHA-256)
- ECDSA signing with BIP-62 low-s normalization
- Admin-approved signing (changes flagged, admin must re-sign)
- 8 REST API tools (search, verify, status, etc.)
- WebMCP browser integration (Chrome 146+)
- Analytics dashboard with request tracking
- Scanner self-scoring status endpoint

---

*AI Discovery Standard v1.2.0 — CC-BY-4.0*
*Rootz Corp | rootz.global*
