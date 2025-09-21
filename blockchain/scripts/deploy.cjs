const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Eryza contracts to Avalanche...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "AVAX");
    
    // Deploy EryzaToken first
    console.log("\n1. Deploying EryzaToken...");
    
    const EryzaToken = await ethers.getContractFactory("EryzaToken");
    const eryzaToken = await EryzaToken.deploy(
        "0x1234567890123456789012345678901234567890", // teamVesting (placeholder)
        "0x2345678901234567890123456789012345678901", // investorVesting (placeholder)
        "0x3456789012345678901234567890123456789012", // communityRewards (placeholder)
        deployer.address, // treasury (deployer for now)
        deployer.address  // liquidityPool (deployer for now)
    );
    
    await eryzaToken.deployed();
    console.log("EryzaToken deployed to:", eryzaToken.address);
    
    // Deploy EryzaStaking
    console.log("\n2. Deploying EryzaStaking...");
    
    const EryzaStaking = await ethers.getContractFactory("EryzaStaking");
    const eryzaStaking = await EryzaStaking.deploy(
        eryzaToken.address, // stake token
        eryzaToken.address  // reward token (same as stake token)
    );
    
    await eryzaStaking.deployed();
    console.log("EryzaStaking deployed to:", eryzaStaking.address);
    
    // Deploy EryzaComputeMarketplace
    console.log("\n3. Deploying EryzaComputeMarketplace...");
    
    const EryzaComputeMarketplace = await ethers.getContractFactory("EryzaComputeMarketplace");
    const marketplace = await EryzaComputeMarketplace.deploy(
        eryzaToken.address // payment token
    );
    
    await marketplace.deployed();
    console.log("EryzaComputeMarketplace deployed to:", marketplace.address);
    
    // Add staking contract as minter
    console.log("\n4. Setting up permissions...");
    
    await eryzaToken.addMinter(eryzaStaking.address);
    console.log("Added EryzaStaking as minter");
    
    await eryzaToken.addMinter(marketplace.address);
    console.log("Added EryzaComputeMarketplace as minter");
    
    // Transfer some tokens to staking contract for rewards
    const rewardAmount = ethers.utils.parseEther("1000000"); // 1M tokens
    await eryzaToken.transfer(eryzaStaking.address, rewardAmount);
    console.log("Transferred", ethers.utils.formatEther(rewardAmount), "ERYZA to staking contract");
    
    console.log("\n=== Deployment Summary ===");
    console.log("EryzaToken:", eryzaToken.address);
    console.log("EryzaStaking:", eryzaStaking.address);
    console.log("EryzaComputeMarketplace:", marketplace.address);
    console.log("Deployer:", deployer.address);
    
    // Save deployment info
    const deploymentInfo = {
        network: "avalanche",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            EryzaToken: eryzaToken.address,
            EryzaStaking: eryzaStaking.address,
            EryzaComputeMarketplace: marketplace.address
        }
    };
    
    const fs = require("fs");
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment info saved to deployment-info.json");
    console.log("Deployment completed successfully! 🚀");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
