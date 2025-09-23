# Rootz Platform - Email Data Wallet System

> Email Data Wallet system for signing emails with data wallets, using shared `~/.rootz/config.ini` configuration system and OCI MySQL support

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
- Node.js 18+
- MySQL database (OCI MySQL supported)
- Configuration setup

### Installation

```bash
cd /home/msprague/workspace/rootz/rootz-platform
npm install
```

### Configuration Setup

The Rootz Platform uses a shared configuration system at `~/.rootz/` that can be used by multiple Rootz applications.

1. Create configuration directories:
```bash
mkdir -p ~/.rootz/localhost
```

2. Copy and customize root configuration:
```bash
cp config-templates/rootz-config.ini ~/.rootz/config.ini
```

3. Copy and customize domain-specific configuration:
```bash
cp config-templates/localhost-domain.ini ~/.rootz/localhost/config.ini
```

4. Edit the configuration files with your settings:
```bash
nano ~/.rootz/config.ini           # Root/shared settings
nano ~/.rootz/localhost/config.ini # Domain-specific settings
```

### Configuration Files

The system uses a shared configuration directory that can be used by multiple Rootz applications:

```
~/.rootz/
├── config.ini              # Root/shared configuration (all apps)
├── localhost/              # Development environment
│   └── config.ini         # Domain-specific overrides
├── staging.rootz.global/   # Staging environment
│   └── config.ini
└── rootz.global/           # Production environment
    └── config.ini
```

**Configuration Priority:**
1. Environment variables (highest)
2. Domain-specific config (`~/.rootz/{domain}/config.ini`)
3. Root config (`~/.rootz/config.ini`) 
4. Default values (lowest)

### Running the Server

```bash
# Development mode
npm run dev

# Production mode  
npm start

# With external IPFS (recommended)
IPFS_URL=https://rootz.digital/api/v0 npm start

# With OCI database configured
DATABASE_PASSWORD=your-password IPFS_URL=https://rootz.digital/api/v0 npm start
```

The server will start on:
- HTTP: http://localhost:4080
- HTTPS: https://localhost:4443 (if SSL certificates are configured)

## 📋 Configuration Dependencies

### Required Environment Variables / Configuration

#### Database (OCI MySQL)
- `DATABASE_HOST` - MySQL host (default: mysql.sub07192123581.rootzvcn.oraclevcn.com)
- `DATABASE_PORT` - MySQL port (default: 3306)
- `DATABASE_NAME` - Database name (default: rootz_platform)
- `DATABASE_USERNAME` - Database username (default: admin)
- `DATABASE_PASSWORD` - **Required** - Database password
- `DATABASE_MAX_CONNECTIONS` - Connection pool size (default: 10)

#### Platform Settings
- `DOMAIN` - Domain name (default: localhost)
- `PORT` - HTTP port (default: 4080)
- `HTTPS_PORT` - HTTPS port (default: 4443)

#### Blockchain (Optional)
- `BLOCKCHAIN_SERVICE_WALLET_PRIVATE_KEY` - Service wallet private key
- `BLOCKCHAIN_RPC_URL` - Blockchain RPC endpoint
- `BLOCKCHAIN_NETWORK` - Network name (amoy, polygon, etc.)

#### Email Services (Optional)
- `EMAIL_GRAPH_TENANT_ID` - Microsoft Graph tenant ID
- `EMAIL_GRAPH_CLIENT_ID` - Microsoft Graph client ID
- `EMAIL_GRAPH_CLIENT_SECRET` - Microsoft Graph client secret

#### IPFS (Optional)
- `IPFS_URL` - IPFS API endpoint (default: https://rootz.digital/api/v0)
- `IPFS_PINATA_API_KEY` - Pinata API key  
- `IPFS_PINATA_SECRET_KEY` - Pinata secret key
- `IPFS_PINATA_JWT` - Pinata JWT token

## 🔧 OCI MySQL Configuration

For the specified OCID: `ocid1.mysqldbsystem.oc1.iad.aaaaaaaahgyziw2hfzym6ryft3aorfo77xdvohs5yw3sstd4f4k2jdgibhoa`

### Connection Configuration

```ini
[database]
host=mysql.sub07192123581.rootzvcn.oraclevcn.com
port=3306
name=rootz_platform
username=admin
password=YOUR_OCI_MYSQL_PASSWORD
maxConnections=20
ssl=true
```

### Environment Variables (Recommended)

```bash
export DATABASE_HOST="mysql.sub07192123581.rootzvcn.oraclevcn.com"
export DATABASE_PASSWORD="your-secure-password"
export DATABASE_NAME="rootz_platform"
```

### For Server Deployment

#### Prerequisites
- Ubuntu 22.04 LTS server
- Node.js 20+ LTS
- Existing website/nginx setup

#### Installation
```bash
# Clone repository
git clone https://github.com/rootz-global/sks-rootz-platform.git
cd sks-rootz-platform

# Run complete Ubuntu server setup
sudo ./scripts/setup/ubuntu-server-setup.sh

# Deploy and attach to existing website
sudo ./scripts/deploy/deploy.sh --attach-to-website
```

#### Access
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
