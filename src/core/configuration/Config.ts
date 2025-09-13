import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as ini from 'ini';

/**
 * EPISTERY-style configuration management with domain-aware INI files
 * Follows the pattern: ~/.data-wallet/{domain}/config.ini
 */
export class Config {
  private homeDir: string;
  private rootName: string = 'data-wallet';
  private configData: { [key: string]: any } = {};
  private currentDomain: string | null = null;
  
  constructor() {
    this.homeDir = homedir();
  }
  
  /**
   * Load configuration for a specific domain
   * @param domain - Domain name (e.g., 'localhost', 'rootz.global')
   */
  loadDomain(domain: string): void {
    this.currentDomain = domain;
    
    const configDir = join(this.homeDir, `.${this.rootName}`, domain);
    const configFile = join(configDir, 'config.ini');
    
    if (existsSync(configFile)) {
      try {
        const configContent = readFileSync(configFile, 'utf8');
        this.configData = ini.parse(configContent);
        console.log(`✅ Configuration loaded for domain: ${domain}`);
      } catch (error) {
        console.warn(`⚠️  Failed to load config for ${domain}:`, error);
        this.configData = {};
      }
    } else {
      console.warn(`⚠️  Config file not found: ${configFile}`);
      this.configData = {};
    }
  }
  
  /**
   * Get configuration value with optional fallback
   * Supports dot notation for nested values (e.g., 'blockchain.rpcUrl')
   */
  get(key: string, fallback?: string): string | undefined {
    // Handle environment variable override
    const envKey = key.toUpperCase().replace(/[.-]/g, '_');
    if (process.env[envKey]) {
      return process.env[envKey];
    }
    
    // Handle dot notation
    if (key.includes('.')) {
      const parts = key.split('.');
      let value = this.configData;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return fallback;
        }
      }
      
      return typeof value === 'string' ? value : fallback;
    }
    
    // Direct key lookup
    if (key in this.configData) {
      return this.configData[key];
    }
    
    // Check in all sections
    for (const section of Object.values(this.configData)) {
      if (section && typeof section === 'object' && key in section) {
        return section[key];
      }
    }
    
    return fallback;
  }
  
  /**
   * Get all configuration data
   */
  getAll(): { [key: string]: any } {
    return { ...this.configData };
  }
  
  /**
   * Get configuration section
   */
  getSection(sectionName: string): { [key: string]: any } | undefined {
    return this.configData[sectionName];
  }
  
  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * Get current domain
   */
  getCurrentDomain(): string | null {
    return this.currentDomain;
  }
  
  /**
   * Get expected config file path for domain
   */
  getConfigPath(domain: string): string {
    return join(this.homeDir, `.${this.rootName}`, domain, 'config.ini');
  }
}

export default Config;
