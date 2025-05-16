/**
 * PwUSDStaking Contract Initialization File
 * This file is responsible for initializing the PwUSDStaking contract instance
 */

/**
 * Initialize PwUSDStaking contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwUSDStaking contract instance
 */
function initPwUSDStakingContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwUSDStaking contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'TEST';
        let pwUSDStakingAddress;
        
        if (typeof getContractAddress === 'function') {
            pwUSDStakingAddress = getContractAddress('PwUSDStaking');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwUSDStakingAddress = window.contractAddresses[network].PwUSDStaking;
        } else {
            console.error('Unable to get PwUSDStaking contract address');
            return null;
        }
        
        if (!pwUSDStakingAddress) {
            console.error('PwUSDStaking contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwUSDStakingABI;
        if (!abi) {
            console.error('Unable to get PwUSDStaking contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwUSDStakingAddress);
        console.log('PwUSDStaking contract initialized successfully, address:', pwUSDStakingAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwUSDStaking contract:', error);
        return null;
    }
}

/**
 * Get staking pool information
 * @param {Object} contract - PwUSDStaking contract instance
 * @returns {Promise<Object>} Staking pool information
 */
async function getUSDStakingPoolInfo(contract) {
    if (!contract) {
        console.error('Failed to get USD staking pool information: Contract instance is empty');
        return null;
    }
    
    try {
        // Get staking pool information
        const results = await Promise.all([
            contract.methods.totalStaked().call(),
            contract.methods.rewardRate().call(),
            contract.methods.lastUpdateTime().call(),
            contract.methods.rewardPerTokenStored().call(),
            contract.methods.stakingToken().call(),
            contract.methods.rewardsToken().call()
        ]);
        
        return {
            totalStaked: results[0],
            rewardRate: results[1],
            lastUpdateTime: results[2],
            rewardPerTokenStored: results[3],
            stakingToken: results[4],
            rewardsToken: results[5]
        };
    } catch (error) {
        console.error('Failed to get USD staking pool information:', error);
        return null;
    }
}

/**
 * Get user staking information
 * @param {Object} contract - PwUSDStaking contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User staking information
 */
async function getUserUSDStakingInfo(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user USD staking information: Contract instance or user address is empty');
        return null;
    }
    
    try {
        // Get user staking information
        const results = await Promise.all([
            contract.methods.balanceOf(userAddress).call(),
            contract.methods.earned(userAddress).call(),
            contract.methods.userRewardPerTokenPaid(userAddress).call(),
            contract.methods.rewards(userAddress).call()
        ]);
        
        return {
            stakedAmount: results[0],
            earnedRewards: results[1],
            userRewardPerTokenPaid: results[2],
            pendingRewards: results[3]
        };
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) USD staking information:`, error);
        return null;
    }
}

/**
 * Get staking reward rate
 * @param {Object} contract - PwUSDStaking contract instance
 * @returns {Promise<string>} Reward rate
 */
async function getUSDRewardRate(contract) {
    if (!contract) {
        console.error('Failed to get USD reward rate: Contract instance is empty');
        return '0';
    }
    
    try {
        const rewardRate = await contract.methods.rewardRate().call();
        return rewardRate;
    } catch (error) {
        console.error('Failed to get USD reward rate:', error);
        return '0';
    }
}

/**
 * Calculate the rewards earned by the user
 * @param {Object} contract - PwUSDStaking contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} Earned rewards
 */
async function getUSDEarnedRewards(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to calculate earned USD rewards: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        const earned = await contract.methods.earned(userAddress).call();
        return earned;
    } catch (error) {
        console.error(`Failed to calculate earned USD rewards for user (${userAddress}):`, error);
        return '0';
    }
}

// Export functions to the global object
window.initPwUSDStakingContract = initPwUSDStakingContract;
window.getUSDStakingPoolInfo = getUSDStakingPoolInfo;
window.getUserUSDStakingInfo = getUserUSDStakingInfo;
window.getUSDRewardRate = getUSDRewardRate;
window.getUSDEarnedRewards = getUSDEarnedRewards; 