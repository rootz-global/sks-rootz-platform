import { Request, Response } from 'express';
import { Controller } from './Controller';
import { EnhancedAuthorizationService } from '../services/authorization/EnhancedAuthorizationService';
import { Config } from '../core/configuration';

export class AuthorizationController extends Controller {
  private authService: EnhancedAuthorizationService;

  constructor(domain: string = 'localhost') {
    super();
    
    // Initialize authorization service with config
    const config = new Config();
    config.loadDomain(domain);
    this.authService = new EnhancedAuthorizationService(config);
  }

  /**
   * Get authorization request by request ID
   */
  public async getAuthorizationRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      
      if (!requestId) {
        this.sendError(res, 'Request ID is required', 400);
        return;
      }

      console.log(`🔍 [AUTH] Getting request: ${requestId}`);

      const request = await this.authService.getAuthorizationRequest(requestId);
      
      if (!request) {
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      console.log(`✅ [AUTH] Request found: ${request.status}`);
      
      this.sendResponse(res, request);
      
    } catch (error) {
      console.error('❌ [AUTH] Get request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get authorization request';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Get authorization request by auth token
   */
  public async getAuthorizationRequestByToken(req: Request, res: Response): Promise<void> {
    try {
      const { authToken } = req.params;
      
      if (!authToken) {
        this.sendError(res, 'Auth token is required', 400);
        return;
      }

      console.log(`🔍 [AUTH] Getting request by token: ${authToken}`);

      const request = await this.authService.getAuthorizationRequestByToken(authToken);
      
      if (!request) {
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      console.log(`✅ [AUTH] Request found by token: ${request.status}`);
      
      this.sendResponse(res, request);
      
    } catch (error) {
      console.error('❌ [AUTH] Get request by token error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get authorization request';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Handle user authorization of email wallet creation
   * This endpoint coordinates the user's MetaMask transaction
   */
  public async authorizeEmailWallet(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, userAddress, signature } = req.body;
      
      if (!requestId || !userAddress || !signature) {
        this.sendError(res, 'Missing required fields: requestId, userAddress, signature', 400);
        return;
      }

      console.log(`🔐 [AUTH] Processing authorization:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   User: ${userAddress}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      // Validate the authorization request
      const request = await this.authService.getAuthorizationRequest(requestId);
      
      if (!request) {
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      if (request.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
        this.sendError(res, 'Request belongs to different user', 403);
        return;
      }

      if (request.status !== 'pending') {
        this.sendError(res, `Request status is ${request.status}, cannot authorize`, 400);
        return;
      }

      // Check if request is still valid (not expired)
      const isValid = await this.authService.isRequestValid(requestId);
      if (!isValid) {
        this.sendError(res, 'Authorization request has expired', 400);
        return;
      }

      console.log(`✅ [AUTH] Request validation passed`);

      // Use ENHANCED authorization service - directly creates EMAIL_DATA_WALLET
      const result = await this.authService.authorizeEmailWalletCreation(
        requestId,
        userAddress,
        signature
      );

      if (result.success) {
        console.log(`🎉 [AUTH] EMAIL_DATA_WALLET created successfully`);
        this.sendResponse(res, {
          success: true,
          message: 'Email wallet created successfully!',
          emailWalletId: result.emailWalletId,
          transactionHash: result.authorizationTx,
          requestId: result.requestId
        });
      } else {
        throw new Error(result.error || 'Enhanced authorization failed');
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Authorization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Get user's authorization requests
   */
  public async getUserRequests(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        this.sendError(res, 'User address is required', 400);
        return;
      }

      console.log(`👤 [AUTH] Getting requests for user: ${userAddress}`);

      const requestIds = await this.authService.getUserRequests(userAddress);
      
      // Get full request details for each ID
      const requests = await Promise.all(
        requestIds.map(async (id) => {
          try {
            return await this.authService.getAuthorizationRequest(id);
          } catch (error) {
            console.warn(`Failed to get request details for ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out null results
      const validRequests = requests.filter(req => req !== null);

      console.log(`✅ [AUTH] Found ${validRequests.length} requests for user`);
      
      this.sendResponse(res, {
        userAddress,
        requests: validRequests,
        totalCount: validRequests.length
      });
      
    } catch (error) {
      console.error('❌ [AUTH] Get user requests error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user requests';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Cancel authorization request
   */
  public async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.body;
      
      if (!requestId) {
        this.sendError(res, 'Request ID is required', 400);
        return;
      }

      console.log(`🚫 [AUTH] Cancelling request: ${requestId}`);

      const result = await this.authService.cancelRequest(requestId);
      
      if (result.success) {
        console.log(`✅ [AUTH] Request cancelled successfully`);
        this.sendResponse(res, {
          success: true,
          message: 'Authorization request cancelled',
          requestId,
          transactionHash: result.authorizationTx
        });
      } else {
        throw new Error(result.error || 'Failed to cancel request');
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Cancel request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel request';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Process authorized request (create email wallet)
   * This is called after user has authorized the request
   */
  public async processAuthorizedRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, emailData, ipfsHash } = req.body;
      
      if (!requestId || !emailData || !ipfsHash) {
        this.sendError(res, 'Missing required fields: requestId, emailData, ipfsHash', 400);
        return;
      }

      console.log(`🔄 [AUTH] Processing authorized request: ${requestId}`);

      // Verify request is authorized
      const request = await this.authService.getAuthorizationRequest(requestId);
      
      if (!request) {
        this.sendError(res, 'Authorization request not found', 404);
        return;
      }

      if (request.status !== 'authorized') {
        this.sendError(res, `Request must be authorized first. Current status: ${request.status}`, 400);
        return;
      }

      // Process the request
      const result = await this.authService.processAuthorizedRequest(requestId, emailData, ipfsHash);
      
      if (result.success) {
        console.log(`✅ [AUTH] Email wallet created successfully`);
        this.sendResponse(res, {
          success: true,
          message: 'Email wallet created successfully',
          emailWalletId: result.emailWalletId,
          attachmentWalletIds: result.attachmentWalletIds,
          creditsUsed: result.totalCreditsUsed
        });
      } else {
        throw new Error(result.error || 'Failed to process request');
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Process request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process authorized request';
      this.sendError(res, errorMessage, 500);
    }
  }

  /**
   * Check authorization service health
   */
  public async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.authService.healthCheck();
      
      this.sendResponse(res, {
        service: 'AuthorizationService',
        healthy: health.healthy,
        details: health.details
      });
      
    } catch (error) {
      console.error('❌ [AUTH] Health check error:', error);
      this.sendError(res, 'Health check failed', 500);
    }
  }

  /**
   * Serve authorization page
   */
  public async serveAuthorizationPage(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, authToken } = req.query;
      
      if (!requestId && !authToken) {
        res.status(400).send('Missing authorization parameters');
        return;
      }

      // Serve the authorization HTML page
      res.sendFile('authorization.html', { 
        root: __dirname + '/../client',
        headers: {
          'Content-Type': 'text/html'
        }
      });
      
    } catch (error) {
      console.error('❌ [AUTH] Serve page error:', error);
      res.status(500).send('Failed to load authorization page');
    }
  }
}

export default AuthorizationController;