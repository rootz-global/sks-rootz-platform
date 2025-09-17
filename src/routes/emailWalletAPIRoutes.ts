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

// POST /email-wallet/deposit-credits/:userAddress
router.post('/deposit-credits/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const { amount = '0.01' } = req.body; // Default 0.01 POL = ~60 credits
    
    if (!userAddress) {
      return sendError(res, 'User address is required', 400);
    }

    console.log(`💰 Depositing ${amount} POL credits for user: ${userAddress}`);
    
    const authService = getSharedAuthService(req);
    const config = req.app.locals.config;
    const { ethers } = require('ethers');
    
    // Initialize blockchain connection
    const rpcUrl = config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
    const privateKey = config.get('blockchain.serviceWalletPrivateKey');
    const registrationAddress = config.get('blockchain.contractRegistration', '0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F');
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const serviceWallet = new ethers.Wallet(privateKey, provider);
    
    // Registration contract ABI for credit deposits
    const contractABI = [
      "function depositCredits(address wallet) payable",
      "function getCreditBalance(address wallet) view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(registrationAddress, contractABI, serviceWallet);
    
    // Check current balance before deposit
    const currentCredits = await contract.getCreditBalance(userAddress);
    console.log(`📋 Current credits: ${currentCredits.toString()}`);
    
    // Deposit credits with proper gas pricing
    const depositAmount = ethers.utils.parseEther(amount);
    console.log(`📤 Depositing ${amount} POL to user account...`);
    
    // Get current gas price and add buffer for network congestion
    const gasPrice = await provider.getGasPrice();
    const bufferedGasPrice = gasPrice.mul(150).div(100); // Add 50% buffer
    
    console.log(`⛽ Using gas price: ${ethers.utils.formatUnits(bufferedGasPrice, 'gwei')} gwei`);
    
    const tx = await contract.depositCredits(userAddress, {
      value: depositAmount,
      gasLimit: 200000,
      gasPrice: bufferedGasPrice
    });
    
    console.log(`📋 Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait(2);
    
    if (receipt.status === 1) {
      // Check new balance
      const newCredits = await contract.getCreditBalance(userAddress);
      const creditsAdded = newCredits.sub(currentCredits);
      
      console.log(`✅ Credits deposited successfully!`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Credits added: ${creditsAdded.toString()}`);
      console.log(`   New balance: ${newCredits.toString()} credits`);
      
      sendResponse(res, {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        userAddress,
        polDeposited: amount,
        creditsAdded: creditsAdded.toString(),
        newCreditBalance: newCredits.toString(),
        previousBalance: currentCredits.toString()
      });
    } else {
      throw new Error('Credit deposit transaction failed');
    }

  } catch (error) {
    console.error('❌ Credit deposit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to deposit credits';
    sendError(res, errorMessage, 500);
  }
});

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

// GET /email-wallet/wallet/:walletId/email-data
router.get('/wallet/:walletId/email-data', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return sendError(res, 'Wallet ID is required', 400);
    }

    console.log(`📧 Getting email data for wallet: ${walletId}`);
    
    const authService = getSharedAuthService(req);
    const config = req.app.locals.config;
    const { ethers } = require('ethers');
    const fetch = require('node-fetch');
    
    // Initialize blockchain connection
    const rpcUrl = config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
    const privateKey = config.get('blockchain.serviceWalletPrivateKey');
    const emailDataWalletAddress = config.get('blockchain.contractEmailDataWallet', '0x18F3772F6f952d22D116Ce61323eC93f0E842F94');
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const serviceWallet = new ethers.Wallet(privateKey, provider);
    
    // EmailDataWallet ABI for getting wallet details
    const contractABI = [
      "function getEmailDataWallet(uint256 walletId) view returns (tuple(uint256 walletId, address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, uint32 attachmentCount, uint256 timestamp, bool isActive, string metadata))"
    ];
    
    const contract = new ethers.Contract(emailDataWalletAddress, contractABI, serviceWallet);
    
    // Get wallet data from blockchain
    console.log(`🔍 Querying contract for wallet ${walletId} details...`);
    const walletData = await contract.getEmailDataWallet(walletId);
    
    // Extract IPFS hash from metadata
    let ipfsHash = 'Unknown';
    let rawEmailContent = null;
    let parsedEmailData = null;
    
    try {
      const metadata = JSON.parse(walletData.metadata);
      ipfsHash = metadata.ipfsHash;
      
      if (ipfsHash && ipfsHash !== 'Unknown' && ipfsHash !== 'no-ipfs') {
        console.log(`📦 Fetching email content from IPFS: ${ipfsHash}`);
        
        // Fetch from IPFS via Pinata gateway
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        
        const ipfsResponse = await fetch(ipfsUrl);
        if (ipfsResponse.ok) {
          rawEmailContent = await ipfsResponse.text();
          console.log(`✅ Retrieved ${rawEmailContent.length} characters from IPFS`);
          
          // Try to parse as JSON first (SKS platform format)
          try {
            const ipfsJson = JSON.parse(rawEmailContent);
            console.log('📋 IPFS content is structured JSON');
            
            if (ipfsJson.emailData) {
              // NEW FORMAT: Complete email package with raw + parsed data
              const emailDataObj = ipfsJson.emailData;
              
              parsedEmailData = {
                subject: emailDataObj.subject || 'No Subject',
                from: emailDataObj.from || emailDataObj.sender || 'Unknown Sender',
                to: emailDataObj.to || emailDataObj.recipient || 'process@rivetz.com',
                date: emailDataObj.date || emailDataObj.timestamp || ipfsJson.metadata?.createdAt,
                body: emailDataObj.bodyText || emailDataObj.bodyHtml || emailDataObj.content || 'No content available',
                headers: emailDataObj.headers || [],
                bodyLength: (emailDataObj.bodyText || emailDataObj.bodyHtml || '').length,
                attachments: ipfsJson.attachments || [],
                metadata: ipfsJson.metadata || {},
                // NEW: Include raw email data if available
                rawEmail: ipfsJson.rawEmail || null,
                verification: ipfsJson.verification || null
              };
              
              console.log(`✅ Parsed complete email package: ${parsedEmailData.subject}`);
            } else {
              console.warn('⚠️ IPFS JSON does not contain emailData object');
              parsedEmailData = {
                subject: 'Data available in IPFS',
                from: 'Unknown',
                to: 'process@rivetz.com',
                date: ipfsJson.metadata?.createdAt || 'Unknown',
                body: JSON.stringify(ipfsJson, null, 2),
                headers: [],
                bodyLength: JSON.stringify(ipfsJson).length,
                attachments: ipfsJson.attachments || [],
                rawEmail: ipfsJson.rawEmail || null
              };
            }
          } catch (jsonError) {
            // Not JSON, treat as raw email content
            console.log('📧 IPFS content is raw email text');
            parsedEmailData = parseEmailContent(rawEmailContent);
          }
        } else {
          console.warn(`⚠️ IPFS fetch failed: ${ipfsResponse.status}`);
        }
      }
    } catch (metadataError) {
      console.warn(`⚠️ Error parsing metadata or fetching IPFS:`, metadataError);
    }
    
    // Construct comprehensive email data response
    const emailData = {
      walletId: walletData.walletId.toString(),
      userAddress: walletData.userAddress,
      blockchainData: {
        emailHash: walletData.emailHash,
        subjectHash: walletData.subjectHash,
        contentHash: walletData.contentHash,
        senderHash: walletData.senderHash,
        attachmentHashes: walletData.attachmentHashes,
        attachmentCount: walletData.attachmentCount,
        timestamp: walletData.timestamp.toString(),
        isActive: walletData.isActive,
        metadata: walletData.metadata
      },
      ipfsData: {
        ipfsHash,
        ipfsUrl: ipfsHash !== 'Unknown' ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : null,
        rawContent: rawEmailContent,
        contentLength: rawEmailContent ? rawEmailContent.length : 0
      },
      parsedEmail: parsedEmailData,
      createdAt: new Date(walletData.timestamp.toNumber() * 1000).toISOString(),
      displayData: {
        subject: parsedEmailData?.subject || walletData.subjectHash || 'Unknown Subject',
        from: parsedEmailData?.from || walletData.senderHash || 'Unknown Sender',
        to: parsedEmailData?.to || 'process@rivetz.com',
        date: parsedEmailData?.date || new Date(walletData.timestamp.toNumber() * 1000).toLocaleString(),
        hasAttachments: walletData.attachmentCount > 0,
        attachmentCount: walletData.attachmentCount
      }
    };
    
    console.log(`✅ Email data compiled for wallet ${walletId}`);
    
    sendResponse(res, emailData);

  } catch (error) {
    console.error(`❌ Get email data error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve email data';
    sendError(res, errorMessage, 500);
  }
});

/**
 * Basic email content parser
 */
function parseEmailContent(rawEmail: string): any {
  try {
    const lines = rawEmail.split('\n');
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    let bodyStart = -1;
    
    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('Subject:')) {
        subject = line.substring(8).trim();
      } else if (line.startsWith('From:')) {
        from = line.substring(5).trim();
      } else if (line.startsWith('To:')) {
        to = line.substring(3).trim();
      } else if (line.startsWith('Date:')) {
        date = line.substring(5).trim();
      } else if (line.trim() === '' && bodyStart === -1) {
        bodyStart = i + 1;
        break;
      }
    }
    
    // Extract body
    const body = bodyStart > -1 ? lines.slice(bodyStart).join('\n').trim() : '';
    
    return {
      subject,
      from,
      to,
      date,
      body,
      headers: lines.slice(0, bodyStart > -1 ? bodyStart - 1 : 10),
      bodyLength: body.length
    };
    
  } catch (error) {
    console.error('Email parsing error:', error);
    return null;
  }
}

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