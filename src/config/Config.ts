// SKS Rootz Platform - Configuration Management (EPISTERY Pattern)

import fs from 'fs';
import path from 'path';
import os from 'os';

// Use require for ini module to avoid TypeScript issues
const ini = require('ini');

export interface DomainConfig {
  domain: string;
  blockchain?: {
    rpcUrl?: string;
    privateKey?: string;
    contractAddresses?: { [key: string]: string };
  };
  database?: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
  };
  redis?: {
    url?: string;
    host?: string;
    port?: number;
  };
  services?: {
    emailWallet?: boolean;
    secretsManagement?: boolean;
    aiWallet?: boolean;
  };
}

export class Config {
  private readonly configDir: string;
  private readonly rootName = 'data-wallet';
  private configs: Map<string, DomainConfig> = new Map();

  constructor() {
    this.configDir = path.join(os.homedir(), '.' + this.rootName);
  }

  public async initialize(): Promise<void> {
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    console.log(`📁 Configuration directory: ${this.configDir}`);
  }

  public loadDomain(domain: string): DomainConfig | null {
    // Check cache first
    if (this.configs.has(domain)) {
      return this.configs.get(domain) || null;
    }

    const domainConfigDir = path.join(this.configDir, domain);
    const configFile = path.join(domainConfigDir, 'config.ini');

    if (!fs.existsSync(configFile)) {
      console.log(`⚠️ No configuration found for domain: ${domain}`);
      return null;
    }

    try {
      const configData = fs.readFileSync(configFile, 'utf8');
      const parsedConfig = ini.parse(configData);
      
      const domainConfig: DomainConfig = {
        domain,
        ...parsedConfig
      };

      // Cache the configuration
      this.configs.set(domain, domainConfig);
      
      console.log(`✅ Loaded configuration for domain: ${domain}`);
      return domainConfig;
    } catch (error) {
      console.error(`❌ Failed to load configuration for domain ${domain}:`, error);
      return null;
    }
  }

  public saveDomain(domain: string, config: DomainConfig): boolean {
    const domainConfigDir = path.join(this.configDir, domain);
    const configFile = path.join(domainConfigDir, 'config.ini');

    try {
      // Ensure domain directory exists
      if (!fs.existsSync(domainConfigDir)) {
        fs.mkdirSync(domainConfigDir, { recursive: true });
      }

      // Convert config to INI format
      const iniContent = ini.stringify(config);
      
      // Write configuration file
      fs.writeFileSync(configFile, iniContent);
      
      // Update cache
      this.configs.set(domain, config);
      
      console.log(`✅ Saved configuration for domain: ${domain}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save configuration for domain ${domain}:`, error);
      return false;
    }
  }

  public listDomains(): string[] {
    try {
      if (!fs.existsSync(this.configDir)) {
        return [];
      }

      const items = fs.readdirSync(this.configDir);
      return items.filter(item => {
        const itemPath = path.join(this.configDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    } catch (error) {
      console.error('❌ Failed to list domains:', error);
      return [];
    }
  }
}
