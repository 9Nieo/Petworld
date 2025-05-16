/**
 * PwReverseBurner Contract Initialization File
 * This file is responsible for initializing the PwReverseBurner contract instance
 */

/**
 * Initialize PwReverseBurner contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwReverseBurner contract instance
 */
function initPwReverseBurnerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwReverseBurner contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwReverseBurnerAddress;
        
        if (typeof getContractAddress === 'function') {
            pwReverseBurnerAddress = getContractAddress('PwReverseBurner');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwReverseBurnerAddress = window.contractAddresses[network].PwReverseBurner;
        } else {
            console.error('Unable to get PwReverseBurner contract address');
            return null;
        }
        
        if (!pwReverseBurnerAddress) {
            console.error('PwReverseBurner contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwReverseBurnerABI;
        if (!abi) {
            console.error('Unable to get PwReverseBurner contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwReverseBurnerAddress);
        console.log('PwReverseBurner contract initialized successfully, address:', pwReverseBurnerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwReverseBurner contract:', error);
        return null;
    }
}

/**
 * Get the current exchange rate
 * @param {Object} contract - PwReverseBurner contract instance
 * @returns {Promise<string>} Current exchange rate
 */
async function getCurrentExchangeRate(contract) {
    if (!contract) {
        console.error('Failed to get current exchange rate: Contract instance is empty');
        return '0';
    }
    
    try {
        const rate = await contract.methods.getCurrentExchangeRate().call();
        return rate;
    } catch (error) {
        console.error('Failed to get current exchange rate:', error);
        return '0';
    }
}

/**
 * Get daily exchange limit
 * @param {Object} contract - PwReverseBurner contract instance
 * @returns {Promise<Object>} Daily exchange limit information
 */
async function getDailyExchangeLimit(contract) {
    if (!contract) {
        console.error('Failed to get daily exchange limit: Contract instance is empty');
        return null;
    }
    
    try {
        // Get daily limit and total exchanged amount
        const [dailyLimit, todayExchanged] = await Promise.all([
            contract.methods.dailyExchangeLimit().call(),
            contract.methods.getTodayTotalExchanged().call()
        ]);
        
        return {
            dailyLimit,
            todayExchanged,
            remaining: Math.max(0, parseInt(dailyLimit) - parseInt(todayExchanged))
        };
    } catch (error) {
        console.error('Failed to get daily exchange limit:', error);
        return null;
    }
}

/**
 * Get the user's exchange information for today
 * @param {Object} contract - PwReverseBurner contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User's exchange information for today
 */
async function getUserExchangeInfo(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user exchange information: Contract instance or user address is empty');
        return null;
    }
    
    try {
        // Get the amount exchanged today and personal limit
        const [userExchanged, userLimit] = await Promise.all([
            contract.methods.getUserTodayExchanged(userAddress).call(),
            contract.methods.userDailyLimit().call()
        ]);
        
        return {
            userExchanged,
            userLimit,
            remaining: Math.max(0, parseInt(userLimit) - parseInt(userExchanged))
        };
    } catch (error) {
        console.error(`Failed to get exchange information for user (${userAddress}):`, error);
        return null;
    }
}

/**
 * Calculate the required amount of PetWorld tokens
 * @param {Object} contract - PwReverseBurner contract instance
 * @param {string} pointAmount - Amount of points to exchange
 * @returns {Promise<string>} Required amount of PetWorld tokens
 */
async function calculateRequiredPetWorld(contract, pointAmount) {
    if (!contract || !pointAmount) {
        console.error('Failed to calculate required PetWorld token amount: Contract instance or point amount is empty');
        return '0';
    }
    
    try {
        const required = await contract.methods.calculateRequiredPetWorld(pointAmount).call();
        return required;
    } catch (error) {
        console.error(`Failed to calculate required PetWorld tokens for ${pointAmount} points:`, error);
        return '0';
    }
}

// Export functions to the global object
window.initPwReverseBurnerContract = initPwReverseBurnerContract;
window.getCurrentExchangeRate = getCurrentExchangeRate;
window.getDailyExchangeLimit = getDailyExchangeLimit;
window.getUserExchangeInfo = getUserExchangeInfo;
window.calculateRequiredPetWorld = calculateRequiredPetWorld; 