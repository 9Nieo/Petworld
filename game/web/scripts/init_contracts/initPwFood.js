/**
 * PwFood Token Contract Initialization File
 * This file is responsible for initializing the PwFood token contract instance
 */

/**
 * Initialize PwFood token contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwFood contract instance
 */
function initPwFoodContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwFood contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwFoodAddress;
        
        if (typeof getContractAddress === 'function') {
            pwFoodAddress = getContractAddress('PwFood');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwFoodAddress = window.contractAddresses[network].PwFood;
        } else {
            console.error('Unable to get PwFood contract address');
            return null;
        }
        
        if (!pwFoodAddress) {
            console.error('PwFood contract address is empty');
            return null;
        }
        
        // Get contract ABI, prioritize specific ABI, otherwise use generic ERC20 ABI
        const abi = window.PwFoodABI || window.GENERIC_ERC20_ABI;
        if (!abi) {
            console.error('Unable to get PwFood contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwFoodAddress);
        console.log('PwFood contract initialized successfully, address:', pwFoodAddress);
        
        // Enhance contract object with more debugging methods
        contract.getBalance = async function(address) {
            console.log(`Attempting to get PwFood balance for address ${address}`);
            try {
                const balance = await this.methods.balanceOf(address).call();
                console.log(`PwFood balance for address ${address} is: ${balance}`);
                return balance;
            } catch (error) {
                console.error(`Failed to get PwFood balance (${address}):`, error);
                console.log('Attempting to use generic ERC20 method');
                return '0';
            }
        };
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwFood contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPwFoodContract = initPwFoodContract; 