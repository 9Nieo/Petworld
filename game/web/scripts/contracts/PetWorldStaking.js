const PetWorldStakingABI = require('./ABI/PetWorldStakingABI');
const contractAddress = require('./contractAddresses');

class PetWorldStakingContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PetWorldStaking contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PetWorldStaking');
    this.contract = new web3.eth.Contract(PetWorldStakingABI, this.contractAddress);
  }

  /**
   * Get cycle duration (in seconds)
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
   * Get reward pool balance
   * @returns {Promise<string>} - Reward pool balance
   */
  async getRewardPoolBalance() {
    try {
      const balance = await this.contract.methods.rewardPoolBalance().call();
      return balance;
    } catch (error) {
      console.error('Failed to get reward pool balance:', error);
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
   * Get user staked amount
   * @param {string} userAddress - User address
   * @returns {Promise<string>} - Staked amount
   */
  async getUserStakedAmount(userAddress) {
    try {
      const amount = await this.contract.methods.getUserStakedAmount(userAddress).call();
      return amount;
    } catch (error) {
      console.error('Failed to get user staked amount:', error);
      throw error;
    }
  }

  /**
   * Get pending rewards for the user
   * @param {string} userAddress - User address
   * @returns {Promise<string>} - Pending rewards
   */
  async getPendingRewards(userAddress) {
    try {
      const rewards = await this.contract.methods.getPendingRewards(userAddress).call();
      return rewards;
    } catch (error) {
      console.error('Failed to get pending rewards for user:', error);
      throw error;
    }
  }

  /**
   * Get the last claimed cycle for the user
   * @param {string} userAddress - User address
   * @returns {Promise<number>} - Last claimed cycle
   */
  async getLastClaimedCycle(userAddress) {
    try {
      const cycle = await this.contract.methods.getLastClaimedCycle(userAddress).call();
      return parseInt(cycle);
    } catch (error) {
      console.error('Failed to get last claimed cycle for user:', error);
      throw error;
    }
  }

  /**
   * Get the count of active stakers
   * @returns {Promise<number>} - Count of active stakers
   */
  async getActiveStakersCount() {
    try {
      const count = await this.contract.methods.getActiveStakersCount().call();
      return parseInt(count);
    } catch (error) {
      console.error('Failed to get active stakers count:', error);
      throw error;
    }
  }

  /**
   * Stake PetWorld tokens
   * @param {string|number} amount - Amount to stake
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async stake(amount, options = {}) {
    try {
      const tx = await this.contract.methods.stake(amount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to stake tokens:', error);
      throw error;
    }
  }

  /**
   * Withdraw staked PetWorld tokens
   * @param {string|number} amount - Amount to withdraw
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async withdraw(amount, options = {}) {
    try {
      const tx = await this.contract.methods.withdraw(amount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to withdraw staked tokens:', error);
      throw error;
    }
  }

  /**
   * Claim staking rewards
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimReward(options = {}) {
    try {
      const tx = await this.contract.methods.claimReward().send(options);
      return tx;
    } catch (error) {
      console.error('Failed to claim staking rewards:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PetWorldStakingContract,
    PetWorldStakingABI
  };
} else {
  window.PetWorldStakingContract = PetWorldStakingContract;
  window.PetWorldStakingABI = PetWorldStakingABI;
} 