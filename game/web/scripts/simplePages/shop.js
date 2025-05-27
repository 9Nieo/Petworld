// Shop page functionality - modules are loaded by HTML
document.addEventListener('DOMContentLoaded', () => {
    // Load script utility function
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    // Function modules are already loaded by HTML, no need to load them again
    console.log('[Shop] Function modules should be loaded by HTML');

    // Debug utility - make it globally accessible
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Simple Shop Debug]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Simple Shop Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Simple Shop Warning]', ...args);
        }
    };
    
    // Make debug globally accessible for separated modules
    window.debug = debug;

    // Remove deprecated helper functions - use walletNetworkManager directly
    
    // Get DOM elements
    const shopItems = document.querySelectorAll('.shop-item');
    const buyButtons = document.querySelectorAll('.buy-btn');
    const statusMessage = document.getElementById('status-message');
    const refreshBtn = document.querySelector('.action-btn');
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    
    // Wallet connection status
    let isWalletConnected = false;
    
    // Web3 instance and contract instances - make them globally accessible
    let web3 = null;
    let currentAddress = null;
    let walletType = null;
    let nftLotteryManager = null;
    let pwPointAddress = null;
    let nftLotteryManagerContract = null;
    let nftLotteryManagerContractInstance = null;
    let nftManagerContract = null;
    let paymentManagerContract = null;
    let pwFoodManagerContract = null;
    let pwNFTContract = null;
    let tokenContracts = {
        USDT: null,
        USDC: null,
        DAI: null,
        WETH: null,
    };
    
    // Make key variables globally accessible for separated modules
    window.getShopVariables = function() {
        return {
            web3,
            currentAddress,
            walletType,
            nftLotteryManager,
            pwPointAddress,
            nftLotteryManagerContract,
            nftLotteryManagerContractInstance,
            nftManagerContract,
            paymentManagerContract,
            pwFoodManagerContract,
            pwNFTContract,
            tokenContracts,
            shopItems,
            isWalletConnected
        };
    };
    
    // Also expose them directly for easier access
    Object.defineProperty(window, 'web3', { get: () => web3, set: (value) => web3 = value });
    Object.defineProperty(window, 'currentAddress', { get: () => currentAddress, set: (value) => currentAddress = value });
    Object.defineProperty(window, 'nftLotteryManagerContract', { get: () => nftLotteryManagerContract, set: (value) => nftLotteryManagerContract = value });
    Object.defineProperty(window, 'nftLotteryManagerContractInstance', { get: () => nftLotteryManagerContractInstance, set: (value) => nftLotteryManagerContractInstance = value });
    Object.defineProperty(window, 'nftManagerContract', { get: () => nftManagerContract, set: (value) => nftManagerContract = value });
    Object.defineProperty(window, 'paymentManagerContract', { get: () => paymentManagerContract, set: (value) => paymentManagerContract = value });
    Object.defineProperty(window, 'pwFoodManagerContract', { get: () => pwFoodManagerContract, set: (value) => pwFoodManagerContract = value });
    Object.defineProperty(window, 'tokenContracts', { get: () => tokenContracts, set: (value) => tokenContracts = value });
    Object.defineProperty(window, 'shopItems', { get: () => shopItems });
    Object.defineProperty(window, 'isWalletConnected', { get: () => isWalletConnected, set: (value) => isWalletConnected = value });
    
    // Make key functions globally accessible for separated modules
    window.resetBuyButton = function(button) {
        if (!button) return;
        
        // Ensure button is available
        button.disabled = false;
        
        // Remove loading class
        button.classList.remove('loading');
        
        // Set different text based on button ID
        if (button.id === 'free-nft-btn' || button.id === 'claim-free-nft-btn') {
            button.textContent = i18n.t('shop.claim');
        } else {
            button.textContent = i18n.t('button.buy');
        }
        
        // Remove possible added processing style
        button.classList.remove('disabled');
    };
    
    window.showStatusMessage = function(message, type = 'info', params = {}) {
        // First, remove any existing status message bar
        const existingMessage = document.querySelector('.temporary-status-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Try to translate the message if it seems to be a key (contains no spaces and dots)
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            if (typeof message === 'string' && !message.includes(' ') && message.includes('.')) {
                try {
                    const translated = window.i18n.t(message, params);
                    if (translated && translated !== message) {
                        displayMessage = translated;
                    }
                } catch (error) {
                    debug.warn('Translation failed for message:', message, error);
                }
            }
        }

        // Create status message element
        const messageElement = document.createElement('div');
        messageElement.className = `temporary-status-message status-${type}`;
        messageElement.textContent = displayMessage;

        // Add to page
        document.body.appendChild(messageElement);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);

        debug.log(`Status message (${type}):`, displayMessage);
    };
    
    window.getErrorMessage = function(error) {
        if (!error) return 'Unknown error';
        
        // Check for common error patterns
        if (error.message) {
            const message = error.message.toLowerCase();
            
            // User rejected transaction
            if (message.includes('user denied') || message.includes('user rejected')) {
                return 'Transaction was cancelled by user';
            }
            
            // Insufficient funds
            if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
                return 'Insufficient balance to complete transaction';
            }
            
            // Gas estimation failed
            if (message.includes('gas') && (message.includes('estimation') || message.includes('limit'))) {
                return 'Transaction may fail due to gas issues';
            }
            
            // Network error
            if (message.includes('network') || message.includes('connection')) {
                return 'Network connection error, please try again';
            }
            
            // Contract error
            if (message.includes('revert') || message.includes('execution reverted')) {
                return 'Smart contract execution failed';
            }
        }
        
        // Return general error message
        return error.message || 'Transaction failed';
    };
    
    window.showSimpleAlert = function(title, message) {
        ModalDialog.alert(message, {
            title: title,
            confirmText: i18n.t('button.confirm')
        });
    };
    
    // Initialize
    init();
    
    /**
     * Initialization function
     */
    function init() {
        debug.log('Initializing shop page...');
        
        // Check critical DOM elements
        if (!walletBtn) debug.error('Wallet connection button not found');
        if (!walletAddressSpan) debug.error('Wallet address display element not found');
        if (!walletFrame) debug.error('Wallet iframe not found');
        
        // Check if PWFoodManagerABI is correctly loaded
        debug.log('PWFoodManagerABI load status:', !!window.PWFoodManagerABI);
        
        // Load contractManager.js
        loadContractManager();
        
        // Initialize WalletNetworkManager
        initializeWalletNetworkManager().then(result => {
            debug.log('WalletNetworkManager initialization completed:', result);
            
            if (result.success) {
                // Update global variables with WalletNetworkManager results
                web3 = result.web3;
                currentAddress = result.address;
                walletType = result.walletType;
                isWalletConnected = !!result.address;
                
                // Update UI
                updateWalletUI(isWalletConnected, currentAddress);
                
                // Initialize contracts if ready
                if (result.contractsReady) {
                    debug.log('Contracts already initialized by WalletNetworkManager');
                } else if (web3 && currentAddress) {
                    debug.log('Initializing contracts with WalletNetworkManager Web3 instance');
                    initContracts();
                }
            } else {
                debug.warn('WalletNetworkManager initialization failed, falling back to legacy methods');
                
                // Fallback to legacy initialization
                initializeLegacyWalletDetection();
            }
        }).catch(error => {
            debug.error('Error during WalletNetworkManager initialization:', error);
            
            // Fallback to legacy initialization
            initializeLegacyWalletDetection();
        });
        
        // Initialize or load payment token configuration
        initPaymentTokens();
        
        // Bind purchase button click events
        buyButtons.forEach(btn => {
            btn.addEventListener('click', handleBuyButtonClick);
        });
        
        // Bind refresh button click events
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshShopData();
            });
        }
        
        // Bind wallet connection button click events
        if (walletBtn) {
            walletBtn.addEventListener('click', handleWalletBtnClick);
        }
        
        // Load contract initializer file
        loadContractInitializers();
        
        // Listen for language change event
        window.addEventListener('localeChanged', function(event) {
            debug.log('Detected language change event:', event.detail);
            updateUITexts();
        });
        
        // Listen for language initialization event
        window.addEventListener('localeInitialized', function(event) {
            debug.log('Detected language initialization event:', event.detail);
            updateUITexts();
        });
        
        // Apply current language
        updateUITexts();
        
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for WalletNetworkManager events
        if (window.walletNetworkManager) {
            window.walletNetworkManager.on('walletConnected', (data) => {
                debug.log('WalletNetworkManager: Wallet connected', data);
                
                // Update global variables
                web3 = data.web3;
                currentAddress = data.address;
                walletType = data.walletType;
                isWalletConnected = true;
                
                // Update UI
                updateWalletUI(true, currentAddress);
                
                // Initialize contracts if ready
                if (window.walletNetworkManager.isReadyForContracts()) {
                    initContracts();
                }
            });
            
            window.walletNetworkManager.on('walletDisconnected', () => {
                debug.log('WalletNetworkManager: Wallet disconnected');
                handleWalletDisconnected();
            });
            
            window.walletNetworkManager.on('networkChanged', (data) => {
                debug.log('WalletNetworkManager: Network changed', data);
                
                // Refresh contracts for new network
                if (window.walletNetworkManager.isReadyForContracts()) {
                    window.walletNetworkManager.initializeContracts({
                        contracts: ['NFTLotteryManager', 'PaymentManager', 'PwNFT', 'NFTManager', 'PwFoodManager']
                    }).then(result => {
                        if (result.success) {
                            debug.log('Contracts reinitialized for new network');
                            // Update global contract variables
                            nftLotteryManagerContract = window.nftLotteryManagerContract;
                            paymentManagerContract = window.paymentManagerContract;
                            pwNFTContract = window.pwNFTContract;
                            nftManagerContract = window.nftManagerContract;
                            pwFoodManagerContract = window.pwFoodManagerContract;
                            
                            // Refresh shop data
                            refreshShopData();
                        }
                    });
                }
            });
            
            window.walletNetworkManager.on('contractsReady', (data) => {
                debug.log('WalletNetworkManager: Contracts ready', data);
                
                // Update global contract variables
                nftLotteryManagerContract = window.nftLotteryManagerContract;
                paymentManagerContract = window.paymentManagerContract;
                pwNFTContract = window.pwNFTContract;
                nftManagerContract = window.nftManagerContract;
                pwFoodManagerContract = window.pwFoodManagerContract;
                
                // Refresh shop data
                refreshShopData();
            });
        }
        
        // Add delay check to ensure normal operation even if wallet data is not received
        setTimeout(() => {
            if (!web3 || !nftLotteryManagerContract) {
                debug.log('Delayed check - Web3 or contract not initialized, try other methods to initialize');
                
                // Use WalletNetworkManager exclusively
                if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
                    debug.log('Using WalletNetworkManager Web3 instance (delayed check)');
                    web3 = window.walletNetworkManager.getWeb3();
                    currentAddress = window.walletNetworkManager.getCurrentAddress();
                    if (web3 && currentAddress) {
                        initContracts();
                    }
                } else {
                    debug.warn('WalletNetworkManager not available for delayed check');
                }
                
                // If web3 already exists but no contract, try to initialize contracts
                if (web3 && !nftLotteryManagerContract && currentAddress) {
                    debug.log('Web3 exists but no contract, try to initialize contracts');
                    initContracts();
                    // Special initialization of shop contracts
                    initShopContracts();
                }
            }
        }, 1000); // 1 second later check
        
        // Check again, ensure contracts are initialized
        setTimeout(() => {
            if (!nftLotteryManagerContract && web3) {
                debug.warn('2 seconds later, NFTLotteryManager contract still not initialized, try to force initialize');
                
                // Try WalletNetworkManager contract initialization first
                if (window.walletNetworkManager && window.walletNetworkManager.isReadyForContracts()) {
                    debug.log('Attempting contract initialization via WalletNetworkManager');
                    window.walletNetworkManager.initializeContracts({
                        contracts: ['NFTLotteryManager', 'PaymentManager', 'PwNFT', 'NFTManager', 'PwFoodManager']
                    }).then(result => {
                        debug.log('WalletNetworkManager contract initialization result:', result);
                        if (result.success) {
                            // Update global contract variables
                            nftLotteryManagerContract = window.nftLotteryManagerContract;
                            paymentManagerContract = window.paymentManagerContract;
                            pwNFTContract = window.pwNFTContract;
                            nftManagerContract = window.nftManagerContract;
                            pwFoodManagerContract = window.pwFoodManagerContract;
                        }
                    }).catch(error => {
                        debug.error('WalletNetworkManager contract initialization failed:', error);
                        // Fallback to legacy method
                        if (typeof window.initNFTLotteryManagerContract === 'function') {
                            initShopContracts();
                        }
                    });
                } else if (typeof window.initNFTLotteryManagerContract === 'function') {
                    initShopContracts();
                }
            }
            
            // Update rare and legendary NFT remaining quantities
            updateNFTRemaining();
        }, 2000);
    }
    
    /**
     * Initialize WalletNetworkManager for shop page
     */
    async function initializeWalletNetworkManager() {
        debug.log('Initializing WalletNetworkManager for shop page...');
        
        try {
            // Ensure WalletNetworkManager is loaded
            if (!window.walletNetworkManager) {
                debug.log('WalletNetworkManager not found, attempting to load...');
                
                // Try to load WalletNetworkManager script
                await loadScript('../../scripts/other/walletNetworkManager.js');
                
                // Wait a bit for initialization
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (!window.walletNetworkManager) {
                    throw new Error('WalletNetworkManager failed to load');
                }
            }
            
            // Initialize WalletNetworkManager
            const initResult = await window.walletNetworkManager.init();
            
            if (!initResult.success) {
                debug.error('WalletNetworkManager initialization failed:', initResult.error);
                return {
                    success: false,
                    error: initResult.error,
                    requiresUserAction: initResult.requiresUserAction
                };
            }
            
            debug.log('WalletNetworkManager initialized successfully:', initResult);
            
            // Initialize shop-specific contracts if ready for contracts
            let contractsReady = false;
            if (window.walletNetworkManager.isReadyForContracts()) {
                try {
                    const contractResult = await window.walletNetworkManager.initializeContracts({
                        contracts: ['NFTLotteryManager', 'PaymentManager', 'PwNFT', 'NFTManager', 'PwFoodManager']
                    });
                    
                    debug.log('Shop contracts initialization result:', contractResult);
                    
                    if (contractResult.success) {
                        // Update global contract variables
                        nftLotteryManagerContract = window.nftLotteryManagerContract;
                        paymentManagerContract = window.paymentManagerContract;
                        pwNFTContract = window.pwNFTContract;
                        nftManagerContract = window.nftManagerContract;
                        pwFoodManagerContract = window.pwFoodManagerContract;
                        
                        contractsReady = true;
                        debug.log('Shop contracts initialized successfully');
                    } else {
                        debug.warn('Some shop contracts failed to initialize:', contractResult.failed);
                    }
                } catch (contractError) {
                    debug.error('Error initializing shop contracts:', contractError);
                }
            }
            
            return {
                success: true,
                walletType: initResult.walletType,
                network: initResult.network,
                address: window.walletNetworkManager.getCurrentAddress(),
                web3: window.walletNetworkManager.getWeb3(),
                rpcConnected: initResult.rpcConnected,
                contractsReady: contractsReady,
                message: initResult.message
            };
            
        } catch (error) {
            debug.error('Error in WalletNetworkManager initialization:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Initialize legacy wallet detection as fallback (simplified)
     */
    function initializeLegacyWalletDetection() {
        debug.log('Initializing legacy wallet detection as fallback...');
        
        // Show wallet connection modal for user to connect manually
        showWalletModal();
        
        // Also try to check stored wallet connections
        checkStoredWalletConnection();
    }
    
    /**
     * Load contract manager script
     */
    function loadContractManager() {
        debug.log('Loading contract manager...');
        
        if (typeof window.initAllContracts === 'function') {
            debug.log('Contract manager already loaded');
            return;
        }
        
        try {
            const script = document.createElement('script');
            script.src = '../../scripts/init_contracts/contractManager.js';
            script.async = true;
            
            script.onload = function() {
                debug.log('Contract manager loaded successfully');
                // If Web3 instance and address already exist, try to use contract manager to initialize all contracts
                if (web3 && currentAddress) {
                    useContractManager();
                }
            };
            
            script.onerror = function() {
                debug.error('Failed to load contract manager');
            };
            
            document.head.appendChild(script);
        } catch (error) {
            debug.error('Error loading contract manager:', error);
        }
    }
    
    /**
     * Use contract manager to initialize contracts
     */
    function useContractManager() {
        if (!web3 || !currentAddress) {
            debug.error('Failed to initialize contracts using contract manager: Web3 or wallet address not set');
            return;
        }
        
        if (typeof window.initAllContracts !== 'function') {
            debug.error('Contract manager not loaded, cannot use');
            return;
        }
        
        debug.log('Using contract manager to initialize all contracts...');
        
        try {
            // Default address retrieval function
            const getContractAddress = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'TEST';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // Use contract manager to initialize required contracts
            const contractsToInit = [
                'NFTLotteryManager',
                'NFTManager',
                'PaymentManager',
                'PwFoodManager',
                'PwNFT',
                'PwPoint'
            ];
            
            window.initAllContracts(web3, getContractAddress, contractsToInit)
                .then(contracts => {
                    debug.log('Contract manager initialization completed, obtained contracts:', Object.keys(contracts));
                    
                    // Update current contract instances
                    if (contracts.NFTLotteryManager) {
                        nftLotteryManagerContract = contracts.NFTLotteryManager;
                        debug.log('Obtained NFTLotteryManager contract instance');
                    }
                    
                    if (contracts.NFTManager) {
                        nftManagerContract = contracts.NFTManager;
                        debug.log('Obtained NFTManager contract instance');
                    }
                    
                    if (contracts.PaymentManager) {
                        paymentManagerContract = contracts.PaymentManager;
                        debug.log('Obtained PaymentManager contract instance');
                    }
                    
                    if (contracts.PwFoodManager) {
                        pwFoodManagerContract = contracts.PwFoodManager;
                        debug.log('Obtained PwFoodManager contract instance');
                    }
                    
                    if (contracts.PwNFT) {
                        pwNFTContract = contracts.PwNFT;
                        debug.log('Obtained PwNFT contract instance');
                    }
                    
                    if (contracts.PwPoint) {
                        tokenContracts.PWPoint = contracts.PwPoint;
                        debug.log('Obtained PwPoint contract instance');
                    }
                    
                    // Initialize payment token contracts
                    initializeTokenContracts();
                    
                    // Update item prices
                    updateItemPrices();
                })
                .catch(error => {
                    debug.error('Failed to initialize contracts using contract manager:', error);
                });
        } catch (error) {
            debug.error('Error initializing contracts using contract manager:', error);
        }
    }
    
    /**
     * Handle wallet button click event - simplified to use WalletNetworkManager only
     */
    function handleWalletBtnClick() {
        // Use WalletNetworkManager exclusively
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            
            if (status.isConnected) {
                // If wallet is connected, disconnect
                disconnectWallet();
            } else {
                // If not connected, show wallet connection modal
                showWalletModal();
            }
        } else {
            debug.warn('WalletNetworkManager not available, showing wallet modal');
            showWalletModal();
        }
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Priority: Check if using private key wallet
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Disconnecting private key wallet');
            
            // For private key wallet, we need to remove the stored key
            if (confirm(i18n.t('wallet.confirmRemoveKey') || 'Are you sure you want to remove the stored private key?')) {
                window.SecureWalletManager.removeStoredKey();
                handleWalletDisconnected();
            }
            return;
        }
        
        // For connected wallets, send disconnect message to wallet iframe
        if (walletFrame && walletFrame.contentWindow) {
            walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        }
        
        // Handle disconnect directly
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnect
     */
    function handleWalletDisconnected() {
        debug.log('Wallet disconnected');
        
        // Set connection status
        isWalletConnected = false;
        currentAddress = null;
        web3 = null;
        
        // Clear contract instances
        nftLotteryManagerContract = null;
        nftLotteryManagerContractInstance = null;
        nftManagerContract = null;
        paymentManagerContract = null;
        pwFoodManagerContract = null;
        pwNFTContract = null;
        tokenContracts = {
            USDT: null,
            USDC: null,
            DAI: null,
            WETH: null,
            PWPoint: null
        };
        
        // Update UI
        updateWalletUI(false);
        
        // Clear local storage (only for connected wallets, not private key wallet)
        if (!window.SecureWalletManager || !window.SecureWalletManager.hasStoredKey()) {
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        }
        
        // Clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        debug.log('Wallet disconnected');
    }
    
    /**
     * Check wallet status - simplified to use WalletNetworkManager only
     */
    function checkWalletStatus() {
        debug.log('Checking wallet connection status via WalletNetworkManager...');
        
        // Only use WalletNetworkManager - no fallback needed
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            const address = window.walletNetworkManager.getCurrentAddress();
            
            if (status.isConnected && address) {
                debug.log('WalletNetworkManager reports wallet connected:', address);
                
                // Update global variables
                currentAddress = address;
                isWalletConnected = true;
                walletType = status.walletType;
                web3 = window.walletNetworkManager.getWeb3();
                
                // Update UI
                updateWalletUI(true, currentAddress);
                
                return; // Exit early
            }
        }
        
        debug.log('WalletNetworkManager not ready or no wallet connected');
        
        // First check sessionStorage (cross-page transfer), then check localStorage (long-term storage)
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
            
            // If wallet iframe is already loaded, request Web3 instance
            if (walletFrame && walletFrame.contentWindow) {
                try {
                    debug.log('Sending getWeb3Instance message to wallet iframe');
                    walletFrame.contentWindow.postMessage({ 
                        type: 'getWeb3Instance',
                        walletType: sessionWalletType || 'metamask'
                    }, '*');
                } catch (error) {
                    debug.error('Failed to send message to iframe:', error);
                }
            }
        } else {
            // If sessionStorage is empty, check localStorage
            checkStoredWalletConnection();
        }
    }
    
    /**
     * Check wallet connection status in localStorage
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        const storedWalletType = localStorage.getItem('walletType');
        
        debug.log('Checking wallet connection status in localStorage:', {
            connected: storedConnected,
            address: storedAddress ? `${storedAddress.substring(0, 6)}...${storedAddress.substring(storedAddress.length - 4)}` : null,
            type: storedWalletType
        });
        
        if (storedConnected === 'true' && storedAddress) {
            debug.log('Found wallet connection info in localStorage');
            // Restore connection status from localStorage
            isWalletConnected = true;
            currentAddress = storedAddress;
            updateWalletUI(true, storedAddress);
            
            // Ensure sessionStorage is also kept in sync
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', storedAddress);
            sessionStorage.setItem('walletType', storedWalletType || 'metamask');
            
            // Ensure iframe is loaded
            if (!walletFrame) {
                walletFrame = document.getElementById('walletFrame');
            }
            
            // Ensure src is set
            if (walletFrame && (!walletFrame.src || walletFrame.src === '')) {
                walletFrame.src = '../../webPages/wallets/wallets.html';
            }
            
            // Wait for iframe to load before sending messages
            if (walletFrame) {
                // If 1 second later still no Web3 instance, retry
                const timeoutId = setTimeout(() => {
                    debug.log('Web3 instance request timeout, try to request again...');
                    if (walletFrame.contentWindow) {
                        try {
                            walletFrame.contentWindow.postMessage({ 
                                type: 'getWeb3Instance',
                                walletType: storedWalletType || 'metamask'
                            }, '*');
                            
                            walletFrame.contentWindow.postMessage({ 
                                type: 'autoConnect',
                                walletType: storedWalletType || 'metamask'
                            }, '*');
                        } catch (error) {
                            debug.error('Failed to send message after timeout:', error);
                        }
                    }
                }, 2000);
                
                // Store timeout ID, so it can be cleared when web3Ready message is received
                window.web3TimeoutId = timeoutId;
                
                walletFrame.onload = function() {
                    debug.log('Wallet iframe loaded, now sending messages');
                    
                    // Delay a little time to ensure iframe internal scripts are initialized
                    setTimeout(() => {
                        if (walletFrame.contentWindow) {
                            try {
                                debug.log('Sending getWeb3Instance and autoConnect messages to wallet iframe');
                                // Request Web3 instance
                                walletFrame.contentWindow.postMessage({ 
                                    type: 'getWeb3Instance',
                                    walletType: storedWalletType || 'metamask'
                                }, '*');
                                
                                // Try auto-connect
                                walletFrame.contentWindow.postMessage({ 
                                    type: 'autoConnect',
                                    walletType: storedWalletType || 'metamask'
                                }, '*');
                            } catch (error) {
                                debug.error('Failed to send message to iframe:', error);
                            }
                        } else {
                            debug.error('Wallet iframe contentWindow is not available');
                        }
                    }, 500);
                };
                
                // If iframe is already loaded, directly call onload handler
                if (walletFrame.complete) {
                    debug.log('Wallet iframe already loaded, directly execute onload handler');
                    walletFrame.onload();
                }
            } else {
                debug.error('Wallet iframe element not found');
            }
        } else {
            debug.log('No wallet connection info found in localStorage');
        }
    }
    
    /**
     * Handle messages from wallet iframe
     * @param {MessageEvent} event - Message event
     */
    function handleIframeMessage(event) {
        debug.log('Received iframe message:', event.data);
        
        if (!event.data || typeof event.data !== 'object') {
            return;
        }
        
        const { type, data } = event.data;
        
        switch (type) {
            case 'WALLET_CONNECTED':
                debug.log('Wallet connected:', data);
                if (data.address && data.walletType) {
                    currentAddress = data.address;
                    walletType = data.walletType;
                    
                    // Save wallet connection status to localStorage
                    localStorage.setItem('walletConnected', 'true');
                    localStorage.setItem('walletAddress', data.address);
                    localStorage.setItem('walletType', data.walletType);
                    
                    updateWalletUI(data.address);
                    
                    // If web3 instance already exists, initialize contracts
                    if (web3) {
                        debug.log('Web3 instance already exists, initialize contracts');
                        initContracts();
                    }
                }
                break;
                
            case 'WALLET_DISCONNECTED':
                debug.log('Wallet disconnected');
                handleWalletDisconnect();
                break;
                
            case 'web3Ready':
                debug.log('Received web3Ready message');
                
                // Save web3 instance to global variable
                if (data && data.web3) {
                    debug.log('Obtained Web3 instance from iframe');
                    web3 = data.web3;
                    window.homeWeb3 = web3; // Save to global variable, for easy use in other places
                    
                    // Save initialized flag
                    localStorage.setItem('web3Initialized', 'true');
                }
                
                // Use iframe's provider to create web3 instance
                if (!web3 && data && data.provider) {
                    debug.log('Using iframe\'s provider to create Web3 instance');
                    web3 = new Web3(data.provider);
                    window.homeWeb3 = web3; // Save to global variable, for easy use in other places
                    
                    // Save initialized flag
                    localStorage.setItem('web3Initialized', 'true');
                }
                
                // Initialize contracts based on current address and wallet type
                if (web3 && currentAddress) {
                    debug.log('Web3 instance is ready, current address:', currentAddress);
                    
                    // Check chain ID and network
                    web3.eth.getChainId()
                        .then(chainId => {
                            debug.log('Current chain ID:', chainId);
                            // Set current network
                            if (chainId === 1) {
                                window.currentNetwork = 'MAINNET';
                            }else if (chainId === 56) {
                                window.currentNetwork = 'BSC';
                            } else if (chainId === 97) {
                                window.currentNetwork = 'BSCTEST';
                            } else {
                                window.currentNetwork = 'LOCAL';
                            }
                            
                            debug.log('Set current network to:', window.currentNetwork);
                            
                            if (typeof window.initAllContracts === 'function') {
                                debug.log('Using contract manager to initialize contracts');
                                useContractManager();
                            } else {
                                debug.log('Using traditional method to initialize contracts');
                                initContracts();
                            }
                        })
                        .catch(error => {
                            debug.error('Failed to get chain ID:', error);
                            // Try to initialize contracts using default method
                            initContracts();
                        });
                } else if (!currentAddress) {
                    debug.warn('Web3 is ready, but no wallet address, please connect wallet');
                }
                break;
                
            default:
                debug.log('Unhandled message type:', type);
        }
    }
    
    /**
     * Initialize contracts
     */
    function initContracts() {
        debug.log('Initializing shop contracts...');
        
        if (!web3) {
            debug.error('Web3 not initialized, cannot initialize contracts');
            return;
        }
        
        if (!currentAddress) {
            debug.error('Current wallet address not set, cannot initialize contracts');
            return;
        }
        
        try {
            // Get contract address function
            const getContractAddress = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'MAIN';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // Initialize shop related contracts
            initShopContracts();
            
            // Initialize token contracts
            initializeTokenContracts();
            
            // Ensure NFTManager contract is initialized
            if (!nftManagerContract) {
                debug.warn('NFTManager contract not initialized, try to initialize manually');
                initNFTManagerContract();
            }
            
            debug.log('Contracts initialized');
        } catch (error) {
            debug.error('Failed to initialize contracts:', error);
        }
        
        // Refresh shop data
        refreshShopData();
    }
    
    /**
     * Initialize shop contracts
     */
    function initShopContracts() {
        debug.log('Initializing shop contracts...');
        
        try {
            // Get contract address function
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'MAIN';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // If there is already a contract instance initialized through initContracts, use it directly
            if (nftLotteryManagerContract && nftLotteryManagerContract.methods) {
                debug.log('Using existing NFTLotteryManager contract instance');
                return;
            }
            
            if (typeof window.initNFTLotteryManagerContract === 'function') {
                try {
                    // Check web3 status
                    if (!web3) {
                        debug.error('Web3 not initialized, cannot create NFTLotteryManager contract');
                        return;
                    }
                    
                    debug.log('Starting to initialize NFTLotteryManager contract...');
                    
                    // Use the same way as other contracts to initialize, pass getContractAddress parameter
                    nftLotteryManagerContract = window.initNFTLotteryManagerContract(web3, getContractAddressFunc);
                    
                    if (nftLotteryManagerContract) {
                        debug.log('NFTLotteryManager contract initialized successfully, address:', nftLotteryManagerContract._address);
                        
                        // Check if methods are available
                        if (nftLotteryManagerContract.methods) {
                            debug.log('NFTLotteryManager contract methods are available');
                        } else {
                            debug.error('NFTLotteryManager contract methods are not available');
                        }
                        
                        // Try to initialize NFTLotteryManagerContract class instance
                        if (typeof window.initNFTLotteryManagerContractClass === 'function') {
                            try {
                                debug.log('Trying to initialize NFTLotteryManagerContract class instance...');
                                nftLotteryManagerContractInstance = window.initNFTLotteryManagerContractClass(web3);
                                if (nftLotteryManagerContractInstance) {
                                    debug.log('NFTLotteryManagerContract class instance initialized successfully');
                                }
                            } catch (err) {
                                debug.error('Failed to initialize NFTLotteryManagerContract class instance:', err);
                            }
                        }
                    } else {
                        debug.error('NFTLotteryManager contract initialization returned null');
                    }
                } catch (error) {
                    debug.error('Failed to initialize NFTLotteryManager contract:', error);
                }
            } else {
                debug.error('Cannot find initNFTLotteryManagerContract function');
            }
            
            // Initialize NFTManager contract
            if (typeof window.initNFTManagerContract === 'function') {
                try {
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                    debug.log('NFTManager contract initialized');
                } catch (error) {
                    debug.error('Failed to initialize NFTManager contract:', error);
                }
            } else {
                debug.error('Cannot find initNFTManagerContract function');
            }
            
            // Initialize PwNFT contract
            if (typeof window.initPwNFTContract === 'function') {
                try {
                    pwNFTContract = window.initPwNFTContract(web3, getContractAddressFunc);
                    debug.log('PwNFT contract initialized');
                } catch (error) {
                    debug.error('Failed to initialize PwNFT contract:', error);
                }
            } else {
                debug.error('Cannot find initPwNFTContract function');
            }
            
            // Initialize PwFoodManager contract
            if (typeof window.initPwFoodManagerContract === 'function') {
                try {
                    pwFoodManagerContract = window.initPwFoodManagerContract(web3, getContractAddressFunc);
                    debug.log('PwFoodManager contract initialized');
                } catch (error) {
                    debug.error('Failed to initialize PwFoodManager contract:', error);
                }
            } else {
                debug.error('Cannot find initPwFoodManagerContract function');
            }
            
            // Initialize PaymentManager contract
            if (typeof window.initPaymentManagerContract === 'function') {
                try {
                    paymentManagerContract = window.initPaymentManagerContract(web3, getContractAddressFunc);
                    debug.log('PaymentManager contract initialized');
                    
                    // Try to initialize PaymentManagerContract class instance
                    if (typeof window.PaymentManagerContract === 'function') {
                        try {
                            debug.log('Trying to initialize PaymentManagerContract class instance...');
                            paymentManagerContractInstance = new window.PaymentManagerContract(web3);
                            if (paymentManagerContractInstance) {
                                debug.log('PaymentManagerContract class instance initialized successfully');
                            }
                        } catch (err) {
                            debug.error('Failed to initialize PaymentManagerContract class instance:', err);
                        }
                    }
                } catch (error) {
                    debug.error('Failed to initialize PaymentManager contract:', error);
                }
            } else {
                debug.error('Cannot find initPaymentManagerContract function');
            }
            
            debug.log('Shop contracts initialized');
        } catch (error) {
            debug.error('Failed to initialize shop contracts:', error);
        }
    }
    

    
    /**
     * Load contract initializer files
     */
    function loadContractInitializers() {
        debug.log('Loading contract initializer files...');
        
        // Check if already loaded
        if (
            typeof window.initNFTLotteryManagerContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initPaymentManagerContract !== 'undefined' &&
            typeof window.initPwFoodManagerContract !== 'undefined' &&
            typeof window.initPwNFTContract !== 'undefined' &&
            typeof window.initERC20Contract !== 'undefined' &&
            typeof window.initPwPointContract !== 'undefined'
        ) {
            debug.log('Contract initializer files loaded');
            return;
        }
        
        // Load NFTLotteryManager initialization file
        const nftLotteryManagerScript = document.createElement('script');
        nftLotteryManagerScript.src = '../../scripts/init_contracts/initNFTLotteryManager.js';
        nftManagerScript.onload = function() {
            debug.log('NFTLotteryManager initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        nftLotteryManagerScript.onerror = function() {
            debug.error('Failed to load NFTLotteryManager initialization file');
        };
        
        // Load NFTManager initialization file
        const nftManagerScript = document.createElement('script');
        nftManagerScript.src = '../../scripts/init_contracts/initNFTManager.js';
        nftManagerScript.onload = function() {
            debug.log('NFTManager initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        nftManagerScript.onerror = function() {
            debug.error('Failed to load NFTManager initialization file');
        };
        
        // Load PaymentManager initialization file
        const paymentManagerScript = document.createElement('script');
        paymentManagerScript.src = '../../scripts/init_contracts/initPaymentManager.js';
        paymentManagerScript.onload = function() {
            debug.log('PaymentManager initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        paymentManagerScript.onerror = function() {
            debug.error('Failed to load PaymentManager initialization file');
        };
        
        // Load PwFoodManager initialization file
        const pwFoodManagerScript = document.createElement('script');
        pwFoodManagerScript.src = '../../scripts/init_contracts/initPwFoodManager.js';
        pwFoodManagerScript.onload = function() {
            debug.log('PwFoodManager initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        pwFoodManagerScript.onerror = function() {
            debug.error('Failed to load PwFoodManager initialization file');
        };
        
        // Load PwNFT initialization file
        const pwNFTScript = document.createElement('script');
        pwNFTScript.src = '../../scripts/init_contracts/initPwNFT.js';
        pwNFTScript.onload = function() {
            debug.log('PwNFT initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        pwNFTScript.onerror = function() {
            debug.error('Failed to load PwNFT initialization file');
        };
        
        // Load ERC20 initialization file
        const erc20Script = document.createElement('script');
        erc20Script.src = '../../scripts/init_contracts/initERC20.js';
        erc20Script.onload = function() {
            debug.log('ERC20 initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        erc20Script.onerror = function() {
            debug.error('Failed to load ERC20 initialization file');
        };
        
        // Load PwPoint initialization file
        const pwPointScript = document.createElement('script');
        pwPointScript.src = '../../scripts/init_contracts/initPwPoint.js';
        pwPointScript.onload = function() {
            debug.log('PwPoint initialization file loaded');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        pwPointScript.onerror = function() {
            debug.error('Failed to load PwPoint initialization file');
        };
        
        // Add to document
        document.head.appendChild(nftLotteryManagerScript);
        document.head.appendChild(nftManagerScript);
        document.head.appendChild(paymentManagerScript);
        document.head.appendChild(pwFoodManagerScript);
        document.head.appendChild(pwNFTScript);
        document.head.appendChild(erc20Script);
        document.head.appendChild(pwPointScript);
    }
    

    
    /**
     * Handle buy button click event
     * @param {Event} event - Click event object
     */
    function handleBuyButtonClick(event) {
        debug.log('Handle buy button click event');
        
        // Prevent default behavior
        event.preventDefault();
        
        // Check wallet connection status using WalletNetworkManager first
        let walletConnected = false;
        let contractsReady = false;
        
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            walletConnected = status.isConnected;
            contractsReady = window.walletNetworkManager.isReadyForContracts();
            
            debug.log('WalletNetworkManager status check:', { walletConnected, contractsReady });
        } else {
            // Fallback to legacy check
            walletConnected = isWalletConnected;
            contractsReady = !!(web3 && nftLotteryManagerContract);
            
            debug.log('Legacy wallet status check:', { walletConnected, contractsReady });
        }
        
        if (!walletConnected) {
            showStatusMessage('pleaseConnectWallet', 'error');
            // Show wallet connection modal
            showWalletModal();
            return;
        }
        
        // Check Web3 and contract initialization status
        if (!contractsReady) {
            showStatusMessage('contractLoading', 'error');
            
            // Try to initialize contracts via WalletNetworkManager first
            if (window.walletNetworkManager && window.walletNetworkManager.isReadyForContracts()) {
                window.walletNetworkManager.initializeContracts({
                    contracts: ['NFTLotteryManager', 'PaymentManager', 'PwNFT', 'NFTManager', 'PwFoodManager']
                }).then(result => {
                    if (result.success) {
                        debug.log('Contracts initialized successfully via WalletNetworkManager');
                        // Update global contract variables
                        nftLotteryManagerContract = window.nftLotteryManagerContract;
                        paymentManagerContract = window.paymentManagerContract;
                        pwNFTContract = window.pwNFTContract;
                        nftManagerContract = window.nftManagerContract;
                        pwFoodManagerContract = window.pwFoodManagerContract;
                    }
                }).catch(error => {
                    debug.error('Contract initialization failed:', error);
                });
            }
            // Fallback to legacy contract initialization
            else if (web3 && currentAddress) {
                initContracts();
            }
            return;
        }
        
        // Get item data
        const button = event.target;
        const item = button.closest('.shop-item');
        if (!item) {
            debug.error('Cannot find item element');
            return;
        }
        
        const itemId = item.getAttribute('data-id');
        const category = item.getAttribute('data-category');
        
        // Prevent duplicate clicks
        if (button.disabled) {
            return;
        }
        
        // Check if it's free NFT claim
        if (itemId === 'free-nft') {
            // Handle free NFT claim
            claimFreeNFT(button);
            return;
        }
        
        // Check if it's claiming unclaimed NFTs
        if (itemId === 'claim-eggs') {
            // Handle claiming unclaimed NFTs
            claimEggs(button);
            return;
        }
        
        // Check if it's claiming free PwFood
        if (itemId === 'free-pwfood') {
            // Handle claiming free PwFood
            claimFreePwFood(button);
            return;
        }
        
        // Set button to loading state
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> ' + i18n.t('processing');
        
        try {
            // Determine the payment token to use - prioritize USDT
            const defaultPaymentToken = 'USDT';
            
            // Check if USDT is supported
            if (!window.ERC20TokenAddresses || !window.ERC20TokenAddresses[defaultPaymentToken]) {
                debug.log(`${defaultPaymentToken} token not available, trying to find other tokens`);
                // Find other available tokens
                let availableToken = null;
                if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                    const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault);
                    if (defaultToken) {
                        availableToken = defaultToken.id;
                    } else {
                        availableToken = window.SUPPORTED_PAYMENT_TOKENS[0].id;
                    }
                } else if (window.ERC20TokenAddresses) {
                    // Find the first available token from ERC20TokenAddresses
                    const tokens = Object.keys(window.ERC20TokenAddresses);
                    if (tokens.length > 0) {
                        availableToken = tokens[0];
                    }
                }
                
                if (!availableToken) {
                    showStatusMessage('noAvailablePaymentToken', 'error');
                    resetBuyButton(button);
                    return;
                }
                
                debug.log(`Using available token: ${availableToken}`);
                
                // Handle purchase based on item type
                if (category === 'egg') {
                    let tokenId = 0;
                    if (itemId === 'egg-common') {
                        tokenId = 1; // Common egg ID
                    } else if (itemId === 'egg-rare') {
                        tokenId = 2; // Rare egg ID
                    } else if (itemId === 'egg-legendary') {
                        tokenId = 3; // Legendary egg ID
                    }
                    
                    // Purchase egg
                    purchaseEgg(tokenId, availableToken, button);
                } else if (category === 'food') {
                    // Purchase food
                    purchaseFood(itemId, availableToken, button);
                } else {
                    debug.error('Unknown item type:', category);
                    showStatusMessage('unknownItemType', 'error');
                    resetBuyButton(button);
                }
            } else {
                debug.log(`Using default token: ${defaultPaymentToken}`);
                
                // Handle purchase based on item type
                if (category === 'egg') {
                    let tokenId = 0;
                    if (itemId === 'egg-common') {
                        tokenId = 1; // Common egg ID
                    } else if (itemId === 'egg-rare') {
                        tokenId = 2; // Rare egg ID
                    } else if (itemId === 'egg-legendary') {
                        tokenId = 3; // Legendary egg ID
                    }
                    
                    // Purchase egg
                    purchaseEgg(tokenId, defaultPaymentToken, button);
                } else if (category === 'food') {
                    // Purchase food
                    purchaseFood(itemId, defaultPaymentToken, button);
                } else {
                    debug.error('Unknown item type:', category);
                    showStatusMessage('unknownItemType', 'error');
                    resetBuyButton(button);
                }
            }
        } catch (error) {
            debug.error('Error processing purchase:', error);
            showStatusMessage('purchaseFailed', 'error', { message: getErrorMessage(error) });
            resetBuyButton(button);
        } finally {
            // Ensure button state is reset, regardless of error
            setTimeout(() => {
                resetBuyButton(button);
            }, 2000); // Short delay to avoid conflict with other reset logic
        }
    }
    
    // resetBuyButton is now globally defined above
    
    // showStatusMessage is now globally defined above
    
    // getErrorMessage is now globally defined above
    
    /**
     * Refresh shop data
     */
    function refreshShopData() {
        debug.log('Refresh shop data');
        
        // Update item prices
        updateItemPrices();
        
        // Check free NFT claim status
        checkFreeNFTClaimStatus();
        
        // Check if there are claimable NFTs
        checkClaimableEggsStatus();
        
        // Check free PwFood claim status
        checkFreePwFoodClaimStatus();
        
        // Update remaining rare and legendary NFTs
        updateNFTRemaining();
        

    }
    
    /**
     * Show wallet connection modal
     */
    function showWalletModal() {
        debug.log('Show wallet connection modal');
        
        if (!walletFrame) {
            walletFrame = document.getElementById('walletFrame');
        }
        
        if (walletFrame && walletFrame.contentWindow) {
            try {
                walletFrame.contentWindow.postMessage({ 
                    type: 'showWalletModal' 
                }, '*');
                
                // Show iframe
                walletFrame.style.display = 'block';
            } catch (error) {
                debug.error('Show wallet modal failed:', error);
            }
        } else {
            debug.error('Wallet iframe is not available');
        }
    }
    
    
    /**
     * Update wallet UI - simplified to use WalletNetworkManager only
     * @param {boolean} connected - Wallet connection status
     * @param {string} address - Wallet address
     */
    function updateWalletUI(connected, address = null) {
        debug.log(`Update wallet UI: connected=${connected}, address=${address || 'null'}`);
        
        // Use WalletNetworkManager exclusively
        let finalConnected = connected;
        let finalAddress = address;
        
        if (window.walletNetworkManager && window.walletNetworkManager.isInitialized) {
            const status = window.walletNetworkManager.getStatus();
            const managerAddress = window.walletNetworkManager.getCurrentAddress();
            
            if (status.isConnected && managerAddress) {
                finalConnected = true;
                finalAddress = managerAddress;
                debug.log('Using WalletNetworkManager for UI update:', finalAddress);
            }
        }
        
        // Update connection status
        isWalletConnected = finalConnected;
        
        // Update address display
        const walletAddressElement = document.getElementById('walletAddress');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        
        if (walletAddressElement) {
            if (finalConnected && finalAddress) {
                walletAddressElement.textContent = formatAddress(finalAddress);
                walletAddressElement.classList.add('connected');
                currentAddress = finalAddress;
                
                // Initialize contracts
                if (!web3 || !nftLotteryManagerContract) {
                    debug.log('Wallet connected, initializing contracts');
                    
                    // Use private key wallet Web3 if available
                    if (shouldUsePrivateKeyWallet()) {
                        web3 = window.SecureWalletManager.getWeb3();
                    }
                    
                    if (web3) {
                    initContracts();
                    }
                }
                
                // Check free NFT claim status
                checkFreeNFTClaimStatus();
                
            } else {
                walletAddressElement.textContent = i18n.t('wallet.noWallet') || 'Wallet not connected';
                walletAddressElement.classList.remove('connected');
                currentAddress = null;
            }
        }
        
        if (connectWalletBtn) {
            if (finalConnected) {
                connectWalletBtn.textContent = i18n.t('wallet.disconnect') || 'Disconnect';
                connectWalletBtn.onclick = disconnectWallet;
            } else {
                connectWalletBtn.textContent = i18n.t('wallet.connect') || 'Connect';
                connectWalletBtn.onclick = handleWalletBtnClick;
            }
        }
    }
    
    /**
     * Format address display
     * @param {string} address - Full address
     * @returns {string} - Formatted address
     */
    function formatAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    
    /**
     * Update UI texts
     */
    function updateUITexts() {
        // Only execute if i18n is available
        if (!window.i18n) return;
        
        // Update page title
        document.title = i18n.t('navigation.shop') + ' - ' + i18n.t('game.title');
        
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
        
        // Update elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = i18n.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        debug.log('UI texts updated to language:', i18n.getCurrentLocale());
    }

    // showSimpleAlert is now globally defined above

    // Initialize egg total price inputs after modules are loaded
    function initializeEggTotalPriceInputs() {
    // Get the batch lottery input boxes
    const commonEggAmountInput = document.getElementById('common-egg-amount');
    const rareEggAmountInput = document.getElementById('rare-egg-amount');
    const legendaryEggAmountInput = document.getElementById('legendary-egg-amount');
    
    // If the input box exists, add the event listener to update the total price
        if (commonEggAmountInput && typeof window.updateEggTotalPrice === 'function') {
            commonEggAmountInput.addEventListener('input', window.updateEggTotalPrice);
            window.updateEggTotalPrice({ target: commonEggAmountInput }); // Initialize the total price
        }
        
        if (rareEggAmountInput && typeof window.updateEggTotalPrice === 'function') {
            rareEggAmountInput.addEventListener('input', window.updateEggTotalPrice);
            window.updateEggTotalPrice({ target: rareEggAmountInput }); // Initialize the total price
        }
        
        if (legendaryEggAmountInput && typeof window.updateEggTotalPrice === 'function') {
            legendaryEggAmountInput.addEventListener('input', window.updateEggTotalPrice);
            window.updateEggTotalPrice({ target: legendaryEggAmountInput }); // Initialize the total price
        }
    }
    
    // Call initialization after a short delay to ensure modules are loaded
    setTimeout(initializeEggTotalPriceInputs, 1000);
    /**
     * load the NFTManagerABI file
     */
    function loadNFTManagerABI() {
        if (window.NFTManagerABI) {
            debug.log('NFTManagerABI already loaded, no need to load again');
            return;
        }
        
        debug.log('loading the NFTManagerABI...');
        
        // create a script tag to load the ABI file
        const script = document.createElement('script');
        script.src = '../../scripts/contracts/ABI/NFTManagerABI.js';
        script.async = true;
        
        script.onload = function() {
            debug.log('NFTManagerABI loaded successfully');
            
            // check if the ABI is successfully loaded
            if (window.NFTManagerABI) {
                debug.log('NFTManagerABI loaded successfully to the global variable');
                
                // try to reinitialize the NFTManager contract
                initNFTManagerContract();
            } else {
                debug.error('NFTManagerABI loaded but the global variable not found');
            }
        };
        
        script.onerror = function() {
            debug.error('NFTManagerABI loading failed');
        };
        
        document.head.appendChild(script);
    }
    
    /**
     * initialize the NFTManager contract
     */
    function initNFTManagerContract() {
        debug.log('try to initialize the NFTManager contract...');
        
        if (!web3) {
            debug.error('Web3 not initialized, cannot initialize the NFTManager contract');
            return;
        }
        
        if (!window.NFTManagerABI) {
            debug.error('NFTManagerABI not loaded, cannot initialize the NFTManager contract');
            loadNFTManagerABI();
            return;
        }
        
        try {
            // get the NFTManager contract address
            let nftManagerAddress;
            
            // try to get the contract address using different methods
            if (typeof window.getContractAddress === 'function') {
                nftManagerAddress = window.getContractAddress('NFTManager');
                debug.log('use getContractAddress to get the NFTManager address:', nftManagerAddress);
            } else if (window.contractAddresses) {
                const network = window.currentNetwork || 'MAIN';
                nftManagerAddress = window.contractAddresses[network]?.NFTManager;
                debug.log('get the NFTManager address from contractAddresses:', nftManagerAddress);
            }
            
            if (!nftManagerAddress) {
                debug.error('cannot get the NFTManager contract address');
                return null;
            }
            
            // create the NFTManager contract instance
            nftManagerContract = new web3.eth.Contract(
                window.NFTManagerABI,
                nftManagerAddress
            );
            
            debug.log('NFTManager contract initialized successfully:', nftManagerAddress);
            
            // immediately try to update the NFT remaining quantity
            setTimeout(updateNFTRemaining, 500);
            
            return nftManagerContract;
        } catch (error) {
            debug.error('failed to manually initialize the NFTManager contract:', error);
            return null;
        }
    }


    // Legacy wallet check functions removed - use walletNetworkManager instead
}); // End of DOMContentLoaded 