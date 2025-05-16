/**
 * PwFoodManager Contract Initialization File
 * This file is responsible for initializing the PwFoodManager contract instance
 */

/**
 * Initialize PwFoodManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwFoodManager contract instance
 */
function initPwFoodManagerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwFoodManager contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'TEST';
        let pwFoodManagerAddress;
        
        if (typeof getContractAddress === 'function') {
            pwFoodManagerAddress = getContractAddress('PwFoodManager');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwFoodManagerAddress = window.contractAddresses[network].PwFoodManager;
        } else {
            console.error('Unable to get PwFoodManager contract address');
            return null;
        }
        
        if (!pwFoodManagerAddress) {
            console.error('PwFoodManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwFoodManagerABI;
        if (!abi) {
            console.error('Unable to get PwFoodManager contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwFoodManagerAddress);
        console.log('PwFoodManager contract initialized successfully, address:', pwFoodManagerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwFoodManager contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPwFoodManagerContract = initPwFoodManagerContract;