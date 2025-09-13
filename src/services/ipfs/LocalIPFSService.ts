import { create as createIPFS, IPFSHTTPClient } from 'ipfs-http-client';
import { Config } from '../../core/configuration';

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  size?: number;
  error?: string;
}

export interface IPFSRetrievalResult {
  success: boolean;
  content?: Buffer | string;
  contentType?: string;
  size?: number;
  error?: string;
}

export interface EmailIPFSPackage {
  emailData: {
    messageId: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    bodyText: string;
    bodyHtml: string;
    headers: { [key: string]: string };
    authentication: any;
    hashes: {
      bodyHash: string;
      emailHash: string;
      emailHeadersHash: string;
    };
  };
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    contentHash: string;
    ipfsHash: string;
  }>;
  metadata: {
    createdAt: string;
    platform: string;
    version: string;
    totalSize: number;
  };
}

export class LocalIPFSService {
  private ipfsClient: IPFSHTTPClient | null = null;
  private config: Config;
  private isConnected: boolean = false;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  /**
   * Initialize connection to local IPFS node
   */
  async initialize(): Promise<void> {
    try {
      const ipfsUrl = this.config.get('IPFS_LOCAL_URL', 'http://localhost:5001');
      
      console.log(`🔌 Connecting to local IPFS node at ${ipfsUrl}`);
      
      this.ipfsClient = createIPFS({
        url: ipfsUrl,
        timeout: 30000, // 30 second timeout
      });
      
      // Test connection
      const nodeId = await this.ipfsClient.id();
      console.log(`✅ Connected to IPFS node: ${nodeId.id}`);
      console.log(`   Addresses: ${nodeId.addresses.slice(0, 2).join(', ')}...`);
      
      this.isConnected = true;
      
    } catch (error: any) {
      console.error('❌ Failed to connect to local IPFS node:', error);
      this.isConnected = false;
      throw new Error(`IPFS connection failed: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Check if IPFS service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.ipfsClient) return false;
    
    try {
      await this.ipfsClient.id();
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Upload email data package to IPFS
   */
  async uploadEmailPackage(
    emailData: any, 
    attachments: any[]
  ): Promise<IPFSUploadResult> {
    
    if (!this.isConnected || !this.ipfsClient) {
      return {
        success: false,
        error: 'IPFS service not connected'
      };
    }
    
    try {
      console.log('📦 Preparing email package for IPFS upload...');
      
      // Upload attachments first
      const uploadedAttachments = await this.uploadAttachments(attachments);
      
      // Create comprehensive email package
      const emailPackage: EmailIPFSPackage = {
        emailData: {
          messageId: emailData.messageId,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          date: emailData.date.toISOString(),
          bodyText: emailData.bodyText,
          bodyHtml: emailData.bodyHtml,
          headers: emailData.headers,
          authentication: emailData.authentication,
          hashes: {
            bodyHash: emailData.bodyHash,
            emailHash: emailData.emailHash,
            emailHeadersHash: emailData.emailHeadersHash
          }
        },
        attachments: uploadedAttachments,
        metadata: {
          createdAt: new Date().toISOString(),
          platform: 'SKS Rootz Platform',
          version: '1.0.0',
          totalSize: this.calculateTotalSize(emailData, attachments)
        }
      };
      
      // Convert to JSON and upload
      const packageJson = JSON.stringify(emailPackage, null, 2);
      const packageBuffer = Buffer.from(packageJson, 'utf8');
      
      console.log(`📤 Uploading email package (${packageBuffer.length} bytes)...`);
      
      const result = await this.ipfsClient.add(packageBuffer, {
        pin: true, // Pin to prevent garbage collection
        wrapWithDirectory: false,
        cidVersion: 1
      });
      
      const ipfsHash = result.cid.toString();
      const ipfsUrl = this.getIPFSUrl(ipfsHash);
      
      console.log(`✅ Email package uploaded to IPFS:`);
      console.log(`   Hash: ${ipfsHash}`);
      console.log(`   URL: ${ipfsUrl}`);
      console.log(`   Size: ${result.size} bytes`);
      
      return {
        success: true,
        ipfsHash,
        ipfsUrl,
        size: result.size
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
   * Upload individual attachments to IPFS
   */
  private async uploadAttachments(attachments: any[]): Promise<any[]> {
    const uploadedAttachments = [];
    
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      
      try {
        console.log(`📎 Uploading attachment ${i + 1}: ${attachment.filename}`);
        
        const result = await this.ipfsClient!.add(attachment.content, {
          pin: true,
          wrapWithDirectory: false,
          cidVersion: 1
        });
        
        const attachmentHash = result.cid.toString();
        
        uploadedAttachments.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          contentHash: attachment.contentHash,
          ipfsHash: attachmentHash
        });
        
        console.log(`   ✅ ${attachment.filename} → ${attachmentHash}`);
        
      } catch (error: any) {
        console.error(`   ❌ Failed to upload ${attachment.filename}:`, error);
        
        // Add placeholder for failed upload
        uploadedAttachments.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          contentHash: attachment.contentHash,
          ipfsHash: 'upload-failed',
          error: error?.message || 'Upload failed'
        });
      }
    }
    
    return uploadedAttachments;
  }
  
  /**
   * Retrieve content from IPFS
   */
  async retrieveContent(ipfsHash: string): Promise<IPFSRetrievalResult> {
    if (!this.isConnected || !this.ipfsClient) {
      return {
        success: false,
        error: 'IPFS service not connected'
      };
    }
    
    try {
      console.log(`📥 Retrieving content from IPFS: ${ipfsHash}`);
      
      const chunks = [];
      for await (const chunk of this.ipfsClient.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks);
      
      console.log(`✅ Retrieved ${content.length} bytes from IPFS`);
      
      return {
        success: true,
        content,
        size: content.length
      };
      
    } catch (error: any) {
      console.error('❌ IPFS retrieval failed:', error);
      return {
        success: false,
        error: error?.message || 'Retrieval failed'
      };
    }
  }
  
  /**
   * Pin content to prevent garbage collection
   */
  async pinContent(ipfsHash: string): Promise<boolean> {
    if (!this.isConnected || !this.ipfsClient) {
      return false;
    }
    
    try {
      await this.ipfsClient.pin.add(ipfsHash);
      console.log(`📌 Pinned content: ${ipfsHash}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to pin content ${ipfsHash}:`, error);
      return false;
    }
  }
  
  /**
   * Check if content exists in IPFS
   */
  async contentExists(ipfsHash: string): Promise<boolean> {
    if (!this.isConnected || !this.ipfsClient) {
      return false;
    }
    
    try {
      // Try to get the first chunk
      for await (const chunk of this.ipfsClient.cat(ipfsHash, { length: 1 })) {
        return true; // If we get any data, it exists
      }
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Get IPFS gateway URL for content
   */
  private getIPFSUrl(ipfsHash: string): string {
    const gatewayUrl = this.config.get('IPFS_GATEWAY_URL', 'http://localhost:8080');
    return `${gatewayUrl}/ipfs/${ipfsHash}`;
  }
  
  /**
   * Calculate total size of email package
   */
  private calculateTotalSize(emailData: any, attachments: any[]): number {
    const emailSize = Buffer.byteLength(JSON.stringify(emailData), 'utf8');
    const attachmentSize = attachments.reduce((total, att) => total + att.size, 0);
    return emailSize + attachmentSize;
  }
  
  /**
   * Get node statistics
   */
  async getNodeStats(): Promise<any> {
    if (!this.isConnected || !this.ipfsClient) {
      return null;
    }
    
    try {
      const stats = await this.ipfsClient.stats.repo();
      return {
        repoSize: stats.repoSize,
        storageMax: stats.storageMax,
        numObjects: stats.numObjects,
        version: stats.version
      };
    } catch (error) {
      console.error('Failed to get IPFS stats:', error);
      return null;
    }
  }
  
  /**
   * Health check for IPFS service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.ipfsClient) {
        return { healthy: false, details: { error: 'IPFS client not initialized' } };
      }
      
      const nodeId = await this.ipfsClient.id();
      const stats = await this.getNodeStats();
      
      return {
        healthy: true,
        details: {
          nodeId: nodeId.id,
          addresses: nodeId.addresses.length,
          version: nodeId.agentVersion,
          stats: stats
        }
      };
      
    } catch (error: any) {
      return {
        healthy: false,
        details: { error: error?.message || 'Unknown error' }
      };
    }
  }
}

export default LocalIPFSService;
