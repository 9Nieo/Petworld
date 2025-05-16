/**
 * PwBounty Token Contract Initialization File
 * This file is responsible for initializing the PwBounty token contract instance
 */

/**
 * Initialize PwBounty token contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwBounty contract instance
 */
function initPwBountyContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwBounty contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwBountyAddress;
        
        if (typeof getContractAddress === 'function') {
            pwBountyAddress = getContractAddress('PwBounty');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwBountyAddress = window.contractAddresses[network].PwBounty;
        } else {
            console.error('Unable to get PwBounty contract address');
            return null;
        }
        
        if (!pwBountyAddress) {
            console.error('PwBounty contract address is empty');
            return null;
        }
        
        // Get contract ABI, prioritize specific ABI, otherwise use generic ERC20 ABI
        const abi = window.PwBountyABI || window.GENERIC_ERC20_ABI;
        if (!abi) {
            console.error('Unable to get PwBounty contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwBountyAddress);
        console.log('PwBounty contract initialized successfully, address:', pwBountyAddress);
        
        // Enhance contract object with more debugging methods
        contract.getBalance = async function(address) {
            console.log(`Attempting to get PwBounty balance for address ${address}`);
            try {
                const balance = await this.methods.balanceOf(address).call();
                console.log(`PwBounty balance for address ${address} is: ${balance}`);
                return balance;
            } catch (error) {
                console.error(`Failed to get PwBounty balance (${address}):`, error);
                console.log('Attempting to use generic ERC20 method');
                return '0';
            }
        };
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwBounty contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPwBountyContract = initPwBountyContract; 