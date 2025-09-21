const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Contract compilation artifacts
const EryzaTokenArtifact = require("../../artifacts/contracts/token/EryzaToken.sol/EryzaToken.json");
const EryzaStakingArtifact = require("../../artifacts/blockchain/contracts/EryzaStaking.sol/EryzaStaking.json");
const EryzaComputeMarketplaceArtifact = require("../../artifacts/blockchain/contracts/EryzaComputeMarketplace.sol/EryzaComputeMarketplace.json");
const EryzaJobsLedgerArtifact = require("../../artifacts/blockchain/contracts/EryzaJobsLedger.sol/EryzaJobsLedger.json");

async function main() {
    console.log("🚀 Deploying Eryza contracts to Avalanche Fuji...");
    
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.AVALANCHE_FUJI_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("Deploying contracts with account:", wallet.address);
    
    // Check balance
    try {
        const balance = await wallet.getBalance();
        const balanceInAvax = ethers.utils.formatEther(balance);
        console.log("Account balance:", balanceInAvax, "AVAX");
        
        if (parseFloat(balanceInAvax) < 0.1) {
            console.log("⚠️  Low balance! You need more testnet AVAX");
            console.log("   Get some from: https://faucet.avax.network/");
            console.log("   Your address:", wallet.address);
            return;
        }
    } catch (error) {
        console.log("Could not check balance, continuing...");
    }
    
    // Deploy EryzaToken first
    console.log("\n1. Deploying EryzaToken...");
    
    const EryzaTokenFactory = new ethers.ContractFactory(
        EryzaTokenArtifact.abi,
        EryzaTokenArtifact.bytecode,
        wallet
    );
    
    const eryzaToken = await EryzaTokenFactory.deploy(
        wallet.address, // teamVesting (deployer for now)
        wallet.address, // investorVesting (deployer for now) 
        wallet.address, // communityRewards (deployer for now)
        wallet.address, // treasury (deployer for now)
        wallet.address  // liquidityPool (deployer for now)
    );
    
    await eryzaToken.deployed();
    console.log("✅ EryzaToken deployed to:", eryzaToken.address);
    
    // Deploy EryzaStaking
    console.log("\n2. Deploying EryzaStaking...");
    
    const EryzaStakingFactory = new ethers.ContractFactory(
        EryzaStakingArtifact.abi,
        EryzaStakingArtifact.bytecode,
        wallet
    );
    
    const eryzaStaking = await EryzaStakingFactory.deploy(
        eryzaToken.address, // stake token
        eryzaToken.address  // reward token (same as stake token)
    );
    
    await eryzaStaking.deployed();
    console.log("✅ EryzaStaking deployed to:", eryzaStaking.address);
    
    // Deploy EryzaComputeMarketplace
    console.log("\n3. Deploying EryzaComputeMarketplace...");
    
    const MarketplaceFactory = new ethers.ContractFactory(
        EryzaComputeMarketplaceArtifact.abi,
        EryzaComputeMarketplaceArtifact.bytecode,
        wallet
    );
    
    const marketplace = await MarketplaceFactory.deploy(
        eryzaToken.address // payment token
    );
    
    await marketplace.deployed();
    console.log("✅ EryzaComputeMarketplace deployed to:", marketplace.address);
    
    // Deploy EryzaJobsLedger  
    console.log("\n4. Deploying EryzaJobsLedger...");
    
    const LedgerFactory = new ethers.ContractFactory(
        EryzaJobsLedgerArtifact.abi,
        EryzaJobsLedgerArtifact.bytecode,
        wallet
    );
    
    const ledger = await LedgerFactory.deploy(eryzaToken.address);
    
    await ledger.deployed();
    console.log("✅ EryzaJobsLedger deployed to:", ledger.address);
    
    // Set marketplace contract in ledger
    console.log("\n5. Setting up permissions...");
    
    try {
        const tx = await ledger.setMarketplaceContract(marketplace.address);
        await tx.wait();
        console.log("✅ Set marketplace contract in ledger");
    } catch (error) {
        console.log("⚠️  Could not set marketplace contract:", error.message);
    }
    
    console.log("\n🎉 === Deployment Summary ===");
    console.log("EryzaToken:", eryzaToken.address);
    console.log("EryzaStaking:", eryzaStaking.address);
    console.log("EryzaComputeMarketplace:", marketplace.address);
    console.log("EryzaJobsLedger:", ledger.address);
    console.log("Deployer:", wallet.address);
    console.log("Network: Avalanche Fuji Testnet (Chain ID: 43113)");
    
    // Save deployment info to .env file
    console.log("\n6. Updating .env file...");
    
    const envPath = path.join(__dirname, "../../.env");
    try {
        let envContent = fs.readFileSync(envPath, "utf8");
        
        // Update contract addresses
        envContent = envContent.replace(
            /ERYZA_TOKEN_ADDRESS=.*/,
            `ERYZA_TOKEN_ADDRESS=${eryzaToken.address}`
        );
        envContent = envContent.replace(
            /ERYZA_STAKING_ADDRESS=.*/,
            `ERYZA_STAKING_ADDRESS=${eryzaStaking.address}`
        );
        envContent = envContent.replace(
            /ERYZA_MARKETPLACE_ADDRESS=.*/,
            `ERYZA_MARKETPLACE_ADDRESS=${marketplace.address}`
        );
        
        // Add ledger address if not present
        if (!envContent.includes("ERYZA_LEDGER_ADDRESS")) {
            envContent += `ERYZA_LEDGER_ADDRESS=${ledger.address}\n`;
        } else {
            envContent = envContent.replace(
                /ERYZA_LEDGER_ADDRESS=.*/,
                `ERYZA_LEDGER_ADDRESS=${ledger.address}`
            );
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Updated .env file with contract addresses");
    } catch (error) {
        console.error("❌ Failed to update .env file:", error.message);
        console.log("\n📝 Please manually add these to your .env file:");
        console.log(`ERYZA_TOKEN_ADDRESS=${eryzaToken.address}`);
        console.log(`ERYZA_STAKING_ADDRESS=${eryzaStaking.address}`);
        console.log(`ERYZA_MARKETPLACE_ADDRESS=${marketplace.address}`);
        console.log(`ERYZA_LEDGER_ADDRESS=${ledger.address}`);
    }
    
    // Save deployment info JSON
    const deploymentInfo = {
        network: "fuji",
        chainId: 43113,
        timestamp: new Date().toISOString(),
        deployer: wallet.address,
        contracts: {
            EryzaToken: eryzaToken.address,
            EryzaStaking: eryzaStaking.address,
            EryzaComputeMarketplace: marketplace.address,
            EryzaJobsLedger: ledger.address
        },
        transactionHashes: {
            EryzaToken: eryzaToken.deployTransaction.hash,
            EryzaStaking: eryzaStaking.deployTransaction.hash,
            EryzaComputeMarketplace: marketplace.deployTransaction.hash,
            EryzaJobsLedger: ledger.deployTransaction.hash
        }
    };
    
    fs.writeFileSync(
        path.join(__dirname, "../../deployment-info.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("✅ Deployment info saved to deployment-info.json");
    console.log("\n🚀 Next steps:");
    console.log("1. Register your node: ./eryzaa-rental-cli register");
    console.log("2. Start rental service: ./eryzaa-rental-cli start");
    console.log("3. Check status: ./eryzaa-rental-cli status");
    console.log("\n🔗 View your contracts on Snowtrace:");
    console.log(`   EryzaToken: https://testnet.snowtrace.io/address/${eryzaToken.address}`);
    console.log(`   Marketplace: https://testnet.snowtrace.io/address/${marketplace.address}`);
    console.log(`   Ledger: https://testnet.snowtrace.io/address/${ledger.address}`);
}

main()
    .then(() => {
        console.log("\n✅ Deployment completed successfully! 🚀");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("\n💰 Insufficient AVAX for gas fees");
            console.log("   Get testnet AVAX from: https://faucet.avax.network/");
            console.log("   Your address:", process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY).address : "unknown");
        } else if (error.code === 'NETWORK_ERROR') {
            console.log("\n🌐 Network connection error");
            console.log("   Check your internet connection and try again");
        }
        
        process.exit(1);
    });
