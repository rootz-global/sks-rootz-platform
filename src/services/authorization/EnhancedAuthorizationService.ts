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
   * Initialize blockchain connection with AuthorizationManagerFixed as orchestrator
   */
  private initializeBlockchain(): void {
    try {
      const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
      const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
      const authorizationContractAddress = ethers.utils.getAddress(
        this.config.get('blockchain.contractAuthorization', '0xcC2a65A8870289B1d43bA741069cC2CEEA219573').toLowerCase()
      );
      const registrationContractAddress = ethers.utils.getAddress(
        this.config.get('blockchain.contractRegistration')!.toLowerCase()
      );
      
      if (!privateKey) {
        throw new Error('blockchain.serviceWalletPrivateKey not configured');
      }
      
      if (!authorizationContractAddress) {
        throw new Error('blockchain.contractAuthorization not configured');
      }
      
      if (!registrationContractAddress) {
        throw new Error('blockchain.contractRegistration not configured');
      }
      
      // Initialize provider and wallet (ethers v5 syntax)
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      
      // AuthorizationManagerFixed ABI - THE ORCHESTRATOR FOR COMPLETE ORIGIN FLOW
      const authorizationABI = [
        "function createAuthorizationRequest(address userWallet, string authToken, string emailHash, bytes32[] attachmentHashes) returns (bytes32 requestId)",
        "function authorizeEmailWalletCreation(bytes32 requestId, bytes signature)",
        "function getRequest(bytes32 requestId) view returns (tuple(bytes32 requestId, address userWallet, string authToken, string emailHash, bytes32[] attachmentHashes, uint256 timestamp, uint256 expiresAt, uint8 status))",
        "function isRequestValid(bytes32 requestId) view returns (bool)",
        "function getRequestStatus(bytes32 requestId) view returns (uint8)",
        "function owner() view returns (address)"
      ];
      
      // Registration contract ABI
      const registrationABI = [
        "function isRegistered(address wallet) view returns (bool)",
        "function getCreditBalance(address wallet) view returns (uint256)",
        "function deductCredits(address wallet, uint256 amount) returns (bool)",
        "function owner() view returns (address)"
      ];
      
      // CRITICAL: Use AuthorizationManagerFixed as the main orchestrator contract
      this.emailDataWalletContract = new ethers.Contract(
        authorizationContractAddress,
        authorizationABI,
        this.serviceWallet
      );
      
      this.registrationContract = new ethers.Contract(
        registrationContractAddress,
        registrationABI,
        this.serviceWallet
      );
      
      console.log('✅ Enhanced Authorization service initialized with ORCHESTRATOR pattern');
      console.log(`   Service Wallet: ${this.serviceWallet.address}`);
      console.log(`   🎯 Authorization Contract (ORCHESTRATOR): ${authorizationContractAddress}`);
      console.log(`   📊 Registration Contract: ${registrationContractAddress}`);
      console.log(`   🔄 Using AuthorizationManagerFixed for complete ORIGIN flow`);
      
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
   * PROPER ORCHESTRATION: Use AuthorizationManagerFixed as the orchestrator
   */
  async authorizeEmailWalletCreation(
    requestId: string,
    userAddress: string,
    signature: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('🔐 Processing authorization through AuthorizationManagerFixed orchestrator...');
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
      const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(requestId), signature);
      
      if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Invalid signature - signature does not match user address');
      }
      
      console.log('✅ Signature verified - user consent proven');
      console.log('🎯 Calling AuthorizationManagerFixed.authorizeEmailWalletCreation()...');
      
      // Call AuthorizationManagerFixed orchestrator
      // This will handle the complete ORIGIN flow:
      // 1. Verify signature
      // 2. Create EmailDataWallet
      // 3. Deduct credits
      // 4. Record provenance
      // 5. Transfer ownership to user
      const authorizeTx = await this.emailDataWalletContract.authorizeEmailWalletCreation(
        requestId,
        signature,
        {
          gasLimit: 500000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`⏳ Authorization transaction submitted: ${authorizeTx.hash}`);
      console.log('   AuthorizationManagerFixed will now:');
      console.log('   1. Verify signature on-chain');
      console.log('   2. Create EmailDataWallet automatically');
      console.log('   3. Deduct credits from user');
      console.log('   4. Record complete ORIGIN provenance');
      console.log('   5. Transfer wallet ownership to user');
      
      const receipt = await authorizeTx.wait();
      console.log(`✅ Authorization completed in block ${receipt.blockNumber}`);
      
      // Extract wallet ID from events
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      // Update request status in DATABASE
      await this.database.updateRequestStatus(requestId, 'processed');
      
      console.log(`🎉 Complete ORIGIN flow executed by AuthorizationManagerFixed:`);
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Transaction: ${authorizeTx.hash}`);
      console.log(`   Credits Deducted: ${request.creditCost}`);
      console.log(`   Owner: ${userAddress}`);
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [], // Handled by orchestrator
        authorizationTx: authorizeTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('❌ Authorization orchestration failed:', error);
      return {
        success: false,
        error: error?.message || 'Authorization orchestration failed'
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
          authorizationContract: this.emailDataWalletContract.address,
          registrationContract: this.registrationContract.address,
          database: dbHealth.details,
          pendingRequests: dbStats.totalRequests,
          requestsByStatus: dbStats.byStatus,
          orchestrator: 'AuthorizationManagerFixed',
          orchestratorAddress: '0xcC2a65A8870289B1d43bA741069cC2CEEA219573',
          architecture: 'ORIGIN flow orchestration pattern',
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
      // For the EmailDataWalletOS_Secure contract, the wallet ID is returned as uint256
      // Look for EmailDataWalletCreated event
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.emailDataWalletContract.address.toLowerCase()) {
          // First topic is event signature, second topic is indexed walletId
          if (log.topics.length >= 2) {
            // Convert the hex topic to decimal wallet ID
            const walletId = ethers.BigNumber.from(log.topics[1]).toString();
            return walletId;
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