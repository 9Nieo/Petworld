/**
 * RareNFTTransactionIndexer Contract Initialization File
 * This file is responsible for initializing the RareNFTTransactionIndexer contract instance
 */

/**
 * Initialize RareNFTTransactionIndexer contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} RareNFTTransactionIndexer contract instance
 */
function initRareNFTTransactionIndexerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize RareNFTTransactionIndexer contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let rareNFTTransactionIndexerAddress;
        
        if (typeof getContractAddress === 'function') {
            rareNFTTransactionIndexerAddress = getContractAddress('RareNFTTransactionIndexer');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            rareNFTTransactionIndexerAddress = window.contractAddresses[network].RareNFTTransactionIndexer;
        } else {
            console.error('Unable to get RareNFTTransactionIndexer contract address');
            return null;
        }
        
        if (!rareNFTTransactionIndexerAddress) {
            console.error('RareNFTTransactionIndexer contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.RareNFTTransactionIndexerABI;
        if (!abi) {
            console.error('Unable to get RareNFTTransactionIndexer contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, rareNFTTransactionIndexerAddress);
        console.log('RareNFTTransactionIndexer contract initialized successfully, address:', rareNFTTransactionIndexerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize RareNFTTransactionIndexer contract:', error);
        return null;
    }
}

/**
 * Get NFT transaction history
 * @param {Object} contract - RareNFTTransactionIndexer contract instance
 * @param {string} tokenId - NFT token ID
 * @returns {Promise<Array>} NFT transaction history
 */
async function getNFTTransactionHistory(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to get NFT transaction history: Contract instance or token ID is empty');
        return [];
    }
    
    try {
        const history = await contract.methods.getTransactionHistory(tokenId).call();
        return history;
    } catch (error) {
        console.error(`Failed to get NFT (ID:${tokenId}) transaction history:`, error);
        return [];
    }
}

/**
 * Get user's NFT transactions
 * @param {Object} contract - RareNFTTransactionIndexer contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Object>} User's NFT transaction information
 */
async function getUserNFTTransactions(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user NFT transactions: Contract instance or user address is empty');
        return { bought: [], sold: [] };
    }
    
    try {
        const [boughtNFTs, soldNFTs] = await Promise.all([
            contract.methods.getUserBoughtNFTs(userAddress).call(),
            contract.methods.getUserSoldNFTs(userAddress).call()
        ]);
        
        return {
            bought: boughtNFTs,
            sold: soldNFTs
        };
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) NFT transactions:`, error);
        return { bought: [], sold: [] };
    }
}

/**
 * Get recent NFT transactions
 * @param {Object} contract - RareNFTTransactionIndexer contract instance
 * @param {number} count - Number of transactions to retrieve
 * @returns {Promise<Array>} Recent NFT transaction list
 */
async function getRecentNFTTransactions(contract, count = 10) {
    if (!contract) {
        console.error('Failed to get recent NFT transactions: Contract instance is empty');
        return [];
    }
    
    try {
        const transactions = await contract.methods.getRecentTransactions(count).call();
        return transactions;
    } catch (error) {
        console.error('Failed to get recent NFT transactions:', error);
        return [];
    }
}

/**
 * Get the latest price of a specific NFT
 * @param {Object} contract - RareNFTTransactionIndexer contract instance
 * @param {string} tokenId - NFT token ID
 * @returns {Promise<string>} Latest price of the NFT
 */
async function getLatestNFTPrice(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to get latest price of NFT: Contract instance or token ID is empty');
        return '0';
    }
    
    try {
        const latestPrice = await contract.methods.getLatestPrice(tokenId).call();
        return latestPrice;
    } catch (error) {
        console.error(`Failed to get latest price for NFT (ID:${tokenId}):`, error);
        return '0';
    }
}

// Export functions to the global object
window.initRareNFTTransactionIndexerContract = initRareNFTTransactionIndexerContract;
window.getNFTTransactionHistory = getNFTTransactionHistory;
window.getUserNFTTransactions = getUserNFTTransactions;
window.getRecentNFTTransactions = getRecentNFTTransactions;
window.getLatestNFTPrice = getLatestNFTPrice; 