# SKS Rootz Platform

> EPISTERY-style unified services platform for Email Wallet, Secrets Management, and AI Data Wallet

## 🎯 Overview

The SKS Rootz Platform follows the EPISTERY architectural pattern to provide a unified platform that attaches to existing web infrastructure with minimal disruption.

### Services Provided:
- **Email Wallet Service** - Blockchain-verified email data wallets
- **Secrets Management Service** - Domain-aware configuration management
- **AI Data Wallet Service** - AI-powered data wallet creation

### Architecture:
- **Domain-Aware Configuration** - Per-domain settings in `~/.data-wallet/{domain}/`
- **Service Attachment** - Attaches to existing websites via well-known paths
- **INI-Based Configuration** - File-based configuration management (no hardcoded secrets)
- **Client Library** - Browser-accessible JavaScript client

## 🚀 Quick Start

### Prerequisites
- Ubuntu 22.04 LTS server
- Node.js 20+ LTS
- Existing website/nginx setup

### Installation
```bash
# Clone repository
git clone https://github.com/rootz-global/sks-rootz-platform.git
cd sks-rootz-platform

# Run complete Ubuntu server setup
sudo ./scripts/setup/ubuntu-server-setup.sh

# Deploy and attach to existing website
sudo ./scripts/deploy/deploy.sh --attach-to-website
```

### Access
After deployment, the platform provides:
- **Service APIs:** `https://rootz.global/.rootz/`
- **Client Library:** `https://rootz.global/.rootz/lib/rootz-client.js`
- **Status Endpoint:** `https://rootz.global/.rootz/status`

Frontend pages are served from your existing website's static directory.

## 🏗️ EPISTERY Architecture

### Domain Configuration Pattern
```
~/.data-wallet/
├── config.ini                    # Global platform config
├── rootz.global/                 # Production domain
│   ├── config.ini
│   ├── email-wallet.ini
│   ├── secrets.ini
│   └── blockchain.ini
└── localhost/                    # Development domain
    └── config.ini
```

### Service Attachment
```typescript
// The platform attaches to existing Express apps
const rootz = await RootzPlatform.connect();
await rootz.attach(existingApp);

// Provides APIs under /.rootz/ paths
// Serves client library at /.rootz/lib/
// Non-invasive integration
```

### Client Usage
```html
<!-- In your frontend pages -->
<script src="/.rootz/lib/rootz-client.js"></script>
<script>
  const rootz = await RootzPlatform.connect();
  const wallets = await rootz.emailWallet.getWallets();
  const status = await rootz.getStatus();
</script>
```

## 📚 Documentation

### Architecture & Design
- **[📋 Email Wallet System Architecture](docs/architecture/Email_Wallet_Architecture_Documentation.md)** - Complete technical architecture documentation with UML diagrams, security model, and component relationships
- [EPISTERY Implementation](docs/architecture/epistery-implementation.md)

### Deployment & Configuration
- [Ubuntu Deployment Guide](docs/deployment/ubuntu-deployment.md)
- [Website Integration](docs/deployment/website-integration.md)
- [Configuration Guide](docs/deployment/configuration-guide.md)

### API & Development
- [API Reference](docs/api/)

### Key Documentation Highlights
- **System Overview:** Complete "math of ORIGIN" email-to-blockchain flow
- **UML Diagrams:** 5 detailed interaction diagrams showing component relationships
- **Security Model:** Multi-layer security architecture and cryptographic proofs
- **Provenance Verification:** What we can prove about email wallet authenticity
- **Component Analysis:** Detailed breakdown of each system component and chain data relationships

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Test
npm test
```

## 📦 Service Management

```bash
# Service status
sudo systemctl status sks-rootz-platform

# View logs
sudo journalctl -u sks-rootz-platform -f

# Restart service
sudo systemctl restart sks-rootz-platform
```

## 🤝 Contributing

This project follows EPISTERY architectural patterns:
- Domain-aware configuration
- INI-based settings
- Service attachment model
- Clean TypeScript architecture

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Built following EPISTERY architectural principles**
