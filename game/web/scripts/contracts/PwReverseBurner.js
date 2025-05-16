const PwReverseBurnerABI = require('./ABI/PwReverseBurnerABI');
const contractAddress = require('./contractAddresses');

class PwReverseBurnerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PwReverseBurner contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PwReverseBurner');
    this.contract = new web3.eth.Contract(PwReverseBurnerABI, this.contractAddress);
  }

  /**
   * Get burn percentage
   * @returns {Promise<number>} - Burn percentage
   */
  async getBurnPercentage() {
    try {
      const percentage = await this.contract.methods.BURN_PERCENTAGE().call();
      return parseInt(percentage);
    } catch (error) {
      console.error('Failed to get burn percentage:', error);
      throw error;
    }
  }

  /**
   * Get manager percentage
   * @returns {Promise<number>} - Manager percentage
   */
  async getManagerPercentage() {
    try {
      const percentage = await this.contract.methods.MANAGER_PERCENTAGE().call();
      return parseInt(percentage);
    } catch (error) {
      console.error('Failed to get manager percentage:', error);
      throw error;
    }
  }

  /**
   * Get cached burn rate
   * @returns {Promise<string>} - Cached burn rate
   */
  async getCachedBurnRate() {
    try {
      const burnRate = await this.contract.methods.cachedBurnRate().call();
      return burnRate;
    } catch (error) {
      console.error('Failed to get cached burn rate:', error);
      throw error;
    }
  }

  /**
   * Get current burn rate
   * @returns {Promise<string>} - Current burn rate
   */
  async getCurrentBurnRate() {
    try {
      const burnRate = await this.contract.methods.getCurrentBurnRate().call();
      return burnRate;
    } catch (error) {
      console.error('Failed to get current burn rate:', error);
      throw error;
    }
  }

  /**
   * Update and get the latest burn rate
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<string>} - Updated burn rate
   */
  async updateBurnRate(options = {}) {
    try {
      const result = await this.contract.methods.updateBurnRate().send(options);
      return result;
    } catch (error) {
      console.error('Failed to update burn rate:', error);
      throw error;
    }
  }

  /**
   * Convert PetWorld tokens to PwPoint
   * @param {string|number} petWorldAmount - Amount of PetWorld to convert
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async convertPetWorldToPwPoint(petWorldAmount, options = {}) {
    try {
      const tx = await this.contract.methods.convertPetWorldToPwPoint(petWorldAmount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to convert PetWorld to PwPoint:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PwReverseBurnerContract,
    PwReverseBurnerABI
  };
} else {
  window.PwReverseBurnerContract = PwReverseBurnerContract;
  window.PwReverseBurnerABI = PwReverseBurnerABI;
} 