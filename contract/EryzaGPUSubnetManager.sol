// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Eryzatoken.sol";

/**
 * @title EryzaGPUSubnetManager
 * @dev Manages GPU subnetting for rented GPUs only
 * Creates dynamic subnets based on GPU rental status and allows monitoring
 */
contract EryzaGPUSubnetManager is Ownable, Pausable, ReentrancyGuard {
    EryzaToken public immutable eryzaToken;
    
    // GPU specifications and status
    struct GPU {
        string gpuId;           // Unique GPU identifier
        address owner;          // GPU owner address
        address currentRenter;  // Current renter (address(0) if not rented)
        uint256 computePower;   // GPU compute power in TFLOPS
        uint256 memorySize;     // GPU memory in GB
        string gpuModel;        // GPU model (e.g., "RTX 4090", "H100")
        bool active;            // GPU is active and available
        uint256 rentalStart;    // Rental start timestamp
        uint256 rentalEnd;      // Rental end timestamp
        bytes32 currentSubnet;  // Current subnet ID (bytes32(0) if not in subnet)
    }
    
    // Subnet for rented GPUs only
    struct GPUSubnet {
        bytes32 subnetId;
        address coordinator;     // Subnet coordinator (usually the renter)
        string[] gpuIds;        // List of GPU IDs in this subnet
        uint256 totalCompute;   // Total compute power in subnet
        uint256 totalMemory;    // Total memory in subnet
        uint256 createdAt;      // Subnet creation timestamp
        bool active;            // Subnet status
        string purpose;         // Purpose of the subnet (ML training, inference, etc.)
    }
    
    // Monitoring data structure
    struct GPUMetrics {
        uint256 utilization;    // GPU utilization percentage (0-100)
        uint256 temperature;    // GPU temperature in Celsius
        uint256 powerDraw;      // Power consumption in watts
        uint256 memoryUsed;     // Memory usage in GB
        uint256 lastUpdated;    // Last update timestamp
    }
    
    // Storage mappings
    mapping(string => GPU) public gpus;                           // gpuId => GPU
    mapping(bytes32 => GPUSubnet) public subnets;               // subnetId => Subnet
    mapping(string => GPUMetrics) public gpuMetrics;            // gpuId => Metrics
    mapping(address => string[]) public userGPUs;               // owner => GPU IDs
    mapping(address => bytes32[]) public userSubnets;           // coordinator => Subnet IDs
    mapping(bytes32 => mapping(string => bool)) public subnetGPUs; // subnetId => gpuId => exists
    
    // Arrays for enumeration
    string[] public allGPUIds;
    bytes32[] public allSubnetIds;
    
    // Events
    event GPURegistered(string indexed gpuId, address indexed owner, string gpuModel);
    event GPURented(string indexed gpuId, address indexed renter, uint256 rentalStart, uint256 rentalEnd);
    event GPURentalEnded(string indexed gpuId, address indexed renter);
    event SubnetCreated(bytes32 indexed subnetId, address indexed coordinator, string purpose);
    event GPUAddedToSubnet(bytes32 indexed subnetId, string gpuId);
    event GPURemovedFromSubnet(bytes32 indexed subnetId, string gpuId);
    event SubnetDissolved(bytes32 indexed subnetId);
    event GPUMetricsUpdated(string indexed gpuId, uint256 utilization, uint256 temperature);
    
    constructor(address _eryzaToken) {
        eryzaToken = EryzaToken(_eryzaToken);
    }
    
    // ===== GPU MANAGEMENT =====
    
    /**
     * @dev Register a new GPU in the system
     */
    function registerGPU(
        string memory gpuId,
        uint256 computePower,
        uint256 memorySize,
        string memory gpuModel
    ) external whenNotPaused {
        require(bytes(gpus[gpuId].gpuId).length == 0, "GPU already registered");
        require(computePower > 0 && memorySize > 0, "Invalid GPU specs");
        
        gpus[gpuId] = GPU({
            gpuId: gpuId,
            owner: msg.sender,
            currentRenter: address(0),
            computePower: computePower,
            memorySize: memorySize,
            gpuModel: gpuModel,
            active: true,
            rentalStart: 0,
            rentalEnd: 0,
            currentSubnet: bytes32(0)
        });
        
        userGPUs[msg.sender].push(gpuId);
        allGPUIds.push(gpuId);
        
        emit GPURegistered(gpuId, msg.sender, gpuModel);
    }
    
    /**
     * @dev Rent a GPU (only owners or authorized contracts can call this)
     */
    function rentGPU(
        string memory gpuId,
        address renter,
        uint256 rentalDuration
    ) external whenNotPaused {
        GPU storage gpu = gpus[gpuId];
        require(bytes(gpu.gpuId).length > 0, "GPU not found");
        require(msg.sender == gpu.owner || msg.sender == owner(), "Not authorized");
        require(gpu.currentRenter == address(0), "GPU already rented");
        require(gpu.active, "GPU not active");
        
        gpu.currentRenter = renter;
        gpu.rentalStart = block.timestamp;
        gpu.rentalEnd = block.timestamp + rentalDuration;
        
        emit GPURented(gpuId, renter, gpu.rentalStart, gpu.rentalEnd);
    }
    
    /**
     * @dev End GPU rental
     */
    function endGPURental(string memory gpuId) external whenNotPaused {
        GPU storage gpu = gpus[gpuId];
        require(bytes(gpu.gpuId).length > 0, "GPU not found");
        require(
            msg.sender == gpu.currentRenter || 
            msg.sender == gpu.owner || 
            block.timestamp >= gpu.rentalEnd,
            "Not authorized to end rental"
        );
        
        address previousRenter = gpu.currentRenter;
        
        // Remove from subnet if in one
        if (gpu.currentSubnet != bytes32(0)) {
            _removeGPUFromSubnet(gpu.currentSubnet, gpuId);
        }
        
        gpu.currentRenter = address(0);
        gpu.rentalStart = 0;
        gpu.rentalEnd = 0;
        
        emit GPURentalEnded(gpuId, previousRenter);
    }
    
    // ===== SUBNET MANAGEMENT =====
    
    /**
     * @dev Create a subnet for rented GPUs
     */
    function createSubnet(
        string[] memory gpuIds,
        string memory purpose
    ) external whenNotPaused returns (bytes32 subnetId) {
        require(gpuIds.length > 0, "No GPUs specified");
        
        // Verify all GPUs are rented by the caller
        for (uint i = 0; i < gpuIds.length; i++) {
            GPU storage gpu = gpus[gpuIds[i]];
            require(bytes(gpu.gpuId).length > 0, "GPU not found");
            require(gpu.currentRenter == msg.sender, "GPU not rented by you");
            require(gpu.currentSubnet == bytes32(0), "GPU already in subnet");
            require(block.timestamp < gpu.rentalEnd, "GPU rental expired");
        }
        
        // Generate subnet ID
        subnetId = keccak256(abi.encodePacked(msg.sender, block.timestamp, gpuIds.length));
        require(subnets[subnetId].coordinator == address(0), "Subnet ID collision");
        
        // Calculate total resources
        uint256 totalCompute = 0;
        uint256 totalMemory = 0;
        for (uint i = 0; i < gpuIds.length; i++) {
            GPU storage gpu = gpus[gpuIds[i]];
            totalCompute += gpu.computePower;
            totalMemory += gpu.memorySize;
            gpu.currentSubnet = subnetId;
            subnetGPUs[subnetId][gpuIds[i]] = true;
        }
        
        // Create subnet
        subnets[subnetId] = GPUSubnet({
            subnetId: subnetId,
            coordinator: msg.sender,
            gpuIds: gpuIds,
            totalCompute: totalCompute,
            totalMemory: totalMemory,
            createdAt: block.timestamp,
            active: true,
            purpose: purpose
        });
        
        userSubnets[msg.sender].push(subnetId);
        allSubnetIds.push(subnetId);
        
        emit SubnetCreated(subnetId, msg.sender, purpose);
        
        for (uint i = 0; i < gpuIds.length; i++) {
            emit GPUAddedToSubnet(subnetId, gpuIds[i]);
        }
        
        return subnetId;
    }
    
    /**
     * @dev Add GPU to existing subnet
     */
    function addGPUToSubnet(bytes32 subnetId, string memory gpuId) external whenNotPaused {
        GPUSubnet storage subnet = subnets[subnetId];
        GPU storage gpu = gpus[gpuId];
        
        require(subnet.coordinator == msg.sender, "Not subnet coordinator");
        require(subnet.active, "Subnet not active");
        require(bytes(gpu.gpuId).length > 0, "GPU not found");
        require(gpu.currentRenter == msg.sender, "GPU not rented by you");
        require(gpu.currentSubnet == bytes32(0), "GPU already in subnet");
        require(block.timestamp < gpu.rentalEnd, "GPU rental expired");
        
        gpu.currentSubnet = subnetId;
        subnet.gpuIds.push(gpuId);
        subnet.totalCompute += gpu.computePower;
        subnet.totalMemory += gpu.memorySize;
        subnetGPUs[subnetId][gpuId] = true;
        
        emit GPUAddedToSubnet(subnetId, gpuId);
    }
    
    /**
     * @dev Remove GPU from subnet
     */
    function removeGPUFromSubnet(bytes32 subnetId, string memory gpuId) external whenNotPaused {
        GPUSubnet storage subnet = subnets[subnetId];
        require(subnet.coordinator == msg.sender, "Not subnet coordinator");
        
        _removeGPUFromSubnet(subnetId, gpuId);
    }
    
    /**
     * @dev Internal function to remove GPU from subnet
     */
    function _removeGPUFromSubnet(bytes32 subnetId, string memory gpuId) internal {
        GPUSubnet storage subnet = subnets[subnetId];
        GPU storage gpu = gpus[gpuId];
        
        require(subnetGPUs[subnetId][gpuId], "GPU not in subnet");
        
        gpu.currentSubnet = bytes32(0);
        subnet.totalCompute -= gpu.computePower;
        subnet.totalMemory -= gpu.memorySize;
        subnetGPUs[subnetId][gpuId] = false;
        
        // Remove from array
        for (uint i = 0; i < subnet.gpuIds.length; i++) {
            if (keccak256(bytes(subnet.gpuIds[i])) == keccak256(bytes(gpuId))) {
                subnet.gpuIds[i] = subnet.gpuIds[subnet.gpuIds.length - 1];
                subnet.gpuIds.pop();
                break;
            }
        }
        
        emit GPURemovedFromSubnet(subnetId, gpuId);
        
        // Dissolve subnet if no GPUs left
        if (subnet.gpuIds.length == 0) {
            subnet.active = false;
            emit SubnetDissolved(subnetId);
        }
    }
    
    // ===== MONITORING =====
    
    /**
     * @dev Update GPU metrics (called by monitoring service)
     */
    function updateGPUMetrics(
        string memory gpuId,
        uint256 utilization,
        uint256 temperature,
        uint256 powerDraw,
        uint256 memoryUsed
    ) external whenNotPaused {
        require(bytes(gpus[gpuId].gpuId).length > 0, "GPU not found");
        require(
            msg.sender == gpus[gpuId].owner || 
            msg.sender == gpus[gpuId].currentRenter || 
            msg.sender == owner(),
            "Not authorized"
        );
        require(utilization <= 100, "Invalid utilization");
        
        gpuMetrics[gpuId] = GPUMetrics({
            utilization: utilization,
            temperature: temperature,
            powerDraw: powerDraw,
            memoryUsed: memoryUsed,
            lastUpdated: block.timestamp
        });
        
        emit GPUMetricsUpdated(gpuId, utilization, temperature);
    }
    
    // ===== VIEW FUNCTIONS =====
    
    /**
     * @dev Get all GPUs in a subnet
     */
    function getSubnetGPUs(bytes32 subnetId) external view returns (string[] memory) {
        return subnets[subnetId].gpuIds;
    }
    
    /**
     * @dev Get all rented GPUs
     */
    function getRentedGPUs() external view returns (string[] memory rentedGPUs) {
        uint256 rentedCount = 0;
        
        // Count rented GPUs
        for (uint i = 0; i < allGPUIds.length; i++) {
            if (gpus[allGPUIds[i]].currentRenter != address(0) && 
                block.timestamp < gpus[allGPUIds[i]].rentalEnd) {
                rentedCount++;
            }
        }
        
        // Fill array
        rentedGPUs = new string[](rentedCount);
        uint256 index = 0;
        for (uint i = 0; i < allGPUIds.length; i++) {
            if (gpus[allGPUIds[i]].currentRenter != address(0) && 
                block.timestamp < gpus[allGPUIds[i]].rentalEnd) {
                rentedGPUs[index] = allGPUIds[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get subnet statistics
     */
    function getSubnetStats(bytes32 subnetId) external view returns (
        uint256 gpuCount,
        uint256 totalCompute,
        uint256 totalMemory,
        uint256 avgUtilization,
        bool active
    ) {
        GPUSubnet storage subnet = subnets[subnetId];
        gpuCount = subnet.gpuIds.length;
        totalCompute = subnet.totalCompute;
        totalMemory = subnet.totalMemory;
        active = subnet.active;
        
        if (gpuCount > 0) {
            uint256 totalUtilization = 0;
            for (uint i = 0; i < subnet.gpuIds.length; i++) {
                totalUtilization += gpuMetrics[subnet.gpuIds[i]].utilization;
            }
            avgUtilization = totalUtilization / gpuCount;
        }
    }
    
    /**
     * @dev Get total system statistics
     */
    function getSystemStats() external view returns (
        uint256 totalGPUs,
        uint256 rentedGPUs,
        uint256 activeSubnets,
        uint256 totalComputePower
    ) {
        totalGPUs = allGPUIds.length;
        
        uint256 rented = 0;
        uint256 totalCompute = 0;
        for (uint i = 0; i < allGPUIds.length; i++) {
            GPU storage gpu = gpus[allGPUIds[i]];
            if (gpu.currentRenter != address(0) && block.timestamp < gpu.rentalEnd) {
                rented++;
            }
            if (gpu.active) {
                totalCompute += gpu.computePower;
            }
        }
        rentedGPUs = rented;
        totalComputePower = totalCompute;
        
        uint256 active = 0;
        for (uint i = 0; i < allSubnetIds.length; i++) {
            if (subnets[allSubnetIds[i]].active) {
                active++;
            }
        }
        activeSubnets = active;
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function deactivateGPU(string memory gpuId) external onlyOwner {
        require(bytes(gpus[gpuId].gpuId).length > 0, "GPU not found");
        gpus[gpuId].active = false;
    }
    
    function getAllGPUIds() external view returns (string[] memory) {
        return allGPUIds;
    }
    
    function getAllSubnetIds() external view returns (bytes32[] memory) {
        return allSubnetIds;
    }
}