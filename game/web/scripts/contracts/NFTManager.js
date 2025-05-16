// Use global variables instead of require
// const NFTManagerABI = require('./ABI/NFTManagerABI');
// const contractAddress = require('./contractAddresses');

const Quality = {
  COMMON: 0,
  GOOD: 1,
  EXCELLENT: 2,
  RARE: 3,
  LEGENDARY: 4
};

/**
 * NFTManager contract interface class
 */
class NFTManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - NFTManager contract address (optional)
   */
  constructor(web3, contractAddress) {
    this.web3 = web3;
    
    // If a contract address is provided directly, use the provided address
    if (contractAddress) {
      this.contractAddress = contractAddress;
    } 
    // Get contract address from global function
    else if (typeof window.getContractAddress === 'function') {
      this.contractAddress = window.getContractAddress('NFTManager');
    } 
    // Get contract address from global object
    else if (window.contractAddresses) {
      const network = window.currentNetwork || 'TEST';
      this.contractAddress = window.contractAddresses[network]?.NFTManager;
    }
    
    if (!this.contractAddress) {
      console.error('Unable to get NFTManager contract address');
      return;
    }
    
    // Use global NFTManagerABI
    if (!window.NFTManagerABI) {
      console.error('NFTManagerABI is undefined, please ensure NFTManagerABI.js is loaded first');
      return;
    }
    
    this.contract = new web3.eth.Contract(window.NFTManagerABI, this.contractAddress);
    this.Quality = Quality;
  }

  /**
   * Get the remaining quantity of NFT by name and quality
   * @param {number} name - NFT name ID
   * @param {number} quality - NFT quality
   * @returns {Promise<number>} - Remaining quantity
   */
  async getRemainingByName(name, quality) {
    try {
      const remaining = await this.contract.methods.getRemainingByName(name, quality).call();
      return remaining;
    } catch (error) {
      console.error('Failed to get remaining NFT quantity:', error);
      throw error;
    }
  }

  /**
   * Get detailed information of NFT by name and quality
   * @param {number} name - NFT name ID
   * @param {number} quality - NFT quality
   * @returns {Promise<Object>} - NFT information
   */
  async getNFTInfoByName(name, quality) {
    try {
      const info = await this.contract.methods.getNFTInfoByName(name, quality).call();
      return {
        uri: info.uri,
        maxSupply: parseInt(info.maxSupply),
        minted: parseInt(info.minted),
        active: info.active,
        remaining: parseInt(info.remaining)
      };
    } catch (error) {
      console.error('Failed to get NFT information:', error);
      throw error;
    }
  }

  /**
   * Get the quantity information of NFTs with specified quality
   * @param {number} quality - NFT quality
   * @returns {Promise<Object>} - Total and available counts
   */
  async getAvailableNFTCount(quality) {
    try {
      const result = await this.contract.methods.getAvailableNFTCount(quality).call();
      return {
        total: parseInt(result.total),
        available: parseInt(result.available)
      };
    } catch (error) {
      console.error('Failed to get available NFT quantity:', error);
      throw error;
    }
  }

  /**
   * Get the total number of NFTs with specified quality
   * @param {number} quality - NFT quality
   * @returns {Promise<number>} - Total number of NFTs
   */
  async getNFTCountByQuality(quality) {
    try {
      const count = await this.contract.methods.nftCountByQuality(quality).call();
      return parseInt(count);
    } catch (error) {
      console.error('Failed to get total number of NFTs:', error);
      throw error;
    }
  }

  /**
   * Get the total remaining quantity of rare NFTs
   * @returns {Promise<number>} - Remaining quantity of rare NFTs
   */
  async getTotalRareRemaining() {
    try {
      const remaining = await this.contract.methods.totalRareRemaining().call();
      return parseInt(remaining);
    } catch (error) {
      console.error('Failed to get remaining quantity of rare NFTs:', error);
      throw error;
    }
  }

  /**
   * Get the total remaining quantity of legendary NFTs
   * @returns {Promise<number>} - Remaining quantity of legendary NFTs
   */
  async getTotalLegendaryRemaining() {
    try {
      const remaining = await this.contract.methods.totalLegendaryRemaining().call();
      return parseInt(remaining);
    } catch (error) {
      console.error('Failed to get remaining quantity of legendary NFTs:', error);
      throw error;
    }
  }

  /**
   * Get the quality corresponding to the TokenID
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<number>} - NFT quality
   */
  async getTokenQuality(tokenId) {
    try {
      const quality = await this.contract.methods.tokenQuality(tokenId).call();
      return parseInt(quality);
    } catch (error) {
      console.error('Failed to get token quality:', error);
      throw error;
    }
  }

  /**
   * Get the quality ID corresponding to the TokenID
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<number>} - Quality ID
   */
  async getTokenQualityId(tokenId) {
    try {
      const qualityId = await this.contract.methods.tokenQualityId(tokenId).call();
      return parseInt(qualityId);
    } catch (error) {
      console.error('Failed to get token quality ID:', error);
      throw error;
    }
  }

  /**
   * Get the URI corresponding to the TokenID
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<string>} - Token URI
   */
  async getTokenURI(tokenId) {
    try {
      const uri = await this.contract.methods._tokenURIs(tokenId).call();
      return uri;
    } catch (error) {
      console.error('Failed to get token URI:', error);
      throw error;
    }
  }

  /**
   * Get the mint timestamp of the TokenID
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<number>} - Mint timestamp
   */
  async getMintTimestamp(tokenId) {
    try {
      const timestamp = await this.contract.methods.mintTimestamps(tokenId).call();
      return parseInt(timestamp);
    } catch (error) {
      console.error('Failed to get mint timestamp:', error);
      throw error;
    }
  }
}

// Export to global object, used in browser environment
window.NFTManagerContract = NFTManagerContract;
window.NFTQuality = Quality; 