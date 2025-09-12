# SKS Rootz Platform Documentation

Welcome to the SKS Rootz Platform documentation. This platform follows EPISTERY architectural patterns to provide unified services for Email Wallet, Secrets Management, and AI Data Wallet functionality.

## 📚 Documentation Sections

### Architecture
- [EPISTERY Implementation](architecture/epistery-implementation.md) - How we implement EPISTERY patterns
- [Domain Configuration](deployment/configuration-guide.md) - Domain-aware configuration management  
- [Service Attachment](deployment/website-integration.md) - How services attach to existing infrastructure

### Deployment
- [Ubuntu Server Deployment](deployment/ubuntu-deployment.md) - Complete Ubuntu 22.04 deployment guide
- [Website Integration](deployment/website-integration.md) - Frontend integration with existing websites
- [Configuration Management](deployment/configuration-guide.md) - INI-based configuration system

### API Reference
- [Platform API](api/platform-api.md) - Complete API documentation
- [Email Wallet API](api/platform-api.md#email-wallet-api) - Email wallet specific endpoints
- [Secrets Management API](api/platform-api.md#secrets-management-api) - Configuration management endpoints
- [AI Wallet API](api/platform-api.md#ai-wallet-api) - AI-powered wallet creation

## 🎯 Quick Links

### Getting Started
1. [Architecture Overview](architecture/epistery-implementation.md) - Understand the EPISTERY pattern
2. [Ubuntu Deployment](deployment/ubuntu-deployment.md) - Deploy to your server
3. [Configuration Guide](deployment/configuration-guide.md) - Set up domain-specific config
4. [Website Integration](deployment/website-integration.md) - Connect frontend pages

### API Integration
1. [Platform API](api/platform-api.md) - Full API reference
2. [Client Library](deployment/website-integration.md#client-library-api-reference) - Browser JavaScript API
3. [Authentication](api/platform-api.md#base-url-and-authentication) - How to authenticate requests

## 🏗️ Architecture Overview

The SKS Rootz Platform follows these core principles:

### EPISTERY Pattern Implementation
- **Domain-Aware Configuration**: Each domain (localhost, staging.rootz.global, rootz.global) has its own configuration
- **Service Attachment**: Platform attaches to existing websites via well-known paths (`/.rootz/`)
- **INI-Based Configuration**: All secrets and settings in secure INI files, not hardcoded
- **Controller Inheritance**: Clean base controller with shared functionality

### Configuration Structure
```
~/.data-wallet/                      # EPISTERY configuration root
├── config.ini                      # Global platform settings
├── rootz.global/                   # Production domain config
│   ├── config.ini                  # Domain-specific config
│   ├── blockchain.ini              # Blockchain settings
│   └── email.ini                   # Email service config
└── localhost/                      # Development config
    └── config.ini
```

### Service Integration
```
Your Website (Port 80/443)
├── Static Pages (/var/www/html/static/pages/)
├── Nginx Reverse Proxy
└── SKS Rootz Platform APIs (/.rootz/* → localhost:3000)
```

## 🚀 Services Provided

### 1. Email Wallet Service
- **Blockchain-verified email storage** on Polygon network
- **User authorization workflow** for email wallet creation
- **Credit-based system** for service usage
- **IPFS integration** for distributed storage

### 2. Secrets Management Service  
- **Domain-aware configuration** management
- **Secure INI file storage** with proper permissions
- **Configuration rotation** and backup capabilities
- **Admin interface** for configuration updates

### 3. AI Data Wallet Service
- **AI-powered email analysis** for automated wallet creation
- **Confidence scoring** for creation recommendations
- **Human approval workflows** for AI decisions
- **Integration** with existing email wallet infrastructure

## 🔧 Development Workflow

### 1. Local Development
```bash
cd sks-rootz-platform
npm install
npm run dev          # Start development server
npm test            # Run tests
```

### 2. Configuration Setup
```bash
mkdir -p ~/.data-wallet/localhost
cp config/templates/platform.template.ini ~/.data-wallet/localhost/config.ini
# Edit configuration with your values
```

### 3. Deployment
```bash
sudo ./scripts/setup/ubuntu-server-setup.sh  # One-time setup
sudo ./scripts/deploy/deploy.sh              # Deploy updates
```

## 📊 Monitoring and Maintenance

### Health Checks
- **Service Status**: `https://rootz.global/.rootz/status`
- **Health Check**: `https://rootz.global/.rootz/health`
- **System Logs**: `sudo journalctl -u sks-rootz-platform -f`

### Maintenance Tasks
- **Database Backups**: `sudo ./scripts/maintenance/backup-database.sh`
- **SSL Renewal**: `sudo ./scripts/maintenance/update-ssl.sh`
- **Log Cleanup**: `sudo ./scripts/maintenance/log-cleanup.sh`

## 🔐 Security Features

### Configuration Security
- **INI files** stored in user home directory with 600 permissions
- **No hardcoded secrets** in source code
- **Domain isolation** prevents configuration cross-contamination

### API Security
- **HTTPS enforcement** for all communications
- **MetaMask signature verification** for user actions
- **Rate limiting** on all endpoints
- **CORS protection** with domain whitelisting

### Infrastructure Security
- **Firewall configuration** (UFW) with minimal open ports
- **Nginx security headers** (HSTS, XSS Protection, etc.)
- **Service user isolation** with restricted permissions
- **Audit logging** for all configuration changes

## 🤝 Contributing

### Development Standards
- **TypeScript strict mode** enabled
- **EPISTERY patterns** followed throughout
- **Comprehensive testing** for all functionality
- **Security-first** approach to all features

### Code Style
- **Controller inheritance** from base Controller class
- **Configuration injection** via domain middleware
- **Error handling** with structured responses
- **Logging** with appropriate levels and context

---

For specific implementation details, see the individual documentation sections linked above.
