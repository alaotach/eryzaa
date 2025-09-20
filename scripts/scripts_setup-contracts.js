const { ethers } = require("hardhat");

async function main() {
    console.log("Setting up Eryza contracts...");

    // Get contract addresses from deployments
    const EryzaToken = await ethers.getContract("EryzaToken");
    const EryzaJobEscrow = await ethers.getContract("EryzaJobEscrow");

    console.log("EryzaToken address:", EryzaToken.address);
    console.log("EryzaJobEscrow address:", EryzaJobEscrow.address);

    // Setup initial configuration
    const defaultDuration = 24 * 60 * 60; // 24 hours
    const minAmount = ethers.utils.parseEther("1"); // 1 ERY
    const platformFee = parseInt(process.env.PLATFORM_FEE_PERCENT) || 250; // 2.5%
    const disputeWindow = 7 * 24 * 60 * 60; // 7 days

    console.log("Updating JobEscrow configuration...");
    const configTx = await EryzaJobEscrow.updateConfiguration(
        defaultDuration,
        minAmount,
        platformFee,
        disputeWindow
    );
    await configTx.wait();

    console.log("✅ Setup completed successfully!");
    console.log(`- Default job duration: ${defaultDuration / 3600} hours`);
    console.log(`- Minimum job amount: ${ethers.utils.formatEther(minAmount)} ERY`);
    console.log(`- Platform fee: ${platformFee / 100}%`);
    console.log(`- Dispute window: ${disputeWindow / (24 * 3600)} days`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });