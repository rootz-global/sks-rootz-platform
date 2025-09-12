// SKS Rootz Platform - Blockchain Service

import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet | null = null;
  private contracts: { [key: string]: ethers.Contract } = {};

  constructor(private config: any) {
    this.provider = new ethers.providers.JsonRpcProvider(config.blockchain?.rpc_url);
    this.initializeServiceWallet();
    this.initializeContracts();
  }

  private initializeServiceWallet(): void {
    const privateKey = this.config.blockchain?.service_wallet_private_key;
    if (privateKey && privateKey !== 'YOUR_PRIVATE_KEY_HERE') {
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      console.log(`Blockchain service wallet: ${this.serviceWallet.address}`);
    } else {
      console.warn('No service wallet private key configured');
    }
  }

  private initializeContracts(): void {
    const registrationABI = [
      "function registerUser(address userAddress) external",
      "function isUserRegistered(address userAddress) external view returns (bool)",
      "function getUserCredits(address userAddress) external view returns (uint256)"
    ];

    if (this.config.blockchain?.contract_registration) {
      this.contracts.registration = new ethers.Contract(
        this.config.blockchain.contract_registration,
        registrationABI,
        this.serviceWallet || this.provider
      );
    }
  }

  async isUserRegistered(userAddress: string): Promise<boolean> {
    try {
      if (!this.contracts.registration) return false;
      return await this.contracts.registration.isUserRegistered(userAddress);
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  async getUserCredits(userAddress: string): Promise<number> {
    try {
      if (!this.contracts.registration) return 0;
      const credits = await this.contracts.registration.getUserCredits(userAddress);
      return credits.toNumber();
    } catch (error) {
      console.error('Error getting user credits:', error);
      return 0;
    }
  }

  async registerUser(userAddress: string): Promise<boolean> {
    try {
      if (!this.serviceWallet || !this.contracts.registration) {
        console.error('Service wallet or registration contract not available');
        return false;
      }

      const tx = await this.contracts.registration.registerUser(userAddress);
      await tx.wait();
      
      console.log(`User ${userAddress} registered successfully. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      return false;
    }
  }
}
