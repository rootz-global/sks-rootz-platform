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
      
      // Initialize blockchain service with domain config
      const blockchainService = new BlockchainService(config);
      
      // Check if user is already registered
      const isRegistered = await blockchainService.isUserRegistered(userAddress);
      if (isRegistered) {
        this.sendError(res, 'User already registered', 400);
        return;
      }
      
      // Register user on blockchain
      const success = await blockchainService.registerUser(userAddress);
      if (!success) {
        this.sendError(res, 'Blockchain registration failed', 500);
        return;
      }
      
      const result = {
        userAddress,
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
      
      const result = {
        userAddress,
        credits,
        isRegistered,
        lastUpdated: new Date().toISOString(),
        domain
      };
      
      console.log(`Credit balance request for ${userAddress} on domain ${domain}: ${credits} credits`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('Credit balance error:', error);
      this.sendError(res, 'Failed to get credit balance', 500);
    }
  }
}
