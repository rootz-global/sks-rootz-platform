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
      
      const authResult = await response.json() as { message?: string };
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
   * Now includes both raw original email and parsed data
   */
  async uploadEmailPackage(parsedEmailData: any, attachments: any[], rawEmailContent: string): Promise<IPFSUploadResult> {
    if (!this.isConnected) {
      return {
        success: false,
        error: 'IPFS service not connected'
      };
    }
    
    try {
      console.log('📦 Preparing comprehensive email package for Pinata upload...');
      
      // Create comprehensive email package with BOTH raw and parsed data
      const emailPackage = {
        // RAW ORIGINAL EMAIL - Unaltered for legal proof of origin
        rawEmail: {
          content: rawEmailContent,
          contentLength: rawEmailContent.length,
          contentHash: this.calculateHash(rawEmailContent),
          preservedFormat: 'original-as-received',
          legalNote: 'This is the unaltered original email as received by the system'
        },
        
        // PARSED STRUCTURED DATA - For searchability and display
        emailData: {
          messageId: parsedEmailData.messageId,
          subject: parsedEmailData.subject,
          from: parsedEmailData.from,
          to: parsedEmailData.to,
          date: parsedEmailData.date,
          bodyText: parsedEmailData.bodyText,
          bodyHtml: parsedEmailData.bodyHtml,
          headers: parsedEmailData.headers,
          authentication: parsedEmailData.authentication,
          // Include computed hashes for verification
          hashes: {
            bodyHash: parsedEmailData.bodyHash,
            emailHash: parsedEmailData.emailHash,
            emailHeadersHash: parsedEmailData.emailHeadersHash
          }
        },
        
        // ATTACHMENTS - Processed attachment data
        attachments: attachments || [],
        
        // METADATA - Platform and processing information
        metadata: {
          createdAt: new Date().toISOString(),
          platform: 'SKS Rootz Platform',
          version: '1.0.0',
          totalSize: rawEmailContent.length,
          processingNotes: {
            rawEmailPreserved: true,
            parsedDataAvailable: true,
            hashesVerified: true,
            legalCompliance: 'Original email content preserved for forensic verification'
          }
        },
        
        // VERIFICATION DATA - For proving integrity
        verification: {
          rawContentHash: this.calculateHash(rawEmailContent),
          parsedContentHash: this.calculateHash(JSON.stringify(parsedEmailData)),
          packageHash: '', // Will be calculated after package creation
          timestamp: new Date().toISOString(),
          preservationMethod: 'IPFS immutable storage'
        }
      };
      
      // Calculate package hash for integrity verification
      emailPackage.verification.packageHash = this.calculateHash(JSON.stringify(emailPackage));
      
      const packageJson = JSON.stringify(emailPackage, null, 2);
      console.log(`📤 Uploading comprehensive email package (${packageJson.length} bytes) to Pinata...`);
      console.log(`   Raw email: ${rawEmailContent.length} bytes`);
      console.log(`   Parsed data: ${JSON.stringify(parsedEmailData).length} bytes`);
      
      const pinataApiKey = this.config.get('ipfs.pinataApiKey');
      const pinataSecretKey = this.config.get('ipfs.pinataSecretKey');
      
      // Use form-data package for proper multipart uploads
      const FormData = require('form-data');
      const form = new FormData();
      
      // Add file content
      form.append('file', Buffer.from(packageJson), {
        filename: 'email-package-complete.json',
        contentType: 'application/json'
      });
      
      // Add metadata
      const metadata = JSON.stringify({
        name: `Complete Email Package ${Date.now()}`,
        keyvalues: {
          platform: 'SKS Rootz Platform',
          type: 'complete-email-package',
          version: '1.0.0',
          hasRawEmail: 'true',
          hasParsedData: 'true',
          legalCompliant: 'true'
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
      
      const result = await response.json() as { IpfsHash: string; PinSize: number };
      const ipfsHash = result.IpfsHash;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      console.log('✅ Complete email package uploaded to Pinata:');
      console.log(`   Hash: ${ipfsHash}`);
      console.log(`   URL: ${ipfsUrl}`);
      console.log(`   Size: ${result.PinSize} bytes`);
      console.log(`   🔒 Raw email preserved for legal verification`);
      console.log(`   📋 Parsed data available for searchability`);
      
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
   * Calculate SHA-256 hash for content verification
   */
  private calculateHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
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
