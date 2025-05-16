/**
 * PwPointManager Contract Initialization File
 * This file is responsible for initializing the PwPointManager contract instance
 */

/**
 * Initialize PwPointManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwPointManager contract instance
 */
function initPwPointManagerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwPointManager contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwPointManagerAddress;
        
        if (typeof getContractAddress === 'function') {
            pwPointManagerAddress = getContractAddress('PwPointManager');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwPointManagerAddress = window.contractAddresses[network].PwPointManager;
        } else {
            console.error('Unable to get PwPointManager contract address');
            return null;
        }
        
        if (!pwPointManagerAddress) {
            console.error('PwPointManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwPointManagerABI;
        if (!abi) {
            console.error('Unable to get PwPointManager contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwPointManagerAddress);
        console.log('PwPointManager contract initialized successfully, address:', pwPointManagerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwPointManager contract:', error);
        return null;
    }
}

/**
 * Get point exchange rate
 * @param {Object} contract - PwPointManager contract instance
 * @returns {Promise<string>} Point exchange rate
 */
async function getPointExchangeRate(contract) {
    if (!contract) {
        console.error('Failed to get point exchange rate: Contract instance is empty');
        return '0';
    }
    
    try {
        const rate = await contract.methods.getPointExchangeRate().call();
        return rate;
    } catch (error) {
        console.error('Failed to get point exchange rate:', error);
        return '0';
    }
}

/**
 * Get user point balance
 * @param {Object} contract - PwPointManager contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} User point balance
 */
async function getUserPointBalance(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user point balance: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        const balance = await contract.methods.balanceOf(userAddress).call();
        return balance;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) point balance:`, error);
        return '0';
    }
}

/**
 * Get minter address
 * @param {Object} contract - PwPointManager contract instance
 * @returns {Promise<string>} Minter address
 */
async function getMinterAddress(contract) {
    if (!contract) {
        console.error('Failed to get minter address: Contract instance is empty');
        return null;
    }
    
    try {
        const minter = await contract.methods.minter().call();
        return minter;
    } catch (error) {
        console.error('Failed to get minter address:', error);
        return null;
    }
}

/**
 * Get the user's daily point claim status
 * @param {Object} contract - PwPointManager contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User daily point claim status
 */
async function getUserDailyPointClaim(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user daily point claim status: Contract instance or user address is empty');
        return null;
    }
    
    try {
        // Get the user's last claim time and daily limit
        const [lastClaimTime, dailyLimit] = await Promise.all([
            contract.methods.getLastClaimTime(userAddress).call(),
            contract.methods.getDailyClaimLimit().call()
        ]);
        
        // Calculate if the user can claim
        const now = Math.floor(Date.now() / 1000);
        const dayInSeconds = 24 * 60 * 60;
        const canClaim = (now - parseInt(lastClaimTime)) > dayInSeconds;
        
        return {
            lastClaimTime,
            dailyLimit,
            canClaim,
            nextClaimTime: parseInt(lastClaimTime) + dayInSeconds
        };
    } catch (error) {
        console.error(`Failed to get daily point claim status for user (${userAddress}):`, error);
        return null;
    }
}

// Export functions to the global object
window.initPwPointManagerContract = initPwPointManagerContract;
window.getPointExchangeRate = getPointExchangeRate;
window.getUserPointBalance = getUserPointBalance;
window.getMinterAddress = getMinterAddress;
window.getUserDailyPointClaim = getUserDailyPointClaim; 