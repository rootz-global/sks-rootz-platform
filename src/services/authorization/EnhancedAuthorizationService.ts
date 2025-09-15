import { ethers } from 'ethers';
import { Config } from '../../core/configuration';
import { ParsedEmailData } from '../email-processing/EmailParser';
import { DatabaseService } from '../database/DatabaseService';

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
  emailSender?: string;
  emailSubject?: string;
  attachmentCount?: number;
  ipfsHash?: string;
  emailData?: ParsedEmailData;
}

export interface AuthorizationResult {
  success: boolean;
  requestId?: string;
  authToken?: string;
  emailWalletId?: string;
  attachmentWalletIds?: string[];
  authorizationTx?: string;
  totalCreditsUsed?: number;
  error?: string;
}

/**
 * Enhanced Authorization Service with PostgreSQL Database
 * 
 * SOLVES: Authorization request persistence issues by using database storage
 * instead of problematic in-memory Maps that don't survive service restarts
 * or work correctly across multiple service instances.
 */
export class EnhancedAuthorizationService {
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private emailDataWalletContract!: ethers.Contract;
  private registrationContract!: ethers.Contract;
  private config!: Config;
  private database: DatabaseService;
  
  constructor(config: Config) {
    this.config = config;
    this.database = new DatabaseService(config);
    this.initializeBlockchain();
  }
  
  /**
   * Initialize database connection and blockchain
   */
  async initialize(): Promise<void> {
    try {
      console.log('📊 Initializing Enhanced Authorization Service with database...');
      
      // Initialize database first
      await this.database.initialize();
      
      // Clean up any expired requests
      await this.database.cleanupExpiredRequests();
      
      console.log('✅ Enhanced Authorization Service initialized with database persistence');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Authorization Service:', error);
      throw error;
    }
  }
  
  /**
   * Initialize blockchain connection with NEW enhanced contracts
   */
  private initializeBlockchain(): void {
    try {
      const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
      const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
      const emailWalletContractAddress = this.config.get('blockchain.contractEmailDataWallet');
      const registrationContractAddress = this.config.get('blockchain.contractRegistration');
      
      if (!privateKey) {
        throw new Error('blockchain.serviceWalletPrivateKey not configured');
      }
      
      if (!emailWalletContractAddress) {
        throw new Error('blockchain.contractEmailDataWallet not configured');
      }
      
      if (!registrationContractAddress) {
        throw new Error('blockchain.contractRegistration not configured');
      }
      
      // Initialize provider and wallet (ethers v5 syntax)
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      
      // NEW EmailDataWalletOS_Secure ABI
      const emailDataWalletABI = [
        "function createEmailDataWallet(address owner, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)",
        "function getEmailDataWallet(bytes32 walletId) view returns (tuple(address owner, string subject, string sender, uint256 timestamp, bool isActive, bytes32 contentHash, string ipfsHash))",
        "function getAllUserWallets(address user) view returns (bytes32[] memory)",
        "function getActiveWalletCount(address user) view returns (uint256)",
        "function getTotalWalletCount() view returns (uint256)",
        "function walletExists(bytes32 walletId) view returns (bool)",
        "function updateEmailDataWallet(bytes32 walletId, string newSubject, string newSender, bytes32 newContentHash, string newIpfsHash)",
        "function owner() view returns (address)"
      ];
      
      // Registration contract ABI
      const registrationABI = [
        "function isRegistered(address wallet) view returns (bool)",
        "function getCreditBalance(address wallet) view returns (uint256)",
        "function deductCredits(address wallet, uint256 amount) returns (bool)",
        "function owner() view returns (address)"
      ];
      
      this.emailDataWalletContract = new ethers.Contract(
        emailWalletContractAddress,
        emailDataWalletABI,
        this.serviceWallet
      );
      
      this.registrationContract = new ethers.Contract(
        registrationContractAddress,
        registrationABI,
        this.serviceWallet
      );
      
      console.log('✅ Enhanced Authorization service initialized');
      console.log(`   Service Wallet: ${this.serviceWallet.address}`);
      console.log(`   EmailDataWallet Contract: ${emailWalletContractAddress}`);
      console.log(`   Registration Contract: ${registrationContractAddress}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced authorization service:', error);
      throw error;
    }
  }
  
  /**
   * Create authorization request (stored in DATABASE, not memory)
   */
  async createAuthorizationRequest(
    userAddress: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('📝 Creating enhanced authorization request...');
      console.log(`   User: ${userAddress}`);
      console.log(`   Email: ${emailData.subject} from ${emailData.from}`);
      console.log(`   IPFS: ${ipfsHash}`);
      
      // Verify user is registered
      const isRegistered = await this.registrationContract.isRegistered(userAddress);
      if (!isRegistered) {
        throw new Error('User not registered');
      }
      
      // Check credit balance
      const creditBalance = await this.registrationContract.getCreditBalance(userAddress);
      const requiredCredits = 3 + (emailData.attachments.length * 2) + 1; // Base + attachments + processing
      
      if (creditBalance.lt(requiredCredits)) {
        throw new Error(`Insufficient credits. Required: ${requiredCredits}, Available: ${creditBalance.toString()}`);
      }
      
      // Generate unique IDs
      const requestId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
        `${userAddress}-${emailData.messageId}-${Date.now()}`
      ));
      const authToken = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
        `${userAddress}-${Date.now()}`
      )).substring(0, 18);
      
      // Create authorization request object
      const authRequest: AuthorizationRequest = {
        requestId,
        userAddress,
        authToken,
        emailHash: emailData.emailHash,
        attachmentHashes: emailData.attachments.map(att => att.contentHash),
        creditCost: requiredCredits,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
        emailSender: emailData.from,
        emailSubject: emailData.subject,
        attachmentCount: emailData.attachments.length,
        ipfsHash,
        emailData
      };
      
      // Store in DATABASE (not memory)
      await this.database.createAuthorizationRequest(authRequest);
      
      console.log(`✅ Enhanced authorization request created:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Auth Token: ${authToken}`);
      console.log(`   📊 Stored in database (persistent)`);
      
      return {
        success: true,
        requestId,
        authToken
      };
      
    } catch (error: any) {
      console.error('❌ Failed to create enhanced authorization request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create authorization request'
      };
    }
  }
  
  /**
   * ENHANCED USER AUTHORIZATION - Direct wallet creation with signature verification
   */
  async authorizeEmailWalletCreation(
    requestId: string,
    userAddress: string,
    signature: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('🔐 Processing enhanced user authorization...');
      console.log(`   Request ID: ${requestId}`);
      console.log(`   User Address: ${userAddress}`);
      
      // Get authorization request from DATABASE
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Authorization request not found');
      }
      
      if (request.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Request belongs to different user');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Request status is ${request.status}, cannot authorize`);
      }
      
      if (new Date() > request.expiresAt) {
        await this.database.updateRequestStatus(requestId, 'expired');
        throw new Error('Authorization request has expired');
      }
      
      // Verify signature (user proving consent)
      // Frontend signs: signer.signMessage(ethers.utils.arrayify(requestId))
      // So we verify against the raw requestId bytes
      const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(requestId), signature);
      
      if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Invalid signature - signature does not match user address');
      }
      
      console.log('✅ Signature verified - user consent proven');
      
      // ENHANCED FEATURE: Service creates EMAIL_DATA_WALLET directly
      console.log('🔧 Creating EMAIL_DATA_WALLET using enhanced contract...');
      
      if (!request.emailData) {
        throw new Error('Email data not found in request');
      }
      
      // Deduct credits first
      console.log(`💰 Deducting ${request.creditCost} credits from user...`);
      const deductTx = await this.registrationContract.deductCredits(
        userAddress,
        request.creditCost,
        {
          gasLimit: 200000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      await deductTx.wait();
      console.log(`✅ Credits deducted: ${deductTx.hash}`);
      
      // Create content hash
      const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(request.emailData.emailHash));
      
      // Create EMAIL_DATA_WALLET on new enhanced contract
      const createTx = await this.emailDataWalletContract.createEmailDataWallet(
        userAddress,
        request.emailData.subject,
        request.emailData.from,
        contentHash,
        request.ipfsHash || '',
        {
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`⏳ EMAIL_DATA_WALLET creation transaction: ${createTx.hash}`);
      
      const receipt = await createTx.wait();
      console.log(`✅ EMAIL_DATA_WALLET created in block ${receipt.blockNumber}`);
      
      // Extract wallet ID from transaction logs
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      // Update request status in DATABASE
      await this.database.updateRequestStatus(requestId, 'processed');
      
      console.log(`🎉 EMAIL_DATA_WALLET creation complete:`);
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Transaction: ${createTx.hash}`);
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [], // Enhanced contract handles email + attachments in one wallet
        authorizationTx: createTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('❌ Enhanced authorization failed:', error);
      return {
        success: false,
        error: error?.message || 'Enhanced authorization failed'
      };
    }
  }
  
  /**
   * Get authorization request details from DATABASE
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {
    try {
      return await this.database.getAuthorizationRequest(requestId);
    } catch (error) {
      console.error('❌ Error getting authorization request:', error);
      return null;
    }
  }
  
  /**
   * Get authorization request by auth token from DATABASE
   */
  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequest | null> {
    try {
      return await this.database.getAuthorizationRequestByToken(authToken);
    } catch (error) {
      console.error('❌ Error getting authorization request by token:', error);
      return null;
    }
  }
  
  /**
   * Get user's authorization requests from DATABASE
   */
  async getUserRequests(userAddress: string): Promise<string[]> {
    try {
      const requests = await this.database.getUserRequests(userAddress);
      return requests.map(request => request.requestId);
    } catch (error) {
      console.error('❌ Error getting user requests:', error);
      return [];
    }
  }
  
  /**
   * Cancel authorization request in DATABASE
   */
  async cancelRequest(requestId: string): Promise<AuthorizationResult> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Cannot cancel request with status: ${request.status}`);
      }
      
      await this.database.updateRequestStatus(requestId, 'cancelled');
      
      console.log(`🚫 Request cancelled: ${requestId}`);
      
      return {
        success: true,
        requestId
      };
      
    } catch (error: any) {
      console.error('❌ Failed to cancel request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to cancel request'
      };
    }
  }
  
  /**
   * Check if authorization request is valid
   */
  async isRequestValid(requestId: string): Promise<boolean> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) return false;
      
      if (request.status !== 'pending') return false;
      if (new Date() > request.expiresAt) {
        // Auto-expire the request
        await this.database.updateRequestStatus(requestId, 'expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking request validity:', error);
      return false;
    }
  }
  
  /**
   * Process authorized request (legacy compatibility)
   */
  async processAuthorizedRequest(
    requestId: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<AuthorizationResult> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.status !== 'authorized') {
        throw new Error('Request not authorized');
      }
      
      // Create EMAIL_DATA_WALLET directly
      const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.emailHash));
      
      const createTx = await this.emailDataWalletContract.createEmailDataWallet(
        request.userAddress,
        emailData.subject,
        emailData.from,
        contentHash,
        ipfsHash,
        {
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      const receipt = await createTx.wait();
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      await this.database.updateRequestStatus(requestId, 'processed');
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [],
        authorizationTx: createTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('Error processing authorized request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to process request'
      };
    }
  }
  
  /**
   * Health check for enhanced authorization service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const balance = await this.provider.getBalance(this.serviceWallet.address);
      const balanceInEth = ethers.utils.formatEther(balance);
      const blockNumber = await this.provider.getBlockNumber();
      
      // Check database health
      const dbHealth = await this.database.healthCheck();
      const dbStats = await this.database.getStatistics();
      
      return {
        healthy: parseFloat(balanceInEth) > 0.01 && dbHealth.healthy,
        details: {
          serviceWallet: this.serviceWallet.address,
          balance: `${balanceInEth} POL`,
          blockNumber,
          emailDataWalletContract: this.emailDataWalletContract.address,
          registrationContract: this.registrationContract.address,
          database: dbHealth.details,
          pendingRequests: dbStats.totalRequests,
          requestsByStatus: dbStats.byStatus,
          enhanced: true,
          persistent: true
        }
      };
      
    } catch (error: any) {
      return {
        healthy: false,
        details: { error: error?.message || 'Unknown error' }
      };
    }
  }
  
  /**
   * Extract wallet ID from transaction receipt
   */
  private extractWalletIdFromReceipt(receipt: ethers.providers.TransactionReceipt): string | null {
    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.emailDataWalletContract.address.toLowerCase()) {
          if (log.topics.length >= 2) {
            return log.topics[1];
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to extract wallet ID from receipt:', error);
      return null;
    }
  }
  
  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.database.close();
  }
}

export default EnhancedAuthorizationService;