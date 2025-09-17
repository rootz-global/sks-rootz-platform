// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SimplifiedEmailDataWallet
 * @dev Simplified version without Counters dependency
 */
contract SimplifiedEmailDataWallet is Ownable, ReentrancyGuard, Pausable {
    
    // Simple counter instead of Counters library
    uint256 private _walletIdCounter;
    
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
        string metadata;
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
    
    // Custom errors
    error InvalidStringLength(string paramName, uint256 length);
    error InvalidAttachmentCount(uint32 count);
    error InvalidUserAddress();
    error InvalidHashValue(string paramName);
    error EmailHashAlreadyExists(string emailHash);
    error WalletNotFound(uint256 walletId);
    error MaxWalletsExceeded(address user, uint256 currentCount);
    
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
        _walletIdCounter = 0; // Initialize counter
    }
    
    /**
     * @dev Create a new email data wallet with simplified validation
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
        
        // Basic validations
        if (userAddress == address(0)) {
            revert InvalidUserAddress();
        }
        
        // String length validations
        _validateStringLength("emailHash", emailHash);
        _validateStringLength("subjectHash", subjectHash);
        _validateStringLength("contentHash", contentHash);
        _validateStringLength("senderHash", senderHash);
        _validateStringLength("metadata", metadata);
        
        // Hash validations
        _validateHashValue("emailHash", emailHash);
        _validateHashValue("subjectHash", subjectHash);
        _validateHashValue("contentHash", contentHash);
        _validateHashValue("senderHash", senderHash);
        
        // Attachment validations
        if (attachmentHashes.length > MAX_ATTACHMENT_COUNT) {
            revert InvalidAttachmentCount(uint32(attachmentHashes.length));
        }
        
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
        
        // Increment wallet ID counter (simplified)
        _walletIdCounter++;
        uint256 newWalletId = _walletIdCounter;
        
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
     * @dev Get total number of wallets created
     */
    function getTotalWalletCount() external view returns (uint256) {
        return _walletIdCounter;
    }
    
    /**
     * @dev Check if a wallet exists
     */
    function walletExists(uint256 walletId) external view returns (bool) {
        return walletId > 0 && walletId <= _walletIdCounter;
    }
    
    /**
     * @dev Get email data wallet by ID
     */
    function getEmailDataWallet(uint256 walletId) external view returns (EmailDataWallet memory) {
        if (!this.walletExists(walletId)) {
            revert WalletNotFound(walletId);
        }
        return emailDataWallets[walletId];
    }
    
    /**
     * @dev Get all wallet IDs for a user
     */
    function getAllUserWallets(address userAddress) external view returns (uint256[] memory) {
        return userWallets[userAddress];
    }
    
    /**
     * @dev Get active wallet count for a user
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
}
