// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- Import OpenZeppelin Libraries ---
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// --- Optional: AccessControl for granular roles (can replace Ownable) ---
// import "@openzeppelin/contracts/access/AccessControl.sol";

// --- EryzaToken Contract ---
contract EryzaToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // --- GPU Rental Storage ---
    struct GPURental {
        string gpuId;
        address renter;
        address gpuOwner;
        uint256 pricePerHour;
        uint256 rentalStart;
        uint256 rentalDuration;
        uint256 totalCost;
        bool active;
        bool completed;
    }
    
    // --- Escrow Storage ---
    struct JobEscrow {
        uint256 amount;
        address user;
        address provider;
        bool locked;
        bool released;
        bool refunded;
    }

    // jobId => escrow details
    mapping(bytes32 => JobEscrow) public jobEscrows;
    
    // GPU rental management
    mapping(bytes32 => GPURental) public gpuRentals;  // rentalId => rental details
    mapping(string => bool) public gpuAvailable;      // gpuId => available
    mapping(address => bytes32[]) public userRentals; // user => rental IDs
    
    // GPU Subnet Manager contract address
    address public gpuSubnetManager;

    // --- Events ---
    event TokensLocked(bytes32 indexed jobId, address indexed user, address indexed provider, uint256 amount);
    event TokensReleased(bytes32 indexed jobId, address indexed provider, uint256 amount);
    event TokensRefunded(bytes32 indexed jobId, address indexed user, uint256 amount);
    
    // GPU rental events
    event GPURented(bytes32 indexed rentalId, string gpuId, address indexed renter, uint256 totalCost);
    event GPURentalCompleted(bytes32 indexed rentalId, string gpuId);
    event GPURentalCancelled(bytes32 indexed rentalId, string gpuId);

    // --- Constructor ---
    constructor(uint256 initialSupply) ERC20("Eryza Token", "ERY") {
        _mint(msg.sender, initialSupply);
        // Mark all GPUs as available initially
    }

    // --- Core ERC-20 features (inherited) ---

    // --- Job-based Escrow Functions ---

    /**
     * @notice Locks tokens for a job. Transfers from user to contract.
     * @param jobId Unique job identifier
     * @param amount Amount of tokens to lock
     * @param provider Provider address for the job
     */
    function lockTokens(bytes32 jobId, uint256 amount, address provider) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(jobEscrows[jobId].locked == false, "Job already locked");

        // Transfer tokens from user to contract as escrow
        _transfer(msg.sender, address(this), amount);

        // Store escrow
        jobEscrows[jobId] = JobEscrow({
            amount: amount,
            user: msg.sender,
            provider: provider,
            locked: true,
            released: false,
            refunded: false
        });

        emit TokensLocked(jobId, msg.sender, provider, amount);
    }

    /**
     * @notice Releases escrowed tokens to provider upon job completion.
     * Should be called by a trusted verifier or via proof-of-compute.
     */
    function releaseTokens(bytes32 jobId) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked, "Escrow not found");
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");

        // Transfer tokens to provider
        _transfer(address(this), escrow.provider, escrow.amount);
        escrow.released = true;

        emit TokensReleased(jobId, escrow.provider, escrow.amount);
    }

    /**
     * @notice Refunds tokens to user if job canceled or failed.
     * Can only refund if not released.
     */
    function refundTokens(bytes32 jobId) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked, "Escrow not found");
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");

        // Transfer tokens back to user
        _transfer(address(this), escrow.user, escrow.amount);
        escrow.refunded = true;

        emit TokensRefunded(jobId, escrow.user, escrow.amount);
    }

    /**
     * @notice Set GPU Subnet Manager contract address
     */
    function setGPUSubnetManager(address _gpuSubnetManager) external onlyOwner {
        gpuSubnetManager = _gpuSubnetManager;
    }

    /**
     * @notice Rent GPU with token payment
     */
    function rentGPU(
        string memory gpuId,
        address gpuOwner,
        uint256 pricePerHour,
        uint256 rentalDuration
    ) external nonReentrant whenNotPaused returns (bytes32 rentalId) {
        require(gpuAvailable[gpuId], "GPU not available");
        require(pricePerHour > 0 && rentalDuration > 0, "Invalid rental params");
        
        uint256 totalCost = pricePerHour * rentalDuration;
        require(balanceOf(msg.sender) >= totalCost, "Insufficient balance");
        
        // Generate rental ID
        rentalId = keccak256(abi.encodePacked(gpuId, msg.sender, block.timestamp));
        
        // Transfer tokens to escrow
        _transfer(msg.sender, address(this), totalCost);
        
        // Create rental record
        gpuRentals[rentalId] = GPURental({
            gpuId: gpuId,
            renter: msg.sender,
            gpuOwner: gpuOwner,
            pricePerHour: pricePerHour,
            rentalStart: block.timestamp,
            rentalDuration: rentalDuration,
            totalCost: totalCost,
            active: true,
            completed: false
        });
        
        userRentals[msg.sender].push(rentalId);
        gpuAvailable[gpuId] = false;
        
        // Notify GPU Subnet Manager if set
        if (gpuSubnetManager != address(0)) {
            // Interface call would go here
        }
        
        emit GPURented(rentalId, gpuId, msg.sender, totalCost);
        return rentalId;
    }

    /**
     * @notice Complete GPU rental and release payment
     */
    function completeGPURental(bytes32 rentalId) external nonReentrant whenNotPaused {
        GPURental storage rental = gpuRentals[rentalId];
        require(rental.active, "Rental not active");
        require(
            msg.sender == rental.renter || 
            msg.sender == rental.gpuOwner || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        // Calculate payment based on actual usage
        uint256 actualDuration = block.timestamp - rental.rentalStart;
        uint256 maxDuration = rental.rentalDuration;
        uint256 usedDuration = actualDuration > maxDuration ? maxDuration : actualDuration;
        
        uint256 payment = (rental.pricePerHour * usedDuration) / 3600; // Convert to seconds
        uint256 refund = rental.totalCost - payment;
        
        // Transfer payment to GPU owner
        if (payment > 0) {
            _transfer(address(this), rental.gpuOwner, payment);
        }
        
        // Refund remaining to renter
        if (refund > 0) {
            _transfer(address(this), rental.renter, refund);
        }
        
        rental.active = false;
        rental.completed = true;
        gpuAvailable[rental.gpuId] = true;
        
        emit GPURentalCompleted(rentalId, rental.gpuId);
    }

    /**
     * @notice Cancel GPU rental and refund
     */
    function cancelGPURental(bytes32 rentalId) external nonReentrant whenNotPaused {
        GPURental storage rental = gpuRentals[rentalId];
        require(rental.active, "Rental not active");
        require(
            msg.sender == rental.renter || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        // Refund to renter
        _transfer(address(this), rental.renter, rental.totalCost);
        
        rental.active = false;
        gpuAvailable[rental.gpuId] = true;
        
        emit GPURentalCancelled(rentalId, rental.gpuId);
    }

    /**
     * @notice Partial refund for job that is partially completed.
     * @param jobId Unique job identifier
     * @param refundAmount Amount to refund to user
     */
    function partialRefund(bytes32 jobId, uint256 refundAmount) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked, "Escrow not found");
        require(!escrow.released, "Already released");
        require(!escrow.refunded, "Already refunded");
        require(refundAmount > 0 && refundAmount < escrow.amount, "Invalid refund");

        // Refund part to user, remainder to provider
        uint256 providerAmount = escrow.amount - refundAmount;
        _transfer(address(this), escrow.user, refundAmount);
        _transfer(address(this), escrow.provider, providerAmount);

        escrow.released = true; // Mark as settled
        emit TokensRefunded(jobId, escrow.user, refundAmount);
        emit TokensReleased(jobId, escrow.provider, providerAmount);
    }

    // --- Emergency Stop / Admin Functions ---
    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Mint/Burn (Optional) ---
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    // --- Override ERC-20 transfer functions if needed for pause ---
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal override
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "Token transfers are paused");
    }

    // --- Future Extensions ---
    // Staking, batch payments, off-chain signatures, provider registry, etc.
}