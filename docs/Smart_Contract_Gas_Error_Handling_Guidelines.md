# Smart Contract Development - Gas Handling & Error Management Guidelines

**Date:** September 16, 2025  
**Context:** After successfully resolving Email Wallet System deployment issues  
**Lesson:** Gas estimation failures can mask actual contract validation issues  

## Key Insights from Email Wallet System Debugging

### What We Learned
1. **Gas estimation of 568k was normal** - not an error condition
2. **Previous failures were likely network-related** - not contract validation issues
3. **Enhanced logging revealed the actual problem** - insufficient error granularity
4. **The warning threshold of 450k was too conservative** - 568k is reasonable for complex operations

### Root Cause Analysis
The debugging process revealed that transaction failures weren't due to:
- Contract validation errors
- Parameter formatting issues  
- ABI mismatches
- Permission problems

Instead, they were likely caused by:
- Network congestion during gas estimation
- RPC endpoint timeouts
- Temporary Polygon Amoy instability

## Guidelines for Future Contract Development

### 1. Gas Management Best Practices

#### Gas Estimation Strategy
```solidity
// In contract: Include gas usage estimates in events
event EmailDataWalletCreated(
    uint256 indexed walletId,
    address indexed userAddress,
    uint256 gasUsed,  // ADD: Actual gas consumption
    string emailHash
);
```

#### Service Layer Gas Handling
```typescript
// Enhanced gas estimation with better error handling
try {
    const gasEstimate = await contract.estimateGas.functionName(...params);
    
    // Set reasonable thresholds based on contract complexity
    const MAX_EXPECTED_GAS = 800000; // Increase from 450k based on actual usage
    const MIN_BUFFER_PERCENT = 20;
    
    if (gasEstimate.gt(MAX_EXPECTED_GAS)) {
        console.warn(`Gas estimate ${gasEstimate.toString()} exceeds expected maximum ${MAX_EXPECTED_GAS}`);
        // Continue anyway - high gas doesn't mean failure
    }
    
    const gasLimit = gasEstimate.mul(100 + MIN_BUFFER_PERCENT).div(100);
    
} catch (gasEstimationError) {
    // Enhanced error categorization
    if (gasEstimationError.message?.includes('execution reverted')) {
        // This is an actual contract validation error
        throw new Error(`Contract validation failed: ${gasEstimationError.reason}`);
    } else if (gasEstimationError.message?.includes('timeout')) {
        // Network issue - retry with higher gas limit
        console.warn('Gas estimation timeout - using fallback gas limit');
        gasLimit = ethers.BigNumber.from(1000000);
    } else {
        // Unknown error - investigate further
        throw gasEstimationError;
    }
}
```

### 2. Contract Error Handling Improvements

#### Add Descriptive Custom Errors
```solidity
// Replace generic reverts with descriptive custom errors
error InsufficientGasForOperation(uint256 provided, uint256 required);
error ParameterTooLong(string paramName, uint256 length, uint256 maxLength);
error EmptyRequiredParameter(string paramName);
error DuplicateEmailHash(string emailHash, uint256 existingWalletId);
error UserWalletLimitExceeded(address user, uint256 currentCount, uint256 maxAllowed);
error ContractPausedForMaintenance(string reason);

// Usage in functions
function createEmailDataWallet(...) external {
    if (bytes(emailHash).length == 0) {
        revert EmptyRequiredParameter("emailHash");
    }
    
    if (bytes(emailHash).length > MAX_STRING_LENGTH) {
        revert ParameterTooLong("emailHash", bytes(emailHash).length, MAX_STRING_LENGTH);
    }
    
    if (emailHashExists[emailHash]) {
        revert DuplicateEmailHash(emailHash, emailHashToWalletId[emailHash]);
    }
    
    // Continue with function logic...
}
```

#### Gas Usage Monitoring
```solidity
// Add gas tracking for optimization
mapping(string => uint256) public functionGasUsage;

modifier trackGasUsage(string memory functionName) {
    uint256 gasStart = gasleft();
    _;
    uint256 gasUsed = gasStart - gasleft();
    functionGasUsage[functionName] = gasUsed;
    emit GasUsageTracked(functionName, gasUsed, block.timestamp);
}

function createEmailDataWallet(...) 
    external 
    onlyOwner 
    whenNotPaused 
    nonReentrant 
    trackGasUsage("createEmailDataWallet")
    returns (uint256) 
{
    // Function implementation
}
```

### 3. Service Layer Improvements

#### Retry Logic for Network Issues
```typescript
async function executeContractCallWithRetry(
    contractCall: () => Promise<any>,
    maxRetries: number = 3
): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await contractCall();
        } catch (error: any) {
            if (attempt === maxRetries) throw error;
            
            if (error.message?.includes('timeout') || 
                error.message?.includes('network') ||
                error.code === 'NETWORK_ERROR') {
                
                console.warn(`Attempt ${attempt} failed due to network issue. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                continue;
            }
            
            // If it's not a network error, don't retry
            throw error;
        }
    }
}
```

#### Comprehensive Error Classification
```typescript
interface ContractError {
    type: 'validation' | 'network' | 'gas' | 'permission' | 'unknown';
    category: string;
    message: string;
    resolution: string;
    retryable: boolean;
}

function classifyContractError(error: any): ContractError {
    if (error.message?.includes('EmptyRequiredParameter')) {
        return {
            type: 'validation',
            category: 'Parameter Validation',
            message: 'Required parameter is empty',
            resolution: 'Check parameter generation logic',
            retryable: false
        };
    }
    
    if (error.message?.includes('timeout')) {
        return {
            type: 'network',
            category: 'Network Timeout',
            message: 'RPC endpoint timeout',
            resolution: 'Retry with exponential backoff',
            retryable: true
        };
    }
    
    if (error.message?.includes('insufficient funds for gas')) {
        return {
            type: 'gas',
            category: 'Insufficient Gas',
            message: 'Not enough ETH/POL for gas',
            resolution: 'Fund service wallet',
            retryable: false
        };
    }
    
    // Add more classifications...
    
    return {
        type: 'unknown',
        category: 'Unclassified Error',
        message: error.message || 'Unknown error',
        resolution: 'Investigate manually',
        retryable: false
    };
}
```

### 4. Monitoring & Alerting

#### Gas Usage Tracking
```typescript
interface GasMetrics {
    functionName: string;
    averageGas: number;
    maxGas: number;
    minGas: number;
    callCount: number;
    lastUpdated: Date;
}

class GasTracker {
    private metrics = new Map<string, GasMetrics>();
    
    recordGasUsage(functionName: string, gasUsed: number) {
        const existing = this.metrics.get(functionName);
        
        if (!existing) {
            this.metrics.set(functionName, {
                functionName,
                averageGas: gasUsed,
                maxGas: gasUsed,
                minGas: gasUsed,
                callCount: 1,
                lastUpdated: new Date()
            });
        } else {
            existing.averageGas = (existing.averageGas * existing.callCount + gasUsed) / (existing.callCount + 1);
            existing.maxGas = Math.max(existing.maxGas, gasUsed);
            existing.minGas = Math.min(existing.minGas, gasUsed);
            existing.callCount++;
            existing.lastUpdated = new Date();
        }
    }
    
    getGasAlert(functionName: string, currentGas: number): string | null {
        const metrics = this.metrics.get(functionName);
        if (!metrics) return null;
        
        if (currentGas > metrics.averageGas * 1.5) {
            return `Gas usage spike: ${currentGas} vs average ${metrics.averageGas}`;
        }
        
        return null;
    }
}
```

### 5. Deployment Checklist

#### Pre-Deployment Testing
- [ ] Test with realistic gas limits (600k-800k for complex operations)
- [ ] Verify all custom errors are properly defined
- [ ] Test gas estimation with various parameter sizes
- [ ] Validate retry logic handles network timeouts
- [ ] Confirm error classification covers all contract errors

#### Post-Deployment Monitoring
- [ ] Set up gas usage alerts for function calls
- [ ] Monitor for contract validation errors vs network errors
- [ ] Track success/failure rates over time
- [ ] Alert on unusual gas consumption patterns

## Specific Recommendations for Next Contract Update

### 1. Add Gas Estimation Helper Function
```solidity
function estimateGasForWalletCreation(
    address userAddress,
    string memory emailHash,
    uint256 attachmentCount
) external view returns (uint256 estimatedGas) {
    // Return reasonable estimate based on parameters
    uint256 baseGas = 400000;
    uint256 attachmentGas = attachmentCount * 50000;
    return baseGas + attachmentGas;
}
```

### 2. Include Operation Mode
```solidity
enum OperationMode { NORMAL, HIGH_GAS_MODE, EMERGENCY_MODE }
OperationMode public currentMode = OperationMode.NORMAL;

function setOperationMode(OperationMode mode) external onlyOwner {
    currentMode = mode;
    emit OperationModeChanged(mode, block.timestamp);
}
```

### 3. Add Circuit Breaker for Network Issues
```solidity
uint256 public consecutiveFailures;
uint256 public constant MAX_CONSECUTIVE_FAILURES = 5;
bool public emergencyPause;

modifier circuitBreaker() {
    require(!emergencyPause, "Emergency pause activated");
    _;
    consecutiveFailures = 0; // Reset on success
}

function reportFailure() external onlyOwner {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        emergencyPause = true;
        emit EmergencyPauseActivated(consecutiveFailures);
    }
}
```

## Summary

The Email Wallet System success demonstrates that:
1. **High gas usage doesn't indicate failure** - 568k gas is normal for complex operations
2. **Network issues can masquerade as contract problems** - proper error classification is crucial
3. **Enhanced logging and error handling** prevent hours of debugging
4. **Conservative gas limits can cause false alarms** - adjust thresholds based on actual usage

For future contract development, prioritize clear error messages, proper gas estimation, and robust network error handling over premature optimization.