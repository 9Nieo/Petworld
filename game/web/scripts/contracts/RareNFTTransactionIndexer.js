const RareNFTTransactionIndexerABI = require('./ABI/RareNFTTransactionIndexerABI');
const contractAddress = require('./contractAddresses');

// Quality enumeration values
const Quality = {
  COMMON: 0,
  GOOD: 1,
  EXCELLENT: 2,
  RARE: 3,
  LEGENDARY: 4
};

/**
 * RareNFTTransactionIndexer contract interface class
 */
class RareNFTTransactionIndexerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - RareNFTTransactionIndexer contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('RareNFTTransactionIndexer');
    this.contract = new web3.eth.Contract(RareNFTTransactionIndexerABI, this.contractAddress);
    this.Quality = Quality;
  }

  /**
   * Get specific transaction record
   * @param {number} index - Transaction index
   * @returns {Promise<Object>} - Transaction details
   */
  async getTransaction(index) {
    try {
      const tx = await this.contract.methods.transactions(index).call();
      return {
        tokenId: parseInt(tx.tokenId),
        seller: tx.seller,
        buyer: tx.buyer,
        quality: parseInt(tx.quality),
        price: tx.price,
        timestamp: parseInt(tx.timestamp),
        index: parseInt(tx.index)
      };
    } catch (error) {
      console.error('Failed to get transaction record:', error);
      throw error;
    }
  }

  /**
   * Get total number of transactions
   * @returns {Promise<number>} - Total number of transactions
   */
  async getTransactionCount() {
    try {
      const count = await this.contract.methods.getTransactionCount().call();
      return parseInt(count);
    } catch (error) {
      console.error('Failed to get total number of transactions:', error);
      throw error;
    }
  }

  /**
   * Get the number of time indices
   * @returns {Promise<number>} - Number of time indices
   */
  async getTimeIndicesCount() {
    try {
      const count = await this.contract.methods.getTimeIndicesCount().call();
      return parseInt(count);
    } catch (error) {
      console.error('Failed to get number of time indices:', error);
      throw error;
    }
  }

  /**
   * Get the number of price indices
   * @returns {Promise<number>} - Number of price indices
   */
  async getPriceIndicesCount() {
    try {
      const count = await this.contract.methods.getPriceIndicesCount().call();
      return parseInt(count);
    } catch (error) {
      console.error('Failed to get number of price indices:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions (pagination)
   * @param {number} page - Page number, starting from 1
   * @returns {Promise<Object>} - List of recent transactions
   */
  async getRecentTransactions(page) {
    try {
      const result = await this.contract.methods.getRecentTransactions(page).call();
      
      // Convert the returned result to a more usable format
      const transactions = [];
      for (let i = 0; i < result.tokenIds.length; i++) {
        transactions.push({
          tokenId: parseInt(result.tokenIds[i]),
          seller: result.sellers[i],
          buyer: result.buyers[i],
          price: result.prices[i],
          timestamp: parseInt(result.timestamps[i])
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get recent transactions:', error);
      throw error;
    }
  }

  /**
   * Get the most expensive transactions sorted by price (pagination)
   * @param {number} page - Page number, starting from 1
   * @returns {Promise<Object>} - List of transactions sorted by price
   */
  async getTopTransactionsByPrice(page) {
    try {
      const result = await this.contract.methods.getTopTransactionsByPrice(page).call();
      
      // Convert the returned result to a more usable format
      const transactions = [];
      for (let i = 0; i < result.tokenIds.length; i++) {
        transactions.push({
          tokenId: parseInt(result.tokenIds[i]),
          seller: result.sellers[i],
          buyer: result.buyers[i],
          price: result.prices[i],
          timestamp: parseInt(result.timestamps[i])
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get transactions sorted by price:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions of a specific quality (pagination)
   * @param {number} quality - Quality value (using Quality enumeration)
   * @param {number} page - Page number, starting from 1
   * @returns {Promise<Object>} - List of recent transactions of the specified quality
   */
  async getRecentTransactionsByQuality(quality, page) {
    try {
      const result = await this.contract.methods.getRecentTransactionsByQuality(quality, page).call();
      
      // Convert the returned result to a more usable format
      const transactions = [];
      for (let i = 0; i < result.tokenIds.length; i++) {
        transactions.push({
          tokenId: parseInt(result.tokenIds[i]),
          seller: result.sellers[i],
          buyer: result.buyers[i],
          price: result.prices[i],
          timestamp: parseInt(result.timestamps[i])
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get recent transactions of specified quality:', error);
      throw error;
    }
  }

  /**
   * Get the most expensive transactions of a specific quality sorted by price (pagination)
   * @param {number} quality - Quality value (using Quality enumeration)
   * @param {number} page - Page number, starting from 1
   * @returns {Promise<Object>} - List of transactions of specified quality sorted by price
   */
  async getTopTransactionsByQualityAndPrice(quality, page) {
    try {
      const result = await this.contract.methods.getTopTransactionsByQualityAndPrice(quality, page).call();
      
      // Convert the returned result to a more usable format
      const transactions = [];
      for (let i = 0; i < result.tokenIds.length; i++) {
        transactions.push({
          tokenId: parseInt(result.tokenIds[i]),
          seller: result.sellers[i],
          buyer: result.buyers[i],
          price: result.prices[i],
          timestamp: parseInt(result.timestamps[i])
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get specified quality transactions sorted by price:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    RareNFTTransactionIndexerContract,
    RareNFTTransactionIndexerABI,
    Quality
  };
} else {
  window.RareNFTTransactionIndexerContract = RareNFTTransactionIndexerContract;
  window.RareNFTTransactionIndexerABI = RareNFTTransactionIndexerABI;
  window.NFTTransactionIndexerQuality = Quality;
} 