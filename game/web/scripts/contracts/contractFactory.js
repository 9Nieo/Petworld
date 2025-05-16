// Import contract interface classes
const PetWorldManagerContract = require('./PetWorldManager');
const PetWorldStakingContract = require('./PetWorldStaking');
const PwFoodManagerContract = require('./PwFoodManager');
const PwPointBurnerContract = require('./PwPointBurner');
const PwReverseBurnerContract = require('./PwReverseBurner');
const PwUSDStakingContract = require('./PwUSDStaking');
const RareNFTTransactionIndexerContract = require('./RareNFTTransactionIndexer');
const PwPointManagerContract = require('./PwPointManager');
const NFTLotteryManagerContract = require('./NFTLotteryManager');
const NFTFeedingManagerContract = require('./NFTFeedingManager');
const PaymentManagerContract = require('./PaymentManager');
const NFTMarketplaceContract = require('./NFTMarketplace');
const NFTManagerContract = require('./NFTManager');

/**
 * Contract factory class
 * Responsible for instantiating and managing all contract interface instances
 */
class ContractFactory {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractInstances = {};
  }

  /**
   * Get PetWorldManager contract instance
   * @returns {PetWorldManagerContract} PetWorldManager contract instance
   */
  getPetWorldManager() {
    if (!this.contractInstances.PetWorldManager) {
      this.contractInstances.PetWorldManager = new PetWorldManagerContract(this.web3);
    }
    return this.contractInstances.PetWorldManager;
  }

  /**
   * Get PetWorldStaking contract instance
   * @returns {PetWorldStakingContract} PetWorldStaking contract instance
   */
  getPetWorldStaking() {
    if (!this.contractInstances.PetWorldStaking) {
      this.contractInstances.PetWorldStaking = new PetWorldStakingContract(this.web3);
    }
    return this.contractInstances.PetWorldStaking;
  }

  /**
   * Get PwFoodManager contract instance
   * @returns {PwFoodManagerContract} PwFoodManager contract instance
   */
  getPwFoodManager() {
    if (!this.contractInstances.PwFoodManager) {
      this.contractInstances.PwFoodManager = new PwFoodManagerContract(this.web3);
    }
    return this.contractInstances.PwFoodManager;
  }

  /**
   * Get PwPointBurner contract instance
   * @returns {PwPointBurnerContract} PwPointBurner contract instance
   */
  getPwPointBurner() {
    if (!this.contractInstances.PwPointBurner) {
      this.contractInstances.PwPointBurner = new PwPointBurnerContract(this.web3);
    }
    return this.contractInstances.PwPointBurner;
  }

  /**
   * Get PwReverseBurner contract instance
   * @returns {PwReverseBurnerContract} PwReverseBurner contract instance
   */
  getPwReverseBurner() {
    if (!this.contractInstances.PwReverseBurner) {
      this.contractInstances.PwReverseBurner = new PwReverseBurnerContract(this.web3);
    }
    return this.contractInstances.PwReverseBurner;
  }

  /**
   * Get PwUSDStaking contract instance
   * @returns {PwUSDStakingContract} PwUSDStaking contract instance
   */
  getPwUSDStaking() {
    if (!this.contractInstances.PwUSDStaking) {
      this.contractInstances.PwUSDStaking = new PwUSDStakingContract(this.web3);
    }
    return this.contractInstances.PwUSDStaking;
  }

  /**
   * Get RareNFTTransactionIndexer contract instance
   * @returns {RareNFTTransactionIndexerContract} RareNFTTransactionIndexer contract instance
   */
  getRareNFTTransactionIndexer() {
    if (!this.contractInstances.RareNFTTransactionIndexer) {
      this.contractInstances.RareNFTTransactionIndexer = new RareNFTTransactionIndexerContract(this.web3);
    }
    return this.contractInstances.RareNFTTransactionIndexer;
  }

  /**
   * Get PwPointManager contract instance
   * @returns {PwPointManagerContract} PwPointManager contract instance
   */
  getPwPointManager() {
    if (!this.contractInstances.PwPointManager) {
      this.contractInstances.PwPointManager = new PwPointManagerContract(this.web3);
    }
    return this.contractInstances.PwPointManager;
  }

  /**
   * Get NFTLotteryManager contract instance
   * @returns {NFTLotteryManagerContract} NFTLotteryManager contract instance
   */
  getNFTLotteryManager() {
    if (!this.contractInstances.NFTLotteryManager) {
      this.contractInstances.NFTLotteryManager = new NFTLotteryManagerContract(this.web3);
    }
    return this.contractInstances.NFTLotteryManager;
  }

  /**
   * Get NFTFeedingManager contract instance
   * @returns {NFTFeedingManagerContract} NFTFeedingManager contract instance
   */
  getNFTFeedingManager() {
    if (!this.contractInstances.NFTFeedingManager) {
      this.contractInstances.NFTFeedingManager = new NFTFeedingManagerContract(this.web3);
    }
    return this.contractInstances.NFTFeedingManager;
  }

  /**
   * Get PaymentManager contract instance
   * @returns {PaymentManagerContract} PaymentManager contract instance
   */
  getPaymentManager() {
    if (!this.contractInstances.PaymentManager) {
      this.contractInstances.PaymentManager = new PaymentManagerContract(this.web3);
    }
    return this.contractInstances.PaymentManager;
  }

  /**
   * Get NFTMarketplace contract instance
   * @returns {NFTMarketplaceContract} NFTMarketplace contract instance
   */
  getNFTMarketplace() {
    if (!this.contractInstances.NFTMarketplace) {
      this.contractInstances.NFTMarketplace = new NFTMarketplaceContract(this.web3);
    }
    return this.contractInstances.NFTMarketplace;
  }

  /**
   * Get NFTManager contract instance
   * @returns {NFTManagerContract} NFTManager contract instance
   */
  getNFTManager() {
    if (!this.contractInstances.NFTManager) {
      this.contractInstances.NFTManager = new NFTManagerContract(this.web3);
    }
    return this.contractInstances.NFTManager;
  }

  /**
   * Refresh all contract instances
   * Call this method to recreate all contract instances when contract addresses are updated
   */
  refreshAllContracts() {
    this.contractInstances = {};
  }

  /**
   * Refresh specified contract instance
   * @param {string} contractName - Contract name
   */
  refreshContract(contractName) {
    if (this.contractInstances[contractName]) {
      delete this.contractInstances[contractName];
    }
  }
}

// Export contract factory class
module.exports = ContractFactory; 