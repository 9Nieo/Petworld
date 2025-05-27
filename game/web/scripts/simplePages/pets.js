const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Debug utility
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Simple Pets Debug]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Simple Pets Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Simple Pets Warning]', ...args);
        }
    };

    // Utility function to load scripts dynamically
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
        }
        
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            
            document.head.appendChild(script);
        });
    };
    
    let currentQualityFilter = 'all';
    // Used to save filtered NFTs
    window.filteredNFTsByQuality = null;
    
    // Add quality filter function
    function addQualityFilter() {
        debug.log('Adding quality filter');
        
        // Create quality filter container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'quality-filter-container';
        filterContainer.style.marginBottom = '20px';
        
        // Create quality filter
        const qualityFilter = document.createElement('div');
        qualityFilter.className = 'quality-filter';
        qualityFilter.style.display = 'flex';
        qualityFilter.style.flexWrap = 'wrap';
        qualityFilter.style.gap = '10px';
        
        // Create quality tabs
        const qualityLabels = [
            { id: 'all', name: 'All' },
            { id: 'COMMON', name: 'Common' },
            { id: 'GOOD', name: 'Good' },
            { id: 'EXCELLENT', name: 'Excellent' },
            { id: 'RARE', name: 'Rare' },
            { id: 'LEGENDARY', name: 'Legendary' }
        ];
        
        // Add each quality tab
        qualityLabels.forEach(quality => {
            const tab = document.createElement('div');
            tab.className = 'quality-tab' + (quality.id === 'all' ? ' active' : '');
            tab.setAttribute('data-quality', quality.id);
            tab.textContent = quality.name;
            
            // Set styles
            tab.style.padding = '6px 15px';
            tab.style.borderRadius = '5px';
            tab.style.backgroundColor = '#f0f0f0';
            tab.style.cursor = 'pointer';
            tab.style.transition = 'all 0.3s';
            tab.style.border = '1px solid #ddd';
            tab.style.fontSize = '0.9rem';
            
            // Set active state styles
            if (quality.id === 'all') {
                tab.style.backgroundColor = '#4d7bef';
                tab.style.color = 'white';
                tab.style.borderColor = '#3a68d8';
            }
            
            // If you need to add i18n support
            if (quality.id !== 'all') {
                tab.setAttribute('data-i18n', `quality.${quality.id.toLowerCase()}`);
            } else {
                tab.setAttribute('data-i18n', 'common.all');
            }
            
            // Add click event
            tab.addEventListener('click', handleQualityTabClick);
            
            qualityFilter.appendChild(tab);
        });
        
        // Add quality filter to container
        filterContainer.appendChild(qualityFilter);
        
        // Add quality filter to page
        const petContainer = document.querySelector('.pet-container');
        const sectionHeader = document.querySelector('.section-header');
        
        // Insert after section-header
        if (petContainer && sectionHeader) {
            petContainer.insertBefore(filterContainer, sectionHeader.nextSibling);
        }
    }
    
    /**
     * Handle quality tab click
     */
    function handleQualityTabClick(event) {
        // Remove active class from all tabs
        document.querySelectorAll('.quality-tab').forEach(tab => {
            tab.classList.remove('active');
            // Reset styles
            tab.style.backgroundColor = '#f0f0f0';
            tab.style.color = 'inherit';
            tab.style.borderColor = '#ddd';
        });
        
        // Add active class and styles to the clicked tab
        event.currentTarget.classList.add('active');
        
        // Set active state styles
        const qualityId = event.currentTarget.getAttribute('data-quality');
        if (qualityId === 'LEGENDARY') {
            event.currentTarget.style.backgroundColor = '#ff9800';
            event.currentTarget.style.borderColor = '#f57c00';
        } else if (qualityId === 'RARE') {
            event.currentTarget.style.backgroundColor = '#673ab7';
            event.currentTarget.style.borderColor = '#512da8';
        } else if (qualityId === 'EXCELLENT') {
            event.currentTarget.style.backgroundColor = '#2196f3';
            event.currentTarget.style.borderColor = '#1976d2';
        } else if (qualityId === 'GOOD') {
            event.currentTarget.style.backgroundColor = '#4caf50';
            event.currentTarget.style.borderColor = '#388e3c';
        } else if (qualityId === 'COMMON') {
            event.currentTarget.style.backgroundColor = '#9e9e9e';
            event.currentTarget.style.borderColor = '#757575';
        } else {
            event.currentTarget.style.backgroundColor = '#4d7bef';
            event.currentTarget.style.borderColor = '#3a68d8';
        }
        
        event.currentTarget.style.color = 'white';
        
        // Get selected quality
        currentQualityFilter = qualityId;
        debug.log('Selected quality:', currentQualityFilter);
        
        // Save current filter condition to localStorage
        localStorage.setItem('petQualityFilter', currentQualityFilter);
        debug.log('Saved quality filter condition to localStorage:', currentQualityFilter);
        
        // Clear previous filter result cache
        window.filteredNFTsByQuality = null;
        
        // Filter pet cards
        filterPetsByQuality();
    }
    
    /**
     * Filter pet cards by quality
     */
    function filterPetsByQuality() {
        // Get current user's NFT data
        let nfts = window.PetNFTService ? window.PetNFTService.getCachedNFTs() : userNFTs || [];
        
        debug.log('Filtering pets by quality:', currentQualityFilter);
        debug.log('Total NFTs before filtering:', nfts.length);
        
        if (currentQualityFilter === 'all') {
            // Show all NFTs
            window.filteredNFTsByQuality = nfts;
        } else {
            // Filter by specific quality
            window.filteredNFTsByQuality = nfts.filter(nft => {
                return matchesQuality(nft, currentQualityFilter);
            });
        }
        
        debug.log('NFTs after filtering:', window.filteredNFTsByQuality.length);
                
        // Re-render filtered NFTs
        renderFilteredNFTs(1); // Start from page 1
    }
    
    /**
     * Render filtered NFTs with pagination
     * @param {number} page - Page number to render
     */
    async function renderFilteredNFTs(page) {
        const nfts = window.filteredNFTsByQuality || [];
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageNFTs = nfts.slice(startIndex, endIndex);
        
        debug.log(`Rendering page ${page}, NFTs ${startIndex}-${endIndex} of ${nfts.length}`);
        
        // Clear pet grid if it's the first page
        if (page === 1) {
        petGrid.innerHTML = '';
        }
        
        if (nfts.length === 0) {
            // No NFTs match the filter
            const message = document.createElement('div');
            message.className = 'no-pets-message';
            message.innerHTML = `
                <div class="no-pets-icon">🐾</div>
                <h3>No pets found</h3>
                <p>No pets match the selected quality filter.</p>
            `;
            petGrid.appendChild(message);
            return;
        }
        
        if (pageNFTs.length === 0 && page > 1) {
            // No more NFTs to show
            debug.log('No more NFTs to show for this page');
            return;
        }
        
        // Create info container for filter results
        if (page === 1 && currentQualityFilter !== 'all') {
            const infoContainer = document.createElement('div');
            infoContainer.className = 'filter-info';
            infoContainer.style.gridColumn = '1 / -1';
            infoContainer.style.textAlign = 'center';
            infoContainer.style.padding = '10px';
            infoContainer.style.backgroundColor = '#f0f8ff';
            infoContainer.style.borderRadius = '5px';
            infoContainer.style.marginBottom = '15px';
            infoContainer.innerHTML = `
                <p style="margin: 0; color: #333;">
                    Showing ${nfts.length} ${currentQualityFilter.toLowerCase()} quality pets
                </p>
            `;
        petGrid.appendChild(infoContainer);
        }
        
        // Render NFT cards for this page
        for (const nft of pageNFTs) {
            try {
                const tokenId = nft.tokenId || nft.id;
                
                // Check if card already exists
                const existingCard = petGrid.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                if (existingCard) {
                    debug.log(`Pet card for token ${tokenId} already exists, skipping`);
                    continue;
                }
                
                // Create and append new card
                await PetCard.appendCardToContainer(nft, petGrid);
                debug.log(`Pet card created for token ${tokenId}`);
            } catch (error) {
                debug.error('Error creating pet card:', error);
                // Create error card
                const errorCard = document.createElement('div');
                errorCard.className = 'pet-card error-card';
                errorCard.innerHTML = `<p>Error loading pet data</p>`;
                petGrid.appendChild(errorCard);
            }
        }
        
        // Update current page
        currentPage = page;
        
        // Check if there are more pages
        hasReachedEnd = endIndex >= nfts.length;
        
        debug.log(`Page ${page} rendered. Has more pages: ${!hasReachedEnd}`);
    }
    
    /**
     * Check if NFT matches the quality filter
     * @param {Object} nft - NFT object
     * @param {string} filterQuality - Quality to filter by
     * @returns {boolean} - Whether NFT matches the filter
     */
    function matchesQuality(nft, filterQuality) {
        if (!nft || !nft.metadata || !nft.metadata.attributes) {
            return false;
        }
        
        // Find quality attribute
        const qualityAttr = nft.metadata.attributes.find(attr => 
            attr.trait_type === 'Quality' || attr.trait_type === 'quality'
        );
        
        if (!qualityAttr) {
            return false;
        }
        
        // Compare quality values (case insensitive)
        const nftQuality = qualityAttr.value.toUpperCase();
        const targetQuality = filterQuality.toUpperCase();
        
        return nftQuality === targetQuality;
    }
    
    // DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const petGrid = document.querySelector('.pet-grid');
    const adoptNewBtn = document.querySelector('.section-btn');
    
    // Global variables
    let hasLoadedNFT = false;
    let currentPage = 1; // Current page number
    const itemsPerPage = 6; // Number of pets per page
    let isLoadingMore = false; // Prevent duplicate loading
    let hasReachedEnd = false; // Whether all data has been loaded
    let isLoadingInBackground = false; // Mark background loading state
    let totalNFTCount = 0; // NFT total count
    let userNFTs = []; // Store user's NFT data for batch operations
    
    // Add a variable to record the last refresh time
    let lastRefreshTime = Date.now();
    
    // Add a flag to track whether PetCard events have been bound
    let isPetCardEventsInitialized = false;
    
    // Initialize
    init();
    
    // When the page is unloaded, clear all timers
    window.addEventListener('beforeunload', () => {
        debug.log('Page is about to be unloaded, clear all timers');
        if (window.PetCard && window.PetCard.stopAllSatietyTimers) {
            window.PetCard.stopAllSatietyTimers();
        }
    });
    
    // When the page is switched, clear all timers
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            debug.log('Page is not visible, clear all timers');
            if (window.PetCard && window.PetCard.stopAllSatietyTimers) {
                window.PetCard.stopAllSatietyTimers();
            }
        } else if (document.visibilityState === 'visible') {
            // Check if data needs to be refreshed (refresh if more than 1 minute since last refresh)
            const now = Date.now();
            const refreshInterval = 1 * 60 * 1000; // 1 minute
            
            if (now - lastRefreshTime > refreshInterval) {
                debug.log('Page is visible again, and more than 1 minute since last refresh, reload NFT data');
                lastRefreshTime = now; // Update last refresh time
                resetPetsPage();
            } else {
                debug.log('Page is visible again, but less than 1 minute since last refresh, skip refresh');
                
                // Only resume the timers on pet cards, do not reload data
                if (window.PetCard && window.PetCard.resumeAllSatietyTimers) {
                    window.PetCard.resumeAllSatietyTimers();
                }
            }
        }
    });
    
    /**
     * Initialize function
     */
    function init() {
        debug.log('Initializing pet page');
        
        // Add quality filter
        addQualityFilter();
        
        if (!walletBtn || !walletAddressSpan || !walletFrame || !petGrid) {
            console.error('Page elements not found');
            return;
        }
        
        debug.log('Initializing pet page...');
        
        // Check if there is a saved quality filter in localStorage
        const savedQualityFilter = localStorage.getItem('petQualityFilter');
        if (savedQualityFilter) {
            debug.log(`Found saved quality filter: ${savedQualityFilter}`);
            currentQualityFilter = savedQualityFilter;
        }
        
        // Initialize WalletNetworkManager for unified wallet and network management
        initializeWalletNetworkManager().then(result => {
            debug.log('WalletNetworkManager initialization completed:', result);
            
            if (result.success) {
                debug.log('Using WalletNetworkManager for wallet and network management');
                setupWalletNetworkManagerEventListeners();
                
                // Load NFTs if wallet is connected
                if (result.isConnected && result.address) {
                    setTimeout(() => {
                        loadUserNFTs(true);
                    }, 500);
                }
            } else {
                debug.error('WalletNetworkManager initialization failed:', result.error);
                showNoWalletMessage();
            }
        }).catch(error => {
            debug.error('Error during WalletNetworkManager initialization:', error);
            showNoWalletMessage();
        });
        
        // Bind events
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind adoption button click event
        if (adoptNewBtn) {
            adoptNewBtn.addEventListener('click', () => {
                window.location.href = './shop.html';
            });
        }
        
        // Listen for iframe messages
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for language change events
        window.addEventListener('localeChanged', handleLocaleChanged);
        
        // Apply current language
        updateUITexts();
        
        // Add PetNFTService script
        loadPetNFTServiceScript();
        
        // Initialize batch operation buttons
        initBatchActionButtons();
        
        // Show data structure example when initializing
        if (typeof showNFTDataStructure === 'function') {
            showNFTDataStructure();
        } else {
            debug.log('showNFTDataStructure function not available, skipping');
        }
        
        // Bind refresh button click event
        const refreshBtn = document.querySelector('.nft-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                const now = Date.now();
                const refreshInterval = 1 * 60 * 1000; // 1 minute
                const timeElapsed = now - lastRefreshTime;
                
                if (timeElapsed < refreshInterval) {
                    const remainingMinutes = Math.ceil((refreshInterval - timeElapsed) / 60000);
                    
                    if (confirm(`You recently refreshed the data ${Math.floor(timeElapsed/1000)} seconds ago, it's recommended to wait for ${remainingMinutes} minutes before refreshing again.\n\nDo you still want to refresh immediately?`)) {
                        debug.log('User confirmed to refresh pet data...');
                        resetPetsPage();
                    } else {
                        debug.log('User cancelled the refresh operation');
                        showToast('Refresh cancelled, pet data remains unchanged', 3000);
                    }
                } else {
                    debug.log('Click the refresh button to refresh pet data...');
                    resetPetsPage();
                }
            });
        } else {
            debug.warn('Refresh button not found - this is normal if the button is not present in the HTML');
        }
        
        // Bind pet card interactions
        initPetCardInteractions();
        
        // Load contract address and ABI
        loadContractAddressScript();
    }
    
    /**
     * Initialize WalletNetworkManager for unified wallet and network management
     */
    async function initializeWalletNetworkManager() {
        debug.log('Initializing WalletNetworkManager...');
        
        try {
            // WalletNetworkManager should already be loaded via HTML script tags
            if (!window.WalletNetworkManager) {
                throw new Error('WalletNetworkManager not available - ensure script is loaded in HTML');
    }
    
            // Create WalletNetworkManager instance if not exists
            if (!window.walletNetworkManager) {
                window.walletNetworkManager = new window.WalletNetworkManager();
            }
            
            // Initialize WalletNetworkManager
            const initResult = await window.walletNetworkManager.init();
            
            if (initResult.success) {
                debug.log('WalletNetworkManager initialized successfully:', initResult);
                
                // Update UI based on WalletNetworkManager status
                updateWalletUI();
                
                return {
                    success: true,
                    isConnected: initResult.isConnected,
                    address: window.walletNetworkManager.getCurrentAddress(),
                    walletType: initResult.walletType,
                    network: initResult.network
                };
        } else {
                debug.error('WalletNetworkManager initialization failed:', initResult);
                return initResult;
            }
                    } catch (error) {
            debug.error('Error initializing WalletNetworkManager:', error);
            return {
                success: false,
                error: error.message
            };
            }
        }
        
    /**
     * Set up event listeners for WalletNetworkManager events
     */
    function setupWalletNetworkManagerEventListeners() {
        if (!window.walletNetworkManager) return;
        
        // Listen for wallet connection events
        window.walletNetworkManager.on('walletConnected', (data) => {
            debug.log('WalletNetworkManager: Wallet connected', data);
            updateWalletUI();
            loadUserNFTs(true);
        });
        
        // Listen for wallet disconnection events
        window.walletNetworkManager.on('walletDisconnected', (data) => {
            debug.log('WalletNetworkManager: Wallet disconnected', data);
            updateWalletUI();
            resetPetsPage();
        });
        
        // Listen for network change events
        window.walletNetworkManager.on('networkChanged', (data) => {
            debug.log('WalletNetworkManager: Network changed', data);
            // Refresh pet data for new network
            const currentAddress = window.walletNetworkManager.getCurrentAddress();
            if (currentAddress) {
                loadUserNFTs(true);
                            }
        });
        
        // Listen for contract ready events
        window.walletNetworkManager.on('contractsReady', (data) => {
            debug.log('WalletNetworkManager: Contracts ready', data);
            // Refresh pet data now that contracts are ready
            const currentAddress = window.walletNetworkManager.getCurrentAddress();
            if (currentAddress) {
                loadUserNFTs(true);
            }
        });
    }
    
    /**
     * Show message when there are no NFTs
     */
    function showNoNFTsMessage() {
        petGrid.innerHTML = `
            <div class="no-pets-message">
                <div class="no-pets-icon">🐾</div>
                <h3>${i18n ? i18n.t('pets.noPets') : 'You have no pets'}</h3>
                <p>${i18n ? i18n.t('pets.noPetsDesc') : 'Visit the store to buy your first pet NFT!'}</p>
                <a href="shop.html" class="get-pet-btn">${i18n ? i18n.t('navigation.shop') : 'Visit the store'}</a>
            </div>
        `;
    }
    
    /**
     * Show message when no wallet is connected
     */
    function showNoWalletMessage() {
        petGrid.innerHTML = `
            <div class="no-pets-message">
                <div class="no-pets-icon">🔗</div>
                <h3>${i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected'}</h3>
                <p>${i18n ? i18n.t('wallet.connectToView') : 'Please connect your wallet to view your pets.'}</p>
                <button onclick="handleWalletBtnClick()" class="get-pet-btn">${i18n ? i18n.t('wallet.connect') : 'Connect Wallet'}</button>
            </div>
        `;
    }
    
    /**
     * Create pet card
     * @param {Object} nft - NFT data
     * @returns {HTMLElement} Created card element
     */
    async function createPetCard(nft) {
        // Use PetCard component to create card
        let card = await PetCard.createPetCard(nft);
        
        // Ensure card has quality data attribute, for filtering
        if (nft.metadata && nft.metadata.attributes) {
            const qualityAttr = nft.metadata.attributes.find(attr => attr.trait_type === 'Quality');
            if (qualityAttr) {
                card.dataset.quality = qualityAttr.value;
            }
        }
        
        // Add to pet grid
        petGrid.appendChild(card);
        
        return card;
    }
    
    /**
     * Initialize pet card interactions
     */
    function initPetCardInteractions() {
        // Bind card event handling functions
        PetCard.bindGlobalEvents({
            onShowDetail: function(data) {
                console.log('View pet details/sell:', data);
                // Here you can implement jumping to the details page or displaying a popup
                alert(`popup will be displayed to show the details of pet #${data.tokenId}`);
            },
            onFeed: function(data) {
                console.log('Handle pet feeding:', data);
                // Call feeding handling function from PetFeeding module
                if (typeof window.handlePetFeeding === 'function') {
                    window.handlePetFeeding(data);
                } else {
                    debug.warn('handlePetFeeding function not available, trying to load PetFeeding module');
                    // Try to load PetFeeding module if not already loaded
                    loadContractScript('../../scripts/functionPackages/PetFeeding.js')
                        .then(() => {
                            if (typeof window.handlePetFeeding === 'function') {
                                window.handlePetFeeding(data);
                            } else {
                                debug.error('handlePetFeeding function still not available after loading module');
                                showToast('Pet feeding function is not available, please refresh the page', 5000);
                            }
                        })
                        .catch(error => {
                            debug.error('Failed to load PetFeeding module:', error);
                            showToast('Failed to load feeding module, please refresh the page', 5000);
                        });
                }
            },
            onClaim: function(data) {
                console.log('Handle pet reward claim:', data);
                // Call reward claim handling function from PetRewards module
                if (typeof window.handlePetRewardClaim === 'function') {
                    window.handlePetRewardClaim(data);
                } else {
                    debug.warn('handlePetRewardClaim function not available, trying to load PetRewards module');
                    // Try to load PetRewards module if not already loaded
                    loadContractScript('../../scripts/functionPackages/PetRewards.js')
                        .then(() => {
                            if (typeof window.handlePetRewardClaim === 'function') {
                                window.handlePetRewardClaim(data);
                            } else {
                                debug.error('handlePetRewardClaim function still not available after loading module');
                                showToast('Pet reward claim function is not available, please refresh the page', 5000);
                            }
                        })
                        .catch(error => {
                            debug.error('Failed to load PetRewards module:', error);
                            showToast('Failed to load rewards module, please refresh the page', 5000);
                        });
                }
            }
        });
    }
    
    function handleWalletBtnClick() {
        // Use WalletNetworkManager status to determine action
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            if (status.isConnected) {
            // If connected, disconnect
            disconnectWallet();
        } else {
            // If not connected, show wallet connection modal
                showWalletModal();
            }
        } else {
            // Fallback: show wallet connection modal
            showWalletModal();
        }
    }
    
    /**
     * Show wallet connection modal
     */
    function showWalletModal() {
        walletFrame.style.display = 'block';
    }
    
    /**
     * Hide wallet connection modal
     */
    function hideWalletModal() {
        walletFrame.style.display = 'none';
    }
    
    /**
     * Handle iframe messages
     */
    function handleIframeMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        switch (message.type) {
            case 'walletConnected':
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                handleWalletDisconnected();
                break;
                
            case 'web3Ready':
                debug.log('Received Web3 instance from external wallet');
                // Let WalletNetworkManager handle this
                if (window.walletNetworkManager) {
                    window.walletNetworkManager.refresh();
                }
                break;
        }
    }
    
    /**
     * Handle wallet connection event
     * @param {Object|string} data - Wallet connection data or address
     */
    function handleWalletConnected(data) {
        debug.log('Wallet connection data:', data);
        
        // Extract wallet address
        let address;
        if (typeof data === 'string') {
            address = data;
        } else if (data && typeof data === 'object') {
            address = data.address || '';
        } else {
            debug.error('Invalid wallet connection data:', data);
            return;
        }
        
        if (!address || typeof address !== 'string') {
            debug.error('Invalid wallet address:', address);
            return;
        }
        
        // Update UI
        updateWalletUI();
        
        // Load user NFTs
        loadUserNFTs(true);
        
        // Hide wallet modal
        hideWalletModal();
        
        // Store connection info
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', address);
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        
        debug.log('Wallet connected successfully:', address);
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        debug.log('Disconnecting wallet...');
        
        // Send disconnect message to iframe
        if (walletFrame && walletFrame.contentWindow) {
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        }
        
        // Clear storage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Update UI
        updateWalletUI();
        
        // Reset page
        resetPetsPage();
        
        debug.log('Wallet disconnected');
    }
    
    /**
     * Handle wallet disconnection event
     */
    function handleWalletDisconnected() {
        debug.log('Handling wallet disconnection...');
        
        // Clear storage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        // Update UI
        updateWalletUI();
        
        // Reset page
        resetPetsPage();
        
        debug.log('Wallet disconnected');
    }
    
    /**
     * Update wallet UI based on WalletNetworkManager status
     */
    function updateWalletUI() {
        let connected = false;
        let address = null;
        
        // Get status from WalletNetworkManager
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            connected = status.isConnected;
            address = window.walletNetworkManager.getCurrentAddress();
            debug.log('Using WalletNetworkManager status for UI update:', { connected, address });
        }
        
        if (connected && address) {
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
            walletBtn.classList.add('connected');
            walletAddressSpan.textContent = formatAddress(address);
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
        } else {
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected';
            walletAddressSpan.title = '';
            walletAddressSpan.classList.remove('truncated-address');
        }
    }
    
    /**
     * Format address display
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
   
    /**
     * Handle language change event
     * @param {CustomEvent} event - Language change event
     */
    function handleLocaleChanged(event) {
        debug.log('Language changed, update UI texts');
        updateUITexts();
    }
    
    /**
     * Update UI texts
     */
    function updateUITexts() {
        if (!i18n) return;
        
        // Update page title
        document.title = i18n.t('navigation.pets') + ' - ' + i18n.t('game.title');
        
        // Update wallet UI
        updateWalletUI();
        
        // Update elements with data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        debug.log('UI texts updated to language:', i18n.getCurrentLocale());
    }
    
    /**
     * Load user NFT assets
     * @param {boolean} forceUpdate - Whether to force re-fetch data from blockchain
     */
    function loadUserNFTs(forceUpdate = false) {
        // Get current address from WalletNetworkManager
        const currentAddress = window.walletNetworkManager ? 
            window.walletNetworkManager.getCurrentAddress() : null;
            
        if (!window.PetNFTService || !currentAddress) {
            debug.log('Cannot load user NFT: service not initialized or wallet not connected');
            showNoWalletMessage();
            return;
        }
        
        debug.log('Load user NFT, force update:', forceUpdate);
        
        // Call loadSpecificNFT function, passing forceUpdate parameter
        if (typeof loadSpecificNFT === 'function') {
            loadSpecificNFT(currentAddress, forceUpdate);
        } else if (typeof window.loadSpecificNFT === 'function') {
            window.loadSpecificNFT(currentAddress, forceUpdate);
        } else {
            debug.warn('loadSpecificNFT function not available');
        }
    }

    // Utility functions that are still needed
    function loadPetNFTServiceScript() {
        // Check if PetNFTService already exists
        if (window.PetNFTService) {
            debug.log('PetNFTService already exists, no need to load again');
            
            // Initialize directly
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialization' + (success ? 'success' : 'failed'));
                
                // Enhance updateCachedNFTs method, add deduplication function
                if (!window.PetNFTService.updateCachedNFTs) {
                    debug.log('Add updateCachedNFTs method to PetNFTService');
                    window.PetNFTService.updateCachedNFTs = function(nfts) {
                        if (!nfts || !Array.isArray(nfts)) {
                            debug.error('updateCachedNFTs: invalid NFT array');
                            return;
                        }
                        
                        // Process deduplication before storage
                        const tokenIdMap = new Map();
                        for (const nft of nfts) {
                            const tokenId = nft.tokenId || nft.token_id;
                            if (tokenId && !tokenIdMap.has(tokenId)) {
                                tokenIdMap.set(tokenId, nft);
                            }
                        }
                        
                        // Convert back to array
                        const uniqueNfts = Array.from(tokenIdMap.values());
                        
                        // Replace cached NFTs directly
                        this._cachedNFTs = uniqueNfts;
                        debug.log(`Update cached NFT, original count: ${nfts.length}, deduplicated count: ${uniqueNfts.length}`);
                    };
                } else {
                    // Enhance existing method, add deduplication function
                    const originalUpdateCachedNFTs = window.PetNFTService.updateCachedNFTs;
                    window.PetNFTService.updateCachedNFTs = function(nfts) {
                        if (!nfts || !Array.isArray(nfts)) {
                            return originalUpdateCachedNFTs.call(this, nfts);
                        }
                        
                        // Process deduplication before storage
                        const tokenIdMap = new Map();
                        for (const nft of nfts) {
                            const tokenId = nft.tokenId || nft.token_id;
                            if (tokenId && !tokenIdMap.has(tokenId)) {
                                tokenIdMap.set(tokenId, nft);
                            }
                        }
                        
                        // Convert back to array
                        const uniqueNfts = Array.from(tokenIdMap.values());
                        debug.log(`Update cached NFT, original count: ${nfts.length}, deduplicated count: ${uniqueNfts.length}`);
                        
                        // Call original method to store deduplicated NFTs
                        return originalUpdateCachedNFTs.call(this, uniqueNfts);
                    };
                }
                
                // Check if wallet is connected, load specific NFT
                const currentAddress = window.walletNetworkManager ? 
                    window.walletNetworkManager.getCurrentAddress() : null;
                if (success && currentAddress) {
                    if (typeof loadSpecificNFT === 'function') {
                        loadSpecificNFT(currentAddress, true);
                    } else if (typeof window.loadSpecificNFT === 'function') {
                        window.loadSpecificNFT(currentAddress, true);
                    } else {
                        debug.warn('loadSpecificNFT function not available');
                    }
                }
            });
            
            return;
        }
        
        // Check if the script has been loaded
        const existingScript = document.querySelector('script[src="../../scripts/other/petNFTService.js"]');
        if (existingScript) {
            debug.log('PetNFTService script already loaded, waiting for initialization to complete');
            
            // Check if it has been initialized, if not, wait
            const checkInitialized = function() {
                if (window.PetNFTService) {
                    debug.log('PetNFTService initialization completed');
                    
                    // Initialize
                    window.PetNFTService.init().then(success => {
                        debug.log('PetNFTService initialization' + (success ? 'success' : 'failed'));
                        
                        // Add updateCachedNFTs method
                        if (!window.PetNFTService.updateCachedNFTs) {
                            debug.log('Add updateCachedNFTs method to PetNFTService');
                            window.PetNFTService.updateCachedNFTs = function(nfts) {
                                if (!nfts || !Array.isArray(nfts)) {
                                    debug.error('updateCachedNFTs: invalid NFT array');
                                    return;
                                }
                                
                                // Replace cached NFTs directly
                                this._cachedNFTs = nfts;
                                debug.log(`Update cached NFT, new count: ${nfts.length}`);
                            };
                        }
                        
                        // Check connection status and load NFT
                        const currentAddress = window.walletNetworkManager ? 
                            window.walletNetworkManager.getCurrentAddress() : null;
                        if (success && currentAddress) {
                            loadSpecificNFT(currentAddress);
                        }
                    });
                } else {
                    debug.log('Waiting for PetNFTService initialization...');
                    setTimeout(checkInitialized, 500);
                }
            };
            
            // Start checking
            checkInitialized();
            return;
        }
        
        // Create and load script
        const script = document.createElement('script');
        script.src = '../../scripts/other/petNFTService.js';
        script.async = true;
        
        script.onload = function() {
            debug.log('PetNFTService script loaded successfully');
            
            // Ensure PetNFTService initialization
            if (window.PetNFTService) {
                window.PetNFTService.init().then(success => {
                    debug.log('PetNFTService initialization' + (success ? 'success' : 'failed'));
                    
                    // If updateCachedNFTs method does not exist, add it
                    if (!window.PetNFTService.updateCachedNFTs) {
                        debug.log('Add updateCachedNFTs method to PetNFTService');
                        window.PetNFTService.updateCachedNFTs = function(nfts) {
                            if (!nfts || !Array.isArray(nfts)) {
                                debug.error('updateCachedNFTs: invalid NFT array');
                                return;
                            }
                            
                            // Replace cached NFTs directly
                            this._cachedNFTs = nfts;
                            debug.log(`Update cached NFT, new count: ${nfts.length}`);
                        };
                    }
                    
                    // After script loading, check if wallet is connected, load specific NFT
                    const currentAddress = window.walletNetworkManager ? 
                        window.walletNetworkManager.getCurrentAddress() : null;
                    if (success && currentAddress) {
                        loadSpecificNFT(currentAddress);
                    }
                });
            } else {
                debug.error('PetNFTService is undefined');
            }
        };
        
        script.onerror = function() {
            debug.error('PetNFTService script loading failed');
        };
        
        document.head.appendChild(script);
    }

    function resetPetsPage() {
        debug.log('Reset pets page and reload data');
        
        // Update last refresh time
        lastRefreshTime = Date.now();
        
        // Reset page number and status
        currentPage = 1;
        hasLoadedNFT = false;
        hasReachedEnd = false;
        isLoadingMore = false;
        isLoadingInBackground = false; // Ensure reset background loading mark
        
        // Reset global NFT array, avoid potential data duplication
        userNFTs = [];
        window.filteredNFTsByQuality = null;
        
        // Clear pet grid
        petGrid.innerHTML = `<div class="loading-indicator">${i18n ? i18n.t('pets.loadingPets') : 'Loading pets...'}</div>`;
        
        // Load NFTs if wallet is connected
        const currentAddress = window.walletNetworkManager ? 
            window.walletNetworkManager.getCurrentAddress() : null;
        if (currentAddress) {
            loadUserNFTs(true);
        } else {
            showNoWalletMessage();
                }
    }

    function resetLoadingState() {
        debug.log('Reset loading state');
        isLoadingMore = false;
        isLoadingInBackground = false;
    }
    
    function showWalletAddress(address) {
        if (walletAddressSpan) {
        walletAddressSpan.textContent = formatAddress(address);
        walletAddressSpan.title = address;
        walletAddressSpan.classList.add('truncated-address');
        }
    }
    
    function toggleConnectButton(connected) {
        if (walletBtn) {
            if (connected) {
                walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
            walletBtn.classList.add('connected');
        } else {
                walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
            walletBtn.classList.remove('connected');
            }
        }
    }
    
    function loadContractAddressScript() {
        debug.log('Loading contract address script...');
        
        // Check if contract addresses are already loaded
        if (window.contractAddresses) {
            debug.log('Contract addresses already loaded');
            return Promise.resolve();
        }
        
        return loadScript('../../scripts/contracts/contractAddresses.js')
            .then(() => {
                debug.log('Contract address script loaded successfully');
                if (window.contractAddresses) {
                    debug.log('Contract address configuration is now available');
                } else {
                    debug.error('Contract address configuration loaded but global variable is not defined');
                }
            })
            .catch(error => {
                debug.error('Failed to load contract address script:', error);
            });
    }

    /**
     * Initialize event listeners for batch action buttons
     */
    function initBatchActionButtons() {
        const feedAllBtn = document.getElementById('feedAllPetsBtn');
        const claimAllBtn = document.getElementById('claimAllRewardsBtn');
        const feedFriendBtn = document.getElementById('feedFriendNFTBtn');
        
        if (feedAllBtn) {
            feedAllBtn.addEventListener('click', handleFeedAllPets);
        } else {
            debug.error('Batch feed button not found');
        }
        
        if (claimAllBtn) {
            claimAllBtn.addEventListener('click', async function() {
                // Check if handleClaimAllRewards function is available
                if (typeof window.handleClaimAllRewards === 'function') {
                    await window.handleClaimAllRewards();
                } else {
                    debug.warn('handleClaimAllRewards function not available, trying to load PetRewards module');
                    try {
                        // Try to load PetRewards module if not already loaded
                        if (!window.PetRewards) {
                            await loadContractScript('../../scripts/functionPackages/PetRewards.js');
                        }
                        
                        // Wait a bit for the module to initialize
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        if (typeof window.handleClaimAllRewards === 'function') {
                            await window.handleClaimAllRewards();
                        } else {
                            debug.error('handleClaimAllRewards function still not available after loading module');
                            showToast('Claim all rewards function is not available, please refresh the page', 5000);
                        }
                    } catch (error) {
                        debug.error('Failed to load PetRewards module:', error);
                        showToast('Failed to load rewards module, please refresh the page', 5000);
                    }
                }
            });
        } else {
            debug.error('Batch claim button not found');
        }
        
        if (feedFriendBtn) {
            feedFriendBtn.addEventListener('click', async function() {
                // Check if handleFeedFriendNFT function is available
                if (typeof window.handleFeedFriendNFT === 'function') {
                    await window.handleFeedFriendNFT();
                } else {
                    debug.warn('handleFeedFriendNFT function not available, trying to load PetFeeding module');
                    try {
                        // Try to load PetFeeding module if not already loaded
                        if (!window.PetFeeding) {
                            await loadContractScript('../../scripts/functionPackages/PetFeeding.js');
                        }
                        
                        // Wait a bit for the module to initialize
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        if (typeof window.handleFeedFriendNFT === 'function') {
                            await window.handleFeedFriendNFT();
                        } else {
                            debug.error('handleFeedFriendNFT function still not available after loading module');
                            showToast('Feed friend function is not available, please refresh the page', 5000);
                        }
                    } catch (error) {
                        debug.error('Failed to load PetFeeding module:', error);
                        showToast('Failed to load feeding module, please refresh the page', 5000);
                    }
                }
            });
        } else {
            debug.error('Feed friend button not found');
        }
        
        // Preload ModalDialog component
        if (!window.ModalDialog) {
            loadContractScript('../../scripts/other/modalDialog.js')
                .then(() => {
                    debug.log('ModalDialog module preloaded successfully');
                })
                .catch(error => {
                    debug.error('ModalDialog module preload failed:', error);
                });
        }
        
        // Preload FeedFriendDialog component
        if (!window.FeedFriendDialog) {
            loadContractScript('../../scripts/other/feedFriendDialog.js')
                .then(() => {
                    debug.log('FeedFriendDialog module preloaded successfully');
                })
                .catch(error => {
                    debug.error('FeedFriendDialog module preload failed:', error);
                });
        }
        
        debug.log('Batch action buttons initialized with dynamic loading support');
    }

    /**
     * Show NFT data structure for debugging
     */
    function showNFTDataStructure() {
        debug.log('NFT data structure example:');
        debug.log('This function shows the expected NFT data structure for debugging purposes');
        // This is just a placeholder function for debugging
        // The actual implementation would show sample NFT data structure
    }

    /**
     * Display toast message
     * @param {string} message - Toast message content
     * @param {number} duration - Display duration (milliseconds), default 3000ms
     */
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
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.5s ease;
            max-width: 300px;
            word-wrap: break-word;
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

    /**
     * Handle feed all pets button click
     */
    async function handleFeedAllPets() {
        // Check wallet connection status
        let userAddress = null;
        
        // Get current address from WalletNetworkManager
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            userAddress = window.walletNetworkManager.getCurrentAddress();
            debug.log('Using WalletNetworkManager address for batch feeding:', userAddress);
        }
        
        if (!userAddress) {
            if (window.ModalDialog) {
                await window.ModalDialog.alert('Please connect your wallet');
            } else {
                alert('Please connect your wallet');
            }
            return;
        }
        
        // Get user NFTs from multiple sources
        let currentUserNFTs = null;
        
        // Priority 1: Try to get from global userNFTs variable
        if (typeof userNFTs !== 'undefined' && userNFTs && userNFTs.length > 0) {
            currentUserNFTs = userNFTs;
            debug.log('Using global userNFTs variable for feeding:', currentUserNFTs.length, 'NFTs');
        }
        // Priority 2: Try to get from window.userNFTs
        else if (window.userNFTs && window.userNFTs.length > 0) {
            currentUserNFTs = window.userNFTs;
            debug.log('Using window.userNFTs for feeding:', currentUserNFTs.length, 'NFTs');
        }
        // Priority 3: Try to get from PetNFTService cache
        else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
            currentUserNFTs = window.PetNFTService.getCachedNFTs();
            debug.log('Using PetNFTService cached NFTs for feeding:', currentUserNFTs ? currentUserNFTs.length : 0, 'NFTs');
        }
        
        // Check if there are any NFTs
        if (!currentUserNFTs || currentUserNFTs.length === 0) {
            if (window.ModalDialog) {
                await window.ModalDialog.alert('You have no pets to feed. Please make sure your pets are loaded first.');
            } else {
                alert('You have no pets to feed. Please make sure your pets are loaded first.');
            }
            return;
        }
        
        // Load pet feeding module
        if (!window.PetFeeding) {
            try {
                await loadContractScript('../../scripts/functionPackages/PetFeeding.js');
                if (!window.PetFeeding) {
                    showToast("Failed to load pet feeding module", 5000);
                    return;
                }
            } catch (loadError) {
                debug.error('Failed to load pet feeding module:', loadError);
                showToast("Failed to load pet feeding module", 5000);
                return;
            }
        }
        
        // Load ModalDialog module (if not loaded yet)
        if (!window.ModalDialog) {
            try {
                await loadContractScript('../../scripts/other/modalDialog.js');
                if (!window.ModalDialog) {
                    debug.error('Failed to load ModalDialog module');
                    // If the modal dialog component cannot be loaded, fall back to using the original prompt
                    return handleFeedAllPetsLegacy();
                }
            } catch (error) {
                debug.error('Failed to load ModalDialog module:', error);
                // Fall back to the original method
                return handleFeedAllPetsLegacy();
            }
        }
        
        // Use ModalDialog to prompt the user to enter the feeding time
        try {
            const promptResult = await window.ModalDialog.prompt({
                title: 'Batch feed pets',
                content: 'Please specify the duration you want to feed each pet',
                inputLabel: 'Feeding time (hours)',
                inputType: 'number',
                inputValue: '24',
                placeholder: 'Enter a number between 1 and 1000',
                confirmText: 'Confirm feed',
                cancelText: 'Cancel',
                validator: (value) => {
                    const hours = parseInt(value);
                    if (isNaN(hours) || hours <= 0 || hours > 1000) {
                        return 'Please enter a valid feeding time (1-1000 hours)';
                    }
                    return null; // Return null to indicate validation passed
                }
            });
            
            // The user cancelled the operation
            if (promptResult.action === 'cancel' || promptResult.action === 'close' || 
                promptResult.action === 'backdrop' || promptResult.action === 'esc') {
                showToast('Feeding operation cancelled', 3000);
                return;
            }
            
            // Get the inputted feeding time
            const feedingHoursPerNFT = parseInt(promptResult.value);
            
            // Show processing message
            showToast(`Preparing batch feed (${feedingHoursPerNFT} hours/pet)...`, 5000);
            
            try {
                // Set the maximum feeding time limit options
                const options = {
                    maxFeedingHours: 168 // Default maximum feeding time is 7 days (168 hours)
                };
                
                // Use the PetFeeding.feedAllPets function to batch feed
                const feedingResult = await window.PetFeeding.feedAllPets(currentUserNFTs, feedingHoursPerNFT, options);
                
                if (!feedingResult.success) {
                    // Check if authorization is needed
                    if (feedingResult.needApproval) {
                        try {
                            // Execute authorization automatically without user confirmation
                            showToast('Authorizing PWFOOD token automatically...', 5000);
                            debug.log('Auto-authorizing PWFOOD token for batch feeding');
                                
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
                                debug.log('PWFOOD authorization successful, retrying batch feed');
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
                        if (typeof loadUserNFTs === 'function') {
                            loadUserNFTs(true);
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
        } catch (error) {
            debug.error('Batch feed process error:', error);
            showToast('Batch feed failed: ' + (error.message || 'Unknown error'), 5000);
            
            if (window.ModalDialog) {
                await window.ModalDialog.alert(
                    `<div style="color: #e53935;">
                        <strong>Feeding process error</strong><br><br>
                        ${error.message || 'Unknown error'}
                    </div>`,
                    {
                        title: 'Feeding failed'
                    }
                );
            } else {
                alert('Batch feed failed: ' + (error.message || 'Unknown error'));
            }
        }
    }
    
    /**
     * Legacy batch feed all pets method (as a fallback)
     */
    async function handleFeedAllPetsLegacy() {
        // Check wallet connection and get user address
        let userAddress = null;
        
        // Get current address from WalletNetworkManager
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            userAddress = window.walletNetworkManager.getCurrentAddress();
            debug.log('Using WalletNetworkManager address for legacy batch feeding:', userAddress);
        }
        
        if (!userAddress) {
            alert('Please connect your wallet first');
            return;
        }
        
        // Get user NFTs from multiple sources
        let currentUserNFTs = null;
        
        // Priority 1: Try to get from global userNFTs variable
        if (typeof userNFTs !== 'undefined' && userNFTs && userNFTs.length > 0) {
            currentUserNFTs = userNFTs;
            debug.log('Using global userNFTs variable for legacy feeding:', currentUserNFTs.length, 'NFTs');
        }
        // Priority 2: Try to get from window.userNFTs
        else if (window.userNFTs && window.userNFTs.length > 0) {
            currentUserNFTs = window.userNFTs;
            debug.log('Using window.userNFTs for legacy feeding:', currentUserNFTs.length, 'NFTs');
        }
        // Priority 3: Try to get from PetNFTService cache
        else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
            currentUserNFTs = window.PetNFTService.getCachedNFTs();
            debug.log('Using PetNFTService cached NFTs for legacy feeding:', currentUserNFTs ? currentUserNFTs.length : 0, 'NFTs');
        }
        
        // Check if there are any NFTs
        if (!currentUserNFTs || currentUserNFTs.length === 0) {
            alert('You have no pets to feed. Please make sure your pets are loaded first.');
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
            
            // Use the PetFeeding.feedAllPets function to batch feed
            const feedingResult = await window.PetFeeding.feedAllPets(currentUserNFTs, feedingHoursPerNFT, options);
            
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
                    alert(`PWFOOD balance is insufficient!\n\nRequired: ${feedingResult.requiredAmount} PWFOOD\nCurrent balance: ${feedingResult.balance} PWFOOD`);
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
                alert(`Successfully fed!\n\n✅ Successfully fed: ${feedingResult.successCount} pets\n${feedingResult.failCount > 0 ? `❌ Failed: ${feedingResult.failCount} pets\n` : ''}${feedingResult.skippedCount > 0 ? `⚠️ Skipped: ${feedingResult.skippedCount} pets (exceeds limit)\n` : ''}⏱️ Each pet feeding time: ${feedingHoursPerNFT} hours\n💰 Consumed PWFOOD: ${feedingResult.totalFood}`);
                
                // Refresh NFT display
                setTimeout(() => {
                    if (typeof loadUserNFTs === 'function') {
                        loadUserNFTs(true);
                    }
                }, 1000);
            } else if (feedingResult.failCount > 0) {
                showToast(`All feeding attempts failed, please check the PWFOOD balance or network status`, 5000);
                alert(`Feeding failed!\n\nAll ${feedingResult.failCount} pets' feeding attempts failed.\nPlease check your PWFOOD balance or network status and try again.`);
            }
        } catch (error) {
            debug.error('Legacy batch feed process error:', error);
            showToast('Batch feed failed: ' + (error.message || 'Unknown error'), 5000);
            alert('Batch feed failed: ' + (error.message || 'Unknown error'));
        }
    }
    
    // Helper function to load contract scripts
    function loadContractScript(scriptPath) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) {
                resolve();
            return;
        }
        
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${scriptPath}`));
            
            document.head.appendChild(script);
        });
    }

    // Make handleWalletBtnClick globally accessible for the no-wallet message button
    window.handleWalletBtnClick = handleWalletBtnClick;
}); 