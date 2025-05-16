/**
 * NFT Listing Modal Component - Game Mode
 * Used to list NFTs on the market through an in-game popup
 */
(function() {
    // Define DOM element variables
    let modal;
    let modalContent;
    let closeBtn;
    let nftList;
    let priceInput;
    let paymentTokenSelect;
    let submitButton;
    let loadingIndicator;
    let statusMessage;
    let qualityTabs; // Quality filter tabs
    
    // Save Web3 instance and contract instances
    let web3;
    let marketplaceContract;
    let pwNFTContract;
    
    // Save the list of NFTs owned by the user
    let userNFTs = [];
    
    // Currently selected NFT
    let selectedNFT = null;
    
    // Current selected quality filter
    let currentQualityFilter = 'all';
    
    // Flag to indicate if the modal window has been initialized
    let isInitialized = false;
    
    // NFT listing cooldown time (1 hour, in seconds)
    const NFT_LISTING_COOLDOWN = 60 * 60; // 1 hour = 60 minutes * 60 seconds
    
    /**
     * Get the corresponding style class name based on quality ID
     * @param {string} qualityId - Quality ID
     * @returns {string} CSS class name corresponding to the quality
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
     * Get the appropriate Gas limit based on NFT quality
     * @param {string} quality - NFT quality
     * @returns {number} Gas limit
     */
    function getNFTListingGasLimit(quality) {
        // Base Gas limit values, set different values for different qualities
        const gasLimitMap = {
            'COMMON': 1500000,  // Base value, although common quality cannot be listed
            'GOOD': 1500000,    // Good quality
            'EXCELLENT': 1500000, // Excellent quality
            'RARE': 1500000,    // Rare quality requires a higher Gas limit
            'LEGENDARY': 1500000 // Legendary quality requires the highest Gas limit
        };
        
        // Get the base Gas limit, if not found use the default value
        const baseGasLimit = gasLimitMap[quality] || 1000000;
        
        // Add extra Gas as a buffer to avoid transaction failures due to network congestion
        const gasBuffer = 100000;
        
        // Return the total Gas limit
        return baseGasLimit + gasBuffer;
    }
    
    /**
     * Check if the NFT is in the listing cooldown period
     * @param {number} tokenId - NFT token ID
     * @returns {Promise<{inCooldown: boolean, timeLeft: number}>} - Cooldown status and remaining time (seconds)
     */
    async function checkNFTCooldown(tokenId) {
        try {
            // Get NFT listing information
            const listingInfo = await marketplaceContract.methods.listings(tokenId).call();
            
            // If the NFT has never been listed before, it is not in cooldown
            if (listingInfo.seller === '0x0000000000000000000000000000000000000000') {
                return { inCooldown: false, timeLeft: 0 };
            }
            
            // Get the last listing time
            const lastListTime = parseInt(listingInfo.lastListTime);
            
            // If lastListTime is 0, it means the NFT has never been listed
            if (lastListTime === 0) {
                return { inCooldown: false, timeLeft: 0 };
            }
            
            // Get the current time (seconds)
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Calculate the cooldown end time
            const cooldownEndTime = lastListTime + NFT_LISTING_COOLDOWN;
            
            // If the current time is less than the cooldown end time, the NFT is still in cooldown
            if (currentTime < cooldownEndTime) {
                // Calculate the remaining cooldown time (seconds)
                const timeLeft = cooldownEndTime - currentTime;
                return { inCooldown: true, timeLeft: timeLeft };
            }
            
            // Not in cooldown
            return { inCooldown: false, timeLeft: 0 };
        } catch (error) {
            console.error(`Failed to check cooldown for NFT #${tokenId}:`, error);
            // Default to not in cooldown
            return { inCooldown: false, timeLeft: 0 };
        }
    }
    
    /**
     * Format remaining time for friendly display
     * @param {number} seconds - Remaining seconds
     * @returns {string} - Formatted time string
     */
    function formatTimeLeft(seconds) {
        // If remaining time is less than 1 minute, display seconds
        if (seconds < 60) {
            return `${seconds} seconds`;
        }
        
        // If remaining time is less than 1 hour, display minutes
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes} m ${remainingSeconds > 0 ? remainingSeconds + ' s' : ''}`;
        }
        
        // If remaining time is greater than or equal to 1 hour, display hours
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} h ${minutes > 0 ? minutes + ' m' : ''}`;
    }
    
    /**
     * Initialize the NFT listing modal
     * @param {Object} web3Instance - Web3 instance
     * @param {Object} marketplaceContractInstance - Marketplace contract instance
     * @param {Object} nftContractInstance - NFT contract instance
     */
    function init(web3Instance, marketplaceContractInstance, nftContractInstance) {
        try {
            // Save Web3 and contract instances
            web3 = web3Instance;
            marketplaceContract = marketplaceContractInstance;
            pwNFTContract = nftContractInstance;
            
            // If the modal already exists, return directly
            if (document.getElementById('list-nft-modal-game')) {
                modal = document.getElementById('list-nft-modal-game');
                nftList = modal.querySelector('.nft-list');
                priceInput = modal.querySelector('#nft-price-input');
                submitButton = modal.querySelector('.nft-submit-btn');
                loadingIndicator = modal.querySelector('.loading-spinner');
                statusMessage = modal.querySelector('.status-message');
                closeBtn = modal.querySelector('.nft-modal-close');
                qualityTabs = modal.querySelectorAll('.quality-tab');
                
                // Rebind events
                bindEvents();
                
                isInitialized = true;
                return;
            }
            
            // Create modal DOM structure
            createModalDOM();
            
            // Bind events
            bindEvents();
            
            isInitialized = true;
            console.log('Game mode NFT listing modal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game mode NFT listing modal:', error);
            isInitialized = false;
        }
    }
    
    /**
     * Create modal DOM structure
     */
    function createModalDOM() {
        // Create modal container
        modal = document.createElement('div');
        modal.id = 'list-nft-modal-game';
        modal.className = 'nft-modal game-modal';
        modal.style.display = 'none';
        
        // Create modal content
        modalContent = document.createElement('div');
        modalContent.className = 'nft-modal-content game-modal-content';
        
        // Create close button
        closeBtn = document.createElement('span');
        closeBtn.className = 'nft-modal-close';
        closeBtn.innerHTML = '&times;';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'List NFT on Market (Common quality cannot be listed)';
        title.setAttribute('data-i18n', 'market.listNFT');
        
        // Create quality filter
        const qualityFilter = document.createElement('div');
        qualityFilter.className = 'quality-filter';
        
        // Create quality tabs - remove common quality as it cannot be listed
        const qualityLabels = [
            { id: 'all', name: 'All' },
            { id: 'GOOD', name: 'Good' },
            { id: 'EXCELLENT', name: 'Excellent' },
            { id: 'RARE', name: 'Rare' },
            { id: 'LEGENDARY', name: 'Legendary' }
        ];
        
        qualityTabs = [];
        
        qualityLabels.forEach(quality => {
            const tab = document.createElement('div');
            tab.className = 'quality-tab' + (quality.id === 'all' ? ' active' : '');
            tab.setAttribute('data-quality', quality.id);
            tab.textContent = quality.name;
            
            if (quality.id !== 'all') {
                tab.setAttribute('data-i18n', `quality.${quality.id.toLowerCase()}`);
            } else {
                tab.setAttribute('data-i18n', 'common.all');
            }
            
            qualityFilter.appendChild(tab);
            qualityTabs.push(tab);
        });
        
        // Create NFT list container
        const nftListContainer = document.createElement('div');
        nftListContainer.className = 'nft-list-container';
        
        // Create loading indicator
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-spinner';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p data-i18n="loading">Loading...</p>';
        
        // Create NFT list
        nftList = document.createElement('div');
        nftList.className = 'nft-list';
        
        // Add loading indicator and NFT list to the list container
        nftListContainer.appendChild(loadingIndicator);
        nftListContainer.appendChild(nftList);
        
        // Create form container
        const formContainer = document.createElement('div');
        formContainer.className = 'nft-form-container';
        
        // Create payment token selector
        const tokenLabel = document.createElement('label');
        tokenLabel.setAttribute('for', 'payment-token-select');
        tokenLabel.textContent = 'Payment Token';
        tokenLabel.setAttribute('data-i18n', 'market.paymentToken');
        
        paymentTokenSelect = document.createElement('select');
        paymentTokenSelect.id = 'payment-token-select';
        paymentTokenSelect.className = 'payment-token-select';
        
        // Default add an ETH option
        const ethOption = document.createElement('option');
        ethOption.value = '0x4e79347Ea521Af7E3D948C63E22711fd24472158';
        ethOption.textContent = 'USDT';
        paymentTokenSelect.appendChild(ethOption);
        
        // Create price input box
        const priceLabel = document.createElement('label');
        priceLabel.setAttribute('for', 'nft-price-input');
        priceLabel.textContent = 'Price';
        priceLabel.setAttribute('data-i18n', 'market.price');
        
        priceInput = document.createElement('input');
        priceInput.id = 'nft-price-input';
        priceInput.type = 'number';
        priceInput.min = '0';
        priceInput.step = '0.001';
        priceInput.placeholder = 'Enter NFT price';
        priceInput.setAttribute('data-i18n-placeholder', 'market.enterPrice');
        
        // Create submit button
        submitButton = document.createElement('button');
        submitButton.className = 'nft-submit-btn game-btn';
        submitButton.textContent = 'List NFT';
        submitButton.setAttribute('data-i18n', 'market.listNow');
        submitButton.disabled = true;
        
        
        // Create status message
        statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        statusMessage.style.display = 'none';
        
        // Add form elements to the form container
        formContainer.appendChild(tokenLabel);
        formContainer.appendChild(paymentTokenSelect);
        formContainer.appendChild(priceLabel);
        formContainer.appendChild(priceInput);
        formContainer.appendChild(submitButton);
        formContainer.appendChild(statusMessage);
        
        // Add all elements to modal content
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(qualityFilter);
        modalContent.appendChild(nftListContainer);
        modalContent.appendChild(formContainer);
        
        // Add modal content to modal container
        modal.appendChild(modalContent);
        
        // Add modal to body
        document.body.appendChild(modal);
    }
    
    /**
     * Bind events
     */
    function bindEvents() {
        if (!closeBtn || !modal) {
            console.error('Failed to bind events: DOM elements are undefined');
            return;
        }
        
        // Close button click event
        closeBtn.addEventListener('click', hideModal);
        
        // Click outside the modal to close it
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideModal();
            }
        });
        
        // Quality tab click event
        if (qualityTabs && qualityTabs.length > 0) {
            qualityTabs.forEach(tab => {
                tab.addEventListener('click', handleQualityTabClick);
            });
        }
        
        // Price input change event
        if (priceInput) {
            priceInput.addEventListener('input', validateForm);
        }
        
        // Submit button click event
        if (submitButton) {
            submitButton.addEventListener('click', handleSubmit);
        }
        

    }
    
    /**
     * Handle quality tab click event
     * @param {Event} event - Click event object
     */
    function handleQualityTabClick(event) {
        const tab = event.currentTarget;
        const quality = tab.getAttribute('data-quality');
        
        // Toggle tab active state
        qualityTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update current filter
        currentQualityFilter = quality;
        
        // Apply filter
        filterNFTsByQuality();
    }
    
    /**
     * Filter NFTs by quality
     */
    function filterNFTsByQuality() {
        if (!nftList) {
            return;
        }
        
        const nftItems = nftList.querySelectorAll('.nft-item');
        
        nftItems.forEach(item => {
            const quality = item.getAttribute('data-quality');
            
            if (currentQualityFilter === 'all' || quality === currentQualityFilter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Show modal
     */
    async function showModal() {
        // If the modal has not been initialized, try to initialize it first
        if (!isInitialized || !modal) {
            // If both web3 and contract instances exist, try to reinitialize
            if (web3 && marketplaceContract && pwNFTContract) {
                init(web3, marketplaceContract, pwNFTContract);
            } else {
                console.error('Cannot show NFT listing modal: Modal not initialized or required contract instances not set');
                return;
            }
        }
        
        // Ensure modal element exists
        if (!modal) {
            console.error('Cannot show NFT listing modal: Modal element does not exist');
            return;
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Reset modal state
        resetModal();
        
        // Load user NFTs
        await loadUserNFTs();
        
        // Load payment tokens
        await loadPaymentTokens();
    }
    
    /**
     * Hide modal
     */
    function hideModal() {
        if (modal) {
            modal.style.display = 'none';
            resetModal();
        }
    }
    
    /**
     * Reset modal state
     */
    function resetModal() {
        // Reset selected NFT
        selectedNFT = null;
        
        // Disable submit button
        if (submitButton) {
            submitButton.disabled = true;
        }
        
        // Clear price input box
        if (priceInput) {
            priceInput.value = '';
        }
        
        // Reset quality tabs
        if (qualityTabs && qualityTabs.length > 0) {
            qualityTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-quality') === 'all') {
                    tab.classList.add('active');
                }
            });
            currentQualityFilter = 'all';
        }
        
        // Hide status message
        if (statusMessage) {
            statusMessage.style.display = 'none';
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }
        

    }
    
    /**
     * Load user-owned NFTs
     */
    async function loadUserNFTs() {
        try {
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            
            // Clear NFT list
            nftList.innerHTML = '';
            
            // Get current user address
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            if (!userAddress) {
                throw new Error('Wallet not connected');
            }
            
            // Initialize NFTFeedingManager contract
            let nftFeedingManagerContract;
            if (window.nftFeedingManagerContract) {
                // Use existing global instance
                nftFeedingManagerContract = window.nftFeedingManagerContract;
                console.log('Using existing NFTFeedingManager contract instance');
            } else if (window.initNFTFeedingManagerContract && typeof window.getContractAddress === 'function') {
                try {
                    nftFeedingManagerContract = window.initNFTFeedingManagerContract(web3, window.getContractAddress);
                    console.log('Initialized NFTFeedingManager contract:', nftFeedingManagerContract ? 'Success' : 'Failed');
                    // Save to global for later use
                    window.nftFeedingManagerContract = nftFeedingManagerContract;
                } catch (error) {
                    console.error('Failed to initialize NFTFeedingManager contract:', error);
                }
            } else if (window.NFTFeedingManagerContract && typeof window.NFTFeedingManagerContract === 'function') {
                // Try to create an instance using the NFTFeedingManagerContract class
                try {
                    nftFeedingManagerContract = new window.NFTFeedingManagerContract(web3);
                    console.log('Successfully created contract instance using NFTFeedingManagerContract class');
                    // Save to global for later use
                    window.nftFeedingManagerContract = nftFeedingManagerContract;
                } catch (error) {
                    console.warn('Failed to create contract instance using NFTFeedingManagerContract class:', error);
                }
            }
            
            // Check if the contract was successfully initialized
            if (nftFeedingManagerContract) {
                console.log('NFTFeedingManager contract address:', nftFeedingManagerContract.options.address);
                // Check if the contract has the getNFTLevelInfo method
                if (nftFeedingManagerContract.methods && nftFeedingManagerContract.methods.getNFTLevelInfo) {
                    console.log('NFTFeedingManager contract is available, has getNFTLevelInfo method');
                } else {
                    console.warn('NFTFeedingManager contract is missing getNFTLevelInfo method');
                }
            } else {
                console.warn('NFTFeedingManager contract failed to initialize');
                // Try to load NFTFeedingManagerABI
                if (!window.NFTFeedingManagerABI && !window.nftFeedingManagerABI) {
                    console.warn('NFTFeedingManagerABI not found, attempting to load dynamically');
                    const scriptElement = document.createElement('script');
                    scriptElement.src = '../../scripts/contracts/ABI/NFTFeedingManagerABI.js';
                    scriptElement.onload = () => console.log('NFTFeedingManagerABI loaded');
                    scriptElement.onerror = (error) => console.error('Failed to load NFTFeedingManagerABI:', error);
                    document.head.appendChild(scriptElement);
                }
            }
            
            // First try to load the user's NFTs using PetNFTService
            if (window.PetNFTService && typeof window.PetNFTService.loadSpecificNFT === 'function') {
                console.log('Loading user NFTs using PetNFTService');
                try {
                    userNFTs = await window.PetNFTService.loadSpecificNFT(userAddress, { forceUpdate: true });
                    
                    // If PetNFTService also supports image processing, process images immediately
                    if (window.PetNFTService.updateNFTsWithBestImages) {
                        console.log('Preprocessing NFT images...');
                        userNFTs = await window.PetNFTService.updateNFTsWithBestImages(userNFTs);
                        console.log(`Preprocessed images for ${userNFTs.length} NFTs`);
                    }
                    
                    // Convert the data format returned by PetNFTService to the format required for game mode
                    userNFTs = userNFTs.map(nft => {
                        // Get quality from metadata
                        let quality = 'COMMON';
                        if (nft.metadata && nft.metadata.attributes) {
                            const qualityAttr = nft.metadata.attributes.find(attr => 
                                attr.trait_type === 'Quality' || attr.trait_type === '品质');
                            if (qualityAttr) {
                                quality = qualityAttr.value;
                            }
                        }
                        
                        return {
                            tokenId: nft.tokenId,
                            name: nft.metadata && nft.metadata.name ? nft.metadata.name : `NFT #${nft.tokenId}`,
                            image: nft.metadata && nft.metadata.image ? nft.metadata.image : '',
                            description: nft.metadata && nft.metadata.description ? nft.metadata.description : '',
                            quality: quality,
                            level: nft.level || 1,
                            accumulatedFood: nft.accumulatedFood || 0
                        };
                    });
                    
                    // First filter out common quality NFTs
                    userNFTs = userNFTs.filter(nft => nft.quality !== 'COMMON');
                    console.log(`Remaining ${userNFTs.length} NFTs after filtering out common quality`);
                    
                    // Then filter out listed NFTs
                    userNFTs = await filterListedNFTs(userNFTs);
                } catch (serviceError) {
                    console.error('Failed to load NFTs using PetNFTService, falling back to direct loading from contract:', serviceError);
                    // If PetNFTService fails, fall back to loading directly from the contract
                    const nfts = await loadNFTsFromContract(userAddress);
                    // First filter out common quality
                    const nonCommonNFTs = nfts.filter(nft => nft.quality !== 'COMMON');
                    console.log(`Remaining ${nonCommonNFTs.length} NFTs after filtering out common quality`);
                    userNFTs = await filterListedNFTs(nonCommonNFTs);
                }
            } else {
                // If PetNFTService is not available, load directly from the contract
                console.log('PetNFTService is not available, loading user NFTs directly from contract');
                const nfts = await loadNFTsFromContract(userAddress);
                // First filter out common quality
                const nonCommonNFTs = nfts.filter(nft => nft.quality !== 'COMMON');
                console.log(`Remaining ${nonCommonNFTs.length} NFTs after filtering out common quality`);
                userNFTs = await filterListedNFTs(nonCommonNFTs);
            }
            
            // Get the level information for each NFT
            if (nftFeedingManagerContract && nftFeedingManagerContract.methods && nftFeedingManagerContract.methods.getNFTLevelInfo) {
                console.log('Getting NFT level information...');
                
                for (let i = 0; i < userNFTs.length; i++) {
                    const nft = userNFTs[i];
                    try {
                        const levelInfo = await nftFeedingManagerContract.methods.getNFTLevelInfo(nft.tokenId).call();
                        nft.level = parseInt(levelInfo.level) || 1;
                        nft.accumulatedFood = parseInt(levelInfo.accumulatedFood) || 0;
                        console.log(`NFT #${nft.tokenId} Level: ${nft.level}, Accumulated Food: ${nft.accumulatedFood}`);
                    } catch (error) {
                        console.warn(`Failed to get level information for NFT #${nft.tokenId}:`, error);
                        // Keep default values
                        nft.level = nft.level || 1;
                        nft.accumulatedFood = nft.accumulatedFood || 0;
                    }
                }
            } else {
                console.warn('NFTFeedingManager contract is unavailable or missing getNFTLevelInfo method, unable to get NFT levels');
                
                // Ensure each NFT has a default level value
                userNFTs.forEach(nft => {
                    nft.level = nft.level || 1;
                    nft.accumulatedFood = nft.accumulatedFood || 0;
                    console.log(`Setting default level for NFT #${nft.tokenId}: ${nft.level}`);
                });
            }
            
            // Check the cooldown status for each NFT
            for (let i = 0; i < userNFTs.length; i++) {
                const nft = userNFTs[i];
                const cooldownInfo = await checkNFTCooldown(nft.tokenId);
                nft.inCooldown = cooldownInfo.inCooldown;
                nft.cooldownTimeLeft = cooldownInfo.timeLeft;
            }
            
            // Print the final NFT data for rendering (details of the first NFT and levels of all NFTs)
            if (userNFTs.length > 0) {
                console.log('Details of the first NFT:', JSON.stringify(userNFTs[0], null, 2));
                console.log('Level information for all NFTs:', userNFTs.map(nft => `NFT #${nft.tokenId}: Level ${nft.level}`).join(', '));
            } else {
                console.log('No NFTs available for listing');
            }
            
            // Render the NFT list
            await renderNFTList();
            
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Failed to load user NFTs:', error);
            showStatus('Failed to load NFTs: ' + error.message, 'error');
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Load user-owned NFTs from the contract
     * @param {string} userAddress - User wallet address
     * @returns {Array} Array of NFTs owned by the user
     */
    async function loadNFTsFromContract(userAddress) {
        try {
            // Get the number of NFTs owned by the user
            const balance = await pwNFTContract.methods.balanceOf(userAddress).call();
            
            // Store the user's NFTs
            const nfts = [];
            
            // Iterate through each NFT
            for (let i = 0; i < balance; i++) {
                // Get the tokenId of the i-th NFT owned by the user
                const tokenId = await pwNFTContract.methods.tokenOfOwnerByIndex(userAddress, i).call();
                
                // Get the NFT's metadata
                const tokenURI = await pwNFTContract.methods.tokenURI(tokenId).call();
                let metadata = { name: `NFT #${tokenId}`, image: '', description: '', attributes: [] };
                
                try {
                    // Try to fetch the metadata
                    const response = await fetch(tokenURI);
                    metadata = await response.json();
                } catch (error) {
                    console.warn(`Failed to fetch metadata for NFT #${tokenId}:`, error);
                }
                
                // Get quality from metadata
                let quality = 'COMMON';
                if (metadata.attributes) {
                    const qualityAttr = metadata.attributes.find(attr => attr.trait_type === 'Quality' || attr.trait_type === '品质');
                    if (qualityAttr) {
                        quality = qualityAttr.value;
                    }
                }
                
                // Create NFT object
                const nft = {
                    tokenId,
                    name: metadata.name,
                    image: metadata.image,
                    description: metadata.description,
                    quality,
                    level: 1,  // Default value
                    accumulatedFood: 0  // Default value
                };
                
                // Add NFT to the list
                nfts.push(nft);
            }
            
            return nfts;
        } catch (error) {
            console.error('Failed to load NFTs from contract:', error);
            throw error;
        }
    }
    
    /**
     * Filter out listed NFTs
     * @param {Array} nfts - Array of NFTs owned by the user
     * @returns {Array} Filtered array of NFTs
     */
    async function filterListedNFTs(nfts) {
        try {
            const filteredNFTs = [];
            
            for (const nft of nfts) {
                try {
                    // Already filtered out common quality, no need to check again
                    
                    // Check if the NFT is listed
                    // First try using isTokenListed method
                    let isListed = false;
                    try {
                        if (marketplaceContract.methods.isTokenListed) {
                            isListed = await marketplaceContract.methods.isTokenListed(nft.tokenId).call();
                        } else if (marketplaceContract.methods.listings) {
                            // Fallback method: check listings mapping
                            const listing = await marketplaceContract.methods.listings(nft.tokenId).call();
                            isListed = listing.active === true;
                        } else if (marketplaceContract.methods.getListingByToken) {
                            // Fallback method: use getListingByToken method
                            const listing = await marketplaceContract.methods.getListingByToken(nft.tokenId).call();
                            isListed = listing && listing.price && listing.price !== '0';
                        }
                    } catch (listingError) {
                        console.warn(`Error checking listing status for NFT #${nft.tokenId}:`, listingError);
                        // Default to assuming not listed
                        isListed = false;
                    }
                    
                    // If the NFT is not listed, add it to the filtered list
                    if (!isListed) {
                        filteredNFTs.push(nft);
                    }
                } catch (error) {
                    console.warn(`Error processing NFT #${nft.tokenId}:`, error);
                }
            }
            
            console.log(`Remaining ${filteredNFTs.length} NFTs after filtering`);
            return filteredNFTs;
        } catch (error) {
            console.error('Failed to filter listed NFTs:', error);
            throw error;
        }
    }
    
    /**
     * Render the NFT list
     */
    async function renderNFTList() {
        // Clear the list
        nftList.innerHTML = '';
        
        // Handle the case where there are no NFTs available for listing
        if (userNFTs.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-nft-message';
            emptyMessage.textContent = 'You have no NFTs available for listing';
            emptyMessage.setAttribute('data-i18n', 'market.noNFTsToList');
            nftList.appendChild(emptyMessage);
            return;
        }
        
        console.log('Starting to render NFT list, count:', userNFTs.length);
        
        // Iterate through NFTs and create list items
        userNFTs.forEach(nft => {
            console.log(`Rendering NFT #${nft.tokenId}, Level: ${nft.level || 1}`);
            
            // Get quality style class
            const qualityClass = getQualityClass(nft.quality);
            
            // Create NFT list item
            const nftItem = document.createElement('div');
            nftItem.className = `nft-item nft-quality-${qualityClass}`;
            nftItem.setAttribute('data-token-id', nft.tokenId);
            nftItem.setAttribute('data-quality', nft.quality);
            nftItem.setAttribute('data-level', nft.level || 1);
            
            // If the NFT is in cooldown, add cooldown overlay and disable click
            if (nft.inCooldown) {
                nftItem.classList.add('in-cooldown');
                nftItem.setAttribute('data-cooldown', 'true');
                nftItem.setAttribute('data-cooldown-time', nft.cooldownTimeLeft);
                
                // Add cooldown message
                const cooldownOverlay = document.createElement('div');
                cooldownOverlay.className = 'cooldown-overlay';
                const cooldownText = document.createElement('div');
                cooldownText.className = 'cooldown-text';
                cooldownText.textContent = `In Cooldown: ${formatTimeLeft(nft.cooldownTimeLeft)}`;
                cooldownOverlay.appendChild(cooldownText);
                
                // Listen for click event to show cooldown message
                nftItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showStatus(`This NFT is in cooldown, please wait ${formatTimeLeft(nft.cooldownTimeLeft)} before listing`, 'warning');
                });
            } else {
                // For NFTs not in cooldown, add normal selection event
                nftItem.addEventListener('click', () => {
                    // Remove selected state from other items
                    document.querySelectorAll('.nft-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Add selected state
                    nftItem.classList.add('selected');
                    
                    // Update selected NFT
                    selectedNFT = nft;
                    
                    // Validate form
                    validateForm();
                });
            }
            
            // Create NFT thumbnail
            const nftThumb = document.createElement('div');
            nftThumb.className = 'nft-thumb';
            
            // Create NFT image
            const nftImg = document.createElement('img');
            
            // Handle image URL
            let imageSrc = nft.image || '';
            
            // Check if the image path is an IPFS path
            if (imageSrc.startsWith('ipfs://')) {
                imageSrc = imageSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // Default placeholder image - use an actual path in the project
            const placeholderImage = '../../resources/images/default-pet.png';
            
            // Set image
            if (imageSrc) {
                // Set a 1x1 transparent pixel image first to prevent flickering during load
                nftImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                
                // Create a new Image object to preload the image
                const imgLoader = new Image();
                imgLoader.onload = function() {
                    nftImg.src = imageSrc;
                    // Check image aspect ratio
                    if (Math.abs(this.width / this.height - 1) > 0.2) {
                        nftImg.classList.add('contain-image');
                    }
                };
                imgLoader.onerror = function() {
                    nftImg.src = placeholderImage;
                    nftImg.classList.add('contain-image');
                };
                imgLoader.src = imageSrc;
            } else {
                nftImg.src = placeholderImage;
                nftImg.classList.add('contain-image');
            }
            
            // Add error handling
            nftImg.onerror = function() {
                this.src = placeholderImage;
                this.classList.add('contain-image');
                this.onerror = null; // Prevent looping errors
            };
            
            nftImg.alt = nft.name || `NFT #${nft.tokenId}`;
            nftImg.style.width = '100%';
            nftImg.style.height = '100%';
            nftImg.style.objectFit = 'cover';
            
            // Create NFT quality tag, using the same style as the market page
            const qualityTag = document.createElement('div');
            qualityTag.className = `quality-tag quality-${qualityClass.toLowerCase()}`;
            qualityTag.textContent = getQualityName(nft.quality);
            
            // Create NFT information
            const nftInfo = document.createElement('div');
            nftInfo.className = 'nft-info';
            
            // Create NFT name
            const nftName = document.createElement('div');
            nftName.className = 'nft-name';
            nftName.textContent = nft.name || `NFT #${nft.tokenId}`;
            nftName.title = nft.name || `NFT #${nft.tokenId}`; // Add tooltip to show full name
            
            // Create NFT ID
            const nftId = document.createElement('div');
            nftId.className = 'nft-id';
            nftId.textContent = `ID: ${nft.tokenId}`;
            
            // Create NFT level
            const nftLevel = document.createElement('div');
            nftLevel.className = 'nft-level';
            nftLevel.textContent = `Level: ${nft.level || 1}`;
            console.log(`Creating level element for NFT #${nft.tokenId}: ${nftLevel.textContent}`);
            
            // Assemble NFT information
            nftInfo.appendChild(nftName);
            nftInfo.appendChild(nftId);
            nftInfo.appendChild(nftLevel);
            
            // Add elements to thumbnail
            nftThumb.appendChild(nftImg);
            nftThumb.appendChild(qualityTag);
            
            // If the NFT is in cooldown, add cooldown overlay
            if (nft.inCooldown) {
                const cooldownOverlay = document.createElement('div');
                cooldownOverlay.className = 'cooldown-overlay';
                const cooldownText = document.createElement('div');
                cooldownText.className = 'cooldown-text';
                cooldownText.textContent = `In Cooldown: ${formatTimeLeft(nft.cooldownTimeLeft)}`;
                cooldownOverlay.appendChild(cooldownText);
                nftThumb.appendChild(cooldownOverlay);
            }
            
            // Add elements to list item
            nftItem.appendChild(nftThumb);
            nftItem.appendChild(nftInfo);
            
            // Add list item to list
            nftList.appendChild(nftItem);
            
            console.log(`NFT #${nft.tokenId} added to list, Level: ${nft.level || 1}`);
        });
        
        // Apply quality filter
        filterNFTsByQuality();
        
        // Add CSS styles - cooldown related
        addCooldownStyles();
    }
    
    /**
     * Add cooldown related CSS styles
     */
    function addCooldownStyles() {
        // Check if the style already exists
        const styleId = 'nft-cooldown-styles';
        if (document.getElementById(styleId)) {
            return;
        }
        
        // Create style element
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nft-item.in-cooldown {
                opacity: 0.7;
                cursor: not-allowed;
                position: relative;
            }
            
            .cooldown-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2;
                border-radius: 8px;
            }
            
            .cooldown-text {
                color: white;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
            }
            
            .nft-level {
                font-size: 12px;
                color: #0070f3;
                margin-top: 3px;
                margin-bottom: 3px;
                font-weight: bold;
                display: block !important;
                visibility: visible !important;
            }
            
            /* Ensure NFT info container displays correctly */
            .nft-info {
                padding: 8px;
                display: flex;
                flex-direction: column;
            }
            
            /* Ensure NFT ID and level display correctly */
            .nft-id, .nft-level {
                margin-top: 2px;
                margin-bottom: 2px;
            }
        `;
        
        // Add to document head
        document.head.appendChild(style);
    }
    
    /**
     * Validate form
     */
    function validateForm() {
        const price = parseFloat(priceInput.value);
        submitButton.disabled = !(selectedNFT && price > 0);
        
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit() {
        try {
            // Disable submit button
            submitButton.disabled = true;
            
            // Show loading status
            showStatus('Processing...', 'info');
            
            // Ensure an NFT is selected
            if (!selectedNFT) {
                throw new Error('Please select an NFT');
            }
            
            // Get price
            const price = priceInput.value;
            if (!price || parseFloat(price) <= 0) {
                throw new Error('Please enter a valid price');
            }
            
            // Get payment token address
            const paymentToken = paymentTokenSelect.value;
            
            // Get user address
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            // Calculate price (convert to Wei)
            const priceInWei = web3.utils.toWei(price, 'ether');
            
            // Get appropriate Gas limit based on NFT quality
            const gasLimit = getNFTListingGasLimit(selectedNFT.quality);
            console.log(`Listing NFT quality: ${selectedNFT.quality}, setting Gas limit: ${gasLimit}`);
            
            // Show Gas limit information - inform the user that a higher Gas limit is being used to ensure transaction success
            showStatus(`Preparing to list: ${selectedNFT.name || `NFT #${selectedNFT.tokenId}`} using a higher Gas limit to ensure transaction success`, 'info');
            
            // Get NFT level information, if not loaded use default value
            const level = selectedNFT.level || 1;
            const accumulatedFood = selectedNFT.accumulatedFood || 0;
            console.log(`Additional information for listing NFT - Level: ${level}, Accumulated Food: ${accumulatedFood}`);
            
            // Check PwNFT contract authorization for NFTMarketplace
            // This step is crucial as the NFTMarketplace contract needs to transfer the NFT from the user to the market contract
            showStatus('Checking NFT authorization status...', 'info');
            
            // Ensure the market contract address is correct
            const marketplaceAddress = marketplaceContract._address || marketplaceContract.options.address;
            if (!marketplaceAddress) {
                throw new Error('Failed to get market contract address');
            }
            console.log('NFT market contract address:', marketplaceAddress);
            
            // Check if it has global authorization
            let isApproved;
            try {
                isApproved = await pwNFTContract.methods.isApprovedForAll(userAddress, marketplaceAddress).call();
                console.log('NFT authorization status:', isApproved ? 'Approved' : 'Not Approved');
            } catch (approvalCheckError) {
                console.error('Failed to check NFT authorization status:', approvalCheckError);
                throw new Error('Failed to check NFT authorization status: ' + approvalCheckError.message);
            }
            
            // If there is no global authorization, check for individual authorization
            if (!isApproved) {
                try {
                    const approvedAddress = await pwNFTContract.methods.getApproved(selectedNFT.tokenId).call();
                    if (approvedAddress === marketplaceAddress) {
                        console.log('NFT is individually approved for the market contract');
                        isApproved = true;
                    } else {
                        console.log('NFT is not individually approved for the market contract, current approved address:', approvedAddress);
                    }
                } catch (singleApprovalError) {
                    console.warn('Failed to check individual approval, NFT may not exist:', singleApprovalError);
                    // Continue processing as we will attempt global authorization
                }
            }
            
            if (!isApproved) {
                // Show authorization status
                showStatus('Authorizing NFT contract (wallet confirmation will be displayed)...', 'info');
                
                try {
                    // Authorize NFT contract - use a higher Gas limit to ensure the authorization transaction succeeds
                    const approveReceipt = await pwNFTContract.methods.setApprovalForAll(marketplaceAddress, true)
                        .send({ 
                            from: userAddress,
                            gas: 350000 // Use a fixed higher Gas limit for authorization operation
                        });
                    
                    console.log('NFT authorization successful:', approveReceipt);
                    showStatus('NFT authorization successful!', 'success');
                    
                    // Wait a moment to ensure authorization takes effect
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verify if authorization was successful
                    const verifyApproval = await pwNFTContract.methods.isApprovedForAll(
                        userAddress, 
                        marketplaceAddress
                    ).call();
                    
                    if (!verifyApproval) {
                        console.warn('Authorization verification failed, may need to retry');
                        showStatus('Authorization verification failed, but will attempt to continue listing...', 'warning');
                    } else {
                        console.log('Authorization verification successful');
                    }
                } catch (approveError) {
                    console.error('NFT authorization failed:', approveError);
                    throw new Error('NFT authorization failed: ' + (approveError.message || 'Unknown error'));
                }
            } else {
                console.log('NFT is already approved for the market contract');
                showStatus('NFT is authorized, continuing to list...', 'info');
            }
            
            // List NFT
            showStatus(`Listing NFT (Gas limit: ${gasLimit})...`, 'info');
            
            try {
                console.log(`Preparing to call createListing method, tokenId=${selectedNFT.tokenId}, price=${priceInWei}, level=${level}, food=${accumulatedFood}`);
                
                // Check the number of parameters required by the createListing method
                const abiMethod = marketplaceContract._jsonInterface ? 
                    marketplaceContract._jsonInterface.find(m => m.name === 'createListing' && m.type === 'function') :
                    null;
                
                if (abiMethod) {
                    const expectedParamCount = abiMethod.inputs.length;
                    console.log(`Expected parameter count for createListing method: ${expectedParamCount}, parameter list:`, 
                        abiMethod.inputs.map(p => `${p.name}(${p.type})`).join(', '));
                }
                
                // Call contract to list NFT - use the calculated Gas limit
                const receipt = await marketplaceContract.methods.createListing(
                    selectedNFT.tokenId,
                    paymentToken,
                    priceInWei
                ).send({ 
                    from: userAddress,
                    gas: gasLimit // Use the Gas limit determined by quality
                });
                
                console.log('NFT listing successful:', receipt);
                
                // Show success message
                showStatus('NFT listed successfully!', 'success');
                
                // Trigger NFT listing event
                const listedEvent = new CustomEvent('nft.listed', {
                    detail: {
                        tokenId: selectedNFT.tokenId,
                        price: priceInWei,
                        paymentToken,
                        level: level,
                        accumulatedFood: accumulatedFood
                    }
                });
                window.dispatchEvent(listedEvent);
                
                // Reset modal
                setTimeout(() => {
                    hideModal();
                }, 2000);
            } catch (listingError) {
                console.error('NFT listing transaction failed:', listingError);
                
                // Check error message for more useful feedback
                let errorMessage = listingError.message;
                
                if (errorMessage.includes('execution reverted')) {
                    if (errorMessage.includes('Not the owner') || errorMessage.includes('ownerOf')) {
                        errorMessage = 'NFT ownership verification failed, you may not be the owner of this NFT';
                    } else if (errorMessage.includes('approved') || errorMessage.includes('allowance')) {
                        errorMessage = 'Insufficient NFT authorization, please retry the authorization step';
                    } else if (errorMessage.includes('Marketplace not approved')) {
                        errorMessage = 'Market contract has not been authorized to operate your NFT, please retry the authorization step';
                    } else if (errorMessage.includes('Token not accepted')) {
                        errorMessage = 'The selected payment token is not accepted by the market';
                    } else if (errorMessage.includes('Price must be greater than 0')) {
                        errorMessage = 'Price must be greater than 0';
                    } else if (errorMessage.includes('NFT not in marketplace custody')) {
                        errorMessage = 'Failed to transfer NFT to market contract, possibly due to authorization issues';
                    }
                } else if (errorMessage.includes('gas')) {
                    errorMessage = 'Transaction gas is insufficient, please increase the gas limit or try again later';
                }
                
                throw new Error('Listing transaction failed: ' + errorMessage);
            }
        } catch (error) {
            console.error('Failed to submit NFT listing:', error);
            showStatus('Listing failed: ' + error.message, 'error');
            submitButton.disabled = false;
        }
    }
    
    /**
     * Show status message
     * @param {string} message - Message content
     * @param {string} type - Message type (info, success, error)
     */
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
    }
    
    /**
     * Load payment tokens
     */
    async function loadPaymentTokens() {
        try {
            // Check if there is a supported token module
            if (window.supportedMarketTokens && typeof window.supportedMarketTokens.getTokens === 'function') {
                const tokens = window.supportedMarketTokens.getTokens();
                
                // Clear the selector
                paymentTokenSelect.innerHTML = '';
                
                // Add token options
                tokens.forEach(token => {
                    const option = document.createElement('option');
                    option.value = token.address;
                    option.textContent = token.symbol;
                    paymentTokenSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load payment tokens:', error);
        }
    }
    
  
    
    // Export public methods
    window.listNFTModal = {
        init,
        showModal,
        hideModal
    };
})(); 