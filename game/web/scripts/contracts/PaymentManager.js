// PaymentManager.js - Pet World Payment Manager Contract Interface
// Define global variables
window.PaymentManagerABI = window.PaymentManagerABI || [];
var PaymentManagerABI = window.PaymentManagerABI;

class PaymentManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   */
  constructor(web3) {
    if (!web3) {
      console.error('Failed to initialize PaymentManager contract: Web3 not initialized');
      return;
    }
    
    try {
      // Get contract address
      const network = window.currentNetwork || 'TEST';
      let paymentManagerAddress;
      
      if (typeof window.getContractAddress === 'function') {
        paymentManagerAddress = window.getContractAddress('PaymentManager');
      } else if (window.contractAddresses && window.contractAddresses[network]) {
        paymentManagerAddress = window.contractAddresses[network].PaymentManager;
      } else {
        console.error('Unable to get PaymentManager contract address');
        return;
      }
      
      if (!paymentManagerAddress) {
        console.error('PaymentManager contract address is empty');
        return;
      }
      
      // Get contract ABI
      const abi = window.PaymentManagerABI;
      if (!abi) {
        console.error('Unable to get PaymentManager contract ABI');
        return;
      }
      
      this.web3 = web3;
      this.contractAddress = paymentManagerAddress;
      this.contract = new web3.eth.Contract(abi, paymentManagerAddress);
      console.log('PaymentManager contract initialized successfully, address:', paymentManagerAddress);
    } catch (error) {
      console.error('Failed to initialize PaymentManager contract:', error);
    }
  }

  /**
   * Get the list of supported payment tokens
   * @returns {Promise<Array>} List of supported payment tokens
   */
  async getSupportedPaymentTokens() {
    try {
      // Get all supported payment tokens
      const tokens = await this.contract.methods.getSupportedTokens().call();
      return tokens;
    } catch (error) {
      console.error('Failed to get supported payment tokens list:', error);
      return [];
    }
  }

  /**
   * Get the exchange rate of a token to pet currency
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<string>} Exchange rate
   */
  async getTokenExchangeRate(tokenAddress) {
    if (!tokenAddress) {
      console.error('Failed to get token exchange rate: Token address is empty');
      return '0';
    }
    
    try {
      // Get token exchange rate
      const rate = await this.contract.methods.getTokenValue(tokenAddress).call();
      return rate;
    } catch (error) {
      console.error(`Failed to get exchange rate for token (${tokenAddress}):`, error);
      return '0';
    }
  }

  /**
   * Check if a token is supported
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<boolean>} Is supported
   */
  async isTokenSupported(tokenAddress) {
    if (!tokenAddress) {
      console.error('Failed to check if token is supported: Token address is empty');
      return false;
    }
    
    try {
      // Check if token is supported
      const isSupported = await this.contract.methods.isTokenSupported(tokenAddress).call();
      return isSupported;
    } catch (error) {
      console.error(`Failed to check if token (${tokenAddress}) is supported:`, error);
      return false;
    }
  }

  /**
   * Check if a token is accepted
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
   * Get the list of accepted tokens
   * @returns {Promise<string[]>} - List of accepted token addresses
   */
  async getAcceptedTokensList() {
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

  /**
   * Get the payment receiver address
   * @returns {Promise<string>} - Payment receiver address
   */
  async getPaymentReceiver() {
    try {
      const receiver = await this.contract.methods.paymentReceiver().call();
      return receiver;
    } catch (error) {
      console.error('Failed to get payment receiver address:', error);
      throw error;
    }
  }

  /**
   * Get the PWFoodManager address
   * @returns {Promise<string>} - PWFoodManager address
   */
  async getPwFoodManager() {
    try {
      const manager = await this.contract.methods.pwFoodManager().call();
      return manager;
    } catch (error) {
      console.error('Failed to get PWFoodManager address:', error);
      throw error;
    }
  }

  /**
   * Check if the contract is paused
   * @returns {Promise<boolean>} - Is the contract paused
   */
  async isPaused() {
    try {
      const paused = await this.contract.methods.paused().call();
      return paused;
    } catch (error) {
      console.error('Failed to check if contract is paused:', error);
      throw error;
    }
  }

  /**
   * Get the price for common lottery
   * @returns {Promise<string>} - Common lottery price
   */
  async getCommonLotteryPrice() {
    try {
      const price = await this.contract.methods.commonLotteryPrice().call();
      return price;
    } catch (error) {
      console.error('Failed to get common lottery price:', error);
      throw error;
    }
  }

  /**
   * Get the price for rare lottery
   * @returns {Promise<string>} - Rare lottery price
   */
  async getRareLotteryPrice() {
    try {
      const price = await this.contract.methods.rareLotteryPrice().call();
      return price;
    } catch (error) {
      console.error('Failed to get rare lottery price:', error);
      throw error;
    }
  }

  /**
   * Get the price for legendary lottery
   * @returns {Promise<string>} - Legendary lottery price
   */
  async getLegendaryLotteryPrice() {
    try {
      const price = await this.contract.methods.legendaryLotteryPrice().call();
      return price;
    } catch (error) {
      console.error('Failed to get legendary lottery price:', error);
      throw error;
    }
  }

  /**
   * Get the price for PWFOOD
   * @returns {Promise<string>} - PWFOOD price
   */
  async getPwfoodPrice() {
    try {
      const price = await this.contract.methods.pwfoodPrice().call();
      return price;
    } catch (error) {
      console.error('Failed to get PWFOOD price:', error);
      throw error;
    }
  }

  /**
   * Get the maximum price limit
   * @returns {Promise<string>} - Maximum price limit
   */
  async getMaxPrice() {
    try {
      const price = await this.contract.methods.MAX_PRICE().call();
      return price;
    } catch (error) {
      console.error('Failed to get maximum price limit:', error);
      throw error;
    }
  }

  /**
   * Get the maximum purchase quantity limit
   * @returns {Promise<number>} - Maximum purchase quantity limit
   */
  async getMaxQuantity() {
    try {
      const quantity = await this.contract.methods.MAX_QUANTITY().call();
      return parseInt(quantity);
    } catch (error) {
      console.error('Failed to get maximum purchase quantity limit:', error);
      throw error;
    }
  }

  /**
   * Get the total payment amount for a user for a specific token
   * @param {string} userAddress - User address
   * @param {string} tokenAddress - Token address
   * @returns {Promise<string>} - Total payment amount
   */
  async getUserPayment(userAddress, tokenAddress) {
    try {
      const payment = await this.contract.methods.userPayments(userAddress, tokenAddress).call();
      return payment;
    } catch (error) {
      console.error('Failed to get user payment total:', error);
      throw error;
    }
  }

  /**
   * Get payment record
   * @param {number} index - Record index
   * @returns {Promise<Object>} - Payment record
   */
  async getPaymentRecord(index) {
    try {
      const record = await this.contract.methods.paymentRecords(index).call();
      return {
        payer: record.payer,
        token: record.token,
        amount: record.amount,
        purchaseType: record.purchaseType,
        timestamp: parseInt(record.timestamp)
      };
    } catch (error) {
      console.error('Failed to get payment record:', error);
      throw error;
    }
  }

  /**
   * Pay for common lottery
   * @param {string} tokenAddress - Payment token address
   * @param {number} quantity - Purchase quantity
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async payForCommonLottery(tokenAddress, quantity, options = {}) {
    try {
      const tx = await this.contract.methods.payForCommonLottery(
        tokenAddress,
        quantity,
        options.from || (await this.web3.eth.getAccounts())[0]
      ).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 300000
      });
      return tx;
    } catch (error) {
      console.error('Failed to pay for common lottery:', error);
      throw error;
    }
  }

  /**
   * Pay for rare lottery
   * @param {string} tokenAddress - Payment token address
   * @param {number} quantity - Purchase quantity
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async payForRareLottery(tokenAddress, quantity, options = {}) {
    try {
      const tx = await this.contract.methods.payForRareLottery(
        tokenAddress,
        quantity,
        options.from || (await this.web3.eth.getAccounts())[0]
      ).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 300000
      });
      return tx;
    } catch (error) {
      console.error('Failed to pay for rare lottery:', error);
      throw error;
    }
  }

  /**
   * Pay for legendary lottery
   * @param {string} tokenAddress - Payment token address
   * @param {number} quantity - Purchase quantity
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async payForLegendaryLottery(tokenAddress, quantity, options = {}) {
    try {
      const tx = await this.contract.methods.payForLegendaryLottery(
        tokenAddress,
        quantity,
        options.from || (await this.web3.eth.getAccounts())[0]
      ).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 300000
      });
      return tx;
    } catch (error) {
      console.error('Failed to pay for legendary lottery:', error);
      throw error;
    }
  }

  /**
   * Pay for PWFOOD
   * @param {string} tokenAddress - Payment token address
   * @param {number} dollarAmount - Dollar amount (integer)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async payForPWFood(tokenAddress, dollarAmount, options = {}) {
    try {
      const tx = await this.contract.methods.payForPWFood(
        tokenAddress,
        dollarAmount,
        options.from || (await this.web3.eth.getAccounts())[0]
      ).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 300000
      });
      return tx;
    } catch (error) {
      console.error('Failed to pay for PWFOOD:', error);
      throw error;
    }
  }
}

// Export PaymentManagerContract to global object
window.PaymentManagerContract = PaymentManagerContract;

// If in Node environment, export module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManagerContract;
}

// Add compatibility for old code with global functions
// These functions are for supporting old code, but it is recommended to use PaymentManagerContract class instance methods directly
window.getSupportedPaymentTokens = async function(contract) {
  if (contract instanceof PaymentManagerContract) {
    return await contract.getSupportedPaymentTokens();
  } else {
    console.warn('Called getSupportedPaymentTokens with old format, it is recommended to use PaymentManagerContract instance');
    const paymentManagerInstance = new PaymentManagerContract(window.web3);
    return await paymentManagerInstance.getSupportedPaymentTokens();
  }
};

window.getTokenExchangeRate = async function(contract, tokenAddress) {
  if (contract instanceof PaymentManagerContract) {
    return await contract.getTokenExchangeRate(tokenAddress);
  } else {
    console.warn('Called getTokenExchangeRate with old format, it is recommended to use PaymentManagerContract instance');
    const paymentManagerInstance = new PaymentManagerContract(window.web3);
    return await paymentManagerInstance.getTokenExchangeRate(tokenAddress);
  }
};

window.isTokenSupported = async function(contract, tokenAddress) {
  if (contract instanceof PaymentManagerContract) {
    return await contract.isTokenSupported(tokenAddress);
  } else {
    console.warn('Called isTokenSupported with old format, it is recommended to use PaymentManagerContract instance');
    const paymentManagerInstance = new PaymentManagerContract(window.web3);
    return await paymentManagerInstance.isTokenSupported(tokenAddress);
  }
};

window.PaymentManagerABI = PaymentManagerABI; 