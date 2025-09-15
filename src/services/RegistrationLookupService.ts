// src/services/RegistrationLookupService.ts
import { ethers } from 'ethers';
import { Config } from '../core/configuration/Config';

export class RegistrationLookupService {
    private provider: ethers.providers.JsonRpcProvider;
    private registrationContract: ethers.Contract;

    constructor() {
        const config = Config.getInstance().getDomainConfig();
        this.provider = new ethers.providers.JsonRpcProvider(config.blockchain.rpcUrl);
        
        // Registration contract ABI - key functions we need
        const registrationABI = [
            "function getUserByEmail(string memory email) external view returns (address)",
            "function isUserRegistered(address user) external view returns (bool)",
            "function getUserRegistration(address user) external view returns (address userAddress, string memory email, uint256 credits, bool isActive, uint256 registeredAt)"
        ];

        this.registrationContract = new ethers.Contract(
            config.blockchain.contractRegistration,
            registrationABI,
            this.provider
        );
    }

    /**
     * Look up wallet address by email address
     * This is the proper way to find which wallet to create DATA_WALLET for
     */
    async getWalletByEmail(email: string): Promise<string | null> {
        try {
            console.log(`[REGISTRATION] Looking up wallet for email: ${email}`);
            
            const walletAddress = await this.registrationContract.getUserByEmail(email);
            
            if (walletAddress === ethers.constants.AddressZero) {
                console.log(`[REGISTRATION] No wallet registered for email: ${email}`);
                return null;
            }

            console.log(`[REGISTRATION] Found wallet ${walletAddress} for email: ${email}`);
            return walletAddress;
            
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
            const isRegistered = await this.registrationContract.isUserRegistered(address);
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
            
            const registration = await this.registrationContract.getUserRegistration(address);
            
            const result = {
                userAddress: registration.userAddress,
                email: registration.email,
                credits: registration.credits.toNumber(),
                isActive: registration.isActive,
                registeredAt: new Date(registration.registeredAt.toNumber() * 1000)
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
