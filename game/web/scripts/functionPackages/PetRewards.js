/**
 * Pet Rewards Function Module
 * Handles calculation and claiming of individual and batch pet rewards
 */

const PetRewards = (function() {
    // Debugging tools
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet Rewards]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet Rewards Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet Rewards Warning]', ...args);
        }
    };

    /**
     * Initialize feeding contract
     * @returns {Promise<Object>} Feeding contract instance
     */
    async function initFeedingContract() {
        if (window.feedingManagerContract) {
            return window.feedingManagerContract;
        }

        debug.log('Starting to initialize feeding contract...');
        
        // Check if Web3 is initialized, prioritize private key wallet's Web3 instance
        let web3Instance = null;
        
        // Priority 1: Use private key wallet's Web3 instance if available
        if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
            web3Instance = window.SecureWalletManager.getWeb3();
            if (web3Instance) {
                debug.log('Using private key wallet Web3 instance');
            }
        }
        
        // Priority 2: Use existing window.web3
        if (!web3Instance && window.web3) {
            web3Instance = window.web3;
            debug.log('Using existing window.web3 instance');
        }
        
        // Priority 3: Create new Web3 instance
        if (!web3Instance) {
            if (window.ethereum) {
                web3Instance = new Web3(window.ethereum);
                window.web3 = web3Instance; // Set as global for compatibility
                debug.log('Successfully created temporary Web3 instance');
            } else if (typeof window.sharedWeb3 !== 'undefined') {
                web3Instance = window.sharedWeb3;
                window.web3 = web3Instance; // Set as global for compatibility
                debug.log('Using sharedWeb3 instance');
            } else {
                throw new Error('Web3 not loaded, please refresh the page and try again');
            }
        }
        
        // Check if contract initialization functions are available
        if (!window.nftFeedingManagerContract && !window.initNFTFeedingManagerContract) {
            debug.log('NFTFeedingManager contract not available, trying to load');
            
            // Attempt to load from initNFTFeedingManager.js
            try {
                await loadContractScript('../../scripts/init_contracts/initNFTFeedingManager.js');
                debug.log('Successfully loaded initNFTFeedingManager.js');
            } catch (error) {
                debug.error('Failed to load initNFTFeedingManager.js, trying to load NFTFeedingManager.js directly');
                await loadContractScript('../../scripts/contracts/NFTFeedingManager.js');
            }
        }
        
        // Create wrapper class and contract instance if needed
        if (window.nftFeedingManagerContract || window.initNFTFeedingManagerContract) {
            debug.log('Creating NFTFeedingManagerContract wrapper class');
            const NFTFeedingManagerWrapper = createFeedingManagerWrapper();
            window.feedingManagerContract = new NFTFeedingManagerWrapper(web3Instance);
            debug.log('Feeding contract initialized successfully with Web3 instance');
            return window.feedingManagerContract;
        }
        
        throw new Error('Unable to initialize feeding contract - neither nftFeedingManagerContract nor initNFTFeedingManagerContract is available');
    }
    
    /**
     * Create NFTFeedingManagerContract wrapper class
     * @returns {Class} NFTFeedingManagerContract wrapper class
     */
    function createFeedingManagerWrapper() {
        return class NFTFeedingManagerWrapper {
            constructor(web3) {
                this.web3 = web3;
                
                // Use existing contract instance or initialize function to create instance
                if (window.nftFeedingManagerContract) {
                    this.contract = window.nftFeedingManagerContract;
                } else if (typeof window.initNFTFeedingManagerContract === 'function') {
                    this.contract = window.initNFTFeedingManagerContract(web3);
                } else {
                    throw new Error('Unable to create contract instance');
                }
                
                // Get contract address
                const getAddress = window.getContractAddress || function(name) {
                    const network = window.currentNetwork || 'TEST';
                    return window.contractAddresses && 
                        window.contractAddresses[network] ? 
                        window.contractAddresses[network][name] : null;
                };
                
                this.contractAddress = getAddress('NFTFeedingManager');
            }
            
            /**
             * Get PWFOOD contract instance
             * @param {Function} getContractAddress - get contract address function
             * @returns {Promise<Object>} PWFOOD contract instance
             */
            async getPWFOODContract(getContractAddress) {
                if (!this.web3) {
                    debug.error('get PWFOOD contract failed: Web3 not initialized');
                    return null;
                }
                
                try {
                    // get PWFOOD contract address
                    let pwfoodAddress;
                    
                    if (typeof getContractAddress === 'function') {
                        pwfoodAddress = getContractAddress('PwFood');
                    } else if (window.contractAddresses && window.contractAddresses[window.currentNetwork || 'TEST']) {
                        pwfoodAddress = window.contractAddresses[window.currentNetwork || 'TEST'].PwFood;
                    } else {
                        debug.error('cannot get PWFOOD contract address');
                        return null;
                    }
                    
                    if (!pwfoodAddress) {
                        debug.error('PWFOOD contract address is empty');
                        return null;
                    }
                    
                    // create ERC20 contract instance
                    const erc20ABI = window.GENERIC_ERC20_ABI || window.ERC20ABI || window.PWFoodABI || [
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
                    debug.error('get PWFOOD contract failed:', error);
                    return null;
                }
            }
            
            // Calculate claimable rewards for a single NFT
            async calculateClaimableRewards(tokenId) {
                try {
                    debug.log(`[Calculate Rewards] Starting calculation for NFT #${tokenId}`);
                    
                    // Add timeout mechanism
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Calculation timeout after 30 seconds')), 30000);
                    });
                    
                    const calculationPromise = this._doCalculateClaimableRewards(tokenId);
                    
                    return await Promise.race([calculationPromise, timeoutPromise]);
                } catch (error) {
                    debug.error(`[Calculate Rewards] Failed to calculate claimable rewards for NFT #${tokenId}:`, error);
                    return {
                        tokenId: tokenId,
                        error: error.message || 'Failed to calculate rewards',
                        pwpot: 0,
                        pwbot: 0,
                        cycles: 0
                    };
                }
            }
            
            async _doCalculateClaimableRewards(tokenId) {
                debug.log(`[Calculate Rewards] Processing NFT #${tokenId} using local calculation only`);
                
                // Skip all contract method calls and use local calculation directly
                debug.log(`[Calculate Rewards] Using local calculation for NFT #${tokenId}`);
                
                // Get NFT feeding data
                let feedingData;
                try {
                    debug.log(`[Calculate Rewards] Getting feeding data for NFT #${tokenId}`);
                    feedingData = await this.contract.methods.nftFeeding(tokenId).call();
                    debug.log(`[Calculate Rewards] Feeding data for NFT #${tokenId}:`, feedingData);
                    
                    if (!feedingData || !feedingData.isActive) {
                        debug.log(`[Calculate Rewards] NFT #${tokenId} is not active or has no feeding data`);
                        return {
                            tokenId: tokenId,
                            pwpot: 0,
                            pwbot: 0,
                            cycles: 0
                        };
                    }
                } catch (error) {
                    debug.error(`[Calculate Rewards] Failed to get feeding data for NFT #${tokenId}:`, error);
                    return {
                        tokenId: tokenId,
                        error: 'Failed to get feeding data',
                        pwpot: 0,
                        pwbot: 0,
                        cycles: 0
                    };
                }
                
                // Get current time and last claim time
                const currentTime = Math.floor(Date.now() / 1000);
                const lastClaimTime = parseInt(feedingData.lastClaimTime || 0);
                const feedingHours = parseInt(feedingData.feedingHours || 0);
                const quality = parseInt(feedingData.quality || 0);
                const accumulatedCycles = parseInt(feedingData.accumulatedCycles || 0);
                const lastFeedTime = parseInt(feedingData.lastFeedTime || 0);
                
                debug.log(`[Calculate Rewards] NFT #${tokenId} data:`, {
                    lastClaimTime,
                    feedingHours,
                    quality,
                    accumulatedCycles,
                    lastFeedTime,
                    currentTime
                });
                
                // Initialize total cycles as the accumulated cycles
                let totalValidCycles = accumulatedCycles;
                
                // If the last claim time is not reached, just return the accumulated cycles' rewards
                if (currentTime <= lastClaimTime && accumulatedCycles === 0) {
                    debug.log(`[Calculate Rewards] NFT #${tokenId} has no claimable rewards yet`);
                    return {
                        tokenId: tokenId,
                        pwpot: 0,
                        pwbot: 0,
                        cycles: 0
                    };
                }
                
                // Use default seconds per cycle (1 hour = 3600 seconds) - skip contract call
                const secondsPerCycle = 3600; // Fixed default value
                debug.log(`[Calculate Rewards] Using default seconds per cycle: ${secondsPerCycle}`);
                
                // If current time is greater than last claim time, calculate new cycles
                if (currentTime > lastClaimTime) {
                    // Calculate how much time has passed since the last claim (seconds)
                    const timeSinceLastClaim = currentTime - lastClaimTime;
                    debug.log(`[Calculate Rewards] NFT #${tokenId} time since last claim: ${timeSinceLastClaim} seconds`);
                    
                    // If the time since last claim is less than or equal to the feeding time in seconds, calculate the claimable cycles
                    if (feedingHours * 3600 >= timeSinceLastClaim) {
                        // No longer limit the maximum reward cycles, calculate based entirely on time
                        const newCycles = Math.floor(timeSinceLastClaim / secondsPerCycle);
                        totalValidCycles += newCycles;
                        debug.log(`[Calculate Rewards] NFT #${tokenId} added ${newCycles} new cycles`);
                    } else {
                        // Calculate valid cycles before starvation (removing maximum cycle limit)
                        const hoursBeforeStarvation = feedingHours;
                        const cyclesBeforeStarvation = hoursBeforeStarvation; // Because 1 hour = 1 cycle
                        
                        totalValidCycles += cyclesBeforeStarvation;
                        debug.log(`[Calculate Rewards] NFT #${tokenId} added ${cyclesBeforeStarvation} cycles before starvation`);
                        
                        // Check if feeding occurred after the starvation period
                        if (lastFeedTime > lastClaimTime + (feedingHours * 3600)) {
                            const timeFromLastFeed = currentTime > lastFeedTime ? 
                                                    currentTime - lastFeedTime : 0;
                            
                            if (timeFromLastFeed > 0) {
                                const cyclesFromLastFeed = Math.floor(timeFromLastFeed / secondsPerCycle);
                                
                                // New cycles are only limited by the current remaining feeding time
                                const currentPeriodCycles = Math.min(cyclesFromLastFeed, feedingHours);
                                
                                totalValidCycles += currentPeriodCycles;
                                debug.log(`[Calculate Rewards] NFT #${tokenId} added ${currentPeriodCycles} cycles from last feed`);
                            }
                        }
                    }
                }
                
                // Use default reward configuration - skip contract call
                const rewardConfigs = {
                    0: { pwpotReward: 1, pwbotReward: 0 }, // COMMON
                    1: { pwpotReward: 2, pwbotReward: 0 }, // GOOD
                    2: { pwpotReward: 3, pwbotReward: 1 }, // EXCELLENT
                    3: { pwpotReward: 5, pwbotReward: 2 }, // RARE
                    4: { pwpotReward: 10, pwbotReward: 5 } // LEGENDARY
                };
                
                const rewardConfig = rewardConfigs[quality] || rewardConfigs[0];
                const pwpotReward = rewardConfig.pwpotReward;
                const pwbotReward = rewardConfig.pwbotReward;
                debug.log(`[Calculate Rewards] Using default reward config for quality ${quality}: pwpot=${pwpotReward}, pwbot=${pwbotReward}`);
                
                // Calculate rewards, no longer limited by maximum cycles
                const totalPwpot = pwpotReward * totalValidCycles;
                const totalPwbot = pwbotReward * totalValidCycles;
                
                debug.log(`[Calculate Rewards] Final result for NFT #${tokenId}: Total Cycles=${totalValidCycles}, Rewards: ${totalPwpot} PWPOT, ${totalPwbot} PWBOT`);
                
                return {
                    tokenId: tokenId,
                    pwpot: totalPwpot,
                    pwbot: totalPwbot,
                    cycles: totalValidCycles,
                    accumulatedCycles: accumulatedCycles,
                    noMaxCycleLimit: true
                };
            }
            
            // Batch calculate rewards method
            async batchCalculateClaimableRewards(tokenIds) {
                try {
                    debug.log(`[Batch Calculate] Starting local batch calculation for ${tokenIds.length} NFTs`);
                    
                    // Skip all contract methods and use local calculation only
                    debug.log('[Batch Calculate] Using local calculation only for all NFTs');
                    const rewards = [];
                    let totalPwpot = 0;
                    let totalPwbot = 0;
                    let processedCount = 0;
                    
                    for (const tokenId of tokenIds) {
                        try {
                            debug.log(`[Batch Calculate] Processing NFT #${tokenId} (${processedCount + 1}/${tokenIds.length})`);
                            const reward = await this.calculateClaimableRewards(tokenId);
                            debug.log(`[Batch Calculate] NFT #${tokenId} reward result:`, reward);
                            
                            rewards.push(reward);
                            
                            if (!reward.error) {
                                totalPwpot += reward.pwpot || 0;
                                totalPwbot += reward.pwbot || 0;
                            }
                            
                            processedCount++;
                        } catch (err) {
                            debug.error(`[Batch Calculate] Error processing NFT #${tokenId}:`, err);
                            rewards.push({
                                tokenId,
                                error: err.message,
                                pwpot: 0,
                                pwbot: 0,
                                cycles: 0
                            });
                            processedCount++;
                        }
                        
                        // Add a small delay to prevent overwhelming the RPC
                        if (processedCount % 5 === 0) {
                            debug.log(`[Batch Calculate] Processed ${processedCount}/${tokenIds.length} NFTs, taking a short break...`);
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                    
                    debug.log(`[Batch Calculate] Completed processing all ${processedCount} NFTs. Total rewards: ${totalPwpot} PWPOT, ${totalPwbot} PWBOT`);
                    
                    return {
                        success: true,
                        nftRewards: rewards,
                        totalRewards: {
                            pwpot: totalPwpot,
                            pwbot: totalPwbot,
                            totalNfts: tokenIds.length,
                            nftsWithRewards: rewards.filter(nft => (nft.pwpot > 0 || nft.pwbot > 0)).length
                        }
                    };
                } catch (error) {
                    debug.error('[Batch Calculate] Batch calculating rewards failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Batch calculating rewards failed',
                        totalRewards: { pwpot: 0, pwbot: 0 },
                        nftRewards: []
                    };
                }
            }
            
            // Claim reward method for a single NFT
            async claimReward(tokenId, userAddress) {
                try {
                    debug.log(`Claiming reward for NFT #${tokenId}`);
                    
                    let result;
                    
                    // Check if using private key wallet
                const shouldUsePrivateKey = shouldUsePrivateKeyWallet();
                    
                    if (shouldUsePrivateKey) {
                        debug.log('Using private key wallet for claim reward transaction');
                        
                        // Use SecureWalletManager for private key transactions
                        result = await window.SecureWalletManager.sendContractTransaction(
                            this.contract,
                            'claimReward',
                            [tokenId],
                            { gas: 200000 } // Set appropriate gas limit
                        );
                    } else {
                        debug.log('Using connected wallet for claim reward transaction');
                        
                        // Use traditional connected wallet method
                        result = await this.contract.methods.claimReward(tokenId).send({ 
                        from: userAddress,
                        gas: 200000 // Estimated gas usage
                    });
                    }
                    
                    return {
                        success: true,
                        transaction: result,
                        tokenId: tokenId
                    };
                } catch (error) {
                    debug.error(`Failed to claim reward for NFT #${tokenId}:`, error);
                    return {
                        success: false,
                        error: error.message || 'Claiming reward failed',
                        tokenId: tokenId
                    };
                }
            }
            
            // Batch claim rewards method
            async claimRewards(tokenIds, userAddress) {
                try {
                    debug.log(`Batch claiming rewards for ${tokenIds.length} NFTs`);
                    
                    let methodName = 'claimRewards';
                    // Check if the contract method exists, some contracts may use batchClaimRewards
                    if (!this.contract.methods.claimRewards && this.contract.methods.batchClaimRewards) {
                        methodName = 'batchClaimRewards';
                    }
                    
                    let result;
                    
                    // Check if using private key wallet
                const shouldUsePrivateKey = shouldUsePrivateKeyWallet();
                    
                    if (shouldUsePrivateKey) {
                        debug.log('Using private key wallet for batch claim rewards transaction');
                        
                        // Use SecureWalletManager for private key transactions
                        result = await window.SecureWalletManager.sendContractTransaction(
                            this.contract,
                            methodName,
                            [tokenIds],
                            { gas: Math.min(500000 + (tokenIds.length * 50000), 8000000) } // Set appropriate gas limit
                        );
                    } else {
                        debug.log('Using connected wallet for batch claim rewards transaction');
                        
                        // Use traditional connected wallet method
                        result = await this.contract.methods[methodName](tokenIds).send({ 
                        from: userAddress,
                        gas: Math.min(500000 + (tokenIds.length * 50000), 8000000) // Estimated gas usage, increases with quantity but has a cap
                    });
                    }
                    
                    debug.log('Batch claiming rewards successful, result:', result);
                    
                    // Attempt to get the actual claimed reward amounts from the transaction events
                    let pwpotRewards = 0;
                    let pwbotRewards = 0;
                    
                    // Try to extract rewards from transaction events
                    if (result.events) {
                        debug.log('Transaction events:', result.events);
                        
                        // Check for different possible event names
                        const possibleEventNames = ['RewardsClaimed', 'RewardClaimed', 'BatchRewardsClaimed'];
                        let rewardEvent = null;
                        
                        for (const eventName of possibleEventNames) {
                            if (result.events[eventName]) {
                                rewardEvent = Array.isArray(result.events[eventName]) 
                                    ? result.events[eventName][0] 
                                    : result.events[eventName];
                                debug.log(`Found reward event: ${eventName}`, rewardEvent);
                                break;
                            }
                        }
                        
                        if (rewardEvent && rewardEvent.returnValues) {
                            // Try different possible field names for rewards
                            const returnValues = rewardEvent.returnValues;
                            debug.log('Event return values:', returnValues);
                            
                            // Try various field name combinations
                            pwpotRewards = parseInt(
                                returnValues.totalPwpotRewards || 
                                returnValues.pwpotAmount || 
                                returnValues.pwpotRewards ||
                                returnValues.totalPwpot ||
                                returnValues.pwpot ||
                                returnValues._totalPwpotRewards ||
                                returnValues._pwpotAmount ||
                                0
                            );
                            
                            pwbotRewards = parseInt(
                                returnValues.totalPwbotRewards || 
                                returnValues.pwbotAmount || 
                                returnValues.pwbotRewards ||
                                returnValues.totalPwbot ||
                                returnValues.pwbot ||
                                returnValues._totalPwbotRewards ||
                                returnValues._pwbotAmount ||
                                0
                            );
                            
                            debug.log(`Extracted rewards from event - PWPOT: ${pwpotRewards}, PWBOT: ${pwbotRewards}`);
                        } else {
                            debug.warn('No reward event found or event has no returnValues');
                        }
                        
                        // If we still don't have rewards, try to extract from all events
                        if (pwpotRewards === 0 && pwbotRewards === 0) {
                            debug.log('Trying to extract rewards from all events...');
                            
                            // Look through all events for reward-related data
                            for (const [eventName, eventData] of Object.entries(result.events)) {
                                if (Array.isArray(eventData)) {
                                    for (const event of eventData) {
                                        if (event.returnValues) {
                                            const values = event.returnValues;
                                            // Look for any field that might contain reward amounts
                                            for (const [key, value] of Object.entries(values)) {
                                                if (key.toLowerCase().includes('pwpot') || key.toLowerCase().includes('pwp')) {
                                                    const amount = parseInt(value) || 0;
                                                    if (amount > 0) {
                                                        pwpotRewards += amount;
                                                        debug.log(`Found PWPOT reward in ${eventName}.${key}: ${amount}`);
                                                    }
                                                }
                                                if (key.toLowerCase().includes('pwbot') || key.toLowerCase().includes('pwb')) {
                                                    const amount = parseInt(value) || 0;
                                                    if (amount > 0) {
                                                        pwbotRewards += amount;
                                                        debug.log(`Found PWBOT reward in ${eventName}.${key}: ${amount}`);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else if (eventData.returnValues) {
                                    const values = eventData.returnValues;
                                    // Look for any field that might contain reward amounts
                                    for (const [key, value] of Object.entries(values)) {
                                        if (key.toLowerCase().includes('pwpot') || key.toLowerCase().includes('pwp')) {
                                            const amount = parseInt(value) || 0;
                                            if (amount > 0) {
                                                pwpotRewards += amount;
                                                debug.log(`Found PWPOT reward in ${eventName}.${key}: ${amount}`);
                                            }
                                        }
                                        if (key.toLowerCase().includes('pwbot') || key.toLowerCase().includes('pwb')) {
                                            const amount = parseInt(value) || 0;
                                            if (amount > 0) {
                                                pwbotRewards += amount;
                                                debug.log(`Found PWBOT reward in ${eventName}.${key}: ${amount}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        debug.warn('No events found in transaction result');
                    }
                    
                    debug.log(`Final extracted rewards - PWPOT: ${pwpotRewards}, PWBOT: ${pwbotRewards}`);
                    
                    return {
                        success: true,
                        transaction: result,
                        receipt: result,
                        tokenIds: tokenIds,
                        tokenCount: tokenIds.length,
                        pwpotRewards: pwpotRewards,
                        pwbotRewards: pwbotRewards
                    };
                } catch (error) {
                    debug.error('Batch claiming rewards failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Batch claiming rewards failed'
                    };
                }
            }
            
            /**
             * Get NFT feeding information
             * @param {number} tokenId - NFT's token ID
             * @returns {Promise<Object>} - NFT feeding information
             */
            async getNFTFeedingInfo(tokenId) {
                if (!this.contract) {
                    debug.error('get feeding info failed: contract instance is empty');
                    return null;
                }
                
                try {
                    // ensure tokenId is an integer
                    tokenId = parseInt(tokenId);
                    if (isNaN(tokenId)) {
                        debug.error('get feeding info failed: invalid tokenId');
                        return null;
                    }
                    
                    debug.log(`start getting feeding info for NFT #${tokenId}...`);
                    
                    // check if contract method exists
                    if (!this.contract.methods || typeof this.contract.methods.nftFeeding !== 'function') {
                        debug.error('contract method nftFeeding does not exist');
                        debug.log('available contract methods:', Object.keys(this.contract.methods || {}).join(', '));
                        return null;
                    }
                    
                    debug.log(`contract address: ${this.contract.options.address}`);
                    debug.log(`call nftFeeding(${tokenId})`);
                    
                    const feedingInfo = await this.contract.methods.nftFeeding(tokenId).call();
                    debug.log('original contract feeding info:', JSON.stringify(feedingInfo, null, 2));
                    
                    // convert data type
                    const result = {
                        feedingHours: parseInt(feedingInfo.feedingHours) || 0,
                        lastClaimTime: parseInt(feedingInfo.lastClaimTime) || 0,
                        lastFeedTime: parseInt(feedingInfo.lastFeedTime) || 0,
                        quality: parseInt(feedingInfo.quality) || 0,
                        isActive: Boolean(feedingInfo.isActive),
                        level: parseInt(feedingInfo.level) || 1,
                        accumulatedFood: parseInt(feedingInfo.accumulatedFood) || 0,
                        accumulatedCycles: parseInt(feedingInfo.accumulatedCycles) || 0
                    };
                    
                    // calculate the difference between current time and lastFeedTime
                    const now = Math.floor(Date.now() / 1000);
                    const elapsedSeconds = now - result.lastFeedTime;
                    const elapsedHours = Math.floor(elapsedSeconds / 3600);
                    
                    debug.log(`NFT #${tokenId} feeding info processing result:`, {
                        feedingHours: `${result.feedingHours} hours`,
                        lastClaimTime: new Date(result.lastClaimTime * 1000).toLocaleString(),
                        lastFeedTime: new Date(result.lastFeedTime * 1000).toLocaleString(),
                        quality: result.quality,
                        isActive: result.isActive,
                        level: result.level,
                        accumulatedFood: result.accumulatedFood,
                        accumulatedCycles: result.accumulatedCycles,
                        currentTime: new Date(now * 1000).toLocaleString(),
                        timeSinceLastFeed: `${elapsedHours}小时${Math.floor((elapsedSeconds % 3600) / 60)}分钟`
                    });
                    
                    return result;
                } catch (error) {
                    debug.error(`get NFT #${tokenId} feeding info failed:`, error);
                    // print stack trace
                    debug.error('error stack:', error.stack);
                    return null;
                }
            }
        };
    }
    
    /**
     * Load contract script
     * @param {string} scriptPath - Script path
     * @returns {Promise} - Completed Promise
     */
    function loadContractScript(scriptPath) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            // Create and load script
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => resolve();
            script.onerror = (err) => reject(new Error(`Unable to load script ${scriptPath}: ${err}`));
            document.head.appendChild(script);
        });
    }
    
    /**
     * Get claimable rewards for a single NFT
     * @param {number} tokenId - NFT ID
     * @returns {Promise<Object>} - Reward information
     */
    async function getRewardsForNFT(tokenId) {
        try {
            debug.log(`Getting reward information for NFT #${tokenId}`);
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Calculate claimable rewards
            const rewardsInfo = await feedingManager.calculateClaimableRewards(tokenId);
            
            return {
                success: !rewardsInfo.error,
                ...rewardsInfo
            };
        } catch (error) {
            debug.error(`Error getting reward information for NFT #${tokenId}:`, error);
            return { 
                success: false, 
                error: error.message || 'Error occurred while getting reward information',
                tokenId: tokenId,
                pwpot: 0,
                pwbot: 0,
                cycles: 0
            };
        }
    }
    
    /**
     * Get claimable rewards for multiple NFTs
     * @param {Array<number>} tokenIds - Array of NFT IDs
     * @returns {Promise<Object>} - Batch reward information
     */
    async function getRewardsForMultipleNFTs(tokenIds) {
        try {
            debug.log(`Getting rewards for ${tokenIds.length} NFTs`);
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Batch calculate claimable rewards
            const rewardsInfo = await feedingManager.batchCalculateClaimableRewards(tokenIds);
            
            return rewardsInfo;
        } catch (error) {
            debug.error('Error getting rewards for multiple NFTs:', error);
            return { 
                success: false, 
                error: error.message || 'Error occurred while getting reward information',
                totalRewards: { pwpot: 0, pwbot: 0 },
                nftRewards: []
            };
        }
    }
    
    /**
     * Claim reward for a single NFT
     * @param {number} tokenId - NFT ID
     * @returns {Promise<Object>} - Claim result
     */
    async function claimRewardForNFT(tokenId) {
        try {
            debug.log(`Claiming reward for NFT #${tokenId}`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                userAddress = window.SecureWalletManager.getAddress();
                debug.log('Using private key wallet for reward claim:', userAddress);
            } else {
                // Priority 2: Check connected wallet
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
                debug.log('Using connected wallet for reward claim:', userAddress);
            }
            
            if (!userAddress) {
                return { success: false, error: 'Please connect wallet to claim rewards' };
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Verify if there are claimable rewards
            const rewardsInfo = await feedingManager.calculateClaimableRewards(tokenId);
            
            if (rewardsInfo.error) {
                return { success: false, error: 'Failed to calculate rewards: ' + rewardsInfo.error };
            }
            
            if (rewardsInfo.pwpot <= 0 && rewardsInfo.pwbot <= 0) {
                return { success: false, error: 'This NFT has no claimable rewards' };
            }
            
            // Call contract's claim reward method
            const result = await feedingManager.claimReward(tokenId, userAddress);
            
            return result;
        } catch (error) {
            debug.error(`Error claiming reward for NFT #${tokenId}:`, error);
            return { success: false, error: error.message || 'Error occurred while claiming reward' };
        }
    }
    
    /**
     * Batch claim rewards for multiple NFTs
     * @param {Array<number>} tokenIds - Array of NFT IDs
     * @returns {Promise<Object>} - Batch claim result
     */
    async function claimRewardsForMultipleNFTs(tokenIds) {
        try {
            debug.log(`Batch claiming rewards for ${tokenIds.length} NFTs`);
            debug.log('TokenIds for batch claim:', tokenIds);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (shouldUsePrivateKeyWallet()) {
                userAddress = window.SecureWalletManager.getAddress();
                debug.log('Using private key wallet for batch reward claim:', userAddress);
            } 
            // Priority 2: Check WalletNetworkManager (for both game and normal mode)
            else if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
                userAddress = window.walletNetworkManager.getCurrentAddress();
                debug.log('Using WalletNetworkManager address for batch reward claim:', userAddress);
            }
            // Priority 2.5: Check if WalletNetworkManager exists but not initialized, try to get status
            else if (window.walletNetworkManager) {
                try {
                    const status = window.walletNetworkManager.getStatus();
                    if (status.isConnected) {
                        userAddress = window.walletNetworkManager.getCurrentAddress();
                        debug.log('Using WalletNetworkManager (uninitialized) address for batch reward claim:', userAddress);
                    }
                } catch (error) {
                    debug.warn('Error getting WalletNetworkManager status:', error);
                }
            }
            // Priority 3: Check global currentAddress variable
            else if (typeof currentAddress !== 'undefined' && currentAddress) {
                userAddress = currentAddress;
                debug.log('Using global currentAddress for batch reward claim:', userAddress);
            }
            // Priority 4: Check window.currentAddress
            else if (window.currentAddress) {
                userAddress = window.currentAddress;
                debug.log('Using window.currentAddress for batch reward claim:', userAddress);
            }
            // Priority 5: Try to get from web3 accounts
            else if (window.web3) {
                try {
            const accounts = await window.web3.eth.getAccounts();
                    if (accounts && accounts.length > 0) {
                userAddress = accounts[0];
                        debug.log('Using web3 accounts for batch reward claim:', userAddress);
                    }
                } catch (error) {
                    debug.error('Failed to get accounts from web3:', error);
                }
            }
            
            if (!userAddress) {
                return { success: false, error: 'Please connect wallet to claim rewards' };
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Batch calculate claimable rewards
            const rewardsInfo = await feedingManager.batchCalculateClaimableRewards(tokenIds);
            
            if (!rewardsInfo.success) {
                return { success: false, error: 'Failed to calculate rewards: ' + (rewardsInfo.error || 'Unknown error') };
            }
            
            // Filter out NFTs with rewards (relaxed conditions)
            const nftsWithRewards = rewardsInfo.nftRewards.filter(nft => {
                // Check if NFT has any error
                if (nft.error) {
                    debug.log(`NFT ${nft.tokenId} has error:`, nft.error);
                    return false;
                }
                
                // Check if NFT has any rewards (either pwpot or pwbot > 0)
                const hasRewards = (nft.pwpot > 0 || nft.pwbot > 0);
                
                if (!hasRewards) {
                    debug.log(`NFT ${nft.tokenId} has no rewards: pwpot=${nft.pwpot}, pwbot=${nft.pwbot}`);
                }
                
                return hasRewards;
            });
            
            if (nftsWithRewards.length === 0) {
                debug.warn(`No NFTs with rewards found in batch claim. Checked ${tokenIds.length} NFTs.`);
                debug.log('Detailed NFT rewards info:', rewardsInfo.nftRewards);
                
                // Create detailed error message
                let errorDetails = `Checked ${tokenIds.length} NFTs, but none have claimable rewards.`;
                if (rewardsInfo.nftRewards && rewardsInfo.nftRewards.length > 0) {
                    const errorCount = rewardsInfo.nftRewards.filter(nft => nft.error).length;
                    const zeroRewardCount = rewardsInfo.nftRewards.filter(nft => !nft.error && nft.pwpot === 0 && nft.pwbot === 0).length;
                    
                    if (errorCount > 0) {
                        errorDetails += ` ${errorCount} NFTs had errors.`;
                    }
                    if (zeroRewardCount > 0) {
                        errorDetails += ` ${zeroRewardCount} NFTs have zero rewards.`;
                    }
                }
                
                return { 
                    success: false, 
                    error: 'No rewards to claim',
                    detailedError: errorDetails,
                    checkedNFTs: tokenIds.length,
                    rewardsInfo,
                    filteredInfo: {
                        totalChecked: tokenIds.length,
                        withRewards: 0,
                        withoutRewards: tokenIds.length
                    }
                };
            }
            
            // Record how many NFTs were filtered out
            const filteredOutCount = tokenIds.length - nftsWithRewards.length;
            if (filteredOutCount > 0) {
                debug.log(`Filtered out ${filteredOutCount} NFTs with no claimable rewards`);
            }
            
            const tokenIdsWithRewards = nftsWithRewards.map(nft => nft.tokenId);
            
            // Call contract's batch claim rewards method
            const result = await feedingManager.claimRewards(tokenIdsWithRewards, userAddress);
            
            if (result.success) {
                // Use the actual rewards from the transaction event if available,
                // otherwise fall back to the estimated values
                const pwpotRewards = result.pwpotRewards || 0;
                const pwbotRewards = result.pwbotRewards || 0;
                
                debug.log(`Claim success - Actual rewards from event: ${pwpotRewards} PWPOT, ${pwbotRewards} PWBOT, estimated: ${rewardsInfo.totalRewards.pwpot} PWPOT, ${rewardsInfo.totalRewards.pwbot} PWBOT`);
                
                return {
                    ...result,
                    checkedTokenIds: tokenIds.length,
                    claimedTokenIds: tokenIdsWithRewards.length,
                    filteredOutCount: filteredOutCount,
                    // Store estimated values separately with clear naming
                    estimatedPwpot: rewardsInfo.totalRewards.pwpot,
                    estimatedPwbot: rewardsInfo.totalRewards.pwbot,
                    // For backward compatibility, still provide totalPwp and totalPwb
                    // but use the actual values from the event when available
                    totalPwpot: pwpotRewards || rewardsInfo.totalRewards.pwpot,
                    totalPwbot: pwbotRewards || rewardsInfo.totalRewards.pwbot,
                    // Add additional fields for clarity
                    processedCount: tokenIdsWithRewards.length
                };
            }
            
            return result;
        } catch (error) {
            debug.error('Error during batch claiming rewards:', error);
            return { success: false, error: error.message || 'Error occurred while claiming batch rewards' };
        }
    }
    
    /**
     * Batch claim all NFT rewards
     * @param {Array<Object>} nfts - Array of NFT objects, each should contain tokenId property
     * @param {boolean} checkRewardsFirst - Whether to check rewards before claiming
     * @returns {Promise<Object>} - Batch claim result
     */
    async function claimAllRewards(nfts, checkRewardsFirst = true) {
        try {
            if (!Array.isArray(nfts) || nfts.length === 0) {
                return { success: false, error: 'No valid NFT list provided' };
            }
            
            // Extract all NFT tokenIds with comprehensive fallback logic
            const tokenIds = nfts.map(nft => {
                // Try multiple possible field names for tokenId
                const id = nft.tokenId || nft.token_id || nft.id || nft.ID || nft;
                
                // Ensure it's a valid number
                const parsedId = parseInt(id);
                if (isNaN(parsedId)) {
                    debug.warn('Invalid tokenId found:', nft);
                    return null;
                }
                
                return parsedId;
            }).filter(id => id !== null); // Remove invalid entries
            
            debug.log(`Preparing to claim rewards for ${tokenIds.length} NFTs`);
            debug.log('TokenIds to claim:', tokenIds);
            
            if (checkRewardsFirst) {
                // First check which NFTs have claimable rewards
                const rewardsInfo = await getRewardsForMultipleNFTs(tokenIds);
                
                if (!rewardsInfo.success) {
                    debug.error('Failed to check rewards:', rewardsInfo);
                    return { success: false, error: 'Failed to check rewards: ' + (rewardsInfo.error || 'Unknown error') };
                }
                
                debug.log('Rewards info received:', rewardsInfo);
                
                const nftsWithRewards = rewardsInfo.nftRewards.filter(nft => {
                    // Check if NFT has any error
                    if (nft.error) {
                        debug.log(`NFT ${nft.tokenId} has error:`, nft.error);
                        return false;
                    }
                    
                    // Check if NFT has any rewards (either pwpot or pwbot > 0)
                    const hasRewards = (nft.pwpot > 0 || nft.pwbot > 0);
                    
                    if (!hasRewards) {
                        debug.log(`NFT ${nft.tokenId} has no rewards: pwpot=${nft.pwpot}, pwbot=${nft.pwbot}`);
                    }
                    
                    return hasRewards;
                });
                
                if (nftsWithRewards.length === 0) {
                    debug.warn(`No NFTs with rewards found. Checked ${tokenIds.length} NFTs.`);
                    debug.log('Detailed NFT rewards info:', rewardsInfo.nftRewards);
                    
                    // Create detailed error message
                    let errorDetails = `Checked ${tokenIds.length} NFTs, but none have claimable rewards.`;
                    if (rewardsInfo.nftRewards && rewardsInfo.nftRewards.length > 0) {
                        const errorCount = rewardsInfo.nftRewards.filter(nft => nft.error).length;
                        const zeroRewardCount = rewardsInfo.nftRewards.filter(nft => !nft.error && nft.pwpot === 0 && nft.pwbot === 0).length;
                        
                        if (errorCount > 0) {
                            errorDetails += ` ${errorCount} NFTs had errors.`;
                        }
                        if (zeroRewardCount > 0) {
                            errorDetails += ` ${zeroRewardCount} NFTs have zero rewards.`;
                        }
                    }
                    
                    return { 
                        success: false, 
                        error: 'No rewards to claim',
                        detailedError: errorDetails,
                        checkedNFTs: tokenIds.length,
                        rewardsInfo,
                        filteredInfo: {
                            totalChecked: tokenIds.length,
                            withRewards: 0,
                            withoutRewards: tokenIds.length
                        }
                    };
                }
                
                // Show the number of claimable rewards and total
                const totalPwpot = rewardsInfo.totalRewards.pwpot;
                const totalPwbot = rewardsInfo.totalRewards.pwbot;
                const filteredOutCount = tokenIds.length - nftsWithRewards.length;
                
                debug.log(`Found ${nftsWithRewards.length} NFTs with claimable rewards, filtered out ${filteredOutCount} NFTs with no rewards, totaling ${totalPwpot} PWPOT and ${totalPwbot} PWBOT`);
                
                // Filter out the tokenIds of NFTs with rewards
                const tokenIdsWithRewards = nftsWithRewards.map(nft => nft.tokenId);
                
                // Claim rewards for these NFTs
                const claimResult = await claimRewardsForMultipleNFTs(tokenIdsWithRewards);
                
                // Ensure the actual rewards from transaction events are properly returned
                if (claimResult.success) {
                    return {
                        ...claimResult,
                        // Add estimated values for comparison
                        estimatedPwpotRewards: totalPwpot,
                        estimatedPwbotRewards: totalPwbot,
                        // Ensure actual rewards from transaction events are available
                        totalPwpotRewards: claimResult.pwpotRewards || 0,
                        totalPwbotRewards: claimResult.pwbotRewards || 0,
                        // Additional info
                        checkedNFTs: tokenIds.length,
                        filteredOutCount: filteredOutCount
                    };
                }
                
                return claimResult;
            } else {
                // Directly attempt to claim rewards for all NFTs
                const claimResult = await claimRewardsForMultipleNFTs(tokenIds);
                
                // Ensure the actual rewards from transaction events are properly returned
                if (claimResult.success) {
                    return {
                        ...claimResult,
                        // Ensure actual rewards from transaction events are available
                        totalPwpotRewards: claimResult.pwpotRewards || 0,
                        totalPwbotRewards: claimResult.pwbotRewards || 0,
                        // Additional info
                        checkedNFTs: tokenIds.length
                    };
                }
                
                return claimResult;
            }
        } catch (error) {
            debug.error('Error claiming all rewards:', error);
            return { success: false, error: error.message || 'Error occurred while claiming all rewards' };
        }
    }
    
    /**
     * Batch claim all pet rewards
     */
    async function handleClaimAllRewards() {
        try {
            console.log('Starting to claim all pet rewards');
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (shouldUsePrivateKeyWallet()) {
                userAddress = window.SecureWalletManager.getAddress();
                console.log('Using private key wallet for reward claim:', userAddress);
            } 
            // Priority 2: Check WalletNetworkManager (for both game and normal mode)
            else if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
                userAddress = window.walletNetworkManager.getCurrentAddress();
                console.log('Using WalletNetworkManager address for reward claim:', userAddress);
            }
            // Priority 2.5: Check if WalletNetworkManager exists but not initialized, try to get status
            else if (window.walletNetworkManager) {
                try {
                    const status = window.walletNetworkManager.getStatus();
                    if (status.isConnected) {
                        userAddress = window.walletNetworkManager.getCurrentAddress();
                        console.log('Using WalletNetworkManager (uninitialized) address for reward claim:', userAddress);
                    }
                } catch (error) {
                    console.warn('Error getting WalletNetworkManager status:', error);
                }
            }
            // Priority 3: Check global currentAddress variable
            else if (typeof currentAddress !== 'undefined' && currentAddress) {
                userAddress = currentAddress;
                console.log('Using global currentAddress for reward claim:', userAddress);
            }
            // Priority 4: Check window.currentAddress
            else if (window.currentAddress) {
                userAddress = window.currentAddress;
                console.log('Using window.currentAddress for reward claim:', userAddress);
            }
            // Priority 5: Try to get from web3 accounts
            else if (window.web3) {
                try {
                    const accounts = await window.web3.eth.getAccounts();
                    if (accounts && accounts.length > 0) {
                        userAddress = accounts[0];
                        console.log('Using web3 accounts for reward claim:', userAddress);
                    }
                } catch (error) {
                    console.error('Failed to get accounts from web3:', error);
                }
            }
            
            if (!userAddress) {
                // Check if ModalDialog is available
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('Please connect your wallet first');
                } else {
                    alert('Please connect your wallet first');
                }
                return;
            }
            
            // Get user NFTs from multiple sources
            let currentUserNFTs = null;
            
            // Priority 1: Try to get from global userNFTs variable
            if (typeof userNFTs !== 'undefined' && userNFTs && userNFTs.length > 0) {
                currentUserNFTs = userNFTs;
                console.log('Using global userNFTs variable:', currentUserNFTs.length, 'NFTs');
            }
            // Priority 2: Try to get from window.userNFTs
            else if (window.userNFTs && window.userNFTs.length > 0) {
                currentUserNFTs = window.userNFTs;
                console.log('Using window.userNFTs:', currentUserNFTs.length, 'NFTs');
            }
            // Priority 3: Try to get from PetNFTService cache
            else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
                currentUserNFTs = window.PetNFTService.getCachedNFTs();
                console.log('Using PetNFTService cached NFTs:', currentUserNFTs ? currentUserNFTs.length : 0, 'NFTs');
            }
            
            // Check if there are any NFTs
            if (!currentUserNFTs || currentUserNFTs.length === 0) {
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('No NFTs found. Please make sure your pets are loaded first.');
                } else {
                    alert('No NFTs found. Please make sure your pets are loaded first.');
                }
                return;
            }
            
            // Load pet rewards module
            if (!window.PetRewards) {
                try {
                    await loadContractScript('../../scripts/functionPackages/PetRewards.js');
                    if (!window.PetRewards) {
                        if (window.ModalDialog) {
                            await window.ModalDialog.alert("Failed to load pet rewards module, please refresh the page and try again");
                        } else {
                            alert("Failed to load pet rewards module, please refresh the page and try again");
                        }
                        return;
                    }
                } catch (loadError) {
                    console.error('Failed to load pet rewards module:', loadError);
                    if (window.ModalDialog) {
                        await window.ModalDialog.alert("Failed to load pet rewards module, please refresh the page and try again");
                    } else {
                        alert("Failed to load pet rewards module, please refresh the page and try again");
                    }
                    return;
                }
            }
            
            // Load ModalDialog module (if not already loaded)
            if (!window.ModalDialog) {
                try {
                    await loadContractScript('../../scripts/other/modalDialog.js');
                } catch (error) {
                    console.error('Failed to load ModalDialog module:', error);
                    // Continue using native dialogs
                }
            }
            
            // Display processing message
            showToast('Preparing to claim rewards, please wait...', 5000);
            
            // Use the new rewards module to handle all NFT reward claims
            // Extract tokenIds with comprehensive fallback logic
            const nftIds = currentUserNFTs.map(nft => {
                // Try multiple possible field names for tokenId
                const id = nft.tokenId || nft.token_id || nft.id || nft.ID || nft;
                
                // Ensure it's a valid number
                const parsedId = parseInt(id);
                if (isNaN(parsedId)) {
                    console.warn('Invalid tokenId found:', nft);
                    return null;
                }
                
                return parsedId;
            }).filter(id => id !== null); // Remove invalid entries
            
            console.log(`Preparing to claim ${nftIds.length} NFT rewards (filtered from ${currentUserNFTs.length} total NFTs)`);
            
            // Check if we have valid NFT IDs
            if (nftIds.length === 0) {
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('No valid NFT IDs found. Please check your NFT data structure.');
                } else {
                    alert('No valid NFT IDs found. Please check your NFT data structure.');
                }
                return;
            }
            
            // Confirm user action
            let userConfirmed = false;
            
            if (window.ModalDialog) {
                // Use ModalDialog to confirm
                const confirmResult = await window.ModalDialog.confirm(
                    `Are you sure you want to claim <strong>${nftIds.length}</strong> NFT rewards?`,
                    {
                        title: 'Confirm claim rewards',
                        confirmText: 'Confirm',
                        cancelText: 'Cancel'
                    }
                );
                
                userConfirmed = confirmResult.action === 'confirm';
            } else {
                // Use native confirmation
                const confirmMessage = `Are you sure you want to claim rewards for ${nftIds.length} NFTs?`;
                userConfirmed = confirm(confirmMessage);
            }
            
            if (!userConfirmed) {
                console.log('User cancelled the claim operation');
                showToast('Claim operation cancelled', 3000);
                return;
            }
            
            try {
                // Call the PetRewards module's claimAllRewards method
                const result = await window.PetRewards.claimAllRewards(currentUserNFTs);
                
                if (result.success) {
                    // Extract the actual rewards from the contract event
                    // Use the actual rewards from transaction events (prioritize these over estimated values)
                    const actualPwp = result.totalPwpotRewards || result.pwpotRewards || 0;
                    const actualPwb = result.totalPwbotRewards || result.pwbotRewards || 0;
                    
                    console.log('Claimed rewards from contract event:', { 
                        actualPwp: actualPwp, 
                        actualPwb: actualPwb, 
                        estimatedPwp: result.estimatedPwpotRewards,
                        estimatedPwb: result.estimatedPwbotRewards,
                        result 
                    });
                    
                    // If there are NFTs that were filtered out, show more detailed information
                    if (result.filteredOutCount && result.filteredOutCount > 0) {
                        showToast(`Successfully claimed rewards! Received ${actualPwp} PWP and ${actualPwb} PWB (filtered out ${result.filteredOutCount} NFTs with no rewards)`, 5000);
                    } else {
                        showToast(`Successfully claimed rewards! Received ${actualPwp} PWP and ${actualPwb} PWB`, 5000);
                    }
                    
                    // Use ModalDialog to display detailed results
                    if (window.ModalDialog) {
                        await window.ModalDialog.alert(
                            `<div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                                <div style="color: #4caf50; font-size: 24px; margin-bottom: 20px;">
                                    <i style="font-size: 48px;">🎉</i><br>
                                    <strong>Rewards Claimed Successfully!</strong>
                                </div>
                                
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           border-radius: 15px; padding: 20px; margin: 20px 0; color: white;">
                                    <div style="font-size: 18px; margin-bottom: 15px;">
                                        <strong>🎁 Rewards Received</strong>
                                    </div>
                                    <div style="display: flex; justify-content: space-around; margin: 15px 0;">
                                        <div style="text-align: center;">
                                            <div style="font-size: 28px; font-weight: bold; color: #ffd700;">
                                                ${actualPwp.toLocaleString()}
                                            </div>
                                            <div style="font-size: 14px; opacity: 0.9;">PWP</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-size: 28px; font-weight: bold; color: #87ceeb;">
                                                ${actualPwb.toLocaleString()}
                                            </div>
                                            <div style="font-size: 14px; opacity: 0.9;">PWB</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin: 15px 0;">
                                    <div style="color: #28a745; font-size: 16px; margin-bottom: 10px;">
                                        <strong>📊 Processing Summary</strong>
                                    </div>
                                    ${result.processedCount ? `<div style="color: #666; margin: 5px 0;">✅ Successfully processed: <strong>${result.processedCount}</strong> NFTs</div>` : ''}
                                    ${result.tokenCount ? `<div style="color: #666; margin: 5px 0;">✅ Total processed: <strong>${result.tokenCount}</strong> NFTs</div>` : ''}
                                    ${result.filteredOutCount ? `<div style="color: #ff9800; margin: 5px 0;">⚠️ Skipped: <strong>${result.filteredOutCount}</strong> NFTs (no rewards available)</div>` : ''}
                                </div>
                                
                                <div style="color: #666; font-size: 12px; margin-top: 20px;">
                                    <em>Rewards have been added to your wallet balance</em>
                                </div>
                            </div>`,
                            {
                                title: 'Claim Success',
                                confirmText: 'Great!'
                            }
                        );
                    }
                    
                    // Update UI display
                    console.log('Claim success:', result);
                    
                    // Refresh NFT display
                    setTimeout(() => {
                        if (typeof loadUserNFTs === 'function') {
                            loadUserNFTs(true);
                        } else if (typeof window.loadUserNFTs === 'function') {
                            window.loadUserNFTs(true);
                        }
                    }, 1500);
                } else {
                    if (result.error && result.error.includes('No rewards available')) {
                        let noRewardsMessage = 'No rewards available';
                        
                        if (result.filteredInfo) {
                            noRewardsMessage = `No rewards available, checked ${result.filteredInfo.totalChecked} NFTs`;
                            console.log('No rewards available, detailed information:', result.filteredInfo);
                        }
                        
                        showToast(noRewardsMessage, 5000);
                        
                        // Use ModalDialog to display detailed results
                        if (window.ModalDialog) {
                            await window.ModalDialog.alert(
                                `<div style="color: #ff9800;">
                                    <strong>No rewards available</strong><br><br>
                                    All NFTs have been checked, but no rewards are available.<br>
                                    ${result.filteredInfo ? `Checked: ${result.filteredInfo.totalChecked} NFTs<br>` : ''}
                                    <br>
                                    <small>Tip: Rewards will be available after the feeding time has passed</small>
                                </div>`,
                                {
                                    title: 'No rewards available'
                                }
                            );
                        }
                    } else {
                        showToast(`Claim rewards failed: ${result.error}`, 5000);
                        
                        // Use ModalDialog to display errors
                        if (window.ModalDialog) {
                            await window.ModalDialog.alert(
                                `<div style="color: #e53935;">
                                    <strong>Claim rewards failed</strong><br><br>
                                    ${result.error || 'Unknown error'}
                                </div>`,
                                {
                                    title: 'Claim rewards failed'
                                }
                            );
                        }
                    }
                    console.error('Claim rewards failed:', result.error);
                }
            } catch (error) {
                console.error('Claim rewards failed:', error);
                showToast(`Claim rewards failed: ${error.message || 'Unknown error'}`, 5000);
                
                // Use ModalDialog to display errors
                if (window.ModalDialog) {
                    await window.ModalDialog.alert(
                        `<div style="color: #e53935;">
                            <strong>Claim rewards failed</strong><br><br>
                            ${error.message || 'Unknown error'}
                        </div>`,
                        {
                            title: 'Claim rewards failed'
                        }
                    );
                }
            }
        } catch (error) {
            console.error('Claim rewards failed:', error);
            if (window.ModalDialog) {
                await window.ModalDialog.alert(`Claim rewards failed: ${error.message || 'Unknown error'}`);
            } else {
                alert('Claim rewards failed: ' + (error.message || 'Unknown error'));
            }
        }
    }
    /**
     * Handle pet reward claim operation
     * @param {Object} claimData - Claim reward data
     */
    async function handlePetRewardClaim(claimData) {
        try {
            const { tokenId, contractAddress, transaction, element } = claimData;
            console.log(`Handling pet reward claim: TokenID=${tokenId}, Contract=${contractAddress}`);
            
            // If the transaction has been successfully processed (handled by PetCard component), only update some statuses
            if (transaction) {
                console.log('Rewards have been successfully claimed, transaction information:', transaction);
                
                // Try to get the latest feeding information to update the UI
                    try {
                    // Use PetFeeding module's getNFTFeedingInfo method instead of contract method
                    if (window.PetFeeding && typeof window.PetFeeding.getNFTFeedingInfo === 'function') {
                        const updatedFeedingInfo = await window.PetFeeding.getNFTFeedingInfo(tokenId);
                        if (updatedFeedingInfo) {
                            // Use the card component to update the satiety display
                            PetCard.updatePetSatietyWithFeedingInfo(
                                element || document.querySelector(`.pet-card[data-token-id="${tokenId}"]`), 
                                updatedFeedingInfo.realFeedingHours, 
                                updatedFeedingInfo
                            );
                        }
                    } else {
                        console.log('PetFeeding module not available, skipping feeding info update');
                        }
                    } catch (error) {
                        console.error('Failed to get updated feeding information:', error);
                }
                
                return;
            }
            
            // The following code is the fallback processing logic when the PetCard component does not handle the transaction
            // It is usually not executed here, as the PetCard component handles the reward claim transaction internally
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (shouldUsePrivateKeyWallet()) {
                userAddress = window.SecureWalletManager.getAddress();
                console.log('Using private key wallet for reward claim:', userAddress);
            } else {
                // Priority 2: Check connected wallet
                if (!window.web3) {
                    console.error('Web3 is not initialized, cannot claim rewards');
                    return;
                }
                
                const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
            }
            
            if (!userAddress) {
                console.error('Wallet is not connected, cannot claim rewards');
                return;
            }
            
            // Check if NFTFeedingManager contract is initialized
            if (!window.feedingManagerContract && window.NFTFeedingManagerContract) {
                window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
            }
            
            if (!window.feedingManagerContract) {
                console.error('NFTFeedingManager contract is not initialized, cannot claim rewards');
                return;
            }
            
            // Execute reward claim transaction
            try {
                let tx;
                
                // Use appropriate transaction method based on wallet type
                if (shouldUsePrivateKeyWallet()) {
                    // Use private key wallet for transaction
                    console.log('Using private key wallet for reward claim transaction');
                    
                    // Get the underlying contract instance for SecureWalletManager
                    let contractInstance = window.feedingManagerContract.contract;
                    if (!contractInstance && window.nftFeedingManagerContract) {
                        contractInstance = window.nftFeedingManagerContract;
                    }
                    
                    if (!contractInstance) {
                        throw new Error('NFTFeedingManager contract instance not available');
                    }
                    
                    tx = await window.SecureWalletManager.sendContractTransaction(
                        contractInstance,
                        'claimRewards',
                        [[tokenId]],
                        { gas: 300000 }
                    );
                } else {
                    // Use connected wallet for transaction
                    console.log('Using connected wallet for reward claim transaction');
                    tx = await window.feedingManagerContract.contract.methods.claimRewards([tokenId]).send({
                        from: userAddress,
                        gas: 300000
                    });
                }
                
                console.log('Reward claim transaction successful:', tx.transactionHash);
                
                // Update feeding information and UI using PetFeeding module
                try {
                    if (window.PetFeeding && typeof window.PetFeeding.getNFTFeedingInfo === 'function') {
                        const updatedFeedingInfo = await window.PetFeeding.getNFTFeedingInfo(tokenId);
                if (updatedFeedingInfo) {
                    const card = element || document.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                    if (card) {
                        PetCard.updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.realFeedingHours, updatedFeedingInfo);
                    }
                        }
                    }
                } catch (updateError) {
                    console.error('Failed to update feeding info after reward claim:', updateError);
                }
            } catch (error) {
                console.error('Failed to claim rewards:', error);
                const card = element || document.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                if (card) {
                    PetCard.showFeedingMessage(card, "Failed to claim rewards: " + (error.message || "Unknown error"), "error");
                }
            }
        } catch (error) {
            console.error('Error handling pet reward claim:', error);
        }
    }

    // Helper functions that need to be available in this scope
    function shouldUsePrivateKeyWallet() {
        if (!window.SecureWalletManager) {
            return false;
        }
        
        const keyCount = window.SecureWalletManager.getKeyCount();
        const isLocked = window.SecureWalletManager.isWalletLocked();
        const isReady = window.SecureWalletManager.isWalletReady();
        const activeAddress = window.SecureWalletManager.getAddress();
        
        return keyCount > 0 && !isLocked && isReady && !!activeAddress;
    }

    function showToast(message, duration = 3000) {
        // Check if toast already exists
        let toast = document.querySelector('.refresh-toast');
        
        // If toast already exists, remove it
        if (toast) {
            document.body.removeChild(toast);
        }
        
        // Create new toast
        toast = document.createElement('div');
        toast.className = 'refresh-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            opacity: 1;
            transition: opacity 0.5s ease;
        `;
        document.body.appendChild(toast);
        
        // Set timer to automatically hide
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, duration);
    }

    // Export public methods
    return {
        initFeedingContract,
        getRewardsForNFT,
        getRewardsForMultipleNFTs,
        claimRewardForNFT,
        claimRewardsForMultipleNFTs,
        claimAllRewards,
        handleClaimAllRewards,
        handlePetRewardClaim
    };
})();

// Export functions to global scope for use by pets.js
window.handleClaimAllRewards = PetRewards.handleClaimAllRewards;
window.handlePetRewardClaim = PetRewards.handlePetRewardClaim;

// Compatible with CommonJS and browser environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PetRewards;
} else {
    window.PetRewards = PetRewards;
} 