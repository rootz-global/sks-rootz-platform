import { ethers } from 'ethers';
import { Config } from '../../core/configuration';
import { ParsedEmailData } from '../email-processing/EmailParser';

export interface AuthorizationRequest {
  requestId: string;
  userAddress: string;
  authToken: string;
  emailHash: string;
  attachmentHashes: string[];
  creditCost: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'authorized' | 'processed' | 'expired' | 'cancelled';
}

export interface AuthorizationResult {
  success: boolean;
  requestId?: string;
  authToken?: string;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  emailWalletId?: string;
  attachmentWalletIds?: string[];
  totalCreditsUsed?: number;
  error?: string;
}

export class AuthorizationService {
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private authContract!: ethers.Contract;
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
    this.initializeBlockchain();
  }
  
  /**
   * Initialize blockchain connection and contracts
   */
  private initializeBlockchain(): void {
    try {
      const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
      const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
      const contractAddress = this.config.get('blockchain.contractAuthorization');
      
      if (!privateKey) {
        throw new Error('blockchain.serviceWalletPrivateKey not configured in INI file');
      }
      
      if (!contractAddress) {
        throw new Error('blockchain.contractAuthorization not configured in INI file');
      }
      
      // Initialize provider and wallet (ethers v5 syntax)
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      
      // Initialize contract (minimal ABI for basic functionality)
      const authABI = [
        "function createAuthorizationRequest(address userWallet, string authToken, bytes32 emailHash, bytes32[] attachmentHashes) external returns (bytes32 requestId)",
        "function getAuthorizationRequest(bytes32 requestId) external view returns (address userWallet, string authToken, bytes32 emailHash, uint256 attachmentCount, uint256 creditCost, uint256 createdAt, uint256 expiresAt, uint8 status)",
        "function processAuthorizedRequest(bytes32 requestId, tuple(string forwardedBy, string originalSender, string messageId, string subject, bytes32 bodyHash, bytes32 emailHash, bytes32 emailHeadersHash, uint256 attachmentCount, string ipfsHash, tuple(bool spfPass, bool dkimValid, bool dmarcPass, string dkimSignature) authResults) emailData, tuple(string originalFilename, string filename, string mimeType, string fileExtension, uint256 fileSize, bytes32 contentHash, string fileSignature, string ipfsHash, uint256 attachmentIndex, string emailSender, string emailSubject, uint256 emailTimestamp)[] attachmentData) external returns (tuple(bool success, bytes32 emailWalletId, bytes32[] attachmentWalletIds, uint256 totalCreditsUsed, string errorMessage))"
      ];
      
      this.authContract = new ethers.Contract(contractAddress, authABI, this.serviceWallet);
      
      console.log('✅ Authorization service initialized');
      console.log(`   Service Wallet: ${this.serviceWallet.address}`);
      console.log(`   Contract: ${contractAddress}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize authorization service:', error);
      throw error;
    }
  }
  
  /**
   * Create authorization request for email wallet creation
   */
  async createAuthorizationRequest(
    userAddress: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('📝 Creating authorization request...');
      console.log(`   User: ${userAddress}`);
      console.log(`   Email: ${emailData.subject} from ${emailData.from}`);
      console.log(`   IPFS: ${ipfsHash}`);
      
      // Generate unique auth token
      const authToken = this.generateAuthToken(userAddress, emailData);
      
      // Prepare email hash (ensure it's bytes32 format)
      const emailHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.emailHash));
      
      // Prepare attachment hashes
      const attachmentHashes = emailData.attachments.map(att => 
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(att.contentHash))
      );
      
      console.log(`   Email Hash: ${emailHash}`);
      console.log(`   Attachments: ${attachmentHashes.length}`);
      
      // Call contract to create authorization request
      const tx = await this.authContract.createAuthorizationRequest(
        userAddress,
        authToken,
        emailHash,
        attachmentHashes,
        {
          gasLimit: 500000, // Set explicit gas limit
          gasPrice: ethers.utils.parseUnits('30', 'gwei') // Set gas price
        }
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Extract request ID from logs (raw log parsing)
      const requestId = await this.extractRequestIdFromReceipt(receipt);
      
      if (!requestId) {
        throw new Error('Failed to extract request ID from transaction receipt');
      }
      
      console.log(`✅ Authorization request created:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Auth Token: ${authToken}`);
      
      return {
        success: true,
        requestId,
        authToken
      };
      
    } catch (error: any) {
      console.error('❌ Failed to create authorization request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create authorization request'
      };
    }
  }
  
  /**
   * Get authorization request details
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {
    try {
      const requestBytes = requestId; // Use requestId directly (already bytes32)
      const result = await this.authContract.getAuthorizationRequest(requestBytes);
      
      return {
        requestId,
        userAddress: result.userWallet,
        authToken: result.authToken,
        emailHash: result.emailHash,
        attachmentHashes: [], // Would need to be stored separately
        creditCost: Number(result.creditCost),
        createdAt: new Date(Number(result.createdAt) * 1000),
        expiresAt: new Date(Number(result.expiresAt) * 1000),
        status: this.mapContractStatus(result.status) as AuthorizationRequest['status']
      };
      
    } catch (error) {
      console.error('Failed to get authorization request:', error);
      return null;
    }
  }
  
  /**
   * Process authorized request and create wallets
   */
  async processAuthorizedRequest(
    requestId: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<ProcessingResult> {
    
    try {
      console.log('🔄 Processing authorized request...');
      console.log(`   Request ID: ${requestId}`);
      
      const requestBytes = requestId; // Use requestId directly (already bytes32)
      
      // Prepare email data for contract
      const contractEmailData = {
        forwardedBy: 'rootz.global',
        originalSender: emailData.from,
        messageId: emailData.messageId,
        subject: emailData.subject,
        bodyHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.bodyHash)),
        emailHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.emailHash)),
        emailHeadersHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.emailHeadersHash)),
        attachmentCount: emailData.attachments.length,
        ipfsHash: ipfsHash,
        authResults: {
          spfPass: emailData.authentication.spfPass,
          dkimValid: emailData.authentication.dkimValid,
          dmarcPass: emailData.authentication.dmarcPass,
          dkimSignature: emailData.authentication.dkimSignature || ''
        }
      };
      
      // Prepare attachment data for contract
      const contractAttachmentData = emailData.attachments.map((att, index) => ({
        originalFilename: att.filename,
        filename: att.filename,
        mimeType: att.contentType,
        fileExtension: this.getFileExtension(att.filename),
        fileSize: att.size,
        contentHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(att.contentHash)),
        fileSignature: '', // Could be computed if needed
        ipfsHash: '', // Would be set if attachment uploaded separately
        attachmentIndex: index,
        emailSender: emailData.from,
        emailSubject: emailData.subject,
        emailTimestamp: Math.floor(emailData.date.getTime() / 1000)
      }));
      
      console.log('📤 Calling processAuthorizedRequest...');
      
      // Call contract to process the request
      const tx = await this.authContract.processAuthorizedRequest(
        requestBytes,
        contractEmailData,
        contractAttachmentData,
        {
          gasLimit: 1000000, // Higher limit for wallet creation
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`⏳ Processing transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Processing completed in block ${receipt.blockNumber}`);
      
      // For now, just return success - wallet creation details would need event parsing
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Failed to process authorized request:', error);
      return {
        success: false,
        error: error?.message || 'Processing failed'
      };
    }
  }
  
  /**
   * Generate unique auth token
   */
  private generateAuthToken(userAddress: string, emailData: ParsedEmailData): string {
    const timestamp = Date.now();
    const data = `${userAddress}-${emailData.messageId}-${timestamp}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data)).substring(0, 18); // Shorter for readability
  }
  
  /**
   * Extract request ID from transaction receipt using raw log parsing
   */
  private async extractRequestIdFromReceipt(receipt: ethers.providers.TransactionReceipt): Promise<string | null> {
    try {
      console.log('🔍 Parsing transaction logs for request ID...');
      console.log(`   Total logs: ${receipt.logs.length}`);
      
      // Look for logs from our contract
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.authContract.address.toLowerCase()) {
          console.log(`   Found contract log with ${log.topics.length} topics`);
          
          // The request ID should be in topic[1] based on the transaction analysis
          if (log.topics.length >= 2) {
            const requestId = log.topics[1]; // Request ID is in topic[1]
            console.log(`   Extracted Request ID: ${requestId}`);
            return requestId;
          }
        }
      }
      
      console.log('❌ No matching contract logs found');
      return null;
      
    } catch (error) {
      console.error('Failed to extract request ID:', error);
      return null;
    }
  }
  
  /**
   * Map contract status enum to string
   */
  private mapContractStatus(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'pending',
      1: 'authorized', 
      2: 'processed',
      3: 'expired',
      4: 'cancelled'
    };
    return statusMap[status] || 'unknown';
  }
  
  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }
  
  /**
   * Check service wallet balance
   */
  async checkServiceWalletBalance(): Promise<{ balance: string; sufficient: boolean }> {
    try {
      const balance = await this.provider.getBalance(this.serviceWallet.address);
      const balanceInEth = ethers.utils.formatEther(balance);
      const sufficient = parseFloat(balanceInEth) > 0.01; // Need at least 0.01 POL
      
      return {
        balance: `${balanceInEth} POL`,
        sufficient
      };
    } catch (error) {
      console.error('Failed to check wallet balance:', error);
      return { balance: 'unknown', sufficient: false };
    }
  }
  
  /**
   * Health check for authorization service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const balance = await this.checkServiceWalletBalance();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        healthy: balance.sufficient,
        details: {
          serviceWallet: this.serviceWallet.address,
          balance: balance.balance,
          blockNumber,
          contractAddress: this.authContract.address,
          networkConnected: true
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

export default AuthorizationService;
