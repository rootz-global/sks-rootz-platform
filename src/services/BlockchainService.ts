// SKS Rootz Platform - Blockchain Service (EPISTERY Pattern) - FIXED

import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private serviceWallet: ethers.Wallet | null = null;
  private contracts: { [key: string]: ethers.Contract } = {};
  private config: any;

  constructor(domainConfig: any) {
    // Use domain configuration from INI files (EPISTERY pattern)
    this.config = domainConfig || this.getDefaultConfig();
    
    const rpcUrl = this.getConfigValue('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    this.initializeServiceWallet();
    this.initializeContracts();
  }

  /**
   * Helper method to get config values from either Config instance or raw object
   */
  private getConfigValue(key: string): string | undefined {
    // Check if config has a get() method (Config instance)
    if (this.config && typeof this.config.get === 'function') {
      return this.config.get(key);
    }
    
    // Handle raw config object (legacy)
    if (key.includes('.')) {
      const parts = key.split('.');
      let value = this.config;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      }
      return typeof value === 'string' ? value : undefined;
    }
    
    return this.config[key];
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
    const privateKey = this.getConfigValue('blockchain.serviceWalletPrivateKey') || 
                      this.getConfigValue('blockchain.privateKey');
    
    if (privateKey && privateKey !== 'YOUR_PRIVATE_KEY_HERE' && privateKey.length > 10) {
      try {
        this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
        console.log(`🔑 Blockchain service wallet initialized: ${this.serviceWallet.address}`);
      } catch (error) {
        console.error('❌ Failed to initialize service wallet:', error);
      }
    } else {
      console.warn('⚠️ No valid service wallet private key found in configuration');
      console.warn(`   Checked keys: blockchain.serviceWalletPrivateKey, blockchain.privateKey`);
      console.warn(`   Config type: ${typeof this.config}, has get(): ${typeof this.config?.get === 'function'}`);
    }
  }

  private initializeContracts(): void {
    // EmailWalletRegistration ABI - MATCHES DEPLOYED CONTRACT
    const registrationABI = [
      "function isRegistered(address wallet) view returns (bool)",
      "function getCreditBalance(address wallet) view returns (uint256)", 
      "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
      "function depositCredits(address wallet) payable",
      "function deductCredits(address wallet, uint256 amount) returns (bool)",
      "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
      "function owner() view returns (address)"
    ];

    // EmailDataWallet ABI (Enhanced Contract)
    const emailDataWalletABI = [
      "function getAllUserWallets(address user) view returns (bytes32[] memory)",
      "function getActiveWalletCount(address user) view returns (uint256)",
      "function getEmailDataWallet(bytes32 walletId) view returns (tuple(address owner, string subject, string sender, uint256 timestamp, bool isActive, bytes32 contentHash, string ipfsHash))",
      "function createEmailDataWallet(address owner, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)"
    ];

    // Get contract addresses
    const registrationAddress = this.getConfigValue('blockchain.contractRegistration') ||
                               this.getConfigValue('blockchain.contracts.registration') ||
                               '0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F';

    const emailDataWalletAddress = this.getConfigValue('blockchain.contractEmailDataWallet') ||
                                  this.getConfigValue('blockchain.contracts.emailDataWallet') ||
                                  '0x0eb8830FaC353A63E912861137b246CAC7FC5977';

    // Initialize contracts
    if (registrationAddress) {
      this.contracts.registration = new ethers.Contract(
        registrationAddress,
        registrationABI,
        this.serviceWallet || this.provider
      );
      console.log(`📄 Registration contract connected: ${registrationAddress}`);
    } else {
      console.warn('⚠️ No registration contract address found in configuration');
    }

    if (emailDataWalletAddress) {
      this.contracts.emailDataWallet = new ethers.Contract(
        emailDataWalletAddress,
        emailDataWalletABI,
        this.serviceWallet || this.provider
      );
      console.log(`📧 Email Data Wallet contract connected: ${emailDataWalletAddress}`);
    } else {
      console.warn('⚠️ No email data wallet contract address found in configuration');
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

  async getUserEmailWallets(userAddress: string): Promise<string[]> {
    try {
      if (!this.contracts.emailDataWallet) {
        console.warn('⚠️ Email Data Wallet contract not available');
        return [];
      }
      
      const validAddress = this.validateAndFormatAddress(userAddress);
      const wallets = await this.contracts.emailDataWallet.getAllUserWallets(validAddress);
      console.log(`📧 User ${validAddress} has ${wallets.length} email wallets`);
      return wallets;
    } catch (error) {
      console.error('❌ Error getting user email wallets:', error);
      return [];
    }
  }

  async getActiveWalletCount(userAddress: string): Promise<number> {
    try {
      if (!this.contracts.emailDataWallet) {
        console.warn('⚠️ Email Data Wallet contract not available');
        return 0;
      }
      
      const validAddress = this.validateAndFormatAddress(userAddress);
      const count = await this.contracts.emailDataWallet.getActiveWalletCount(validAddress);
      const activeCount = count.toNumber();
      console.log(`📊 User ${validAddress} has ${activeCount} active wallets`);
      return activeCount;
    } catch (error) {
      console.error('❌ Error getting active wallet count:', error);
      return 0;
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

  /**
   * Create an email data wallet on the blockchain
   */
  async createEmailWallet(
    ownerAddress: string,
    subject: string,
    sender: string,
    contentHash: string,
    ipfsHash: string
  ): Promise<string | null> {
    try {
      if (!this.serviceWallet || !this.contracts.emailDataWallet) {
        console.error('❌ Service wallet or email data wallet contract not available');
        return null;
      }

      const validAddress = this.validateAndFormatAddress(ownerAddress);
      console.log(`📧 Creating email wallet for ${validAddress}: "${subject}" from ${sender}`);

      const gasPricing = await this.getGasPricing();
      const contentHashBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(contentHash));

      const tx = await this.contracts.emailDataWallet.createEmailDataWallet(
        validAddress,
        subject,
        sender,
        contentHashBytes,
        ipfsHash,
        {
          gasLimit: 300000,
          maxFeePerGas: gasPricing.maxFeePerGas,
          maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
        }
      );

      console.log(`📋 Email wallet creation transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Email wallet created in block ${receipt.blockNumber}`);

      // Extract wallet ID from transaction logs
      const walletId = this.extractWalletIdFromReceipt(receipt);
      if (walletId) {
        console.log(`📧 Email wallet created with ID: ${walletId}`);
      }

      return walletId;
    } catch (error) {
      console.error('❌ Email wallet creation failed:', error);
      return null;
    }
  }

  /**
   * Extract wallet ID from transaction receipt
   */
  private extractWalletIdFromReceipt(receipt: ethers.providers.TransactionReceipt): string | null {
    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.contracts.emailDataWallet.address.toLowerCase()) {
          // The wallet ID should be in the first topic (after event signature)
          if (log.topics.length >= 2) {
            return log.topics[1];
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to extract wallet ID from receipt:', error);
      return null;
    }
  }

  /**
   * Get email wallet details
   */
  async getEmailWallet(walletId: string): Promise<any> {
    try {
      if (!this.contracts.emailDataWallet) {
        console.warn('⚠️ Email Data Wallet contract not available');
        return null;
      }

      const wallet = await this.contracts.emailDataWallet.getEmailDataWallet(walletId);
      
      return {
        walletId,
        owner: wallet.owner,
        subject: wallet.subject,
        sender: wallet.sender,
        timestamp: wallet.timestamp.toNumber(),
        isActive: wallet.isActive,
        contentHash: wallet.contentHash,
        ipfsHash: wallet.ipfsHash
      };
    } catch (error) {
      console.error('❌ Error getting email wallet:', error);
      return null;
    }
  }

  /**
   * Health check for blockchain service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      let serviceWalletBalance = 'N/A';
      let walletHealthy = false;

      if (this.serviceWallet) {
        const balance = await this.serviceWallet.getBalance();
        serviceWalletBalance = ethers.utils.formatEther(balance) + ' POL';
        walletHealthy = balance.gt(ethers.utils.parseEther('0.01'));
      }

      return {
        healthy: walletHealthy,
        details: {
          serviceWallet: this.serviceWallet?.address || 'Not configured',
          balance: serviceWalletBalance,
          blockNumber,
          registrationContract: this.contracts.registration?.address || 'Not configured',
          emailDataWalletContract: this.contracts.emailDataWallet?.address || 'Not configured',
          networkConnected: true,
          configType: typeof this.config,
          hasGetMethod: typeof this.config?.get === 'function'
        }
      };

    } catch (error: any) {
      return {
        healthy: false,
        details: { 
          error: error?.message || 'Unknown error',
          configType: typeof this.config,
          hasGetMethod: typeof this.config?.get === 'function'
        }
      };
    }
  }
}