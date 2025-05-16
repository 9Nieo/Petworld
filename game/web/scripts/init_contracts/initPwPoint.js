/**
 * PwPoint Token Contract Initialization File
 * This file is responsible for initializing the PwPoint token contract instance
 */

/**
 * Initialize PwPoint token contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwPoint contract instance
 */
function initPwPointContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwPoint contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwPointAddress;
        
        if (typeof getContractAddress === 'function') {
            pwPointAddress = getContractAddress('PwPoint');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwPointAddress = window.contractAddresses[network].PwPoint;
        } else {
            console.error('Unable to get PwPoint contract address');
            return null;
        }
        
        if (!pwPointAddress) {
            console.error('PwPoint contract address is empty');
            return null;
        }
        
        // Get contract ABI, prioritize specific ABI, otherwise use generic ERC20 ABI
        const abi = window.PwPointABI || window.GENERIC_ERC20_ABI;
        if (!abi) {
            console.error('Unable to get PwPoint contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwPointAddress);
        console.log('PwPoint contract initialized successfully, address:', pwPointAddress);
        
        // Enhance contract object with more debugging methods
        contract.getBalance = async function(address) {
            console.log(`Attempting to get PwPoint balance for address ${address}`);
            try {
                const balance = await this.methods.balanceOf(address).call();
                console.log(`PwPoint balance for address ${address} is: ${balance}`);
                return balance;
            } catch (error) {
                console.error(`Failed to get PwPoint balance (${address}):`, error);
                console.log('Attempting to use generic ERC20 method');
                return '0';
            }
        };
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwPoint contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPwPointContract = initPwPointContract; 