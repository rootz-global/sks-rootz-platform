// SKS Rootz Platform - Blockchain Service

import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet | null = null;
  private contracts: { [key: string]: ethers.Contract } = {};

  // Address validation utility
  private validateAndFormatAddress(address: string): string {
    try {
      // This will throw if invalid and return checksummed address if valid
      return ethers.utils.getAddress(address.toLowerCase());
    } catch (error) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
  }

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
      const validAddress = this.validateAndFormatAddress(userAddress);
      return await this.contracts.registration.isRegistered(validAddress);
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  async getUserCredits(userAddress: string): Promise<number> {
    try {
      if (!this.contracts.registration) return 0;
      const validAddress = this.validateAndFormatAddress(userAddress);
      const credits = await this.contracts.registration.getCreditBalance(validAddress);
      return credits.toNumber();
    } catch (error) {
      console.error('Error getting user credits:', error);
      return 0;
    }
  }

  async getUserRegistration(userAddress: string): Promise<any> {
    try {
      if (!this.contracts.registration) return null;
      const validAddress = this.validateAndFormatAddress(userAddress);
      const registration = await this.contracts.registration.getRegistration(validAddress);
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

      const validAddress = this.validateAndFormatAddress(userAddress);
      console.log(`Attempting to register ${validAddress} with email: ${primaryEmail}`);

      // Check if already registered first
      const isAlreadyRegistered = await this.contracts.registration.isRegistered(validAddress);
      if (isAlreadyRegistered) {
        console.log(`User ${validAddress} is already registered`);
        return false; // Don't attempt registration if already registered
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
      
      console.log(`User ${validAddress} registered successfully. TX: ${tx.hash}`);
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

      const validAddress = this.validateAndFormatAddress(userAddress);
      
      const tx = await this.contracts.registration.depositCredits(
        validAddress,
        { value: ethers.utils.parseEther(amount) }
      );
      
      await tx.wait();
      
      console.log(`Deposited credits for ${validAddress}. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('Error depositing credits:', error);
      return false;
    }
  }
}
