// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// Interface imports
interface IEmailWalletRegistration {
    function isRegistered(address wallet) external view returns (bool);
    function getCreditBalance(address wallet) external view returns (uint256);
    function deductCredits(address wallet, uint256 amount) external returns (bool);
}

interface IEmailDataWallet {
    struct AuthenticationResults {
        bool spfPass;
        bool dkimValid;
        bool dmarcPass;
        string dkimSignature;
    }
    
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
    ) external returns (bytes32 walletId);
}

interface IAttachmentWallet {
    function createAttachmentWallet(
        bytes32 sourceEmailWallet,
        string memory originalFilename,
        string memory filename,
        string memory mimeType,
        string memory fileExtension,
        uint256 fileSize,
        bytes32 contentHash,
        string memory fileSignature,
        string memory ipfsHash,
        uint256 attachmentIndex,
        string memory emailSender,
        string memory emailSubject,
        uint256 emailTimestamp
    ) external returns (bytes32 walletId);
}

contract AuthorizationManagerFixed is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // ============ STRUCTS ============
    
    struct AuthorizationRequest {
        bytes32 requestId;
        address userWallet;
        string authToken;
        bytes32 emailHash;
        bytes32[] attachmentHashes;
        uint256 creditCost;
        uint256 createdAt;
        uint256 expiresAt;
        AuthorizationStatus status;
        bytes32 emailWalletId;
        bytes32[] attachmentWalletIds;
    }
    
    struct AuthorizationData {
        bytes32 requestId;
        address signer;
        bytes signature;
        uint256 timestamp;
        bytes32 transactionHash;
        bool isValid;
    }
    
    struct ProcessingResult {
        bool success;
        bytes32 emailWalletId;
        bytes32[] attachmentWalletIds;
        uint256 totalCreditsUsed;
        string errorMessage;
    }
    
    struct EmailWalletData {
        string forwardedBy;
        string originalSender;
        string messageId;
        string subject;
        bytes32 bodyHash;
        bytes32 emailHash;
        bytes32 emailHeadersHash;
        uint256 attachmentCount;
        string ipfsHash;
        IEmailDataWallet.AuthenticationResults authResults;
    }
    
    struct AttachmentWalletData {
        string originalFilename;
        string filename;
        string mimeType;
        string fileExtension;
        uint256 fileSize;
        bytes32 contentHash;
        string fileSignature;
        string ipfsHash;
        uint256 attachmentIndex;
        string emailSender;
        string emailSubject;
        uint256 emailTimestamp;
    }
    
    enum AuthorizationStatus { PENDING, AUTHORIZED, PROCESSED, EXPIRED, CANCELLED }
    
    // ============ STATE VARIABLES ============
    
    mapping(bytes32 => AuthorizationRequest) public authRequests;
    mapping(string => bytes32) public tokenToRequestId;
    mapping(address => bytes32[]) public userRequests;
    mapping(bytes32 => AuthorizationData) public authorizations;
    
    IEmailWalletRegistration public registrationContract;
    IEmailDataWallet public emailWalletContract;
    IAttachmentWallet public attachmentWalletContract;
    
    uint256 public constant AUTHORIZATION_EXPIRY = 24 hours;
    uint256 public constant EMAIL_WALLET_COST = 3;
    uint256 public constant ATTACHMENT_WALLET_COST = 2;
    uint256 public constant AUTHORIZATION_PROCESSING_COST = 1;
    
    uint256 public totalRequests;
    uint256 public totalAuthorizations;
    
    // ============ EVENTS ============
    
    event AuthorizationRequestCreated(
        bytes32 indexed requestId,
        address indexed userWallet,
        string authToken,
        bytes32 emailHash,
        uint256 attachmentCount,
        uint256 creditCost,
        uint256 expiresAt
    );
    
    event AuthorizationSigned(
        bytes32 indexed requestId,
        address indexed signer,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event EmailWalletProcessed(
        bytes32 indexed requestId,
        bytes32 indexed emailWalletId,
        bytes32[] attachmentWalletIds,
        uint256 totalCreditsUsed
    );
    
    event AuthorizationExpired(
        bytes32 indexed requestId,
        address indexed userWallet,
        uint256 expiredAt
    );
    
    event AuthorizationCancelled(
        bytes32 indexed requestId,
        address indexed userWallet,
        uint256 cancelledAt
    );
    
    // ============ MODIFIERS ============
    
    modifier validRequest(bytes32 requestId) {
        require(authRequests[requestId].userWallet != address(0), "Invalid request");
        require(authRequests[requestId].status != AuthorizationStatus.EXPIRED, "Request expired");
        require(authRequests[requestId].status != AuthorizationStatus.CANCELLED, "Request cancelled");
        _;
    }
    
    modifier onlyRequestOwner(bytes32 requestId) {
        require(authRequests[requestId].userWallet == msg.sender, "Not request owner");
        _;
    }
    
    modifier requestNotExpired(bytes32 requestId) {
        require(block.timestamp <= authRequests[requestId].expiresAt, "Request expired");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        address _registrationContract,
        address _emailWalletContract,
        address _attachmentWalletContract
    ) {
        registrationContract = IEmailWalletRegistration(_registrationContract);
        emailWalletContract = IEmailDataWallet(_emailWalletContract);
        attachmentWalletContract = IAttachmentWallet(_attachmentWalletContract);
    }
    
    // ============ REQUEST CREATION ============
    
    function createAuthorizationRequest(
        address userWallet,
        string memory authToken,
        bytes32 emailHash,
        bytes32[] memory attachmentHashes
    ) external onlyOwner returns (bytes32 requestId) {
        
        // Calculate total credit cost
        uint256 totalCost = EMAIL_WALLET_COST + 
                           (attachmentHashes.length * ATTACHMENT_WALLET_COST) + 
                           AUTHORIZATION_PROCESSING_COST;
        
        // Verify user has sufficient credits
        require(
            registrationContract.getCreditBalance(userWallet) >= totalCost,
            "Insufficient credits"
        );
        
        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(
            userWallet,
            emailHash,
            block.timestamp,
            totalRequests
        ));
        
        require(authRequests[requestId].userWallet == address(0), "Request ID collision");
        
        // Create authorization request
        authRequests[requestId] = AuthorizationRequest({
            requestId: requestId,
            userWallet: userWallet,
            authToken: authToken,
            emailHash: emailHash,
            attachmentHashes: attachmentHashes,
            creditCost: totalCost,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + AUTHORIZATION_EXPIRY,
            status: AuthorizationStatus.PENDING,
            emailWalletId: bytes32(0),
            attachmentWalletIds: new bytes32[](0)
        });
        
        // Map token to request ID
        tokenToRequestId[authToken] = requestId;
        
        // Add to user's requests
        userRequests[userWallet].push(requestId);
        
        totalRequests++;
        
        emit AuthorizationRequestCreated(
            requestId,
            userWallet,
            authToken,
            emailHash,
            attachmentHashes.length,
            totalCost,
            block.timestamp + AUTHORIZATION_EXPIRY
        );
        
        return requestId;
    }
    
    // ============ AUTHORIZATION FUNCTIONS (FIXED) ============
    
    function authorizeEmailWalletCreation(
        bytes32 requestId,
        bytes memory signature
    ) external 
        validRequest(requestId) 
        onlyRequestOwner(requestId) 
        requestNotExpired(requestId) 
        nonReentrant 
        returns (bytes32 authorizationTx) {
        
        require(
            authRequests[requestId].status == AuthorizationStatus.PENDING,
            "Request not pending"
        );
        
        // FIXED: Simple signature validation using only requestId
        // This allows predictable client-side signing
        bytes32 ethSignedMessageHash = requestId.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == msg.sender, "Invalid signature");
        
        // Deduct credits
        require(
            registrationContract.deductCredits(
                msg.sender, 
                authRequests[requestId].creditCost
            ),
            "Credit deduction failed"
        );
        
        // Generate authorization transaction hash
        authorizationTx = keccak256(abi.encodePacked(
            requestId,
            msg.sender,
            signature,
            block.timestamp,
            block.number
        ));
        
        // Store authorization data
        authorizations[requestId] = AuthorizationData({
            requestId: requestId,
            signer: msg.sender,
            signature: signature,
            timestamp: block.timestamp,
            transactionHash: authorizationTx,
            isValid: true
        });
        
        // Update request status
        authRequests[requestId].status = AuthorizationStatus.AUTHORIZED;
        
        totalAuthorizations++;
        
        emit AuthorizationSigned(
            requestId,
            msg.sender,
            authorizationTx,
            block.timestamp
        );
        
        return authorizationTx;
    }
    
    // ============ WALLET PROCESSING ============
    
    function processAuthorizedRequest(
        bytes32 requestId,
        EmailWalletData memory emailData,
        AttachmentWalletData[] memory attachmentData
    ) external onlyOwner validRequest(requestId) returns (ProcessingResult memory) {
        
        require(
            authRequests[requestId].status == AuthorizationStatus.AUTHORIZED,
            "Request not authorized"
        );
        
        AuthorizationRequest storage request = authRequests[requestId];
        
        try emailWalletContract.createEmailWallet(
            emailData.forwardedBy,
            emailData.originalSender,
            emailData.messageId,
            emailData.subject,
            emailData.bodyHash,
            emailData.emailHash,
            emailData.emailHeadersHash,
            emailData.attachmentCount,
            emailData.ipfsHash,
            emailData.authResults
        ) returns (bytes32 emailWalletId) {
            request.emailWalletId = emailWalletId;
            
            // Process attachments
            bytes32[] memory attachmentWalletIds = new bytes32[](attachmentData.length);
            
            for (uint i = 0; i < attachmentData.length; i++) {
                try attachmentWalletContract.createAttachmentWallet(
                    emailWalletId,
                    attachmentData[i].originalFilename,
                    attachmentData[i].filename,
                    attachmentData[i].mimeType,
                    attachmentData[i].fileExtension,
                    attachmentData[i].fileSize,
                    attachmentData[i].contentHash,
                    attachmentData[i].fileSignature,
                    attachmentData[i].ipfsHash,
                    attachmentData[i].attachmentIndex,
                    attachmentData[i].emailSender,
                    attachmentData[i].emailSubject,
                    attachmentData[i].emailTimestamp
                ) returns (bytes32 attachmentWalletId) {
                    attachmentWalletIds[i] = attachmentWalletId;
                } catch {
                    // Continue processing other attachments even if one fails
                    attachmentWalletIds[i] = bytes32(0);
                }
            }
            
            request.attachmentWalletIds = attachmentWalletIds;
            request.status = AuthorizationStatus.PROCESSED;
            
            emit EmailWalletProcessed(
                requestId,
                emailWalletId,
                attachmentWalletIds,
                request.creditCost
            );
            
            return ProcessingResult({
                success: true,
                emailWalletId: emailWalletId,
                attachmentWalletIds: attachmentWalletIds,
                totalCreditsUsed: request.creditCost,
                errorMessage: ""
            });
            
        } catch Error(string memory reason) {
            return ProcessingResult({
                success: false,
                emailWalletId: bytes32(0),
                attachmentWalletIds: new bytes32[](0),
                totalCreditsUsed: 0,
                errorMessage: reason
            });
        }
    }
    
    // ============ QUERY FUNCTIONS ============
    
    function getAuthorizationRequest(bytes32 requestId) external view returns (
        address userWallet,
        string memory authToken,
        bytes32 emailHash,
        uint256 attachmentCount,
        uint256 creditCost,
        uint256 createdAt,
        uint256 expiresAt,
        AuthorizationStatus status
    ) {
        AuthorizationRequest memory request = authRequests[requestId];
        return (
            request.userWallet,
            request.authToken,
            request.emailHash,
            request.attachmentHashes.length,
            request.creditCost,
            request.createdAt,
            request.expiresAt,
            request.status
        );
    }
    
    function getAuthorizationData(bytes32 requestId) external view returns (
        address signer,
        bytes32 transactionHash,
        uint256 timestamp,
        bool isValid
    ) {
        AuthorizationData memory auth = authorizations[requestId];
        return (
            auth.signer,
            auth.transactionHash,
            auth.timestamp,
            auth.isValid
        );
    }
    
    function getRequestFromToken(string memory authToken) external view returns (bytes32) {
        return tokenToRequestId[authToken];
    }
    
    function getUserRequests(address user) external view returns (bytes32[] memory) {
        return userRequests[user];
    }
    
    function isRequestValid(bytes32 requestId) external view returns (bool) {
        AuthorizationRequest memory request = authRequests[requestId];
        
        return request.userWallet != address(0) &&
               request.status != AuthorizationStatus.EXPIRED &&
               request.status != AuthorizationStatus.CANCELLED &&
               block.timestamp <= request.expiresAt;
    }
    
    // ============ EXPIRY AND CANCELLATION ============
    
    function cancelRequest(bytes32 requestId) external validRequest(requestId) onlyRequestOwner(requestId) {
        require(
            authRequests[requestId].status == AuthorizationStatus.PENDING,
            "Can only cancel pending requests"
        );
        
        authRequests[requestId].status = AuthorizationStatus.CANCELLED;
        
        emit AuthorizationCancelled(requestId, msg.sender, block.timestamp);
    }
    
    function expireOldRequests(bytes32[] calldata requestIds) external {
        for (uint i = 0; i < requestIds.length; i++) {
            bytes32 requestId = requestIds[i];
            AuthorizationRequest storage request = authRequests[requestId];
            
            if (request.userWallet != address(0) && 
                block.timestamp > request.expiresAt &&
                request.status == AuthorizationStatus.PENDING) {
                
                request.status = AuthorizationStatus.EXPIRED;
                emit AuthorizationExpired(requestId, request.userWallet, block.timestamp);
            }
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setRegistrationContract(address newContract) external onlyOwner {
        registrationContract = IEmailWalletRegistration(newContract);
    }
    
    function setEmailWalletContract(address newContract) external onlyOwner {
        emailWalletContract = IEmailDataWallet(newContract);
    }
    
    function setAttachmentWalletContract(address newContract) external onlyOwner {
        attachmentWalletContract = IAttachmentWallet(newContract);
    }
}
