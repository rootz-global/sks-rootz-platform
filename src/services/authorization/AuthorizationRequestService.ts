/**
 * Authorization Request Service
 * 
 * Manages pending authorization requests for email wallet creation.
 * This service bridges between email processing and user authorization.
 * 
 * Engineering Focus: Clean, TypeScript-first, single responsibility
 */

export interface AuthorizationRequestData {
  requestId: string;
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  emailHash: string;
  attachmentCount: number;
  attachmentHashes: string[];
  creditCost: number;
  authToken: string;
  status: 'pending' | 'authorized' | 'rejected' | 'expired' | 'processed';
  createdAt: Date;
  expiresAt: Date;
  ipfsHash?: string;
  metadata?: any;
}

export interface AuthorizationRequestCreateData {
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  emailHash: string;
  attachmentCount?: number;
  attachmentHashes?: string[];
  ipfsHash?: string;
  metadata?: any;
}

export interface AuthorizationResult {
  success: boolean;
  error?: string;
  data?: any;
  requestId?: string;
  transactionHash?: string;
}

/**
 * In-Memory Authorization Request Store
 * 
 * Production Note: This should be replaced with persistent storage (PostgreSQL/Redis)
 * For MVP, in-memory storage provides fast iteration and testing
 */
class AuthorizationRequestStore {
  private requests: Map<string, AuthorizationRequestData> = new Map();
  private userRequestIndex: Map<string, string[]> = new Map();
  private tokenRequestIndex: Map<string, string> = new Map();

  /**
   * Store authorization request
   */
  create(request: AuthorizationRequestData): void {
    this.requests.set(request.requestId, request);
    
    // Update user index
    const userRequests = this.userRequestIndex.get(request.userAddress.toLowerCase()) || [];
    userRequests.push(request.requestId);
    this.userRequestIndex.set(request.userAddress.toLowerCase(), userRequests);
    
    // Update token index
    this.tokenRequestIndex.set(request.authToken, request.requestId);
  }

  /**
   * Get request by ID
   */
  getById(requestId: string): AuthorizationRequestData | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * Get request by auth token
   */
  getByToken(authToken: string): AuthorizationRequestData | null {
    const requestId = this.tokenRequestIndex.get(authToken);
    return requestId ? this.requests.get(requestId) || null : null;
  }

  /**
   * Get all requests for user
   */
  getByUser(userAddress: string): AuthorizationRequestData[] {
    const requestIds = this.userRequestIndex.get(userAddress.toLowerCase()) || [];
    return requestIds
      .map(id => this.requests.get(id))
      .filter((req): req is AuthorizationRequestData => req !== null);
  }

  /**
   * Get pending requests for user
   */
  getPendingByUser(userAddress: string): AuthorizationRequestData[] {
    return this.getByUser(userAddress)
      .filter(req => req.status === 'pending' && req.expiresAt > new Date());
  }

  /**
   * Update request
   */
  update(requestId: string, updates: Partial<AuthorizationRequestData>): boolean {
    const existing = this.requests.get(requestId);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.requests.set(requestId, updated);
    return true;
  }

  /**
   * Delete request
   */
  delete(requestId: string): boolean {
    const request = this.requests.get(requestId);
    if (!request) return false;

    // Remove from indexes
    const userRequests = this.userRequestIndex.get(request.userAddress.toLowerCase());
    if (userRequests) {
      const filtered = userRequests.filter(id => id !== requestId);
      this.userRequestIndex.set(request.userAddress.toLowerCase(), filtered);
    }

    this.tokenRequestIndex.delete(request.authToken);
    this.requests.delete(requestId);
    return true;
  }

  /**
   * Clean up expired requests (garbage collection)
   */
  cleanupExpired(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [requestId, request] of this.requests.entries()) {
      if (request.expiresAt < now && request.status === 'pending') {
        this.update(requestId, { status: 'expired' });
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get store statistics
   */
  getStats(): { total: number; pending: number; expired: number; processed: number } {
    const now = new Date();
    let pending = 0, expired = 0, processed = 0;

    for (const request of this.requests.values()) {
      switch (request.status) {
        case 'pending':
          if (request.expiresAt < now) {
            expired++;
          } else {
            pending++;
          }
          break;
        case 'expired':
          expired++;
          break;
        case 'processed':
          processed++;
          break;
      }
    }

    return {
      total: this.requests.size,
      pending,
      expired,
      processed
    };
  }
}

/**
 * Authorization Request Service
 * 
 * Core business logic for managing email wallet authorization requests
 */
export class AuthorizationRequestService {
  private store: AuthorizationRequestStore = new AuthorizationRequestStore();
  
  // Credit costs configuration
  private readonly COSTS = {
    EMAIL_WALLET: 3,
    ATTACHMENT: 2,
    PROCESSING: 1
  };

  // Request expiration time (24 hours)
  private readonly REQUEST_EXPIRY_HOURS = 24;

  constructor() {
    // Start cleanup routine
    this.startCleanupRoutine();
  }

  /**
   * Create new authorization request
   * 
   * Called by email processing service when email needs authorization
   */
  async createAuthorizationRequest(data: AuthorizationRequestCreateData): Promise<AuthorizationResult> {
    try {
      // Validate input
      if (!data.userAddress || !data.emailSubject || !data.emailSender || !data.emailHash) {
        return {
          success: false,
          error: 'Missing required fields: userAddress, emailSubject, emailSender, emailHash'
        };
      }

      // Validate Ethereum address
      const ethers = await import('ethers');
      let validAddress: string;
      try {
        validAddress = ethers.utils.getAddress(data.userAddress);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid Ethereum address format'
        };
      }

      // Generate unique IDs
      const requestId = this.generateRequestId();
      const authToken = this.generateAuthToken();

      // Calculate costs
      const attachmentCount = data.attachmentCount || 0;
      const creditCost = this.calculateCreditCost(attachmentCount);

      // Create expiration date
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + (this.REQUEST_EXPIRY_HOURS * 60 * 60 * 1000));

      // Create authorization request
      const request: AuthorizationRequestData = {
        requestId,
        userAddress: validAddress,
        emailSubject: data.emailSubject.substring(0, 200), // Limit length
        emailSender: data.emailSender,
        emailHash: data.emailHash,
        attachmentCount,
        attachmentHashes: data.attachmentHashes || [],
        creditCost,
        authToken,
        status: 'pending',
        createdAt,
        expiresAt,
        ipfsHash: data.ipfsHash,
        metadata: data.metadata
      };

      // Store request
      this.store.create(request);

      console.log(`✅ Authorization request created: ${requestId}`);
      console.log(`   User: ${validAddress}`);
      console.log(`   Subject: ${data.emailSubject}`);
      console.log(`   Cost: ${creditCost} credits`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);

      return {
        success: true,
        requestId,
        data: {
          requestId,
          authToken,
          userAddress: validAddress,
          creditCost,
          expiresAt: expiresAt.toISOString(),
          authorizationUrl: this.generateAuthorizationUrl(requestId, authToken)
        }
      };

    } catch (error) {
      console.error('❌ Error creating authorization request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create authorization request'
      };
    }
  }

  /**
   * Get authorization request by ID
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequestData | null> {
    if (!requestId) {
      return null;
    }

    const request = this.store.getById(requestId);
    if (!request) {
      return null;
    }

    // Check if expired
    if (request.expiresAt < new Date() && request.status === 'pending') {
      this.store.update(requestId, { status: 'expired' });
      return { ...request, status: 'expired' };
    }

    return request;
  }

  /**
   * Get authorization request by auth token
   */
  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequestData | null> {
    if (!authToken) {
      return null;
    }

    const request = this.store.getByToken(authToken);
    if (!request) {
      return null;
    }

    // Check if expired
    if (request.expiresAt < new Date() && request.status === 'pending') {
      this.store.update(request.requestId, { status: 'expired' });
      return { ...request, status: 'expired' };
    }

    return request;
  }

  /**
   * Get pending authorization requests for user
   */
  async getPendingRequestsForUser(userAddress: string): Promise<AuthorizationRequestData[]> {
    if (!userAddress) {
      return [];
    }

    try {
      const ethers = await import('ethers');
      const validAddress = ethers.utils.getAddress(userAddress);
      return this.store.getPendingByUser(validAddress);
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      return [];
    }
  }

  /**
   * Authorize request (mark as authorized)
   */
  async authorizeRequest(requestId: string, userAddress: string, signature: string): Promise<AuthorizationResult> {
    try {
      const request = await this.getAuthorizationRequest(requestId);
      
      if (!request) {
        return {
          success: false,
          error: 'Authorization request not found'
        };
      }

      // Validate user
      const ethers = await import('ethers');
      const validAddress = ethers.utils.getAddress(userAddress);
      
      if (request.userAddress.toLowerCase() !== validAddress.toLowerCase()) {
        return {
          success: false,
          error: 'Request belongs to different user'
        };
      }

      // Check status
      if (request.status !== 'pending') {
        return {
          success: false,
          error: `Request status is ${request.status}, cannot authorize`
        };
      }

      // Check expiration
      if (request.expiresAt < new Date()) {
        this.store.update(requestId, { status: 'expired' });
        return {
          success: false,
          error: 'Authorization request has expired'
        };
      }

      // Verify signature (basic validation)
      if (!signature || signature.length < 10) {
        return {
          success: false,
          error: 'Invalid signature provided'
        };
      }

      // Update request status
      this.store.update(requestId, { 
        status: 'authorized',
        metadata: { 
          ...request.metadata,
          authorizedAt: new Date().toISOString(),
          signature
        }
      });

      console.log(`✅ Authorization request authorized: ${requestId}`);
      
      return {
        success: true,
        requestId,
        data: {
          requestId,
          userAddress: validAddress,
          status: 'authorized',
          authorizedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error authorizing request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to authorize request'
      };
    }
  }

  /**
   * Reject request
   */
  async rejectRequest(requestId: string): Promise<AuthorizationResult> {
    try {
      const request = await this.getAuthorizationRequest(requestId);
      
      if (!request) {
        return {
          success: false,
          error: 'Authorization request not found'
        };
      }

      if (request.status !== 'pending') {
        return {
          success: false,
          error: `Request status is ${request.status}, cannot reject`
        };
      }

      // Update request status
      this.store.update(requestId, { 
        status: 'rejected',
        metadata: { 
          ...request.metadata,
          rejectedAt: new Date().toISOString()
        }
      });

      console.log(`❌ Authorization request rejected: ${requestId}`);
      
      return {
        success: true,
        requestId,
        data: {
          requestId,
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error rejecting request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject request'
      };
    }
  }

  /**
   * Mark request as processed (wallet created)
   */
  async markRequestProcessed(requestId: string, walletId?: string, transactionHash?: string): Promise<AuthorizationResult> {
    try {
      const request = await this.getAuthorizationRequest(requestId);
      
      if (!request) {
        return {
          success: false,
          error: 'Authorization request not found'
        };
      }

      // Update request status
      this.store.update(requestId, { 
        status: 'processed',
        metadata: { 
          ...request.metadata,
          processedAt: new Date().toISOString(),
          walletId,
          transactionHash
        }
      });

      console.log(`✅ Authorization request processed: ${requestId}`);
      
      return {
        success: true,
        requestId,
        data: {
          requestId,
          status: 'processed',
          processedAt: new Date().toISOString(),
          walletId,
          transactionHash
        }
      };

    } catch (error) {
      console.error('❌ Error marking request processed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark request processed'
      };
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<any> {
    const stats = this.store.getStats();
    
    return {
      healthy: true,
      service: 'AuthorizationRequestService',
      stats,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate credit cost for email wallet
   */
  private calculateCreditCost(attachmentCount: number = 0): number {
    return this.COSTS.EMAIL_WALLET + 
           (attachmentCount * this.COSTS.ATTACHMENT) + 
           this.COSTS.PROCESSING;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `auth_${timestamp}_${random}`;
  }

  /**
   * Generate unique auth token
   */
  private generateAuthToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `token_${timestamp}_${random}`;
  }

  /**
   * Generate authorization URL
   */
  private generateAuthorizationUrl(requestId: string, authToken: string): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://rootz.global' 
      : 'http://localhost:3000';
    
    return `${baseUrl}/static/services/email-data-wallet/authorization.html?request=${requestId}&token=${authToken}`;
  }

  /**
   * Start cleanup routine for expired requests
   */
  private startCleanupRoutine(): void {
    // Run cleanup every hour
    setInterval(() => {
      const cleaned = this.store.cleanupExpired();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired authorization requests`);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}