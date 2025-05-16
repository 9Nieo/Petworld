// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PetWorldManager} from "./PetWorldManager.sol";

// Add Math library to support min function
library Math {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

contract PwPointBurner is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;
    
    // Contract address
    address public pwPointToken;       // PwPoint token address
    address payable public petWorldManager;    // PetWorldManager contract address
    
    // Constant configurations
    uint256 public constant CYCLE_DURATION = 1 hours;  // Each cycle lasts for 1 hour
    uint256 public constant DISTRIBUTION_RATIO = 10**13;  // Distribution ratio, one ten-thousandth (0.00001 * 10^18)
    uint256 public constant PRECISION_FACTOR = 1e36;   // Used to improve calculation precision
    uint256 public constant MAX_CLAIMABLE_CYCLE_AGE = 600;  // Maximum claimable cycle limit
    uint256 public constant MAX_CLEANUP_AGE = 12;    // Records will be automatically deleted after endCycle + MAX_CLEANUP_AGE(1200)
    uint256 public constant MAX_CYCLES_PER_UPDATE = 1000;  // Maximum cycles to update at once
    uint256 public constant MAX_CYCLES_TO_SELECT = 250;  // Maximum cycles that can be selected when burning points
    uint256 public constant MAX_QUERY_CYCLE_RANGE = 500;  // Maximum cycle range for querying
    
    // Cycle-related variables
    uint256 public currentCycle;       // Current cycle
    uint256 public lastUpdateTimestamp; // Last update timestamp
    uint256 public lastCycleBurnRate;  // Last cycle burn rate precision
    // Burn record
    struct BurnRecord {
        uint256 pointsPerCycle;        // Points per cycle
        uint256 startCycle;            // Start cycle
        uint256 endCycle;              // End cycle
        uint256 lastClaimedCycle;      // Last claimed cycle
        bool fullyProcessed;           // Whether fully processed (for record cleanup)
    }
    
    // Cycle statistics
    struct CycleStats {
        uint256 totalBurnedPoints;     // Total burned points for the cycle
        bool distributionClaimed;      // Whether distribution for the cycle has been claimed
        uint256 petWorldDistributed;   // Amount of PETWORLD distributed for the cycle
        uint256 activeUsers;           // Number of active users for the cycle
    }
    
    // User's burn record mapping
    mapping(address => BurnRecord[]) public userBurnRecords;
    
    // Cycle statistics information
    mapping(uint256 => CycleStats) public cycleStats;
    
    // Points record for each cycle, used for calculating sliding window data
    mapping(uint256 => uint256) public cycleBurnedPoints;
    
    // Record the last processed cycle
    uint256 public lastProcessedCycle;
    
    // Authorized raid contracts and developers
    mapping(address => bool) public authorizedRaidContracts;
    
    // Track users who have active burns in a specific cycle
    mapping(uint256 => mapping(address => bool)) private activeUsersInCycle;
    
    // Events
    event PointsBurned(address indexed user, uint256 pointsAmount, uint256 cyclesSelected, uint256 recordIndex);
    event RewardClaimed(address indexed user, uint256 cycle, uint256 petWorldAmount);
    event CycleUpdated(uint256 newCycle, uint256 timestamp);
    event ExpiredRewards(address indexed user, uint256 expiredCycles, uint256 recordIndex);
    // Records are automatically removed when currentCycle > endCycle + MAX_CLEANUP_AGE
    event OldRecordsRemoved(address indexed user, uint256 removedCount);
    event ContractRenounced(address indexed previousOwner);
    constructor() Ownable(msg.sender) {
        // Initialize cycle and timestamp
        currentCycle = 1;
        lastUpdateTimestamp = block.timestamp;
        lastProcessedCycle = 1;
    }

    // Add setPwPointToken method
    function setPwPointToken(address _pwPointToken) public onlyOwner {
        require(_pwPointToken != address(0), "PwPoint token address cannot be zero");
        pwPointToken = _pwPointToken;
    }

    // Add setPetWorldManager method
    function setPetWorldManager(address payable _petWorldManager) public onlyOwner {
        require(_petWorldManager != address(0), "PetWorld manager address cannot be zero");
        petWorldManager = _petWorldManager;
    }

    function updateCycle() public {
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        
        // Limit the maximum number of cycles to process at once
        if (elapsedCycles > MAX_CYCLES_PER_UPDATE) {
            elapsedCycles = MAX_CYCLES_PER_UPDATE;
        }
        
        if (elapsedCycles > 0) {
            // If there is a cycle change, update the last cycle's burn rate
            if (currentCycle > 0) {
                uint256 lastCycle = currentCycle;
                CycleStats storage stats = cycleStats[lastCycle];
                
                // Calculate the last cycle's burn rate as average points per user
                if (stats.activeUsers > 0) {
                    // Calculate points per user (average) with 2 decimal precision
                    lastCycleBurnRate = (stats.totalBurnedPoints * 100) / stats.activeUsers;
                } else {
                    lastCycleBurnRate = 0; // Set to 0 if no users or no burn
                }
            }
            
            // Before updating the cycle, get the balance from PetWorldManager
            uint256 petWorldBalance = PetWorldManager(petWorldManager).getBalance();
            
            // Optimize precision calculation
            uint256 distributionAmount = 0;
            if (petWorldBalance > 0) {
                distributionAmount = (petWorldBalance * DISTRIBUTION_RATIO) / 10**18;
            }
            
            // Update the distribution amount for each new cycle
            for (uint256 i = 1; i <= elapsedCycles; i++) {
                uint256 cycleToUpdate = currentCycle + i;
                // Only set the distribution amount, do not mark as claimed
                cycleStats[cycleToUpdate].petWorldDistributed = distributionAmount;
            }
            
            // Update the current cycle
            currentCycle += elapsedCycles;
            lastUpdateTimestamp = block.timestamp;
            
            emit CycleUpdated(currentCycle, block.timestamp);
        }
    }
    
    /**
     * @dev Burn points and select the number of distribution cycles
     * @param pointsAmount The amount of points to burn
     * @param cyclesSelected The number of cycles selected
     */
    function burnPoints(uint256 pointsAmount, uint256 cyclesSelected) public nonReentrant {
        // Checks
        require(pointsAmount > 0, "Points amount must be greater than zero");
        require(cyclesSelected > 0, "Cycles selected must be greater than zero");
        require(pointsAmount % cyclesSelected == 0, "Points amount must be a multiple of cycles selected");
        require(
            cyclesSelected == 3 || cyclesSelected == 10 || 
            cyclesSelected == 30 || cyclesSelected == 50 || 
            cyclesSelected == 100 || cyclesSelected == 250, 
            "Invalid cycles selection"
        );
        require(cyclesSelected <= MAX_CYCLES_TO_SELECT, "Cycles selected exceeds maximum");

        // Update cycle
        updateCycle();
        
        // Calculate the required values in advance
        uint256 pointsPerCycle = pointsAmount / cyclesSelected;
        uint256 startCycle = currentCycle + 1;
        uint256 endCycle = startCycle + cyclesSelected - 1;
        
        // Update status (Effects)
        // Create a new burn record
        BurnRecord memory newRecord = BurnRecord({
            pointsPerCycle: pointsPerCycle,
            startCycle: startCycle,
            endCycle: endCycle,
            lastClaimedCycle: startCycle - 1, // Start counting from the next cycle
            fullyProcessed: false
        });
        
        userBurnRecords[msg.sender].push(newRecord);
        uint256 recordIndex = userBurnRecords[msg.sender].length - 1;
        
        // Update cycle statistics information
        for (uint256 i = 0; i < cyclesSelected; i++) {
            uint256 cycleToBurn = startCycle + i;
            cycleStats[cycleToBurn].totalBurnedPoints += pointsPerCycle;
            
            // Mark user as active for this cycle if not already
            if (!activeUsersInCycle[cycleToBurn][msg.sender]) {
                activeUsersInCycle[cycleToBurn][msg.sender] = true;
                cycleStats[cycleToBurn].activeUsers += 1;
            }
        }
        
        // Update cycle data
        _updateCycleData(pointsAmount);
        
        // Interactions
        // Transfer user's PwPoint tokens to the contract
        IERC20(pwPointToken).safeTransferFrom(msg.sender, address(this), pointsAmount);
        
        emit PointsBurned(msg.sender, pointsAmount, cyclesSelected, recordIndex);
    }
    
    /**
     * @dev Update cycle points data
     * @param pointsAmount The amount of points to add
     */
    function _updateCycleData(uint256 pointsAmount) private {
        // Add points to the next cycle of the current cycle
        uint256 nextCycle = currentCycle + 1;
        
        // Update the points record for that cycle
        cycleBurnedPoints[nextCycle] += pointsAmount;
    }
    
    /**
     * @dev Get the average burn score within a specified cycle range
     * @param startCycle Start cycle
     * @param endCycle End cycle
     * @return averagePoints Average burn score per cycle within the range
     * @return cyclePoints Array of burn scores for each cycle
     * @return cycles Array of corresponding cycle numbers
     */
    function _getCycleRangeAveragePoints(
        uint256 startCycle, 
        uint256 endCycle
    ) private view returns (
        uint256 averagePoints,
        uint256[] memory cyclePoints,
        uint256[] memory cycles
    ) {
        require(endCycle >= startCycle, "End cycle must be >= start cycle");
        
        // Limit the query cycle range
        require(endCycle - startCycle + 1 <= MAX_QUERY_CYCLE_RANGE, "Cycle range too large");
        
        uint256 totalPoints = 0;
        uint256 cycleCount = endCycle - startCycle + 1;
        
        cyclePoints = new uint256[](cycleCount);
        cycles = new uint256[](cycleCount);
        
        uint256 index = 0;
        for (uint256 cycle = startCycle; cycle <= endCycle; cycle++) {
            uint256 points = cycleStats[cycle].totalBurnedPoints;
            totalPoints += points;
            cyclePoints[index] = points;
            cycles[index] = cycle;
            index++;
        }
        
        // Calculate the average value, avoid division by zero error
        // Use a higher precision calculation method
        if (cycleCount > 0) {
            averagePoints = (totalPoints * PRECISION_FACTOR) / cycleCount / PRECISION_FACTOR;
        } else {
            averagePoints = 0;
        }
        
        return (averagePoints, cyclePoints, cycles);
    }
    
    
    /**
     * @dev Get the average burn score for the last 7 days (168 cycles)
     * @return averagePoints Average burn score per cycle for the last 7 days
     * @return cyclePoints Array of burn scores for each cycle
     * @return cycles Array of corresponding cycle numbers
     */
    function getSevenDayAveragePoints() public view returns (
        uint256 averagePoints,
        uint256[] memory cyclePoints,
        uint256[] memory cycles
    ) {
        uint256 latestCycle = currentCycle;
        
        // Calculate the actual current cycle (considering time elapsed)
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        if (elapsedCycles > 0) {
            latestCycle += elapsedCycles;
        }
        
        // Calculate the 7-day range (7 days = 168 cycles)
        uint256 sevenDayStartCycle = latestCycle > 168 ? latestCycle - 168 + 1 : 1;
        
        return _getCycleRangeAveragePoints(sevenDayStartCycle, latestCycle);
    }
    
    /**
     * @dev Check if records have expired or overdue cycles
     * @param record Burn record
     * @param _currentCycle Current cycle
     * @return expiredCycles Number of expired cycles
     * @return claimableCycles Number of claimable cycles
     * @return nextClaimCycle Next claimable cycle
     */
    function _checkRecordStatus(
        BurnRecord memory record, 
        uint256 _currentCycle
    ) private pure returns (
        uint256 expiredCycles, 
        uint256 claimableCycles,
        uint256 nextClaimCycle
    ) {
        // If the record is fully processed, return 0
        if (record.fullyProcessed) {
            return (0, 0, 0);
        }
        
        // Calculate the next claimable cycle
        nextClaimCycle = record.lastClaimedCycle + 1;
        
        // If the next claimable cycle exceeds the end cycle, it has been fully processed
        if (nextClaimCycle > record.endCycle) {
            return (0, 0, 0);
        }
        
        // Check for expired cycles (exceeding 600 cycle limit)
        uint256 oldestClaimableCycle = 0;
        if (_currentCycle > MAX_CLAIMABLE_CYCLE_AGE) {
            oldestClaimableCycle = _currentCycle - MAX_CLAIMABLE_CYCLE_AGE;
            
            // If the next claimable cycle is earlier than the oldest claimable cycle
            if (nextClaimCycle < oldestClaimableCycle) {
                expiredCycles = oldestClaimableCycle - nextClaimCycle;
                nextClaimCycle = oldestClaimableCycle;
            }
        }
        
        // Calculate the number of claimable cycles
        if (_currentCycle >= nextClaimCycle) {
            // Claimable cycles cannot exceed the record's end cycle
            claimableCycles = Math.min(_currentCycle - nextClaimCycle + 1, record.endCycle - nextClaimCycle + 1);
        }
        
        return (expiredCycles, claimableCycles, nextClaimCycle);
    }
    
    /**
     * @dev Process a burn record and calculate rewards
     * @param user User address
     * @param record Burn record to process
     * @param recordIndex Index of the record in user's array
     * @param _currentCycle Current cycle
     * @return reward Amount of reward calculated
     * @return hasUpdated Whether the record was updated
     */
    function _processBurnRecord(
        address user,
        BurnRecord storage record, 
        uint256 recordIndex, 
        uint256 _currentCycle
    ) private returns (uint256 reward, bool hasUpdated) {
        // Check record status
        (uint256 expiredCycles, uint256 claimableCycles, uint256 nextClaimCycle) = 
            _checkRecordStatus(record, _currentCycle);
        
        // If there are no claimable cycles, return 0
        if (claimableCycles == 0) {
            if (!record.fullyProcessed && nextClaimCycle <= record.endCycle) {
                hasUpdated = false;
            }
            return (0, hasUpdated);
        }
        
        // Handle expired cycles
        if (expiredCycles > 0) {
            emit ExpiredRewards(user, expiredCycles, recordIndex);
        }
        
        // Calculate rewards for claimable cycles
        for (uint256 j = 0; j < claimableCycles; j++) {
            uint256 cycleToClaim = nextClaimCycle + j;
            
            // Skip cycles that exceed the end cycle
            if (cycleToClaim > record.endCycle) {
                break;
            }
            
            // Get statistics for that cycle
            CycleStats storage stats = cycleStats[cycleToClaim];
            
            // If there are points for that cycle
            if (stats.totalBurnedPoints > 0) {
                // If rewards for that cycle have not been distributed yet
                if (!stats.distributionClaimed) {
                    uint256 distributionAmount = stats.petWorldDistributed;
                    
                    // If distribution amount is 0, calculate the distribution amount
                    if (distributionAmount == 0) {
                        uint256 petWorldBalance = PetWorldManager(petWorldManager).getBalance();
                        require(petWorldBalance > 0, "PetWorldManager has zero balance");
                        
                        distributionAmount = (petWorldBalance * DISTRIBUTION_RATIO) / 10**18;
                        
                        stats.petWorldDistributed = distributionAmount;
                    }
                    
                    stats.distributionClaimed = true;
                }
                
                // Simplify precision calculation, reduce multiplication and division times
                uint256 userShare = 0;
                if (stats.petWorldDistributed > 0) {
                    userShare = (record.pointsPerCycle * stats.petWorldDistributed * PRECISION_FACTOR) / 
                                stats.totalBurnedPoints;
                    userShare = userShare / PRECISION_FACTOR;
                }
                
                reward += userShare;
                
                emit RewardClaimed(user, cycleToClaim, userShare);
            }
        }
        
        // Update the record's last claimed cycle
        record.lastClaimedCycle = nextClaimCycle + claimableCycles - 1;
        
        // If claimed to the end cycle, mark as fully processed
        if (record.lastClaimedCycle >= record.endCycle) {
            record.fullyProcessed = true;
        }
        
        hasUpdated = true;
        return (reward, hasUpdated);
    }
    
    /**
     * @dev Internal function to process and claim rewards
     * @param user User address
     * @return totalReward Total rewards claimed
     */
    function _claimRewardInternal(address user) private returns (uint256) {
        _removeOldRecords(user);
        BurnRecord[] storage records = userBurnRecords[user];


        // Check PetWorldManager balance before calculation
        uint256 petWorldBalance = PetWorldManager(petWorldManager).getBalance();
        require(petWorldBalance > 0, "PetWorldManager has zero balance");
        
        uint256 totalReward = 0;
        bool hasPendingRecords = false;


        // Iterate through the burn records
        for (uint256 i = 0; i < records.length; i++) {
            BurnRecord storage record = records[i];
            
            // Process a single record
            (uint256 reward, bool hasUpdated) = _processBurnRecord(user, record, i, currentCycle);
            
            if (hasUpdated) {
                totalReward += reward;
            } else if (!record.fullyProcessed) {
                hasPendingRecords = true;
            }
        }
        

        
        // If there are rewards, transfer them
        if (totalReward > 0) {
            PetWorldManager(petWorldManager).transferPetWorld(user, totalReward);
        }
        
        return totalReward;
    }
    
    /**
     * @dev Claim rewards
     * @return totalReward Total rewards claimed
     */
    function claimReward() public nonReentrant returns (uint256) {
        // Update cycle
        updateCycle();
        
        // Call the internal function to process rewards
        return _claimRewardInternal(msg.sender);
    }
    
    /**
     * @dev Physically remove records that have existed for MAX_CLEANUP_AGE cycles after their endCycle
     * @param user User address
     */
    function _removeOldRecords(address user) private {
        BurnRecord[] storage records = userBurnRecords[user];
        require(records.length > 0, "No burn records found");
        uint256 i = 0;
        uint256 removedCount = 0;
        
        while (i < records.length) {
            // Remove records where currentCycle > endCycle + MAX_CLEANUP_AGE
            if (currentCycle > records[i].endCycle + MAX_CLEANUP_AGE) {
                // Move the last record to current position and pop the last element
                if (i != records.length - 1) {
                    records[i] = records[records.length - 1];
                }
                records.pop();
                removedCount++;
                // Don't increment i since we moved a new record to this position
            } else {
                i++;
            }
        }
        
        if (removedCount > 0) {
            emit OldRecordsRemoved(user, removedCount);
        }
    }
    
    /**
     * @dev Physically remove old records that have existed for MAX_CLEANUP_AGE cycles after their endCycle
     * @param user User address whose records will be cleaned
     * @return removedCount Number of records removed
     */
    function cleanOldRecords(address user) public returns (uint256) {
        updateCycle();
        
        BurnRecord[] storage records = userBurnRecords[user];
        uint256 i = 0;
        uint256 count = 0;
        
        while (i < records.length) {
            // Remove records where currentCycle > endCycle + MAX_CLEANUP_AGE
            if (currentCycle > records[i].endCycle + MAX_CLEANUP_AGE) {
                // Move the last record to current position
                if (i != records.length - 1) {
                    records[i] = records[records.length - 1];
                }
                records.pop();
                count++;
                // Don't increment i since we moved a new record to this position
            } else {
                i++;
            }
        }
        
        if (count > 0) {
            emit OldRecordsRemoved(user, count);
        }
        
        return count;
    }
    
    /**
     * @dev Add points from raid contracts, automatically calculated based on the historical 7-day average burn rate
     */
    function addRaidPoints() public nonReentrant {
        // Checks
        require(authorizedRaidContracts[msg.sender], "Caller is not an authorized raid contract");
        
        // Update cycle
        updateCycle();
        
        // Get the historical 7-day average burn rate
        (uint256 averagePoints,,) = getSevenDayAveragePoints();
        
        // If historical data is insufficient, ensure minimum points
        if (averagePoints <= 100) {
            averagePoints = 100; // Set minimum value
        }
        
        // Generate a random factor between 0.2 and 0.45
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender
        )));
        uint256 randomFactor = 20 + (randomSeed % 26);
        
        // Calculate the raid points = average points * random factor (0.2-0.45)
        uint256 pointsAmount = (averagePoints * randomFactor) / 100;
        
        // Update status (Effects)
        // Add points to the next cycle
        uint256 nextCycle = currentCycle + 1;
        
        // Update the statistics of the next cycle
        cycleStats[nextCycle].totalBurnedPoints += pointsAmount;
        
        // Update the cycle points data
        _updateCycleData(pointsAmount);
    }
    
    // Permission management and emergency functions
    function authorizeRaidContract(address raidContract) public onlyOwner {
        require(raidContract != address(0), "Raid contract address cannot be zero");
        authorizedRaidContracts[raidContract] = true;
    }
    
    function revokeRaidContract(address raidContract) public onlyOwner {
        authorizedRaidContracts[raidContract] = false;
    }
    
    // Transfer contract ownership
    function transferContractOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        _transferOwnership(newOwner);
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() external onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);     
    }
}