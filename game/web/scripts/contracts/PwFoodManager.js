const PwFoodManagerABI = require('./ABI/PwFoodManagerABI');
const contractAddress = require('./contractAddresses');
class PwFoodManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PwFoodManager contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PwFoodManager');
    this.contract = new web3.eth.Contract(PwFoodManagerABI, this.contractAddress);
  }

  /**
   * Get the amount of PwFood that can be exchanged for each dollar
   * @returns {Promise<string>} - Amount of PwFood per dollar
   */
  async getPwFoodPerDollar() {
    try {
      const rate = await this.contract.methods.PWFOOD_PER_DOLLAR().call();
      return rate;
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      throw error;
    }
  }

  /**
   * Get the minimum dollar exchange amount
   * @returns {Promise<string>} - Minimum dollar exchange amount
   */
  async getMinDollarAmount() {
    try {
      const minAmount = await this.contract.methods.MIN_DOLLAR_AMOUNT().call();
      return minAmount;
    } catch (error) {
      console.error('Failed to get minimum exchange amount:', error);
      throw error;
    }
  }

  /**
   * Get the maximum dollar exchange amount
   * @returns {Promise<string>} - Maximum dollar exchange amount
   */
  async getMaxDollarAmount() {
    try {
      const maxAmount = await this.contract.methods.MAX_DOLLAR_AMOUNT().call();
      return maxAmount;
    } catch (error) {
      console.error('Failed to get maximum exchange amount:', error);
      throw error;
    }
  }

  /**
   * Get the daily reward amount
   * @returns {Promise<string>} - Daily reward amount
   */
  async getPwFoodDayReward() {
    try {
      const reward = await this.contract.methods.PWFOOD_DAY_REWARD().call();
      return reward;
    } catch (error) {
      console.error('Failed to get daily reward amount:', error);
      throw error;
    }
  }

  /**
   * Get the last claim time for the user
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Last claim timestamp
   */
  async getLastClaimTime(userAddress) {
    try {
      const timestamp = await this.contract.methods.lastClaimTime(userAddress).call();
      return parseInt(timestamp);
    } catch (error) {
      console.error('Failed to get last claim time:', error);
      throw error;
    }
  }

  /**
   * Get the contract's PwFood balance
   * @returns {Promise<string>} - PwFood balance
   */
  async getBalance() {
    try {
      const balance = await this.contract.methods.getBalance().call();
      return balance;
    } catch (error) {
      console.error('Failed to get PwFood balance:', error);
      throw error;
    }
  }

  /**
   * Calculate the amount of PwFood that can be exchanged for a specified dollar amount
   * @param {string|number} dollarAmount - Dollar amount (with 18 decimal places)
   * @returns {Promise<string>} - PwFood amount
   */
  async calculatePwFoodAmount(dollarAmount) {
    try {
      const pwFoodAmount = await this.contract.methods.calculatePwFoodAmount(dollarAmount).call();
      return pwFoodAmount;
    } catch (error) {
      console.error('Failed to calculate PwFood amount:', error);
      throw error;
    }
  }

  /**
   * Claim free PwFood
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimFreePwFood(options = {}) {
    try {
      const tx = await this.contract.methods.claimFreePwFood().send(options);
      return tx;
    } catch (error) {
      console.error('Failed to claim free PwFood:', error);
      throw error;
    }
  }

  /**
   * Buy PwFood
   * @param {string} payToken - Payment token address
   * @param {string|number} dollarAmount - Dollar amount (with 18 decimal places)
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async buyPwFood(payToken, dollarAmount, options = {}) {
    try {
      const tx = await this.contract.methods.buyPwFood(payToken, dollarAmount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to buy PwFood:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PwFoodManagerContract,
    PwFoodManagerABI
  };
} else {
  window.PwFoodManagerContract = PwFoodManagerContract;
  window.PwFoodManagerABI = PwFoodManagerABI;
} 