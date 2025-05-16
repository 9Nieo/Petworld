/**
 * NFTMarketplace Contract Initialization File
 * This file is responsible for initializing the NFTMarketplace contract instance
 */

/**
 * Initialize NFTMarketplace contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} NFTMarketplace contract instance
 */
function initNFTMarketplaceContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize NFTMarketplace contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let nftMarketplaceAddress;
        
        if (typeof getContractAddress === 'function') {
            nftMarketplaceAddress = getContractAddress('NFTMarketplace');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            nftMarketplaceAddress = window.contractAddresses[network].NFTMarketplace;
        } else {
            console.error('Unable to get NFTMarketplace contract address');
            return null;
        }
        
        if (!nftMarketplaceAddress) {
            console.error('NFTMarketplace contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.NFTMarketplaceABI;
        if (!abi) {
            console.error('Unable to get NFTMarketplace contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, nftMarketplaceAddress);
        console.log('NFTMarketplace contract initialized successfully, address:', nftMarketplaceAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize NFTMarketplace contract:', error);
        return null;
    }
}

/**
 * Get all NFTs for sale in the market
 * @param {Object} contract - NFTMarketplace contract instance
 * @returns {Promise<Array>} List of NFTs in the market
 */
async function getMarketItems(contract) {
    if (!contract) {
        console.error('Failed to get market items: Contract instance is empty');
        return [];
    }
    
    try {
        // Fetch all items in the market
        const marketItems = await contract.methods.fetchMarketItems().call();
        return marketItems;
    } catch (error) {
        console.error('Failed to get market items:', error);
        return [];
    }
}

/**
 * Get the user's NFTs in the market
 * @param {Object} contract - NFTMarketplace contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Array>} User's market NFT list
 */
async function getUserMarketItems(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user market items: Contract instance or user address is empty');
        return [];
    }
    
    try {
        // Fetch items created by the user
        const createdItems = await contract.methods.fetchItemsCreated(userAddress).call();
        
        // Fetch items purchased by the user
        const purchasedItems = await contract.methods.fetchMyNFTs(userAddress).call();
        
        return {
            created: createdItems,
            purchased: purchasedItems
        };
    } catch (error) {
        console.error('Failed to get user market items:', error);
        return {
            created: [],
            purchased: []
        };
    }
}

/**
 * Get the listing fee
 * @param {Object} contract - NFTMarketplace contract instance
 * @returns {Promise<string>} Listing fee
 */
async function getListingFee(contract) {
    if (!contract) {
        console.error('Failed to get listing fee: Contract instance is empty');
        return '0';
    }
    
    try {
        const listingFee = await contract.methods.getListingFee().call();
        return listingFee;
    } catch (error) {
        console.error('Failed to get listing fee:', error);
        return '0';
    }
}

// Export functions to the global object
window.initNFTMarketplaceContract = initNFTMarketplaceContract;
window.getMarketItems = getMarketItems;
window.getUserMarketItems = getUserMarketItems;
window.getListingFee = getListingFee; 