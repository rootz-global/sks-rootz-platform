import express from 'express';
import { Request, Response } from 'express';
import { EnhancedAuthorizationService } from '../services/authorization/EnhancedAuthorizationService';

/**
 * Email Wallet API Routes - User Wallet Management
 * 
 * Provides endpoints for retrieving user's created email wallets
 * and wallet-related statistics.
 */

const router = express.Router();

/**
 * Get shared Enhanced Authorization Service from app.locals
 */
function getSharedAuthService(req: Request): EnhancedAuthorizationService {
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

// GET /email-wallet/wallets/:userAddress
router.get('/wallets/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    if (!userAddress) {
      return sendError(res, 'User address is required', 400);
    }

    console.log(`📊 Getting created wallets for user: ${userAddress}`);
    
    // For Phase 1: Return mock data that matches the dashboard expectations
    // TODO Phase 2: Implement real blockchain wallet queries
    const mockWallets = [
      {
        walletId: "0x1234567890abcdef1234567890abcdef12345678901234567890abcdef123456",
        emailSubject: "Important Document - Q3 Report",
        emailSender: "steven@rivetz.com",
        createdAt: "2025-09-15T10:30:00Z",
        creditsUsed: 4,
        blockNumber: 26155199,
        transactionHash: "0xd0d2b35c630052789e826242e77ab847fdb0174c0d30cc8b716e3da0d3621107",
        ipfsHash: "QmZ2KpVtemRSmQKcRJBe8vHZBx1jMMzspFWYyprZno8bVW"
      }
    ];

    const totalCreditsUsed = mockWallets.reduce((sum, wallet) => sum + wallet.creditsUsed, 0);

    console.log(`✅ Found ${mockWallets.length} wallet(s) for user`);
    
    sendResponse(res, {
      userAddress,
      wallets: mockWallets,
      totalWallets: mockWallets.length,
      totalCreditsUsed,
      lastActivity: mockWallets.length > 0 ? mockWallets[mockWallets.length - 1].createdAt : null
    });

  } catch (error) {
    console.error('❌ Get user wallets error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

// GET /email-wallet/wallet/:walletId
router.get('/wallet/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return sendError(res, 'Wallet ID is required', 400);
    }

    console.log(`🔍 Getting wallet details for: ${walletId}`);
    
    // For Phase 1: Return mock data for wallet details
    // TODO Phase 2: Implement real blockchain wallet query
    const mockWalletDetail = {
      walletId,
      userAddress: "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77",
      emailSubject: "Important Document - Q3 Report",
      emailSender: "steven@rivetz.com",
      emailRecipient: "process@rivetz.com",
      createdAt: "2025-09-15T10:30:00Z",
      creditsUsed: 4,
      blockNumber: 26155199,
      transactionHash: "0xd0d2b35c630052789e826242e77ab847fdb0174c0d30cc8b716e3da0d3621107",
      ipfsHash: "QmZ2KpVtemRSmQKcRJBe8vHZBx1jMMzspFWYyprZno8bVW",
      ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmZ2KpVtemRSmQKcRJBe8vHZBx1jMMzspFWYyprZno8bVW",
      attachments: [],
      metadata: {
        emailAuthentication: {
          spfPass: true,
          dkimValid: true,
          dmarcPass: true
        },
        processed: true,
        verified: true
      }
    };

    console.log(`✅ Wallet details retrieved for: ${walletId.substring(0, 8)}...`);
    
    sendResponse(res, mockWalletDetail);

  } catch (error) {
    console.error('❌ Get wallet details error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

// GET /email-wallet/stats/:userAddress
router.get('/stats/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    if (!userAddress) {
      return sendError(res, 'User address is required', 400);
    }

    console.log(`📈 Getting wallet statistics for user: ${userAddress}`);
    
    // For Phase 1: Return mock statistics
    // TODO Phase 2: Calculate real statistics from blockchain data
    const mockStats = {
      userAddress,
      totalWallets: 1,
      totalCreditsUsed: 4,
      totalEmailsProcessed: 1,
      totalAttachments: 0,
      firstWalletCreated: "2025-09-15T10:30:00Z",
      lastActivity: "2025-09-15T10:30:00Z",
      creditsAvailable: 56, // This should come from registration contract
      monthlyActivity: [
        { month: "2025-09", walletsCreated: 1, creditsUsed: 4 }
      ]
    };

    console.log(`✅ Statistics calculated for user: ${mockStats.totalWallets} wallets`);
    
    sendResponse(res, mockStats);

  } catch (error) {
    console.error('❌ Get user statistics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, errorMessage, 500);
  }
});

console.log('✅ Email Wallet API routes configured');
console.log('   GET    /wallets/:userAddress - Get user\'s created wallets');
console.log('   GET    /wallet/:walletId - Get wallet details');
console.log('   GET    /stats/:userAddress - Get user statistics');

export default router;