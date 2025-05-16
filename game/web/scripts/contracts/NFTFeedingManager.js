const NFTFeedingManagerABI = require('./ABI/NFTFeedingManagerABI');
const contractAddress = require('./contractAddresses');
const ContractApprovalManager = require('../other/ContractApprovalManager');

class NFTFeedingManagerContract {
  /**
   * constructor
   * @param {Object} web3 - Web3 instance
   * @param {string} contractAddress - NFTFeedingManager contract address
   */
  constructor(web3) {
    this.web3 = web3;
    this.contractAddress = contractAddress.getContractAddress('NFTFeedingManager');
    this.contract = new web3.eth.Contract(NFTFeedingManagerABI, this.contractAddress);
  }

  /**
   * get maximum feeding hours
   * @returns {Promise<number>} - maximum feeding hours
   */
  async getMaxFeedingHours() {
    try {
      const maxHours = await this.contract.methods.MAX_FEEDING_HOURS().call();
      return parseInt(maxHours);
    } catch (error) {
      console.error('get maximum feeding hours failed:', error);
      throw error;
    }
  }

  /**
   * get maximum reward cycles
   * @returns {Promise<number>} - maximum reward cycles
   */
  async getMaxRewardCycles() {
    try {
      const maxCycles = await this.contract.methods.MAX_REWARD_CYCLES().call();
      return parseInt(maxCycles);
    } catch (error) {
      console.error('get maximum reward cycles failed:', error);
      throw error;
    }
  }

  /**
   * get seconds per cycle
   * @returns {Promise<number>} - seconds per cycle
   */
  async getSecondsPerCycle() {
    try {
      const seconds = await this.contract.methods.SECONDS_PER_CYCLE().call();
      return parseInt(seconds);
    } catch (error) {
      console.error('get seconds per cycle failed:', error);
      throw error;
    }
  }

  /**
   * get default feeding hours
   * @returns {Promise<number>} - default feeding hours
   */
  async getDefaultFeedingHours() {
    try {
      const hours = await this.contract.methods.DEFAULT_FEEDING_HOURS().call();
      return parseInt(hours);
    } catch (error) {
      console.error('get default feeding hours failed:', error);
      throw error;
    }
  }

  /**
   * get hours per cycle
   * @returns {Promise<number>} - hours per cycle
   */
  async getHoursPerCycle() {
    try {
      const hours = await this.contract.methods.HOURS_PER_CYCLE().call();
      return parseInt(hours);
    } catch (error) {
      console.error('get hours per cycle failed:', error);
      throw error;
    }
  }

  /**
   * get reward config
   * @param {number} quality - NFT quality
   * @returns {Promise<Object>} - reward config
   */
  async getRewardConfig(quality) {
    try {
      const config = await this.contract.methods.rewardConfigs(quality).call();
      return {
        pwpotReward: parseInt(config.pwpotReward),
        pwbotReward: parseInt(config.pwbotReward)
      };
    } catch (error) {
      console.error('get reward config failed:', error);
      throw error;
    }
  }

  /**
   * get NFT feeding data
   * @param {number} tokenId - NFT tokenId
   * @returns {Promise<Object>} - NFT feeding data
   */
  async getNFTFeedingData(tokenId) {
    try {
      const data = await this.contract.methods.nftFeeding(tokenId).call();
      
      return {
        feedingHours: parseInt(data.feedingHours),
        lastClaimTime: parseInt(data.lastClaimTime),
        lastFeedTime: parseInt(data.lastFeedTime),
        quality: parseInt(data.quality),
        isActive: data.isActive,
        accumulatedCycles: parseInt(data.accumulatedCycles || 0)
      };
    } catch (error) {
      console.error(`get NFT #${tokenId} feeding data failed:`, error);
      throw error;
    }
  }

  /**
   * get user inviter address
   * @param {string} userAddress - user address
   * @returns {Promise<string>} - inviter address
   */
  async getUserInviter(userAddress) {
    try {
      const inviter = await this.contract.methods.userInviter(userAddress).call();
      return inviter;
    } catch (error) {
      console.error('get user inviter failed:', error);
      throw error;
    }
  }

  /**
   * get feeding related information
   * @param {number} tokenId - NFT tokenId
   * @returns {Promise<Object>} feeding related information
   */
  async getNFTFeedingInfo(tokenId) {
    if (!this.contract) {
      console.error('get feeding info failed: contract instance is empty');
      return null;
    }
    
    try {
      // ensure tokenId is an integer
      tokenId = parseInt(tokenId);
      if (isNaN(tokenId)) {
        console.error('get feeding info failed: invalid tokenId');
        return null;
      }
      
      // use nftFeeding mapping to get NFT feeding info
      console.log(`start getting feeding info for NFT #${tokenId}...`);
      
      // check if contract method exists
      if (!this.contract.methods || typeof this.contract.methods.nftFeeding !== 'function') {
        console.error('contract method nftFeeding does not exist');
        console.log('available contract methods:', Object.keys(this.contract.methods || {}).join(', '));
        return null;
      }
      
      console.log(`contract address: ${this.contract.options.address}`);
      console.log(`call nftFeeding(${tokenId})`);
      
      const feedingInfo = await this.contract.methods.nftFeeding(tokenId).call();
      console.log('original contract feeding info:', JSON.stringify(feedingInfo, null, 2));
      
      // convert data type
      const result = {
        feedingHours: parseInt(feedingInfo.feedingHours) || 0,
        lastClaimTime: parseInt(feedingInfo.lastClaimTime) || 0,
        lastFeedTime: parseInt(feedingInfo.lastFeedTime) || 0,
        quality: parseInt(feedingInfo.quality) || 0,
        isActive: Boolean(feedingInfo.isActive),
        level: parseInt(feedingInfo.level) || 1,
        accumulatedFood: parseInt(feedingInfo.accumulatedFood) || 0
      };
      
      // calculate the difference between current time and lastFeedTime
      const now = Math.floor(Date.now() / 1000);
      const elapsedSeconds = now - result.lastFeedTime;
      const elapsedHours = Math.floor(elapsedSeconds / 3600);
      
      console.log(`NFT #${tokenId} feeding info processing result:`, {
        feedingHours: `${result.feedingHours} hours`,
        lastClaimTime: new Date(result.lastClaimTime * 1000).toLocaleString(),
        lastFeedTime: new Date(result.lastFeedTime * 1000).toLocaleString(),
        quality: result.quality,
        isActive: result.isActive,
        level: result.level,
        accumulatedFood: result.accumulatedFood,
        currentTime: new Date(now * 1000).toLocaleString(),
        timeSinceLastFeed: `${elapsedHours}小时${Math.floor((elapsedSeconds % 3600) / 60)}分钟`
      });
      
      return result;
    } catch (error) {
      console.error(`get NFT #${tokenId} feeding info failed:`, error);
      // print stack trace
      console.error('error stack:', error.stack);
      return null;
    }
  }

  /**
   * get NFT level info
   * @param {number} tokenId - NFT tokenId
   * @returns {Promise<Object>} - NFT level info
   */
  async getNFTLevelInfo(tokenId) {
    try {
      const result = await this.contract.methods.getNFTLevelInfo(tokenId).call();
      return {
        level: parseInt(result.level) || 1,
        accumulatedFood: parseInt(result.accumulatedFood) || 0
      };
    } catch (error) {
      console.error(`get NFT #${tokenId} level info failed:`, error);
      return { level: 1, accumulatedFood: 0 };
    }
  }

  /**
   * estimate gas usage
   * @param {Object} contractMethod - contract method object
   * @param {Object} methodParams - method parameters
   * @param {string} userAddress - user wallet address
   * @param {number} multiplier - gas estimation multiplier (default 1.5)
   * @returns {Promise<number>} estimated gas usage
   */
  async estimateGasUsage(contractMethod, methodParams, userAddress, multiplier = 1.5) {
    try {
      console.log('estimated gas usage:', {
        method: contractMethod._method.name,
        params: methodParams,
        from: userAddress
      });
      
      const gasEstimate = await contractMethod(...methodParams).estimateGas({ from: userAddress });
      
      // adjust multiplier based on parameter complexity
      const paramComplexity = Array.isArray(methodParams[0]) ? methodParams[0].length : 1;
      // the more complex the parameters, the larger the multiplier, but not more than 2.5
      const dynamicMultiplier = Math.min(multiplier + (paramComplexity * 0.02), 2.5);
      
      console.log(`estimated gas usage: ${gasEstimate}, parameter complexity: ${paramComplexity}, dynamic multiplier: ${dynamicMultiplier}`);
      
      return Math.floor(gasEstimate * dynamicMultiplier);
    } catch (error) {
      console.error('estimate gas usage failed:', error);
      // return a default value, set different default values based on operation type
      if (contractMethod._method.name.includes('feed')) {
        return 300000 + (Array.isArray(methodParams[0]) ? methodParams[0].length * 30000 : 100000);
      } else if (contractMethod._method.name.includes('claim')) {
        return 250000 + (Array.isArray(methodParams[0]) ? methodParams[0].length * 25000 : 80000);
      }
      
      // default value
      return 500000;
    }
  }

  /**
   * get PWFOOD contract instance
   * @param {Function} getContractAddress - get contract address function
   * @returns {Promise<Object>} PWFOOD contract instance
   */
  async getPWFOODContract(getContractAddress) {
    if (!this.web3) {
      console.error('get PWFOOD contract failed: Web3 not initialized');
      return null;
    }
    
    try {
      // get PWFOOD contract address
      let pwfoodAddress;
      
      if (typeof getContractAddress === 'function') {
        pwfoodAddress = getContractAddress('PwFood');
      } else if (window.contractAddresses && window.contractAddresses[window.currentNetwork || 'LOCAL']) {
        pwfoodAddress = window.contractAddresses[window.currentNetwork || 'LOCAL'].PwFood;
      } else {
        console.error('cannot get PWFOOD contract address');
        return null;
      }
      
      if (!pwfoodAddress) {
        console.error('PWFOOD contract address is empty');
        return null;
      }
      
      // create ERC20 contract instance
      const erc20ABI = window.ERC20ABI || window.PWFoodABI || [
        {
          "constant": true,
          "inputs": [{"name": "owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"name": "", "type": "uint256"}],
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}],
          "name": "approve",
          "outputs": [{"name": "", "type": "bool"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
          "name": "allowance",
          "outputs": [{"name": "", "type": "uint256"}],
          "type": "function"
        }
      ];
      
      const pwfoodContract = new this.web3.eth.Contract(erc20ABI, pwfoodAddress);
      
      return pwfoodContract;
    } catch (error) {
      console.error('get PWFOOD contract failed:', error);
      return null;
    }
  }

  /**
   * feed a single NFT
   * @param {number} tokenId - NFT tokenId
   * @param {number} hours - feeding hours
   * @param {string} userAddress - user wallet address
   * @returns {Promise<Object>} transaction result
   */
  async feedNFT(tokenId, hours, userAddress) {
    if (!this.contract) {
      console.error('feed NFT failed: contract instance is empty');
      return { success: false, error: 'contract instance is empty' };
    }
    
    if (!userAddress) {
      console.error('feed NFT failed: user address is empty');
      return { success: false, error: 'user address is empty' };
    }
    
    if (!tokenId || isNaN(parseInt(tokenId))) {
      console.error('feed NFT failed: invalid NFT ID');
      return { success: false, error: 'invalid NFT ID' };
    }
    
    if (!hours || isNaN(parseInt(hours)) || parseInt(hours) <= 0) {
      console.error('feed NFT failed: invalid feeding hours');
      return { success: false, error: 'invalid feeding hours' };
    }
    
    try {
      // convert to integer
      tokenId = parseInt(tokenId);
      hours = parseInt(hours);
      
      // print detailed debug information
      console.log('feed NFT detailed information:', {
        tokenId: tokenId,
        hours: hours,
        userAddress: userAddress,
        contract: this.contract.options.address
      });
      
      // get PWFOOD contract
      const pwfoodContract = await this.getPWFOODContract(window.getContractAddress);
      if (!pwfoodContract) {
        return { success: false, error: 'cannot get PWFOOD contract' };
      }
      
      // check if NFT is registered
      try {
        const feedingInfo = await this.contract.methods.nftFeeding(tokenId).call();
        console.log('NFT feeding info:', feedingInfo);
        
        if (!feedingInfo.isActive) {
          return { success: false, error: 'NFT is not registered in the feeding system', feedingInfo: feedingInfo };
        }
      } catch (error) {
        console.error('check NFT registration status failed:', error);
        return { success: false, error: 'check NFT registration status failed: ' + (error.message || 'unknown error') };
      }
      
      // check approval and balance status
      const approvalStatus = await ContractApprovalManager.checkIfApprovalNeeded(
        pwfoodContract, 
        userAddress, 
        this.contract.options.address, 
        hours.toString()
      );
      
      console.log('PWFOOD approval status:', approvalStatus);
      
      // check balance
      if (!approvalStatus.sufficientFunds) {
        return { 
          success: false, 
          error: 'PWFOOD balance is insufficient', 
          requiredAmount: hours, 
          balance: approvalStatus.balance 
        };
      }
      
      // check approval
      if (approvalStatus.needsApproval) {
        return { 
          success: false, 
          error: 'need to approve PWFOOD', 
          needApproval: true, 
          requiredAmount: hours, 
          allowance: approvalStatus.currentAllowance,
          pwfoodContract: pwfoodContract,
          feedingManagerAddress: this.contract.options.address
        };
      }
      
      console.log('preparing to send feed NFT transaction...');
      
      // send feed NFT transaction
      const gasEstimate = await this.estimateGasUsage(
        this.contract.methods.feedNFT,
        [tokenId, hours],
        userAddress
      );
      
      const transaction = await this.contract.methods.feedNFT(tokenId, hours).send({
        from: userAddress,
        gas: gasEstimate
      });
      
      console.log('feed NFT transaction submitted:', transaction);
      
      // after feeding successfully, get the latest feeding info
      let updatedFeedingInfo = null;
      try {
        updatedFeedingInfo = await this.getNFTFeedingInfo(tokenId);
      } catch (error) {
        console.error('get updated feeding info failed:', error);
      }
      
      return { 
        success: true, 
        transaction: transaction,
        tokenId: tokenId,
        hours: hours,
        feedingInfo: updatedFeedingInfo
      };
    } catch (error) {
      console.error(`feed NFT(ID:${tokenId}) failed:`, error);
      
      // try to get more detailed error information
      let errorMessage = error.message || 'feed NFT failed';
      
      // check common errors
      if (errorMessage.includes('execution reverted')) {
        // try to get detailed revert reason
        if (error.data) {
          errorMessage = `contract execution failed: ${error.data}`;
        } else {
          // list possible failure reasons
          errorMessage = "contract execution failed, possible reasons: 1) NFT is not registered 2) exceed max feeding limit";
        }
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'insufficient balance to pay for gas';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'transaction nonce error, please refresh the page and try again';
      }
      
      return { success: false, error: errorMessage, originalError: error };
    }
  }

  /**
   * check and register NFT (if not registered)
   * @param {number} tokenId - NFT tokenId
   * @param {string} userAddress - user wallet address
   * @returns {Promise<Object>} check/register result
   */
  async checkAndRegisterNFT(tokenId, userAddress) {
    if (!this.contract || !tokenId || !userAddress) {
      return { success: false, error: 'parameters are incomplete' };
    }

    try {
      // check if NFT is registered
      const feedingInfo = await this.getNFTFeedingInfo(tokenId);
      
      if (!feedingInfo) {
        return { success: false, error: 'get NFT info failed' };
      }
      
      if (feedingInfo.isActive) {
        return { success: true, registered: true, feedingInfo };
      }
      
      // get NFTLotteryManager contract address
      const nftLotteryManagerAddress = await this.contract.methods.nftLotteryManager().call();
      console.log('NFTLotteryManager address:', nftLotteryManagerAddress);
      
      // check if user has permission to register NFT
      const isAuthorized = await this.contract.methods.authorizedRegistrars(userAddress).call();
      if (!isAuthorized) {
        return {
          success: false,
          registered: false,
          error: 'you do not have permission to register NFT, please contact the administrator to register the feeding function for your NFT',
          needsRegistration: true
        };
      }
      
      // try to get NFT quality
      let quality = 0; // default to common quality
      
      // if user has permission to register, try to register NFT
      try {
        console.log('preparing to register NFT:', tokenId, 'quality:', quality);
        
        // get gas estimate
        const gasEstimate = await this.contract.methods.registerNFT(tokenId, quality).estimateGas({
          from: userAddress
        });
        
        const tx = await this.contract.methods.registerNFT(tokenId, quality).send({
          from: userAddress,
          gas: Math.floor(gasEstimate * 1.5) // add 50% gas as buffer
        });
        
        console.log('NFT registered successfully:', tx);
        
        // get the latest feeding info
        const updatedFeedingInfo = await this.getNFTFeedingInfo(tokenId);
        
        return {
          success: true,
          registered: true,
          transaction: tx,
          message: 'NFT registered successfully, now you can start feeding',
          feedingInfo: updatedFeedingInfo
        };
      } catch (regError) {
        console.error('register NFT failed:', regError);
        
        // get more detailed error information
        let errorMessage = regError.message || 'register NFT failed';
        
        if (errorMessage.includes('execution reverted')) {
          if (regError.data) {
            errorMessage = `contract execution failed: ${regError.data}`;
          } else {
            errorMessage = "contract execution failed, possible reasons: 1) NFT is already registered 2) insufficient permission";
          }
        }
        
        return {
          success: false,
          registered: false,
          error: errorMessage,
          needsAdminHelp: true
        };
      }
    } catch (error) {
      console.error('check NFT registration status failed:', error);
      return {
        success: false,
        error: 'check NFT registration status failed: ' + (error.message || 'unknown error')
      };
    }
  }

  /**
   * batch feed multiple NFTs
   * @param {number[]} tokenIds - NFT tokenIds array
   * @param {number} foodPerNFT - food amount per NFT
   * @param {string} userAddress - user wallet address
   * @param {Object} options - additional options
   * @returns {Promise<Object>} transaction result
   */
  async feedMultipleNFTs(tokenIds, foodPerNFT, userAddress, options = {}) {
    if (!this.contract) {
      console.error('batch feed NFTs failed: contract instance is empty');
      return { success: false, error: 'contract instance is empty' };
    }
    
    if (!userAddress) {
      console.error('batch feed NFTs failed: user address is empty');
      return { success: false, error: 'user address is empty' };
    }
    
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      console.error('batch feed NFTs failed: invalid NFT ID array');
      return { success: false, error: 'invalid NFT ID array' };
    }
    
    if (tokenIds.length > 100) {
      console.error('batch feed NFTs failed: one time can only feed 100 NFTs');
      return { success: false, error: 'one time can only feed 100 NFTs' };
    }
    
    if (!foodPerNFT || isNaN(parseInt(foodPerNFT)) || parseInt(foodPerNFT) <= 0) {
      console.error('batch feed NFTs failed: invalid food amount per NFT');
      return { success: false, error: 'invalid food amount per NFT' };
    }
    
    try {
      // convert to integer
      const parsedTokenIds = tokenIds.map(id => parseInt(id));
      foodPerNFT = parseInt(foodPerNFT);
      
      // calculate total food amount
      const totalFoodAmount = foodPerNFT * parsedTokenIds.length;
      
      // print detailed debug information
      console.log('batch feed NFTs detailed information:', {
        tokenIds: parsedTokenIds,
        tokenCount: parsedTokenIds.length,
        foodPerNFT: foodPerNFT,
        totalFoodAmount: totalFoodAmount,
        userAddress: userAddress,
        contract: this.contract.options.address
      });
      
      // get PWFOOD contract
      const pwfoodContract = await this.getPWFOODContract(window.getContractAddress);
      if (!pwfoodContract) {
        return { success: false, error: 'cannot get PWFOOD contract' };
      }
      
      // check if all NFTs are registered and belong to the user
      const validationErrors = [];
      const nftRegisterStatus = [];
      
      // use Promise.all to check all NFTs, improve efficiency
      await Promise.all(parsedTokenIds.map(async (tokenId, index) => {
        try {
          // check if NFT is registered
          const feedingInfo = await this.contract.methods.nftFeeding(tokenId).call();
          
          if (!feedingInfo.isActive) {
            validationErrors.push(`NFT #${tokenId} is not registered in the feeding system`);
            nftRegisterStatus.push({ tokenId, isActive: false, index });
          } else if (feedingInfo.feedingHours + foodPerNFT > 168) {  // 168 is MAX_FEEDING_HOURS
            validationErrors.push(`NFT #${tokenId} will exceed the maximum feeding limit after feeding (168 hours)`);
            nftRegisterStatus.push({ 
              tokenId, 
              isActive: true, 
              error: 'will exceed the feeding limit',
              currentHours: feedingInfo.feedingHours,
              maxAllowed: 168 - feedingInfo.feedingHours,
              index
            });
          } else {
            nftRegisterStatus.push({ tokenId, isActive: true, currentHours: feedingInfo.feedingHours, index });
          }
        } catch (error) {
          console.error(`check NFT #${tokenId} status failed:`, error);
          validationErrors.push(`check NFT #${tokenId} status failed: ${error.message || 'unknown error'}`);
          nftRegisterStatus.push({ tokenId, error: 'check status failed', index });
        }
      }));
      
      // if there are errors, return early
      if (validationErrors.length > 0) {
        return { 
          success: false, 
          error: 'batch feed NFTs validation failed', 
          validationErrors, 
          nftRegisterStatus,
          invalidNftCount: validationErrors.length,
          validNftCount: parsedTokenIds.length - validationErrors.length
        };
      }
      
      // check approval and balance status
      const approvalStatus = await ContractApprovalManager.checkIfApprovalNeeded(
        pwfoodContract, 
        userAddress, 
        this.contract.options.address, 
        totalFoodAmount.toString()
      );
      
      console.log('PWFOOD approval status:', approvalStatus);
      
      // check balance
      if (!approvalStatus.sufficientFunds) {
        return { 
          success: false, 
          error: 'PWFOOD balance is insufficient', 
          requiredAmount: totalFoodAmount, 
          balance: approvalStatus.balance 
        };
      }
      
      // check approval
      if (approvalStatus.needsApproval) {
        return { 
          success: false, 
          error: 'need to approve PWFOOD', 
          needApproval: true, 
          requiredAmount: totalFoodAmount, 
          allowance: approvalStatus.currentAllowance,
          pwfoodContract: pwfoodContract,
          feedingManagerAddress: this.contract.options.address
        };
      }
      
      console.log('preparing to send batch feed NFTs transaction...');
      
      // calculate gas usage dynamically
      const gasEstimate = await this.estimateGasUsage(
        this.contract.methods.feedMultipleNFTs,
        [parsedTokenIds, totalFoodAmount],
        userAddress
      );
      
      console.log('batch feed NFTs estimated gas usage:', gasEstimate);
      
      // send batch feed NFTs transaction
      const transaction = await this.contract.methods.feedMultipleNFTs(parsedTokenIds, totalFoodAmount).send({
        from: userAddress,
        gas: gasEstimate
      });
      
      console.log('batch feed NFTs transaction submitted:', transaction);
      
      // after feeding successfully, get the latest feeding info (only get the first 5 to avoid too many requests)
      const sampleSize = Math.min(5, parsedTokenIds.length);
      const updatedFeedingInfos = [];
      
      for (let i = 0; i < sampleSize; i++) {
        try {
          const info = await this.getNFTFeedingInfo(parsedTokenIds[i]);
          if (info) {
            updatedFeedingInfos.push({
              tokenId: parsedTokenIds[i],
              feedingInfo: info
            });
          }
        } catch (error) {
          console.error(`get updated feeding info for NFT #${parsedTokenIds[i]} failed:`, error);
        }
      }
      
      return { 
        success: true, 
        transaction: transaction,
        tokenIds: parsedTokenIds,
        tokenCount: parsedTokenIds.length,
        foodPerNFT: foodPerNFT,
        totalFoodAmount: totalFoodAmount,
        gasUsed: transaction.gasUsed || 0,
        updatedFeedingInfos: updatedFeedingInfos,
        message: `successfully fed ${parsedTokenIds.length} NFTs, each NFT increased ${foodPerNFT} hours of feeding time`
      };
    } catch (error) {
      console.error('batch feed NFTs failed:', error);
      
      // try to get more detailed error information
      let errorMessage = error.message || 'batch feed NFTs failed';
      
      // check common errors
      if (errorMessage.includes('execution reverted')) {
        if (error.data) {
          errorMessage = `contract execution failed: ${error.data}`;
        } else {
          errorMessage = "contract execution failed, possible reasons: 1) some NFTs are not registered 2) some NFTs exceed the maximum feeding limit 3) NFT is not yours";
        }
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'insufficient balance to pay for gas';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'transaction nonce error, please refresh the page and try again';
      }
      
      return { success: false, error: errorMessage, originalError: error };
    }
  }

  /**
   * claim NFT rewards
   * @param {number[]} tokenIds - NFT tokenIds array
   * @param {string} userAddress - user wallet address
   * @param {Object} options - additional options
   * @returns {Promise<Object>} transaction result
   */
  async claimRewards(tokenIds, userAddress, options = {}) {
    if (!this.contract) {
      console.error('claim NFT rewards failed: contract instance is empty');
      return { success: false, error: 'contract instance is empty' };
    }
    
    if (!userAddress) {
      console.error('claim NFT rewards failed: user address is empty');
      return { success: false, error: 'user address is empty' };
    }
    
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      console.error('claim NFT rewards failed: invalid NFT ID array');
      return { success: false, error: 'invalid NFT ID array' };
    }
    
    if (tokenIds.length > 100) {
      console.error('claim NFT rewards failed: one time can only claim rewards for 100 NFTs');
      return { success: false, error: 'one time can only claim rewards for 100 NFTs' };
    }
    
    try {
      // convert to integer
      const parsedTokenIds = tokenIds.map(id => parseInt(id));
      
      // print detailed debug information
      console.log('claim NFT rewards detailed information:', {
        tokenIds: parsedTokenIds,
        tokenCount: parsedTokenIds.length,
        userAddress: userAddress,
        contract: this.contract.options.address
      });
      
      // check if all NFTs are registered and belong to the user
      const validationErrors = [];
      const nftRewardStatus = [];
      let totalPwpotRewards = 0;
      let totalPwbotRewards = 0;
      
      // use Promise.all to check all NFTs, improve efficiency
      await Promise.all(parsedTokenIds.map(async (tokenId, index) => {
        try {
          // check if NFT is registered
          const feedingInfo = await this.contract.methods.nftFeeding(tokenId).call();
          
          if (!feedingInfo.isActive) {
            validationErrors.push(`NFT #${tokenId} is not registered in the feeding system`);
            nftRewardStatus.push({ tokenId, isActive: false, index });
            return;
          }
          
          // verify NFT ownership (need pwnft contract address)
          try {
            const pwnftAddress = await this.contract.methods.pwnft().call();
            const pwnftContract = new this.web3.eth.Contract([
              {
                "constant": true,
                "inputs": [{"name": "tokenId", "type": "uint256"}],
                "name": "ownerOf",
                "outputs": [{"name": "", "type": "address"}],
                "type": "function"
              }
            ], pwnftAddress);
            
            const owner = await pwnftContract.methods.ownerOf(tokenId).call();
            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              validationErrors.push(`NFT #${tokenId} does not belong to you`);
              nftRewardStatus.push({ tokenId, isActive: true, error: 'does not belong to you', index });
              return;
            }
          } catch (ownerError) {
            console.error(`check NFT #${tokenId} ownership failed:`, ownerError);
            // skip ownership verification and continue processing
          }
          
          // calculate claimable rewards
          const rewards = await this.calculateClaimableRewards(tokenId);
          
          totalPwpotRewards += rewards.pwpot;
          totalPwbotRewards += rewards.pwbot;
          
          nftRewardStatus.push({ 
            tokenId, 
            isActive: true, 
            rewards: rewards, 
            feedingHours: parseInt(feedingInfo.feedingHours),
            index
          });
        } catch (error) {
          console.error(`check NFT #${tokenId} rewards status failed:`, error);
          validationErrors.push(`check NFT #${tokenId} rewards status failed: ${error.message || 'unknown error'}`);
          nftRewardStatus.push({ tokenId, error: 'check status failed', index });
        }
      }));
      
      // check if there are any rewards to claim
      const nftsWithRewards = nftRewardStatus.filter(nft => 
        nft.rewards && (nft.rewards.pwpot > 0 || nft.rewards.pwbot > 0)
      );
      
      if (nftsWithRewards.length === 0) {
        return { 
          success: false, 
          error: 'no rewards to claim', 
          nftRewardStatus,
          totalPwpotRewards,
          totalPwbotRewards
        };
      }
      
      // if there are errors, but there are still rewards to claim, remind the user
      let warningMessage = null;
      if (validationErrors.length > 0) {
        warningMessage = `${validationErrors.length} NFTs cannot claim rewards, only valid NFTs will be processed`;
        
        // remove invalid NFTs
        parsedTokenIds = parsedTokenIds.filter((_, index) => {
          return !nftRewardStatus[index].error && nftRewardStatus[index].isActive;
        });
        
        if (parsedTokenIds.length === 0) {
          return { 
            success: false, 
            error: 'all NFTs cannot claim rewards', 
            validationErrors, 
            nftRewardStatus
          };
        }
      }
      
      console.log('preparing to send claim rewards transaction...');
      
      // calculate gas usage dynamically
      const gasEstimate = await this.estimateGasUsage(
        this.contract.methods.claimRewards,
        [parsedTokenIds],
        userAddress,
        1.7  // claim rewards uses a higher multiplier because it is more complex
      );
      
      console.log('claim rewards estimated gas usage:', gasEstimate);
      
      // send claim rewards transaction
      const transaction = await this.contract.methods.claimRewards(parsedTokenIds).send({
        from: userAddress,
        gas: gasEstimate
      });
      
      console.log('claim rewards transaction submitted:', transaction);
      
      // after claiming successfully, get the latest feeding info (only get the first 5 to avoid too many requests)
      const sampleSize = Math.min(5, parsedTokenIds.length);
      const updatedFeedingInfos = [];
      
      for (let i = 0; i < sampleSize; i++) {
        try {
          const info = await this.getNFTFeedingInfo(parsedTokenIds[i]);
          if (info) {
            updatedFeedingInfos.push({
              tokenId: parsedTokenIds[i],
              feedingInfo: info
            });
          }
        } catch (error) {
          console.error(`get updated feeding info for NFT #${parsedTokenIds[i]} failed:`, error);
        }
      }
      
      // calculate actual rewards (get from transaction events)
      let actualPwpotRewards = totalPwpotRewards;
      let actualPwbotRewards = totalPwbotRewards;
      
      if (transaction.events && transaction.events.RewardsClaimed) {
        const event = transaction.events.RewardsClaimed;
        if (event.returnValues) {
          actualPwpotRewards = parseInt(event.returnValues.totalPwpotRewards || totalPwpotRewards);
          actualPwbotRewards = parseInt(event.returnValues.totalPwbotRewards || totalPwbotRewards);
        }
      }
      
      return { 
        success: true, 
        transaction: transaction,
        tokenIds: parsedTokenIds,
        tokenCount: parsedTokenIds.length,
        pwpotRewards: actualPwpotRewards,
        pwbotRewards: actualPwbotRewards,
        gasUsed: transaction.gasUsed || 0,
        updatedFeedingInfos: updatedFeedingInfos,
        warning: warningMessage,
        message: `successfully claimed rewards for ${parsedTokenIds.length} NFTs, got ${actualPwpotRewards} PWPOT and ${actualPwbotRewards} PWBOT`
      };
    } catch (error) {
      console.error('claim NFT rewards failed:', error);
      
      // try to get more detailed error information
      let errorMessage = error.message || 'claim NFT rewards failed';
      
      // check common errors
      if (errorMessage.includes('execution reverted')) {
        if (error.data) {
          errorMessage = `contract execution failed: ${error.data}`;
        } else {
          errorMessage = "contract execution failed, possible reasons: 1) some NFTs are not registered 2) some NFTs have no rewards to claim 3) NFT does not belong to you";
        }
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'insufficient balance to pay for gas';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'transaction nonce error, please refresh the page and try again';
      }
      
      return { success: false, error: errorMessage, originalError: error };
    }
  }

  /**
   * calculate NFT claimable rewards
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<Object>} - claimable rewards information
   */
  async calculateClaimableRewards(tokenId) {
    try {
      const feedingData = await this.getNFTFeedingData(tokenId);
      
      if (!feedingData.isActive) {
        return { pwpot: 0, pwbot: 0, cycles: 0 };
      }
      
      // get current time
      const currentTime = Math.floor(Date.now() / 1000);
      
      // use accumulated cycles as the base
      let totalValidCycles = parseInt(feedingData.accumulatedCycles || 0);
      
      // if not yet to the last claim time and no accumulated cycles, no rewards can be claimed
      if (currentTime <= feedingData.lastClaimTime && totalValidCycles === 0) {
        return { pwpot: 0, pwbot: 0, cycles: 0 };
      }
      
      // if current time is greater than the last claim time, calculate the new cycles
      if (currentTime > feedingData.lastClaimTime) {
        // calculate the time since the last claim (in seconds)
        const timeSinceLastClaim = currentTime - feedingData.lastClaimTime;
        
        // get the seconds per cycle
        const secondsPerCycle = await this.getSecondsPerCycle();
        
        // if the time since the last claim is less than or equal to the seconds corresponding to the feeding time, calculate the claimable cycles directly
        if (feedingData.feedingHours * 3600 >= timeSinceLastClaim) {
          // no longer limit the maximum reward cycles, fully based on time calculation
          const newCycles = Math.floor(timeSinceLastClaim / secondsPerCycle);
          totalValidCycles += newCycles;
        } else {
          // calculate the valid cycles before the starvation period (remove the maximum cycle limit)
          const hoursBeforeStarvation = feedingData.feedingHours;
          const cyclesBeforeStarvation = hoursBeforeStarvation; // because 1 hour = 1 cycle
          
          totalValidCycles += cyclesBeforeStarvation;
          
          // check if there is a feeding after the starvation period
          if (feedingData.lastFeedTime > feedingData.lastClaimTime + (feedingData.feedingHours * 3600)) {
            const timeFromLastFeed = currentTime > feedingData.lastFeedTime ? 
                                   currentTime - feedingData.lastFeedTime : 0;
            
            if (timeFromLastFeed > 0) {
              const cyclesFromLastFeed = Math.floor(timeFromLastFeed / secondsPerCycle);
              
              // the new cycles are only limited by the current remaining feeding time
              const currentPeriodCycles = Math.min(cyclesFromLastFeed, feedingData.feedingHours);
              
              totalValidCycles += currentPeriodCycles;
            }
          }
        }
      }
      
      // get the reward config
      const rewardConfig = await this.getRewardConfig(feedingData.quality);
      
      // calculate the rewards, no longer have the maximum cycle limit
      const pwpotReward = rewardConfig.pwpotReward * totalValidCycles;
      const pwbotReward = rewardConfig.pwbotReward * totalValidCycles;
      
      return {
        pwpot: pwpotReward,
        pwbot: pwbotReward,
        cycles: totalValidCycles,
        noMaxCycleLimit: true
      };
    } catch (error) {
      console.error('calculate claimable rewards failed:', error);
      throw error;
    }
  }

  /**
   * batch calculate multiple NFT claimable rewards
   * @param {number[]} tokenIds - NFT's TokenID array
   * @returns {Promise<Object>} - batch claimable rewards information
   */
  async batchCalculateClaimableRewards(tokenIds) {
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      console.error('batch calculate rewards failed: invalid NFT ID array');
      return { success: false, totalRewards: { pwpot: 0, pwbot: 0 }, nftRewards: [] };
    }
    
    try {
      // convert to integer
      const parsedTokenIds = tokenIds.map(id => parseInt(id));
      let totalPwpot = 0;
      let totalPwbot = 0;
      const nftRewards = [];
      
      // use Promise.all to process all requests in parallel
      const results = await Promise.all(parsedTokenIds.map(async tokenId => {
        try {
          const rewards = await this.calculateClaimableRewards(tokenId);
          const feedingData = await this.getNFTFeedingData(tokenId);
          
          return {
            tokenId,
            rewards,
            feedingData,
            success: true
          };
        } catch (error) {
          console.error(`calculate NFT #${tokenId} rewards failed:`, error);
          return {
            tokenId,
            error: error.message || 'calculate rewards failed',
            success: false
          };
        }
      }));
      
      // process the results
      results.forEach(result => {
        if (result.success) {
          totalPwpot += result.rewards.pwpot;
          totalPwbot += result.rewards.pwbot;
          nftRewards.push({
            tokenId: result.tokenId,
            pwpot: result.rewards.pwpot,
            pwbot: result.rewards.pwbot,
            cycles: result.rewards.cycles,
            feedingHours: result.feedingData.feedingHours,
            quality: result.feedingData.quality,
            accumulatedCycles: result.feedingData.accumulatedCycles || 0,
            noMaxCycleLimit: true
          });
        } else {
          nftRewards.push({
            tokenId: result.tokenId,
            error: result.error,
            pwpot: 0,
            pwbot: 0,
            cycles: 0,
            noMaxCycleLimit: true
          });
        }
      });
      
      return {
        success: true,
        totalRewards: {
          pwpot: totalPwpot,
          pwbot: totalPwbot,
          totalNfts: tokenIds.length,
          nftsWithRewards: nftRewards.filter(nft => nft.pwpot > 0 || nft.pwbot > 0).length
        },
        nftRewards: nftRewards
      };
    } catch (error) {
      console.error('batch calculate NFT rewards failed:', error);
      return { 
        success: false, 
        error: error.message || 'batch calculate NFT rewards failed',
        totalRewards: { pwpot: 0, pwbot: 0 },
        nftRewards: []
      };
    }
  }

  /**
   * calculate NFT's feeding satiety percentage
   * @param {number} tokenId - NFT's TokenID
   * @returns {Promise<number>} - satiety percentage (0-100)
   */
  async calculateFeedingPercentage(tokenId) {
    try {
      const feedingData = await this.getNFTFeedingData(tokenId);
      const maxFeedingHours = await this.getMaxFeedingHours();
      
      if (!feedingData.isActive) {
        return 0;
      }
      
      return Math.min(100, Math.max(0, (feedingData.feedingHours / maxFeedingHours) * 100));
    } catch (error) {
      console.error('calculate feeding percentage failed:', error);
      throw error;
    }
  }
}

// export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    NFTFeedingManagerContract,
    NFTFeedingManagerABI
  };
} else {
  window.NFTFeedingManagerContract = NFTFeedingManagerContract;
  window.NFTFeedingManagerABI = NFTFeedingManagerABI;
} 