const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Debug object for marketplace
    const debug = {
        log: function(message, ...args) {
            console.log('[Marketplace Debug]', message, ...args);
        },
        error: function(message, ...args) {
            console.error('[Marketplace Debug]', message, ...args);
        },
        warn: function(message, ...args) {
            console.warn('[Marketplace Debug]', message, ...args);
        }
    };
    
    /**
     * Check if private key wallet should be used
     * @returns {boolean} - Whether private key wallet should be used
     */
    function shouldUsePrivateKeyWallet() {
        if (!window.SecureWalletManager) {
            return false;
        }
        
        try {
            return window.SecureWalletManager.isWalletReady() && 
                   window.SecureWalletManager.getWeb3() && 
                   window.SecureWalletManager.getAddress();
        } catch (error) {
            debug.error('Error checking private key wallet status:', error);
            return false;
        }
    }
    
    /**
     * Get private key wallet status
     * @returns {object} - Private key wallet status
     */
    function getPrivateKeyWalletStatus() {
        if (!window.SecureWalletManager) {
            return { hasWallet: false, activeAddress: null, isReady: false };
        }
        
        try {
            const isReady = window.SecureWalletManager.isWalletReady();
            const address = window.SecureWalletManager.getAddress();
            const web3Instance = window.SecureWalletManager.getWeb3();
            
            return {
                hasWallet: isReady && !!address && !!web3Instance,
                activeAddress: address,
                isReady: isReady,
                web3Available: !!web3Instance
            };
        } catch (error) {
            debug.error('Error getting private key wallet status:', error);
            return { hasWallet: false, activeAddress: null, isReady: false };
        }
    }
    
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
                // Check private key wallet first, then check connected wallets
                checkPrivateKeyWallet().then(hasPrivateKey => {
                    if (!hasPrivateKey) {
                checkWalletStatus();
                    }
                });
            };
        }
        
        // If iframe is loaded, check wallet status directly
        if (walletFrame && walletFrame.complete) {
            // Check private key wallet first, then check connected wallets
            checkPrivateKeyWallet().then(hasPrivateKey => {
                if (!hasPrivateKey) {
            checkWalletStatus();
                }
            });
        } else {
            // If no iframe, still check private key wallet
            checkPrivateKeyWallet().then(hasPrivateKey => {
                if (!hasPrivateKey) {
                    checkWalletStatus();
                }
            });
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
        // But wait a bit to allow SecureWalletManager to initialize first
        // If SecureWalletManager is available, wait longer to ensure it's ready
        const waitTime = window.SecureWalletManager ? 3000 : 1000;
        console.log(`Waiting ${waitTime}ms before initializing marketplace...`);
        
        setTimeout(() => {
            tryInitializeMarketplace();
        }, waitTime);
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
        
        // First priority: Check if SecureWalletManager is available and wait for it to be ready
        if (window.SecureWalletManager) {
            console.log('SecureWalletManager detected, ensuring it is fully ready...');
            
            // Wait for SecureWalletManager to be fully initialized
            waitForSecureWalletManager().then((isReady) => {
                if (isReady && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
                    console.log('SecureWalletManager is ready and has private key wallet, using it for marketplace');
                    
                    // Double check wallet status to ensure web3Available is true
                    const walletStatus = window.SecureWalletManager.getWalletStatus();
                    if (!walletStatus.web3Available) {
                        console.error('SecureWalletManager ready but Web3 not available, trying fallback');
                        tryFallbackInitialization();
                        return;
                    }
                    
                    // Get Web3 instance from SecureWalletManager
                    const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                    if (privateKeyWeb3) {
                        console.log('Using SecureWalletManager Web3 instance for marketplace');
                        web3 = privateKeyWeb3;
                        window.web3 = privateKeyWeb3;
                        
                        // Test Web3 connection before initializing contracts
                        privateKeyWeb3.eth.getBlockNumber().then(() => {
                            console.log('Web3 connection test passed, initializing contracts...');
                            
                            // Initialize contracts with private key wallet Web3
                            initContracts(privateKeyWeb3).then(() => {
                                // Load market data after contracts are initialized
                                console.log('Contracts initialized with SecureWalletManager, loading marketplace data...');
                                loadMarketplaceData();
                            }).catch(error => {
                                console.error('Failed to initialize contracts with private key wallet:', error);
                                showTransactionStatus('Failed to initialize contracts with private key wallet', 'warning');
                                
                                // Try fallback initialization
                                tryFallbackInitialization();
                            });
                        }).catch(error => {
                            console.error('Web3 connection test failed:', error.message);
                            tryFallbackInitialization();
                        });
                        return;
                    } else {
                        console.warn('SecureWalletManager available but Web3 instance not ready, trying fallback');
                        tryFallbackInitialization();
                        return;
                    }
                } else {
                    console.log('SecureWalletManager not ready or no private key wallet, trying fallback initialization');
                    tryFallbackInitialization();
                    return;
                }
            }).catch(error => {
                console.error('Error waiting for SecureWalletManager:', error);
                tryFallbackInitialization();
            });
            return;
        }
        
        // If SecureWalletManager is not available, proceed with fallback
        console.log('SecureWalletManager not available, proceeding with fallback initialization');
        tryFallbackInitialization();
    }
    
    /**
     * Wait for SecureWalletManager to be fully ready
     */
    async function waitForSecureWalletManager() {
        if (!window.SecureWalletManager) {
            console.log('SecureWalletManager not available');
            return false;
        }
        
        // Wait for SecureWalletManager to finish initializing
        let attempts = 0;
        const maxAttempts = 25; // Reduced from 50 to 25 (5 seconds total wait time)
        
        while (window.SecureWalletManager.isInitializing && attempts < maxAttempts) {
            console.log(`Waiting for SecureWalletManager initialization... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        if (window.SecureWalletManager.isInitializing) {
            console.warn('SecureWalletManager still initializing after timeout');
            return false;
        }
        
        // Check wallet status with retry mechanism (like shop page)
        let walletStatus = null;
        let retryCount = 0;
        const maxRetries = 2; // Reduced from 3 to 2
        
        while (retryCount < maxRetries) {
            try {
                walletStatus = window.SecureWalletManager.getWalletStatus();
                console.log(`Private key wallet status (attempt ${retryCount + 1}):`, walletStatus);
                
                // Key check: ensure web3Available is true (like shop page)
                if (walletStatus.usingPrivateKey && walletStatus.activeAddress && walletStatus.web3Available) {
                    console.log('Private key wallet is ready and Web3 is available');
                    break;
                } else if (walletStatus.usingPrivateKey && walletStatus.activeAddress && !walletStatus.web3Available) {
                    console.log('Private key wallet has address but Web3 not ready, attempting to reinitialize...');
                    
                    // Try to force reinitialize (like shop page)
                    const reinitSuccess = await window.SecureWalletManager.forceReinitializeAccount();
                    if (reinitSuccess) {
                        console.log('Reinitialization successful, checking status again...');
                        walletStatus = window.SecureWalletManager.getWalletStatus();
                        if (walletStatus.web3Available) {
                            console.log('Web3 is now available after reinitialization');
                            break;
                        }
                    }
                }
                
                // If we reach here, wallet is not ready yet
                if (retryCount < maxRetries - 1) {
                    console.log(`Wallet not ready, retrying in 1 second... (${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                retryCount++;
            } catch (error) {
                console.error(`Error checking wallet status (attempt ${retryCount + 1}):`, error);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // Final validation (like shop page)
        if (walletStatus && walletStatus.usingPrivateKey && walletStatus.activeAddress && walletStatus.web3Available) {
            // Additional check to ensure Web3 instance is available and working
            const web3Instance = window.SecureWalletManager.getWeb3();
            if (!web3Instance) {
                console.warn('SecureWalletManager ready but Web3 instance not available');
                return false;
            }
            
            // Test the Web3 connection (like shop page)
            try {
                await web3Instance.eth.getBlockNumber();
                console.log('SecureWalletManager Web3 instance is working and connected');
                return true;
            } catch (error) {
                console.warn('SecureWalletManager Web3 instance test failed:', error.message);
                return false;
            }
        }
        
        console.log('SecureWalletManager not ready or no private key wallet available');
        return false;
    }
    
    /**
     * Try fallback initialization when private key wallet fails
     */
    function tryFallbackInitialization() {
        console.log('Attempting fallback initialization...');
        
        // Try to get the global Web3 instance
        let fallbackWeb3Instance = null;
        
        // First priority: Use BSC testnet RPC directly to avoid network issues
        const bscTestnetRpc = 'https://bsc-testnet-dataseed.bnbchain.org/';
        console.log('Fallback: Creating Web3 instance with BSC testnet RPC:', bscTestnetRpc);
        fallbackWeb3Instance = new Web3(bscTestnetRpc);
        
        // Verify we're on the correct network
        fallbackWeb3Instance.eth.net.getId().then(networkId => {
            console.log('Fallback Web3 network ID:', networkId);
            if (networkId !== 97) {
                console.warn('⚠️ Fallback Web3 still on wrong network:', networkId);
            } else {
                console.log('✅ Fallback Web3 connected to BSC testnet');
            }
        }).catch(error => {
            console.error('Failed to get network ID from fallback Web3:', error);
        });
        
        // Secondary fallback: Try window.ethereum if BSC RPC fails
        if (!fallbackWeb3Instance) {
            if (window.ethereum) {
                fallbackWeb3Instance = new Web3(window.ethereum);
                console.log('Fallback: Create Web3 instance using window.ethereum');
            } else if (window.web3) {
                fallbackWeb3Instance = new Web3(window.web3.currentProvider);
                console.log('Fallback: Create Web3 instance using window.web3');
            }
        }
        
        if (fallbackWeb3Instance) {
            // Initialize contracts
            initContracts(fallbackWeb3Instance).then(() => {
                // Load market data
                loadMarketplaceData();
            }).catch(error => {
                console.error('Fallback initialization failed:', error);
                showTransactionStatus('Failed to initialize contracts, will load market data in read-only mode', 'warning');
                
                // Try to load data in read-only mode
                tryLoadMarketplaceDataReadOnly();
            });
        } else {
            console.log('Fallback failed, trying read-only mode');
            // Try to load data in read-only mode
            tryLoadMarketplaceDataReadOnly();
        }
    }
    
    /**
     * Try to load market data in read-only mode
     */
    function tryLoadMarketplaceDataReadOnly() {
        // Get current network from contractAddresses.js
        const currentNetwork = window.currentNetwork || window.CONTRACT_NETWORKS?.TEST || 'TEST';
        
        let rpcUrl;
        if (currentNetwork === 'MAIN' || currentNetwork === window.CONTRACT_NETWORKS?.MAIN) {
            rpcUrl = 'https://bsc-dataseed1.binance.org/';
            console.log('Using BSC Mainnet read-only Web3 instance');
        } else {
            rpcUrl = 'https://bsc-testnet-dataseed.bnbchain.org/';
            console.log('Using BSC Testnet read-only Web3 instance');
        }
        
        // Create a read-only Web3 instance using the appropriate RPC provider
        const readOnlyWeb3 = new Web3(rpcUrl);
        console.log(`Using read-only Web3 instance: ${rpcUrl}`);
        
        // Verify network before proceeding
        readOnlyWeb3.eth.net.getId().then(networkId => {
            console.log('Read-only Web3 network ID:', networkId);
            const expectedNetworkId = currentNetwork === 'MAIN' ? 56 : 97;
            
            if (networkId !== expectedNetworkId) {
                console.error(`❌ Read-only Web3 on wrong network: ${networkId}, expected: ${expectedNetworkId}`);
                showTransactionStatus('Failed to connect to the correct blockchain network', 'error');
                showLoading(false);
                return;
            }
            
            console.log('✅ Read-only Web3 connected to correct network');
            
            // Initialize read-only contracts
            initContracts(readOnlyWeb3, true).then(() => {
                // Load market data
                loadMarketplaceData();
            }).catch(error => {
                console.error('Failed to initialize read-only contracts:', error);
                showTransactionStatus('Failed to load market data, please check your network connection', 'error');
                showLoading(false);
            });
        }).catch(error => {
            console.error('Failed to get network ID from read-only Web3:', error);
            showTransactionStatus('Failed to connect to blockchain network', 'error');
            showLoading(false);
        });
    }
    
    /**
     * Initialize contracts
     * @param {Web3} web3Instance - Web3 instance
     * @param {boolean} readOnly - Whether to initialize in read-only mode
     */
    async function initContracts(web3Instance, readOnly = false) {
        try {
            console.log('Initializing contracts...');
            
            // Check if contracts are already initialized (prevent duplicate initialization)
            if (contractsInitialized && nftMarketplaceContract && pwNFTContract && !readOnly) {
                console.log('Contracts already initialized, skipping...');
                return;
            }
            
            // Handle private key wallet Web3 instance
            if (web3Instance) {
                web3 = web3Instance;
                // Set global web3 instance for other components
                window.web3 = web3Instance;
                console.log('Using provided Web3 instance');
            } else if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
                // Use private key wallet Web3 instance
                const walletStatus = window.SecureWalletManager.getWalletStatus();
                if (!walletStatus.web3Available) {
                    throw new Error('SecureWalletManager Web3 not available');
                }
                
                web3 = window.SecureWalletManager.getWeb3();
                if (web3) {
                    window.web3 = web3;
                    console.log('Using private key wallet Web3 instance');
                    
                    // Test Web3 connection
                    try {
                        await web3.eth.getBlockNumber();
                        console.log('Web3 connection test passed during contract initialization');
                    } catch (testError) {
                        throw new Error('Web3 connection test failed: ' + testError.message);
                    }
                } else {
                    throw new Error('Failed to get Web3 instance from private key wallet');
                }
            } else {
                throw new Error('No Web3 instance available');
            }
            
            // Verify Web3 instance is working
            if (!web3 || !web3.eth) {
                throw new Error('Invalid Web3 instance');
            }
            
            // Initialize NFT marketplace contract
            if (window.initNFTMarketplaceContract) {
                nftMarketplaceContract = window.initNFTMarketplaceContract(web3, window.getContractAddress);
                
                // Verify marketplace contract initialization
                if (!nftMarketplaceContract || !nftMarketplaceContract.methods) {
                    throw new Error('NFTMarketplace contract initialization failed');
                }
                
                // Verify contract has required methods
                if (!nftMarketplaceContract.methods.qualityListings || !nftMarketplaceContract.methods.listings) {
                    throw new Error('NFTMarketplace contract missing required methods');
                }
                
                // Verify contract address is valid
                if (!nftMarketplaceContract.options || !nftMarketplaceContract.options.address) {
                    throw new Error('NFTMarketplace contract address not set');
                }
                
                console.log('NFTMarketplace contract initialized successfully:', nftMarketplaceContract.options.address);
                
                // Additional debugging: Check if ABI has the expected methods
                const expectedMethods = ['FEE_PERCENTAGE', 'calculateFee', 'initialized', 'qualityListings', 'listings'];
                const availableMethods = Object.keys(nftMarketplaceContract.methods);
                console.log('Available contract methods:', availableMethods.slice(0, 10)); // Show first 10 methods
                
                const missingMethods = expectedMethods.filter(method => !nftMarketplaceContract.methods[method]);
                if (missingMethods.length > 0) {
                    console.warn('Missing expected methods:', missingMethods);
                }
                
                // Check current network and contract address
                const currentNetwork = window.getCurrentNetwork ? window.getCurrentNetwork() : 'Unknown';
                console.log('Current network:', currentNetwork);
                console.log('Contract address being used:', nftMarketplaceContract.options.address);
                
                // Test basic contract status
                try {
                    console.log('Testing basic contract status...');
                    
                    // First, try a direct RPC call to compare with Web3
                    console.log('🔍 Testing direct RPC call vs Web3...');
                    try {
                        const rpcUrl = 'https://bsc-testnet-dataseed.bnbchain.org/';
                        const response = await fetch(rpcUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'eth_call',
                                params: [{
                                    to: nftMarketplaceContract.options.address,
                                    data: '0x158ef93e' // initialized() method signature
                                }, 'latest'],
                                id: 1
                            })
                        });
                        const rpcResult = await response.json();
                        console.log('Direct RPC call result:', rpcResult);
                        
                        if (rpcResult.result) {
                            const isInitializedRPC = parseInt(rpcResult.result, 16) === 1;
                            console.log('Direct RPC - Contract initialized:', isInitializedRPC);
                        }
                    } catch (rpcError) {
                        console.warn('Direct RPC test failed:', rpcError.message);
                    }
                    
                    // Now try with Web3
                    console.log('🔍 Testing with Web3...');
                    
                    // Check if contract is initialized
                    const isInitialized = await nftMarketplaceContract.methods.initialized().call();
                    console.log('Web3 - Contract initialized status:', isInitialized);
                    
                    if (!isInitialized) {
                        console.warn('⚠️ Contract is not initialized! This will prevent marketplace functionality.');
                        showTransactionStatus('Marketplace contract is not initialized. Please contact the administrator.', 'warning');
                    }
                    
                    // Check fee percentage
                    const feePercentage = await nftMarketplaceContract.methods.FEE_PERCENTAGE().call();
                    console.log('Marketplace fee percentage:', feePercentage + '%');
                    
                    // Check if there are any accepted tokens
                    try {
                        const firstAcceptedToken = await nftMarketplaceContract.methods.acceptedTokensList(0).call();
                        console.log('First accepted payment token:', firstAcceptedToken);
                    } catch (tokenError) {
                        console.warn('No accepted payment tokens found or error accessing them:', tokenError.message);
                    }
                    
                    console.log('✅ Basic contract status check completed successfully');
                } catch (statusError) {
                    console.error('❌ Basic contract status check failed:', statusError.message);
                    
                    // If Web3 calls are failing but we know the contract works, there might be a provider issue
                    console.log('🔧 Attempting to diagnose Web3 provider issue...');
                    
                    // Check if we're using the right network
                    try {
                        const networkId = await web3.eth.net.getId();
                        console.log('Current network ID:', networkId);
                        console.log('Expected BSC Testnet ID: 97');
                        
                        if (networkId !== 97) {
                            console.error('❌ Wrong network! Currently on network', networkId, 'but need BSC Testnet (97)');
                            showTransactionStatus('Wrong network detected. Please switch to BSC Testnet.', 'error');
                            
                            // Try to switch to the correct BSC testnet provider
                            console.log('🔧 Attempting to switch to BSC testnet provider...');
                            try {
                                const bscTestnetRpc = 'https://bsc-testnet-dataseed.bnbchain.org/';
                                console.log('Creating new Web3 instance with BSC testnet RPC:', bscTestnetRpc);
                                
                                // Create new Web3 instance with correct RPC
                                const newWeb3 = new Web3(bscTestnetRpc);
                                
                                // Test the new connection
                                const newNetworkId = await newWeb3.eth.net.getId();
                                console.log('New Web3 network ID:', newNetworkId);
                                
                                if (newNetworkId === 97) {
                                    console.log('✅ Successfully connected to BSC testnet');
                                    web3 = newWeb3;
                                    window.web3 = newWeb3;
                                    
                                    // Reinitialize the marketplace contract with the new Web3 instance
                                    if (window.initNFTMarketplaceContract) {
                                        nftMarketplaceContract = window.initNFTMarketplaceContract(web3, window.getContractAddress);
                                        console.log('✅ Marketplace contract reinitialized with BSC testnet Web3');
                                    }
                                    
                                    showTransactionStatus('Successfully connected to BSC testnet', 'success');
                                } else {
                                    console.error('❌ New Web3 instance still on wrong network:', newNetworkId);
                                }
                            } catch (switchError) {
                                console.error('❌ Failed to switch to BSC testnet:', switchError.message);
                            }
                        }
                    } catch (networkError) {
                        console.error('Failed to get network ID:', networkError.message);
                    }
                    
                    // Don't throw error, continue with initialization
                }
            } 
            
            // Initialize RareNFTTransactionIndexer contract
            if (window.initRareNFTTransactionIndexerContract) {
                window.rareNFTTransactionIndexerContract = window.initRareNFTTransactionIndexerContract(web3, window.getContractAddress);
                console.log('RareNFTTransactionIndexer contract initialized');
            } else {
                console.warn('initRareNFTTransactionIndexerContract function not available');
            }
            
            // Initialize PwNFT contract
            const pwNftAddress = window.getContractAddress ? window.getContractAddress('PwNFT') : null;
            if (pwNftAddress) {
                const pwNftAbi = window.PwNFTABI || window.GENERIC_ERC20_ABI;
                if (pwNftAbi) {
                    pwNFTContract = new web3.eth.Contract(pwNftAbi, pwNftAddress);
                    
                    // Verify PwNFT contract initialization
                    if (!pwNFTContract || !pwNFTContract.methods) {
                        throw new Error('PwNFT contract initialization failed');
                    }
                    
                    console.log('PwNFT contract initialized successfully:', pwNftAddress);
                } else {
                    throw new Error('PwNFT ABI is not available');
                }
            } else {
                throw new Error('Failed to get PwNFT contract address');
            }
            
            // Initialize NFTManager contract
            if (window.initNFTManager) {
                nftManagerContract = window.initNFTManager(web3, window.getContractAddress);
                console.log('NFTManager contract initialized');
            } else {
                console.warn('initNFTManager function is not available, NFT images may not display correctly');
            }
            
            // Test contract connectivity before marking as initialized
            try {
                console.log('Testing contract connectivity...');
                
                // Test marketplace contract with basic method first
                try {
                    // First check if contract is deployed by checking if code exists at the address
                    const contractCode = await web3.eth.getCode(nftMarketplaceContract.options.address);
                    if (contractCode === '0x' || contractCode === '0x0') {
                        console.warn('Contract not deployed at address: ' + nftMarketplaceContract.options.address);
                        // Don't throw error, just log warning and continue
                    } else {
                        console.log('Contract is deployed, code length:', contractCode.length);
                    }
                    
                    // Try FEE_PERCENTAGE first (this is a constant that should always work)
                    try {
                        const feePercentage = await nftMarketplaceContract.methods.FEE_PERCENTAGE().call();
                        console.log('Marketplace contract FEE_PERCENTAGE:', feePercentage);
                    } catch (feePercentageError) {
                        console.warn('Contract FEE_PERCENTAGE method call failed:', feePercentageError.message);
                        
                        // Try calculateFee method with a test value
                        try {
                            const testFee = await nftMarketplaceContract.methods.calculateFee('1000000000000000000').call(); // 1 ETH
                            console.log('Marketplace contract calculateFee test result:', testFee);
                        } catch (calculateFeeError) {
                            console.warn('Contract calculateFee method also failed:', calculateFeeError.message);
                            
                            // Try initialized method
                            try {
                                const isInitialized = await nftMarketplaceContract.methods.initialized().call();
                                console.log('Marketplace contract initialized status:', isInitialized);
                                
                                if (!isInitialized) {
                                    console.warn('Contract is deployed but not initialized. This may cause issues with marketplace functionality.');
                                }
                            } catch (initializedError) {
                                console.warn('Contract initialized method also failed:', initializedError.message);
                                // Don't throw error here, as the contract might still work for qualityListings
                            }
                        }
                    }
                } catch (deploymentCheckError) {
                    console.warn('Contract deployment check failed:', deploymentCheckError.message);
                    // Continue anyway, the contract might still work
                }
                
                // Test PwNFT contract
                try {
                    const nftName = await pwNFTContract.methods.name().call();
                    console.log('PwNFT contract name:', nftName);
                } catch (nftError) {
                    console.warn('PwNFT contract name test failed:', nftError.message);
                }
                
                console.log('Basic contract connectivity tests completed');
            } catch (testError) {
                // Log warning but don't fail initialization
                console.warn('Contract connectivity test warning:', testError.message);
                
                // Only throw error if it's not a "no listings" type error
                if (!testError.message.includes("Returned values aren't valid") && 
                    !testError.message.includes("execution reverted")) {
                    throw new Error('Contract connectivity test failed: ' + testError.message);
                }
            }
            
            // Initialize successfully, set status to true
            contractsInitialized = true;
            console.log('All contracts initialized successfully');
            
            // Initialize NFT listing and manage listing modals
            if (!readOnly) {
                const modalSuccess = initMarketplaceModals();
                if (!modalSuccess) {
                    console.warn('Failed to initialize marketplace modals, but contracts are ready');
                }
            }
            
            // Don't automatically load marketplace data here - let the calling function decide when to load
            console.log('Contracts initialization completed, ready for data loading');
        } catch (error) {
            console.error('Failed to initialize contracts:', error);
            showTransactionStatus('Failed to initialize contracts: ' + error.message, 'error');
            contractsInitialized = false;
            
            // Reset contract instances on failure
            nftMarketplaceContract = null;
            pwNFTContract = null;
            nftManagerContract = null;
            
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
    async function loadMarketplaceData(forceRefresh = false, silentMode = false) {
        try {
            // Clear expired listing information cache
            clearExpiredListingsCache();
            
            // Show loading animation (only if not in silent mode)
            if (!silentMode) {
            showLoading(true);
            }
            
            console.log('Loading market data...' + (forceRefresh ? ' (force refresh)' : '') + (silentMode ? ' (silent mode)' : ''));
            
            // Check if contracts are initialized
            if (!nftMarketplaceContract) {
                console.error('Failed to load market data: NFT marketplace contract not initialized');
                if (!silentMode) {
                showTransactionStatus('Failed to load market data: Contract not initialized', 'error');
                }
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
                marketListings = [];
                
                // Show appropriate message based on whether contracts are working (only if not silent)
                if (!silentMode) {
                const marketItemsContainer = document.querySelector('.market-items');
                if (marketItemsContainer) {
                    // Check if this is due to Web3 provider issues
                    const isProviderIssue = false; // Remove error reference since it's not in scope here
                    
                    let message;
                    if (isProviderIssue) {
                        message = i18n ? i18n.t('market.providerIssue') : 'Unable to connect to blockchain. The marketplace may be empty or there may be a connection issue.';
                    } else {
                        message = i18n ? i18n.t('market.noItems') : 'No NFTs listed in the market';
                    }
                    
                    marketItemsContainer.innerHTML = `<div class="no-items-message">${message}</div>`;
                }
                
                // Update pagination for empty state
                updatePaginationInfo();
                }
            }
            
            // Hide loading animation
            if (!silentMode) {
            showLoading(false);
            }
        } catch (error) {
            console.error('Failed to load market data:', error);
            
            // Only show error to user if not in silent mode
            if (!silentMode) {
            // Show user-friendly error message based on the type of error
            let errorMessage = 'Failed to load market data';
            if (error.message.includes('Contract not deployed')) {
                errorMessage = 'Marketplace contract is not deployed on this network';
            } else if (error.message.includes('not initialized')) {
                errorMessage = 'Marketplace contract is not properly initialized';
            } else if (error.message.includes('Web3')) {
                errorMessage = 'Please connect your wallet to view the marketplace';
            } else {
                errorMessage = 'Failed to load market data: ' + error.message;
            }
            
            showTransactionStatus(errorMessage, 'error');
            
            // Show empty marketplace with helpful message
            const marketItemsContainer = document.querySelector('.market-items');
            if (marketItemsContainer) {
                const helpMessage = i18n ? i18n.t('market.loadError') : 'Unable to load marketplace data. Please check your connection and try again.';
                marketItemsContainer.innerHTML = `
                    <div class="no-items-message">
                        <p>${helpMessage}</p>
                        <button onclick="location.reload()" class="retry-btn">Retry</button>
                    </div>
                `;
            }
            
            showLoading(false);
            }
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
     * @param {number} quality - Quality level
     * @param {Array} items - Array to store results
     * @param {boolean} forceRefresh - Whether to force reload from chain
     */
    async function loadNFTsByQuality(quality, items, forceRefresh = false) {
        try {
            console.log(`Loading NFTs of quality ${quality}...`);
            
            // Test Web3 connection first
            try {
                const blockNumber = await web3.eth.getBlockNumber();
                console.log(`Web3 connection test passed, current block: ${blockNumber}`);
                
                // Also test the RPC endpoint being used
                const provider = web3.currentProvider;
                if (provider && provider.host) {
                    console.log('Current Web3 provider:', provider.host);
                } else if (provider && provider.connection && provider.connection.url) {
                    console.log('Current Web3 provider:', provider.connection.url);
                } else {
                    console.log('Web3 provider info:', typeof provider);
                }
                
                // Test a simple contract call to verify the connection works with contracts
                try {
                    const testCode = await web3.eth.getCode(nftMarketplaceContract.options.address);
                    if (testCode === '0x' || testCode === '0x0') {
                        console.error('❌ Contract has no code at address:', nftMarketplaceContract.options.address);
                        throw new Error('Contract not deployed at the specified address');
                    } else {
                        console.log('✅ Contract code verified, length:', testCode.length);
                    }
                } catch (codeError) {
                    console.error('❌ Failed to get contract code:', codeError.message);
                    throw new Error('Failed to verify contract deployment: ' + codeError.message);
                }
            } catch (web3Error) {
                console.error('Web3 connection test failed:', web3Error.message);
                throw new Error('Web3 connection failed: ' + web3Error.message);
            }
            
            // Comprehensive contract validation before making calls
            if (!nftMarketplaceContract) {
                console.error('NFT Marketplace contract not initialized');
                return;
            }
            
            // Verify contract has the required method
            if (!nftMarketplaceContract.methods || !nftMarketplaceContract.methods.qualityListings) {
                console.error('NFT Marketplace contract missing qualityListings method');
                return;
            }
            
            // Verify contract address is valid
            if (!nftMarketplaceContract.options || !nftMarketplaceContract.options.address) {
                console.error('NFT Marketplace contract address not set');
                return;
            }
            
            console.log('Contract validation passed:', {
                address: nftMarketplaceContract.options.address,
                hasQualityListings: !!nftMarketplaceContract.methods.qualityListings
            });
            
            // Test if there are any listings at all by checking multiple qualities
            console.log('Testing for any existing listings...');
            let hasAnyListings = false;
            for (let testQuality = 0; testQuality <= 4; testQuality++) {
                try {
                    const testTokenId = await nftMarketplaceContract.methods.qualityListings(testQuality, 0).call();
                    if (testTokenId && testTokenId !== '0') {
                        console.log(`Found listing in quality ${testQuality}: tokenId ${testTokenId}`);
                        hasAnyListings = true;
                        break;
                    }
                } catch (error) {
                    // Expected if no listings for this quality
                    console.log(`No listings found for quality ${testQuality}`);
                }
            }
            
            if (!hasAnyListings) {
                console.log('No listings found in any quality level - marketplace appears to be empty');
                return; // Exit early if marketplace is completely empty
            }
            
            console.log(`Now specifically checking quality ${quality}...`);
            
            // Ensure SecureWalletManager is ready before making contract calls
            if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
                // Check wallet status to ensure web3Available is true (like shop page)
                const walletStatus = window.SecureWalletManager.getWalletStatus();
                console.log('Checking wallet status before contract calls:', walletStatus);
                
                if (!walletStatus.web3Available) {
                    console.error('SecureWalletManager Web3 not available, cannot make contract calls');
                    return;
                }
                
                // Wait for SecureWalletManager to be fully ready if still initializing
                let attempts = 0;
                const maxAttempts = 30;
                
                while (window.SecureWalletManager.isInitializing && attempts < maxAttempts) {
                    console.log(`SecureWalletManager still initializing, waiting... (${attempts + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                }
                
                if (window.SecureWalletManager.isInitializing) {
                    console.warn('SecureWalletManager still initializing after timeout, aborting contract calls');
                    return;
                }
                
                // Ensure Web3 instance is available and contracts are using the correct instance
                const secureWeb3 = window.SecureWalletManager.getWeb3();
                if (!secureWeb3) {
                    console.error('SecureWalletManager Web3 instance not available');
                    return;
                }
                
                // Test Web3 connection before proceeding (like shop page)
                try {
                    await secureWeb3.eth.getBlockNumber();
                    console.log('Web3 connection test passed, proceeding with contract calls');
                } catch (error) {
                    console.error('Web3 connection test failed:', error.message);
                    return;
                }
                
                // Verify that the marketplace contract is using the correct Web3 instance
                if (nftMarketplaceContract && nftMarketplaceContract.currentProvider !== secureWeb3.currentProvider) {
                    console.warn('Marketplace contract using different Web3 instance, reinitializing...');
                    try {
                        // Reinitialize contracts with the correct Web3 instance
                        await initContracts(secureWeb3);
                        console.log('Contracts reinitialized with SecureWalletManager Web3 instance');
                    } catch (error) {
                        console.error('Failed to reinitialize contracts:', error);
                        return;
                    }
                }
            }
            
            // Additional contract validation after potential reinitialization
            if (!nftMarketplaceContract || !nftMarketplaceContract.methods || !nftMarketplaceContract.methods.qualityListings) {
                console.error('Contract validation failed after reinitialization');
                return;
            }
            
            // Test a simple contract call first to ensure everything is working
            try {
                console.log('Testing contract connectivity...');
                
                // Skip the basic connectivity test since we already did it in initContracts
                // Just proceed with the qualityListings test
                console.log('Skipping basic connectivity test, proceeding with qualityListings test...');
                
                // Now test the qualityListings method with better error handling
                try {
                    const testCall = await nftMarketplaceContract.methods.qualityListings(quality, 0).call();
                    console.log('Contract connectivity test passed, result:', testCall);
                } catch (qualityError) {
                    // This is expected if there are no listings for this quality
                    if (qualityError.message.includes("Returned values aren't valid") || 
                        qualityError.message.includes("execution reverted") ||
                        qualityError.message.includes("invalid opcode") ||
                        qualityError.message.includes("out of gas") ||
                        qualityError.message.includes("revert")) {
                        console.log(`No listings found for quality ${quality} (this is normal for empty marketplace)`);
                        // This is normal, continue with the function but expect no results
                    } else {
                        // This is a real connectivity issue
                        throw qualityError;
                    }
                }
                
                console.log('Contract connectivity verification completed');
            } catch (testError) {
                console.error('Contract connectivity test failed:', testError.message);
                
                // Don't try to reinitialize here, just log the error and continue
                // The contract might still work for getting listings
                console.log('Continuing with listing retrieval despite connectivity test failure...');
            }
            
            const qualityTokenIds = [];
            let index = 0;
            let hasMoreListings = true;
            const MAX_QUALITY_ITEMS = 1000; // Prevent infinite loops
            const MAX_RETRIES = 3;
            
            // Iterate to get all NFT TokenIds for this quality
            while (hasMoreListings && index < MAX_QUALITY_ITEMS) {
                let retryCount = 0;
                let success = false;
                
                while (retryCount < MAX_RETRIES && !success) {
                    try {
                        console.log(`Getting quality ${quality} listing at index ${index} (attempt ${retryCount + 1})`);
                        
                        // Add timeout to contract call to prevent hanging
                        const tokenId = await Promise.race([
                            nftMarketplaceContract.methods.qualityListings(quality, index).call(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Contract call timeout')), 15000) // Increased timeout to 15 seconds
                            )
                        ]);
                        
                        console.log(`Quality ${quality} index ${index} returned tokenId:`, tokenId);
                        
                        // Fix: Remove check for tokenId !== '0', as 0 is also a valid tokenId
                        if (tokenId !== undefined && tokenId !== null) {
                            qualityTokenIds.push(tokenId);
                            index++;
                            success = true;
                            console.log(`Successfully added tokenId ${tokenId} to quality ${quality} list`);
                        } else {
                            console.log(`No more listings for quality ${quality} at index ${index}`);
                            hasMoreListings = false;
                            success = true;
                        }
                    } catch (error) {
                        console.log(`Contract call attempt ${retryCount + 1} failed for quality ${quality}, index ${index}:`, error.message);
                        
                        // If it's a "Returned values aren't valid" error and this is the first index, 
                        // it likely means there are no listings for this quality
                        if ((error.message.includes("Returned values aren't valid") || 
                             error.message.includes("execution reverted") ||
                             error.message.includes("revert")) && index === 0) {
                            console.log(`No listings found for quality ${quality} (this is normal)`);
                            hasMoreListings = false;
                            success = true;
                            break;
                        }
                        
                        // If it's any of these errors at index > 0, we've reached the end
                        if (error.message.includes("Returned values aren't valid") || 
                            error.message.includes("execution reverted") ||
                            error.message.includes("revert") ||
                            error.message.includes("invalid opcode")) {
                            console.log(`Reached end of quality ${quality} listings at index ${index}`);
                            hasMoreListings = false;
                            success = true;
                            break;
                        }
                        
                        retryCount++;
                        
                        if (retryCount < MAX_RETRIES) {
                            console.log(`Retrying contract call (${retryCount + 1}/${MAX_RETRIES})...`);
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Increased retry delay to 2 seconds
                        } else {
                            console.log(`Reached end of quality ${quality} listings or error occurred after ${MAX_RETRIES} retries:`, error.message);
                            hasMoreListings = false;
                            success = true;
                        }
                    }
                }
            }
            
            console.log(`Finished scanning quality ${quality}, found ${qualityTokenIds.length} tokenIds:`, qualityTokenIds);
            
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
                await loadMarketplaceData(true, true); // Use silent mode to avoid showing errors
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
     * Buy NFT from marketplace
     * @param {object} nft - NFT object to buy
     */
    async function buyNFTFromMarketplace(nft) {
        try {
            showLoading(true);
            showTransactionStatus('Preparing to buy NFT...', 'info');
            
            // Validate NFT object
            if (!nft || !nft.tokenId || !nft.paymentToken) {
                throw new Error('Invalid NFT data provided');
            }
            
            // Validate contracts are initialized
            if (!nftMarketplaceContract) {
                throw new Error('Marketplace contract not initialized');
            }
            
            console.log('Buying NFT:', nft);
            
            // Check if using private key wallet
            const usingPrivateKey = shouldUsePrivateKeyWallet();
            console.log('Using private key wallet for NFT purchase:', usingPrivateKey);
            
            // Get the current user address
            let userAddress;
            if (usingPrivateKey) {
                const walletStatus = getPrivateKeyWalletStatus();
                userAddress = walletStatus.activeAddress;
                
                if (!userAddress) {
                    throw new Error('Private key wallet address not available');
                }
                
                // Ensure we're using the correct Web3 instance
                web3 = window.SecureWalletManager.getWeb3();
                if (!web3) {
                    throw new Error('Failed to get Web3 instance from private key wallet');
                }
                } else {
                const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
                
                if (!userAddress) {
                    throw new Error('External wallet not connected');
                }
                }
                
            console.log('Buying NFT for user address:', userAddress);
            
            // Get payment token contract
                const tokenContract = await getERC20Contract(nft.paymentToken);
                if (!tokenContract) {
                throw new Error('Failed to get payment token contract');
            }
            
            // Check and setup approvals
            await setupApprovals(tokenContract, nft.price);
            
                showTransactionStatus('Purchasing NFT...', 'info');
                
            // Execute purchase transaction
            let transaction;
            if (usingPrivateKey) {
                // Use private key wallet for purchase transaction
                transaction = await window.SecureWalletManager.sendContractTransaction(
                        nftMarketplaceContract,
                        'buyNFT',
                        [nft.tokenId],
                        {
                        gas: 500000 // Higher gas limit for purchase
                        }
                    );
                } else {
                    // Use connected wallet
                transaction = await nftMarketplaceContract.methods.buyNFT(nft.tokenId).send({
                    from: userAddress,
                        gas: 500000
                });
                }
                
            console.log('NFT purchase successful:', transaction.transactionHash || transaction);
                
            // Close modal first
                closeNftModal();
            
            // Show success modal dialog immediately using ModalDialog
            if (window.ModalDialog) {
                const transactionHash = transaction.transactionHash || transaction;
                const successMessage = `
                    <div style="text-align: center; padding: 10px;">
                        <div style="color: #28a745; font-size: 1.2em; margin-bottom: 15px;">
                            🎉 NFT Purchase Successful!
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>NFT ID:</strong> #${nft.tokenId}
                        </div>
                        <div style="margin-bottom: 15px;">
                            <strong>Transaction Hash:</strong>
                        </div>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 0.9em; border: 1px solid #dee2e6;">
                            ${transactionHash}
                        </div>
                        <div style="margin-top: 10px; font-size: 0.9em; color: #6c757d;">
                            Your NFT has been successfully purchased and transferred to your wallet.
                        </div>
                    </div>
                `;
                
                window.ModalDialog.alert(successMessage, {
                    title: 'Purchase Successful',
                    confirmText: 'OK'
                });
            }
            
            // Show success status (but don't let refresh errors override it)
            showTransactionStatus('NFT purchased successfully!', 'success');
            
            // Clear cache and refresh data silently (don't show errors to user)
                    clearMarketCache();
            
            // Wait a moment before refreshing to ensure transaction is processed
            setTimeout(async () => {
                try {
                    await loadMarketplaceData(true, true); // Use silent mode to avoid showing errors
                    console.log('Marketplace data refreshed after purchase');
                } catch (refreshError) {
                    console.error('Failed to refresh marketplace data (silent):', refreshError);
                    // Don't show error to user since purchase was successful
                }
                }, 2000);
                
            // Return success
                return true;
            
        } catch (error) {
            console.error('Failed to buy NFT:', error);
            
            let errorMessage = error.message;
            if (errorMessage.includes('execution reverted')) {
                if (errorMessage.includes('insufficient allowance') || errorMessage.includes('transfer amount exceeds allowance')) {
                    errorMessage = 'Insufficient token allowance. Please approve more tokens.';
                } else if (errorMessage.includes('insufficient balance') || errorMessage.includes('transfer amount exceeds balance')) {
                    errorMessage = 'Insufficient token balance to complete purchase.';
                } else if (errorMessage.includes('NFT not for sale') || errorMessage.includes('not listed')) {
                    errorMessage = 'This NFT is no longer available for sale.';
                } else if (errorMessage.includes('cannot buy own NFT')) {
                    errorMessage = 'You cannot buy your own NFT.';
                }
            }
            
            showTransactionStatus('Purchase failed: ' + errorMessage, 'error');
            
            // Return failure
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
            // Validate tokenAddress parameter
            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                console.error('Invalid token address provided:', tokenAddress);
                return null;
            }
            
            // If there is a cached contract instance, return it directly
            if (currentPaymentTokenContract && 
                currentPaymentTokenContract.options && 
                currentPaymentTokenContract.options.address &&
                currentPaymentTokenContract.options.address.toLowerCase() === tokenAddress.toLowerCase()) {
                return currentPaymentTokenContract;
            }
            
            // Create new contract instance
            const abi = window.GENERIC_ERC20_ABI;
            if (!abi) {
                console.error('Cannot get ERC20 ABI');
                return null;
            }
            
            // Ensure we have a valid Web3 instance
            if (!web3) {
                console.error('Web3 instance not available');
                return null;
            }
            
            currentPaymentTokenContract = new web3.eth.Contract(abi, tokenAddress);
            console.log('Created ERC20 contract instance for:', tokenAddress);
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
            
            // Check if using private key wallet
            const usingPrivateKey = shouldUsePrivateKeyWallet();
            
            // Get the current user address
            let userAddress;
            if (usingPrivateKey) {
                const walletStatus = getPrivateKeyWalletStatus();
                userAddress = walletStatus.activeAddress;
                
                if (!userAddress) {
                    throw new Error('Private key wallet address not available');
                }
            } else {
                userAddress = currentAddress;
                
                if (!userAddress) {
                    throw new Error('External wallet not connected');
                }
            }
            
            console.log('Setting up approvals for user address:', userAddress);
            
            // 1. Check existing approval
            const allowance = await tokenContract.methods.allowance(
                userAddress, 
                nftMarketplaceContract.options.address
            ).call();
            
            // If there is enough approval, return directly
            if (BigInt(allowance) >= BigInt(amount)) {
                console.log('Enough approval');
                return { success: true };
            }
            
            showTransactionStatus('Need to approve token... Please confirm in wallet', 'warning');
            
            console.log('Using private key wallet for token approval:', usingPrivateKey);
            
            // 2. If approval is insufficient, perform approval
            if (window.ContractApprovalManager && window.ContractApprovalManager.setupNFTMarketplaceApprovals) {
                // Use ContractApprovalManager for approval
                console.log('Using ContractApprovalManager for NFT marketplace approvals...');
                const success = await window.ContractApprovalManager.setupNFTMarketplaceApprovals(
                    web3, 
                    userAddress, 
                    pwNFTContract, 
                    tokenContract
                );
                
                if (!success) {
                    throw new Error('Failed to approve via ContractApprovalManager');
                }
                
                console.log('ContractApprovalManager approval successful');
            } else {
                // Manual approval process
                console.log('Manual approval process');
                
                // Set a large approval amount
                const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
                
                let tx;
                if (usingPrivateKey) {
                    // Use private key wallet for approval transaction
                    console.log('Executing approval with private key wallet...');
                    tx = await window.SecureWalletManager.sendContractTransaction(
                        tokenContract,
                        'approve',
                        [nftMarketplaceContract.options.address, maxAmount],
                        {
                            gas: 100000
                        }
                    );
                } else {
                    // Use connected wallet
                    console.log('Executing approval with connected wallet...');
                    const gasEstimate = await tokenContract.methods.approve(
                        nftMarketplaceContract.options.address, 
                        maxAmount
                    ).estimateGas({ from: userAddress });
                    
                    tx = await tokenContract.methods.approve(
                        nftMarketplaceContract.options.address, 
                        maxAmount
                    ).send({
                        from: userAddress,
                        gas: Math.floor(gasEstimate * 1.5)
                    });
                }
                
                console.log('Approval transaction submitted:', tx.transactionHash || tx);
            }
            
            showTransactionStatus('Approval successful!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Failed to set approval:', error);
            
            // Enhanced error handling for approval
            let errorMessage = 'Failed to approve token: ';
            if (error.message.includes('User denied')) {
                errorMessage += 'Approval was cancelled by user';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds for approval transaction';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            showTransactionStatus(errorMessage, 'error');
            return { success: false, error: errorMessage };
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
                // Check if private key wallet is already active
                if (shouldUsePrivateKeyWallet()) {
                    debug.log('Private key wallet is active, ignoring external wallet connection');
                    return;
                }
                // Wallet connection successful
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                // Wallet modal closed
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Only handle if not using private key wallet
                if (!shouldUsePrivateKeyWallet()) {
                handleWalletDisconnected();
                }
                break;
                
            case 'web3Instance':
                // Check if private key wallet is already active
                if (shouldUsePrivateKeyWallet()) {
                    debug.log('Private key wallet is active, ignoring external Web3 instance');
                    return;
                }
                // Received Web3 instance
                if (message.web3) {
                    debug.log('Received Web3 instance from external wallet');
                    web3 = message.web3;
                    window.web3 = message.web3;
                    initContracts(message.web3);
                }
                break;
                
            case 'web3Ready':
                // Check if private key wallet is already active
                if (shouldUsePrivateKeyWallet()) {
                    debug.log('Private key wallet is active, ignoring external Web3 ready event');
                    return;
                }
                // Handle Web3 ready from external wallet
                if (message.web3) {
                    debug.log('Web3 ready from external wallet');
                    web3 = message.web3;
                    window.web3 = message.web3;
                    initContracts(message.web3);
                }
                break;
        }
    }
    
    /**
     * Check wallet status
     * First check private key wallet, then check sessionStorage, then check localStorage
     */
    function checkWalletStatus() {
        debug.log('Checking wallet connection status...');
        
        // Priority 1: Check private key wallet first
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Private key wallet is available and ready');
            const walletStatus = getPrivateKeyWalletStatus();
            
            if (walletStatus.hasWallet && walletStatus.activeAddress) {
                debug.log('Using private key wallet for marketplace:', walletStatus.activeAddress);
                
                // Set current address and connection status
                currentAddress = walletStatus.activeAddress;
                isWalletConnected = true;
                
                // Update UI to show connected status
                updateWalletUI(true, currentAddress);
                
                // Initialize contracts if Web3 is available
                if (walletStatus.web3Available) {
                    const web3Instance = window.SecureWalletManager.getWeb3();
                    if (web3Instance) {
                        web3 = web3Instance;
                        window.web3 = web3Instance;
                        initContracts(web3Instance);
                    }
                }
                return;
            }
        }
        
        // Priority 2: Check sessionStorage (cross-page transfer)
        const sessionWalletConnected = sessionStorage.getItem('walletConnected');
        const sessionWalletAddress = sessionStorage.getItem('walletAddress');
        const sessionWalletType = sessionStorage.getItem('walletType');
        
        if (sessionWalletConnected === 'true' && sessionWalletAddress) {
            debug.log('Found wallet connection info in sessionStorage:', sessionWalletAddress);
            // Restore connection status from sessionStorage
            isWalletConnected = true;
            currentAddress = sessionWalletAddress;
            
            // Use unified UI update function
            updateWalletUI(true, currentAddress);
            
            // Save to localStorage for long-term storage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', currentAddress);
            localStorage.setItem('walletType', sessionWalletType || 'metamask');
            
            debug.log('Wallet connected, requesting Web3 instance');
            // Request Web3 instance from iframe to get balance
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        debug.log('Sending getWeb3Instance message to wallet iframe');
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
                        debug.error('Failed to send message to iframe:', error);
                    }
                } else {
                    debug.error('Wallet iframe or its contentWindow is unavailable');
                }
            }, 500);
        } else {
            debug.log('No wallet info in sessionStorage, checking localStorage');
            // Priority 3: Check localStorage (long-term storage)
            checkStoredWalletConnection();
        }
    }
    
    /**
     * Handle wallet connection successful
     */
    function handleWalletConnected(data) {
        // Check if private key wallet is already active
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Private key wallet is already active, ignoring external wallet connection');
            return;
        }
        
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
        
        debug.log(`External wallet connected successfully: ${walletType}, address: ${address}, chain ID: ${chainId}`);
        
        // If received Web3 instance, initialize contracts
        if (receivedWeb3) {
            web3 = receivedWeb3;
            window.web3 = receivedWeb3;
            initContracts(receivedWeb3);
        }
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Don't disconnect private key wallet through external operations
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Private key wallet is active, external disconnect operation ignored');
            return;
        }
        
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
     * @param {boolean} connected - Whether wallet is connected
     * @param {string} address - Wallet address
     */
    function updateWalletUI(connected, address = null) {
        // Check if using private key wallet first
        const usingPrivateKey = shouldUsePrivateKeyWallet();
        
        if (usingPrivateKey) {
            const walletStatus = getPrivateKeyWalletStatus();
            connected = walletStatus.hasWallet;
            address = walletStatus.activeAddress;
            
            // Update global variables for private key wallet
            isWalletConnected = connected;
            currentAddress = address;
            
            console.log('Private key wallet UI update:', { connected, address });
        } else {
            // Update global variables for external wallet
            isWalletConnected = connected;
            currentAddress = address;
            
            console.log('External wallet UI update:', { connected, address });
        }
        
        if (walletAddress && walletBtn) {
            if (connected && address) {
                walletAddress.textContent = formatAddress(address);
                walletBtn.textContent = window.i18n ? window.i18n.t('wallet.disconnect') : 'Disconnect';
            walletBtn.classList.add('connected');
        } else {
                walletAddress.textContent = window.i18n ? window.i18n.t('wallet.noWallet') : 'No Wallet Connected';
                walletBtn.textContent = window.i18n ? window.i18n.t('wallet.connect') : 'Connect Wallet';
            walletBtn.classList.remove('connected');
            }
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
            let paymentTokenInfo = { symbol: '' };
            
            if (listing.paymentToken && listing.paymentToken !== '0x0000000000000000000000000000000000000000') {
                // First try to get from SupportedMarketTokens
                if (window.SupportedMarketTokens) {
                    const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(listing.paymentToken);
                    if (tokenInfo && tokenInfo.symbol) {
                        paymentTokenInfo = tokenInfo;
                    }
                }
                
                // If not found in supported tokens, try to get directly from contract
                if (!paymentTokenInfo.symbol && web3) {
                    try {
                        // Create token contract instance
                        const abi = window.GENERIC_ERC20_ABI || [
                            {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}
                        ];
                        const tokenContract = new web3.eth.Contract(abi, listing.paymentToken);
                        
                        // Get symbol - this is async but we need the symbol now
                        // We'll fetch it asynchronously and update later if possible
                        tokenContract.methods.symbol().call().then(symbol => {
                            console.log(`Got token symbol for ${listing.paymentToken}: ${symbol}`);
                            
                            // Add to supported tokens for future use
                            if (window.SupportedMarketTokens && typeof window.SupportedMarketTokens.addToken === 'function') {
                                window.SupportedMarketTokens.addToken({
                                    address: listing.paymentToken,
                                    symbol: symbol,
                                    name: symbol
                                });
                            }
                        }).catch(error => {
                            console.warn(`Failed to get token symbol for ${listing.paymentToken}:`, error);
                        });
                        
                        // Use TOKEN as temporary placeholder
                        if (!paymentTokenInfo.symbol) {
                            paymentTokenInfo.symbol = 'TOKEN';
                        }
                    } catch (error) {
                        console.warn(`Failed to create contract for ${listing.paymentToken}:`, error);
                    }
                }
                
                // Still no symbol, use TOKEN as fallback
                if (!paymentTokenInfo.symbol) {
                    paymentTokenInfo.symbol = 'TOKEN';
                }
            } else {
                // Zero address or null payment token (native token)
                // Check if there's a default token
                if (window.SupportedMarketTokens && typeof window.SupportedMarketTokens.getDefaultToken === 'function') {
                    const defaultToken = window.SupportedMarketTokens.getDefaultToken();
                    if (defaultToken && defaultToken.symbol) {
                        paymentTokenInfo.symbol = defaultToken.symbol;
                    }
                }
                
                // Check if there's a network config with native currency
                if (!paymentTokenInfo.symbol && window.networkConfig && window.networkConfig.nativeCurrency) {
                    paymentTokenInfo.symbol = window.networkConfig.nativeCurrency.symbol;
                }
                
                // Final fallback
                if (!paymentTokenInfo.symbol) {
                    paymentTokenInfo.symbol = 'USD';
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

    /**
     * Check private key wallet status
     */
    async function checkPrivateKeyWallet() {
        try {
            const walletStatus = getPrivateKeyWalletStatus();
            
            console.log('Checking private key wallet status:', walletStatus);
            
            if (walletStatus.hasWallet && walletStatus.activeAddress) {
                console.log('Private key wallet is ready, address:', walletStatus.activeAddress);
                
                // Update UI to show private key wallet connection
                updateWalletUI(true, walletStatus.activeAddress);
                
                // Initialize contracts with private key wallet's Web3 instance
                if (window.SecureWalletManager && window.SecureWalletManager.getWeb3()) {
                    const web3Instance = window.SecureWalletManager.getWeb3();
                    console.log('Initializing contracts with private key wallet Web3...');
                    
                    await initContractsWithRetry(web3Instance);
                    
                    // Load marketplace data
                    if (contractsInitialized) {
                        console.log('Loading marketplace data with private key wallet...');
                        await loadMarketplaceData();
                    }
                }
                
                return true;
            } else {
                console.log('Private key wallet not ready or not available');
                return false;
            }
            } catch (error) {
            console.error('Error checking private key wallet:', error);
            return false;
        }
    }
    
    /**
     * Initialize contracts with retry mechanism
     */
    async function initContractsWithRetry(web3Instance = null) {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                console.log(`Initializing contracts (attempt ${retryCount + 1}/${maxRetries})...`);
                
                // Call the original initContracts function
                await initContracts(web3Instance);
                
                // Verify that key contracts are initialized
                if (nftMarketplaceContract && pwNFTContract) {
                    console.log('Contracts initialized successfully');
                    contractsInitialized = true;
                    return true;
                } else {
                    throw new Error('Key contracts not initialized properly');
                }
            } catch (error) {
                console.error(`Contract initialization attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying contract initialization in 1 second...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        throw new Error('Failed to initialize contracts after all retries');
    }
}); 