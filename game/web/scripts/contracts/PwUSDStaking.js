const PwUSDStakingABI = require('./ABI/PwUSDStakingABI');
const contractAddress = require('./contractAddresses');

class PwUSDStakingContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PwUSDStaking contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PwUSDStaking');
    this.contract = new web3.eth.Contract(PwUSDStakingABI, this.contractAddress);
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
   * Get PwPoint reward rate
   * @returns {Promise<string>} - Reward rate
   */
  async getPwPointRewardRate() {
    try {
      const rate = await this.contract.methods.PWPOINT_REWARD_RATE().call();
      return rate;
    } catch (error) {
      console.error('Failed to get PwPoint reward rate:', error);
      throw error;
    }
  }

  /**
   * Get precision factor
   * @returns {Promise<string>} - Precision factor
   */
  async getPrecisionFactor() {
    try {
      const factor = await this.contract.methods.PRECISION_FACTOR().call();
      return factor;
    } catch (error) {
      console.error('Failed to get precision factor:', error);
      throw error;
    }
  }

  /**
   * Get PWUSD token address
   * @returns {Promise<string>} - PWUSD token address
   */
  async getPwusdToken() {
    try {
      const tokenAddress = await this.contract.methods.pwusdToken().call();
      return tokenAddress;
    } catch (error) {
      console.error('Failed to get PWUSD token address:', error);
      throw error;
    }
  }

  /**
   * Get PwPointManager address
   * @returns {Promise<string>} - PwPointManager address
   */
  async getPwpointManager() {
    try {
      const managerAddress = await this.contract.methods.pwpointManager().call();
      return managerAddress;
    } catch (error) {
      console.error('Failed to get PwPointManager address:', error);
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
   * Check if the stable coin is supported
   * @param {string} stableCoinAddress - Stable coin address
   * @returns {Promise<boolean>} - Whether it is supported
   */
  async isStableCoinSupported(stableCoinAddress) {
    try {
      const supported = await this.contract.methods.supportedStableCoins(stableCoinAddress).call();
      return supported;
    } catch (error) {
      console.error('Failed to check stable coin support status:', error);
      throw error;
    }
  }

  /**
   * Get the supported stable coin address at a specific index
   * @param {number} index - Index
   * @returns {Promise<string>} - Stable coin address
   */
  async getSupportedStableCoinAtIndex(index) {
    try {
      const stableCoin = await this.contract.methods.supportedStableCoinList(index).call();
      return stableCoin;
    } catch (error) {
      console.error('Failed to get supported stable coin address:', error);
      throw error;
    }
  }

  /**
   * Check if the stable coin has been historically supported
   * @param {string} stableCoinAddress - Stable coin address
   * @returns {Promise<boolean>} - Whether it has been historically supported
   */
  async isHistoricalSupportedStableCoin(stableCoinAddress) {
    try {
      const supported = await this.contract.methods.historicalSupportedStableCoins(stableCoinAddress).call();
      return supported;
    } catch (error) {
      console.error('Failed to check historical support status of stable coin:', error);
      throw error;
    }
  }

  /**
   * Get staking information for a user at a specific index
   * @param {string} userAddress - User address
   * @param {number} index - Staking index
   * @returns {Promise<Object>} - Staking information
   */
  async getUserStakingInfo(userAddress, index) {
    try {
      const info = await this.contract.methods.userStakingInfo(userAddress, index).call();
      return {
        stakedAmount: info.stakedAmount,
        stableCoin: info.stableCoin,
        lastClaimedCycle: parseInt(info.lastClaimedCycle),
        pendingPwPoints: info.pendingPwPoints
      };
    } catch (error) {
      console.error('Failed to get user staking information:', error);
      throw error;
    }
  }

  /**
   * Check if the user is an active staker
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} - Whether the user is active
   */
  async isUserActiveStaker(userAddress) {
    try {
      const active = await this.contract.methods.isActiveStaker(userAddress).call();
      return active;
    } catch (error) {
      console.error('Failed to check user active status:', error);
      throw error;
    }
  }

  /**
   * Stake stable coins
   * @param {string} stableCoinAddress - Stable coin address
   * @param {string|number} amount - Amount to stake
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async stake(stableCoinAddress, amount, options = {}) {
    try {
      const tx = await this.contract.methods.stake(stableCoinAddress, amount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to stake stable coins:', error);
      throw error;
    }
  }

  /**
   * Withdraw staked stable coins
   * @param {string} stableCoinAddress - Stable coin address
   * @param {string|number} amount - Amount to withdraw, 0 means withdraw all
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async withdraw(stableCoinAddress, amount, options = {}) {
    try {
      const tx = await this.contract.methods.withdraw(stableCoinAddress, amount).send(options);
      return tx;
    } catch (error) {
      console.error('Failed to withdraw staked stable coins:', error);
      throw error;
    }
  }

  /**
   * Claim staking rewards
   * @param {string} stableCoinAddress - Stable coin address
   * @param {Object} options - Transaction options, including from address
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimRewards(stableCoinAddress, options = {}) {
    try {
      const tx = await this.contract.methods.claimRewards(stableCoinAddress).send(options);
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
    PwUSDStakingContract,
    PwUSDStakingABI
  };
} else {
  window.PwUSDStakingContract = PwUSDStakingContract;
  window.PwUSDStakingABI = PwUSDStakingABI;
} 