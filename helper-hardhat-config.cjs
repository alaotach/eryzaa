
const networkConfig = {
    31337: {
        name: "localhost",
    },
    43113: {
        name: "fuji",
        blockConfirmations: 6,
    },
    43114: {
        name: "avalanche",
        blockConfirmations: 6,
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};