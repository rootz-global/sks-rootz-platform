# Ubuntu Server Deployment Guide

Complete guide for deploying SKS Rootz Platform on Ubuntu 22.04 LTS bare metal server.

## Prerequisites

- Ubuntu 22.04 LTS server with root/sudo access
- Domain name pointing to server IP (e.g., rootz.global)  
- At least 2GB RAM and 20GB disk space
- Network access for package installation

## Quick Deployment

### One-Command Setup
```bash
# Clone repository
git clone https://github.com/rootz-global/sks-rootz-platform.git
cd sks-rootz-platform

# Run complete Ubuntu setup (installs everything)
sudo ./scripts/setup/ubuntu-server-setup.sh

# Deploy application
sudo ./scripts/deploy/deploy.sh
```

## Manual Step-by-Step Deployment

### 1. System Update and Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install build tools
sudo apt install -y build-essential
```

### 2. Node.js Installation
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

### 3. PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE rootz_platform;
CREATE USER rootz WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rootz_platform TO rootz;
ALTER USER rootz CREATEDB;
\q
EOF
```

### 4. Redis Installation
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password
# Set: maxmemory 512mb
# Set: maxmemory-policy allkeys-lru

# Start and enable Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 5. Nginx Installation and Configuration
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create site configuration
sudo tee /etc/nginx/sites-available/rootz.global << 'EOF'
server {
    listen 80;
    server_name rootz.global www.rootz.global;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rootz.global www.rootz.global;

    # SSL configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/rootz.global/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rootz.global/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

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

    # Serve static website files (your existing website)
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ =404;
    }

    # Static pages directory (for service frontend pages)
    location /pages/ {
        root /var/www/html/static;
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/rootz.global /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d rootz.global -d www.rootz.global

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet

# Generate Diffie-Hellman parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

### 7. Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 8. Application Deployment
```bash
# Create application directory
sudo mkdir -p /opt/sks-rootz-platform
cd /opt/sks-rootz-platform

# Clone repository
sudo git clone https://github.com/rootz-global/sks-rootz-platform.git .

# Set ownership
sudo chown -R $USER:$USER /opt/sks-rootz-platform

# Install dependencies
npm install

# Build application
npm run build
```

### 9. Configuration Setup
```bash
# Create configuration directory
mkdir -p ~/.data-wallet/rootz.global

# Create domain configuration
cat > ~/.data-wallet/rootz.global/config.ini << 'EOF'
[domain]
name = "rootz.global"
environment = "production"

[platform]
name = "SKS Rootz Platform"
version = "1.0.0"
port = 3000

[blockchain]
network = "polygon-amoy"
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = "YOUR_PRIVATE_KEY_HERE"
contract_authorization = "0xcC2a65A8870289B1d33bA741069cC2CEEA219573"
contract_registration = "0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F"

[database]
host = "localhost"
port = 5432
database = "rootz_platform"
username = "rootz"
password = "your_secure_password"

[redis]
host = "localhost"
port = 6379
password = "your_redis_password"

[email]
smtp_host = "smtp.office365.com"
smtp_port = 587
username = "process@rivetz.com"
password = "YOUR_EMAIL_PASSWORD"

[ipfs]
provider = "pinata"
api_key = "YOUR_PINATA_API_KEY"
secret_key = "YOUR_PINATA_SECRET_KEY"

[logging]
level = "info"
file = "/var/log/sks-rootz-platform/app.log"

[services]
email_wallet = true
secrets_management = true
ai_wallet = true
EOF

# Set secure permissions
chmod 600 ~/.data-wallet/rootz.global/config.ini
chmod 700 ~/.data-wallet
```

### 10. Systemd Service Setup
```bash
# Create systemd service file
sudo tee /etc/systemd/system/sks-rootz-platform.service << 'EOF'
[Unit]
Description=SKS Rootz Platform
Documentation=https://github.com/rootz-global/sks-rootz-platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/sks-rootz-platform
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
SyslogIdentifier=sks-rootz-platform

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/sks-rootz-platform
ReadWritePaths=/home/ubuntu/.data-wallet

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/sks-rootz-platform
sudo chown ubuntu:ubuntu /var/log/sks-rootz-platform

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sks-rootz-platform
sudo systemctl start sks-rootz-platform
```

## Service Management

### Start/Stop/Restart
```bash
# Start service
sudo systemctl start sks-rootz-platform

# Stop service
sudo systemctl stop sks-rootz-platform

# Restart service
sudo systemctl restart sks-rootz-platform

# Check service status
sudo systemctl status sks-rootz-platform
```

### View Logs
```bash
# View service logs
sudo journalctl -u sks-rootz-platform -f

# View application logs
tail -f /var/log/sks-rootz-platform/app.log

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks
```bash
# Check service health
curl https://rootz.global/.rootz/health

# Check service status
curl https://rootz.global/.rootz/status

# Test database connection
sudo -u postgres psql -d rootz_platform -c "SELECT version();"

# Test Redis connection
redis-cli -a your_redis_password ping
```

## Maintenance

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update application
cd /opt/sks-rootz-platform
git pull origin main
npm install
npm run build
sudo systemctl restart sks-rootz-platform
```

### Backup
```bash
# Database backup
sudo -u postgres pg_dump rootz_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz ~/.data-wallet/
```

### SSL Certificate Renewal
```bash
# Renew certificates
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

### Log Rotation
```bash
# Configure logrotate
sudo tee /etc/logrotate.d/sks-rootz-platform << 'EOF'
/var/log/sks-rootz-platform/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload sks-rootz-platform
    endscript
}
EOF
```

## Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status sks-rootz-platform

# Check logs for errors
sudo journalctl -u sks-rootz-platform --since "10 minutes ago"

# Test configuration
cd /opt/sks-rootz-platform
node -c "require('./dist/index.js')"
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -d rootz_platform

# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection from app user
psql -h localhost -U rootz -d rootz_platform
```

### Nginx Configuration Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Reload nginx configuration
sudo systemctl reload nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Test SSL
openssl s_client -connect rootz.global:443 -servername rootz.global
```

This guide provides a complete deployment process for the SKS Rootz Platform on Ubuntu 22.04 LTS, following EPISTERY patterns and best practices for security and maintainability.
