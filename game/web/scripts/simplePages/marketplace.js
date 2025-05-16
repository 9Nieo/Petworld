
const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const searchInput = document.querySelector('.search-input');
    const sortSelect = document.querySelector('.sort-select');
    const qualityTabs = document.querySelectorAll('.quality-tab');
    const marketItemsContainer = document.querySelector('.market-items');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const transactionStatus = document.querySelector('.transaction-status');
    const pageBtns = document.querySelectorAll('.page-btn');
    const nftModal = document.getElementById('nftDetailModal');
    const nftModalClose = document.querySelector('.nft-modal-close');
    const buyBtn = document.querySelector('.nft-action-buttons .buy-btn');
    const cancelBtn = document.querySelector('.nft-action-buttons .cancel-btn');
    
    // Contract instances
    let web3 = null;
    let nftMarketplaceContract = null;
    let pwNFTContract = null;
    let currentPaymentTokenContract = null;
    let nftManagerContract = null;
    
    // Wallet and pagination status
    let isWalletConnected = false;
    let currentAddress = null;
    let currentPage = 1;
    let totalPages = 1;
    
    // Current selected quality filter
    let currentQualityFilter = '1';
    
    // Current selected sorting method
    let currentSortMethod = 'price-asc';
    
    // Market data
    let marketListings = [];
    
    // Current selected NFT data (for detail modal)
    let selectedNFT = null;
    
    // Quality mapping
    const QUALITY_NAMES = {
        0: 'COMMON',
        1: 'GOOD',
        2: 'EXCELLENT',
        3: 'RARE',
        4: 'LEGENDARY'
    };
    
    
    // Contract initialization status
    let contractsInitialized = false;
    
    // Add pagination cache
    // Store loaded market data, key is page number, value is NFT data for that page
    let marketListingsCache = {};
    // Store current search parameters
    let currentSearchParams = {
        quality: 'all',
        sort: 'price-asc',
        searchText: '',
        sortDirection: 'asc', // 'asc' or 'desc'
        lastTokenId: null,    // Last tokenId of previous page
        firstTokenId: null    // First tokenId of previous page
    };

    // Listing local storage cache
    let listingsCache = {};
    // Cache expiration time (50 minutes)
    const LISTINGS_CACHE_EXPIRY = 3000000;
    
    // Number of items per page
    const ITEMS_PER_PAGE = 6;
    
    // Initialize
    init();
    
    /**
     * Initialize function
     */
    function init() {
        // Bind wallet connection button click event
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind search input event
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Set the initial value of the sort dropdown to price from low to high
        if (sortSelect) {
            sortSelect.value = 'price-asc';
            sortSelect.addEventListener('change', handleSort);
        }
        
        // Bind quality option card event
        if (qualityTabs && qualityTabs.length) {
            qualityTabs.forEach(tab => {
                tab.addEventListener('click', handleQualityTabClick);
            });
        }
        
        // Bind page button event
        if (pageBtns.length >= 2) {
            pageBtns[0].addEventListener('click', () => handlePageChange('prev')); // Previous page
            pageBtns[1].addEventListener('click', () => handlePageChange('next'));  // Next page
        }
        
        // Bind modal box event
        if (nftModalClose) {
            nftModalClose.addEventListener('click', closeNftModal);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeNftModal);
        }
        
        if (buyBtn) {
            buyBtn.addEventListener('click', handleBuyNFT);
        }
        
        // Bind list NFT and manage listings button event
        const listNFTBtn = document.getElementById('listNFTBtn');
        const manageListingsBtn = document.getElementById('manageListingsBtn');
        
        if (listNFTBtn) {
            listNFTBtn.addEventListener('click', handleListNFTBtnClick);
        }
        
        if (manageListingsBtn) {
            manageListingsBtn.addEventListener('click', handleManageListingsBtnClick);
        }
        
        // Listen to NFT listing and delisting events
        window.addEventListener('nft.listed', handleNFTListed);
        window.addEventListener('nft.delisted', handleNFTDelisted);
        window.addEventListener('nft.priceUpdated', handleNFTPriceUpdated);
        
        // Listen to messages from the wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Output iframe source
        if (walletFrame) {
            console.log('Wallet iframe source:', walletFrame.src);
            
            // Ensure iframe is loaded
            walletFrame.onload = function() {
                console.log('Wallet iframe loaded');
                // Check wallet status after iframe is loaded
                checkWalletStatus();
            };
        }
        
        // If iframe is loaded, check wallet status directly
        if (walletFrame && walletFrame.complete) {
            checkWalletStatus();
        }
        
        // Listen to language change event
        window.addEventListener('localeChanged', handleLocaleChanged);
        
        // Update pagination information
        updatePaginationInfo();
        
        // Initialize current language
        updateUITexts();
        
        // Listen to Web3 ready event
        window.addEventListener('wallet.web3Ready', function(event) {
            console.log('Web3已就绪:', event.detail);
            initContracts(event.detail.web3);
        });
        
        // Set a task to clean up the listing cache (every 100 minutes)
        const CACHE_CLEANUP_INTERVAL = 10 * 60 * 10000; // 100 minutes
        setInterval(clearExpiredListingsCache, CACHE_CLEANUP_INTERVAL);
        // Try to get the Web3 instance and initialize the market data directly
        tryInitializeMarketplace();
    }
    
    /**
     * Try to initialize the market and load data
     */
    function tryInitializeMarketplace() {
        
        // Show loading status
        showLoading(true);
        
        // If contracts are already initialized, load market data directly
        if (contractsInitialized && nftMarketplaceContract) {
            loadMarketplaceData();
            return;
        }
        
        // Try to get the global Web3 instance
        let web3Instance = null;
        
        if (window.ethereum) {
            web3Instance = new Web3(window.ethereum);
            console.log('Create Web3 instance using window.ethereum');
        } else if (window.web3) {
            web3Instance = new Web3(window.web3.currentProvider);
            console.log('Create Web3 instance using window.web3');
        }
        
        if (web3Instance) {
            // Initialize contracts
            initContracts(web3Instance).then(() => {
                // Load market data
                loadMarketplaceData();
            }).catch(error => {
                console.error('Failed to initialize contracts:', error);
                showTransactionStatus('Failed to initialize contracts, will load market data in read-only mode', 'warning');
                
                // Try to load data in read-only mode
                tryLoadMarketplaceDataReadOnly();
            });
        } else {
            console.log('Failed to find Web3 instance, try to load market data in read-only mode');
            // Try to load data in read-only mode
            tryLoadMarketplaceDataReadOnly();
        }
    }
    
    /**
     * Try to load market data in read-only mode
     */
    function tryLoadMarketplaceDataReadOnly() {
        // Create a read-only Web3 instance using a public RPC provider
        const readOnlyWeb3 = new Web3('https://ethereum-goerli.publicnode.com');
        console.log('Using read-only Web3 instance');
        
        // Initialize read-only contracts
        initContracts(readOnlyWeb3, true).then(() => {
            // Load market data
            loadMarketplaceData();
        }).catch(error => {
            console.error('Failed to initialize read-only contracts:', error);
            showTransactionStatus('Failed to load market data, please check your network connection', 'error');
            showLoading(false);
        });
    }
    
    /**
     * Initialize contracts
     */
    async function initContracts(web3Instance, readOnly = false) {
        try {
            console.log('Initializing contracts...');
            web3 = web3Instance;
            
            // Initialize NFT marketplace contract
            if (window.initNFTMarketplaceContract) {
                nftMarketplaceContract = window.initNFTMarketplaceContract(web3, window.getContractAddress);
                console.log('NFTMarketplace contract initialized');
            } else {
                console.error('initNFTMarketplaceContract function is not available');
                showTransactionStatus('Error: Failed to initialize market contract', 'error');
                return;
            }
            
            // Initialize RareNFTTransactionIndexer contract
            window.rareNFTTransactionIndexerContract = window.initRareNFTTransactionIndexerContract(web3, window.getContractAddress);
            
            // Initialize PwNFT contract
            const pwNftAddress = window.getContractAddress ? window.getContractAddress('PwNFT') : null;
            if (pwNftAddress) {
                const pwNftAbi = window.PwNFTABI || window.GENERIC_ERC20_ABI;
                if (pwNftAbi) {
                    pwNFTContract = new web3.eth.Contract(pwNftAbi, pwNftAddress);
                    console.log('PwNFT contract initialized');
                } else {
                    console.error('PwNFT ABI is not available');
                    showTransactionStatus('Error: Failed to get PwNFT ABI', 'error');
                    return;
                }
            } else {
                console.error('Failed to get PwNFT contract address');
                showTransactionStatus('Error: Failed to get PwNFT contract address', 'error');
                return;
            }
            
            // Initialize NFTManager contract
            if (window.initNFTManager) {
                nftManagerContract = window.initNFTManager(web3, window.getContractAddress);
                console.log('NFTManager contract initialized');
            } else {
                console.error('initNFTManager function is not available');
                showTransactionStatus('Warning: Failed to initialize NFTManager contract, NFT images may not display correctly', 'warning');
            }
            
            // Initialize successfully, set status to true
            contractsInitialized = true;
            console.log('All contracts initialized successfully');
            
            // Initialize NFT listing and manage listing modals
            if (!readOnly) {
                initMarketplaceModals();
            }
            
            // If contracts are initialized successfully, load market data
            if (nftMarketplaceContract) {
                loadMarketplaceData();
            }
        } catch (error) {
            console.error('Failed to initialize contracts:', error);
            showTransactionStatus('Failed to initialize contracts: ' + error.message, 'error');
            contractsInitialized = false;
            throw error;
        }
    }
    
    /**
     * Initialize marketplace modals
     */
    function initMarketplaceModals() {
        try {
            console.log('Initializing marketplace modals...');
            
            // Ensure web3 and contracts are initialized
            if (!web3 || !nftMarketplaceContract || !pwNFTContract) {
                console.error('Failed to initialize marketplace modals: web3 or contract instances are not ready');
                return false;
            }
            
            // Initialize NFT listing modal
            if (window.ListNFTModal && typeof window.ListNFTModal.init === 'function') {
                window.ListNFTModal.init(web3, nftMarketplaceContract, pwNFTContract);
                console.log('NFT listing modal initialized');
            } else {
                console.error('ListNFTModal is not available');
            }
            
            // Initialize manage listing modal
            if (window.ManageListingsModal && typeof window.ManageListingsModal.init === 'function') {
                window.ManageListingsModal.init(web3, nftMarketplaceContract, pwNFTContract);
                console.log('Manage listings modal initialized');
            } else {
                console.error('ManageListingsModal is not available');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize marketplace modals:', error);
            return false;
        }
    }
    
    /**
     * Handle NFT listing button click
     */
    function handleListNFTBtnClick() {
        // Check if wallet is connected
        if (!isWalletConnected || !currentAddress) {
            alert(i18n ? i18n.t('wallet.connectRequired') : 'Please connect your wallet first');
            showWalletModal();
            return;
        }
        
        // Check if contracts are initialized
        if (!contractsInitialized || !web3 || !nftMarketplaceContract || !pwNFTContract) {
            console.warn('Contracts are not initialized, trying to reinitialize...');
            
            // Try to get Web3 instance
            if (window.ethereum) {
                const web3Instance = new Web3(window.ethereum);
                // Initialize contracts
                initContracts(web3Instance).then(() => {
                    if (contractsInitialized) {
                        // If initialization is successful, show the modal
                        showNFTListingModal();
                    } else {
                        alert('Failed to initialize contracts, please ensure your wallet is connected and refresh the page');
                    }
                }).catch(error => {
                    console.error('Failed to initialize contracts:', error);
                    alert('Failed to initialize contracts: ' + (error.message || 'Unknown error'));
                });
            } else if (window.web3) {
                const web3Instance = new Web3(window.web3.currentProvider);
                // Initialize contracts
                initContracts(web3Instance).then(() => {
                    if (contractsInitialized) {
                        // If initialization is successful, show the modal
                        showNFTListingModal();
                    } else {
                        alert('Failed to initialize contracts, please ensure your wallet is connected and refresh the page');
                    }
                }).catch(error => {
                    console.error('Failed to initialize contracts:', error);
                    alert('Failed to initialize contracts: ' + (error.message || 'Unknown error'));
                });
            } else {
                alert('Please install and connect MetaMask or other compatible wallets');
            }
            return;
        }
        
        // Contracts are initialized, show the modal directly
        showNFTListingModal();
    }
    
    /**
     * Handle manage listing NFT button click
     */
    function handleManageListingsBtnClick() {
        // Check if wallet is connected
        if (!isWalletConnected || !currentAddress) {
            alert(i18n ? i18n.t('wallet.connectRequired') : 'Please connect your wallet first');
            showWalletModal();
            return;
        }
        
        // Check if contracts are initialized
        if (!contractsInitialized || !web3 || !nftMarketplaceContract || !pwNFTContract) {
            console.warn('Contracts are not initialized, trying to reinitialize...');
            
            // Try to get Web3 instance
            if (window.ethereum) {
                const web3Instance = new Web3(window.ethereum);
                // Initialize contracts
                initContracts(web3Instance).then(() => {
                    if (contractsInitialized) {
                        // If initialization is successful, show the modal
                        showManageListingsModal();
                    } else {
                        alert('Failed to initialize contracts, please ensure your wallet is connected and refresh the page');
                    }
                }).catch(error => {
                    console.error('Failed to initialize contracts:', error);
                    alert('Failed to initialize contracts: ' + (error.message || 'Unknown error'));
                });
            } else if (window.web3) {
                const web3Instance = new Web3(window.web3.currentProvider);
                // Initialize contracts
                initContracts(web3Instance).then(() => {
                    if (contractsInitialized) {
                        // If initialization is successful, show the modal
                        showManageListingsModal();
                    } else {
                        alert('Failed to initialize contracts, please ensure your wallet is connected and refresh the page');
                    }
                }).catch(error => {
                    console.error('Failed to initialize contracts:', error);
                    alert('Failed to initialize contracts: ' + (error.message || 'Unknown error'));
                });
            } else {
                alert('Please install and connect MetaMask or other compatible wallets');
            }
            return;
        }
        
        // Contracts are initialized, show the modal directly
        showManageListingsModal();
    }
    
    /**
     * Handle NFT listing event
     */
    function handleNFTListed(event) {
        console.log('NFT listed:', event.detail);
        
        // Update listing information cache
        if (event.detail && event.detail.tokenId) {
            // Delete all caches for this NFT, force reload from chain
            updateListingCache(event.detail.tokenId, null);
            
            // Clear entire market list cache
            clearMarketCache();
            
            // Ensure localStorage cache is also cleared
            try {
                const storageKey = `marketplace_listing_${event.detail.tokenId}`;
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.warn('Failed to clear localStorage cache:', error);
            }
        }
        
        // Show success message
        showTransactionStatus('NFT listed successfully!', 'success');
        
        // Force reload market data from chain
        loadMarketplaceData(true);
    }
    
    /**
     * Handle NFT delisting event
     */
    function handleNFTDelisted(event) {
        console.log('NFT delisted:', event.detail);
        
        // Delete listing information from cache
        if (event.detail && event.detail.tokenId) {
            updateListingCache(event.detail.tokenId, null);
            
            // Ensure localStorage cache is also cleared
            try {
                const storageKey = `marketplace_listing_${event.detail.tokenId}`;
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.warn('Failed to clear localStorage cache:', error);
            }
        }
        
        // Show success message
        showTransactionStatus('NFT delisted successfully!', 'success');
        
        // Clear market list cache and reload
        clearMarketCache();
        loadMarketplaceData(true);
    }
    
    /**
     * Handle NFT price update event
     */
    function handleNFTPriceUpdated(event) {
        console.log('NFT price updated:', event.detail);
        
        // Update listing information cache
        if (event.detail && event.detail.tokenId) {
            // Delete all caches for this NFT, force reload from chain
            updateListingCache(event.detail.tokenId, null);
            
            // Ensure localStorage cache is also cleared
            try {
                const storageKey = `marketplace_listing_${event.detail.tokenId}`;
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.warn('Failed to clear localStorage cache:', error);
            }
        }
        
        // Show success message
        showTransactionStatus('NFT price updated successfully!', 'success');
        
        // Clear market list cache and reload
        clearMarketCache();
        loadMarketplaceData(true);
    }
    
    /**
     * Load market data
     * @param {boolean} forceRefresh - Whether to force reload from chain
     */
    async function loadMarketplaceData(forceRefresh = false) {
        try {
            // Clear expired listing information cache
            clearExpiredListingsCache();
            
            // Show loading animation
            showLoading(true);
            
            console.log('Loading market data...' + (forceRefresh ? ' (force refresh)' : ''));
            
            // Check if contracts are initialized
            if (!nftMarketplaceContract) {
                console.error('Failed to load market data: NFT marketplace contract not initialized');
                showTransactionStatus('Failed to load market data: Contract not initialized', 'error');
                showLoading(false);
                return;
            }
            
            // Get listings from contract
            const marketItems = await loadMarketListings(forceRefresh);
            
            if (marketItems && marketItems.length > 0) {
                console.log(`Loaded ${marketItems.length} market items`);
                // Apply filters and render
                marketListings = marketItems;
                applyFiltersAndRender();
            } else {
                console.log('No NFTs listed in the market');
                document.querySelector('.market-items').innerHTML = '<div class="no-items-message">No NFTs listed in the market</div>';
            }
            
            // Hide loading animation
            showLoading(false);
        } catch (error) {
            console.error('Failed to load market data:', error);
            showTransactionStatus('Failed to load market data: ' + error.message, 'error');
            showLoading(false);
        }
    }
    
    /**
     * Load listings from contract for a specific page
     * @param {boolean} forceRefresh - Whether to force reload from chain
     */
    async function loadMarketListings(forceRefresh = false) {
        try {
            console.log('Loading market NFT list, page:', currentPage, 'quality:', currentQualityFilter, 'sort:', currentSortMethod, forceRefresh ? '(force refresh)' : '');
            
            // Confirm contracts are initialized
            if (!nftMarketplaceContract) {
                console.error('NFT marketplace contract not initialized');
                return [];
            }
            
            // Check if current page data is already cached and not forced refresh
            const cacheKey = getCacheKey();
            if (!forceRefresh && marketListingsCache[cacheKey]) {
                console.log('Using cached data, page:', currentPage);
                return marketListingsCache[cacheKey];
            }
            
            // Update current search parameters
            currentSearchParams.quality = currentQualityFilter;
            currentSearchParams.sort = currentSortMethod;
            currentSearchParams.searchText = document.querySelector('.search-input').value.trim();
            
            // Determine search direction based on sort method
            if (currentSortMethod.endsWith('-desc')) {
                currentSearchParams.sortDirection = 'desc';
            } else {
                currentSearchParams.sortDirection = 'asc';
            }
            
            // Store all current quality NFTs
            const allItems = [];
            
            // Get all current quality NFTs
            // Convert quality string to number, ensure compatibility with uint8 in contract
            const qualityNumber = parseInt(currentQualityFilter);
            await loadNFTsByQuality(qualityNumber, allItems, forceRefresh);
            
            console.log(`Loaded ${allItems.length} NFTs of quality ${currentQualityFilter}, preparing to sort`);
            
            // Sort all results
            sortItemsByCurrentMethod(allItems);
            
            // Calculate current page range
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allItems.length);
            
            // Get current page NFTs
            const pageItems = allItems.slice(startIndex, endIndex);
            
            console.log(`After sorting and paging, current page has ${pageItems.length} NFTs (total ${allItems.length})`);
            
            // Update total pages
            totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
            
            // Save first and last tokenId of current page, for pagination
            if (allItems.length > 0) {
                const sortedItems = [...allItems]; // Create a copy
                sortedItems.sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
                currentSearchParams.firstTokenId = sortedItems[0].tokenId;
                currentSearchParams.lastTokenId = sortedItems[sortedItems.length - 1].tokenId;
            }
            
            // Cache current page results
            marketListingsCache[cacheKey] = pageItems;
            
            return pageItems;
        } catch (error) {
            console.error('Failed to load market NFT list:', error);
            return [];
        }
    }
    
    /**
     * Load NFTs by quality
     * @param {number} quality - Quality ID
     * @param {Array} items - Array to store results
     * @param {boolean} forceRefresh - Whether to force reload from chain
     */
    async function loadNFTsByQuality(quality, items, forceRefresh = false) {
        try {
            console.log(`Loading NFTs of quality ${quality}...${forceRefresh ? ' (force refresh)' : ''}`);
            
            // Get number of NFTs listed for this quality
            let hasMoreListings = true;
            let index = 0;
            const MAX_QUALITY_ITEMS = 500; // Get up to 500 NFTs of this quality, ensure enough for sorting
            
            // Get all NFT TokenIds for this quality
            const qualityTokenIds = [];
            
            // Iterate to get all NFT TokenIds for this quality
            while (hasMoreListings && index < MAX_QUALITY_ITEMS) {
                try {
                    // Ensure quality is a valid number
                    const tokenId = await nftMarketplaceContract.methods.qualityListings(quality, index).call();
                    console.log('tokenId:', tokenId);
                    
                    // Fix: Remove check for tokenId !== '0', as 0 is also a valid tokenId
                    if (tokenId !== undefined && tokenId !== null) {
                        qualityTokenIds.push(tokenId);
                        index++;
                    } else {
                        hasMoreListings = false;
                    }
                } catch (error) {
                    console.log(`Reached end of quality ${quality} listings or error occurred:`, error.message);
                    hasMoreListings = false;
                }
            }
            
            console.log(`Got ${qualityTokenIds.length} NFT TokenIds of quality ${quality}`);
            
            // Create a temporary array to store all NFT information, instead of using the passed items array
            const allQualityItems = [];
            
            // Get all NFT listings in parallel
            const fetchPromises = qualityTokenIds.map(tokenId => 
                fetchTokenListing(tokenId, allQualityItems, forceRefresh)
            );
            
            await Promise.all(fetchPromises);
            
            console.log(`Successfully loaded ${allQualityItems.length} NFTs of quality ${quality}`);
            
            // Add all loaded NFTs to the result array
            items.push(...allQualityItems);
        } catch (error) {
            console.error(`Failed to load NFTs of quality ${quality}:`, error);
        }
    }
    
    /**
     * Get listing information for a single token
     * @param {string} tokenId - TokenId
     * @param {Array} items - Array to store results
     * @param {boolean} forceRefresh - Whether to force reload from chain
     */
    async function fetchTokenListing(tokenId, items, forceRefresh = false) {
        try {
            // If force refresh, skip cache
            if (!forceRefresh) {
                // Try to get listing from cache
                const cachedListing = getListingFromCache(tokenId);

                // If cache exists and is not expired, use cached data
                if (cachedListing) {
                    console.log(`Using cached Token ${tokenId} listing:`, cachedListing);
                    console.log(`Cache level: ${cachedListing.level}, accumulated food: ${cachedListing.accumulatedFood}`);
                    
                    // Check if listing is valid
                    if (cachedListing && cachedListing.active) {
                        // Add to result array
                        await processListing(items, tokenId, cachedListing);
                    }
                    return;
                }
            } else {
                console.log(`Force reload from chain for Token ${tokenId} listing`);
            }
            
            // No cache or force refresh, get listing from contract
            console.log(`Getting Token ${tokenId} listing from contract`);
            const listing = await nftMarketplaceContract.methods.listings(tokenId).call();
            
            console.log(`Contract returned listing:`, listing);
            console.log(`Contract level: ${listing.level}, accumulated food: ${listing.accumulatedFood}`);
            
            // Ensure level and accumulatedFood are valid numbers
            if (listing) {
                listing.level = parseInt(listing.level || 1);
                listing.accumulatedFood = parseInt(listing.accumulatedFood || 0);
            }
            
            // Save listing to cache
            saveListingToCache(tokenId, listing);
            
            // Check if listing is valid
            if (listing && listing.active) {
                // Add to result array
                await processListing(items, tokenId, listing);
            }
        } catch (error) {
            console.warn(`Failed to get Token ${tokenId} listing:`, error);
        }
    }
    
    /**
     * Get listing from cache
     * @param {string} tokenId - TokenId
     * @returns {Object|null} Listing or null
     */
    function getListingFromCache(tokenId) {
        // Get from memory cache first
        if (listingsCache[tokenId]) {
            const cached = listingsCache[tokenId];
            
            // Check if cache is expired
            if (Date.now() - cached.timestamp < LISTINGS_CACHE_EXPIRY) {
                return cached.data;
            } else {
                // Cache expired, delete
                delete listingsCache[tokenId];
            }
        }
        
        // If no cache in memory, try to get from localStorage
        try {
            const storageKey = `marketplace_listing_${tokenId}`;
            const storedData = localStorage.getItem(storageKey);
            
            if (storedData) {
                const parsed = JSON.parse(storedData);
                
                // Check if cache is expired
                if (Date.now() - parsed.timestamp < LISTINGS_CACHE_EXPIRY) {
                    // Update memory cache
                    listingsCache[tokenId] = parsed;
                    return parsed.data;
                } else {
                    // Cache expired, delete
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.warn(`Failed to get listing from localStorage:`, error);
        }
        
        return null;
    }
    
    /**
     * Save listing to cache
     * @param {string} tokenId - TokenId
     * @param {Object} listing - Listing
     */
    function saveListingToCache(tokenId, listing) {
        if (!tokenId || !listing) return;
        
        const cacheData = {
            data: listing,
            timestamp: Date.now()
        };
        
        // Save to memory cache
        listingsCache[tokenId] = cacheData;
        
        // Save to localStorage
        try {
            const storageKey = `marketplace_listing_${tokenId}`;
            localStorage.setItem(storageKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn(`Failed to save listing to localStorage:`, error);
        }
    }
    
    /**
     * Update cache when NFT is bought, delisted, or price updated
     * @param {string} tokenId - TokenId
     * @param {Object} newData - New listing, if null delete cache
     */
    function updateListingCache(tokenId, newData = null) {
        if (!tokenId) return;
        
        // Update memory cache
        if (newData) {
            listingsCache[tokenId] = {
                data: newData,
                timestamp: Date.now()
            };
        } else {
            delete listingsCache[tokenId];
        }
        
        // Update localStorage
        try {
            const storageKey = `marketplace_listing_${tokenId}`;
            if (newData) {
                localStorage.setItem(storageKey, JSON.stringify(listingsCache[tokenId]));
            } else {
                localStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.warn(`Failed to update localStorage listing:`, error);
        }
    }
    
    /**
     * Get cache key
     */
    function getCacheKey() {
        return `page-${currentPage}-quality-${currentQualityFilter}-sort-${currentSortMethod}-search-${document.querySelector('.search-input').value.trim()}`;
    }
    
    /**
     * Sort items by current method
     */
    function sortItemsByCurrentMethod(items) {
        if (!items || items.length <= 1) return items;
        
        console.log('Sort items by:', currentSortMethod);
        
        switch (currentSortMethod) {
            case 'price-asc':
                items.sort((a, b) => {
                    // Use comparison operator instead of subtraction, return 1 or -1
                    return BigInt(a.price) > BigInt(b.price) ? 1 : -1;
                });
                break;
            case 'price-desc':
                items.sort((a, b) => {
                    // Use comparison operator instead of subtraction, return 1 or -1
                    return BigInt(b.price) > BigInt(a.price) ? 1 : -1;
                });
                break;
            case 'id-desc':
                items.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
                break;
            case 'id-asc':
                items.sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
                break;
            default:
                // Default use ID descending sort
                items.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
        }
        
        return items;
    }
    
    /**
     * Handle quality tab click
     */
    function handleQualityTabClick(event) {
        // Remove active class from all tabs
        qualityTabs.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        event.target.classList.add('active');
        
        // Get selected quality
        currentQualityFilter = event.target.getAttribute('data-quality');
        console.log('Selected quality:', currentQualityFilter);
        
        // Set default sort to price from low to high
        currentSortMethod = 'price-asc';
        
        // Update sort dropdown selected value
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.value = 'price-asc';
        }
        
        // Reset to first page
        currentPage = 1;
        
        // Clear cache
        clearMarketCache();
        
        // Reload marketplace data
        loadMarketplaceData();
    }
    
    /**
     * Handle sort selection
     */
    function handleSort(event) {
        currentSortMethod = event.target.value;
        console.log('Sort method:', currentSortMethod);
        
        // Apply filters and re-render
        applyFiltersAndRender();
    }
    
    /**
     * Apply filters and render market items
     */
    function applyFiltersAndRender() {
        // Get filter conditions
        const sortValue = document.querySelector('.sort-select').value;
        const searchText = document.querySelector('.search-input').value.trim();
        
        // Apply filters
        const filters = {
            sort: sortValue,
            searchText: searchText
        };
        
        // Use MarketItemCard's filter function, but only pass sort and search conditions (quality already filtered during load)
        const filtered = window.MarketItemCard.filterMarketItems(marketListings, filters);
        
        // Use MarketItemCard's render function, pass callback functions
        window.MarketItemCard.renderMarketItems(filtered, '.market-items', {
            onBuyClick: handleBuyNFT,
            onDetailsClick: showNFTDetails
        });
        
        // Update pagination info
        updatePaginationInfo();
    }
    
    /**
     * Show NFT details
     */
    function showNFTDetails(nft) {
        window.MarketItemCard.populateNFTDetailModal(nft, 
            // Buy callback
            (nft) => { 
                handleBuyNFT(nft); 
            }, 
            // Cancel callback
            () => { 
                closeNftModal(); 
            }
        );
    }
    
    /**
     * Close NFT details modal
     */
    function closeNftModal() {
        nftModal.style.display = 'none';
        selectedNFT = null;
    }
    
    /**
     * Handle buying NFT
     */
    async function handleBuyNFT(nft) {
        console.log('Buying NFT:', nft);
        
        if (!web3 || !nftMarketplaceContract) {
            alert('Web3 or contract not initialized, please connect wallet first');
            return { success: false, error: 'Web3 or contract not initialized' };
        }
        
        if (!isWalletConnected) {
            alert('Please connect wallet first');
            showWalletModal();
            return { success: false, error: 'Wallet not connected' };
        }
        
        try {
            // Show loading animation
            showLoading(true);
            
            // Hide NFT details modal
            closeNftModal();
            
            // Buy NFT
            const success = await buyNFTFromMarketplace(nft);
            
            if (success) {
                showTransactionStatus('Purchase successful!', 'success');
                // Refresh marketplace data
                await loadMarketplaceData(true);
                return { success: true };
            } else {
                showTransactionStatus('Purchase failed', 'error');
                return { success: false, error: 'Transaction not completed' };
            }
        } catch (error) {
            console.error('Buying NFT error:', error);
            showTransactionStatus('Buying NFT error: ' + error.message, 'error');
            showLoading(false);
            return { success: false, error: error.message };
        } finally {
            // Ensure loading animation is hidden
            showLoading(false);
        }
    }
    
    /**
     * Function to buy NFT from marketplace, supports different token payments
     */
    async function buyNFTFromMarketplace(nft) {
        try {
            // Check if wallet is connected
            if (!isWalletConnected || !currentAddress) {
                console.error('Please connect wallet first');
                showTransactionStatus('Please connect wallet first', 'warning');
                return false;
            }
            
            // 确认合约已初始化
            if (!nftMarketplaceContract) {
                console.error('NFT marketplace contract not initialized');
                showTransactionStatus('Cannot buy NFT: contract not initialized', 'error');
                return false;
            }
            
            // Get current account and transaction options
            const account = currentAddress;
            const options = {
                from: account,
                gas: 500000
            };
            
            // Show loading animation
            showLoading(true);
            showTransactionStatus('Processing purchase transaction...', 'info');
            
            // If ETH payment, no approval needed, directly buy
            if (!nft.paymentToken || nft.paymentToken === '0x0000000000000000000000000000000000000000') {
                console.log('Using ETH to buy NFT');
                
                // Get price and fee
                const price = nft.price;
                const fee = await nftMarketplaceContract.methods.calculateFee(price).call();
                const totalCost = BigInt(price) + BigInt(fee);
                
                console.log(`NFT price: ${price}, fee: ${fee}, total: ${totalCost}`);
                
                // Set value to total cost
                options.value = totalCost.toString();
                
                // Execute purchase
                const tx = await nftMarketplaceContract.methods.buyNFT(nft.tokenId).send(options);
                console.log('NFT purchase transaction successful:', tx);
                
                // Remove purchased NFT listing from cache
                updateListingCache(nft.tokenId, null);
                
                closeNftModal();
                showTransactionStatus('NFT purchase successful!', 'success');
                
                // Reload marketplace data
                setTimeout(() => {
                    clearMarketCache();
                    loadMarketplaceData();
                }, 2000);
                
                return true;
            } else {
                // Use ERC20 token to pay
                console.log(`Using token (${nft.paymentToken}) to buy NFT`);
                
                // Get ERC20 contract instance
                const tokenContract = await getERC20Contract(nft.paymentToken);
                if (!tokenContract) {
                    console.error('Failed to get token contract');
                    showTransactionStatus('Purchase failed: cannot get token contract', 'error');
                    showLoading(false);
                    return false;
                }
                
                // Get price and fee
                const price = nft.price;
                const fee = await nftMarketplaceContract.methods.calculateFee(price).call();
                const totalCost = BigInt(price) + BigInt(fee);
                
                console.log(`NFT price: ${price}, fee: ${fee}, total: ${totalCost}`);
                
                // Check and set approval
                const approved = await setupApprovals(tokenContract, totalCost.toString());
                if (!approved) {
                    console.error('Failed to approve token');
                    showTransactionStatus('Purchase failed: failed to approve token', 'error');
                    showLoading(false);
                    return false;
                }
                
                // Execute purchase
                const tx = await nftMarketplaceContract.methods.buyNFT(nft.tokenId).send(options);
                console.log('NFT purchase transaction successful:', tx);
                
                // Remove purchased NFT listing from cache
                updateListingCache(nft.tokenId, null);
                
                closeNftModal();
                showTransactionStatus('NFT purchase successful!', 'success');
                
                // Reload marketplace data
                setTimeout(() => {
                    clearMarketCache();
                    loadMarketplaceData();
                }, 2000);
                
                return true;
            }
        } catch (error) {
            console.error('Failed to buy NFT:', error);
            showTransactionStatus('Failed to buy NFT: ' + (error.message || 'Unknown error'), 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Get ERC20 token contract
     */
    async function getERC20Contract(tokenAddress) {
        try {
            // If there is a cached contract instance, return it directly
            if (currentPaymentTokenContract && 
                currentPaymentTokenContract.options.address.toLowerCase() === tokenAddress.toLowerCase()) {
                return currentPaymentTokenContract;
            }
            
            // Create new contract instance
            const abi = window.GENERIC_ERC20_ABI;
            if (!abi) {
                console.error('Cannot get ERC20 ABI');
                return null;
            }
            
            currentPaymentTokenContract = new web3.eth.Contract(abi, tokenAddress);
            return currentPaymentTokenContract;
        } catch (error) {
            console.error('Failed to get ERC20 contract:', error);
            return null;
        }
    }
    
    /**
     * Set approval
     */
    async function setupApprovals(tokenContract, amount) {
        try {
            showTransactionStatus('Checking approval status...', 'warning');
            
            // 1. Check existing approval
            const allowance = await tokenContract.methods.allowance(
                currentAddress, 
                nftMarketplaceContract.options.address
            ).call();
            
            // If there is enough approval, return directly
            if (BigInt(allowance) >= BigInt(amount)) {
                console.log('Enough approval');
                return { success: true };
            }
            
            showTransactionStatus('Need to approve token... Please confirm in wallet', 'warning');
            
            // 2. If approval is insufficient, perform approval
            if (window.ContractApprovalManager && window.ContractApprovalManager.setupNFTMarketplaceApprovals) {
                // Use ContractApprovalManager for approval
                const success = await window.ContractApprovalManager.setupNFTMarketplaceApprovals(
                    web3, 
                    currentAddress, 
                    pwNFTContract, 
                    tokenContract
                );
                
                if (!success) {
                    throw new Error('Failed to approve');
                }
            } else {
                // Manual approval process
                console.log('Manual approval process');
                
                // Set a large approval amount
                const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
                
                const gasEstimate = await tokenContract.methods.approve(
                    nftMarketplaceContract.options.address, 
                    maxAmount
                ).estimateGas({ from: currentAddress });
                
                const tx = await tokenContract.methods.approve(
                    nftMarketplaceContract.options.address, 
                    maxAmount
                ).send({
                    from: currentAddress,
                    gas: Math.floor(gasEstimate * 1.5)
                });
                
                console.log('Approval transaction submitted:', tx);
            }
            
            showTransactionStatus('Approval successful!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Failed to set approval:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Show loading animation
     */
    function showLoading(show) {
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * Show transaction status
     */
    function showTransactionStatus(message, type) {
        if (!transactionStatus) return;
        
        // Remove all status classes
        transactionStatus.classList.remove('status-success', 'status-error', 'status-warning');
        
        // Add corresponding status class
        if (type) {
            transactionStatus.classList.add(`status-${type}`);
        }
        
        // Set message content
        transactionStatus.textContent = message;
        
        // Show status message
        transactionStatus.style.display = 'block';
        
        // If it is a success status, set a timer to automatically hide
        if (type === 'success') {
            setTimeout(() => {
                transactionStatus.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * Handle search input
     */
    function handleSearch(event) {
        if (event.type === 'input' || (event.type === 'keypress' && event.key === 'Enter')) {
            // Reset to first page
            currentPage = 1;
            
            // Clear all caches because the search conditions have changed
            clearMarketCache();
            
            // Show loading animation
            showLoading(true);
            
            // Reload data and apply filters
            loadMarketplaceData().then(() => {
                updatePaginationInfo();
                showLoading(false);
            }).catch(error => {
                console.error('Failed to load data:', error);
                showLoading(false);
            });
        }
    }
    
    /**
     * Handle page change
     * @param {string} direction - Page change direction: 'prev' or 'next'
     */
    function handlePageChange(direction) {
        // Update page number
        if (direction === 'prev' && currentPage > 1) {
            currentPage--;
        } else if (direction === 'next') {
            if (direction === 'next' && marketListings.length >= ITEMS_PER_PAGE) {
                currentPage++;
            } else {
                console.log('Already at the last page');
                return;
            }
        }
        
        console.log(`Switch to ${direction === 'prev' ? 'previous' : 'next'} page, current page: ${currentPage}`);
        
        // Show loading animation
        showLoading(true);
        
        // Clear cache for specific page, but keep other pages
        const oldCacheKey = getCacheKey();
        delete marketListingsCache[oldCacheKey];
        
        // Reload market data
        loadMarketplaceData().then(() => {
            // Update pagination info and hide loading animation
            updatePaginationInfo();
            showLoading(false);
            
            // If current page has no data and is not the first page, automatically go back to previous page
            if (marketListings.length === 0 && currentPage > 1) {
                console.log('Current page has no data, automatically go back to previous page');
                currentPage--;
                handlePageChange('refresh'); // Use 'refresh' to represent only refreshing the current page
            }
        }).catch(error => {
            console.error('Failed to load data:', error);
            showLoading(false);
            
            // Show error information
            showTransactionStatus('Failed to load market data, please try again', 'error');
        });
    }
    
    /**
     * Update pagination info
     */
    function updatePaginationInfo() {
        const pageInfoElem = document.querySelector('.page-info');
        if (!pageInfoElem) return;
        
        // Use global variable totalPages, which is calculated in loadMarketListings
        // Ensure at least one page
        if (typeof totalPages === 'undefined' || totalPages < 1) {
            totalPages = 1;
        }
        
        // Update page info text
        const i18nKey = 'common.pageInfo';
        const pageInfoText = window.i18n ? window.i18n.t(i18nKey, {
            current: currentPage,
            total: totalPages
        }) : `Page ${currentPage} of ${totalPages}`;
        
        pageInfoElem.textContent = pageInfoText;
        
        // Enable/disable pagination buttons
        const prevBtn = document.querySelector('.pagination .page-btn:first-child');
        const nextBtn = document.querySelector('.pagination .page-btn:last-child');
        
        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
            prevBtn.classList.toggle('disabled', currentPage <= 1);
        }
        
        if (nextBtn) {
            // If current page is the last page, disable next page button
            const isLastPage = currentPage >= totalPages;
            nextBtn.disabled = isLastPage;
            nextBtn.classList.toggle('disabled', isLastPage);
        }
    }
    
    /**
     * Clear market cache
     */
    function clearMarketCache() {
        console.log('Clear market cache');
        marketListingsCache = {};
        
        // Also clear expired listings cache
        clearExpiredListingsCache();
    }
    
    /**
     * Clear expired listings cache
     */
    function clearExpiredListingsCache() {
        console.log('Clear expired listings cache');
        const now = Date.now();
        const expiredCount = {
            memory: 0,
            localStorage: 0
        };
        
        // Clear memory cache
        Object.keys(listingsCache).forEach(tokenId => {
            if (now - listingsCache[tokenId].timestamp >= LISTINGS_CACHE_EXPIRY) {
                delete listingsCache[tokenId];
                expiredCount.memory++;
            }
        });
        
        // Clear localStorage cache
        try {
            const keysToRemove = [];
            
            // Find all keys to remove
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('marketplace_listing_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (now - data.timestamp >= LISTINGS_CACHE_EXPIRY) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        // If parsing fails, also delete this key
                        keysToRemove.push(key);
                    }
                }
            }
            
            // Delete found keys
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                expiredCount.localStorage++;
            });
        } catch (error) {
            console.warn('Failed to clear localStorage expired cache:', error);
        }
        
        console.log(`Cleared ${expiredCount.memory} memory cache and ${expiredCount.localStorage} localStorage cache`);
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
                
            case 'web3Instance':
                // Received Web3 instance
                if (message.web3) {
                    console.log('Received Web3 instance');
                    initContracts(message.web3);
                }
                break;
        }
    }
    
    /**
     * Check wallet status
     * First check sessionStorage, then check localStorage
     */
    function checkWalletStatus() {
        console.log('Checking wallet connection status...');
        // First check sessionStorage (cross-page transfer), then check localStorage (long-term storage)
        const sessionWalletConnected = sessionStorage.getItem('walletConnected');
        const sessionWalletAddress = sessionStorage.getItem('walletAddress');
        const sessionWalletType = sessionStorage.getItem('walletType');
        
        if (sessionWalletConnected === 'true' && sessionWalletAddress) {
            console.log('Found wallet connection info in sessionStorage:', sessionWalletAddress);
            // Restore connection status from sessionStorage
            isWalletConnected = true;
            currentAddress = sessionWalletAddress;
            
            // Use unified UI update function
            updateWalletUI(true, currentAddress);
            
            // Save to localStorage for long-term storage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', currentAddress);
            localStorage.setItem('walletType', sessionWalletType || 'metamask');
            
            console.log('Wallet connected, requesting Web3 instance');
            // Request Web3 instance from iframe to get balance
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        console.log('Sending getWeb3Instance message to wallet iframe');
                        walletFrame.contentWindow.postMessage({ 
                            type: 'getWeb3Instance',
                            walletType: sessionWalletType
                        }, '*');
                        // Also try to auto-connect
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: sessionWalletType
                        }, '*');
                    } catch (error) {
                        console.error('Failed to send message to iframe:', error);
                    }
                } else {
                    console.error('Wallet iframe or its contentWindow is unavailable');
                }
            }, 500);
        } else {
            console.log('No wallet info in sessionStorage, checking localStorage');
            // If sessionStorage has no info, check localStorage
            checkStoredWalletConnection();
        }
    }
    
    /**
     * Handle wallet connection successful
     */
    function handleWalletConnected(data) {
        const { walletType, address, chainId, web3: receivedWeb3 } = data;
        
        // Set connection status
        isWalletConnected = true;
        currentAddress = address;
        
        // Update UI
        updateWalletUI(true, address);
        
        // Store connection status in localStorage and sessionStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletType', walletType);
        
        // Also update sessionStorage
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', address);
        sessionStorage.setItem('walletType', walletType);
        
        // Hide wallet modal
        hideWalletModal();
        
        console.log(`Wallet connected successfully: ${walletType}, address: ${address}, chain ID: ${chainId}`);
        
        // If received Web3 instance, initialize contracts
        if (receivedWeb3) {
            initContracts(receivedWeb3);
        }
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send disconnect message to wallet iframe
        if (walletFrame && walletFrame.contentWindow) {
            walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        }
        
        // Directly handle disconnection
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleWalletDisconnected() {
        console.log('Wallet disconnected');
        
        // Set connection status
        isWalletConnected = false;
        currentAddress = null;
        
        // Update UI
        updateWalletUI(false);
        
        // Clear localStorage
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Also clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        console.log('Wallet disconnected');
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
     * Format address for display
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Check if there is stored wallet connection status
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        const storedWalletType = localStorage.getItem('walletType');
        
        console.log('Checking localStorage for wallet connection status:', {
            connected: storedConnected,
            address: storedAddress ? formatAddress(storedAddress) : null,
            type: storedWalletType
        });
        
        if (storedConnected === 'true' && storedAddress) {
            console.log('Found wallet connection info in localStorage');
            // Restore connection status from localStorage
            isWalletConnected = true;
            currentAddress = storedAddress;
            updateWalletUI(true, storedAddress);
            
            // Ensure sessionStorage is also kept in sync
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', storedAddress);
            sessionStorage.setItem('walletType', storedWalletType || 'metamask');
            
            // Request Web3 instance (will be returned from wallet iframe)
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        console.log('Sending getWeb3Instance and autoConnect messages to wallet iframe');
                        // Request Web3 instance
                        walletFrame.contentWindow.postMessage({ 
                            type: 'getWeb3Instance' 
                        }, '*');
                        
                        // Try auto-connect
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: storedWalletType || 'metamask'
                        }, '*');
                    } catch (error) {
                        console.error('Failed to send message to iframe:', error);
                    }
                } else {
                    console.error('Wallet iframe or its contentWindow is unavailable');
                }
            }, 500);
        } else {
            console.log('No wallet connection info found in localStorage');
        }
    }
    
    /**
     * Handle language change event
     * @param {CustomEvent} event language change event
     */
    function handleLocaleChanged(event) {
        console.log('Language changed, updating UI texts');
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
        document.title = i18n.t('navigation.market') + ' - ' + i18n.t('game.title');
        
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
        
        // Update search input placeholder
        if (searchInput) {
            searchInput.placeholder = i18n.t('market.searchPlaceholder') || 'Search pets...';
        }
        
        // Update sort options
        if (sortSelect) {
            const options = sortSelect.options;
            if (options.length >= 4) {
                options[0].textContent = i18n.t('market.sortPriceAsc') || 'Price: Low to High';
                options[1].textContent = i18n.t('market.sortPriceDesc') || 'Price: High to Low';
                options[2].textContent = i18n.t('market.sortTimeDesc') || 'Time: Latest';
                options[3].textContent = i18n.t('market.sortTimeAsc') || 'Time: Oldest';
            }
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
        
        // Update elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = i18n.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        // Update pagination info
        updatePaginationInfo();
        
        console.log('UI texts updated to language:', i18n.getCurrentLocale());
    }
    
    // Add function to show NFT listing modal
    function showNFTListingModal() {
        // Ensure modal is initialized
        if (!window.ListNFTModal) {
            console.error('ListNFTModal is unavailable');
            alert('System error: Unable to load listing functionality, please refresh the page');
            return;
        }
        
        // Reinitialize modal
        try {
            // Initialize first
            window.ListNFTModal.init(web3, nftMarketplaceContract, pwNFTContract);
            
            // Show NFT listing modal
            window.ListNFTModal.showModal();
        } catch (error) {
            console.error('Failed to show NFT listing modal:', error);
            alert('Unable to show NFT listing modal: ' + (error.message || 'Unknown error'));
        }
    }
    
    // Add function to show manage listings modal
    function showManageListingsModal() {
        // Ensure modal is initialized
        if (!window.ManageListingsModal) {
            console.error('ManageListingsModal is unavailable');
            alert('System error: Unable to load management functionality, please refresh the page');
            return;
        }
        
        // Reinitialize modal
        try {
            // Initialize first
            window.ManageListingsModal.init(web3, nftMarketplaceContract, pwNFTContract);
            
            // Show manage listings modal
            window.ManageListingsModal.showModal();
        } catch (error) {
            console.error('Failed to show manage listings modal:', error);
            alert('Unable to show manage listings modal: ' + (error.message || 'Unknown error'));
        }
    }
    
    /**
     * Process listing info and add to result array
     * @param {Array} items - Array to store results
     * @param {string} tokenId - NFT's tokenId
     * @param {Object} listing - Listing info
     */
    async function processListing(items, tokenId, listing) {
        if (items.length >= ITEMS_PER_PAGE) return;
        
        try {
            // Check if this tokenId has already been added
            const exists = items.some(item => item.tokenId === tokenId);
            if (exists) return;
            
            console.log(`Processing NFT #${tokenId} listing info:`, listing);
            console.log(`level: ${listing.level}, accumulatedFood: ${listing.accumulatedFood}`);
            
            // Get NFT metadata
            const nftData = await fetchNFTData(tokenId, listing.seller);
            
            // Get payment token info
            let paymentTokenInfo = { symbol: 'ETH' };
            if (window.SupportedMarketTokens && listing.paymentToken) {
                const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(listing.paymentToken);
                if (tokenInfo) {
                    paymentTokenInfo = tokenInfo;
                }
            }
            
            // Ensure quality is a number type
            // In the contract, quality is now uint8 type, use it directly
            const qualityInt = parseInt(listing.quality);
            
            // Add to result array
            items.push({
                tokenId: tokenId,
                seller: listing.seller,
                paymentToken: listing.paymentToken,
                paymentTokenSymbol: paymentTokenInfo.symbol,
                price: listing.price,
                active: listing.active,
                lastListTime: listing.lastListTime,
                quality: qualityInt,
                level: parseInt(listing.level || 1),
                accumulatedFood: parseInt(listing.accumulatedFood || 0),
                metadata: nftData.metadata || { name: `NFT #${tokenId}`, image: null }
            });
            
            console.log(`NFT added to result array:`, items[items.length - 1]);
        } catch (error) {
            console.warn(`Failed to process tokenId ${tokenId} listing info:`, error.message);
        }
    }
    
    /**
     * Get NFT data (including metadata)
     */
    async function fetchNFTData(tokenId, owner) {
        try {
            console.log(`Fetching NFT #${tokenId} data`);
            
            // Try to get listing info from NFT marketplace contract, including level and accumulated food
            let level = 1; // Default level is 1
            let accumulatedFood = 0; // Default accumulated food is 0
            try {
                if (nftMarketplaceContract && nftMarketplaceContract.methods.listings) {
                    const listing = await nftMarketplaceContract.methods.listings(tokenId).call();
                    if (listing && listing.seller !== '0x0000000000000000000000000000000000000000') {
                        level = parseInt(listing.level || 1);
                        accumulatedFood = parseInt(listing.accumulatedFood || 0);
                        console.log(`Got NFT #${tokenId} level: ${level}, accumulated food: ${accumulatedFood} from marketplace contract`);
                    }
                }
            } catch (error) {
                console.warn(`Error getting NFT #${tokenId} data from marketplace contract:`, error);
                // Continue using backup method
            }
            
            // 1. First try using NFTManager to get quality and info
            if (nftManagerContract) {
                try {
                    // Get NFT quality
                    const quality = await nftManagerContract.methods.tokenQuality(tokenId).call();
                    console.log(`NFT #${tokenId} quality:`, quality);
                    
                    // Get NFT quality ID
                    const qualityId = await nftManagerContract.methods.tokenQualityId(tokenId).call();
                    console.log(`NFT #${tokenId} quality ID:`, qualityId);
                    
                    // Get NFT URI
                    const tokenURI = await nftManagerContract.methods._tokenURIs(tokenId).call();
                    console.log(`NFT #${tokenId} URI:`, tokenURI);
                    
                    if (tokenURI && tokenURI.trim() !== '') {
                        try {
                            // Try to get metadata
                            const response = await fetch(tokenURI);
                            if (response.ok) {
                                const metadata = await response.json();
                                return {
                                    tokenId: tokenId,
                                    contractAddress: pwNFTContract.options.address,
                                    owner: owner,
                                    quality: parseInt(quality),
                                    qualityId: parseInt(qualityId),
                                    level: level,
                                    accumulatedFood: accumulatedFood,
                                    metadata: metadata
                                };
                            }
                        } catch (metadataError) {
                            console.warn(`Failed to get NFT #${tokenId} metadata:`, metadataError);
                        }
                    }
                    
                    // If metadata cannot be obtained, try to get NFT info through qualityId
                    const nftInfo = await nftManagerContract.methods.nfts(quality, qualityId).call();
                    if (nftInfo) {
                        console.log(`NFT info:`, nftInfo);
                        
                        // Get quality name
                        const qualityName = QUALITY_NAMES[quality] || `Unknown quality (${quality})`;
                        
                        // Check if URI is valid, if invalid use default placeholder image
                        let imageUrl = nftInfo.uri;
                        if (!imageUrl || imageUrl.trim() === '') {
                            imageUrl = `../../assets/images/pets/quality_${quality}.png`;
                        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                            // If URI is not a full URL or Base64, it might be an IPFS path or relative path
                            if (imageUrl.startsWith('ipfs://')) {
                                imageUrl = 'https://ipfs.io/ipfs/' + imageUrl.substring(7);
                            } else if (!imageUrl.startsWith('/')) {
                                imageUrl = '../../assets/images/pets/' + imageUrl;
                            }
                        }
                        
                        // Create a more friendly name
                        const petName = nftInfo.name ? `Pet #${nftInfo.name}` : `Pet #${tokenId}`;
                        
                        return {
                            tokenId: tokenId,
                            contractAddress: pwNFTContract.options.address,
                            owner: owner,
                            quality: parseInt(quality),
                            qualityId: parseInt(qualityId),
                            level: level,
                            accumulatedFood: accumulatedFood,
                            metadata: {
                                name: petName,
                                image: imageUrl,
                                description: `Quality: ${qualityName}, Name ID: ${nftInfo.name || 'Unknown'}`
                            }
                        };
                    }
                } catch (nftManagerError) {
                    console.warn('Failed to get NFT info using NFTManager:', nftManagerError);
                }
            }
            
            // 2. Try using PetNFTService
            if (window.PetNFTService && window.PetNFTService.loadNFTByContractAddress) {
                const pwNftAddress = pwNFTContract ? pwNFTContract.options.address : null;
                if (pwNftAddress) {
                    const nft = await window.PetNFTService.loadNFTByContractAddress(pwNftAddress, tokenId);
                    if (nft) {
                        // Ensure adding level and accumulated food
                        nft.level = nft.level || level;
                        nft.accumulatedFood = nft.accumulatedFood || accumulatedFood;
                        return nft;
                    }
                }
            }
            
            // 3. If the above methods are not available, get data directly from PwNFT contract
            const tokenURI = await pwNFTContract.methods.tokenURI(tokenId).call();
            
            // Get metadata
            let metadata = { name: `NFT #${tokenId}`, image: null };
            try {
                // Try to get metadata
                const response = await fetch(tokenURI);
                if (response.ok) {
                    metadata = await response.json();
                }
            } catch (error) {
                console.warn('Failed to get NFT metadata:', error);
            }
            
            return {
                tokenId: tokenId,
                contractAddress: pwNFTContract.options.address,
                owner: owner,
                level: level,
                accumulatedFood: accumulatedFood,
                metadata: metadata
            };
        } catch (error) {
            console.error('Failed to get NFT data:', error);
            return {
                tokenId: tokenId,
                contractAddress: pwNFTContract ? pwNFTContract.options.address : null,
                owner: owner,
                level: 1,
                accumulatedFood: 0,
                metadata: { name: `NFT #${tokenId}`, image: null }
            };
        }
    }
}); 