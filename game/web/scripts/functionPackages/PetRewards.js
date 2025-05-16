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
        
        // Check if Web3 is initialized
        if (!window.web3) {
            if (window.ethereum) {
                window.web3 = new Web3(window.ethereum);
                debug.log('Successfully created temporary Web3 instance');
            } else if (typeof window.sharedWeb3 !== 'undefined') {
                window.web3 = window.sharedWeb3;
                debug.log('Using sharedWeb3 instance');
            } else {
                throw new Error('Web3 not loaded, please refresh the page and try again');
            }
        }
        
        // Check if NFTFeedingManagerContract is available
        if (!window.NFTFeedingManagerContract) {
            debug.log('NFTFeedingManagerContract is not available, trying to load');
            
            // Attempt to load from initNFTFeedingManager.js
            try {
                await loadContractScript('../../scripts/init_contracts/initNFTFeedingManager.js');
                debug.log('Successfully loaded initNFTFeedingManager.js');
            } catch (error) {
                debug.error('Failed to load initNFTFeedingManager.js, trying to load NFTFeedingManager.js directly');
                await loadContractScript('../../scripts/contracts/NFTFeedingManager.js');
            }
            
            // If NFTFeedingManagerContract class is now available, use it directly
            if (!window.NFTFeedingManagerContract && (window.nftFeedingManagerContract || window.initNFTFeedingManagerContract)) {
                debug.log('Creating NFTFeedingManagerContract wrapper class');
                
                // Create a wrapper class
                window.NFTFeedingManagerContract = createFeedingManagerWrapper();
            }
        }
        
        // Create contract instance
        if (window.NFTFeedingManagerContract) {
            window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
            debug.log('Feeding contract initialized successfully');
            return window.feedingManagerContract;
        }
        
        throw new Error('Unable to initialize feeding contract');
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
            
            // Calculate claimable rewards for a single NFT
            async calculateClaimableRewards(tokenId) {
                try {
                    debug.log(`Calculating claimable rewards for NFT #${tokenId}`);
                    
                    // Attempt to use the contract's getTotalClaimableRewardCycles method
                    try {
                        if (this.contract.methods.getTotalClaimableRewardCycles) {
                            const result = await this.contract.methods.getTotalClaimableRewardCycles(tokenId).call();
                            const totalCycles = parseInt(result.totalCycles || 0);
                            const pwpotReward = parseInt(result.pwpotReward || 0);
                            const pwbotReward = parseInt(result.pwbotReward || 0);
                            
                            debug.log(`Rewards for NFT #${tokenId} from contract: Cycles=${totalCycles}, PWPOT=${pwpotReward}, PWBOT=${pwbotReward}`);
                            
                            if (totalCycles > 0 || pwpotReward > 0 || pwbotReward > 0) {
                                // Note: Even when using contract methods, there may be limits on maximum reward cycles, so we add a marker here
                                return {
                                    tokenId: tokenId,
                                    pwpot: pwpotReward,
                                    pwbot: pwbotReward,
                                    cycles: totalCycles,
                                    directFromContract: true,
                                    noMaxCycleLimit: false // There may still be limits internally in the contract
                                };
                            }
                        }
                    } catch (contractMethodError) {
                        debug.warn(`Directly calling contract to calculate rewards failed, will use local calculation: ${contractMethodError.message}`);
                    }
                    
                    // Get NFT feeding data
                    let feedingData;
                    try {
                        feedingData = await this.contract.methods.nftFeeding(tokenId).call();
                        
                        if (!feedingData || !feedingData.isActive) {
                            return {
                                tokenId: tokenId,
                                pwpot: 0,
                                pwbot: 0,
                                cycles: 0
                            };
                        }
                    } catch (error) {
                        debug.error(`Failed to get feeding data for NFT #${tokenId}:`, error);
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
                    
                    debug.log(`NFT #${tokenId} data:`, {
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
                        return {
                            tokenId: tokenId,
                            pwpot: 0,
                            pwbot: 0,
                            cycles: 0
                        };
                    }
                    
                    // Get seconds per cycle (default 1 hour = 3600 seconds)
                    let secondsPerCycle = 3600; // Default
                    try {
                        if (this.contract.methods.SECONDS_PER_CYCLE) {
                            secondsPerCycle = await this.contract.methods.SECONDS_PER_CYCLE().call();
                        }
                    } catch (error) {
                        debug.warn('Failed to get seconds per cycle, using default value of 3600 seconds');
                    }
                    
                    // If current time is greater than last claim time, calculate new cycles
                    if (currentTime > lastClaimTime) {
                        // Calculate how much time has passed since the last claim (seconds)
                        const timeSinceLastClaim = currentTime - lastClaimTime;
                        
                        // If the time since last claim is less than or equal to the feeding time in seconds, calculate the claimable cycles
                        if (feedingHours * 3600 >= timeSinceLastClaim) {
                            // No longer limit the maximum reward cycles, calculate based entirely on time
                            const newCycles = Math.floor(timeSinceLastClaim / secondsPerCycle);
                            totalValidCycles += newCycles;
                        } else {
                            // Calculate valid cycles before starvation (removing maximum cycle limit)
                            const hoursBeforeStarvation = feedingHours;
                            const cyclesBeforeStarvation = hoursBeforeStarvation; // Because 1 hour = 1 cycle
                            
                            totalValidCycles += cyclesBeforeStarvation;
                            
                            // Check if feeding occurred after the starvation period
                            if (lastFeedTime > lastClaimTime + (feedingHours * 3600)) {
                                const timeFromLastFeed = currentTime > lastFeedTime ? 
                                                        currentTime - lastFeedTime : 0;
                                
                                if (timeFromLastFeed > 0) {
                                    const cyclesFromLastFeed = Math.floor(timeFromLastFeed / secondsPerCycle);
                                    
                                    // New cycles are only limited by the current remaining feeding time
                                    const currentPeriodCycles = Math.min(cyclesFromLastFeed, feedingHours);
                                    
                                    totalValidCycles += currentPeriodCycles;
                                }
                            }
                        }
                    }
                    
                    // Get reward configuration
                    let pwpotReward = 1; // Default value
                    let pwbotReward = 0; // Default value
                    
                    try {
                        if (this.contract.methods.rewardConfigs) {
                            const rewardConfig = await this.contract.methods.rewardConfigs(quality).call();
                            pwpotReward = parseInt(rewardConfig.pwpotReward || 1);
                            pwbotReward = parseInt(rewardConfig.pwbotReward || 0);
                        }
                    } catch (error) {
                        debug.warn(`Failed to get reward configuration, using default values: pwpot=${pwpotReward}, pwbot=${pwbotReward}`);
                    }
                    
                    // Calculate rewards, no longer limited by maximum cycles
                    const totalPwpot = pwpotReward * totalValidCycles;
                    const totalPwbot = pwbotReward * totalValidCycles;
                    
                    debug.log(`Calculation result for NFT #${tokenId}: Total Cycles=${totalValidCycles}, Accumulated Cycles=${accumulatedCycles}, Rewards: ${totalPwpot} PWPOT, ${totalPwbot} PWBOT`);
                    
                    return {
                        tokenId: tokenId,
                        pwpot: totalPwpot,
                        pwbot: totalPwbot,
                        cycles: totalValidCycles,
                        accumulatedCycles: accumulatedCycles,
                        noMaxCycleLimit: true
                    };
                } catch (error) {
                    debug.error(`Failed to calculate claimable rewards for NFT #${tokenId}:`, error);
                    return {
                        tokenId: tokenId,
                        error: error.message || 'Failed to calculate rewards',
                        pwpot: 0,
                        pwbot: 0,
                        cycles: 0
                    };
                }
            }
            
            // Batch calculate rewards method
            async batchCalculateClaimableRewards(tokenIds) {
                try {
                    // If the contract has this method, call it directly
                    if (this.contract.methods.batchCalculateClaimableRewards) {
                        const result = await this.contract.methods.batchCalculateClaimableRewards(tokenIds).call();
                        return {
                            success: true,
                            nftRewards: result.nftRewards || [],
                            totalRewards: result.totalRewards || { pwpot: 0, pwbot: 0 }
                        };
                    }
                    
                    // If there is no batch method, calculate one by one
                    const rewards = [];
                    let totalPwpot = 0;
                    let totalPwbot = 0;
                    
                    for (const tokenId of tokenIds) {
                        try {
                            const reward = await this.calculateClaimableRewards(tokenId);
                            rewards.push(reward);
                            
                            if (!reward.error) {
                                totalPwpot += reward.pwpot;
                                totalPwbot += reward.pwbot;
                            }
                        } catch (err) {
                            rewards.push({
                                tokenId,
                                error: err.message,
                                pwpot: 0,
                                pwbot: 0,
                                cycles: 0
                            });
                        }
                    }
                    
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
                    debug.error('Batch calculating rewards failed:', error);
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
                    
                    const result = await this.contract.methods.claimReward(tokenId).send({ 
                        from: userAddress,
                        gas: 200000 // Estimated gas usage
                    });
                    
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
                    
                    // Call the contract's batch claim rewards method
                    const result = await this.contract.methods[methodName](tokenIds).send({ 
                        from: userAddress,
                        gas: Math.min(500000 + (tokenIds.length * 50000), 8000000) // Estimated gas usage, increases with quantity but has a cap
                    });
                    
                    debug.log('Batch claiming rewards successful, result:', result);
                    
                    // Attempt to get the actual claimed reward amounts from the transaction events
                    let pwpotRewards = 0;
                    let pwbotRewards = 0;
                    
                    if (result.events && result.events.RewardsClaimed) {
                        const event = Array.isArray(result.events.RewardsClaimed) 
                            ? result.events.RewardsClaimed[0] 
                            : result.events.RewardsClaimed;
                            
                        if (event.returnValues) {
                            // Try to get values with multiple possible property names from the event
                            // NFTFeedingManager.sol uses totalPwpotRewards and totalPwbotRewards
                            pwpotRewards = parseInt(event.returnValues.totalPwpotRewards || event.returnValues.pwpotAmount || 0);
                            pwbotRewards = parseInt(event.returnValues.totalPwbotRewards || event.returnValues.pwbotAmount || 0);
                            
                            debug.log(`Extracted rewards from event - PWPOT: ${pwpotRewards}, PWBOT: ${pwbotRewards}`);
                        }
                    }
                    
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
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
            
            // Filter out NFTs with rewards
            const nftsWithRewards = rewardsInfo.nftRewards.filter(nft => 
                !nft.error && (nft.pwpot > 0 || nft.pwbot > 0) && (nft.cycles > 0)
            );
            
            if (nftsWithRewards.length === 0) {
                return { 
                    success: false, 
                    error: 'No rewards to claim',
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
            
            // Extract all NFT tokenIds
            const tokenIds = nfts.map(nft => nft.tokenId || nft.id || nft);
            
            debug.log(`Preparing to claim rewards for ${tokenIds.length} NFTs`);
            
            if (checkRewardsFirst) {
                // First check which NFTs have claimable rewards
                const rewardsInfo = await getRewardsForMultipleNFTs(tokenIds);
                
                if (!rewardsInfo.success) {
                    return { success: false, error: 'Failed to check rewards: ' + (rewardsInfo.error || 'Unknown error') };
                }
                
                const nftsWithRewards = rewardsInfo.nftRewards.filter(nft => 
                    !nft.error && (nft.pwpot > 0 || nft.pwbot > 0) && (nft.cycles > 0)
                );
                
                if (nftsWithRewards.length === 0) {
                    return { 
                        success: false, 
                        error: 'No rewards to claim',
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
                return await claimRewardsForMultipleNFTs(tokenIdsWithRewards);
            } else {
                // Directly attempt to claim rewards for all NFTs
                return await claimRewardsForMultipleNFTs(tokenIds);
            }
        } catch (error) {
            debug.error('Error claiming all rewards:', error);
            return { success: false, error: error.message || 'Error occurred while claiming all rewards' };
        }
    }
    
    // Export public methods
    return {
        getRewardsForNFT,
        getRewardsForMultipleNFTs,
        claimRewardForNFT,
        claimRewardsForMultipleNFTs,
        claimAllRewards,
        initFeedingContract
    };
})();

// Compatible with CommonJS and browser environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PetRewards;
} else {
    window.PetRewards = PetRewards;
} 