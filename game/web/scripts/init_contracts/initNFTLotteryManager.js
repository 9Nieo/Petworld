/**
 * NFTLotteryManager Contract Initialization File
 * This file is responsible for initializing the NFTLotteryManager contract instance
 */

/**
 * Initialize NFTLotteryManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} NFTLotteryManager contract instance
 */
function initNFTLotteryManagerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize NFTLotteryManager contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'TEST';
        let nftLotteryManagerAddress;
        
        if (typeof getContractAddress === 'function') {
            nftLotteryManagerAddress = getContractAddress('NFTLotteryManager');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            nftLotteryManagerAddress = window.contractAddresses[network].NFTLotteryManager;
        } else {
            console.error('Unable to get NFTLotteryManager contract address');
            return null;
        }
        
        if (!nftLotteryManagerAddress) {
            console.error('NFTLotteryManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.NFTLotteryManagerABI;
        if (!abi) {
            console.error('Unable to get NFTLotteryManager contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, nftLotteryManagerAddress);
        console.log('NFTLotteryManager contract initialized successfully, address:', nftLotteryManagerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize NFTLotteryManager contract:', error);
        return null;
    }
}

// Convenience function to initialize NFTLotteryManagerContract class instance
function initNFTLotteryManagerContractClass(web3) {
    if (!web3) {
        console.error('Failed to initialize NFTLotteryManagerContract class: Web3 not initialized');
        return null;
    }
    
    try {
        if (window.NFTLotteryManagerContract) {
            return new window.NFTLotteryManagerContract(web3);
        } else {
            console.error('NFTLotteryManagerContract class is not defined');
            // Attempt to load NFTLotteryManager.js
            if (typeof window.loadScript === 'function') {
                console.log('Attempting to dynamically load NFTLotteryManager.js');
                window.loadScript('../../scripts/contracts/NFTLotteryManager.js', () => {
                    console.log('NFTLotteryManager.js has been loaded');
                    if (window.NFTLotteryManagerContract) {
                        return new window.NFTLotteryManagerContract(web3);
                    }
                });
            }
            return null;
        }
    } catch (error) {
        console.error('Failed to initialize NFTLotteryManagerContract class:', error);
        return null;
    }
}

// Export functions to the global object
window.initNFTLotteryManagerContract = initNFTLotteryManagerContract;
window.initNFTLotteryManagerContractClass = initNFTLotteryManagerContractClass; 