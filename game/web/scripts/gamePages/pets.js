// Pet page script
document.addEventListener('DOMContentLoaded', () => {
    // Debug utility
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Game Pets Debug]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Game Pets Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Game Pets Warning]', ...args);
        }
    };

    // Get DOM elements
    const sortSelect = document.querySelector('.sort-select');
    const adoptPetBtn = document.querySelector('.adopt-pet-btn');
    const petsGrid = document.querySelector('.pets-grid');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    let prevPageBtn = document.getElementById('prevPageBtn');
    let nextPageBtn = document.getElementById('nextPageBtn');
    const paginationLinks = document.getElementById('paginationLinks');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // pet data, initially empty, will be fetched from parent page
    let petsData = [];
    
    // pagination related variables
    let currentPage = 1;
    let pageSize = 6;
    let totalNFTs = 0;
    let allNFTs = [];
    let originalNFTs = []; // Store original unfiltered NFT data
    
    // current selected quality filter
    let currentQualityFilter = 'all';
    
    // Global variables for NFT management
    let userNFTs = []; // Store user's NFT data for batch operations
    let hasLoadedNFT = false;
    let isLoadingMore = false;
    let hasReachedEnd = false;
    let isLoadingInBackground = false;
    
    // Global variables for WalletNetworkManager
    let walletNetworkManager = null;
    let isWalletNetworkManagerReady = false;
    
    // initialization
    init();

    /**
     * Wait for SecureWalletManager to be ready
     */


    /**
     * Initialize WalletNetworkManager
     */
    async function initializeWalletNetworkManager() {
        debug.log('Initializing WalletNetworkManager...');
        
        try {
            if (!window.WalletNetworkManager) {
                throw new Error('WalletNetworkManager not available');
            }
            
            // Ensure variables are properly initialized
            walletNetworkManager = null;
            isWalletNetworkManagerReady = false;
            
            walletNetworkManager = new window.WalletNetworkManager();
            const result = await walletNetworkManager.init();
            
            if (result && result.success) {
                isWalletNetworkManagerReady = true;
                debug.log('WalletNetworkManager initialized successfully:', result);
                
                // Make walletNetworkManager globally accessible
                window.walletNetworkManager = walletNetworkManager;
                
                // Set up event listeners after walletNetworkManager is assigned
                setupWalletNetworkManagerEventListeners();
                
                return result;
            } else {
                debug.error('WalletNetworkManager initialization failed:', result ? result.error : 'Unknown error');
                // Reset variables on failure
                walletNetworkManager = null;
                isWalletNetworkManagerReady = false;
                return result || { success: false, error: 'Unknown initialization error' };
            }
        } catch (error) {
            debug.error('Error initializing WalletNetworkManager:', error);
            // Reset variables on error
            walletNetworkManager = null;
            isWalletNetworkManagerReady = false;
            return { success: false, error: error.message };
        }
    }

    /**
     * Set up WalletNetworkManager event listeners
     */
    function setupWalletNetworkManagerEventListeners() {
        if (!walletNetworkManager) return;
        
        walletNetworkManager.on('onConnectionStatusChanged', (status) => {
            debug.log('WalletNetworkManager connection status changed:', status);
            updateLocalStateFromManager(status);
        });
        
        walletNetworkManager.on('onNetworkChanged', (networkInfo) => {
            debug.log('WalletNetworkManager network changed:', networkInfo);
            // Handle network change if needed
        });
    }

    /**
     * Update local state from WalletNetworkManager
     */
    function updateLocalStateFromManager(managerData) {
        if (managerData.success && managerData.isConnected && walletNetworkManager) {
            // Update global Web3 instance
            const web3Instance = walletNetworkManager.getWeb3();
            if (web3Instance) {
                window.web3 = web3Instance;
                window.currentAddress = walletNetworkManager.getCurrentAddress();
                debug.log('Updated global Web3 and address from WalletNetworkManager');
            }
        }
    }

    /**
     * Get current wallet address using WalletNetworkManager
     */
    function getCurrentWalletAddress() {
        debug.log('Getting current wallet address...');
        
        // Use WalletNetworkManager if available and ready
        if (walletNetworkManager && isWalletNetworkManagerReady) {
            const address = walletNetworkManager.getCurrentAddress();
            if (address) {
                debug.log('Using WalletNetworkManager address:', address);
                return address;
        }
        }
        
        debug.log('No wallet address found');
        return null;
    }

    /**
     * Check if wallet is ready for operations
     */
    function isWalletReady() {
        debug.log('Checking if wallet is ready...');
        
        // Check WalletNetworkManager
        if (walletNetworkManager && 
               isWalletNetworkManagerReady && 
            walletNetworkManager.isReadyForContracts()) {
            debug.log('WalletNetworkManager is ready');
            return true;
        }
        
        debug.log('No wallet is ready');
        return false;
    }
    
    /**
     * Initialization function
     */
    async function init() {
        debug.log('Initializing game pets page...');
        
        // Initialize WalletNetworkManager first
        const walletResult = await initializeWalletNetworkManager();
        if (walletResult.success) {
            debug.log('WalletNetworkManager ready, initializing contracts...');
            await initializeContractsWithManager();
        } else {
            debug.warn('WalletNetworkManager initialization failed, using fallback initialization');
            await initializeLegacyWallet();
        }
        
        // print if required components exist
        debug.log('Required component check:');
        debug.log('- web3:', typeof window.web3 !== 'undefined');
        debug.log('- NFTFeedingManagerABI:', typeof window.NFTFeedingManagerABI !== 'undefined');
        debug.log('- PetNFTService:', typeof window.PetNFTService !== 'undefined');
        debug.log('- initNFTFeedingManagerContract:', typeof window.initNFTFeedingManagerContract !== 'undefined');
        debug.log('- WalletNetworkManager:', typeof window.WalletNetworkManager !== 'undefined');
        
        // Check current wallet address
        const currentAddress = getCurrentWalletAddress();
        debug.log('Current wallet address:', currentAddress);
        
        // add quality filter
        addQualityFilter();
        
        // load last selected quality filter from local storage
        const savedQualityFilter = localStorage.getItem('petQualityFilter');
        if (savedQualityFilter) {
            debug.log('Loaded quality filter from local storage:', savedQualityFilter);
            currentQualityFilter = savedQualityFilter;
            
            // find the corresponding tab and set it to active state
            const qualityTab = document.querySelector(`.quality-tab[data-quality="${savedQualityFilter}"]`);
            if (qualityTab) {
                // remove active class and style from all tabs
                document.querySelectorAll('.quality-tab').forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.backgroundColor = '#f0f0f0';
                    tab.style.color = 'inherit';
                    tab.style.borderColor = '#ddd';
                });
                
                // set selected style
                qualityTab.classList.add('active');
                
                // set active state style
                if (savedQualityFilter === 'LEGENDARY') {
                    qualityTab.style.backgroundColor = '#ff9800';
                    qualityTab.style.borderColor = '#f57c00';
                } else if (savedQualityFilter === 'RARE') {
                    qualityTab.style.backgroundColor = '#673ab7';
                    qualityTab.style.borderColor = '#512da8';
                } else if (savedQualityFilter === 'EXCELLENT') {
                    qualityTab.style.backgroundColor = '#2196f3';
                    qualityTab.style.borderColor = '#1976d2';
                } else if (savedQualityFilter === 'GOOD') {
                    qualityTab.style.backgroundColor = '#4caf50';
                    qualityTab.style.borderColor = '#388e3c';
                } else if (savedQualityFilter === 'COMMON') {
                    qualityTab.style.backgroundColor = '#9e9e9e';
                    qualityTab.style.borderColor = '#757575';
                } else {
                    qualityTab.style.backgroundColor = '#4d7bef';
                    qualityTab.style.borderColor = '#3a68d8';
                }
                
                qualityTab.style.color = 'white';
            }
        }
        
        // Load required modules
        loadRequiredModules();
        
        // load NFTFeedingManager initialization script
        if (typeof window.initNFTFeedingManagerContract === 'undefined') {
            debug.log('Loading initNFTFeedingManager.js script...');
            const script = document.createElement('script');
            script.src = '../../scripts/init_contracts/initNFTFeedingManager.js';
            script.onload = function() {
                debug.log('initNFTFeedingManager.js script loaded successfully, initializing contract...');
                // initialize NFTFeedingManager contract
                initNFTFeedingManagerContract();
            };
            script.onerror = function() {
                debug.error('initNFTFeedingManager.js script failed to load');
            };
            document.head.appendChild(script);
        }
        
        // ensure contract ABI is loaded
        if (typeof window.NFTFeedingManagerABI === 'undefined') {
            debug.log('Attempting to load NFTFeedingManagerABI...');
            
            // async load NFTFeedingManagerABI script
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/ABI/NFTFeedingManagerABI.js';
            script.onload = function() {
                debug.log('NFTFeedingManagerABI loaded successfully');
                // after loading successfully, initialize contract
                if (typeof window.initNFTFeedingManagerContract !== 'undefined') {
                    initNFTFeedingManagerContract();
                } else {
                    debug.log('NFTFeedingManagerABI loaded, but initNFTFeedingManagerContract is undefined, waiting for script loading');
                }
            };
            script.onerror = function() {
                debug.error('NFTFeedingManagerABI loading failed');
            };
            document.head.appendChild(script);
        }
        
        // Initializing PetNFTService
        if (window.PetNFTService) {
            debug.log('Initializing PetNFTService...');
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialization' + (success ? 'succeeded' : 'failed'));
                
                // Expose PetNFTService functions to global scope for backward compatibility
                if (success) {
                    window.loadUserNFTs = window.PetNFTService.loadUserNFTs;
                    window.loadSpecificNFT = window.PetNFTService.loadSpecificNFT;
                    window.refreshNFTs = window.PetNFTService.refreshNFTs;
                    debug.log('PetNFTService functions exposed to global scope');
                }
                
                // after PetNFTService initialization, initialize NFTFeedingManager contract
                if (success && typeof window.NFTFeedingManagerABI !== 'undefined' && 
                    typeof window.initNFTFeedingManagerContract !== 'undefined') {
                    initNFTFeedingManagerContract();
                }
            });
        } else {
            debug.warn('PetNFTService not found, cannot initialize');
        }
        
        // Complete initialization
        debug.log('Pets page initialization completed');
        
        // Load NFT pets after initialization is complete
        setTimeout(() => {
            if (isWalletReady()) {
                loadNFTPets();
            } else {
                debug.log('Wallet not ready, showing wallet connection message');
                showWalletNotConnectedMessage();
            }
        }, 2000);
        
        // Bind sort select event
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const sortType = sortSelect.value;
                debug.log('Sort method changed:', sortType);
                
                // if NFT data already exists, apply sorting directly and display the first page
                if (allNFTs.length > 0) {
                    allNFTs = sortNFTs(allNFTs, sortType);
                    currentPage = 1; // reset to the first page
                    displayPaginatedNFTs();
                }
            });
        }
        
        // Bind feed friend NFT button event
        const feedFriendNFTBtn = document.getElementById('feedFriendNFTBtn');
        if (feedFriendNFTBtn) {
            feedFriendNFTBtn.addEventListener('click', handleFeedFriendNFTClick);
        }
        
        // bind batch operation buttons
        initBatchActionButtons();
        
        // bind page size selection event
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', function() {
                pageSize = parseInt(this.value);
                currentPage = 1; // reset to the first page
                displayPaginatedNFTs();
                updatePaginationControls();
            });
        }
        
        // bind previous page button event
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    displayPaginatedNFTs();
                    updatePaginationControls();
                }
            });
        }
        
        // bind next page button event
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', function() {
                const totalPages = Math.ceil(totalNFTs / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    displayPaginatedNFTs();
                    updatePaginationControls();
                }
            });
        }
        
        // listen for parent page messages
        window.addEventListener('message', handleParentMessage);
        
        // load modal dialog component
        loadModalDialogComponent();
        
        // bind pet card events
        bindPetCardEvents();
        
        // bind global pet card action events
        bindGlobalPetCardEvents();
        
        // localize content
        localizeContent();
        
        // Note: loadNFTPets will be called after contracts are initialized in initializeContractsWithManager
    }
    
    /**
     * Initialize contracts using WalletNetworkManager
     */
    async function initializeContractsWithManager() {
        debug.log('Initializing contracts with WalletNetworkManager...');
        
        try {
            if (!walletNetworkManager || !walletNetworkManager.isReadyForContracts()) {
                throw new Error('WalletNetworkManager not ready for contracts');
            }
            
            // Load contract addresses first
            loadContractInitializers();
            
            // Wait a bit for contract addresses to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Initialize contracts using WalletNetworkManager
            const contractResult = await walletNetworkManager.initializeContracts({
                contracts: ['PwNFT', 'NFTManager', 'NFTFeedingManager']
            });
            
            debug.log('Contract initialization result:', contractResult);
            
            if (contractResult.success) {
                // Set contract instances
                window.pwNFTContract = contractResult.contracts.PwNFT || window.pwNFTContract;
                window.nftManagerContract = contractResult.contracts.NFTManager || window.nftManagerContract;
                window.nftFeedingManagerContract = contractResult.contracts.NFTFeedingManager || window.nftFeedingManagerContract;
                
                debug.log('Contracts initialized:', {
                    pwNFT: !!window.pwNFTContract,
                    nftManager: !!window.nftManagerContract,
                    nftFeedingManager: !!window.nftFeedingManagerContract
                });
                
                // Initialize PetNFTService with contracts
                if (window.PetNFTService && window.pwNFTContract) {
                    debug.log('Re-initializing PetNFTService with contracts...');
                    try {
                        // Force re-initialization with contracts
                        window.PetNFTService._resetInitialization();
                        const success = await window.PetNFTService.init();
                        debug.log('PetNFTService re-initialization result:', success);
                        
                        if (success) {
                            // Expose functions again
                            window.loadUserNFTs = window.PetNFTService.loadUserNFTs;
                            window.loadSpecificNFT = window.PetNFTService.loadSpecificNFT;
                            window.refreshNFTs = window.PetNFTService.refreshNFTs;
                            debug.log('PetNFTService functions re-exposed to global scope');
                        }
                    } catch (error) {
                        debug.error('Error re-initializing PetNFTService:', error);
                    }
                }
                
                // Test NFTFeedingManager contract if available
                if (window.nftFeedingManagerContract) {
                    await testNFTFeedingManagerContract();
                }
                
                // Load NFT pets after contracts are ready
                setTimeout(() => {
                    loadNFTPets();
                }, 500);
                
                return true;
            } else {
                debug.error('Contract initialization failed:', contractResult);
                return false;
            }
        } catch (error) {
            debug.error('Error initializing contracts with manager:', error);
            return false;
        }
    }
    
    // Load contract initializers
    function loadContractInitializers() {
        debug.log('Loading contract initializer files...');
        
        if (
            typeof window.initPwNFTContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initNFTFeedingManagerContract !== 'undefined'
        ) {
            debug.log('Contract initializer files already loaded');
            return;
        }
        
        const initFiles = [
            '../../scripts/init_contracts/initPwNFT.js',
            '../../scripts/init_contracts/initNFTManager.js',
            '../../scripts/init_contracts/initNFTFeedingManager.js'
        ];
        
        initFiles.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = function() {
                debug.log(`Loaded: ${src}`);
                if (window.web3 && window.currentAddress) {
                    initContracts();
                }
            };
            script.onerror = function() {
                debug.error(`Failed to load: ${src}`);
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Check stored wallet connection (similar to shop.js)
     */
    function checkStoredWalletConnection() {
        // Priority 1: Check WalletNetworkManager first
        if (walletNetworkManager && walletNetworkManager.isInitialized) {
            const status = walletNetworkManager.getStatus();
            debug.log('WalletNetworkManager status in checkStoredWalletConnection:', status);
            
            if (status.isConnected) {
                window.currentAddress = walletNetworkManager.getCurrentAddress();
                window.web3 = walletNetworkManager.getWeb3();
                
                debug.log('Using WalletNetworkManager connection:', {
                    walletType: status.walletType,
                    network: status.network,
                    address: window.currentAddress
                });
                
                if (window.web3 && window.nftFeedingManagerContract) {
                    loadNFTPets();
                }
                
                return;
            }
        }
        
        // Priority 2: Check private key wallet
        if (window.SecureWalletManager) {
            const keyCount = window.SecureWalletManager.getKeyCount();
            const isLocked = window.SecureWalletManager.isWalletLocked();
            const isReady = window.SecureWalletManager.isWalletReady();
            const activeAddress = window.SecureWalletManager.getAddress();
            
            const hasWallet = keyCount > 0 && !isLocked && isReady && !!activeAddress;
            
            debug.log('Private key wallet status in checkStoredWalletConnection:', {
                keyCount, isLocked, isReady, activeAddress, hasWallet
            });
            
            if (hasWallet) {
                debug.log('Private key wallet is active, using it for game pets');
                
                window.currentAddress = activeAddress;
                window.web3 = window.SecureWalletManager.getWeb3();
                
                if (window.web3) {
                    debug.log('Initializing contracts with private key wallet');
                    initContracts();
                }
                
                if (window.nftFeedingManagerContract) {
                    loadNFTPets();
                }
                
                return;
            }
        }
        
        // Priority 3: Check localStorage only if no other wallet
        debug.log('No active wallet, checking localStorage...');
        
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            debug.log('Restore wallet connection from localStorage:', storedAddress);
            window.currentAddress = storedAddress;
            
            if (window.nftFeedingManagerContract) {
                loadNFTPets();
            }
        } else {
            debug.log('No wallet connection status found in localStorage');
        }
    }
    
    /**
     * Request wallet data from parent window
     */
    function requestWalletData() {
        debug.log('Request wallet data');
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'requestData',
                data: {}
            }, '*');
        }
    }
    
    /**
     * Initialize contracts (similar to shop.js)
     */
    function initContracts() {
        debug.log('Initialize contracts...');
            
        if (!window.web3) {
            debug.error('Web3 not initialized');
            return;
        }
        
        // If WalletNetworkManager is available and ready, use it
        if (walletNetworkManager && walletNetworkManager.isReadyForContracts()) {
            initializeContractsWithManager();
        } else {
            // Fallback to legacy contract initialization
            initPetsContracts();
        }
    }
    
    /**
     * Initialize pets contracts (legacy method)
     */
    function initPetsContracts() {
        debug.log('Initializing pets contracts...');
        
        try {
            if (!window.web3) {
                debug.error('Web3 is not initialized');
                return;
            }
            
            loadRequiredABIs();
            
            setTimeout(() => {
                initializeContractsWithABI();
            }, 1000);
        } catch (error) {
            debug.error('Error in initPetsContracts:', error);
        }
    }
    
    /**
     * Load required ABIs
     */
    function loadRequiredABIs() {
        debug.log('Loading required ABI files...');
        
        if (window.PwNFTABI && window.NFTFeedingManagerABI && window.NFTManagerABI) {
            debug.log('ABIs already loaded, proceeding with contract initialization');
            return;
        }
            
        const abisToLoad = [
            { name: 'PwNFTABI', src: '../../scripts/contracts/ABI/PwNFTABI.js' },
            { name: 'NFTFeedingManagerABI', src: '../../scripts/contracts/ABI/NFTFeedingManagerABI.js' },
            { name: 'NFTManagerABI', src: '../../scripts/contracts/ABI/NFTManagerABI.js' }
        ];
        
        abisToLoad.forEach(abi => {
            if (!window[abi.name]) {
                const script = document.createElement('script');
                script.src = abi.src;
                script.onload = function() {
                    debug.log(`${abi.name} loaded successfully`);
                };
                script.onerror = function() {
                    debug.error(`Failed to load ${abi.name}`);
                };
                document.head.appendChild(script);
            }
        });
    }
    
    /**
     * Initialize contracts with loaded ABIs
     */
    function initializeContractsWithABI() {
        debug.log('Initializing contracts with loaded ABIs...');
        
        // Ensure contract addresses are loaded
        if (!window.contractAddresses) {
            debug.log('Contract addresses not loaded, loading...');
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/contractAddresses.js';
            script.onload = function() {
                debug.log('Contract addresses loaded, retrying contract initialization');
                setTimeout(() => {
                    initializeContractsWithABI();
                }, 500);
            };
            script.onerror = function() {
                debug.error('Failed to load contract addresses');
            };
            document.head.appendChild(script);
            return;
        }
        
        const getContractAddressFunc = window.getContractAddress || function(name) {
            const network = window.currentNetwork || 'LOCAL';
            if (window.contractAddresses && window.contractAddresses[network]) {
                return window.contractAddresses[network][name];
            }
            return null;
        };
        
        // Initialize PwNFT contract
        if (typeof window.initPwNFTContract === 'function') {
            try {
                if (!window.PwNFTABI) {
                    debug.error('PwNFTABI not loaded, retrying in 2 seconds...');
                    setTimeout(() => {
                        initializeContractsWithABI();
                    }, 2000);
                    return;
                }
                
                debug.log('Starting to initialize the PwNFT contract...');
                window.pwNFTContract = window.initPwNFTContract(window.web3, getContractAddressFunc);
                
                if (window.pwNFTContract) {
                    debug.log('PwNFT contract initialized successfully, address:', window.pwNFTContract._address);
                } else {
                    debug.error('PwNFT contract initialization returned null');
                }
            } catch (error) {
                debug.error('Failed to initialize the PwNFT contract:', error);
            }
        } else {
            debug.error('Cannot find the initPwNFTContract function');
        }
        
        // Initialize NFTFeedingManager contract
        if (typeof window.initNFTFeedingManagerContract === 'function') {
            try {
                if (!window.NFTFeedingManagerABI) {
                    debug.error('NFTFeedingManagerABI not loaded');
                    return;
                }
                
                debug.log('Starting to initialize the NFTFeedingManager contract...');
                window.nftFeedingManagerContract = window.initNFTFeedingManagerContract(window.web3, getContractAddressFunc);
                
                if (window.nftFeedingManagerContract) {
                    debug.log('NFTFeedingManager contract initialized successfully, address:', window.nftFeedingManagerContract._address);
                } else {
                    debug.error('NFTFeedingManager contract initialization returned null');
                }
            } catch (error) {
                debug.error('Failed to initialize the NFTFeedingManager contract:', error);
            }
        } else {
            debug.error('Cannot find the initNFTFeedingManagerContract function');
        }
        
        // Initialize NFTManager contract
        if (typeof window.initNFTManagerContract === 'function') {
            try {
                if (!window.NFTManagerABI) {
                    debug.error('NFTManagerABI not loaded');
                    return;
                }
                
                debug.log('Starting to initialize the NFTManager contract...');
                window.nftManagerContract = window.initNFTManagerContract(window.web3, getContractAddressFunc);
                
                if (window.nftManagerContract) {
                    debug.log('NFTManager contract initialized successfully, address:', window.nftManagerContract._address);
                } else {
                    debug.error('NFTManager contract initialization returned null');
                }
            } catch (error) {
                debug.error('Failed to initialize the NFTManager contract:', error);
            }
        } else {
            debug.error('Cannot find the initNFTManagerContract function');
        }
        
        // After all contracts are initialized, setup and load NFTs
        setTimeout(() => {
            if (window.web3 && window.currentAddress) {
                loadNFTPets();
            }
        }, 500);
    }

    /**
     * Legacy wallet initialization (fallback)
     */
    async function initializeLegacyWallet() {
        debug.log('Initializing legacy wallet...');
        
        // Load contract initializers first
        loadContractInitializers();
        
        // Try to initialize Web3 and contracts
        if (!window.web3) {
            // Priority 1: Check SecureWalletManager for private key wallet
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const isReady = window.SecureWalletManager.isWalletReady();
                const activeAddress = window.SecureWalletManager.getAddress();
                
                debug.log('Private key wallet status:', { keyCount, isLocked, isReady, activeAddress });
                
                if (keyCount > 0 && !isLocked && isReady && activeAddress) {
                    debug.log('Private key wallet detected, using SecureWalletManager Web3...');
                    
                    const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                    if (privateKeyWeb3) {
                        window.web3 = privateKeyWeb3;
                        window.currentAddress = activeAddress;
                        debug.log('Private key wallet Web3 initialized successfully');
                        
                        // Initialize contracts with private key wallet
                        setTimeout(() => {
                            initContracts();
                        }, 500);
                        return;
                    } else {
                        debug.warn('Private key wallet Web3 not available');
                    }
                }
            }
            
            // Priority 2: Check external wallet (MetaMask, etc.)
            if (window.ethereum) {
                window.web3 = new Web3(window.ethereum);
                debug.log('Web3 initialized from window.ethereum');
            } else if (window.web3) {
                window.web3 = new Web3(window.web3.currentProvider);
                debug.log('Web3 initialized from window.web3');
            } else if (window.parent && window.parent.gameWeb3) {
                window.web3 = window.parent.gameWeb3;
                debug.log('Web3 initialized from parent.gameWeb3');
            } else if (window.gameWeb3) {
                window.web3 = window.gameWeb3;
                debug.log('Web3 initialized from window.gameWeb3');
            }
        }
        
        // Initialize contracts if Web3 is available
        if (window.web3) {
            try {
                initContracts();
                
                // Verify contracts are initialized after a delay
                setTimeout(() => {
                    if (!window.nftFeedingManagerContract || !window.pwNFTContract) {
                        debug.warn('Some contracts not initialized, retrying...');
                        initContracts();
                    }
                }, 3000);
            } catch (error) {
                debug.error('Error initializing contracts:', error);
                setTimeout(() => {
                    initializeLegacyWallet();
                }, 3000);
                return;
            }
        } else {
            debug.warn('Web3 not available, will retry later');
            setTimeout(() => {
                initializeLegacyWallet();
            }, 2000);
            return;
        }
        
        // Check wallet connection
        checkStoredWalletConnection();
        
        // Request wallet data
        requestWalletData();
    }

    /**
     * Load required modules
     */
    async function loadRequiredModules() {
        debug.log('Loading required modules...');
        
        try {
            // Load PetFeeding module
            if (!window.PetFeeding) {
                debug.log('Loading PetFeeding module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetFeeding.js');
            }
            
            // Load PetRewards module
            if (!window.PetRewards) {
                debug.log('Loading PetRewards module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetRewards.js');
            }
            
            // Load displayAndFilterNfts module
            if (!window.loadSpecificNFT) {
                debug.log('Loading displayAndFilterNfts module...');
                await loadFunctionPackage('../../scripts/functionPackages/displayAndFilterNfts.js');
            }
            
            debug.log('All required modules loaded successfully');
        } catch (error) {
            debug.error('Error loading required modules:', error);
        }
    }
    
    /**
     * Add quality filter
     */
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
            
            // Add click event
            tab.addEventListener('click', handleQualityTabClick);
            
            qualityFilter.appendChild(tab);
        });
        
        // Add quality filter to container
        filterContainer.appendChild(qualityFilter);
        
        // Add quality filter to page
        const petContainer = petsGrid.parentElement;
        if (petContainer) {
            petContainer.insertBefore(filterContainer, petsGrid);
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
        
        // Filter pet cards
        filterPetsByQuality();
    }
    
    /**
     * Filter pet cards by quality
     */
    function filterPetsByQuality() {
        // Use original NFT data for filtering to ensure we always have the complete dataset
        let nfts = originalNFTs.length > 0 ? originalNFTs : allNFTs || [];
        
        // If "all" is selected, show all pet cards
        if (currentQualityFilter === 'all') {
            // Reset to original all data
            allNFTs = [...nfts]; // Restore from original data
            totalNFTs = nfts.length;
            currentPage = 1; // Reset to first page
            
            debug.log(`Showing all pet cards, total: ${totalNFTs}`);
            
            // Re-render the pets page
            displayPaginatedNFTs();
        } else {
            // Filter all pet data by quality
            const filteredNFTs = nfts.filter(nft => {
                // Enhanced quality extraction logic for game mode
                let quality = extractNFTQuality(nft);
                
                // Use enhanced quality matching logic
                return matchesQuality(quality, currentQualityFilter);
            });
            
            debug.log(`Filtered ${filteredNFTs.length} pet cards of ${getQualityName(currentQualityFilter)} quality from ${nfts.length} total pets`);
            
            // When there are no pet cards matching the quality, show a message
            if (filteredNFTs.length === 0) {
                petsGrid.innerHTML = '';
                const message = document.createElement('div');
                message.className = 'no-pets-message';
                message.textContent = `No pet cards of ${getQualityName(currentQualityFilter)} quality`;
                petsGrid.appendChild(message);
                
                // Hide pagination control
                hidePaginationControls();
                return;
            }
            
            // Update allNFTs with filtered data for pagination (but keep originalNFTs intact)
            allNFTs = [...filteredNFTs];
            
            // Update total count and current page
            totalNFTs = filteredNFTs.length;
            currentPage = 1; // Reset to first page
            
            debug.log(`After quality filtering, total: ${totalNFTs}, pages: ${Math.ceil(totalNFTs / pageSize)}`);
            
            // Render filtered NFTs
            displayPaginatedNFTs();
        }
    }
    
    /**
     * Enhanced NFT quality extraction function for game mode
     * @param {Object} nft - NFT data object
     * @returns {string} Extracted quality value
     */
    function extractNFTQuality(nft) {
        let quality = 'COMMON'; // Default quality
        
        debug.log('Extracting quality from NFT:', nft);
        
        // Priority 1: Check if quality is directly stored in the NFT object
        if (nft.quality) {
            quality = String(nft.quality).toUpperCase();
            debug.log(`Found quality in nft.quality: ${quality}`);
            return quality;
        }
        
        if (nft.rarity) {
            quality = String(nft.rarity).toUpperCase();
            debug.log(`Found quality in nft.rarity: ${quality}`);
            return quality;
        }
        
        // Priority 2: Check metadata attributes
        if (nft.metadata && nft.metadata.attributes && Array.isArray(nft.metadata.attributes)) {
            const qualityAttr = nft.metadata.attributes.find(attr => {
                const traitType = String(attr.trait_type || '').toLowerCase();
                return traitType === 'quality' || 
                       traitType === 'rarity' || 
                       traitType === 'grade' ||
                       traitType === 'tier' ||
                       traitType === 'level' ||
                       traitType === 'rank';
            });
            
            if (qualityAttr && qualityAttr.value !== undefined) {
                quality = String(qualityAttr.value).toUpperCase();
                debug.log(`Found quality in metadata attributes: ${quality} (trait: ${qualityAttr.trait_type})`);
                return quality;
            }
        }
        
        // Priority 3: Check if quality is stored in other metadata fields
        if (nft.metadata) {
            if (nft.metadata.quality) {
                quality = String(nft.metadata.quality).toUpperCase();
                debug.log(`Found quality in metadata.quality: ${quality}`);
                return quality;
            }
            
            if (nft.metadata.rarity) {
                quality = String(nft.metadata.rarity).toUpperCase();
                debug.log(`Found quality in metadata.rarity: ${quality}`);
                return quality;
            }
            
            if (nft.metadata.grade) {
                quality = String(nft.metadata.grade).toUpperCase();
                debug.log(`Found quality in metadata.grade: ${quality}`);
                return quality;
            }
        }
        
        // Priority 4: Try to infer quality from pet name or description
        const petName = (nft.metadata?.name || nft.name || '').toLowerCase();
        const petDescription = (nft.metadata?.description || nft.description || '').toLowerCase();
        const combinedText = `${petName} ${petDescription}`;
        
        if (combinedText.includes('legendary') || combinedText.includes('legend') || combinedText.includes('epic')) {
            quality = 'LEGENDARY';
            debug.log(`Inferred quality from name/description: ${quality}`);
            return quality;
        }
        
        if (combinedText.includes('rare') || combinedText.includes('purple')) {
            quality = 'RARE';
            debug.log(`Inferred quality from name/description: ${quality}`);
            return quality;
        }
        
        if (combinedText.includes('excellent') || combinedText.includes('excel')) {
            quality = 'EXCELLENT';
            debug.log(`Inferred quality from name/description: ${quality}`);
            return quality;
        }
        
        if (combinedText.includes('good') || combinedText.includes('uncommon')) {
            quality = 'GOOD';
            debug.log(`Inferred quality from name/description: ${quality}`);
            return quality;
        }
        
        // Priority 5: Try to infer from tokenId (some projects use tokenId ranges for different qualities)
        if (nft.tokenId) {
            const tokenIdNum = parseInt(nft.tokenId);
            if (!isNaN(tokenIdNum)) {
                // Example logic: higher tokenId might indicate higher quality
                // This is just an example, adjust according to actual project rules
                if (tokenIdNum >= 9000) {
                    quality = 'LEGENDARY';
                    debug.log(`Inferred quality from tokenId range: ${quality} (tokenId: ${tokenIdNum})`);
                    return quality;
                } else if (tokenIdNum >= 7000) {
                    quality = 'RARE';
                    debug.log(`Inferred quality from tokenId range: ${quality} (tokenId: ${tokenIdNum})`);
                    return quality;
                } else if (tokenIdNum >= 5000) {
                    quality = 'EXCELLENT';
                    debug.log(`Inferred quality from tokenId range: ${quality} (tokenId: ${tokenIdNum})`);
                    return quality;
                } else if (tokenIdNum >= 3000) {
                    quality = 'GOOD';
                    debug.log(`Inferred quality from tokenId range: ${quality} (tokenId: ${tokenIdNum})`);
                    return quality;
                }
            }
        }
        
        debug.log(`Using default quality: ${quality}`);
        return quality;
    }
    
    /**
     * Check if NFT quality matches specified filter condition (Enhanced for game mode)
     * @param {string} nftQuality - NFT quality value
     * @param {string} filterQuality - Filter condition
     * @returns {boolean} Whether it matches
     */
    function matchesQuality(nftQuality, filterQuality) {
        // Normalize quality value (convert to uppercase)
        const normalizedNftQuality = String(nftQuality).toUpperCase().trim();
        const normalizedFilterQuality = String(filterQuality).toUpperCase().trim();
        
        debug.log(`Quality matching: NFT="${normalizedNftQuality}" vs Filter="${normalizedFilterQuality}"`);
        
        // Exact match
        if (normalizedNftQuality === normalizedFilterQuality) {
            debug.log('Exact match found');
            return true;
        }
        
        // Enhanced quality mapping for better compatibility
        const qualityMappings = {
            'LEGENDARY': ['LEGENDARY', 'LEGEND', 'EPIC', 'MYTHIC', 'DIVINE', 'SUPREME', '4', '5'],
            'RARE': ['RARE', 'PURPLE', 'PURPLE-RARE', 'SPECIAL', 'ULTRA', '3'],
            'EXCELLENT': ['EXCELLENT', 'EXCEL', 'GREAT', 'SUPERIOR', 'FINE', '2'],
            'GOOD': ['GOOD', 'UNCOMMON', 'EXTRAORDINARY', 'DECENT', 'NICE', '1'],
            'COMMON': ['COMMON', 'NORMAL', 'BASIC', 'STANDARD', 'REGULAR', '0']
        };
        
        // Check if the NFT quality belongs to the filter quality category
        if (qualityMappings[normalizedFilterQuality]) {
            const matchFound = qualityMappings[normalizedFilterQuality].includes(normalizedNftQuality);
            if (matchFound) {
                debug.log(`Found match in quality mapping: ${normalizedNftQuality} -> ${normalizedFilterQuality}`);
            return true;
        }
        }
        
        // Reverse mapping check - check if filter quality belongs to NFT quality category
        for (const [category, variants] of Object.entries(qualityMappings)) {
            if (variants.includes(normalizedNftQuality) && variants.includes(normalizedFilterQuality)) {
                debug.log(`Found reverse match in quality mapping: ${normalizedNftQuality} <-> ${normalizedFilterQuality} (category: ${category})`);
            return true;
        }
        }
        
        // Partial string matching for flexible quality recognition
        if (normalizedFilterQuality === 'LEGENDARY') {
            if (normalizedNftQuality.includes('LEGEND') || 
                normalizedNftQuality.includes('EPIC') ||
                normalizedNftQuality.includes('MYTHIC') ||
                normalizedNftQuality.includes('DIVINE')) {
                debug.log(`Found partial match for LEGENDARY: ${normalizedNftQuality}`);
            return true;
        }
        }
        
        if (normalizedFilterQuality === 'RARE') {
            if (normalizedNftQuality.includes('RARE') || 
                normalizedNftQuality.includes('PURPLE') ||
                normalizedNftQuality.includes('SPECIAL')) {
                debug.log(`Found partial match for RARE: ${normalizedNftQuality}`);
            return true;
        }
        }
        
        if (normalizedFilterQuality === 'EXCELLENT') {
            if (normalizedNftQuality.includes('EXCEL') || 
                normalizedNftQuality.includes('GREAT') ||
                normalizedNftQuality.includes('SUPERIOR')) {
                debug.log(`Found partial match for EXCELLENT: ${normalizedNftQuality}`);
            return true;
        }
        }
        
        if (normalizedFilterQuality === 'GOOD') {
            if (normalizedNftQuality.includes('GOOD') || 
                normalizedNftQuality.includes('UNCOMMON') ||
                normalizedNftQuality.includes('DECENT')) {
                debug.log(`Found partial match for GOOD: ${normalizedNftQuality}`);
            return true;
        }
        }
        
        if (normalizedFilterQuality === 'COMMON') {
            if (normalizedNftQuality.includes('COMMON') || 
                normalizedNftQuality.includes('NORMAL') ||
                normalizedNftQuality.includes('BASIC') ||
                normalizedNftQuality.includes('STANDARD')) {
                debug.log(`Found partial match for COMMON: ${normalizedNftQuality}`);
            return true;
        }
        }
        
        // Numeric quality matching with enhanced ranges
        if (!isNaN(normalizedNftQuality) && !isNaN(normalizedFilterQuality)) {
            const nftNum = parseFloat(normalizedNftQuality);
            const filterNum = parseFloat(normalizedFilterQuality);
            if (nftNum === filterNum) {
                debug.log(`Found numeric match: ${nftNum} === ${filterNum}`);
            return true;
        }
        }
        
        // Enhanced numeric range matching
        if (!isNaN(normalizedNftQuality)) {
            const nftNum = parseFloat(normalizedNftQuality);
        
            if (normalizedFilterQuality === 'LEGENDARY' && (nftNum >= 4 || nftNum >= 80)) {
                debug.log(`Found numeric range match for LEGENDARY: ${nftNum}`);
            return true;
        }
        
            if (normalizedFilterQuality === 'RARE' && (nftNum >= 3 || (nftNum >= 60 && nftNum < 80))) {
                debug.log(`Found numeric range match for RARE: ${nftNum}`);
            return true;
        }
        
            if (normalizedFilterQuality === 'EXCELLENT' && (nftNum >= 2 || (nftNum >= 40 && nftNum < 60))) {
                debug.log(`Found numeric range match for EXCELLENT: ${nftNum}`);
            return true;
        }
        
            if (normalizedFilterQuality === 'GOOD' && (nftNum >= 1 || (nftNum >= 20 && nftNum < 40))) {
                debug.log(`Found numeric range match for GOOD: ${nftNum}`);
            return true;
        }
        
            if (normalizedFilterQuality === 'COMMON' && (nftNum === 0 || nftNum < 20)) {
                debug.log(`Found numeric range match for COMMON: ${nftNum}`);
                return true;
            }
        }
        
        debug.log(`No match found for: NFT="${normalizedNftQuality}" vs Filter="${normalizedFilterQuality}"`);
        return false;
    }
    
    /**
     * Get quality name for display
     * @param {string} qualityId - Quality ID
     * @returns {string} Quality display name
     */
    function getQualityName(qualityId) {
        const qualityNames = {
            'all': 'All',
            'COMMON': 'Common',
            'GOOD': 'Good',
            'EXCELLENT': 'Excellent',
            'RARE': 'Rare',
            'LEGENDARY': 'Legendary'
        };
        return qualityNames[qualityId] || qualityId;
    }
    
    /**
     * Initialize NFTFeedingManager contract
     */
    function initNFTFeedingManagerContract() {
        debug.log('Initializing NFTFeedingManager contract...');
        
        // check if the necessary components exist
        if (typeof window.web3 === 'undefined') {
            debug.error('Web3 is not available, cannot initialize NFTFeedingManager contract');
            return;
        }
        
        if (typeof window.NFTFeedingManagerABI === 'undefined') {
            debug.error('NFTFeedingManagerABI is not available, cannot initialize NFTFeedingManager contract');
            return;
        }
        
        if (typeof window.initNFTFeedingManagerContract === 'undefined') {
            debug.error('initNFTFeedingManagerContract function is not available');
            return;
        }
        
        try {
            // call the initialization function
            const contract = window.initNFTFeedingManagerContract(window.web3, window.getContractAddress);
            
            if (contract) {
                window.nftFeedingManagerContract = contract;
                debug.log('NFTFeedingManager contract initialized successfully');
                
                // test the contract
                testNFTFeedingManagerContract();
            } else {
                debug.error('NFTFeedingManager contract initialization failed');
            }
        } catch (error) {
            debug.error('Error initializing NFTFeedingManager contract:', error);
        }
    }
    
    /**
     * Test NFTFeedingManager contract
     */
    async function testNFTFeedingManagerContract() {
        if (!window.nftFeedingManagerContract) {
            debug.error('NFTFeedingManager contract is not initialized');
            return;
        }
        
        try {
            // test calling a simple method
            debug.log('Testing NFTFeedingManager contract...');
            
            // you can add specific test calls here
            debug.log('NFTFeedingManager contract test completed');
        } catch (error) {
            debug.error('NFTFeedingManager contract test failed:', error);
        }
    }
    
    /**
     * Load NFT pets data
     */
    async function loadNFTPets() {
        debug.log('Loading NFT pets data...');
        
        // Show loading message
        updateLoadingMessage('Loading your pets...');
        
        try {
            // Priority 1: Try to get NFT data from parent window (home page)
            if (window.parent && window.parent !== window) {
                debug.log('Requesting NFT data from parent window...');
                
                // Request NFT data from parent
                window.parent.postMessage({
                    type: 'requestNFTData',
                    source: 'pets-page'
                }, '*');
                
                // Wait for response from parent
                const nftDataPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout waiting for NFT data from parent'));
                    }, 10000); // 10 second timeout
                    
                    const messageHandler = (event) => {
                        if (event.data && event.data.type === 'nftDataResponse') {
                            clearTimeout(timeout);
                            window.removeEventListener('message', messageHandler);
                            resolve(event.data.nfts || []);
                        }
                    };
                    
                    window.addEventListener('message', messageHandler);
                });
                
                try {
                    const parentNFTs = await nftDataPromise;
                    if (parentNFTs && parentNFTs.length > 0) {
                        debug.log(`Received ${parentNFTs.length} NFTs from parent window`);
        
                        // Enhanced NFT data processing for game mode
                        const processedNFTs = parentNFTs.map(nft => {
                            // Create a copy of the NFT to avoid modifying the original
                            const processedNFT = { ...nft };
                            
                            // Ensure quality information is properly extracted and stored
                            if (!processedNFT.quality && !processedNFT.rarity) {
                                const extractedQuality = extractNFTQuality(processedNFT);
                                processedNFT.quality = extractedQuality;
                                debug.log(`Enhanced NFT ${processedNFT.tokenId} with extracted quality: ${extractedQuality}`);
                            }
                            
                            // Ensure metadata structure is consistent
                            if (!processedNFT.metadata) {
                                processedNFT.metadata = {};
                            }
                            
                            // Ensure attributes array exists
                            if (!processedNFT.metadata.attributes) {
                                processedNFT.metadata.attributes = [];
                            }
                            
                            // Add quality to attributes if not present
                            const hasQualityAttr = processedNFT.metadata.attributes.some(attr => {
                                const traitType = String(attr.trait_type || '').toLowerCase();
                                return traitType === 'quality' || traitType === 'rarity';
                            });
                            
                            if (!hasQualityAttr && processedNFT.quality) {
                                processedNFT.metadata.attributes.push({
                                    trait_type: 'Quality',
                                    value: processedNFT.quality
                                });
                                debug.log(`Added quality attribute to NFT ${processedNFT.tokenId}: ${processedNFT.quality}`);
                            }
                            
                            return processedNFT;
                        });
                        
                        // Update global variables with processed data
                        petsData = processedNFTs;
                        allNFTs = [...processedNFTs];
                        originalNFTs = [...processedNFTs]; // Store original unfiltered data
                        userNFTs = [...processedNFTs];
                        window.userNFTs = [...processedNFTs]; // For PetRewards module compatibility
                        totalNFTs = processedNFTs.length;
                        currentPage = 1;
                        
                        debug.log(`Processed ${processedNFTs.length} NFTs with enhanced quality information`);
                        
                        // Apply quality filter if not 'all'
                        if (currentQualityFilter !== 'all') {
                            filterPetsByQuality();
                        } else {
                            displayPaginatedNFTs();
                        }
                    return;
                }
                } catch (parentError) {
                    debug.warn('Failed to get NFT data from parent:', parentError.message);
                }
            }
            
            // Priority 2: Try to get from PetNFTService cache
            if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
                debug.log('Trying to get NFT data from PetNFTService cache...');
                
                const userAddress = getCurrentWalletAddress();
                if (userAddress) {
                    const cachedNFTs = window.PetNFTService.getCachedNFTs({
                        userAddress: userAddress
                    });
                    
                    if (cachedNFTs && cachedNFTs.length > 0) {
                        debug.log(`Found ${cachedNFTs.length} NFTs in cache`);
                        
                        // Enhanced processing for cached NFTs
                        const processedCachedNFTs = cachedNFTs.map(nft => {
                            const processedNFT = { ...nft };
                            
                            // Ensure quality information is properly extracted and stored
                            if (!processedNFT.quality && !processedNFT.rarity) {
                                const extractedQuality = extractNFTQuality(processedNFT);
                                processedNFT.quality = extractedQuality;
                                debug.log(`Enhanced cached NFT ${processedNFT.tokenId} with extracted quality: ${extractedQuality}`);
                            }
                            
                            // Ensure metadata structure consistency
                            if (!processedNFT.metadata) {
                                processedNFT.metadata = {};
                            }
                            if (!processedNFT.metadata.attributes) {
                                processedNFT.metadata.attributes = [];
                            }
                            
                            // Add quality to attributes if not present
                            const hasQualityAttr = processedNFT.metadata.attributes.some(attr => {
                                const traitType = String(attr.trait_type || '').toLowerCase();
                                return traitType === 'quality' || traitType === 'rarity';
                            });
                            
                            if (!hasQualityAttr && processedNFT.quality) {
                                processedNFT.metadata.attributes.push({
                                    trait_type: 'Quality',
                                    value: processedNFT.quality
                                });
                            }
                            
                            return processedNFT;
                        });
                        
                        // Update global variables
                        petsData = processedCachedNFTs;
                        allNFTs = [...processedCachedNFTs];
                        originalNFTs = [...processedCachedNFTs]; // Store original unfiltered data
                        userNFTs = [...processedCachedNFTs];
                        window.userNFTs = [...processedCachedNFTs]; // For PetRewards module compatibility
                        totalNFTs = processedCachedNFTs.length;
                        currentPage = 1;
                        
                        // Apply quality filter if not 'all'
                        if (currentQualityFilter !== 'all') {
                            filterPetsByQuality();
                        } else {
                            displayPaginatedNFTs();
                        }
                        return;
                    }
                }
            }
            
            // Priority 3: Try to load from localStorage cache
            debug.log('Trying to get NFT data from localStorage...');
            try {
                const savedCache = localStorage.getItem('nftCache');
                if (savedCache) {
                    const parsedCache = JSON.parse(savedCache);
                    if (parsedCache.allNfts && parsedCache.allNfts.length > 0) {
                        debug.log(`Found ${parsedCache.allNfts.length} NFTs in localStorage`);
                        
                        // Enhanced processing for localStorage cached NFTs
                        const processedStorageNFTs = parsedCache.allNfts.map(nft => {
                            const processedNFT = { ...nft };
                            
                            // Ensure quality information is properly extracted and stored
                            if (!processedNFT.quality && !processedNFT.rarity) {
                                const extractedQuality = extractNFTQuality(processedNFT);
                                processedNFT.quality = extractedQuality;
                                debug.log(`Enhanced localStorage NFT ${processedNFT.tokenId} with extracted quality: ${extractedQuality}`);
                            }
                            
                            // Ensure metadata structure consistency
                            if (!processedNFT.metadata) {
                                processedNFT.metadata = {};
                            }
                            if (!processedNFT.metadata.attributes) {
                                processedNFT.metadata.attributes = [];
                            }
                            
                            // Add quality to attributes if not present
                            const hasQualityAttr = processedNFT.metadata.attributes.some(attr => {
                                const traitType = String(attr.trait_type || '').toLowerCase();
                                return traitType === 'quality' || traitType === 'rarity';
                            });
                            
                            if (!hasQualityAttr && processedNFT.quality) {
                                processedNFT.metadata.attributes.push({
                                    trait_type: 'Quality',
                                    value: processedNFT.quality
                                });
                            }
                            
                            return processedNFT;
                        });
                        
                        // Update global variables
                        petsData = processedStorageNFTs;
                        allNFTs = [...processedStorageNFTs];
                        originalNFTs = [...processedStorageNFTs]; // Store original unfiltered data
                        userNFTs = [...processedStorageNFTs];
                        window.userNFTs = [...processedStorageNFTs]; // For PetRewards module compatibility
                        totalNFTs = processedStorageNFTs.length;
                        currentPage = 1;
                        
                        // Apply quality filter if not 'all'
                        if (currentQualityFilter !== 'all') {
                            filterPetsByQuality();
                } else {
                            displayPaginatedNFTs();
                        }
                    return;
                }
            }
            } catch (cacheError) {
                debug.warn('Error reading from localStorage cache:', cacheError);
            }
            
            // Priority 4: Try to use PetNFTService to refresh data (fallback)
            const userAddress = getCurrentWalletAddress();
            debug.log('User address for NFT loading:', userAddress);
            
            // Ensure Web3 is set up from WalletNetworkManager if needed
            if (walletNetworkManager && isWalletNetworkManagerReady && !window.web3) {
                debug.log('Setting up Web3 from WalletNetworkManager...');
                
                const managerWeb3 = walletNetworkManager.getWeb3();
                if (managerWeb3) {
                    window.web3 = managerWeb3;
                    debug.log('Web3 set from WalletNetworkManager for NFT loading');
                } else {
                    debug.warn('WalletNetworkManager Web3 not available for NFT loading');
                }
            }
            
            if (userAddress && window.PetNFTService && typeof window.PetNFTService.refreshNFTs === 'function') {
                debug.log('Attempting to refresh NFT data using PetNFTService...');
                updateLoadingMessage('Refreshing pet data...');
                
                try {
                    const result = await window.PetNFTService.refreshNFTs(userAddress, {
                        forceUpdate: false,
                refreshInterval: 300000, // 5 minutes
                        skipIntervalCheck: false
            });
            
                    if (result.success && result.nfts && result.nfts.length > 0) {
                        debug.log(`Successfully refreshed ${result.nfts.length} NFTs`);
                        
                        // Enhanced processing for refreshed NFTs
                        const processedRefreshedNFTs = result.nfts.map(nft => {
                            const processedNFT = { ...nft };
                            
                            // Ensure quality information is properly extracted and stored
                            if (!processedNFT.quality && !processedNFT.rarity) {
                                const extractedQuality = extractNFTQuality(processedNFT);
                                processedNFT.quality = extractedQuality;
                                debug.log(`Enhanced refreshed NFT ${processedNFT.tokenId} with extracted quality: ${extractedQuality}`);
                            }
                            
                            // Ensure metadata structure consistency
                            if (!processedNFT.metadata) {
                                processedNFT.metadata = {};
                            }
                            if (!processedNFT.metadata.attributes) {
                                processedNFT.metadata.attributes = [];
                            }
                            
                            // Add quality to attributes if not present
                            const hasQualityAttr = processedNFT.metadata.attributes.some(attr => {
                                const traitType = String(attr.trait_type || '').toLowerCase();
                                return traitType === 'quality' || traitType === 'rarity';
                            });
                            
                            if (!hasQualityAttr && processedNFT.quality) {
                                processedNFT.metadata.attributes.push({
                                    trait_type: 'Quality',
                                    value: processedNFT.quality
                                });
                            }
                            
                            return processedNFT;
                        });
                
                // Update global variables
                        petsData = processedRefreshedNFTs;
                        allNFTs = [...processedRefreshedNFTs];
                        originalNFTs = [...processedRefreshedNFTs]; // Store original unfiltered data
                        userNFTs = [...processedRefreshedNFTs];
                        window.userNFTs = [...processedRefreshedNFTs]; // For PetRewards module compatibility
                        totalNFTs = processedRefreshedNFTs.length;
                currentPage = 1;
                
                // Apply quality filter if not 'all'
                if (currentQualityFilter !== 'all') {
                    filterPetsByQuality();
                } else {
                    displayPaginatedNFTs();
                }
                        return;
                    }
                } catch (refreshError) {
                    debug.error('Error refreshing NFT data:', refreshError);
                }
            }
            
            // If all methods fail, show appropriate message
            if (!userAddress) {
                debug.log('No wallet address available, showing wallet connection message');
                showWalletNotConnectedMessage();
            } else {
                debug.log('No NFTs found for user');
                showNoNFTsMessage();
            }
            
        } catch (error) {
            debug.error('Error loading NFTs:', error);
            updateLoadingMessage('Error loading pets. Please try again.');
            setTimeout(() => {
                showNoNFTsMessage();
            }, 2000);
        }
    }
    
    /**
     * Display paginated NFTs
     */
    function displayPaginatedNFTs() {
        if (!allNFTs || allNFTs.length === 0) {
            showNoNFTsMessage();
            return;
        }
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalNFTs);
        const currentPageNFTs = allNFTs.slice(startIndex, endIndex);
        
        debug.log(`Displaying page ${currentPage}, showing ${currentPageNFTs.length} pets (${startIndex + 1}-${endIndex} of ${totalNFTs})`);
        
        // Render current page NFTs (async)
        renderPets(currentPageNFTs).catch(error => {
            debug.error('Error rendering pets:', error);
        });
        
        // Update pagination controls
        updatePaginationControls();
    }
    
    /**
     * Update loading message
     * @param {string} message - Loading message
     */
    function updateLoadingMessage(message) {
        if (petsGrid) {
            if (message && message.trim()) {
            petsGrid.innerHTML = `<div class="loading-message">${message}</div>`;
            } else {
                // Clear loading message but don't clear the grid content
                const loadingElement = petsGrid.querySelector('.loading-message');
                if (loadingElement) {
                    loadingElement.remove();
                }
            }
        }
    }
    
    /**
     * Update pagination controls
     */
    function updatePaginationControls() {
        const totalPages = Math.ceil(totalNFTs / pageSize);
        
        // Update pagination info
        if (paginationInfo) {
            const startIndex = (currentPage - 1) * pageSize + 1;
            const endIndex = Math.min(currentPage * pageSize, totalNFTs);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalNFTs} pets`;
        }
        
        // Update previous button
        if (prevPageBtn) {
            prevPageBtn.disabled = currentPage <= 1;
            prevPageBtn.classList.toggle('disabled', currentPage <= 1);
        }
        
        // Update next button
        if (nextPageBtn) {
            nextPageBtn.disabled = currentPage >= totalPages;
            nextPageBtn.classList.toggle('disabled', currentPage >= totalPages);
        }
        
        // Update pagination links
        if (paginationLinks) {
            paginationLinks.innerHTML = '';
            
            // Show page numbers
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            // Adjust start page if we're near the end
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            // Add first page and ellipsis if needed
            if (startPage > 1) {
                addPageLink(1);
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.className = 'pagination-ellipsis';
                    paginationLinks.appendChild(ellipsis);
                }
            }
            
            // Add visible page numbers
            for (let i = startPage; i <= endPage; i++) {
                addPageLink(i);
            }
            
            // Add last page and ellipsis if needed
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.className = 'pagination-ellipsis';
                    paginationLinks.appendChild(ellipsis);
                }
                addPageLink(totalPages);
            }
        }
        
        // Show or hide pagination controls
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }
    
    /**
     * Add page link to pagination
     * @param {number} pageNum - Page number
     */
    function addPageLink(pageNum) {
        const link = document.createElement('button');
        link.textContent = pageNum;
        link.className = 'pagination-btn';
        if (pageNum === currentPage) {
            link.classList.add('active');
        }
        
        link.addEventListener('click', () => {
            if (pageNum !== currentPage) {
                currentPage = pageNum;
                displayPaginatedNFTs();
                    updatePaginationControls();
                }
            });
        
        paginationLinks.appendChild(link);
    }
    
    /**
     * Sort NFTs
     * @param {Array} nfts - NFT array
     * @param {string} sortType - Sort type
     * @returns {Array} Sorted NFT array
     */
    function sortNFTs(nfts, sortType) {
        if (!nfts || !Array.isArray(nfts)) return [];
        
        const sortedNfts = [...nfts];
        
        switch (sortType) {
            case 'id_asc':
                return sortedNfts.sort((a, b) => {
                    const idA = parseInt(a.token_id || a.tokenId || 0);
                    const idB = parseInt(b.token_id || b.tokenId || 0);
                    return idA - idB;
                });
                
            case 'id_desc':
                return sortedNfts.sort((a, b) => {
                    const idA = parseInt(a.token_id || a.tokenId || 0);
                    const idB = parseInt(b.token_id || b.tokenId || 0);
                    return idB - idA;
                });
                
            case 'rarity_asc':
                return sortedNfts.sort((a, b) => {
                    const rarityA = getRarityValue(a);
                    const rarityB = getRarityValue(b);
                    return rarityA - rarityB;
                });
                
            case 'rarity_desc':
                return sortedNfts.sort((a, b) => {
                    const rarityA = getRarityValue(a);
                    const rarityB = getRarityValue(b);
                    return rarityB - rarityA;
                });
                    
                default:
                return sortedNfts;
        }
    }
    
    /**
     * Get attribute value from NFT
     * @param {Object} nft - NFT object
     * @param {string} traitType - Trait type
     * @returns {string} Attribute value
     */
    function getAttributeValue(nft, traitType) {
        if (!nft.metadata || !nft.metadata.attributes) return '';
        
        const attr = nft.metadata.attributes.find(attr => 
            attr.trait_type === traitType || 
            attr.trait_type === traitType.toLowerCase()
        );
        
        return attr ? String(attr.value) : '';
    }
    
    /**
     * Get rarity value for sorting
     * @param {Object} nft - NFT object
     * @returns {number} Rarity value
     */
    function getRarityValue(nft) {
        const quality = getAttributeValue(nft, 'Quality') || getAttributeValue(nft, 'Rarity');
        const qualityUpper = quality.toUpperCase();
        
        const rarityMap = {
            'COMMON': 1,
            'GOOD': 2,
            'EXCELLENT': 3,
            'RARE': 4,
            'LEGENDARY': 5,
            'NORMAL': 1,
            'UNCOMMON': 2,
            'EPIC': 5,
            'LEGEND': 5
        };
        
        return rarityMap[qualityUpper] || 0;
    }
    
    /**
     * Show no NFTs message
     */
    function showNoNFTsMessage() {
        if (petsGrid) {
            petsGrid.innerHTML = `
                <div class="no-pets-message">
            <div class="no-pets-icon">🐾</div>
                    <h3>You have no pets</h3>
                    <p>Visit the store to buy your first pet NFT!</p>
                    <button class="get-pet-btn" onclick="handleAdoptButtonClick()">Visit the store</button>
                </div>
            `;
        }
        hidePaginationControls();
    }
    
    /**
     * Show wallet not connected message
     */
    function showWalletNotConnectedMessage() {
        if (petsGrid) {
            // Check if private key wallet is available but locked
            let message = 'Wallet not connected';
            let description = 'Please connect your wallet to view your pets.';
            let buttonText = 'Connect Wallet';
            let buttonAction = 'connectWallet()';
            
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const isReady = window.SecureWalletManager.isWalletReady();
                const isAuthenticated = window.SecureWalletManager.isUserAuthenticated();
                
                debug.log('Wallet status for message:', { keyCount, isLocked, isReady, isAuthenticated });
                
                if (keyCount > 0 && isLocked) {
                    message = 'Private key wallet is locked';
                    description = 'Please unlock your private key wallet to view your pets.';
                    buttonText = 'Unlock Wallet';
                    buttonAction = 'unlockPrivateKeyWallet()';
                } else if (keyCount > 0 && !isAuthenticated) {
                    message = 'Private key wallet needs authentication';
                    description = 'Please authenticate your private key wallet in settings.';
                    buttonText = 'Open Settings';
                    buttonAction = 'window.parent.postMessage({type: \'openSettings\'}, \'*\')';
                } else if (keyCount > 0 && !isReady) {
                    message = 'Private key wallet is not ready';
                    description = 'Please wait for the private key wallet to initialize.';
                    buttonText = 'Refresh';
                    buttonAction = 'location.reload()';
                } else if (keyCount === 0) {
                    message = 'No wallet found';
                    description = 'Please set up a private key wallet or connect an external wallet.';
                    buttonText = 'Setup Wallet';
                    buttonAction = 'setupWallet()';
                }
            }
            
            petsGrid.innerHTML = `
                <div class="wallet-not-connected-message">
                    <div class="wallet-icon">👛</div>
                    <h3>${message}</h3>
                    <p>${description}</p>
                    <button class="connect-wallet-btn" onclick="${buttonAction}">${buttonText}</button>
                </div>
            `;
        }
        hidePaginationControls();
    }
    
    /**
     * Hide pagination controls
     */
    function hidePaginationControls() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }
    
    /**
     * Bind pet card events
     */
    function bindPetCardEvents() {
        debug.log('Binding pet card events...');
        
        // Use event delegation for dynamic content
        if (petsGrid) {
            petsGrid.addEventListener('click', function(event) {
                const petCard = event.target.closest('.pet-card');
                if (!petCard) return;
                
                const action = event.target.closest('[data-action]');
                if (!action) return;
                
                const actionType = action.getAttribute('data-action');
                const petId = petCard.getAttribute('data-pet-id') || petCard.getAttribute('data-token-id');
                const contractAddress = petCard.getAttribute('data-contract-address');
                
                switch (actionType) {
                            case 'feed':
                        handleFeedAction(petId, contractAddress, petCard);
                        break;
                    case 'claim':
                        handleClaimAction(petId, contractAddress, petCard);
                        break;
                    case 'details':
                        handleDetailsAction(petId, contractAddress, petCard);
                                break;
                }
            });
        }
    }
    
    /**
     * Bind global pet card action events
     */
    function bindGlobalPetCardEvents() {
        debug.log('Binding global pet card action events...');
        
        // Listen for custom events from pet cards
        document.addEventListener('gamepetcard.action', async function(event) {
            const eventData = event.detail;
            debug.log('Received pet card action event:', eventData);
            
            if (eventData.action === 'feed') {
                // Handle single pet feeding
                await handleSinglePetFeedingEvent(eventData);
            } else if (eventData.action === 'claim') {
                // Handle single pet reward claim
                await handleSinglePetClaimEvent(eventData);
            }
        });
    }
    
    /**
     * Handle single pet feeding event from pet card
     * @param {Object} eventData - Event data from pet card
     */
    async function handleSinglePetFeedingEvent(eventData) {
        const { tokenId, feedHours, element, contractAddress } = eventData;
        debug.log(`Handling single pet feeding event: TokenID=${tokenId}, FeedHours=${feedHours}`);
        
        try {
            // Ensure PetFeeding module is loaded
            if (!window.PetFeeding || typeof window.handlePetFeeding !== 'function') {
                debug.log('Loading PetFeeding module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetFeeding.js');
                
                if (!window.PetFeeding || typeof window.handlePetFeeding !== 'function') {
                    throw new Error('Failed to load PetFeeding module');
                }
            }
            
            // Prepare feeding data
            const feedData = {
                tokenId: tokenId,
                feedHours: feedHours,
                element: element,
                contractAddress: contractAddress
            };
            
            // Call the feeding function
            await window.handlePetFeeding(feedData);
            
            // Refresh the pet display after successful feeding
            setTimeout(() => {
                loadNFTPets();
            }, 2000);
            
        } catch (error) {
            debug.error('Error handling single pet feeding event:', error);
            showGameMessage('Feeding failed: ' + (error.message || 'Unknown error'), 'error');
        }
    }
    
    /**
     * Handle single pet claim event from pet card
     * @param {Object} eventData - Event data from pet card
     */
    async function handleSinglePetClaimEvent(eventData) {
        const { tokenId, element, contractAddress } = eventData;
        debug.log(`Handling single pet claim event: TokenID=${tokenId}`);
        
        try {
            // Ensure PetRewards module is loaded
            if (!window.PetRewards || typeof window.handlePetRewardClaim !== 'function') {
                debug.log('Loading PetRewards module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetRewards.js');
                
                if (!window.PetRewards || typeof window.handlePetRewardClaim !== 'function') {
                    throw new Error('Failed to load PetRewards module');
                }
            }
            
            // Prepare claim data
            const claimData = {
                tokenId: tokenId,
                element: element,
                contractAddress: contractAddress
            };
            
            // Call the claim function
            await window.handlePetRewardClaim(claimData);
            
            // Refresh the pet display after successful claim
            setTimeout(() => {
                loadNFTPets();
            }, 2000);
            
        } catch (error) {
            debug.error('Error handling single pet claim event:', error);
            showGameMessage('Claim failed: ' + (error.message || 'Unknown error'), 'error');
        }
    }
    
    /**
     * Handle feed action
     * @param {string} petId - Pet ID
     * @param {string} contractAddress - Contract address
     * @param {HTMLElement} petCard - Pet card element
     */
    function handleFeedAction(petId, contractAddress, petCard) {
        debug.log('Handle feed action for pet:', petId);
        
        // For single pet feeding, we should let the pet card handle the feeding process
        // The pet card will show a dialog to get feeding hours and then trigger the feeding
        // We just need to ensure the PetFeeding module is loaded
        
        // Load PetFeeding module if not available
        if (!window.PetFeeding || typeof window.handlePetFeeding !== 'function') {
            debug.log('Loading PetFeeding module for single pet feeding...');
            loadFunctionPackage('../../scripts/functionPackages/PetFeeding.js')
                .then(() => {
                    debug.log('PetFeeding module loaded successfully');
                    // Trigger the feed button click on the pet card to show the feeding dialog
                    const feedButton = petCard.querySelector('.feed-btn');
                    if (feedButton) {
                        feedButton.click();
                    } else {
                        showGameMessage('Feed button not found on pet card', 'error');
                    }
                })
                .catch(error => {
                    debug.error('Failed to load PetFeeding module:', error);
                    showGameMessage('Failed to load feeding module, please refresh the page', 'error');
                });
        } else {
            // PetFeeding module is already loaded, trigger the feed button click
            const feedButton = petCard.querySelector('.feed-btn');
            if (feedButton) {
                feedButton.click();
            } else {
                showGameMessage('Feed button not found on pet card', 'error');
            }
        }
    }
    
    /**
     * Handle claim action
     * @param {string} petId - Pet ID
     * @param {string} contractAddress - Contract address
     * @param {HTMLElement} petCard - Pet card element
     */
    function handleClaimAction(petId, contractAddress, petCard) {
        debug.log('Handle claim action for pet:', petId);
        
        // Check if handlePetRewardClaim function is available
        if (typeof window.handlePetRewardClaim === 'function') {
            const claimData = {
                tokenId: petId,
                contractAddress: contractAddress,
                petCard: petCard
            };
            window.handlePetRewardClaim(claimData);
                } else {
            debug.warn('handlePetRewardClaim function not available');
            showGameMessage('Pet reward claim function is not available, please refresh the page', 'error');
        }
    }
    
    /**
     * Handle details action
     * @param {string} petId - Pet ID
     * @param {string} contractAddress - Contract address
     * @param {HTMLElement} petCard - Pet card element
     */
    function handleDetailsAction(petId, contractAddress, petCard) {
        debug.log('Handle details action for pet:', petId);
        // Implement pet details view
        showGameMessage(`Viewing details for pet #${petId}`, 'info');
    }
    
    /**
     * Localize content
     */
    function localizeContent() {
        debug.log('Localizing content...');
        
        // Update elements with data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.i18n && typeof window.i18n.t === 'function') {
                const translation = window.i18n.t(key);
            if (translation) {
                    el.textContent = translation;
                }
            }
        });
    }
    
    /**
     * Initialize batch action buttons
     */
    function initBatchActionButtons() {
        debug.log('Initializing batch action buttons...');
        
        const feedAllBtn = document.getElementById('feedAllPetsBtn');
        const claimAllBtn = document.getElementById('claimAllRewardsBtn');
        
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
    }
    
    /**
     * Load modal dialog component
     */
    function loadModalDialogComponent() {
        if (!window.ModalDialog) {
            const script = document.createElement('script');
            script.src = '../../scripts/other/modalDialog.js';
            script.onload = function() {
                debug.log('ModalDialog module loaded successfully');
            };
            script.onerror = function() {
                debug.error('ModalDialog module loading failed');
            };
            document.head.appendChild(script);
        }
    }
    
    /**
     * load the function package script
     * @param {string} scriptPath - the script path
     * @returns {Promise} return the loading result
     */
    function loadFunctionPackage(scriptPath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => resolve(true);
            script.onerror = (error) => reject(error);
            document.head.appendChild(script);
        });
    }
    
    /**
     * batch feed all pets
     */
    async function handleFeedAllPets() {
        debug.log('Starting batch feed process...');
        
        // Check wallet connection status using WalletNetworkManager
        const userAddress = getCurrentWalletAddress();
        
        if (!userAddress) {
            if (window.ModalDialog) {
                await window.ModalDialog.alert('Please connect your wallet first', {
                    title: 'Wallet Required'
                });
            } else {
                showGameMessage('Please connect your wallet first', 'error');
            }
            return;
        }
        
        debug.log('Using WalletNetworkManager address for batch feeding:', userAddress);
        
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
        // Priority 3: Try to get from allNFTs
        else if (allNFTs && allNFTs.length > 0) {
            currentUserNFTs = allNFTs;
            debug.log('Using allNFTs for feeding:', currentUserNFTs.length, 'NFTs');
        }
        // Priority 4: Try to get from PetNFTService cache
        else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
            currentUserNFTs = window.PetNFTService.getCachedNFTs();
            debug.log('Using PetNFTService cached NFTs for feeding:', currentUserNFTs ? currentUserNFTs.length : 0, 'NFTs');
        }
        
        // Check if there are any NFTs
        if (!currentUserNFTs || currentUserNFTs.length === 0) {
            if (window.ModalDialog) {
                await window.ModalDialog.alert('You have no pets to feed. Please make sure your pets are loaded first.', {
                    title: 'No Pets Found'
                });
            } else {
                showGameMessage('You have no pets to feed', 'error');
            }
            return;
        }
        
        // Load pet feeding module
        try {
            if (!window.PetFeeding) {
                debug.log('Loading PetFeeding module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetFeeding.js');
                
                if (!window.PetFeeding) {
                    throw new Error('Failed to load PetFeeding module');
                }
            }
        } catch (error) {
            debug.error('Failed to load PetFeeding module:', error);
        if (window.ModalDialog) {
                await window.ModalDialog.alert('Failed to load pet feeding module. Please refresh the page and try again.', {
                    title: 'Module Load Error'
                    });
            } else {
                showGameMessage('Failed to load feeding module, please refresh the page', 'error');
            }
            return;
        }
        
        // Load ModalDialog module (if not loaded yet)
        if (!window.ModalDialog) {
                try {
                await loadFunctionPackage('../../scripts/other/modalDialog.js');
                if (!window.ModalDialog) {
                    debug.error('Failed to load ModalDialog module');
                    // Fall back to simple prompts
                    return handleFeedAllPetsLegacy();
                }
                } catch (error) {
                debug.error('Failed to load ModalDialog module:', error);
                // Fall back to simple prompts
                return handleFeedAllPetsLegacy();
                }
        }
        
        // Use ModalDialog to prompt the user to enter the feeding time
        try {
            const promptResult = await window.ModalDialog.prompt({
                title: 'Batch Feed Pets',
                content: 'Please specify the duration you want to feed each pet',
                inputLabel: 'Feeding time (hours)',
                inputType: 'number',
                inputValue: '24',
                placeholder: 'Enter a number between 1 and 1000',
                confirmText: 'Confirm Feed',
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
                showGameMessage('Feeding operation cancelled', 'info');
            return;
        }
        
            // Get the inputted feeding time
            const feedingHoursPerNFT = parseInt(promptResult.value);
        
            // Show processing message
            showGameMessage(`Preparing batch feed (${feedingHoursPerNFT} hours/pet)...`, 'info');
        
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
                            showGameMessage('Authorizing PWFOOD token automatically...', 'info');
                        debug.log('Auto-authorizing PWFOOD token for game page batch feeding');
                            
                            // Check if ContractApprovalManager is available
                            if (!window.ContractApprovalManager) {
                                debug.log('ContractApprovalManager is not available, trying to load...');
                                try {
                                    await loadFunctionPackage('../../scripts/other/ContractApprovalManager.js');
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
                                showGameMessage('Authorization successful, starting batch feed', 'success');
                            debug.log('PWFOOD authorization successful, retrying game page batch feed');
                                // Try batch feed again
                                setTimeout(async () => {
                                    await handleFeedAllPets();
                                }, 1000);
                            } else {
                                showGameMessage('Authorization failed: ' + (approvalResult.error || 'Unknown error'), 'error');
                            debug.error('PWFOOD authorization failed:', approvalResult.error);
                            }
                        } catch (approvalError) {
                            debug.error('Authorization process error:', approvalError);
                            showGameMessage('Authorization process error: ' + (approvalError.message || 'Unknown error'), 'error');
                    }
                    return;
                }
                
                    // Insufficient balance
                    if (feedingResult.error && feedingResult.error.includes('Insufficient balance')) {
                        showGameMessage(`PWFOOD balance is insufficient, you need ${feedingResult.requiredAmount} PWFOOD, current balance ${feedingResult.balance} PWFOOD`, 'error');
                        
                        await window.ModalDialog.alert(
                            `<div style="color: #e53935;">
                                <strong>PWFOOD balance is insufficient!</strong><br><br>
                                Required: ${feedingResult.requiredAmount} PWFOOD<br>
                                Current balance: ${feedingResult.balance} PWFOOD
                            </div>`,
                            {
                                title: 'Insufficient Balance'
                            }
                        );
                    return;
                }
                
                    // Display information for invalid NFTs
                if (feedingResult.invalidNfts && feedingResult.invalidNfts.length > 0) {
                        const message = `There are ${feedingResult.invalidNfts.length} pets that have been skipped because the feeding time exceeds the limit`;
                    showGameMessage(message, 'warning');
                        debug.log('Skipped pets:', feedingResult.invalidNfts);
                }
                
                    // Other errors
                    showGameMessage('Batch feed failed: ' + feedingResult.error, 'error');
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
                
                showGameMessage(message, 'success');
                
                    await window.ModalDialog.alert(
                        `<div style="color: #4caf50;">
                            <strong>Successfully fed!</strong><br><br>
                            ✅ Successfully fed: ${feedingResult.successCount} pets<br>
                            ${feedingResult.failCount > 0 ? `❌ Failed: ${feedingResult.failCount} pets<br>` : ''}
                            ${feedingResult.skippedCount > 0 ? `⚠️ Skipped: ${feedingResult.skippedCount} pets (exceeds limit)<br>` : ''}
                            ⏱️ Each pet feeding time: ${feedingHoursPerNFT} hours<br>
                            💰 Consumed PWFOOD: ${feedingResult.totalFood || 'N/A'}
                        </div>`,
                        {
                            title: 'Feeding Results'
                        }
                    );
                    
                    // Refresh NFT display
                setTimeout(() => {
                    loadNFTPets();
                    }, 1000);
            } else if (feedingResult.failCount > 0) {
                    showGameMessage(`All feeding attempts failed, please check the PWFOOD balance or network status`, 'error');
                    
                    await window.ModalDialog.alert(
                        `<div style="color: #e53935;">
                            <strong>Feeding failed!</strong><br><br>
                            All ${feedingResult.failCount} pets' feeding attempts failed.<br>
                            Please check your PWFOOD balance or network status and try again.
                        </div>`,
                        {
                            title: 'Feeding Failed'
                        }
                    );
            }
        } catch (error) {
                debug.error('Batch feed process error:', error);
                showGameMessage('Batch feed failed: ' + (error.message || 'Unknown error'), 'error');
                
                await window.ModalDialog.alert(
                    `<div style="color: #e53935;">
                        <strong>Feeding process error</strong><br><br>
                        ${error.message || 'Unknown error'}
                    </div>`,
                    {
                        title: 'Feeding Failed'
                    }
                );
            }
        } catch (error) {
            debug.error('Batch feed process error:', error);
            showGameMessage('Batch feed failed: ' + (error.message || 'Unknown error'), 'error');
            
            if (window.ModalDialog) {
                await window.ModalDialog.alert(
                    `<div style="color: #e53935;">
                        <strong>Feeding process error</strong><br><br>
                        ${error.message || 'Unknown error'}
                    </div>`,
                    {
                        title: 'Feeding Failed'
                    }
                );
            }
        }
    }
    
    /**
     * Legacy batch feed all pets (fallback when ModalDialog is not available)
     */
    async function handleFeedAllPetsLegacy() {
        debug.log('Using legacy batch feed method...');
        
        const userAddress = getCurrentWalletAddress();
        
        if (!userAddress) {
            alert('Please connect your wallet first');
            return;
        }
        
        // Get user NFTs
        let currentUserNFTs = null;
        
        if (typeof userNFTs !== 'undefined' && userNFTs && userNFTs.length > 0) {
            currentUserNFTs = userNFTs;
        } else if (window.userNFTs && window.userNFTs.length > 0) {
            currentUserNFTs = window.userNFTs;
        } else if (allNFTs && allNFTs.length > 0) {
            currentUserNFTs = allNFTs;
        } else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
            currentUserNFTs = window.PetNFTService.getCachedNFTs();
        }
        
        if (!currentUserNFTs || currentUserNFTs.length === 0) {
            alert('You have no pets to feed');
            return;
        }
        
        // Prompt for feeding time
        const userInputHours = prompt('Please input the feed time for each pet (hours):', '24');
        
        if (userInputHours === null) {
            showGameMessage('Feeding operation cancelled', 'info');
            return;
        }
        
        const parsedHours = parseInt(userInputHours);
        if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 1000) {
            alert('Please input a valid feed time (1-1000 hours)');
            return;
        }
        
        showGameMessage(`Preparing batch feed (${parsedHours} hours/pet)...`, 'info');
        
        try {
            const options = {
                maxFeedingHours: 168
            };
            
            const feedingResult = await window.PetFeeding.feedAllPets(currentUserNFTs, parsedHours, options);
            
            if (feedingResult.success && feedingResult.successCount > 0) {
                let message = `Successfully fed ${feedingResult.successCount} pets, each ${parsedHours} hours`;
                if (feedingResult.failCount > 0) {
                    message += `, failed ${feedingResult.failCount} pets`;
                }
                if (feedingResult.skippedCount > 0) {
                    message += `, skipped ${feedingResult.skippedCount} pets`;
                }
                
                showGameMessage(message, 'success');
                alert(message);
                
                setTimeout(() => {
                    loadNFTPets();
                }, 1000);
            } else {
                const errorMsg = feedingResult.error || 'Unknown error';
                showGameMessage('Batch feed failed: ' + errorMsg, 'error');
                alert('Batch feed failed: ' + errorMsg);
            }
        } catch (error) {
            debug.error('Legacy batch feed error:', error);
            const errorMsg = error.message || 'Unknown error';
            showGameMessage('Batch feed failed: ' + errorMsg, 'error');
            alert('Batch feed failed: ' + errorMsg);
        }
    }
    
    /**
     * batch claim all pet rewards
     */
    async function handleClaimAllRewards() {
        debug.log('Starting batch claim process...');
        
        // Check wallet connection status using WalletNetworkManager
        const userAddress = getCurrentWalletAddress();
        
        if (!userAddress) {
            if (window.ModalDialog) {
                await window.ModalDialog.alert('Please connect your wallet first', {
                    title: 'Wallet Required'
                });
            } else {
                showGameMessage('Please connect your wallet first', 'error');
            }
            return;
        }
        
        debug.log('Using WalletNetworkManager address for batch claiming:', userAddress);
        
        // Load pet rewards module first
        try {
            if (!window.PetRewards) {
                debug.log('Loading PetRewards module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetRewards.js');
                
                if (!window.PetRewards) {
                    throw new Error('Failed to load PetRewards module');
                }
            }
        } catch (error) {
            debug.error('Failed to load PetRewards module:', error);
            if (window.ModalDialog) {
                await window.ModalDialog.alert('Failed to load pet rewards module. Please refresh the page and try again.', {
                    title: 'Module Load Error'
                });
            } else {
                showGameMessage('Failed to load reward module, please refresh the page', 'error');
            }
            return;
        }
        
        // Load ModalDialog module (if not loaded yet)
        if (!window.ModalDialog) {
            try {
                await loadFunctionPackage('../../scripts/other/modalDialog.js');
                if (!window.ModalDialog) {
                    debug.error('Failed to load ModalDialog module');
                    // Fall back to simple confirm
                    return handleClaimAllRewardsLegacy();
                }
            } catch (error) {
                debug.error('Failed to load ModalDialog module:', error);
                // Fall back to simple confirm
                return handleClaimAllRewardsLegacy();
            }
        }
        
        // Check if the PetRewards module has the handleClaimAllRewards function
        if (typeof window.handleClaimAllRewards === 'function') {
            debug.log('Using PetRewards module handleClaimAllRewards function for game mode');
            
            // Debug: Show available NFT data sources
            debug.log('Available NFT data sources:');
            debug.log('- userNFTs:', typeof userNFTs !== 'undefined' ? userNFTs?.length : 'undefined');
            debug.log('- window.userNFTs:', window.userNFTs?.length || 'undefined');
            debug.log('- allNFTs:', allNFTs?.length || 'undefined');
            debug.log('- petsData:', petsData?.length || 'undefined');
            
            if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
                const cachedNFTs = window.PetNFTService.getCachedNFTs();
                debug.log('- PetNFTService cache:', cachedNFTs?.length || 'undefined');
            }
            
            // Check if we need to enrich NFT data with feeding information
            let needsFeedingEnrichment = false;
            if (window.userNFTs && window.userNFTs.length > 0) {
                // Check if NFTs have feeding information
                const sampleNFT = window.userNFTs[0];
                if (!sampleNFT.feedingInfo && !sampleNFT.isActive && typeof sampleNFT.lastClaimTime === 'undefined') {
                    needsFeedingEnrichment = true;
                    debug.log('NFT data lacks feeding information, will enrich data before claiming rewards');
                }
            }
            
            // If we need to enrich data, get feeding status from contract
            if (needsFeedingEnrichment && window.userNFTs && window.userNFTs.length > 0) {
                try {
                    debug.log('Enriching NFT data with feeding status information...');
                    showGameMessage('Getting latest pet feeding status...', 'info');
                    
                    const enrichedNFTs = await enrichNFTsWithFeedingStatus(window.userNFTs);
                    
                    if (enrichedNFTs && enrichedNFTs.length > 0) {
                        debug.log(`Successfully enriched ${enrichedNFTs.length} NFTs with feeding status`);
                        
                        // Update all NFT data variables with enriched data
                        petsData = enrichedNFTs;
                        allNFTs = [...enrichedNFTs];
                        userNFTs = [...enrichedNFTs];
                        window.userNFTs = [...enrichedNFTs];
                        
                        debug.log('Updated NFT data with feeding status information');
                    } else {
                        debug.warn('Failed to enrich NFT data with feeding status, proceeding with existing data');
                    }
                } catch (enrichError) {
                    debug.error('Error enriching NFT data with feeding status:', enrichError);
                    debug.log('Proceeding with existing NFT data despite enrichment failure');
                }
            }
            
            try {
                // Use the same function as normal mode for consistency
                await window.handleClaimAllRewards();
                
                // Refresh the NFT display after successful claim
                setTimeout(() => {
                    loadNFTPets();
                }, 1000);
                } catch (error) {
                debug.error('Error using PetRewards handleClaimAllRewards:', error);
                showGameMessage('Claim failed: ' + (error.message || 'Unknown error'), 'error');
            }
        } else {
            debug.warn('PetRewards handleClaimAllRewards function not available, using fallback implementation');
            // Fallback to legacy implementation
            return handleClaimAllRewardsLegacy();
                }
        }
        
    /**
     * Legacy batch claim all rewards (fallback when ModalDialog is not available)
     */
    async function handleClaimAllRewardsLegacy() {
        debug.log('Using legacy batch claim method...');
        
        const userAddress = getCurrentWalletAddress();
        
        if (!userAddress) {
            alert('Please connect your wallet first');
            return;
        }
        
        // Get user NFTs
        let currentUserNFTs = null;
        
        if (typeof userNFTs !== 'undefined' && userNFTs && userNFTs.length > 0) {
            currentUserNFTs = userNFTs;
        } else if (window.userNFTs && window.userNFTs.length > 0) {
            currentUserNFTs = window.userNFTs;
        } else if (allNFTs && allNFTs.length > 0) {
            currentUserNFTs = allNFTs;
        } else if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
            currentUserNFTs = window.PetNFTService.getCachedNFTs();
        }
        
        if (!currentUserNFTs || currentUserNFTs.length === 0) {
            alert('You have no pets to claim rewards');
            return;
        }
        
        // Extract tokenIds with comprehensive fallback logic
        const nftIds = currentUserNFTs.map(nft => {
            // Try multiple possible field names for tokenId
            const id = nft.tokenId || nft.token_id || nft.id || nft.ID || nft;
            
            // Ensure it's a valid number
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                debug.warn('Invalid tokenId found:', nft);
                return null;
            }
            
            return parsedId;
        }).filter(id => id !== null); // Remove invalid entries
        
        if (nftIds.length === 0) {
            alert('No valid NFT IDs found');
            return;
        }
        
        const userConfirmed = confirm(`Are you sure you want to claim rewards for ${nftIds.length} pets?`);
        
        if (!userConfirmed) {
            showGameMessage('Claim operation cancelled', 'info');
            return;
        }
        
        showGameMessage('Preparing to claim rewards, please wait...', 'info');
        
        try {
            const result = await window.PetRewards.claimAllRewards(currentUserNFTs);
            
            if (result.success) {
                const actualPwp = result.totalPwpotRewards || result.pwpotRewards || 0;
                const actualPwb = result.totalPwbotRewards || result.pwbotRewards || 0;
                
                let successMessage = `Successfully claimed rewards! Got ${actualPwp} PWP and ${actualPwb} PWB`;
                if (result.filteredOutCount > 0) {
                    successMessage += ` (filtered out ${result.filteredOutCount} pets without rewards)`;
                }
                
                showGameMessage(successMessage, 'success');
                alert(successMessage);
                
                setTimeout(() => {
                    loadNFTPets();
                }, 1000);
            } else {
                const errorMsg = result.error || 'Unknown error';
                showGameMessage('Claim failed: ' + errorMsg, 'error');
                alert('Claim failed: ' + errorMsg);
            }
        } catch (error) {
            debug.error('Legacy batch claim error:', error);
            const errorMsg = error.message || 'Unknown error';
            showGameMessage('Claim failed: ' + errorMsg, 'error');
            alert('Claim failed: ' + errorMsg);
        }
    }

    
    /**
     * display the game message
     * @param {string} message - the message content
     * @param {string} type - the message type: 'info', 'success', 'warning', 'error'
     */
    function showGameMessage(message, type = 'info') {
        // create the message element
        const msgElement = document.createElement('div');
        msgElement.className = `game-message ${type}`;
        msgElement.textContent = message;
        
        // add to the document
        document.body.appendChild(msgElement);
        
        // display the message
        setTimeout(() => {
            msgElement.classList.add('show');
        }, 10);
        
        // set the auto remove
        setTimeout(() => {
            msgElement.classList.remove('show');
            setTimeout(() => {
                if (msgElement.parentNode) {
                    msgElement.parentNode.removeChild(msgElement);
                }
            }, 300);
        }, 5000);
    }
    
    /**
     * handle the message from the parent page
     */
    function handleParentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('Receive message from parent window:', message);
        
        switch (message.type) {
            case 'petsData':
                // received the pets data
                petsData = message.data;
                allNFTs = [...petsData]; // Update allNFTs for filtering and pagination
                userNFTs = [...petsData]; // Update userNFTs for batch operations
                
                // Also set global window.userNFTs for PetRewards module compatibility
                window.userNFTs = [...petsData];
                
                totalNFTs = petsData.length;
                currentPage = 1; // Reset to first page
                
                debug.log(`Received ${petsData.length} pets data from parent, updated all NFT variables`);
                
                // Apply quality filter if not 'all'
                if (currentQualityFilter !== 'all') {
                    filterPetsByQuality();
                } else {
                    displayPaginatedNFTs();
                }
                break;
                
            case 'walletData':
                // Handle wallet data from parent (similar to shop.js)
                const { connected, address, web3Instance } = message.data;
                
                if (web3Instance && !window.web3) {
                    window.web3 = web3Instance;
                    debug.log('Web3 instance received from parent');
                }
                
                if (connected && address) {
                    window.currentAddress = address;
                    debug.log('Wallet data received:', { connected, address });
                    
                    if (window.web3) {
                        initContracts();
                    }
                    
                    setTimeout(() => {
                        loadNFTPets();
                    }, 1000);
                }
                break;
                
            case 'petStatsUpdated':
                // pet stats updated
                updatePetStats(message.data);
                break;
                
            case 'petLevelUp':
                // pet level up
                handlePetLevelUp(message.data);
                break;
                
            case 'walletUnlocked':
                // private key wallet was unlocked
                debug.log('Private key wallet unlocked, refreshing pets...');
                showGameMessage('Wallet unlocked successfully!', 'success');
                
                // Re-initialize wallet connection
                checkStoredWalletConnection();
                
                setTimeout(() => {
                    loadNFTPets();
                }, 1000);
                break;
                
            case 'walletLocked':
                // private key wallet was locked
                debug.log('Private key wallet locked');
                showGameMessage('Wallet has been locked', 'warning');
                showWalletNotConnectedMessage();
                break;
                
            case 'walletConnected':
                // external wallet connected
                debug.log('External wallet connected, refreshing pets...');
                showGameMessage('Wallet connected successfully!', 'success');
                
                // Re-initialize wallet connection
                checkStoredWalletConnection();
                
                setTimeout(() => {
                    loadNFTPets();
                }, 1000);
                break;
                
            case 'walletDisconnected':
                // wallet disconnected
                debug.log('Wallet disconnected');
                showGameMessage('Wallet disconnected', 'warning');
                window.currentAddress = null;
                showWalletNotConnectedMessage();
                break;
        }
    }
    
    /**
     * Get real feeding info for an NFT
     * @param {Object} nft - NFT data object
     * @returns {Promise<Object>} NFT with updated feeding info
     */
    async function enrichNFTWithFeedingInfo(nft) {
        try {
            // Skip if feeding info already exists
            if (nft.feedingInfo) {
                debug.log(`NFT #${nft.tokenId} already has feeding info, skipping enrichment`);
                return nft;
            }
            
            // Check if PetFeeding module is available
            if (!window.PetFeeding || typeof window.PetFeeding.getNFTFeedingInfo !== 'function') {
                debug.warn(`PetFeeding module not available for NFT #${nft.tokenId}`);
                return nft;
            }
            
            debug.log(`Getting real feeding info for NFT #${nft.tokenId}...`);
            
            // Get feeding info from contract
            const feedingInfo = await window.PetFeeding.getNFTFeedingInfo(nft.tokenId);
            
            if (feedingInfo) {
                // Add feeding info to NFT data
                nft.feedingInfo = feedingInfo;
                debug.log(`Successfully enriched NFT #${nft.tokenId} with feeding info:`, feedingInfo);
            } else {
                debug.warn(`No feeding info returned for NFT #${nft.tokenId}`);
            }
            
            return nft;
        } catch (error) {
            debug.error(`Error getting feeding info for NFT #${nft.tokenId}:`, error);
            return nft; // Return original NFT if enrichment fails
        }
    }
    
    /**
     * Enrich multiple NFTs with feeding info
     * @param {Array} pets - Array of NFT data objects
     * @returns {Promise<Array>} Array of NFTs with updated feeding info
     */
    async function enrichNFTsWithFeedingInfo(pets) {
        if (!pets || pets.length === 0) {
            return pets;
        }
        
        debug.log(`Enriching ${pets.length} NFTs with real feeding data...`);
        
        // Process NFTs in batches to avoid overwhelming the contract
        const batchSize = 5;
        const enrichedPets = [];
        
        for (let i = 0; i < pets.length; i += batchSize) {
            const batch = pets.slice(i, i + batchSize);
            
            // Process batch concurrently
            const enrichedBatch = await Promise.all(
                batch.map(nft => enrichNFTWithFeedingInfo(nft))
            );
            
            enrichedPets.push(...enrichedBatch);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < pets.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        debug.log(`Successfully enriched ${enrichedPets.length} NFTs with feeding data`);
        return enrichedPets;
    }
    
    /**
     * Render pets
     * @param {Array} pets - Pet data array
     */
    async function renderPets(pets) {
        if (!pets || pets.length === 0) {
            showNoNFTsMessage();
            return;
        }
        
        debug.log(`Rendering ${pets.length} pets`);
        
        // Clear existing content
        if (petsGrid) {
            petsGrid.innerHTML = '';
        }
        
        // Check if createGamePetCard function is available
        if (typeof window.createGamePetCard !== 'function') {
            debug.error('createGamePetCard function not available');
            showNoNFTsMessage();
            return;
        }
        
        // Show loading message while enriching data
        updateLoadingMessage('Loading pet feeding data...');
        
        try {
            // Enrich NFTs with real feeding info
            const enrichedPets = await enrichNFTsWithFeedingInfo(pets);
            
            // Clear loading message
            updateLoadingMessage('');
        
        // Create and append pet cards
            enrichedPets.forEach(nft => {
                try {
                    const petCard = window.createGamePetCard(nft);
                    if (petCard && petsGrid) {
                        petsGrid.appendChild(petCard);
                    }
                } catch (error) {
                    debug.error('Error creating pet card:', error, nft);
                }
            });
            
            debug.log(`Successfully rendered ${enrichedPets.length} pet cards with real feeding data`);
        } catch (error) {
            debug.error('Error enriching pets with feeding data:', error);
            
            // Fallback: render pets without enriched data
        pets.forEach(nft => {
            try {
                const petCard = window.createGamePetCard(nft);
                if (petCard && petsGrid) {
                    petsGrid.appendChild(petCard);
                }
            } catch (error) {
                debug.error('Error creating pet card:', error, nft);
            }
        });
        
            debug.log(`Rendered ${pets.length} pet cards without enriched feeding data`);
        }
    }
    
    /**
     * Update pet stats
     * @param {Object} data - Pet stats data
     */
    function updatePetStats(data) {
        debug.log('Updating pet stats:', data);
        
        // Find and update the specific pet card
        const petCard = document.querySelector(`[data-pet-id="${data.petId}"]`);
        if (petCard) {
            // Update stats display in the pet card
            const statsElement = petCard.querySelector('.pet-stats');
            if (statsElement) {
                // Update individual stat elements
                const levelElement = statsElement.querySelector('.level');
                const expElement = statsElement.querySelector('.experience');
                const healthElement = statsElement.querySelector('.health');
                
                if (levelElement) levelElement.textContent = data.level;
                if (expElement) expElement.textContent = data.experience;
                if (healthElement) healthElement.textContent = data.health;
            }
        }
    }
    
    /**
     * Handle pet level up
     * @param {Object} data - Pet level up data
     */
    function handlePetLevelUp(data) {
        debug.log('Pet level up:', data);
        
        // Show level up animation/message
        showGameMessage(`🎉 Pet #${data.petId} leveled up to level ${data.newLevel}!`, 'success');
        
        // Update pet stats
        updatePetStats(data);
    }
    
    /**
     * Handle adopt button click
     */
    function handleAdoptButtonClick() {
        debug.log('Navigate to adoption page');
        // Navigate to the shop or adoption page
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'navigate',
                page: 'shop'
            }, '*');
        } else {
            // Fallback navigation
            window.location.href = '../shop.html';
        }
    }
    
    /**
     * Connect wallet function
     */
    function connectWallet() {
        debug.log('Attempting to connect wallet');
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'connectWallet'
            }, '*');
        } else {
            showGameMessage('Please connect your wallet through the main application', 'info');
        }
    }
    
    /**
     * Unlock private key wallet function
     */
    function unlockPrivateKeyWallet() {
        debug.log('Attempting to unlock private key wallet');
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'unlockPrivateKeyWallet'
            }, '*');
        } else if (window.SecureWalletManager && typeof window.SecureWalletManager.showUnlockDialog === 'function') {
            window.SecureWalletManager.showUnlockDialog();
        } else {
            showGameMessage('Please unlock your private key wallet through the main application', 'info');
        }
    }
    
    /**
     * Setup wallet function
     */
    function setupWallet() {
        debug.log('Attempting to setup wallet');
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'setupWallet'
            }, '*');
        } else {
            showGameMessage('Please setup your wallet through the main application', 'info');
        }
    }
    

    
    // Expose functions to global scope for HTML onclick handlers
    window.connectWallet = connectWallet;
    window.unlockPrivateKeyWallet = unlockPrivateKeyWallet;
    window.setupWallet = setupWallet;
    window.handleAdoptButtonClick = handleAdoptButtonClick;
    
    /**
     * handle the click of the feed friend NFT button
     */
    function handleFeedFriendNFTClick() {
        debug.log('opening the feed friend NFT dialog');
        // check if the FeedFriendDialog module is loaded
        if (window.FeedFriendDialog) {
            window.FeedFriendDialog.show();
        } else {
            debug.log('FeedFriendDialog module is not loaded, trying to load...');
            // try to load the FeedFriendDialog module
            const script = document.createElement('script');
            script.src = '../../scripts/other/feedFriendDialog.js';
            script.onload = function() {
                debug.log('FeedFriendDialog module loaded successfully, showing the dialog');
                if (window.FeedFriendDialog) {
                    window.FeedFriendDialog.show();
                } else {
                    debug.error('FeedFriendDialog module loaded successfully but not initialized correctly');
                    showGameMessage('failed to open the feed dialog, please refresh the page and try again', 'error');
                }
            };
            script.onerror = function() {
                debug.error('failed to load the FeedFriendDialog module');
                showGameMessage('failed to load the feed dialog, please refresh the page and try again', 'error');
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Get feeding information for NFTs to supplement data from parent page
     * @param {Array} nfts - Array of NFT objects
     * @returns {Promise<Array>} NFTs with feeding information
     */
    async function enrichNFTsWithFeedingStatus(nfts) {
        if (!nfts || nfts.length === 0) {
            debug.log('No NFTs to enrich with feeding status');
            return nfts;
        }
        
        debug.log(`Enriching ${nfts.length} NFTs with feeding status information...`);
        
        // Check if NFTFeedingManager contract is available
        if (!window.nftFeedingManagerContract || !window.nftFeedingManagerContract.methods) {
            debug.warn('NFTFeedingManager contract not available, cannot get feeding status');
            return nfts;
        }
        
        const enrichedNFTs = [];
        
        // Process NFTs in batches to avoid overwhelming the contract
        const batchSize = 5;
        for (let i = 0; i < nfts.length; i += batchSize) {
            const batch = nfts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (nft) => {
                try {
                    const tokenId = nft.tokenId || nft.token_id;
                    if (!tokenId) {
                        debug.warn('NFT missing tokenId, skipping feeding status enrichment:', nft);
                        return nft;
                    }
                    
                    debug.log(`Getting feeding status for NFT #${tokenId}...`);
                    
                    // Get feeding data from contract
                    const feedingData = await window.nftFeedingManagerContract.methods.nftFeeding(tokenId).call();
                    
                    if (feedingData) {
                        // Add feeding information to NFT
                        const enrichedNFT = {
                            ...nft,
                            feedingInfo: feedingData,
                            isActive: feedingData.isActive,
                            lastClaimTime: parseInt(feedingData.lastClaimTime || 0),
                            feedingHours: parseInt(feedingData.feedingHours || 0),
                            quality: parseInt(feedingData.quality || 0),
                            accumulatedCycles: parseInt(feedingData.accumulatedCycles || 0),
                            lastFeedTime: parseInt(feedingData.lastFeedTime || 0)
                        };
                        
                        debug.log(`Successfully enriched NFT #${tokenId} with feeding status:`, {
                            isActive: enrichedNFT.isActive,
                            lastClaimTime: enrichedNFT.lastClaimTime,
                            feedingHours: enrichedNFT.feedingHours,
                            quality: enrichedNFT.quality,
                            accumulatedCycles: enrichedNFT.accumulatedCycles
                        });
                        
                        return enrichedNFT;
                    } else {
                        debug.warn(`No feeding data found for NFT #${tokenId}`);
                        return nft;
                    }
                } catch (error) {
                    debug.error(`Error getting feeding status for NFT #${nft.tokenId || nft.token_id}:`, error);
                    return nft; // Return original NFT if enrichment fails
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            enrichedNFTs.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < nfts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        debug.log(`Successfully enriched ${enrichedNFTs.length} NFTs with feeding status`);
        return enrichedNFTs;
    }
}); 
