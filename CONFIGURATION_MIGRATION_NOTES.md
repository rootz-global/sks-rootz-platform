# Configuration System Migration Notes

**Date:** September 2025  
**Project:** Rootz Platform Configuration Migration  
**Context:** Migration from EPISTERY domain-aware config to shared ~/.rootz/config.ini system

## Overview

This document details the complete migration of the Rootz Platform configuration system from the original EPISTERY pattern to a shared configuration system using the administrate/config.mjs module.

## Previous Configuration System (EPISTERY Pattern)

### Structure
```
~/.data-wallet/
├── localhost/
│   ├── config.ini
│   ├── email-graph.ini
│   └── blockchain.ini
├── staging.rootz.global/
└── rootz.global/
```

### Characteristics
- **Domain-isolated**: Each domain had completely separate configuration
- **Multiple files**: Different services had separate .ini files
- **Custom implementation**: Used custom Config.ts class with ini parsing
- **No sharing**: Each app maintained its own configuration

## New Configuration System (Shared ~/.rootz/)

### Structure
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

### Characteristics
- **Shared configuration**: Multiple Rootz apps can use same config
- **Hierarchical**: Root config + domain overrides
- **Standardized**: Uses proven administrate/config.mjs module
- **Multi-app ready**: Designed for Rootz ecosystem expansion

## Migration Implementation Details

### 1. Configuration Class Changes

**File:** `src/core/configuration/Config.js`

**Before:**
```javascript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as ini from 'ini';

export class Config {
  constructor() {
    this.homeDir = homedir();
    this.rootName = 'data-wallet';
    this.configData = {};
    this.currentDomain = null;
  }
  
  loadDomain(domain) {
    const configDir = join(this.homeDir, `.${this.rootName}`, domain);
    const configFile = join(configDir, 'config.ini');
    // ... custom ini parsing
  }
}
```

**After:**
```javascript
import { Config as AdministrateConfig, DomainConfig } from '../../../../../metric-im/administrate/config.mjs';

export class Config {
  constructor() {
    this.rootConfig = new AdministrateConfig('rootz');
    this.domainConfig = new DomainConfig('rootz');
    this.currentDomain = null;
  }
  
  loadDomain(domain) {
    this.currentDomain = domain;
    this.domainConfig.setDomain(domain);
  }
}
```

### 2. Configuration Priority System

**Priority Order (highest to lowest):**
1. **Environment Variables** - `DATABASE_HOST`, `IPFS_URL`, etc.
2. **Domain Config** - `~/.rootz/{domain}/config.ini`
3. **Root Config** - `~/.rootz/config.ini`
4. **Default Values** - Hardcoded fallbacks

**Implementation:**
```javascript
get(key, fallback) {
  // 1. Environment variable override
  const envKey = key.toUpperCase().replace(/[.-]/g, '_');
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  
  // 2. Domain-specific configuration
  let value = this._getFromConfig(key, this.domainConfig.domainData);
  if (value !== undefined) return value;
  
  // 3. Root configuration  
  value = this._getFromConfig(key, this.rootConfig.data);
  if (value !== undefined) return value;
  
  // 4. Fallback
  return fallback;
}
```

### 3. Import Path Resolution

**Challenge:** The administrate module is a symbolic link to metric-im project.

**Solution:** Correct relative path from config location:
```javascript
// From: /home/user/workspace/rootz/rootz-platform/src/core/configuration/Config.js
// To:   /home/user/workspace/metric-im/administrate/config.mjs
import { Config, DomainConfig } from '../../../../../metric-im/administrate/config.mjs';
```

### 4. Configuration Templates

**Created new templates for shared system:**

**Root Config** (`config-templates/rootz-config.ini`):
- Database configuration (OCI MySQL)
- Platform settings
- Blockchain configuration
- IPFS settings
- Security settings
- Default values for all apps

**Domain Config** (`config-templates/localhost-domain.ini`):
- Development-specific overrides
- Domain-specific settings
- Environment-specific customizations

## Key Features Added

### 1. Multi-App Configuration Support
- Multiple Rootz applications can share `~/.rootz/config.ini`
- Domain-specific overrides maintain isolation where needed
- Standardized configuration API across apps

### 2. Enhanced Configuration Methods
```javascript
// Get configuration with fallback
config.get('database.host', 'localhost')

// Set configuration (saves to domain config)
config.set('platform.port', 8080)

// Get entire configuration sections
config.getSection('database')

// Save configuration
config.save()
```

### 3. Environment Variable Integration
- All config keys automatically map to environment variables
- Example: `database.host` → `DATABASE_HOST`
- Enables easy CI/CD and container deployment

### 4. IPFS External Service Integration
- **Default IPFS URL**: `https://rootz.digital/api/v0`
- **Environment Override**: `IPFS_URL=https://rootz.digital/api/v0`
- **Config Override**: `[ipfs] url=https://rootz.digital/api/v0`

## Database Configuration

### OCI MySQL Integration
- **Host**: mysql.sub07192123581.rootzvcn.oraclevcn.com:3306
- **Database**: rootz_platform
- **Username**: admin
- **Password**: Environment variable (`DATABASE_PASSWORD`)

### Connection Configuration
```ini
[database]
host=mysql.sub07192123581.rootzvcn.oraclevcn.com
port=3306
name=rootz_platform
username=admin
password=YOUR_MYSQL_PASSWORD_HERE
maxConnections=20
ssl=true
```

## Testing Results

### Successful Integration Tests
1. **Configuration Loading**: ✅ Loads from `~/.rootz/`
2. **IPFS Connection**: ✅ Connects to external service
3. **Server Startup**: ✅ HTTP server on port 4080
4. **Environment Variables**: ✅ Override system works
5. **Domain Resolution**: ✅ localhost domain configuration

### Expected Warnings (Non-blocking)
- **MySQL Connection**: Expected without OCI credentials
- **MySQL2 Config Options**: Minor warnings about deprecated options

## Migration Benefits

### For Development
- **Simplified Setup**: Single configuration location
- **Environment Consistency**: Shared defaults across apps
- **Override Flexibility**: Easy environment-specific customization

### For Production
- **Scalability**: Supports multiple Rootz applications
- **Security**: Environment variable secrets integration
- **Maintainability**: Centralized configuration management

### For DevOps
- **Container Ready**: Environment variable configuration
- **CI/CD Friendly**: No hardcoded secrets
- **Multi-Environment**: Easy staging/production separation

## Future Considerations

### Multi-App Ecosystem
- Other Rootz applications can leverage same config system
- Shared database connections and service configurations
- Consistent authentication and security settings

### Configuration Management
- Consider configuration validation
- Add configuration migration tools
- Implement configuration backup/restore

### Documentation Updates
- Update deployment guides for new config system
- Create configuration troubleshooting guides
- Document environment variable patterns

## Files Modified

### Core Configuration
- `src/core/configuration/Config.js` - Complete rewrite
- `index.mjs` - No configuration loading changes needed

### Templates and Documentation
- `config-templates/rootz-config.ini` - Root configuration template
- `config-templates/localhost-domain.ini` - Domain override template
- `README.md` - Updated configuration documentation

### Package Configuration
- `package.json` - Removed non-existent scripts, updated dependencies

## Verification Commands

```bash
# Test configuration loading
npm start

# Test with environment variables
IPFS_URL=https://rootz.digital/api/v0 npm start

# Test with database credentials
DATABASE_PASSWORD=secure-password npm start

# Verify configuration files
ls -la ~/.rootz/
cat ~/.rootz/config.ini
cat ~/.rootz/localhost/config.ini
```

## Success Metrics

1. **✅ Server Starts Successfully** - No configuration errors
2. **✅ IPFS Integration** - External service connection works
3. **✅ Environment Overrides** - Environment variables take precedence
4. **✅ Multi-App Ready** - Configuration system can be shared
5. **✅ OCI MySQL Ready** - Database configuration prepared

This migration successfully modernizes the configuration system while maintaining compatibility with the existing codebase and preparing for future Rootz ecosystem expansion.