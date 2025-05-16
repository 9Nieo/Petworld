/**
 * PaymentManager Contract Initialization File
 * This file is responsible for initializing the PaymentManager contract instance
 */

/**
 * Initialize PaymentManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PaymentManager contract instance
 */
function initPaymentManagerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PaymentManager contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let paymentManagerAddress;
        
        if (typeof getContractAddress === 'function') {
            paymentManagerAddress = getContractAddress('PaymentManager');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            paymentManagerAddress = window.contractAddresses[network].PaymentManager;
        } else {
            console.error('Unable to get PaymentManager contract address');
            return null;
        }
        
        if (!paymentManagerAddress) {
            console.error('PaymentManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PaymentManagerABI;
        if (!abi) {
            console.error('Unable to get PaymentManager contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, paymentManagerAddress);
        console.log('PaymentManager contract initialized successfully, address:', paymentManagerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PaymentManager contract:', error);
        return null;
    }
}

// Export function to the global object
window.initPaymentManagerContract = initPaymentManagerContract; 