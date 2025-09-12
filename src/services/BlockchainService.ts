// SKS Rootz Platform - Blockchain Service

import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet | null = null;
  private contracts: { [key: string]: ethers.Contract } = {};

  // Gas pricing utility - Get current network gas prices
  private async getGasPricing(): Promise<{ maxFeePerGas: ethers.BigNumber; maxPriorityFeePerGas: ethers.BigNumber }> {
    try {
      const feeData = await this.provider.getFeeData();
      
      // Ensure minimum gas prices for Polygon Amoy network
      const minGasPrice = ethers.utils.parseUnits('30', 'gwei'); // 30 Gwei minimum
      const minPriorityFee = ethers.utils.parseUnits('25', 'gwei'); // 25 Gwei minimum
      
      const maxFeePerGas = feeData.maxFeePerGas?.gt(minGasPrice) ? feeData.maxFeePerGas : minGasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.gt(minPriorityFee) ? feeData.maxPriorityFeePerGas : minPriorityFee;
      
      console.log(`[GAS] Network gas pricing: maxFee=${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} Gwei, priority=${ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')} Gwei`);
      
      return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
      console.warn('[GAS] Failed to get network gas pricing, using defaults:', error);
      // Fallback to safe defaults for Polygon Amoy
      return {
        maxFeePerGas: ethers.utils.parseUnits('35', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
      };
    }
  }

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
      console.log(`[REGISTER] Step 1: Validating registration for ${validAddress}`);

      // CRITICAL: Check if already registered BEFORE attempting any transaction
      console.log(`[REGISTER] Step 2: Checking if ${validAddress} is already registered...`);
      const isAlreadyRegistered = await this.contracts.registration.isRegistered(validAddress);
      console.log(`[REGISTER] Step 3: Registration check result for ${validAddress}: ${isAlreadyRegistered}`);
      
      if (isAlreadyRegistered) {
        console.log(`[REGISTER] ABORT: User ${validAddress} is already registered - skipping transaction`);
        return false; // This should prevent any blockchain transaction
      }

      console.log(`[REGISTER] Step 4: User ${validAddress} is NOT registered, proceeding with registration...`);
      console.log(`[REGISTER] Step 5: Attempting blockchain transaction for ${validAddress} with email: ${primaryEmail}`);

      // Get proper gas pricing for network
      const gasPricing = await this.getGasPricing();

      // Register with basic parameters - primary email only, no corporate wallet
      const tx = await this.contracts.registration.registerEmailWallet(
        primaryEmail,           // primaryEmail
        [],                    // additionalEmails (empty array)
        ethers.constants.AddressZero, // parentCorporateWallet (none)
        [],                    // authorizationTxs (empty array)
        [],                    // whitelistedDomains (empty array)
        false,                 // autoProcessCC
        { 
          value: ethers.utils.parseEther("0.001"), // registration fee (small amount)
          gasLimit: 500000,  // Manual gas limit to avoid estimation issues
          maxFeePerGas: gasPricing.maxFeePerGas,
          maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
        }
      );
      
      console.log(`[REGISTER] Step 6: Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`[REGISTER] Step 7: Transaction confirmed in block ${receipt.blockNumber}`);
      
      console.log(`[REGISTER] SUCCESS: User ${validAddress} registered successfully. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('[REGISTER] ERROR:', error);
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
      const gasPricing = await this.getGasPricing();
      
      const tx = await this.contracts.registration.depositCredits(
        validAddress,
        { 
          value: ethers.utils.parseEther(amount),
          maxFeePerGas: gasPricing.maxFeePerGas,
          maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
        }
      );
      
      await tx.wait();
      
      console.log(`Deposited credits for ${validAddress}. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('Error depositing credits:', error);
      return false;
    }
  }

  // TEST METHOD: Simple blockchain write test
  async testBlockchainWrite(): Promise<boolean> {
    try {
      if (!this.serviceWallet) {
        console.error('[TEST] No service wallet available');
        return false;
      }

      console.log('[TEST] Testing basic blockchain write capability...');
      console.log(`[TEST] Service wallet: ${this.serviceWallet.address}`);
      
      // Get current balance
      const balance = await this.serviceWallet.getBalance();
      console.log(`[TEST] Service wallet balance: ${ethers.utils.formatEther(balance)} POL`);
      
      if (balance.lt(ethers.utils.parseEther('0.01'))) {
        console.error('[TEST] Insufficient balance for write test');
        return false;
      }

      // Test with a simple transaction (send 0.001 POL to self)
      console.log('[TEST] Attempting simple transaction...');
      const gasPricing = await this.getGasPricing();
      
      const tx = await this.serviceWallet.sendTransaction({
        to: this.serviceWallet.address,
        value: ethers.utils.parseEther('0.001'),
        gasLimit: 21000,
        maxFeePerGas: gasPricing.maxFeePerGas,
        maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
      });
      
      console.log(`[TEST] Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`[TEST] Transaction confirmed in block ${receipt.blockNumber}`);
      
      console.log('[TEST] SUCCESS: Blockchain write capability confirmed');
      return true;
    } catch (error) {
      console.error('[TEST] ERROR: Blockchain write test failed:', error);
      return false;
    }
  }
}
