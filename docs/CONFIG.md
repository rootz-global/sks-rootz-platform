# SKS Rootz Platform - Configuration Guide

**Version:** 1.0  
**Target Audience:** Development Team Members  
**Configuration Pattern:** EPISTERY Domain-Aware Configuration  

---

## 🎯 Configuration Overview

The SKS Rootz Platform uses the **EPISTERY configuration pattern** with domain-aware settings stored in INI files. This approach provides:

- **Security:** No hardcoded secrets in code
- **Isolation:** Each domain/environment has separate configuration
- **Flexibility:** Easy environment switching
- **Team-Friendly:** Each developer has independent settings

---

## 📁 Configuration Structure

### **Configuration Directory Layout**
```
~/.data-wallet/                          # Root configuration directory
├── config.ini                          # Global platform settings (optional)
├── localhost/                          # Development environment
│   ├── config.ini                     # Main platform configuration
│   ├── email-graph.ini               # Microsoft Graph email settings
│   ├── blockchain.ini                # Blockchain network configuration
│   ├── secrets.ini                   # Additional secrets (optional)
│   ├── logs/                         # Log files directory
│   ├── data/                         # Application data
│   ├── backups/                      # Configuration backups
│   └── README.md                     # Configuration documentation
├── staging.rootz.global/             # Staging environment
│   └── ...
└── rootz.global/                      # Production environment
    └── ...
```

### **Configuration File Hierarchy**
1. **Global config** (`~/.data-wallet/config.ini`) - Platform defaults
2. **Domain config** (`~/.data-wallet/{domain}/config.ini`) - Domain-specific settings
3. **Service configs** (`~/.data-wallet/{domain}/service.ini`) - Service-specific settings
4. **Environment variables** (override any INI setting)

---

## ⚙️ Configuration Files

### **1. Main Platform Configuration**
**File:** `~/.data-wallet/localhost/config.ini`

```ini
# ============================================================================
# SKS Rootz Platform - Main Configuration
# Domain: localhost (development)
# ============================================================================

[platform]
# Basic platform settings
domain=localhost
port=8000
environment=development
version=1.0.0

# Platform features
enableHttps=false
enableCors=true
enableRateLimit=true

[services]
# Enable/disable platform services
emailWallet=true
secretsManagement=false
aiWallet=false

[logging]
# Logging configuration
level=info
enableConsole=true
enableFile=true
filename=platform.log
maxFileSize=10MB
maxFiles=5

[security]
# Security settings
jwtSecret=AUTO_GENERATED_ON_INIT
sessionTimeout=24h
enableApiKey=false
corsOrigins=http://localhost:3000,http://localhost:8000

[database]
# Database configuration (when not using in-memory)
provider=memory
# provider=postgresql
# connectionString=postgresql://user:pass@localhost:5432/rootz_platform

[cache]
# Cache configuration
provider=memory
# provider=redis
# connectionString=redis://localhost:6379
```

### **2. Email Service Configuration**
**File:** `~/.data-wallet/localhost/email-graph.ini`

```ini
# ============================================================================
# Email Service Configuration - Microsoft Graph API
# ============================================================================

[email.microsoftGraph]
# Enable/disable Microsoft Graph email monitoring
enabled=true

# Azure/Office 365 Application Registration Details
# Get these from: https://portal.azure.com -> App registrations
tenantId=YOUR_TENANT_ID_HERE
clientId=YOUR_CLIENT_ID_HERE
clientSecret=YOUR_CLIENT_SECRET_HERE

# Email account to monitor
userPrincipalName=process@yourdomain.com

# Monitoring settings
pollIntervalMinutes=1
maxEmailsPerPoll=10
enableAttachments=true
maxAttachmentSize=10MB

# Email processing options
autoProcessEmails=true
requireUserAuthorization=true
defaultCreditCost=3

[email.imap]
# Alternative IMAP configuration (if not using Graph API)
enabled=false
host=imap.gmail.com
port=993
secure=true
username=your-email@gmail.com
password=your-app-password
folder=INBOX
```

### **3. Blockchain Configuration**
**File:** `~/.data-wallet/localhost/blockchain.ini`

```ini
# ============================================================================
# Blockchain Configuration - Polygon Network
# ============================================================================

[blockchain]
# Blockchain network settings
network=amoy
chainId=80002
enableRealTransactions=true

# RPC endpoints
rpcUrl=https://rpc-amoy.polygon.technology/
backupRpcUrl=https://polygon-amoy-bor-rpc.publicnode.com
websocketUrl=wss://ws-matic-mumbai.chainstacklabs.com

# Service wallet (for automated operations)
# This wallet pays for gas and executes blockchain operations
serviceWalletPrivateKey=YOUR_PRIVATE_KEY_HERE
serviceWalletAddress=0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a

# Smart contract addresses (Polygon Amoy testnet)
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
contractEmailDataWallet=0x52eBB3761D36496c29FB6A3D5354C449928A4048
contractAttachmentWallet=0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7
contractAuthorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573

# Gas settings
gasLimit=500000
gasPriceMultiplier=1.1
maxGasPriceGwei=100

# Credit system
defaultUserCredits=60
emailWalletCost=3
attachmentCost=2
processingCost=1

[ipfs]
# IPFS configuration for distributed storage
provider=pinata
pinataApiKey=YOUR_PINATA_API_KEY
pinataSecretKey=YOUR_PINATA_SECRET_KEY
pinataJWT=YOUR_PINATA_JWT

# Alternative IPFS providers
# provider=infura
# provider=local
localIpfsUrl=http://localhost:5001
```

### **4. Advanced Configuration**
**File:** `~/.data-wallet/localhost/advanced.ini` (optional)

```ini
# ============================================================================
# Advanced Configuration - Optional Settings
# ============================================================================

[monitoring]
# Platform monitoring
enableHealthChecks=true
healthCheckInterval=30s
enableMetrics=true
metricsEndpoint=/.rootz/metrics

[notifications]
# Notification settings
enableEmailNotifications=true
enableSlackNotifications=false
slackWebhookUrl=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

[api]
# API configuration
enableSwagger=true
swaggerEndpoint=/.rootz/api/docs
enableVersioning=true
currentApiVersion=v1

[performance]
# Performance tuning
maxConcurrentRequests=100
requestTimeoutMs=30000
enableRequestCaching=true
cacheExpirationSeconds=300

[development]
# Development-only settings
enableDebugLogging=true
enableHotReload=false
enableTestingMode=true
mockExternalServices=false
```

---

## 🔐 Security Configuration

### **Credential Management**

#### **Never Commit Secrets**
```bash
# Configuration files are in .gitignore
# Never add these to version control:
~/.data-wallet/*/config.ini
~/.data-wallet/*/email-*.ini
~/.data-wallet/*/blockchain.ini
~/.data-wallet/*/secrets.ini
```

#### **Environment Variable Overrides**
```bash
# Override any INI setting with environment variables
export ROOTZ_BLOCKCHAIN_SERVICE_WALLET_PRIVATE_KEY="your-key-here"
export ROOTZ_EMAIL_GRAPH_CLIENT_SECRET="your-secret-here"
export ROOTZ_PLATFORM_PORT="8001"

# Environment variables use format: ROOTZ_{SECTION}_{KEY}
```

#### **Secret Rotation**
```bash
# Backup current configuration before rotating secrets
cp ~/.data-wallet/localhost/blockchain.ini ~/.data-wallet/localhost/backups/blockchain.ini.backup

# Update secrets in configuration files
# Restart platform to apply changes
rootz-platform start
```

### **Production Security**

#### **Secure File Permissions**
```bash
# Set proper permissions on configuration files
chmod 600 ~/.data-wallet/localhost/*.ini
chmod 700 ~/.data-wallet/localhost/

# Only the owner can read/write configuration files
```

#### **SSL Configuration** (Production)
```ini
[platform]
enableHttps=true
sslCertPath=/etc/ssl/certs/rootz.global.crt
sslKeyPath=/etc/ssl/private/rootz.global.key

[security]
enableHSTS=true
enableCSP=true
corsOrigins=https://rootz.global,https://www.rootz.global
```

---

## 🛠️ Configuration Management

### **CLI Configuration Commands**
```bash
# View current configuration
rootz-platform config --list

# Edit configuration (opens in default editor)
rootz-platform config --edit

# Edit specific service configuration
rootz-platform config --edit --service=email

# Backup configuration
rootz-platform config --backup

# Validate configuration
rootz-platform config --validate
```

### **Configuration Templates**

#### **Development Template**
```bash
# Create development configuration from template
rootz-platform init --template=development --domain=localhost
```

#### **Staging Template**
```bash
# Create staging configuration
rootz-platform init --template=staging --domain=staging.rootz.global
```

#### **Production Template**
```bash
# Create production configuration
rootz-platform init --template=production --domain=rootz.global --ssl
```

### **Team Configuration Sharing**

#### **Share Configuration Template** (without secrets)
```bash
# Export configuration template (secrets removed)
rootz-platform config --export-template > team-config-template.ini

# Import configuration template
rootz-platform config --import-template team-config-template.ini
```

#### **Environment-Specific Overrides**
```bash
# Create environment-specific overrides
# File: ~/.data-wallet/localhost/overrides.ini
[development-overrides]
logging.level=debug
blockchain.enableRealTransactions=false
```

---

## 🧪 Configuration for Different Scenarios

### **Development Setup**
```ini
[platform]
domain=localhost
port=8000
environment=development

[blockchain]
network=amoy
enableRealTransactions=false  # Use test mode

[email]
autoProcessEmails=false       # Manual testing
enableAttachments=false       # Simplified testing

[logging]
level=debug                   # Verbose logging
enableConsole=true
```

### **Testing/CI Setup**
```ini
[platform]
environment=test
port=0                        # Random available port

[blockchain]
network=local                 # Use local Hardhat network
enableRealTransactions=false

[database]
provider=memory               # In-memory database

[email]
enabled=false                 # Disable email monitoring for tests
```

### **Production Setup**
```ini
[platform]
domain=rootz.global
port=8000
environment=production
enableHttps=true

[blockchain]
network=polygon               # Mainnet
enableRealTransactions=true

[database]
provider=postgresql
connectionString=postgresql://user:pass@localhost:5432/rootz_platform_prod

[logging]
level=warn                    # Reduced logging
enableFile=true
enableConsole=false
```

---

## 📋 Configuration Checklist

### **Initial Setup**
- [ ] Run `rootz-platform init` to create configuration structure
- [ ] Set domain name for your environment
- [ ] Choose email service (Microsoft Graph recommended)
- [ ] Select blockchain network (Amoy testnet for development)
- [ ] Configure logging level and destinations

### **Email Configuration**
- [ ] Register application in Azure portal (for Microsoft Graph)
- [ ] Get tenant ID, client ID, and client secret
- [ ] Set up application permissions (Mail.Read, Mail.ReadWrite)
- [ ] Grant admin consent for application
- [ ] Configure monitored email account
- [ ] Test email connectivity

### **Blockchain Configuration**
- [ ] Create or import service wallet
- [ ] Fund service wallet with test POL (for Amoy testnet)
- [ ] Verify contract addresses are current
- [ ] Set appropriate gas limits and prices
- [ ] Configure IPFS provider (Pinata recommended)
- [ ] Test blockchain connectivity

### **Security Configuration**
- [ ] Set proper file permissions on configuration files
- [ ] Never commit configuration files to version control
- [ ] Use environment variables for CI/CD secrets
- [ ] Enable HTTPS for production environments
- [ ] Configure CORS origins appropriately
- [ ] Set up monitoring and alerting

### **Production Deployment**
- [ ] Use production domain name
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure production database (PostgreSQL)
- [ ] Set up Redis for caching and sessions
- [ ] Configure log rotation and monitoring
- [ ] Set up backup procedures for configuration
- [ ] Test disaster recovery procedures

---

## 🐛 Configuration Troubleshooting

### **Common Configuration Issues**

#### **Platform Won't Start**
```bash
# Check configuration syntax
rootz-platform config --validate

# Check file permissions
ls -la ~/.data-wallet/localhost/

# Check for missing required settings
grep -E "(YOUR_|CHANGEME|TODO)" ~/.data-wallet/localhost/*.ini
```

#### **Email Service Not Working**
```bash
# Verify Microsoft Graph credentials
# Check application permissions in Azure portal
# Ensure admin consent is granted
# Test email account accessibility
```

#### **Blockchain Connection Failed**
```bash
# Verify private key format (64 hex characters)
# Check service wallet has sufficient balance
# Verify RPC endpoint accessibility
# Test contract addresses exist on blockchain
```

#### **Port Already in Use**
```bash
# Change port in configuration
[platform]
port=8001

# Or specify port when starting
rootz-platform start --port=8001
```

### **Configuration Validation**
```bash
# Validate all configuration files
rootz-platform config --validate

# Test specific services
rootz-platform test --service=email
rootz-platform test --service=blockchain
rootz-platform test --service=platform
```

---

## 📚 Advanced Topics

### **Multi-Environment Management**
- Set up separate configurations for dev/staging/production
- Use environment variable overrides for secrets
- Implement configuration deployment pipelines
- Monitor configuration drift between environments

### **Configuration as Code**
- Version control configuration templates (without secrets)
- Automate configuration deployment
- Implement configuration validation in CI/CD
- Use infrastructure as code for production setups

### **Monitoring Configuration**
- Set up configuration change monitoring
- Implement configuration backup automation
- Monitor for configuration drift
- Set up alerts for configuration issues

---

**🔧 Configuration is the foundation of a secure, reliable platform. Take time to set it up properly! 🚀**
