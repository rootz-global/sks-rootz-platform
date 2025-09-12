// SKS Rootz Platform - Blockchain Service (EPISTERY Pattern)

import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet | null = null;
  private contracts: { [key: string]: ethers.Contract } = {};
  private config: any;

  constructor(domainConfig: any) {
    // Use domain configuration from INI files (EPISTERY pattern)
    this.config = domainConfig || this.getDefaultConfig();
    
    const rpcUrl = this.config.blockchain?.rpcUrl || 'https://rpc-amoy.polygon.technology/';
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    this.initializeServiceWallet();
    this.initializeContracts();
  }

  private getDefaultConfig(): any {
    // Default configuration for localhost domain
    return {
      blockchain: {
        rpcUrl: 'https://rpc-amoy.polygon.technology/',
        serviceWalletPrivateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || '',
        contracts: {
          registration: '0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F'
        }
      }
    };
  }

  private initializeServiceWallet(): void {
    const privateKey = this.config.blockchain?.serviceWalletPrivateKey || this.config.blockchain?.privateKey;
    
    if (privateKey && privateKey !== 'YOUR_PRIVATE_KEY_HERE' && privateKey.length > 10) {
      try {
        this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
        console.log(`🔑 Blockchain service wallet initialized: ${this.serviceWallet.address}`);
      } catch (error) {
        console.error('❌ Failed to initialize service wallet:', error);
      }
    } else {
      console.warn('⚠️ No valid service wallet private key found in configuration');
    }
  }

  private initializeContracts(): void {
    // EmailWalletRegistration ABI
    const registrationABI = [
      "function isRegistered(address wallet) view returns (bool)",
      "function getCreditBalance(address wallet) view returns (uint256)", 
      "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
      "function depositCredits(address wallet) payable",
      "function deductCredits(address wallet, uint256 amount) returns (bool)",
      "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
      "function owner() view returns (address)"
    ];

    const contractAddress = this.config.blockchain?.contracts?.registration || 
                          this.config.blockchain?.contractRegistration ||
                          '0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F';

    if (contractAddress) {
      this.contracts.registration = new ethers.Contract(
        contractAddress,
        registrationABI,
        this.serviceWallet || this.provider
      );
      console.log(`📄 Registration contract connected: ${contractAddress}`);
    } else {
      console.warn('⚠️ No registration contract address found in configuration');
    }
  }

  // Address validation utility
  private validateAndFormatAddress(address: string): string {
    try {
      return ethers.utils.getAddress(address.toLowerCase());
    } catch (error) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }
  }

  // Gas pricing utility
  private async getGasPricing(): Promise<{ maxFeePerGas: ethers.BigNumber; maxPriorityFeePerGas: ethers.BigNumber }> {
    try {
      const feeData = await this.provider.getFeeData();
      
      const minGasPrice = ethers.utils.parseUnits('30', 'gwei');
      const minPriorityFee = ethers.utils.parseUnits('25', 'gwei');
      
      const maxFeePerGas = feeData.maxFeePerGas?.gt(minGasPrice) ? feeData.maxFeePerGas : minGasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.gt(minPriorityFee) ? feeData.maxPriorityFeePerGas : minPriorityFee;
      
      return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
      console.warn('⚠️ Failed to get network gas pricing, using defaults');
      return {
        maxFeePerGas: ethers.utils.parseUnits('35', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
      };
    }
  }

  async isUserRegistered(userAddress: string): Promise<boolean> {
    try {
      if (!this.contracts.registration) {
        console.warn('⚠️ Registration contract not available');
        return false;
      }
      
      const validAddress = this.validateAndFormatAddress(userAddress);
      const result = await this.contracts.registration.isRegistered(validAddress);
      console.log(`🔍 User ${validAddress} registration status: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ Error checking user registration:', error);
      return false;
    }
  }

  async getUserCredits(userAddress: string): Promise<number> {
    try {
      if (!this.contracts.registration) {
        console.warn('⚠️ Registration contract not available');
        return 0;
      }
      
      const validAddress = this.validateAndFormatAddress(userAddress);
      const credits = await this.contracts.registration.getCreditBalance(validAddress);
      const creditCount = credits.toNumber();
      console.log(`💰 User ${validAddress} has ${creditCount} credits`);
      return creditCount;
    } catch (error) {
      console.error('❌ Error getting user credits:', error);
      return 0;
    }
  }

  async getUserRegistration(userAddress: string): Promise<any> {
    try {
      if (!this.contracts.registration) {
        console.warn('⚠️ Registration contract not available');
        return null;
      }
      
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
      console.error('❌ Error getting user registration:', error);
      return null;
    }
  }

  async depositCredits(userAddress: string, amount: string): Promise<boolean> {
    try {
      if (!this.serviceWallet || !this.contracts.registration) {
        console.error('❌ Service wallet or registration contract not available');
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
      console.log(`💰 Deposited credits for ${validAddress}. TX: ${tx.hash}`);
      return true;
    } catch (error) {
      console.error('❌ Error depositing credits:', error);
      return false;
    }
  }

  async testBlockchainWrite(): Promise<boolean> {
    try {
      if (!this.serviceWallet) {
        console.error('❌ No service wallet available for blockchain write test');
        return false;
      }

      console.log('🧪 Testing blockchain write capability...');
      console.log(`🔑 Service wallet: ${this.serviceWallet.address}`);
      
      const balance = await this.serviceWallet.getBalance();
      console.log(`💰 Service wallet balance: ${ethers.utils.formatEther(balance)} POL`);
      
      if (balance.lt(ethers.utils.parseEther('0.01'))) {
        console.error('❌ Insufficient balance for write test');
        return false;
      }

      console.log('📡 Attempting simple transaction...');
      const gasPricing = await this.getGasPricing();
      
      const tx = await this.serviceWallet.sendTransaction({
        to: this.serviceWallet.address,
        value: ethers.utils.parseEther('0.001'),
        gasLimit: 21000,
        maxFeePerGas: gasPricing.maxFeePerGas,
        maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
      });
      
      console.log(`📋 Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      return true;
    } catch (error) {
      console.error('❌ Blockchain write test failed:', error);
      return false;
    }
  }

  async registerEmailWallet(userAddress: string, primaryEmail: string): Promise<boolean> {
    try {
      if (!this.serviceWallet || !this.contracts.registration) {
        console.error('❌ Service wallet or registration contract not available');
        return false;
      }

      const validAddress = this.validateAndFormatAddress(userAddress);
      console.log(`📝 Attempting registration for ${validAddress} with email: ${primaryEmail}`);

      const isAlreadyRegistered = await this.contracts.registration.isRegistered(validAddress);
      if (isAlreadyRegistered) {
        console.log(`⚠️ User ${validAddress} is already registered`);
        return false;
      }

      const gasPricing = await this.getGasPricing();

      const tx = await this.contracts.registration.registerEmailWallet(
        primaryEmail,
        [],
        ethers.constants.AddressZero,
        [],
        [],
        false,
        { 
          value: ethers.utils.parseEther("0.001"),
          gasLimit: 500000,
          maxFeePerGas: gasPricing.maxFeePerGas,
          maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
        }
      );
      
      console.log(`📋 Registration transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Registration confirmed in block ${receipt.blockNumber}`);
      
      return true;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return false;
    }
  }
}
