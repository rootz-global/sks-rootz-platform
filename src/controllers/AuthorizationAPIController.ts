import { Request, Response } from 'express';
import { Controller } from './Controller';
import { EnhancedAuthorizationService } from '../services/authorization/EnhancedAuthorizationService';
import { Config } from '../core/configuration/Config';

/**
 * Authorization API Controller - DATABASE BACKED
 * 
 * Uses the existing EnhancedAuthorizationService with PostgreSQL database
 * instead of creating a separate in-memory service.
 * 
 * This connects to the SAME database that email processing uses.
 */
export class AuthorizationAPIController extends Controller {
  private authService: EnhancedAuthorizationService;

  constructor() {
    super();
    
    console.log('✅ AuthorizationAPIController using SHARED EnhancedAuthorizationService from platform');
  }

  /**
   * Get shared Enhanced Authorization Service from platform
   */
  private getAuthService(): EnhancedAuthorizationService {
    // Get from platform singleton if available
    if (global.rootzPlatform?.getSharedAuthService) {
      return global.rootzPlatform.getSharedAuthService();
    }
    
    // Fallback: create new instance (shouldn't happen in production)
    console.warn('⚠️ Using fallback authorization service - should use shared instance');
    const config = new Config();
    config.loadDomain('localhost');
    const service = new EnhancedAuthorizationService(config);
    service.initialize().catch(err => console.error('Auth service init error:', err));
    return service;
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

      const request = await this.getAuthService().getAuthorizationRequest(requestId);

      if (!request) {
        console.log(`❌ Authorization request not found: ${requestId}`);
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      console.log(`✅ Authorization request found: ${request.status}`);
      this.sendResponse(res, {
        requestId: request.requestId,
        userAddress: request.userAddress,
        emailSubject: request.emailSubject || 'Email Authorization Request',
        emailSender: request.emailSender || 'Unknown sender',
        attachmentCount: request.attachmentCount || 0,
        creditCost: request.creditCost,
        authToken: request.authToken,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        expiresAt: request.expiresAt.toISOString()
      });

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
      this.sendResponse(res, {
        requestId: request.requestId,
        userAddress: request.userAddress,
        emailSubject: request.emailSubject || 'Email Authorization Request',
        emailSender: request.emailSender || 'Unknown sender',
        attachmentCount: request.attachmentCount || 0,
        creditCost: request.creditCost,
        authToken: request.authToken,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        expiresAt: request.expiresAt.toISOString()
      });

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

      // Use Enhanced Authorization Service database queries
      const requestIds = await this.authService.getUserRequests(userAddress);
      
      // Get full request details for each ID
      const requests = await Promise.all(
        requestIds.map(async (id: string) => {
          try {
            return await this.authService.getAuthorizationRequest(id);
          } catch (error) {
            console.warn(`Failed to get request details for ${id}:`, error);
            return null;
          }
        })
      );

      // Filter to only pending requests
      const pendingRequests = requests
        .filter((req): req is NonNullable<typeof req> => req !== null)
        .filter(req => req.status === 'pending' && new Date(req.expiresAt) > new Date())
        .map(req => ({
          requestId: req.requestId,
          userAddress: req.userAddress,
          emailSubject: req.emailSubject || 'Email Authorization Request',
          emailSender: req.emailSender || 'Unknown sender',
          attachmentCount: req.attachmentCount || 0,
          creditCost: req.creditCost,
          authToken: req.authToken,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          expiresAt: req.expiresAt.toISOString()
        }));

      console.log(`✅ Found ${pendingRequests.length} pending requests for user`);
      
      this.sendResponse(res, {
        userAddress,
        pendingRequests,
        totalCount: pendingRequests.length
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

      // Use Enhanced Authorization Service to authorize and create wallet
      const result = await this.authService.authorizeEmailWalletCreation(requestId, userAddress, signature);

      if (result.success) {
        console.log(`✅ Request authorized and wallet created: ${requestId}`);
        
        this.sendResponse(res, {
          success: true,
          message: 'Email wallet created successfully',
          requestId: result.requestId,
          userAddress: userAddress,
          status: 'processed',
          emailWalletId: result.emailWalletId,
          transactionHash: result.authorizationTx
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

      const result = await this.authService.cancelRequest(requestId);

      if (result.success) {
        console.log(`✅ Request cancelled successfully: ${requestId}`);
        this.sendResponse(res, {
          success: true,
          message: 'Authorization request cancelled',
          requestId: result.requestId,
          status: 'cancelled'
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
   * GET /authorization/health
   * Get authorization service health status
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.authService.healthCheck();
      
      this.sendResponse(res, {
        service: 'EnhancedAuthorizationService (Database)',
        ...health
      });
      
    } catch (error) {
      console.error('❌ Authorization health check error:', error);
      this.sendError(res, 'Health check failed', 500);
    }
  }
}

export default AuthorizationAPIController;