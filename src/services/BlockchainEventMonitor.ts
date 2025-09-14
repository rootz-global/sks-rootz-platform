import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';

export interface AuthorizationEvent {
  requestId: string;
  signer: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

export class BlockchainEventMonitor {
  private provider: ethers.providers.JsonRpcProvider;
  private authContract: ethers.Contract;
  private isMonitoring: boolean = false;
  private eventHandlers: Map<string, (event: AuthorizationEvent) => Promise<void>> = new Map();

  constructor(private config: Config) {
    const blockchainConfig = this.config.getBlockchainConfig();
    this.provider = new ethers.providers.JsonRpcProvider(blockchainConfig.rpcUrl);
    
    // Initialize authorization contract for event monitoring
    const authContractABI = [
      "event AuthorizationSigned(bytes32 indexed requestId, address indexed signer, bytes32 transactionHash, uint256 timestamp)",
      "function getAuthorizationRequest(bytes32 requestId) view returns (address userWallet, string authToken, bytes32 emailHash, uint256 attachmentCount, uint256 creditCost, uint256 createdAt, uint256 expiresAt, uint8 status)"
    ];
    
    this.authContract = new ethers.Contract(
      blockchainConfig.contractAuthorization,
      authContractABI,
      this.provider
    );
  }

  /**
   * Start monitoring blockchain events
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Blockchain event monitoring already running');
      return;
    }

    try {
      console.log('Starting blockchain event monitoring...');
      console.log(`Monitoring contract: ${this.authContract.address}`);
      
      // Listen for AuthorizationSigned events
      this.authContract.on('AuthorizationSigned', async (requestId, signer, transactionHash, timestamp, event) => {
        console.log(`🔔 Authorization event detected!`);
        console.log(`   Request ID: ${requestId}`);
        console.log(`   Signer: ${signer}`);
        console.log(`   Transaction: ${transactionHash}`);
        console.log(`   Block: ${event.blockNumber}`);
        
        const authEvent: AuthorizationEvent = {
          requestId: requestId,
          signer: signer,
          transactionHash: transactionHash,
          blockNumber: event.blockNumber,
          timestamp: timestamp.toNumber()
        };
        
        // Process the authorization event
        await this.handleAuthorizationEvent(authEvent);
      });
      
      this.isMonitoring = true;
      console.log('✅ Blockchain event monitoring started successfully');
      
    } catch (error) {
      console.error('Failed to start blockchain event monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring blockchain events
   */
  stopMonitoring(): void {
    if (this.isMonitoring) {
      this.authContract.removeAllListeners('AuthorizationSigned');
      this.isMonitoring = false;
      console.log('🛑 Blockchain event monitoring stopped');
    }
  }

  /**
   * Register event handler for authorization events
   */
  onAuthorization(handlerName: string, handler: (event: AuthorizationEvent) => Promise<void>): void {
    this.eventHandlers.set(handlerName, handler);
    console.log(`📝 Registered authorization event handler: ${handlerName}`);
  }

  /**
   * Handle authorization event by triggering registered handlers
   */
  private async handleAuthorizationEvent(event: AuthorizationEvent): Promise<void> {
    console.log(`🔄 Processing authorization event for request: ${event.requestId}`);
    
    for (const [handlerName, handler] of this.eventHandlers) {
      try {
        console.log(`   ▶️ Running handler: ${handlerName}`);
        await handler(event);
        console.log(`   ✅ Handler completed: ${handlerName}`);
      } catch (error) {
        console.error(`   ❌ Handler failed: ${handlerName}`, error);
      }
    }
  }

  /**
   * Get past authorization events for replay/recovery
   */
  async getPastAuthorizationEvents(fromBlock: number = 0): Promise<AuthorizationEvent[]> {
    try {
      console.log(`🔍 Fetching past authorization events from block ${fromBlock}`);
      
      const filter = this.authContract.filters.AuthorizationSigned();
      const events = await this.authContract.queryFilter(filter, fromBlock);
      
      const authEvents: AuthorizationEvent[] = events.map(event => ({
        requestId: event.args!.requestId,
        signer: event.args!.signer,
        transactionHash: event.args!.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: event.args!.timestamp.toNumber()
      }));
      
      console.log(`📋 Found ${authEvents.length} past authorization events`);
      return authEvents;
      
    } catch (error) {
      console.error('Failed to fetch past authorization events:', error);
      throw error;
    }
  }

  /**
   * Verify authorization status on-chain
   */
  async verifyAuthorizationStatus(requestId: string): Promise<{
    isAuthorized: boolean;
    status: number;
    userWallet: string;
  }> {
    try {
      const request = await this.authContract.getAuthorizationRequest(requestId);
      
      return {
        isAuthorized: request.status === 1, // AuthorizationStatus.AUTHORIZED
        status: request.status,
        userWallet: request.userWallet
      };
      
    } catch (error) {
      console.error(`Failed to verify authorization status for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    contractAddress: string;
    handlerCount: number;
    handlers: string[];
  } {
    return {
      isMonitoring: this.isMonitoring,
      contractAddress: this.authContract.address,
      handlerCount: this.eventHandlers.size,
      handlers: Array.from(this.eventHandlers.keys())
    };
  }
}
