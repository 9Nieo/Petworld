// shop page script

(function() {
    'use strict';
    
    // Load script function
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    // Scripts are already loaded in HTML, start initialization directly
    console.log('[Game Shop] All function modules already loaded in HTML');
    // Start initialization after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                init();
            }, 100);
        });
    } else {
        setTimeout(() => {
            init();
        }, 100);
    }

    // Global variables
    let web3 = null;
    let currentAddress = null;
    let walletNetworkManager = null;
    let nftLotteryManagerContract = null;
    let paymentManagerContract = null;
    let pwFoodManagerContract = null;
    let nftManagerContract = null;
    let pwNFTContract = null;
    let tokenContracts = {};
    let shopItems = [];
    
    // Debug object
    const debug = {
        log: function(...args) {
            console.log('[Game Shop Debug]', ...args);
        },
        error: function(...args) {
            console.error('[Game Shop Error]', ...args);
        },
        warn: function(...args) {
            console.warn('[Game Shop Warning]', ...args);
        }
    };

    // Make debug globally accessible for separated modules
    window.debug = debug;

    // Make key variables globally accessible for separated modules
    Object.defineProperty(window, 'web3', { get: () => web3, set: (value) => web3 = value });
    Object.defineProperty(window, 'currentAddress', { get: () => currentAddress, set: (value) => currentAddress = value });
    Object.defineProperty(window, 'nftLotteryManagerContract', { get: () => nftLotteryManagerContract, set: (value) => nftLotteryManagerContract = value });
    Object.defineProperty(window, 'paymentManagerContract', { get: () => paymentManagerContract, set: (value) => paymentManagerContract = value });
    Object.defineProperty(window, 'pwFoodManagerContract', { get: () => pwFoodManagerContract, set: (value) => pwFoodManagerContract = value });
    Object.defineProperty(window, 'nftManagerContract', { get: () => nftManagerContract, set: (value) => nftManagerContract = value });
    Object.defineProperty(window, 'pwNFTContract', { get: () => pwNFTContract, set: (value) => pwNFTContract = value });
    Object.defineProperty(window, 'tokenContracts', { get: () => tokenContracts, set: (value) => tokenContracts = value });
    Object.defineProperty(window, 'shopItems', { get: () => shopItems, set: (value) => shopItems = value });

    // Make key functions globally accessible for separated modules
    window.resetBuyButton = function(button) {
        if (!button) return;
        
        button.disabled = false;
        button.classList.remove('loading');
        
        if (button.id === 'free-nft-btn' || button.id === 'claim-free-nft-btn') {
            button.textContent = 'Claim';
        } else {
            button.textContent = 'Buy';
        }
        
        button.classList.remove('disabled');
    };

    window.showStatusMessage = function(message, type = 'info', params = {}) {
        showStatus(message, type, params);
    };

    window.getErrorMessage = function(error) {
        if (!error) return 'Unknown error';
        
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (message.includes('user denied') || message.includes('user rejected')) {
                return 'Transaction was cancelled by user';
            }
            
            if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
                return 'Insufficient balance to complete transaction';
            }
            
            if (message.includes('gas') && (message.includes('estimation') || message.includes('limit'))) {
                return 'Transaction may fail due to gas issues';
            }
            
            if (message.includes('network') || message.includes('connection')) {
                return 'Network connection error, please try again';
            }
            
            if (message.includes('revert') || message.includes('execution reverted')) {
                return 'Smart contract execution failed';
            }
        }
        
        return error.message || 'Transaction failed';
    };

    window.showSimpleAlert = function(title, message) {
        showCustomAlert(title, message);
    };

    // Add contract status check function for debugging
    window.checkContractStatus = function() {
        const status = {
            web3: !!web3,
            currentAddress: !!currentAddress,
            walletNetworkManager: !!walletNetworkManager,
            walletManagerStatus: walletNetworkManager ? walletNetworkManager.getStatus() : null,
            nftLotteryManagerContract: !!nftLotteryManagerContract,
            pwFoodManagerContract: !!pwFoodManagerContract,
            paymentManagerContract: !!paymentManagerContract,
            nftManagerContract: !!nftManagerContract,
            tokenContracts: Object.keys(tokenContracts || {}).length
        };
        
        console.log('[Game Shop] Contract Status:', status);
        return status;
    };

    // Add showStatus function for compatibility with anti-spam mechanism
    let lastStatusMessage = '';
    let lastStatusTime = 0;
    
    function showStatus(message, type = 'info', params = {}) {
        // Anti-spam mechanism: prevent duplicate messages within 1 second
        const now = Date.now();
        const messageKey = `${type}:${message}`;
        
        if (messageKey === lastStatusMessage && (now - lastStatusTime) < 1000) {
            return; // Skip duplicate message
        }
        
        lastStatusMessage = messageKey;
        lastStatusTime = now;
        
        debug.log(`Status [${type}]:`, message, params);
        
        // Try to use the game's status display system if available
        if (typeof window.showGameStatus === 'function') {
            window.showGameStatus(message, type, params);
                } else {
            console.log(`[${type.toUpperCase()}] ${message}`, params);
            
            const statusElement = document.getElementById('status-message');
            if (statusElement) {
                statusElement.textContent = `${message}`;
                statusElement.className = `status-message ${type}`;
                
                setTimeout(() => {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }, 3000);
            }
        }
    }

    // Initialize WalletNetworkManager
    async function initializeWalletNetworkManager() {
        debug.log('Initializing WalletNetworkManager...');
        
        try {
            // Create WalletNetworkManager instance
            if (window.WalletNetworkManager) {
                walletNetworkManager = new window.WalletNetworkManager();
            } else if (window.walletNetworkManager) {
                walletNetworkManager = window.walletNetworkManager;
            } else {
                throw new Error('WalletNetworkManager not available');
            }
            
            // Initialize the manager
            const initResult = await walletNetworkManager.init();
            
            debug.log('WalletNetworkManager initialization result:', initResult);
            
            if (initResult.success) {
                // Get Web3 instance and address
                web3 = walletNetworkManager.getWeb3();
                currentAddress = walletNetworkManager.getCurrentAddress();
                
                debug.log('WalletNetworkManager initialized successfully:', {
                    walletType: initResult.walletType,
                    network: initResult.network,
                    isConnected: initResult.isConnected,
                    address: currentAddress,
                    hasWeb3: !!web3
                });
                
                // Update UI
                updateWalletUI(initResult.isConnected, currentAddress);
                
                // Initialize contracts if ready
                if (walletNetworkManager.isReadyForContracts()) {
                    await initializeContractsWithManager();
                }
                
                return initResult;
            } else {
                debug.warn('WalletNetworkManager initialization failed:', initResult.error);
                
                if (initResult.requiresUserAction) {
                    showStatus(initResult.message || 'Wallet connection required', 'warning');
                } else {
                    showStatus('Failed to initialize wallet connection', 'error');
                }
                
                return initResult;
            }
        } catch (error) {
            debug.error('Error initializing WalletNetworkManager:', error);
            showStatus('Error initializing wallet system', 'error');
            return { success: false, error: error.message };
        }
    }

    // Initialize contracts using WalletNetworkManager
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
                contracts: ['NFTLotteryManager', 'PaymentManager', 'PwFoodManager', 'NFTManager', 'PwNFT']
            });
            
            debug.log('Contract initialization result:', contractResult);
            
            if (contractResult.success) {
                // Set contract instances
                nftLotteryManagerContract = contractResult.contracts.NFTLotteryManager || window.nftLotteryManagerContract;
                paymentManagerContract = contractResult.contracts.PaymentManager || window.paymentManagerContract;
                pwFoodManagerContract = contractResult.contracts.PwFoodManager || window.pwFoodManagerContract;
                nftManagerContract = contractResult.contracts.NFTManager || window.nftManagerContract;
                pwNFTContract = contractResult.contracts.PwNFT || window.pwNFTContract;
                
                debug.log('Contracts initialized:', {
                    nftLotteryManager: !!nftLotteryManagerContract,
                    paymentManager: !!paymentManagerContract,
                    pwFoodManager: !!pwFoodManagerContract,
                    nftManager: !!nftManagerContract,
                    pwNFT: !!pwNFTContract
                });
                
                // Initialize token contracts
                if (typeof window.initializeTokenContracts === 'function') {
                    window.initializeTokenContracts();
                }
                
                // Setup UI after contracts are ready
                setupShopUI();
                
                // Check claimable status
                setTimeout(() => {
                    checkClaimableStatus();
                }, 500);
                
                return true;
            } else {
                debug.error('Contract initialization failed:', contractResult);
                showStatus('Failed to initialize smart contracts', 'error');
                return false;
            }
        } catch (error) {
            debug.error('Error initializing contracts with manager:', error);
            showStatus('Error initializing smart contracts', 'error');
            return false;
        }
    }

    // Check claimable status for various items
    function checkClaimableStatus() {
        if (web3 && currentAddress) {
            debug.log('Checking claimable status...');
            
            if (typeof window.checkFreeNFTClaimStatus === 'function') {
                window.checkFreeNFTClaimStatus();
            }
            if (typeof window.checkClaimableEggsStatus === 'function') {
                window.checkClaimableEggsStatus();
            }
            if (typeof window.checkFreePwFoodClaimStatus === 'function') {
                window.checkFreePwFoodClaimStatus();
            }
            if (typeof window.updateNFTRemaining === 'function') {
                window.updateNFTRemaining();
            }
        }
    }

    function shouldUsePrivateKeyWallet() {
        if (!window.SecureWalletManager) {
            return false;
        }
        
        const keyCount = window.SecureWalletManager.getKeyCount();
        const isLocked = window.SecureWalletManager.isWalletLocked();
        const isReady = window.SecureWalletManager.isWalletReady();
        const activeAddress = window.SecureWalletManager.getAddress();
        
        return keyCount > 0 && !isLocked && isReady && !!activeAddress;
    }

    function getPrivateKeyWalletStatus() {
        if (!window.SecureWalletManager) {
            return { hasWallet: false, activeAddress: null };
        }
        
        const keyCount = window.SecureWalletManager.getKeyCount();
        const isLocked = window.SecureWalletManager.isWalletLocked();
        const isReady = window.SecureWalletManager.isWalletReady();
        const activeAddress = window.SecureWalletManager.getAddress();
        
        return {
            hasWallet: keyCount > 0 && !isLocked && isReady && !!activeAddress,
            activeAddress: activeAddress,
            keyCount: keyCount,
            isLocked: isLocked,
            isReady: isReady
        };
    }

    // Initialize function
    async function init() {
        console.log('[Game Shop] Initializing...');
        
        // Initialize shopItems array early
        shopItems = Array.from(document.querySelectorAll('.shop-item'));
        debug.log('Early shopItems initialization:', shopItems.length, 'items found');
        
        // Initialize payment tokens first
        if (typeof initPaymentTokens === 'function') {
            initPaymentTokens();
        }
        
        // Initialize WalletNetworkManager
        const walletResult = await initializeWalletNetworkManager();
        
        if (!walletResult.success && !walletResult.requiresUserAction) {
            // Fallback to legacy initialization if WalletNetworkManager fails
            debug.warn('Falling back to legacy wallet initialization...');
            await initializeLegacyWallet();
        }
        
        // Initialize UI
        setupShopUI();
        
        // Bind buy button events
        const shopGrid = document.querySelector('.shop-grid');
        if (shopGrid) {
            shopGrid.addEventListener('click', handleBuyButtonClick);
        }
        
        // Initialize batch purchase inputs
        if (typeof initBatchPurchaseInputs === 'function') {
            initBatchPurchaseInputs();
        }
        
        // Localize content
        localizeContent();
        
        console.log('[Game Shop] Initialization completed');
    }

    // Legacy wallet initialization as fallback
    async function initializeLegacyWallet() {
        debug.log('Initializing legacy wallet system...');
        
        // Load contract initializers
        loadContractInitializers();
        
        // Try to initialize Web3 and contracts
        if (!web3) {
            if (window.ethereum) {
                web3 = new Web3(window.ethereum);
                console.log('[Game Shop] Web3 initialized from window.ethereum');
            } else if (window.web3) {
                web3 = new Web3(window.web3.currentProvider);
                console.log('[Game Shop] Web3 initialized from window.web3');
            } else if (window.parent && window.parent.gameWeb3) {
                web3 = window.parent.gameWeb3;
                console.log('[Game Shop] Web3 initialized from parent.gameWeb3');
            } else if (window.gameWeb3) {
                web3 = window.gameWeb3;
                console.log('[Game Shop] Web3 initialized from window.gameWeb3');
            }
        }
        
        // Initialize contracts if Web3 is available
        if (web3) {
            try {
                initShopContracts();
                
                // Verify contracts are initialized after a delay
                setTimeout(() => {
                    if (!nftLotteryManagerContract || !pwFoodManagerContract) {
                        console.warn('[Game Shop] Some contracts not initialized, retrying...');
                        initShopContracts();
                    }
                }, 3000);
            } catch (error) {
                console.error('[Game Shop] Error initializing contracts:', error);
                setTimeout(() => {
                    init();
                }, 3000);
                return;
            }
        } else {
            console.warn('[Game Shop Warning] Web3 not available, will retry later');
            setTimeout(() => {
                init();
            }, 2000);
            return;
        }
        
        // Check wallet connection
        checkStoredWalletConnection();
        
        // Request wallet data
        requestWalletData();
        
        // Update wallet UI
        updateWalletUI(!!currentAddress, currentAddress);
    }
    
    function checkStoredWalletConnection() {
        // Priority 1: Check WalletNetworkManager first
        if (walletNetworkManager && walletNetworkManager.isInitialized) {
            const status = walletNetworkManager.getStatus();
            debug.log('WalletNetworkManager status in checkStoredWalletConnection:', status);
            
            if (status.isConnected) {
                currentAddress = walletNetworkManager.getCurrentAddress();
                web3 = walletNetworkManager.getWeb3();
                
                debug.log('Using WalletNetworkManager connection:', {
                    walletType: status.walletType,
                    network: status.network,
                    address: currentAddress
                });
                
                if (web3 && nftLotteryManagerContract) {
                    checkClaimableStatus();
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
                debug.log('Private key wallet is active, using it for game shop');
                
                currentAddress = activeAddress;
                web3 = window.SecureWalletManager.getWeb3();
                
                if (web3) {
                    debug.log('Initializing contracts with private key wallet');
                    initContracts();
                }
                
                if (nftLotteryManagerContract) {
                    checkClaimableStatus();
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
            currentAddress = storedAddress;
            
            if (nftLotteryManagerContract) {
                checkClaimableStatus();
            }
        } else {
            debug.log('No wallet connection status found in localStorage');
        }
    }
    
    function requestWalletData() {
        debug.log('Request wallet data');
        window.parent.postMessage({
            type: 'requestData',
            data: {}
        }, '*');
    }
    
    function handleParentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('Receive message from parent window:', message);
        
        if (message.type === 'walletData') {
            const { connected, address, web3Instance } = message.data;
            
            if (web3Instance && !web3) {
                web3 = web3Instance;
                debug.log('Web3 instance received from parent');
            }
            
            if (connected && address) {
                currentAddress = address;
                debug.log('Wallet data received:', { connected, address });
                
                updateWalletUI(connected, address);
                
                if (web3) {
                    initContracts();
                }
                
                        setTimeout(() => {
                    checkClaimableStatus();
                }, 1000);
            }
        }
    }

    function initContracts() {
        debug.log('Initialize contracts...');
            
        if (!web3) {
            debug.error('Web3 not initialized');
            return;
        }
        
        // If WalletNetworkManager is available and ready, use it
        if (walletNetworkManager && walletNetworkManager.isReadyForContracts()) {
            initializeContractsWithManager();
        } else {
            // Fallback to legacy contract initialization
            initShopContracts();
        }
    }

    function handleBuyButtonClick(event) {
        const button = event.target.closest('.buy-btn');
        if (!button) return;
        
        const shopItem = button.closest('.shop-item');
        if (!shopItem) return;
        
        const itemId = shopItem.getAttribute('data-id');
        const category = shopItem.getAttribute('data-category');
        
        if (!web3 || !currentAddress) {
            showStatus('Please connect wallet first to buy', 'error');
            return;
        }
        
        debug.log(`Click buy button: ${itemId}, category: ${category}`);
        
        // Set button to loading state
        button.disabled = true;
        button.classList.add('loading');
        button.textContent = 'Processing...';
        
        try {
            switch(itemId) {
                case 'egg-common':
                    if (typeof window.purchaseEgg === 'function') {
                        if (!nftLotteryManagerContract) {
                            debug.error('NFTLotteryManager contract not initialized');
                            showStatus('Contract not initialized, please wait and try again', 'error');
                            return;
                        }
                        window.purchaseEgg(1, 'USDT', button);
            } else {
                        debug.error('purchaseEgg function not available');
                        showStatus('Function not loaded', 'error');
                    }
                break;
                case 'egg-rare':
                    if (typeof window.purchaseEgg === 'function') {
                        if (!nftLotteryManagerContract) {
                            debug.error('NFTLotteryManager contract not initialized');
                            showStatus('Contract not initialized, please wait and try again', 'error');
                                return;
                            }
                        window.purchaseEgg(2, 'USDT', button);
                } else {
                        debug.error('purchaseEgg function not available');
                        showStatus('Function not loaded', 'error');
                }
                break;
                case 'egg-legendary':
                    if (typeof window.purchaseEgg === 'function') {
                        if (!nftLotteryManagerContract) {
                            debug.error('NFTLotteryManager contract not initialized');
                            showStatus('Contract not initialized, please wait and try again', 'error');
                            return;
                        }
                        window.purchaseEgg(3, 'USDT', button);
                    } else {
                        debug.error('purchaseEgg function not available');
                        showStatus('Function not loaded', 'error');
                }
                break;
                case 'pwfood':
                    if (typeof window.purchaseFood === 'function') {
                        if (!pwFoodManagerContract) {
                            debug.error('PwFoodManager contract not initialized');
                            showStatus('Contract not initialized, please wait and try again', 'error');
                            return;
                        }
                        window.purchaseFood('pwfood', 'USDT', button);
                    } else {
                        debug.error('purchaseFood function not available');
                        showStatus('Function not loaded', 'error');
                    }
                    break;
                case 'free-nft':
                    if (typeof window.claimFreeNFT === 'function') {
                        window.claimFreeNFT(button);
                        } else {
                        debug.error('claimFreeNFT function not available');
                        showStatus('Function not loaded', 'error');
                    }
                    break;
                case 'claim-eggs':
                    if (typeof window.claimEggs === 'function') {
                        window.claimEggs(button);
                    } else {
                        debug.error('claimEggs function not available');
                        showStatus('Function not loaded', 'error');
                    }
                    break;
                case 'free-pwfood':
                    if (typeof window.claimFreePwFood === 'function') {
                        window.claimFreePwFood(button);
            } else {
                        debug.error('claimFreePwFood function not available');
                        showStatus('Function not loaded', 'error');
                    }
                    break;
                default:
                    debug.error('Unknown item ID:', itemId);
                    showStatus('Unknown item', 'error');
                    break;
            }
        } catch (error) {
            debug.error('Error handling buy button click:', error);
            showStatus('Error processing purchase', 'error');
        } finally {
            // Reset button after a delay if it's still in loading state
            setTimeout(() => {
                if (button.classList.contains('loading')) {
                    window.resetBuyButton(button);
                }
            }, 5000);
        }
    }

    function updateStatusText(message, params = {}) {
        debug.log(`Status Text:`, message, params);
        
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-message info';
            
                        setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 3000);
                } else {
            console.log(`[STATUS] ${message}`, params);
        }
    }

    function localizeContent() {
        if (!window.i18n) return;
        
        document.title = i18n.t('shop.title') || 'Shop - Pet World';
        
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translation = i18n.t(key);
            
            const argsAttr = el.getAttribute('data-i18n-args');
            if (argsAttr) {
                try {
                    const args = JSON.parse(argsAttr);
                    Object.keys(args).forEach(argKey => {
                        translation = translation.replace(`{${argKey}}`, args[argKey]);
                    });
                } catch (e) {
                    console.error('Failed to parse data-i18n-args:', e);
                }
            }
            
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
    }
    
    function loadRequiredABIs() {
        debug.log('Loading required ABI files...');
        
        if (window.NFTLotteryManagerABI && window.PwFoodManagerABI && window.PaymentManagerABI) {
            debug.log('ABIs already loaded, proceeding with contract initialization');
                return;
            }
            
        const abisToLoad = [
            { name: 'NFTLotteryManagerABI', src: '../../scripts/contracts/ABI/NFTLotteryManagerABI.js' },
            { name: 'PwFoodManagerABI', src: '../../scripts/contracts/ABI/PwFoodManagerABI.js' },
            { name: 'PaymentManagerABI', src: '../../scripts/contracts/ABI/PaymentManagerABI.js' },
            { name: 'NFTManagerABI', src: '../../scripts/contracts/ABI/NFTManagerABI.js' },
            { name: 'GENERIC_ERC20_ABI', src: '../../scripts/contracts/ABI/GENERIC_ERC20_ABI.js' }
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

    function loadContractInitializers() {
        debug.log('Loading contract initializer files...');
        
        if (
            typeof window.initNFTLotteryManagerContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initPaymentManagerContract !== 'undefined' &&
            typeof window.initPwFoodManagerContract !== 'undefined' &&
            typeof window.initPwNFTContract !== 'undefined' &&
            typeof window.initERC20Contract !== 'undefined'
        ) {
            debug.log('Contract initializer files already loaded');
            return;
        }
        
        const initFiles = [
            '../../scripts/contracts/NFTLotteryManager.js',
            '../../scripts/init_contracts/initNFTLotteryManager.js',
            '../../scripts/init_contracts/initNFTManager.js',
            '../../scripts/init_contracts/initPaymentManager.js',
            '../../scripts/init_contracts/initPwFoodManager.js',
            '../../scripts/init_contracts/initPwNFT.js',
            '../../scripts/init_contracts/initERC20.js'
        ];
        
        initFiles.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = function() {
                debug.log(`Loaded: ${src}`);
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
            script.onerror = function() {
                debug.error(`Failed to load: ${src}`);
            };
            document.head.appendChild(script);
        });
    }

    function initShopContracts() {
        console.log('Initializing shop contracts...');
        
        try {
            if (!web3) {
                debug.error('Web3 is not initialized');
                return;
            }
            
            loadRequiredABIs();
            
            setTimeout(() => {
                initializeContractsWithABI();
            }, 1000);
        } catch (error) {
            debug.error('Error in initShopContracts:', error);
        }
    }

    function initializeContractsWithABI() {
        debug.log('Initializing contracts with loaded ABIs...');
        
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
        // Initialize NFTLotteryManager contract
            if (typeof initNFTLotteryManagerContract === 'function') {
                try {
                if (!window.NFTLotteryManagerABI) {
                    debug.error('NFTLotteryManagerABI not loaded, retrying in 2 seconds...');
                    setTimeout(() => {
                        initializeContractsWithABI();
                    }, 2000);
                        return;
                    }
                    
                debug.log('Starting to initialize the NFTLotteryManager contract...');
                    nftLotteryManagerContract = initNFTLotteryManagerContract(web3, getContractAddressFunc);
                    
                    if (nftLotteryManagerContract) {
                        debug.log('NFT lottery manager contract initialized successfully, address:', nftLotteryManagerContract._address);
                    } else {
                        debug.error('NFT lottery manager contract initialization returned null');
                    }
                } catch (error) {
                debug.error('Failed to initialize the NFT lottery manager contract:', error);
                }
            } else {
            debug.error('Cannot find the initNFTLotteryManagerContract function');
        }
        
        // Initialize PwFoodManager contract
            if (typeof initPwFoodManagerContract === 'function') {
                try {
                    if (!window.PwFoodManagerABI) {
                    debug.error('PwFoodManagerABI not loaded');
                        return;
                    }
                    
                debug.log('Starting to initialize the PwFoodManager contract...');
                    pwFoodManagerContract = initPwFoodManagerContract(web3, getContractAddressFunc);
                    
                    if (pwFoodManagerContract) {
                        debug.log('PwFoodManager contract initialized successfully, address:', pwFoodManagerContract._address);
                    } else {
                        debug.error('PwFoodManager contract initialization returned null');
                    }
                } catch (error) {
                debug.error('Failed to initialize the PwFoodManager contract:', error);
            }
                    } else {
            debug.error('Cannot find the initPwFoodManagerContract function');
        }
        
        // Initialize PaymentManager contract
            if (typeof initPaymentManagerContract === 'function') {
                try {
                if (!window.PaymentManagerABI) {
                    debug.error('PaymentManagerABI not loaded');
                        return;
                }
                
                debug.log('Starting to initialize the PaymentManager contract...');
                paymentManagerContract = initPaymentManagerContract(web3, getContractAddressFunc);
                
                if (paymentManagerContract) {
                    debug.log('PaymentManager contract initialized successfully, address:', paymentManagerContract._address);
                    } else {
                    debug.error('PaymentManager contract initialization returned null');
                    }
                } catch (error) {
                debug.error('Failed to initialize the PaymentManager contract:', error);
                        }
                    } else {
            debug.error('Cannot find the initPaymentManagerContract function');
        }
        
        // Initialize NFTManager contract
        try {
            if (!window.NFTManagerABI) {
                debug.error('NFTManagerABI not loaded');
                return;
            }
            
            debug.log('Starting to initialize the NFTManager contract...');
            
            // Use the global initNFTManagerContract function if available
            if (typeof window.initNFTManagerContract === 'function') {
                nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                } else {
                // Fallback: try to initialize directly
                const network = window.currentNetwork || 'LOCAL';
                const nftManagerAddress = window.contractAddresses?.[network]?.NFTManager;
                
                if (nftManagerAddress && window.NFTManagerABI) {
                    nftManagerContract = new web3.eth.Contract(window.NFTManagerABI, nftManagerAddress);
                    debug.log('NFTManager contract initialized directly, address:', nftManagerAddress);
            } else {
                    debug.error('Cannot initialize NFTManager contract: missing address or ABI');
                }
            }
            
            if (nftManagerContract) {
                debug.log('NFTManager contract initialized successfully, address:', nftManagerContract._address);
                } else {
                debug.error('NFTManager contract initialization returned null');
            }
        } catch (error) {
            debug.error('Failed to initialize the NFTManager contract:', error);
        }
        
        // Initialize token contracts
        if (typeof window.initializeTokenContracts === 'function') {
            window.initializeTokenContracts();
        }
        
        // After all contracts are initialized, check status and setup UI
                        setTimeout(() => {
            setupShopUI();
            
            if (web3 && currentAddress) {
                if (typeof window.checkFreeNFTClaimStatus === 'function') {
                    window.checkFreeNFTClaimStatus();
                }
                if (typeof window.checkClaimableEggsStatus === 'function') {
                    window.checkClaimableEggsStatus();
                }
                if (typeof window.checkFreePwFoodClaimStatus === 'function') {
                    window.checkFreePwFoodClaimStatus();
                }
                if (typeof window.updateNFTRemaining === 'function') {
                    window.updateNFTRemaining();
                }
            }
        }, 500);
    }

    function setupShopUI() {
        debug.log('Setting up shop UI...');
        
        // Initialize shopItems array from DOM
        shopItems = Array.from(document.querySelectorAll('.shop-item'));
        debug.log('Initialized shopItems:', shopItems.length, 'items found');
        
        const balanceContainer = document.getElementById('user-balance-container');
        if (balanceContainer) {
            balanceContainer.style.display = 'none';
        }
        
        const refreshBtn = document.getElementById('refresh-shop-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshShop);
        }
        
        if (typeof window.initBatchPurchaseInputs === 'function' && window.initBatchPurchaseInputs !== initBatchPurchaseInputs) {
            window.initBatchPurchaseInputs();
        } else if (typeof window.shopInitBatchPurchaseInputs === 'function') {
            window.shopInitBatchPurchaseInputs();
        }
        
        if (typeof window.updateItemPrices === 'function') {
            debug.log('Updating item prices...');
            window.updateItemPrices();
        }
        
        if (typeof window.initPaymentTokens === 'function') {
            window.initPaymentTokens();
        }
        
        if (web3 && currentAddress) {
            checkClaimableStatus();
        }
    }

    function updateWalletUI(connected, address = null) {
        debug.log('Update wallet UI:', connected, address);
        currentAddress = address;
        
        if (connected && address) {
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
            
            if (nftLotteryManagerContract) {
                debug.log('Check claimable NFT status after wallet connection');
                checkClaimableStatus();
            } else {
                setTimeout(() => {
                    if (nftLotteryManagerContract) {
                        debug.log('Check claimable NFT status after wallet connection');
                        checkClaimableStatus();
                    }
                }, 1000);
            }
    } else {
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
        }
    }

    function showCustomAlert(title, message) {
        if (typeof ModalDialog !== 'undefined' && ModalDialog.alert) {
            ModalDialog.alert(message, { title: title });
                } else {
            alert(`${title}\n\n${message}`);
        }
    }

    async function refreshShop() {
        debug.log('Refreshing shop...');
        
        try {
            if (typeof window.updateItemPrices === 'function') {
                window.updateItemPrices();
            }
            
            checkClaimableStatus();
            
            showStatus('Shop refreshed', 'success');
        } catch (error) {
            debug.error('Error refreshing shop:', error);
            showStatus('Error refreshing shop', 'error');
        }
    }

    function initNFTManagerContract() {
         // Check if the global initialization function exists and is different from this function
         if (typeof window.initNFTManagerContract === 'function' && window.initNFTManagerContract !== initNFTManagerContract) {
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
             return window.initNFTManagerContract(web3, getContractAddressFunc);
         }
         
         // Fallback: try to initialize NFTManager contract directly
         if (window.NFTManagerABI && window.contractAddresses) {
             const network = window.currentNetwork || 'LOCAL';
             const nftManagerAddress = window.contractAddresses[network]?.NFTManager;
             
             if (nftManagerAddress && web3) {
                 try {
                     const contract = new web3.eth.Contract(window.NFTManagerABI, nftManagerAddress);
                     debug.log('NFTManager contract initialized directly, address:', nftManagerAddress);
                     return contract;
            } catch (error) {
                     debug.error('Failed to initialize NFTManager contract directly:', error);
                 }
             }
         }
         
         return null;
     }

     function initBatchPurchaseInputs() {
         // This function will be implemented by the separated modules
         // Check if the global function exists and is different from this function
         if (typeof window.initBatchPurchaseInputs === 'function' && window.initBatchPurchaseInputs !== initBatchPurchaseInputs) {
             window.initBatchPurchaseInputs();
            } else {
             // Fallback: implement basic batch purchase input functionality
             debug.log('Setting up batch purchase inputs (fallback)...');
             
             const batchInputs = document.querySelectorAll('.batch-amount-input');
             batchInputs.forEach(input => {
                 if (!input.hasAttribute('data-initialized')) {
                     input.addEventListener('input', function(event) {
                         // Ensure value is between 1-5
                         let value = parseInt(event.target.value) || 1;
                         if (value < 1) value = 1;
                         if (value > 5) value = 5;
                         event.target.value = value;
                         
                         // Update total price if function exists
                         if (typeof window.updateEggTotalPrice === 'function') {
                             window.updateEggTotalPrice(event);
                         }
                     });
                     input.setAttribute('data-initialized', 'true');
                 }
             });
         }
     }

     // Make additional functions globally accessible for separated modules
     // Only assign if not already defined to avoid overwriting external functions
     if (!window.shouldUsePrivateKeyWallet) window.shouldUsePrivateKeyWallet = shouldUsePrivateKeyWallet;
     if (!window.getPrivateKeyWalletStatus) window.getPrivateKeyWalletStatus = getPrivateKeyWalletStatus;
     if (!window.initShopContracts) window.initShopContracts = initShopContracts;
     if (!window.showModalAlert) window.showModalAlert = showModalAlert;
     if (!window.refreshShop) window.refreshShop = refreshShop;
     if (!window.updateWalletUI) window.updateWalletUI = updateWalletUI;
     if (!window.showStatus) window.showStatus = showStatus;
     if (!window.updateStatusText) window.updateStatusText = updateStatusText;
     if (!window.localizeContent) window.localizeContent = localizeContent;
     
     // For these functions, use a different approach to avoid conflicts
     if (!window.shopInitNFTManagerContract) window.shopInitNFTManagerContract = initNFTManagerContract;
     if (!window.shopInitBatchPurchaseInputs) window.shopInitBatchPurchaseInputs = initBatchPurchaseInputs;

    function showModalAlert(title, message, type = 'info') {
        if (typeof ModalDialog !== 'undefined' && ModalDialog.alert) {
            ModalDialog.alert(message, { title: title });
        } else {
            showCustomAlert(title, message);
        }
    }

    // Listen for messages from parent window
    window.addEventListener('message', handleParentMessage);

})(); 