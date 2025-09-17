import express from 'express';
import { Request, Response } from 'express';
import { EnhancedAuthorizationService } from '../services/authorization/EnhancedAuthorizationService';

/**
 * Authorization API Routes - Uses Shared Database Service
 * 
 * Direct routing using the shared EnhancedAuthorizationService from the platform.
 * This ensures we use the SAME database connection as email processing.
 */

const router = express.Router();

/**
 * Get shared Enhanced Authorization Service from app.locals
 */
function getSharedAuthService(req: Request): EnhancedAuthorizationService {
  // Try to get from platform singleton
  if (req.app.locals.sharedAuthService) {
    return req.app.locals.sharedAuthService;
  }
  
  throw new Error('Shared Authorization Service not available - platform not properly initialized');
}

/**
 * Send API response
 */
function sendResponse(res: Response, data: any, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * Send API error response
 */
function sendError(res: Response, message: string, statusCode: number = 500): void {
  res.status(statusCode).json({
    success: false,
    error: message
  });
}

// GET /authorization/request/:requestId
router.get('/request/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      return sendError(res, 'Request ID is required', 400);
    }

    console.log(`🔍 Getting authorization request: ${requestId}`);
    const authService = getSharedAuthService(req);
    const request = await authService.getAuthorizationRequest(requestId);

    if (!request) {
      console.log(`❌ Authorization request not found: ${requestId}`);
      return sendError(res, 'Authorization request not found', 404);
    }

    console.log(`✅ Authorization request found: ${request.status}`);
    sendResponse(res, {
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
    sendError(res, errorMessage, 500);
  }
});

// GET /authorization/token/:authToken
router.get('/token/:authToken', async (req: Request, res: Response) => {
  try {
    const { authToken } = req.params;
    if (!authToken) {
      return sendError(res, 'Auth token is required', 400);
    }

    console.log(`🔍 Getting authorization request by token: ${authToken}`);
    const authService = getSharedAuthService(req);
    const request = await authService.getAuthorizationRequestByToken(authToken);

    if (!request) {
      console.log(`❌ Authorization request not found for token: ${authToken}`);
      return sendError(res, 'Authorization request not found', 404);
    }

    console.log(`✅ Authorization request found by token: ${request.status}`);
    sendResponse(res, {
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
    sendError(res, errorMessage, 500);
  }
});

// GET /authorization/pending/:userAddress  
router.get('/pending/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    if (!userAddress) {
      return sendError(res, 'User address is required', 400);
    }

    console.log(`👤 Getting pending requests for user: ${userAddress}`);
    const authService = getSharedAuthService(req);
    
    // Get user requests from shared database
    const requestIds = await authService.getUserRequests(userAddress);
    
    // Get full request details for each ID
    const requests = await Promise.all(
      requestIds.map(async (id: string) => {
        try {
          return await authService.getAuthorizationRequest(id);
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
    
    sendResponse(res, {
      userAddress,
      pendingRequests,
      totalCount: pendingRequests.length
    });

  } catch (error) {
    console.error('❌ Get pending requests error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

// POST /authorization/authorize
router.post('/authorize', async (req: Request, res: Response) => {
  try {
    const { requestId, userAddress, signature } = req.body;
    if (!requestId || !userAddress || !signature) {
      return sendError(res, 'Missing required fields: requestId, userAddress, signature', 400);
    }

    console.log(`🔐 Authorizing request: ${requestId}`);
    console.log(`   User: ${userAddress}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    const authService = getSharedAuthService(req);
    const result = await authService.authorizeEmailWalletCreation(requestId, userAddress, signature);

    if (result.success) {
      console.log(`✅ Request authorized and wallet created: ${requestId}`);
      
      sendResponse(res, {
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
      sendError(res, result.error || 'Failed to authorize request', 400);
    }

  } catch (error) {
    console.error('❌ Authorize request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

// POST /authorization/cancel
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return sendError(res, 'Request ID is required', 400);
    }

    console.log(`🚫 Cancelling authorization request: ${requestId}`);
    const authService = getSharedAuthService(req);
    const result = await authService.cancelRequest(requestId);

    if (result.success) {
      console.log(`✅ Request cancelled successfully: ${requestId}`);
      sendResponse(res, {
        success: true,
        message: 'Authorization request cancelled',
        requestId: result.requestId,
        status: 'cancelled'
      });
    } else {
      console.error(`❌ Failed to cancel request: ${result.error}`);
      sendError(res, result.error || 'Failed to cancel request', 400);
    }

  } catch (error) {
    console.error('❌ Cancel request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

// GET /authorization/health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const authService = getSharedAuthService(req);
    const health = await authService.healthCheck();
    
    sendResponse(res, {
      service: 'EnhancedAuthorizationService (Shared Database)',
      ...health
    });
    
  } catch (error) {
    console.error('❌ Authorization health check error:', error);
    sendError(res, 'Health check failed', 500);
  }
});

console.log('✅ Authorization API routes configured (SHARED DATABASE)');
console.log('   Uses shared EnhancedAuthorizationService from platform');
console.log('   GET    /request/:requestId - Get request by ID');
console.log('   GET    /token/:authToken - Get request by token');
console.log('   GET    /pending/:userAddress - Get user pending requests');
console.log('   POST   /authorize - Authorize request');
console.log('   POST   /cancel - Cancel request');
console.log('   GET    /health - Service health');

export default router;