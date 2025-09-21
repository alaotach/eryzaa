// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EryzaComputeMarketplace
 * @dev Smart contract for managing compute resource marketplace on Avalanche
 */
contract EryzaComputeMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event ComputeNodeRegistered(address indexed provider, uint256 indexed nodeId, uint256 pricePerHour);
    event ComputeJobCreated(uint256 indexed jobId, address indexed client, uint256 indexed nodeId, uint256 duration);
    event ComputeJobStarted(uint256 indexed jobId, uint256 startTime);
    event ComputeJobCompleted(uint256 indexed jobId, uint256 endTime);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event DisputeRaised(uint256 indexed jobId, address indexed raiser, string reason);
    event DisputeResolved(uint256 indexed jobId, bool favorProvider);

    // Structs
    struct ComputeNode {
        address provider;
        string nodeType; // "ssh", "training", "edge"
        uint256 cpuCores;
        uint256 memoryGB;
        uint256 gpuCount;
        string gpuType;
        uint256 pricePerHour; // in wei
        bool available;
        uint256 totalJobs;
        uint256 successfulJobs;
        string endpoint; // ZeroTier IP or connection string
    }

    struct ComputeJob {
        uint256 nodeId;
        address client;
        address provider;
        uint256 duration; // in hours
        uint256 totalCost;
        uint256 startTime;
        uint256 endTime;
        JobStatus status;
        string jobType; // "ssh", "training", "inference", "edge"
        string jobConfig; // IPFS hash or config string
        bool disputed;
        address disputer;
        string disputeReason;
    }

    enum JobStatus {
        Created,
        Funded,
        Started,
        Completed,
        Cancelled,
        Disputed
    }

    // State variables
    IERC20 public paymentToken; // AVAX or wrapped AVAX
    uint256 public constant PLATFORM_FEE_PERCENT = 250; // 2.5%
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public disputeTimeWindow = 24 hours;
    
    uint256 private nextNodeId = 1;
    uint256 private nextJobId = 1;
    
    mapping(uint256 => ComputeNode) public computeNodes;
    mapping(uint256 => ComputeJob) public computeJobs;
    mapping(address => uint256[]) public providerNodes;
    mapping(address => uint256[]) public clientJobs;
    mapping(uint256 => uint256) public nodeActiveJobs;
    
    // Escrow balances
    mapping(uint256 => uint256) public jobEscrow;
    
    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev Register a new compute node
     */
    function registerComputeNode(
        string memory nodeType,
        uint256 cpuCores,
        uint256 memoryGB,
        uint256 gpuCount,
        string memory gpuType,
        uint256 pricePerHour,
        string memory endpoint
    ) external returns (uint256) {
        require(pricePerHour > 0, "Price must be greater than 0");
        require(cpuCores > 0, "CPU cores must be greater than 0");
        require(memoryGB > 0, "Memory must be greater than 0");

        uint256 nodeId = nextNodeId++;
        
        computeNodes[nodeId] = ComputeNode({
            provider: msg.sender,
            nodeType: nodeType,
            cpuCores: cpuCores,
            memoryGB: memoryGB,
            gpuCount: gpuCount,
            gpuType: gpuType,
            pricePerHour: pricePerHour,
            available: true,
            totalJobs: 0,
            successfulJobs: 0,
            endpoint: endpoint
        });
        
        providerNodes[msg.sender].push(nodeId);
        
        emit ComputeNodeRegistered(msg.sender, nodeId, pricePerHour);
        
        return nodeId;
    }

    /**
     * @dev Update compute node availability
     */
    function updateNodeAvailability(uint256 nodeId, bool available) external {
        require(computeNodes[nodeId].provider == msg.sender, "Not node owner");
        computeNodes[nodeId].available = available;
    }

    /**
     * @dev Update compute node pricing
     */
    function updateNodePrice(uint256 nodeId, uint256 newPrice) external {
        require(computeNodes[nodeId].provider == msg.sender, "Not node owner");
        require(newPrice > 0, "Price must be greater than 0");
        computeNodes[nodeId].pricePerHour = newPrice;
    }

    /**
     * @dev Create a new compute job
     */
    function createComputeJob(
        uint256 nodeId,
        uint256 duration,
        string memory jobType,
        string memory jobConfig
    ) external returns (uint256) {
        require(computeNodes[nodeId].available, "Node not available");
        require(duration > 0, "Duration must be greater than 0");
        
        ComputeNode storage node = computeNodes[nodeId];
        uint256 totalCost = node.pricePerHour * duration;
        uint256 platformFee = (totalCost * PLATFORM_FEE_PERCENT) / BASIS_POINTS;
        uint256 totalAmount = totalCost + platformFee;
        
        uint256 jobId = nextJobId++;
        
        computeJobs[jobId] = ComputeJob({
            nodeId: nodeId,
            client: msg.sender,
            provider: node.provider,
            duration: duration,
            totalCost: totalCost,
            startTime: 0,
            endTime: 0,
            status: JobStatus.Created,
            jobType: jobType,
            jobConfig: jobConfig,
            disputed: false,
            disputer: address(0),
            disputeReason: ""
        });
        
        clientJobs[msg.sender].push(jobId);
        
        // Transfer payment to escrow
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        jobEscrow[jobId] = totalAmount;
        
        computeJobs[jobId].status = JobStatus.Funded;
        
        emit ComputeJobCreated(jobId, msg.sender, nodeId, duration);
        
        return jobId;
    }

    /**
     * @dev Start a compute job (called by provider)
     */
    function startComputeJob(uint256 jobId) external {
        ComputeJob storage job = computeJobs[jobId];
        require(job.provider == msg.sender, "Not job provider");
        require(job.status == JobStatus.Funded, "Job not funded");
        
        job.startTime = block.timestamp;
        job.status = JobStatus.Started;
        
        // Mark node as busy
        nodeActiveJobs[job.nodeId]++;
        
        emit ComputeJobStarted(jobId, block.timestamp);
    }

    /**
     * @dev Complete a compute job (called by client or automatically)
     */
    function completeComputeJob(uint256 jobId) external {
        ComputeJob storage job = computeJobs[jobId];
        require(
            job.client == msg.sender || job.provider == msg.sender,
            "Not authorized"
        );
        require(job.status == JobStatus.Started, "Job not started");
        
        job.endTime = block.timestamp;
        job.status = JobStatus.Completed;
        
        // Release node
        nodeActiveJobs[job.nodeId]--;
        
        // Update node statistics
        ComputeNode storage node = computeNodes[job.nodeId];
        node.totalJobs++;
        node.successfulJobs++;
        
        emit ComputeJobCompleted(jobId, block.timestamp);
        
        // Release payment after dispute window
        _schedulePaymentRelease(jobId);
    }

    /**
     * @dev Release payment to provider
     */
    function releasePayment(uint256 jobId) external nonReentrant {
        ComputeJob storage job = computeJobs[jobId];
        require(job.status == JobStatus.Completed, "Job not completed");
        require(!job.disputed, "Job disputed");
        require(
            block.timestamp >= job.endTime + disputeTimeWindow || 
            msg.sender == job.client,
            "Dispute window not passed"
        );
        
        uint256 escrowAmount = jobEscrow[jobId];
        require(escrowAmount > 0, "Payment already released");
        
        jobEscrow[jobId] = 0;
        
        uint256 platformFee = (job.totalCost * PLATFORM_FEE_PERCENT) / BASIS_POINTS;
        uint256 providerAmount = job.totalCost;
        
        // Transfer to provider and platform
        paymentToken.safeTransfer(job.provider, providerAmount);
        paymentToken.safeTransfer(owner(), platformFee);
        
        emit PaymentReleased(jobId, job.provider, providerAmount);
    }

    /**
     * @dev Raise a dispute
     */
    function raiseDispute(uint256 jobId, string memory reason) external {
        ComputeJob storage job = computeJobs[jobId];
        require(
            job.client == msg.sender || job.provider == msg.sender,
            "Not authorized"
        );
        require(job.status == JobStatus.Completed, "Job not completed");
        require(!job.disputed, "Already disputed");
        require(
            block.timestamp <= job.endTime + disputeTimeWindow,
            "Dispute window passed"
        );
        
        job.disputed = true;
        job.disputer = msg.sender;
        job.disputeReason = reason;
        
        emit DisputeRaised(jobId, msg.sender, reason);
    }

    /**
     * @dev Resolve dispute (called by platform admin)
     */
    function resolveDispute(uint256 jobId, bool favorProvider) external onlyOwner {
        ComputeJob storage job = computeJobs[jobId];
        require(job.disputed, "No dispute");
        
        uint256 escrowAmount = jobEscrow[jobId];
        require(escrowAmount > 0, "Payment already released");
        
        jobEscrow[jobId] = 0;
        
        if (favorProvider) {
            // Pay provider
            uint256 platformFee = (job.totalCost * PLATFORM_FEE_PERCENT) / BASIS_POINTS;
            paymentToken.safeTransfer(job.provider, job.totalCost);
            paymentToken.safeTransfer(owner(), platformFee);
            
            // Update node statistics
            ComputeNode storage node = computeNodes[job.nodeId];
            node.successfulJobs++;
        } else {
            // Refund client
            paymentToken.safeTransfer(job.client, escrowAmount);
        }
        
        emit DisputeResolved(jobId, favorProvider);
    }

    /**
     * @dev Cancel job before it starts
     */
    function cancelJob(uint256 jobId) external {
        ComputeJob storage job = computeJobs[jobId];
        require(job.client == msg.sender, "Not job client");
        require(job.status == JobStatus.Funded, "Cannot cancel");
        
        job.status = JobStatus.Cancelled;
        
        // Refund client
        uint256 escrowAmount = jobEscrow[jobId];
        jobEscrow[jobId] = 0;
        paymentToken.safeTransfer(job.client, escrowAmount);
    }

    /**
     * @dev Get available nodes by type
     */
    function getAvailableNodes(string memory nodeType) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = 0;
        
        // Count available nodes of specified type
        for (uint256 i = 1; i < nextNodeId; i++) {
            if (computeNodes[i].available && 
                keccak256(bytes(computeNodes[i].nodeType)) == keccak256(bytes(nodeType))) {
                count++;
            }
        }
        
        uint256[] memory availableNodes = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextNodeId; i++) {
            if (computeNodes[i].available && 
                keccak256(bytes(computeNodes[i].nodeType)) == keccak256(bytes(nodeType))) {
                availableNodes[index] = i;
                index++;
            }
        }
        
        return availableNodes;
    }

    /**
     * @dev Get node information
     */
    function getNodeInfo(uint256 nodeId) 
        external 
        view 
        returns (ComputeNode memory) 
    {
        return computeNodes[nodeId];
    }

    /**
     * @dev Get job information
     */
    function getJobInfo(uint256 jobId) 
        external 
        view 
        returns (ComputeJob memory) 
    {
        return computeJobs[jobId];
    }

    /**
     * @dev Get provider's nodes
     */
    function getProviderNodes(address provider) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return providerNodes[provider];
    }

    /**
     * @dev Get client's jobs
     */
    function getClientJobs(address client) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return clientJobs[client];
    }

    /**
     * @dev Internal function to schedule payment release
     */
    function _schedulePaymentRelease(uint256 jobId) internal {
        // In a more sophisticated implementation, this could trigger
        // an external oracle or time-based release mechanism
    }

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function updatePlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 1000, "Fee too high"); // Max 10%
        // Would need to update PLATFORM_FEE_PERCENT constant in upgraded version
    }

    /**
     * @dev Update dispute time window (only owner)
     */
    function updateDisputeTimeWindow(uint256 newWindow) external onlyOwner {
        disputeTimeWindow = newWindow;
    }
}
