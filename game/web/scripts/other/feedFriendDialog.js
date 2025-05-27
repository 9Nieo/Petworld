/**
 * Feed Friend NFT Dialog
 * 
 * This module provides a dialog for feeding friend's NFT pets.
 * Users can input an NFT ID, view pet details, and feed it.
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
    // Debug utility
    const debug = {
        log: function() {
            console.log('[Feed Friend Dialog]', ...arguments);
        },
        error: function() {
            console.error('[Feed Friend Dialog Error]', ...arguments);
        },
        warn: function() {
            console.warn('[Feed Friend Dialog Warning]', ...arguments);
        }
    };
    
    // Dialog container reference
    let dialogContainer = null;
    
    // Current NFT data
    let currentNFT = null;
    
    // Feed hours options
    const FEED_HOURS_OPTIONS = [1, 6, 12, 24, 48, 72];
    
    // Maximum feeding hours
    const MAX_FEEDING_HOURS = 168; // 7 days
    
    // Constants that match PetCard component
    const DEFAULT_FEEDING_HOURS = 48; // Default feeding hours
    
    // Level upgrade thresholds
    const LEVEL_2_THRESHOLD = 1000; // Upgrade to level 2 requires 1000 PWFOOD
    const LEVEL_3_THRESHOLD = 3000; // Upgrade to level 3 requires 3000 PWFOOD
    const LEVEL_4_THRESHOLD = 10000; // Upgrade to level 4 requires 10000 PWFOOD
    const LEVEL_5_THRESHOLD = 30000; // Upgrade to level 5 requires 30000 PWFOOD
    const MAX_LEVEL = 5; // Maximum level
    
    // Dialog elements
    let dialogEl;
    let overlayEl;
    let tokenIdInputEl;
    let searchBtnEl;
    let petDetailsEl;
    let feedingOptionsEl;
    let feedBtnEl;
    let statusEl;
    
    /**
     * Create and show the feed friend dialog
     * @returns {HTMLElement} The dialog element
     */
    function showDialog() {
        // If dialog already exists, remove it first
        if (dialogContainer) {
            document.body.removeChild(dialogContainer);
        }
        
        // Create dialog container
        dialogContainer = document.createElement('div');
        dialogContainer.className = 'feed-friend-dialog-overlay';
        
        // Create dialog content
        const dialogContent = `
            <div class="feed-friend-dialog">
                <div class="dialog-header">
                    <h3>Feed Friend Pet</h3>
                    <button class="dialog-close-btn">&times;</button>
                </div>
                <div class="dialog-body">
                    <div class="search-section">
                        <div class="input-group">
                            <label for="nft-id-input">Pet ID</label>
                            <input type="number" id="nft-id-input" placeholder="Enter the ID of the pet NFT" min="1">
                        </div>
                        <button id="search-nft-btn" class="search-btn">Search Pet</button>
                    </div>
                    <div id="search-status" class="search-status"></div>
                    <div id="pet-details" class="pet-details">
                        <!-- Pet details will be inserted here -->
                    </div>
                    <div id="feeding-options" class="feeding-options" style="display: none;">
                        <h4>Select Feeding Time</h4>
                        <div class="feed-hours-options">
                            ${FEED_HOURS_OPTIONS.map(hours => `
                                <button class="feed-option-btn" data-hours="${hours}">${hours} hours</button>
                            `).join('')}
                        </div>
                        <div class="custom-hours">
                            <label for="custom-hours-input">Custom Time (hours)</label>
                            <input type="number" id="custom-hours-input" min="1" max="${MAX_FEEDING_HOURS}" value="24">
                            <button id="custom-feed-btn" class="feed-btn">Feed</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Set dialog content
        dialogContainer.innerHTML = dialogContent;
        
        // Add dialog to document
        document.body.appendChild(dialogContainer);
        
        // Add event listeners
        setupEventListeners();
        
        // Add dialog styles if not already added
        addDialogStyles();
        
        return dialogContainer;
    }
    
    /**
     * Set up event listeners for dialog elements
     */
    function setupEventListeners() {
        // Close button
        const closeBtn = dialogContainer.querySelector('.dialog-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideDialog);
        }
        
        // Click outside to close
        dialogContainer.addEventListener('click', function(event) {
            if (event.target === dialogContainer) {
                hideDialog();
            }
        });
        
        // Search button
        const searchBtn = dialogContainer.querySelector('#search-nft-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', handleSearch);
        }
        
        // NFT ID input (search on Enter)
        const nftIdInput = dialogContainer.querySelector('#nft-id-input');
        if (nftIdInput) {
            nftIdInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    handleSearch();
                }
            });
        }
        
        // Feed hours option buttons
        const feedOptionBtns = dialogContainer.querySelectorAll('.feed-option-btn');
        feedOptionBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const hours = parseInt(btn.getAttribute('data-hours'));
                handleFeed(hours);
            });
        });
        
        // Custom feed button
        const customFeedBtn = dialogContainer.querySelector('#custom-feed-btn');
        if (customFeedBtn) {
            customFeedBtn.addEventListener('click', function() {
                const customHoursInput = dialogContainer.querySelector('#custom-hours-input');
                if (customHoursInput) {
                    const hours = parseInt(customHoursInput.value);
                    if (!isNaN(hours) && hours > 0 && hours <= MAX_FEEDING_HOURS) {
                        handleFeed(hours);
                    } else {
                        showStatus('Please enter a valid feeding time (1-168 hours)', 'error');
                    }
                }
            });
        }
    }
    
    /**
     * Add dialog styles to document
     */
    function addDialogStyles() {
        // Check if styles are already added
        if (document.getElementById('feed-friend-dialog-styles')) {
            return;
        }
        
        // Create style element
        const styleEl = document.createElement('style');
        styleEl.id = 'feed-friend-dialog-styles';
        
        // Define styles
        styleEl.textContent = `
            .feed-friend-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .feed-friend-dialog {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                animation: dialogFadeIn 0.3s ease;
            }
            
            .dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
            }
            
            .dialog-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #333;
            }
            
            .dialog-close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
                transition: color 0.2s;
            }
            
            .dialog-close-btn:hover {
                color: #333;
            }
            
            .dialog-body {
                padding: 20px;
            }
            
            .search-section {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .input-group {
                display: flex;
                flex-direction: column;
                flex: 1;
            }
            
            .input-group label {
                margin-bottom: 5px;
                font-size: 0.9rem;
                color: #666;
            }
            
            #nft-id-input {
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
            }
            
            #nft-id-input:focus {
                border-color: #4a90e2;
                outline: none;
                box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
            }
            
            .search-btn {
                background-color: #4a90e2;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 0 20px;
                font-size: 1rem;
                cursor: pointer;
                transition: background-color 0.2s;
                align-self: flex-end;
                height: 42px;
            }
            
            .search-btn:hover {
                background-color: #3a80d2;
            }
            
            .search-status {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 4px;
                display: none;
            }
            
            .search-status.info {
                background-color: #e3f2fd;
                color: #1565c0;
                display: block;
            }
            
            .search-status.error {
                background-color: #ffebee;
                color: #c62828;
                display: block;
            }
            
            .search-status.success {
                background-color: #e8f5e9;
                color: #2e7d32;
                display: block;
            }
            
            .pet-details {
                margin-bottom: 20px;
            }
            
            .feeding-options {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .feeding-options h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #333;
            }
            
            .feed-hours-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .feed-option-btn {
                background-color: #66bb6a;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 15px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .feed-option-btn:hover {
                background-color: #4caf50;
            }
            
            .custom-hours {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
            }
            
            .custom-hours label {
                flex: 1 0 100%;
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 5px;
            }
            
            #custom-hours-input {
                flex: 1;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.9rem;
            }
            
            #custom-hours-input:focus {
                border-color: #4a90e2;
                outline: none;
            }
            
            .feed-btn {
                background-color: #ff7043;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 20px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .feed-btn:hover {
                background-color: #f4511e;
            }
            
            @keyframes dialogFadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Pet card styles for the dialog */
            .dialog-pet-card {
                position: relative;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border: 1px solid #eaeaea;
                margin-bottom: 15px;
            }
            
            .dialog-pet-card.common { border-left: 5px solid #9e9e9e; }
            .dialog-pet-card.good { border-left: 5px solid #4caf50; }
            .dialog-pet-card.excellent { border-left: 5px solid #2196f3; }
            .dialog-pet-card.rare { border-left: 5px solid #673ab7; }
            .dialog-pet-card.legendary { border-left: 5px solid #ff9800; }
            
            .dialog-pet-image {
                height: 150px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #f5f7fa;
                position: relative;
                overflow: hidden;
            }
            
            .dialog-pet-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .dialog-pet-quality {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 0.7rem;
                font-weight: bold;
                background-color: #f5f5f5;
            }
            
            .common .dialog-pet-quality { background-color: #9e9e9e; color: white; }
            .good .dialog-pet-quality { background-color: #4caf50; color: white; }
            .excellent .dialog-pet-quality { background-color: #2196f3; color: white; }
            .rare .dialog-pet-quality { background-color: #673ab7; color: white; }
            .legendary .dialog-pet-quality { background-color: #ff9800; color: white; }
            
            .dialog-pet-info {
                padding: 15px;
            }
            
            .dialog-pet-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .dialog-pet-header h4 {
                margin: 0;
                font-size: 1.2rem;
                color: #333;
            }
            
            .dialog-pet-id {
                font-size: 0.8rem;
                color: #757575;
            }
            
            .dialog-pet-level {
                margin-bottom: 10px;
                color: #555;
                font-size: 0.9rem;
            }
            
            .dialog-pet-level-progress {
                margin-bottom: 15px;
            }
            
            .dialog-level-label {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 0.85rem;
                color: #555;
            }
            
            .dialog-level-bar {
                height: 8px;
                background-color: #eee;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .dialog-level-value {
                height: 100%;
                background-color: #4caf50;
                border-radius: 4px;
                width: 0%;
            }
            
            .dialog-level-detail {
                font-size: 0.75rem;
                color: #757575;
                margin-top: 3px;
            }
            
            .dialog-pet-satiety {
                margin-bottom: 15px;
            }
            
            .dialog-satiety-label {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 0.85rem;
                color: #555;
            }
            
            .dialog-satiety-bar {
                height: 8px;
                background-color: #eee;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .dialog-satiety-value {
                height: 100%;
                background-color: #ff9800;
                border-radius: 4px;
                width: 0%;
            }
            
            .dialog-satiety-detail {
                font-size: 0.75rem;
                color: #757575;
                margin-top: 3px;
            }
            
            .dialog-pet-rewards {
                margin-top: 15px;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 4px;
            }
            
            .dialog-rewards-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }
            
            .dialog-rewards-detail {
                display: flex;
                justify-content: space-between;
            }
            
            .dialog-pwpot-reward, .dialog-pwbot-reward {
                font-size: 0.8rem;
                padding: 3px 8px;
                border-radius: 3px;
            }
            
            .dialog-pwpot-reward {
                background-color: #e8f5e9;
                color: #2e7d32;
            }
            
            .dialog-pwbot-reward {
                background-color: #fff3e0;
                color: #e65100;
            }
            
            @media (max-width: 600px) {
                .search-section {
                    flex-direction: column;
                }
                
                .search-btn {
                    width: 100%;
                }
            }
        `;
        
        // Add styles to document
        document.head.appendChild(styleEl);
    }
    
    /**
     * Hide the feed friend dialog
     */
    function hideDialog() {
        if (dialogContainer) {
            // Add fade-out animation
            dialogContainer.style.opacity = '0';
            dialogContainer.style.transform = 'translateY(-20px)';
            
            // Remove dialog after animation
            setTimeout(() => {
                if (dialogContainer && dialogContainer.parentNode) {
                    document.body.removeChild(dialogContainer);
                }
                dialogContainer = null;
            }, 300);
        }
    }
    
    /**
     * Handle search button click
     */
    async function handleSearch() {
        // Get NFT ID
        const nftIdInput = dialogContainer.querySelector('#nft-id-input');
        if (!nftIdInput) return;
        
        const nftId = nftIdInput.value.trim();
        if (!nftId) {
            showStatus('Please enter a valid pet ID', 'error');
            return;
        }
        
        // Clear current NFT
        currentNFT = null;
        
        // Update UI
        showStatus('Searching for pet...', 'info');
        document.getElementById('pet-details').innerHTML = '';
        document.getElementById('feeding-options').style.display = 'none';
        
        // Check if user is connected to wallet
        if (!isWalletConnected()) {
            showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        try {
            // Get NFT data
            const nftData = await getNFTData(nftId);
            
            // Store current NFT
            currentNFT = nftData;
            
            // Show NFT details
            showNFTDetails(nftData);
            
            // Show feeding options
            document.getElementById('feeding-options').style.display = 'block';
            
            // Clear status
            clearStatus();
        } catch (error) {
            debug.error('Error getting NFT data:', error);
            showStatus(`Failed to get pet data: ${error.message || 'Unknown error'}`, 'error');
        }
    }
    
    /**
     * Check if wallet is connected
     * @returns {boolean} True if wallet is connected
     */
    function isWalletConnected() {
        // Check localStorage and sessionStorage for wallet connection
        const localWalletConnected = localStorage.getItem('walletConnected') === 'true';
        const sessionWalletConnected = sessionStorage.getItem('walletConnected') === 'true';
        
        // Get current address if available
        const localAddress = localStorage.getItem('walletAddress');
        const sessionAddress = sessionStorage.getItem('walletAddress');
        const address = localAddress || sessionAddress;
        
        return (localWalletConnected || sessionWalletConnected) && address;
    }
    
    /**
     * Get current wallet address
     * @returns {string|null} Current wallet address or null if not connected
     */
    function getCurrentWalletAddress() {
        return localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
    }
    
    /**
     * Get NFT data from contract
     * @param {string|number} nftId - NFT ID
     * @returns {Promise<Object>} NFT data
     */
    async function getNFTData(nftId) {
        try {
            // Get contract instances
            const { pwNFTContract, nftFeedingManagerContract } = await getContractInstances();
            
            if (!pwNFTContract || !nftFeedingManagerContract) {
                throw new Error('Failed to initialize contracts, please refresh the page and try again');
            }
            
            // Check if NFT exists
            try {
                await pwNFTContract.methods.ownerOf(nftId).call();
            } catch (error) {
                throw new Error(`Pet with ID ${nftId} does not exist`);
            }
            
            // Get token URI to fetch metadata
            const tokenURI = await pwNFTContract.methods.tokenURI(nftId).call();
            
            // Get feeding info
            const feedingInfo = await nftFeedingManagerContract.methods.nftFeeding(nftId).call();
            
            // Get metadata
            const metadata = await fetchNFTMetadata(tokenURI);
            
            // Create NFT data object
            return {
                tokenId: nftId,
                tokenURI: tokenURI,
                metadata: metadata,
                feedingInfo: feedingInfo
            };
        } catch (error) {
            debug.error('Error getting NFT data:', error);
            throw error;
        }
    }
    
    /**
     * Fetch NFT metadata from URI
     * @param {string} tokenURI - Token URI
     * @returns {Promise<Object>} Metadata object
     */
    async function fetchNFTMetadata(tokenURI) {
        try {
            // Handle IPFS URIs
            let url = tokenURI;
            if (url.startsWith('ipfs://')) {
                url = url.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // Fetch metadata
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to get metadata: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            debug.error('Error fetching NFT metadata:', error);
            throw error;
        }
    }
    
    /**
     * Get contract instances
     * @returns {Promise<Object>} Contract instances
     */
    async function getContractInstances() {
        try {
            // Check if web3 is available
            if (!window.web3) {
                if (window.ethereum) {
                    window.web3 = new Web3(window.ethereum);
                } else {
                    throw new Error('No Web3 provider found, please install MetaMask or other compatible wallets');
                }
            }
            
            // Get contract addresses
            const network = window.currentNetwork || 'MAIN';
            if (!window.contractAddresses || !window.contractAddresses[network]) {
                throw new Error('Failed to get contract address configuration');
            }
            
            const pwNFTAddress = window.contractAddresses[network].PwNFT;
            const nftFeedingManagerAddress = window.contractAddresses[network].NFTFeedingManager;
            
            if (!pwNFTAddress || !nftFeedingManagerAddress) {
                throw new Error('Failed to get necessary contract addresses');
            }
            
            // Get contract ABIs
            if (!window.PwNFTABI || !window.NFTFeedingManagerABI) {
                throw new Error('Failed to get contract ABI definitions');
            }
            
            // Create contract instances
            const pwNFTContract = new window.web3.eth.Contract(window.PwNFTABI, pwNFTAddress);
            const nftFeedingManagerContract = new window.web3.eth.Contract(window.NFTFeedingManagerABI, nftFeedingManagerAddress);
            
            return { pwNFTContract, nftFeedingManagerContract };
        } catch (error) {
            debug.error('Error getting contract instances:', error);
            throw error;
        }
    }
    
    /**
     * Show NFT details in the dialog
     * @param {Object} nftData - NFT data object
     */
    function showNFTDetails(nftData) {
        try {
            const petDetailsEl = document.getElementById('pet-details');
            if (!petDetailsEl) return;
            
            const { tokenId, metadata, feedingInfo } = nftData;
            
            // Get pet quality
            let quality = 'COMMON';
            if (metadata && metadata.attributes) {
                const qualityAttr = metadata.attributes.find(attr => 
                    attr.trait_type === 'Quality' || 
                    attr.trait_type === 'Rarity' || 
                    attr.trait_type === 'quality' || 
                    attr.trait_type === 'rarity'
                );
                
                if (qualityAttr) {
                    quality = String(qualityAttr.value).toUpperCase();
                }
            }
            
            // Get pet name
            const petName = metadata.name || `Pet #${tokenId}`;
            
            // Get pet image
            let petImage = metadata.image || '';
            if (petImage.startsWith('ipfs://')) {
                petImage = petImage.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // Process feeding info
            let feedingHours = 0;
            if (feedingInfo) {
                // Calculate the real feeding hours using the same approach as PetCard component
                feedingHours = calculateRealFeedingHours(feedingInfo);
            }
            
            const satietyPercentage = Math.min(feedingHours / MAX_FEEDING_HOURS * 100, 100);
            
            // Get level info
            const accumulatedFood = feedingInfo ? parseInt(feedingInfo.accumulatedFood) : 0;
            const level = feedingInfo ? parseInt(feedingInfo.level) : 0;
            const levelProgress = calculateLevelProgress(level, accumulatedFood);
            
            // Get last claim time
            const claimTime = feedingInfo ? parseInt(feedingInfo.lastClaimTime) : 0;
            
            // Format timestamp to readable date
            const lastClaimDate = claimTime > 0 ? formatDate(new Date(claimTime * 1000)) : 'Never';
            
            // Create pet card HTML
            const cardHtml = `
                <div class="dialog-pet-card ${getQualityClass(quality)}">
                    <div class="dialog-pet-image">
                        <img src="${petImage}" alt="${petName}" onerror="this.src='../../resources/images/pets/placeholder.png'">
                        <div class="dialog-pet-quality">${getQualityName(quality)}</div>
                    </div>
                    <div class="dialog-pet-info">
                        <div class="dialog-pet-header">
                            <h4>${petName}</h4>
                            <span class="dialog-pet-id">#${tokenId}</span>
                        </div>
                        
                        <div class="dialog-pet-level">
                            <strong>Level:</strong> ${level}
                        </div>
                        
                        <div class="dialog-pet-level-progress">
                            <div class="dialog-level-label">
                                <span>Upgrade Progress</span>
                                <span>${levelProgress.percentage}%</span>
                            </div>
                            <div class="dialog-level-bar">
                                <div class="dialog-level-value" style="width: ${levelProgress.percentage}%"></div>
                            </div>
                            <div class="dialog-level-detail">
                                Accumulated ${accumulatedFood} / ${levelProgress.nextLevelFood} PWFOOD
                            </div>
                        </div>
                        
                        <div class="dialog-pet-satiety">
                            <div class="dialog-satiety-label">
                                <span>Satiety</span>
                                <span>${feedingHours} / ${MAX_FEEDING_HOURS} hours</span>
                            </div>
                            <div class="dialog-satiety-bar">
                                <div class="dialog-satiety-value" style="width: ${satietyPercentage}%"></div>
                            </div>
                            <div class="dialog-satiety-detail">
                                Last Feeding: ${lastClaimDate}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Set pet card HTML
            petDetailsEl.innerHTML = cardHtml;
        } catch (error) {
            debug.error('Error showing NFT details:', error);
            petDetailsEl.innerHTML = `<div class="error-message">Error showing pet details: ${error.message || 'Unknown error'}</div>`;
        }
    }
    
    /**
     * Get quality class for CSS
     * @param {string} qualityId - Quality ID
     * @returns {string} CSS class name
     */
    function getQualityClass(qualityId) {
        const qualityStr = String(qualityId).toUpperCase();
        
        if (qualityStr === 'LEGENDARY' || qualityStr === 'LEGEND' || qualityStr === 'EPIC') {
            return 'legendary';
        }
        
        if (qualityStr === 'RARE' || qualityStr === 'PURPLE' || qualityStr === 'PURPLE-RARE') {
            return 'rare';
        }
        
        if (qualityStr === 'EXCELLENT') {
            return 'excellent';
        }
        
        if (qualityStr === 'GOOD' || qualityStr === 'UNCOMMON') {
            return 'good';
        }
        
        return 'common';
    }
    
    /**
     * Get quality display name
     * @param {string} qualityId - Quality ID
     * @returns {string} Quality display name
     */
    function getQualityName(qualityId) {
        const qualityStr = String(qualityId).toUpperCase();
        
        if (qualityStr === 'LEGENDARY' || qualityStr === 'LEGEND' || qualityStr === 'EPIC') {
            return 'Legendary';
        }
        
        if (qualityStr === 'RARE' || qualityStr === 'PURPLE' || qualityStr === 'PURPLE-RARE') {
            return 'Rare';
        }
        
        if (qualityStr === 'EXCELLENT') {
            return 'Excellent';
        }
        
        if (qualityStr === 'GOOD' || qualityStr === 'UNCOMMON') {
            return 'Good';
        }
        
        return 'Common';
    }
    
    /**
     * Calculate level progress
     * @param {number} level - Current level
     * @param {number} accumulatedFood - Accumulated food amount
     * @returns {Object} Progress info
     */
    function calculateLevelProgress(level, accumulatedFood) {
        // If already at max level, return 100%
        if (level >= MAX_LEVEL) {
            return {
                percentage: 100,
                nextLevelFood: LEVEL_5_THRESHOLD,
                progress: accumulatedFood,
                target: LEVEL_5_THRESHOLD
            };
        }
        
        let currentThreshold = 0;
        let nextThreshold = LEVEL_2_THRESHOLD;
        
        // Determine current and next thresholds based on level
        switch (level) {
            case 1:
                currentThreshold = 0;
                nextThreshold = LEVEL_2_THRESHOLD;
                break;
            case 2:
                currentThreshold = LEVEL_2_THRESHOLD;
                nextThreshold = LEVEL_3_THRESHOLD;
                break;
            case 3:
                currentThreshold = LEVEL_3_THRESHOLD;
                nextThreshold = LEVEL_4_THRESHOLD;
                break;
            case 4:
                currentThreshold = LEVEL_4_THRESHOLD;
                nextThreshold = LEVEL_5_THRESHOLD;
                break;
            default:
                currentThreshold = 0;
                nextThreshold = LEVEL_2_THRESHOLD;
        }
        
        // Calculate progress percentage
        const levelProgress = accumulatedFood - currentThreshold;
        const levelTarget = nextThreshold - currentThreshold;
        const percentage = Math.min(100, Math.round((levelProgress / levelTarget) * 100));
        
        return {
            percentage: percentage,
            nextLevelFood: nextThreshold,
            progress: levelProgress,
            target: levelTarget
        };
    }
    
    /**
     * Format date to readable string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        try {
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return date.toString();
        }
    }
    
    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Status type (info, error, success)
     */
    function showStatus(message, type = 'info') {
        const statusEl = document.getElementById('search-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `search-status ${type}`;
        }
    }
    
    /**
     * Clear status message
     */
    function clearStatus() {
        const statusEl = document.getElementById('search-status');
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'search-status';
        }
    }
    
    /**
     * Handle feed action
     * @param {number} hours - Feeding hours
     */
    async function handleFeed(hours) {
        try {
            // Validate hours
            if (isNaN(hours) || hours <= 0 || hours > MAX_FEEDING_HOURS) {
                showStatus(`Please enter a valid feeding time (1-${MAX_FEEDING_HOURS} hours)`, 'error');
                return;
            }
            
            // Check if NFT is loaded
            if (!currentNFT) {
                showStatus('Please search for a pet first', 'error');
                return;
            }
            
            // Get token ID
            const tokenId = currentNFT.tokenId;
            
            // Show feeding status
            showStatus(`Feeding pet #${tokenId} for ${hours} hours...`, 'info');
            
            // Check if PetFeeding module is available
            if (!window.PetFeeding) {
                try {
                    // Try to load PetFeeding module
                    await loadPetFeedingModule();
                } catch (error) {
                    debug.error('Failed to load PetFeeding module:', error);
                    
                    // Fall back to direct contract call
                    await feedNFTDirectly(tokenId, hours);
                    return;
                }
            }
            
            // Use PetFeeding module if available
            if (window.PetFeeding) {
                await feedNFTWithModule(tokenId, hours);
            } else {
                // Fall back to direct contract call
                await feedNFTDirectly(tokenId, hours);
            }
        } catch (error) {
            debug.error('Error feeding NFT:', error);
            showStatus(`Feeding failed: ${error.message || 'Unknown error'}`, 'error');
        }
    }
    
    /**
     * Load PetFeeding module
     * @returns {Promise<void>}
     */
    async function loadPetFeedingModule() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.PetFeeding) {
                return resolve();
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = '../../scripts/functionPackages/PetFeeding.js';
            script.async = true;
            
            // Handle load event
            script.onload = () => {
                debug.log('PetFeeding module loaded successfully');
                resolve();
            };
            
            // Handle error event
            script.onerror = (error) => {
                debug.error('Failed to load PetFeeding module:', error);
                reject(new Error('Failed to load PetFeeding module'));
            };
            
            // Add script to document
            document.head.appendChild(script);
        });
    }
    
    /**
     * Feed NFT using PetFeeding module
     * @param {string|number} tokenId - NFT token ID
     * @param {number} hours - Feeding hours
     */
    async function feedNFTWithModule(tokenId, hours) {
        try {
            // Check if wallet is connected
            if (!isWalletConnected()) {
                showStatus('Please connect your wallet first', 'error');
                return;
            }
            
            // Get current wallet address
            const userAddress = getCurrentWalletAddress();
            if (!userAddress) {
                showStatus('Failed to get wallet address, please reconnect your wallet', 'error');
                return;
            }
            
            // Prepare feed data
            const feedData = {
                tokenId: tokenId,
                feedHours: hours,
                element: document.querySelector('.dialog-pet-card')
            };
            
            // Call PetFeeding module
            const result = await window.PetFeeding.feedSinglePet(feedData);
            
            if (!result.success) {
                // Check if approval needed
                if (result.needApproval) {
                    try {
                        // Execute approval automatically without user confirmation
                        showStatus('Authorizing PWFOOD tokens automatically...', 'info');
                        debug.log('Auto-authorizing PWFOOD tokens for friend NFT feeding');
                        
                        // Load ContractApprovalManager if needed
                        if (!window.ContractApprovalManager) {
                            await loadContractApprovalManager();
                        }
                        
                        // Execute approval
                        const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                            result.pwfoodContract,
                            result.feedingManagerAddress,
                            '115792089237316195423570985008687907853269984665640564039457584007913129639935', // Max uint256
                            userAddress,
                            true
                        );
                        
                        if (approvalResult.success) {
                            showStatus('Authorization successful, trying to feed again...', 'info');
                            debug.log('PWFOOD authorization successful, retrying friend NFT feeding');
                            
                            // Try feeding again after a short delay
                            setTimeout(() => {
                                handleFeed(hours);
                            }, 1000);
                        } else {
                            showStatus(`Authorization failed: ${approvalResult.error || 'Unknown error'}`, 'error');
                            debug.error('PWFOOD authorization failed:', approvalResult.error);
                        }
                    } catch (error) {
                        debug.error('Error during approval:', error);
                        showStatus(`Authorization process error: ${error.message || 'Unknown error'}`, 'error');
                    }
                    return;
                }
                
                // Balance insufficient
                if (result.error && result.error.includes('balance is insufficient')) {
                    showStatus(`PWFOOD balance is insufficient, you need ${result.requiredAmount} PWFOOD, current balance ${result.balance} PWFOOD`, 'error');
                    alert(`PWFOOD balance is insufficient!\nRequired: ${result.requiredAmount} PWFOOD\nCurrent balance: ${result.balance} PWFOOD`);
                    return;
                }
                
                // Other errors
                showStatus(`Feeding failed: ${result.error || 'Unknown error'}`, 'error');
                return;
            }
            
            // Feeding successful
            showStatus(`Successfully fed pet #${tokenId} for ${hours} hours`, 'success');
            
            // Update pet card with new feeding info
            if (result.feedingInfo) {
                // Refetch NFT data and update display
                setTimeout(async () => {
                    try {
                        const updatedNFTData = await getNFTData(tokenId);
                        currentNFT = updatedNFTData;
                        showNFTDetails(updatedNFTData);
                    } catch (error) {
                        debug.error('Error updating NFT data after feeding:', error);
                    }
                }, 1000);
            }
        } catch (error) {
            debug.error('Error feeding NFT with module:', error);
            showStatus(`Feeding failed: ${error.message || 'Unknown error'}`, 'error');
        }
    }
    
    /**
     * Feed NFT directly using the contract
     * @param {string|number} tokenId - NFT token ID
     * @param {number} hours - Feeding hours
     */
    async function feedNFTDirectly(tokenId, hours) {
        try {
            // Get contract instances
            const { nftFeedingManagerContract } = await getContractInstances();
            
            if (!nftFeedingManagerContract) {
                throw new Error('Failed to initialize NFTFeedingManager contract');
            }
            
            // Check if wallet is connected
            if (!isWalletConnected()) {
                showStatus('Please connect your wallet first', 'error');
                return;
            }
            
            // Get current wallet address
            const userAddress = getCurrentWalletAddress();
            if (!userAddress) {
                showStatus('Failed to get wallet address, please reconnect your wallet', 'error');
                return;
            }
            
            // Execute feedNFT method
            const tx = await nftFeedingManagerContract.methods.feedNFT(tokenId, hours).send({
                from: userAddress,
                gas: 300000 // Adjust as needed
            });
            
            // Check transaction status
            if (tx.status) {
                showStatus(`Successfully fed pet #${tokenId} for ${hours} hours`, 'success');
                
                // Update NFT display
                setTimeout(async () => {
                    try {
                        const updatedNFTData = await getNFTData(tokenId);
                        currentNFT = updatedNFTData;
                        showNFTDetails(updatedNFTData);
                    } catch (error) {
                        debug.error('Error updating NFT data after feeding:', error);
                    }
                }, 1000);
            } else {
                showStatus('Feeding transaction execution failed', 'error');
            }
        } catch (error) {
            debug.error('Error feeding NFT directly:', error);
            
            // Check for common errors
            if (error.message && error.message.includes('execution reverted')) {
                if (error.message.includes('ERC20: insufficient allowance')) {
                    showStatus('PWFOOD token authorization is insufficient, please authorize first', 'error');
                } else if (error.message.includes('ERC20: transfer amount exceeds balance')) {
                    showStatus('PWFOOD balance is insufficient', 'error');
                } else {
                    showStatus(`Feeding failed: ${error.message}`, 'error');
                }
            } else {
                showStatus(`Feeding failed: ${error.message || 'Unknown error'}`, 'error');
            }
        }
    }
    
    /**
     * Load ContractApprovalManager module
     * @returns {Promise<void>}
     */
    async function loadContractApprovalManager() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.ContractApprovalManager) {
                return resolve();
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = '../../scripts/other/ContractApprovalManager.js';
            script.async = true;
            
            // Handle load event
            script.onload = () => {
                debug.log('ContractApprovalManager module loaded successfully');
                resolve();
            };
            
            // Handle error event
            script.onerror = (error) => {
                debug.error('Failed to load ContractApprovalManager module:', error);
                reject(new Error('Failed to load ContractApprovalManager module'));
            };
            
            // Add script to document
            document.head.appendChild(script);
        });
    }
    
    /**
     * Calculate real feeding hours based on the feeding info from the contract
     * @param {Object} feedingInfo - Feeding info from the contract
     * @returns {number} The real feeding hours remaining
     */
    function calculateRealFeedingHours(feedingInfo) {
        if (!feedingInfo) {
            console.log('Failed to calculate satiety: feeding info is empty');
            return 0;
        }
        
        // Log the original data for debugging
        console.log('Original data for calculating satiety:', feedingInfo);
        
        // Check if required fields exist
        if (feedingInfo.feedingHours === undefined || feedingInfo.lastFeedTime === undefined || feedingInfo.lastClaimTime === undefined) {
            console.log('Failed to calculate satiety: missing required fields');
            console.log('Available fields:', Object.keys(feedingInfo).join(', '));
            return feedingInfo.feedingHours || 0;
        }
        
        if (!feedingInfo.isActive) {
            console.log('NFT is not activated for feeding, returning 0 satiety');
            return 0;
        }
        
        // Get current timestamp (in seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Get last feed time and last claim time
        const lastFeedTime = parseInt(feedingInfo.lastFeedTime) || 0;
        const lastClaimTime = parseInt(feedingInfo.lastClaimTime) || 0;
        
        // Use the larger value of lastFeedTime and lastClaimTime as the reference point
        const lastActionTime = Math.max(lastFeedTime, lastClaimTime);
        
        // Recorded feeding hours in the contract
        const recordedFeedingHours = parseInt(feedingInfo.feedingHours) || 0;
        
        // Output timestamps in human-readable format for debugging
        const currentTimeReadable = new Date(currentTime * 1000).toLocaleString();
        const lastFeedTimeReadable = new Date(lastFeedTime * 1000).toLocaleString();
        const lastClaimTimeReadable = new Date(lastClaimTime * 1000).toLocaleString();
        const lastActionTimeReadable = new Date(lastActionTime * 1000).toLocaleString();
        
        console.log('Detailed data for calculating satiety:', {
            currentTime,
            currentTimeReadable,
            lastFeedTime,
            lastFeedTimeReadable,
            lastClaimTime,
            lastClaimTimeReadable,
            lastActionTime,
            lastActionTimeReadable,
            recordedFeedingHours,
        });
        
        // Calculate elapsed hours (since last action)
        let elapsedHours = 0;
        if (currentTime > lastActionTime) {
            elapsedHours = Math.floor((currentTime - lastActionTime) / 3600); // 3600 seconds = 1 hour
            console.log(`${lastActionTime === lastFeedTime ? 'Feeding' : 'Claiming'} has passed ${elapsedHours} hours since the last action`);
        } else {
            console.log('Last operation time is greater than current time, possibly due to clock synchronization issues, using recorded feeding hours');
            return recordedFeedingHours;
        }
        
        // Calculate the real remaining feeding hours (cannot be less than 0)
        const realFeedingHours = Math.max(0, recordedFeedingHours - elapsedHours);
        
        console.log('Satiety calculation result:', {
            recordedFeedingHours: `${recordedFeedingHours} hours`, 
            elapsedHours: `${elapsedHours} hours`,
            realFeedingHours: `${realFeedingHours} hours`
        });
        
        return realFeedingHours;
    }
    
    // Export public methods
    window.FeedFriendDialog = {
        show: showDialog,
        hide: hideDialog
    };
})(); 