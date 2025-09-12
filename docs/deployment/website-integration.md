# Website Integration Guide

How to integrate SKS Rootz Platform with your existing root website's static directory structure.

## Overview

The SKS Rootz Platform follows the EPISTERY pattern of attaching to existing web infrastructure. This guide shows how to integrate the service backend with your existing website's frontend pages.

## Architecture

```
Your Existing Website (Port 80/443)
├── Nginx (Reverse Proxy)
├── Static Files (/var/www/html/)
├── Frontend Pages (/var/www/html/static/pages/)
└── SKS Rootz Platform APIs (/.rootz/* proxied to :3000)
```

## Integration Components

### 1. Backend Service (SKS Rootz Platform)
- **Location:** `/opt/sks-rootz-platform`
- **Port:** 3000 (internal only)
- **APIs:** Available under `/.rootz/` paths
- **Client Library:** Served at `/.rootz/lib/rootz-client.js`

### 2. Frontend Pages (Your Root Website)
- **Location:** `/var/www/html/static/pages/`
- **Access:** Via your existing domain (e.g., `https://rootz.global/pages/`)
- **Integration:** Uses client library to communicate with backend APIs

## Frontend Page Structure

### Recommended Directory Layout
```
/var/www/html/static/pages/
├── email-wallet/                   # Email wallet frontend
│   ├── index.html                 # Main dashboard
│   ├── register.html              # User registration
│   ├── authorize.html             # Wallet authorization
│   ├── dashboard.html             # User dashboard
│   ├── admin.html                 # Admin interface
│   ├── css/
│   │   ├── email-wallet.css       # Service-specific styles
│   │   └── dashboard.css          # Dashboard styles
│   └── js/
│       ├── email-wallet.js        # Email wallet functionality
│       └── dashboard.js           # Dashboard functionality
├── secrets-management/            # Secrets management frontend
│   ├── index.html                # Configuration dashboard
│   ├── vault.html                # Vault management
│   ├── settings.html             # Settings page
│   └── css/
│       └── secrets.css           # Service-specific styles
└── ai-wallet/                    # AI wallet frontend
    ├── index.html                # AI dashboard
    ├── monitor.html              # Monitoring page
    └── css/
        └── ai-wallet.css         # Service-specific styles
```

## Frontend Integration Examples

### 1. Email Wallet Dashboard
**File:** `/var/www/html/static/pages/email-wallet/dashboard.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Wallet Dashboard - Rootz Global</title>
    <link rel="stylesheet" href="css/email-wallet.css">
    <link rel="stylesheet" href="../shared/css/common.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>Email Wallet Dashboard</h1>
            <div id="user-info"></div>
        </header>
        
        <main>
            <section id="pending-wallets">
                <h2>Pending Authorizations</h2>
                <div id="pending-list"></div>
            </section>
            
            <section id="created-wallets">
                <h2>Created Wallets</h2>
                <div id="wallet-list"></div>
            </section>
            
            <section id="credits">
                <h2>Credit Balance</h2>
                <div id="credit-balance"></div>
            </section>
        </main>
    </div>

    <!-- Load SKS Rootz Platform client library -->
    <script src="/.rootz/lib/rootz-client.js"></script>
    <script src="js/dashboard.js"></script>
</body>
</html>
```

### 2. Dashboard JavaScript Integration
**File:** `/var/www/html/static/pages/email-wallet/js/dashboard.js`

```javascript
class EmailWalletDashboard {
    constructor() {
        this.rootzPlatform = null;
        this.userAddress = null;
    }

    async initialize() {
        try {
            // Connect to SKS Rootz Platform (EPISTERY pattern)
            this.rootzPlatform = await RootzPlatform.connect();
            
            // Get user wallet connection
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                this.userAddress = accounts[0];
            }
            
            // Load dashboard data
            await this.loadDashboard();
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to connect to Email Wallet service');
        }
    }

    async loadDashboard() {
        // Load pending authorizations
        const pendingWallets = await this.rootzPlatform.emailWallet
            .getPendingAuthorizations(this.userAddress);
        this.renderPendingWallets(pendingWallets);
        
        // Load created wallets
        const createdWallets = await this.rootzPlatform.emailWallet
            .getCreatedWallets(this.userAddress);
        this.renderCreatedWallets(createdWallets);
        
        // Load credit balance
        const credits = await this.rootzPlatform.emailWallet
            .getCreditBalance(this.userAddress);
        this.renderCreditBalance(credits);
        
        // Load user info
        this.renderUserInfo();
    }

    renderPendingWallets(wallets) {
        const container = document.getElementById('pending-list');
        
        if (wallets.length === 0) {
            container.innerHTML = '<p>No pending authorizations</p>';
            return;
        }
        
        container.innerHTML = wallets.map(wallet => `
            <div class="wallet-card pending">
                <div class="wallet-header">
                    <h3>${wallet.emailSubject}</h3>
                    <span class="from">From: ${wallet.emailSender}</span>
                </div>
                <div class="wallet-details">
                    <p>Attachments: ${wallet.attachmentCount}</p>
                    <p>Cost: ${wallet.creditCost} credits</p>
                    <p>Expires: ${new Date(wallet.expiresAt).toLocaleDateString()}</p>
                </div>
                <div class="wallet-actions">
                    <button onclick="dashboard.authorizeWallet('${wallet.requestId}')" 
                            class="btn-primary">
                        Authorize
                    </button>
                    <button onclick="dashboard.rejectWallet('${wallet.requestId}')" 
                            class="btn-secondary">
                        Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderCreatedWallets(wallets) {
        const container = document.getElementById('wallet-list');
        
        container.innerHTML = wallets.map(wallet => `
            <div class="wallet-card created">
                <div class="wallet-header">
                    <h3>${wallet.emailSubject}</h3>
                    <span class="status">✅ Created</span>
                </div>
                <div class="wallet-details">
                    <p>Wallet Address: <code>${wallet.walletAddress}</code></p>
                    <p>Created: ${new Date(wallet.createdAt).toLocaleDateString()}</p>
                    <p>IPFS Hash: <code>${wallet.ipfsHash}</code></p>
                </div>
                <div class="wallet-actions">
                    <button onclick="dashboard.viewWallet('${wallet.walletAddress}')" 
                            class="btn-primary">
                        View Details
                    </button>
                    <button onclick="dashboard.exportWallet('${wallet.walletAddress}')" 
                            class="btn-secondary">
                        Export
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderCreditBalance(credits) {
        const container = document.getElementById('credit-balance');
        container.innerHTML = `
            <div class="credit-display">
                <span class="credit-amount">${credits}</span>
                <span class="credit-label">Credits Available</span>
                <button onclick="dashboard.purchaseCredits()" class="btn-secondary">
                    Purchase More
                </button>
            </div>
        `;
    }

    renderUserInfo() {
        const container = document.getElementById('user-info');
        container.innerHTML = `
            <div class="user-display">
                <span class="wallet-address">${this.userAddress?.slice(0, 6)}...${this.userAddress?.slice(-4)}</span>
                <button onclick="dashboard.disconnect()" class="btn-link">Disconnect</button>
            </div>
        `;
    }

    async authorizeWallet(requestId) {
        try {
            const result = await this.rootzPlatform.emailWallet
                .authorizeWalletCreation(requestId);
            
            if (result.success) {
                this.showSuccess('Wallet authorized successfully!');
                await this.loadDashboard(); // Refresh dashboard
            } else {
                this.showError(result.error || 'Authorization failed');
            }
        } catch (error) {
            console.error('Authorization failed:', error);
            this.showError('Failed to authorize wallet');
        }
    }

    async rejectWallet(requestId) {
        try {
            const result = await this.rootzPlatform.emailWallet
                .rejectWalletCreation(requestId);
            
            if (result.success) {
                this.showSuccess('Wallet request rejected');
                await this.loadDashboard(); // Refresh dashboard
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            this.showError('Failed to reject wallet');
        }
    }

    showSuccess(message) {
        // Implement success notification
        alert(`✅ ${message}`);
    }

    showError(message) {
        // Implement error notification
        alert(`❌ ${message}`);
    }
}

// Initialize dashboard when page loads
const dashboard = new EmailWalletDashboard();
document.addEventListener('DOMContentLoaded', () => {
    dashboard.initialize();
});
```

### 3. Secrets Management Interface
**File:** `/var/www/html/static/pages/secrets-management/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuration Management - Rootz Global</title>
    <link rel="stylesheet" href="css/secrets.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>Configuration Management</h1>
            <div id="domain-selector">
                <select id="domain-select">
                    <option value="localhost">Development</option>
                    <option value="staging.rootz.global">Staging</option>
                    <option value="rootz.global" selected>Production</option>
                </select>
            </div>
        </header>
        
        <main>
            <section id="configuration-sections">
                <div class="config-section" data-section="blockchain">
                    <h2>Blockchain Configuration</h2>
                    <div id="blockchain-config"></div>
                </div>
                
                <div class="config-section" data-section="database">
                    <h2>Database Configuration</h2>
                    <div id="database-config"></div>
                </div>
                
                <div class="config-section" data-section="email">
                    <h2>Email Configuration</h2>
                    <div id="email-config"></div>
                </div>
            </section>
        </main>
    </div>

    <script src="/.rootz/lib/rootz-client.js"></script>
    <script src="js/secrets-management.js"></script>
</body>
</html>
```

## Nginx Configuration for Integration

### Site Configuration
**File:** `/etc/nginx/sites-available/rootz.global`

```nginx
server {
    listen 443 ssl http2;
    server_name rootz.global www.rootz.global;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/rootz.global/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rootz.global/privkey.pem;

    # SKS Rootz Platform API (EPISTERY pattern)
    location /.rootz {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend service pages
    location /pages/ {
        root /var/www/html/static;
        try_files $uri $uri/ =404;
        
        # Add security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }

    # Main website (your existing site)
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ =404;
    }
}
```

## Client Library API Reference

The client library provides a clean JavaScript API:

```javascript
// Initialize connection
const rootz = await RootzPlatform.connect();

// Email Wallet Service
await rootz.emailWallet.register(userAddress);
await rootz.emailWallet.getCreditBalance(userAddress);
await rootz.emailWallet.getPendingAuthorizations(userAddress);
await rootz.emailWallet.authorizeWalletCreation(requestId);

// Secrets Management Service
await rootz.secrets.getConfig(service, domain);
await rootz.secrets.updateConfig(service, domain, config);
await rootz.secrets.rotateSecret(secretName);

// AI Wallet Service
await rootz.aiWallet.createFromEmail(emailContent);
await rootz.aiWallet.getCreatedWallets(userAddress);

// Platform Status
await rootz.getStatus();
await rootz.getHealth();
```

## Development Workflow

### 1. Frontend Development
```bash
# Develop frontend pages locally
cd /var/www/html/static/pages/email-wallet/

# Test against local backend
# Backend runs on localhost:3000
# Frontend served via nginx on localhost:80
```

### 2. Backend Development
```bash
# SKS Rootz Platform development
cd /opt/sks-rootz-platform

# Run in development mode
npm run dev

# APIs available at localhost:3000/.rootz/
```

### 3. Integration Testing
```bash
# Test complete integration
curl https://rootz.global/.rootz/status
curl https://rootz.global/pages/email-wallet/

# Test API calls from frontend
# Open browser developer tools
# Navigate to https://rootz.global/pages/email-wallet/dashboard.html
```

## Security Considerations

### 1. API Security
- All API calls use HTTPS
- Domain-specific configuration isolation
- No sensitive data in client-side code

### 2. Frontend Security
- Content Security Policy headers
- XSS protection headers
- No hardcoded secrets in frontend code

### 3. Integration Security
- Client library served from same domain
- Proxy configuration prevents direct backend access
- Session management via secure cookies

This integration approach provides a seamless user experience while maintaining security and following EPISTERY architectural patterns.
