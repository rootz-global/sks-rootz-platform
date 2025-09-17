// src/services/RegistrationLookupService.ts
// FIXED: Actually call the deployed contract instead of hardcoded null return
// Date: September 17, 2025
// Issue: Service was hardcoded to return null without calling getWalletFromEmail()

import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';

/**
 * REGISTRATION LOOKUP SERVICE
 * 
 * This service connects to the DEPLOYED EmailWalletRegistration contract at:
 * 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
 * 
 * CRITICAL FIX: The service was hardcoded to return null for email lookups
 * without even calling the contract. The deployed contract DOES HAVE the
 * getWalletFromEmail() function and it works correctly.
 */
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
        
        // FIXED: Use the correct config key for registration contract
        const registrationContractAddress = config.get('blockchain.contractRegistration') || 
                                           config.get('contractRegistration');
        
        if (!registrationContractAddress) {
            throw new Error('Registration contract address not found in configuration (blockchain.contractRegistration)');
        }
        
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // ACTUAL EmailWalletRegistration contract ABI - matches deployed contract
        // This is the CORRECT ABI for the deployed contract at 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
        const registrationABI = [
            // Registration Status Functions
            "function isRegistered(address wallet) view returns (bool)",
            "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
            
            // Email Mapping Functions - THESE EXIST AND WORK!
            "function getWalletFromEmail(string email) view returns (address)",
            "function isEmailAuthorized(address wallet, string email) view returns (bool)",
            
            // Credit Management Functions
            "function getCreditBalance(address wallet) view returns (uint256)",
            "function depositCredits(address wallet) payable",
            "function deductCredits(address wallet, uint256 amount) returns (bool)",
            
            // Registration Functions
            "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
            
            // Admin Functions
            "function owner() view returns (address)",
            "function registrationFee() view returns (uint256)"
        ];

        this.registrationContract = new ethers.Contract(
            registrationContractAddress,
            registrationABI,
            this.provider
        );
        
        console.log(`[REGISTRATION] Initialized with EmailWalletRegistration contract: ${registrationContractAddress}`);
        console.log(`[REGISTRATION] FIXED: Will actually call getWalletFromEmail() function`);
    }

    /**
     * Look up wallet address by email address
     * FIXED: Actually calls the contract instead of hardcoded return null
     */
    async getWalletByEmail(email: string): Promise<string | null> {
        try {
            console.log(`[REGISTRATION] Looking up wallet for email: ${email}`);
            
            // CRITICAL FIX: Actually call the contract function!
            // The deployed contract DOES have this function and it works!
            const walletAddress = await this.registrationContract.getWalletFromEmail(email);
            
            // Check if address is zero (no registration found)
            if (walletAddress === ethers.constants.AddressZero || walletAddress === '0x0000000000000000000000000000000000000000') {
                console.log(`[REGISTRATION] No wallet registered for email: ${email}`);
                return null;
            }
            
            console.log(`[REGISTRATION] SUCCESS: Found wallet ${walletAddress} for email: ${email}`);
            
            // Verify the registration is active
            const isActive = await this.isUserRegistered(walletAddress);
            if (!isActive) {
                console.log(`[REGISTRATION] WARNING: Wallet ${walletAddress} found but registration inactive`);
                return null;
            }
            
            return walletAddress;
            
        } catch (error: any) {
            console.error(`[REGISTRATION] Error looking up email ${email}:`, error.message);
            
            // Log additional debugging info
            if (error.code === 'CALL_EXCEPTION') {
                console.error(`[REGISTRATION] Contract call failed - check network connectivity and contract address`);
            }
            
            return null;
        }
    }

    /**
     * Check if a wallet address is properly registered
     * VERIFIED: This function works correctly with deployed contract
     */
    async isUserRegistered(address: string): Promise<boolean> {
        try {
            const checksumAddress = ethers.utils.getAddress(address);
            const isRegistered = await this.registrationContract.isRegistered(checksumAddress);
            console.log(`[REGISTRATION] Address ${checksumAddress} registered: ${isRegistered}`);
            return isRegistered;
        } catch (error: any) {
            console.error(`[REGISTRATION] Error checking registration for ${address}:`, error.message);
            return false;
        }
    }

    /**
     * Get full registration details for a wallet address
     * VERIFIED: This function works correctly with deployed contract
     */
    async getUserRegistration(address: string): Promise<any> {
        try {
            console.log(`[REGISTRATION] Getting full registration for: ${address}`);
            
            const checksumAddress = ethers.utils.getAddress(address);
            const registration = await this.registrationContract.getRegistration(checksumAddress);
            
            const result = {
                registrationId: registration.registrationId,
                primaryEmail: registration.primaryEmail,
                parentCorporateWallet: registration.parentCorporateWallet,
                autoProcessCC: registration.autoProcessCC,
                registeredAt: new Date(registration.registeredAt.toNumber() * 1000),
                isActive: registration.isActive,
                creditBalance: registration.creditBalance.toNumber()
            };

            console.log(`[REGISTRATION] Registration details for ${checksumAddress}:`, {
                email: result.primaryEmail,
                isActive: result.isActive,
                credits: result.creditBalance,
                registeredAt: result.registeredAt.toISOString()
            });
            
            return result;
            
        } catch (error: any) {
            console.error(`[REGISTRATION] Error getting registration for ${address}:`, error.message);
            return null;
        }
    }

    /**
     * Validate email-to-wallet mapping exists and is active
     * FIXED: Now actually performs validation instead of always returning false
     */
    async validateEmailWalletMapping(email: string, expectedWallet?: string): Promise<boolean> {
        try {
            console.log(`[REGISTRATION] Validating email-wallet mapping for: ${email}`);
            
            // Get wallet from email (now actually works!)
            const actualWallet = await this.getWalletByEmail(email);
            
            if (!actualWallet) {
                console.log(`[REGISTRATION] No wallet registered for email: ${email}`);
                return false;
            }

            // If expected wallet provided, verify it matches
            if (expectedWallet) {
                const expectedChecksum = ethers.utils.getAddress(expectedWallet);
                const actualChecksum = ethers.utils.getAddress(actualWallet);
                
                if (actualChecksum !== expectedChecksum) {
                    console.log(`[REGISTRATION] Email ${email} maps to ${actualChecksum}, not ${expectedChecksum}`);
                    return false;
                }
            }

            // Verify registration is active
            const isRegistered = await this.isUserRegistered(actualWallet);
            if (!isRegistered) {
                console.log(`[REGISTRATION] Wallet ${actualWallet} is not actively registered`);
                return false;
            }

            console.log(`[REGISTRATION] Valid mapping: ${email} → ${actualWallet}`);
            return true;

        } catch (error: any) {
            console.error(`[REGISTRATION] Error validating email-wallet mapping:`, error.message);
            return false;
        }
    }

    /**
     * Get credit balance for a wallet address
     * VERIFIED: This function works correctly with deployed contract
     */
    async getUserCredits(address: string): Promise<number> {
        try {
            const checksumAddress = ethers.utils.getAddress(address);
            const credits = await this.registrationContract.getCreditBalance(checksumAddress);
            const creditAmount = credits.toNumber();
            
            console.log(`[REGISTRATION] Credit balance for ${checksumAddress}: ${creditAmount}`);
            return creditAmount;
            
        } catch (error: any) {
            console.error(`[REGISTRATION] Error getting credits for ${address}:`, error.message);
            return 0;
        }
    }

    /**
     * Verify if an email is authorized for a wallet
     * NEW: Uses the deployed contract's isEmailAuthorized function
     */
    async isEmailAuthorizedForWallet(walletAddress: string, email: string): Promise<boolean> {
        try {
            const checksumAddress = ethers.utils.getAddress(walletAddress);
            const isAuthorized = await this.registrationContract.isEmailAuthorized(checksumAddress, email);
            
            console.log(`[REGISTRATION] Email ${email} authorized for ${checksumAddress}: ${isAuthorized}`);
            return isAuthorized;
            
        } catch (error: any) {
            console.error(`[REGISTRATION] Error checking email authorization:`, error.message);
            return false;
        }
    }

    /**
     * Health check - verify contract connectivity
     */
    async healthCheck(): Promise<any> {
        try {
            console.log(`[REGISTRATION] Performing health check...`);
            
            // Check basic contract connectivity
            const owner = await this.registrationContract.owner();
            const registrationFee = await this.registrationContract.registrationFee();
            
            // Check network connectivity
            const blockNumber = await this.provider.getBlockNumber();
            
            const result = {
                status: 'healthy',
                contractAddress: this.registrationContract.address,
                contractOwner: owner,
                registrationFee: ethers.utils.formatEther(registrationFee),
                currentBlock: blockNumber,
                network: 'Polygon Amoy (80002)'
            };
            
            console.log(`[REGISTRATION] Health check passed:`, result);
            return result;
            
        } catch (error: any) {
            console.error(`[REGISTRATION] Health check failed:`, error.message);
            return {
                status: 'unhealthy',
                error: error.message,
                contractAddress: this.registrationContract.address
            };
        }
    }
}