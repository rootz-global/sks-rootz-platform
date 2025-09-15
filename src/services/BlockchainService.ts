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
    private provider: ethers.providers.JsonRpcProvider;
    private serviceWallet: ethers.Wallet;
    private unifiedContract: ethers.Contract;
    private config: ConfigService;

    // UNIFIED CONTRACT ABI - All functions in one contract
    private readonly UNIFIED_ABI = [
        // OWNER MANAGEMENT
        "function owner() view returns (address)",
        "function transferOwnership(address newOwner)",
        
        // USER REGISTRATION & MANAGEMENT
        "function registerUser(address userWallet, string email) payable returns (bytes32 userId)",
        "function isRegistered(address userWallet) view returns (bool)",
        "function getRegistration(address userWallet) view returns (bytes32 userId, string email, uint256 registeredAt, bool isActive, uint256 creditBalance)",
        "function getCreditBalance(address userWallet) view returns (uint256)",
        
        // CREDIT MANAGEMENT
        "function depositCredits(address userWallet) payable",
        "function deductCredits(address userWallet, uint256 amount) returns (bool)",
        
        // EMAIL DATA WALLET CREATION
        "function createEmailDataWallet(address owner, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)",
        "function createWalletWithAuthorization(address userWallet, string email, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)",
        
        // WALLET QUERIES
        "function getEmailDataWallet(bytes32 walletId) view returns (tuple(address owner, string subject, string sender, uint256 timestamp, bool isActive, bytes32 contentHash, string ipfsHash))",
        "function getAllUserWallets(address user) view returns (bytes32[] memory)",
        "function getActiveWalletCount(address user) view returns (uint256)",
        
        // ENHANCED FEATURES
        "function validateDataIntegrity(bytes32 walletId) view returns (bool)",
        "function getWalletProvenance(bytes32 walletId) view returns (string memory)",
        "function setWalletStatus(bytes32 walletId, uint8 status)",
        "function getWalletStatus(bytes32 walletId) view returns (uint8)",
        
        // EVENTS
        "event UserRegistered(address indexed userWallet, bytes32 indexed userId, string email)",
        "event EmailDataWalletCreated(bytes32 indexed walletId, address indexed owner, string subject, string sender)",
        "event CreditsDeposited(address indexed userWallet, uint256 amount)",
        "event CreditsDeducted(address indexed userWallet, uint256 amount)"
    ];

    constructor(configService: ConfigService) {
        this.config = configService;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            console.log('🔧 Initializing Unified Blockchain Service...');
            
            // Initialize provider and wallet
            const rpcUrl = this.config.get('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
            if (!privateKey) {
                throw new Error('Service wallet private key not found in configuration');
            }
            this.serviceWallet = new ethers.Wallet(privateKey, this.provider);

            // Initialize unified contract
            const contractAddress = this.config.get('blockchain.unifiedContract');
            if (!contractAddress) {
                throw new Error('Unified contract address not found in configuration');
            }

            this.unifiedContract = new ethers.Contract(
                contractAddress,
                this.UNIFIED_ABI,
                this.serviceWallet
            );

            console.log('✅ Unified Blockchain Service initialized');
            console.log(`   Service Wallet: ${this.serviceWallet.address}`);
            console.log(`   Unified Contract: ${contractAddress}`);
            
            // Verify ownership
            await this.verifyContractOwnership();

        } catch (error: any) {
            console.error('❌ Blockchain service initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify that the service wallet owns the contract
     */
    private async verifyContractOwnership(): Promise<void> {
        try {
            const contractOwner = await this.unifiedContract.owner();
            const isOwner = contractOwner.toLowerCase() === this.serviceWallet.address.toLowerCase();
            
            console.log(`   Contract Owner: ${contractOwner}`);
            console.log(`   Is Service Owner: ${isOwner}`);
            
            if (!isOwner) {
                console.warn('⚠️  WARNING: Service wallet is not the contract owner');
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
                    event => event.event === 'UserRegistered'
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
                    event => event.event === 'EmailDataWalletCreated'
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
     * USER QUERIES - Simplified unified contract calls
     */
    async isUserRegistered(userAddress: string): Promise<boolean> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            return await this.unifiedContract.isRegistered(validAddress);
        } catch (error: any) {
            console.error(`Error checking registration for ${userAddress}: ${error.message}`);
            return false;
        }
    }

    async getUserCredits(userAddress: string): Promise<number> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const credits = await this.unifiedContract.getCreditBalance(validAddress);
            return credits.toNumber();
        } catch (error: any) {
            console.error(`Error getting credits for ${userAddress}: ${error.message}`);
            return 0;
        }
    }

    async getUserRegistration(userAddress: string): Promise<any> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            const registration = await this.unifiedContract.getRegistration(validAddress);
            
            return {
                userId: registration.userId,
                email: registration.email,
                registeredAt: new Date(registration.registeredAt.toNumber() * 1000),
                isActive: registration.isActive,
                creditBalance: registration.creditBalance.toNumber()
            };
        } catch (error: any) {
            console.error(`Error getting registration for ${userAddress}: ${error.message}`);
            return null;
        }
    }

    async getAllUserWallets(userAddress: string): Promise<string[]> {
        try {
            const validAddress = ethers.utils.getAddress(userAddress);
            return await this.unifiedContract.getAllUserWallets(validAddress);
        } catch (error: any) {
            console.error(`Error getting wallets for ${userAddress}: ${error.message}`);
            return [];
        }
    }

    async getEmailWallet(walletId: string): Promise<any> {
        try {
            const wallet = await this.unifiedContract.getEmailDataWallet(walletId);
            
            return {
                owner: wallet.owner,
                subject: wallet.subject,
                sender: wallet.sender,
                timestamp: new Date(wallet.timestamp.toNumber() * 1000),
                isActive: wallet.isActive,
                contentHash: wallet.contentHash,
                ipfsHash: wallet.ipfsHash
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
            const owner = await this.unifiedContract.owner();
            const isOwner = owner.toLowerCase() === this.serviceWallet.address.toLowerCase();

            return {
                status: 'healthy',
                serviceWallet: this.serviceWallet.address,
                balance: `${balance} POL`,
                contractAddress: this.unifiedContract.address,
                contractOwner: owner,
                isContractOwner: isOwner,
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

/**
 * EXPORT FOR USE IN APPLICATION
 */
export { BlockchainService };