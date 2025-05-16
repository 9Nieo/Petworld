/**
 * NFTManager Contract Initialization File
 * This file is responsible for initializing the NFTManager contract instance
 */

/**
 * Initialize NFTManager contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddressFunc - Function to get the contract address
 * @returns {Object} NFTManager contract instance
 */
function initNFTManager(web3, getContractAddressFunc) {
    try {
        // Get NFTManager contract address
        const nftManagerAddress = getContractAddressFunc('NFTManager');
        
        // Create contract instance
        const nftManagerContract = new web3.eth.Contract(
            window.NFTManagerABI,
            nftManagerAddress
        );
        
        console.log('NFTManager contract has been initialized:', nftManagerAddress);
        
        return nftManagerContract;
    } catch (error) {
        console.error('Failed to initialize NFTManager contract:', error);
        return null;
    }
}

/**
 * Get the user's NFT list
 * @param {Object} contract - NFTManager contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Array>} User's NFT list
 */
async function getUserNFTs(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user NFT list: Contract instance or user address is empty');
        return [];
    }
    
    try {
        const nfts = await contract.methods.getUserNFTs(userAddress).call();
        return nfts;
    } catch (error) {
        console.error(`Failed to get NFTs for user (${userAddress}):`, error);
        return [];
    }
}

/**
 * Get NFT details
 * @param {Object} contract - NFTManager contract instance
 * @param {string} tokenId - NFT ID
 * @returns {Promise<Object>} NFT details
 */
async function getNFTDetails(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to get NFT details: Contract instance or Token ID is empty');
        return null;
    }
    
    try {
        const details = await contract.methods.getNFTDetails(tokenId).call();
        return details;
    } catch (error) {
        console.error(`Failed to get details for NFT (${tokenId}):`, error);
        return null;
    }
}

/**
 * Check if NFT exists
 * @param {Object} contract - NFTManager contract instance
 * @param {string} tokenId - NFT ID
 * @returns {Promise<boolean>} Whether the NFT exists
 */
async function nftExists(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to check if NFT exists: Contract instance or Token ID is empty');
        return false;
    }
    
    try {
        const exists = await contract.methods.nftExists(tokenId).call();
        return exists;
    } catch (error) {
        console.error(`Failed to check if NFT (${tokenId}) exists:`, error);
        return false;
    }
}

// Export function to the global object
window.initNFTManagerContract = initNFTManager;

// Support CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = initNFTManager;
}

window.getUserNFTs = getUserNFTs;
window.getNFTDetails = getNFTDetails; 
window.nftExists = nftExists; 