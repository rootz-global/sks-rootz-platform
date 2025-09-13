import { Request, Response } from 'express';
import { Config } from '../core/configuration';
import AuthorizationService from '../services/authorization/AuthorizationService';
import LocalIPFSService from '../services/ipfs/LocalIPFSService';
import EmailParser from '../services/email-processing/EmailParser';

export class AuthorizationController {
  private config: Config;
  private authService: AuthorizationService;
  private ipfsService: LocalIPFSService;
  private emailParser: EmailParser;

  constructor(config: Config) {
    this.config = config;
    this.authService = new AuthorizationService(config);
    this.ipfsService = new LocalIPFSService(config);
    this.emailParser = new EmailParser();
  }

  /**
   * Get pending authorization requests for a user
   */
  async getAuthorizationRequests(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        res.status(400).json({
          success: false,
          error: 'User address is required'
        });
        return;
      }

      console.log(`📋 Getting authorization requests for user: ${userAddress}`);

      // For demo purposes, return the existing request if it matches
      // In production, this would query a database of pending requests
      const testRequestId = '0xca2dbc2e59f35556d80d821d3c29a949ee1f4e9f15eb193e5fcf46143d92ac62';
      
      try {
        const requestDetails = await this.authService.getAuthorizationRequest(testRequestId);
        
        if (requestDetails && 
            requestDetails.userAddress.toLowerCase() === userAddress.toLowerCase() &&
            requestDetails.status === 'pending') {
          
          const mockRequest = {
            requestId: testRequestId,
            userAddress: requestDetails.userAddress,
            authToken: requestDetails.authToken,
            creditCost: requestDetails.creditCost,
            expiresAt: requestDetails.expiresAt,
            emailData: {
              from: 'wallet-creation-test@example.com',
              subject: 'Complete DATA_WALLET Creation Test',
              date: '2025-09-13T21:00:00.000Z',
              attachmentCount: 0
            },
            ipfsHash: 'QmcYpsKJechgFb8Evd9DKZhLrfs1b4YPv75QSxjs1tJZu5',
            ipfsUrl: 'https://rootz.digital/ipfs/QmcYpsKJechgFb8Evd9DKZhLrfs1b4YPv75QSxjs1tJZu5'
          };

          res.json({
            success: true,
            requests: [mockRequest]
          });
        } else {
          res.json({
            success: true,
            requests: []
          });
        }
      } catch (error) {
        console.log('No pending requests found for user');
        res.json({
          success: true,
          requests: []
        });
      }

    } catch (error: any) {
      console.error('Failed to get authorization requests:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get authorization requests'
      });
    }
  }

  /**
   * Process user authorization signature
   */
  async processUserAuthorization(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, signature, userAddress } = req.body;
      
      if (!requestId || !signature || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'requestId, signature, and userAddress are required'
        });
        return;
      }

      console.log(`🔐 Processing user authorization:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   User: ${userAddress}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      // Verify request exists and belongs to user
      const requestDetails = await this.authService.getAuthorizationRequest(requestId);
      
      if (!requestDetails) {
        res.status(404).json({
          success: false,
          error: 'Authorization request not found'
        });
        return;
      }

      if (requestDetails.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Request does not belong to this user'
        });
        return;
      }

      if (requestDetails.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: `Request status is ${requestDetails.status}, not pending`
        });
        return;
      }

      // Process the user's authorization signature
      // Note: This is where the service wallet takes the user's signature and submits it
      const result = await this.submitUserAuthorizationToBlockchain(requestId, signature);

      if (result.success) {
        res.json({
          success: true,
          message: 'Authorization processed successfully',
          transactionHash: result.transactionHash,
          requestId
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to process authorization'
        });
      }

    } catch (error: any) {
      console.error('Failed to process user authorization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process authorization'
      });
    }
  }

  /**
   * Submit user authorization to blockchain (service wallet pays gas)
   */
  private async submitUserAuthorizationToBlockchain(requestId: string, userSignature: string) {
    try {
      console.log(`📤 Service wallet submitting user authorization to blockchain...`);
      
      // Get contract instance with service wallet
      const { ethers } = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/')
      );
      
      const serviceWallet = new ethers.Wallet(
        this.config.get('blockchain.serviceWalletPrivateKey'),
        provider
      );

      const contractAddress = this.config.get('blockchain.contractAuthorization');
      const authABI = [
        "function authorizeEmailWalletCreation(bytes32 requestId, bytes signature) external"
      ];

      const authContract = new ethers.Contract(contractAddress, authABI, serviceWallet);

      // Service wallet submits user's signature to blockchain
      const tx = await authContract.authorizeEmailWalletCreation(
        requestId,
        userSignature,
        {
          gasLimit: 500000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );

      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Gas paid by service wallet: ${serviceWallet.address}`);

      const receipt = await tx.wait();
      console.log(`   ✅ Authorization processed in block ${receipt.blockNumber}`);

      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }

      return {
        success: true,
        transactionHash: tx.hash
      };

    } catch (error: any) {
      console.error('Failed to submit authorization to blockchain:', error);
      return {
        success: false,
        error: error?.message || 'Blockchain submission failed'
      };
    }
  }

  /**
   * Reject authorization request
   */
  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, userAddress } = req.body;
      
      if (!requestId || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'requestId and userAddress are required'
        });
        return;
      }

      console.log(`❌ User rejecting request: ${requestId}`);

      // In production, this would update the request status in database
      res.json({
        success: true,
        message: 'Request rejected successfully'
      });

    } catch (error: any) {
      console.error('Failed to reject request:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to reject request'
      });
    }
  }
}

export default AuthorizationController;
