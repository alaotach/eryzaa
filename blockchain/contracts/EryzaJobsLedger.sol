// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EryzaJobsLedger
 * @dev Comprehensive job tracking and analytics ledger for Eryza platform
 * @author Eryza Team
 */
contract EryzaJobsLedger is Ownable, ReentrancyGuard {
    
    // Job execution phases
    enum JobPhase {
        Submitted,      // 0 - Job submitted to ledger
        Funded,         // 1 - Payment escrowed
        Assigned,       // 2 - Assigned to compute node
        Running,        // 3 - Currently executing
        Validating,     // 4 - Output validation in progress
        Completed,      // 5 - Successfully completed
        Failed,         // 6 - Failed during execution
        Disputed,       // 7 - Under dispute resolution
        Cancelled,      // 8 - Cancelled by client
        Refunded        // 9 - Payment refunded
    }

    // Job priority levels
    enum Priority {
        Low,        // 0 - Standard processing
        Normal,     // 1 - Default priority
        High,       // 2 - Expedited processing
        Urgent      // 3 - Highest priority
    }

    // Job execution results
    enum ExecutionResult {
        Pending,        // 0 - Not yet executed
        Success,        // 1 - Completed successfully
        Failed,         // 2 - Execution failed
        TimedOut,       // 3 - Exceeded time limit
        Cancelled,      // 4 - Cancelled by user
        NodeOffline,    // 5 - Node went offline
        InvalidOutput   // 6 - Output validation failed
    }

    // Comprehensive job record
    struct JobRecord {
        uint256 jobId;
        address client;
        address provider;
        uint256 nodeId;
        string jobType;          // "training", "inference", "compute", "ssh"
        string jobDescription;
        string inputDataHash;    // IPFS hash of input data
        string outputDataHash;   // IPFS hash of output data
        string configHash;       // IPFS hash of job configuration
        uint256 estimatedDuration; // In seconds
        uint256 actualDuration;    // Actual execution time
        uint256 totalCost;         // Total cost in wei
        uint256 submitTime;
        uint256 startTime;
        uint256 endTime;
        JobPhase currentPhase;
        Priority priority;
        ExecutionResult result;
        uint8 qualityScore;      // 0-100 quality rating
        bool isPrivate;          // Privacy flag
        string metadata;         // Additional metadata JSON
    }

    // Job execution metrics
    struct ExecutionMetrics {
        uint256 cpuUsage;        // Average CPU usage %
        uint256 memoryUsage;     // Average memory usage %
        uint256 gpuUsage;        // Average GPU usage %
        uint256 networkIO;       // Network I/O in bytes
        uint256 diskIO;          // Disk I/O in bytes
        uint256 energyConsumed;  // Energy consumption in Wh
        string performanceData;  // Additional performance JSON
    }

    // Node performance analytics
    struct NodePerformance {
        uint256 totalJobs;
        uint256 successfulJobs;
        uint256 failedJobs;
        uint256 totalRevenue;
        uint256 totalExecutionTime;
        uint256 averageQualityScore;
        uint256 uptime;          // Total uptime in seconds
        uint256 lastActiveTime;
        uint8 reliabilityScore;  // 0-100 reliability rating
    }

    // Client usage analytics
    struct ClientAnalytics {
        uint256 totalJobsSubmitted;
        uint256 totalSpent;
        uint256 totalExecutionTime;
        uint256 averageJobDuration;
        uint256 successfulJobs;
        uint256 lastActivity;
        uint8 reputationScore;   // 0-100 reputation rating
    }

    // Events
    event JobSubmitted(
        uint256 indexed jobId,
        address indexed client,
        string jobType,
        Priority priority,
        uint256 estimatedDuration
    );
    
    event JobPhaseChanged(
        uint256 indexed jobId,
        JobPhase oldPhase,
        JobPhase newPhase,
        uint256 timestamp
    );
    
    event JobAssigned(
        uint256 indexed jobId,
        address indexed provider,
        uint256 indexed nodeId,
        uint256 assignedTime
    );
    
    event JobExecutionStarted(
        uint256 indexed jobId,
        uint256 startTime
    );
    
    event JobCompleted(
        uint256 indexed jobId,
        ExecutionResult result,
        uint256 actualDuration,
        uint8 qualityScore
    );
    
    event MetricsRecorded(
        uint256 indexed jobId,
        uint256 cpuUsage,
        uint256 memoryUsage,
        uint256 gpuUsage
    );
    
    event QualityScoreUpdated(
        uint256 indexed jobId,
        uint8 oldScore,
        uint8 newScore,
        address scorer
    );

    // State variables
    uint256 public nextJobId = 1;
    address public marketplaceContract;
    IERC20 public eryzeToken;
    
    // Mappings
    mapping(uint256 => JobRecord) public jobs;
    mapping(uint256 => ExecutionMetrics) public executionMetrics;
    mapping(address => NodePerformance) public nodePerformance;
    mapping(address => ClientAnalytics) public clientAnalytics;
    mapping(uint256 => address[]) public jobValidators; // Validators for job quality
    
    // Job phase history tracking
    mapping(uint256 => JobPhase[]) public jobPhaseHistory;
    mapping(uint256 => uint256[]) public jobPhaseTimestamps;
    
    // Analytics arrays
    mapping(address => uint256[]) public clientJobHistory;
    mapping(address => uint256[]) public providerJobHistory;
    mapping(uint256 => uint256[]) public nodeJobHistory;
    
    // Quality and reputation
    mapping(uint256 => mapping(address => uint8)) public jobRatings;
    mapping(address => uint8) public providerReputation;
    mapping(address => uint8) public clientReputation;

    // Modifiers
    modifier onlyMarketplace() {
        require(msg.sender == marketplaceContract, "Only marketplace can call");
        _;
    }

    modifier onlyJobParticipant(uint256 jobId) {
        JobRecord memory job = jobs[jobId];
        require(
            msg.sender == job.client || 
            msg.sender == job.provider || 
            msg.sender == marketplaceContract,
            "Not authorized"
        );
        _;
    }

    constructor(address _eryzeToken) Ownable(msg.sender) {
        eryzeToken = IERC20(_eryzeToken);
    }

    /**
     * @dev Set the marketplace contract address
     */
    function setMarketplaceContract(address _marketplace) external onlyOwner {
        marketplaceContract = _marketplace;
    }

    /**
     * @dev Submit a new job to the ledger
     */
    function submitJob(
        address client,
        string memory jobType,
        string memory description,
        string memory inputDataHash,
        string memory configHash,
        uint256 estimatedDuration,
        uint256 totalCost,
        Priority priority,
        bool isPrivate,
        string memory metadata
    ) external onlyMarketplace returns (uint256) {
        
        uint256 jobId = nextJobId++;
        
        jobs[jobId] = JobRecord({
            jobId: jobId,
            client: client,
            provider: address(0),
            nodeId: 0,
            jobType: jobType,
            jobDescription: description,
            inputDataHash: inputDataHash,
            outputDataHash: "",
            configHash: configHash,
            estimatedDuration: estimatedDuration,
            actualDuration: 0,
            totalCost: totalCost,
            submitTime: block.timestamp,
            startTime: 0,
            endTime: 0,
            currentPhase: JobPhase.Submitted,
            priority: priority,
            result: ExecutionResult.Pending,
            qualityScore: 0,
            isPrivate: isPrivate,
            metadata: metadata
        });

        // Initialize phase history
        jobPhaseHistory[jobId].push(JobPhase.Submitted);
        jobPhaseTimestamps[jobId].push(block.timestamp);
        
        // Update client analytics
        clientJobHistory[client].push(jobId);
        clientAnalytics[client].totalJobsSubmitted++;
        clientAnalytics[client].totalSpent += totalCost;
        clientAnalytics[client].lastActivity = block.timestamp;

        emit JobSubmitted(jobId, client, jobType, priority, estimatedDuration);
        
        return jobId;
    }

    /**
     * @dev Update job phase
     */
    function updateJobPhase(uint256 jobId, JobPhase newPhase) 
        external 
        onlyJobParticipant(jobId) 
    {
        JobRecord storage job = jobs[jobId];
        JobPhase oldPhase = job.currentPhase;
        
        require(oldPhase != newPhase, "Phase unchanged");
        require(_isValidPhaseTransition(oldPhase, newPhase), "Invalid phase transition");
        
        job.currentPhase = newPhase;
        
        // Record phase history
        jobPhaseHistory[jobId].push(newPhase);
        jobPhaseTimestamps[jobId].push(block.timestamp);
        
        emit JobPhaseChanged(jobId, oldPhase, newPhase, block.timestamp);
    }

    /**
     * @dev Assign job to a provider and node
     */
    function assignJob(
        uint256 jobId,
        address provider,
        uint256 nodeId
    ) external onlyMarketplace {
        
        JobRecord storage job = jobs[jobId];
        require(job.currentPhase == JobPhase.Funded, "Job must be funded");
        
        job.provider = provider;
        job.nodeId = nodeId;
        job.currentPhase = JobPhase.Assigned;
        
        // Update provider job history
        providerJobHistory[provider].push(jobId);
        nodeJobHistory[nodeId].push(jobId);
        
        // Record phase change
        jobPhaseHistory[jobId].push(JobPhase.Assigned);
        jobPhaseTimestamps[jobId].push(block.timestamp);
        
        emit JobAssigned(jobId, provider, nodeId, block.timestamp);
    }

    /**
     * @dev Start job execution
     */
    function startJobExecution(uint256 jobId) external {
        JobRecord storage job = jobs[jobId];
        require(msg.sender == job.provider, "Only provider can start");
        require(job.currentPhase == JobPhase.Assigned, "Job must be assigned");
        
        job.startTime = block.timestamp;
        job.currentPhase = JobPhase.Running;
        
        // Record phase change
        jobPhaseHistory[jobId].push(JobPhase.Running);
        jobPhaseTimestamps[jobId].push(block.timestamp);
        
        emit JobExecutionStarted(jobId, block.timestamp);
    }

    /**
     * @dev Complete job execution
     */
    function completeJob(
        uint256 jobId,
        ExecutionResult result,
        string memory outputDataHash,
        uint8 qualityScore
    ) external {
        JobRecord storage job = jobs[jobId];
        require(msg.sender == job.provider, "Only provider can complete");
        require(job.currentPhase == JobPhase.Running, "Job must be running");
        require(qualityScore <= 100, "Invalid quality score");
        
        job.endTime = block.timestamp;
        job.actualDuration = job.endTime - job.startTime;
        job.result = result;
        job.outputDataHash = outputDataHash;
        job.qualityScore = qualityScore;
        
        // Update phase based on result
        if (result == ExecutionResult.Success) {
            job.currentPhase = JobPhase.Completed;
            nodePerformance[job.provider].successfulJobs++;
            clientAnalytics[job.client].successfulJobs++;
        } else {
            job.currentPhase = JobPhase.Failed;
            nodePerformance[job.provider].failedJobs++;
        }
        
        // Update node performance
        NodePerformance storage perf = nodePerformance[job.provider];
        perf.totalJobs++;
        perf.totalExecutionTime += job.actualDuration;
        perf.totalRevenue += job.totalCost;
        perf.lastActiveTime = block.timestamp;
        
        // Update average quality score
        if (perf.totalJobs > 0) {
            perf.averageQualityScore = (perf.averageQualityScore * (perf.totalJobs - 1) + qualityScore) / perf.totalJobs;
        }
        
        // Update client analytics
        ClientAnalytics storage clientStats = clientAnalytics[job.client];
        clientStats.totalExecutionTime += job.actualDuration;
        if (clientStats.totalJobsSubmitted > 0) {
            clientStats.averageJobDuration = clientStats.totalExecutionTime / clientStats.totalJobsSubmitted;
        }
        
        // Record phase change
        jobPhaseHistory[jobId].push(job.currentPhase);
        jobPhaseTimestamps[jobId].push(block.timestamp);
        
        emit JobCompleted(jobId, result, job.actualDuration, qualityScore);
    }

    /**
     * @dev Record execution metrics during job execution
     */
    function recordExecutionMetrics(
        uint256 jobId,
        uint256 cpuUsage,
        uint256 memoryUsage,
        uint256 gpuUsage,
        uint256 networkIO,
        uint256 diskIO,
        uint256 energyConsumed,
        string memory performanceData
    ) external {
        JobRecord memory job = jobs[jobId];
        require(msg.sender == job.provider, "Only provider can record metrics");
        require(job.currentPhase == JobPhase.Running, "Job must be running");
        
        executionMetrics[jobId] = ExecutionMetrics({
            cpuUsage: cpuUsage,
            memoryUsage: memoryUsage,
            gpuUsage: gpuUsage,
            networkIO: networkIO,
            diskIO: diskIO,
            energyConsumed: energyConsumed,
            performanceData: performanceData
        });
        
        emit MetricsRecorded(jobId, cpuUsage, memoryUsage, gpuUsage);
    }

    /**
     * @dev Rate job quality (can be called by client or validators)
     */
    function rateJobQuality(uint256 jobId, uint8 rating) external {
        JobRecord storage job = jobs[jobId];
        require(
            msg.sender == job.client || _isValidator(jobId, msg.sender),
            "Not authorized to rate"
        );
        require(rating <= 100, "Invalid rating");
        require(job.currentPhase == JobPhase.Completed, "Job not completed");
        
        uint8 oldScore = job.qualityScore;
        jobRatings[jobId][msg.sender] = rating;
        
        // Recalculate average quality score
        job.qualityScore = _calculateAverageRating(jobId);
        
        emit QualityScoreUpdated(jobId, oldScore, job.qualityScore, msg.sender);
    }

    /**
     * @dev Add validator for job quality assessment
     */
    function addJobValidator(uint256 jobId, address validator) external onlyOwner {
        jobValidators[jobId].push(validator);
    }

    /**
     * @dev Get job details
     */
    function getJob(uint256 jobId) external view returns (JobRecord memory) {
        return jobs[jobId];
    }

    /**
     * @dev Get job execution metrics
     */
    function getJobMetrics(uint256 jobId) external view returns (ExecutionMetrics memory) {
        return executionMetrics[jobId];
    }

    /**
     * @dev Get job phase history
     */
    function getJobPhaseHistory(uint256 jobId) 
        external 
        view 
        returns (JobPhase[] memory phases, uint256[] memory timestamps) 
    {
        return (jobPhaseHistory[jobId], jobPhaseTimestamps[jobId]);
    }

    /**
     * @dev Get node performance analytics
     */
    function getNodePerformance(address provider) external view returns (NodePerformance memory) {
        return nodePerformance[provider];
    }

    /**
     * @dev Get client analytics
     */
    function getClientAnalytics(address client) external view returns (ClientAnalytics memory) {
        return clientAnalytics[client];
    }

    /**
     * @dev Get client's job history
     */
    function getClientJobHistory(address client) external view returns (uint256[] memory) {
        return clientJobHistory[client];
    }

    /**
     * @dev Get provider's job history
     */
    function getProviderJobHistory(address provider) external view returns (uint256[] memory) {
        return providerJobHistory[provider];
    }

    /**
     * @dev Get node's job history
     */
    function getNodeJobHistory(uint256 nodeId) external view returns (uint256[] memory) {
        return nodeJobHistory[nodeId];
    }

    /**
     * @dev Get jobs by status
     */
    function getJobsByPhase(JobPhase phase) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count jobs with the specified phase
        for (uint256 i = 1; i < nextJobId; i++) {
            if (jobs[i].currentPhase == phase) {
                count++;
            }
        }
        
        uint256[] memory jobIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextJobId; i++) {
            if (jobs[i].currentPhase == phase) {
                jobIds[index] = i;
                index++;
            }
        }
        
        return jobIds;
    }

    /**
     * @dev Get platform analytics
     */
    function getPlatformAnalytics() 
        external 
        view 
        returns (
            uint256 totalJobs,
            uint256 completedJobs,
            uint256 failedJobs,
            uint256 totalRevenue,
            uint256 averageJobDuration
        ) 
    {
        totalJobs = nextJobId - 1;
        uint256 totalDuration = 0;
        
        for (uint256 i = 1; i < nextJobId; i++) {
            JobRecord memory job = jobs[i];
            if (job.currentPhase == JobPhase.Completed) {
                completedJobs++;
                totalDuration += job.actualDuration;
            } else if (job.currentPhase == JobPhase.Failed) {
                failedJobs++;
            }
            totalRevenue += job.totalCost;
        }
        
        if (completedJobs > 0) {
            averageJobDuration = totalDuration / completedJobs;
        }
    }

    // Internal functions
    function _isValidPhaseTransition(JobPhase from, JobPhase to) internal pure returns (bool) {
        // Define valid state transitions
        if (from == JobPhase.Submitted) return to == JobPhase.Funded || to == JobPhase.Cancelled;
        if (from == JobPhase.Funded) return to == JobPhase.Assigned || to == JobPhase.Refunded;
        if (from == JobPhase.Assigned) return to == JobPhase.Running || to == JobPhase.Cancelled;
        if (from == JobPhase.Running) return to == JobPhase.Validating || to == JobPhase.Failed;
        if (from == JobPhase.Validating) return to == JobPhase.Completed || to == JobPhase.Disputed;
        if (from == JobPhase.Disputed) return to == JobPhase.Completed || to == JobPhase.Refunded;
        
        return false;
    }

    function _isValidator(uint256 jobId, address validator) internal view returns (bool) {
        address[] memory validators = jobValidators[jobId];
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == validator) {
                return true;
            }
        }
        return false;
    }

    function _calculateAverageRating(uint256 jobId) internal view returns (uint8) {
        // This is a simplified calculation. In production, you might want to
        // weight ratings from different sources differently
        JobRecord memory job = jobs[jobId];
        uint256 totalRating = 0;
        uint256 ratingCount = 0;
        
        // Include client rating
        if (jobRatings[jobId][job.client] > 0) {
            totalRating += jobRatings[jobId][job.client];
            ratingCount++;
        }
        
        // Include validator ratings
        address[] memory validators = jobValidators[jobId];
        for (uint256 i = 0; i < validators.length; i++) {
            if (jobRatings[jobId][validators[i]] > 0) {
                totalRating += jobRatings[jobId][validators[i]];
                ratingCount++;
            }
        }
        
        if (ratingCount == 0) return 0;
        return uint8(totalRating / ratingCount);
    }

    /**
     * @dev Emergency pause functionality
     */
    function pause() external onlyOwner {
        // Implementation for pausing contract if needed
    }

    /**
     * @dev Update provider reputation score
     */
    function updateProviderReputation(address provider, uint8 newScore) external onlyOwner {
        require(newScore <= 100, "Invalid score");
        providerReputation[provider] = newScore;
    }

    /**
     * @dev Update client reputation score
     */
    function updateClientReputation(address client, uint8 newScore) external onlyOwner {
        require(newScore <= 100, "Invalid score");
        clientReputation[client] = newScore;
    }
}
