import { Config as AdministrateConfig, DomainConfig } from '../../../../../metric-im/administrate/config.mjs';

/**
 * Rootz Platform Configuration using shared $HOME/.rootz/config.ini
 * Uses administrate/config.mjs for configuration management
 */
export class Config {
  constructor() {
    this.rootConfig = new AdministrateConfig('rootz');
    this.domainConfig = new DomainConfig('rootz');
    this.currentDomain = null;
  }
  
  /**
   * Load configuration for a specific domain
   * @param domain - Domain name (e.g., 'localhost', 'rootz.global')
   */
  loadDomain(domain) {
    this.currentDomain = domain;
    this.domainConfig.setDomain(domain);
    
    try {
      console.log(`✅ Configuration loaded for domain: ${domain} from ~/.rootz/`);
    } catch (error) {
      console.warn(`⚠️  Failed to load config for ${domain}:`, error);
    }
  }
  
  /**
   * Get configuration value with optional fallback
   * Supports dot notation for nested values (e.g., 'blockchain.rpcUrl')
   * Priority: 1) Environment variables, 2) Domain config, 3) Root config, 4) Fallback
   */
  get(key, fallback) {
    // Handle environment variable override (highest priority)
    const envKey = key.toUpperCase().replace(/[.-]/g, '_');
    if (process.env[envKey]) {
      return process.env[envKey];
    }
    
    // Try domain-specific configuration first
    let value = this._getFromConfig(key, this.domainConfig.domainData);
    if (value !== undefined) {
      return value;
    }
    
    // Try root configuration
    value = this._getFromConfig(key, this.rootConfig.data);
    if (value !== undefined) {
      return value;
    }
    
    return fallback;
  }
  
  /**
   * Internal helper to get value from config object with dot notation support
   */
  _getFromConfig(key, configData) {
    if (!configData) return undefined;
    
    // Handle dot notation
    if (key.includes('.')) {
      const parts = key.split('.');
      let value = configData;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      }
      
      return typeof value === 'string' ? value : undefined;
    }
    
    // Direct key lookup
    if (key in configData) {
      return configData[key];
    }
    
    // Check in all sections
    for (const section of Object.values(configData)) {
      if (section && typeof section === 'object' && key in section) {
        return section[key];
      }
    }
    
    return undefined;
  }
  
  /**
   * Get all configuration data (merged root + domain)
   */
  getAll() {
    return { 
      ...this.rootConfig.data,
      ...this.domainConfig.domainData 
    };
  }
  
  /**
   * Get configuration section
   */
  getSection(sectionName) {
    // Try domain config first, then root config
    return this.domainConfig.domainData?.[sectionName] || 
           this.rootConfig.data?.[sectionName];
  }
  
  /**
   * Check if a key exists
   */
  has(key) {
    return this.get(key) !== undefined;
  }
  
  /**
   * Get current domain
   */
  getCurrentDomain() {
    return this.currentDomain;
  }
  
  /**
   * Get expected config file path for domain
   */
  getConfigPath(domain) {
    return this.rootConfig.configDir + '/' + domain + '/config.ini';
  }
  
  /**
   * Set a configuration value in domain config
   */
  set(key, value) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let target = this.domainConfig.domainData;
      
      // Navigate to the parent object
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) {
          target[parts[i]] = {};
        }
        target = target[parts[i]];
      }
      
      // Set the final value
      target[parts[parts.length - 1]] = value;
    } else {
      this.domainConfig.domainData[key] = value;
    }
    
    this.domainConfig.save();
  }
  
  /**
   * Save current configuration
   */
  save() {
    this.domainConfig.save();
    this.rootConfig.save();
  }
}

export default Config;