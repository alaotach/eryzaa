const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying Eryza contracts to Avalanche Fuji...");
    
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    try {
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log("Account balance:", hre.ethers.formatEther(balance), "AVAX");
        
        if (parseFloat(hre.ethers.formatEther(balance)) < 0.1) {
            console.log("⚠️  Low balance! You need more testnet AVAX");
            console.log("   Get some from: https://faucet.avax.network/");
            return;
        }
    } catch (error) {
        console.log("Could not check balance, continuing...");
    }
    
    // Deploy EryzaToken first
    console.log("\n1. Deploying EryzaToken...");
    
    const EryzaToken = await hre.ethers.getContractFactory("EryzaToken");
    const eryzaToken = await EryzaToken.deploy(
        deployer.address, // teamVesting (deployer for now)
        deployer.address, // investorVesting (deployer for now) 
        deployer.address, // communityRewards (deployer for now)
        deployer.address, // treasury (deployer for now)
        deployer.address  // liquidityPool (deployer for now)
    );
    
    await eryzaToken.waitForDeployment();
    const eryzaTokenAddress = await eryzaToken.getAddress();
    console.log("EryzaToken deployed to:", eryzaTokenAddress);
    
    // Deploy EryzaStaking
    console.log("\n2. Deploying EryzaStaking...");
    
    const EryzaStaking = await hre.ethers.getContractFactory("EryzaStaking");
    const eryzaStaking = await EryzaStaking.deploy(
        eryzaTokenAddress, // stake token
        eryzaTokenAddress  // reward token (same as stake token)
    );
    
    await eryzaStaking.waitForDeployment();
    const eryzaStakingAddress = await eryzaStaking.getAddress();
    console.log("EryzaStaking deployed to:", eryzaStakingAddress);
    
    // Deploy EryzaComputeMarketplace
    console.log("\n3. Deploying EryzaComputeMarketplace...");
    
    const EryzaComputeMarketplace = await hre.ethers.getContractFactory("EryzaComputeMarketplace");
    const marketplace = await EryzaComputeMarketplace.deploy(
        eryzaTokenAddress // payment token
    );
    
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("EryzaComputeMarketplace deployed to:", marketplaceAddress);
    
    // Deploy EryzaJobsLedger  
    console.log("\n4. Deploying EryzaJobsLedger...");
    
    const EryzaJobsLedger = await hre.ethers.getContractFactory("EryzaJobsLedger");
    const ledger = await EryzaJobsLedger.deploy(eryzaTokenAddress);
    
    await ledger.waitForDeployment();
    const ledgerAddress = await ledger.getAddress();
    console.log("EryzaJobsLedger deployed to:", ledgerAddress);
    
    // Set marketplace contract in ledger
    console.log("\n5. Setting up permissions...");
    
    try {
        await ledger.setMarketplaceContract(marketplaceAddress);
        console.log("Set marketplace contract in ledger");
    } catch (error) {
        console.log("Could not set marketplace contract:", error.message);
    }
    
    console.log("\n=== Deployment Summary ===");
    console.log("EryzaToken:", eryzaTokenAddress);
    console.log("EryzaStaking:", eryzaStakingAddress);
    console.log("EryzaComputeMarketplace:", marketplaceAddress);
    console.log("EryzaJobsLedger:", ledgerAddress);
    console.log("Deployer:", deployer.address);
    console.log("Network: Avalanche Fuji Testnet");
    
    // Save deployment info to .env file
    console.log("\n6. Updating .env file...");
    
    const envPath = path.join(__dirname, "../../.env");
    try {
        let envContent = fs.readFileSync(envPath, "utf8");
        
        // Update contract addresses
        envContent = envContent.replace(
            /ERYZA_TOKEN_ADDRESS=.*/,
            `ERYZA_TOKEN_ADDRESS=${eryzaTokenAddress}`
        );
        envContent = envContent.replace(
            /ERYZA_STAKING_ADDRESS=.*/,
            `ERYZA_STAKING_ADDRESS=${eryzaStakingAddress}`
        );
        envContent = envContent.replace(
            /ERYZA_MARKETPLACE_ADDRESS=.*/,
            `ERYZA_MARKETPLACE_ADDRESS=${marketplaceAddress}`
        );
        
        // Add ledger address if not present
        if (!envContent.includes("ERYZA_LEDGER_ADDRESS")) {
            envContent += `\nERYZA_LEDGER_ADDRESS=${ledgerAddress}\n`;
        } else {
            envContent = envContent.replace(
                /ERYZA_LEDGER_ADDRESS=.*/,
                `ERYZA_LEDGER_ADDRESS=${ledgerAddress}`
            );
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Updated .env file with contract addresses");
    } catch (error) {
        console.error("❌ Failed to update .env file:", error.message);
        console.log("\n📝 Please manually add these to your .env file:");
        console.log(`ERYZA_TOKEN_ADDRESS=${eryzaTokenAddress}`);
        console.log(`ERYZA_STAKING_ADDRESS=${eryzaStakingAddress}`);
        console.log(`ERYZA_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
        console.log(`ERYZA_LEDGER_ADDRESS=${ledgerAddress}`);
    }
    
    // Save deployment info JSON
    const deploymentInfo = {
        network: "fuji",
        chainId: 43113,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            EryzaToken: eryzaTokenAddress,
            EryzaStaking: eryzaStakingAddress,
            EryzaComputeMarketplace: marketplaceAddress,
            EryzaJobsLedger: ledgerAddress
        }
    };
    
    fs.writeFileSync(
        path.join(__dirname, "../../deployment-info.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n✅ Deployment completed successfully! 🚀");
    console.log("\n🚀 Next steps:");
    console.log("1. Register your node: ./eryzaa-rental-cli register");
    console.log("2. Start rental service: ./eryzaa-rental-cli start");
    console.log("3. Check status: ./eryzaa-rental-cli status");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
