// SKS Rootz Platform - Email Wallet Controller

import { Request, Response } from 'express';
import { Controller } from './Controller.js';
import { BlockchainService } from '../services/BlockchainService.js';

export class EmailWalletController extends Controller {
  
  // Register user wallet
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, signature, message } = req.body;
      const domain = this.getDomainFromRequest(req);
      const config = this.getConfigFromRequest(req);
      
      // Validate required fields
      if (!userAddress) {
        this.sendError(res, 'User address is required', 400);
        return;
      }
      
      // Initialize blockchain service with domain config
      const blockchainService = new BlockchainService(config);
      
      // Check if user is already registered (this will validate address format)
      const isRegistered = await blockchainService.isUserRegistered(userAddress);
      if (isRegistered) {
        this.sendError(res, 'User already registered', 400);
        return;
      }
      
      // Register user on blockchain with a basic email
      const email = `${userAddress.toLowerCase()}@temp.rootz.global`;
      const success = await blockchainService.registerEmailWallet(userAddress, email);
      if (!success) {
        this.sendError(res, 'Blockchain registration failed', 500);
        return;
      }
      
      // Deposit initial credits (60 credits = ~0.06 ETH worth)
      await blockchainService.depositCredits(userAddress, "0.006");
      
      const result = {
        userAddress,
        email,
        credits: 60,
        registrationDate: new Date().toISOString(),
        isActive: true,
        domain,
        blockchainRegistered: true
      };
      
      console.log(`User registration for ${userAddress} on domain ${domain}`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error types
      if (error instanceof Error && error.message.includes('Invalid Ethereum address')) {
        this.sendError(res, error.message, 400);
        return;
      }
      
      this.sendError(res, 'Registration failed', 500);
    }
  }
  
  // Get credit balance
  public async getCreditBalance(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      const domain = this.getDomainFromRequest(req);
      const config = this.getConfigFromRequest(req);
      
      // Get real credits from blockchain
      const blockchainService = new BlockchainService(config);
      const credits = await blockchainService.getUserCredits(userAddress);
      const isRegistered = await blockchainService.isUserRegistered(userAddress);
      const registration = await blockchainService.getUserRegistration(userAddress);
      
      const result = {
        userAddress,
        credits,
        isRegistered,
        registration,
        lastUpdated: new Date().toISOString(),
        domain
      };
      
      console.log(`Credit balance request for ${userAddress} on domain ${domain}: ${credits} credits`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('Credit balance error:', error);
      
      // Handle specific error types
      if (error instanceof Error && error.message.includes('Invalid Ethereum address')) {
        this.sendError(res, error.message, 400);
        return;
      }
      
      this.sendError(res, 'Failed to get credit balance', 500);
    }
  }

  // Test blockchain write capability
  public async testBlockchainWrite(req: Request, res: Response): Promise<void> {
    try {
      const domain = this.getDomainFromRequest(req);
      const config = this.getConfigFromRequest(req);
      
      console.log(`[TEST] Starting blockchain write test for domain: ${domain}`);
      
      // Initialize blockchain service
      const blockchainService = new BlockchainService(config);
      
      // Test basic write capability
      const success = await (blockchainService as any).testBlockchainWrite();
      
      const result = {
        domain,
        blockchainWriteTest: success,
        timestamp: new Date().toISOString(),
        message: success ? 'Blockchain write capability confirmed' : 'Blockchain write test failed'
      };
      
      console.log(`[TEST] Blockchain write test result: ${success}`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('[TEST] Blockchain write test error:', error);
      this.sendError(res, 'Blockchain write test failed', 500);
    }
  }
}
