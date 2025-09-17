import { Request, Response } from 'express';
import { Controller } from './Controller';
import { AuthorizationRequestService, AuthorizationRequestData, AuthorizationRequestCreateData } from '../services/authorization/AuthorizationRequestService';

/**
 * Authorization API Controller
 * 
 * Handles HTTP requests for email wallet authorization flow.
 * Clean, TypeScript-first implementation with proper error handling.
 * 
 * Engineering Focus: 
 * - Single responsibility
 * - Proper TypeScript types
 * - Clean error responses
 * - Consistent API patterns
 */
export class AuthorizationAPIController extends Controller {
  private authService: AuthorizationRequestService;

  constructor() {
    super();
    this.authService = new AuthorizationRequestService();
    console.log('✅ AuthorizationAPIController initialized');
  }

  /**
   * POST /authorization/create
   * Create new authorization request for email wallet
   * 
   * Body: {
   *   userAddress: string,
   *   emailSubject: string,
   *   emailSender: string,
   *   emailHash: string,
   *   attachmentCount?: number,
   *   attachmentHashes?: string[],
   *   ipfsHash?: string,
   *   metadata?: any
   * }
   */
  async createAuthorizationRequest(req: Request, res: Response): Promise<void> {
    try {
      const createData: AuthorizationRequestCreateData = {
        userAddress: req.body.userAddress,
        emailSubject: req.body.emailSubject,
        emailSender: req.body.emailSender,
        emailHash: req.body.emailHash,
        attachmentCount: req.body.attachmentCount || 0,
        attachmentHashes: req.body.attachmentHashes || [],
        ipfsHash: req.body.ipfsHash,
        metadata: req.body.metadata
      };

      console.log(`📝 Creating authorization request for ${createData.userAddress}`);
      console.log(`   Subject: ${createData.emailSubject}`);
      console.log(`   Sender: ${createData.emailSender}`);

      const result = await this.authService.createAuthorizationRequest(createData);

      if (result.success) {
        console.log(`✅ Authorization request created: ${result.requestId}`);
        this.sendResponse(res, result.data, 201);
      } else {
        console.error(`❌ Failed to create authorization request: ${result.error}`);
        this.sendError(res, result.error || 'Failed to create authorization request', 400);
      }

    } catch (error) {
      console.error('❌ Create authorization request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * GET /authorization/request/:requestId
   * Get authorization request by ID
   */
  async getAuthorizationRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        this.sendError(res, 'Request ID is required', 400);
        return;
      }

      console.log(`🔍 Getting authorization request: ${requestId}`);

      const request = await this.authService.getAuthorizationRequest(requestId);

      if (!request) {
        console.log(`❌ Authorization request not found: ${requestId}`);
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      console.log(`✅ Authorization request found: ${request.status}`);
      this.sendResponse(res, this.formatRequestForAPI(request));

    } catch (error) {
      console.error('❌ Get authorization request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * GET /authorization/token/:authToken
   * Get authorization request by auth token
   */
  async getAuthorizationRequestByToken(req: Request, res: Response): Promise<void> {
    try {
      const { authToken } = req.params;

      if (!authToken) {
        this.sendError(res, 'Auth token is required', 400);
        return;
      }

      console.log(`🔍 Getting authorization request by token: ${authToken}`);

      const request = await this.authService.getAuthorizationRequestByToken(authToken);

      if (!request) {
        console.log(`❌ Authorization request not found for token: ${authToken}`);
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      console.log(`✅ Authorization request found by token: ${request.status}`);
      this.sendResponse(res, this.formatRequestForAPI(request));

    } catch (error) {
      console.error('❌ Get authorization request by token error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * GET /authorization/pending/:userAddress
   * Get pending authorization requests for user
   */
  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        this.sendError(res, 'User address is required', 400);
        return;
      }

      console.log(`👤 Getting pending requests for user: ${userAddress}`);

      const requests = await this.authService.getPendingRequestsForUser(userAddress);

      console.log(`✅ Found ${requests.length} pending requests for user`);
      
      this.sendResponse(res, {
        userAddress,
        pendingRequests: requests.map(req => this.formatRequestForAPI(req)),
        totalCount: requests.length
      });

    } catch (error) {
      console.error('❌ Get pending requests error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * POST /authorization/authorize
   * Authorize email wallet creation
   * 
   * Body: {
   *   requestId: string,
   *   userAddress: string,
   *   signature: string
   * }
   */
  async authorizeRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, userAddress, signature } = req.body;

      if (!requestId || !userAddress || !signature) {
        this.sendError(res, 'Missing required fields: requestId, userAddress, signature', 400);
        return;
      }

      console.log(`🔐 Authorizing request: ${requestId}`);
      console.log(`   User: ${userAddress}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      const result = await this.authService.authorizeRequest(requestId, userAddress, signature);

      if (result.success) {
        console.log(`✅ Request authorized successfully: ${requestId}`);
        
        // TODO: Integrate with blockchain service to create actual email wallet
        // For now, just mark as authorized
        
        this.sendResponse(res, {
          success: true,
          message: 'Authorization request approved',
          ...result.data,
          // TODO: Add actual wallet creation result
          emailWalletId: null,
          transactionHash: null
        });
      } else {
        console.error(`❌ Failed to authorize request: ${result.error}`);
        this.sendError(res, result.error || 'Failed to authorize request', 400);
      }

    } catch (error) {
      console.error('❌ Authorize request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * POST /authorization/cancel
   * Cancel/reject authorization request
   * 
   * Body: {
   *   requestId: string
   * }
   */
  async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.body;

      if (!requestId) {
        this.sendError(res, 'Request ID is required', 400);
        return;
      }

      console.log(`🚫 Cancelling authorization request: ${requestId}`);

      const result = await this.authService.rejectRequest(requestId);

      if (result.success) {
        console.log(`✅ Request cancelled successfully: ${requestId}`);
        this.sendResponse(res, {
          success: true,
          message: 'Authorization request cancelled',
          ...result.data
        });
      } else {
        console.error(`❌ Failed to cancel request: ${result.error}`);
        this.sendError(res, result.error || 'Failed to cancel request', 400);
      }

    } catch (error) {
      console.error('❌ Cancel request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * POST /authorization/process
   * Mark request as processed (wallet created)
   * Internal endpoint for email processing service
   * 
   * Body: {
   *   requestId: string,
   *   walletId?: string,
   *   transactionHash?: string
   * }
   */
  async markRequestProcessed(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, walletId, transactionHash } = req.body;

      if (!requestId) {
        this.sendError(res, 'Request ID is required', 400);
        return;
      }

      console.log(`✅ Marking request as processed: ${requestId}`);
      if (walletId) console.log(`   Wallet ID: ${walletId}`);
      if (transactionHash) console.log(`   Transaction: ${transactionHash}`);

      const result = await this.authService.markRequestProcessed(requestId, walletId, transactionHash);

      if (result.success) {
        console.log(`✅ Request marked as processed: ${requestId}`);
        this.sendResponse(res, {
          success: true,
          message: 'Request marked as processed',
          ...result.data
        });
      } else {
        console.error(`❌ Failed to mark request as processed: ${result.error}`);
        this.sendError(res, result.error || 'Failed to mark request as processed', 400);
      }

    } catch (error) {
      console.error('❌ Mark request processed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * GET /authorization/health
   * Get authorization service health status
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.authService.getHealthStatus();
      
      this.sendResponse(res, health);
      
    } catch (error) {
      console.error('❌ Authorization health check error:', error);
      this.sendError(res, 'Health check failed', 500);
    }
  }

  /**
   * Format authorization request for API response
   * Removes internal fields and formats dates
   */
  private formatRequestForAPI(request: AuthorizationRequestData): any {
    return {
      requestId: request.requestId,
      userAddress: request.userAddress,
      emailSubject: request.emailSubject,
      emailSender: request.emailSender,
      attachmentCount: request.attachmentCount,
      creditCost: request.creditCost,
      authToken: request.authToken,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
      // Include metadata if present
      ...(request.metadata && { metadata: request.metadata })
    };
  }
}

export default AuthorizationAPIController;