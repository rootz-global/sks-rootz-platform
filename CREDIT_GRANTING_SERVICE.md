# Credit Granting Service Documentation

## Overview
The Credit Granting Service allows the platform service wallet to deposit credits into registered user accounts for email wallet creation operations.

## API Endpoint

### Grant Credits
**POST** `/.rootz/test/grant-credits`

**Purpose:** Deposit credits into a registered user's account using the service wallet's POL balance.

**Request Body:**
```json
{
  "address": "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77",
  "amount": 60
}
```

**Parameters:**
- `address` (string, required): User wallet address to receive credits
- `amount` (number, optional): Number of credits to grant (default: 60)

**Response:**
```json
{
  "success": true,
  "address": "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77",
  "creditsGranted": 60,
  "polPaid": "0.006",
  "newBalance": "60",
  "transactionHash": "0x1234567890abcdef...",
  "blockNumber": 26155299,
  "timestamp": "2025-09-17T13:30:00.000Z"
}
```

## Credit Economics
- **Exchange Rate:** 1 credit = 0.0001 POL
- **Email Wallet Cost:** 4 credits (3 base + 1 processing)
- **Attachment Cost:** 2 credits each

## Usage Examples

### Grant Default Credits (60)
```bash
curl -X POST "http://localhost:8000/.rootz/test/grant-credits" \
  -H "Content-Type: application/json" \
  -d '{"address": "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77"}'
```

### Grant Custom Amount
```bash
curl -X POST "http://localhost:8000/.rootz/test/grant-credits" \
  -H "Content-Type: application/json" \
  -d '{"address": "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77", "amount": 100}'
```

## Technical Implementation
- **Contract:** EmailWalletRegistration at `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`
- **Function:** `depositCredits(address wallet) payable`
- **Service Wallet:** Must have sufficient POL balance for credit deposits
- **Gas Limit:** 200,000 (sufficient for credit deposit transactions)

## Error Handling
- **400:** Missing or invalid address parameter
- **500:** Blockchain transaction failure, insufficient POL balance, or contract errors

## Limitations
- Only works for registered users
- Requires service wallet to have sufficient POL balance
- Cannot grant negative credits or exceed uint256 maximum

## Security Notes
- Only the service wallet can call this endpoint
- All transactions are recorded on-chain
- Credit balances are verifiable via blockchain
