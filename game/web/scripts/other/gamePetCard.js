/**
 * Game mode pet card component
 * Provides functionality for creating and interacting with game-style pet cards
 */
const GamePetCard = (function() {
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

    /**
     * Get the style class and name of rarity
     * @param {string} rarity - Rarity value
     * @returns {Object} Object containing class name and display name
     */
    function getRarityInfo(rarity) {
        if (!rarity) {
            console.log('No rarity value provided, using default common quality');
            return { class: 'common', name: 'Common' };
        }
        
        // Normalize rarity value (convert to lowercase and remove spaces)
        const normalizedRarity = String(rarity).toLowerCase().trim();
        console.log(`Quality recognition: original value="${rarity}", normalized value="${normalizedRarity}"`);
        
        // Detailed rarity mapping table, including various possible representations
        const rarityMap = {
            // Basic mapping - lowercase English
            'legendary': { class: 'legendary', name: 'Legendary' },
            'legend': { class: 'legendary', name: 'Legend' },
            'epic': { class: 'legendary', name: 'Epic' },
            'rare': { class: 'purple-rare', name: 'Rare' },
            'uncommon': { class: 'uncommon', name: 'Uncommon' },
            'common': { class: 'common', name: 'Common' },
            'excellent': { class: 'excellent', name: 'Excellent' },
            'good': { class: 'good', name: 'Good' },
            'normal': { class: 'common', name: 'Normal' },
            
            // Uppercase English mapping
            'LEGENDARY': { class: 'legendary', name: 'Legendary' },
            'LEGEND': { class: 'legendary', name: 'Legend' },
            'EPIC': { class: 'legendary', name: 'Epic' },
            'RARE': { class: 'purple-rare', name: 'Rare' },
            'UNCOMMON': { class: 'uncommon', name: 'Uncommon' },
            'COMMON': { class: 'common', name: 'Common' },
            'EXCELLENT': { class: 'excellent', name: 'Excellent' },
            'GOOD': { class: 'good', name: 'Good' },
            'NORMAL': { class: 'common', name: 'Normal' },
            
            
            // Numeric representation (possibly from some contracts or metadata)
            '0': { class: 'common', name: 'Common' },
            '1': { class: 'good', name: 'Good' },
            '2': { class: 'excellent', name: 'Excellent' },
            '3': { class: 'purple-rare', name: 'Rare' },
            '4': { class: 'legendary', name: 'Legend' },
            
            // Special case handling
            'limited': { class: 'legendary', name: 'Legend' },
            'limited edition': { class: 'legendary', name: 'Legend' },
            'special': { class: 'purple-rare', name: 'Rare' },
            'ultra rare': { class: 'legendary', name: 'Legend' },
            'super rare': { class: 'legendary', name: 'Legend' }
        };
        
        // Try to get the result directly from the mapping table first
        if (rarityMap[normalizedRarity]) {
            const result = rarityMap[normalizedRarity];
            console.log(`Found quality through exact match: class="${result.class}", name="${result.name}"`);
            return result;
        }
        
        // Try to match the original string directly (for case-sensitive situations)
        if (rarityMap[rarity]) {
            const result = rarityMap[rarity];
            console.log(`Found quality through exact match: class="${result.class}", name="${result.name}"`);
            return result;
        }
        
        // If no exact match is found, try partial matching
        console.log(`No exact match found, trying partial matching: "${normalizedRarity}"`);
        
        // Legendary level matching
        if (normalizedRarity.includes('legend') || 
            normalizedRarity.includes('legendary') || 
            normalizedRarity.includes('epic') ||
            normalizedRarity.includes('ultra') ||
            normalizedRarity.includes('super')) {
            console.log(`Found quality through partial matching: ${normalizedRarity}`);
            return { class: 'legendary', name: 'Legend' };
        }
        
        // Rare level matching
        if (normalizedRarity.includes('rare') || 
            normalizedRarity.includes('special')) {
            console.log(`Found quality through partial matching: ${normalizedRarity}`);
            return { class: 'purple-rare', name: 'Rare' };
        }
        
        // Excellent level matching
        if (normalizedRarity.includes('excel') || 
            normalizedRarity.includes('excellent') ||
            normalizedRarity.includes('great')) {
            console.log(`Found quality through partial matching: ${normalizedRarity}`);
            return { class: 'excellent', name: 'Excellent' };
        }
        
        // Good level matching
        if (normalizedRarity.includes('good') || 
            normalizedRarity.includes('uncommon') ||
            normalizedRarity.includes('extraordinary')) {
            console.log(`Found quality through partial matching: ${normalizedRarity}`);
            return { class: 'good', name: 'Good' };
        }
        
        // Try to use numeric range matching
        if (!isNaN(normalizedRarity)) {
            const numValue = parseFloat(normalizedRarity);
            if (numValue >= 80 || numValue >= 4) {
                console.log(`Found quality through numeric range matching: ${normalizedRarity}`);
                return { class: 'legendary', name: 'Legend' };
            } else if (numValue >= 60 || numValue >= 3) {
                console.log(`Found quality through numeric range matching: ${normalizedRarity}`);
                return { class: 'purple-rare', name: 'Rare' };
            } else if (numValue >= 40 || numValue >= 2) {
                console.log(`Found quality through numeric range matching: ${normalizedRarity}`);
                return { class: 'excellent', name: 'Excellent' };
            } else if (numValue >= 20 || numValue >= 1) {
                console.log(`Found quality through numeric range matching: ${normalizedRarity}`);
                return { class: 'good', name: 'Good' };
            }
        }
        
        // If all matching attempts fail, return the default common quality
        console.log(`All matching attempts failed, using default common quality: "${rarity}"`);
        return { class: 'common', name: 'Common' };
    }
    
    /**
     * Format address display
     * @param {string} address - Ethereum address
     * @returns {string} Formatted address
     */
    function formatTokenId(tokenId) {
        if (!tokenId) return '#????';
        
        // Ensure tokenId is a string
        const tokenIdStr = String(tokenId);
        
        // If tokenId is very short, return directly
        if (tokenIdStr.length <= 4) {
            return `#${tokenIdStr.padStart(4, '0')}`;
        }
        
        // Otherwise, return the first two and last two
        return `#${tokenIdStr.substring(0, 2)}..${tokenIdStr.slice(-2)}`;
    }
    
    /**
     * Get the reward information corresponding to the quality
     * @param {string} rarity - Rarity value
     * @returns {Object} Reward information
     */
    function getQualityRewards(rarity) {
        // Normalize rarity value
        const normalizedRarity = String(rarity).toUpperCase().trim();
        const rewardMap = {
            'LEGENDARY': QUALITY_REWARDS.LEGENDARY,
            'RARE': QUALITY_REWARDS.RARE,
            'EXCELLENT': QUALITY_REWARDS.EXCELLENT,
            'GOOD': QUALITY_REWARDS.GOOD,
            'COMMON': QUALITY_REWARDS.COMMON
        };
        
        return rewardMap[normalizedRarity] || QUALITY_REWARDS.COMMON;
    }
    
    /**
     * Calculate real satiety
     * @param {Object} feedingInfo - Feeding information obtained from the contract
     * @returns {number} Actual remaining feeding hours
     */
    function calculateRealFeedingHours(feedingInfo) {
        if (!feedingInfo) {
            console.error('Failed to calculate satiety: feeding info is empty');
            return 0;
        }
        
        console.log('Original data:', JSON.stringify(feedingInfo, null, 2));
        
        // Check if necessary fields exist
        if (feedingInfo.feedingHours === undefined || feedingInfo.lastFeedTime === undefined || feedingInfo.lastClaimTime === undefined) {
            console.error('Failed to calculate satiety: missing necessary fields');
            console.log('Available fields:', Object.keys(feedingInfo).join(', '));
            return feedingInfo.feedingHours || 0;
        }
        
        if (!feedingInfo.isActive) {
            console.log('NFT is not activated for feeding, returning 0 satiety');
            return 0;
        }
        
        // Get the current timestamp (seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Get the last feed time and last claim time
        const lastFeedTime = parseInt(feedingInfo.lastFeedTime) || 0;
        const lastClaimTime = parseInt(feedingInfo.lastClaimTime) || 0;
        
        // Use the larger value between lastFeedTime and lastClaimTime as the calculation base point
        // const lastActionTime = Math.max(lastFeedTime, lastClaimTime);
        const lastActionTime = lastFeedTime;
        // The feeding hours recorded in the contract
        const recordedFeedingHours = parseInt(feedingInfo.feedingHours) || 0;
        
        // Output the human-readable format of the timestamp for debugging
        const currentTimeReadable = new Date(currentTime * 1000).toLocaleString();
        const lastFeedTimeReadable = new Date(lastFeedTime * 1000).toLocaleString();
        const lastClaimTimeReadable = new Date(lastClaimTime * 1000).toLocaleString();
        const lastActionTimeReadable = new Date(lastActionTime * 1000).toLocaleString();
        
        console.log('Detailed data for satiety calculation:', {
            feedingHoursFromContract: `${feedingInfo.feedingHours} (raw)`,
            feedingHoursConverted: `${recordedFeedingHours} (parsed)`,
            lastFeedTimeFromContract: `${feedingInfo.lastFeedTime} (raw)`,
            lastFeedTimeConverted: `${lastFeedTime} (parsed)`,
            lastClaimTimeFromContract: `${feedingInfo.lastClaimTime} (raw)`,
            lastClaimTimeConverted: `${lastClaimTime} (parsed)`,
            lastActionTime: lastActionTime,
            lastActionTimeReadable: lastActionTimeReadable,
            currentTime: currentTime,
            currentTimeReadable: currentTimeReadable,
            timeDifferenceSeconds: currentTime - lastActionTime,
            timeDifferenceHours: ((currentTime - lastActionTime) / 3600).toFixed(2)
        });
        
        // Calculate the number of hours that have passed (from the last action time)
        let elapsedHours = 0;
        if (currentTime > lastActionTime) {
            elapsedHours = Math.floor((currentTime - lastActionTime) / 3600); // 3600秒 = 1小时
            console.log(`Since the last action (${lastActionTime === lastFeedTime ? 'feeding' : 'claim'}) has passed ${elapsedHours} hours`);
        } else {
            console.log('Last action time is greater than current time, possibly due to clock synchronization issues, using recorded feeding hours');
            return recordedFeedingHours;
        }
        
        // Calculate the actual remaining feeding hours (cannot be less than 0)
        const realFeedingHours = Math.max(0, recordedFeedingHours - elapsedHours);
        
        console.log('Satiety calculation result:', {
            recordedFeedingHours: `${recordedFeedingHours} hours`, 
            elapsedHours: `${elapsedHours} hours`,
            realFeedingHours: `${realFeedingHours} hours`,
            percentRemaining: `${Math.round((realFeedingHours / MAX_FEEDING_HOURS) * 100)}%`
        });
        
        return realFeedingHours;
    }
    
    /**
     * Create a game-style pet card
     * @param {Object} nft - NFT data object
     * @returns {HTMLElement} Created card element
     */
    function createGamePetCard(nft) {
        // Extract data from nft
        const { tokenId, contractAddress, metadata } = nft;
        
        // Extract pet name
        const name = metadata?.name || `Pet ${formatTokenId(tokenId)}`;
        
        // Temporarily extract default image URL (displayed before asynchronous loading is complete)
        let defaultImageUrl = '';
        if (nft.originalImageUrl) {
            defaultImageUrl = nft.originalImageUrl;
        } else if (metadata?.originalImageUrl) {
            defaultImageUrl = metadata.originalImageUrl;
        } else if (metadata?.image) {
            defaultImageUrl = metadata.image;
        }
        
        // Process IPFS links
        if (defaultImageUrl && defaultImageUrl.startsWith('ipfs://')) {
            defaultImageUrl = defaultImageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        
        // If there is no image, use a random emoji
        const fallbackEmoji = getRandomPetEmoji();
        
        // Extract pet attributes with enhanced quality detection
        let rarity = 'common';
        let health = 100;
        let feedingHours = DEFAULT_FEEDING_HOURS; // Default feeding hours
        let level = 1; // Default level is 1
        let accumulatedFood = 0; // Default accumulated feeding amount is 0
        
        // Enhanced quality extraction logic
        // Priority 1: Check if quality is directly stored in the NFT object
        if (nft.quality) {
            rarity = String(nft.quality).toLowerCase();
            console.log(`Found quality in nft.quality: ${rarity}`);
        } else if (nft.rarity) {
            rarity = String(nft.rarity).toLowerCase();
            console.log(`Found quality in nft.rarity: ${rarity}`);
        } else if (metadata?.quality) {
            rarity = String(metadata.quality).toLowerCase();
            console.log(`Found quality in metadata.quality: ${rarity}`);
        } else if (metadata?.rarity) {
            rarity = String(metadata.rarity).toLowerCase();
            console.log(`Found quality in metadata.rarity: ${rarity}`);
        } else if (metadata?.attributes && Array.isArray(metadata.attributes)) {
            // Priority 2: Check metadata attributes with enhanced trait type matching
            const qualityAttr = metadata.attributes.find(attr => {
                const traitType = String(attr.trait_type || '').toLowerCase();
                return traitType === 'quality' || 
                       traitType === 'rarity' || 
                       traitType === 'grade' ||
                       traitType === 'tier' ||
                       traitType === 'rank';
            });
            
            if (qualityAttr && qualityAttr.value !== undefined) {
                rarity = String(qualityAttr.value).toLowerCase();
                console.log(`Found quality in metadata attributes: ${rarity} (trait: ${qualityAttr.trait_type})`);
            } else {
                // Priority 3: Try to infer quality from pet name or description
                const petName = (metadata?.name || nft.name || '').toLowerCase();
                const petDescription = (metadata?.description || nft.description || '').toLowerCase();
                const combinedText = `${petName} ${petDescription}`;
                
                if (combinedText.includes('legendary') || combinedText.includes('legend') || combinedText.includes('epic')) {
                    rarity = 'legendary';
                    console.log(`Inferred quality from name/description: ${rarity}`);
                } else if (combinedText.includes('rare') || combinedText.includes('purple')) {
                    rarity = 'rare';
                    console.log(`Inferred quality from name/description: ${rarity}`);
                } else if (combinedText.includes('excellent') || combinedText.includes('excel')) {
                    rarity = 'excellent';
                    console.log(`Inferred quality from name/description: ${rarity}`);
                } else if (combinedText.includes('good') || combinedText.includes('uncommon')) {
                    rarity = 'good';
                    console.log(`Inferred quality from name/description: ${rarity}`);
                } else {
                    console.log(`Using default quality: ${rarity}`);
                }
            }
        }
        
        // Check if there is contract feeding information
        if (nft.feedingInfo) {
            // If there is contract feeding information, use the contract data first
            const contractFeedingHours = calculateRealFeedingHours(nft.feedingInfo);
            feedingHours = contractFeedingHours;
            
            // Extract level and accumulated feeding amount information
            if (nft.feedingInfo.level !== undefined) {
                level = parseInt(nft.feedingInfo.level) || 1;
            }
            if (nft.feedingInfo.accumulatedFood !== undefined) {
                accumulatedFood = parseInt(nft.feedingInfo.accumulatedFood) || 0;
            }
            
            console.log(`Using contract-calculated feeding hours: ${feedingHours} hours, level: ${level}, accumulated food: ${accumulatedFood}`);
        } else if (metadata?.attributes && Array.isArray(metadata.attributes)) {
            // Otherwise, try to get it from the metadata
            metadata.attributes.forEach(attr => {
                const traitType = attr.trait_type?.toLowerCase();
                if (traitType === 'health' || traitType === 'hunger') {
                    health = parseInt(attr.value) || 100;
                } else if (traitType === 'feedinghours') {
                    feedingHours = parseInt(attr.value) || DEFAULT_FEEDING_HOURS;
                } else if (traitType === 'level') {
                    level = parseInt(attr.value) || 1;
                } else if (traitType === 'accumulatedfood') {
                    accumulatedFood = parseInt(attr.value) || 0;
                }
            });
        }
        
        // Ensure satiety and feeding hours are within a reasonable range
        health = Math.max(0, Math.min(100, health));
        feedingHours = Math.max(0, Math.min(MAX_FEEDING_HOURS, feedingHours));
        
        // Calculate the percentage of satiety
        const satietyPercent = Math.round((feedingHours / MAX_FEEDING_HOURS) * 100);
        
        // Calculate level progress
        const levelProgress = calculateLevelProgress(level, accumulatedFood);
        
        // Get rarity information
        const rarityInfo = getRarityInfo(rarity);
        
        // Get reward information
        const rewards = getQualityRewards(rarity);
        
        // Create card element
        const card = document.createElement('div');
        card.className = `game-pet-card ${rarityInfo.class}`;
        card.dataset.tokenId = tokenId;
        card.dataset.contractAddress = contractAddress;
        card.dataset.feedingHours = feedingHours;
        card.dataset.rarity = rarity;
        card.dataset.level = level;
        card.dataset.accumulatedFood = accumulatedFood;
        
        // Build the card HTML framework
        card.innerHTML = `
            <div class="game-pet-rarity">${rarityInfo.name}</div>
            
            <div class="game-pet-image">
                <div class="pet-loading">Loading...</div>
            </div>
            
            <div class="game-pet-info">
                <div class="game-pet-header">
                    <h3>${name} <span class="game-pet-level">Lv.${level}</span></h3>
                    <div class="game-pet-token-id">ID: ${tokenId}</div>
                </div>
                
                <div class="game-pet-stats">
                    <div class="game-stat-row game-stat-health">
                        <span class="game-stat-label">Satiety</span>
                        <div class="game-stat-bar">
                            <div class="game-stat-value" style="width: ${satietyPercent}%"></div>
                        </div>
                        <span class="game-stat-number">${feedingHours}/${MAX_FEEDING_HOURS}h</span>
                    </div>
                    
                    <div class="game-stat-row game-stat-level">
                        <span class="game-stat-label">Level Progress</span>
                        <div class="game-stat-bar">
                            <div class="game-stat-value level-value" style="width: ${levelProgress.percent}%"></div>
                        </div>
                        <span class="game-stat-number">${accumulatedFood}/${levelProgress.target}</span>
                    </div>
                </div>
                
                <div class="game-pet-rewards">
                    <div class="rewards-title">Hourly Rewards:</div>
                    <div class="rewards-detail">
                        <span class="pwpot-reward">${rewards.pwpot} PWPOT</span>
                        <span class="pwbot-reward">${rewards.pwbot} PWBOT</span>
                    </div>
                </div>
            </div>
            
            <div class="game-pet-actions">
                <button class="game-pet-action-btn feed-btn" data-action="feed">Feed</button>
                <button class="game-pet-action-btn claim-btn" data-action="claim">Claim Rewards</button>
            </div>
        `;
        
        // Asynchronously load the best image
        (async function loadBestPetImage() {
            try {
                // Get the pet image container
                const imageContainer = card.querySelector('.game-pet-image');
                const loadingElement = imageContainer.querySelector('.pet-loading');
                
                // Get the best image
                const imageResult = await getBestPetImage(nft);
                
                // Create image element
                const imgElement = document.createElement('img');
                imgElement.src = imageResult.imageUrl || defaultImageUrl || '';
                imgElement.alt = name;
                imgElement.onerror = function() {
                    this.outerHTML = `<div style="font-size:5rem;text-align:center;">${fallbackEmoji}</div>`;
                };
                
                // Save image information to the dataset
                card.dataset.originalImageUrl = nft.originalImageUrl || metadata?.image || imageResult.imageUrl;
                card.dataset.imageUrl = imageResult.imageUrl;
                card.dataset.imageSource = imageResult.source;
                card.dataset.isLocalImage = imageResult.isLocal ? 'true' : 'false';
                
                // Remove the loading element and add the image
                if (loadingElement) {
                    imageContainer.removeChild(loadingElement);
                }
                imageContainer.appendChild(imgElement);
                
            } catch (error) {
                console.error('Failed to load pet image:', error);
                
                // When loading fails, display the default image or emoji
                const imageContainer = card.querySelector('.game-pet-image');
                const loadingElement = imageContainer.querySelector('.pet-loading');
                
                if (loadingElement) {
                    imageContainer.removeChild(loadingElement);
                }
                
                if (defaultImageUrl) {
                    const imgElement = document.createElement('img');
                    imgElement.src = defaultImageUrl;
                    imgElement.alt = name;
                    imgElement.onerror = function() {
                        this.outerHTML = `<div style="font-size:5rem;text-align:center;">${fallbackEmoji}</div>`;
                    };
                    imageContainer.appendChild(imgElement);
                } else {
                    imageContainer.innerHTML = `<div style="font-size:5rem;text-align:center;">${fallbackEmoji}</div>`;
                }
            }
        })();
        
        // Bind events
        bindCardEvents(card);
        
        return card;
    }
    
    /**
     * Display feeding message
     * @param {HTMLElement} card - Card element
     * @param {string} message - Message content
     * @param {string} type - Message type (success/error/info)
     */
    function showFeedingMessage(card, message, type = 'info') {
        // For success messages, use ModalDialog to be consistent with normal mode
        if (type === 'success' && window.ModalDialog) {
            window.ModalDialog.alert(message, {
                title: 'Feeding Success',
                confirmText: 'OK'
            });
            return;
        }
        
        // For other message types (error, info), use the card-based message
        // Create message element
        const msgElement = document.createElement('div');
        msgElement.className = `game-feeding-message ${type}`;
        msgElement.textContent = message;
        
        // Set message style
        msgElement.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%) translateY(100%);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 0.8rem;
            color: white;
            background-color: ${type === 'error' ? '#f44336' : (type === 'success' ? '#4caf50' : '#2196f3')};
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 100;
        `;
        
        // Add to card
        card.style.position = 'relative';
        card.appendChild(msgElement);
        
        // Display message
        setTimeout(() => {
            msgElement.style.opacity = '1';
            msgElement.style.transform = 'translateX(-50%) translateY(0)';
            
            // Hide message after a period of time
            setTimeout(() => {
                msgElement.style.opacity = '0';
                msgElement.style.transform = 'translateX(-50%) translateY(100%)';
                
                setTimeout(() => {
                    if (card.contains(msgElement)) {
                        card.removeChild(msgElement);
                    }
                }, 300);
            }, 3000);
        }, 10);
    }
    
    /**
     * Bind card events
     * @param {HTMLElement} card - Card element
     */
    function bindCardEvents(card) {
        if (!card) return;
        
        // Get the interactive elements inside the card
        const feedButton = card.querySelector('.feed-btn');
        const claimButton = card.querySelector('.claim-btn');
        const playButton = card.querySelector('.game-pet-play-btn');
        const trainButton = card.querySelector('.game-pet-train-btn');
        
        // Get NFT information
        const tokenId = card.dataset.tokenId;
        const contractAddress = card.dataset.contractAddress;
        const rarity = card.dataset.rarity;
        
        // Bind the feed button click event
        if (feedButton) {
            feedButton.addEventListener('click', async function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                addButtonClickEffect(feedButton);
                
                // Get the current feeding hours and maximum feeding hours
                const feedingHours = parseInt(card.dataset.feedingHours) || 0;
                const maxFeedingHours = MAX_FEEDING_HOURS;
                
                // Calculate the maximum number of hours that can still be fed
                const maxFeedHours = maxFeedingHours - feedingHours;
                
                // If the pet is already full, display a prompt message
                if (maxFeedHours <= 0) {
                    showFeedingMessage(card, "This pet is full, cannot feed anymore!", "error");
                    return;
                }
                
                // Pop up an input box to allow the user to enter the number of hours to feed
                let feedHours = 0;
                try {
                    if (!window.ModalDialog) {
                        console.error("ModalDialog is not available.");
                        showFeedingMessage(card, "Dialog component not loaded", "error");
                        return;
                    }

                    const promptResult = await window.ModalDialog.prompt({
                        title: 'Feed Pet',
                        content: `Enter the number of hours to feed (1-${maxFeedHours}):`,
                        inputValue: "1",
                        inputType: 'number',
                        confirmText: 'Feed',
                        cancelText: 'Cancel',
                        inputLabel: 'Hours:',
                        validator: (value) => {
                            const parsedValue = parseInt(value);
                            if (isNaN(parsedValue) || parsedValue <= 0) {
                                return 'Please enter a valid positive number.';
                            }
                            if (parsedValue > maxFeedHours) {
                                return `Cannot feed more than ${maxFeedHours} hours.`;
                            }
                            return '';
                        }
                    });

                    // If the user confirmed and provided a value
                    if (promptResult.action === 'confirm' && promptResult.value !== null) {
                        feedHours = parseInt(promptResult.value);
                    } else {
                        // The user cancelled the input
                        showFeedingMessage(card, "Feed operation cancelled", "info");
                        return;
                    }

                } catch (error) {
                    console.error("Error using ModalDialog:", error);
                    showFeedingMessage(card, "Error opening feed dialog", "error");
                    return;
                }

                // After getting the validated feedHours (via modal or fallback)
                if (isNaN(feedHours) || feedHours <= 0) {
                     // This case should ideally be caught by the validator in modal,
                     // but keeping for fallback/safety.
                    showFeedingMessage(card, "Please enter a valid number of feeding hours", "error");
                    return;
                }

                console.log(`Feeding the pet: TokenID ${tokenId}, Contract ${contractAddress}, Current feeding time: ${feedingHours} hours, Feeding: ${feedHours} hours`);

                // Ensure it does not exceed the maximum feeding amount
                // Note: Validation is already handled by the modal validator, this is a final check.
                const actualFeedHours = Math.min(feedHours, maxFeedHours);

                if (actualFeedHours <= 0) {
                    showFeedingMessage(card, "This pet is already full and cannot be fed anymore!", "error");
                    return;
                }

                // Save the user input feeding hours to the card data attribute
                card.dataset.feedHours = actualFeedHours;

                // Trigger a custom event
                const actionEvent = new CustomEvent('gamepetcard.action', {
                    detail: {
                        action: 'feed',
                        tokenId: tokenId,
                        contractAddress: contractAddress,
                        feedHours: actualFeedHours,
                        currentFeedingHours: feedingHours,
                        element: card
                    },
                    bubbles: true
                });

                card.dispatchEvent(actionEvent);

                // Display waiting message
                showFeedingMessage(card, `Submitting feed request for ${actualFeedHours} hours...`, "info");

                // Listen for the feed completion event, update the level and accumulated feeding value
                // Use a unique event listener for each card/action to avoid conflicts
                const feedCompletedHandler = function(event) {
                    const eventData = event.detail;
                    // Check if the event is for this specific pet's feed action
                    if (eventData.tokenId === tokenId && eventData.action === 'feed-completed') {
                         console.log('Feeding completed event triggered, updating level and accumulated feeding value:', eventData);

                        // Check if the event data contains new level and accumulated feeding value
                        if (eventData.level !== undefined && eventData.accumulatedFood !== undefined) {
                            // Update level and accumulated feeding value
                            updatePetLevel(card, eventData.level, eventData.accumulatedFood);
                        }
                         // Remove the listener after processing
                         document.removeEventListener('gamepetcard.action', feedCompletedHandler);
                    }
                };
                 document.addEventListener('gamepetcard.action', feedCompletedHandler);
            });
        }
        
        // Bind the claim reward button click event
        if (claimButton) {
            claimButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                addButtonClickEffect(claimButton);
                
                // If the RewardClaimModal script needs to be loaded
                if (typeof window.RewardClaimModal === 'undefined') {
                    // Check if it is already being loaded
                    if (!window.isLoadingRewardModal) {
                        window.isLoadingRewardModal = true;
                        
                        // Create a loading style
                        if (!document.querySelector('link[href="../../css/other/rewardClaimModal.css"]')) {
                            const styleEl = document.createElement('link');
                            styleEl.rel = 'stylesheet';
                            styleEl.href = '../../css/other/rewardClaimModal.css';
                            document.head.appendChild(styleEl);
                        }
                        
                        // Create the basic HTML structure of the modal box
                        if (!document.getElementById('rewardModalOverlay')) {
                            const modalHTML = `
                                <div id="rewardModalOverlay" class="modal-overlay hidden">
                                    <div id="rewardClaimModal" class="reward-claim-modal hidden">
                                        <div class="modal-content">
                                            <span class="close-btn">&times;</span>
                                            <h3 class="modal-title">Claim Reward Confirmation</h3>
                                            
                                            <div class="nft-info">
                                                <div class="nft-image"><img src="" alt="NFT Image" id="nftModalImage"></div>
                                                <div class="nft-details">
                                                    <h4 class="nft-name" id="nftModalName">NFT Name</h4>
                                                    <p class="nft-id" id="nftModalId">ID: #000000</p>
                                                    <p class="nft-quality" id="nftModalQuality">Quality: Common</p>
                                                </div>
                                            </div>
                                            
                                            <div class="reward-info">
                                                <h4>Estimated Rewards</h4>
                                                <div class="reward-period">
                                                    <span>Reward Calculation Period: </span>
                                                    <span class="reward-start-time" id="rewardStartTime">-</span>
                                                    <span> to </span>
                                                    <span class="reward-end-time" id="rewardEndTime">-</span>
                                                </div>
                                                
                                                <div class="reward-hours">
                                                    <span>Accumulated Duration: </span>
                                                    <span class="hours-value" id="rewardHours">0</span>
                                                    <span> hours</span>
                                                </div>
                                                
                                                <div class="reward-amounts">
                                                    <div class="reward-item">
                                                        <span class="reward-icon">🪙</span>
                                                        <div>
                                                            <span class="reward-name">PWPOT:</span>
                                                            <span class="reward-value" id="pwpotReward">0</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="reward-item">
                                                        <span class="reward-icon">💎</span>
                                                        <div>
                                                            <span class="reward-name">PWBOT:</span>
                                                            <span class="reward-value" id="pwbotReward">0</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div id="errorMessage" class="error-message hidden">
                                                An error occurred while processing the request. Please try again later.
                                            </div>
                                            
                                            <div class="modal-actions">
                                                <button id="cancelClaimBtn" class="cancel-btn">Cancel</button>
                                                <button id="confirmClaimBtn" class="confirm-btn">Confirm Claim</button>
                                            </div>
                                            
                                            <div id="loadingIndicator" class="loading-indicator hidden">
                                                <div class="spinner"></div>
                                                <p>Processing, please wait...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            
                            const modalContainer = document.createElement('div');
                            modalContainer.innerHTML = modalHTML;
                            document.body.appendChild(modalContainer);
                        }
                        
                        // Check if the script has already been loaded
                        if (!document.querySelector('script[src="../../scripts/other/rewardClaimModal.js"]')) {
                            // Load the script
                            const scriptEl = document.createElement('script');
                            scriptEl.src = '../../scripts/other/rewardClaimModal.js';
                            scriptEl.onload = function() {
                                window.isLoadingRewardModal = false;
                                console.log('RewardClaimModal script loaded successfully');
                                // Ensure the RewardClaimModal is loaded before calling
                                setTimeout(function() {
                                    // If the initialization method exists, initialize it first
                                    if (window.RewardClaimModal && window.RewardClaimModal.init) {
                                        window.RewardClaimModal.init();
                                    }
                                    handleRewardClaim();
                                }, 200);
                            };
                            scriptEl.onerror = function() {
                                window.isLoadingRewardModal = false;
                                console.error('RewardClaimModal script loading failed');
                                // Use simple confirmation when loading fails
                                showSimpleRewardConfirm();
                            };
                            document.body.appendChild(scriptEl);
                        } else {
                            // The script tag already exists, but it may still be loading
                            setTimeout(function() {
                                window.isLoadingRewardModal = false;
                                console.log('Using existing RewardClaimModal script');
                                handleRewardClaim();
                            }, 500);
                        }
                    } else {
                        // If it is already being loaded, wait for a while and try again
                        console.log('RewardClaimModal is being loaded, waiting...');
                        setTimeout(function() {
                            if (typeof window.RewardClaimModal !== 'undefined') {
                                handleRewardClaim();
                            } else {
                                console.warn('Waiting for RewardClaimModal timeout, using simple confirmation');
                                showSimpleRewardConfirm();
                            }
                        }, 1000);
                    }
                } else {
                    // RewardClaimModal is loaded, directly calling
                    console.log('RewardClaimModal is loaded, directly calling');
                    handleRewardClaim();
                }
                
                function handleRewardClaim() {
                    // Get information from the card and contract, calculate the estimated rewards
                    calculateEstimatedRewards(tokenId, contractAddress)
                        .then(function(rewardData) {
                            // Prepare NFT data
                            const nftData = {
                                id: tokenId,
                                name: card.querySelector('.game-pet-header h3').textContent,
                                imageUrl: card.querySelector('.game-pet-image img')?.src || '',
                                quality: rarity
                            };
                            
                            // Register the reward claim confirmation callback
                            window.onRewardClaimConfirm = async function(nftData) {
                                console.log('开始处理游戏模式的奖励领取:', nftData);
                                
                                try {
                                    // Ensure Web3 is initialized
                                    if (!window.web3) {
                                        if (window.ethereum) {
                                            try {
                                                window.web3 = new Web3(window.ethereum);
                                            } catch (e) {
                                                console.error('Failed to initialize Web3:', e);
                                                return { success: false, message: 'Failed to initialize Web3, please refresh the page and try again' };
                                            }
                                        } else {
                                            return { success: false, message: 'No Web3 environment detected, please install MetaMask wallet' };
                                        }
                                    }
                                    
                                    // Get the user address - prioritize private key wallet
                                    let userAddress;
                                    
                                    // Priority 1: Check private key wallet
                                    if (window.SecureWalletManager && 
                                        window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                        window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                                        userAddress = window.SecureWalletManager.getAddress();
                                        console.log('Using private key wallet for reward claim:', userAddress);
                                    } else {
                                        // Priority 2: Check connected wallet
                                    const accounts = await window.web3.eth.getAccounts();
                                        userAddress = accounts[0];
                                        console.log('Using connected wallet for reward claim:', userAddress);
                                    }
                                    
                                    if (!userAddress) {
                                        return { success: false, message: 'Please connect your wallet to claim rewards' };
                                    }
                                    
                                    // Ensure the contract instance exists
                                    if (!window.nftFeedingManagerContract) {
                                        return { success: false, message: 'NFTFeedingManager contract not initialized' };
                                    }
                                    
                                    // Check the authorization status of the PwPointManager contract
                                    const pwPointAddress = window.getContractAddress ? window.getContractAddress('PwPoint') : null;
                                    const pwPointManagerAddress = window.getContractAddress ? window.getContractAddress('PwPointManager') : null;
                                    
                                    if (!pwPointAddress || !pwPointManagerAddress) {
                                        console.error('Failed to get PwPoint or PwPointManager contract address');
                                        return { success: false, message: 'Failed to get contract address, please refresh the page and try again' };
                                    }
                                    
                                    // Create the PwPoint contract instance
                                    const pwPointABI = window.PwPointABI || window.GENERIC_ERC20_ABI;
                                    if (!pwPointABI) {
                                        console.error('Failed to get PwPoint ABI');
                                        // Try to dynamically load PwPointABI
                                        if (!document.querySelector('script[src*="PwPointABI.js"]')) {
                                            try {
                                                console.log('Attempting to dynamically load PwPointABI.js');
                                                const scriptEl = document.createElement('script');
                                                scriptEl.src = '../../scripts/contracts/ABI/PwPointABI.js';
                                                document.head.appendChild(scriptEl);
                                                
                                                // Wait for the script to load
                                                await new Promise(resolve => {
                                                    scriptEl.onload = resolve;
                                                    setTimeout(resolve, 1000); // Maximum wait time of 1 second
                                                });
                                                
                                                if (!window.PwPointABI) {
                                                    console.log('After loading, still failed to get PwPointABI, trying to use GENERIC_ERC20_ABI');
                                                    
                                                    // If still not available, try to load the generic ERC20 ABI
                                                    if (!window.GENERIC_ERC20_ABI) {
                                                        const genericAbiScript = document.createElement('script');
                                                        genericAbiScript.src = '../../scripts/contracts/ABI/GENERIC_ERC20_ABI.js';
                                                        document.head.appendChild(genericAbiScript);
                                                        
                                                        await new Promise(resolve => {
                                                            genericAbiScript.onload = resolve;
                                                            setTimeout(resolve, 1000);
                                                        });
                                                    }
                                                }
                                            } catch (loadError) {
                                                console.error('Failed to load ABI file:', loadError);
                                            }
                                        }
                                        
                                        
                                        const pwPointContract = new window.web3.eth.Contract(
                                            window.PwPointABI || window.GENERIC_ERC20_ABI, 
                                            pwPointAddress
                                        );
                                        
                                        console.log('Using minimal ABI to create a contract instance');
                                        
                                        // Check the authorization
                                        const allowance = await pwPointContract.methods.allowance(userAddress, pwPointManagerAddress).call();
                                        const requiredAmount = window.web3.utils.toWei('1000000000', 'ether'); // A sufficiently large number
                                        
                                        console.log(`PwPoint authorization status: allowance=${allowance}`);
                                        
                                        if (window.web3.utils.toBN(allowance).lt(window.web3.utils.toBN(requiredAmount))) {
                                            console.log('Need to authorize PwPoint tokens...');
                                            
                                            // For private key wallets, auto-approve without confirmation dialog
                                            // For connected wallets, auto-approve as well for smoother experience
                                            console.log('Auto-approving PwPoint tokens for smoother experience...');
                                            
                                            try {
                                                // Execute the authorization
                                                const gasEstimate = await pwPointContract.methods.approve(
                                                    pwPointManagerAddress, 
                                                    "115792089237316195423570985008687907853269984665640564039457584007913129639935" // 最大值
                                                ).estimateGas({
                                                    from: userAddress
                                                });
                                                
                                                let approveTransaction;
                                                if (window.SecureWalletManager && 
                                                    window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                                    window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                                                    // Use private key wallet for transaction
                                                    approveTransaction = await window.SecureWalletManager.sendContractTransaction(
                                                        pwPointContract,
                                                        'approve',
                                                        [pwPointManagerAddress, "115792089237316195423570985008687907853269984665640564039457584007913129639935"],
                                                        { gas: Math.floor(gasEstimate * 1.5) }
                                                    );
                                                } else {
                                                    // Use connected wallet for transaction
                                                    approveTransaction = await pwPointContract.methods.approve(
                                                    pwPointManagerAddress, 
                                                    "115792089237316195423570985008687907853269984665640564039457584007913129639935" // 最大值
                                                ).send({
                                                    from: userAddress,
                                                    gas: Math.floor(gasEstimate * 1.5) // Add 50% gas as a buffer
                                                });
                                                }
                                                
                                                console.log('PwPoint authorization successful:', approveTransaction);
                                            } catch (approveError) {
                                                console.error('PwPoint authorization failed:', approveError);
                                                return { success: false, message: 'Authorization failed: ' + (approveError.message || 'Unknown error') };
                                            }
                                        }
                                        
                                        return { success: false, message: 'Continue processing reward claim' };
                                    }
                                    
                                    const pwPointContract = new window.web3.eth.Contract(pwPointABI, pwPointAddress);
                                    
                                    // Display the claim in progress prompt
                                    console.log('Starting reward claim...');
                                    
                                    // Call the contract to claim rewards
                                    // Check if using private key wallet for transactions
                                    const shouldUsePrivateKey = window.SecureWalletManager && 
                                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                                    
                                    let tx;
                                    if (shouldUsePrivateKey) {
                                        // Use private key wallet for transaction
                                        tx = await window.SecureWalletManager.sendContractTransaction(
                                            window.nftFeedingManagerContract,
                                            'claimRewards',
                                            [[tokenId]],
                                            { gas: 300000 }
                                        );
                                    } else {
                                        // Use connected wallet for transaction
                                        tx = await window.nftFeedingManagerContract.methods.claimRewards([tokenId]).send({
                                        from: userAddress,
                                        gas: 300000
                                    });
                                    }
                                    
                                    // Extract actual reward amounts from transaction receipt
                                    let actualRewards = { pwpotAmount: 0, pwbotAmount: 0 };
                                    if (window.RewardNotification && window.RewardNotification.extractRewardAmountsFromTransaction) {
                                        actualRewards = window.RewardNotification.extractRewardAmountsFromTransaction(tx);
                                    }
                                    
                                    // Show reward notification
                                    if (window.RewardNotification && window.RewardNotification.showRewardClaimed) {
                                        window.RewardNotification.showRewardClaimed({
                                            pwpotAmount: actualRewards.pwpotAmount,
                                            pwbotAmount: actualRewards.pwbotAmount,
                                            transactionHash: tx.transactionHash,
                                            tokenId: tokenId,
                                            nftName: card.querySelector('.game-pet-header h3').textContent || `NFT #${tokenId}`
                                        });
                                    } else {
                                        // Fallback notification if RewardNotification is not available
                                        const pwpotFormatted = actualRewards.pwpotAmount > 0 ? Math.floor(actualRewards.pwpotAmount).toString() : '0';
                                        const pwbotFormatted = actualRewards.pwbotAmount > 0 ? Math.floor(actualRewards.pwbotAmount).toString() : '0';
                                        
                                        if (window.showNotification) {
                                            window.showNotification(
                                                `🎉 Rewards Claimed!\nPWPOT: ${pwpotFormatted}\nPWBOT: ${pwbotFormatted}`, 
                                                'success'
                                            );
                                        }
                                    }
                                    
                                    // Update the feeding information
                                    try {
                                        const updatedFeedingInfo = await window.nftFeedingManagerContract.methods.nftFeeding(tokenId).call();
                                        if (updatedFeedingInfo) {
                                            // Calculate the actual satiety
                                            const realFeedingHours = calculateRealFeedingHours({
                                                feedingHours: parseInt(updatedFeedingInfo.feedingHours) || 0,
                                                lastFeedTime: parseInt(updatedFeedingInfo.lastFeedTime) || 0,
                                                isActive: Boolean(updatedFeedingInfo.isActive)
                                            });
                                            
                                            // Update the card satiety
                                            updatePetSatiety(card, realFeedingHours);
                                        }
                                    } catch (updateError) {
                                        console.error('Failed to update feeding information:', updateError);
                                        // Continue execution,不影响奖励领取结果
                                    }
                                    
                                    // Trigger the custom event to notify the reward claim success
                                    const claimEvent = new CustomEvent('gamepetcard.action', {
                    detail: {
                                            action: 'claim-completed',
                        tokenId: tokenId,
                        contractAddress: contractAddress,
                                            transaction: tx,
                        element: card
                    },
                    bubbles: true
                });
                                    card.dispatchEvent(claimEvent);
                                    
                                    return { 
                                        success: true, 
                                        actualRewards: actualRewards,
                                        transactionHash: tx.transactionHash || tx.hash,
                                        transaction: tx
                                    };
                                } catch (error) {
                                    console.error("Reward claim failed:", error);
                                    showFeedingMessage(card, "Reward claim failed: " + (error.message || "Unknown error"), "error");
                                    return { success: false, message: error.message || 'Error occurred during reward claim' };
                                }
                            };
                            
                            // Display the reward modal
                            if (typeof window.RewardClaimModal !== 'undefined' && 
                                typeof window.RewardClaimModal.open === 'function') {
                                // Ensure the reward data contains accumulated cycle information
                                if (rewardData.hasAccumulated || rewardData.accumulatedHours > 0) {
                                    console.log(`Displaying reward information with accumulated cycle: accumulated cycle=${rewardData.accumulatedHours} hours, new cycle=${rewardData.newHours} hours`);
                                }
                                
                                const result = window.RewardClaimModal.open(nftData, rewardData);
                                // If the modal fails to open, display a simple confirmation
                                if (result === false) {
                                    console.warn('Modal failed to open, using simple confirmation');
                                    showSimpleRewardConfirm();
                                }
                            } else {
                                console.error('RewardClaimModal not loaded correctly');
                                showSimpleRewardConfirm();
                            }
                        })
                        .catch(function(error) {
                            console.error('Failed to get reward data:', error);
                            showFeedingMessage(card, 'Failed to get reward data, please try again later', 'error');
                        });
                }
                
                function showSimpleRewardConfirm() {
                    // Simple confirmation, used when there is no modal
                    calculateEstimatedRewards(tokenId, contractAddress)
                        .then(function(rewardData) {
                            // Build the time information text, including accumulated cycle and new cycle
                            let timeInfo = `Accumulated time: ${rewardData.hours} hours`;
                            
                            // If there is an accumulated cycle, display detailed information
                            if (rewardData.hasAccumulated) {
                                timeInfo = `Total time: ${rewardData.hours} hours (Accumulated cycle: ${rewardData.accumulatedHours} hours, New cycle: ${rewardData.newHours} hours)`;
                            }
                            
                            // Add level multiplier information and base reward calculation
                            const message = `Your pet can claim rewards:\n- ${timeInfo}\n- Pet level: Lv.${rewardData.nftLevel} (${rewardData.levelMultiplier}x reward)\n- PWPOT: ${rewardData.pwpot.toFixed(2)} (Base ${rewardData.baseRewardPwpot.toFixed(2)} × level multiplier ${rewardData.levelMultiplier})\n- PWBOT: ${rewardData.pwbot.toFixed(2)} (Base ${rewardData.baseRewardPwbot.toFixed(2)} × level multiplier ${rewardData.levelMultiplier})\n\nConfirm领取这些奖励吗？`;
                            
                            if (confirm(message)) {
                                // Execute the same claim logic as the modal
                                const nftData = {
                                    id: tokenId,
                                    name: card.querySelector('.game-pet-header h3').textContent,
                                    imageUrl: card.querySelector('.game-pet-image img')?.src || '',
                                    quality: rarity,
                                    level: rewardData.nftLevel
                                };
                                
                                // If the claim callback is defined, call it
                                if (window.onRewardClaimConfirm) {
                                    // Removed processing message for smoother experience
                                    window.onRewardClaimConfirm(nftData)
                                        .then(function(result) {
                                            if (!result || !result.success) {
                                                showFeedingMessage(card, result?.message || 'Failed to claim rewards', 'error');
                                            }
                                        })
                                        .catch(function(error) {
                                            console.error('Failed to claim rewards:', error);
                                            showFeedingMessage(card, 'Failed to claim rewards: ' + error.message, 'error');
                                        });
                                } else {
                                    // Trigger the claim event
                                    const actionEvent = new CustomEvent('gamepetcard.action', {
                                        detail: {
                                            action: 'claim',
                                            tokenId: tokenId,
                                            contractAddress: contractAddress,
                                            element: card,
                                            rewards: rewardData
                                        },
                                        bubbles: true
                                    });
                
                                    card.dispatchEvent(actionEvent);
                                    // Removed processing message for smoother experience
                                }
                            }
                        })
                        .catch(function(error) {
                            console.error('Failed to get reward data:', error);
                            showFeedingMessage(card, 'Failed to get reward data, please try again later', 'error');
                        });
                }
            });
        }
        
        // Bind the play button click event
        if (playButton) {
            playButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                addButtonClickEffect(playButton);
                
                // Trigger the custom event
                const actionEvent = new CustomEvent('gamepetcard.action', {
                    detail: {
                        action: 'play',
                        tokenId: tokenId,
                        contractAddress: contractAddress,
                        element: card
                    },
                    bubbles: true
                });
                
                card.dispatchEvent(actionEvent);
            });
        }
        
        // Bind the training button click event
        if (trainButton) {
            trainButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                addButtonClickEffect(trainButton);
                
                // Trigger the custom event
                const actionEvent = new CustomEvent('gamepetcard.action', {
                    detail: {
                        action: 'train',
                        tokenId: tokenId,
                        contractAddress: contractAddress,
                        element: card
                    },
                    bubbles: true
                });
                
                card.dispatchEvent(actionEvent);
            });
        }
    }
    
    /**
     * Add button click effect
     * @param {HTMLElement} button - Button element
     */
    function addButtonClickEffect(button) {
        // Add click class
        button.classList.add('clicked');
        
        // Remove class after 300ms
        setTimeout(() => {
            button.classList.remove('clicked');
        }, 300);
    }
    
    /**
     * Calculate estimated rewards
     * @param {string} tokenId - NFT ID
     * @param {string} contractAddress - NFT contract address
     * @returns {Promise<Object>} Reward data object
     */
    async function calculateEstimatedRewards(tokenId, contractAddress) {
        try {
            // Confirm that the contract instance is initialized
            if (!window.nftFeedingManagerContract) {
                console.error('NFTFeedingManager contract not initialized');
                return Promise.reject(new Error('Contract not initialized'));
            }
            
            // Get the NFT feeding information
            const feedingInfo = await window.nftFeedingManagerContract.methods.nftFeeding(tokenId).call();
            
            // Check if there is a last claim time
            if (!feedingInfo || !feedingInfo.lastClaimTime) {
                return {
                    startTime: new Date(),
                    endTime: new Date(),
                    hours: 0,
                    pwpot: 0,
                    pwbot: 0
                };
            }
            
            // Get the reward information on the current card
            const petCards = document.querySelectorAll('.game-pet-card');
            let card;
            
            for (const c of petCards) {
                if (c.dataset.tokenId === tokenId) {
                    card = c;
                    break;
                }
            }
            
            if (!card) {
                console.error(`Card with tokenId ${tokenId} not found`);
                return Promise.reject(new Error('Card not found'));
            }
            
            // Get the hourly reward from the card
            const pwpotText = card.querySelector('.pwpot-reward').textContent;
            const pwbotText = card.querySelector('.pwbot-reward').textContent;
            
            const hourlyPwpot = parseFloat(pwpotText.split(' ')[0]) || 0;
            const hourlyPwbot = parseFloat(pwbotText.split(' ')[0]) || 0;
            
            // Get the last claim time (seconds)
            const lastClaimTime = parseInt(feedingInfo.lastClaimTime);
            
            // Get the accumulated cycle number (if any)
            const accumulatedCycles = parseInt(feedingInfo.accumulatedCycles) || 0;
            
            // Current time (seconds)
            const currentTime = Math.floor(Date.now() / 1000);
        
            // Calculate the elapsed hours (integer)
            const elapsedHoursRaw = Math.floor((currentTime - lastClaimTime) / 3600);
            const elapsedHours = elapsedHoursRaw; // Removed the limit
            
            // Convert accumulated cycles to hours
            const accumulatedHours = accumulatedCycles;
            
            // Total hours (accumulated cycles + new cycle)
            const totalHours = elapsedHours + accumulatedHours;
            
            // Get the NFT level
            const nftLevel = parseInt(card.dataset.level) || 1;
            
            // Calculate the level reward multiplier based on the level multiplier rule
            const levelMultiplier = nftLevel; // 1级=1倍, 2级=2倍, 3级=3倍，以此类推
            
            // Calculate the base reward (hourly reward × total hours)
            const baseRewardPwpot = hourlyPwpot * totalHours;
            const baseRewardPwbot = hourlyPwbot * totalHours;
            
            // Apply the level multiplier to calculate the final reward
            const pwpotReward = baseRewardPwpot * levelMultiplier;
            const pwbotReward = baseRewardPwbot * levelMultiplier;
            
            return {
                startTime: new Date(lastClaimTime * 1000), // Convert to milliseconds
                endTime: new Date(currentTime * 1000), // Convert to milliseconds
                hours: totalHours,
                hoursRaw: elapsedHoursRaw,
                accumulatedHours: accumulatedHours,
                newHours: elapsedHours,
                pwpot: pwpotReward,
                pwbot: pwbotReward,
                hasAccumulated: accumulatedHours > 0,
                levelMultiplier: levelMultiplier,
                nftLevel: nftLevel,
                baseRewardPwpot: baseRewardPwpot,
                baseRewardPwbot: baseRewardPwbot
            };
        } catch (error) {
            console.error('Error calculating rewards:', error);
            return Promise.reject(error);
        }
    }
    
  
    
    /**
     * Get a random pet emoji
     * @returns {string} Pet emoji
     */
    function getRandomPetEmoji() {
        const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦄', '🐝', '🐢', '🦎'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }
    
    /**
     * Update pet status
     * @param {HTMLElement} card - Card element
     * @param {Object} stats - New status data, format: {health: 90}
     */
    function updatePetStats(card, stats) {
        if (!card || !stats) return;
        
        // Update satiety
        if (typeof stats.health === 'number') {
            const healthBar = card.querySelector('.game-stat-health .game-stat-value');
            const healthNumber = card.querySelector('.game-stat-health .game-stat-number');
            
            if (healthBar && healthNumber) {
                healthBar.style.width = `${stats.health}%`;
                healthNumber.textContent = `${stats.health}/100`;
            }
        }
    }
    
    /**
     * Add card to container
     * @param {Object} nft - NFT data object
     * @param {HTMLElement} container - Target container
     * @returns {HTMLElement} Created card element
     */
    function appendCardToContainer(nft, container) {
        if (!container) {
            console.error('Failed to add game card: container does not exist');
            return null;
        }
        
        // Check if there is preprocessed quality information
        if (nft.normalizedQuality) {
            console.log(`Using preprocessed quality information: "${nft.normalizedQuality}"`);
            // Temporarily save the correct quality data to ensure it is used in createGamePetCard
            const originalRarity = nft.rarity;
            
            // If it comes from metadata, modify the metadata
            if (nft.metadata && nft.metadata.attributes) {
                const qualityAttr = nft.metadata.attributes.find(attr => 
                    attr.trait_type === 'Quality' || 
                    attr.trait_type === 'Rarity' || 
                    attr.trait_type === 'quality' || 
                    attr.trait_type === 'rarity'
                );
                
                if (qualityAttr) {
                    console.log(`Modify metadata quality, original value="${qualityAttr.value}", new value="${nft.normalizedQuality}"`);
                    // Remember the original value, so it can be restored when needed
                    nft._originalQuality = qualityAttr.value;
                    // Set to the standardized value
                    qualityAttr.value = nft.normalizedQuality;
                } else {
                    // If there is no quality attribute, add one
                    console.log(`Add missing quality attribute: "${nft.normalizedQuality}"`);
                    nft.metadata.attributes.push({
                        trait_type: 'Quality',
                        value: nft.normalizedQuality
                    });
                }
            }
            
            // Set the quality of the NFT object directly
            nft.rarity = nft.normalizedQuality;
        }
        
        const card = createGamePetCard(nft);
        
        // Restore the original quality value, to avoid affecting other uses
        if (nft._originalQuality && nft.metadata && nft.metadata.attributes) {
            const qualityAttr = nft.metadata.attributes.find(attr => 
                attr.trait_type === 'Quality' || 
                attr.trait_type === 'Rarity' || 
                attr.trait_type === 'quality' || 
                attr.trait_type === 'rarity'
            );
            
            if (qualityAttr) {
                qualityAttr.value = nft._originalQuality;
                console.log(`Restore metadata quality to original value: "${nft._originalQuality}"`);
            }
            
            // Clean up temporary attributes
            delete nft._originalQuality;
        }
        
        container.appendChild(card);
        return card;
    }
    
    /**
     * Bind global event listeners
     * @param {Object} handlers - Event handler mapping
     */
    function bindGlobalEvents(handlers) {
        if (!handlers) return;
        
        // Pet operation event listener
        if (handlers.onAction && typeof handlers.onAction === 'function') {
            document.addEventListener('gamepetcard.action', function(event) {
                handlers.onAction(event.detail);
            });
        }
    }
    
    // Add function to update satiety
    function updatePetSatiety(card, feedingHours) {
        if (!card) return;
        
        // Ensure the feeding hours are within a reasonable range
        feedingHours = Math.max(0, Math.min(MAX_FEEDING_HOURS, feedingHours));
        
        // Update card data attributes
        card.dataset.feedingHours = feedingHours;
        
        // Calculate the satiety percentage
        const satietyPercent = Math.round((feedingHours / MAX_FEEDING_HOURS) * 100);
        
        // Update UI elements
        const healthBar = card.querySelector('.game-stat-health .game-stat-value');
        const healthNumber = card.querySelector('.game-stat-health .game-stat-number');
        
        if (healthBar) {
            healthBar.style.width = `${satietyPercent}%`;
        }
        
        if (healthNumber) {
            healthNumber.textContent = `${feedingHours}/${MAX_FEEDING_HOURS}h`;
        }
    }
    
    /**
     * Get the best pet image
     * @param {Object} nft - NFT data object
     * @returns {Promise<Object>} Image result object, containing imageUrl, source, isLocal
     */
    async function getBestPetImage(nft) {
        const { tokenId, metadata } = nft;
        
        // Check cache
        if (window.gamePetImageCache && window.gamePetImageCache[tokenId]) {
            console.log(`Using cached image data (TokenId: ${tokenId})`);
            return window.gamePetImageCache[tokenId];
        }
        
        // Use PetNFTService to get the best image URL
        let imageResult;
        try {
            if (window.PetNFTService && typeof window.PetNFTService.getBestPetImageUrl === 'function') {
                console.log(`Using PetNFTService.getBestPetImageUrl to get image`);
                imageResult = await window.PetNFTService.getBestPetImageUrl(nft);
            } else {
                console.log(`PetNFTService is not available, using local image detection logic`);
                
                // Extract the actual name part from the name (if there is a format like "XXX #123")
                let petName = '';
                if (metadata && metadata.name) {
                    // Remove possible # and numeric suffixes, only keep the name part
                    petName = metadata.name.split('#')[0].trim();
                    console.log(`Extracted pet name from "${metadata.name}": "${petName}"`);
                }
                
                // If there is no valid name, use tokenId as a fallback
                if (!petName) {
                    petName = tokenId.toString();
                    console.log(`Using tokenId as pet name: "${petName}"`);
                }
                
                // Build the local image path
                const localImagePath = `/resources/images/pets/${petName}.jpg`;
                console.log(`Attempting to find local image: ${localImagePath}`);
                
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
                    console.warn(`Error checking local image (${petName}):`, error);
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
                                          (metadata?.originalImageUrl ? metadata.originalImageUrl : metadata?.image);
                                          
                    // Process IPFS links
                    let finalImageUrl = networkImageUrl;
                    if (finalImageUrl && finalImageUrl.startsWith('ipfs://')) {
                        finalImageUrl = finalImageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    }
                    
                    imageResult = {
                        imageUrl: finalImageUrl || '/resources/images/pets/pet_placeholder.jpg',
                        source: networkImageUrl ? 'network' : 'placeholder',
                        isLocal: false
                    };
                }
            }
        } catch (error) {
            console.error(`Error getting image URL:`, error);
            imageResult = {
                imageUrl: '/resources/images/pets/pet_placeholder.jpg',
                source: 'placeholder',
                isLocal: false
            };
        }
        
        console.log(`NFT #${tokenId} - Using image URL: ${imageResult.imageUrl} (source: ${imageResult.source})`);
        
        // Save to global cache
        if (!window.gamePetImageCache) window.gamePetImageCache = {};
        window.gamePetImageCache[tokenId] = imageResult;
        
        return imageResult;
    }
    
    /**
     * Calculate the pet level progress percentage
     * @param {number} level - Current level
     * @param {number} accumulatedFood - Accumulated feeding amount
     * @returns {Object} Object containing progress percentage and total required for the next level
     */
    function calculateLevelProgress(level, accumulatedFood) {
        // If already at the maximum level, return 100%
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
        
        // Determine the current threshold and next threshold based on the current level
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
    
    /**
     * Update pet level and accumulated feeding value
     * @param {HTMLElement} card - Card element
     * @param {number} level - Level
     * @param {number} accumulatedFood - Accumulated feeding amount
     */
    function updatePetLevel(card, level, accumulatedFood) {
        if (!card) return;
        
        // Update card data attributes
        card.dataset.level = level;
        card.dataset.accumulatedFood = accumulatedFood;
        
        // Update UI elements
        const levelElement = card.querySelector('.game-pet-level');
        if (levelElement) {
            levelElement.textContent = `Lv.${level}`;
        }
        
        // Calculate level progress
        const levelProgress = calculateLevelProgress(level, accumulatedFood);
        
        // Update level progress bar
        const levelBar = card.querySelector('.game-stat-level .game-stat-value');
        const levelNumber = card.querySelector('.game-stat-level .game-stat-number');
        
        if (levelBar) {
            levelBar.style.width = `${levelProgress.percent}%`;
        }
        
        if (levelNumber) {
            levelNumber.textContent = `${accumulatedFood}/${levelProgress.target}`;
        }
        
        console.log(`Update pet level - level: ${level}, accumulated feeding value: ${accumulatedFood}, progress: ${levelProgress.percent}%`);
    }
    
    // Return public interface
    return {
        createGamePetCard,
        appendCardToContainer,
        bindGlobalEvents,
        showFeedingMessage,
        updatePetSatiety,
        updatePetLevel,
        updatePetStats,
        calculateEstimatedRewards,
        getQualityRewards,
        calculateLevelProgress,
        MAX_FEEDING_HOURS // Expose constants if needed
    };
})();

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamePetCard;
} else {
    window.GamePetCard = GamePetCard;
    // Also expose createGamePetCard directly for backward compatibility
    window.createGamePetCard = GamePetCard.createGamePetCard;
} 