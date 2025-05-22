// game market page script

document.addEventListener('DOMContentLoaded', () => {
    // global variables
    let web3;
    let currentAccount = null;
    let nftMarketplaceContract;
    let pwNFTContract;
    let nftManagerContract;
    let supportedTokens = {};
    let currentPage = 1;
    let itemsPerPage = 6;
    let totalItems = 0;
    let currentQuality = 1; // default is GOOD quality
    let allListings = [];
    let filteredListings = [];
    let sortMethod = 'price-asc'; // default sort method: price from low to high
    let searchTerm = '';
    let isInitialized = false;
    
    // DOM elements
    const qualityTabs = document.querySelectorAll('.quality-tab');
    const marketItemsContainer = document.querySelector('.market-items');
    const searchInput = document.querySelector('.search-box input');
    const filterSelect = document.querySelector('.filter-select');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const prevPageBtn = document.querySelector('.page-btn.prev-btn');
    const nextPageBtn = document.querySelector('.page-btn.next-btn');
    const pageInfo = document.querySelector('.page-info');
    const transactionStatus = document.querySelector('.transaction-status');
    const listNFTBtn = document.getElementById('listNFTBtn');
    const manageListingsBtn = document.getElementById('manageListingsBtn');
    
    // NFT detail modal elements
    const nftDetailModal = document.getElementById('nftDetailModal');
    const modalCloseBtn = document.querySelector('.nft-modal-close');
    const modalCancelBtn = document.querySelector('.nft-action-buttons .cancel-btn');
    const modalBuyBtn = document.querySelector('.nft-action-buttons .buy-btn');
    
    // initialize
    init();
    
    /**
     * initialize the market page, set event listeners, and load data
     */
    async function init() {
        try {
            console.log('starting to initialize the market page...');
            
            // bind events
            bindEvents();
            
            // request wallet status in the beginning of initialization
            requestWalletData();
            
            // try to initialize marketplace
            try {
                await tryInitializeMarketplace();
            } catch (error) {
                console.error('error initializing marketplace, but continue with other initialization steps:', error);
                // continue with other initialization steps, do not interrupt the whole initialization process
            }
            
            // bind NFT listing and management modal events
            try {
                initMarketplaceModals();
            } catch (error) {
                console.error('error initializing marketplace modals:', error);
                // continue with other initialization steps, do not interrupt the whole initialization process
            }
            
            // load marketplace data
            try {
                await loadMarketplaceData(true);
            } catch (error) {
                console.error('error loading marketplace data:', error);
                showTransactionStatus('error loading marketplace data, some content may be unavailable', 'warning');
            }
            
            // initialize language
            try {
                initLanguage();
            } catch (error) {
                console.error('error initializing language:', error);
            }
            
            // initialize transaction history
            if (typeof window.initGameTransactionHistory === 'function') {
                try {
                    window.initGameTransactionHistory();
                } catch (error) {
                    console.error('error initializing transaction history:', error);
                }
            }
            
            console.log('market page initialized');
        } catch (error) {
            console.error('error initializing market page:', error);
            showTransactionStatus('error initializing market page, please refresh the page', 'error');
        }
    }
    
    /**
     * request wallet data
     */
    function requestWalletData() {
        console.log('requesting wallet data');
        // request Web3 instance and wallet address from parent page
        notifyParentPage({
            type: 'requestData',
            pageType: 'market',
            action: 'getWalletInfo'
        });
    }
    
    /**
     * bind events
     */
    function bindEvents() {
        // bind quality tab click event
        qualityTabs.forEach(tab => {
            tab.addEventListener('click', handleQualityTabClick);
        });
        
        // bind search event
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // bind filter event
        if (filterSelect) {
            filterSelect.addEventListener('change', handleSort);
        }
        
        // bind pagination event
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => handlePageChange('prev'));
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => handlePageChange('next'));
        }
        
        // bind NFT listing button event
        if (listNFTBtn) {
            listNFTBtn.addEventListener('click', handleListNFTBtnClick);
        }
        
        // bind manage listings button event
        if (manageListingsBtn) {
            manageListingsBtn.addEventListener('click', handleManageListingsBtnClick);
        }
        
        // bind modal close event
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeNftModal);
        }
        
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', closeNftModal);
        }
        
        if (modalBuyBtn) {
            modalBuyBtn.addEventListener('click', () => {
                const nftId = modalBuyBtn.getAttribute('data-token-id');
                if (nftId) {
                    const nft = getListingFromCache(nftId);
                    if (nft) {
                        handleBuyNFT(nft);
                    }
                }
                closeNftModal();
            });
        }
        
        // listen to parent window messages
        window.addEventListener('message', handleIframeMessage);
    }
    
    /**
     * handle iframe messages
     */
    function handleIframeMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;
        
        try {
            const message = event.data;
            console.log('Received message:', message);
        
            // handle wallet connection message
            if (message.type === 'walletConnected') {
                handleWalletConnected(message.data);
            }
        
            // handle wallet disconnected message
            if (message.type === 'walletDisconnected') {
                handleWalletDisconnected();
            }
        
            // handle i18n data
            if (message.type === 'i18nData') {
                applyLocalizations();
            }
        
            // handle language change
            if (message.type === 'localeChanged') {
                handleLocaleChanged(message.data);
            }
            
            // handle wallet status response
            if (message.type === 'walletStatus') {
                console.log('Received wallet status message:', message);
                if (message.connected && message.address) {
                    currentAccount = message.address;
                    updateWalletUI(true, currentAccount);
                    if (web3) {
                        initContracts(web3, false).catch(err => 
                            console.error('Failed to initialize contracts from status message:', err)
                        );
                    }
                } else {
                    currentAccount = null;
                    updateWalletUI(false);
                }
            }
            
            // handle wallet info
            if (message.type === 'walletInfo') {
                console.log('Received wallet info:', message);
                if (message.data && message.data.connected && message.data.address) {
                    currentAccount = message.data.address;
                    updateWalletUI(true, currentAccount);
                    if (web3) {
                        initContracts(web3, false).catch(err => 
                            console.error('Failed to initialize contracts from wallet info:', err)
                        );
                    }
                } else if (!currentAccount) {
                    updateWalletUI(false);
                }
            }
        } catch (err) {
            console.error('Error handling iframe message:', err);
        }
    }
    
    /**
     * handle quality tab click
     */
    function handleQualityTabClick(event) {
        // remove active state from all tabs
        qualityTabs.forEach(tab => tab.classList.remove('active'));
        
        // activate current tab
        event.target.classList.add('active');
        
        // update current quality
        currentQuality = parseInt(event.target.getAttribute('data-quality'));
        
        // reset pagination to first page
        currentPage = 1;
        
        // apply filters and render
        applyFiltersAndRender();
    }
    
    /**
     * handle search
     */
    function handleSearch(event) {
        searchTerm = event.target.value.trim().toLowerCase();
        
        // reset to first page
        currentPage = 1;
        
        // apply filters and render
        applyFiltersAndRender();
    }
    
    /**
     * handle sort
     */
    function handleSort(event) {
        sortMethod = event.target.value;
        applyFiltersAndRender();
    }
    
    /**
     * sort market items
     */
    function sortItemsByCurrentMethod(items) {
        return items.sort((a, b) => {
            // convert price to number for comparison
            const priceA = BigInt(a.price || '0');
            const priceB = BigInt(b.price || '0');
            const idA = parseInt(a.tokenId);
            const idB = parseInt(b.tokenId);
            
            switch (sortMethod) {
                case 'price-asc':
                    return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
                case 'price-desc':
                    return priceB < priceA ? -1 : priceB > priceA ? 1 : 0;
                case 'id-asc':
                    return idA - idB;
                case 'id-desc':
                    return idB - idA;
                default:
                    return 0;
            }
        });
    }
    
    /**
     * get rarity value
     */
    function getRarityValue(card) {
        const rarityElement = card.querySelector('.card-rarity');
        if (!rarityElement) return 0;
        
        if (rarityElement.classList.contains('legendary')) return 4; // LEGENDARY
        if (rarityElement.classList.contains('rare')) return 3;      // RARE
        if (rarityElement.classList.contains('uncommon')) return 2;  // EXCELLENT
        if (rarityElement.classList.contains('common')) return 1;    // GOOD
        
        return 0;
    }
    
    /**
     * handle buy button click
     */
    function handleBuy(event) {
        const card = event.target.closest('.market-card');
        const itemName = card.querySelector('h3').textContent;
        const itemPrice = card.querySelector('.price-value').textContent;
        const itemCurrency = card.querySelector('.price-currency').textContent;
        
        // notify parent page
        notifyParentPage({
            type: 'marketAction',
            action: 'buy',
            item: {
                name: itemName,
                price: itemPrice,
                currency: itemCurrency
            }
        });
    }
    
    /**
     * handle details button click
     */
    function handleDetails(event) {
        const card = event.target.closest('.market-card');
        const itemName = card.querySelector('h3').textContent;
        
        // notify parent page
        notifyParentPage({
            type: 'marketAction',
            action: 'details',
            item: {
                name: itemName
            }
        });
    }
    
    /**
     * notify parent page
     */
    function notifyParentPage(message) {
        // send message to parent window
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
        }
    }
    
    /**
     * initialize language settings
     */
    function initLanguage() {
        // check if i18n object exists
        if (window.i18n) {
            // apply localizations directly
            applyLocalizations();
        } else {
            // listen for i18n data from parent window
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'i18nData') {
                    applyLocalizations();
                }
            });
            
            // request i18n data from parent window
            notifyParentPage({ type: 'getI18n' });
        }
    }
    
    /**
     * apply localizations
     */
    function applyLocalizations() {
        if (!window.i18n) return;
        
        // update page title
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) document.title = translation;
        }
        
        // update all elements with data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) el.textContent = translation;
        });
        
        // handle translations with arguments
        const argsElements = document.querySelectorAll('[data-i18n-args]');
        argsElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            
            try {
                const args = JSON.parse(el.getAttribute('data-i18n-args'));
                const translation = i18n.t(key, args);
                if (translation) el.textContent = translation;
            } catch (e) {
                console.error('解析data-i18n-args时出错:', e);
            }
        });
        
        // handle placeholder translations
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = i18n.t(key);
            if (translation) el.placeholder = translation;
        });
        
        // re-render current view to apply translations
        applyFiltersAndRender();
    }
    
    /**
     * try to initialize NFT marketplace
     */
    async function tryInitializeMarketplace() {
        try {
            console.log('starting to initialize NFT marketplace...');
            
            // check if there is a connected wallet in local storage
            checkStoredWalletConnection();
            
            // try read-only mode first
            await tryLoadMarketplaceDataReadOnly();
            
            // check if wallet is connected, this is a passive process, no need to wait
            // in game mode, wallet status will be notified through iframe message event
            checkWalletStatus();
            
            isInitialized = true;
            console.log('NFT marketplace initialized');
        } catch (error) {
            console.error('error initializing NFT marketplace:', error);
            // show warning, but still mark as initialized to allow basic functionality
            showTransactionStatus('error initializing NFT marketplace, some functionality may be unavailable', 'warning');
            isInitialized = true;
        }
    }
    
    /**
     * Check wallet connection status in local storage
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            console.log('Restored wallet connection status from local storage:', storedAddress);
            currentAccount = storedAddress;
            updateWalletUI(true, currentAccount);
        }
    }
    
    /**
     * Try to load marketplace data in read-only mode
     */
    async function tryLoadMarketplaceDataReadOnly() {
        try {
            // Try using different RPC providers to create Web3 instance
            const availableRPCs = [
                window.ethereum, // First try using default Ethereum provider
                'https://bsc-dataseed.binance.org/', // Binance Smart Chain mainnet
                'https://bsc-dataseed1.defibit.io/', // BSC backup 1
                'https://bsc-dataseed1.ninicoin.io/' // BSC backup 2
            ];
            
            let web3Connected = false;
            
            // Try different RPC providers sequentially
            for (const rpc of availableRPCs) {
                try {
                    // Skip null or undefined
                    if (!rpc) continue;
                    
                    // Create Web3 instance
                    if (typeof rpc === 'string') {
                        web3 = new Web3(rpc);
            } else {
                        web3 = new Web3(rpc);
                    }
                    
                    // Check connection
                    const isConnected = await web3.eth.net.isListening();
                    if (isConnected) {
                        console.log('Successfully connected to RPC provider:', typeof rpc === 'string' ? rpc : 'window.ethereum');
                        web3Connected = true;
                        break;
                    }
                } catch (e) {
                    console.warn('Failed to connect to RPC provider, trying next one:', e);
                }
            }
            
            if (!web3Connected || !web3) {
                throw new Error('Unable to connect to any RPC provider');
            }
            
            // Initialize contracts
            await initContracts(web3, true);
            
            // Load supported tokens
            if (window.SupportedMarketTokens) {
                supportedTokens = SupportedMarketTokens.getTokens();
            }
        } catch (error) {
            console.error('Error loading marketplace data in read-only mode:', error);
            throw error;
        }
    }
    
    /**
     * Initialize contracts
     */
    async function initContracts(web3Instance, readOnly = false) {
        try {
            // Get contract addresses for current network environment
            let nftMarketplaceAddress, pwNFTAddress, nftManagerAddress;
            
            // First try using getContractAddress function
            if (typeof window.getContractAddress === 'function') {
                console.log('Using getContractAddress function to get contract addresses');
                try {
                    nftMarketplaceAddress = window.getContractAddress('NFTMarketplace');
                    pwNFTAddress = window.getContractAddress('PwNFT');
                    nftManagerAddress = window.getContractAddress('NFTManager');
                } catch (e) {
                    console.warn('Failed to get addresses using getContractAddress:', e);
                }
            }
            
            // If function failed, try getting directly from contractAddresses object
            if (!nftMarketplaceAddress && window.contractAddresses) {
                console.log('Getting contract addresses from contractAddresses object');
                const network = window.currentNetwork || 'TEST';
                if (window.contractAddresses[network]) {
                    nftMarketplaceAddress = window.contractAddresses[network].NFTMarketplace;
                    pwNFTAddress = window.contractAddresses[network].PwNFT;
                    nftManagerAddress = window.contractAddresses[network].NFTManager;
                }
            }
            
            // Check if addresses were successfully obtained
            if (!nftMarketplaceAddress || !pwNFTAddress || !nftManagerAddress) {
                console.error('Unable to get necessary contract addresses', {
                    nftMarketplaceAddress,
                    pwNFTAddress,
                    nftManagerAddress
                });
                throw new Error('Unable to get necessary contract addresses');
            }
            
            console.log('Contract addresses:', {
                NFTMarketplace: nftMarketplaceAddress,
                PwNFT: pwNFTAddress,
                NFTManager: nftManagerAddress
            });
            
            // Initialize contracts
            if (window.NFTMarketplaceABI) {
                nftMarketplaceContract = new web3Instance.eth.Contract(
                    NFTMarketplaceABI,
                    nftMarketplaceAddress
                );
            }
            
            if (window.PwNFTABI) {
                pwNFTContract = new web3Instance.eth.Contract(
                    PwNFTABI,
                    pwNFTAddress
                );
            }
            
            if (window.NFTManagerABI) {
                nftManagerContract = new web3Instance.eth.Contract(
                    NFTManagerABI,
                    nftManagerAddress
                );
            }
            
            // Check if contracts were successfully initialized
            if (!nftMarketplaceContract || !pwNFTContract || !nftManagerContract) {
                console.error('Contract initialization failed');
                throw new Error('Contract initialization failed');
            }
        } catch (error) {
            console.error('Error initializing contracts:', error);
            throw error;
        }
    }
    
    /**
     * Initialize marketplace modals
     */
    function initMarketplaceModals() {
        // Initialize list NFT modal
        if (window.listNFTModal && typeof window.listNFTModal.init === 'function') {
            window.listNFTModal.init(web3, nftMarketplaceContract, pwNFTContract);
        } else {
            console.error('List NFT modal not found or init method does not exist');
        }
        
        // Initialize manage listings modal
        if (window.manageListingsModal && typeof window.manageListingsModal.init === 'function') {
            window.manageListingsModal.init(web3, nftMarketplaceContract, pwNFTContract);
        } else {
            console.error('Manage listings modal not found or init method does not exist');
        }
        
        // Bind list button click event
        const listNFTBtn = document.getElementById('listNFTBtn');
        if (listNFTBtn) {
            listNFTBtn.addEventListener('click', handleListNFTBtnClick);
        }
        
        // Bind manage listings button click event
        const manageListingsBtn = document.getElementById('manageListingsBtn');
        if (manageListingsBtn) {
            manageListingsBtn.addEventListener('click', handleManageListingsBtnClick);
        }
        
        // Listen for NFT listing events
        window.addEventListener('nft.listed', handleNFTListed);
        
        // Listen for NFT delisting events
        window.addEventListener('nft.delisted', handleNFTDelisted);
        
        // Listen for NFT price update events
        window.addEventListener('nft.priceUpdated', handleNFTPriceUpdated);
    }
    
    /**
     * Handle list NFT button click
     */
    function handleListNFTBtnClick() {
        if (!currentAccount) {
            // If wallet not connected, request connection and show prompt
            showTransactionStatus('Please connect your wallet first', 'warning');
            // Notify parent page to open wallet connection dialog
            notifyParentPage({
                type: 'requestWalletConnection'
            });
            return;
        }
        
        // Show list NFT modal
        if (window.listNFTModal && typeof window.listNFTModal.showModal === 'function') {
            window.listNFTModal.showModal();
        } else {
            console.error('List NFT modal not found or showModal method does not exist');
        }
    }
    
    /**
     * Handle manage listings button click
     */
    function handleManageListingsBtnClick() {
        if (!currentAccount) {
            // If wallet not connected, request connection and show prompt
            showTransactionStatus('Please connect your wallet first', 'warning');
            // Notify parent page to open wallet connection dialog
            notifyParentPage({
                type: 'requestWalletConnection'
            });
            return;
        }
        
        // Show manage listings modal
        if (window.manageListingsModal && typeof window.manageListingsModal.showModal === 'function') {
            window.manageListingsModal.showModal();
        } else {
            console.error('Manage listings modal not found or showModal method does not exist');
        }
    }
    
    /**
     * Handle NFT listing event
     */
    function handleNFTListed(event) {
        // Update cache and UI
        const listing = event.detail;
        saveListingToCache(listing.tokenId, {
            tokenId: listing.tokenId,
            price: listing.price,
            paymentToken: listing.paymentToken,
            seller: currentAccount
        });
        
        // Reload current page data
        loadMarketplaceData(true);
        
        // Show success message
        showTransactionStatus(`NFT (ID: ${listing.tokenId}) listed successfully!`, 'success');
    }
    
    /**
     * Handle NFT delisting event
     */
    function handleNFTDelisted(event) {
        // Update cache
        const tokenId = event.detail.tokenId;
        updateListingCache(tokenId, null);
        
        // Reload current page data
        loadMarketplaceData(true);
        
        // Show success message
        showTransactionStatus(`NFT (ID: ${tokenId}) has been removed from the marketplace`, 'success');
    }
    
    /**
     * Handle NFT price update event
     */
    function handleNFTPriceUpdated(event) {
        // Update cache
        const tokenId = event.detail.tokenId;
        const newPrice = event.detail.newPrice;
        const paymentToken = event.detail.paymentToken;
        
        const listing = getListingFromCache(tokenId);
        if (listing) {
            listing.price = newPrice;
            listing.paymentToken = paymentToken;
            saveListingToCache(tokenId, listing);
        }
        
        // Reload current page data
        loadMarketplaceData(true);
        
        // Show success message
        showTransactionStatus(`NFT (ID: ${tokenId}) price has been updated`, 'success');
    }
    
    /**
     * Load marketplace data
     */
    async function loadMarketplaceData(forceRefresh = false) {
        try {
            showLoading(true);
            
            // Load marketplace listings
            await loadMarketListings(forceRefresh);
            
            // Try to render existing data even if there were issues loading the listings
            applyFiltersAndRender();
            
            showLoading(false);
        } catch (error) {
            console.error('Error loading marketplace data:', error);
            // Show error message
            showTransactionStatus('Error loading marketplace data, but you can still view already loaded content', 'warning');
            // Try to render existing data
            applyFiltersAndRender();
            showLoading(false);
        }
    }
    
    /**
     * Load marketplace listings
     */
    async function loadMarketListings(forceRefresh = false) {
        // If no contract or data already in cache and not forcing refresh
        if (!nftMarketplaceContract) {
            console.error('NFT marketplace contract not initialized');
            return;
        }
        
        // Clear expired cache
        clearExpiredListingsCache();
        
        try {
            // Clear current listings
            allListings = [];
            
            console.log('Starting to load marketplace listings...');
            
            // Try loading NFTs of different qualities - using Promise.allSettled to allow partial failures
            const loadPromises = [
                loadNFTsByQuality(1, allListings, forceRefresh), // GOOD
                loadNFTsByQuality(2, allListings, forceRefresh), // EXCELLENT
                loadNFTsByQuality(3, allListings, forceRefresh), // RARE
                loadNFTsByQuality(4, allListings, forceRefresh)  // LEGENDARY
            ];
            
            const results = await Promise.allSettled(loadPromises);
            
            // Check results
            let successCount = 0;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    console.warn(`Failed to load NFTs of quality ${index + 1}:`, result.reason);
                }
            });
            
            console.log(`Marketplace listings loaded, successfully loaded ${successCount}/4 qualities, total of ${allListings.length} items`);
            
            // Even if all qualities failed to load, don't throw an error, just show a friendly prompt
            if (successCount === 0 && allListings.length === 0) {
                showTransactionStatus('Unable to load marketplace listings, please try again later', 'warning');
            }
        } catch (error) {
            console.error('Error loading marketplace listings:', error);
            // Don't throw error, allow UI to render normally
        }
    }
    
    /**
     * Load NFTs of specified quality
     */
    async function loadNFTsByQuality(quality, items, forceRefresh = false) {
        console.log(`Loading quality ${quality} NFTs${forceRefresh ? ' (forced refresh)' : ''}`);
        
        // Check cache
        const cacheKey = `${getCacheKey()}_quality_${quality}`;
        let cachedData = null;
        
        if (!forceRefresh) {
            try {
                const cachedString = localStorage.getItem(cacheKey);
                if (cachedString) {
                    cachedData = JSON.parse(cachedString);
                    
                    // Check if cache is expired (1 hour)
                    const now = Date.now();
                    if (cachedData.timestamp && (now - cachedData.timestamp < 3600000)) {
                        console.log(`Loading quality ${quality} NFTs from cache`);
                        
                        // Load NFTs from cache
                        if (cachedData.listings && Array.isArray(cachedData.listings)) {
                            for (const listing of cachedData.listings) {
                                // Ensure no duplicates in the list
                                if (!items.some(item => item.tokenId === listing.tokenId)) {
                                    items.push(listing);
                                }
                            }
                        }
                return;
            }
                }
            } catch (error) {
                console.error('Error reading cache:', error);
            }
        }
        
        // If no cache or forced refresh, load data from blockchain
        try {
            if (!nftMarketplaceContract) {
                console.error('NFT marketplace contract not initialized');
                return await loadNFTsByAlternativeMethods(quality, items, forceRefresh);
            }
            
            // Check if contract address is correctly configured
            if (!nftMarketplaceContract.options || !nftMarketplaceContract.options.address) {
                console.error('NFT marketplace contract address not set');
                return await loadNFTsByAlternativeMethods(quality, items, forceRefresh);
            }
            
            // Temporary array to store NFTs of this quality
            const qualityItems = [];
            
            // Use contract's qualityListings method to get all NFT token IDs of specified quality
            let tokenIds = [];
            try {
                // First try to get the length of qualityListings array
                let index = 0;
                const maxItems = 50; // Set a reasonable limit to avoid too many requests and timeouts
                
                // Confirm method exists
                if (typeof nftMarketplaceContract.methods.qualityListings !== 'function') {
                    console.error('qualityListings method does not exist');
                    return await loadNFTsByAlternativeMethods(quality, items, forceRefresh);
            }
                
                console.log(`Starting to get NFT list for quality ${quality}...`);
                while (index < maxItems) {
                    // Try calling qualityListings method to get NFT ID for specific quality and index
                    try {
                        const tokenId = await nftMarketplaceContract.methods.qualityListings(quality, index).call();
                        console.log(`Got tokenId: ${tokenId}, index: ${index}`);
                        
                        // Modified: accept tokenId=0 as valid token ID
                        if (tokenId !== undefined && tokenId !== null) {
                            tokenIds.push(parseInt(tokenId));
                            index++;
                        } else {
                            break; // If undefined or null is returned, we've got all the data
                        }
                    } catch (err) {
                        console.warn(`Failed to get NFT at index ${index}:`, err);
                        break;
                    }
                }
                
                console.log(`Got ${tokenIds.length} NFTs with quality ${quality}`);
            } catch (error) {
                console.error(`Failed to get NFT list with quality ${quality}:`, error);
                // Try alternative methods
                return await loadNFTsByAlternativeMethods(quality, items, forceRefresh);
            }
            
            // Process all token IDs in parallel
            if (tokenIds.length > 0) {
                const processPromises = tokenIds.map(tokenId => 
                    processListing(qualityItems, tokenId)
                );
                
                await Promise.all(processPromises);
                
                // Add processed NFTs to result array, ensuring no duplicates
                for (const item of qualityItems) {
                    if (!items.some(existingItem => existingItem.tokenId === item.tokenId)) {
                        items.push(item);
                    }
                }
                
                // Cache NFTs of this quality
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        listings: qualityItems
                    }));
                } catch (error) {
                    console.error('Failed to cache NFT data:', error);
                }
            }
            
        } catch (error) {
            console.error(`Failed to load quality ${quality} NFTs:`, error);
        }
    }
    
    /**
     * Load NFTs using alternative methods
     */
    async function loadNFTsByAlternativeMethods(quality, items, forceRefresh = false) {
        try {
            console.log(`Using alternative methods to load quality ${quality} NFTs...`);
            
            // Method 1: Use NFT marketplace contract's getAllListings method
            if (nftMarketplaceContract && nftMarketplaceContract.methods.getAllListings) {
                try {
                    console.log('Trying to get all listed NFTs using getAllListings method...');
                    const allListings = await nftMarketplaceContract.methods.getAllListings().call();
                    
                    if (allListings && allListings.length > 0) {
                        console.log(`Got ${allListings.length} listed NFTs`);
                        
                        // Process each listing
                        const processPromises = [];
                        for (const listing of allListings) {
                            if (listing && listing.seller !== '0x0000000000000000000000000000000000000000') {
                                processPromises.push(processListing(items, listing.tokenId, listing));
                            }
                        }
                        
                        // Wait for all processing to complete
                        await Promise.allSettled(processPromises);
                        return;
                    }
                } catch (error) {
                    console.warn('Error getting listed NFTs using getAllListings method:', error);
                }
            }
            
            // Method 2: Try getting known NFT token IDs
            try {
                console.log('Trying to get known NFT token IDs...');
                
                // Check if PwNFT contract is available
                if (!pwNFTContract) {
                    throw new Error('PwNFT contract not initialized');
                }
                
                // Try different methods to get total NFT token count
                let totalNFTs = 0;
                
                try {
                    // Try method 1: tokenCount
                    if (typeof pwNFTContract.methods.tokenCount === 'function') {
                        totalNFTs = await pwNFTContract.methods.tokenCount().call();
                        console.log(`Got NFT total count using tokenCount method: ${totalNFTs}`);
                    }
                } catch (err) {
                    console.warn('Failed to get NFT total count using tokenCount method:', err);
                }
                
                if (!totalNFTs) {
                    try {
                        // Try method 2: totalTokens
                        if (typeof pwNFTContract.methods.totalTokens === 'function') {
                            totalNFTs = await pwNFTContract.methods.totalTokens().call();
                            console.log(`Got NFT total count using totalTokens method: ${totalNFTs}`);
                        }
                    } catch (err) {
                        console.warn('Failed to get NFT total count using totalTokens method:', err);
                    }
                }
                
                // If unable to get exact total, assume a reasonable number to check
                if (!totalNFTs) {
                    console.log('Unable to determine NFT total count, will check the first 100 possible tokenIds');
                    totalNFTs = 100;
                }
                
                // Limit the number to process to avoid too many requests
                const batchSize = 20;
                const maxToProcess = Math.min(totalNFTs, 100); // Process at most the first 100 tokens
                
                // Get possible listings from marketplace contract
                for (let i = 1; i <= maxToProcess; i += batchSize) {
                    const batch = [];
                    for (let j = i; j < Math.min(i + batchSize, maxToProcess + 1); j++) {
                        batch.push(processTokenById(j, items, quality));
                    }
                    await Promise.allSettled(batch);
                }
                
                return;
            } catch (error) {
                console.warn('Error getting NFT total supply:', error);
            }
            
            // Method 3: Directly check some possible tokenIds
            try {
                const maxTokensToCheck = 100;
                console.log(`Trying to directly check the first ${maxTokensToCheck} possible tokenIds...`);
                
                const checkPromises = [];
                for (let tokenId = 1; tokenId <= maxTokensToCheck; tokenId++) {
                    checkPromises.push(checkAndProcessListing(tokenId, items));
                }
                
                await Promise.allSettled(checkPromises);
            } catch (error) {
                console.warn('Error directly checking tokenIds:', error);
            }
            
        } catch (error) {
            console.error(`Alternative methods failed to load quality ${quality} NFTs:`, error);
        }
    }
    
    /**
     * Process listing information
     */
    async function processListing(items, tokenId, listing = null) {
        if (tokenId === undefined || tokenId === null) return;
        
        try {
            console.log(`Processing listing information for tokenId: ${tokenId}`);
            
            // If listing parameter not provided, get from cache or contract
            if (!listing) {
                // First check cache
                const cachedListing = getListingFromCache(tokenId);
                
                if (cachedListing && cachedListing.active) {
                    listing = cachedListing;
                    console.log(`Using cached listing information: `, listing);
                    // Log cached level and accumulated food data
                    console.log(`Cached level: ${listing.level}, accumulated food: ${listing.accumulatedFood}`);
                } else {
                    try {
                        // Check if contract is properly initialized
                        if (!nftMarketplaceContract || !nftMarketplaceContract.options || !nftMarketplaceContract.options.address) {
                            console.error(`Contract not properly initialized, cannot get listing info for tokenId ${tokenId}`);
                            return;
                        }
                        
                        // Get listing information from contract
                        listing = await nftMarketplaceContract.methods.listings(tokenId).call();
                        console.log(`Listing information from contract: `, listing);
                        console.log(`Level from contract: ${listing.level}, accumulatedFood: ${listing.accumulatedFood}`);
                        
                        // Check if valid
                        if (!listing || !listing.active || listing.seller === '0x0000000000000000000000000000000000000000') {
                            console.log(`Listing information for tokenId ${tokenId} is invalid or not active`);
                            return;
                        }
                        
                        // Format response
                        // Ensure quality is a valid number, now using uint8 type
                        const qualityValue = parseInt(listing.quality);
                        
                        listing = {
                            seller: listing.seller,
                            tokenId: parseInt(listing.tokenId || tokenId),
                            paymentToken: listing.paymentToken,
                            price: listing.price,
                            active: listing.active,
                            quality: qualityValue,
                            level: parseInt(listing.level || 1),
                            accumulatedFood: parseInt(listing.accumulatedFood || 0)
                        };
                        
                        console.log(`Formatted listing information: `, listing);
                        console.log(`Formatted level: ${listing.level}, accumulatedFood: ${listing.accumulatedFood}`);
                        
                        // Cache result
                        saveListingToCache(tokenId, listing);
                    } catch (error) {
                        console.error(`Failed to get listing information for tokenId ${tokenId}:`, error);
                        return;
                    }
                }
            } else {
                // If listing parameter provided, print its level and accumulatedFood
                console.log(`Provided listing parameter: `, listing);
                console.log(`Provided level: ${listing.level}, accumulatedFood: ${listing.accumulatedFood}`);
            }
            
            // Skip if listing is not active
            if (!listing.active) {
                console.log(`Listing for tokenId ${tokenId} is not active, skipping processing`);
                return;
            }
            
            // Check if complete NFT data is already in cache
            const cachedItem = getListingFromCache(tokenId);
            if (cachedItem && cachedItem.metadata && cachedItem.image) {
                // Ensure complete payment token information
                let paymentTokenSymbol = 'ETH';
                if (listing.paymentToken && listing.paymentToken !== '0x0000000000000000000000000000000000000000' && window.SupportedMarketTokens) {
                    const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(listing.paymentToken);
                    if (tokenInfo) {
                        paymentTokenSymbol = tokenInfo.symbol;
                    }
                }
                
                // Ensure quality is a number
                const qualityValue = parseInt(listing.quality);
                
                // Log level and accumulatedFood before building item
                console.log(`Level before building item: ${listing.level || cachedItem.level || 1}, accumulatedFood: ${listing.accumulatedFood || cachedItem.accumulatedFood || 0}`);
                
                // Build item using cached data
                const item = {
                    tokenId: parseInt(tokenId),
                    seller: listing.seller,
                    paymentToken: listing.paymentToken,
                    paymentTokenSymbol: paymentTokenSymbol,
                    price: listing.price,
                    metadata: cachedItem.metadata,
                    name: cachedItem.name || `NFT #${tokenId}`,
                    quality: qualityValue,
                    image: cachedItem.image,
                    level: parseInt(listing.level || cachedItem.level || 1),
                    accumulatedFood: parseInt(listing.accumulatedFood || cachedItem.accumulatedFood || 0)
                };
                
                console.log(`NFT item built using cached data: `, item);
                console.log(`Final item.level: ${item.level}, item.accumulatedFood: ${item.accumulatedFood}`);
                
                // Add to items array
                items.push(item);
                return;
            }
            
            // get NFT data
            const nftData = await fetchNFTData(tokenId, listing.seller);
            if (!nftData) {
                console.error(`Failed to get NFT data for tokenId ${tokenId}`);
                return;
            }
            
            // log level and accumulated food information from fetchNFTData
            console.log(`Data from fetchNFTData: `, nftData);
            console.log(`nftData level: ${nftData.level}, accumulatedFood: ${nftData.accumulatedFood}`);
            
            // get payment token symbol
            let paymentTokenSymbol = 'ETH';
            if (listing.paymentToken && listing.paymentToken !== '0x0000000000000000000000000000000000000000' && window.SupportedMarketTokens) {
                const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(listing.paymentToken);
                if (tokenInfo) {
                    paymentTokenSymbol = tokenInfo.symbol;
                }
            }
            
            // ensure quality is a number
            const qualityValue = parseInt(listing.quality);
            
            // create a complete listing object
            const item = {
                tokenId: parseInt(tokenId),
                seller: listing.seller,
                paymentToken: listing.paymentToken,
                paymentTokenSymbol: paymentTokenSymbol,
                price: listing.price,
                metadata: nftData.metadata,
                name: nftData.name || `NFT #${tokenId}`,
                quality: qualityValue,
                image: nftData.image,
                level: parseInt(listing.level || nftData.level || 1),
                accumulatedFood: parseInt(listing.accumulatedFood || nftData.accumulatedFood || 0)
            };
            
            console.log(`Built NFT item: `, item);
            console.log(`Final item.level: ${item.level}, item.accumulatedFood: ${item.accumulatedFood}`);
            
            // update the complete data in cache
            const updatedListing = {
                ...listing, 
                metadata: nftData.metadata, 
                image: nftData.image,
                level: item.level,
                accumulatedFood: item.accumulatedFood
            };
            saveListingToCache(tokenId, updatedListing);
            
            // add to items array
            items.push(item);
        } catch (error) {
            console.error(`Error processing NFT for tokenId ${tokenId}:`, error);
        }
    }
    
    /**
     * get token listing information
     */
    async function fetchTokenListing(tokenId, items, forceRefresh = false) {
        try {
            // first check cache
            if (!forceRefresh) {
                const cachedListing = getListingFromCache(tokenId);
                if (cachedListing) {
                    items.push(cachedListing);
                    return;
                }
            }
            
            // check if contract is properly initialized
            if (!nftMarketplaceContract || !nftMarketplaceContract.options || !nftMarketplaceContract.options.address) {
                console.error(`Contract not properly initialized, cannot get listing info for tokenId ${tokenId}`);
                return;
            }
            
            // get listing information for this token
            const listing = await nftMarketplaceContract.methods.listings(tokenId).call();
            
            // check if the token is listed
            if (listing.seller === '0x0000000000000000000000000000000000000000') {
                return; // not listed
            }
            
            // get NFT data
            const nftData = await fetchNFTData(tokenId, listing.seller);
            
            // combine into a complete listing
            const fullListing = {
                tokenId: tokenId,
                seller: listing.seller,
                price: listing.price,
                paymentToken: listing.paymentToken,
                listTime: new Date(listing.listTime * 1000),
                ...nftData
            };
            
            // save to cache
            saveListingToCache(tokenId, fullListing);
            
            // add to items array
            items.push(fullListing);
        } catch (error) {
            console.error(`Error getting listing information for token ${tokenId}:`, error);
            // continue processing other tokens, do not throw an exception
        }
    }
    
    /**
     * get listing information from cache
     */
    function getListingFromCache(tokenId) {
        try {
            const cacheKey = getCacheKey();
            const cacheData = localStorage.getItem(cacheKey);
            
            if (!cacheData) {
                return null;
            }
            
            const cache = JSON.parse(cacheData);
            return cache[tokenId] || null;
        } catch (error) {
            console.error('Error getting listing information from cache:', error);
            return null;
        }
    }
    
    /**
     * save listing information to cache
     */
    function saveListingToCache(tokenId, listing) {
        try {
            const cacheKey = getCacheKey();
            let cache = {};
            
            // try to get existing cache
            const cacheData = localStorage.getItem(cacheKey);
            if (cacheData) {
                cache = JSON.parse(cacheData);
            }
            
            // update cache
            listing.cacheTime = Date.now();
            cache[tokenId] = listing;
            
            // save cache
            localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (error) {
            console.error('Error saving listing information to cache:', error);
        }
    }
    
    /**
     * update listing cache
     */
    function updateListingCache(tokenId, newData = null) {
        try {
            const cacheKey = getCacheKey();
            let cache = {};
            
            // try to get existing cache
            const cacheData = localStorage.getItem(cacheKey);
            if (cacheData) {
                cache = JSON.parse(cacheData);
            }
            
            // if newData is null, delete this item
            if (newData === null) {
                delete cache[tokenId];
            } else {
                // otherwise update this item
                cache[tokenId] = {
                    ...cache[tokenId],
                    ...newData,
                    cacheTime: Date.now()
                };
            }
            
            // save cache
            localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (error) {
            console.error('Error updating listing cache:', error);
        }
    }
    
    /**
     * get cache key
     */
    function getCacheKey() {
        return 'pw_market_listings_game';
    }
    
    /**
     * apply filters and render
     */
    function applyFiltersAndRender() {
        if (!marketItemsContainer) return;
        
        // Clear container
        marketItemsContainer.innerHTML = '';
        
        // Filter items of current quality
        filteredListings = allListings.filter(item => {
            const itemQuality = item.quality || 0;
            const nameMatch = !searchTerm || 
                              (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              `NFT #${item.tokenId}`.toLowerCase().includes(searchTerm.toLowerCase());
            return itemQuality === currentQuality && nameMatch;
        });
        
        // Sort
        filteredListings = sortItemsByCurrentMethod(filteredListings);
        
        // Calculate total pages
        totalItems = filteredListings.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        
        // Calculate items for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const currentItems = filteredListings.slice(startIndex, endIndex);
        
        // Render items - try using MarketItemCard's render function
        if (currentItems.length === 0) {
            // Show empty state
            const noItemsMsg = document.createElement('div');
            noItemsMsg.className = 'no-items-message';
            noItemsMsg.setAttribute('data-i18n', 'market.noItems');
            noItemsMsg.textContent = 'No items available for this quality';
            marketItemsContainer.appendChild(noItemsMsg);
        } else if (window.MarketItemCard && typeof MarketItemCard.renderMarketItems === 'function') {
            // Use enhanced render function
            MarketItemCard.renderMarketItems(currentItems, marketItemsContainer, {
                onBuyClick: handleBuyNFT,
                onDetailsClick: showNFTDetails
            });
        } else {
            // Manual rendering
            for (const item of currentItems) {
                const itemElement = createMarketItemCard(item);
                marketItemsContainer.appendChild(itemElement);
            }
        }
        
        // Update pagination info
        updatePaginationInfo();
    }
    
    /**
     * Show NFT details
     */
    function showNFTDetails(nft) {
        // If nft is undefined, return immediately
        if (!nft) return;
        
        console.log('Showing NFT details:', nft);
        console.log('Level:', nft.level);
        console.log('Accumulated food:', nft.accumulatedFood);
        
        // Get NFT name - prioritize metadata name
        let nftName = '';
        if (nft.metadata && nft.metadata.name) {
            nftName = nft.metadata.name;
        } else if (nft.name) {
            nftName = nft.name;
        } else {
            nftName = `NFT #${nft.tokenId}`;
        }
        
        // Get image URL
        let imageUrl = '../../resources/images/placeholder.png';
        if (nft.image) {
            imageUrl = nft.image;
        } else if (nft.imageUrl) {
            imageUrl = nft.imageUrl;
        } else if (nft.metadata && nft.metadata.image) {
            imageUrl = nft.metadata.image;
        }
        
        // Set detail modal content
        document.getElementById('nftDetailImage').src = imageUrl;
        document.getElementById('nftName').textContent = nftName;
        document.getElementById('nftTokenId').textContent = nft.tokenId;
        document.getElementById('nftQuality').textContent = getQualityName(nft.quality);
        document.getElementById('nftSeller').textContent = formatAddress(nft.seller);
        
        // Format price with token symbol
        const tokenSymbol = nft.paymentTokenSymbol || getTokenName(nft.paymentToken);
        document.getElementById('nftPrice').textContent = `${formatPrice(nft.price)} ${tokenSymbol}`;
        
        // Format payment token address to show symbol and address
        document.getElementById('nftPaymentTokenAddress').textContent = `${tokenSymbol} (${nft.paymentToken || '0x0000000000000000000000000000000000000000'})`;
        
        // Set level and accumulated food values - use existing HTML elements
        const nftLevelElem = document.getElementById('nftLevel');
        const nftFoodElem = document.getElementById('nftFood');
        
        if (nftLevelElem) {
            nftLevelElem.textContent = nft.level || '1';
            console.log('Setting nftLevel element:', nftLevelElem.textContent);
        } else {
            console.warn('nftLevel element not found');
        }
        
        if (nftFoodElem) {
            nftFoodElem.textContent = nft.accumulatedFood || '0';
            console.log('Setting nftFood element:', nftFoodElem.textContent);
        } else {
            console.warn('nftFood element not found');
        }
        
        // Set buy button data
        const modalBuyBtn = document.querySelector('#nftDetailModal .buy-btn');
        if (modalBuyBtn) {
            modalBuyBtn.setAttribute('data-token-id', nft.tokenId);
        }
        
        // Show modal
        const nftDetailModal = document.getElementById('nftDetailModal');
        if (nftDetailModal) {
            nftDetailModal.style.display = 'flex';
        }
    }
    
    /**
     * Close NFT detail modal
     */
    function closeNftModal() {
        nftDetailModal.style.display = 'none';
    }
    
    /**
     * Handle buy NFT
     */
    async function handleBuyNFT(nft) {
        if (!currentAccount) {
            notifyParentPage({
                type: 'openWalletModal'
            });
            return;
        }
        
        try {
            showLoading(true);
            
            // Buy NFT
            await buyNFTFromMarketplace(nft);
            
            // Remove this NFT from the list
            updateListingCache(nft.tokenId, null);
            
            // Refresh list
            await loadMarketplaceData(true);
            
            showLoading(false);
            showTransactionStatus(`Successfully purchased NFT (ID: ${nft.tokenId})!`, 'success');
        } catch (error) {
            console.error('Error buying NFT:', error);
            showLoading(false);
            showTransactionStatus(`Failed to buy NFT: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle page change
     */
    function handlePageChange(direction) {
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        
        if (direction === 'prev' && currentPage > 1) {
            currentPage--;
        } else if (direction === 'next' && currentPage < totalPages) {
            currentPage++;
        }
        
        applyFiltersAndRender();
    }
    
    /**
     * Update pagination information
     */
    function updatePaginationInfo() {
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        
        // Update page information
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }
        
        // Enable/disable previous page button
        if (prevPageBtn) {
            prevPageBtn.disabled = currentPage <= 1;
            prevPageBtn.classList.toggle('disabled', currentPage <= 1);
        }
        
        // Enable/disable next page button
        if (nextPageBtn) {
            nextPageBtn.disabled = currentPage >= totalPages;
            nextPageBtn.classList.toggle('disabled', currentPage >= totalPages);
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
        
        // Clear all previous classes
        transactionStatus.className = 'transaction-status';
        
        // Add type class
        switch (type) {
            case 'success':
                transactionStatus.classList.add('status-success');
                break;
            case 'error':
                transactionStatus.classList.add('status-error');
                break;
            case 'warning':
                transactionStatus.classList.add('status-warning');
                break;
        }
        
        // Set message
        transactionStatus.textContent = message;
        
        // Show status
        transactionStatus.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            transactionStatus.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Check wallet status
     */
    function checkWalletStatus() {
        console.log('Checking wallet status...');
        
        // Request wallet status from parent page
        notifyParentPage({
            type: 'getWalletStatus'
        });
        
        // Request complete wallet information again
        requestWalletData();
    }
    
    /**
     * Handle wallet connection
     */
    async function handleWalletConnected(data) {
        currentAccount = data.address;
        
        // If already initialized, just update current account
        if (isInitialized) {
            // Update UI
            updateWalletUI(true, currentAccount);
            
            // Reload marketplace data
            await loadMarketplaceData(true);
        } else {
            // Re-initialize
            await tryInitializeMarketplace();
        }
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleWalletDisconnected() {
        currentAccount = null;
        
        // Update UI
        updateWalletUI(false);
    }
    
    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        // Notify parent page to update wallet UI
        notifyParentPage({
            type: 'updateWalletUI',
            connected: connected,
            address: address
        });
    }
    
    /**
     * Format address
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Format date
     */
    function formatDate(date) {
        if (!date) return '';
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleString();
    }
    
    /**
     * Get quality name
     */
    function getQualityName(quality) {
        // Ensure quality is a number
        const qualityNum = parseInt(quality);
        
        switch (qualityNum) {
            case 0: return 'COMMON';
            case 1: return 'GOOD';
            case 2: return 'EXCELLENT';
            case 3: return 'RARE';
            case 4: return 'LEGENDARY';
            default: return 'UNKNOWN';
        }
    }
    
    /**
     * Get token name/symbol
     */
    function getTokenName(tokenAddress) {
        if (!tokenAddress) return 'USD';
        
        // For zero address, check default token
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            // Check if there's a default token in SupportedMarketTokens
            if (window.SupportedMarketTokens && typeof window.SupportedMarketTokens.getDefaultToken === 'function') {
                const defaultToken = window.SupportedMarketTokens.getDefaultToken();
                if (defaultToken && defaultToken.symbol) {
                    return defaultToken.symbol;
                }
            }
            
            // Check if there's a network native token defined
            if (window.networkConfig && window.networkConfig.nativeCurrency && window.networkConfig.nativeCurrency.symbol) {
                return window.networkConfig.nativeCurrency.symbol;
            }
            
            return 'USD'; // Last fallback
        }
        
        // Check in supportedTokens object (cached tokens)
        if (supportedTokens) {
            for (const token of Object.values(supportedTokens)) {
                if (token.address && token.address.toLowerCase() === tokenAddress.toLowerCase() && token.symbol) {
                    return token.symbol;
                }
            }
        }
        
        // Check in SupportedMarketTokens
        if (window.SupportedMarketTokens) {
            const token = window.SupportedMarketTokens.getMarketTokenByAddress(tokenAddress);
            if (token && token.symbol) {
                return token.symbol;
            }
        }
        
        // Try to get the symbol directly from the token contract
        if (window.web3) {
            try {
                const tokenContract = new window.web3.eth.Contract(
                    window.GENERIC_ERC20_ABI || [
                        {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}
                    ],
                    tokenAddress
                );
                
                // This is async, so return token address for now, but update when available
                tokenContract.methods.symbol().call().then(symbol => {
                    console.log(`Got token symbol for ${tokenAddress}: ${symbol}`);
                    
                    // Add to supported tokens for future use
                    if (window.SupportedMarketTokens && typeof window.SupportedMarketTokens.addToken === 'function') {
                        window.SupportedMarketTokens.addToken({
                            address: tokenAddress,
                            symbol: symbol
                        });
                    }
                    
                    // Also add to local cache
                    if (supportedTokens) {
                        supportedTokens[tokenAddress] = { address: tokenAddress, symbol: symbol };
                    }
                    
                    // Update all UI elements with this token address
                    document.querySelectorAll(`[data-token-address="${tokenAddress}"]`).forEach(elem => {
                        elem.textContent = symbol;
                    });
                }).catch(err => {
                    console.warn(`Failed to get symbol for token ${tokenAddress}:`, err);
                });
            } catch (error) {
                console.warn(`Failed to create contract for ${tokenAddress}:`, error);
            }
        }
        
        // As fallback, return shortened address
        if (tokenAddress.length > 8) {
            return `${tokenAddress.substring(0, 6)}...`;
        }
        
        return tokenAddress;
    }
    
    /**
     * Clear expired listing cache
     */
    function clearExpiredListingsCache() {
        try {
            const cacheKey = getCacheKey();
            const cacheData = localStorage.getItem(cacheKey);
            
            if (!cacheData) return;
            
            const cache = JSON.parse(cacheData);
            const now = Date.now();
            let hasChanges = false;
            
            // Clear cache items older than 24 hours
            for (const tokenId in cache) {
                const cacheTime = cache[tokenId].cacheTime || 0;
                if (now - cacheTime > 24 * 60 * 60 * 1000) {
                    delete cache[tokenId];
                    hasChanges = true;
                }
            }
            
            // If there are changes, save back to cache
            if (hasChanges) {
                localStorage.setItem(cacheKey, JSON.stringify(cache));
            }
        } catch (error) {
            console.error('Error clearing expired listing cache:', error);
        }
    }
    
    /**
     * Handle locale change
     */
    function handleLocaleChanged(event) {
        // Apply new localizations
        applyLocalizations();
    }
    
    /**
     * Buy NFT from marketplace
     */
    async function buyNFTFromMarketplace(nft) {
        if (!nftMarketplaceContract || !currentAccount) {
            throw new Error('Contract not initialized or wallet not connected');
        }
        
        try {
            const tokenId = nft.tokenId;
            const price = nft.price;
            const paymentToken = nft.paymentToken;
            
            // Get ERC20 token contract
            const tokenContract = await getERC20Contract(paymentToken);
            
            // Set up approvals
            await setupApprovals(tokenContract, price);
            
            // Buy NFT
            const result = await nftMarketplaceContract.methods.buyNFT(tokenId).send({
                from: currentAccount
            });
            
            console.log('NFT purchase transaction result:', result);
            return result;
        } catch (error) {
            console.error('Error buying NFT:', error);
            throw error;
        }
    }
    
    /**
     * Get ERC20 token contract
     */
    async function getERC20Contract(tokenAddress) {
        if (!web3 || !tokenAddress) {
            throw new Error('Web3 not initialized or token address not provided');
        }
        
        try {
            // Create contract instance using generic ERC20 ABI
            if (window.GENERIC_ERC20_ABI) {
                return new web3.eth.Contract(
                    GENERIC_ERC20_ABI,
                    tokenAddress
                );
            } else {
                throw new Error('GENERIC_ERC20_ABI not found');
            }
        } catch (error) {
            console.error('Error getting ERC20 token contract:', error);
            throw error;
        }
    }
    
    /**
     * Set up approvals
     */
    async function setupApprovals(tokenContract, amount) {
        if (!tokenContract || !nftMarketplaceContract || !currentAccount) {
            throw new Error('Contract not initialized or wallet not connected');
        }
        
        try {
            // Check allowance
            const allowance = await tokenContract.methods.allowance(
                currentAccount,
                nftMarketplaceContract.options.address
            ).call();
            
            // If allowance is insufficient, increase it
            if (new web3.utils.BN(allowance).lt(new web3.utils.BN(amount))) {
                // Show status
                showTransactionStatus('Approving token, please confirm transaction...', 'info');
                
                // Approve maximum integer to avoid having to approve again in the future
                const maxUint256 = new web3.utils.BN(2).pow(new web3.utils.BN(256)).sub(new web3.utils.BN(1));
                
                // Send approval transaction
                const result = await tokenContract.methods.approve(
                    nftMarketplaceContract.options.address,
                    maxUint256.toString()
                ).send({
                    from: currentAccount
                });
                
                console.log('Approval result:', result);
            }
        } catch (error) {
            console.error('Error setting up approvals:', error);
            throw error;
        }
    }
    
    /**
     * get NFT data
     */
    async function fetchNFTData(tokenId, owner) {
        try {
            console.log(`Getting data for NFT #${tokenId}...`);
            let quality = 1; // Default quality is GOOD
            let level = 1; // Default level is 1
            let accumulatedFood = 0; // Default accumulated food is 0
            let uri = '';
            let metadata = {
                name: `NFT #${tokenId}`,
                description: 'No description',
                image: '../../resources/images/placeholder.png'
            };
            
            // Try to get listing information from NFT marketplace contract, including level and accumulated food
            try {
                if (nftMarketplaceContract && nftMarketplaceContract.methods.listings) {
                    const listing = await nftMarketplaceContract.methods.listings(tokenId).call();
                    if (listing && listing.seller !== '0x0000000000000000000000000000000000000000') {
                        quality = parseInt(listing.quality || 1);
                        level = parseInt(listing.level || 1);
                        accumulatedFood = parseInt(listing.accumulatedFood || 0);
                        console.log(`Got quality: ${quality}, level: ${level}, accumulated food: ${accumulatedFood} for NFT #${tokenId} from marketplace contract`);
                    }
                }
            } catch (error) {
                console.warn(`Error getting data for NFT #${tokenId} from marketplace contract:`, error);
                // Continue using fallback methods
            }
            
            // Try different methods to get token quality
            try {
                // Method 1: Use nftManagerContract's getTokenQuality method
                if (nftManagerContract && nftManagerContract.methods.getTokenQuality) {
                    quality = parseInt(await nftManagerContract.methods.getTokenQuality(tokenId).call());
                    console.log(`Got quality: ${quality} for NFT #${tokenId} using getTokenQuality`);
                }
                // Method 2: Try getting quality from PwNFT contract
                else if (pwNFTContract && pwNFTContract.methods.getTokenQuality) {
                    quality = parseInt(await pwNFTContract.methods.getTokenQuality(tokenId).call());
                    console.log(`Got quality: ${quality} for NFT #${tokenId} using PwNFT.getTokenQuality`);
                }
                // Method 3: Use NFT contract's tokenInfo or similar method
                else if (pwNFTContract && pwNFTContract.methods.tokenInfo) {
                    const info = await pwNFTContract.methods.tokenInfo(tokenId).call();
                    quality = parseInt(info.quality || info.tokenQuality || 1);
                    console.log(`Got quality: ${quality} for NFT #${tokenId} using tokenInfo`);
                }
                // Method 4: Use PwNFT's getTokenDetails method
                else if (pwNFTContract && pwNFTContract.methods.getTokenDetails) {
                    const details = await pwNFTContract.methods.getTokenDetails(tokenId).call();
                    quality = parseInt(details.quality || details[0] || 1);
                    console.log(`Got quality: ${quality} for NFT #${tokenId} using getTokenDetails`);
                }
            } catch (error) {
                console.warn(`Error getting quality for NFT #${tokenId}:`, error);
                // Continue using default quality
            }
            
            // Try to get NFT URI
            try {
                if (pwNFTContract && pwNFTContract.methods.tokenURI) {
                    uri = await pwNFTContract.methods.tokenURI(tokenId).call();
                    console.log(`Got URI for NFT #${tokenId}: ${uri}`);
                }
            } catch (error) {
                console.warn(`Error getting URI for NFT #${tokenId}:`, error);
            }
            
            // Try to get NFT metadata
            if (uri) {
                try {
                    // Convert IPFS URI to HTTP URL
                let url = uri;
                if (uri.startsWith('ipfs://')) {
                    url = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
                
                    // If URI is a complete URL, try getting metadata
                    if (url.startsWith('http')) {
                const response = await fetch(url);
                if (response.ok) {
                    metadata = await response.json();
                            console.log(`Successfully got metadata for NFT #${tokenId}:`, metadata);
                        }
                    }
                    // If URI is Base64 encoded JSON
                    else if (uri.startsWith('data:application/json;base64,')) {
                        try {
                            const base64 = uri.substring('data:application/json;base64,'.length);
                            const jsonStr = atob(base64);
                            metadata = JSON.parse(jsonStr);
                            console.log(`Successfully parsed Base64 metadata for NFT #${tokenId}:`, metadata);
                        } catch (e) {
                            console.warn(`Error parsing Base64 metadata for NFT #${tokenId}:`, e);
                        }
                }
            } catch (error) {
                    console.warn(`Error getting metadata for NFT #${tokenId}:`, error);
                }
            }
            
            // Process image URL
            let imageUrl = metadata.image || '../../resources/images/placeholder.png';
            if (imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // If PetNFTService exists, try using it to get image URL
            if (window.PetNFTService && typeof window.PetNFTService.getPetImageUrl === 'function') {
                const petData = {
                    tokenId,
                    quality,
                    metadata
                };
                const serviceUrl = window.PetNFTService.getPetImageUrl(petData);
                if (serviceUrl) {
                    imageUrl = serviceUrl;
                }
            }
            
            return {
                name: metadata.name || `NFT #${tokenId}`,
                description: metadata.description || '',
                imageUrl: imageUrl,
                image: imageUrl, // Add image property to ensure compatibility
                uri: uri,
                quality: quality,
                level: level,
                accumulatedFood: accumulatedFood,
                attributes: metadata.attributes || [],
                metadata: metadata
            };
        } catch (error) {
            console.error(`Error getting data for NFT #${tokenId}:`, error);
            // Return basic information to ensure UI can display normally
            return {
                name: `NFT #${tokenId}`,
                description: 'Failed to load',
                imageUrl: '../../resources/images/placeholder.png',
                uri: '',
                quality: 1,
                level: 1,
                accumulatedFood: 0,
                attributes: [],
                metadata: null
            };
        }
    }
    
    /**
     * create market item card
     */
    function createMarketItemCard(item) {
        if (window.MarketItemCard && typeof MarketItemCard.createCard === 'function') {
            try {
            // use the method in marketItemCard.js to create a card
            const card = MarketItemCard.createCard(item);
            
            // bind events
            const buyBtn = card.querySelector('.buy-btn');
            const detailsBtn = card.querySelector('.details-btn');
            
            if (buyBtn) {
                buyBtn.addEventListener('click', () => handleBuyNFT(item));
                // add attribute for i18n processing
                buyBtn.setAttribute('data-i18n', 'button.buy');
            }
            
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => showNFTDetails(item));
                // add attribute for i18n processing
                detailsBtn.setAttribute('data-i18n', 'button.details');
            }
            
            return card;
            } catch (error) {
                console.error('使用MarketItemCard创建卡片时出错:', error);
                // return basic card when error
                return createBasicMarketItemCard(item);
            }
        } else {
            // create basic card
            return createBasicMarketItemCard(item);
        }
    }
    
    /**
     * create basic market item card (fallback method)
     */
    function createBasicMarketItemCard(item) {
        const div = document.createElement('div');
        div.className = 'market-item';
        div.setAttribute('data-token-id', item.tokenId);
        
        // get quality name
        const qualityName = getQualityName(item.quality);
            
        div.innerHTML = `
        <div class="quality-tag quality-${qualityName.toLowerCase()}">${qualityName}</div>
            <div class="item-image">
                <img src="${item.imageUrl || '../../resources/images/placeholder.png'}" 
                 alt="${item.name || `NFT #${item.tokenId}`}" 
                     onerror="this.outerHTML='<div style=\\'font-size:4rem;\\'>🖼️</div>'">
            </div>
            <div class="item-info">
            <h4 style="color: #333;">${item.name || `NFT #${item.tokenId}`}</h4>
            <div class="item-token-id">ID: ${item.tokenId}</div>
            <div class="item-pet-level">等级: ${item.level || '1'}</div>
            <div class="item-price">
                <span class="price-value">${formatPrice(item.price)}</span>
                <span class="price-currency" data-token-address="${item.paymentToken || ''}">${getTokenName(item.paymentToken)}</span>
            </div>
        </div>
        <button class="item-btn buy-btn" data-i18n="button.buy" style="color: white; border-radius: 0;">购买</button>
        <button class="item-btn details-btn" data-i18n="button.details" style="color: white; border-radius: 0;">详情</button>
        `;
        
        // bind events
        const buyBtn = div.querySelector('.buy-btn');
        const detailsBtn = div.querySelector('.details-btn');
        
        if (buyBtn) {
            buyBtn.addEventListener('click', () => handleBuyNFT(item));
        }
        
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => showNFTDetails(item));
        }
        
        return div;
    }
    
    /**
     * format price
     */
    function formatPrice(price) {
        if (!price) return '0';
        
        // try using MarketItemCard's formatting function
        if (window.MarketItemCard && typeof MarketItemCard.formatTokenPrice === 'function') {
            return MarketItemCard.formatTokenPrice(price);
        }
        
        // simple formatting
        try {
            // for example, divide by 10^18
            const priceNum = BigInt(price);
            const divisor = BigInt(10 ** 18);
            const integerPart = (priceNum / divisor).toString();
            const fractionalPart = (priceNum % divisor).toString().padStart(18, '0');
            
            // remove trailing 0s from fractional part
            const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
            
            // combine integer and fractional parts
            if (trimmedFractionalPart.length > 0) {
                return `${integerPart}.${trimmedFractionalPart}`;
            } else {
                return integerPart;
            }
        } catch (e) {
            return price.toString();
        }
    }
    
    /**
     * process specific token ID
     */
    async function processTokenById(tokenId, items, targetQuality) {
        try {
            // get token owner
            const owner = await pwNFTContract.methods.ownerOf(tokenId).call();
            
            // check if the token is listed on the market
            if (owner.toLowerCase() === nftMarketplaceContract.options.address.toLowerCase()) {
                // get the listing information
                await checkAndProcessListing(tokenId, items);
            }
        } catch (error) {
            // ignore nonexistent token error
            if (!error.message.includes('nonexistent token')) {
                console.warn(`Error processing token ID ${tokenId}:`, error);
            }
        }
    }
    
    /**
     * check and process token listing information
     */
    async function checkAndProcessListing(tokenId, items) {
        try {
            console.log(`checking and processing token listing information for token ID ${tokenId}`);
            
            // first check cache
            const cachedListing = getListingFromCache(tokenId);
            if (cachedListing && cachedListing.active) {
                // directly use the cached listing information to process
                await processListing(items, tokenId, cachedListing);
                return;
            }

            // get the listing information
            const listing = await nftMarketplaceContract.methods.listings(tokenId).call();
            console.log(`token ID ${tokenId} listing information:`, listing);
            
            // check if the token is listed
            if (listing && listing.seller !== '0x0000000000000000000000000000000000000000') {
                // ensure quality is a valid number
                const qualityValue = parseInt(listing.quality);
                console.log(`token ID ${tokenId} quality:`, qualityValue);
                console.log(`token ID ${tokenId} level:`, listing.level);
                console.log(`token ID ${tokenId} accumulated food:`, listing.accumulatedFood);
                
                // convert to standard format
                const formattedListing = {
                    seller: listing.seller,
                    tokenId: parseInt(tokenId),
                    paymentToken: listing.paymentToken,
                    price: listing.price,
                    active: listing.active,
                    quality: qualityValue,
                    level: parseInt(listing.level || 1),
                    accumulatedFood: parseInt(listing.accumulatedFood || 0)
                };
                
                // save to cache
                saveListingToCache(tokenId, formattedListing);
                
                // process listing information
                await processListing(items, tokenId, formattedListing);
            }
        } catch (error) {
            // ignore error, continue processing other tokens
            console.debug(`error checking token ID ${tokenId}, maybe not listed:`, error);
        }
    }
}); 