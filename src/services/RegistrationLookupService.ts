// src/services/RegistrationLookupService.ts
// Updated for Unified Contract Architecture
import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';

export class RegistrationLookupService {
    private provider: ethers.providers.JsonRpcProvider;
    private unifiedContract: ethers.Contract;

    constructor() {
        // Create new Config instance and load domain configuration
        const config = new Config();
        const domain = process.env.DOMAIN || 'localhost';
        config.loadDomain(domain);
        
        // Get blockchain configuration
        const rpcUrl = config.get('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
        
        // Use unified contract address
        const unifiedContract = config.get('blockchain.unifiedContract') || 
                               config.get('unifiedContract') ||
                               // Fallback to old contract names for compatibility during migration
                               config.get('blockchain.contractRegistration') || 
                               config.get('contractRegistration');
        
        if (!unifiedContract) {
            throw new Error('Unified contract address not found in configuration');
        }
        
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Unified contract ABI - matches EmailDataWalletOS_Secure
        const unifiedABI = [
            "function owner() view returns (address)",
            "function isRegistered(address wallet) view returns (bool)",
            "function getCreditBalance(address wallet) view returns (uint256)",
            "function getRegistration(address wallet) view returns (bytes32 userId, string email, uint256 registeredAt, bool isActive, uint256 creditBalance)",
            "function registerUser(address userWallet, string email) payable returns (bytes32 userId)",
            "function depositCredits(address wallet) payable",
            "function deductCredits(address wallet, uint256 amount) returns (bool)",
            "function createWalletWithAuthorization(address userWallet, string email, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)",
            "function getAllUserWallets(address user) view returns (bytes32[] memory)",
            "function getActiveWalletCount(address user) view returns (uint256)"
        ];

        this.unifiedContract = new ethers.Contract(
            unifiedContract,
            unifiedABI,
            this.provider
        );
        
        console.log(`[REGISTRATION] Initialized with unified contract: ${unifiedContract}`);
    }

    /**
     * Look up wallet address by email address
     * NOTE: Email-to-wallet mapping is stored in the unified contract
     */
    async getWalletByEmail(email: string): Promise<string | null> {
        try {
            console.log(`[REGISTRATION] Looking up wallet for email: ${email}`);
            console.log(`[REGISTRATION] WARNING: Contract doesn't have getUserByEmail function`);
            
            // TODO: Implement email-to-wallet mapping via event scanning or database
            console.log(`[REGISTRATION] No wallet registered for email: ${email} - function not available`);
            return null;
            
        } catch (error) {
            console.error(`[REGISTRATION] Error looking up email ${email}:`, error);
            return null;
        }
    }

    /**
     * Check if a wallet address is properly registered
     */
    async isUserRegistered(address: string): Promise<boolean> {
        try {
            const isRegistered = await this.unifiedContract.isRegistered(address);
            console.log(`[REGISTRATION] Address ${address} registered: ${isRegistered}`);
            return isRegistered;
        } catch (error) {
            console.error(`[REGISTRATION] Error checking registration for ${address}:`, error);
            return false;
        }
    }

    /**
     * Get full registration details for a wallet address
     */
    async getUserRegistration(address: string): Promise<any> {
        try {
            console.log(`[REGISTRATION] Getting full registration for: ${address}`);
            
            const registration = await this.unifiedContract.getRegistration(address);
            
            const result = {
                userId: registration.userId,
                email: registration.email,
                registeredAt: new Date(registration.registeredAt.toNumber() * 1000),
                isActive: registration.isActive,
                creditBalance: registration.creditBalance.toNumber()
            };

            console.log(`[REGISTRATION] Registration details:`, result);
            return result;
            
        } catch (error) {
            console.error(`[REGISTRATION] Error getting registration for ${address}:`, error);
            return null;
        }
    }

    /**
     * Validate email-to-wallet mapping exists and is active
     */
    async validateEmailWalletMapping(email: string, expectedWallet: string): Promise<boolean> {
        try {
            const actualWallet = await this.getWalletByEmail(email);
            
            if (!actualWallet) {
                console.log(`[REGISTRATION] No wallet registered for email: ${email}`);
                return false;
            }

            if (actualWallet.toLowerCase() !== expectedWallet.toLowerCase()) {
                console.log(`[REGISTRATION] Email ${email} maps to ${actualWallet}, not ${expectedWallet}`);
                return false;
            }

            const isRegistered = await this.isUserRegistered(actualWallet);
            if (!isRegistered) {
                console.log(`[REGISTRATION] Wallet ${actualWallet} is not actively registered`);
                return false;
            }

            console.log(`[REGISTRATION] Valid mapping: ${email} → ${actualWallet}`);
            return true;

        } catch (error) {
            console.error(`[REGISTRATION] Error validating email-wallet mapping:`, error);
            return false;
        }
    }
}