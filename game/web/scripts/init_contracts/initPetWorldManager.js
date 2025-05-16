/**
 * PetWorldManager Contract Initialization File
 * This file is responsible for initializing the PetWorldManager contract instance
 */

/**
 * Initialize PetWorldManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PetWorldManager contract instance
 */
function initPetWorldManagerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PetWorldManager contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let petWorldManagerAddress;
        
        if (typeof getContractAddress === 'function') {
            petWorldManagerAddress = getContractAddress('PetWorldManager');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            petWorldManagerAddress = window.contractAddresses[network].PetWorldManager;
        } else {
            console.error('Unable to get PetWorldManager contract address');
            return null;
        }
        
        if (!petWorldManagerAddress) {
            console.error('PetWorldManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PetWorldManagerABI;
        if (!abi) {
            console.error('Unable to get PetWorldManager contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, petWorldManagerAddress);
        console.log('PetWorldManager contract initialized successfully, address:', petWorldManagerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PetWorldManager contract:', error);
        return null;
    }
}

/**
 * Get game parameters
 * @param {Object} contract - PetWorldManager contract instance
 * @returns {Promise<Object>} Game parameters
 */
async function getGameParameters(contract) {
    if (!contract) {
        console.error('Failed to get game parameters: Contract instance is empty');
        return null;
    }
    
    try {
        // Get various game parameters
        const results = await Promise.all([
            contract.methods.getBaseRewardRate().call(),
            contract.methods.getStakingEnabled().call(),
            contract.methods.getMarketEnabled().call(),
            contract.methods.getBreedingEnabled().call()
        ]);
        
        return {
            baseRewardRate: results[0],
            stakingEnabled: results[1],
            marketEnabled: results[2],
            breedingEnabled: results[3]
        };
    } catch (error) {
        console.error('Failed to get game parameters:', error);
        return null;
    }
}

/**
 * Get user game status
 * @param {Object} contract - PetWorldManager contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User game status
 */
async function getUserGameStatus(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user game status: Contract instance or user address is empty');
        return null;
    }
    
    try {
        // Get user game status
        const userStatus = await contract.methods.getUserStatus(userAddress).call();
        return userStatus;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) game status:`, error);
        return null;
    }
}

/**
 * Check PetWorld token balance
 * @param {Object} contract - PetWorldManager contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} PetWorld token balance
 */
async function getPetWorldBalance(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get PetWorld balance: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        // Get user PetWorld token balance
        const balance = await contract.methods.balanceOf(userAddress).call();
        return balance;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) PetWorld balance:`, error);
        return '0';
    }
}

// Export functions to the global object
window.initPetWorldManagerContract = initPetWorldManagerContract;
window.getGameParameters = getGameParameters;
window.getUserGameStatus = getUserGameStatus;
window.getPetWorldBalance = getPetWorldBalance; 