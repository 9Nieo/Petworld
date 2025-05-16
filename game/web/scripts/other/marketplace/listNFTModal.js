/**
 * NFT listing modal functionality
 * Allows users to select and list their NFTs on the market
 */

// Create a self-executing function expression to avoid global scope pollution
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
    let qualityTabs; // quality filter options
    
    // Save Web3 instance and contract instances
    let web3;
    let marketplaceContract;
    let pwNFTContract;
    
    // Save user's NFT list
    let userNFTs = [];
    
    // Current selected NFT
    let selectedNFT = null;
    
    // Current selected quality filter
    let currentQualityFilter = 'all';
    
    // Mark if the modal window is initialized
    let isInitialized = false;
    
    // NFT listing cooldown time (1 hour, in seconds)
    const NFT_LISTING_COOLDOWN = 60 * 60; // 1 hour = 60 minutes * 60 seconds
    
    /**
     * Get the corresponding CSS class name for the quality ID
     * @param {string} qualityId - quality ID
     * @returns {string} quality corresponding CSS class name
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
     * Check if the NFT is in the listing cooldown
     * @param {number} tokenId - NFT token ID
     * @returns {Promise<{inCooldown: boolean, timeLeft: number}>} - cooldown status and remaining time (seconds)
     */
    async function checkNFTCooldown(tokenId) {
        try {
            // Get the NFT listing info
            const listingInfo = await marketplaceContract.methods.listings(tokenId).call();
            
            // If the NFT has never been listed, it is not in the cooldown
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
            
            // If the current time is less than the cooldown end time, the NFT is still in the cooldown
            if (currentTime < cooldownEndTime) {
                // Calculate the remaining cooldown time (seconds)
                const timeLeft = cooldownEndTime - currentTime;
                return { inCooldown: true, timeLeft: timeLeft };
            }
            
            // Not in the cooldown
            return { inCooldown: false, timeLeft: 0 };
        } catch (error) {
            console.error(`check NFT #${tokenId} cooldown failed:`, error);
            // Default not in the cooldown
            return { inCooldown: false, timeLeft: 0 };
        }
    }
    
    /**
     * Format the remaining time to a friendly display
     * @param {number} seconds - remaining seconds
     * @returns {string} - formatted time string
     */
    function formatTimeLeft(seconds) {
        // If the remaining time is less than 1 minute, show the seconds
        if (seconds < 60) {
            return `${seconds} s`;
        }
        
        // If the remaining time is less than 1 hour, show the minutes
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes} m ${remainingSeconds > 0 ? remainingSeconds + ' s' : ''}`;
        }
        
        // If the remaining time is greater than or equal to 1 hour, show the hours
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} h ${minutes > 0 ? minutes + ' m' : ''}`;
    }
    
    /**
     * Get the appropriate Gas limit for the NFT quality
     * @param {string} quality - NFT quality
     * @returns {number} Gas limit
     */
    function getNFTListingGasLimit(quality) {
        // The base Gas limit value, set different values for different qualities
        const gasLimitMap = {
            'COMMON': 1500000,  // The base value, although Common quality cannot be listed
            'GOOD': 1500000,    // Good quality
            'EXCELLENT': 1500000, // Excellent quality
            'RARE': 1500000,    // Rare quality requires a higher Gas limit
            'LEGENDARY': 1500000 // Legendary quality requires the highest Gas limit
        };
        
        // Get the base Gas limit, use the default value if the quality is not found
        const baseGasLimit = gasLimitMap[quality] || 1500000;
        
        // Add additional Gas as a buffer to avoid transaction failure due to network congestion
        const gasBuffer = 100000;
        
        // Return the total Gas limit
        return baseGasLimit + gasBuffer;
    }
    
    /**
     * Initialize the NFT listing modal
     * @param {Object} web3Instance - Web3 instance
     * @param {Object} marketplaceContractInstance - Marketplace contract instance
     * @param {Object} nftContractInstance - NFT contract instance
     */
    function init(web3Instance, marketplaceContractInstance, nftContractInstance) {
        try {
            // Save the Web3 and contract instances
            web3 = web3Instance;
            marketplaceContract = marketplaceContractInstance;
            pwNFTContract = nftContractInstance;
            
            // If the modal exists, return directly
            if (document.getElementById('list-nft-modal')) {
                modal = document.getElementById('list-nft-modal');
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
            
            // Create the modal DOM structure
            createModalDOM();
            
            // Bind events
            bindEvents();
            
            isInitialized = true;
            console.log('NFT listing modal initialized successfully');
        } catch (error) {
            console.error('NFT listing modal initialization failed:', error);
            isInitialized = false;
        }
    }
    
    /**
     * Create the modal DOM structure
     */
    function createModalDOM() {
        // Create the modal container
        modal = document.createElement('div');
        modal.id = 'list-nft-modal';
        modal.className = 'nft-modal';
        modal.style.display = 'none';
        
        // Create the modal content
        modalContent = document.createElement('div');
        modalContent.className = 'nft-modal-content';
        
        // Create the close button
        closeBtn = document.createElement('span');
        closeBtn.className = 'nft-modal-close';
        closeBtn.innerHTML = '&times;';
        
        // Create the title
        const title = document.createElement('h2');
        title.textContent = '上架NFT到市场（普通品质不可上架）';
        title.setAttribute('data-i18n', 'market.listNFT');
        
        // Create the quality filter
        const qualityFilter = document.createElement('div');
        qualityFilter.className = 'quality-filter';
        
        // Create the quality tab
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
            
            // If i18n support is needed
            if (quality.id !== 'all') {
                tab.setAttribute('data-i18n', `quality.${quality.id.toLowerCase()}`);
            } else {
                tab.setAttribute('data-i18n', 'common.all');
            }
            
            qualityFilter.appendChild(tab);
            qualityTabs.push(tab);
        });
        
        // Create the NFT list container
        const nftListContainer = document.createElement('div');
        nftListContainer.className = 'nft-list-container';
        
        // Create the loading indicator
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-spinner';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p data-i18n="loading">加载中...</p>';
        
        // Create the NFT list
        nftList = document.createElement('div');
        nftList.className = 'nft-list';
        
        // Add the loading indicator and NFT list to the list container
        nftListContainer.appendChild(loadingIndicator);
        nftListContainer.appendChild(nftList);
        
        // Create the form container
        const formContainer = document.createElement('div');
        formContainer.className = 'nft-form-container';
        
        // Create the payment token selector
        const tokenLabel = document.createElement('label');
        tokenLabel.setAttribute('for', 'payment-token-select');
        tokenLabel.textContent = '支付代币';
        tokenLabel.setAttribute('data-i18n', 'market.paymentToken');
        
        paymentTokenSelect = document.createElement('select');
        paymentTokenSelect.id = 'payment-token-select';
        paymentTokenSelect.className = 'payment-token-select';
        
        // Default add a ETH option
        const ethOption = document.createElement('option');
        ethOption.value = '0x4e79347Ea521Af7E3D948C63E22711fd24472158';
        ethOption.textContent = 'USDT';
        paymentTokenSelect.appendChild(ethOption);
        
        // Create the price input box
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
        
        // Create the submit button
        submitButton = document.createElement('button');
        submitButton.className = 'nft-submit-btn';
        submitButton.textContent = 'List NFT';
        submitButton.setAttribute('data-i18n', 'market.listNow');
        submitButton.disabled = true;
        
        
        // Create the status message
        statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        statusMessage.style.display = 'none';
        
        // Add the form elements to the form container
        formContainer.appendChild(tokenLabel);
        formContainer.appendChild(paymentTokenSelect);
        formContainer.appendChild(priceLabel);
        formContainer.appendChild(priceInput);
        formContainer.appendChild(submitButton);
        formContainer.appendChild(statusMessage);
        
        // Add all elements to the modal content
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(qualityFilter);
        modalContent.appendChild(nftListContainer);
        modalContent.appendChild(formContainer);
        
        // Add the modal content to the modal container
        modal.appendChild(modalContent);
        
        // Add the modal to the body
        document.body.appendChild(modal);
    }
    
    /**
     * Bind events
     */
    function bindEvents() {
        if (!closeBtn || !modal || !submitButton || !priceInput) {
            console.error('Bind events failed: DOM elements are undefined');
            return;
        }
        
        // Close button click event
        closeBtn.addEventListener('click', hideModal);
        
        // Click outside the modal to close the modal
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideModal();
            }
        });
        
        // Submit button click event
        submitButton.addEventListener('click', handleSubmit);
        
        
        // Price input box change event
        priceInput.addEventListener('input', validateForm);
        
        // Payment token selector change event
        if (paymentTokenSelect) {
            paymentTokenSelect.addEventListener('change', validateForm);
        }
        
        // Quality tab click event
        if (qualityTabs && qualityTabs.length) {
            qualityTabs.forEach(tab => {
                tab.addEventListener('click', handleQualityTabClick);
            });
        }
    }
    
    /**
     * Handle the quality tab click
     */
    function handleQualityTabClick(event) {
        // Remove the active class from all tabs
        qualityTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add the active class to the currently clicked tab
        event.currentTarget.classList.add('active');
        
        // Get the selected quality
        currentQualityFilter = event.currentTarget.getAttribute('data-quality');
        console.log('Selected quality:', currentQualityFilter);
        
        // Common quality NFTs are not allowed to be listed, automatically switch to "all"
        if (currentQualityFilter === 'COMMON') {
            console.log('Common quality NFTs are not allowed to be listed, automatically switch to "all"');
            currentQualityFilter = 'all';
            
            // Update the UI selected state
            qualityTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-quality') === 'all') {
                    tab.classList.add('active');
                }
            });
        }
        
        // Apply the filter and render
        filterNFTsByQuality();
    }
    
    /**
     * Filter NFTs by quality
     */
    function filterNFTsByQuality() {
        // All NFT items
        const nftItems = document.querySelectorAll('.nft-item');
        
        // If selected "all", show all NFTs
        if (currentQualityFilter === 'all') {
            nftItems.forEach(item => {
                item.style.display = 'block';
            });
        } else {
            // Otherwise, only show NFTs of the specified quality
            nftItems.forEach(item => {
                const itemQuality = item.getAttribute('data-quality');
                item.style.display = (itemQuality === currentQualityFilter) ? 'block' : 'none';
            });
        }
        
        // Check if there are any visible NFTs
        const visibleCount = Array.from(nftItems).filter(item => item.style.display !== 'none').length;
        
        // If there are no visible NFTs, show the prompt information
        const noItemsMessage = document.querySelector('.no-nft-message');
        if (visibleCount === 0) {
            if (!noItemsMessage) {
                const message = document.createElement('div');
                message.className = 'no-nft-message';
                message.textContent = `no ${getQualityName(currentQualityFilter)} quality NFTs`;
                nftList.appendChild(message);
            } else {
                noItemsMessage.textContent = `no ${getQualityName(currentQualityFilter)} quality NFTs`;
                noItemsMessage.style.display = 'block';
            }
        } else if (noItemsMessage) {
            noItemsMessage.style.display = 'none';
        }
        
        // Reset the selected state
        selectedNFT = null;
        submitButton.disabled = true;
    }
    
    /**
     * Show the modal
     */
    async function showModal() {
        // If the modal is not initialized, try to initialize first
        if (!isInitialized || !modal) {
            // If the web3 and contract instances exist, try to reinitialize
            if (web3 && marketplaceContract && pwNFTContract) {
                init(web3, marketplaceContract, pwNFTContract);
            } else {
                console.error('cannot show the NFT listing modal: the modal is not initialized or the required contract instances are not set');
                alert('system error: cannot show the NFT listing modal, please refresh the page and try again');
                return;
            }
        }
        
        // Ensure the modal window element exists
        if (!modal) {
            console.error('cannot show the NFT listing modal: the modal element does not exist');
            alert('system error: cannot show the NFT listing modal, please refresh the page and try again');
            return;
        }
        
        // Show the modal
        modal.style.display = 'block';
        
        // Reset the modal state
        resetModal();
        
        // Reset the quality filter to "all"
        if (qualityTabs && qualityTabs.length) {
            qualityTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-quality') === 'all') {
                    tab.classList.add('active');
                }
            });
            currentQualityFilter = 'all';
        }
        
        // Load the supported token list
        await loadPaymentTokens();
        
        // Load the user's NFTs
        await loadUserNFTs();
    }
    
    /**
     * Hide the modal
     */
    function hideModal() {
        if (modal) {
            modal.style.display = 'none';
            resetModal();
        }
    }
    
    /**
     * Reset the modal state
     */
    function resetModal() {
        // Ensure the DOM elements exist
        if (!nftList || !priceInput || !statusMessage) {
            return;
        }
        
        // Clear the NFT list
        nftList.innerHTML = '';
        
        // Reset the input box
        priceInput.value = '';
        
        // Disable the submit button
        if (submitButton) {
            submitButton.disabled = true;
        }
        
        // Hide the status message
        statusMessage.style.display = 'none';
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        
        // Reset the selected NFT
        selectedNFT = null;
        
        // Reset the quality filter
        currentQualityFilter = 'all';
    }
    
    /**
     * Load the user's NFTs
     */
    async function loadUserNFTs() {
        try {
            // Show the loading indicator
            loadingIndicator.style.display = 'block';
            
            // Clear the NFT list
            nftList.innerHTML = '';
            
            // Get the current user address
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            if (!userAddress) {
                throw new Error('wallet not connected');
            }
            
            // Try to get the NFTFeedingManager contract instance
            let nftFeedingManagerContract;
            if (window.nftFeedingManagerContract) {
                // Use the existing global instance
                nftFeedingManagerContract = window.nftFeedingManagerContract;
                console.log('Using the existing NFTFeedingManager contract instance');
            } else if (window.initNFTFeedingManagerContract && window.getContractAddress) {
                nftFeedingManagerContract = window.initNFTFeedingManagerContract(web3, window.getContractAddress);
                console.log('Get the NFTFeedingManager contract instance:', nftFeedingManagerContract ? 'success' : 'failed');
            } else if (window.NFTFeedingManagerContract && typeof window.NFTFeedingManagerContract === 'function') {
                // Try to create an instance using the NFTFeedingManagerContract class
                try {
                    nftFeedingManagerContract = new window.NFTFeedingManagerContract(web3);
                    console.log('Create the NFTFeedingManager contract instance successfully');
                } catch (error) {
                    console.warn('Create the NFTFeedingManager contract instance failed:', error);
                }
            }
            
            // Use PetNFTService to load the user's NFTs
            if (window.PetNFTService && typeof window.PetNFTService.loadSpecificNFT === 'function') {
                console.log('Use PetNFTService to load the user\'s NFTs');
                userNFTs = await window.PetNFTService.loadSpecificNFT(userAddress, { forceUpdate: true });
                
                // If PetNFTService also supports image processing, process the images immediately
                if (window.PetNFTService.updateNFTsWithBestImages) {
                    console.log('Pre-process NFT images...');
                    userNFTs = await window.PetNFTService.updateNFTsWithBestImages(userNFTs);
                    console.log(`${userNFTs.length} NFT images have been pre-processed`);
                }
            } else {
                // If PetNFTService is not available, use the contract directly to load the NFTs
                console.log('PetNFTService is not available, use the contract directly to load the NFTs');
                userNFTs = await loadNFTsFromContract(userAddress);
            }
            
            // Get the level information of each NFT
            if (nftFeedingManagerContract) {
                console.log('Get NFT level information...');
                const updatedNFTs = [];
                
                for (const nft of userNFTs) {
                    try {
                        const levelInfo = await nftFeedingManagerContract.methods.getNFTLevelInfo(nft.tokenId).call();
                        nft.level = parseInt(levelInfo.level) || 1;
                        nft.accumulatedFood = parseInt(levelInfo.accumulatedFood) || 0;
                        console.log(`NFT #${nft.tokenId} level: ${nft.level}, accumulated food: ${nft.accumulatedFood}`);
                    } catch (error) {
                        console.warn(`Get the NFT #${nft.tokenId} level information failed:`, error);
                        nft.level = 1;
                        nft.accumulatedFood = 0;
                    }
                    updatedNFTs.push(nft);
                }
                
                userNFTs = updatedNFTs;
            }
            
            // Filter out NFTs that have been listed
            await filterListedNFTs();
            
            // Check the cooldown status of each NFT
            for (let i = 0; i < userNFTs.length; i++) {
                const nft = userNFTs[i];
                const cooldownInfo = await checkNFTCooldown(nft.tokenId);
                nft.inCooldown = cooldownInfo.inCooldown;
                nft.cooldownTimeLeft = cooldownInfo.timeLeft;
            }
            
            // Render the NFT list
            await renderNFTList();
        } catch (error) {
            console.error('Load the user\'s NFTs failed:', error);
            showStatus('Load the NFTs failed: ' + error.message, 'error');
        } finally {
            // Hide the loading indicator
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Load NFTs from the contract directly
     * @param {string} userAddress - The user address
     * @returns {Array} The NFT array
     */
    async function loadNFTsFromContract(userAddress) {
        try {
            // Get the number of NFTs owned by the user
            const balance = await pwNFTContract.methods.balanceOf(userAddress).call();
            const nftCount = parseInt(balance);
            
            if (nftCount === 0) {
                return [];
            }
            
            // Try to get the NFTFeedingManager contract instance
            let nftFeedingManagerContract;
            if (window.nftFeedingManagerContract) {
                // Use the existing global instance
                nftFeedingManagerContract = window.nftFeedingManagerContract;
                console.log('Using the existing NFTFeedingManager contract instance');
            } else if (window.initNFTFeedingManagerContract && window.getContractAddress) {
                nftFeedingManagerContract = window.initNFTFeedingManagerContract(web3, window.getContractAddress);
                console.log('Get the NFTFeedingManager contract instance:', nftFeedingManagerContract ? 'success' : 'failed');
            } else if (window.NFTFeedingManagerContract && typeof window.NFTFeedingManagerContract === 'function') {
                // Try to create an instance using the NFTFeedingManagerContract class
                try {
                    nftFeedingManagerContract = new window.NFTFeedingManagerContract(web3);
                    console.log('Create the NFTFeedingManager contract instance successfully');
                } catch (error) {
                    console.warn('Create the NFTFeedingManager contract instance failed:', error);
                }
            }
            
            // Get the tokenId of each NFT
            const nfts = [];
            for (let i = 0; i < nftCount; i++) {
                const tokenId = await pwNFTContract.methods.tokenOfOwnerByIndex(userAddress, i).call();
                const tokenURI = await pwNFTContract.methods.tokenURI(tokenId).call();
                
                // Get the metadata
                let metadata = { name: `NFT #${tokenId}`, image: null };
                try {
                    // Try to get the metadata
                    const response = await fetch(tokenURI);
                    if (response.ok) {
                        metadata = await response.json();
                    }
                } catch (error) {
                    console.warn('Failed to get the NFT metadata:', error);
                }
                
                // Create the NFT object
                const nft = {
                    tokenId: tokenId,
                    contractAddress: pwNFTContract.options.address,
                    owner: userAddress,
                    metadata: metadata,
                    level: 1,  // Default value
                    accumulatedFood: 0  // Default value
                };
                
                // Try to get the NFT level information
                if (nftFeedingManagerContract) {
                    try {
                        const levelInfo = await nftFeedingManagerContract.methods.getNFTLevelInfo(tokenId).call();
                        nft.level = parseInt(levelInfo.level) || 1;
                        nft.accumulatedFood = parseInt(levelInfo.accumulatedFood) || 0;
                        console.log(`Get the NFT #${tokenId} level: ${nft.level}, accumulated food: ${nft.accumulatedFood}`);
                    } catch (error) {
                        console.warn(`Get the NFT #${tokenId} level information failed:`, error);
                        // Keep the default value
                    }
                }
                
                // Try to process the image URL
                if (window.PetNFTService && typeof window.PetNFTService.updateNFTWithBestImage === 'function') {
                    try {
                        // Use PetNFTService to process the image
                        const updatedNft = await window.PetNFTService.updateNFTWithBestImage(nft);
                        nfts.push(updatedNft);
                        console.log(`NFT #${tokenId} image has been processed: ${updatedNft.metadata.image} (${updatedNft.imageSource || 'unknown'})`);
                    } catch (imageError) {
                        console.warn(`Failed to process the NFT #${tokenId} image:`, imageError);
                        // If the processing fails, use the original NFT object
                        nfts.push(nft);
                    }
                } else {
                    // If PetNFTService is not available, use the original NFT object
                    nfts.push(nft);
                }
            }
            
            return nfts;
        } catch (error) {
            console.error('Failed to load the NFTs from the contract:', error);
            return [];
        }
    }
    
    /**
     * Filter out the NFTs that have been listed
     */
    async function filterListedNFTs() {
        try {
            if (!marketplaceContract || userNFTs.length === 0) {
                return;
            }
            
            // Filter the NFT list, remove the NFTs that have been listed and the NFTs with common quality
            const filteredNFTs = [];
            
            for (const nft of userNFTs) {
                try {
                    // Get the NFT quality
                    let quality = 'COMMON';
                    if (nft.metadata && nft.metadata.attributes && Array.isArray(nft.metadata.attributes)) {
                        for (const attr of nft.metadata.attributes) {
                            if (attr.trait_type === 'Quality') {
                                quality = attr.value;
                                break;
                            }
                        }
                    }
                    
                    // If the NFT is common quality, skip it
                    if (quality === 'COMMON') {
                        console.log(`Skip the common quality NFT: #${nft.tokenId}`);
                        continue;
                    }
                    
                    // Check if the NFT has been listed
                    const listing = await marketplaceContract.methods.listings(nft.tokenId).call();
                    
                    // If the NFT has not been listed or the listing has been cancelled, add it to the filtered list
                    if (!listing.active) {
                        filteredNFTs.push(nft);
                    }
                } catch (error) {
                    // If the query fails, assume the NFT has not been listed
                    console.warn(`Failed to check the listing status of NFT #${nft.tokenId}:`, error);
                    filteredNFTs.push(nft);
                }
            }
            
            userNFTs = filteredNFTs;
        } catch (error) {
            console.error('Failed to filter the listed NFTs:', error);
        }
    }
    
    /**
     * Render the NFT list
     */
    async function renderNFTList() {
        // Clear the NFT list
        nftList.innerHTML = '';
        
        // If there are no NFTs, show the prompt
        if (userNFTs.length === 0) {
            const noNFTMessage = document.createElement('div');
            noNFTMessage.className = 'no-nft-message';
            noNFTMessage.textContent = 'You have no NFTs to list (note: common quality NFTs are not allowed to be listed)';
            noNFTMessage.setAttribute('data-i18n', 'market.noNFTsToList');
            nftList.appendChild(noNFTMessage);
            return;
        }
        
        // Use PetNFTService to batch update the NFT images (if available)
        if (window.PetNFTService && typeof window.PetNFTService.updateNFTsWithBestImages === 'function') {
            try {
                console.log('Use PetNFTService to update the NFT images');
                userNFTs = await window.PetNFTService.updateNFTsWithBestImages(userNFTs);
            } catch (error) {
                console.warn('Failed to update the NFT images using PetNFTService:', error);
                // Continue to use the original images
            }
        }
        
        // Render each NFT
        for (const nft of userNFTs) {
            // Get the NFT quality
            let quality = 'COMMON';
            if (nft.metadata && nft.metadata.attributes && Array.isArray(nft.metadata.attributes)) {
                for (const attr of nft.metadata.attributes) {
                    if (attr.trait_type === 'Quality') {
                        quality = attr.value;
                        break;
                    }
                }
            }
            
            // Get the quality class
            const qualityClass = getQualityClass(quality);
            
            const nftItem = document.createElement('div');
            nftItem.className = `nft-item ${qualityClass}`;
            nftItem.setAttribute('data-token-id', nft.tokenId);
            nftItem.setAttribute('data-quality', quality);
            
            // If there is a quality filter and it is not "all", check if it should be displayed
            if (currentQualityFilter !== 'all' && quality !== currentQualityFilter) {
                nftItem.style.display = 'none';
            }
            
            // If the NFT is in cooldown, add the cooldown mark and disable the click
            if (nft.inCooldown) {
                nftItem.classList.add('in-cooldown');
                nftItem.setAttribute('data-cooldown', 'true');
                nftItem.setAttribute('data-cooldown-time', nft.cooldownTimeLeft);
                
                // Listen to the click event, show the cooldown prompt
                nftItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showStatus(`This NFT is in cooldown, please wait for ${formatTimeLeft(nft.cooldownTimeLeft)} before listing`, 'warning');
                });
            } else {
                // Add the selected class
                if (selectedNFT && selectedNFT.tokenId === nft.tokenId) {
                    nftItem.classList.add('selected');
                }
                
                // For the NFTs that are not in cooldown, add the normal click event
                nftItem.addEventListener('click', () => {
                    // Remove the selected class from all NFT items
                    document.querySelectorAll('.nft-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Add the selected class
                    nftItem.classList.add('selected');
                    
                    // Save the selected NFT
                    selectedNFT = nft;
                    selectedNFT.quality = quality; // Save the quality information
                    
                    // Validate the form
                    validateForm();
                });
            }
            
            // NFT image
            const nftImage = document.createElement('div');
            nftImage.className = 'nft-image';
            
            // Create the image element
            const img = document.createElement('img');
            
            // Get the best image URL
            let imageUrl;
            let imageSourceType = '';
            
            // Check if the NFT object already contains processed image information
            if (nft.imageSource && nft.metadata && nft.metadata.image) {
                // The image has been processed by PetNFTService
                imageUrl = nft.metadata.image;
                imageSourceType = nft.imageSource;
                console.log(`Use the processed image (${nft.tokenId}): ${imageUrl} (${imageSourceType})`);
                console.log("Image source:", nft.imageSource);
            } else if (window.PetNFTService && typeof window.PetNFTService.getBestPetImageUrl === 'function') {
                // Try to use PetNFTService to get the best image
                try {
                    const imageResult = await window.PetNFTService.getBestPetImageUrl(nft);
                    imageUrl = imageResult.imageUrl;
                    imageSourceType = imageResult.source;
                    console.log(`Get the best image URL (${nft.tokenId}): ${imageUrl} (${imageSourceType})`);
                    console.log("Image source:", imageResult.source);
                } catch (error) {
                    console.warn(`Failed to get the best image URL (${nft.tokenId}):`, error);
                    // Fallback to the original image
                    imageUrl = nft.metadata && nft.metadata.image ? nft.metadata.image : null;
                }
            } else {
                // If PetNFTService is not available, use the original image
                imageUrl = nft.metadata && nft.metadata.image ? nft.metadata.image : null;
            }
            
            // Set the image attributes
            if (imageUrl) {
                img.src = imageUrl;
                img.alt = nft.metadata && nft.metadata.name ? nft.metadata.name : `NFT #${nft.tokenId}`;
                img.setAttribute('data-source', imageSourceType || 'unknown');
                
                // When the image fails to load, use the placeholder image
                img.onerror = function() {
                    this.onerror = null;
                    this.src = '../../resources/images/pets/pet_placeholder.png';
                    console.warn(`Failed to load the image (${nft.tokenId}): ${imageUrl}`);
                };
                
                nftImage.appendChild(img);
            } else {
                // If there is no image URL, show the placeholder image
                img.src = '../../resources/images/pets/pet_placeholder.png';
                img.alt = 'Pet placeholder image';
                nftImage.appendChild(img);
                console.log(`Use the placeholder image (${nft.tokenId}): No valid image URL`);
            }
            
            // If the NFT is in cooldown, add the cooldown overlay
            if (nft.inCooldown) {
                const cooldownOverlay = document.createElement('div');
                cooldownOverlay.className = 'cooldown-overlay';
                const cooldownText = document.createElement('div');
                cooldownText.className = 'cooldown-text';
                cooldownText.textContent = `Cooldown: ${formatTimeLeft(nft.cooldownTimeLeft)}`;
                cooldownOverlay.appendChild(cooldownText);
                nftImage.appendChild(cooldownOverlay);
            }
            
            // NFT information
            const nftInfo = document.createElement('div');
            nftInfo.className = 'nft-info';
            
            // Add the quality tag
            const qualityTag = document.createElement('div');
            qualityTag.className = 'nft-quality';
            qualityTag.textContent = getQualityName(quality);
            nftItem.appendChild(qualityTag);
            
            const nftName = document.createElement('div');
            nftName.className = 'nft-name';
            nftName.textContent = nft.metadata && nft.metadata.name ? nft.metadata.name : `NFT #${nft.tokenId}`;
            
            const nftTokenId = document.createElement('div');
            nftTokenId.className = 'nft-token-id';
            nftTokenId.textContent = `Token ID: ${nft.tokenId}`;
            
            // Add the pet level display
            const nftLevel = document.createElement('div');
            nftLevel.className = 'nft-level';
            nftLevel.textContent = `Level: ${nft.level || 1}`;
            
            nftInfo.appendChild(nftName);
            nftInfo.appendChild(nftTokenId);
            nftInfo.appendChild(nftLevel);
            
            // Add to the NFT item
            nftItem.appendChild(nftImage);
            nftItem.appendChild(nftInfo);
            
            // Add to the NFT list
            nftList.appendChild(nftItem);
        }
        
        // Check if there are visible NFTs
        const visibleCount = Array.from(document.querySelectorAll('.nft-item')).filter(item => item.style.display !== 'none').length;
        
        // If there are no visible NFTs, show the prompt information
        if (visibleCount === 0 && currentQualityFilter !== 'all') {
            const noNFTMessage = document.createElement('div');
            noNFTMessage.className = 'no-nft-message';
            noNFTMessage.textContent = `No ${getQualityName(currentQualityFilter)} NFTs`;
            nftList.appendChild(noNFTMessage);
        }
        
        // Add the cooldown related CSS styles
        addCooldownStyles();
    }
    
    /**
     * Add the cooldown related CSS styles
     */
    function addCooldownStyles() {
        // Check if the style already exists
        const styleId = 'nft-cooldown-styles';
        if (document.getElementById(styleId)) {
            return;
        }
        
        // Create the style element
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
            }
        `;
        
        // Add to the document head
        document.head.appendChild(style);
    }
    
    /**
     * Validate the form and enable/disable the submit button
     */
    function validateForm() {
        // Get the price
        const price = priceInput.value.trim();
        
        // Validate the price
        const isValidPrice = price !== '' && !isNaN(price) && parseFloat(price) > 0;
        
        // Validate if an NFT is selected
        const isNFTSelected = selectedNFT !== null;
        
        // Enable/disable the submit button
        submitButton.disabled = !(isValidPrice && isNFTSelected);
        

    }
    
    /**
     * Handle the form submission
     */
    async function handleSubmit() {
        try {
            // Validate if an NFT is selected
            if (!selectedNFT) {
                throw new Error('Please select the NFT to list');
            }
            
            // Check if the NFT is in cooldown
            const cooldownInfo = await checkNFTCooldown(selectedNFT.tokenId);
            if (cooldownInfo.inCooldown) {
                throw new Error(`The NFT is still in cooldown, please wait for ${formatTimeLeft(cooldownInfo.timeLeft)} before listing`);
            }
            
            const price = priceInput.value.trim();
            if (!price || isNaN(price) || parseFloat(price) <= 0) {
                throw new Error('Please enter a valid price');
            }
            
            // Get the selected payment token
            const paymentToken = paymentTokenSelect.value;
            if (!paymentToken) {
                throw new Error('Please select the payment token');
            }
            
            // Show the status information
            showStatus('Preparing to list NFT...', 'info');
            
            // Get the current user address
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            // Convert the price to Wei
            const priceInWei = web3.utils.toWei(price, 'ether');
            
            // Get the appropriate gas limit based on the NFT quality
            const gasLimit = getNFTListingGasLimit(selectedNFT.quality);
            console.log(`Listing NFT quality: ${selectedNFT.quality}, setting gas limit: ${gasLimit}`);
            
            // Show the gas limit information - inform the user that a higher gas limit is being used to ensure the transaction succeeds
            showStatus(`Preparing to list: ${selectedNFT.name || `NFT #${selectedNFT.tokenId}`}, using a higher gas limit to ensure the transaction succeeds`, 'info');
            
            // Check the NFT authorization and ERC20 authorization
            showStatus('Checking the NFT authorization status...', 'info');
            
            // Ensure the NFTMarketplace contract address is correct
            const marketplaceAddress = marketplaceContract.options.address;
            if (!marketplaceAddress) {
                throw new Error('Failed to get the marketplace contract address');
            }
            console.log('NFT marketplace contract address:', marketplaceAddress);
            
            // Check if the marketplace contract is authorized to operate the NFT - using two ways to check
            // 1. Check isApprovedForAll - global authorization
            let isApproved;
            try {
                isApproved = await pwNFTContract.methods.isApprovedForAll(
                    userAddress, 
                    marketplaceAddress
                ).call();
                console.log('NFT authorization status:', isApproved ? 'Authorized' : 'Not authorized');
            } catch (approvalCheckError) {
                console.error('Failed to check the NFT authorization status:', approvalCheckError);
                throw new Error('Failed to check the NFT authorization status: ' + approvalCheckError.message);
            }
            
            // 2. If there is no global authorization, check if there is a separate authorization
            if (!isApproved) {
                try {
                    const approvedAddress = await pwNFTContract.methods.getApproved(selectedNFT.tokenId).call();
                    if (approvedAddress === marketplaceAddress) {
                        console.log('NFT is separately authorized to the marketplace contract');
                        isApproved = true;
                    } else {
                        console.log('NFT is not separately authorized to the marketplace contract, current authorized address:', approvedAddress);
                    }
                } catch (singleApprovalError) {
                    console.warn('Failed to check the separate authorization,可能是NFT不存在:', singleApprovalError);
                    // Continue processing, we will try global authorization
                }
            }
            
            // If not authorized, need to authorize first
            if (!isApproved) {
                showStatus('Authorizing the marketplace contract to operate the NFT (will show a wallet confirmation)...', 'info');
                
                try {
                    // First try using setApprovalForAll (recommended, authorize all NFTs)
                    console.log('Using setApprovalForAll to authorize the marketplace contract to operate all NFTs');
                    
                    // Send the authorization transaction - using a higher gas limit to ensure the authorization transaction succeeds
                    const approveTx = await pwNFTContract.methods.setApprovalForAll(
                        marketplaceAddress, 
                        true
                    ).send({ 
                        from: userAddress,
                        gas: 350000 // The authorization operation uses a fixed higher gas limit
                    });
                    
                    console.log('NFT authorization successful:', approveTx.transactionHash);
                    showStatus('Authorization successful! NFT can be managed by the marketplace contract', 'success');
                    
                    // Wait for a moment to ensure the authorization takes effect
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verify if the authorization is successful
                    const verifyApproval = await pwNFTContract.methods.isApprovedForAll(
                        userAddress, 
                        marketplaceAddress
                    ).call();
                    
                    if (!verifyApproval) {
                        console.warn('Failed to verify the authorization, possibly need to retry');
                        showStatus('Failed to verify the authorization, but will try to continue listing...', 'warning');
                    } else {
                        console.log('Authorization verification successful');
                    }
                } catch (approveError) {
                    console.error('Failed to authorize the marketplace contract:', approveError);
                    throw new Error('Failed to authorize the NFT: ' + approveError.message);
                }
            } else {
                console.log('NFT is already authorized to the marketplace contract');
                showStatus('NFT is authorized, continue listing...', 'info');
            }
            
            // Create the listing transaction
            showStatus(`Listing NFT (Gas limit: ${gasLimit})...`, 'info');
            
            try {
                // Get the NFT level information, if not loaded, set to the default value
                const level = selectedNFT.level || 1;
                const accumulatedFood = selectedNFT.accumulatedFood || 0;
                console.log(`Listing NFT additional information - level: ${level}, accumulated food: ${accumulatedFood}`);
                
                // Send the create listing transaction - using the gas limit determined by the quality
                const transaction = await marketplaceContract.methods.createListing(
                    selectedNFT.tokenId,
                    paymentToken,
                    priceInWei
                ).send({ 
                    from: userAddress,
                    gas: gasLimit // Using the gas limit determined by the quality
                });
                
                // Show the success information
                showStatus('NFT listing successful!', 'success');
                
                // Trigger the event to notify the listing success
                const event = new CustomEvent('nft.listed', { 
                    detail: { 
                        tokenId: selectedNFT.tokenId,
                        price: priceInWei,
                        paymentToken: paymentToken,
                        transaction: transaction
                    } 
                });
                window.dispatchEvent(event);
                
                // Reset the form and selected status
                priceInput.value = '';
                selectedNFT = null;
                
                // Reload the user's NFT list
                await loadUserNFTs();
            } catch (listingError) {
                console.error('Failed to list the NFT:', listingError);
                
                // Check the error message, provide more useful feedback
                let errorMessage = listingError.message;
                
                if (errorMessage.includes('execution reverted')) {
                    if (errorMessage.includes('Not the owner') || errorMessage.includes('ownerOf')) {
                        errorMessage = 'NFT ownership verification failed, you may not be the owner of this NFT';
                    } else if (errorMessage.includes('approved') || errorMessage.includes('allowance')) {
                        errorMessage = 'NFT authorization insufficient, please retry the authorization step';
                    } else if (errorMessage.includes('Marketplace not approved')) {
                        errorMessage = 'The marketplace contract is not authorized to operate your NFT, please retry the authorization step';
                    } else if (errorMessage.includes('Token not accepted')) {
                        errorMessage = 'The selected payment token is not accepted by the marketplace';
                    } else if (errorMessage.includes('Price must be greater than 0')) {
                        errorMessage = 'The price must be greater than 0';
                    } else if (errorMessage.includes('NFT not in marketplace custody')) {
                        errorMessage = 'Failed to transfer the NFT to the marketplace contract, possibly due to authorization issues';
                    }
                } else if (errorMessage.includes('gas')) {
                    errorMessage = 'Insufficient transaction gas, please increase the gas limit or try again later';
                }
                
                showStatus('Failed to list the NFT: ' + errorMessage, 'error');
                throw new Error('Failed to list the NFT: ' + errorMessage);
            }
        } catch (error) {
            console.error('Failed to list the NFT:', error);
            showStatus('Failed to list the NFT: ' + error.message, 'error');
        }
    }
    
    /**
     * Show the status information
     * @param {string} message - The message content
     * @param {string} type - The message type (info, success, error, warning)
     */
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
        statusMessage.style.display = 'block';
    }
    
    /**
     * Load the payment tokens
     */
    async function loadPaymentTokens() {
        try {
            // Clear the token selector (keep ETH option)
            while (paymentTokenSelect.options.length > 1) {
                paymentTokenSelect.remove(1);
            }
            
            // Check if SupportedMarketTokens is loaded
            if (window.SupportedMarketTokens && window.SupportedMarketTokens.getAllMarketTokens) {
                const tokens = window.SupportedMarketTokens.getAllMarketTokens();
                
                // Add each supported token to the selector
                tokens.forEach(token => {
                    // Skip ETH, as it is already added
                    if (token.symbol === 'ETH') return;
                    
                    const option = document.createElement('option');
                    option.value = token.address;
                    option.textContent = token.symbol;
                    
                    // If there is an icon, add the icon
                    if (token.logoUrl || token.fallbackEmoji) {
                        const icon = token.fallbackEmoji || '';
                        option.textContent = `${icon} ${token.symbol}`;
                    }
                    
                    paymentTokenSelect.appendChild(option);
                });
            } else {
                // If SupportedMarketTokens is not available, try to get the supported tokens from the contract
                try {
                    // If the marketplace contract has a method to get the supported tokens
                    if (marketplaceContract.methods.acceptedTokensList) {
                        let index = 0;
                        let hasMore = true;
                        
                        while (hasMore) {
                            try {
                                const tokenAddress = await marketplaceContract.methods.acceptedTokensList(index).call();
                                
                                // If the address is invalid or the zero address (ETH), skip
                                if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                                    index++;
                                    continue;
                                }
                                
                                // Get the token information
                                const tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                const symbol = await tokenContract.methods.symbol().call();
                                
                                // Create the option
                                const option = document.createElement('option');
                                option.value = tokenAddress;
                                option.textContent = symbol;
                                paymentTokenSelect.appendChild(option);
                                
                                index++;
                            } catch (error) {
                                console.log('End of supported token list:', error.message);
                                hasMore = false;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to load supported tokens from the contract:', error);
                    // If failed, at least keep the ETH option
                }
            }
        } catch (error) {
            console.error('Failed to load payment tokens:', error);
        }
    }
    
    /**
     * Handle the diagnostic button click event
     */
    async function handleDiagnostic() {
        // Ensure an NFT is selected
        if (!selectedNFT) {
            showStatus('Please select an NFT first', 'error');
            return;
        }
        
        try {
            showStatus('Starting to diagnose NFT authorization issues...', 'info');
            diagnosticButton.disabled = true;
            
            // Get the current user address
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            // Ensure we have contract instances and ContractApprovalManager
            if (!pwNFTContract || !marketplaceContract || !window.ContractApprovalManager || !window.ContractApprovalManager.diagnoseAndFixNFTApproval) {
                showStatus('Diagnostic tool unavailable, please refresh the page and try again', 'error');
                diagnosticButton.disabled = false;
                return;
            }
            
            // Call the diagnose and fix function
            const result = await window.ContractApprovalManager.diagnoseAndFixNFTApproval(
                pwNFTContract,
                marketplaceContract,
                userAddress,
                selectedNFT.tokenId
            );
            
            // Handle the result
            if (result.success) {
                showStatus(`Diagnosis successful: ${result.message}, now you can try listing the NFT`, 'success');
            } else {
                // If ownership cannot be verified, show a more detailed error
                if (result.diagnostics && !result.diagnostics.ownershipVerified) {
                    showStatus(`Ownership verification failed: ${result.message}, please confirm that you are the owner of the NFT`, 'error');
                } else if (result.diagnostics && result.diagnostics.fixAttempted && !result.diagnostics.fixSucceeded) {
                    showStatus(`Authorization attempt failed: ${result.message}, please try again later`, 'error');
                } else {
                    showStatus(`Diagnostic result: ${result.message}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error during diagnosis:', error);
            showStatus('Error during diagnosis: ' + error.message, 'error');
        } finally {
            diagnosticButton.disabled = false;
        }
    }
    
    // Expose the interface to the global
    window.ListNFTModal = {
        init,
        showModal,
        hideModal
    };
})(); 