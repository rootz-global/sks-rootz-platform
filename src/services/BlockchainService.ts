// UNIFIED BLOCKCHAIN SERVICE - Complete Rewrite for EmailDataWalletOS_Secure
// File: src/services/BlockchainService.ts
// Version: 3.0 - Unified Contract Architecture
// Date: September 15, 2025

import { ethers } from 'ethers';
import { ConfigService } from './ConfigService';

/**
 * UNIFIED BLOCKCHAIN SERVICE
 * 
 * This service uses the new EmailDataWalletOS_Secure contract that handles all functionality:
 * - User Registration
 * - Credit Management  
 * - Email Data Wallet Creation
 * - Authorization Flow
 * - Lifecycle Management
 */
export class BlockchainService {
    private provider!: ethers.providers.JsonRpcProvider;
    private serviceWallet!: ethers.Wallet;
    private registrationContract!: ethers.Contract;
    private emailDataWalletContract!: ethers.Contract;
    private authorizationContract!: ethers.Contract;
    private config: ConfigService;

    // REGISTRATION CONTRACT ABI
    private readonly REGISTRATION_ABI = [
        "function isRegistered(address wallet) view returns (bool)",
        "function getCreditBalance(address wallet) view returns (uint256)",
        "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
        "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
        "function depositCredits(address wallet) payable",
        "function deductCredits(address wallet, uint256 amount) returns (bool)",
        "function owner() view returns (address)"
    ];

    // EMAIL DATA WALLET CONTRACT ABI  
    private readonly EMAIL_WALLET_ABI = [
        "function createEmailDataWallet(address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, string metadata) returns (uint256)",
        "function getEmailDataWallet(uint256 walletId) view returns (tuple(uint256 walletId, address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, uint32 attachmentCount, uint256 timestamp, bool isActive, string metadata))",
        "function getAllUserWallets(address userAddress) view returns (uint256[] memory)",
        "function getActiveWalletCount(address userAddress) view returns (uint256)",
        "function walletExists(uint256 walletId) view returns (bool)",
        "function getTotalWalletCount() view returns (uint256)",
        "function owner() view returns (address)"
    ];

    constructor(configService: ConfigService) {
        this.config = configService;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            console.log('🔧 Initializing Multi-Contract Blockchain Service...');
            
            // Initialize provider and wallet
            const rpcUrl = this.config.get('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
            if (!privateKey) {
                throw new Error('Service wallet private key not found in configuration');
            }
            this.serviceWallet = new ethers.Wallet(privateKey, this.provider);

            // Initialize registration contract
            const registrationAddress = this.config.get('blockchain.contractRegistration');
            if (!registrationAddress) {
                throw new Error('Registration contract address not found in configuration');
            }
            this.registrationContract = new ethers.Contract(
                registrationAddress,
                this.REGISTRATION_ABI,
                this.serviceWallet
            );

            // Initialize email data wallet contract
            const emailWalletAddress = this.config.get('blockchain.contractEmailDataWallet');
            if (!emailWalletAddress) {
                throw new Error('Email data wallet contract address not found in configuration');
            }
            this.emailDataWalletContract = new ethers.Contract(
                emailWalletAddress,
                this.EMAIL_WALLET_ABI,
                this.serviceWallet
            );

            console.log('✅ Multi-Contract Blockchain Service initialized');
            console.log(`   Service Wallet: ${this.serviceWallet.address}`);
            console.log(`   Registration Contract: ${registrationAddress}`);
            console.log(`   Email Data Wallet Contract: ${emailWalletAddress}`);
            
            // Verify ownership
            await this.verifyContractOwnership();

        } catch (error: any) {
            console.error('❌ Blockchain service initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify that the service wallet owns the contracts
     */
    private async verifyContractOwnership(): Promise<void> {
        try {
            const registrationOwner = await this.registrationContract.owner();
            const isRegistrationOwner = registrationOwner.toLowerCase() === this.serviceWallet.address.toLowerCase();
            
            const emailWalletOwner = await this.emailDataWalletContract.owner();
            const isEmailWalletOwner = emailWalletOwner.toLowerCase() === this.serviceWallet.address.toLowerCase();
            
            console.log(`   Registration Contract Owner: ${registrationOwner}`);
            console.log(`   Email Wallet Contract Owner: ${emailWalletOwner}`);
            console.log(`   Is Service Owner (Registration): ${isRegistrationOwner}`);
            console.log(`   Is Service Owner (Email Wallet): ${isEmailWalletOwner}`);
            
            if (!isRegistrationOwner) {
                console.warn('⚠️  WARNING: Service wallet is not the registration contract owner');
            }
            if (!isEmailWalletOwner) {
                console.warn('⚠️  WARNING: Service wallet is not the email wallet contract owner');
            }
        } catch (error: any) {
            console.warn(`⚠️  Could not verify contract ownership: ${error.message}`);
        }
    }

    /**
     * REGISTER USER - Simplified unified approach
     */
    async registerUser(userAddress: string, email: string, signature: string, message: string): Promise<any> {
        console.log(`📝 [UNIFIED] Registering user ${userAddress} with email: ${email}`);
        
        try {
            // Validate address
            const validAddress = ethers.utils.getAddress(userAddress);
            
            // Extract email from message for verification
            const extractedEmail = this.extractEmailFromMessage(message);
            if (extractedEmail !== email) {
                throw new Error('Email mismatch between request and signed message');
            }
            
            // Check if already registered
            const isRegistered = await this.unifiedContract.isRegistered(validAddress);
            if (isRegistered) {
                throw new Error('User already registered');
            }

            // Register user with initial credit deposit
            const creditDeposit = ethers.utils.parseEther('0.006'); // 60 credits worth
            
            const tx = await this.unifiedContract.registerUser(
                validAddress,
                email,
                {
                    value: creditDeposit,
                    gasLimit: 300000,
                    gasPrice: await this.getOptimalGasPrice()
                }
            );

            console.log(`📋 Registration transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait(2);
            
            if (receipt.status === 1) {
                console.log(`✅ User registered successfully in block ${receipt.blockNumber}`);
                
                // Extract user ID from events
                const userRegisteredEvent = receipt.events?.find(
                    (event: any) => event.event === 'UserRegistered'
                );
                const userId = userRegisteredEvent?.args?.userId;

                return {
                    success: true,
                    transactionHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    userId: userId,
                    userAddress: validAddress,
                    email: email
                };
            } else {
                throw new Error('Registration transaction failed');
            }

        } catch (error: any) {
            console.error(`❌ User registration failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * CREATE EMAIL WALLET - Unified authorization approach
     */
    async createEmailWallet(
        userAddress: string,
        email: string, 
        subject: string,
        sender: string,
        contentHash: string,
        ipfsHash: string
    ): Promise<any> {
        console.log(`📧 [UNIFIED] Creating email wallet for user: ${userAddress}`);
        
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            
            // Verify user is registered
            const isRegistered = await this.unifiedContract.isRegistered(validAddress);
            if (!isRegistered) {
                throw new Error('User not registered');
            }

            // Check credit balance
            const credits = await this.unifiedContract.getCreditBalance(validAddress);
            const requiredCredits = 4; // Email wallet cost
            
            if (credits.lt(requiredCredits)) {
                throw new Error(`Insufficient credits: ${credits.toString()} (need ${requiredCredits})`);
            }

            // Create email wallet with authorization (service owner can do this)
            const tx = await this.unifiedContract.createWalletWithAuthorization(
                validAddress,
                email,
                subject,
                sender,
                contentHash,
                ipfsHash,
                {
                    gasLimit: 500000,
                    gasPrice: await this.getOptimalGasPrice()
                }
            );

            console.log(`📋 Email wallet creation transaction: ${tx.hash}`);
            const receipt = await tx.wait(2);

            if (receipt.status === 1) {
                console.log(`✅ Email wallet created in block ${receipt.blockNumber}`);
                
                // Extract wallet ID from events
                const walletCreatedEvent = receipt.events?.find(
                    (event: any) => event.event === 'EmailDataWalletCreated'
                );
                const walletId = walletCreatedEvent?.args?.walletId;

                return {
                    success: true,
                    transactionHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    walletId: walletId,
                    userAddress: validAddress,
                    subject: subject,
                    sender: sender,
                    ipfsHash: ipfsHash
                };
            } else {
                throw new Error('Email wallet creation failed');
            }

        } catch (error: any) {
            console.error(`❌ Email wallet creation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * USER QUERIES - Use registration contract
     */
    async isUserRegistered(userAddress: string): Promise<boolean> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            return await this.registrationContract.isRegistered(validAddress);
        } catch (error: any) {
            console.error(`Error checking registration for ${userAddress}: ${error.message}`);
            return false;
        }
    }

    async getUserCredits(userAddress: string): Promise<number> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const credits = await this.registrationContract.getCreditBalance(validAddress);
            return credits.toNumber();
        } catch (error: any) {
            console.error(`Error getting credits for ${userAddress}: ${error.message}`);
            return 0;
        }
    }

    async getUserRegistration(userAddress: string): Promise<any> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const registration = await this.registrationContract.getRegistration(validAddress);
            
            return {
                registrationId: registration.registrationId,
                primaryEmail: registration.primaryEmail,
                registeredAt: new Date(registration.registeredAt.toNumber() * 1000),
                isActive: registration.isActive,
                creditBalance: registration.creditBalance.toNumber()
            };
        } catch (error: any) {
            console.error(`Error getting registration for ${userAddress}: ${error.message}`);
            return null;
        }
    }

    /**
     * EMAIL WALLET QUERIES - Use email data wallet contract
     */
    async getAllUserWallets(userAddress: string): Promise<string[]> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const walletIds = await this.emailDataWalletContract.getAllUserWallets(validAddress);
            return walletIds.map((id: any) => id.toString());
        } catch (error: any) {
            console.error(`Error getting wallets for ${userAddress}: ${error.message}`);
            return [];
        }
    }

    async getEmailWallet(walletId: string): Promise<any> {
        try {
            const wallet = await this.emailDataWalletContract.getEmailDataWallet(walletId);
            
            return {
                walletId: wallet.walletId.toString(),
                userAddress: wallet.userAddress,
                emailHash: wallet.emailHash,
                subjectHash: wallet.subjectHash,
                contentHash: wallet.contentHash,
                senderHash: wallet.senderHash,
                attachmentHashes: wallet.attachmentHashes,
                timestamp: new Date(wallet.timestamp.toNumber() * 1000),
                isActive: wallet.isActive,
                metadata: wallet.metadata
            };
        } catch (error: any) {
            console.error(`Error getting wallet ${walletId}: ${error.message}`);
            return null;
        }
    }

    /**
     * DEPOSIT CREDITS - For existing users
     */
    async depositCredits(userAddress: string, amount: string): Promise<any> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const depositAmount = ethers.utils.parseEther(amount);
            
            const tx = await this.unifiedContract.depositCredits(
                validAddress,
                {
                    value: depositAmount,
                    gasLimit: 200000,
                    gasPrice: await this.getOptimalGasPrice()
                }
            );

            console.log(`💰 Credit deposit transaction: ${tx.hash}`);
            const receipt = await tx.wait(2);

            if (receipt.status === 1) {
                return {
                    success: true,
                    transactionHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    userAddress: validAddress,
                    amount: amount
                };
            } else {
                throw new Error('Credit deposit failed');
            }

        } catch (error: any) {
            console.error(`❌ Credit deposit failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract email from signed message
     */
    private extractEmailFromMessage(message: string): string {
        const emailMatch = message.match(/Email:\s*([^\n\r]+)/);
        if (!emailMatch) {
            throw new Error('No email found in signed message');
        }
        return emailMatch[1].trim();
    }

    /**
     * Get optimal gas price for current network conditions
     */
    private async getOptimalGasPrice(): Promise<ethers.BigNumber> {
        try {
            const gasPrice = await this.provider.getGasPrice();
            // Add 20% buffer for network congestion
            return gasPrice.mul(120).div(100);
        } catch (error) {
            console.warn('Using fallback gas price');
            return ethers.utils.parseUnits('100', 'gwei');
        }
    }

    /**
     * Get service wallet balance
     */
    async getServiceWalletBalance(): Promise<string> {
        try {
            const balance = await this.serviceWallet.getBalance();
            return ethers.utils.formatEther(balance);
        } catch (error: any) {
            console.error(`Error getting service balance: ${error.message}`);
            return '0.0';
        }
    }

    /**
     * Health check - verify all systems operational
     */
    async healthCheck(): Promise<any> {
        try {
            const balance = await this.getServiceWalletBalance();
            const registrationOwner = await this.registrationContract.owner();
            const emailWalletOwner = await this.emailDataWalletContract.owner();
            const isRegistrationOwner = registrationOwner.toLowerCase() === this.serviceWallet.address.toLowerCase();
            const isEmailWalletOwner = emailWalletOwner.toLowerCase() === this.serviceWallet.address.toLowerCase();

            return {
                status: 'healthy',
                serviceWallet: this.serviceWallet.address,
                balance: `${balance} POL`,
                contracts: {
                    registration: {
                        address: this.registrationContract.address,
                        owner: registrationOwner,
                        isOwner: isRegistrationOwner
                    },
                    emailDataWallet: {
                        address: this.emailDataWalletContract.address,
                        owner: emailWalletOwner,
                        isOwner: isEmailWalletOwner
                    }
                },
                network: 'Polygon Amoy (80002)'
            };
        } catch (error: any) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Export is handled by the class declaration above