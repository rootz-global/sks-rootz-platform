// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IEmailWalletRegistration.sol";

contract EmailDataWallet is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // ============ STRUCTS ============
    
    struct AuthenticationResults {
        bool spfPass;
        bool dkimValid;
        bool dmarcPass;
        string dkimSignature;
    }
    
    struct EmailWallet {
        bytes32 walletId;
        string walletType;
        address owner;
        uint256 createdAt;
        bytes32 authorizationTx;
        WalletStatus status;
        EmailOrigin origin;
        EmailContent content;
        WalletVerification verification;
    }
    
    struct EmailOrigin {
        string forwardedBy;
        uint256 forwardedAt;
        string originalSender;
        string messageId;
        bytes32 emailHeadersHash;
        AuthenticationResults authResults;
    }
    
    struct EmailContent {
        string subject;
        bytes32 bodyHash;
        bytes32 emailHash;
        uint256 attachmentCount;
        bytes32[] attachmentWalletIds;
        uint256 totalSize;
    }
    
    struct WalletVerification {
        bytes32 contentHash;
        string ipfsHash;
        bytes32 merkleRoot;
        uint256 blockNumber;
        uint256 verifiedAt;
        string network;
    }
    
    enum WalletStatus { PENDING, ACTIVE, ARCHIVED, REVOKED }
    
    // ============ STATE VARIABLES ============
    
    mapping(bytes32 => EmailWallet) public emailWallets;
    mapping(address => bytes32[]) public ownerWallets;
    mapping(bytes32 => bool) public walletExists;
    
    IEmailWalletRegistration public registrationContract;
    
    uint256 public constant EMAIL_WALLET_COST = 3; // Credits
    uint256 public totalEmailWallets;
    
    // ============ EVENTS ============
    
    event EmailWalletCreated(
        bytes32 indexed walletId,
        address indexed owner,
        bytes32 indexed emailHash,
        string ipfsHash,
        uint256 timestamp
    );
    
    event EmailWalletAuthorized(
        bytes32 indexed walletId,
        address indexed owner,
        bytes32 authorizationTx,
        uint256 timestamp
    );
    
    event EmailWalletVerified(
        bytes32 indexed walletId,
        bytes32 contentHash,
        string ipfsHash,
        uint256 blockNumber
    );
    
    event EmailWalletStatusChanged(
        bytes32 indexed walletId,
        WalletStatus oldStatus,
        WalletStatus newStatus
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyRegisteredUser() {
        require(
            registrationContract.isRegistered(msg.sender),
            "User not registered"
        );
        _;
    }
    
    modifier onlyWalletOwner(bytes32 walletId) {
        require(emailWallets[walletId].owner == msg.sender, "Not wallet owner");
        _;
    }
    
    modifier walletExistsModifier(bytes32 walletId) {
        require(walletExists[walletId], "Wallet does not exist");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _registrationContract) {
        registrationContract = IEmailWalletRegistration(_registrationContract);
    }
    
    // ============ WALLET CREATION FUNCTIONS ============
    
    function createEmailWallet(
        string memory forwardedBy,
        string memory originalSender,
        string memory messageId,
        string memory subject,
        bytes32 bodyHash,
        bytes32 emailHash,
        bytes32 emailHeadersHash,
        uint256 attachmentCount,
        string memory ipfsHash,
        AuthenticationResults memory authResults
    ) external onlyRegisteredUser nonReentrant returns (bytes32 walletId) {
        
        // Check and deduct credits
        require(
            registrationContract.deductCredits(msg.sender, EMAIL_WALLET_COST),
            "Insufficient credits"
        );
        
        // Generate unique wallet ID
        walletId = keccak256(abi.encodePacked(
            "EMAIL",
            msg.sender,
            block.timestamp,
            totalEmailWallets
        ));
        
        require(!walletExists[walletId], "Wallet ID collision");
        
        // Create email wallet
        emailWallets[walletId] = EmailWallet({
            walletId: walletId,
            walletType: "EMAIL_CONTAINER",
            owner: msg.sender,
            createdAt: block.timestamp,
            authorizationTx: bytes32(0),
            status: WalletStatus.PENDING,
            origin: EmailOrigin({
                forwardedBy: forwardedBy,
                forwardedAt: block.timestamp,
                originalSender: originalSender,
                messageId: messageId,
                emailHeadersHash: emailHeadersHash,
                authResults: authResults
            }),
            content: EmailContent({
                subject: subject,
                bodyHash: bodyHash,
                emailHash: emailHash,
                attachmentCount: attachmentCount,
                attachmentWalletIds: new bytes32[](0),
                totalSize: 0
            }),
            verification: WalletVerification({
                contentHash: emailHash,
                ipfsHash: ipfsHash,
                merkleRoot: bytes32(0),
                blockNumber: block.number,
                verifiedAt: block.timestamp,
                network: "ethereum"
            })
        });
        
        // Mark wallet as existing
        walletExists[walletId] = true;
        
        // Add to owner's wallet list
        ownerWallets[msg.sender].push(walletId);
        
        totalEmailWallets++;
        
        emit EmailWalletCreated(
            walletId,
            msg.sender,
            emailHash,
            ipfsHash,
            block.timestamp
        );
        
        return walletId;
    }
    
    // ============ AUTHORIZATION FUNCTIONS ============
    
    function authorizeEmailWallet(
        bytes32 walletId,
        bytes32 authorizationTx,
        bytes memory signature
    ) external onlyWalletOwner(walletId) walletExistsModifier(walletId) {
        
        require(
            emailWallets[walletId].status == WalletStatus.PENDING,
            "Wallet not pending authorization"
        );
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            walletId,
            authorizationTx,
            msg.sender,
            block.timestamp
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == msg.sender, "Invalid signature");
        
        // Update wallet with authorization
        emailWallets[walletId].authorizationTx = authorizationTx;
        emailWallets[walletId].status = WalletStatus.ACTIVE;
        
        emit EmailWalletAuthorized(
            walletId,
            msg.sender,
            authorizationTx,
            block.timestamp
        );
    }
    
    // ============ WALLET MANAGEMENT FUNCTIONS ============
    
    function updateAttachmentWallets(
        bytes32 walletId,
        bytes32[] memory attachmentWalletIds,
        uint256 totalSize
    ) external onlyOwner walletExistsModifier(walletId) {
        
        emailWallets[walletId].content.attachmentWalletIds = attachmentWalletIds;
        emailWallets[walletId].content.totalSize = totalSize;
        
        // Update verification with new merkle root
        bytes32 merkleRoot = _calculateMerkleRoot(walletId, attachmentWalletIds);
        emailWallets[walletId].verification.merkleRoot = merkleRoot;
        
        emit EmailWalletVerified(
            walletId,
            emailWallets[walletId].verification.contentHash,
            emailWallets[walletId].verification.ipfsHash,
            block.number
        );
    }
    
    function updateIPFSHash(
        bytes32 walletId,
        string memory newIpfsHash
    ) external onlyOwner walletExistsModifier(walletId) {
        
        emailWallets[walletId].verification.ipfsHash = newIpfsHash;
        emailWallets[walletId].verification.verifiedAt = block.timestamp;
        emailWallets[walletId].verification.blockNumber = block.number;
        
        emit EmailWalletVerified(
            walletId,
            emailWallets[walletId].verification.contentHash,
            newIpfsHash,
            block.number
        );
    }
    
    function changeWalletStatus(
        bytes32 walletId,
        WalletStatus newStatus
    ) external onlyWalletOwner(walletId) walletExistsModifier(walletId) {
        
        WalletStatus oldStatus = emailWallets[walletId].status;
        emailWallets[walletId].status = newStatus;
        
        emit EmailWalletStatusChanged(walletId, oldStatus, newStatus);
    }
    
    // ============ QUERY FUNCTIONS ============
    
    function getEmailWallet(bytes32 walletId) external view returns (
        bytes32 id,
        string memory walletType,
        address owner,
        uint256 createdAt,
        WalletStatus status,
        string memory subject,
        bytes32 emailHash,
        string memory ipfsHash,
        uint256 attachmentCount
    ) {
        require(walletExists[walletId], "Wallet does not exist");
        
        EmailWallet memory wallet = emailWallets[walletId];
        return (
            wallet.walletId,
            wallet.walletType,
            wallet.owner,
            wallet.createdAt,
            wallet.status,
            wallet.content.subject,
            wallet.content.emailHash,
            wallet.verification.ipfsHash,
            wallet.content.attachmentCount
        );
    }
    
    function getEmailOrigin(bytes32 walletId) external view returns (
        string memory forwardedBy,
        uint256 forwardedAt,
        string memory originalSender,
        string memory messageId,
        bool spfPass,
        bool dkimValid,
        bool dmarcPass
    ) {
        require(walletExists[walletId], "Wallet does not exist");
        
        EmailWallet memory wallet = emailWallets[walletId];
        return (
            wallet.origin.forwardedBy,
            wallet.origin.forwardedAt,
            wallet.origin.originalSender,
            wallet.origin.messageId,
            wallet.origin.authResults.spfPass,
            wallet.origin.authResults.dkimValid,
            wallet.origin.authResults.dmarcPass
        );
    }
    
    function getAttachmentWallets(bytes32 walletId) external view returns (bytes32[] memory) {
        require(walletExists[walletId], "Wallet does not exist");
        return emailWallets[walletId].content.attachmentWalletIds;
    }
    
    function getOwnerWallets(address owner) external view returns (bytes32[] memory) {
        return ownerWallets[owner];
    }
    
    function getWalletVerification(bytes32 walletId) external view returns (
        bytes32 contentHash,
        string memory ipfsHash,
        bytes32 merkleRoot,
        uint256 blockNumber,
        uint256 verifiedAt
    ) {
        require(walletExists[walletId], "Wallet does not exist");
        
        WalletVerification memory verification = emailWallets[walletId].verification;
        return (
            verification.contentHash,
            verification.ipfsHash,
            verification.merkleRoot,
            verification.blockNumber,
            verification.verifiedAt
        );
    }
    
    // ============ VERIFICATION FUNCTIONS ============
    
    function verifyEmailWallet(
        bytes32 walletId,
        bytes32 providedHash
    ) external view returns (bool) {
        require(walletExists[walletId], "Wallet does not exist");
        
        return emailWallets[walletId].verification.contentHash == providedHash;
    }
    
    function verifyWalletIntegrity(bytes32 walletId) external view returns (bool) {
        require(walletExists[walletId], "Wallet does not exist");
        
        EmailWallet memory wallet = emailWallets[walletId];
        
        // Verify content hash matches stored hash
        bytes32 computedHash = keccak256(abi.encodePacked(
            wallet.content.subject,
            wallet.content.bodyHash,
            wallet.origin.originalSender,
            wallet.origin.messageId
        ));
        
        return computedHash == wallet.verification.contentHash;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _calculateMerkleRoot(
        bytes32 walletId,
        bytes32[] memory attachmentIds
    ) internal pure returns (bytes32) {
        if (attachmentIds.length == 0) {
            return walletId;
        }
        
        // Simple merkle root calculation
        bytes32 combinedHash = walletId;
        for (uint i = 0; i < attachmentIds.length; i++) {
            combinedHash = keccak256(abi.encodePacked(combinedHash, attachmentIds[i]));
        }
        
        return combinedHash;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setRegistrationContract(address newContract) external onlyOwner {
        registrationContract = IEmailWalletRegistration(newContract);
    }
    
    function emergencyArchiveWallet(bytes32 walletId) external onlyOwner {
        require(walletExists[walletId], "Wallet does not exist");
        
        WalletStatus oldStatus = emailWallets[walletId].status;
        emailWallets[walletId].status = WalletStatus.ARCHIVED;
        
        emit EmailWalletStatusChanged(walletId, oldStatus, WalletStatus.ARCHIVED);
    }
    
    // ============ BATCH FUNCTIONS ============
    
    function getMultipleWallets(bytes32[] memory walletIds) external view returns (
        bytes32[] memory ids,
        address[] memory owners,
        string[] memory subjects,
        WalletStatus[] memory statuses
    ) {
        ids = new bytes32[](walletIds.length);
        owners = new address[](walletIds.length);
        subjects = new string[](walletIds.length);
        statuses = new WalletStatus[](walletIds.length);
        
        for (uint i = 0; i < walletIds.length; i++) {
            if (walletExists[walletIds[i]]) {
                EmailWallet memory wallet = emailWallets[walletIds[i]];
                ids[i] = wallet.walletId;
                owners[i] = wallet.owner;
                subjects[i] = wallet.content.subject;
                statuses[i] = wallet.status;
            }
        }
        
        return (ids, owners, subjects, statuses);
    }
}
