#!/usr/bin/env node

/**
 * Wallet Setup Script for Eryzaa
 * Generates a new wallet and updates .env file
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function generateNewWallet() {
    console.log("🔐 Generating new wallet for testing...");
    
    // Generate a random wallet
    const wallet = ethers.Wallet.createRandom();
    
    console.log("\n✅ New wallet generated!");
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    
    console.log("\n💰 To get testnet AVAX:");
    console.log(`1. Go to: https://faucet.avax.network/`);
    console.log(`2. Enter your address: ${wallet.address}`);
    console.log(`3. Select Fuji testnet and request AVAX`);
    
    return wallet;
}

function updateEnvFile(privateKey) {
    const envPath = path.join(__dirname, "../.env");
    
    try {
        let envContent = fs.readFileSync(envPath, "utf8");
        
        // Replace the private key
        envContent = envContent.replace(
            /PRIVATE_KEY=.*/,
            `PRIVATE_KEY=${privateKey}`
        );
        
        fs.writeFileSync(envPath, envContent);
        console.log("\n✅ Updated .env file with new private key");
        
    } catch (error) {
        console.error("❌ Failed to update .env file:", error.message);
        console.log("\n📝 Please manually add this to your .env file:");
        console.log(`PRIVATE_KEY=${privateKey}`);
    }
}

async function checkBalance(wallet) {
    try {
        const provider = new ethers.providers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const walletConnected = wallet.connect(provider);
        
        const balance = await walletConnected.getBalance();
        const balanceInAvax = ethers.utils.formatEther(balance);
        
        console.log(`\n💰 Current balance: ${balanceInAvax} AVAX`);
        
        if (parseFloat(balanceInAvax) < 0.1) {
            console.log("⚠️  You need testnet AVAX to deploy contracts!");
            console.log("   Get some from: https://faucet.avax.network/");
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("❌ Failed to check balance:", error.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'generate';
    
    console.log("🔧 Eryzaa Wallet Setup");
    
    if (command === 'generate') {
        const wallet = generateNewWallet();
        updateEnvFile(wallet.privateKey);
        await checkBalance(wallet);
        
        console.log("\n🚀 Next steps:");
        console.log("1. Get testnet AVAX from the faucet");
        console.log("2. Deploy contracts: npm run deploy:fuji");
        console.log("3. Register your node: ./eryzaa-rental-cli register");
        
    } else if (command === 'check') {
        // Check existing wallet
        require('dotenv').config({ path: path.join(__dirname, '../.env') });
        
        if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_private_key_here') {
            console.log("❌ No valid private key found in .env");
            console.log("   Run: node setup_wallet.js generate");
            return;
        }
        
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
            console.log(`✅ Wallet address: ${wallet.address}`);
            await checkBalance(wallet);
        } catch (error) {
            console.error("❌ Invalid private key in .env file");
        }
        
    } else {
        console.log("\nUsage:");
        console.log("  node setup_wallet.js generate  - Generate new wallet");
        console.log("  node setup_wallet.js check     - Check existing wallet");
    }
}

if (require.main === module) {
    main().catch(console.error);
}
