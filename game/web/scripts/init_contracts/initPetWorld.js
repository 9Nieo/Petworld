/**
 * PetWorld Contract Initialization File
 * This file is responsible for initializing the PetWorld contract instance
 */

/**
 * Initialize PetWorld contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PetWorld contract instance
 */
function initPetWorldContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PetWorld contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let petWorldAddress;
        
        if (typeof getContractAddress === 'function') {
            petWorldAddress = getContractAddress('PetWorld');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            petWorldAddress = window.contractAddresses[network].PetWorld;
        } else {
            console.error('Unable to get PetWorld contract address');
            return null;
        }
        
        if (!petWorldAddress) {
            console.error('PetWorld contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PetWorldABI;
        if (!abi) {
            console.error('Unable to get PetWorld contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, petWorldAddress);
        console.log('PetWorld contract initialized successfully, address:', petWorldAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PetWorld contract:', error);
        return null;
    }
}

/**
 * Get token information
 * @param {Object} contract - PetWorld contract instance
 * @returns {Promise<Object>} Token information
 */
async function getPetWorldTokenInfo(contract) {
    if (!contract) {
        console.error('Failed to get PetWorld token information: Contract instance is empty');
        return null;
    }
    
    try {
        // Get token information
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            contract.methods.name().call(),
            contract.methods.symbol().call(),
            contract.methods.decimals().call(),
            contract.methods.totalSupply().call()
        ]);
        
        return {
            name,
            symbol,
            decimals: parseInt(decimals),
            totalSupply
        };
    } catch (error) {
        console.error('Failed to get PetWorld token information:', error);
        return null;
    }
}

/**
 * Get user token balance
 * @param {Object} contract - PetWorld contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} User token balance
 */
async function getUserPetWorldBalance(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user PetWorld balance: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        const balance = await contract.methods.balanceOf(userAddress).call();
        return balance;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) PetWorld balance:`, error);
        return '0';
    }
}

/**
 * Get the owner of the PetWorld token
 * @param {Object} contract - PetWorld contract instance
 * @returns {Promise<string>} Contract owner address
 */
async function getPetWorldOwner(contract) {
    if (!contract) {
        console.error('Failed to get PetWorld owner: Contract instance is empty');
        return null;
    }
    
    try {
        const owner = await contract.methods.owner().call();
        return owner;
    } catch (error) {
        console.error('Failed to get PetWorld owner:', error);
        return null;
    }
}

/**
 * Check user token allowance
 * @param {Object} contract - PetWorld contract instance
 * @param {string} ownerAddress - Token holder address
 * @param {string} spenderAddress - Token spender address
 * @returns {Promise<string>} Allowance amount
 */
async function checkPetWorldAllowance(contract, ownerAddress, spenderAddress) {
    if (!contract || !ownerAddress || !spenderAddress) {
        console.error('Failed to check PetWorld allowance: Contract instance, holder address, or spender address is empty');
        return '0';
    }
    
    try {
        const allowance = await contract.methods.allowance(ownerAddress, spenderAddress).call();
        return allowance;
    } catch (error) {
        console.error(`Failed to check PetWorld allowance (holder: ${ownerAddress}, spender: ${spenderAddress}):`, error);
        return '0';
    }
}

// Export functions to the global object
window.initPetWorldContract = initPetWorldContract;
window.getPetWorldTokenInfo = getPetWorldTokenInfo;
window.getUserPetWorldBalance = getUserPetWorldBalance;
window.getPetWorldOwner = getPetWorldOwner;
window.checkPetWorldAllowance = checkPetWorldAllowance; 