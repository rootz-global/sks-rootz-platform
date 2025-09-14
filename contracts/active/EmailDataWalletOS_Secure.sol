// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title EmailDataWalletOS_Secure
 * @dev Enhanced secure contract for managing email-based data wallets with comprehensive validation
 * @author SKS Rootz Platform
 */
contract EmailDataWalletOS_Secure is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    // Counter for wallet IDs
    Counters.Counter private _walletIdCounter;
    
    // Constants for validation
    uint256 public constant MAX_STRING_LENGTH = 500;
    uint256 public constant MAX_ATTACHMENT_COUNT = 100;
    uint256 public constant MAX_WALLETS_PER_USER = 1000;
    
    // Data structures
    struct EmailDataWallet {
        uint256 walletId;
        address userAddress;
        string emailHash;
        string subjectHash;
        string contentHash;
        string senderHash;
        string[] attachmentHashes;
        uint32 attachmentCount;
        uint256 timestamp;
        bool isActive;
        string metadata; // JSON metadata for extensibility
    }
    
    // Storage mappings
    mapping(uint256 => EmailDataWallet) public emailDataWallets;
    mapping(address => uint256[]) public userWallets;
    mapping(string => bool) public emailHashExists;
    mapping(string => uint256) public emailHashToWalletId;
    
    // Events
    event EmailDataWalletCreated(
        uint256 indexed walletId,
        address indexed userAddress,
        string emailHash,
        string subjectHash,
        uint32 attachmentCount,
        uint256 timestamp
    );
    
    event EmailDataWalletUpdated(
        uint256 indexed walletId,
        address indexed userAddress,
        string newMetadata,
        uint256 timestamp
    );
    
    event EmailDataWalletDeactivated(
        uint256 indexed walletId,
        address indexed userAddress,
        uint256 timestamp
    );
    
    // Custom errors for gas efficiency
    error InvalidStringLength(string paramName, uint256 length);
    error InvalidAttachmentCount(uint32 count);
    error InvalidUserAddress();
    error InvalidHashValue(string paramName);
    error EmailHashAlreadyExists(string emailHash);
    error WalletNotFound(uint256 walletId);
    error WalletNotActive(uint256 walletId);
    error UnauthorizedAccess(address user, uint256 walletId);
    error MaxWalletsExceeded(address user, uint256 currentCount);
    
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }
    
    /**
     * @dev Create a new email data wallet with comprehensive validation
     * @param userAddress The address of the user owning this wallet
     * @param emailHash Hash of the complete email content
     * @param subjectHash Hash of the email subject
     * @param contentHash Hash of the email body content
     * @param senderHash Hash of the sender information
     * @param attachmentHashes Array of attachment content hashes
     * @param metadata JSON metadata string for additional information
     * @return walletId The ID of the created wallet
     */
    function createEmailDataWallet(
        address userAddress,
        string memory emailHash,
        string memory subjectHash,
        string memory contentHash,
        string memory senderHash,
        string[] memory attachmentHashes,
        string memory metadata
    ) external onlyOwner whenNotPaused nonReentrant returns (uint256) {
        
        // Validate user address
        if (userAddress == address(0)) {
            revert InvalidUserAddress();
        }
        
        // Validate string lengths
        _validateStringLength("emailHash", emailHash);
        _validateStringLength("subjectHash", subjectHash);
        _validateStringLength("contentHash", contentHash);
        _validateStringLength("senderHash", senderHash);
        _validateStringLength("metadata", metadata);
        
        // Validate hash values (must not be empty)
        _validateHashValue("emailHash", emailHash);
        _validateHashValue("subjectHash", subjectHash);
        _validateHashValue("contentHash", contentHash);
        _validateHashValue("senderHash", senderHash);
        
        // Validate attachment count
        if (attachmentHashes.length > MAX_ATTACHMENT_COUNT) {
            revert InvalidAttachmentCount(uint32(attachmentHashes.length));
        }
        
        // Validate attachment hashes
        for (uint i = 0; i < attachmentHashes.length; i++) {
            _validateStringLength("attachmentHash", attachmentHashes[i]);
            _validateHashValue("attachmentHash", attachmentHashes[i]);
        }
        
        // Check for duplicate email hash
        if (emailHashExists[emailHash]) {
            revert EmailHashAlreadyExists(emailHash);
        }
        
        // Check wallet limit per user
        if (userWallets[userAddress].length >= MAX_WALLETS_PER_USER) {
            revert MaxWalletsExceeded(userAddress, userWallets[userAddress].length);
        }
        
        // Increment wallet ID counter
        _walletIdCounter.increment();
        uint256 newWalletId = _walletIdCounter.current();
        
        // Create wallet
        EmailDataWallet storage newWallet = emailDataWallets[newWalletId];
        newWallet.walletId = newWalletId;
        newWallet.userAddress = userAddress;
        newWallet.emailHash = emailHash;
        newWallet.subjectHash = subjectHash;
        newWallet.contentHash = contentHash;
        newWallet.senderHash = senderHash;
        newWallet.attachmentHashes = attachmentHashes;
        newWallet.attachmentCount = uint32(attachmentHashes.length);
        newWallet.timestamp = block.timestamp;
        newWallet.isActive = true;
        newWallet.metadata = metadata;
        
        // Update mappings
        userWallets[userAddress].push(newWalletId);
        emailHashExists[emailHash] = true;
        emailHashToWalletId[emailHash] = newWalletId;
        
        // Emit event
        emit EmailDataWalletCreated(
            newWalletId,
            userAddress,
            emailHash,
            subjectHash,
            uint32(attachmentHashes.length),
            block.timestamp
        );
        
        return newWalletId;
    }
    
    /**
     * @dev Get email data wallet by ID
     * @param walletId The ID of the wallet to retrieve
     * @return The email data wallet struct
     */
    function getEmailDataWallet(uint256 walletId) external view returns (EmailDataWallet memory) {
        if (!_walletExists(walletId)) {
            revert WalletNotFound(walletId);
        }
        return emailDataWallets[walletId];
    }
    
    /**
     * @dev Get wallet ID by email hash
     * @param emailHash The email hash to look up
     * @return walletId The ID of the wallet with this email hash
     */
    function getWalletIdByEmailHash(string memory emailHash) external view returns (uint256) {
        if (!emailHashExists[emailHash]) {
            revert WalletNotFound(0);
        }
        return emailHashToWalletId[emailHash];
    }
    
    /**
     * @dev Get all wallet IDs for a user
     * @param userAddress The user's address
     * @return Array of wallet IDs owned by the user
     */
    function getAllUserWallets(address userAddress) external view returns (uint256[] memory) {
        return userWallets[userAddress];
    }
    
    /**
     * @dev Get active wallet count for a user
     * @param userAddress The user's address
     * @return count Number of active wallets
     */
    function getActiveWalletCount(address userAddress) external view returns (uint256 count) {
        uint256[] memory walletIds = userWallets[userAddress];
        for (uint i = 0; i < walletIds.length; i++) {
            if (emailDataWallets[walletIds[i]].isActive) {
                count++;
            }
        }
    }
    
    /**
     * @dev Update wallet metadata (only by owner or wallet owner)
     * @param walletId The ID of the wallet to update
     * @param newMetadata The new metadata string
     */
    function updateEmailDataWallet(
        uint256 walletId,
        string memory newMetadata
    ) external whenNotPaused nonReentrant {
        if (!_walletExists(walletId)) {
            revert WalletNotFound(walletId);
        }
        
        EmailDataWallet storage wallet = emailDataWallets[walletId];
        
        if (!wallet.isActive) {
            revert WalletNotActive(walletId);
        }
        
        // Only contract owner or wallet owner can update
        if (msg.sender != owner() && msg.sender != wallet.userAddress) {
            revert UnauthorizedAccess(msg.sender, walletId);
        }
        
        _validateStringLength("metadata", newMetadata);
        
        wallet.metadata = newMetadata;
        
        emit EmailDataWalletUpdated(
            walletId,
            wallet.userAddress,
            newMetadata,
            block.timestamp
        );
    }
    
    /**
     * @dev Deactivate a wallet (only by owner)
     * @param walletId The ID of the wallet to deactivate
     */
    function deactivateWallet(uint256 walletId) external onlyOwner whenNotPaused {
        if (!_walletExists(walletId)) {
            revert WalletNotFound(walletId);
        }
        
        EmailDataWallet storage wallet = emailDataWallets[walletId];
        wallet.isActive = false;
        
        emit EmailDataWalletDeactivated(
            walletId,
            wallet.userAddress,
            block.timestamp
        );
    }
    
    /**
     * @dev Get total number of wallets created
     * @return The total wallet count
     */
    function getTotalWalletCount() external view returns (uint256) {
        return _walletIdCounter.current();
    }
    
    /**
     * @dev Check if a wallet exists
     * @param walletId The wallet ID to check
     * @return True if wallet exists
     */
    function walletExists(uint256 walletId) external view returns (bool) {
        return _walletExists(walletId);
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Internal validation functions
    function _validateStringLength(string memory paramName, string memory value) internal pure {
        if (bytes(value).length > MAX_STRING_LENGTH) {
            revert InvalidStringLength(paramName, bytes(value).length);
        }
    }
    
    function _validateHashValue(string memory paramName, string memory value) internal pure {
        if (bytes(value).length == 0) {
            revert InvalidHashValue(paramName);
        }
    }
    
    function _walletExists(uint256 walletId) internal view returns (bool) {
        return walletId > 0 && walletId <= _walletIdCounter.current();
    }
}
