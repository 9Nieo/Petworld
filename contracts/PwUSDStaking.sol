// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PwUSD} from "./PwUSD.sol";
import {PwPointManager} from "./PwPointManager.sol";

/**
 * @title PWUSDStaking
 * @dev Contract for staking stablecoins to earn PWUSD and PwPoint rewards
 */
contract PwUSDStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant CYCLE_DURATION = 1 days;  // Each cycle lasts for 1 day
    uint256 public constant PWPOINT_REWARD_RATE = 2;  // 2 PwPoint for every 10 stablecoins per cycle
    uint256 public constant PRECISION_FACTOR = 10 * 10**18;   
    uint256 public constant MAX_CYCLE_UPDATES = 100;  // Maximum number of cycles to update at once
    
    // Contract addresses
    address public pwusdToken;         // PWUSD token address
    address payable public pwpointManager;     // PwPointManager contract address
    
    
    // Cycle-related variables
    uint256 public currentCycle;       // Current cycle
    uint256 public lastUpdateTimestamp; // Last update timestamp
    
    uint256 public totalStakedAmount;  
    uint256 public totalClaimedPwPoints; 
    
    // Supported stablecoin list
    mapping(address => bool) public supportedStableCoins;
    address[] public supportedStableCoinList;
    
    // Historical supported stablecoin tracking for withdrawals
    mapping(address => bool) public historicalSupportedStableCoins;
    
    // Staking information
    struct StakingInfo {
        uint256 stakedAmount;                  // Amount staked
        address stableCoin;                    // Type of stablecoin staked
        uint256 lastClaimedCycle;              // Last cycle in which rewards were claimed
        uint256 pendingPwPoints;               // Pending PwPoint rewards
        uint256 lastDepositTimestamp;          // Timestamp of last deposit
        uint256 rewardEligibleAmount;          // Amount eligible for rewards (staked for at least 24 hours)
    }
    
    // Cycle statistics
    struct CycleStats {
        uint256 totalStakedTokens;             // Total staked tokens for the cycle (in USD)
        bool distributionCalculated;           // Whether distribution for the cycle has been calculated
    }
    
    // User's staking information mapping
    mapping(address => StakingInfo[]) public userStakingInfo;
    // User active staking index mapping
    mapping(address => mapping(address => uint256)) public userStakingIndexByToken;
    // Whether the user has active staking for a specific token
    mapping(address => mapping(address => bool)) public hasActiveStaking;
    
    // Cycle statistics information
    mapping(uint256 => CycleStats) public cycleStats;
    
    // Active staker user list
    mapping(address => bool) public isActiveStaker;
    
    // Events
    event Staked(address indexed user, address indexed stableCoin, uint256 amount, uint256 pwusdMinted);
    event Withdrawn(address indexed user, address indexed stableCoin, uint256 amount, uint256 pwusdBurned);
    event RewardsClaimed(address indexed user, uint256 amount);
    event CycleUpdated(uint256 oldCycle, uint256 newCycle, uint256 updatedCycles);
    event RewardsCalculated(address indexed user, address indexed stableCoin, uint256 rewards);
    event ClaimFailed(address indexed user, uint256 amount, string reason);
    event StableCoinAdded(address indexed stableCoin);
    event StableCoinRemoved(address indexed stableCoin);
    event ContractRenounced(address indexed previousOwner);
    event EligibleAmountUpdated(address indexed user, address indexed stableCoin, uint256 oldEligibleAmount, uint256 newEligibleAmount);
    
    /**
     * @dev Constructor
     * @param _pwusdToken PWUSD token address
     * @param _pwpointManager PwPointManager contract address
     */
    constructor(
        address _pwusdToken,
        address payable _pwpointManager
    ) Ownable(msg.sender) {
        require(_pwusdToken != address(0), "PWUSD token address cannot be zero");
        require(_pwpointManager != address(0), "PwPointManager address cannot be zero");
        
        pwusdToken = _pwusdToken;
        pwpointManager = _pwpointManager;
        
        // Initialize cycle and timestamp
        currentCycle = 1;
        lastUpdateTimestamp = block.timestamp;
        
        totalStakedAmount = 0;
        totalClaimedPwPoints = 0;
    }


    /**
     * @dev Add supported stablecoin
     * @param stableCoin Stablecoin address
     */
    function addSupportedStableCoin(address stableCoin) public onlyOwner {
        require(stableCoin != address(0), "StableCoin address cannot be zero");
        require(!supportedStableCoins[stableCoin], "StableCoin already supported");
        
        supportedStableCoins[stableCoin] = true;
        historicalSupportedStableCoins[stableCoin] = true; 
        supportedStableCoinList.push(stableCoin);
        
        emit StableCoinAdded(stableCoin);
    }
    
    /**
     * @dev Remove supported stablecoin
     * @param stableCoin Stablecoin address to remove
     */
    function removeSupportedStableCoin(address stableCoin) public onlyOwner {
        require(stableCoin != address(0), "StableCoin address cannot be zero");
        require(supportedStableCoins[stableCoin], "StableCoin not currently supported");
        
        supportedStableCoins[stableCoin] = false;
        
        // Remove from the supported stablecoin list
        for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
            if (supportedStableCoinList[i] == stableCoin) {
                // Move the last element to this position and shrink the array
                supportedStableCoinList[i] = supportedStableCoinList[supportedStableCoinList.length - 1];
                supportedStableCoinList.pop();
                break;
            }
        }
        
        emit StableCoinRemoved(stableCoin);
    }
    
    /**
     * @dev Update the current cycle
     * Calculate the actual current cycle based on elapsed time
     * Limits the number of cycles that can be updated at once
     */
    function _updateCycle() public {
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        
        // Limit the number of cycles to update to prevent excessive gas consumption
        if (elapsedCycles > MAX_CYCLE_UPDATES) {
            elapsedCycles = MAX_CYCLE_UPDATES;
        }
        
        if (elapsedCycles > 0) {
            uint256 oldCycle = currentCycle;
            
            // Update data for each new cycle
            for (uint256 i = 1; i <= elapsedCycles; i++) {
                uint256 cycleToUpdate = currentCycle + i;
                
                // If it's the first cycle, set total staked amount to the current cycle's total staked amount
                if (i == 1) {
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle].totalStakedTokens;
                } else {
                    // For subsequent cycles, set total staked amount to the previous cycle's total staked amount
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle + i - 1].totalStakedTokens;
                }
                
                // Mark that the distribution for this cycle has been calculated
                cycleStats[cycleToUpdate].distributionCalculated = true;
            }
            
            // Update the current cycle
            currentCycle += elapsedCycles;
            
            // If we've capped the cycle updates, adjust the lastUpdateTimestamp relative to 
            // the cycles we've actually processed, not the full elapsed time
            if (elapsedCycles == MAX_CYCLE_UPDATES) {
                lastUpdateTimestamp += MAX_CYCLE_UPDATES * CYCLE_DURATION;
            } else {
                lastUpdateTimestamp = block.timestamp;
            }
            
            emit CycleUpdated(oldCycle, currentCycle, elapsedCycles);
        }
    }
    
    /**
     * @dev Calculate rewards for a staking position
     * @param stakingInfo The staking position
     * @return (rewards, actualCurrentCycle) Calculated rewards and the current cycle used for calculation
     */
    function _calculateRewards(StakingInfo storage stakingInfo) private view returns (uint256, uint256) {
        // Calculate actual cycles (based on current time)
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        uint256 actualCurrentCycle = currentCycle + elapsedCycles;
        
        uint256 rewards = 0;
        if (stakingInfo.lastClaimedCycle < actualCurrentCycle) {
            uint256 cyclesPassed = actualCurrentCycle - stakingInfo.lastClaimedCycle;
            
            rewards = (stakingInfo.rewardEligibleAmount * PWPOINT_REWARD_RATE * cyclesPassed) / PRECISION_FACTOR;
        }
        
        return (rewards, actualCurrentCycle);
    }
    
    /**
     * @dev Stake stablecoins
     * @param stableCoin Stablecoin address
     * @param amount Amount to stake
     */
    function stake(address stableCoin, uint256 amount) public nonReentrant {
        // Checks
        require(supportedStableCoins[stableCoin], "StableCoin not supported");
        require(amount > 0, "Amount must be greater than zero");
        require(amount % (10 * 10**18) == 0, "Amount must be a multiple of 10 USD");
        
        address user = msg.sender;
        
        // Check the user's allowance
        uint256 allowance = IERC20(stableCoin).allowance(user, address(this));
        require(allowance >= amount, "Insufficient allowance");
        
        // Check the user's balance
        uint256 userBalance = IERC20(stableCoin).balanceOf(user);
        require(userBalance >= amount, "Insufficient balance");
        
        // Update cycle
        _updateCycle();
        
        // Calculate the equivalent PWUSD amount
        uint256 pwusdAmount = amount;
        
        // Effects - Create or get the user's staking record and update state
        uint256 stakingIndex;
        
        if (hasActiveStaking[user][stableCoin]) {
            stakingIndex = userStakingIndexByToken[user][stableCoin];
            StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
            
            // Calculate and update rewards
            (uint256 rewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
            
            if (rewards > 0) {
                stakingInfo.pendingPwPoints += rewards;
                emit RewardsCalculated(user, stableCoin, rewards);
            }
            
            stakingInfo.lastClaimedCycle = actualCurrentCycle;
            
            // Update rewardEligibleAmount for existing deposit if 24 hours have passed
            if (block.timestamp >= stakingInfo.lastDepositTimestamp + 24 hours) {
                stakingInfo.rewardEligibleAmount = stakingInfo.stakedAmount;
            }
            
            // Increase staked amount
            stakingInfo.stakedAmount += amount;
            
            // Update deposit timestamp for the new deposit
            stakingInfo.lastDepositTimestamp = block.timestamp;
        } else {
            stakingIndex = userStakingInfo[user].length;
            userStakingInfo[user].push(StakingInfo({
                stakedAmount: amount,
                stableCoin: stableCoin,
                lastClaimedCycle: currentCycle,
                pendingPwPoints: 0,
                lastDepositTimestamp: block.timestamp,
                rewardEligibleAmount: 0
            }));
            
            userStakingIndexByToken[user][stableCoin] = stakingIndex;
            hasActiveStaking[user][stableCoin] = true;
        }
        
        // Mark as active if it's a new staker
        if (!isActiveStaker[user]) {
            isActiveStaker[user] = true;
        }
        
        // Update the total staked amount for the current cycle
        cycleStats[currentCycle].totalStakedTokens += amount;
        
        totalStakedAmount += amount;
        
        // Interactions - External calls
        // Transfer the user's stablecoins to the contract
        uint256 balanceBefore = IERC20(stableCoin).balanceOf(address(this));
        IERC20(stableCoin).safeTransferFrom(user, address(this), amount);
        uint256 balanceAfter = IERC20(stableCoin).balanceOf(address(this));
        
        // Verify the transfer was successful by checking the contract's balance change
        require(balanceAfter >= balanceBefore + amount, "Token transfer failed");
        
        // Mint PWUSD for the user
        PwUSD(pwusdToken).mint(user, pwusdAmount);
        
        emit Staked(user, stableCoin, amount, pwusdAmount);
    }
    
    /**
     * @dev Update the eligible amount for rewards
     * This function checks if the current deposit has been staked for over 24 hours
     * and updates the rewardEligibleAmount accordingly
     * @param stakingInfo The staking position to update
     */
    function _updateEligibleAmount(StakingInfo storage stakingInfo) private {
        // Check if 24 hours have passed since the last deposit
        if (block.timestamp >= stakingInfo.lastDepositTimestamp + 24 hours) {
            uint256 oldEligibleAmount = stakingInfo.rewardEligibleAmount;
            // If 24 hours have passed, the entire staked amount is eligible for rewards
            stakingInfo.rewardEligibleAmount = stakingInfo.stakedAmount;
            
            // Emit event if the eligible amount changed
            if (oldEligibleAmount != stakingInfo.rewardEligibleAmount) {
                emit EligibleAmountUpdated(
                    msg.sender, 
                    stakingInfo.stableCoin, 
                    oldEligibleAmount, 
                    stakingInfo.rewardEligibleAmount
                );
            }
        }
    }
    
    /**
     * @dev Withdraw staked stablecoins
     * @param stableCoin Stablecoin address
     * @param amount Amount to withdraw, 0 means withdraw all
     */
    function withdraw(address stableCoin, uint256 amount) public nonReentrant {
        // Checks
        require(historicalSupportedStableCoins[stableCoin], "StableCoin never supported");
        address user = msg.sender;
        
        require(hasActiveStaking[user][stableCoin], "No active staking for this stable coin");
        
        uint256 stakingIndex = userStakingIndexByToken[user][stableCoin];
        StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
        
        // If amount is 0, withdraw all
        if (amount == 0) {
            amount = stakingInfo.stakedAmount;
        } else {
            // If not withdrawing all, ensure the amount is a multiple of 10 USD (considering stablecoin decimals)
            require(amount % (10 * 10**18) == 0, "Amount must be a multiple of 10 USD");
        }
        
        require(amount <= stakingInfo.stakedAmount, "Amount exceeds staked balance");
        
        // Check contract balance
        uint256 contractBalance = IERC20(stableCoin).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Calculate the amount of PWUSD to burn
        uint256 pwusdAmount = amount;
        
        // Ensure the user has enough PWUSD
        uint256 pwusdBalance = IERC20(pwusdToken).balanceOf(user);
        require(pwusdBalance >= pwusdAmount, "Insufficient PWUSD balance");
        
        // Update cycle
        _updateCycle();
        
        // Update eligible amount before calculating rewards
        _updateEligibleAmount(stakingInfo);
        
        // Calculate and update rewards
        (uint256 rewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
        
        if (rewards > 0) {
            stakingInfo.pendingPwPoints += rewards;
            emit RewardsCalculated(user, stableCoin, rewards);
        }
        
        stakingInfo.lastClaimedCycle = actualCurrentCycle;
        

        stakingInfo.stakedAmount -= amount;
        
        // Calculate the non-eligible amount (tokens staked less than 24 hours)
        uint256 nonEligibleAmount = stakingInfo.stakedAmount - stakingInfo.rewardEligibleAmount;
        
        // Prioritize withdrawing non-eligible tokens first
        if (amount <= nonEligibleAmount) {
            // If withdrawal amount is less than or equal to non-eligible amount, 
            // no need to modify rewardEligibleAmount
            // Just deduct from non-eligible tokens
        } else if (nonEligibleAmount > 0) {
            // If withdrawal amount is greater than non-eligible amount but non-eligible amount exists
            // Deduct the remainder from eligible amount
            uint256 remainingToWithdraw = amount - nonEligibleAmount;
            if (stakingInfo.rewardEligibleAmount >= remainingToWithdraw) {
                stakingInfo.rewardEligibleAmount -= remainingToWithdraw;
            } else {
                stakingInfo.rewardEligibleAmount = 0;
            }
        } else {
            // If all tokens are eligible (nonEligibleAmount == 0), deduct directly from eligible amount
            if (stakingInfo.rewardEligibleAmount >= amount) {
                stakingInfo.rewardEligibleAmount -= amount;
            } else {
                stakingInfo.rewardEligibleAmount = 0;
            }
        }
        
        if (amount <= totalStakedAmount) {
            totalStakedAmount -= amount;
        } else {
            totalStakedAmount = 0;
        }
        
        // If the user has no remaining stake, update the mapping
        if (stakingInfo.stakedAmount == 0) {
            hasActiveStaking[user][stableCoin] = false;
            
            // Check if there are any other active stakes
            bool hasAnyActiveStaking = false;
            for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
                if (hasActiveStaking[user][supportedStableCoinList[i]]) {
                    hasAnyActiveStaking = true;
                    break;
                }
            }
            
            // If there are no active stakes, mark as inactive
            if (!hasAnyActiveStaking) {
                isActiveStaker[user] = false;
            }
        } else {
            // If there is remaining stake, ensure the remaining amount is also a multiple of 10 USD
            require(stakingInfo.stakedAmount % (10 * 10**18) == 0, "Remaining staked amount must be a multiple of 10 USD");
        }
        
        // Decrease the total staked amount for the current cycle
        if (amount <= cycleStats[currentCycle].totalStakedTokens) {
            cycleStats[currentCycle].totalStakedTokens -= amount;
        } else {
            cycleStats[currentCycle].totalStakedTokens = 0;
        }
        
        // Interactions - External calls
        // Burn the user's PWUSD
        IERC20(pwusdToken).safeTransferFrom(user, address(this), pwusdAmount);
        PwUSD(pwusdToken).burn(pwusdAmount);
        
        // Transfer stablecoins back to the user
        IERC20(stableCoin).safeTransfer(user, amount);
        
        emit Withdrawn(user, stableCoin, amount, pwusdAmount);
    }
    
    /**
     * @dev Claim PwPoint rewards
     * @param stableCoin Stablecoin address, specify which stake to claim rewards from
     */
    function claimPwPoints(address stableCoin) public nonReentrant {
        // Checks
        address user = msg.sender;
        require(hasActiveStaking[user][stableCoin], "No active staking for this stable coin");
        
        uint256 stakingIndex = userStakingIndexByToken[user][stableCoin];
        StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
        
        // Update cycle
        _updateCycle();
        
        // Update eligible amount before calculating rewards
        _updateEligibleAmount(stakingInfo);
        
        // Calculate new rewards
        (uint256 newRewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
        
        // Update the last claimed cycle
        stakingInfo.lastClaimedCycle = actualCurrentCycle;
        
        // Calculate total rewards
        uint256 totalRewards = stakingInfo.pendingPwPoints + newRewards;
        require(totalRewards > 0, "No rewards to claim");
        
        // Effects - Update the state to prevent reentrancy issues
        // Store the reward amount in a memory variable
        uint256 rewardsToTransfer = totalRewards;
        
        // Reset pending rewards
        stakingInfo.pendingPwPoints = 0;
        
        // Interactions - External calls
        // Transfer PwPoint and PwBounty to the user through PwPointManager
        try PwPointManager(pwpointManager).claimNftReward(user, rewardsToTransfer, rewardsToTransfer) {
            totalClaimedPwPoints += rewardsToTransfer;
            emit RewardsClaimed(user, rewardsToTransfer);
        } catch Error(string memory reason) {
            // Restore pending rewards in case of failure
            stakingInfo.pendingPwPoints = rewardsToTransfer;
            emit ClaimFailed(user, rewardsToTransfer, reason);
        } catch (bytes memory /* lowLevelData */) {
            // Restore pending rewards in case of failure
            stakingInfo.pendingPwPoints = rewardsToTransfer;
            emit ClaimFailed(user, rewardsToTransfer, "Unknown error");
        }
    }
    
    /**
     * @dev Claim all PwPoint rewards from all staked stablecoins
     * This function allows users to claim rewards from all their staked positions at once
     */
    function claimAllPwPoints() public nonReentrant {
        // Checks
        address user = msg.sender;
        require(isActiveStaker[user], "User has no active staking");
        
        // Update cycle
        _updateCycle();
        
        // Variable to track total rewards across all stakes
        uint256 totalRewardsToTransfer = 0;
        
        // Iterate through all supported stablecoins to find user's active stakes
        for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
            address stableCoin = supportedStableCoinList[i];
            
            if (hasActiveStaking[user][stableCoin]) {
                uint256 stakingIndex = userStakingIndexByToken[user][stableCoin];
                StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
                
                // Update eligible amount before calculating rewards
                _updateEligibleAmount(stakingInfo);
                
                // Calculate new rewards
                (uint256 newRewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
                
                // Update the last claimed cycle
                stakingInfo.lastClaimedCycle = actualCurrentCycle;
                
                // Calculate total rewards for this stablecoin position
                uint256 positionRewards = stakingInfo.pendingPwPoints + newRewards;
                
                if (positionRewards > 0) {
                    // Add to total rewards
                    totalRewardsToTransfer += positionRewards;
                    
                    // Reset pending rewards for this position
                    stakingInfo.pendingPwPoints = 0;
                }
            }
        }
        
        // Ensure there are rewards to claim
        require(totalRewardsToTransfer > 0, "No rewards to claim");
        
        // Interactions - External calls
        // Transfer all PwPoint and PwBounty rewards to the user through PwPointManager
        try PwPointManager(pwpointManager).claimNftReward(user, totalRewardsToTransfer, totalRewardsToTransfer) {
            totalClaimedPwPoints += totalRewardsToTransfer;
            
            emit RewardsClaimed(user, totalRewardsToTransfer);
        } catch Error(string memory reason) {
            // Since we can't easily restore individual position's pending rewards,
            // we'll add them all back to the first active staking position
            for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
                address stableCoin = supportedStableCoinList[i];
                if (hasActiveStaking[user][stableCoin]) {
                    uint256 stakingIndex = userStakingIndexByToken[user][stableCoin];
                    userStakingInfo[user][stakingIndex].pendingPwPoints = totalRewardsToTransfer;
                    break;
                }
            }
            emit ClaimFailed(user, totalRewardsToTransfer, reason);
        } catch (bytes memory /* lowLevelData */) {
            // Same recovery logic as above
            for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
                address stableCoin = supportedStableCoinList[i];
                if (hasActiveStaking[user][stableCoin]) {
                    uint256 stakingIndex = userStakingIndexByToken[user][stableCoin];
                    userStakingInfo[user][stakingIndex].pendingPwPoints = totalRewardsToTransfer;
                    break;
                }
            }
            emit ClaimFailed(user, totalRewardsToTransfer, "Unknown error");
        }
    }
    
    
    // Renounce contract ownership
    function renounceContractOwnership() external onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }

    
} 