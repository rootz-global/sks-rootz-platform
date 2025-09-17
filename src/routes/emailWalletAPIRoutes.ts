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
    
    const authService = getSharedAuthService(req);
    const healthCheck = await authService.healthCheck();
    
    if (!healthCheck.healthy) {
      console.error('❌ Blockchain service not available');
      return sendError(res, 'Blockchain service unavailable', 503);
    }

    // Get the EmailDataWalletOS_Secure contract from the auth service
    const { ethers } = require('ethers');
    const config = req.app.locals.config;
    
    // Initialize blockchain connection
    const rpcUrl = config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
    const privateKey = config.get('blockchain.serviceWalletPrivateKey');
    // Use the actual EmailDataWallet contract address from config
    const emailDataWalletAddress = config.get('blockchain.contractEmailDataWallet', '0x18F3772F6f952d22D116Ce61323eC93f0E842F94');
    
    if (!privateKey || !emailDataWalletAddress) {
      return sendError(res, 'Blockchain configuration missing', 500);
    }
    
    console.log(`🎯 Using EmailDataWallet contract: ${emailDataWalletAddress}`);
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const serviceWallet = new ethers.Wallet(privateKey, provider);
    
    // EmailDataWalletOS_Secure ABI - focused on wallet query functions
    const contractABI = [
      "function getAllUserWallets(address userAddress) view returns (uint256[] memory)",
      "function getEmailDataWallet(uint256 walletId) view returns (tuple(uint256 walletId, address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, uint32 attachmentCount, uint256 timestamp, bool isActive, string metadata))",
      "function getActiveWalletCount(address userAddress) view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(emailDataWalletAddress, contractABI, serviceWallet);
    
    // Get all wallet IDs for this user
    console.log(`🔍 Querying contract ${emailDataWalletAddress} for user wallets...`);
    const walletIds = await contract.getAllUserWallets(userAddress);
    console.log(`📋 Found ${walletIds.length} wallet IDs for user`);
    
    if (walletIds.length === 0) {
      // No wallets found - return empty result
      return sendResponse(res, {
        userAddress,
        wallets: [],
        totalWallets: 0,
        totalCreditsUsed: 0,
        lastActivity: null
      });
    }
    
    // Get detailed information for each wallet
    const walletDetails = [];
    let totalCreditsUsed = 0;
    
    for (const walletId of walletIds) {
      try {
        console.log(`📄 Getting details for wallet ID: ${walletId.toString()}`);
        const walletData = await contract.getEmailDataWallet(walletId);
        
        // Parse the returned tuple structure
        const wallet = {
          walletId: walletData.walletId.toString(),
          userAddress: walletData.userAddress,
          emailHash: walletData.emailHash,
          subjectHash: walletData.subjectHash,
          contentHash: walletData.contentHash,
          senderHash: walletData.senderHash,
          attachmentHashes: walletData.attachmentHashes,
          attachmentCount: walletData.attachmentCount,
          timestamp: walletData.timestamp.toString(),
          isActive: walletData.isActive,
          metadata: walletData.metadata,
          // Derived fields for dashboard display
          emailSubject: walletData.subjectHash || 'Email DATA_WALLET',
          emailSender: walletData.senderHash || 'Unknown Sender',
          createdAt: new Date(walletData.timestamp.toNumber() * 1000).toISOString(),
          creditsUsed: 3 + (walletData.attachmentCount * 2) + 1, // Base + attachments + processing
          blockNumber: 'Unknown', // TODO: Extract from creation transaction
          transactionHash: 'Unknown', // TODO: Extract from creation transaction
          ipfsHash: extractIpfsHashFromMetadata(walletData.metadata)
        };
        
        totalCreditsUsed += wallet.creditsUsed;
        walletDetails.push(wallet);
        
      } catch (walletError) {
        console.error(`❌ Error getting wallet ${walletId.toString()}:`, walletError);
        // Continue with other wallets, don't fail entire request
      }
    }
    
    // Sort by timestamp (newest first)
    walletDetails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`✅ Successfully retrieved ${walletDetails.length} wallets with ${totalCreditsUsed} total credits used`);
    
    sendResponse(res, {
      userAddress,
      wallets: walletDetails,
      totalWallets: walletDetails.length,
      totalCreditsUsed,
      lastActivity: walletDetails.length > 0 ? walletDetails[0].createdAt : null
    });

  } catch (error) {
    console.error('❌ Get user wallets error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve user wallets';
    
    // If it's a contract call failure, provide helpful error message
    if (errorMessage.includes('call revert')) {
      return sendError(res, 'Contract call failed - check contract address and user address', 500);
    }
    
    sendError(res, errorMessage, 500);
  }
});

/**
 * Extract IPFS hash from metadata JSON string
 */
function extractIpfsHashFromMetadata(metadata: string): string {
  try {
    const parsed = JSON.parse(metadata);
    return parsed.ipfsHash || 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

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