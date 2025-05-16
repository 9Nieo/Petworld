const NFTMarketplaceABI = require('./ABI/NFTMarketplaceABI');
const contractAddress = require('./contractAddresses');

const Quality = {
  COMMON: 0,
  GOOD: 1,
  EXCELLENT: 2,
  RARE: 3,
  LEGENDARY: 4
};

/**
 * NFTMarketplace contract interface class
 */
class NFTMarketplaceContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - NFTMarketplace contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('NFTMarketplace');
    this.contract = new web3.eth.Contract(NFTMarketplaceABI, this.contractAddress);
    this.Quality = Quality;
  }

  /**
   * Get the listing information of the NFT
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<Object>} - NFT listing information
   */
  async getListing(tokenId) {
    try {
      const listing = await this.contract.methods.listings(tokenId).call();
      return {
        seller: listing.seller,
        tokenId: parseInt(listing.tokenId),
        paymentToken: listing.paymentToken,
        price: listing.price,
        active: listing.active,
        lastListTime: parseInt(listing.lastListTime),
        lastDelistTime: parseInt(listing.lastDelistTime),
        lastPriceUpdateTime: parseInt(listing.lastPriceUpdateTime),
        quality: parseInt(listing.quality)
      };
    } catch (error) {
      console.error('Failed to get NFT listing information:', error);
      throw error;
    }
  }

  /**
   * Get the user's listed NFTs
   * @param {string} userAddress - User address
   * @param {number} index - List index
   * @returns {Promise<number>} - User's listed NFT TokenID
   */
  async getUserListingAtIndex(userAddress, index) {
    try {
      const tokenId = await this.contract.methods.userListings(userAddress, index).call();
      return parseInt(tokenId);
    } catch (error) {
      console.error('Failed to get user listed NFT:', error);
      throw error;
    }
  }

  /**
   * Get the listed NFTs of specified quality
   * @param {number} quality - NFT quality
   * @param {number} index - List index
   * @returns {Promise<number>} - Listed NFT TokenID
   */
  async getQualityListingAtIndex(quality, index) {
    try {
      const tokenId = await this.contract.methods.qualityListings(quality, index).call();
      return parseInt(tokenId);
    } catch (error) {
      console.error('Failed to get quality listed NFT:', error);
      throw error;
    }
  }

  /**
   * Calculate transaction fee
   * @param {string} price - NFT price
   * @returns {Promise<string>} - Transaction fee
   */
  async calculateFee(price) {
    try {
      const fee = await this.contract.methods.calculateFee(price).call();
      return fee;
    } catch (error) {
      console.error('Failed to calculate transaction fee:', error);
      throw error;
    }
  }

  /**
   * Create NFT listing
   * @param {number} tokenId - NFT's TokenID
   * @param {string} paymentToken - Payment token address
   * @param {string} price - NFT price
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async createListing(tokenId, paymentToken, price, options = {}) {
    try {
      // Set default gas limit based on NFT quality
      let defaultGas = 1500000; // Default to high gas limit
      
      // If NFT quality is provided, use quality-based gas limit
      if (options.quality) {
        // Set gas limit based on NFT quality
        const qualityGasMap = {
          'COMMON': 1000000,   // Common quality (although common quality is not allowed for listing, just in case)
          'GOOD': 1000000,     // Good quality
          'EXCELLENT': 1200000, // Excellent quality
          'RARE': 1500000,     // Rare quality
          'LEGENDARY': 1800000  // Legendary quality
        };
        
        defaultGas = qualityGasMap[options.quality] || 1500000;
      }
      
      // Check NFT approval (if PwNFT contract and user address are provided)
      if (options.pwNFTContract && options.from) {
        try {
          // Check if NFT is approved for the marketplace contract
          console.log('Checking NFT approval status...');
          
          const isApproved = await options.pwNFTContract.methods.isApprovedForAll(
            options.from, 
            this.contract._address || this.contract.options.address
          ).call();
          
          if (!isApproved) {
            console.log('NFT not approved for marketplace contract, approving...');
            
            // Try to use ContractApprovalManager (if available)
            if (window.ContractApprovalManager && window.ContractApprovalManager.approveNFTForMarketplace) {
              const approved = await window.ContractApprovalManager.approveNFTForMarketplace(
                options.pwNFTContract, 
                this.contract._address || this.contract.options.address, 
                options.from
              );
              
              if (!approved) {
                throw new Error('NFT approval failed, cannot list');
              }
              
              console.log('NFT successfully approved for marketplace contract');
            } else {
              // If ContractApprovalManager is not available, approve directly
              const approveReceipt = await options.pwNFTContract.methods.setApprovalForAll(
                this.contract._address || this.contract.options.address, 
                true
              ).send({ 
                from: options.from,
                gas: 300000 // Use fixed high gas for approval
              });
              
              console.log('NFT approval successful:', approveReceipt.transactionHash);
            }
          } else {
            console.log('NFT already approved for marketplace contract');
          }
        } catch (error) {
          console.error('Failed to check or set NFT approval:', error);
          throw new Error('NFT approval process failed: ' + error.message);
        }
      }
      
      // Send listing transaction with higher gas limit
      const tx = await this.contract.methods.createListing(tokenId, paymentToken, price).send({
        from: options.from,
        gas: options.gas || defaultGas // Use provided gas or default high gas limit
      });
      
      console.log('NFT listing successful:', tx.transactionHash);
      return tx;
    } catch (error) {
      console.error('Failed to create NFT listing:', error);
      throw error;
    }
  }

  /**
   * Cancel NFT listing
   * @param {number} tokenId - NFT's TokenID
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async cancelListing(tokenId, options = {}) {
    try {
      const tx = await this.contract.methods.cancelListing(tokenId).send({
        from: options.from,
        gas: options.gas || 200000
      });
      return tx;
    } catch (error) {
      console.error('Failed to cancel NFT listing:', error);
      throw error;
    }
  }

  /**
   * Buy NFT
   * @param {number} tokenId - NFT's TokenID
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async buyNFT(tokenId, options = {}) {
    try {
      const tx = await this.contract.methods.buyNFT(tokenId).send({
        from: options.from,
        gas: options.gas || 500000
      });
      return tx;
    } catch (error) {
      console.error('Failed to buy NFT:', error);
      throw error;
    }
  }

  /**
   * Update NFT listing price
   * @param {number} tokenId - NFT's TokenID
   * @param {string} newPrice - New NFT price
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async updateListingPrice(tokenId, newPrice, options = {}) {
    try {
      const tx = await this.contract.methods.updateListingPrice(tokenId, newPrice).send({
        from: options.from,
        gas: options.gas || 200000
      });
      return tx;
    } catch (error) {
      console.error('Failed to update NFT price:', error);
      throw error;
    }
  }

  /**
   * Get transaction fee percentage
   * @returns {Promise<number>} - Fee percentage
   */
  async getFeePercentage() {
    try {
      const feePercentage = await this.contract.methods.FEE_PERCENTAGE().call();
      return parseInt(feePercentage);
    } catch (error) {
      console.error('Failed to get fee percentage:', error);
      throw error;
    }
  }

  /**
   * Get action cooldown time (in seconds)
   * @returns {Promise<number>} - Cooldown time (in seconds)
   */
  async getActionCooldown() {
    try {
      const cooldown = await this.contract.methods.ACTION_COOLDOWN().call();
      return parseInt(cooldown);
    } catch (error) {
      console.error('Failed to get action cooldown time:', error);
      throw error;
    }
  }

  /**
   * Check if token is accepted
   * @param {string} tokenAddress - Token address
   * @returns {Promise<boolean>} - Whether the token is accepted
   */
  async isTokenAccepted(tokenAddress) {
    try {
      const accepted = await this.contract.methods.acceptedTokens(tokenAddress).call();
      return accepted;
    } catch (error) {
      console.error('Failed to check if token is accepted:', error);
      throw error;
    }
  }

  /**
   * Get the list of accepted token addresses
   * @returns {Promise<string[]>} - List of accepted token addresses
   */
  async getAcceptedTokens() {
    try {
      const tokens = [];
      let index = 0;
      
      // Try to get all accepted tokens until an error occurs (indicating completion)
      while (true) {
        try {
          const token = await this.contract.methods.acceptedTokensList(index).call();
          if (token === '0x0000000000000000000000000000000000000000') break;
          tokens.push(token);
          index++;
        } catch (e) {
          break;
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('Failed to get accepted token list:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    NFTMarketplaceContract,
    NFTMarketplaceABI,
    Quality
  };
} else {
  window.NFTMarketplaceContract = NFTMarketplaceContract;
  window.NFTMarketplaceABI = NFTMarketplaceABI;
  window.MarketplaceQuality = Quality;
} 