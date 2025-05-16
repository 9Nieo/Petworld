/**
 * PetWorldStaking Contract Initialization File
 * This file is responsible for initializing the PetWorldStaking contract instance
 */

/**
 * Initialize PetWorldStaking contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PetWorldStaking contract instance
 */
function initPetWorldStakingContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PetWorldStaking contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let petWorldStakingAddress;
        
        if (typeof getContractAddress === 'function') {
            petWorldStakingAddress = getContractAddress('PetWorldStaking');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            petWorldStakingAddress = window.contractAddresses[network].PetWorldStaking;
        } else {
            console.error('Unable to get PetWorldStaking contract address');
            return null;
        }
        
        if (!petWorldStakingAddress) {
            console.error('PetWorldStaking contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PetWorldStakingABI;
        if (!abi) {
            console.error('Unable to get PetWorldStaking contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, petWorldStakingAddress);
        console.log('PetWorldStaking contract initialized successfully, address:', petWorldStakingAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PetWorldStaking contract:', error);
        return null;
    }
}

/**
 * Get staking pool information
 * @param {Object} contract - PetWorldStaking contract instance
 * @returns {Promise<Object>} Staking pool information
 */
async function getStakingPoolInfo(contract) {
    if (!contract) {
        console.error('Failed to get staking pool information: Contract instance is empty');
        return null;
    }
    
    try {
        // Get staking pool information
        const results = await Promise.all([
            contract.methods.totalStaked().call(),
            contract.methods.rewardRate().call(),
            contract.methods.lastUpdateTime().call(),
            contract.methods.rewardPerTokenStored().call()
        ]);
        
        return {
            totalStaked: results[0],
            rewardRate: results[1],
            lastUpdateTime: results[2],
            rewardPerTokenStored: results[3]
        };
    } catch (error) {
        console.error('Failed to get staking pool information:', error);
        return null;
    }
}

/**
 * Get user staking information
 * @param {Object} contract - PetWorldStaking contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User staking information
 */
async function getUserStakingInfo(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user staking information: Contract instance or user address is empty');
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
        console.error(`Failed to get user (${userAddress}) staking information:`, error);
        return null;
    }
}

/**
 * Get reward rate
 * @param {Object} contract - PetWorldStaking contract instance
 * @returns {Promise<string>} Reward rate
 */
async function getRewardRate(contract) {
    if (!contract) {
        console.error('Failed to get reward rate: Contract instance is empty');
        return '0';
    }
    
    try {
        const rewardRate = await contract.methods.rewardRate().call();
        return rewardRate;
    } catch (error) {
        console.error('Failed to get reward rate:', error);
        return '0';
    }
}

/**
 * Calculate the rewards earned by the user
 * @param {Object} contract - PetWorldStaking contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} Earned rewards
 */
async function getEarnedRewards(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to calculate earned rewards: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        const earned = await contract.methods.earned(userAddress).call();
        return earned;
    } catch (error) {
        console.error(`Failed to calculate earned rewards for user (${userAddress}):`, error);
        return '0';
    }
}

// Export functions to the global object
window.initPetWorldStakingContract = initPetWorldStakingContract;
window.getStakingPoolInfo = getStakingPoolInfo;
window.getUserStakingInfo = getUserStakingInfo;
window.getRewardRate = getRewardRate;
window.getEarnedRewards = getEarnedRewards; 