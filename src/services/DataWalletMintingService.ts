import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';
import { BlockchainEventMonitor, AuthorizationEvent } from './BlockchainEventMonitor';

export interface MintingResult {
  success: boolean;
  emailWalletId?: string;
  attachmentWalletIds?: string[];
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  error?: string;
}

export interface EmailData {
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  bodyText: string;
  bodyHtml: string;
  headers: any;
  authentication: {
    spfPass: boolean;
    dkimValid: boolean;
    dmarcPass: boolean;
    dkimSignature: string;
  };
  attachments: any[];
  bodyHash: string;
  emailHash: string;
  emailHeadersHash: string;
}

export class DataWalletMintingService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet;
  private authContract: ethers.Contract;
  private eventMonitor: BlockchainEventMonitor;
  private pendingMints: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: Config) {
    // Initialize provider and service wallet
    this.provider = new ethers.providers.JsonRpcProvider(
      this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/')
    );
    this.serviceWallet = new ethers.Wallet(
      this.config.get('blockchain.serviceWalletPrivateKey', ''),
      this.provider
    );
    
    // Initialize authorization contract
    const authContractABI = [
      "function processAuthorizedRequest(bytes32 requestId, (string forwardedBy, string originalSender, string messageId, string subject, bytes32 bodyHash, bytes32 emailHash, bytes32 emailHeadersHash, uint256 attachmentCount, string ipfsHash, (bool spfPass, bool dkimValid, bool dmarcPass, string dkimSignature) authResults) emailData, (string originalFilename, string filename, string mimeType, string fileExtension, uint256 fileSize, bytes32 contentHash, string fileSignature, string ipfsHash, uint256 attachmentIndex, string emailSender, string emailSubject, uint256 emailTimestamp)[] attachmentData) returns ((bool success, bytes32 emailWalletId, bytes32[] attachmentWalletIds, uint256 totalCreditsUsed, string errorMessage))",
      "function getAuthorizationRequest(bytes32 requestId) view returns (address userWallet, string authToken, bytes32 emailHash, uint256 attachmentCount, uint256 creditCost, uint256 createdAt, uint256 expiresAt, uint8 status)"
    ];
    
    this.authContract = new ethers.Contract(
      this.config.get('blockchain.contractAuthorization', '0xcC2a65A8870289B1d33bA741069cC2CEEA219573'),
      authContractABI,
      this.serviceWallet // Connected with service wallet for transactions
    );
    
    // Initialize event monitoring
    this.eventMonitor = new BlockchainEventMonitor(this.config);
  }

  /**
   * Start the minting service with blockchain event monitoring
   */
  async start(): Promise<void> {
    console.log('🚀 Starting DATA_WALLET Minting Service...');
    console.log(`   Service Wallet: ${this.serviceWallet.address}`);
    console.log(`   Authorization Contract: ${this.authContract.address}`);
    
    // Register authorization event handler
    this.eventMonitor.onAuthorization('data-wallet-minting', (event) => this.handleAuthorizationEvent(event));
    
    // Start blockchain event monitoring
    await this.eventMonitor.startMonitoring();
    
    console.log('✅ DATA_WALLET Minting Service started successfully');
  }

  /**
   * Stop the minting service
   */
  stop(): void {
    console.log('🛑 Stopping DATA_WALLET Minting Service...');
    
    // Clear pending mints
    for (const [requestId, timeout] of this.pendingMints) {
      clearTimeout(timeout);
      console.log(`   ⏹️ Cancelled pending mint for request: ${requestId}`);
    }
    this.pendingMints.clear();
    
    // Stop event monitoring
    this.eventMonitor.stopMonitoring();
    
    console.log('✅ DATA_WALLET Minting Service stopped');
  }

  /**
   * Handle authorization event from blockchain
   */
  private async handleAuthorizationEvent(event: AuthorizationEvent): Promise<void> {
    const { requestId, signer, transactionHash, blockNumber } = event;
    
    console.log(`🎯 Processing authorization for DATA_WALLET minting:`);
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Owner: ${signer}`);
    console.log(`   Auth Transaction: ${transactionHash}`);
    
    try {
      // Verify authorization status on-chain
      const authStatus = await this.eventMonitor.verifyAuthorizationStatus(requestId);
      
      if (!authStatus.isAuthorized) {
        console.log(`⚠️ Request ${requestId} is not in AUTHORIZED state, skipping minting`);
        return;
      }
      
      console.log(`✅ Request ${requestId} verified as AUTHORIZED, proceeding with minting`);
      
      // Schedule immediate minting (with small delay for blockchain consistency)
      const mintTimeout = setTimeout(async () => {
        await this.mintDataWallet(requestId, signer, transactionHash);
        this.pendingMints.delete(requestId);
      }, 5000); // 5 second delay
      
      this.pendingMints.set(requestId, mintTimeout);
      console.log(`⏱️ DATA_WALLET minting scheduled for request: ${requestId}`);
      
    } catch (error) {
      console.error(`❌ Failed to handle authorization event for ${requestId}:`, error);
    }
  }

  /**
   * Mint DATA_WALLET as transaction from service wallet to owner wallet
   */
  private async mintDataWallet(requestId: string, ownerAddress: string, authTransactionHash: string): Promise<MintingResult> {
    console.log(`🏭 Minting DATA_WALLET for request: ${requestId}`);
    console.log(`   Owner: ${ownerAddress}`);
    console.log(`   Service Wallet: ${this.serviceWallet.address}`);
    
    try {
      // Get request details from blockchain
      const request = await this.authContract.getAuthorizationRequest(requestId);
      
      // Create email data structure for minting
      const emailData = {
        forwardedBy: 'rootz.global',
        originalSender: ownerAddress,
        messageId: `auth-${requestId}`,
        subject: 'Authorized Email DATA_WALLET',
        bodyHash: request.emailHash,
        emailHash: request.emailHash,
        emailHeadersHash: request.emailHash,
        attachmentCount: request.attachmentCount,
        ipfsHash: 'QmYSCLT6CNoNNYj4X4yvAz7DomAhCkWGyFarkckQhanRUG', // IPFS hash
        authResults: {
          spfPass: false,
          dkimValid: false,
          dmarcPass: false,
          dkimSignature: ''
        }
      };
      
      // Empty attachment data for now
      const attachmentData: any[] = [];
      
      console.log(`⛓️ Executing processAuthorizedRequest on blockchain...`);
      console.log(`   Gas estimation in progress...`);
      
      // Estimate gas for the transaction
      const gasEstimate = await this.authContract.estimateGas.processAuthorizedRequest(
        requestId,
        emailData,
        attachmentData
      );
      
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      
      // Execute the minting transaction
      // This creates a transaction FROM service wallet TO owner wallet
      // The actual DATA_WALLET gets minted and assigned to the owner
      const tx = await this.authContract.processAuthorizedRequest(
        requestId,
        emailData,
        attachmentData,
        {
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
          gasPrice: await this.provider.getGasPrice()
        }
      );
      
      console.log(`📤 Minting transaction submitted: ${tx.hash}`);
      console.log(`   From: ${this.serviceWallet.address} (service)`);
      console.log(`   To: ${ownerAddress} (owner)`);
      console.log(`   Value: 0 POL (DATA_WALLET mint)`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log(`✅ DATA_WALLET minted successfully!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   Owner: ${ownerAddress}`);
      console.log(`   Transaction: ${tx.hash}`);
      
      // Extract email wallet ID from transaction logs
      let emailWalletId = 'minted';
      if (receipt.logs && receipt.logs.length > 0) {
        // Parse logs to extract wallet IDs
        try {
          const iface = new ethers.utils.Interface([
            "event EmailWalletProcessed(bytes32 indexed requestId, bytes32 indexed emailWalletId, bytes32[] attachmentWalletIds, uint256 totalCreditsUsed)"
          ]);
          
          for (const log of receipt.logs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed.name === 'EmailWalletProcessed') {
                emailWalletId = parsed.args.emailWalletId;
                console.log(`📧 Email Wallet ID: ${emailWalletId}`);
                break;
              }
            } catch (e) {
              // Skip unparseable logs
            }
          }
        } catch (e) {
          console.log('ℹ️ Could not parse transaction logs for wallet ID');
        }
      }
      
      return {
        success: true,
        emailWalletId: emailWalletId,
        attachmentWalletIds: [],
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toNumber()
      };
      
    } catch (error: any) {
      console.error(`❌ DATA_WALLET minting failed for ${requestId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Minting transaction failed'
      };
    }
  }

  /**
   * Manual minting trigger (for testing or recovery)
   */
  async manualMint(requestId: string): Promise<MintingResult> {
    console.log(`🔧 Manual DATA_WALLET minting triggered for: ${requestId}`);
    
    try {
      // Verify authorization status
      const authStatus = await this.eventMonitor.verifyAuthorizationStatus(requestId);
      
      if (!authStatus.isAuthorized) {
        throw new Error(`Request ${requestId} is not authorized`);
      }
      
      return await this.mintDataWallet(requestId, authStatus.userWallet, 'manual-trigger');
      
    } catch (error: any) {
      console.error(`❌ Manual minting failed for ${requestId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get minting service status
   */
  getStatus(): {
    serviceWallet: string;
    contractAddress: string;
    pendingMints: number;
    eventMonitorStatus: any;
  } {
    return {
      serviceWallet: this.serviceWallet.address,
      contractAddress: this.authContract.address,
      pendingMints: this.pendingMints.size,
      eventMonitorStatus: this.eventMonitor.getStatus()
    };
  }

  /**
   * Get pending mint requests
   */
  getPendingMints(): string[] {
    return Array.from(this.pendingMints.keys());
  }
}
