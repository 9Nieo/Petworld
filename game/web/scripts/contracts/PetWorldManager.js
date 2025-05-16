const PetWorldManagerABI = require('./ABI/PetWorldManagerABI');
const contractAddress = require('./contractAddresses');

class PetWorldManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - PetWorldManager contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('PetWorldManager');
    this.contract = new web3.eth.Contract(PetWorldManagerABI, this.contractAddress);
  }

  /**
   * Get the total amount of PetWorld tokens transferred
   * @returns {Promise<string>} - Total amount of transferred tokens
   */
  async getTotalPetWorldTransferred() {
    try {
      const total = await this.contract.methods.totalPetWorldTransferred().call();
      return total;
    } catch (error) {
      console.error('Failed to get total amount of transferred tokens:', error);
      throw error;
    }
  }

  /**
   * Check if an address has transfer permission
   * @param {string} address - Address to check
   * @returns {Promise<boolean>} - Whether transfer is allowed
   */
  async isTransferAllowed(address) {
    try {
      const allowed = await this.contract.methods.transferAllowed(address).call();
      return allowed;
    } catch (error) {
      console.error('Failed to check transfer permission:', error);
      throw error;
    }
  }

  /**
   * Get the contract's PetWorld token balance
   * @returns {Promise<string>} - Token balance
   */
  async getBalance() {
    try {
      const balance = await this.contract.methods.getBalance().call();
      return balance;
    } catch (error) {
      console.error('Failed to get contract balance:', error);
      throw error;
    }
  }

}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    PetWorldManagerContract,
    PetWorldManagerABI
  };
} else {
  window.PetWorldManagerContract = PetWorldManagerContract;
  window.PetWorldManagerABI = PetWorldManagerABI;
} 