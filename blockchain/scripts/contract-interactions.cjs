const { ethers } = require("hardhat");
const { 
    createEryzaClient, 
    createEryzaDataClient,
    getAvaxBalance,
    getTokenBalances,
    getTransactionHistory,
    formatEther
} = require("../utils/avalanche-client.cjs");
require('dotenv').config();

/**
 * Example script showing how to interact with deployed Eryza contracts
 * using the Avalanche SDK
 */

async function main() {
    const network = process.env.NETWORK || 'fuji';
    console.log(`🌐 Connecting to ${network} network...`);

    try {
        // Get deployed contract addresses
        const EryzaToken = await ethers.getContract("EryzaToken");
        const EryzaJobEscrow = await ethers.getContract("EryzaJobEscrow");

        console.log("\n📋 Contract Addresses:");
        console.log(`EryzaToken: ${EryzaToken.address}`);
        console.log(`EryzaJobEscrow: ${EryzaJobEscrow.address}`);

        // Initialize Avalanche SDK clients
        const client = createEryzaClient(network);
        const dataClient = createEryzaDataClient(network);

        // Example 1: Get contract information
        console.log("\n🔍 Contract Information:");
        const tokenInfo = await client.getBytecode({ address: EryzaToken.address });
        console.log(`EryzaToken bytecode length: ${tokenInfo.length} characters`);

        // Example 2: Get token details using direct contract calls
        console.log("\n🪙 Token Details:");
        const tokenContract = await ethers.getContractAt("EryzaToken", EryzaToken.address);
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const totalSupply = await tokenContract.totalSupply();
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Total Supply: ${formatEther(totalSupply)} ${symbol}`);

        // Example 3: Get deployer account info
        const [deployer] = await ethers.getSigners();
        console.log("\n👤 Deployer Account:");
        console.log(`Address: ${deployer.address}`);
        
        const balance = await getAvaxBalance(deployer.address, network);
        console.log(`AVAX Balance: ${balance} AVAX`);

        const tokenBalance = await tokenContract.balanceOf(deployer.address);
        console.log(`${symbol} Balance: ${formatEther(tokenBalance)} ${symbol}`);

        // Example 4: Get token balances using ChainKit (if available)
        console.log("\n💰 All Token Balances:");
        try {
            const tokenBalances = await getTokenBalances(deployer.address, network);
            if (tokenBalances.length > 0) {
                tokenBalances.forEach(balance => {
                    console.log(`${balance.symbol}: ${balance.balance} (${balance.address})`);
                });
            } else {
                console.log("No ERC20 tokens found or ChainKit API unavailable");
            }
        } catch (error) {
            console.log("ChainKit API not available:", error.message);
        }

        // Example 5: Get recent transactions
        console.log("\n📜 Recent Transactions:");
        try {
            const transactions = await getTransactionHistory(deployer.address, network, 5);
            if (transactions.length > 0) {
                transactions.forEach((tx, index) => {
                    console.log(`${index + 1}. Hash: ${tx.hash}`);
                    console.log(`   Block: ${tx.blockNumber}`);
                    console.log(`   Value: ${formatEther(tx.value)} AVAX`);
                    console.log(`   Gas Used: ${tx.gasUsed}`);
                });
            } else {
                console.log("No recent transactions found or ChainKit API unavailable");
            }
        } catch (error) {
            console.log("ChainKit API not available:", error.message);
        }

        // Example 6: Estimate gas for a token transfer
        console.log("\n⛽ Gas Estimation:");
        try {
            const gasEstimate = await client.estimateGas({
                to: EryzaToken.address,
                data: tokenContract.interface.encodeFunctionData("transfer", [
                    "0x0000000000000000000000000000000000000001",
                    ethers.utils.parseEther("1")
                ])
            });
            const gasPrice = await client.getGasPrice();
            const gasCost = gasEstimate * gasPrice;
            
            console.log(`Estimated gas for token transfer: ${gasEstimate.toString()}`);
            console.log(`Current gas price: ${gasPrice.toString()}`);
            console.log(`Estimated cost: ${formatEther(gasCost)} AVAX`);
        } catch (error) {
            console.log("Gas estimation failed:", error.message);
        }

        // Example 7: Monitor events (if any recent ones)
        console.log("\n🎯 Recent Events:");
        try {
            const latestBlock = await client.getBlockNumber();
            const fromBlock = Math.max(0, Number(latestBlock) - 1000); // Last 1000 blocks
            
            const transferFilter = tokenContract.filters.Transfer();
            const events = await tokenContract.queryFilter(transferFilter, fromBlock);
            
            if (events.length > 0) {
                console.log(`Found ${events.length} Transfer events in last 1000 blocks:`);
                events.slice(-5).forEach((event, index) => {
                    console.log(`${index + 1}. From: ${event.args.from}`);
                    console.log(`   To: ${event.args.to}`);
                    console.log(`   Amount: ${formatEther(event.args.value)} ${symbol}`);
                    console.log(`   Block: ${event.blockNumber}`);
                });
            } else {
                console.log("No Transfer events found in recent blocks");
            }
        } catch (error) {
            console.log("Event monitoring failed:", error.message);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Example function to interact with job escrow
async function jobEscrowExample() {
    try {
        const EryzaJobEscrow = await ethers.getContract("EryzaJobEscrow");
        const escrowContract = await ethers.getContractAt("EryzaJobEscrow", EryzaJobEscrow.address);

        console.log("\n🔐 Job Escrow Information:");
        
        // Get configuration if the contract has such functions
        try {
            const defaultDuration = await escrowContract.defaultJobDuration?.() || "Not available";
            const minAmount = await escrowContract.minimumJobAmount?.() || "Not available";
            
            console.log(`Default Job Duration: ${defaultDuration}`);
            console.log(`Minimum Job Amount: ${minAmount}`);
        } catch (error) {
            console.log("Could not fetch escrow configuration");
        }

    } catch (error) {
        console.error("Job escrow example failed:", error.message);
    }
}

// Run the examples
if (require.main === module) {
    main()
        .then(() => jobEscrowExample())
        .then(() => {
            console.log("\n✅ Examples completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Examples failed:", error);
            process.exit(1);
        });
}

module.exports = { main, jobEscrowExample };