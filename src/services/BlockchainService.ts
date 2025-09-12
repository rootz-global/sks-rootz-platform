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
    // Correct EmailWalletRegistration ABI from the actual deployed contract
    const registrationABI = [
      "function isRegistered(address wallet) view returns (bool)",
      "function getCreditBalance(address wallet) view returns (uint256)",
      "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
      "function depositCredits(address wallet) payable",
      "function deductCredits(address wallet, uint256 amount) returns (bool)",
      "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
      "function owner() view returns (address)"
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
      return await this.contracts.registration.isRegistered(userAddress);
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  async getUserCredits(userAddress: string): Promise<number> {
    try {
      if (!this.contracts.registration) return 0;
      const credits = await this.contracts.registration.getCreditBalance(userAddress);
      return credits.toNumber();
    } catch (error) {
      console.error('Error getting user credits:', error);
      return 0;
    }
  }

  async getUserRegistration(userAddress: string): Promise<any> {
    try {
      if (!this.contracts.registration) return null;
      const registration = await this.contracts.registration.getRegistration(userAddress);
      return {
        registrationId: registration.registrationId,
        primaryEmail: registration.primaryEmail,
        parentCorporateWallet: registration.parentCorporateWallet,
        autoProcessCC: registration.autoProcessCC,
        registeredAt: registration.registeredAt.toNumber(),
        isActive: registration.isActive,
        creditBalance: registration.creditBalance.toNumber()
      };
    } catch (error) {
      console.error('Error getting user registration:', error);
      return null;
    }
  }

  async registerEmailWallet(userAddress: string, primaryEmail: string): Promise<boolean> {
    try {
      if (!this.serviceWallet || !this.contracts.registration) {
        console.error('Service wallet or registration contract not available');
        return false;
      }

      // Register with basic parameters - primary email only, no corporate wallet
      const tx = await this.contracts.registration.registerEmailWallet(
        primaryEmail,           // primaryEmail
        [],                    // additionalEmails (empty array)
        ethers.constants.AddressZero, // parentCorporateWallet (none)
        [],                    // authorizationTxs (empty array)
        [],                    // whitelistedDomains (empty array)
        false,                 // autoProcessCC
        { value: ethers.utils.parseEther("0.001") } // registration fee (small amount)
      );
      
      await tx.wait();
      
      console.log(`User ${userAddress} registered successfully. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      return false;
    }
  }

  async depositCredits(userAddress: string, amount: string): Promise<boolean> {
    try {
      if (!this.serviceWallet || !this.contracts.registration) {
        console.error('Service wallet or registration contract not available');
        return false;
      }

      const tx = await this.contracts.registration.depositCredits(
        userAddress,
        { value: ethers.utils.parseEther(amount) }
      );
      
      await tx.wait();
      
      console.log(`Deposited credits for ${userAddress}. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('Error depositing credits:', error);
      return false;
    }
  }
}
