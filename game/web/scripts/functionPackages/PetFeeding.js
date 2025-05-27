/**
 * Pet Feeding Function Module
 * Handles single pet feeding and batch feeding functionality
 */

const PetFeeding = (function() {
    // Debugging tools
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet Feeding]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet Feeding Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet Feeding Warning]', ...args);
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
        
        // Check if we need to create a wrapper for the feeding contract
        if (!window.feedingManagerContract) {
            debug.log('Feeding contract not available, trying to initialize');
            
            // Attempt to load from initNFTFeedingManager.js
            try {
                await loadContractScript('../../scripts/init_contracts/initNFTFeedingManager.js');
                debug.log('Successfully loaded initNFTFeedingManager.js');
            } catch (error) {
                debug.error('Failed to load initNFTFeedingManager.js, trying to load NFTFeedingManager.js directly');
                await loadContractScript('../../scripts/contracts/NFTFeedingManager.js');
            }
            
            // Create a wrapper class if we have contract instances available
            if (window.nftFeedingManagerContract || window.initNFTFeedingManagerContract) {
                debug.log('Creating NFTFeedingManagerContract wrapper class');
                
                // Create a wrapper class
                const NFTFeedingManagerWrapper = createFeedingManagerWrapper();
                window.feedingManagerContract = new NFTFeedingManagerWrapper(web3Instance);
                debug.log('Feeding contract initialized successfully with Web3 instance');
                return window.feedingManagerContract;
            } else {
                throw new Error('No feeding contract instances available (nftFeedingManagerContract or initNFTFeedingManagerContract not found)');
            }
        } else {
            // Return existing contract instance
            debug.log('Using existing feeding contract instance');
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
            
            /**
             * Calculate claimable rewards for a single NFT
             * @param {number} tokenId - NFT's token ID
             * @returns {Promise<Object>} - claimable rewards information
             */
            async calculateClaimableRewards(tokenId) {
                try {
                    debug.log(`[PetFeeding] Calculating claimable rewards for NFT #${tokenId} using local calculation only`);
                    
                    // Skip all contract method calls and use local calculation only
                    debug.log(`[PetFeeding] Using local calculation for NFT #${tokenId}`);
                    
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
                    
                    // If current time is greater than the last claim time, calculate the new cycles
                    if (currentTime > lastClaimTime) {
                        // Calculate the time since the last claim (in seconds)
                        const timeSinceLastClaim = currentTime - lastClaimTime;
                        
                        // Get the seconds per cycle (default 3600 seconds = 1 hour)
                        const secondsPerCycle = 3600;
                        
                        // If the time since the last claim is less than or equal to the seconds corresponding to the feeding time, calculate the claimable cycles directly
                        if (feedingHours * 3600 >= timeSinceLastClaim) {
                            const newCycles = Math.floor(timeSinceLastClaim / secondsPerCycle);
                            totalValidCycles += newCycles;
                        } else {
                            // Calculate the valid cycles before the starvation period
                            const hoursBeforeStarvation = feedingHours;
                            const cyclesBeforeStarvation = hoursBeforeStarvation; // because 1 hour = 1 cycle
                            
                            totalValidCycles += cyclesBeforeStarvation;
                            
                            // Check if there is a feeding after the starvation period
                            if (lastFeedTime > lastClaimTime + (feedingHours * 3600)) {
                                const timeFromLastFeed = currentTime > lastFeedTime ? 
                                                       currentTime - lastFeedTime : 0;
                                
                                if (timeFromLastFeed > 0) {
                                    const cyclesFromLastFeed = Math.floor(timeFromLastFeed / secondsPerCycle);
                                    
                                    // The new cycles are only limited by the current remaining feeding time
                                    const currentPeriodCycles = Math.min(cyclesFromLastFeed, feedingHours);
                                    
                                    totalValidCycles += currentPeriodCycles;
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
                    debug.log(`[PetFeeding] Using default reward config for quality ${quality}: pwpot=${pwpotReward}, pwbot=${pwbotReward}`);
                    
                    // Calculate rewards
                    const totalPwpot = pwpotReward * totalValidCycles;
                    const totalPwbot = pwbotReward * totalValidCycles;
                    
                    debug.log(`Calculation result for NFT #${tokenId}: Total Cycles=${totalValidCycles}, Accumulated Cycles=${accumulatedCycles}, Rewards: ${totalPwpot} PWPOT, ${totalPwbot} PWBOT`);
                    
                    return {
                        tokenId: tokenId,
                        pwpot: totalPwpot,
                        pwbot: totalPwbot,
                        cycles: totalValidCycles,
                        accumulatedCycles: accumulatedCycles
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
            
            // Single NFT feeding method
            async feedNFT(tokenId, hours, userAddress) {
                try {
                    debug.log(`Starting to feed single NFT: TokenID=${tokenId}, Time=${hours} hours`);
                    
                    // Get PWFOOD contract address
                    let pwfoodAddress;
                    try {
                        // Attempt to get PWFOOD address in various ways
                        if (window.getContractAddress) {
                            pwfoodAddress = window.getContractAddress('PwFood');
                        }
                        
                        if (!pwfoodAddress && window.contractAddresses) {
                            const network = window.currentNetwork || 'TEST';
                            if (window.contractAddresses[network]) {
                                pwfoodAddress = window.contractAddresses[network].PwFood;
                            }
                        }
                        
                        if (!pwfoodAddress || pwfoodAddress === '0x0000000000000000000000000000000000000000') {
                            throw new Error('PwFood contract address not found');
                        }
                    } catch (addressError) {
                        debug.error('Error getting PWFOOD address:', addressError);
                        throw addressError;
                    }
                    
                    // Attempt to get the correct ABI
                    let tokenABI = window.GENERIC_ERC20_ABI;
                    if (!tokenABI && window.ABI && window.ABI.GENERIC_ERC20) {
                        tokenABI = window.ABI.GENERIC_ERC20;
                    }
                    
                    if (!tokenABI) {
                        // Provide simplified ERC20 ABI
                        tokenABI = [
                            {
                                "constant": true,
                                "inputs": [{"name": "account", "type": "address"}],
                                "name": "balanceOf",
                                "outputs": [{"name": "", "type": "uint256"}],
                                "payable": false,
                                "stateMutability": "view",
                                "type": "function"
                            },
                            {
                                "constant": true,
                                "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
                                "name": "allowance",
                                "outputs": [{"name": "", "type": "uint256"}],
                                "payable": false,
                                "stateMutability": "view",
                                "type": "function"
                            },
                            {
                                "constant": false,
                                "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}],
                                "name": "approve",
                                "outputs": [{"name": "", "type": "bool"}],
                                "payable": false,
                                "stateMutability": "nonpayable",
                                "type": "function"
                            }
                        ];
                    }
                    
                    // Create PWFOOD contract instance
                    const pwfoodContract = new this.web3.eth.Contract(tokenABI, pwfoodAddress);
                    
                    // Get user balance
                    const balance = await pwfoodContract.methods.balanceOf(userAddress).call();
                    debug.log('User PWFOOD balance:', balance);
                    
                    // Check if balance is sufficient
                    if (parseInt(balance) < hours) {
                        return { 
                            success: false, 
                            error: 'Insufficient PWFOOD balance', 
                            requiredAmount: hours, 
                            balance: balance 
                        };
                    }
                    
                    // Check allowance
                    debug.log('Checking PWFOOD allowance, user:', userAddress, 'contract:', this.contractAddress);
                    const allowance = await pwfoodContract.methods.allowance(
                        userAddress, 
                        this.contractAddress
                    ).call();
                    
                    debug.log('Current allowance:', allowance);
                    
                    // If allowance is insufficient
                    if (parseInt(allowance) < hours) {
                        debug.log('Insufficient allowance, needs approval');
                        return {
                            success: false,
                            needApproval: true,
                            pwfoodContract: pwfoodContract,
                            feedingManagerAddress: this.contractAddress,
                            error: 'Approval for PWFOOD tokens is required'
                        };
                    }
                    
                    // Call contract feeding method
                    debug.log('Starting to call contract feeding method');
                    
                    let result;
                    
                    // Check if using private key wallet
                    const shouldUsePrivateKey = window.SecureWalletManager && 
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                    
                    if (shouldUsePrivateKey) {
                        debug.log('Using private key wallet for feeding transaction');
                        
                        // Use SecureWalletManager for private key transactions
                        result = await window.SecureWalletManager.sendContractTransaction(
                            this.contract,
                            'feedNFT',
                            [tokenId, hours],
                            { gas: 300000 } // Set appropriate gas limit
                        );
                    } else {
                        debug.log('Using connected wallet for feeding transaction');
                        
                        // Use traditional connected wallet method
                        result = await this.contract.methods.feedNFT(
                        tokenId, 
                        hours
                    ).send({ from: userAddress });
                    }
                    
                    debug.log('Feeding successful, result:', result);
                    return {
                        success: true,
                        transaction: result,
                        tokenId: tokenId,
                        hours: hours
                    };
                } catch (error) {
                    debug.error('Feeding failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Feeding failed'
                    };
                }
            }
            
            // Batch feeding method
            async feedMultipleNFTs(tokenIds, feedingHours, userAddress) {
                try {
                    debug.log(`Starting to feed ${tokenIds.length} NFTs, each for ${feedingHours} hours`);
                    
                    // Get PWFOOD contract address
                    let pwfoodAddress;
                    try {
                        // Attempt to get PWFOOD address in various ways
                        if (window.getContractAddress) {
                            pwfoodAddress = window.getContractAddress('PwFood');
                        }
                        
                        if (!pwfoodAddress && window.contractAddresses) {
                            const network = window.currentNetwork || 'TEST';
                            if (window.contractAddresses[network]) {
                                pwfoodAddress = window.contractAddresses[network].PwFood;
                            }
                        }
                        
                        if (!pwfoodAddress || pwfoodAddress === '0x0000000000000000000000000000000000000000') {
                            throw new Error('Contract PwFood address not found on network ' + (window.currentNetwork || 'TEST'));
                        }
                    } catch (addressError) {
                        debug.error('Error getting PWFOOD address:', addressError);
                        throw addressError;
                    }
                    
                    // Check if there are enough PWFOOD tokens and allowance
                    debug.log('Creating PWFOOD contract instance, address:', pwfoodAddress);
                    
                    // Attempt to get the correct ABI
                    let tokenABI = window.GENERIC_ERC20_ABI;
                    if (!tokenABI && window.ABI && window.ABI.GENERIC_ERC20) {
                        tokenABI = window.ABI.GENERIC_ERC20;
                    }
                    
                    if (!tokenABI) {
                        debug.warn('GENERIC_ERC20_ABI not found, using simplified ABI');
                        // Provide simplified ERC20 ABI
                        tokenABI = [
                            {
                                "constant": true,
                                "inputs": [{"name": "account", "type": "address"}],
                                "name": "balanceOf",
                                "outputs": [{"name": "", "type": "uint256"}],
                                "payable": false,
                                "stateMutability": "view",
                                "type": "function"
                            },
                            {
                                "constant": true,
                                "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
                                "name": "allowance",
                                "outputs": [{"name": "", "type": "uint256"}],
                                "payable": false,
                                "stateMutability": "view",
                                "type": "function"
                            },
                            {
                                "constant": false,
                                "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}],
                                "name": "approve",
                                "outputs": [{"name": "", "type": "bool"}],
                                "payable": false,
                                "stateMutability": "nonpayable",
                                "type": "function"
                            }
                        ];
                    }
                    
                    // Create PWFOOD contract instance
                    const pwfoodContract = new this.web3.eth.Contract(tokenABI, pwfoodAddress);
                    
                    // Get user balance
                    const balance = await pwfoodContract.methods.balanceOf(userAddress).call();
                    debug.log('User PWFOOD balance:', balance);
                    
                    // Calculate total food needed
                    const totalFood = tokenIds.length * feedingHours;
                    debug.log('Total PWFOOD needed:', totalFood);
                    
                    // Check if balance is sufficient
                    if (parseInt(balance) < totalFood) {
                        return { 
                            success: false, 
                            error: 'Insufficient PWFOOD balance', 
                            requiredAmount: totalFood, 
                            balance: balance 
                        };
                    }
                    
                    // Check allowance
                    debug.log('Checking PWFOOD allowance, user:', userAddress, 'contract:', this.contractAddress);
                    const allowance = await pwfoodContract.methods.allowance(
                        userAddress, 
                        this.contractAddress
                    ).call();
                    
                    debug.log('Current allowance:', allowance);
                    
                    // If allowance is insufficient
                    if (parseInt(allowance) < totalFood) {
                        debug.log('Insufficient allowance, needs approval');
                        return {
                            success: false,
                            needApproval: true,
                            pwfoodContract: pwfoodContract,
                            feedingManagerAddress: this.contractAddress,
                            error: 'Approval for PWFOOD tokens is required'
                        };
                    }
                    
                    // Call contract batch feeding method
                    debug.log('Starting to call contract batch feeding method');
                    
                    let result;
                    
                    // Check if using private key wallet
                    const shouldUsePrivateKey = window.SecureWalletManager && 
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                    
                    if (shouldUsePrivateKey) {
                        debug.log('Using private key wallet for batch feeding transaction');
                        
                        // Use SecureWalletManager for private key transactions
                        result = await window.SecureWalletManager.sendContractTransaction(
                            this.contract,
                            'feedMultipleNFTs',
                            [tokenIds, totalFood],
                            { gas: 500000 } // Set appropriate gas limit for batch operation
                        );
                    } else {
                        debug.log('Using connected wallet for batch feeding transaction');
                        
                        // Use traditional connected wallet method
                        result = await this.contract.methods.feedMultipleNFTs(
                        tokenIds, 
                        totalFood
                    ).send({ from: userAddress });
                    }
                    
                    debug.log('Batch feeding successful, result:', result);
                    return {
                        success: true,
                        receipt: result
                    };
                } catch (error) {
                    debug.error('Batch feeding failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Batch feeding failed'
                    };
                }
            }
            
            // Batch calculate claimable rewards method
            async batchCalculateClaimableRewards(tokenIds) {
                try {
                    // Skip all contract methods and use local calculation only
                    debug.log('[PetFeeding] Using local calculation only for batch rewards');
                    const rewards = [];
                    let totalPwpot = 0;
                    let totalPwbot = 0;
                    
                    for (const tokenId of tokenIds) {
                        try {
                            // Use local calculation instead of contract method
                            const result = await this.calculateClaimableRewards(tokenId);
                            rewards.push({
                                tokenId,
                                pwpot: parseInt(result.pwpot || 0),
                                pwbot: parseInt(result.pwbot || 0),
                                cycles: parseInt(result.cycles || 0)
                            });
                            
                            totalPwpot += parseInt(result.pwpot || 0);
                            totalPwbot += parseInt(result.pwbot || 0);
                        } catch (err) {
                            debug.error(`[PetFeeding] Error calculating rewards for NFT #${tokenId}:`, err);
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
                            pwbot: totalPwbot
                        }
                    };
                } catch (error) {
                    debug.error('Batch calculating rewards failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Batch calculating rewards failed'
                    };
                }
            }
            
            // Claim rewards method
            async claimRewards(tokenIds, userAddress) {
                try {
                    debug.log(`Starting to claim rewards for ${tokenIds.length} NFTs`);
                    
                    let result;
                    
                    // Check if using private key wallet
                    const shouldUsePrivateKey = window.SecureWalletManager && 
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                    
                    if (shouldUsePrivateKey) {
                        debug.log('Using private key wallet for claim rewards transaction');
                        
                        // Use SecureWalletManager for private key transactions
                        result = await window.SecureWalletManager.sendContractTransaction(
                            this.contract,
                            'claimRewards',
                            [tokenIds],
                            { gas: 500000 } // Set appropriate gas limit for batch operation
                        );
                    } else {
                        debug.log('Using connected wallet for claim rewards transaction');
                        
                        // Use traditional connected wallet method
                        result = await this.contract.methods.claimRewards(tokenIds).send({ 
                        from: userAddress,
                        gas: 500000 // Estimated gas usage
                    });
                    }
                    
                    debug.log('Claiming rewards successful, result:', result);
                    return {
                        success: true,
                        receipt: result
                    };
                } catch (error) {
                    debug.error('Claiming rewards failed:', error);
                    return {
                        success: false,
                        error: error.message || 'Claiming rewards failed'
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
     * Handle approval request
     * @param {Object} approvalData - Approval data
     * @returns {Promise<Object>} - Approval result
     */
    async function handleApproval(approvalData) {
        const { pwfoodContract, feedingManagerAddress, requiredAmount, userAddress } = approvalData;
        
        // Check if ContractApprovalManager is available
        if (!window.ContractApprovalManager) {
            debug.log('ContractApprovalManager is not available, trying to load');
            try {
                await loadContractScript('../../scripts/other/ContractApprovalManager.js');
            } catch (error) {
                debug.error('Failed to load ContractApprovalManager:', error);
                throw new Error('Unable to load authorization manager');
            }
        }
        
        if (!window.ContractApprovalManager) {
            throw new Error('Authorization manager loading failed');
        }
        
        // Execute approval
        debug.log('Starting to approve PWFOOD tokens...');
        
        const approvalResult = await window.ContractApprovalManager.approveERC20Token(
            pwfoodContract,
            feedingManagerAddress,
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // Maximum uint256
            userAddress,
            true // Use maximum allowance
        );
        
        return approvalResult;
    }
    
    /**
     * Handle single pet feeding
     * @param {Object} feedData - Feeding data
     * @returns {Promise<Object>} - Feeding result
     */
    async function feedSinglePet(feedData) {
        try {
            const { tokenId, feedHours, element } = feedData;
            debug.log(`Handling single pet feeding: TokenID=${tokenId}, Feed Time=${feedHours} hours`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (window.SecureWalletManager && 
                typeof window.SecureWalletManager.shouldUsePrivateKeyForTransactions === 'function' &&
                window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                userAddress = window.SecureWalletManager.getAddress();
                debug.log('Using private key wallet for feeding:', userAddress);
            } else {
                // Priority 2: Check connected wallet
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
                debug.log('Using connected wallet for feeding:', userAddress);
            }
            
            if (!userAddress) {
                return { success: false, error: 'Please connect wallet to feed' };
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Call contract feeding method
            const result = await feedingManager.feedNFT(tokenId, feedHours, userAddress);
            
            if (!result.success) {
                // Check if authorization is needed
                if (result.needApproval) {
                    // Execute approval automatically without user confirmation
                    debug.log('Auto-authorizing PWFOOD tokens for single pet feeding');
                    
                    // Execute approval
                    try {
                        const approvalResult = await handleApproval({
                            pwfoodContract: result.pwfoodContract,
                            feedingManagerAddress: result.feedingManagerAddress,
                            requiredAmount: feedHours,
                            userAddress: userAddress
                        });
                        
                        if (!approvalResult.success) {
                            return { success: false, error: 'Authorization failed: ' + (approvalResult.error || 'Unknown error') };
                        }
                        
                        debug.log('PWFOOD authorization successful, retrying single pet feeding');
                        // Try feeding again
                        const feedResult = await feedingManager.feedNFT(tokenId, feedHours, userAddress);
                        return feedResult;
                    } catch (approvalError) {
                        debug.error('Authorization process failed:', approvalError);
                        return { success: false, error: 'Authorization process failed: ' + (approvalError.message || 'Unknown error') };
                    }
                }
                
                // Other errors
                return result;
            }
            
            return result;
        } catch (error) {
            debug.error('Error handling pet feeding:', error);
            return { success: false, error: error.message || 'Feeding process failed' };
        }
    }
    
    /**
     * Handle batch pet feeding
     * @param {Array} tokenIds - Array of NFT IDs to feed
     * @param {number} feedingHours - Feeding time for each pet
     * @returns {Promise<Object>} - Batch feeding result
     */
    async function feedMultiplePets(tokenIds, feedingHours) {
        try {
            debug.log(`Handling batch pet feeding: ${tokenIds.length} pets, each feeding time=${feedingHours} hours`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (window.SecureWalletManager && 
                typeof window.SecureWalletManager.shouldUsePrivateKeyForTransactions === 'function' &&
                window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                userAddress = window.SecureWalletManager.getAddress();
                debug.log('Using private key wallet for batch feeding:', userAddress);
            } else {
                // Priority 2: Check connected wallet
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
                debug.log('Using connected wallet for batch feeding:', userAddress);
            }
            
            if (!userAddress) {
                return { success: false, error: 'Please connect wallet to feed' };
            }
            
            // Calculate total required food
            const totalRequiredFood = tokenIds.length * feedingHours;
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Call contract batch feeding method
            const result = await feedingManager.feedMultipleNFTs(tokenIds, feedingHours, userAddress);
            
            if (!result.success) {
                // Check if authorization is needed
                if (result.needApproval) {
                    // Execute approval automatically without user confirmation
                    debug.log('Auto-authorizing PWFOOD tokens for batch feeding');
                    
                    // Execute approval
                    try {
                        const approvalResult = await handleApproval({
                            pwfoodContract: result.pwfoodContract,
                            feedingManagerAddress: result.feedingManagerAddress,
                            requiredAmount: totalRequiredFood,
                            userAddress: userAddress
                        });
                        
                        if (!approvalResult.success) {
                            return { success: false, error: 'Authorization failed: ' + (approvalResult.error || 'Unknown error') };
                        }
                        
                        debug.log('PWFOOD authorization successful, retrying batch feeding');
                        // Try batch feeding again
                        const feedResult = await feedingManager.feedMultipleNFTs(tokenIds, feedingHours, userAddress);
                        return feedResult;
                    } catch (approvalError) {
                        debug.error('Authorization process failed:', approvalError);
                        return { success: false, error: 'Authorization process failed: ' + (approvalError.message || 'Unknown error') };
                    }
                }
                
                // Other errors
                return result;
            }
            
            return result;
        } catch (error) {
            debug.error('Error handling batch pet feeding:', error);
            return { success: false, error: error.message || 'Batch feeding process failed' };
        }
    }
    
    /**
     * Batch claim rewards
     * @param {Array} tokenIds - Array of NFT IDs to claim rewards for
     * @returns {Promise<Object>} - Claim rewards result
     */
    async function claimMultipleRewards(tokenIds) {
        try {
            debug.log(`Handling batch reward claim: ${tokenIds.length} pets`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (window.SecureWalletManager && 
                typeof window.SecureWalletManager.shouldUsePrivateKeyForTransactions === 'function' &&
                window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
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
            
            // Calculate claimable rewards
            const rewardsInfo = await feedingManager.batchCalculateClaimableRewards(tokenIds);
            
            if (!rewardsInfo.success) {
                return { success: false, error: 'Reward calculation failed: ' + (rewardsInfo.error || 'Unknown error') };
            }
            
            // Check if there are rewards to claim
            const hasRewards = rewardsInfo.nftRewards && rewardsInfo.nftRewards.some(
                reward => (reward.pwpot > 0 || reward.pwbot > 0)
            );
            
            if (!hasRewards) {
                return { success: false, error: 'No rewards to claim' };
            }
            
            // Call contract claim rewards method
            const result = await feedingManager.claimRewards(tokenIds, userAddress);
            
            return result;
        } catch (error) {
            debug.error('Error handling batch reward claim:', error);
            return { success: false, error: error.message || 'Reward claim process failed' };
        }
    }
    
    /**
     * Get NFT feeding information
     * @param {string|number} tokenId - NFT's token ID
     * @returns {Promise<Object|null>} Feeding information object or null (if retrieval fails)
     */
    async function getNFTFeedingInfo(tokenId) {
        try {
            debug.log(`Getting feeding information for TokenID=${tokenId}...`);
            
            // Ensure Web3 is initialized
            if (!window.web3) {
                if (window.ethereum) {
                    try {
                        debug.log('Attempting to initialize Web3 using window.ethereum');
                        window.web3 = new Web3(window.ethereum);
                    } catch (e) {
                        debug.error('Initialization of Web3 failed:', e);
                        return null;
                    }
                } else {
                    debug.error('Failed to get feeding information: Web3 not initialized, and window.ethereum not found');
                    return null;
                }
            }
            
            // Get contract instance
            let feedingContract;
            try {
                feedingContract = await initFeedingContract();
                if (!feedingContract) {
                    throw new Error('Unable to initialize feeding contract');
                }
            } catch (error) {
                debug.error('Failed to initialize feeding contract:', error);
                return null;
            }
            
            // Get NFT feeding information
            let feedingInfo = null;
            
            // 1. Attempt to use the contract instance's getNFTFeedingInfo method
            if (typeof feedingContract.getNFTFeedingInfo === 'function') {
                try {
                    debug.log(`Attempting to use contract instance's getNFTFeedingInfo method to get feeding information for NFT #${tokenId}`);
                    feedingInfo = await feedingContract.getNFTFeedingInfo(tokenId);
                    if (feedingInfo) {
                        return feedingInfo;
                    }
                } catch (methodError) {
                    debug.warn(`Failed to use getNFTFeedingInfo method to get feeding information for NFT #${tokenId}:`, methodError);
                }
            }
            
            // 2. Attempt to access contract's nftFeeding mapping directly
            if (feedingContract.contract && typeof feedingContract.contract.methods.nftFeeding === 'function') {
                try {
                    debug.log(`Attempting to access contract's nftFeeding mapping to get feeding information for NFT #${tokenId}`);
                    const rawFeedingData = await feedingContract.contract.methods.nftFeeding(tokenId).call();
                    
                    if (rawFeedingData) {
                        debug.log(`Obtained raw feeding data for NFT #${tokenId}:`, rawFeedingData);
                        
                        // Convert data format
                        feedingInfo = {
                            feedingHours: parseInt(rawFeedingData.feedingHours) || 0,
                            lastClaimTime: parseInt(rawFeedingData.lastClaimTime) || 0,
                            lastFeedTime: parseInt(rawFeedingData.lastFeedTime) || 0,
                            quality: parseInt(rawFeedingData.quality) || 0,
                            isActive: Boolean(rawFeedingData.isActive)
                        };
                        
                        // Calculate actual feeding hours
                        feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                        return feedingInfo;
                    }
                } catch (mappingError) {
                    debug.warn(`Failed to access nftFeeding mapping to get feeding information for NFT #${tokenId}:`, mappingError);
                }
            }
            
            // 3. Attempt to use global getNFTFeedingInfo function
            if (typeof window.getNFTFeedingInfo === 'function') {
                try {
                    debug.log(`Attempting to use global getNFTFeedingInfo function to get feeding information for NFT #${tokenId}`);
                    
                    // If feedingContract.contract exists, use it, otherwise use base contract
                    const baseContract = feedingContract.contract || window.nftFeedingManagerContract;
                    
                    if (baseContract) {
                        feedingInfo = await window.getNFTFeedingInfo(baseContract, tokenId);
                        
                        if (feedingInfo) {
                            // Calculate actual feeding hours
                            feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                            return feedingInfo;
                        }
                    }
                } catch (globalFnError) {
                    debug.warn(`Failed to use global getNFTFeedingInfo function to get feeding information for NFT #${tokenId}:`, globalFnError);
                }
            }
            
            debug.error(`Failed to get feeding information for NFT #${tokenId}, all attempts failed`);
            return null;
        } catch (error) {
            debug.error(`Error getting feeding information for NFT #${tokenId}:`, error);
            return null;
        }
    }
    
    /**
     * Calculate actual feeding hours
     * @param {Object} feedingInfo - Feeding information obtained from contract
     * @returns {number} Actual remaining feeding hours
     */
    function calculateRealFeedingHours(feedingInfo) {
        if (!feedingInfo) {
            debug.error('Failed to calculate feeding hours: Feeding information is empty');
            return 0;
        }
        
        // Check if necessary fields exist
        if (feedingInfo.feedingHours === undefined || feedingInfo.lastFeedTime === undefined || feedingInfo.lastClaimTime === undefined) {
            debug.error('Failed to calculate feeding hours: Feeding information missing necessary fields');
            debug.log('Available fields:', Object.keys(feedingInfo).join(', '));
            return feedingInfo.feedingHours || 0;
        }
        
        if (!feedingInfo.isActive) {
            debug.log('NFT not active for feeding, returning 0 feeding hours');
            return 0;
        }
        
        // Get current timestamp (seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Get last feeding time and last claim time
        const lastFeedTime = parseInt(feedingInfo.lastFeedTime) || 0;
        const lastClaimTime = parseInt(feedingInfo.lastClaimTime) || 0;
        const feedingHours = parseInt(feedingInfo.feedingHours) || 0;
        
        // Use larger value between lastFeedTime and lastClaimTime as calculation base point
        const lastActionTime = Math.max(lastFeedTime, lastClaimTime);
        
        // If there is no last action time, return initial feeding hours
        if (lastActionTime === 0) {
            return feedingHours;
        }
        
        // Calculate elapsed time (hours)
        const elapsedSeconds = currentTime - lastActionTime;
        const elapsedHours = elapsedSeconds / 3600;
        
        // Calculate remaining feeding hours
        let remainingHours = feedingHours - elapsedHours;
        
        // Ensure not less than 0
        remainingHours = Math.max(0, remainingHours);
        
        // Return value rounded to one decimal place
        return Math.round(remainingHours * 10) / 10;
    }
    
    /**
     * Get maximum feeding hours for NFT
     * @param {string|number} tokenId - NFT's token ID
     * @returns {Promise<number>} Maximum feeding hours (hours)
     */
    async function getMaxFeedingHours(tokenId) {
        try {
            // Default maximum feeding hours (hours)
            const DEFAULT_MAX_HOURS = 168; // 7 days
            
            // Attempt to get NFT feeding information
            const feedingInfo = await getNFTFeedingInfo(tokenId);
            
            if (!feedingInfo) {
                debug.warn('Failed to get maximum feeding hours, using default value ' + DEFAULT_MAX_HOURS + ' hours');
                return DEFAULT_MAX_HOURS;
            }
            
            // Calculate maximum feeding hours
            let maxHours = DEFAULT_MAX_HOURS;
            
            // Current actual feeding hours
            const currentHours = feedingInfo.realFeedingHours || 0;
            
            // Calculate maximum additional hours (maximum feeding hours - current feeding hours)
            const maxAdditionalHours = maxHours - currentHours;
            
            // Ensure not less than 0
            return Math.max(0, maxAdditionalHours);
        } catch (error) {
            debug.error('Error calculating maximum feeding hours:', error);
            return 168; // Return default value 7 days
        }
    }
    
    /**
     * Batch feed all pets
     * @param {Array} nfts - NFT object array or tokenIds array
     * @param {number} feedingHoursPerNFT - Feeding time for each pet
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Batch feeding result
     */
    async function feedAllPets(nfts, feedingHoursPerNFT = 24, options = {}) {
        try {
            // Extract tokenIds and NFT objects
            const tokenIds = [];
            const validNfts = [];
            const invalidNfts = [];
            
            // If options include maximum feeding hours limit, filter out NFTs that meet the condition
            const defaultMaxHours = options.maxFeedingHours || 168; // Default 7 days
            
            // Get feeding information for each NFT, check maximum feeding limit
            debug.log('Getting feeding information for each NFT, check maximum feeding limit');
            
            for (const nft of nfts) {
                const tokenId = nft.tokenId || nft.token_id || nft;
                
                try {
                    // Get current NFT's maximum feeding hours
                    const maxFeedingHours = await getMaxFeedingHours(tokenId);
                    
                    // If current NFT's maximum feeding hours are less than user-specified feeding time, skip the NFT
                    if (maxFeedingHours < feedingHoursPerNFT) {
                        invalidNfts.push({
                            tokenId,
                            reason: `Maximum feeding time (${maxFeedingHours} hours) less than requested feeding time (${feedingHoursPerNFT} hours)`
                        });
                        continue;
                    }
                    
                    tokenIds.push(tokenId);
                    validNfts.push(nft);
                } catch (nftError) {
                    debug.error(`Failed to get feeding information for NFT #${tokenId}:`, nftError);
                    // Use default maximum feeding time
                    const maxFeedingHours = defaultMaxHours;
                    
                    if (maxFeedingHours >= feedingHoursPerNFT) {
                        tokenIds.push(tokenId);
                        validNfts.push(nft);
                    } else {
                        invalidNfts.push({
                            tokenId,
                            reason: `Default maximum feeding time (${maxFeedingHours} hours) less than requested feeding time (${feedingHoursPerNFT} hours)`
                        });
                    }
                }
            }
            
            if (!tokenIds || tokenIds.length === 0) {
                return { 
                    success: false, 
                    error: 'No pets to feed', 
                    invalidNfts,
                    details: invalidNfts.length > 0 ? 'All pets\'s maximum feeding time is less than requested feeding time' : 'No pets found'
                };
            }
            
            debug.log(`Preparing to batch feed ${tokenIds.length} pets, each feeding ${feedingHoursPerNFT} hours`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            // Priority 1: Check private key wallet
            if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                userAddress = window.SecureWalletManager.getAddress();
                debug.log('Using private key wallet for batch feeding:', userAddress);
            } else {
                // Priority 2: Check connected wallet
            if (!window.web3) {
                return { success: false, error: 'Web3 not initialized' };
            }
            
            const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
                debug.log('Using connected wallet for batch feeding:', userAddress);
            }
            
            if (!userAddress) {
                return { success: false, error: 'Please connect wallet to feed' };
            }
            
            // Initialize feeding contract
            const feedingManager = await initFeedingContract();
            
            // Calculate total required food
            const totalRequiredFood = tokenIds.length * feedingHoursPerNFT;
            
            // Get PWFOOD contract instance and user balance
            const prepCheckResult = await checkPWFOODBalance(userAddress, totalRequiredFood);
            if (!prepCheckResult.success) {
                // If it's a balance issue, add additional information
                if (prepCheckResult.error && prepCheckResult.error.includes('balance insufficient')) {
                    return {
                        ...prepCheckResult,
                        invalidNfts,
                        details: `PWFOOD balance insufficient, need ${prepCheckResult.requiredAmount} PWFOOD, you have ${prepCheckResult.balance}`
                    };
                }
                return {
                    ...prepCheckResult,
                    invalidNfts
                }; // Return error information, including insufficient balance or authorization
            }
            
            const userBalance = prepCheckResult.balance;
            
            // If NFT count is too high, process in batches
            const batchSize = 100; // Maximum of 100 NFTs per batch
            const batches = [];
            
            for (let i = 0; i < tokenIds.length; i += batchSize) {
                batches.push(tokenIds.slice(i, i + batchSize));
            }
            
            debug.log(`Will process NFT feeding in ${batches.length} batches`);
            
            // Process each batch sequentially
            let successCount = 0;
            let failCount = 0;
            let currentBatch = 1;
            let batchResults = [];
            
            for (const batch of batches) {
                try {
                    debug.log(`Processing batch ${currentBatch} of ${batches.length}...`);
                    
                    // Use this module's feedMultiplePets method for batch feeding
                    const result = await feedMultiplePets(batch, feedingHoursPerNFT);
                    
                    if (result.success) {
                        successCount += batch.length;
                        debug.log(`Batch ${currentBatch} feeding successful:`, result);
                        batchResults.push({
                            batchNum: currentBatch,
                            success: true,
                            tokenIds: batch,
                            result: result
                        });
                    } else {
                        // Check if authorization is needed
                        if (result.needApproval) {
                            return {
                                success: false,
                                needApproval: true,
                                pwfoodContract: result.pwfoodContract,
                                feedingManagerAddress: result.feedingManagerAddress,
                                requiredAmount: batch.length * feedingHoursPerNFT,
                                batchResults: batchResults,
                                error: 'Authorization for PWFOOD tokens is required',
                                completedBatches: currentBatch - 1,
                                totalBatches: batches.length
                            };
                        } else {
                            failCount += batch.length;
                            debug.error(`Batch ${currentBatch} feeding failed:`, result.error);
                            batchResults.push({
                                batchNum: currentBatch,
                                success: false,
                                tokenIds: batch,
                                error: result.error
                            });
                        }
                    }
                } catch (batchError) {
                    failCount += batch.length;
                    debug.error(`Batch ${currentBatch} feeding exception:`, batchError);
                    batchResults.push({
                        batchNum: currentBatch,
                        success: false,
                        tokenIds: batch,
                        error: batchError.message || 'Unknown error'
                    });
                }
                
                currentBatch++;
            }
            
            return {
                success: true,
                successCount: successCount,
                failCount: failCount,
                totalProcessed: tokenIds.length,
                skippedCount: invalidNfts.length,
                invalidNfts: invalidNfts,
                batchResults: batchResults,
                feedingHours: feedingHoursPerNFT,
                totalFood: totalRequiredFood,
                balanceRemaining: userBalance - totalRequiredFood
            };
        } catch (error) {
            debug.error('Failed to batch feed all pets:', error);
            return { success: false, error: error.message || 'Batch feeding process failed' };
        }
    }
    
    /**
     * Check PWFOOD balance and authorization
     * @param {string} userAddress - User address
     * @param {number} requiredAmount - Required PWFOOD amount
     * @returns {Promise<Object>} - Check result
     */
    async function checkPWFOODBalance(userAddress, requiredAmount) {
        try {
            // Get PWFOOD contract address
            let pwfoodAddress;
            try {
                // Attempt to get PWFOOD address in various ways
                if (window.getContractAddress) {
                    pwfoodAddress = window.getContractAddress('PwFood');
                }
                
                if (!pwfoodAddress && window.contractAddresses) {
                    const network = window.currentNetwork || 'TEST';
                    if (window.contractAddresses[network]) {
                        pwfoodAddress = window.contractAddresses[network].PwFood;
                    }
                }
                
                if (!pwfoodAddress || pwfoodAddress === '0x0000000000000000000000000000000000000000') {
                    throw new Error('PwFood contract address not found');
                }
            } catch (addressError) {
                debug.error('Error getting PWFOOD address:', addressError);
                return { success: false, error: 'Failed to get PWFOOD address: ' + addressError.message };
            }
            
            // Get ERC20 ABI
            let tokenABI = window.GENERIC_ERC20_ABI;
            if (!tokenABI && window.ABI && window.ABI.GENERIC_ERC20) {
                tokenABI = window.ABI.GENERIC_ERC20;
            }
            
            if (!tokenABI) {
                debug.warn('GENERIC_ERC20_ABI not found, using simplified ABI');
                tokenABI = [
                    {
                        "constant": true,
                        "inputs": [{"name": "account", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "", "type": "uint256"}],
                        "payable": false,
                        "stateMutability": "view",
                        "type": "function"
                    },
                    {
                        "constant": true,
                        "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
                        "name": "allowance",
                        "outputs": [{"name": "", "type": "uint256"}],
                        "payable": false,
                        "stateMutability": "view",
                        "type": "function"
                    }
                ];
            }
            
            // Initialize feeding contract to get its address
            const feedingManager = await initFeedingContract();
            
            // Create PWFOOD contract instance
            const pwfoodContract = new window.web3.eth.Contract(tokenABI, pwfoodAddress);
            
            // Get user balance
            const balance = await pwfoodContract.methods.balanceOf(userAddress).call();
            debug.log('User PWFOOD balance:', balance);
            
            // Check if balance is sufficient
            if (parseInt(balance) < requiredAmount) {
                return { 
                    success: false, 
                    error: 'Insufficient PWFOOD balance', 
                    requiredAmount: requiredAmount, 
                    balance: parseInt(balance)
                };
            }
            
            // Check contract authorization
            const allowance = await pwfoodContract.methods.allowance(
                userAddress, 
                feedingManager.contractAddress
            ).call();
            
            debug.log('Current allowance:', allowance);
            
            // If authorization is insufficient, return authorization required information
            if (parseInt(allowance) < requiredAmount) {
                debug.log('Insufficient allowance, needs approval');
                return {
                    success: false,
                    needApproval: true,
                    pwfoodContract: pwfoodContract,
                    feedingManagerAddress: feedingManager.contractAddress,
                    requiredAmount: requiredAmount,
                    error: 'Authorization for PWFOOD tokens is required'
                };
            }
            
            // Balance and authorization are sufficient
            return {
                success: true,
                balance: parseInt(balance),
                allowance: parseInt(allowance)
            };
        } catch (error) {
            debug.error('Failed to check PWFOOD balance and authorization:', error);
            return { success: false, error: 'Failed to check balance and authorization: ' + error.message };
        }
    }
    
    /**
     * Handle feed friend pet button click
     */
    async function handleFeedFriendNFT() {
        debug.log('Feed friend pet button clicked');
        
        // Check wallet connection and get user address
        let userAddress = null;
        
        // Priority 1: Check private key wallet
        if (shouldUsePrivateKeyWallet()) {
            userAddress = window.SecureWalletManager.getAddress();
            console.log('Using private key wallet for feed friend:', userAddress);
        } else if (window.isWalletConnected && window.currentAddress) {
            // Priority 2: Check connected wallet
            userAddress = window.currentAddress;
            console.log('Using connected wallet for feed friend:', userAddress);
        }
        
        if (!userAddress) {
            showToast('Please connect your wallet first', 5000);
            return;
        }
        
        // Load FeedFriendDialog module
        if (!window.FeedFriendDialog) {
            try {
                await loadContractScript('../../scripts/other/feedFriendDialog.js');
                debug.log('FeedFriendDialog module loaded successfully');
            } catch (error) {
                debug.error('FeedFriendDialog module load failed:', error);
                showToast('Failed to load feed friend dialog', 5000);
                return;
            }
        }
        
        // Display feed friend dialog
        if (window.FeedFriendDialog) {
            window.FeedFriendDialog.show();
        } else {
            showToast('Failed to open feed friend dialog', 5000);
        }
    }
    
    /**
     * Enhanced batch feed all pets method
     */
    async function handleFeedAllPets() {
        debug.log('Enhanced batch feed all pets button clicked');
        
        // Check wallet connection and get user address
        let userAddress = null;
        
        // Priority 1: Check private key wallet
        if (shouldUsePrivateKeyWallet()) {
            userAddress = window.SecureWalletManager.getAddress();
            console.log('Using private key wallet for enhanced batch feeding:', userAddress);
        } else if (window.isWalletConnected && window.currentAddress) {
            // Priority 2: Check connected wallet
            userAddress = window.currentAddress;
            console.log('Using connected wallet for enhanced batch feeding:', userAddress);
        }
        
        if (!userAddress) {
            showToast('Please connect your wallet first', 5000);
            return;
        }
        
        // Check if there are any NFTs
        if (!window.userNFTs || window.userNFTs.length === 0) {
            showToast('You have no pets to feed', 5000);
            return;
        }
        
        // Check if ModalDialog is available
        if (!window.ModalDialog) {
            debug.log('ModalDialog is not available, using legacy method');
            return handleFeedAllPetsLegacy();
        }
        
        try {
            // Use ModalDialog to get user input
            const userInput = await window.ModalDialog.prompt(
                'Please enter the feeding time for each pet (hours):',
                {
                    title: 'Batch Feed All Pets',
                    defaultValue: '24',
                    placeholder: 'Enter hours (1-168)',
                    confirmText: 'Start Feeding',
                    cancelText: 'Cancel'
                }
            );
            
            if (!userInput) {
                showToast('Feeding operation cancelled', 3000);
                return;
            }
            
            const feedingHoursPerNFT = parseInt(userInput);
            if (isNaN(feedingHoursPerNFT) || feedingHoursPerNFT <= 0 || feedingHoursPerNFT > 168) {
                await window.ModalDialog.alert(
                    'Please enter a valid feeding time (1-168 hours)',
                    {
                        title: 'Invalid Input'
                    }
                );
                return handleFeedAllPetsLegacy();
            }
            
            // Show processing message
            showToast(`Preparing batch feed (${feedingHoursPerNFT} hours/pet)...`, 5000);
            
            // Set maximum feeding time limit options
            const options = {
                maxFeedingHours: 168 // Default maximum feeding time is 7 days (168 hours)
            };
            
            // Use the feedAllPets function to batch feed
            const feedingResult = await feedAllPets(window.userNFTs, feedingHoursPerNFT, options);
            
            if (!feedingResult.success) {
                // Check if authorization is needed
                if (feedingResult.needApproval) {
                    try {
                        // Execute authorization automatically without user confirmation
                        showToast('Authorizing PWFOOD token automatically...', 5000);
                        debug.log('Auto-authorizing PWFOOD token for enhanced batch feeding');
                        
                        // Check if ContractApprovalManager is available
                        if (!window.ContractApprovalManager) {
                            debug.log('ContractApprovalManager is not available, trying to load');
                            try {
                                await loadContractScript('../../scripts/other/ContractApprovalManager.js');
                            } catch (error) {
                                debug.error('Failed to load ContractApprovalManager:', error);
                                throw new Error('Failed to load authorization manager');
                            }
                        }
                        
                        const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                            feedingResult.pwfoodContract,
                            feedingResult.feedingManagerAddress,
                            '115792089237316195423570985008687907853269984665640564039457584007913129639935', // Max uint256
                            userAddress,
                            true
                        );
                        
                        if (approvalResult.success) {
                            showToast('Authorization successful, starting batch feed', 3000);
                            debug.log('PWFOOD authorization successful, retrying enhanced batch feed');
                            // Try batch feed again
                            setTimeout(async () => {
                                await handleFeedAllPets();
                            }, 1000);
                        } else {
                            showToast('Authorization failed: ' + (approvalResult.error || 'Unknown error'), 5000);
                            debug.error('PWFOOD authorization failed:', approvalResult.error);
                        }
                    } catch (approvalError) {
                        debug.error('Authorization process error:', approvalError);
                        showToast('Authorization process error: ' + (approvalError.message || 'Unknown error'), 5000);
                    }
                    return;
                }
                
                // Insufficient balance
                if (feedingResult.error && feedingResult.error.includes('Insufficient balance')) {
                    showToast(`PWFOOD balance is insufficient, you need ${feedingResult.requiredAmount} PWFOOD, current balance ${feedingResult.balance} PWFOOD`, 5000);
                    
                    await window.ModalDialog.alert(
                        `<div style="color: #e53935;">
                            <strong>PWFOOD balance is insufficient!</strong><br><br>
                            Required: ${feedingResult.requiredAmount} PWFOOD<br>
                            Current balance: ${feedingResult.balance} PWFOOD
                        </div>`,
                        {
                            title: 'Insufficient balance'
                        }
                    );
                    return;
                }
                
                // 根据筛选的无效NFT显示信息
                if (feedingResult.invalidNfts && feedingResult.invalidNfts.length > 0) {
                    const message = `There are ${feedingResult.invalidNfts.length} pets that have been skipped because the feeding time exceeds the limit`;
                    showToast(message, 5000);
                    debug.log('Skipped pets:', feedingResult.invalidNfts);
                }
                
                // Other errors
                showToast('Batch feed failed: ' + feedingResult.error, 5000);
                return;
            }
            
            // Display success results
            if (feedingResult.successCount > 0) {
                let message = `Successfully fed ${feedingResult.successCount} pets, each ${feedingHoursPerNFT} hours`;
                
                if (feedingResult.failCount > 0) {
                    message += `, failed ${feedingResult.failCount} pets`;
                }
                
                if (feedingResult.skippedCount > 0) {
                    message += `, skipped ${feedingResult.skippedCount} pets (exceeds limit)`;
                }
                
                showToast(message, 5000);
                
                
                await window.ModalDialog.alert(
                    `<div style="color: #4caf50;">
                        <strong>Successfully fed!</strong><br><br>
                        ✅ Successfully fed: ${feedingResult.successCount} pets<br>
                        ${feedingResult.failCount > 0 ? `❌ Failed: ${feedingResult.failCount} pets<br>` : ''}
                        ${feedingResult.skippedCount > 0 ? `⚠️ Skipped: ${feedingResult.skippedCount} pets (exceeds limit)<br>` : ''}
                        ⏱️ Each pet feeding time: ${feedingHoursPerNFT} hours<br>
                        💰 Consumed PWFOOD: ${feedingResult.totalFood}
                    </div>`,
                    {
                        title: 'Feeding results'
                    }
                );
                
                // Refresh NFT display
                setTimeout(() => {
                    if (typeof window.loadUserNFTs === 'function') {
                        window.loadUserNFTs(true);
                    }
                }, 1000);
            } else if (feedingResult.failCount > 0) {
                showToast(`All feeding attempts failed, please check the PWFOOD balance or network status`, 5000);
                
                await window.ModalDialog.alert(
                    `<div style="color: #e53935;">
                        <strong>Feeding failed!</strong><br><br>
                        All ${feedingResult.failCount} pets' feeding attempts failed.<br>
                        Please check your PWFOOD balance or network status and try again.
                    </div>`,
                    {
                        title: 'Feeding failed'
                    }
                );
            }
        } catch (error) {
            debug.error('Batch feed process error:', error);
            showToast('Batch feed failed: ' + (error.message || 'Unknown error'), 5000);
            
            await window.ModalDialog.alert(
                `<div style="color: #e53935;">
                    <strong>Feeding process error</strong><br><br>
                    ${error.message || 'Unknown error'}
                </div>`,
                {
                    title: 'Feeding failed'
                }
            );
        }
    }

    /**
     * Original batch feed all pets method (as a fallback)
     */
    async function handleFeedAllPetsLegacy() {
        // Check wallet connection and get user address
        let userAddress = null;
        
        // Priority 1: Check private key wallet
        if (shouldUsePrivateKeyWallet()) {
            userAddress = window.SecureWalletManager.getAddress();
            console.log('Using private key wallet for legacy batch feeding:', userAddress);
        } else if (window.isWalletConnected && window.currentAddress) {
            // Priority 2: Check connected wallet
            userAddress = window.currentAddress;
            console.log('Using connected wallet for legacy batch feeding:', userAddress);
        }
        
        if (!userAddress) {
            alert('Please connect your wallet first');
            return;
        }
        
        // Check if there are any NFTs
        if (!window.userNFTs || window.userNFTs.length === 0) {
            alert('You have no pets to feed');
            return;
        }
        
        // Prompt user to enter the feeding time
        let feedingHoursPerNFT = 24; // Default feeding time is 24 hours
        const userInputHours = prompt('Please enter the feeding time for each pet (hours):', '24');
        
        if (userInputHours === null) {
            // User cancelled the operation
            showToast('Feeding operation cancelled', 3000);
            return;
        }
        
        const parsedHours = parseInt(userInputHours);
        if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 1000) {
            showToast('Please enter a valid feeding time (1-1000 hours)', 5000);
            return;
        }
        
        feedingHoursPerNFT = parsedHours;
        
        // Show processing message
        showToast(`Preparing batch feed (${feedingHoursPerNFT} hours/pet)...`, 5000);
        
        try {
            // Set maximum feeding time limit options
            const options = {
                maxFeedingHours: 168 // Default maximum feeding time is 7 days (168 hours)
            };
            
            // Use the feedAllPets function to batch feed
            const feedingResult = await feedAllPets(window.userNFTs, feedingHoursPerNFT, options);
            
            if (!feedingResult.success) {
                // Check if authorization is needed
                if (feedingResult.needApproval) {
                    try {
                        // Execute authorization automatically without user confirmation
                        showToast('Authorizing PWFOOD token automatically...', 5000);
                        debug.log('Auto-authorizing PWFOOD token for legacy batch feeding');
                        
                        // Check if ContractApprovalManager is available
                        if (!window.ContractApprovalManager) {
                            debug.log('ContractApprovalManager is not available, trying to load');
                            try {
                                await loadContractScript('../../scripts/other/ContractApprovalManager.js');
                            } catch (error) {
                                debug.error('Failed to load ContractApprovalManager:', error);
                                throw new Error('Failed to load authorization manager');
                            }
                        }
                        
                        const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                            feedingResult.pwfoodContract,
                            feedingResult.feedingManagerAddress,
                            '115792089237316195423570985008687907853269984665640564039457584007913129639935', // Max uint256
                            userAddress,
                            true
                        );
                        
                        if (approvalResult.success) {
                            showToast('Authorization successful, starting batch feed', 3000);
                            debug.log('PWFOOD authorization successful, retrying legacy batch feed');
                            // Try batch feed again
                            setTimeout(async () => {
                                await handleFeedAllPets();
                            }, 1000);
                        } else {
                            showToast('Authorization failed: ' + (approvalResult.error || 'Unknown error'), 5000);
                            debug.error('PWFOOD authorization failed:', approvalResult.error);
                        }
                    } catch (approvalError) {
                        debug.error('Authorization process error:', approvalError);
                        showToast('Authorization process error: ' + (approvalError.message || 'Unknown error'), 5000);
                    }
                    return;
                }
                
                // Insufficient balance
                if (feedingResult.error && feedingResult.error.includes('Insufficient balance')) {
                    showToast(`PWFOOD balance is insufficient, you need ${feedingResult.requiredAmount} PWFOOD, current balance ${feedingResult.balance} PWFOOD`, 5000);
                    alert(`Your PWFOOD balance is insufficient to feed all pets!<br>Required: ${feedingResult.requiredAmount} PWFOOD<br>Current balance: ${feedingResult.balance} PWFOOD`);
                    return;
                }
                
                // Display information for invalid NFTs
                if (feedingResult.invalidNfts && feedingResult.invalidNfts.length > 0) {
                    const message = `There are ${feedingResult.invalidNfts.length} pets that have been skipped because the feeding time exceeds the limit`;
                    showToast(message, 5000);
                    debug.log('Skipped pets:', feedingResult.invalidNfts);
                }
                
                // Other errors
                showToast('Batch feed failed: ' + feedingResult.error, 5000);
                return;
            }
            
            // Display success results
            if (feedingResult.successCount > 0) {
                let message = `Successfully fed ${feedingResult.successCount} pets, each ${feedingHoursPerNFT} hours`;
                
                if (feedingResult.failCount > 0) {
                    message += `, failed ${feedingResult.failCount} pets`;
                }
                
                if (feedingResult.skippedCount > 0) {
                    message += `, skipped ${feedingResult.skippedCount} pets (exceeds limit)`;
                }
                
                showToast(message, 5000);
                alert(`Successfully fed!\n✅ Successfully fed: ${feedingResult.successCount} pets\n${feedingResult.failCount > 0 ? `❌ Failed: ${feedingResult.failCount} pets\n` : ''}${feedingResult.skippedCount > 0 ? `⚠️ Skipped: ${feedingResult.skippedCount} pets (exceeds limit)\n` : ''}⏱️ Each pet feeding time: ${feedingHoursPerNFT} hours\n💰 Consumed PWFOOD: ${feedingResult.totalFood}`);
                
                // Refresh NFT display
                setTimeout(() => {
                    if (typeof window.loadUserNFTs === 'function') {
                        window.loadUserNFTs(true);
                    }
                }, 1000);
            } else if (feedingResult.failCount > 0) {
                showToast(`All feeding attempts failed, please check the PWFOOD balance or network status`, 5000);
                alert(`Feeding failed!\nAll ${feedingResult.failCount} pets' feeding attempts failed.\nPlease check your PWFOOD balance or network status and try again.`);
            }
        } catch (error) {
            debug.error('Batch feed process error:', error);
            showToast('Batch feed failed: ' + (error.message || 'Unknown error'), 5000);
            alert(`Feeding process error\n${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Handle pet feeding operation
     * @param {Object} feedData - Feeding data
     */
    async function handlePetFeeding(feedData) {
        try {
            const { tokenId, feedHours, element } = feedData;
            console.log(`Handling pet feeding: TokenID=${tokenId}, Feeding time=${feedHours} hours`);
            
            // Check wallet connection and get user address
            let userAddress = null;
            
            console.log('[PetFeeding Debug] Checking wallet status...');
            
            // Priority 1: Use WalletNetworkManager if available
            if (window.walletNetworkManager && window.walletNetworkManager.isReadyForContracts()) {
                userAddress = window.walletNetworkManager.getCurrentAddress();
                console.log('[PetFeeding Debug] Using WalletNetworkManager address:', userAddress);
                
                // Ensure Web3 is available from WalletNetworkManager
                if (!window.web3) {
                    const managerWeb3 = window.walletNetworkManager.getWeb3();
                    if (managerWeb3) {
                        window.web3 = managerWeb3;
                        console.log('[PetFeeding Debug] Set Web3 from WalletNetworkManager for feeding');
                    }
                }
            } else {
                console.log('[PetFeeding Debug] WalletNetworkManager not ready, checking fallback options...');
                
                // Fallback: Check if Web3 is available
                if (!window.web3) {
                    console.log('[PetFeeding Debug] No Web3 available');
                    if (window.ModalDialog) {
                        await window.ModalDialog.alert('Please connect your wallet to feed the pet', { title: 'Error', confirmText: 'OK' });
                    } else {
                        alert('Please connect your wallet to feed the pet');
                    }
                    return;
                }
                
                try {
                const accounts = await window.web3.eth.getAccounts();
                userAddress = accounts[0];
                    console.log('[PetFeeding Debug] Got fallback wallet address:', userAddress);
                } catch (error) {
                    console.error('[PetFeeding Debug] Error getting accounts from Web3:', error);
                }
            }
            
            if (!userAddress) {
                console.error('No user address available for feeding');
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('Please connect your wallet to feed the pet', { title: 'Error', confirmText: 'OK' });
                } else {
                    alert('Please connect your wallet to feed the pet');
                }
                return;
            }
            
            console.log('Pet feeding with user address:', userAddress);
            
            // Call feedSinglePet function to handle feeding
            const result = await feedSinglePet(feedData);
            
            if (!result.success) {
                // Check if authorization is needed (this is handled in the feedSinglePet function)
                if (window.ModalDialog) {
                    await window.ModalDialog.alert(`Feeding failed: ${result.error || "Unknown error"}`, { title: 'Error', confirmText: 'OK' });
                } else {
                    alert(`Feeding failed: ${result.error || "Unknown error"}`);
                }
                return;
            }
            
            // Show feeding success message using ModalDialog (consistent with normal mode)
            if (window.ModalDialog) {
                await window.ModalDialog.alert(`Successfully fed for ${feedHours} hours!`, { 
                    title: 'Feeding Success', 
                    confirmText: 'OK' 
                });
            } else if (window.PetCard && window.PetCard.showFeedingMessage) {
                window.PetCard.showFeedingMessage(element, `Successfully fed for ${feedHours} hours!`, "success");
            } else {
                // Fallback to simple alert
                alert(`Successfully fed for ${feedHours} hours!`);
            }
            
            // Update card display
            if (result.feedingInfo) {
                if (window.PetCard && window.PetCard.updatePetSatietyWithFeedingInfo) {
                    window.PetCard.updatePetSatietyWithFeedingInfo(element, result.feedingInfo.feedingHours, result.feedingInfo);
                }
            } else {
                // If no new feeding information is returned, manually calculate
                const currentHours = parseInt(element.dataset.feedingHours) || 0;
                const maxHours = window.PetCard ? (window.PetCard.MAX_FEEDING_HOURS || 168) : 168;
                const newHours = Math.min(currentHours + feedHours, maxHours);
                if (window.PetCard && window.PetCard.updatePetSatiety) {
                    window.PetCard.updatePetSatiety(element, newHours);
                }
            }
        } catch (error) {
            console.error('Error handling pet feeding:', error);
            if (feedData && feedData.element) {
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('Error occurred during feeding', { title: 'Error', confirmText: 'OK' });
                } else {
                    alert('Error occurred during feeding');
                }
            }
        }
    }

    // Helper functions that need to be available in this scope

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
        feedSinglePet,
        feedMultiplePets,
        claimMultipleRewards,
        initFeedingContract,
        feedAllPets,
        checkPWFOODBalance,
        getNFTFeedingInfo,
        handleFeedFriendNFT,
        handleFeedAllPets,
        handlePetFeeding
    };
})();

// Export functions to global scope for use by pets.js
window.handleFeedFriendNFT = PetFeeding.handleFeedFriendNFT;
window.handleFeedAllPets = PetFeeding.handleFeedAllPets;
window.handlePetFeeding = PetFeeding.handlePetFeeding;

// Compatible with CommonJS and browser environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PetFeeding;
} else {
    window.PetFeeding = PetFeeding;
}