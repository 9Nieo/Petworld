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
                    const result = await this.contract.methods.feedNFT(
                        tokenId, 
                        hours
                    ).send({ from: userAddress });
                    
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
                    const result = await this.contract.methods.feedMultipleNFTs(
                        tokenIds, 
                        totalFood
                    ).send({ from: userAddress });
                    
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
                    // If the contract has this method, call it directly
                    if (this.contract.methods.batchCalculateClaimableRewards) {
                        const result = await this.contract.methods.batchCalculateClaimableRewards(tokenIds).call();
                        return {
                            success: true,
                            nftRewards: result.nftRewards,
                            totalRewards: result.totalRewards
                        };
                    }
                    
                    // If there is no batch method, calculate one by one
                    const rewards = [];
                    let totalPwpot = 0;
                    let totalPwbot = 0;
                    
                    for (const tokenId of tokenIds) {
                        try {
                            const result = await this.contract.methods.calculateClaimableRewards(tokenId).call();
                            rewards.push({
                                tokenId,
                                pwpot: parseInt(result.pwpot),
                                pwbot: parseInt(result.pwbot),
                                cycles: parseInt(result.cycles)
                            });
                            
                            totalPwpot += parseInt(result.pwpot);
                            totalPwbot += parseInt(result.pwbot);
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
                    
                    // Call contract batch claim rewards method
                    const result = await this.contract.methods.claimRewards(tokenIds).send({ 
                        from: userAddress,
                        gas: 500000 // Estimated gas usage
                    });
                    
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
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
                    // Request user confirmation for approval
                    const confirmApproval = window.confirm("Authorization for PWFOOD tokens is required to proceed with feeding. Click OK to approve.");
                    if (!confirmApproval) {
                        return { success: false, error: 'User canceled authorization' };
                    }
                    
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
            
            // Check if wallet is connected
            if (!window.web3) {
                throw new Error('Web3 not initialized');
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
                    // Request user confirmation for approval
                    const confirmApproval = window.confirm(`Authorization for PWFOOD tokens is required to proceed with feeding. At least ${totalRequiredFood} PWFOOD are needed. Click OK to approve.`);
                    if (!confirmApproval) {
                        return { success: false, error: 'User canceled authorization' };
                    }
                    
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
            
            // Check if wallet is connected
            if (!window.web3) {
                return { success: false, error: 'Web3 not initialized' };
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
    
    // Export public methods
    return {
        feedSinglePet,
        feedMultiplePets,
        claimMultipleRewards,
        initFeedingContract,
        feedAllPets,
        checkPWFOODBalance,
        getNFTFeedingInfo
    };
})();

// Compatible with CommonJS and browser environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PetFeeding;
} else {
    window.PetFeeding = PetFeeding;
}