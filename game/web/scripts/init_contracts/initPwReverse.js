/**
 * PwReverse Token Contract Initialization File
 * This file is responsible for initializing the PwReverse token contract instance
 */

/**
 * Initialize PwReverse token contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwReverse contract instance
 */
function initPwReverseContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwReverse contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwReverseAddress;
        
        if (typeof getContractAddress === 'function') {
            pwReverseAddress = getContractAddress('PwReverse');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwReverseAddress = window.contractAddresses[network].PwReverse;
        } else {
            console.error('Unable to get PwReverse contract address');
            return null;
        }
        
        if (!pwReverseAddress) {
            console.error('PwReverse contract address is empty');
            return null;
        }
        
        // Get contract ABI, prioritize specific ABI, otherwise use generic ERC20 ABI
        const abi = window.PwReverseABI || window.GENERIC_ERC20_ABI;
        if (!abi) {
            console.error('Unable to get PwReverse contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwReverseAddress);
        console.log('PwReverse contract initialized successfully, address:', pwReverseAddress);
        
        // Enhance contract object with more debugging methods
        contract.getBalance = async function(address) {
            console.log(`Attempting to get PwReverse balance for address ${address}`);
            try {
                const balance = await this.methods.balanceOf(address).call();
                console.log(`PwReverse balance for address ${address} is: ${balance}`);
                return balance;
            } catch (error) {
                console.error(`Failed to get PwReverse balance (${address}):`, error);
                console.log('Attempting to use generic ERC20 method');
                return '0';
            }
        };
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwReverse contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPwReverseContract = initPwReverseContract; 