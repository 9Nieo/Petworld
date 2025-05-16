// NFTLotteryManager.js - Pet World NFT Lottery Manager Contract Interface
// Define global variables
window.NFTLotteryManagerABI = window.NFTLotteryManagerABI || [];
var NFTLotteryManagerABI = window.NFTLotteryManagerABI;
class NFTLotteryManagerContract {
  /**
   * Constructor
   * @param {Object} web3 - Web3 instance
   */
  constructor(web3) {
    if (!web3) {
      console.error('Failed to initialize NFTLotteryManager contract: Web3 not initialized');
      return;
    }
    
    try {
      // Get contract address
      const network = window.currentNetwork || 'TEST';
      let nftLotteryManagerAddress;
      
      if (typeof window.getContractAddress === 'function') {
        nftLotteryManagerAddress = window.getContractAddress('NFTLotteryManager');
      } else if (window.contractAddresses && window.contractAddresses[network]) {
        nftLotteryManagerAddress = window.contractAddresses[network].NFTLotteryManager;
      } else {
        console.error('Unable to get NFTLotteryManager contract address');
        return;
      }
      
      if (!nftLotteryManagerAddress) {
        console.error('NFTLotteryManager contract address is empty');
        return;
      }
      
      this.web3 = web3;
      this.contractAddress = nftLotteryManagerAddress;
      this.contract = new web3.eth.Contract(NFTLotteryManagerABI, nftLotteryManagerAddress);
      console.log('NFTLotteryManager contract initialized successfully, address:', nftLotteryManagerAddress);
    } catch (error) {
      console.error('Failed to initialize NFTLotteryManager contract:', error);
    }
  }

  /**
   * Check if the address has claimed a free NFT
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} - Whether the free NFT has been claimed
   */
  async hasClaimedFreeNFT(userAddress) {
    try {
      const claimed = await this.contract.methods.hasClaimedFreeNFT(userAddress).call();
      return claimed;
    } catch (error) {
      console.error('Failed to check if free NFT has been claimed:', error);
      throw error;
    }
  }

  /**
   * Get the total number of registered users
   * @returns {Promise<number>} - Total number of registered users
   */
  async getTotalRegisteredUsers() {
    try {
      const total = await this.contract.methods.totalRegisteredUsers().call();
      return parseInt(total);
    } catch (error) {
      console.error('Failed to get total number of registered users:', error);
      throw error;
    }
  }

  /**
   * Get the user's request status
   * @param {string} userAddress - User address
   * @returns {Promise<Object>} - Request status
   */
  async getUserRequestStatus(userAddress) {
    try {
      const requestId = await this.contract.methods.userRequests(userAddress).call();
      
      if (requestId === '0') {
        return { exists: false };
      }
      
      const requestStatus = await this.contract.methods.s_requests(requestId).call();
      return {
        requestId,
        fulfilled: requestStatus.fulfilled,
        exists: requestStatus.exists,
        user: requestStatus.user,
        maxRange: parseInt(requestStatus.maxRange),
        requestType: requestStatus.requestType
      };
    } catch (error) {
      console.error('Failed to get user request status:', error);
      throw error;
    }
  }

  /**
   * Get reward points settings
   * @returns {Promise<Object>} - Reward points settings
   */
  async getRewardPoints() {
    try {
      const [claimInviteRewardPoint, commonEggInviteRewardPoint, rareEggInviteRewardPoint, legendaryEggInviteRewardPoint] = await Promise.all([
        this.contract.methods.claimInviteRewardPoint().call(),
        this.contract.methods.commonEggInviteRewardPoint().call(),
        this.contract.methods.rareEggInviteRewardPoint().call(),
        this.contract.methods.legendaryEggInviteRewardPoint().call()
      ]);
      
      return {
        claimInviteRewardPoint: parseInt(claimInviteRewardPoint),
        commonEggInviteRewardPoint: parseInt(commonEggInviteRewardPoint),
        rareEggInviteRewardPoint: parseInt(rareEggInviteRewardPoint),
        legendaryEggInviteRewardPoint: parseInt(legendaryEggInviteRewardPoint)
      };
    } catch (error) {
      console.error('Failed to get reward points settings:', error);
      throw error;
    }
  }

  /**
   * Get initial totals of rare and legendary NFTs
   * @returns {Promise<Object>} - Initial totals of rare and legendary NFTs
   */
  async getInitialTotals() {
    try {
      const [initialRareTotal, initialLegendaryTotal, initialTotalsSet] = await Promise.all([
        this.contract.methods.initialRareTotal().call(),
        this.contract.methods.initialLegendaryTotal().call(),
        this.contract.methods.initialTotalsSet().call()
      ]);
      
      return {
        initialRareTotal: parseInt(initialRareTotal),
        initialLegendaryTotal: parseInt(initialLegendaryTotal),
        initialTotalsSet
      };
    } catch (error) {
      console.error('Failed to get initial totals of rare and legendary NFTs:', error);
      throw error;
    }
  }

  /**
   * Get related contract addresses
   * @returns {Promise<Object>} - Related contract addresses
   */
  async getRelatedContracts() {
    try {
      const [pwnft, nftManager, paymentManager, nftFeedingManager, pwPointManager] = await Promise.all([
        this.contract.methods.pwnft().call(),
        this.contract.methods.nftManager().call(),
        this.contract.methods.paymentManager().call(),
        this.contract.methods.nftFeedingManager().call(),
        this.contract.methods.pwPointManager().call()
      ]);
      
      return {
        pwnft,
        nftManager,
        paymentManager,
        nftFeedingManager,
        pwPointManager
      };
    } catch (error) {
      console.error('Failed to get related contract addresses:', error);
      throw error;
    }
  }

  /**
   * Claim a free NFT
   * @param {string} inviterAddress - Inviter address (can be 0 address if none)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimFreeNFT(inviterAddress, options = {}) {
    try {
      if (!inviterAddress || inviterAddress === '') {
        inviterAddress = '0x0000000000000000000000000000000000000000';
      }
      
      const tx = await this.contract.methods.claimFreeNFT(inviterAddress).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 400000
      });
      return tx;
    } catch (error) {
      console.error('Failed to claim free NFT:', error);
      throw error;
    }
  }

  /**
   * Open a common egg
   * @param {string} tokenAddress - Payment token address
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async openCommonEgg(tokenAddress, options = {}) {
    try {
      const tx = await this.contract.methods.openCommonEgg(tokenAddress).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 600000
      });
      return tx;
    } catch (error) {
      console.error('Failed to open common egg:', error);
      throw error;
    }
  }

  /**
   * Open a rare egg
   * @param {string} tokenAddress - Payment token address
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async openRareEgg(tokenAddress, options = {}) {
    try {
      const tx = await this.contract.methods.openRareEgg(tokenAddress).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 600000
      });
      return tx;
    } catch (error) {
      console.error('Failed to open rare egg:', error);
      throw error;
    }
  }

  /**
   * Open a legendary egg
   * @param {string} tokenAddress - Payment token address
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async openLegendaryEgg(tokenAddress, options = {}) {
    try {
      const tx = await this.contract.methods.openLegendaryEgg(tokenAddress).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 600000
      });
      return tx;
    } catch (error) {
      console.error('Failed to open legendary egg:', error);
      throw error;
    }
  }

  /**
   * Check if the lottery request is completed
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} - Whether the request is completed
   */
  async isLotteryRequestCompleted(userAddress) {
    try {
      const requestStatus = await this.getUserRequestStatus(userAddress);
      return requestStatus.exists && requestStatus.fulfilled;
    } catch (error) {
      console.error('Failed to check lottery request completion status:', error);
      throw error;
    }
  }

  /**
   * Get the current lottery pool size
   * @returns {Promise<string>} Pool size
   */
  async getLotteryPoolSize() {
    try {
      const poolSize = await this.contract.methods.getLotteryPoolSize().call();
      return poolSize;
    } catch (error) {
      console.error('Failed to get lottery pool size:', error);
      return '0';
    }
  }

  /**
   * Get lottery result event information from transaction
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object|null>} Lottery result information object or null (if no event found)
   */
  async getLotteryResultFromTransaction(txHash) {
    if (!txHash) {
      console.error('Failed to get lottery result: Transaction hash is empty');
      return null;
    }
    
    try {
      console.log(`Getting lottery result from transaction ${txHash}...`);
      
      // Get transaction receipt
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!receipt) {
        console.error('Failed to get transaction receipt');
        return null;
      }
      
      // Define quality level mapping
      const qualityNames = {
        0: 'COMMON',  // COMMON
        1: 'GOOD',  // GOOD
        2: 'EXCELLENT',  // EXCELLENT
        3: 'RARE',  // RARE
        4: 'LEGENDARY'   // LEGENDARY
      };
      
      // Define lottery type mapping
      const lotteryTypeNames = {
        'CommonEgg': 'COMMON EGG',
        'RareEgg': 'RARE EGG',
        'LegendaryEgg': 'LEGENDARY EGG'
      };
      
      // Parse event logs
      const events = receipt.logs.map(log => {
        try {
          return this.contract.options.jsonInterface.find(
            abi => abi.type === 'event' && 
            abi.signature === log.topics[0]
          );
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // Find NFTLotteryResult event
      const lotteryResultEvent = events.find(e => e.name === 'NFTLotteryResult');
      if (lotteryResultEvent) {
        // Find NFTLotteryResult event in logs
        for (const log of receipt.logs) {
          if (log.topics[0] === lotteryResultEvent.signature) {
            const decodedLog = this.web3.eth.abi.decodeLog(
              lotteryResultEvent.inputs,
              log.data,
              log.topics.slice(1)
            );
            
            // Build result object
            const result = {
              user: decodedLog.user,
              tokenId: decodedLog.tokenId,
              quality: parseInt(decodedLog.quality),
              qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
              nftId: decodedLog.nftId,
              lotteryType: decodedLog.lotteryType,
              lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
            };
            
            console.log('Successfully parsed lottery result:', result);
            return result;
          }
        }
      }
      
      // Find FreeNFTClaimed event
      const freeNFTEvent = events.find(e => e.name === 'FreeNFTClaimed');
      if (freeNFTEvent) {
        // Find FreeNFTClaimed event in logs
        for (const log of receipt.logs) {
          if (log.topics[0] === freeNFTEvent.signature) {
            const decodedLog = this.web3.eth.abi.decodeLog(
              freeNFTEvent.inputs,
              log.data,
              log.topics.slice(1)
            );
            
            // Build result object
            const result = {
              user: decodedLog.user,
              tokenId: decodedLog.tokenId,
              quality: 0, // Free NFT is always common (COMMON) quality
              qualityName: qualityNames[0],
              nftId: decodedLog.nftId,
              lotteryType: 'FreeNFT',
              lotteryTypeName: 'Free Pet'
            };
            
            console.log('Successfully parsed free NFT claim result:', result);
            return result;
          }
        }
      }
      
      console.warn('No lottery result event found in transaction');
      return null;
    } catch (error) {
      console.error('Failed to parse lottery result:', error);
      return null;
    }
  }

  /**
   * Process complete lottery transaction process
   * @param {string} lotteryType - Lottery type ('free', 'common', 'rare', 'legendary')
   * @param {string} tokenAddress - Payment token address
   * @param {string} statusElementId - Status information element ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Lottery result object
   */
  async processLotteryTransaction(lotteryType, tokenAddress, statusElementId, options = {}) {
    // Default options
    const defaultOptions = {
      inviter: '0x0000000000000000000000000000000000000000',
      txOptions: {
        from: window.ethereum.selectedAddress,
        gas: 500000
      },
      showResult: true,
      batchCount: 1 // Default to 1, indicating single purchase
    };
    
    // Merge options
    const mergedOptions = {...defaultOptions, ...options};
    
    // Validate lotteryType
    if (!['free', 'common', 'rare', 'legendary'].includes(lotteryType)) {
      console.error(`Invalid lottery type: ${lotteryType}`);
      throw new Error(`Invalid lottery type: ${lotteryType}`);
    }

    // Validate batch quantity
    const isBatch = mergedOptions.batchCount > 1;
    if (isBatch) {
      if (mergedOptions.batchCount < 2 || mergedOptions.batchCount > 10) {
        console.error(`Invalid batch purchase quantity: ${mergedOptions.batchCount}, must be between 2-10`);
        throw new Error(`Invalid batch purchase quantity: ${mergedOptions.batchCount}, must be between 2-10`);
      }
      
      if (lotteryType === 'free') {
        console.error('Free NFT does not support batch claim');
        throw new Error('Free NFT does not support batch claim');
      }
      
      // Add gas limit for batch transactions
      if (!options.txOptions || !options.txOptions.gas) {
        mergedOptions.txOptions.gas = lotteryType === 'legendary' ? 2000000 : 
                                     lotteryType === 'rare' ? 1500000 : 1000000;
      }
    }
    
    // Get status display element
    const statusElement = document.getElementById(statusElementId);
    if (statusElement) {
      statusElement.textContent = 'Preparing lottery...';
      statusElement.className = 'status-message info';
    }
    
    try {
      let txResult;
      
      // Call corresponding contract method based on lottery type
      if (lotteryType === 'free') {
        if (statusElement) {
          statusElement.textContent = 'Claiming free pet...';
        }
        
        // Claim free NFT
        txResult = await this.claimFreeNFT(mergedOptions.inviter, mergedOptions.txOptions);
      } else {
        if (!tokenAddress) {
          throw new Error('Payment token address cannot be empty');
        }
        
        // Show purchase message
        const eggType = lotteryType === 'common' ? 'Common' : lotteryType === 'rare' ? 'Rare' : 'Legendary';
        if (statusElement) {
          statusElement.textContent = isBatch ? 
            `Purchasing ${mergedOptions.batchCount} ${eggType} eggs...` : 
            `Purchasing ${eggType} egg...`;
        }
        
        // Call corresponding method based on type and whether batch purchase
        if (isBatch) {
          switch (lotteryType) {
            case 'common':
              txResult = await this.batchOpenCommonEgg(tokenAddress, mergedOptions.batchCount, mergedOptions.txOptions);
              break;
            case 'rare':
              txResult = await this.batchOpenRareEgg(tokenAddress, mergedOptions.batchCount, mergedOptions.txOptions);
              break;
            case 'legendary':
              txResult = await this.batchOpenLegendaryEgg(tokenAddress, mergedOptions.batchCount, mergedOptions.txOptions);
              break;
            default:
              throw new Error(`Unknown lottery type: ${lotteryType}`);
        }
        } else {
          // Single purchase
        switch (lotteryType) {
          case 'common':
            txResult = await this.openCommonEgg(tokenAddress, mergedOptions.txOptions);
            break;
          case 'rare':
            txResult = await this.openRareEgg(tokenAddress, mergedOptions.txOptions);
            break;
          case 'legendary':
            txResult = await this.openLegendaryEgg(tokenAddress, mergedOptions.txOptions);
            break;
          default:
            throw new Error(`Unknown lottery type: ${lotteryType}`);
          }
        }
      }
      
      if (statusElement) {
        statusElement.textContent = 'Transaction confirmed, getting lottery result...';
      }
      
      // Get transaction hash
      const txHash = txResult.transactionHash;
      console.log('Lottery transaction confirmed:', txHash);
      
      // Batch lottery, get multiple results
      if (isBatch) {
        const lotteryResults = await this.getLotteryResultsFromTransaction(txHash, mergedOptions.batchCount);
        
        if (!lotteryResults || lotteryResults.length === 0) {
          if (statusElement) {
            statusElement.textContent = 'Unable to get lottery results, please check your collection later';
            statusElement.className = 'status-message warning';
          }
          return null;
        }
        
        // Show basic result information
        if (statusElement) {
          const qualitySummary = this.getQualitySummary(lotteryResults);
          statusElement.textContent = `Lottery successful! Obtained ${lotteryResults.length} pets, of which ${qualitySummary}`;
          statusElement.className = 'status-message success';
        }
        
        // Use lotteryResultModule to display detailed results
        if (mergedOptions.showResult && window.lotteryResultModule && typeof window.lotteryResultModule.showBatch === 'function') {
          window.lotteryResultModule.showBatch(lotteryResults);
        }
        
        return lotteryResults;
      } else {
        // Single lottery result processing
      const lotteryResult = await this.getLotteryResultFromTransaction(txHash);
      
      if (!lotteryResult) {
        if (statusElement) {
          statusElement.textContent = 'Unable to get lottery result, please check your collection later';
          statusElement.className = 'status-message warning';
        }
        return null;
      }
      
        // Show basic result information
      if (statusElement) {
        statusElement.textContent = `Congratulations! You obtained a ${lotteryResult.qualityName} quality pet!`;
        statusElement.className = 'status-message success';
      }
      
        // Use lotteryResultModule to display detailed results
        if (mergedOptions.showResult && window.lotteryResultModule && typeof window.lotteryResultModule.show === 'function') {
          window.lotteryResultModule.show(lotteryResult);
      }
      
      return lotteryResult;
      }
    } catch (error) {
      console.error('Lottery process error:', error);
      
      // Show error information
      if (statusElement) {
        let errorMessage = 'Lottery failed';
        
        // Try to parse common errors
        if (error.message) {
          if (error.message.includes('user rejected transaction')) {
            errorMessage = 'You canceled the transaction';
          } else if (error.message.includes('Payment failed')) {
            errorMessage = 'Payment failed, please confirm you have enough token balance';
          } else if (error.message.includes('Already claimed')) {
            errorMessage = 'You have already claimed a free pet';
          } else if (error.message.includes('gas')) {
            errorMessage = 'Insufficient fuel fee, please increase Gas limit';
          } else {
            // Extract the last part of the error message, usually the most useful
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMessage = parts[parts.length - 1].trim();
            } else {
              errorMessage = error.message;
            }
          }
        }
        
        statusElement.textContent = errorMessage;
        statusElement.className = 'status-message error';
      }
      
      throw error;
    }
  }
  
  /**
   * Get quality summary text
   * @param {Array<Object>} results - Lottery result array
   * @returns {string} Quality summary text
   */
  getQualitySummary(results) {
    if (!results || !Array.isArray(results) || results.length === 0) {
      return '';
    }
    
    const qualityCounts = {};
    
    // Count quality levels
    for (const result of results) {
      const quality = parseInt(result.quality);
      const qualityName = this.getQualityName(quality);
      qualityCounts[qualityName] = (qualityCounts[qualityName] || 0) + 1;
    }
    
    // Build summary text
    const parts = [];
    const qualityOrder = ['Legendary', 'Rare', 'Excellent', 'Good', 'Common'];
    
    for (const quality of qualityOrder) {
      if (qualityCounts[quality]) {
        parts.push(`${quality} ${qualityCounts[quality]} pets`);
      }
    }
    
    return parts.join(', ');
  }
  
  /**
   * Get quality name
   * @param {number} quality - Quality level (0-4)
   * @returns {string} Quality name
   */
  getQualityName(quality) {
    const qualityNames = {
      0: 'Common',
      1: 'Good',
      2: 'Excellent',
      3: 'Rare',
      4: 'Legendary'
    };
    
    return qualityNames[quality] || 'Common';
  }

  /**
   * Batch open common egg
   * @param {string} tokenAddress - Payment token address
   * @param {number} count - Purchase quantity (2-10)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async batchOpenCommonEgg(tokenAddress, count, options = {}) {
    try {
      // Validate quantity range
      if (count < 2 || count > 10) {
        throw new Error('Purchase quantity must be between 2 and 10');
      }
      
      const tx = await this.contract.methods.batchOpenCommonEgg(tokenAddress, count).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || (1000000 + (count * 1000000)) // Dynamic gas limit calculation
      });
      return tx;
    } catch (error) {
      console.error('Failed to batch open common egg:', error);
      throw error;
    }
  }

  /**
   * Batch open rare egg
   * @param {string} tokenAddress - Payment token address
   * @param {number} count - Purchase quantity (2-10)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async batchOpenRareEgg(tokenAddress, count, options = {}) {
    try {
      // Validate quantity range
      if (count < 2 || count > 10) {
        throw new Error('Purchase quantity must be between 2 and 10');
      }
      
      const tx = await this.contract.methods.batchOpenRareEgg(tokenAddress, count).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || (1500000 + (count * 1500000)) // Dynamic gas limit calculation
      });
      return tx;
    } catch (error) {
      console.error('Failed to batch open rare egg:', error);
      throw error;
    }
  }

  /**
   * Batch open legendary egg
   * @param {string} tokenAddress - Payment token address
   * @param {number} count - Purchase quantity (2-10)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async batchOpenLegendaryEgg(tokenAddress, count, options = {}) {
    try {
      // Validate quantity range
      if (count < 2 || count > 10) {
        throw new Error('Purchase quantity must be between 2 and 10');
    }
    
      const tx = await this.contract.methods.batchOpenLegendaryEgg(tokenAddress, count).send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || (2000000 + (count * 2000000)) // Dynamic gas limit calculation
      });
      return tx;
    } catch (error) {
      console.error('Failed to batch open legendary egg:', error);
      throw error;
    }
  }

  /**
   * Get multiple lottery result event information from transaction
   * @param {string} txHash - Transaction hash
   * @param {number} expectedCount - Expected result count
   * @returns {Promise<Array<Object>|null>} Lottery result information array or null (if no event found)
   */
  async getLotteryResultsFromTransaction(txHash, expectedCount = 1) {
    if (!txHash) {
      console.error('Failed to get lottery result: Transaction hash is empty');
      return null;
    }
    
    try {
      console.log(`Getting batch lottery results (expected count: ${expectedCount}) from transaction ${txHash}...`);
      
      // Get transaction receipt
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!receipt) {
        console.error('Failed to get transaction receipt');
        return null;
      }
      
      // Define quality level mapping
      const qualityNames = {
        0: 'COMMON',  // COMMON
        1: 'GOOD',  // GOOD
        2: 'EXCELLENT',  // EXCELLENT
        3: 'RARE',  // RARE
        4: 'LEGENDARY'   // LEGENDARY
      };
      
      // Define lottery type mapping
      const lotteryTypeNames = {
        'CommonEgg': 'COMMON EGG',
        'RareEgg': 'RARE EGG',
        'LegendaryEgg': 'LEGENDARY EGG'
      };
      
      // Find event signature
      const lotteryResultEventAbi = this.contract.options.jsonInterface.find(
        abi => abi.type === 'event' && abi.name === 'NFTLotteryResult'
      );
      
      const freeNFTEventAbi = this.contract.options.jsonInterface.find(
        abi => abi.type === 'event' && abi.name === 'FreeNFTClaimed'
      );
      
      if (!lotteryResultEventAbi && !freeNFTEventAbi) {
        console.error('NFTLotteryResult or FreeNFTClaimed event not found in contract ABI');
        return null;
      }
      
      // Store found results
      const results = [];
      
      // Find events in logs
      for (const log of receipt.logs) {
        // Check if matches NFTLotteryResult event
        if (lotteryResultEventAbi && log.topics[0] === lotteryResultEventAbi.signature) {
          const decodedLog = this.web3.eth.abi.decodeLog(
            lotteryResultEventAbi.inputs,
            log.data,
            log.topics.slice(1)
          );
          
          // Build result object
          const result = {
            user: decodedLog.user,
            tokenId: decodedLog.tokenId,
            quality: parseInt(decodedLog.quality),
            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
            nftId: decodedLog.nftId,
            lotteryType: decodedLog.lotteryType,
            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
          };
          
          results.push(result);
        }
        // Check if matches FreeNFTClaimed event
        else if (freeNFTEventAbi && log.topics[0] === freeNFTEventAbi.signature) {
          const decodedLog = this.web3.eth.abi.decodeLog(
            freeNFTEventAbi.inputs,
            log.data,
            log.topics.slice(1)
          );
          
          // Build result object
          const result = {
            user: decodedLog.user,
            tokenId: decodedLog.tokenId,
            quality: 0, // Free NFT is always common (COMMON) quality
            qualityName: qualityNames[0],
            nftId: decodedLog.nftId,
            lotteryType: 'FreeNFT',
            lotteryTypeName: 'Free Pet'
          };
          
          results.push(result);
        }
      }
      
      if (results.length === 0) {
        console.warn('No lottery result event found in transaction');
        return null;
      }
      
      if (results.length < expectedCount) {
        console.warn(`Found result count (${results.length}) less than expected count (${expectedCount})`);
      }
      
      console.log(`Successfully parsed ${results.length} lottery results:`, results);
      return results;
    } catch (error) {
      console.error('Failed to parse batch lottery results:', error);
      return null;
    }
  }

  /**
   * Check if user has claimable NFT
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} - Whether there is claimable NFT
   */
  async hasClaimableEggs(userAddress) {
    try {
      const hasClaimable = await this.contract.methods.hasClaimableEggs(userAddress).call();
      return hasClaimable;
    } catch (error) {
      console.error('Failed to check if there is claimable NFT:', error);
      throw error;
    }
  }

  /**
   * Get pending legendary and rare egg quantities for user
   * @param {string} userAddress - User address
   * @returns {Promise<Object>} - Contains pending legendary and rare egg quantities
   */
  async getPendingEggs(userAddress) {
    try {
      const pendingEggs = await this.contract.methods.getPendingEggs(userAddress).call();
      return {
        rareEggs: parseInt(pendingEggs.rareEggs) || 0,
        legendaryEggs: parseInt(pendingEggs.legendaryEggs) || 0
      };
    } catch (error) {
      console.error('Failed to get pending egg quantities:', error);
      throw error;
    }
  }

  /**
   * Claim unclaimed NFT after lottery
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} - Transaction receipt
   */
  async claimEggs(options = {}) {
    try {
      const tx = await this.contract.methods.claimEggs().send({
        from: options.from || (await this.web3.eth.getAccounts())[0],
        gas: options.gas || 1600000
      });
      return tx;
    } catch (error) {
      console.error('Failed to claim unclaimed NFT:', error);
      throw error;
    }
  }
}

// Export
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    NFTLotteryManagerContract,
    NFTLotteryManagerABI
  };
} else {
  window.NFTLotteryManagerContract = NFTLotteryManagerContract;
  window.NFTLotteryManagerABI = NFTLotteryManagerABI;
} 