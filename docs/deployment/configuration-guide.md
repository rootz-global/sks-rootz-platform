# Configuration Guide

Complete guide for configuring the SKS Rootz Platform using EPISTERY-style INI files.

## Overview

The SKS Rootz Platform uses domain-aware configuration stored in INI files, following the EPISTERY pattern. This approach provides:

- **No hardcoded secrets** in source code
- **Domain-specific configuration** for multi-tenant support  
- **File-based security** with proper permissions
- **Environment separation** (dev/staging/production)
- **Easy configuration management** without code changes

## Configuration Directory Structure

```
~/.data-wallet/                      # Configuration root
├── config.ini                      # Global platform config
├── rootz.global/                   # Production domain
│   ├── config.ini                  # Main domain config
│   ├── blockchain.ini              # Blockchain-specific config
│   ├── database.ini                # Database configuration
│   ├── email.ini                   # Email service config
│   └── services.ini                # Service enablement
├── staging.rootz.global/           # Staging domain
│   └── config.ini                  # Staging configuration
└── localhost/                      # Development domain
    └── config.ini                  # Development configuration
```

## Global Configuration

### Global Platform Config
**File:** `~/.data-wallet/config.ini`

```ini
[platform]
name = "SKS Rootz Platform"
version = "1.0.0"
default_domain = "localhost"

[logging]
level = "info"
console = true
file = true
max_files = 10
max_size = "10m"

[security]
session_secret = "your-session-secret-here"
jwt_expiry = "24h"
rate_limit = 100
```

## Domain-Specific Configuration

### Production Configuration
**File:** `~/.data-wallet/rootz.global/config.ini`

```ini
[domain]
name = "rootz.global"
environment = "production"
port = 3000

[blockchain]
network = "polygon-amoy"
chain_id = 80002
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = "0x1234567890abcdef..."
gas_limit = 500000
gas_price = "auto"

# Smart Contract Addresses
contract_authorization = "0xcC2a65A8870289B1d33bA741069cC2CEEA219573"
contract_registration = "0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F"
contract_email_data_wallet = "0x52eBB3761D36496c29FB6A3D5354C449928A4048"
contract_attachment_wallet = "0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7"

[database]
type = "postgresql"
host = "localhost"
port = 5432
database = "rootz_platform"
username = "rootz"
password = "your-secure-database-password"
ssl = false
pool_min = 2
pool_max = 10
connection_timeout = 30000
idle_timeout = 600000

[redis]
host = "localhost"
port = 6379
password = "your-redis-password"
db = 0
connect_timeout = 10000
command_timeout = 5000
retry_attempts = 3

[email]
provider = "microsoft-graph"
smtp_host = "smtp.office365.com"
smtp_port = 587
smtp_secure = true
username = "process@rivetz.com"
password = "your-email-password"

# Microsoft Graph API Configuration
graph_client_id = "3d8542bb-6228-4de9-a5ac-2f6b050b194f"
graph_client_secret = "your-graph-client-secret"
graph_tenant_id = "9ea7bc03-5b98-4a9b-bae7-1e544994ffc7"
graph_user_principal = "process@rivetz.com"
poll_interval_minutes = 1

[ipfs]
provider = "pinata"
api_url = "https://api.pinata.cloud"
api_key = "your-pinata-api-key"
secret_key = "your-pinata-secret-key"
gateway_url = "https://gateway.pinata.cloud/ipfs/"
pin_to_ipfs = true

[services]
email_wallet = true
secrets_management = true
ai_wallet = true

[logging]
level = "info"
file = "/var/log/sks-rootz-platform/app.log"
max_files = 30
max_size = "50m"
compress = true

[security]
cors_origins = ["https://rootz.global", "https://www.rootz.global"]
trusted_proxies = ["127.0.0.1", "::1"]
secure_cookies = true
helmet_enabled = true

[monitoring]
health_check_interval = 30
metrics_enabled = true
prometheus_port = 9090
```

### Staging Configuration
**File:** `~/.data-wallet/staging.rootz.global/config.ini`

```ini
[domain]
name = "staging.rootz.global"
environment = "staging"
port = 3000

[blockchain]
network = "polygon-amoy"
chain_id = 80002
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = "0xstaging_private_key_here..."
contract_authorization = "0xcC2a65A8870289B1d33bA741069cC2CEEA219573"
contract_registration = "0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F"

[database]
host = "localhost"
port = 5432
database = "rootz_platform_staging"
username = "rootz_staging"
password = "staging-password"

[email]
username = "staging@rivetz.com"
password = "staging-email-password"
graph_client_id = "staging-client-id"
graph_client_secret = "staging-client-secret"

[logging]
level = "debug"
file = "/var/log/sks-rootz-platform/staging.log"

[security]
cors_origins = ["https://staging.rootz.global"]
```

### Development Configuration
**File:** `~/.data-wallet/localhost/config.ini`

```ini
[domain]
name = "localhost"
environment = "development"
port = 3000

[blockchain]
network = "polygon-amoy"
chain_id = 80002
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = "0xdev_private_key_here..."
contract_authorization = "0xcC2a65A8870289B1d33bA741069cC2CEEA219573"

[database]
host = "localhost"
port = 5432
database = "rootz_platform_dev"
username = "rootz_dev"
password = "dev-password"

[email]
username = "dev@rivetz.com"
password = "dev-email-password"

[logging]
level = "debug"
console = true
file = false

[security]
cors_origins = ["http://localhost:3000", "http://localhost:8080"]
secure_cookies = false

[services]
email_wallet = true
secrets_management = true
ai_wallet = false
```

## Service-Specific Configuration

### Email Wallet Service Configuration
**File:** `~/.data-wallet/rootz.global/email-wallet.ini`

```ini
[email_wallet]
enabled = true
credit_cost_email = 3
credit_cost_attachment = 2
credit_cost_processing = 1
authorization_expiry_hours = 24
max_email_size_mb = 25
max_attachments = 10

[notifications]
enabled = true
email_notifications = true
sms_notifications = false
reminder_intervals = [72, 168, 504, 672]  # Hours: 3d, 1w, 3w, 4w

[processing]
auto_process_trusted_senders = false
require_user_authorization = true
spam_protection = true
virus_scanning = true
```

### Secrets Management Configuration
**File:** `~/.data-wallet/rootz.global/secrets-management.ini`

```ini
[secrets_management]
enabled = true
backup_enabled = true
backup_retention_days = 90
encryption_enabled = true
audit_logging = true

[access_control]
admin_addresses = ["0x1234...", "0x5678..."]
read_only_addresses = ["0xabcd..."]
require_approval = true
approval_threshold = 2

[rotation]
auto_rotation_enabled = false
rotation_interval_days = 90
notification_days_before = 7
```

### AI Wallet Configuration
**File:** `~/.data-wallet/rootz.global/ai-wallet.ini`

```ini
[ai_wallet]
enabled = true
auto_creation_enabled = false
confidence_threshold = 0.8
max_daily_creations = 100

[ai_processing]
provider = "openai"
model = "gpt-4"
api_key = "your-openai-api-key"
max_tokens = 4000
temperature = 0.3

[validation]
require_human_approval = true
minimum_confidence = 0.7
suspicious_content_review = true
```

## Configuration Templates

### Creating Configuration from Templates
```bash
# Create configuration directory
mkdir -p ~/.data-wallet/rootz.global

# Copy and customize templates
cp config/templates/platform.template.ini ~/.data-wallet/rootz.global/config.ini
cp config/templates/blockchain.template.ini ~/.data-wallet/rootz.global/blockchain.ini
cp config/templates/database.template.ini ~/.data-wallet/rootz.global/database.ini

# Set secure permissions
chmod 700 ~/.data-wallet
chmod 600 ~/.data-wallet/rootz.global/*.ini
```

### Template Files
**File:** `config/templates/platform.template.ini`

```ini
[domain]
name = "DOMAIN_NAME_HERE"
environment = "ENVIRONMENT_HERE"
port = 3000

[blockchain]
network = "polygon-amoy"
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = "PRIVATE_KEY_HERE"
contract_authorization = "CONTRACT_ADDRESS_HERE"

[database]
host = "localhost"
port = 5432
database = "DATABASE_NAME_HERE"
username = "USERNAME_HERE"
password = "PASSWORD_HERE"

[email]
username = "EMAIL_USERNAME_HERE"
password = "EMAIL_PASSWORD_HERE"
graph_client_id = "GRAPH_CLIENT_ID_HERE"
graph_client_secret = "GRAPH_CLIENT_SECRET_HERE"
graph_tenant_id = "GRAPH_TENANT_ID_HERE"

[ipfs]
api_key = "PINATA_API_KEY_HERE"
secret_key = "PINATA_SECRET_KEY_HERE"

[logging]
level = "info"
file = "/var/log/sks-rootz-platform/app.log"
```

## Configuration Management

### Loading Configuration in Code
```typescript
// Configuration automatically loads based on domain
const config = this.config.loadDomain(req.hostname);

// Access configuration values
const rpcUrl = config?.blockchain?.rpc_url;
const dbHost = config?.database?.host;
const emailUsername = config?.email?.username;
```

### Configuration Validation
```typescript
import Joi from 'joi';

const configSchema = Joi.object({
  domain: Joi.object({
    name: Joi.string().required(),
    environment: Joi.string().valid('development', 'staging', 'production').required()
  }).required(),
  
  blockchain: Joi.object({
    network: Joi.string().required(),
    rpc_url: Joi.string().uri().required(),
    service_wallet_private_key: Joi.string().pattern(/^0x[0-9a-fA-F]{64}$/).required()
  }).required(),
  
  database: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    database: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  }).required()
});

// Validate configuration on load
const { error, value } = configSchema.validate(config);
if (error) {
  throw new Error(`Configuration validation failed: ${error.message}`);
}
```

### Environment-Specific Overrides
```bash
# Set environment-specific values
export NODE_ENV=production
export DOMAIN_NAME=rootz.global
export LOG_LEVEL=info

# Configuration can check environment variables as fallbacks
```

## Security Best Practices

### 1. File Permissions
```bash
# Set secure permissions on configuration directory
chmod 700 ~/.data-wallet
chmod 600 ~/.data-wallet/**/*.ini

# Ensure only the service user can access configs
chown -R ubuntu:ubuntu ~/.data-wallet
```

### 2. Secret Management
```bash
# Never commit INI files with secrets to git
echo "config/**/*.ini" >> .gitignore
echo "!config/templates/*.template.ini" >> .gitignore

# Use environment variables for CI/CD
export BLOCKCHAIN_PRIVATE_KEY="0x..."
export DATABASE_PASSWORD="..."
```

### 3. Configuration Backup
```bash
# Create encrypted backup of configurations
tar -czf config-backup-$(date +%Y%m%d).tar.gz ~/.data-wallet/
gpg -c config-backup-$(date +%Y%m%d).tar.gz
rm config-backup-$(date +%Y%m%d).tar.gz

# Store encrypted backup securely
```

### 4. Audit Configuration Access
```bash
# Monitor configuration file access
auditctl -w ~/.data-wallet/ -p rwxa -k config_access

# Check audit logs
ausearch -k config_access
```

## Troubleshooting

### Common Configuration Issues

#### 1. Configuration Not Found
```bash
# Check if configuration directory exists
ls -la ~/.data-wallet/

# Check domain-specific configuration
ls -la ~/.data-wallet/rootz.global/

# Verify file permissions
stat ~/.data-wallet/rootz.global/config.ini
```

#### 2. Invalid Configuration Format
```bash
# Test INI parsing
node -e "
const ini = require('ini');
const fs = require('fs');
const config = ini.parse(fs.readFileSync('~/.data-wallet/rootz.global/config.ini', 'utf8'));
console.log(JSON.stringify(config, null, 2));
"
```

#### 3. Missing Required Values
```bash
# Check for required configuration values
grep -r "service_wallet_private_key" ~/.data-wallet/
grep -r "database" ~/.data-wallet/
grep -r "email" ~/.data-wallet/
```

#### 4. Environment Detection Issues
```bash
# Test domain resolution
curl -H "Host: rootz.global" http://localhost:3000/.rootz/status
curl -H "Host: localhost" http://localhost:3000/.rootz/status
```

### Configuration Validation Script
```bash
#!/bin/bash
# validate-config.sh

DOMAIN=$1
CONFIG_DIR="$HOME/.data-wallet/$DOMAIN"

if [ ! -d "$CONFIG_DIR" ]; then
  echo "❌ Configuration directory not found: $CONFIG_DIR"
  exit 1
fi

if [ ! -f "$CONFIG_DIR/config.ini" ]; then
  echo "❌ Main configuration file not found: $CONFIG_DIR/config.ini"
  exit 1
fi

echo "✅ Configuration directory exists: $CONFIG_DIR"
echo "✅ Main configuration file exists"

# Check file permissions
PERMS=$(stat -c "%a" "$CONFIG_DIR/config.ini")
if [ "$PERMS" != "600" ]; then
  echo "⚠️  Configuration file permissions should be 600, found: $PERMS"
fi

echo "✅ Configuration validation complete for domain: $DOMAIN"
```

This configuration system provides secure, flexible, and maintainable configuration management following EPISTERY architectural principles.
