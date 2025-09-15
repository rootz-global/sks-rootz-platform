// src/services/RegistrationLookupService.ts
import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';

export class RegistrationLookupService {
    private provider: ethers.providers.JsonRpcProvider;
    private registrationContract: ethers.Contract;

    constructor() {
        // Create new Config instance and load domain configuration
        const config = new Config();
        const domain = process.env.DOMAIN || 'localhost';
        config.loadDomain(domain);
        
        // Get blockchain configuration
        const rpcUrl = config.get('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
        const contractRegistration = config.get('blockchain.contractRegistration') || config.get('contractRegistration');
        
        if (!contractRegistration) {
            throw new Error('Registration contract address not found in configuration');
        }
        
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Registration contract ABI - MATCHES DEPLOYED CONTRACT
        const registrationABI = [
            "function isRegistered(address wallet) view returns (bool)",
            "function getCreditBalance(address wallet) view returns (uint256)", 
            "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
            "function depositCredits(address wallet) payable",
            "function deductCredits(address wallet, uint256 amount) returns (bool)",
            "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
            "function owner() view returns (address)"
        ];

        this.registrationContract = new ethers.Contract(
            contractRegistration,
            registrationABI,
            this.provider
        );
        
        console.log(`[REGISTRATION] Initialized with contract: ${contractRegistration}`);
    }

    /**
     * Look up wallet address by email address
     * NOTE: The deployed contract doesn't have getUserByEmail function
     * This will need to be implemented differently (database lookup or different approach)
     */
    async getWalletByEmail(email: string): Promise<string | null> {
        try {
            console.log(`[REGISTRATION] Looking up wallet for email: ${email}`);
            console.log(`[REGISTRATION] WARNING: Contract doesn't have getUserByEmail function`);
            
            // TODO: Implement email-to-wallet mapping via different method
            // Options: database lookup, event scanning, or enhanced contract
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
            const isRegistered = await this.registrationContract.isRegistered(address);
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
            
            const registration = await this.registrationContract.getRegistration(address);
            
            const result = {
                registrationId: registration.registrationId,
                primaryEmail: registration.primaryEmail,
                parentCorporateWallet: registration.parentCorporateWallet,
                autoProcessCC: registration.autoProcessCC,
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
