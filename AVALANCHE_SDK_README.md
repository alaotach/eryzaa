# Eryza Smart Contracts - Avalanche SDK Integration

This project demonstrates how to use the **Avalanche SDK TypeScript** for building sophisticated blockchain applications on the Avalanche network. The Eryza smart contracts leverage the Avalanche SDK for enhanced blockchain interactions, data analytics, and real-time monitoring.

## 🚀 Features

### Avalanche SDK Integration
- **Client SDK**: Direct blockchain interactions with type safety
- **ChainKit SDK**: Advanced data analytics and metrics
- **Real-time monitoring**: Event listening and block monitoring
- **Enhanced deployment**: Better gas estimation and contract verification

### Smart Contracts
- **EryzaToken**: ERC20 token with escrow functionality
- **EryzaJobEscrow**: Job management and payment escrow system

## 📦 Installation

```bash
# Install dependencies
npm install

# Install Avalanche SDK packages (already included)
npm install @avalanche-sdk/client @avalanche-sdk/chainkit viem
```

## 🔧 Configuration

1. **Environment Variables**: Copy `.env.example` to `.env` and fill in your values:
```bash
PRIVATE_KEY=your_private_key_here
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
SNOWTRACE_API_KEY=your_snowtrace_api_key
GLACIER_API_KEY=your_glacier_api_key (optional)
NETWORK=fuji
```

2. **Network Support**:
   - **Fuji Testnet**: For development and testing
   - **Avalanche Mainnet**: For production deployment

## 🛠️ Usage

### Deployment with Avalanche SDK

Deploy contracts with enhanced monitoring and verification:

```bash
# Deploy to Fuji testnet
npm run deploy:fuji

# Deploy to Avalanche mainnet
npm run deploy:mainnet
```

The deployment scripts now include:
- ✅ Real-time balance checking using Avalanche SDK
- ✅ Dynamic gas price estimation
- ✅ Enhanced contract verification
- ✅ Deployment confirmation via bytecode verification

### Contract Interactions

```bash
# Interact with deployed contracts
npm run interact

# Run ChainKit data examples
npm run chainkit

# Start real-time monitoring
npm run monitor
```

### Example Scripts

#### 1. Contract Interactions (`npm run interact`)
```javascript
const { createEryzaClient, getAvaxBalance, formatEther } = require("./utils/avalanche-client.cjs");

// Get deployed contracts
const EryzaToken = await ethers.getContract("EryzaToken");

// Check balances using Avalanche SDK
const balance = await getAvaxBalance(deployer.address, 'fuji');
console.log(`AVAX Balance: ${balance} AVAX`);

// Get token information
const tokenContract = await ethers.getContractAt("EryzaToken", EryzaToken.address);
const totalSupply = await tokenContract.totalSupply();
console.log(`Total Supply: ${formatEther(totalSupply)} ERY`);
```

#### 2. Data Analytics (`npm run chainkit`)
```javascript
const { createEryzaDataClient } = require("./utils/avalanche-client.cjs");

const dataClient = createEryzaDataClient('fuji');

// Get ERC20 token balances
const balances = await dataClient.data.evm.address.balances.listErc20({
    address: "0x...",
});

// Get transaction history
const transactions = await dataClient.data.evm.address.transactions.list({
    address: "0x...",
    pageSize: 10
});

// Get latest blocks
const blocks = await dataClient.data.evm.blocks.list({
    pageSize: 5
});
```

#### 3. Real-time Monitoring (`npm run monitor`)
```javascript
const monitor = new EryzaMonitor('fuji');

// Monitor token transfers
tokenContract.on("Transfer", (from, to, amount, event) => {
    console.log(`Token Transfer: ${formatEther(amount)} ERY`);
    console.log(`From: ${from} → To: ${to}`);
});

// Monitor new blocks
const currentBlock = await client.getBlockNumber();
console.log(`New Block: #${currentBlock}`);
```

## 🔍 Advanced Features

### Gas Optimization
The Avalanche SDK provides real-time gas estimation:

```javascript
const client = createEryzaClient('fuji');
const gasPrice = await client.getGasPrice();
const gasEstimate = await client.estimateGas(txParams);
const gasCost = gasEstimate * gasPrice;
console.log(`Estimated cost: ${formatEther(gasCost)} AVAX`);
```

### Event Monitoring
Real-time event listening with automatic reconnection:

```javascript
// Listen for contract events
tokenContract.on("Transfer", (from, to, amount, event) => {
    console.log(`Transfer detected: ${event.transactionHash}`);
});

// Query historical events
const transferFilter = tokenContract.filters.Transfer();
const events = await tokenContract.queryFilter(transferFilter, fromBlock);
```

### Data Analytics
Advanced blockchain data analysis:

```javascript
// Get comprehensive address analytics
const addressData = await dataClient.data.evm.address.balances.listErc20({
    address: walletAddress,
});

// Monitor network health
const metrics = await dataClient.metrics.network.health.list({
    timeframe: "1h"
});

// Track token transfers and volume
const transfers = await dataClient.data.evm.logs.list({
    address: tokenAddress,
    topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    pageSize: 100
});
```

## 📊 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:fuji` | Deploy contracts to Fuji testnet |
| `npm run deploy:mainnet` | Deploy contracts to Avalanche mainnet |
| `npm run interact` | Run contract interaction examples |
| `npm run chainkit` | Run ChainKit data API examples |
| `npm run monitor` | Start real-time blockchain monitoring |
| `npm run setup:contracts` | Configure deployed contracts |
| `npm run verify:fuji` | Verify contracts on Fuji |
| `npm run verify:mainnet` | Verify contracts on Mainnet |
| `npm test` | Run contract tests |
| `npm run compile` | Compile smart contracts |

## 🏗️ Architecture

### Avalanche SDK Utils (`utils/avalanche-client.cjs`)
Central utility for all Avalanche SDK interactions:

```javascript
// Client creation
const client = createEryzaClient('fuji');
const dataClient = createEryzaDataClient('fuji');

// Balance checking
const balance = await getAvaxBalance(address, 'fuji');

// Token analytics
const tokens = await getTokenBalances(address, 'fuji');

// Transaction history
const txHistory = await getTransactionHistory(address, 'fuji', 10);

// Gas utilities
const gasPrice = await getGasPrice('fuji');
const estimate = await estimateGas(txParams, 'fuji');
```

### Smart Contract Integration
Enhanced deployment and verification:

- **Real-time balance monitoring** during deployment
- **Dynamic gas price optimization** based on network conditions
- **Automatic contract verification** via bytecode comparison
- **Enhanced error reporting** with detailed transaction information

### Monitoring & Analytics
Comprehensive blockchain monitoring:

- **Block monitoring**: Real-time new block detection
- **Event listening**: Contract event monitoring with automatic reconnection
- **Network statistics**: Gas prices, block times, transaction volumes
- **Contract analytics**: Token metrics, transfer volumes, user activity

## 🔗 Useful Links

- [Avalanche SDK Documentation](https://github.com/ava-labs/avalanche-sdk-typescript)
- [Avalanche Developer Docs](https://docs.avax.network/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using Avalanche SDK TypeScript**