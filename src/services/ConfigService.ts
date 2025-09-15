// ConfigService - EPISTERY Pattern Configuration Management
// File: src/services/ConfigService.ts
// Date: September 15, 2025

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration Service following EPISTERY INI pattern
 * Manages domain-aware configuration with file-based secrets
 */
export class ConfigService {
    private config: Record<string, any> = {};
    private domain: string;
    private configDir: string;

    constructor(domain: string = 'localhost') {
        this.domain = domain;
        this.configDir = path.join(os.homedir(), '.data-wallet');
        this.loadConfiguration();
    }

    /**
     * Load configuration from INI file for the specified domain
     */
    private loadConfiguration(): void {
        try {
            const configPath = path.join(this.configDir, this.domain, 'config.ini');
            
            if (!fs.existsSync(configPath)) {
                console.warn(`⚠️ Configuration file not found: ${configPath}`);
                console.log(`📁 Expected config directory: ${path.join(this.configDir, this.domain)}`);
                return;
            }

            const configContent = fs.readFileSync(configPath, 'utf8');
            this.config = this.parseIniContent(configContent);
            
            console.log(`✅ Configuration loaded from: ${configPath}`);
            console.log(`📁 Configuration sections: ${Object.keys(this.config).join(', ')}`);
            
        } catch (error: any) {
            console.error(`❌ Failed to load configuration: ${error.message}`);
        }
    }

    /**
     * Parse INI file content into nested object
     */
    private parseIniContent(content: string): Record<string, any> {
        const result: Record<string, any> = {};
        let currentSection = '';

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
                continue;
            }

            // Section headers [section]
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                currentSection = trimmed.slice(1, -1);
                if (!result[currentSection]) {
                    result[currentSection] = {};
                }
                continue;
            }

            // Key-value pairs
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                
                if (currentSection) {
                    result[currentSection][key] = this.parseValue(value);
                } else {
                    result[key] = this.parseValue(value);
                }
            }
        }

        return result;
    }

    /**
     * Parse string values into appropriate types
     */
    private parseValue(value: string): any {
        // Boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Number values
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

        // String values (remove quotes if present)
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        return value;
    }

    /**
     * Get configuration value using dot notation
     * Examples: 
     *   get('blockchain.rpcUrl')
     *   get('email.microsoftGraph.clientId')
     */
    public get(key: string): any {
        const keys = key.split('.');
        let current = this.config;

        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * Set configuration value using dot notation
     */
    public set(key: string, value: any): void {
        const keys = key.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Check if a configuration key exists
     */
    public has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Get entire configuration section
     */
    public getSection(section: string): Record<string, any> {
        return this.config[section] || {};
    }

    /**
     * Get all configuration
     */
    public getAll(): Record<string, any> {
        return { ...this.config };
    }

    /**
     * Get domain name
     */
    public getDomain(): string {
        return this.domain;
    }

    /**
     * Get configuration directory path
     */
    public getConfigDir(): string {
        return this.configDir;
    }
}