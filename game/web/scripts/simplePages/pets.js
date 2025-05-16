const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Debug tool
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet page]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet page error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet page warning]', ...args);
        }
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
        
        // If "all" is selected, show all pet cards
        if (currentQualityFilter === 'all') {
            // Reset to original all data
            totalNFTCount = nfts.length;
            currentPage = 1; // Reset to first page
            
            debug.log(`Showing all pet cards, total: ${totalNFTCount}`);
            
            // Re-render the pets page
            renderPetsPage(1);
        } else {
            // Filter all pet data by quality
            const filteredNFTs = nfts.filter(nft => {
                // Get quality info from NFT metadata
                let quality = 'COMMON'; // Default quality
                if (nft.metadata && nft.metadata.attributes) {
                    const qualityAttr = nft.metadata.attributes.find(attr => 
                        attr.trait_type === 'Quality' || 
                        attr.trait_type === 'Rarity' || 
                        attr.trait_type === 'quality' || 
                        attr.trait_type === 'rarity'
                    );
                    if (qualityAttr) {
                        quality = String(qualityAttr.value).toUpperCase();
                    }
                }
                
                // Use enhanced quality matching logic
                return matchesQuality(quality, currentQualityFilter);
            });
            
            debug.log(`Filtered ${filteredNFTs.length} pet cards of ${getQualityName(currentQualityFilter)} quality`);
            
            // When there are no pet cards matching the quality, show a message
            if (filteredNFTs.length === 0) {
                petGrid.innerHTML = '';
                const message = document.createElement('div');
                message.className = 'no-pets-message';
                message.textContent = `No pet cards of ${getQualityName(currentQualityFilter)} quality`;
                petGrid.appendChild(message);
                
                // Hide pagination control
                const paginationContainer = document.querySelector('.pagination-container');
                if (paginationContainer) {
                    paginationContainer.style.display = 'none';
                }
                return;
            }
            
            // Save filtered NFTs as a separate variable
            window.filteredNFTsByQuality = [...filteredNFTs];
            
            // Update total count and current page
            totalNFTCount = filteredNFTs.length;
            currentPage = 1; // Reset to first page
            
            debug.log(`After quality filtering, total: ${totalNFTCount}, pages: ${Math.ceil(totalNFTCount / itemsPerPage)}`);
            
            // Render filtered NFTs
            renderFilteredNFTs(currentPage);
        }
    }

    /**
     * Render filtered NFTs
     * @param {number} page - Page number
     */
    async function renderFilteredNFTs(page) {
        // Check if the filtered NFT array exists
        if (!window.filteredNFTsByQuality || window.filteredNFTsByQuality.length === 0) {
            debug.error('Filtered NFT array does not exist or is empty');
            return;
        }
        
        // Update current page number
        currentPage = page;
        
        // Calculate start and end indices
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalNFTCount);
        
        debug.log(`Showing filtered NFTs page ${page}, ${endIndex - startIndex} pet cards, range: ${startIndex+1}-${endIndex}`);
        
        // Get current page's NFTs - create a deep copy to avoid modifying original data
        const currentPageNFTs = window.filteredNFTsByQuality.slice(startIndex, endIndex).map(nft => {
            return JSON.parse(JSON.stringify(nft));
        });
        
        // Clear existing pet cards
        petGrid.innerHTML = '';
        
        // Create a wrapper container to save count information
        const infoContainer = document.createElement('div');
        infoContainer.className = 'nft-info-container';
        infoContainer.style.gridColumn = '1 / -1'; // Make it span all columns
        
        // If exists, keep NFT count information
        const countInfo = document.createElement('div');
        countInfo.className = 'nft-count-info';
        countInfo.textContent = `Found ${totalNFTCount} ${getQualityName(currentQualityFilter)} NFTs (showing ${startIndex + 1} - ${endIndex})`;
        
        // Add count information to container
        infoContainer.appendChild(countInfo);
        
        // Add container to pet grid
        petGrid.appendChild(infoContainer);
        
        // Use Set to record added tokenIds, avoid duplicate additions
        const addedTokenIds = new Set();
        
        // Show current page's pet cards
        for (const nft of currentPageNFTs) {
            try {
                const tokenId = nft.tokenId || nft.token_id;
                
                // Skip added tokenIds
                if (addedTokenIds.has(tokenId)) {
                    debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already added in this render`);
                    continue;
                }
                
                // Check if a card with the same tokenId already exists, avoid duplicate creation
                const existingCard = petGrid.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                if (existingCard) {
                    debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already exists in DOM`);
                    continue;
                }
                
                // Use PetCard.appendCardToContainer to create and add card
                await PetCard.appendCardToContainer(nft, petGrid);
                
                // Record added tokenId
                addedTokenIds.add(tokenId);
            } catch (error) {
                const tokenId = nft.tokenId || nft.token_id || 'Unknown';   
                debug.error(`Failed to create pet card, TokenID: ${tokenId}:`, error);
                // Create an error提示卡片
                const errorCard = document.createElement('div');
                errorCard.className = 'pet-card error';
                errorCard.innerHTML = `<div class="error-message">Failed to load card (ID: ${tokenId})</div>`;
                petGrid.appendChild(errorCard);
            }
        }
        
        // Initialize pet card interactions
        initPetCardInteractions();
        
        // Create or update pagination control
        createPagination(page, Math.ceil(totalNFTCount / itemsPerPage));
    }
    
    /**
     * Check if NFT quality matches specified filter condition
     * @param {string} nftQuality - NFT quality value
     * @param {string} filterQuality - Filter condition
     * @returns {boolean} Whether it matches
     */
    function matchesQuality(nftQuality, filterQuality) {
        // Normalize quality value (convert to uppercase)
        const normalizedNftQuality = String(nftQuality).toUpperCase();
        const normalizedFilterQuality = String(filterQuality).toUpperCase();
        
        // Exact match
        if (normalizedNftQuality === normalizedFilterQuality) {
            return true;
        }
        
        // Match aliases
        if (normalizedFilterQuality === 'LEGENDARY' && 
            (normalizedNftQuality === 'LEGEND' || normalizedNftQuality === 'EPIC')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && 
            (normalizedNftQuality === 'PURPLE' || normalizedNftQuality === 'PURPLE-RARE')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'GOOD' && 
            normalizedNftQuality === 'UNCOMMON') {
            return true;
        }
        
        if (normalizedFilterQuality === 'COMMON' && 
            normalizedNftQuality === 'NORMAL') {
            return true;
        }
        
        if (normalizedFilterQuality === 'LEGENDARY' && 
            normalizedNftQuality.includes('LEGEND')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && 
            normalizedNftQuality.includes('RARE')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'EXCELLENT' && 
            normalizedNftQuality.includes('EXCEL')) {
            return true;
        }
        
        // Number quality matching (if quality is represented by a number)
        if (normalizedFilterQuality === 'LEGENDARY' && 
            (normalizedNftQuality === '4' || normalizedNftQuality === '5')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && normalizedNftQuality === '3') {
            return true;
        }
        
        if (normalizedFilterQuality === 'EXCELLENT' && normalizedNftQuality === '2') {
            return true;
        }
        
        if (normalizedFilterQuality === 'GOOD' && normalizedNftQuality === '1') {
            return true;
        }
        
        if (normalizedFilterQuality === 'COMMON' && normalizedNftQuality === '0') {
            return true;
        }
        
        return false;
    }
    
    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const petGrid = document.querySelector('.pet-grid');
    const adoptNewBtn = document.querySelector('.section-btn');
    
    // Web3 related variables
    let web3 = null;
    
    // Wallet connection status
    let isWalletConnected = false;
    // Current connected wallet address
    let currentAddress = null;
    
    // Global variables
    let hasLoadedNFT = false;
    let currentPage = 1; // Current page number
    const itemsPerPage = 6; // Number of pets per page
    let isLoadingMore = false; // Prevent duplicate loading
    let hasReachedEnd = false; // Whether all data has been loaded
    let isLoadingInBackground = false; // Mark background loading state
    let totalNFTCount = 0; // NFT total count
    let userNFTs = []; // Store user's NFT data for batch operations
    
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
    
    // Add a variable to record the last refresh time
    let lastRefreshTime = Date.now();
    
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
            
            // Note: At this point, the DOM elements may not be fully initialized, and the actual filtering will be done after loading NFTs
        }
        
        // Ensure global variable configuration
        window.currentNetwork = window.currentNetwork || 'TEST';
        
        // Check if Web3 library is loaded
        if (typeof Web3 === 'undefined') {
            debug.log('Web3 library not loaded, try to load dynamically...');
            loadWeb3Library().then(() => {
                debug.log('Web3 library loaded, continue initialization...');
                initializeWeb3AndContracts();
            }).catch(error => {
                debug.error('Failed to load Web3 library:', error);
            });
        } else {
            debug.log('Web3 library loaded, continue initialization...');
            initializeWeb3AndContracts();
        }
        
        // Bind events
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind adoption button click event
        if (adoptNewBtn) {
            adoptNewBtn.addEventListener('click', () => {
                // Redirect to shop page
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
        showNFTDataStructure();
        
        // Bind refresh button click event
        const refreshBtn = document.querySelector('.nft-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Check the time since the last refresh
                const now = Date.now();
                const refreshInterval = 1 * 60 * 1000; // 1 minute
                const timeElapsed = now - lastRefreshTime;
                
                if (timeElapsed < refreshInterval) {
                    // Calculate remaining waiting time (minutes)
                    const remainingMinutes = Math.ceil((refreshInterval - timeElapsed) / 60000);
                    
                    debug.log(`Only ${Math.floor(timeElapsed/1000)} seconds since last refresh, below the limit of ${refreshInterval/1000} seconds`);
                    
                    // Ask user if they still want to refresh
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
            debug.error('Refresh button not found');
        }
        
        // Bind pet card interactions
        initPetCardInteractions();
        
        // Load contract address and ABI
        loadContractAddressScript();
        
        // Ensure wallet connection status is displayed correctly
        checkWalletStatus();
        
        // Reload NFT (if wallet is connected)
        if (currentAddress && window.PetNFTService) {
            loadSpecificNFT(currentAddress);
        }
    }
    
    /**
     * Initialize Web3 and contracts
     */
    function initializeWeb3AndContracts() {
        // Initialize Web3
        if (window.ethereum) {
            try {
                web3 = new Web3(window.ethereum);
                window.web3 = web3; // Save to global variable
                debug.log('Successfully initialized Web3 using window.ethereum');
            } catch (error) {
                debug.error('Failed to initialize Web3:', error);
            }
        } else {
            debug.log('No compatible Web3 provider detected (MetaMask, etc.)');
        }
        
        // Check and load contract address configuration
        if (!window.contractAddresses) {
            debug.error('Contract address configuration does not exist, try to load from script');
            loadContractAddressScript();
        }
        
        // Load NFTFeedingManager contract class
        if (!window.NFTFeedingManagerContract) {
            debug.log('NFTFeedingManagerContract class does not exist, try to load');
            loadContractScript('../../scripts/contracts/NFTFeedingManager.js')
                .then(() => {
                    debug.log('Successfully loaded NFTFeedingManager.js');
                })
                .catch(error => {
                    debug.error('Failed to load NFTFeedingManager.js:', error);
                });
        }
        
        // Ensure necessary contract tools are available
        loadRequiredContractTools().then(() => {
            debug.log('All necessary contract tools loaded');
            // Check wallet status after loading
            checkWalletStatus();
        }).catch(error => {
            debug.error('Error loading contract tools:', error);
        });
    }
    
    /**
     * Load Web3 library
     * @returns {Promise} Promise of loading completion
     */
    function loadWeb3Library() {
        return new Promise((resolve, reject) => {
            debug.log('正在加载Web3库...');
            
            // Check if script is already loaded
            if (typeof Web3 !== 'undefined') {
                debug.log('Web3 library already exists, do not load again');
                return resolve();
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/web3@1.8.0/dist/web3.min.js';
            script.integrity = 'sha256-1OLulsOWL+rN3FxNxgJxmKsWJUePnVMrfHEqc3/+eo=';
            script.crossOrigin = 'anonymous';
            script.async = true;
            
            script.onload = function() {
                debug.log('Web3 library loaded successfully');
                resolve();
            };
            
            script.onerror = function(error) {
                debug.error('Failed to load Web3 library:', error);
                reject(new Error('Failed to load Web3 library'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Load necessary contract tools
     * @returns {Promise} Promise of successful loading
     */
    async function loadRequiredContractTools() {
        debug.log('Loading necessary contract tools...');
        
        try {
            // Load NFTFeedingManagerABI
            if (!window.NFTFeedingManagerABI) {
                debug.log('Loading NFTFeedingManagerABI...');
                try {
                    await loadContractScript('../../scripts/contracts/ABI/NFTFeedingManagerABI.js');
                    if (!window.NFTFeedingManagerABI) {
                        debug.error('NFTFeedingManagerABI loaded successfully but global variable not defined');
                        // Try to load from other location
                        try {
                            await loadContractScript('../../scripts/contracts/ABI/index.js');
                        } catch (indexError) {
                            debug.error('Failed to load index.js:', indexError);
                        }
                    }
                } catch (abiError) {
                    debug.error('Failed to load NFTFeedingManagerABI:', abiError);
                    throw new Error('Failed to load NFTFeedingManagerABI');
                }
                
                debug.log('NFTFeedingManagerABI loaded successfully, availability:', !!window.NFTFeedingManagerABI);
                if (window.NFTFeedingManagerABI) {
                    debug.log('NFTFeedingManagerABI length:', window.NFTFeedingManagerABI.length);
                }
            }
            
            // Load contract address
            if (!window.contractAddresses) {
                debug.log('Loading contract address configuration...');
                try {
                    await loadContractScript('../../scripts/contracts/contractAddresses.js');
                } catch (addressError) {
                    debug.error('Failed to load contract address configuration:', addressError);
                    throw new Error('Failed to load contract address configuration');
                }
                
                debug.log('Contract address configuration loading status:', !!window.contractAddresses);
                if (window.contractAddresses) {
                    const network = window.currentNetwork || 'TEST';
                    debug.log(`Current network: ${network}, contract address count:`, 
                             window.contractAddresses[network] ? 
                             Object.keys(window.contractAddresses[network]).length : 0);
                }
            }
            
            // Add getContractAddress function
            if (!window.getContractAddress) {
                debug.log('Creating getContractAddress function...');
                window.getContractAddress = function(contractName) {
                    const network = window.currentNetwork || 'MAIN';
                    if (window.contractAddresses && window.contractAddresses[network] && window.contractAddresses[network][contractName]) {
                        return window.contractAddresses[network][contractName];
                    }
                    return null;
                };
                debug.log('getContractAddress function created');
            }
            
            // Load NFTFeedingManager contract class
            if (!window.NFTFeedingManagerContract) {
                debug.log('Loading NFTFeedingManager contract class...');
                try {
                    await loadContractScript('../../scripts/contracts/NFTFeedingManager.js');
                } catch (classError) {
                    debug.error('Failed to load NFTFeedingManager.js:', classError);
                    // We will continue, because the NFTFeedingManagerContract class is optional
                    debug.warn('Failed to load NFTFeedingManager.js, some features may be unavailable');
                }
                
                debug.log('NFTFeedingManagerContract class loading status:', !!window.NFTFeedingManagerContract);
            }
            
            // Initialize NFTFeedingManager contract directly
            if (window.NFTFeedingManagerABI && window.web3 && window.contractAddresses) {
                debug.log('Attempting to initialize NFTFeedingManager contract directly...');
                const network = window.currentNetwork || 'MAIN';
                const nftFeedingManagerAddress = window.contractAddresses[network].NFTFeedingManager;
                
                if (nftFeedingManagerAddress) {
                    try {
                        // Create contract instance
                        window.nftFeedingManagerContract = new window.web3.eth.Contract(
                            window.NFTFeedingManagerABI, 
                            nftFeedingManagerAddress
                        );
                        debug.log('Successfully initialized NFTFeedingManager contract:', !!window.nftFeedingManagerContract);
                        
                        // Create an initialization function, for use in other places
                        window.initNFTFeedingManagerContract = function(web3, getAddressFunc) {
                            const addressFunc = getAddressFunc || window.getContractAddress;
                            const address = addressFunc('NFTFeedingManager');
                            return new web3.eth.Contract(window.NFTFeedingManagerABI, address);
                        };
                        
                        // Add getNFTFeedingInfo function
                        window.getNFTFeedingInfo = async function(tokenId) {
                            try {
                                if (!window.nftFeedingManagerContract) {
                                    return null;
                                }
                                return await window.nftFeedingManagerContract.methods.nftFeeding(tokenId).call();
                            } catch (error) {
                                console.error('Failed to get NFT feeding information:', error);
                                return null;
                            }
                        };
                        
                        debug.log('Successfully created initNFTFeedingManagerContract and getNFTFeedingInfo functions');
                    } catch (initError) {
                        debug.error('Failed to initialize NFTFeedingManager contract:', initError);
                    }
                } else {
                    debug.error('Failed to get NFTFeedingManager contract address');
                }
            }
            
            // If the above methods fail, try to load initNFTFeedingManager
            if (!window.initNFTFeedingManagerContract || !window.getNFTFeedingInfo) {
                debug.log('Attempting to load initNFTFeedingManager.js...');
                try {
                    await loadContractScript('../../scripts/init_contracts/initNFTFeedingManager.js');
                    debug.log('initNFTFeedingManager.js loading status:', !!window.initNFTFeedingManagerContract);
                } catch (managerError) {
                    debug.error('Failed to load initNFTFeedingManager.js:', managerError);
                    // Since we have already manually created the necessary functions, we do not throw an error here
                    debug.warn('Failed to load initNFTFeedingManager.js, but will not prevent continuing');
                }
            }
            
            // Create an instance of the NFTFeedingManagerContract class (if it exists)
            if (window.NFTFeedingManagerContract && !window.feedingManagerContract && window.web3) {
                try {
                    window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                    debug.log('Successfully created NFTFeedingManagerContract instance:', !!window.feedingManagerContract);
                } catch (instanceError) {
                    debug.error('Failed to create NFTFeedingManagerContract instance:', instanceError);
                }
            }
            
            // Check if all necessary functions are available
            const requiredFunctions = [
                'getContractAddress'
            ];
            
            // These functions are optional
            const optionalFunctions = [
                'initNFTFeedingManagerContract',
                'getNFTFeedingInfo'
            ];
            
            const missingRequired = requiredFunctions.filter(func => typeof window[func] !== 'function');
            if (missingRequired.length > 0) {
                throw new Error(`Missing necessary contract functions: ${missingRequired.join(', ')}`);
            }
            
            const missingOptional = optionalFunctions.filter(func => typeof window[func] !== 'function');
            if (missingOptional.length > 0) {
                debug.warn(`The following optional functions are not defined: ${missingOptional.join(', ')}, some features may be unavailable`);
            }
            
            debug.log('All necessary contract tools functions loaded and verified');
            return true;
        } catch (error) {
            debug.error('Error loading contract tools:', error);
            throw error;
        }
    }

    /**
     * Load contract script asynchronously
     * @param {string} scriptPath - Script path
     * @returns {Promise} Promise of loading completion
     */
    function loadContractScript(scriptPath) {
        return new Promise((resolve, reject) => {
            debug.log(`Loading script: ${scriptPath}`);
            
            // Check if the script is already loaded
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) {
                debug.log(`Script ${scriptPath} already exists, do not load again`);
                return resolve();
            }
            
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = function() {
                debug.log(`Script ${scriptPath} loaded successfully`);
                resolve();
            };
            
            script.onerror = function(error) {
                debug.error(`Failed to load script ${scriptPath}:`, error);
                reject(new Error(`Failed to load script ${scriptPath}`));
            };
            
            document.head.appendChild(script);
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
     * Initialize contract connection
     * @returns {Promise<boolean>} Whether initialization is successful
     */
    async function initContracts() {
        try {
            
            if (!window.web3) {
                console.error('Web3 is not initialized, cannot initialize contracts');
                return false;
            }
            
            const web3 = window.web3;
            
            // Use getContractAddress function to get contract address
            const getAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'MAIN';
                return window.contractAddresses && window.contractAddresses[network] ? 
                    window.contractAddresses[network][name] : null;
            };
            
            // Initialize PwNFT contract
            window.pwNFTContract = window.initPwNFTContract(web3, getAddressFunc);
            console.log('PwNFT contract initialization result:', !!window.pwNFTContract);
            
            // Initialize NFTManager contract
            window.nftManagerContract = window.initNFTManagerContract(web3, getAddressFunc);
            console.log('NFTManager contract initialization result:', !!window.nftManagerContract);
            
            // Initialize NFTFeedingManager contract
            if (window.initNFTFeedingManagerContract) {
                window.nftFeedingManagerContract = window.initNFTFeedingManagerContract(web3, getAddressFunc);
                console.log('NFTFeedingManager contract initialization result:', !!window.nftFeedingManagerContract);
                
                // Initialize NFTFeedingManagerContract class instance
                if (window.NFTFeedingManagerContract) {
                    window.feedingManagerContract = new window.NFTFeedingManagerContract(web3);
                    console.log('NFTFeedingManagerContract class initialization result:', !!window.feedingManagerContract);
                }
            }
            
            console.log('All contracts initialized');
            return true;
        } catch (error) {
            console.error('Error initializing contracts:', error);
            return false;
        }
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
                // Call feeding handling function
                handlePetFeeding(data);
            },
            onClaim: function(data) {
                console.log('Handle pet reward claim:', data);
                // Call reward claim handling function
                handlePetRewardClaim(data);
            }
        });
    }
    
    /**
     * Handle wallet button click event
     */
    function handleWalletBtnClick() {
        if (isWalletConnected) {
            // If connected, disconnect
            disconnectWallet();
        } else {
            // If not connected, show wallet connection modal
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
                // Wallet connection successful
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                // Wallet modal closed
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Wallet disconnected
                handleWalletDisconnected();
                break;
                
            case 'web3Ready':
                // Get Web3 instance
                debug.log('Received Web3 instance');
                if (message.data && message.data.web3) {
                    web3 = message.data.web3;
                    debug.log('Received Web3 instance');
                    
                    // If wallet is connected, initialize contracts
                    if (isWalletConnected && currentAddress) {
                        initContracts().then(success => {
                            if (success) {
                                debug.log('Contracts initialized successfully, load user NFTs');
                                loadUserNFTs(currentAddress);
                            } else {
                                debug.error('Contracts initialization failed');
                            }
                        });
                    }
                } else if (window.ethereum) {
                    try {
                        web3 = new Web3(window.ethereum);
                        debug.log('Created Web3 instance using window.ethereum');
                        
                        // If wallet is connected, initialize contracts
                        if (isWalletConnected && currentAddress) {
                            initContracts().then(success => {
                                if (success) {
                                    debug.log('Contracts initialized successfully, load user NFTs');
                                    loadUserNFTs(currentAddress);
                                } else {
                                    debug.error('Contracts initialization failed');
                                }
                            });
                        }
                    } catch (error) {
                        debug.error('Failed to create Web3 instance:', error);
                    }
                } else {
                    debug.error('Failed to create Web3 instance, neither message.data.web3 nor window.ethereum is available');
                }
                break;
        }
    }
    
    /**
     * Check wallet status
     */
    function checkWalletStatus() {
        debug.log('Checking wallet connection status...');
        
        // If NFT has already been loaded, avoid duplicate loading
        if (hasLoadedNFT) {
            debug.log('NFT data already loaded, skip automatic loading');
            return;
        }
        
        // First check sessionStorage (cross-page transfer)
        const sessionWalletConnected = sessionStorage.getItem('walletConnected');
        const sessionWalletAddress = sessionStorage.getItem('walletAddress');
        
        if (sessionWalletConnected === 'true' && sessionWalletAddress) {
            debug.log('Found wallet connection information in sessionStorage:', sessionWalletAddress);
            
            // Ensure address format is valid string
            if (typeof sessionWalletAddress === 'string' && sessionWalletAddress.startsWith('0x')) {
            // Restore connection status from sessionStorage
            isWalletConnected = true;
            currentAddress = sessionWalletAddress;
            
            // Update UI
            updateWalletUI(true, currentAddress);
            
            // Automatically load user NFTs
            loadUserNFTs(currentAddress);
            
            return;
            } else {
                debug.error('Invalid address format from sessionStorage:', sessionWalletAddress);
                // Clear invalid storage data
                sessionStorage.removeItem('walletConnected');
                sessionStorage.removeItem('walletAddress');
            }
        }
        
        // If sessionStorage does not have, check localStorage
        const storedWalletConnected = localStorage.getItem('walletConnected');
        const storedWalletAddress = localStorage.getItem('walletAddress');
        
        if (storedWalletConnected === 'true' && storedWalletAddress) {
            debug.log('Found wallet connection information in localStorage:', storedWalletAddress);
            
            // Ensure address format is valid string
            if (typeof storedWalletAddress === 'string' && storedWalletAddress.startsWith('0x')) {
            // Restore connection status from localStorage
            isWalletConnected = true;
            currentAddress = storedWalletAddress;
            
            // Update UI
            updateWalletUI(true, currentAddress);
            
            // Automatically load user NFTs
            loadUserNFTs(currentAddress);
            
            // Sync to sessionStorage
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', currentAddress);
            sessionStorage.setItem('walletType', localStorage.getItem('walletType') || 'metamask');
            
            return;
            } else {
                debug.error('Invalid address format from localStorage:', storedWalletAddress);
                // Clear invalid storage data
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
            }
        }
        
        // If there is no connected wallet, load specific NFT directly
        debug.log('No connected wallet found, load specific NFT directly');
        loadSpecificNFT(null);
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
            // If object format, try to get address property
            address = data.address || '';
            debug.log('Extract address from object:', address);
        } else {
            debug.error('Invalid wallet connection data:', data);
            return;
        }
        
        // Ensure address is valid string
        if (!address || typeof address !== 'string') {
            debug.error('Invalid wallet address:', address);
            return;
        }
        
        const previousAddress = currentAddress;
        const addressChanged = previousAddress && previousAddress !== address;
        
        if (addressChanged) {
            debug.log(`Wallet address has changed: ${previousAddress} -> ${address}`);
            // Clear cache for old address
            if (window.PetNFTService && typeof window.PetNFTService.clearNFTCache === 'function') {
                window.PetNFTService.clearNFTCache({ 
                    userAddress: previousAddress 
                });
                // Clear global cache for specific NFT
                window.PetNFTService.clearNFTCache({ 
                    contractAddress: window.PetNFTService.getPetNftAddress() 
                });
            }
        }
        
        // Update current address
        currentAddress = address;
        
        // Update UI
        showWalletAddress(address);
        toggleConnectButton(true);
        toggleDisconnectButton(true);
        
        // Reset loading state
        resetLoadingState();
        
        // Load user NFTs, force update when address changes
        loadUserNFTs(addressChanged);
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send disconnect message to wallet iframe
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        
        // Handle disconnect directly
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleWalletDisconnected() {
        debug.log('Wallet disconnected');
        
        // Set connection status
        isWalletConnected = false;
        currentAddress = null;
        
        // Update UI
        updateWalletUI(false);
        
        // Clear local storage
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        debug.log('Wallet disconnected');
        
        // Load specific NFT
        loadSpecificNFT(null);
    }
    
    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        if (connected) {
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
        // Update all texts on the page
        updateUITexts();
    }
    
    /**
     * Update UI texts
     */
    function updateUITexts() {
        // Only execute if i18n is available
        if (!i18n) return;
        
        // Update page title
        document.title = i18n.t('navigation.pets') + ' - ' + i18n.t('game.title');
        
        // Update button text
        if (walletBtn) {
            walletBtn.textContent = isWalletConnected ? 
                i18n.t('wallet.disconnect') : 
                i18n.t('wallet.connect');
        }
        
        // Update wallet address text
        if (walletAddressSpan && !isWalletConnected) {
            walletAddressSpan.textContent = i18n.t('wallet.noWallet');
        }
        
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
        
        // Ensure wallet connection status is displayed correctly
        checkWalletStatus();
        
        // Reload NFT (if wallet is connected)
        if (currentAddress && window.PetNFTService) {
            loadSpecificNFT(currentAddress);
        }
    }
    
    /**
     * Get NFT quality name
     * @param {number} qualityId - Quality ID
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
     * Load user NFT assets
     * @param {boolean} forceUpdate - Whether to force re-fetch data from blockchain
     */
    function loadUserNFTs(forceUpdate = false) {
        if (!window.PetNFTService || !currentAddress) {
            debug.log('Cannot load user NFT: service not initialized or wallet not connected');
            return;
        }
        
        debug.log('Load user NFT, force update:', forceUpdate);
        
        // Call loadSpecificNFT function, passing forceUpdate parameter
        loadSpecificNFT(currentAddress, forceUpdate);
    }

   

    /**
     * Scroll to page top
     */
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }


    // Add scroll loading and pagination styles
    document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent += `
            .loading-more-indicator,
            .background-loading-indicator {
                grid-column: 1 / -1;
                text-align: center;
                padding: 15px;
                color: #666;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-radius: 50%;
                border-top-color: #3498db;
                animation: spin 1s linear infinite;
                margin-right: 10px;
            }
            
            .pagination-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                margin-bottom: 20px;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .pagination-btn {
                padding: 8px 14px;
                border: 1px solid #ddd;
                background-color: #f8f8f8;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
            }
            
            .pagination-btn:hover:not([disabled]) {
                background-color: #e0e0e0;
                border-color: #ccc;
            }
            
            .pagination-btn[disabled],
            .pagination-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }
            
            .page-info {
                font-size: 14px;
                color: #555;
            }
            
            .page-input {
                width: 50px;
                height: 36px;
                text-align: center;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 0 5px;
            }
            
            .jump-btn {
                padding: 8px 12px;
            }
            
            .nft-info-container {
                margin-bottom: 15px;
                width: 100%;
            }
            
            .nft-count-info {
                background-color: #f8f8f8;
                padding: 10px;
                border-radius: 6px;
                font-size: 14px;
                color: #555;
                margin-bottom: 10px;
                width: 100%;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @media (max-width: 768px) {
                .pagination-container {
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    });
    
 
    
    /**
     * Render pet data for specified page
     * @param {number} page - Page number
     */
    async function renderPetsPage(page) {
        debug.log(`Render pet data for page ${page}`);
        
        // Update current page number
        currentPage = page;
        
        // Get all NFTs from PetNFTService
        let nfts = window.PetNFTService.getCachedNFTs();
        
        // Remove duplicates: process NFTs by tokenId
        const nftMap = new Map();
        for (const nft of nfts) {
            // Only keep the first instance of each tokenId
            if (!nftMap.has(nft.tokenId)) {
                nftMap.set(nft.tokenId, nft);
            } else {
                debug.warn(`Duplicate NFT found, tokenId: ${nft.tokenId}, ignoring duplicate`);
            }
        }
        
        // Convert Map back to array
        nfts = Array.from(nftMap.values());
        totalNFTCount = nfts.length;
        
        // Update global userNFTs variable
        userNFTs = nfts;
        
        debug.log(`Total ${nfts.length} NFTs (after removing duplicates)`);
        
        if (totalNFTCount === 0) {
            debug.log('No NFT data found');
            showNoNFTsMessage();
            return;
        }
        
        // Check if there is a saved quality filter in localStorage
        const savedQualityFilter = localStorage.getItem('petQualityFilter');
        if (savedQualityFilter && savedQualityFilter !== 'all' && savedQualityFilter !== currentQualityFilter) {
            debug.log(`Found saved quality filter: ${savedQualityFilter}, applying it`);
            
            // Update current quality filter
            currentQualityFilter = savedQualityFilter;
            
            // Update UI to show selected quality tab
            document.querySelectorAll('.quality-tab').forEach(tab => {
                tab.classList.remove('active');
                
                // Reset all tab styles
                tab.style.backgroundColor = '#f0f0f0';
                tab.style.color = 'inherit';
                tab.style.borderColor = '#ddd';
                
                // If it is the saved quality tab, set it to active
                if (tab.getAttribute('data-quality') === currentQualityFilter) {
                    tab.classList.add('active');
                    
                    // Set styles based on quality
                    if (currentQualityFilter === 'LEGENDARY') {
                        tab.style.backgroundColor = '#ff9800';
                        tab.style.borderColor = '#f57c00';
                    } else if (currentQualityFilter === 'RARE') {
                        tab.style.backgroundColor = '#673ab7';
                        tab.style.borderColor = '#512da8';
                    } else if (currentQualityFilter === 'EXCELLENT') {
                        tab.style.backgroundColor = '#2196f3';
                        tab.style.borderColor = '#1976d2';
                    } else if (currentQualityFilter === 'GOOD') {
                        tab.style.backgroundColor = '#4caf50';
                        tab.style.borderColor = '#388e3c';
                    } else if (currentQualityFilter === 'COMMON') {
                        tab.style.backgroundColor = '#9e9e9e';
                        tab.style.borderColor = '#757575';
                    }
                    tab.style.color = 'white';
                }
            });
            
            // Apply filter condition
            filterPetsByQuality();
            return;
        }
        
        // Calculate start and end indices
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalNFTCount);
        
        debug.log(`Displaying NFTs ${startIndex + 1} to ${endIndex}, page: ${page}, total pages: ${Math.ceil(totalNFTCount / itemsPerPage)}`);
        
        // Get current page NFTs - create deep copy to avoid modifying original data
        const currentPageNFTs = nfts.slice(startIndex, endIndex).map(nft => {
            // Create deep copy to ensure original object is not modified
            const nftCopy = JSON.parse(JSON.stringify(nft));
            
            // Ensure original image URL is preserved
            if (nftCopy.originalImageUrl) {
                debug.log(`Using nft.originalImageUrl: ${nftCopy.originalImageUrl} instead of ${nftCopy.metadata.image}`);
                nftCopy.metadata.image = nftCopy.originalImageUrl;
            } else if (nftCopy.metadata && nftCopy.metadata.originalImageUrl) {
                debug.log(`Using nft.metadata.originalImageUrl: ${nftCopy.metadata.originalImageUrl} instead of ${nftCopy.metadata.image}`);
                nftCopy.metadata.image = nftCopy.metadata.originalImageUrl;
            }
            
            return nftCopy;
        });
        
        // Clear existing pet cards
        petGrid.innerHTML = '';
        
        // Create a wrapper container to save count information, avoiding it being treated as a pet card
        const infoContainer = document.createElement('div');
        infoContainer.className = 'nft-info-container';
        infoContainer.style.gridColumn = '1 / -1'; // Make it span all columns
        
        // If it exists, keep NFT count information
        const countInfo = document.createElement('div');
        countInfo.className = 'nft-count-info';
        countInfo.textContent = `Found ${totalNFTCount} NFTs (displaying ${startIndex + 1} - ${endIndex})`;
        
        // Add count information to container
        infoContainer.appendChild(countInfo);
        
        // Add container to pet grid
        petGrid.appendChild(infoContainer);
        
        // Use Set to record added tokenIds, avoiding duplicate additions
        const addedTokenIds = new Set();
        
        // Display current page pets
        for (const nft of currentPageNFTs) {
            try {
                const tokenId = nft.tokenId || nft.token_id;
                
                // Skip already added tokenIds
                if (addedTokenIds.has(tokenId)) {
                    debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already added in this render`);
                    continue;
                }
                
                // Check if there is already a card with the same tokenId, avoiding duplicate creation
                const existingCard = petGrid.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                if (existingCard) {
                    debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already exists in DOM`);
                    continue;
                }
                
                // Use PetCard.appendCardToContainer to create and add card
                await PetCard.appendCardToContainer(nft, petGrid);
                
                // Record added tokenId
                addedTokenIds.add(tokenId);
            } catch (error) {
                const tokenId = nft.tokenId || nft.token_id || 'Unknown';
                debug.error(`Failed to create pet card, TokenID: ${tokenId}:`, error);
                // Create an error提示卡片
                const errorCard = document.createElement('div');
                errorCard.className = 'pet-card error';
                errorCard.innerHTML = `<div class="error-message">Failed to load card (ID: ${tokenId})</div>`;
                petGrid.appendChild(errorCard);
            }
        }
        
        // Initialize pet card interactions
        initPetCardInteractions();
        
        // Create or update pagination controls
        createPagination(page, Math.ceil(totalNFTCount / itemsPerPage));
        
        // Apply current quality filter after rendering
        if (currentQualityFilter !== 'all') {
            filterPetsByQuality();
        }
    }
    
    /**
     * Create pagination controls
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     */
    function createPagination(currentPage, totalPages) {
        // Remove existing pagination controls
        const existingPagination = document.querySelector('.pagination-container');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // Create pagination container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.style.gridColumn = '1 / -1';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.alignItems = 'center';
        paginationContainer.style.marginTop = '20px';
        paginationContainer.style.marginBottom = '10px';
        paginationContainer.style.gap = '8px';
        paginationContainer.style.flexWrap = 'wrap';
        
        // Create pagination controls
        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';
        paginationControls.style.display = 'flex';
        paginationControls.style.alignItems = 'center';
        paginationControls.style.gap = '8px';
        paginationContainer.appendChild(paginationControls);
        
        // First page button
        const firstPageBtn = document.createElement('button');
        firstPageBtn.textContent = 'First Page';
        firstPageBtn.className = 'pagination-btn first-btn' + (currentPage === 1 ? ' disabled' : '');
        firstPageBtn.disabled = currentPage === 1;
        firstPageBtn.addEventListener('click', () => {
            if (currentPage !== 1) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    renderFilteredNFTs(1);
                } else {
                    renderPetsPage(1);
                }
            }
        });
        paginationControls.appendChild(firstPageBtn);
        
        // Previous page button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous Page';
        prevBtn.className = 'pagination-btn prev-btn' + (currentPage === 1 ? ' disabled' : '');
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    renderFilteredNFTs(currentPage - 1);
                } else {
                    renderPetsPage(currentPage - 1);
                }
            }
        });
        paginationControls.appendChild(prevBtn);
        
        // Page number display
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `${currentPage}/${totalPages} page`;
        pageInfo.style.margin = '0 10px';
        paginationControls.appendChild(pageInfo);
        
        // Next page button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next Page';
        nextBtn.className = 'pagination-btn next-btn' + (currentPage === totalPages ? ' disabled' : '');
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    renderFilteredNFTs(currentPage + 1);
                } else {
                    renderPetsPage(currentPage + 1);
                }
            }
        });
        paginationControls.appendChild(nextBtn);
        
        // Last page button
        const lastPageBtn = document.createElement('button');
        lastPageBtn.textContent = 'Last Page';
        lastPageBtn.className = 'pagination-btn last-btn' + (currentPage === totalPages ? ' disabled' : '');
        lastPageBtn.disabled = currentPage === totalPages;
        lastPageBtn.addEventListener('click', () => {
            if (currentPage !== totalPages) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    renderFilteredNFTs(totalPages);
                } else {
                    renderPetsPage(totalPages);
                }
            }
        });
        paginationControls.appendChild(lastPageBtn);
        
        // Jump to specified page
        const pageJumpContainer = document.createElement('div');
        pageJumpContainer.style.display = 'flex';
        pageJumpContainer.style.alignItems = 'center';
        pageJumpContainer.style.marginLeft = '10px';
        
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.min = '1';
        pageInput.max = totalPages.toString();
        pageInput.value = currentPage.toString();
        pageInput.className = 'page-input';
        pageInput.style.width = '50px';
        pageInput.style.textAlign = 'center';
        pageInput.style.marginRight = '5px';
        
        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = 'Jump';
        jumpBtn.className = 'pagination-btn jump-btn';
        jumpBtn.addEventListener('click', () => {
            const pageNum = parseInt(pageInput.value);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    renderFilteredNFTs(pageNum);
                } else {
                    renderPetsPage(pageNum);
                }
            } else {
                pageInput.value = currentPage.toString();
            }
        });
        
        pageJumpContainer.appendChild(pageInput);
        pageJumpContainer.appendChild(jumpBtn);
        paginationControls.appendChild(pageJumpContainer);
        
        // Add to bottom of grid
        petGrid.appendChild(paginationContainer);
    }
    
    /**
     * Load PetNFTService script
     */
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
                if (success && currentAddress) {
                    loadSpecificNFT(currentAddress);
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

    /**
     * Load specific NFT
     * @param {string} address - Address
     * @param {boolean} forceUpdate - Whether to force update
     */
    async function loadSpecificNFT(address, forceUpdate = false) {
        debug.log('Load specific NFT, address:', address, 'force update:', forceUpdate);
        
        if (!window.PetNFTService) {
            debug.error('PetNFTService is undefined, cannot load specific NFT');
            showNoNFTsMessage();
            return;
        }
        
        // Clear existing pet cards
        petGrid.innerHTML = '';
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = i18n ? i18n.t('pets.loadingPets') : 'Loading specific NFT...';
        petGrid.appendChild(loadingIndicator);
        
        try {
            // Set a flag to prevent duplicate loading
            if (isLoadingInBackground) {
                debug.log('Duplicate loading operation in progress, skipping');
                return;
            }
            
            isLoadingInBackground = true;
            
            // Use PetNFTService's refreshNFTs function
            const result = await window.PetNFTService.refreshNFTs(address, {
                forceUpdate: forceUpdate,
                refreshInterval: 3600000, // 1 hour
                skipIntervalCheck: forceUpdate, // Skip interval check when force updating
                removeDuplicates: true // Add duplicate removal flag
            });
            
            // Mark loading completed
            isLoadingInBackground = false;
            
            // Clear loading indicator
            petGrid.innerHTML = '';
            
            if (!result.success) {
                debug.error('Failed to refresh NFT data:', result.error);
                petGrid.innerHTML = `<div class="error-message">${i18n ? i18n.t('pets.refreshFailed') : 'Failed to load specific NFT data'}</div>`;
                
                // Add retry button
                const retryButton = document.createElement('button');
                retryButton.textContent = i18n ? i18n.t('button.refresh') : 'Retry';
                retryButton.className = 'retry-btn';
                retryButton.addEventListener('click', () => loadSpecificNFT(address, true)); // Retry with force update
                petGrid.appendChild(retryButton);
                return;
            }
            
            let nfts = result.nfts || [];
            
            // Process NFT data deduplication - use a more reliable method
            const tokenIdSet = new Set(); // Used to check uniqueness
            const uniqueNfts = [];
            
            for (const nft of nfts) {
                const tokenId = nft.tokenId || nft.token_id;
                if (!tokenId) {
                    debug.warn(`NFT missing tokenId, skipping:`, nft);
                    continue;
                }
                
                // If tokenId is not in the set, add to the result array
                if (!tokenIdSet.has(tokenId)) {
                    tokenIdSet.add(tokenId);
                    uniqueNfts.push(nft);
                } else {
                    debug.warn(`Filtering out duplicate NFT: TokenID ${tokenId}`);
                }
            }
            
            nfts = uniqueNfts;
            
            if (nfts.length === 0) {
                debug.log('No specific NFT found');
                showNoNFTsMessage();
                return;
            }
            
            // Log deduplication results
            debug.log(`Original NFT count: ${result.nfts.length}, deduplicated count: ${nfts.length}`);
            
            // Save deduplicated NFTs to cache
            window.PetNFTService.updateCachedNFTs(nfts);
            
            // Update global userNFTs variable
            userNFTs = nfts;
            
            // Set global status
            totalNFTCount = nfts.length;
            hasLoadedNFT = true;
            hasReachedEnd = true; // Because we loaded all NFTs at once
            
            // Reset current page to the first page
            currentPage = 1;
            
            // Use pagination to render pets
            debug.log(`Found ${nfts.length} NFTs, using pagination to render`);
            
            // Check if we need to apply the saved quality filter
            if (currentQualityFilter !== 'all') {
                debug.log(`Using saved quality filter: ${currentQualityFilter}`);
                // Update quality filter label UI
                document.querySelectorAll('.quality-tab').forEach(tab => {
                    const qualityId = tab.getAttribute('data-quality');
                    if (qualityId === currentQualityFilter) {
                        // Remove active class from all tabs
                        document.querySelectorAll('.quality-tab').forEach(t => {
                            t.classList.remove('active');
                            t.style.backgroundColor = '#f0f0f0';
                            t.style.color = 'inherit';
                            t.style.borderColor = '#ddd';
                        });
                        
                        // Add active class to the current quality
                        tab.classList.add('active');
                        
                        // Apply corresponding styles
                        if (currentQualityFilter === 'LEGENDARY') {
                            tab.style.backgroundColor = '#ff9800';
                            tab.style.borderColor = '#f57c00';
                        } else if (currentQualityFilter === 'RARE') {
                            tab.style.backgroundColor = '#673ab7';
                            tab.style.borderColor = '#512da8';
                        } else if (currentQualityFilter === 'EXCELLENT') {
                            tab.style.backgroundColor = '#2196f3';
                            tab.style.borderColor = '#1976d2';
                        } else if (currentQualityFilter === 'GOOD') {
                            tab.style.backgroundColor = '#4caf50';
                            tab.style.borderColor = '#388e3c';
                        } else if (currentQualityFilter === 'COMMON') {
                            tab.style.backgroundColor = '#9e9e9e';
                            tab.style.borderColor = '#757575';
                        }
                        tab.style.color = 'white';
                    }
                });
                
                // Apply filter
                filterPetsByQuality();
            } else {
                renderPetsPage(currentPage);
            }
            
        } catch (error) {
            // Mark loading completed
            isLoadingInBackground = false;
            
            debug.error('Failed to load specific NFT:', error);
            petGrid.innerHTML = `<div class="error-message">${i18n ? i18n.t('pets.refreshFailed') : 'Failed to load specific NFT data'}</div>`;
            
            // Add retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = i18n ? i18n.t('button.refresh') : 'Retry';
            retryButton.className = 'retry-btn';
            retryButton.addEventListener('click', () => loadSpecificNFT(address, true)); // Retry with force update
            petGrid.appendChild(retryButton);
        }
    }

    /**
     * Print NFT detailed information to the console
     * @param {Array} nfts - NFT array
     */
    function printNFTsInfo(nfts) {
        // Use the implementation in PetNFTService
        window.PetNFTService.printNFTsInfo(nfts);
    }

    /**
     * Test if image URLs are valid
     * @param {Array} nfts - NFT array
     */
    async function testImageUrls(nfts) {
        // Use the implementation in PetNFTService
        return window.PetNFTService.testImageUrls(nfts);
    }

    /**
     * Analyze NFT image URLs
     * @param {Array} nfts - NFT array
     */
    function analyzeImageUrls(nfts) {
        // Use the implementation in PetNFTService
        return window.PetNFTService.analyzeImageUrls(nfts);
    }

    /**
     * Render pagination controls
     */
    function renderPaginationControls() {
        // This function is no longer needed, it will be deleted
    }

    // Reset pets page and reload data
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
        totalNFTCount = 0;
        
        // Clear pet grid content and show loading indicator
        petGrid.innerHTML = `<div class="loading-indicator">${i18n ? i18n.t('pets.loadingPets') : 'Refreshing pets data...'}</div>`;
        
        // Clear all timers that may be running
        if (window.PetCard && typeof window.PetCard.stopAllSatietyTimers === 'function') {
            window.PetCard.stopAllSatietyTimers();
        }
        
        // If there is a method to clear NFT cache, clear the cache
        if (window.PetNFTService && typeof window.PetNFTService.clearNFTCache === 'function') {
            // Clear all related caches
            window.PetNFTService.clearNFTCache();
            // Ensure cache is fully cleared
            if (window.PetNFTService._cachedNFTs && Array.isArray(window.PetNFTService._cachedNFTs)) {
                window.PetNFTService._cachedNFTs = [];
            }
        }
        
        // Force refresh data
        if (currentAddress) {
            // If user is connected to wallet, load user's NFT data - note here we pass a string address instead of an object
            loadSpecificNFT(currentAddress, true);
        } else {
            // If user is not connected to wallet, show no pets message
            showNoNFTsMessage();
        }
        
        // Show提示信息
        const refreshToast = document.createElement('div');
        refreshToast.className = 'refresh-toast';
        refreshToast.textContent = i18n ? i18n.t('pets.refreshing') : 'Refreshing...';
        document.body.appendChild(refreshToast);
        
        // 2 Seconds later automatically hide the prompt
        setTimeout(() => {
            refreshToast.style.opacity = '0';
            setTimeout(() => {
                if (refreshToast.parentNode) {
                    document.body.removeChild(refreshToast);
                }
            }, 500);
        }, 2000);
    }
    
    /**
     * Reset loading state
     */
    function resetLoadingState() {
        hasLoadedNFT = false;
        currentPage = 1;
        isLoadingMore = false;
        hasReachedEnd = false;
    }
    
    /**
     * Show NFT data structure after DOM loading
     */
    function showNFTDataStructure() {
        // This is a helper method, if needed it can be implemented
    }

    /**
     * Show wallet address
     * @param {string} address - Wallet address
     */
    function showWalletAddress(address) {
        if (!walletAddressSpan) return;
        
        // Format address display
        walletAddressSpan.textContent = formatAddress(address);
        walletAddressSpan.title = address;
        walletAddressSpan.classList.add('truncated-address');
    }
    
    /**
     * Toggle connect button status
     * @param {boolean} connected - Whether connected
     */
    function toggleConnectButton(connected) {
        if (!walletBtn) return;
        
        // Update connection status
        isWalletConnected = connected;
        
        // Update button text and style
        walletBtn.textContent = isWalletConnected ? 
            (i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet') : 
            (i18n ? i18n.t('wallet.connect') : 'Connect Wallet');
        
        if (isWalletConnected) {
            walletBtn.classList.add('connected');
        } else {
            walletBtn.classList.remove('connected');
        }
    }
    
    /**
     * Toggle disconnect button status
     * @param {boolean} visible - Whether visible
     */
    function toggleDisconnectButton(visible) {
        // If there is a separate disconnect button, handle its display/hide here
        // Since the current interface uses the same button to handle connection/disconnection, this method is currently just a placeholder
    }

    /**
     * Load contract address script
     */
    function loadContractAddressScript() {
        debug.log('Loading contract address script...');
        loadContractScript('../../scripts/contracts/contractAddresses.js')
            .then(() => {
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
     * Handle pet feeding operation
     * @param {Object} feedData - Feeding data
     */
    async function handlePetFeeding(feedData) {
        try {
            const { tokenId, feedHours, element } = feedData;
            console.log(`Handling pet feeding: TokenID=${tokenId}, Feeding time=${feedHours} hours`);
            
            // Load pet feeding module
            if (!window.PetFeeding) {
                try {
                    await loadContractScript('../../scripts/functionPackages/PetFeeding.js');
                    if (!window.PetFeeding) {
                        console.log('Failed to load pet feeding module');
                        return;
                    }
                } catch (loadError) {
                    console.error('Failed to load pet feeding module:', loadError);
                    return;
                }
            }
            
            // Check if wallet is connected
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
            if (!userAddress) {
                await ModalDialog.alert('Please connect your wallet to feed the pet', { title: 'Error', confirmText: 'OK' });
                return;
            }
            
            
            // Call PetFeeding module to handle feeding
            const result = await window.PetFeeding.feedSinglePet(feedData);
            
            if (!result.success) {
                // Check if authorization is needed (this is handled in the PetFeeding module)
                await ModalDialog.alert(`Feeding failed: ${result.error || "Unknown error"}`, { title: 'Error', confirmText: 'OK' });
                return;
            }
            PetCard.showFeedingMessage(element, `Successfully fed for ${feedHours} hours!`, "success");
            // Update card display
            if (result.feedingInfo) {
                PetCard.updatePetSatietyWithFeedingInfo(element, result.feedingInfo.feedingHours, result.feedingInfo);
            } else {
                // If no new feeding information is returned, manually calculate
                const currentHours = parseInt(element.dataset.feedingHours) || 0;
                const newHours = Math.min(currentHours + feedHours, PetCard.MAX_FEEDING_HOURS);
                PetCard.updatePetSatiety(element, newHours);
            }
        } catch (error) {
            console.error('Error handling pet feeding:', error);
            if (feedData && feedData.element) {
                await ModalDialog.alert('Error occurred during feeding', { title: 'Error', confirmText: 'OK' });
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
                if (window.feedingManagerContract) {
                    try {
                        const updatedFeedingInfo = await window.feedingManagerContract.getNFTFeedingInfo(tokenId);
                        if (updatedFeedingInfo) {
                            // Use the card component to update the satiety display
                            PetCard.updatePetSatietyWithFeedingInfo(
                                element || document.querySelector(`.pet-card[data-token-id="${tokenId}"]`), 
                                updatedFeedingInfo.realFeedingHours, 
                                updatedFeedingInfo
                            );
                        }
                    } catch (error) {
                        console.error('Failed to get updated feeding information:', error);
                    }
                }
                
                return;
            }
            
            // The following code is the fallback processing logic when the PetCard component does not handle the transaction
            // It is usually not executed here, as the PetCard component handles the reward claim transaction internally
            
            // Check if wallet is connected
            if (!window.web3) {
                console.error('Web3 is not initialized, cannot claim rewards');
                return;
            }
            
            const accounts = await window.web3.eth.getAccounts();
            const userAddress = accounts[0];
            
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
                const tx = await window.feedingManagerContract.contract.methods.claimRewards([tokenId]).send({
                    from: userAddress,
                    gas: 300000
                });
                
                // Update feeding information and UI
                const updatedFeedingInfo = await window.feedingManagerContract.getNFTFeedingInfo(tokenId);
                if (updatedFeedingInfo) {
                    const card = element || document.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                    if (card) {
                        PetCard.updatePetSatietyWithFeedingInfo(card, updatedFeedingInfo.realFeedingHours, updatedFeedingInfo);
                    }
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

    /**
     * Batch feed all pets
     */
    async function handleFeedAllPets() {
        if (!isWalletConnected || !currentAddress) {
            window.ModalDialog.alert('Please connect your wallet');
            return;
        }
        
        // Check if there are any NFTs
        if (!userNFTs || userNFTs.length === 0) {
            window.ModalDialog.alert('You have no pets to feed');
            return;
        }
        
        // Load pet feeding module
        if (!window.PetFeeding) {
            try {
                await loadContractScript('../../scripts/functionPackages/PetFeeding.js');
                if (!window.PetFeeding) {
                    showToast("Failed to load pet feeding module", "error");
                    return;
                }
            } catch (loadError) {
                debug.error('Failed to load pet feeding module:', loadError);
                showToast("Failed to load pet feeding module", "error");
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
                const feedingResult = await window.PetFeeding.feedAllPets(userNFTs, feedingHoursPerNFT, options);
                
                if (!feedingResult.success) {
                    // Check if authorization is needed
                    if (feedingResult.needApproval) {
                        const confirmResult = await window.ModalDialog.confirm(
                            `You need to authorize the PWFOOD token to continue the operation.<br><br>` +
                            `<strong>Required authorization:</strong> At least ${feedingResult.requiredAmount} PWFOOD`,
                            {
                                title: 'Need authorization',
                                confirmText: 'Authorize',
                                cancelText: 'Cancel'
                            }
                        );
                        
                        if (confirmResult.action === 'confirm') {
                            try {
                                // Execute authorization
                                showToast('Authorizing PWFOOD token...', 5000);
                                
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
                                    currentAddress,
                                    true
                                );
                                
                                if (approvalResult.success) {
                                    showToast('Authorization successful, starting batch feed', 3000);
                                    // Try batch feed again
                                    setTimeout(async () => {
                                        await handleFeedAllPets();
                                    }, 1000);
                                } else {
                                    showToast('Authorization failed: ' + (approvalResult.error || 'Unknown error'), 5000);
                                }
                            } catch (approvalError) {
                                debug.error('Authorization process error:', approvalError);
                                showToast('Authorization process error: ' + (approvalError.message || 'Unknown error'), 5000);
                            }
                        } else {
                            showToast('Authorization cancelled', 3000);
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
                    
                    // 成功喂养后显示结果对话框
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
                        loadUserNFTs(true);
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
            debug.error('Error popping up the input dialog:', error);
            showToast('Operation failed: ' + (error.message || 'Unknown error'), 5000);
        }
    }
    
    /**
     * Original batch feed all pets method (as a fallback)
     */
    async function handleFeedAllPetsLegacy() {
        if (!isWalletConnected || !currentAddress) {
            alert('Please connect your wallet first');
            return;
        }
        
        // Check if there are any NFTs
        if (!userNFTs || userNFTs.length === 0) {
            alert('You have no pets to feed');
            return;
        }
        
        // Load pet feeding module
        if (!window.PetFeeding) {
            try {
                await loadContractScript('../../scripts/functionPackages/PetFeeding.js');
                if (!window.PetFeeding) {
                    showToast("Failed to load pet feeding module", "error");
                    return;
                }
            } catch (loadError) {
                debug.error('Failed to load pet feeding module:', loadError);
                showToast("Failed to load pet feeding module", "error");
                return;
            }
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
            const feedingResult = await window.PetFeeding.feedAllPets(userNFTs, feedingHoursPerNFT, options);
            
            if (!feedingResult.success) {
                // Check if authorization is needed
                if (feedingResult.needApproval) {
                    const confirmMessage = `You need to authorize the PWFOOD token to continue the operation.<br><br>` +
                        `<strong>Required authorization:</strong> At least ${feedingResult.requiredAmount} PWFOOD`;
                    if (confirm(confirmMessage)) {
                        try {
                            // Execute authorization
                            showToast('Authorizing PWFOOD token...', 5000);
                            
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
                                currentAddress,
                                true
                            );
                            
                            if (approvalResult.success) {
                                showToast('Authorization successful, starting batch feed', 3000);
                                // Try batch feed again
                                setTimeout(async () => {
                                    await handleFeedAllPets();
                                }, 1000);
                            } else {
                                showToast('Authorization failed: ' + (approvalResult.error || 'Unknown error'), 5000);
                            }
                        } catch (approvalError) {
                            debug.error('Authorization process error:', approvalError);
                            showToast('Authorization process error: ' + (approvalError.message || 'Unknown error'), 5000);
                        }
                    } else {
                        showToast('Authorization cancelled', 3000);
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
                
                // Refresh NFT display
                setTimeout(() => {
                    loadUserNFTs(true);
                }, 2000);
            } else if (feedingResult.failCount > 0) {
                showToast(`All feeding attempts failed, please check the PWFOOD balance or network status`, 5000);
            }
        } catch (error) {
            debug.error('Batch feed process error:', error);
            showToast('Batch feed failed: ' + (error.message || 'Unknown error'), 5000);
        }
    }

    /**
     * Batch claim all pet rewards
     */
    async function handleClaimAllRewards() {
        try {
            console.log('Starting to claim all pet rewards');
            
            // Check if wallet is connected
            if (!isWalletConnected || !currentAddress) {
                // Check if ModalDialog is available
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('Please connect your wallet first');
                } else {
                    alert('Please connect your wallet first');
                }
                return;
            }
            
            // Check if there are any NFTs
            if (!userNFTs || userNFTs.length === 0) {
                if (window.ModalDialog) {
                    await window.ModalDialog.alert('No NFTs found');
                } else {
                    alert('No NFTs found');
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
            const nftIds = userNFTs.map(nft => nft.token_id);
            console.log(`Preparing to claim ${nftIds.length} NFT rewards`);
            
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
                const confirmMessage = `Are you sure you want to claim <strong>${nftIds.length}</strong> NFT rewards?`;
                userConfirmed = confirm(confirmMessage);
            }
            
            if (!userConfirmed) {
                console.log('User cancelled the claim operation');
                showToast('Claim operation cancelled', 3000);
                return;
            }
            
            try {
                // Call the PetRewards module's claimAllRewards method
                const result = await window.PetRewards.claimAllRewards(userNFTs);
                
                if (result.success) {
                    // Extract the actual rewards from the contract event
                    // Previously using result.totalPwp which might not have the accurate contract-returned value
                    const pwp = result.pwpotRewards || result.totalPwpotRewards || 0;
                    const pwb = result.pwbotRewards || result.totalPwbotRewards || 0;
                    
                    debug.log('Claimed rewards from contract event:', { pwp, pwb, result });
                    
                    // If there are NFTs that were filtered out, show more detailed information
                    if (result.filteredOutCount && result.filteredOutCount > 0) {
                        showToast(`Successfully claimed rewards! Received ${pwp} PWP and ${pwb} PWB (filtered out ${result.filteredOutCount} NFTs with no rewards)`, 5000);
                    } else {
                        showToast(`Successfully claimed rewards! Received ${pwp} PWP and ${pwb} PWB`, 5000);
                    }
                    
                    // Use ModalDialog to display detailed results
                    if (window.ModalDialog) {
                        await window.ModalDialog.alert(
                            `<div style="color: #4caf50;">
                                <strong>Successfully claimed rewards!</strong><br><br>
                                🎁 Rewards received:<br>
                                - ${pwp} PWP<br>
                                - ${pwb} PWB<br><br>
                                ${result.processedCount ? `✅ Processed: ${result.processedCount} NFTs<br>` : ''}
                                ${result.tokenCount ? `✅ Processed: ${result.tokenCount} NFTs<br>` : ''}
                                ${result.filteredOutCount ? `⚠️ Filtered out: ${result.filteredOutCount} NFTs with no rewards<br>` : ''}
                            </div>`,
                            {
                                title: 'Claim success'
                            }
                        );
                    }
                    
                    // Update UI display
                    console.log('Claim success:', result);
                    
                    // Refresh NFT display
                    setTimeout(() => {
                        loadUserNFTs(true);
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
            claimAllBtn.addEventListener('click', handleClaimAllRewards);
        } else {
            debug.error('Batch claim button not found');
        }
        
        if (feedFriendBtn) {
            feedFriendBtn.addEventListener('click', handleFeedFriendNFT);
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
        
        debug.log('Batch action buttons initialized');
    }
    
    /**
     * Handle feed friend pet button click
     */
    async function handleFeedFriendNFT() {
        debug.log('Feed friend pet button clicked');
        
        // Check if wallet is connected
        if (!isWalletConnected || !currentAddress) {
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

}); 