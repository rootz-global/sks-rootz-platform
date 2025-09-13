import { Config } from '../../core/configuration';
import fetch from 'node-fetch';

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  size?: number;
  error?: string;
}

/**
 * Simple IPFS Service using Pinata
 * Updated to work with existing Pinata credentials
 */
export class LocalIPFSService {
  private config: Config;
  private isConnected: boolean = false;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  /**
   * Initialize connection to Pinata IPFS service
   */
  async initialize(): Promise<void> {
    try {
      const pinataApiKey = this.config.get('ipfs.pinataApiKey');
      const pinataSecretKey = this.config.get('ipfs.pinataSecretKey');
      
      if (!pinataApiKey || !pinataSecretKey) {
        throw new Error('Pinata API credentials not found in configuration');
      }
      
      console.log('🔌 Connecting to Pinata IPFS service...');
      
      // Test Pinata connection
      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Pinata authentication failed: ${response.status}`);
      }
      
      const authResult = await response.json();
      console.log('✅ Connected to Pinata IPFS service');
      console.log(`   Gateway: https://gateway.pinata.cloud/ipfs`);
      console.log(`   Auth: ${authResult.message || 'Success'}`);
      
      this.isConnected = true;
      
    } catch (error: any) {
      console.error('❌ Failed to connect to Pinata IPFS service:', error);
      this.isConnected = false;
      throw error;
    }
  }
  
  /**
   * Upload email data package to IPFS via Pinata
   */
  async uploadEmailPackage(emailData: any, attachments: any[]): Promise<IPFSUploadResult> {
    if (!this.isConnected) {
      return {
        success: false,
        error: 'IPFS service not connected'
      };
    }
    
    try {
      console.log('📦 Preparing email package for Pinata upload...');
      
      // Create comprehensive email package
      const emailPackage = {
        emailData: {
          messageId: emailData.messageId,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          date: emailData.date,
          bodyText: emailData.bodyText,
          bodyHtml: emailData.bodyHtml,
          headers: emailData.headers,
          authentication: emailData.authentication,
          hashes: emailData.hashes
        },
        attachments: [],
        metadata: {
          createdAt: new Date().toISOString(),
          platform: 'SKS Rootz Platform',
          version: '1.0.0',
          totalSize: JSON.stringify(emailData).length
        }
      };
      
      const packageJson = JSON.stringify(emailPackage, null, 2);
      console.log(`📤 Uploading email package (${packageJson.length} bytes) to Pinata...`);
      
      const pinataApiKey = this.config.get('ipfs.pinataApiKey');
      const pinataSecretKey = this.config.get('ipfs.pinataSecretKey');
      
      // Use form-data package for proper multipart uploads
      const FormData = require('form-data');
      const form = new FormData();
      
      // Add file content
      form.append('file', Buffer.from(packageJson), {
        filename: 'email-package.json',
        contentType: 'application/json'
      });
      
      // Add metadata
      const metadata = JSON.stringify({
        name: `Email Package ${Date.now()}`,
        keyvalues: {
          platform: 'SKS Rootz Platform',
          type: 'email-package',
          version: '1.0.0'
        }
      });
      form.append('pinataMetadata', metadata);
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey
        },
        body: form
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      const ipfsHash = result.IpfsHash;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      console.log('✅ Email package uploaded to Pinata:');
      console.log(`   Hash: ${ipfsHash}`);
      console.log(`   URL: ${ipfsUrl}`);
      console.log(`   Size: ${result.PinSize} bytes`);
      
      return {
        success: true,
        ipfsHash,
        ipfsUrl,
        size: result.PinSize
      };
      
    } catch (error: any) {
      console.error('❌ IPFS upload failed:', error);
      return {
        success: false,
        error: error?.message || 'Upload failed'
      };
    }
  }
  
  /**
   * Health check for IPFS service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }
      
      return {
        healthy: true,
        details: {
          service: 'Pinata IPFS',
          gateway: 'https://gateway.pinata.cloud/ipfs',
          status: 'connected'
        }
      };
      
    } catch (error: any) {
      this.isConnected = false;
      return {
        healthy: false,
        details: { 
          error: error?.message || 'Unknown error',
          service: 'Pinata IPFS'
        }
      };
    }
  }
}

export default LocalIPFSService;
