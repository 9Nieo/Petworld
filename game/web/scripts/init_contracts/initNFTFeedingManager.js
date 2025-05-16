/**
 * NFTFeedingManager Contract Initialization File
 * This file is responsible for initializing the NFTFeedingManager contract instance
 */

/**
 * Initialize NFTFeedingManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} NFTFeedingManager contract instance
 */
function initNFTFeedingManagerContract(web3, getContractAddress) {
    try {
        // Check the web3 parameter, if not provided, try to use the global web3 object
        let web3Instance = web3;
        if (!web3Instance) {
            console.log('Web3 parameter not provided, trying to use global web3 object');
            if (window.web3) {
                web3Instance = window.web3;
            } else if (window.ethereum) {
                console.log('Creating a new web3 instance using window.ethereum');
                web3Instance = new Web3(window.ethereum);
                // Save to global variable for later use
                window.web3 = web3Instance;
            } else {
                console.error('Failed to initialize NFTFeedingManager contract: Unable to get Web3 instance');
                return null;
            }
        }
        
        // Validate the web3 instance
        if (!web3Instance.eth || typeof web3Instance.eth.Contract !== 'function') {
            console.error('Failed to initialize NFTFeedingManager contract: Invalid Web3 instance', web3Instance);
            return null;
        }
        
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let nftFeedingManagerAddress;
        
        console.log('Initializing NFTFeedingManager contract...');
        console.log('Current network:', network);
        
        if (typeof getContractAddress === 'function') {
            nftFeedingManagerAddress = getContractAddress('NFTFeedingManager');
            console.log('Contract address obtained through function:', nftFeedingManagerAddress);
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            nftFeedingManagerAddress = window.contractAddresses[network].NFTFeedingManager;
            console.log('Contract address obtained through global variable:', nftFeedingManagerAddress);
        } else {
            console.error('Unable to get NFTFeedingManager contract address');
            if (window.contractAddresses) {
                console.log('Available contract address configuration:', JSON.stringify(window.contractAddresses, null, 2));
            } else {
                console.log('Global contract address configuration does not exist');
            }
            return null;
        }
        
        if (!nftFeedingManagerAddress) {
            console.error('NFTFeedingManager contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.NFTFeedingManagerABI;
        if (!abi) {
            console.error('Unable to get NFTFeedingManager contract ABI');
            return null;
        }
        
        console.log('NFTFeedingManagerABI loaded, length:', abi.length);
        
        // Create contract instance
        try {
            console.log('Web3 version used:', web3Instance.version);
            const contract = new web3Instance.eth.Contract(abi, nftFeedingManagerAddress);
            console.log('NFTFeedingManager contract initialized successfully, address:', nftFeedingManagerAddress);
            return contract;
        } catch (err) {
            console.error('Error occurred while creating contract instance:', err);
            console.error('Error details:', err.stack);
            // Output debug information
            console.log('web3Instance.eth:', !!web3Instance.eth);
            console.log('web3Instance.eth.Contract:', !!web3Instance.eth.Contract);
            console.log('Is ABI valid:', Array.isArray(abi));
            return null;
        }
    } catch (error) {
        console.error('Failed to initialize NFTFeedingManager contract:', error);
        console.error('Error stack:', error.stack);
        return null;
    }
}

// Export function to the global object
window.initNFTFeedingManagerContract = initNFTFeedingManagerContract; 