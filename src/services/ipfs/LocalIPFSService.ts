import { Config } from '../../core/configuration';
import fetch from 'node-fetch';
import FormData from 'form-data';

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

/**
 * Real IPFS Service using rootz.digital IPFS infrastructure
 */
export class LocalIPFSService {
  private config: Config;
  private isConnected: boolean = false;
  private ipfsApiUrl: string;
  private ipfsGatewayUrl: string;
  
  constructor(config: Config) {
    this.config = config;
    this.ipfsApiUrl = 'https://rootz.digital/api/v0';
    this.ipfsGatewayUrl = 'https://rootz.digital/ipfs';
  }
  
  /**
   * Initialize connection to rootz.digital IPFS node
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔌 Connecting to IPFS node at ${this.ipfsApiUrl}`);
      
      // Test connection by getting node ID
      const response = await fetch(`${this.ipfsApiUrl}/id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`IPFS node responded with status ${response.status}`);
      }
      
      const nodeInfo = await response.json();
      console.log(`✅ Connected to IPFS node: ${nodeInfo.ID}`);
      console.log(`   Gateway: ${this.ipfsGatewayUrl}`);
      console.log(`   Agent: ${nodeInfo.AgentVersion || 'Unknown'}`);
      
      this.isConnected = true;
      
    } catch (error: any) {
      console.error('❌ Failed to connect to IPFS node:', error);
      this.isConnected = false;
      throw new Error(`IPFS connection failed: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Check if IPFS service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.ipfsApiUrl}/id`, {
        method: 'POST'
      });
      return response.ok;
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
    
    if (!this.isConnected) {
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
      
      console.log(`📤 Uploading email package (${packageJson.length} bytes) to rootz.digital IPFS...`);
      
      // Use IPFS HTTP API to add content
      const formData = new FormData();
      formData.append('file', Buffer.from(packageJson), {
        filename: 'email-package.json',
        contentType: 'application/json'
      });
      
      const response = await fetch(`${this.ipfsApiUrl}/add?pin=true`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.text();
      const lines = result.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const uploadResult = JSON.parse(lastLine);
      
      const ipfsHash = uploadResult.Hash;
      const ipfsUrl = `${this.ipfsGatewayUrl}/${ipfsHash}`;
      
      console.log(`✅ Email package uploaded to IPFS:`);
      console.log(`   Hash: ${ipfsHash}`);
      console.log(`   URL: ${ipfsUrl}`);
      console.log(`   Size: ${uploadResult.Size} bytes`);
      
      return {
        success: true,
        ipfsHash,
        ipfsUrl,
        size: parseInt(uploadResult.Size)
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
        
        const formData = new FormData();
        formData.append('file', attachment.content, {
          filename: attachment.filename,
          contentType: attachment.contentType
        });
        
        const response = await fetch(`${this.ipfsApiUrl}/add?pin=true`, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }
        
        const result = await response.text();
        const lines = result.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const uploadResult = JSON.parse(lastLine);
        
        const attachmentHash = uploadResult.Hash;
        
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
    if (!this.isConnected) {
      return {
        success: false,
        error: 'IPFS service not connected'
      };
    }
    
    try {
      console.log(`📥 Retrieving content from IPFS: ${ipfsHash}`);
      
      const response = await fetch(`${this.ipfsGatewayUrl}/${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Retrieval failed: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const content = await response.buffer();
      
      console.log(`✅ Retrieved ${content.length} bytes from IPFS`);
      
      return {
        success: true,
        content,
        contentType,
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
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.ipfsApiUrl}/pin/add?arg=${ipfsHash}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log(`📌 Pinned content: ${ipfsHash}`);
        return true;
      } else {
        console.error(`❌ Failed to pin ${ipfsHash}: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to pin content ${ipfsHash}:`, error);
      return false;
    }
  }
  
  /**
   * Check if content exists in IPFS
   */
  async contentExists(ipfsHash: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.ipfsGatewayUrl}/${ipfsHash}`, {
        method: 'HEAD'
      });
      return response.ok;
    } catch {
      return false;
    }
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
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.ipfsApiUrl}/stats/repo`, {
        method: 'POST'
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get IPFS stats:', error);
    }
    
    return null;
  }
  
  /**
   * Health check for IPFS service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.isConnected) {
        await this.initialize(); // Try to reconnect
      }
      
      const response = await fetch(`${this.ipfsApiUrl}/id`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const nodeInfo = await response.json();
      const stats = await this.getNodeStats();
      
      return {
        healthy: true,
        details: {
          nodeId: nodeInfo.ID,
          agentVersion: nodeInfo.AgentVersion,
          gateway: this.ipfsGatewayUrl,
          apiEndpoint: this.ipfsApiUrl,
          stats: stats || 'unavailable'
        }
      };
      
    } catch (error: any) {
      this.isConnected = false;
      return {
        healthy: false,
        details: { 
          error: error?.message || 'Unknown error',
          gateway: this.ipfsGatewayUrl,
          apiEndpoint: this.ipfsApiUrl
        }
      };
    }
  }
}

export default LocalIPFSService;
