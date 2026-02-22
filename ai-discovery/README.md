# AI Discovery Integration Kit

**For platform developers integrating the AI Discovery Standard v1.2.0**

This directory contains everything needed to add AI Discovery endpoints to any platform (Odoo, Shopify, Django, Rails, etc.) — the same standard implemented by the [Rootz WordPress Plugin](https://rootz.global/ai-discovery).

## What's Here

```
ai-discovery/
├── README.md                          ← You are here
├── DESIGN-platform-integration.md     ← Full design doc (start here)
├── SCANNER-GUIDE.md                   ← How to score 95+ on the scanner
├── spec/
│   └── ai-discovery-v1.2-reference.md ← Spec field reference
├── signing/
│   ├── rootz_signer.py               ← Python signing library (Odoo/Django)
│   └── README.md                      ← Signing library docs
└── examples/
    ├── ai.json                        ← Discovery endpoint template
    ├── knowledge.json                 ← Knowledge endpoint template
    ├── feed.json                      ← Feed endpoint template
    └── content.json                   ← Content endpoint template
```

## Quick Start

1. **Read** `DESIGN-platform-integration.md` — architecture and integration guide
2. **Copy** templates from `examples/` and customize for your site
3. **Integrate** `signing/rootz_signer.py` for ECDSA signing (optional but scored)
4. **Serve** endpoints at `/.well-known/ai`, `/.well-known/ai/knowledge`, etc.
5. **Scan** at [rootz.global/ai-discovery](https://rootz.global/ai-discovery) to verify

## Scanner URL

**https://rootz.global/ai-discovery** — enter your domain, get scored on 5 tiers (120 points max).

## Spec Version

All endpoints must report `specVersion: "1.2.0"`. The scanner checks this.

## Contact

- Steven Sprague — steven@rootz.global
- Standard: [rootz.global/ai-discovery](https://rootz.global/ai-discovery)
- Plugin: [rootz.global/ai-discovery#plugin](https://rootz.global/ai-discovery)
