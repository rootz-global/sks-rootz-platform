# AI Discovery v1.2.0 — Field Reference

Quick reference for all fields in the AI Discovery standard.

## Discovery Endpoint (`/.well-known/ai`)

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | Recommended | `"https://rootz.global/ai/schemas/ai-discovery-v1.2.json"` |
| `specVersion` | string | **Yes** | Must be `"1.2.0"` |
| `standard` | string | **Yes** | Must be `"rootz-ai-discovery"` |
| `generated` | string | **Yes** | ISO 8601 UTC timestamp |
| `organization` | object | **Yes** | See below |
| `contact` | object | Recommended | See below |
| `aiSummary` | string | Recommended | 2-3 sentence AI-optimized description |
| `coreConcepts` | array | Recommended | Glossary terms |
| `pages` | array | Recommended | Site map with semantic purposes |
| `policies` | object | **Yes** | Content policies |
| `capabilities` | object | **Yes** | Available endpoints |
| `knowledge` | object | If enabled | Link to knowledge endpoint |
| `feed` | object | If enabled | Link to feed endpoint |
| `humanReadable` | string | Optional | URL to human-readable about page |
| `_signature` | object | Recommended | Cryptographic signature |

### organization Object

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **Yes** |
| `domain` | string | **Yes** |
| `tagline` | string | Recommended |
| `mission` | string | **Yes** |
| `sector` | string[] | **Yes** |
| `legalName` | string | Optional |
| `founded` | string | Optional |
| `headquarters` | string | Optional |

### contact Object

| Field | Type | Required |
|-------|------|----------|
| `email` | string | **Yes** |
| `url` | string | Optional |
| `operator` | string | Optional |
| `ai_email` | string | Recommended |
| `privacy_email` | string | Optional |

### coreConcepts Array Items

| Field | Type | Required |
|-------|------|----------|
| `term` | string | **Yes** |
| `definition` | string | **Yes** |

### pages Array Items

| Field | Type | Required |
|-------|------|----------|
| `path` | string | **Yes** |
| `title` | string | **Yes** |
| `purpose` | string | **Yes** |
| `contentHash` | string | Optional |

### policies Object

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `contentLicense` | string | **Yes** | `cc-by-4.0`, `cc-by-sa-4.0`, `cc-by-nc-4.0`, `cc-by-nc-sa-4.0`, `cc0`, `all-rights-reserved` |
| `allowQuoting` | boolean | **Yes** | |
| `allowTraining` | boolean | **Yes** | |
| `attributionRequired` | boolean | Recommended | |
| `policyPages` | object | Optional | `{ terms: url, privacy: url }` |

### capabilities Object

| Field | Type | Required |
|-------|------|----------|
| `knowledge` | boolean | **Yes** |
| `feed` | boolean | **Yes** |
| `content` | boolean | Optional |
| `tools` | object | Optional |
| `tools.available` | boolean | If tools | |
| `tools.toolCount` | integer | If tools | |
| `tools.protocols` | string[] | If tools | `["rest-api"]` and/or `["webmcp"]` |
| `tools.endpoint` | string | If tools | URL to tools manifest |

### _signature Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signer` | string | If ECDSA | Ethereum address (EIP-55) |
| `contentHash` | string | **Yes** | `"sha256:" + hex` |
| `signedAt` | string | **Yes** | ISO 8601 UTC |
| `method` | string | **Yes** | `"ecdsa-secp256k1"` or `"hash-only"` |
| `signature` | string | If ECDSA | `"0x" + r(64) + s(64) + v(2)` |
| `authorization` | string | **Yes** | `"self-signed"` or `"delegated"` |
| `digitalName` | string | Optional | Human label |
| `network` | string | Optional | `"polygon-mainnet"` etc. |
| `identityContract` | string | Optional | On-chain contract `0x...` |

---

## Knowledge Endpoint (`/.well-known/ai/knowledge`)

| Field | Type | Required |
|-------|------|----------|
| `specVersion` | string | **Yes** — `"1.2.0"` |
| `schema` | string | **Yes** — `"ai-knowledge"` |
| `generated` | string | **Yes** |
| `canonical_url` | string | Recommended |
| `organization` | object | **Yes** — `{ name, description }` |
| `summary` | string | Recommended |
| `core_concepts` | array | Recommended |
| `products` | array | Optional |
| `team` | array | Optional |
| `technology` | object | Optional |
| `_signature` | object | Recommended |

---

## Feed Endpoint (`/.well-known/ai/feed`)

| Field | Type | Required |
|-------|------|----------|
| `specVersion` | string | **Yes** — `"1.2.0"` |
| `schema` | string | **Yes** — `"ai-feed"` |
| `generated` | string | **Yes** |
| `items` | array | **Yes** |

### Feed Item Fields

| Field | Type | Required |
|-------|------|----------|
| `id` | string | **Yes** |
| `title` | string | **Yes** |
| `url` | string | **Yes** |
| `published` | string | **Yes** |
| `category` | string | Recommended |
| `tags` | string[] | Recommended |
| `summary` | string | **Yes** |
| `keyFacts` | string[] | Recommended |
| `relatedConcepts` | string[] | Optional |
| `assertionType` | string | Optional — `factual`, `editorial`, `creative-work` |

---

## Content Endpoint (`/.well-known/ai/content`)

| Field | Type | Required |
|-------|------|----------|
| `specVersion` | string | **Yes** — `"1.2.0"` |
| `schema` | string | **Yes** — `"ai-content"` |
| `generated` | string | **Yes** |
| `pages` | array | Optional |
| `posts` | array | Optional |

### Content Page/Post Fields

| Field | Type | Required |
|-------|------|----------|
| `path` | string | **Yes** |
| `title` | string | **Yes** |
| `type` | string | **Yes** — `"page"` or `"post"` |
| `purpose` | string | Optional (pages) |
| `assertionType` | string | Recommended |
| `excerpt` | string | Recommended |
| `fullText` | string | Optional (content tier only) |
| `contentHash` | string | Recommended |
| `lastModified` | string | Optional |
| `published` | string | Optional (posts) |
| `categories` | string[] | Optional (posts) |

---

## Assertion Types

| Type | Use For | AI Interpretation |
|------|---------|-------------------|
| `factual` | Product pages, About, Specs | Treat as authoritative fact |
| `editorial` | Blog posts, Opinion pieces | Treat as perspective, may differ |
| `creative-work` | Stories, Art, Fiction | Do not treat as factual claims |

---

## Content Hashing Algorithm

1. Get the page's plain text (strip all HTML tags)
2. Normalize: collapse whitespace to single spaces, trim
3. Compute: `SHA-256` of the UTF-8 bytes
4. Format: `"sha256:" + lowercase_hex_string`

```python
import hashlib, re

def content_hash(html_text: str) -> str:
    plain = strip_html(html_text)
    normalized = re.sub(r'\s+', ' ', plain).strip()
    hash_hex = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    return f'sha256:{hash_hex}'
```

---

*AI Discovery Standard v1.2.0 — CC-BY-4.0 — rootz.global*
