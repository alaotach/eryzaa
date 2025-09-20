const { createEryzaDataClient } = require("../utils/avalanche-client.cjs");
require('dotenv').config();

/**
 * Example script demonstrating Avalanche ChainKit SDK usage
 * for data analytics and monitoring
 */

async function main() {
    const network = process.env.NETWORK || 'fuji';
    console.log(`📊 ChainKit Data API Examples for ${network}`);

    const dataClient = createEryzaDataClient(network);

    // Example wallet address (replace with actual addresses)
    const exampleAddress = "0x8ae323046633A07FB162043f28Cea39FFc23B50A";

    try {
        // Example 1: Get ERC20 token balances
        console.log("\n💰 ERC20 Token Balances:");
        const balances = await dataClient.data.evm.address.balances.listErc20({
            address: exampleAddress,
        });
        
        if (balances.erc20TokenBalances && balances.erc20TokenBalances.length > 0) {
            balances.erc20TokenBalances.forEach(token => {
                console.log(`${token.symbol}: ${token.balance} (${token.address})`);
            });
        } else {
            console.log("No ERC20 tokens found for this address");
        }

    } catch (error) {
        console.log("ERC20 balances failed:", error.message);
    }

    try {
        // Example 2: Get native token balance
        console.log("\n🪙 Native Token Balance:");
        const nativeBalance = await dataClient.data.evm.address.balances.listNative({
            address: exampleAddress,
        });
        
        if (nativeBalance.nativeTokenBalance) {
            console.log(`AVAX: ${nativeBalance.nativeTokenBalance.balance}`);
        }

    } catch (error) {
        console.log("Native balance failed:", error.message);
    }

    try {
        // Example 3: Get transaction history
        console.log("\n📜 Transaction History:");
        const transactions = await dataClient.data.evm.address.transactions.list({
            address: exampleAddress,
            pageSize: 5
        });
        
        if (transactions.transactions && transactions.transactions.length > 0) {
            transactions.transactions.forEach((tx, index) => {
                console.log(`${index + 1}. Hash: ${tx.hash}`);
                console.log(`   Block: ${tx.blockNumber}`);
                console.log(`   Value: ${tx.value} AVAX`);
                console.log(`   Gas Used: ${tx.gasUsed}`);
                console.log(`   Status: ${tx.status}`);
            });
        } else {
            console.log("No transactions found");
        }

    } catch (error) {
        console.log("Transaction history failed:", error.message);
    }

    try {
        // Example 4: Get latest blocks
        console.log("\n🧱 Latest Blocks:");
        const blocks = await dataClient.data.evm.blocks.list({
            pageSize: 3
        });
        
        if (blocks.blocks && blocks.blocks.length > 0) {
            blocks.blocks.forEach((block, index) => {
                console.log(`${index + 1}. Block #${block.blockNumber}`);
                console.log(`   Hash: ${block.blockHash}`);
                console.log(`   Timestamp: ${new Date(block.blockTimestamp * 1000).toISOString()}`);
                console.log(`   Transactions: ${block.txCount}`);
                console.log(`   Gas Used: ${block.gasUsed}`);
            });
        }

    } catch (error) {
        console.log("Blocks data failed:", error.message);
    }

    try {
        // Example 5: Get network metrics (if available)
        console.log("\n📈 Network Metrics:");
        
        // Note: Metrics API might have different endpoints, check the actual API documentation
        const healthMetrics = await dataClient.metrics.network.health.list({
            timeframe: "1h"
        });
        
        console.log("Network health metrics:", healthMetrics);

    } catch (error) {
        console.log("Metrics data not available or failed:", error.message);
    }

    try {
        // Example 6: Get contract details (if we have deployed contracts)
        console.log("\n📄 Contract Information:");
        
        // Example contract address - replace with your deployed contract
        const contractAddress = "0x8ae323046633A07FB162043f28Cea39FFc23B50A";
        
        const contractInfo = await dataClient.data.evm.contracts.get({
            address: contractAddress
        });
        
        if (contractInfo) {
            console.log(`Contract: ${contractInfo.address}`);
            console.log(`Name: ${contractInfo.name || 'Unknown'}`);
            console.log(`Symbol: ${contractInfo.symbol || 'Unknown'}`);
            console.log(`Type: ${contractInfo.type || 'Unknown'}`);
        }

    } catch (error) {
        console.log("Contract information failed:", error.message);
    }

    try {
        // Example 7: Search for specific token transfers
        console.log("\n🔍 Token Transfer Events:");
        
        const transfers = await dataClient.data.evm.logs.list({
            address: exampleAddress,
            topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
            pageSize: 3
        });
        
        if (transfers.logs && transfers.logs.length > 0) {
            transfers.logs.forEach((log, index) => {
                console.log(`${index + 1}. Block: ${log.blockNumber}`);
                console.log(`   Transaction: ${log.transactionHash}`);
                console.log(`   Contract: ${log.address}`);
                console.log(`   Topics: ${log.topics.length} topics`);
            });
        } else {
            console.log("No transfer events found");
        }

    } catch (error) {
        console.log("Event logs failed:", error.message);
    }

    console.log("\n✅ ChainKit examples completed!");
}

// Analytics helper functions
async function getTokenAnalytics(tokenAddress, network = 'fuji') {
    const dataClient = createEryzaDataClient(network);
    
    try {
        console.log(`\n📊 Analytics for token: ${tokenAddress}`);
        
        // Get token transfers
        const transfers = await dataClient.data.evm.logs.list({
            address: tokenAddress,
            topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            pageSize: 100
        });
        
        if (transfers.logs) {
            console.log(`Total transfers found: ${transfers.logs.length}`);
            
            // Count unique addresses
            const uniqueAddresses = new Set();
            transfers.logs.forEach(log => {
                if (log.topics[1]) uniqueAddresses.add(log.topics[1]);
                if (log.topics[2]) uniqueAddresses.add(log.topics[2]);
            });
            
            console.log(`Unique addresses involved: ${uniqueAddresses.size}`);
        }
        
    } catch (error) {
        console.log("Token analytics failed:", error.message);
    }
}

if (require.main === module) {
    main()
        .then(() => {
            console.log("\n🎯 Run with token address for analytics:");
            console.log("node scripts/chainkit-examples.cjs <token_address>");
            
            // If token address provided as argument
            if (process.argv[2]) {
                return getTokenAnalytics(process.argv[2]);
            }
        })
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Examples failed:", error);
            process.exit(1);
        });
}

module.exports = { main, getTokenAnalytics };