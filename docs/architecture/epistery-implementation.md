# EPISTERY Implementation

The SKS Rootz Platform follows the EPISTERY architectural pattern for clean, domain-aware service design.

## Core EPISTERY Principles

### 1. Domain-Aware Configuration
EPISTERY uses per-domain configuration stored in the user's home directory:

```
~/.data-wallet/                      # Configuration root
├── config.ini                      # Global platform config
├── rootz.global/                   # Production domain
│   ├── config.ini                  # Domain-specific config
│   ├── platform.ini                # Platform settings
│   ├── email-wallet.ini            # Email wallet config
│   ├── secrets.ini                 # Secrets management
│   └── blockchain.ini              # Blockchain settings
├── staging.rootz.global/           # Staging domain
│   └── config.ini
└── localhost/                      # Development domain
    └── config.ini
```

### 2. Service Attachment Pattern
Services attach to existing Express applications non-invasively:

```typescript
// Core platform class (like EPISTERY)
export class RootzPlatform {
  public static async connect(): Promise<RootzPlatform> {
    // Singleton pattern initialization
  }
  
  // Attach to existing Express app
  public async attach(app: express.Application): Promise<void> {
    // Domain resolution middleware
    app.use(this.domainResolutionMiddleware.bind(this));
    
    // Service routes under well-known paths
    app.use('/.rootz', this.createRoutes());
    
    // Client library serving
    app.use('/.rootz/lib', express.static(path.join(__dirname, 'client')));
  }
}
```

### 3. Well-Known URI Patterns
Following RFC 8615 well-known URI standards:

- `/.rootz/status` - Service status and configuration
- `/.rootz/health` - Health check endpoint
- `/.rootz/lib/` - Client library serving
- `/.rootz/email-wallet` - Email wallet API
- `/.rootz/secrets` - Secrets management API
- `/.rootz/ai-wallet` - AI wallet API

### 4. Controller Inheritance Pattern
Base controller with shared functionality:

```typescript
export abstract class Controller {
  protected sendResponse(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  protected sendError(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 5. INI-Based Configuration Management
No hardcoded secrets, all configuration in INI files:

```typescript
export class Config {
  private readonly configDir: string;
  private readonly rootName = 'data-wallet';

  constructor() {
    this.configDir = path.join(os.homedir(), '.' + this.rootName);
  }

  public loadDomain(domain: string): DomainConfig | null {
    const domainConfigDir = path.join(this.configDir, domain);
    const configFile = path.join(domainConfigDir, 'config.ini');
    
    // Parse INI configuration
    return ini.parse(fs.readFileSync(configFile, 'utf8'));
  }
}
```

## Configuration Templates

### Platform Configuration Template
```ini
[platform]
name = "SKS Rootz Platform"
version = "1.0.0"
port = 3000

[logging]
level = "info"
file = "/var/log/sks-rootz-platform/app.log"

[services]
email_wallet = true
secrets_management = true
ai_wallet = true
```

### Domain-Specific Configuration
```ini
[domain]
name = "rootz.global"
environment = "production"

[blockchain]
network = "polygon-amoy"
rpc_url = "https://rpc-amoy.polygon.technology/"
service_wallet_private_key = ""
contract_authorization = "0xcC2a65A8870289B1d33bA741069cC2CEEA219573"
contract_registration = "0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F"

[database]
host = "localhost"
port = 5432
database = "rootz_platform"
username = "rootz"
password = ""

[redis]
host = "localhost"
port = 6379
password = ""

[email]
smtp_host = "smtp.office365.com"
smtp_port = 587
username = "process@rivetz.com"
password = ""

[ipfs]
provider = "pinata"
api_key = ""
secret_key = ""
```

## Domain Resolution Middleware

The EPISTERY pattern includes automatic domain resolution:

```typescript
private domainResolutionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const domain = req.hostname || 'localhost';
  
  // Load domain-specific configuration
  if (req.app.locals.domain !== domain) {
    console.log(`🔄 Switching to domain configuration: ${domain}`);
    req.app.locals.domain = domain;
    req.app.locals.config = this.config.loadDomain(domain);
  }
  
  next();
}
```

## Client Library Pattern

Browser-accessible client library following EPISTERY style:

```javascript
// Client-side usage
const rootz = await RootzPlatform.connect();

// Email wallet operations
const wallets = await rootz.emailWallet.getWallets();
const status = await rootz.emailWallet.createWallet(emailData);

// Secrets management
const config = await rootz.secrets.getConfig('email-wallet');
await rootz.secrets.updateSecret('blockchain.privateKey', newKey);

// AI wallet operations  
const aiWallet = await rootz.aiWallet.createFromEmail(emailContent);
```

## Security Considerations

### 1. No Hardcoded Secrets
- All sensitive data in INI files outside of version control
- Configuration files in user home directory (`~/.data-wallet/`)
- Environment-specific configuration separation

### 2. Domain Isolation
- Each domain gets its own configuration namespace
- No cross-domain configuration bleeding
- Isolated wallet and service configurations

### 3. File-Based Security
- INI files have restricted permissions (600)
- Configuration directory protected (700)
- Automatic backup and rotation

## Deployment Integration

EPISTERY services integrate with existing infrastructure:

```bash
# Service attaches to existing nginx/apache setup
# No additional ports or domains required
# Uses existing SSL certificates and reverse proxy

# Configuration managed independently
# Service can be updated without affecting main website
# Domain-specific rollouts supported
```

## Benefits of EPISTERY Pattern

1. **Non-Invasive Integration** - Attaches to existing websites cleanly
2. **Domain Awareness** - Automatic multi-tenant support
3. **Security First** - File-based configuration, no hardcoded secrets
4. **Scalable Architecture** - Clean separation of concerns
5. **Operational Simplicity** - Single service, multiple domains
6. **Development Friendly** - Clear patterns and inheritance

This implementation provides a robust foundation for the SKS Rootz Platform while following proven EPISTERY architectural principles.
