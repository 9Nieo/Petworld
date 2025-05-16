const PwPointManagerABI = require('./ABI/PwPointManagerABI');
const contractAddress = require('./contractAddresses');

class PwPointManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PwPointManager contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PwPointManager');
    this.contract = new web3.eth.Contract(PwPointManagerABI, this.contractAddress);
  }

  /**
   * Check if the contract is paused
   * @returns {Promise<boolean>} - Whether the contract is paused
   */
  async isPaused() {
    try {
      return await this.contract.methods.paused().call();
    } catch (error) {
      console.error('Failed to check if the contract is paused:', error);
      throw error;
    }
  }

  /**
   * Get the total amount of PwPoint transferred
   * @returns {Promise<string>} - Total amount of PwPoint transferred
   */
  async getTotalPwPointTransferred() {
    try {
      return await this.contract.methods.totalPwPointTransferred().call();
    } catch (error) {
      console.error('Failed to get total amount of PwPoint transferred:', error);
      throw error;
    }
  }

  /**
   * Get the total amount of PwBounty transferred
   * @returns {Promise<string>} - Total amount of PwBounty transferred
   */
  async getTotalPwBountyTransferred() {
    try {
      return await this.contract.methods.totalPwBountyTransferred().call();
    } catch (error) {
      console.error('Failed to get total amount of PwBounty transferred:', error);
      throw error;
    }
  }

  /**
   * Get the total amount of PwReverse transferred
   * @returns {Promise<string>} - Total amount of PwReverse transferred
   */
  async getTotalPwReverseTransferred() {
    try {
      return await this.contract.methods.totalPwReverseTransferred().call();
    } catch (error) {
      console.error('Failed to get total amount of PwReverse transferred:', error);
      throw error;
    }
  }

  /**
   * Get the token balances held by the contract
   * @returns {Promise<Object>} - Token balances held by the contract
   */
  async getBalances() {
    try {
      const balances = await this.contract.methods.getBalances().call();
      return {
        pointBalance: balances.pointBalance,
        bountyBalance: balances.bountyBalance,
        reverseBalance: balances.reverseBalance
      };
    } catch (error) {
      console.error('Failed to get contract balances:', error);
      throw error;
    }
  }

  /**
   * Swap both PwBounty and PwReverse for PwPoint
   * Fixed exchange rate: 2 PwReverse + 1 PwBounty = 3 PwPoint
   * @param {string} fromAddress - Address of the exchanger
   * @param {string} bountyAmount - Amount of PwBounty
   * @param {string} reverseAmount - Amount of PwReverse
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async swapBothForPoint(fromAddress, bountyAmount, reverseAmount, options = {}) {
    try {
      // Validate exchange ratio
      if (reverseAmount % 2 !== 0) {
        throw new Error('PwReverse amount must be even');
      }
      if (Number(bountyAmount) * 2 !== Number(reverseAmount)) {
        throw new Error('Must use 2 PwReverse for 1 PwBounty');
      }
      
      const tx = await this.contract.methods.swapBothForPoint(fromAddress, bountyAmount, reverseAmount).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 300000
      });
      return tx;
    } catch (error) {
      console.error('Failed to swap for PwPoint:', error);
      throw error;
    }
  }

  /**
   * Swap PwReverse for PwPoint
   * Fixed exchange rate: 1 PwReverse = 1 PwPoint
   * @param {string} fromAddress - Address of the exchanger
   * @param {string} reverseAmount - Amount of PwReverse
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async swapReverseForPoint(fromAddress, reverseAmount, options = {}) {
    try {
      const tx = await this.contract.methods.swapReverseForPoint(fromAddress, reverseAmount).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 200000
      });
      return tx;
    } catch (error) {
      console.error('Failed to swap PwReverse for PwPoint:', error);
      throw error;
    }
  }

  /**
   * Calculate the swap result
   * @param {string} type - Swap type 'both' or 'reverse'
   * @param {string} bountyAmount - Amount of PwBounty (used only when type='both')
   * @param {string} reverseAmount - Amount of PwReverse
   * @returns {Object} - Swap result
   */
  calculateSwapResult(type, bountyAmount, reverseAmount) {
    if (type === 'both') {
      // Validate exchange ratio
      if (reverseAmount % 2 !== 0) {
        throw new Error('PwReverse amount must be even');
      }
      if (Number(bountyAmount) * 2 !== Number(reverseAmount)) {
        throw new Error('Must use 2 PwReverse for 1 PwBounty');
      }
      
      // Calculate the amount of PwPoint obtained (2 PwReverse + 1 PwBounty = 3 PwPoint)
      const pointAmount = Number(bountyAmount) * 3;
      
      return {
        inputBounty: bountyAmount,
        inputReverse: reverseAmount,
        outputPoint: pointAmount.toString()
      };
    } else if (type === 'reverse') {
      // Calculate the amount of PwPoint obtained (1 PwReverse = 1 PwPoint)
      return {
        inputBounty: '0',
        inputReverse: reverseAmount,
        outputPoint: reverseAmount
      };
    } else {
      throw new Error('Invalid swap type');
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PwPointManagerContract,
    PwPointManagerABI
  };
} else {
  window.PwPointManagerContract = PwPointManagerContract;
  window.PwPointManagerABI = PwPointManagerABI;
} 