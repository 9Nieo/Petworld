const PwPointBurnerABI = require('./ABI/PwPointBurnerABI');
const contractAddress = require('./contractAddresses');

class PwPointBurnerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PwPointBurner contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PwPointBurner');
    this.contract = new web3.eth.Contract(PwPointBurnerABI, this.contractAddress);
  }

  /**
   * Get cycle duration (seconds)
   * @returns {Promise<number>} - Cycle duration
   */
  async getCycleDuration() {
    try {
      const duration = await this.contract.methods.CYCLE_DURATION().call();
      return parseInt(duration);
    } catch (error) {
      console.error('Failed to get cycle duration:', error);
      throw error;
    }
  }

  /**
   * Get distribution ratio
   * @returns {Promise<string>} - Distribution ratio
   */
  async getDistributionRatio() {
    try {
      const ratio = await this.contract.methods.DISTRIBUTION_RATIO().call();
      return ratio;
    } catch (error) {
      console.error('Failed to get distribution ratio:', error);
      throw error;
    }
  }

  /**
   * Get current cycle
   * @returns {Promise<number>} - Current cycle
   */
  async getCurrentCycle() {
    try {
      const cycle = await this.contract.methods.currentCycle().call();
      return parseInt(cycle);
    } catch (error) {
      console.error('Failed to get current cycle:', error);
      throw error;
    }
  }

  /**
   * Get last update timestamp
   * @returns {Promise<number>} - Last update timestamp
   */
  async getLastUpdateTimestamp() {
    try {
      const timestamp = await this.contract.methods.lastUpdateTimestamp().call();
      return parseInt(timestamp);
    } catch (error) {
      console.error('Failed to get last update timestamp:', error);
      throw error;
    }
  }

  /**
   * Get the burn rate for the last cycle
   * @returns {Promise<string>} - Burn rate
   */
  async getLastCycleBurnRate() {
    try {
      const burnRate = await this.contract.methods.lastCycleBurnRate().call();
      return burnRate;
    } catch (error) {
      console.error('Failed to get last cycle burn rate:', error);
      throw error;
    }
  }

  /**
   * Get the total burned amount in a specified cycle
   * @param {number} cycle - Cycle
   * @returns {Promise<string>} - Total burned amount
   */
  async getTotalBurnedInCycle(cycle) {
    try {
      const burned = await this.contract.methods.getTotalBurnedInCycle(cycle).call();
      return burned;
    } catch (error) {
      console.error('Failed to get total burned amount in cycle:', error);
      throw error;
    }
  }

  /**
   * Get the total burned amount between specified cycles
   * @param {number} fromCycle - Starting cycle
   * @param {number} toCycle - Ending cycle
   * @returns {Promise<string>} - Total burned amount
   */
  async getTotalBurnedBetweenCycles(fromCycle, toCycle) {
    try {
      const burned = await this.contract.methods.getTotalBurnedBetweenCycles(fromCycle, toCycle).call();
      return burned;
    } catch (error) {
      console.error('Failed to get total burned amount between cycles:', error);
      throw error;
    }
  }

  /**
   * Get the burned amount for a user in a specified cycle
   * @param {string} userAddress - User address
   * @param {number} cycle - Cycle
   * @returns {Promise<string>} - User burned amount
   */
  async getUserBurnedInCycle(userAddress, cycle) {
    try {
      const burned = await this.contract.methods.getUserBurnedInCycle(userAddress, cycle).call();
      return burned;
    } catch (error) {
      console.error('Failed to get user burned amount in cycle:', error);
      throw error;
    }
  }

  /**
   * Get the amount of PetWorld tokens a user can claim
   * @param {string} userAddress - User address
   * @returns {Promise<string>} - Claimable amount
   */
  async getUserClaimablePetWorld(userAddress) {
    try {
      const claimable = await this.contract.methods.getUserClaimablePetWorld(userAddress).call();
      return claimable;
    } catch (error) {
      console.error('Failed to get user claimable PetWorld amount:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about what a user can claim
   * @param {string} userAddress - User address
   * @returns {Promise<Object>} - Claimable details
   */
  async getClaimableInformation(userAddress) {
    try {
      const info = await this.contract.methods.getClaimableInformation(userAddress).call();
      return {
        totalClaimable: info.totalClaimable,
        claimableCycles: parseInt(info.claimableCycles),
        lastClaimed: parseInt(info.lastClaimed),
        claimableUntil: parseInt(info.claimableUntil)
      };
    } catch (error) {
      console.error('Failed to get user claimable information:', error);
      throw error;
    }
  }

  /**
   * Burn PwPoint
   * @param {string|number} amount - Amount to burn
   * @param {Array<number>} cyclesToBurn - Array of cycles to select
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async burnPwPoint(amount, cyclesToBurn, options = {}) {
    try {
      const tx = await this.contract.methods.burnPwPoint(amount, cyclesToBurn).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to burn PwPoint:', error);
      throw error;
    }
  }

  /**
   * Claim PetWorld rewards
   * @param {Array<number>} cyclesToClaim - Array of cycles to claim
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimPetWorld(cyclesToClaim, options = {}) {
    try {
      const tx = await this.contract.methods.claimPetWorld(cyclesToClaim).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to claim PetWorld rewards:', error);
      throw error;
    }
  }

  /**
   * Clean up old records
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async cleanupOldRecords(options = {}) {
    try {
      const tx = await this.contract.methods.cleanupOldRecords().send(options);
      return tx;
    } catch (error) {
      console.error('Failed to clean up old records:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PwPointBurnerContract,
    PwPointBurnerABI
  };
} else {
  window.PwPointBurnerContract = PwPointBurnerContract;
  window.PwPointBurnerABI = PwPointBurnerABI;
} 