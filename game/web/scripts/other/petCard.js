/**
 * Normal mode pet card component
 * Provide pet card creation and interaction functions
 */
const PetCard = (function() {
    // Constant definitions
    const MAX_FEEDING_HOURS = 168; // Maximum feeding hours (7 days)
    const DEFAULT_FEEDING_HOURS = 48; // Default feeding hours
    
    // Level upgrade thresholds
    const LEVEL_2_THRESHOLD = 1000; // Upgrade to level 2 requires 1000 PWFOOD
    const LEVEL_3_THRESHOLD = 3000; // Upgrade to level 3 requires 3000 PWFOOD
    const LEVEL_4_THRESHOLD = 10000; // Upgrade to level 4 requires 10000 PWFOOD
    const LEVEL_5_THRESHOLD = 30000; // Upgrade to level 5 requires 30000 PWFOOD
    const MAX_LEVEL = 5; // Maximum level
    
    // Rewards for each hour of different quality pets
    const QUALITY_REWARDS = {
        'COMMON': { pwpot: 1, pwbot: 2 },
        'GOOD': { pwpot: 10, pwbot: 20 },
        'EXCELLENT': { pwpot: 100, pwbot: 200 },
        'RARE': { pwpot: 800, pwbot: 2000 },
        'LEGENDARY': { pwpot: 5000, pwbot: 15000 }
    };
    
    // Save references to all active pet cards and their timers
    const activeCards = new Map();
    
    /**
     * Get the Chinese display name for the quality
     * @param {string} qualityId - Quality ID
     * @returns {string} Quality name
     */
    function getQualityName(qualityId) {
        const qualityMap = {
            'COMMON': 'Common',
            'GOOD': 'Good',
            'EXCELLENT': 'Excellent',
            'RARE': 'Rare',
            'LEGENDARY': 'Legendary'
        };
        
        return qualityMap[qualityId] || 'Unknown';
    }
    
    /**
     * Get the corresponding style class name for the quality ID
     * @param {string} qualityId - Quality ID
     * @returns {string} Quality corresponding CSS class name
     */
    function getQualityClass(qualityId) {
        const classMap = {
            'COMMON': 'common',
            'GOOD': 'good',
            'EXCELLENT': 'excellent',
            'RARE': 'purple-rare',  
            'LEGENDARY': 'legendary'
        };
        
        return classMap[qualityId] || 'common';
    }
    
    /**
     * Get the rewards information for the corresponding quality
     * @param {string} qualityId - Quality ID
     * @returns {Object} Rewards information
     */
    function getQualityRewards(qualityId) {
        return QUALITY_REWARDS[qualityId] || QUALITY_REWARDS.COMMON;
    }
    

    
    /**
     * Calculate the real feeding hours
     * @param {Object} feedingInfo - Feeding information from the contract
     * @returns {number} The actual remaining feeding hours
     */
    function calculateRealFeedingHours(feedingInfo) {
        if (!feedingInfo) {
            console.error('Failed to calculate feeding hours: Feeding info is empty');
            return 0;
        }
        // Check if the necessary fields exist
        if (feedingInfo.feedingHours === undefined || feedingInfo.lastFeedTime === undefined || feedingInfo.lastClaimTime === undefined) {
            console.error('Failed to calculate feeding hours: Missing necessary fields');
            console.log('Available fields:', Object.keys(feedingInfo).join(', '));
            return feedingInfo.feedingHours || 0;
        }
        
        if (!feedingInfo.isActive) {
            console.log('NFT is not activated for feeding, returning 0 feeding hours');
            return 0;
        }
        
        // Get the current timestamp (seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Get the last feeding time and the last claim time
        const lastFeedTime = parseInt(feedingInfo.lastFeedTime) || 0;
        const lastClaimTime = parseInt(feedingInfo.lastClaimTime) || 0;
        
        // Use the larger value between lastFeedTime and lastClaimTime as the calculation base point
        const lastActionTime = Math.max(lastFeedTime, lastClaimTime);
        
        // The recorded feeding hours in the contract
        const recordedFeedingHours = parseInt(feedingInfo.feedingHours) || 0;
        
        // Output the human-readable format of the timestamp for debugging
        const currentTimeReadable = new Date(currentTime * 1000).toLocaleString();
        const lastFeedTimeReadable = new Date(lastFeedTime * 1000).toLocaleString();
        const lastClaimTimeReadable = new Date(lastClaimTime * 1000).toLocaleString();
        const lastActionTimeReadable = new Date(lastActionTime * 1000).toLocaleString();
        
        // Calculate the elapsed hours (from the last action time)
        let elapsedHours = 0;
        if (currentTime > lastActionTime) {
            elapsedHours = Math.floor((currentTime - lastActionTime) / 3600); 
            console.log(`Since the last operation (${lastActionTime === lastFeedTime ? 'feeding' : 'claim'}) has passed ${elapsedHours} hours`);
        } else {
            console.log('Last operation time is greater than the current time, possibly due to clock synchronization issues, using the recorded feeding hours');
            return recordedFeedingHours;
        }
        
        // Calculate the actual remaining feeding hours (cannot be less than 0)
        const realFeedingHours = Math.max(0, recordedFeedingHours - elapsedHours);
        
        console.log('Feeding hours calculation result:', {
            recordedFeedingHours: `${recordedFeedingHours} hours`, 
            elapsedHours: `${elapsedHours} hours`,
            realFeedingHours: `${realFeedingHours} hours`
        });
        
        return realFeedingHours;
    }
    
    /**
     * Start the auto-update of the pet's feeding hours
     * @param {HTMLElement} card - The card element
     * @param {Object} feedingInfo - The feeding information
     */
    function startSatietyUpdateTimer(card, feedingInfo) {
        if (!card || !feedingInfo) return;
        
        const tokenId = card.dataset.tokenId;
        
        // If there is already a timer running, clear it first
        if (activeCards.has(tokenId)) {
            clearInterval(activeCards.get(tokenId).timer);
        }
        
        // Update the feeding hours display every minute
        const timer = setInterval(() => {
            // Recalculate the actual feeding hours
            const updatedHours = calculateRealFeedingHours(feedingInfo);
            
            // Update the card display
            updatePetSatiety(card, updatedHours);
            
            // If the feeding hours is 0, stop the timer
            if (updatedHours <= 0) {
                clearInterval(timer);
                activeCards.delete(tokenId);
            }
        }, 60000); // Update every minute
        
        // Save the reference to the card and the timer
        activeCards.set(tokenId, { 
            card, 
            timer, 
            feedingInfo
        });
        
        console.log(`Started the auto-update of the feeding hours for NFT #${tokenId}`);
    }
    
    /**
     * Stop all pet feeding hours update timers
     */
    function stopAllSatietyTimers() {
        activeCards.forEach((value, key) => {
            clearInterval(value.timer);
            console.log(`Stopped the auto-update of the feeding hours for NFT #${key}`);
        });
        activeCards.clear();
    }
    
    /**
     * Resume all pet feeding hours update timers
     * Called when the page gains focus again
     */
    function resumeAllSatietyTimers() {
        console.log('Attempting to resume pet feeding hours update timers');
        
        // Get all displayed pet cards
        const petCards = document.querySelectorAll('.pet-card');
        
        if (petCards.length === 0) {
            console.log('No pet cards found, no timers to resume');
            return;
        }
        
        console.log(`Found ${petCards.length} pet cards, starting to resume timers`);
        
        // Iterate through all pet cards, restart the timers
        petCards.forEach(async (card) => {
            const tokenId = card.getAttribute('data-token-id');
            
            if (!tokenId) {
                console.warn('Pet card has no token-id attribute, skipping');
                return;
            }
            
            try {
                // Get the latest feeding information
                const feedingInfo = await tryGetFeedingInfoFromContract(tokenId);
                
                if (!feedingInfo) {
                    console.warn(`Failed to get the feeding information for NFT #${tokenId}, skipping to resume the timer`);
                    return;
                }
                
                // Restart the feeding hours update timer
                startSatietyUpdateTimer(card, feedingInfo);
                console.log(`Resumed the auto-update of the feeding hours for NFT #${tokenId}`);
                
                // Update the displayed feeding hours value
                updatePetSatietyWithFeedingInfo(card, feedingInfo.realFeedingHours, feedingInfo);
            } catch (error) {
                console.error(`Error resuming the feeding hours update timer for NFT #${tokenId}:`, error);
            }
        });
        
        console.log('Pet feeding hours update timers resumed');
    }
    
    /**
     * Try to get the feeding information from the NFTFeedingManager contract
     * @param {string} tokenId - NFT token ID
     * @returns {Promise<Object|null>} Feeding information or null
     */
    async function tryGetFeedingInfoFromContract(tokenId) {
        try {
            console.log(`Attempting to get the feeding information for TokenID=${tokenId}...`);
            
            // Ensure Web3 is initialized
            if (!window.web3) {
                // Try to initialize Web3
                if (window.ethereum) {
                    try {
                        console.log('Attempting to initialize Web3 using window.ethereum');
                        window.web3 = new Web3(window.ethereum);
                    } catch (e) {
                        console.error('Failed to initialize Web3:', e);
                        return null;
                    }
                } else {
                    console.error('Failed to get the feeding information: Web3 is not initialized and window.ethereum is not found');
                    return null;
                }
            }
            
            // Check the contract-related variables
            if (!window.initNFTFeedingManagerContract) {
                console.error('Failed to get the feeding information: Missing initNFTFeedingManagerContract function');
                return null;
            }
            
            // Check if there is a contract address
            if (!window.getContractAddress) {
                console.error('Failed to get the feeding information: Missing getContractAddress function');
                
                // Check if the contract address configuration is available, if available, create the function
                if (window.contractAddresses) {
                    console.log('Found contractAddresses configuration, creating getContractAddress function');
                    window.getContractAddress = function(contractName) {
                        const network = window.currentNetwork || 'MAIN';
                        if (window.contractAddresses[network] && window.contractAddresses[network][contractName]) {
                            return window.contractAddresses[network][contractName];
                        }
                        return null;
                    };
                } else {
                    console.error('contractAddresses configuration is not available');
                    return null;
                }
            }
            
            // Check if the NFTFeedingManager contract address is available
            const nftFeedingManagerAddress = window.getContractAddress('NFTFeedingManager');
            if (!nftFeedingManagerAddress) {
                console.error('Failed to get the feeding information: Unable to get the NFTFeedingManager contract address');
                // Print the current network and available contract addresses for debugging
                console.log('Current network:', window.currentNetwork || 'TEST');
                if (window.contractAddresses) {
                    console.log('Available contract address configuration:', JSON.stringify(window.contractAddresses, null, 2));
                }
                return null;
            }
            
            // Ensure the ABI is loaded
            if (!window.NFTFeedingManagerABI) {
                console.error('Failed to get the feeding information: NFTFeedingManagerABI is not loaded');
                return null;
            }
            
            try {
                // Initialize the contract: First get the base contract instance
                console.log('Preparing to initialize the NFTFeedingManager contract...');
                const baseContract = window.initNFTFeedingManagerContract(window.web3, window.getContractAddress);
                if (!baseContract) {
                    console.error('Failed to get the feeding information: Failed to initialize the NFTFeedingManager contract');
                    return null;
                }
                
                let feedingInfo = null;
                
                // First try to use the nftFeeding method directly of the baseContract
                try {
                    console.log(`Attempting to use the contract directly to call nftFeeding(${tokenId})...`);
                    const rawFeedingData = await baseContract.methods.nftFeeding(tokenId).call();
                    
                    if (rawFeedingData) {
                        console.log(`Obtained the original feeding data for NFT #${tokenId} from the base contract:`, rawFeedingData);
                        
                        // Convert the data format
                        feedingInfo = {
                            feedingHours: parseInt(rawFeedingData.feedingHours) || 0,
                            lastClaimTime: parseInt(rawFeedingData.lastClaimTime) || 0,
                            lastFeedTime: parseInt(rawFeedingData.lastFeedTime) || 0,
                            quality: parseInt(rawFeedingData.quality) || 0,
                            isActive: Boolean(rawFeedingData.isActive),
                            level: parseInt(rawFeedingData.level) || 1,
                            accumulatedFood: parseInt(rawFeedingData.accumulatedFood) || 0
                        };
                        
                        // Calculate the actual feeding hours and update
                        feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                        console.log(`The actual feeding hours calculation result for NFT #${tokenId}: ${feedingInfo.realFeedingHours} hours (original record: ${feedingInfo.feedingHours} hours)`);
                        return feedingInfo;
                    }
                } catch (directError) {
                    console.warn(`Failed to call the nftFeeding method:`, directError);
                    // Continue to try other methods
                }
                
                // Try to use the NFTFeedingManagerContract class (if available)
                if (window.NFTFeedingManagerContract) {
                    try {
                        console.log(`Attempting to use the NFTFeedingManagerContract to get the feeding information...`);
                        const feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                        
                        if (feedingManagerContract && typeof feedingManagerContract.getNFTFeedingInfo === 'function') {
                            console.log(`Calling NFTFeedingManagerContract.getNFTFeedingInfo(${tokenId})...`);
                            feedingInfo = await feedingManagerContract.getNFTFeedingInfo(tokenId);
                            
                            if (feedingInfo) {
                                console.log(`Obtained the information from the NFTFeedingManagerContract:`, feedingInfo);
                                // Calculate the actual feeding hours and update
                                feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                                return feedingInfo;
                            }
                        }
                    } catch (contractError) {
                        console.warn(`Failed to get the feeding information using the NFTFeedingManagerContract:`, contractError);
                        // Continue to try other methods
                    }
                } else {
                    console.warn('The NFTFeedingManagerContract class is not available, trying to use the contract method directly');
                }
                
                // Check the global getNFTFeedingInfo function
                if (typeof window.getNFTFeedingInfo === 'function') {
                    try {
                        console.log(`Attempting to use the global getNFTFeedingInfo function...`);
                        feedingInfo = await window.getNFTFeedingInfo(baseContract, tokenId);
                        
                        if (feedingInfo) {
                            console.log(`Obtained the information using the global function:`, feedingInfo);
                            // Calculate the actual feeding hours and update
                            feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                            return feedingInfo;
                        }
                    } catch (globalFnError) {
                        console.warn(`Failed to use the global getNFTFeedingInfo function:`, globalFnError);
                    }
                }
                
                // Finally, try to manually create a simple get function
                try {
                    console.log(`Attempting to manually create a simple get function...`);
                    
                    // Manually call the nftFeeding mapping of the contract
                    const manualFeedingData = await baseContract.methods.nftFeeding(tokenId).call();
                    if (manualFeedingData) {
                        console.log(`Obtained the feeding data for NFT #${tokenId}:`, manualFeedingData);
                        
                        // Convert the data format
                        feedingInfo = {
                            feedingHours: parseInt(manualFeedingData.feedingHours) || 0,
                            lastClaimTime: parseInt(manualFeedingData.lastClaimTime) || 0,
                            lastFeedTime: parseInt(manualFeedingData.lastFeedTime) || 0,
                            quality: parseInt(manualFeedingData.quality) || 0,
                            isActive: Boolean(manualFeedingData.isActive),
                            level: parseInt(manualFeedingData.level) || 1,
                            accumulatedFood: parseInt(manualFeedingData.accumulatedFood) || 0
                        };
                        
                        // Calculate the actual feeding hours and update
                        feedingInfo.realFeedingHours = calculateRealFeedingHours(feedingInfo);
                        console.log(`The actual feeding hours calculation result for NFT #${tokenId}: ${feedingInfo.realFeedingHours} hours (original record: ${feedingInfo.feedingHours} hours)`);
                        return feedingInfo;
                    }
                } catch (manualError) {
                    console.error(`Failed to get the feeding information manually:`, manualError);
                }
                
                console.error('Tried all possible methods to get the feeding information, but all failed');
                return null;
            } catch (initError) {
                console.error('Failed to initialize the contract or get the feeding information:', initError);
                return null;
            }
        } catch (error) {
            console.error(`Failed to get the feeding information from the contract for NFT #${tokenId}:`, error);
            console.error('Error stack:', error.stack);
            return null;
        }
    }
    
    /**
     * Create a pet card element
     * @param {Object} nft - NFT data object
     * @returns {HTMLElement} The created card element
     */
    async function createPetCard(nft) {
        // Extract data from nft
        const { tokenId, contractAddress, metadata } = nft;
        const name = metadata.name || `Pet #${tokenId}`;
        
        console.log(`========== Start creating the pet card for TokenID=${tokenId} ==========`);
        
        // Use PetNFTService to get the best image URL
        let imageResult;
        try {
            if (window.PetNFTService && typeof window.PetNFTService.getBestPetImageUrl === 'function') {
                console.log(`Using PetNFTService.getBestPetImageUrl to get the image URL`);
                imageResult = await window.PetNFTService.getBestPetImageUrl(nft);
            } else {
                console.log(`PetNFTService is not available, using local image detection logic`);
                // Extract the actual name part from the name (if there is a format like "XXX #123")
                let petName = '';
                if (metadata && metadata.name) {
                    // Remove any possible # and numeric suffixes, only keep the name part
                    petName = metadata.name.split('#')[0].trim();
                    console.log(`Extracted pet name from "${metadata.name}": "${petName}"`);
                }
                
                // If there is no valid name, use tokenId as a fallback
                if (!petName) {
                    petName = tokenId.toString();
                    console.log(`Using tokenId as the pet name: "${petName}"`);
                }
                
                // Build the local image path
                const localImagePath = `/resources/images/pets/${petName}.jpg`;
                console.log(`Attempting to find the local image: ${localImagePath}`);
                
                // Check if the local image exists
                let localImageExists = false;
                try {
                    // Create a hidden Image object to test if the local image exists
                    const testImage = new Image();
                    testImage.style.display = 'none';
                    
                    // Use Promise to wait for the image to load or fail
                    localImageExists = await new Promise((resolve) => {
                        testImage.onload = function() {
                            resolve(true);
                        };
                        testImage.onerror = function() {
                            resolve(false);
                        };
                        // Add a timestamp to avoid cache issues
                        testImage.src = localImagePath + "?t=" + new Date().getTime();
                    });
                    
                    console.log(`Local image check result (${petName}): ${localImageExists ? 'exists' : 'does not exist'}`);
                } catch (error) {
                    console.warn(`Error checking the local image (${petName}):`, error);
                    localImageExists = false;
                }
                
                if (localImageExists) {
                    imageResult = {
                        imageUrl: localImagePath,
                        source: 'local',
                        isLocal: true
                    };
                } else {
                    // Select the image path based on the detection result
                    const networkImageUrl = nft.originalImageUrl || 
                                          (metadata.originalImageUrl ? metadata.originalImageUrl : metadata.image);
                                          
                    imageResult = {
                        imageUrl: networkImageUrl || '/resources/images/pets/pet_placeholder.jpg',
                        source: networkImageUrl ? 'network' : 'placeholder',
                        isLocal: false
                    };
                }
            }
        } catch (error) {
            console.error(`Error getting the image URL:`, error);
            imageResult = {
                imageUrl: '/resources/images/pets/pet_placeholder.jpg',
                source: 'placeholder',
                isLocal: false
            };
        }
        
        console.log(`NFT #${tokenId} - Using image URL: ${imageResult.imageUrl} (source: ${imageResult.source})`);
        
        // Display the image
        const displayImage = imageResult.imageUrl || '/resources/images/pets/pet_placeholder.jpg';
        
        // Get the attribute data
        let quality = 'COMMON';
        let hunger = 100;
        let feedingHours = DEFAULT_FEEDING_HOURS; // Default feeding hours
        let contractFeedingInfo = null;
        let level = 1; // Default level is 1
        let accumulatedFood = 0; // Default accumulated feeding amount
        
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
            metadata.attributes.forEach(attr => {
                if (attr.trait_type === 'Quality') quality = attr.value;
                if (attr.trait_type === 'Hunger') hunger = parseInt(attr.value) || 100;
                if (attr.trait_type === 'FeedingHours') feedingHours = parseInt(attr.value) || DEFAULT_FEEDING_HOURS;
                if (attr.trait_type === 'Level') level = parseInt(attr.value) || 1;
                if (attr.trait_type === 'AccumulatedFood') accumulatedFood = parseInt(attr.value) || 0;
            });
        }
        
        console.log(`Initial data from metadata - TokenID=${tokenId}:`, {
            quality, 
            hunger, 
            initialFeedingHours: feedingHours,
            level,
            accumulatedFood
        });
        
        // Try to get the actual feeding information from the contract
        console.log(`Attempting to get the feeding information for TokenID=${tokenId}...`);
        contractFeedingInfo = await tryGetFeedingInfoFromContract(tokenId);
        
        if (contractFeedingInfo) {
            console.log(`Successfully got the feeding information for TokenID=${tokenId}:`, contractFeedingInfo);
            // If the contract data is successfully obtained, use the real satiety
            const oldFeedingHours = feedingHours;
            feedingHours = contractFeedingInfo.realFeedingHours;
            // Update the level and accumulated feeding amount
            if (contractFeedingInfo.level) level = contractFeedingInfo.level;
            if (contractFeedingInfo.accumulatedFood) accumulatedFood = contractFeedingInfo.accumulatedFood;
            console.log(`The satiety for TokenID=${tokenId} has been updated: ${oldFeedingHours} hours -> ${feedingHours} hours (contract record: ${contractFeedingInfo.feedingHours} hours)`);
            console.log(`The level for TokenID=${tokenId} is ${level}, the accumulated feeding amount is ${accumulatedFood}`);
        } else {
            console.log(`Failed to get the feeding information for TokenID=${tokenId}, using the default value: ${feedingHours} hours`);
        }
        
        // Ensure the satiety and feeding hours are within a reasonable range
        hunger = Math.max(0, Math.min(100, hunger));
        feedingHours = Math.max(0, Math.min(MAX_FEEDING_HOURS, feedingHours));
        
        // Satiety percentage = current feeding hours / maximum feeding hours * 100
        const satietyPercent = Math.round((feedingHours / MAX_FEEDING_HOURS) * 100);
        
        // Calculate the level progress
        const levelProgress = calculateLevelProgress(level, accumulatedFood);
        
        console.log(`The final satiety for TokenID=${tokenId}: ${feedingHours} hours, the satiety percentage: ${satietyPercent}%`);
        console.log(`The level progress for TokenID=${tokenId}: ${levelProgress.percent}% (${accumulatedFood}/${levelProgress.target})`);
        
        // Get the corresponding style class name
        const qualityClass = getQualityClass(quality);
        
        // Get the reward information
        const rewards = getQualityRewards(quality);
        
        // Create the card element
        const card = document.createElement('div');
        card.className = `pet-card ${qualityClass}`;
        card.dataset.tokenId = tokenId;
        card.dataset.contractAddress = contractAddress;
        card.dataset.quality = quality;
        card.dataset.feedingHours = feedingHours;
        card.dataset.level = level;
        card.dataset.accumulatedFood = accumulatedFood;
        
        // Save the image information to the dataset
        if (imageResult.imageUrl) {
            card.dataset.originalImageUrl = nft.originalImageUrl || metadata.image || imageResult.imageUrl;
            card.dataset.imageUrl = imageResult.imageUrl;
            card.dataset.imageSource = imageResult.source;
            card.dataset.isLocalImage = imageResult.isLocal ? 'true' : 'false';
        }
        
        // Calculate the maximum hours that can be fed
        const maxFeedHours = MAX_FEEDING_HOURS - feedingHours;
        
        // Build the card HTML - Modify the button name, from "出售" to "领取奖励"
        card.innerHTML = `
            <span class="pet-quality">${getQualityName(quality)}</span>
            <div class="pet-image">
                <img src="${displayImage}" alt="${name}">
            </div>
            <div class="pet-info">
                <div class="pet-header">
                    <h4 title="${name}">${name} <span class="pet-level">Lv.${level}</span></h4>
                    <div class="pet-id">ID: ${tokenId}</div>
                </div>
                
                <div class="pet-satiety">
                    <div class="satiety-label">Satiety: ${satietyPercent}%</div>
                    <div class="satiety-bar">
                        <div class="satiety-value" style="width: ${satietyPercent}%"></div>
                    </div>
                    <div class="satiety-detail">${feedingHours}/${MAX_FEEDING_HOURS} hours</div>
                </div>
                
                <div class="pet-level-progress">
                    <div class="level-label">Level progress: ${levelProgress.percent}%</div>
                    <div class="level-bar">
                        <div class="level-value" style="width: ${levelProgress.percent}%"></div>
                    </div>
                    <div class="level-detail">${accumulatedFood}/${levelProgress.target} PWFOOD</div>
                </div>
                
                <div class="pet-rewards">
                    <div class="rewards-title">Rewards per hour:</div>
                    <div class="rewards-detail">
                        <span class="pwpot-reward">${rewards.pwpot} PWPOT</span>
                        <span class="pwbot-reward">${rewards.pwbot} PWBOT</span>
                    </div>
                </div>
            </div>
            <div class="pet-actions">
                <button class="pet-btn pet-feed-btn">Feed</button>
                <button class="pet-btn pet-claim-btn">Claim rewards</button>
            </div>
        `;
        
        // Bind events
        initCardInteractions(card);
        
        // If there is valid contract feeding information, start the timer to update
        if (contractFeedingInfo && contractFeedingInfo.isActive && contractFeedingInfo.realFeedingHours > 0) {
            startSatietyUpdateTimer(card, contractFeedingInfo);
        }
        
        return card;
    }
    
    /**
     * Initialize the card interaction functionality
     * @param {HTMLElement} card - The card element
     */
    function initCardInteractions(card) {
        // Get the buttons in the card
        const claimBtn = card.querySelector('.pet-claim-btn');
        const feedBtn = card.querySelector('.pet-feed-btn');
        const contractLink = card.querySelector('.contract-address');
        
        // Claim rewards button click (original sell button)
        if (claimBtn) {
            claimBtn.addEventListener('click', async function() {
                const tokenId = card.dataset.tokenId;
                const contractAddress = card.dataset.contractAddress;
                const quality = card.dataset.quality;
                console.log(`Claim pet rewards: TokenID ${tokenId}, contract ${contractAddress}`);
                
                // Check wallet connection
                if (!window.web3) {
                    if (window.ethereum) {
                        try {
                            console.log('Attempting to initialize Web3 using window.ethereum');
                            window.web3 = new Web3(window.ethereum);
                        } catch (e) {
                            console.error('Failed to initialize Web3:', e);
                            return;
                        }
                    } else {
                        console.log('No Web3 environment detected, please install MetaMask wallet');
                        return;
                    }
                }
                
                try {
                    // Get the user address
                    const accounts = await window.web3.eth.getAccounts();
                    const userAddress = accounts[0];
                    
                    if (!userAddress) {
                        console.log('Please connect your wallet to claim rewards');
                        return;
                    }
                    
                    // Get the feeding information
                    let feedingInfo = null;
                    let feedingContract = null;
                    
                    // First check if we can directly use nftFeedingManagerContract
                    if (window.nftFeedingManagerContract) {
                        console.log('Using the global nftFeedingManagerContract');
                        // Create a temporary wrapper object
                        feedingContract = {
                            contract: window.nftFeedingManagerContract,
                            getNFTFeedingInfo: async function(tokenId) {
                                try {
                                    const data = await window.nftFeedingManagerContract.methods.nftFeeding(tokenId).call();
                                    return {
                                        feedingHours: parseInt(data.feedingHours) || 0,
                                        lastClaimTime: parseInt(data.lastClaimTime) || 0,
                                        lastFeedTime: parseInt(data.lastFeedTime) || 0,
                                        quality: parseInt(data.quality) || 0,
                                        isActive: Boolean(data.isActive),
                                        accumulatedCycles: parseInt(data.accumulatedCycles) || 0,
                                        realFeedingHours: parseInt(data.feedingHours) || 0
                                    };
                                } catch (error) {
                                    console.error(`Failed to get the feeding information for NFT (ID:${tokenId}):`, error);
                                    return null;
                                }
                            }
                        };
                        
                        // Get the feeding information, check if there are rewards to claim
                        feedingInfo = await feedingContract.getNFTFeedingInfo(tokenId);
                    } 
                    // If there is no nftFeedingManagerContract, try using the NFTFeedingManagerContract class
                    else if (window.NFTFeedingManagerContract) {
                        console.log('Creating a new NFTFeedingManagerContract instance');
                        
                        // Check if the global feedingManagerContract instance has been initialized
                        if (!window.feedingManagerContract) {
                            window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                        }
                        
                        // Create a local contract instance
                        feedingContract = new window.NFTFeedingManagerContract(window.web3);
                        
                        // Check if the contract instance is valid
                        if (!feedingContract || !feedingContract.contract) {
                            console.error('Invalid contract instance:', feedingContract);
                            return;
                        }
                        
                        // Get the feeding information
                        feedingInfo = await feedingContract.getNFTFeedingInfo(tokenId);
                    } else {
                        console.error('Failed to get the NFTFeedingManager contract');
                        return;
                    }
                    
                    // Check the feeding information
                    if (!feedingInfo) {
                        console.error('Failed to get the feeding information');
                        return;
                    }
                    
                    if (!feedingInfo.isActive) {
                        console.log('This pet is not activated for feeding');
                        return;
                    }
                    
                    // Check if there are rewards to claim
                    const currentTime = Math.floor(Date.now() / 1000);
                    const lastClaimTime = parseInt(feedingInfo.lastClaimTime) || 0;
                    const accumulatedCycles = parseInt(feedingInfo.accumulatedCycles) || 0;
                    
                    if (currentTime <= lastClaimTime && accumulatedCycles === 0) {
                        console.log('No rewards to claim');
                        return;
                    }
                    
                    // Calculate the reward parameters
                    // Calculate the number of hours since the last claim
                    const elapsedSeconds = currentTime - lastClaimTime;
                    const elapsedHours = Math.floor(elapsedSeconds / 3600);
                    
                    // Try using PetRewards to calculate the exact reward value
                    let estimatedPwpot = 0;
                    let estimatedPwbot = 0;
                    let rewardHours = 0;
                    let useAccumulatedCycles = false;
                    let baseRewardPwpot = 0;
                    let baseRewardPwbot = 0;
                    
                    // First check if PetRewards service can be used
                    if (window.PetRewards && typeof window.PetRewards.getRewardsForNFT === 'function') {
                        try {
                            console.log('Using PetRewards to calculate the reward');
                            const rewardsResult = await window.PetRewards.getRewardsForNFT(tokenId);
                            
                            if (rewardsResult && rewardsResult.success) {
                                console.log('PetRewards calculation result:', rewardsResult);
                                
                                // Get the base reward value from the PetRewards result
                                // Check if the level multiplier is already included, if so, divide by the level to get the base value
                                const nftLevel = parseInt(card.dataset.level) || 1;
                                
                                // If the PetRewards result is already the final reward considering the level multiplier, calculate the base reward
                                if (rewardsResult.includesLevelMultiplier) {
                                    estimatedPwpot = rewardsResult.pwpot || 0;
                                    estimatedPwbot = rewardsResult.pwbot || 0;
                                    baseRewardPwpot = estimatedPwpot / nftLevel;
                                    baseRewardPwbot = estimatedPwbot / nftLevel;
                                } else {
                                    // If the PetRewards result is the base reward, apply the level multiplier
                                    baseRewardPwpot = rewardsResult.pwpot || 0;
                                    baseRewardPwbot = rewardsResult.pwbot || 0;
                                    estimatedPwpot = baseRewardPwpot * nftLevel;
                                    estimatedPwbot = baseRewardPwbot * nftLevel;
                                }
                                
                                rewardHours = rewardsResult.cycles || 0;
                                useAccumulatedCycles = true;
                                
                                console.log(`PetRewards reward calculation: base reward PWPOT=${baseRewardPwpot}, PWBOT=${baseRewardPwbot}, level=${nftLevel}, final reward PWPOT=${estimatedPwpot}, PWBOT=${estimatedPwbot}`);
                                
                                // Record the accumulated cycles information
                                if (rewardsResult.accumulatedCycles) {
                                    console.log(`Includes accumulated cycles: ${rewardsResult.accumulatedCycles}`);
                                }
                            } else {
                                console.warn('PetRewards calculation failed, using local calculation:', rewardsResult?.error || 'Unknown error');
                            }
                        } catch (rewardsError) {
                            console.error('Error calling PetRewards to calculate the reward:', rewardsError);
                        }
                    }
                    
                    // If PetRewards calculation fails, use a simple local calculation method (with support for accumulatedCycles)
                    if (!useAccumulatedCycles) {
                        console.log('Using local method to calculate the reward');
                        
                        // Get the reward rate corresponding to the quality
                        const rewards = getQualityRewards(quality);
                        
                        // The accumulated cycles are used as the base reward time
                        let totalCycles = accumulatedCycles;
                        
                        // Add the current generated cycles (if any)
                        if (elapsedHours > 0) {
                            totalCycles += elapsedHours;
                        }
                        
                        // Use the total cycles to calculate
                        rewardHours = totalCycles;
                        
                        // Get the current level of the pet
                        const nftLevel = parseInt(card.dataset.level) || 1;
                        
                        // Calculate the reward based on the accumulated cycles and the current cycles, and apply the level multiplier
                        const baseRewardPwpot = rewards.pwpot * totalCycles;
                        const baseRewardPwbot = rewards.pwbot * totalCycles;
                        
                        // Each level increase, the reward increases by double (level as a direct multiplier)
                        estimatedPwpot = baseRewardPwpot * nftLevel;
                        estimatedPwbot = baseRewardPwbot * nftLevel;
                        
                        console.log(`Reward calculation: base reward PWPOT=${baseRewardPwpot}, PWBOT=${baseRewardPwbot}, level=${nftLevel}, final reward PWPOT=${estimatedPwpot}, PWBOT=${estimatedPwbot}`);
                        
                        // If there are accumulated cycles, also mark it as using accumulated cycles
                        if (accumulatedCycles > 0) {
                            useAccumulatedCycles = true;
                            console.log(`Local calculation includes accumulated cycles: ${accumulatedCycles}`);
                        }
                    }
                    
                    // If there are no rewards to claim, display a prompt and return
                    if (rewardHours <= 0 && estimatedPwpot <= 0 && estimatedPwbot <= 0) {
                        await ModalDialog.alert('No rewards to claim', { title: '提示', confirmText: '确定' });
                        return;
                    }
                    
                    // Prepare the popup data
                    const nftData = {
                        id: tokenId,
                        name: card.querySelector('.pet-header h4').textContent,
                        imageUrl: card.querySelector('.pet-image img').src,
                        quality: quality,
                        level: parseInt(card.dataset.level) || 1 // Add level information
                    };
                    
                    const rewardData = {
                        startTime: new Date(lastClaimTime * 1000),
                        endTime: new Date(currentTime * 1000),
                        hours: rewardHours,
                        pwpot: estimatedPwpot,
                        pwbot: estimatedPwbot,
                        useAccumulatedCycles: useAccumulatedCycles,
                        baseRewardPwpot: baseRewardPwpot || (estimatedPwpot / (parseInt(card.dataset.level) || 1)), // Base reward (not including level multiplier)
                        baseRewardPwbot: baseRewardPwbot || (estimatedPwbot / (parseInt(card.dataset.level) || 1))  // Base reward (not including level multiplier)
                    };
                    
                    // Check if the reward claim popup script has been loaded
                    if (!window.RewardClaimModal) {
                        console.log('Reward claim popup not loaded, trying to load the script');
                        
                        // Create and load the script
                        const scriptElement = document.createElement('script');
                        scriptElement.src = '../../scripts/other/rewardClaimModal.js';
                        document.head.appendChild(scriptElement);
                        
                        // Wait for the script to load
                        await new Promise((resolve) => {
                            scriptElement.onload = resolve;
                            // Set a timeout to prevent infinite waiting
                            setTimeout(resolve, 3000);
                        });

                        // Additional wait time to ensure the script is initialized
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    // Load the style file (if it doesn't exist)
                    if (!document.querySelector('link[href*="rewardClaimModal.css"]')) {
                        const cssLink = document.createElement('link');
                        cssLink.rel = 'stylesheet';
                        cssLink.href = '../../css/other/rewardClaimModal.css';
                        document.head.appendChild(cssLink);
                        
                        // Add additional inline styles
                        const extraStyles = document.createElement('style');
                        extraStyles.textContent = `
                            .reward-formula {
                                font-size: 12px;
                                color: #888;
                                margin-top: 4px;
                                font-style: italic;
                            }
                            
                            .reward-item {
                                margin-bottom: 12px;
                            }
                            
                            #rewardClaimModal .nft-level {
                                color: #f5a623;
                                font-weight: bold;
                            }
                        `;
                        document.head.appendChild(extraStyles);
                    }
                    
                    // Create the DOM elements for the popup (if they don't exist)
                    if (!document.getElementById('rewardModalOverlay')) {
                        const modalHTML = `
                            <div id="rewardModalOverlay" class="modal-overlay hidden">
                                <div id="rewardClaimModal" class="reward-claim-modal hidden">
                                    <div class="modal-content">
                                        <span class="close-btn">&times;</span>
                                        
                                        <h3 class="modal-title">Claim rewards confirmation</h3>
                                        
                                        <div class="nft-info">
                                            <div class="nft-image">
                                                <img src="" alt="NFT image" id="nftModalImage">
                                            </div>
                                            <div class="nft-details">
                                                <h4 class="nft-name" id="nftModalName">NFT name</h4>
                                                <p class="nft-id" id="nftModalId">ID: #000000</p>
                                                <p class="nft-quality" id="nftModalQuality">Quality: Common</p>
                                                <p class="nft-level" id="nftModalLevel">Level: Lv.1</p>
                                            </div>
                                        </div>
                                        
                                        <div class="reward-info">
                                            <h4>Estimated rewards</h4>
                                            
                                            <div class="reward-period">
                                                <span>Reward calculation period: </span>
                                                <span class="reward-start-time" id="rewardStartTime">-</span>
                                                <span> to </span>
                                                <span class="reward-end-time" id="rewardEndTime">-</span>
                                            </div>
                                            
                                            <div class="reward-hours">
                                                <span>Accumulated duration: </span>
                                                <span class="hours-value" id="rewardHours">0</span>
                                                <span> hours</span>
                                            </div>
                                            
                                            <div class="reward-amounts">
                                                <div class="reward-item">
                                                    <span class="reward-icon">🪙</span>
                                                    <div>
                                                        <span class="reward-name">PWPOT:</span>
                                                        <span class="reward-value" id="pwpotReward">0</span>
                                                        <div class="reward-formula" id="pwpotFormula">Base: 0 × level(1) = 0</div>
                                                    </div>
                                                </div>
                                                
                                                <div class="reward-item">
                                                    <span class="reward-icon">💎</span>
                                                    <div>
                                                        <span class="reward-name">PWBOT:</span>
                                                        <span class="reward-value" id="pwbotReward">0</span>
                                                        <div class="reward-formula" id="pwbotFormula">Base: 0 × level(1) = 0</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div id="errorMessage" class="error-message hidden">
                                            An error occurred while processing the request. Please try again later.
                                        </div>
                                        
                                        <div class="modal-actions">
                                            <button id="cancelClaimBtn" class="cancel-btn">Cancel</button>
                                            <button id="confirmClaimBtn" class="confirm-btn">Confirm</button>
                                        </div>
                                        
                                        <div id="loadingIndicator" class="loading-indicator hidden">
                                            <div class="spinner"></div>
                                            <p>Processing, please wait...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = modalHTML;
                        document.body.appendChild(tempDiv.firstElementChild);
                        
                        // Give the DOM elements some time to render
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // If RewardClaimModal still doesn't exist, try to manually initialize it
                    if (!window.RewardClaimModal) {
                        console.log('Attempting to manually initialize the RewardClaimModal object');
                        
                        // Define a simple version of the RewardClaimModal object
                        window.RewardClaimModal = {
                            open: function(nftData, rewardData) {
                                console.log('Using inline implementation of RewardClaimModal');
                                
                                // Get the DOM elements
                                const modalOverlay = document.getElementById('rewardModalOverlay');
                                const modal = document.getElementById('rewardClaimModal');
                                const closeBtn = document.querySelector('.close-btn');
                                const cancelBtn = document.getElementById('cancelClaimBtn');
                                const confirmBtn = document.getElementById('confirmClaimBtn');
                                
                                // NFT information elements
                                const nftImage = document.getElementById('nftModalImage');
                                const nftName = document.getElementById('nftModalName');
                                const nftId = document.getElementById('nftModalId');
                                const nftQuality = document.getElementById('nftModalQuality');
                                const nftLevel = document.getElementById('nftModalLevel');
                                
                                // Reward information elements
                                const rewardStartTime = document.getElementById('rewardStartTime');
                                const rewardEndTime = document.getElementById('rewardEndTime');
                                const rewardHours = document.getElementById('rewardHours');
                                const pwpotReward = document.getElementById('pwpotReward');
                                const pwbotReward = document.getElementById('pwbotReward');
                                const pwpotFormula = document.getElementById('pwpotFormula');
                                const pwbotFormula = document.getElementById('pwbotFormula');
                                
                                // Fill NFT information
                                if (nftImage) nftImage.src = nftData.imageUrl || '';
                                if (nftName) nftName.textContent = nftData.name || 'NFT';
                                if (nftId) nftId.textContent = `ID: #${nftData.id || '000000'}`;
                                
                                // Set quality
                                const qualityMap = {
                                    'COMMON': 'Common',
                                    'GOOD': 'Good',
                                    'EXCELLENT': 'Excellent',
                                    'RARE': 'Rare',
                                    'LEGENDARY': 'Legendary'
                                };
                                const qualityText = qualityMap[nftData.quality] || 'Common';
                                if (nftQuality) nftQuality.textContent = `Quality: ${qualityText}`;
                                
                                // Set level
                                if (nftLevel) nftLevel.textContent = `Level: Lv.${nftData.level || 1}`;
                                
                                // Fill reward information
                                function formatDate(date) {
                                    if (!date) return '-';
                                    const d = new Date(date);
                                    if (isNaN(d.getTime())) return '-';
                                    return d.toLocaleString();
                                }
                                
                                if (rewardStartTime) rewardStartTime.textContent = formatDate(rewardData.startTime);
                                if (rewardEndTime) rewardEndTime.textContent = formatDate(rewardData.endTime);
                                if (rewardHours) rewardHours.textContent = rewardData.hours.toFixed(2);
                                if (pwpotReward) pwpotReward.textContent = rewardData.pwpot.toFixed(4);
                                if (pwbotReward) pwbotReward.textContent = rewardData.pwbot.toFixed(4);
                                
                                // Display the reward calculation formula
                                if (pwpotFormula) {
                                    const baseReward = rewardData.baseRewardPwpot.toFixed(2);
                                    const level = nftData.level || 1;
                                    const total = rewardData.pwpot.toFixed(2);
                                    pwpotFormula.textContent = `Base: ${baseReward} × level(${level}) = ${total}`;
                                }
                                
                                if (pwbotFormula) {
                                    const baseReward = rewardData.baseRewardPwbot.toFixed(2);
                                    const level = nftData.level || 1;
                                    const total = rewardData.pwbot.toFixed(2);
                                    pwbotFormula.textContent = `Base: ${baseReward} × level(${level}) = ${total}`;
                                }
                                
                                // Bind button events
                                if (closeBtn) {
                                    closeBtn.onclick = function() {
                                        modalOverlay.classList.add('hidden');
                                        modal.classList.add('hidden');
                                    };
                                }
                                
                                if (cancelBtn) {
                                    cancelBtn.onclick = function() {
                                        modalOverlay.classList.add('hidden');
                                        modal.classList.add('hidden');
                                    };
                                }
                                
                                if (confirmBtn) {
                                    confirmBtn.onclick = function() {
                                        // Hide the popup
                                        modalOverlay.classList.add('hidden');
                                        modal.classList.add('hidden');
                                        
                                        // If there is a callback function, execute it
                                        if (window.onRewardClaimed && typeof window.onRewardClaimed === 'function') {
                                            window.onRewardClaimed(nftData.id);
                                        }
                                    };
                                }
                                
                                // Click the background to close the popup
                                if (modalOverlay) {
                                    modalOverlay.onclick = function(event) {
                                        if (event.target === modalOverlay) {
                                            modalOverlay.classList.add('hidden');
                                            modal.classList.add('hidden');
                                        }
                                    };
                                }
                                
                                // Display the popup
                                if (modalOverlay && modal) {
                                    modalOverlay.classList.remove('hidden');
                                    setTimeout(() => {
                                        modal.classList.remove('hidden');
                                    }, 10);
                                }
                            },
                            
                            close: function() {
                                const modalOverlay = document.getElementById('rewardModalOverlay');
                                const modal = document.getElementById('rewardClaimModal');
                                
                                if (modalOverlay) modalOverlay.classList.add('hidden');
                                if (modal) modal.classList.add('hidden');
                            }
                        };
                    }
                    
                    // Check if there is already a reward claim popup object
                    if (window.RewardClaimModal && typeof window.RewardClaimModal.open === 'function') {
                        // Custom popup confirmation behavior
                        window.onRewardClaimed = async function(tokenId) {
                            try {
                                // Check the authorization status of the PwPointManager contract
                                const pwPointAddress = window.getContractAddress('PwPoint');
                                const pwPointManagerAddress = window.getContractAddress('PwPointManager');
                                
                                if (!pwPointAddress || !pwPointManagerAddress) {
                                    console.error('Unable to get PwPoint or PwPointManager contract address');
                                    return;
                                }
                                
                                // Create a PwPoint contract instance
                                const pwPointABI = window.PwPointABI || window.GENERIC_ERC20_ABI;
                                if (!pwPointABI) {
                                    console.error('Unable to get PwPoint ABI');
                                    return;
                                }
                                
                                const pwPointContract = new window.web3.eth.Contract(pwPointABI, pwPointAddress);
                                
                                // Check the authorization status
                                const allowance = await pwPointContract.methods.allowance(userAddress, pwPointManagerAddress).call();
                                const requiredAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 最大值
                                
                                console.log(`PwPoint authorization status: allowance=${allowance}`);
                                
                                if (window.web3.utils.toBN(allowance).lt(window.web3.utils.toBN(requiredAmount))) {
                                    console.log('Need to authorize the PwPoint contract, please confirm in the popup');
                                    
                                    // Use ModalDialog to confirm PwPoint authorization
                                    const approvalConfirm = await ModalDialog.confirm(
                                        'Need to authorize the PWPoint token to claim rewards. Click "Confirm" to proceed.',
                                        { title: 'Authorization Prompt', confirmText: 'Confirm', cancelText: 'Cancel' }
                                    );
                                    if (approvalConfirm.action !== 'confirm') {
                                        await ModalDialog.alert('Authorization operation cancelled', { title: 'Error', confirmText: 'Confirm' });
                                        return;
                                    }
                                    
                                    try {
                                        // Execute authorization
                                        const gasEstimate = await pwPointContract.methods.approve(pwPointManagerAddress, requiredAmount).estimateGas({
                                            from: userAddress
                                        });
                                        
                                        const approveTransaction = await pwPointContract.methods.approve(pwPointManagerAddress, requiredAmount).send({
                                            from: userAddress,
                                            gas: Math.floor(gasEstimate * 1.5) // Add 50% gas as a buffer
                                        });
                                        
                                        console.log('PwPoint authorization successful:', approveTransaction);
                                        await ModalDialog.alert('Authorization successful, claiming rewards...', { title: 'Success', confirmText: 'Confirm' });
                                    } catch (approveError) {
                                        console.error('PwPoint authorization failed:', approveError);
                                        await ModalDialog.alert('Authorization failed: ' + (approveError.message || "Unknown error"), { title: 'Error', confirmText: 'Confirm' });
                                        return;
                                    }
                                }
                            } catch (allowanceError) {
                                console.error('Check PwPoint authorization failed:', allowanceError);
                                // Continue execution, try to claim rewards
                            }
                            
                            // Display the claim in progress prompt
                            await ModalDialog.alert('Claiming rewards...', { title: 'Claim in progress', confirmText: 'Confirm' });
                            
                            // Call the contract to claim rewards
                            let tx;
                            if (feedingContract && feedingContract.contract) {
                                tx = await feedingContract.contract.methods.claimRewards([tokenId]).send({
                                    from: userAddress,
                                    gas: 300000
                                });
                            } else if (window.nftFeedingManagerContract) {
                                tx = await window.nftFeedingManagerContract.methods.claimRewards([tokenId]).send({
                                    from: userAddress,
                                    gas: 300000
                                });
                            } else {
                                throw new Error('Unable to find a valid contract instance');
                            }
                            
                            console.log("Rewards claimed successfully:", tx);
                            await ModalDialog.alert('Rewards claimed successfully!', { title: 'Success', confirmText: 'Confirm' });
                            
                            // Update the feeding information
                            const updatedFeedingInfo = await feedingContract.getNFTFeedingInfo(tokenId);
                            if (updatedFeedingInfo) {
                                // Update the card display
                                if (updatedFeedingInfo.realFeedingHours !== undefined) {
                                    updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.realFeedingHours, updatedFeedingInfo);
                                } else {
                                    updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.feedingHours, updatedFeedingInfo);
                                }
                            }
                            
                            // Trigger a custom event to notify that rewards have been claimed
                            const claimEvent = new CustomEvent('petcard.claim', {
                                detail: {
                                    tokenId: tokenId,
                                    contractAddress: contractAddress,
                                    transaction: tx,
                                    element: card
                                },
                                bubbles: true
                            });
                            card.dispatchEvent(claimEvent);
                        };
                        
                        // Open the reward claim popup
                        window.RewardClaimModal.open(nftData, rewardData);
                    } else {
                        console.error('Unable to find the RewardClaimModal object, fallback to traditional confirmation');
                        
                        // Traditional confirmation (backup)
                        const nftLevel = parseInt(card.dataset.level) || 1;
                        
                        // Use ModalDialog to confirm reward claim
                        const confirmRes = await ModalDialog.confirm(
                            `Estimated reward:\n\nTime period: ${new Date(lastClaimTime * 1000).toLocaleString()} to ${new Date(currentTime * 1000).toLocaleString()}\nAccumulated duration: ${rewardHours} hours\nLevel: Lv.${nftLevel}\nEstimated PWPOT: ${estimatedPwpot.toFixed(2)} (base ${baseRewardPwpot.toFixed(2)} × level ${nftLevel})\nEstimated PWBOT: ${estimatedPwbot.toFixed(2)} (base ${baseRewardPwbot.toFixed(2)} × level ${nftLevel})\n\nAre you sure you want to claim the rewards for the current pet?`,
                            { title: 'Claim rewards confirmation', confirmText: 'Confirm', cancelText: 'Cancel' }
                        );
                        if (confirmRes.action !== 'confirm') return;
                        
                        // Check the authorization status of the PwPointManager contract
                        try {
                            const pwPointAddress = window.getContractAddress('PwPoint');
                            const pwPointManagerAddress = window.getContractAddress('PwPointManager');
                            
                            if (!pwPointAddress || !pwPointManagerAddress) {
                                console.error('Unable to get PwPoint or PwPointManager contract address');
                                return;
                            }
                            
                            // Create a PwPoint contract instance
                            const pwPointABI = window.PwPointABI || window.GENERIC_ERC20_ABI;
                            if (!pwPointABI) {
                                console.error('Unable to get PwPoint ABI');
                                return;
                            }
                            
                            const pwPointContract = new window.web3.eth.Contract(pwPointABI, pwPointAddress);
                            
                            // Check the authorization status
                            const allowance = await pwPointContract.methods.allowance(userAddress, pwPointManagerAddress).call();
                            const requiredAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 最大值
                            
                            console.log(`PwPoint authorization status: allowance=${allowance}`);
                            
                            if (window.web3.utils.toBN(allowance).lt(window.web3.utils.toBN(requiredAmount))) {
                                await ModalDialog.alert('Need to authorize the PwPoint contract, please confirm in the popup', { title: 'Prompt', confirmText: 'Confirm' });
                                
                                // Use ModalDialog to confirm PwPoint authorization
                                const approvalConfirm = await ModalDialog.confirm(
                                    'Need to authorize the PWPoint token to claim rewards. Click "Confirm" to proceed.',
                                    { title: 'Authorization Prompt', confirmText: 'Confirm', cancelText: 'Cancel' }
                                );
                                if (approvalConfirm.action !== 'confirm') {
                                    await ModalDialog.alert('Authorization operation cancelled', { title: 'Error', confirmText: 'Confirm' });
                                    return;
                                }
                                
                                try {
                                    // Execute authorization
                                    const gasEstimate = await pwPointContract.methods.approve(pwPointManagerAddress, requiredAmount).estimateGas({
                                        from: userAddress
                                    });
                                    
                                    const approveTransaction = await pwPointContract.methods.approve(pwPointManagerAddress, requiredAmount).send({
                                        from: userAddress,
                                        gas: Math.floor(gasEstimate * 1.5) // Add 50% gas as a buffer
                                    });
                                    
                                    console.log('PwPoint authorization successful:', approveTransaction);
                                    await ModalDialog.alert('Authorization successful, claiming rewards...', { title: 'Success', confirmText: 'Confirm' });
                                } catch (approveError) {
                                    console.error('PwPoint authorization failed:', approveError);
                                    await ModalDialog.alert('Authorization failed: ' + (approveError.message || "Unknown error"), { title: 'Error', confirmText: 'Confirm' });
                                    return;
                                }
                            }
                        } catch (authError) {
                            console.error('Check PwPoint authorization failed:', authError);
                            // Continue execution, try to claim rewards
                        }
                        
                        // Display the claim in progress prompt
                        await ModalDialog.alert('Claiming rewards...', { title: 'Claim in progress', confirmText: 'Confirm' });
                        
                        try {
                            // Call the contract to claim rewards
                            let tx;
                            if (feedingContract && feedingContract.contract) {
                                tx = await feedingContract.contract.methods.claimRewards([tokenId]).send({
                                    from: userAddress,
                                    gas: 300000
                                });
                            } else if (window.nftFeedingManagerContract) {
                                tx = await window.nftFeedingManagerContract.methods.claimRewards([tokenId]).send({
                                    from: userAddress,
                                    gas: 300000
                                });
                            } else {
                                throw new Error('Unable to find a valid contract instance');
                            }
                            
                            console.log("Rewards claimed successfully:", tx);
                            await ModalDialog.alert('Rewards claimed successfully!', { title: 'Success', confirmText: 'Confirm' });
                            
                            // Update the feeding information
                            const updatedFeedingInfo = await feedingContract.getNFTFeedingInfo(tokenId);
                            if (updatedFeedingInfo) {
                                // Update the card display
                                if (updatedFeedingInfo.realFeedingHours !== undefined) {
                                    updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.realFeedingHours, updatedFeedingInfo);
                                } else {
                                    updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.feedingHours, updatedFeedingInfo);
                                }
                            }
                            
                            // Trigger a custom event to notify that rewards have been claimed
                            const claimEvent = new CustomEvent('petcard.claim', {
                                detail: {
                                    tokenId: tokenId,
                                    contractAddress: contractAddress,
                                    transaction: tx,
                                    element: card
                                },
                                bubbles: true
                            });
                            card.dispatchEvent(claimEvent);
                        } catch (error) {
                            console.error("Claiming rewards failed:", error);
                            await ModalDialog.alert('Claiming rewards failed: ' + (error.message || "Unknown error"), { title: 'Error', confirmText: 'Confirm' });
                        }
                    }
                } catch (error) {
                    console.error("Error preparing to claim rewards:", error);
                    await ModalDialog.alert('Claiming rewards failed: ' + (error.message || "Unknown error"), { title: 'Error', confirmText: 'Confirm' });
                }
            });
        }
            
        if (feedBtn) {
            feedBtn.addEventListener('click', async function() {
                const tokenId = card.dataset.tokenId;
                const contractAddress = card.dataset.contractAddress;
                const feedingHours = parseInt(card.dataset.feedingHours) || 0;
                const quality = card.dataset.quality;
                
                // Check if the pet has already reached the maximum feeding time
                if (feedingHours >= MAX_FEEDING_HOURS) {
                    await ModalDialog.alert('The pet is full and cannot be fed anymore!', { title: 'Prompt', confirmText: 'Confirm' });
                    return;
                }
                
                // Calculate the maximum feedable hours
                const maxFeedHours = MAX_FEEDING_HOURS - feedingHours;
                
                
                // Use a general modal popup to allow the user to enter the feeding hours
                let feedHours;
                try {
                    const result = await ModalDialog.prompt({
                        title: 'Feed the pet',
                        input: true,
                        inputLabel: `Please enter the number of hours to feed (1-${maxFeedHours}):`,
                        inputType: 'number',
                        inputValue: maxFeedHours,
                        confirmText: 'Confirm',
                        cancelText: 'Cancel'
                    });
                    if (result.action !== 'confirm') {
                        return;
                    }
                    feedHours = parseInt(result.value);
                } catch (dialogError) {
                    console.error('Failed to get the feeding hours:', dialogError);
                    return;
                }
                
                // Validate the input hours
                if (isNaN(feedHours) || feedHours <= 0) {
                    await ModalDialog.alert('Please enter a valid number of hours to feed!', { title: 'Prompt', confirmText: 'Confirm' });
                    return;
                }
                
                console.log(`Feed the pet: TokenID ${tokenId}, Contract ${contractAddress}, Current feeding time: ${feedingHours} hours, Feeding: ${feedHours} hours`);
                
                // Ensure it does not exceed the maximum feeding amount
                if (feedHours > maxFeedHours) {
                    feedHours = maxFeedHours;
                    showFeedingMessage(card, `Exceeded the maximum feeding amount, adjusted to ${maxFeedHours} hours`, "info");
                }
                
                if (feedHours <= 0) {
                    showFeedingMessage(card, "The pet is full and cannot be fed anymore!", "error");
                    return;
                }
                
                // Check if authorization is needed
                if (window.web3 && window.NFTFeedingManagerContract && window.ContractApprovalManager) {
                    try {
                        // Get the user address
                        const accounts = await window.web3.eth.getAccounts();
                        const userAddress = accounts[0];
                        
                        if (!userAddress) {
                            await ModalDialog.alert('Please connect your wallet to feed the pet', { title: 'Prompt', confirmText: 'Confirm' });
                            return;
                        }
                        
                        // Create an NFTFeedingManagerContract instance
                        const feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                        
                        // Get the PWFOOD token contract
                        const pwfoodContract = await feedingManagerContract.getPWFOODContract(window.getContractAddress);
                        
                        if (pwfoodContract) {
                            // Check the authorization and balance status
                            const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                pwfoodContract,
                                userAddress,
                                feedingManagerContract.contractAddress,
                                feedHours.toString()
                            );
                            
                            console.log('PWFOOD authorization status:', approvalStatus);
                            
                            // Use a general modal popup to confirm PWFOOD authorization
                            if (approvalStatus.needsApproval) {
                                const approvalRes = await ModalDialog.confirm(
                                    'Need to authorize the PWFOOD token to feed the pet. Click "Confirm" to proceed.',
                                    { title: 'Authorization Prompt', confirmText: 'Confirm', cancelText: 'Cancel' }
                                );
                                if (approvalRes.action !== 'confirm') {
                                    await ModalDialog.alert('Authorization operation cancelled', { title: 'Error', confirmText: 'Confirm' });
                                    return;
                                }
                                await ModalDialog.alert('Requesting authorization...', { title: 'Prompt', confirmText: 'Confirm' });
                                // 进行授权
                                const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                                    pwfoodContract,
                                    feedingManagerContract.contractAddress,
                                    '0',
                                    userAddress,
                                    true // Use maximum authorization
                                );
                                if (!approvalResult.success) {
                                    await ModalDialog.alert('Authorization failed: ' + (approvalResult.error || 'Unknown error'), { title: 'Error', confirmText: 'Confirm' });
                                    return;
                                }
                                await ModalDialog.alert('Authorization successful, proceeding to feed...', { title: 'Success', confirmText: 'Confirm' });
                            }
                            
                            // 检查余额
                            if (!approvalStatus.sufficientFunds) {
                                await ModalDialog.alert('PWFOOD token balance is insufficient, cannot feed the pet', { title: 'Prompt', confirmText: 'Confirm' });
                                return;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to check the authorization status:', error);
                        await ModalDialog.alert('Failed to check the authorization status: ' + (error.message || 'Unknown error'), { title: 'Error', confirmText: 'Confirm' });
                        return;
                    }
                }
                
                // Trigger a custom event
                const feedEvent = new CustomEvent('petcard.feed', {
                    detail: {
                        tokenId: tokenId,
                        contractAddress: contractAddress,
                        feedHours: feedHours,
                        currentFeedingHours: feedingHours,
                        quality: quality,
                        element: card
                    },
                    bubbles: true
                });
                card.dispatchEvent(feedEvent);
                

            });
        }
        
        // Click the contract address link
        if (contractLink) {
            contractLink.addEventListener('click', function(event) {
                event.preventDefault();
                const contractAddress = card.dataset.contractAddress;
                
                // Open the blockchain explorer to view the contract
                const network = window.currentNetwork || 'TEST';
                let explorerUrl;
                
                if (network === 'MAIN') {
                    explorerUrl = `https://etherscan.io/address/${contractAddress}`;
                } else if (network === 'SEPOLIA') {
                    explorerUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;
                } else {
                    explorerUrl = `https://testnet.bscscan.com/address/${contractAddress}`;
                }
                
                // Open in a new window
                window.open(explorerUrl, '_blank');
            });
        }
    }

    
    /**
     * Display feeding message
     * @param {HTMLElement} card - Card element
     * @param {string} message - Message content
     * @param {string} type - Message type (success/error/info)
     */
    function showFeedingMessage(card, message, type = 'info') {
        ModalDialog.alert(message, {
            title: type === 'error' ? 'Error' : 'Prompt',
            confirmText: 'Confirm'
        });
    }
    
    /**
     * Update pet satiety
     * @param {HTMLElement} card - Card element
     * @param {number} feedingHours - New feeding hours
     */
    function updatePetSatiety(card, feedingHours) {
        if (!card) return;
        
        // Ensure the feeding hours are within a reasonable range
        feedingHours = Math.max(0, Math.min(MAX_FEEDING_HOURS, feedingHours));
        
        // Update the card data attribute
        card.dataset.feedingHours = feedingHours;
        
        // Calculate the satiety percentage
        const satietyPercent = Math.round((feedingHours / MAX_FEEDING_HOURS) * 100);
        
        // Update the UI elements
        const satietyLabel = card.querySelector('.satiety-label');
        if (satietyLabel) {
            satietyLabel.textContent = `Satiety: ${satietyPercent}%`;
        }
        
        const satietyValue = card.querySelector('.satiety-value');
        if (satietyValue) {
            satietyValue.style.width = `${satietyPercent}%`;
        }
        
        const satietyDetail = card.querySelector('.satiety-detail');
        if (satietyDetail) {
            satietyDetail.textContent = `${feedingHours}/${MAX_FEEDING_HOURS}小时`;
        }
    }
    
    /**
     * Update pet satiety
     * @param {HTMLElement} card - Card element
     * @param {number} feedingHours - New feeding hours
     * @param {Object} feedingInfo - Updated feeding information (optional)
     */
    function updatePetSatietyWithFeedingInfo(card, feedingHours, feedingInfo) {
        if (!card) return;
        
        // Update the display
        updatePetSatiety(card, feedingHours);
        
        // If there is new level or accumulated feeding information, update the display
        if (feedingInfo) {
            const tokenId = card.dataset.tokenId;
            
            // Update the level and accumulated feeding information (if any)
            if (feedingInfo.level !== undefined && feedingInfo.accumulatedFood !== undefined) {
                updatePetLevel(card, feedingInfo.level, feedingInfo.accumulatedFood);
            }
            
            // Remove the old timer
            if (activeCards.has(tokenId)) {
                clearInterval(activeCards.get(tokenId).timer);
            }
            
            // Start a new timer
            if (feedingInfo.isActive && feedingHours > 0) {
                startSatietyUpdateTimer(card, feedingInfo);
            }
        }
    }
    
    /**
     * Update pet level and accumulated feeding display
     * @param {HTMLElement} card - Card element
     * @param {number} level - New level
     * @param {number} accumulatedFood - New accumulated feeding
     */
    function updatePetLevel(card, level, accumulatedFood) {
        if (!card) return;
        
        // Update the card data attribute
        card.dataset.level = level;
        card.dataset.accumulatedFood = accumulatedFood;
        
        // Update the level display
        const levelElement = card.querySelector('.pet-level');
        if (levelElement) {
            levelElement.textContent = `Lv.${level}`;
        }
        
        // Calculate the level progress
        const levelProgress = calculateLevelProgress(level, accumulatedFood);
        
        // Update the level progress bar
        const levelLabel = card.querySelector('.level-label');
        if (levelLabel) {
            levelLabel.textContent = `Level progress: ${levelProgress.percent}%`;
        }
        
        const levelValue = card.querySelector('.level-value');
        if (levelValue) {
            levelValue.style.width = `${levelProgress.percent}%`;
        }
        
        const levelDetail = card.querySelector('.level-detail');
        if (levelDetail) {
            levelDetail.textContent = `${accumulatedFood}/${levelProgress.target} PWFOOD`;
        }
    }
    
    /**
     * Add card to container
     * @param {Object} nft - NFT data object
     * @param {HTMLElement} container - Container element to add to
     * @returns {Promise<HTMLElement>} Created card element
     */
    async function appendCardToContainer(nft, container) {
        if (!container) {
            console.error('Failed to add card: Container does not exist');
            return null;
        }
        
        // Record the original image URL (for debugging)
        console.log(`Adding NFT #${nft.tokenId} card, original image URL: ${nft.metadata?.image}`);
        
        // Asynchronously create the card
        const card = await createPetCard(nft);
        
        // Check the image element on the card, ensure it uses the correct image URL
        const imgEl = card.querySelector('.pet-image img');
        if (imgEl) {
            // Get the image URL information stored in the card
            const imageUrl = card.dataset.imageUrl;
            const imageSource = card.dataset.imageSource;
            const isLocalImage = card.dataset.isLocalImage === 'true';
            
            // Ensure the image src is correctly set
            if (imageUrl) {
                imgEl.src = imageUrl;
                console.log(`Confirmed that the card image src is set to: ${imgEl.src} (source: ${imageSource || 'unknown'})`);
            } else if (nft.metadata?.image) {
                // If imageUrl is not set, try to use metadata.image
                imgEl.src = nft.metadata.image;
                console.log(`Fallback to using metadata.image: ${imgEl.src}`);
            }
        }
        
        container.appendChild(card);
        return card;
    }
    
    /**
     * Bind the card global event listeners
     * @param {Object} eventHandlers - Event handler mapping
     */
    function bindGlobalEvents(eventHandlers) {
        if (!eventHandlers) return;
        
        // Bind the detail event
        if (eventHandlers.onShowDetail && typeof eventHandlers.onShowDetail === 'function') {
            document.addEventListener('petcard.showDetail', function(event) {
                eventHandlers.onShowDetail(event.detail);
            });
        }
        
        // Bind the feed event
        if (eventHandlers.onFeed && typeof eventHandlers.onFeed === 'function') {
            document.addEventListener('petcard.feed', function(event) {
                eventHandlers.onFeed(event.detail);
            });
        }
                
        // Bind the claim event
        if (eventHandlers.onClaim && typeof eventHandlers.onClaim === 'function') {
            document.addEventListener('petcard.claim', function(event) {
                eventHandlers.onClaim(event.detail);
            });
        }
    }
    
    /**
     * Calculate the pet level progress percentage
     * @param {number} level - Current level
     * @param {number} accumulatedFood - Accumulated feeding
     * @returns {Object} Contains the progress percentage and the total data required for the next level
     */
    function calculateLevelProgress(level, accumulatedFood) {
        // If already the highest level, return 100%
        if (level >= MAX_LEVEL) {
            return {
                percent: 100,
                current: accumulatedFood,
                target: LEVEL_5_THRESHOLD,
                nextLevel: MAX_LEVEL
            };
        }
        
        let currentThreshold = 0;
        let nextThreshold = LEVEL_2_THRESHOLD;
        let nextLevel = 2;
        
        // Determine the current threshold and the next threshold based on the current level
        switch (level) {
            case 1:
                currentThreshold = 0;
                nextThreshold = LEVEL_2_THRESHOLD;
                nextLevel = 2;
                break;
            case 2:
                currentThreshold = LEVEL_2_THRESHOLD;
                nextThreshold = LEVEL_3_THRESHOLD;
                nextLevel = 3;
                break;
            case 3:
                currentThreshold = LEVEL_3_THRESHOLD;
                nextThreshold = LEVEL_4_THRESHOLD;
                nextLevel = 4;
                break;
            case 4:
                currentThreshold = LEVEL_4_THRESHOLD;
                nextThreshold = LEVEL_5_THRESHOLD;
                nextLevel = 5;
                break;
            default:
                currentThreshold = 0;
                nextThreshold = LEVEL_2_THRESHOLD;
                nextLevel = 2;
        }
        
        // Calculate the progress percentage
        const levelProgress = accumulatedFood - currentThreshold;
        const levelTarget = nextThreshold - currentThreshold;
        const percent = Math.min(100, Math.round((levelProgress / levelTarget) * 100));
        
        return {
            percent: percent,
            current: accumulatedFood,
            target: nextThreshold,
            nextLevel: nextLevel
        };
    }
    
    // Public API
    return {
        createPetCard,
        appendCardToContainer,
        bindGlobalEvents,
        getQualityName,
        getQualityRewards,
        updatePetSatiety,
        updatePetSatietyWithFeedingInfo,
        updatePetLevel,
        calculateLevelProgress,
        showFeedingMessage,
        stopAllSatietyTimers,
        resumeAllSatietyTimers,
        MAX_FEEDING_HOURS
    };
})();

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetCard;
} else {
    window.PetCard = PetCard;
} 