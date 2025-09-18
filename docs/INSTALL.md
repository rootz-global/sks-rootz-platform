# SKS Rootz Platform - Installation Guide for Team Members

**Version:** 1.0  
**Target Audience:** Development Team Members  
**Installation Type:** NPM Package with CLI  

---

## 🎯 Quick Start (2 Minutes)

### **Step 1: Install the Platform**
```bash
# Install globally via NPM
npm install -g @rootz-global/sks-rootz-platform

# Verify installation
rootz-platform --version
```

### **Step 2: Initialize Your Environment**
```bash
# Quick start with defaults
rootz-platform init --quick-start

# OR Interactive setup (recommended)
rootz-platform init
```

### **Step 3: Start the Platform**
```bash
# Start platform services
rootz-platform start

# Check status
rootz-platform status
```

**🎉 That's it! Platform running at: http://localhost:8000/.rootz/status**

---

## 📋 Prerequisites

### **System Requirements**
- **Node.js:** 18.0.0 or higher
- **NPM:** 8.0.0 or higher
- **OS:** Windows, macOS, or Linux
- **Memory:** 2GB RAM minimum
- **Disk:** 1GB free space

### **Check Prerequisites**
```bash
# Check versions
node --version    # Should be >= 18.0.0
npm --version     # Should be >= 8.0.0

# If Node.js is missing, install from: https://nodejs.org/
```

---

## 🛠️ Detailed Installation

### **Option 1: Team Member Installation (Recommended)**

#### **Install via NPM**
```bash
# Install the platform globally
npm install -g @rootz-global/sks-rootz-platform

# Alternative: Install from GitHub (development)
npm install -g https://github.com/rootz-global/sks-rootz-platform.git
```

#### **Interactive Setup**
```bash
# Run interactive setup
rootz-platform init

# You'll be prompted for:
# - Domain name (localhost for development)
# - Environment (development/staging/production)
# - Port number (default: 8000)
# - Email service (Microsoft Graph/IMAP)
# - Blockchain network (Amoy testnet/Polygon/Local)
# - SSL setup (production only)
```

### **Option 2: Quick Development Setup**
```bash
# One-command setup for development
rootz-platform init --quick-start

# This creates default configuration:
# - Domain: localhost
# - Environment: development
# - Port: 8000
# - Email: Microsoft Graph
# - Blockchain: Polygon Amoy testnet
```

### **Option 3: Production Team Member**
```bash
# Setup for production environment
rootz-platform init --production --domain=yourdomain.com
```

---

## ⚙️ Configuration

### **Configuration Location (EPISTERY Pattern)**
Your configuration files are stored in:
```
~/.data-wallet/
├── localhost/                 # Development config
│   ├── config.ini            # Main platform settings
│   ├── email-graph.ini       # Email monitoring settings  
│   ├── blockchain.ini        # Blockchain configuration
│   └── README.md            # Configuration help
└── yourdomain.com/           # Production config (if applicable)
    └── ...
```

### **Main Configuration File**
**Location:** `~/.data-wallet/localhost/config.ini`

```ini
[platform]
domain=localhost
port=8000
environment=development

[email]
service=graph
enabled=true

[blockchain]
network=amoy
enabled=true

[services]
emailWallet=true
secretsManagement=false
aiWallet=false
```

### **Required Credentials**

#### **Email Service (Microsoft Graph)**
**File:** `~/.data-wallet/localhost/email-graph.ini`
```ini
[email.microsoftGraph]
enabled=true
tenantId=YOUR_TENANT_ID_HERE
clientId=YOUR_CLIENT_ID_HERE
clientSecret=YOUR_CLIENT_SECRET_HERE
userPrincipalName=process@yourdomain.com
```

#### **Blockchain Configuration**
**File:** `~/.data-wallet/localhost/blockchain.ini`
```ini
[blockchain]
network=amoy
rpcUrl=https://rpc-amoy.polygon.technology/
serviceWalletPrivateKey=YOUR_PRIVATE_KEY_HERE
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
contractEmailDataWallet=0x52eBB3761D36496c29FB6A3D5354C449928A4048
contractAuthorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
```

---

## 🚀 CLI Usage

### **Platform Management**
```bash
# Start platform
rootz-platform start

# Start with specific options
rootz-platform start --domain=mydomain.com --port=8001

# Check status
rootz-platform status

# View configuration
rootz-platform config --list

# Edit configuration
rootz-platform config --edit
```

### **Quick Shortcuts**
```bash
# Short alias (same as rootz-platform)
rootz init
rootz start
rootz status
```

### **Available Commands**
```bash
rootz-platform --help              # Show all commands
rootz-platform init --help         # Initialize command options
rootz-platform start --help        # Start command options
rootz-platform status --help       # Status command options
rootz-platform config --help       # Configuration management
```

---

## 🔧 Development Workflow

### **For Team Development**
```bash
# 1. Clone the main repository (optional - for core development)
git clone https://github.com/rootz-global/sks-rootz-platform.git
cd sks-rootz-platform

# 2. Install the CLI tool globally
npm install -g @rootz-global/sks-rootz-platform

# 3. Initialize your personal development environment
rootz-platform init --domain=localhost

# 4. Start your development instance
rootz-platform start --port=8000

# 5. Your platform runs independently with your own configuration
```

### **Team Member Isolation**
- Each team member gets their own `~/.data-wallet/localhost/` configuration
- No conflicts between team member setups
- Personal blockchain wallets and email credentials
- Independent development environments

---

## 🌐 Service Endpoints

After starting the platform, these endpoints are available:

### **Core Platform**
- **Status:** `http://localhost:8000/.rootz/status`
- **Health:** `http://localhost:8000/.rootz/health`
- **API Docs:** `http://localhost:8000/.rootz/api/docs`

### **Email Wallet Service**
- **Registration:** `http://localhost:8000/.rootz/email-wallet/register`
- **Status:** `http://localhost:8000/.rootz/email-wallet/status`
- **Balance:** `http://localhost:8000/.rootz/email-wallet/balance/{address}`

### **Secrets Management**
- **Config API:** `http://localhost:8000/.rootz/secrets/config`
- **Vault Status:** `http://localhost:8000/.rootz/secrets/status`

### **Blockchain Integration**
- **Test Connection:** `http://localhost:8000/.rootz/blockchain/test`
- **Network Status:** `http://localhost:8000/.rootz/blockchain/status`

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Installation Fails**
```bash
# Clear npm cache
npm cache clean --force

# Try installing with verbose output
npm install -g @rootz-global/sks-rootz-platform --verbose

# Check permissions (Linux/Mac)
sudo npm install -g @rootz-global/sks-rootz-platform
```

#### **Platform Won't Start**
```bash
# Check if port is in use
netstat -an | grep 8000

# Try different port
rootz-platform start --port=8001

# Check configuration
rootz-platform config --list
```

#### **"Command not found" Error**
```bash
# Check global installation
npm list -g @rootz-global/sks-rootz-platform

# Reinstall if missing
npm install -g @rootz-global/sks-rootz-platform

# Check PATH includes npm global bin
npm config get prefix
```

#### **Configuration Issues**
```bash
# Reset configuration (re-run init)
rootz-platform init --domain=localhost

# Check configuration location
ls -la ~/.data-wallet/localhost/

# Edit configuration manually
nano ~/.data-wallet/localhost/config.ini
```

### **Platform Not Responding**
```bash
# Check if platform is running
rootz-platform status

# Check process
ps aux | grep rootz-platform

# View logs (if configured)
tail -f ~/.data-wallet/localhost/logs/platform.log
```

### **Blockchain Connection Issues**
- Verify your private key is correct
- Check if you have test POL in your wallet
- Ensure RPC URL is accessible
- Verify contract addresses are current

### **Email Service Issues**
- Verify Microsoft Graph credentials
- Check tenant ID and permissions
- Ensure application has proper consent
- Test email account accessibility

---

## 📚 Next Steps

### **After Installation**
1. **Configure Credentials** - Add your email and blockchain credentials
2. **Test Basic Functions** - Run status checks and test endpoints
3. **Review Documentation** - Read the architecture documentation
4. **Join Team Development** - Clone main repo for core development

### **For Production Deployment**
1. **Setup Production Domain** - Use `rootz-platform init --production`
2. **Configure SSL** - Set up HTTPS certificates
3. **Database Setup** - Configure PostgreSQL for production
4. **Monitoring** - Set up logging and monitoring

### **Team Resources**
- **Architecture Documentation:** `docs/architecture/Email_Wallet_Architecture_Documentation.md`
- **Configuration Guide:** `docs/CONFIG.md` (create this next)
- **API Documentation:** Available after starting platform
- **GitHub Issues:** Report problems and request features

---

## 🆘 Getting Help

### **Documentation**
- **Installation Issues:** This guide
- **Configuration:** Configuration guide (next)
- **Architecture:** Technical architecture documentation
- **API Usage:** In-platform API documentation

### **Support Channels**
- **GitHub Issues:** https://github.com/rootz-global/sks-rootz-platform/issues
- **Team Slack:** #rootz-platform-dev
- **Direct Help:** Contact Steven Sprague

### **Command-Line Help**
```bash
# Show all available commands and options
rootz-platform --help

# Get help for specific commands
rootz-platform init --help
rootz-platform start --help
rootz-platform config --help
```

---

**🎉 Welcome to the SKS Rootz Platform team! Transform emails into blockchain assets! 🚀**
