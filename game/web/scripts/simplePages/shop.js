document.addEventListener('DOMContentLoaded', () => {
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet World Normal Mode Shop]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet World Normal Mode Shop Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet World Normal Mode Shop Warning]', ...args);
        }
    };
    
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
    
    // Web3 instance and contract instances
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
        
        // Preload wallet iframe
        if (walletFrame) {
            debug.log('Preloading wallet iframe');
            
            // Ensure iframe has src
            if (!walletFrame.src || walletFrame.src === '') {
                walletFrame.src = '../../webPages/wallets/wallets.html';
            }
            
            // Output iframe source
            debug.log('Wallet iframe source:', walletFrame.src);
            
            // Ensure iframe is loaded
            walletFrame.onload = function() {
                debug.log('Wallet iframe loaded');
                // Check wallet status after iframe is loaded
                checkWalletStatus();
            };
            
            // If iframe is already loaded, check wallet status directly
            if (walletFrame.complete) {
                debug.log('Wallet iframe loaded');
                checkWalletStatus();
            }
        }
        
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
        
        // Check wallet status in local storage
        checkStoredWalletConnection();
        
        // Load contract initializer file
        loadContractInitializers();
        
        // Load wallet connection iframe message listener
        
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
        
        // Try to get Web3 instance from parent window
        if (!web3) {
            if (window.parent && window.parent.homeWeb3) {
                debug.log('Get homeWeb3 instance from parent window');
                web3 = window.parent.homeWeb3;
                // If Web3 and address already exist, initialize contracts directly
                if (web3 && currentAddress) {
                    debug.log('Initialize contracts using parent window\'s Web3 instance and address');
                    initContracts();
                }
            } else if (window.homeWeb3) {
                debug.log('Use global homeWeb3 instance');
                web3 = window.homeWeb3;
                // If Web3 and address already exist, initialize contracts directly
                if (web3 && currentAddress) {
                    debug.log('Initialize contracts using global Web3 instance and address');
                    initContracts();
                }
            } else if (window.ethereum) {
                debug.log('Create Web3 instance using window.ethereum');
                web3 = new Web3(window.ethereum);
                if (web3 && currentAddress) {
                    debug.log('Initialize contracts using ethereum created Web3 instance');
                    initContracts();
                }
            } else if (window.web3) {
                debug.log('Create Web3 instance using window.web3');
                web3 = new Web3(window.web3.currentProvider);
                if (web3 && currentAddress) {
                    debug.log('Initialize contracts using web3 created Web3 instance');
                    initContracts();
                }
            }
        }
        
        // Add delay check to ensure normal operation even if wallet data is not received
        setTimeout(() => {
            if (!web3 || !nftLotteryManagerContract) {
                debug.log('Delayed check - Web3 or contract not initialized, try other methods to initialize');
                
                // Try to get web3 status from localStorage
                const web3Initialized = localStorage.getItem('web3Initialized');
                
                // Try to create web3 from window.ethereum
                if (!web3 && window.ethereum) {
                    debug.log('Try to create Web3 instance from window.ethereum');
                    web3 = new Web3(window.ethereum);
                    if (currentAddress) {
                        initContracts();
                    }
                } 
                // Or get web3 from window.web3
                else if (!web3 && window.web3) {
                    debug.log('Try to create Web3 instance from window.web3');
                    web3 = new Web3(window.web3.currentProvider);
                    if (currentAddress) {
                        initContracts();
                    }
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
                if (typeof window.initNFTLotteryManagerContract === 'function') {
                    initShopContracts();
                }
            }
            
            // Update rare and legendary NFT remaining quantities
            updateNFTRemaining();
        }, 2000);
        
        
        // Initialize batch purchase quantity input fields
        initBatchPurchaseInputs();
        
        // Initialize UI elements to display remaining NFT quantities
        initNFTRemainingUI();
        
        // Add message listener to handle iframe requests
        window.addEventListener('message', handleIframeMessages);

        // Initialize test buttons for development
        // initTestButtons();
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
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send disconnect message to wallet iframe
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
        
        // Clear local storage
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        debug.log('Wallet disconnected');
    }
    
    /**
     * Check wallet status
     * First check sessionStorage, then check localStorage
     */
    function checkWalletStatus() {
        debug.log('Checking wallet connection status...');
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
     * Initialize token contracts
     */
    function initializeTokenContracts() {
        debug.log('Initializing token contracts...');
        
        if (!web3) {
            debug.error('Web3 not initialized, cannot initialize token contracts');
            return;
        }
        
        try {
            // Get token address
            const getTokenAddress = window.getTokenAddress || function(token) {
                if (window.ERC20TokenAddresses) {
                    return window.ERC20TokenAddresses[token];
                }
                return null;
            };
            
            // Initialize payment token contracts (USDT, USDC)
            const supportedTokens = ['USDT', 'USDC', 'DAI'];
            supportedTokens.forEach(token => {
                const tokenAddress = getTokenAddress(token);
                if (!tokenAddress) {
                    debug.warn(`${token} address not defined`);
                    return;
                }
                
                try {
                    if (token === 'PwPoint' && typeof window.initPwPointContract === 'function') {
                        // Use dedicated PWPoint initialization function
                        const getContractAddressFunc = window.getContractAddress || function(name) {
                            const network = window.currentNetwork || 'MAIN';
                            if (window.contractAddresses && window.contractAddresses[network]) {
                                return window.contractAddresses[network][name];
                            }
                            return null;
                        };
                        tokenContracts[token] = window.initPwPointContract(web3, getContractAddressFunc);
                    } else if (typeof window.initERC20Contract === 'function') {
                        // Use generic ERC20 initialization function
                        tokenContracts[token] = window.initERC20Contract(web3, tokenAddress);
                    } else {
                        // Use ABI to create contract directly
                        const tokenABI = window.GENERIC_ERC20_ABI || [];
                        tokenContracts[token] = new web3.eth.Contract(tokenABI, tokenAddress);
                    }
                    
                    if (tokenContracts[token]) {
                        debug.log(`${token} contract initialized, address:`, tokenAddress);
                    } else {
                        debug.error(`Failed to initialize ${token} contract`);
                    }
                } catch (error) {
                    debug.error(`Failed to initialize ${token} contract:`, error);
                }
            });
        } catch (error) {
            debug.error('Failed to initialize token contracts:', error);
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
     * Initialize or load payment token configuration
     */
    function initPaymentTokens() {
        debug.log('Initializing payment token configuration...');
        
        // First, set a default USDT address directly, ensuring the token address is always available
        if (!window.ERC20TokenAddresses) {
            window.ERC20TokenAddresses = {};
        }
        window.ERC20TokenAddresses.USDT = '0x55d398326f99059ff775485246999027b3197955';
        debug.log('Set default USDT address:', window.ERC20TokenAddresses.USDT);
        
        // Check if there is a global SUPPORTED_PAYMENT_TOKENS configuration
        if (!window.SUPPORTED_PAYMENT_TOKENS) {
            debug.warn('No SUPPORTED_PAYMENT_TOKENS configuration found, will try to load supported token configuration');
            
            // Dynamically load supportedTokens script
            const scriptEl = document.createElement('script');
            scriptEl.src = '../../scripts/other/supportedTokens.js';
            scriptEl.onload = function() {
                debug.log('Supported token configuration loaded, entries:', window.SUPPORTED_PAYMENT_TOKENS?.length || 0);
                // Initialize ERC20 token addresses after configuration is loaded
                initializeERC20TokenAddresses();
            };
            scriptEl.onerror = function() {
                debug.error('Failed to load supported token configuration');
            };
            document.head.appendChild(scriptEl);
        } else {
            debug.log('SUPPORTED_PAYMENT_TOKENS configuration found, entries:', window.SUPPORTED_PAYMENT_TOKENS.length);
            // Initialize ERC20 token addresses after configuration is loaded
            initializeERC20TokenAddresses();
        }
        
        // Payment token options
        const paymentOptions = document.querySelectorAll('.payment-options .payment-option');
        
        // If payment options exist, bind click event
        if (paymentOptions && paymentOptions.length > 0) {
            paymentOptions.forEach(option => {
                option.addEventListener('click', () => {
                    // Remove selected state from other options
                    paymentOptions.forEach(opt => opt.classList.remove('selected'));
                    
                    // Add selected state to current option
                    option.classList.add('selected');
                    
                    // Update item prices display
                    updateItemPrices(option.dataset.token);
                });
            });
            
            // Default select first option
            if (paymentOptions[0]) {
                paymentOptions[0].click();
            }
        } else {
            debug.warn('No payment options element found');
        }
    }
    
    /**
     * Initialize ERC20 token addresses
     */
    function initializeERC20TokenAddresses() {
        debug.log('Initializing ERC20 token addresses...');
        
        // If there is no global ERC20TokenAddresses object, create one
        if (!window.ERC20TokenAddresses) {
            window.ERC20TokenAddresses = {};
        }
        
        // If there is SUPPORTED_PAYMENT_TOKENS, get token addresses from it
        if (window.SUPPORTED_PAYMENT_TOKENS && Array.isArray(window.SUPPORTED_PAYMENT_TOKENS)) {
            window.SUPPORTED_PAYMENT_TOKENS.forEach(token => {
                if (token.id && token.contractAddress) {
                    // Use ID as key, store contract address
                    window.ERC20TokenAddresses[token.id] = token.contractAddress;
                    debug.log(`Added token address: ${token.id} -> ${token.contractAddress}`);
                }
            });
            
            // Add default hardcoded USDT address (if not found in SUPPORTED_PAYMENT_TOKENS)
            if (!window.ERC20TokenAddresses.USDT) {
                window.ERC20TokenAddresses.USDT = window.ERC20TokenAddresses.USDT || '0x55d398326f99059ff775485246999027b3197955';
                debug.log('Using default USDT address:', window.ERC20TokenAddresses.USDT);
            }
            
            debug.log('ERC20 token addresses initialized:', window.ERC20TokenAddresses);
        } else {
            debug.warn('No SUPPORTED_PAYMENT_TOKENS configuration found, using default token addresses');
            
                // Set default token addresses
            window.ERC20TokenAddresses = {
                USDT: '0x55d398326f99059ff775485246999027b3197955',  
                USDC: '0x55d398326f99059ff775485246999027b3197955',  
                DAI: '0x55d398326f99059ff775485246999027b3197955',   
            };
            
        }
    }
    
    /**
     * Get default payment token
     * @returns {string} Default token ID
     */
    function getDefaultPaymentToken() {
        // Use USDT first
        if (window.ERC20TokenAddresses && window.ERC20TokenAddresses.USDT) {
            return 'USDT';
        }
        
        // Find default token in SUPPORTED_PAYMENT_TOKENS
        if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
            const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault);
            if (defaultToken) {
                return defaultToken.id;
            }
            // Otherwise use first token
            return window.SUPPORTED_PAYMENT_TOKENS[0].id;
        }
        
        // Find first token in ERC20TokenAddresses
        if (window.ERC20TokenAddresses) {
            const tokens = Object.keys(window.ERC20TokenAddresses);
            if (tokens.length > 0) {
                return tokens[0];
            }
        }
        
        // Return USDT as default
        return 'USDT';
    }
    
    /**
     * Update item prices
     */
    function updateItemPrices() {
        debug.log('Updating item prices...');
        
        if (!web3 || !nftLotteryManagerContract) {
            debug.warn('Cannot update item prices: Web3 or NFTLotteryManager contract not initialized');
            return;
        }
        
        try {
            // Get default token
            const defaultToken = getDefaultPaymentToken();
            debug.log('Using default token to update prices:', defaultToken);
            
            // Update egg prices
            shopItems.forEach(item => {
                const itemId = item.getAttribute('data-id');
                const category = item.getAttribute('data-category');
                
                if (!itemId || !category) {
                    debug.error('Unknown item type:', itemId);
                    return;
                }
                
                const priceElem = item.querySelector('.item-price');
                if (!priceElem) {
                    debug.error('Cannot find price element:', itemId);
                    return;
                }
                
                // Get price based on item type
                if (category === 'egg') {
                    let tokenId = 0;
                    // Determine egg type based on ID
                    if (itemId === 'egg-common') {
                        tokenId = 1; // Common egg ID
                    } else if (itemId === 'egg-rare') {
                        tokenId = 2; // Rare egg ID
                    } else if (itemId === 'egg-legendary') {
                        tokenId = 3; // Legendary egg ID
                    }
                    
                    // Get price
                    const tokenAddress = window.ERC20TokenAddresses?.[defaultToken];
                    if (tokenAddress && nftLotteryManagerContract.methods.getEggPrice) {
                        nftLotteryManagerContract.methods.getEggPrice(tokenId, tokenAddress)
                            .call()
                            .then(price => {
                                if (price) {
                                    // Get token information
                                    let decimals = 18; // Default precision
                                    let symbol = defaultToken; // Use token ID as symbol
                                    
                                    // Find token precision and symbol
                                    if (window.SUPPORTED_PAYMENT_TOKENS) {
                                        const tokenInfo = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.id === defaultToken);
                                        if (tokenInfo) {
                                            decimals = tokenInfo.decimals || 18;
                                            symbol = tokenInfo.name || tokenInfo.id;
                                        }
                                    }
                                    
                                    // Convert wei to appropriate unit
                                    let formattedPrice;
                                    if (decimals === 18) {
                                        formattedPrice = web3.utils.fromWei(price, 'ether');
                                    } else if (decimals === 6) {
                                        formattedPrice = web3.utils.fromWei(price, 'mwei');
                                    } else {
                                        // Custom precision conversion
                                        formattedPrice = (Number(price) / Math.pow(10, decimals)).toString();
                                    }
                                    
                                    priceElem.textContent = `${formattedPrice} ${symbol}`;
                                    debug.log(`${itemId} price updated to: ${formattedPrice} ${symbol}`);
                                } else {
                                    debug.warn(`Failed to get ${itemId} price`);
                                }
                            })
                            .catch(error => {
                                debug.error(`Failed to get ${itemId} price:`, error);
                            });
                    } else {
                        debug.warn(`${defaultToken} address not defined or contract method not available, cannot get egg price`);
                    }
                } else if (category === 'food') {
                    // Food price logic
                    // Here you can add food price retrieval logic
                    // For now, using default price
                    priceElem.textContent = `3000 PWFOOD = 1 ${defaultToken}`;
                }
            });
        } catch (error) {
            debug.error('Error updating item prices:', error);
        }
    }
    
    /**
     * Handle buy button click event
     * @param {Event} event - Click event object
     */
    function handleBuyButtonClick(event) {
        debug.log('Handle buy button click event');
        
        // Prevent default behavior
        event.preventDefault();
        
        // Check wallet connection status
        if (!isWalletConnected) {
            showStatusMessage('pleaseConnectWallet', 'error');
            // Show wallet connection modal
            showWalletModal();
            return;
        }
        
        // Check Web3 and contract initialization status
        if (!web3 || !nftLotteryManagerContract) {
            showStatusMessage('contractLoading', 'error');
            
            // Try to initialize contracts
            if (web3 && currentAddress) {
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
    
    /**
     * Reset buy button state
     * @param {HTMLElement} button - Button element
     */
    function resetBuyButton(button) {
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
    }
    
    /**
     * Show status message
     * @param {string} message - Message key or direct message
     * @param {string} type - Message type (info, success, error, warning)
     * @param {object} params - Parameters for translation
     */
    function showStatusMessage(message, type = 'info', params = {}) {
        // First, remove any existing status message bar
        const existingMessage = document.querySelector('.temporary-status-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Try to translate the message if it seems to be a key (contains no spaces and dots)
        let messageText = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            // Check if this might be a translation key
            if (message.match(/^[a-zA-Z0-9_\.]+$/) && !message.includes(' ')) {
                // Try to get the translation from shop.notification namespace
                const translationKey = `shop.notification.${message}`;
                const translated = window.i18n.t(translationKey, params);
                
                // Only use translation if it's different from the key (meaning translation exists)
                if (translated !== translationKey) {
                    messageText = translated;
                }
            }
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `status-message ${type} temporary-status-message`;
        messageEl.textContent = messageText;

        // Add basic styles for temporary message bar
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.left = '50%';
        messageEl.style.transform = 'translateX(-50%)';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '4px';
        messageEl.style.zIndex = '1001'; // Ensure it's above the payment frame overlay
        messageEl.style.textAlign = 'center';
        messageEl.style.maxWidth = '90%';
        messageEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.3s ease-in-out';

        // Apply type-specific background colors
        switch(type) {
            case 'success':
                messageEl.style.backgroundColor = '#4CAF50';
                messageEl.style.color = 'white';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#f44336';
                messageEl.style.color = 'white';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ff9800';
                messageEl.style.color = 'white';
                break;
            case 'info':
            default:
                messageEl.style.backgroundColor = '#2196F3';
                messageEl.style.color = 'white';
                break;
        }

        // Add to page
        document.body.appendChild(messageEl);

        // Fade in
        setTimeout(() => {
            messageEl.style.opacity = '1';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.addEventListener('transitionend', () => {
                messageEl.remove();
            });
        }, 3000);
    }
    
    /**
     * Get error message text
     * @param {Error} error - Error object
     * @returns {string} - Formatted error message
     */
    function getErrorMessage(error) {
        if (!error) return 'Unknown error';
        
        // Handle MetaMask error
        if (error.code === 4001) {
            return 'User denied transaction';
        }
        
        if (error.message && error.message.includes('User denied')) {
            return 'User denied transaction';
        }
        
        // Handle contract error
        if (error.reason) {
            return error.reason;
        }
        
        // If it's a string, return it directly
        if (typeof error === 'string') {
            return error;
        }
        
        // Return general error message
        return error.message || 'Transaction failed';
    }
    
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
     * Hide wallet connection modal
     */
    function hideWalletModal() {
        debug.log('Hide wallet connection modal');
        
        if (!walletFrame) {
            walletFrame = document.getElementById('walletFrame');
        }
        
        if (walletFrame) {
            walletFrame.style.display = 'none';
        }
    }
    
    /**
     * Update wallet UI
     * @param {boolean} connected - Wallet connection status
     * @param {string} address - Wallet address
     */
    function updateWalletUI(connected, address = null) {
        debug.log(`Update wallet UI: connected=${connected}, address=${address || 'null'}`);
        
        // Update connection status
        isWalletConnected = connected;
        
        // Update address display
        const walletAddressElement = document.getElementById('walletAddress');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        
        if (walletAddressElement) {
            if (connected && address) {
                walletAddressElement.textContent = formatAddress(address);
                walletAddressElement.classList.add('connected');
                currentAddress = address;
                
                // Initialize contracts
                if (!web3 || !nftLotteryManagerContract) {
                    debug.log('Wallet connected, initializing contracts');
                    initContracts();
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
            if (connected) {
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

    /**
     * Purchase pet eggs
     * @param {number} tokenId - Egg type ID (1: common, 2: rare, 3: legendary)
     * @param {string} paymentToken - Payment token
     * @param {HTMLElement} buyButton - Buy button
     */
    async function purchaseEgg(tokenId, paymentToken, buyButton) {
        debug.log('Purchase pet eggs:', { tokenId, paymentToken });
        
        if (!web3 || !currentAddress) {
            debug.error('Purchase failed: Web3 not initialized or wallet not connected');
            resetBuyButton(buyButton);
            return;
        }
        
        try {
            // Set different names and prices based on egg type
            let eggName = '';
            let eggPrice = '';
            let eggImage = '';
            let contractMethod = '';
            let batchMethod = '';
            let batchAmountInput = null;
            
            switch(tokenId) {
                case 1:
                    eggName = i18n && typeof i18n.t === 'function' ? i18n.t('shop.items.commonEgg') : 'Common Egg';
                    eggPrice = '9.9';
                    eggImage = '../../resources/images/items/egg-common.png';
                    contractMethod = 'openCommonEgg';
                    batchMethod = 'batchOpenCommonEgg';
                    batchAmountInput = document.getElementById('common-egg-amount');
                    break;
                case 2:
                    eggName = i18n && typeof i18n.t === 'function' ? i18n.t('shop.items.rareEgg') : 'Rare Egg';
                    eggPrice = '99';
                    eggImage = '../../resources/images/items/egg-rare.png';
                    contractMethod = 'openRareEgg';
                    batchMethod = 'batchOpenRareEgg';
                    batchAmountInput = document.getElementById('rare-egg-amount');
                    break;
                case 3:
                    eggName = i18n && typeof i18n.t === 'function' ? i18n.t('shop.items.legendaryEgg') : 'Legendary Egg';
                    eggPrice = '599';
                    eggImage = '../../resources/images/items/egg-legendary.png';
                    contractMethod = 'openLegendaryEgg';
                    batchMethod = 'batchOpenLegendaryEgg';
                    batchAmountInput = document.getElementById('legendary-egg-amount');
                    break;
                default:
                    eggName = 'Pet Egg';
                    eggPrice = '10';
                    eggImage = '../../resources/images/items/egg-common.png';
                    contractMethod = 'openCommonEgg';
                    batchMethod = 'batchOpenCommonEgg';
            }
            
            // Get batch purchase quantity
            let batchCount = 1;
            if (batchAmountInput) {
                batchCount = parseInt(batchAmountInput.value) || 1;
                if (batchCount < 1) batchCount = 1;
                if (batchCount > 5) batchCount = 5;
            }
            
            // Calculate total price
            const totalPrice = (parseFloat(eggPrice) * batchCount).toFixed(2);
            
            // Create payment info object
            const paymentInfo = {
                itemType: "egg", 
                itemName: batchCount > 1 ? `${eggName} x${batchCount}` : eggName,
                itemPrice: totalPrice,
                itemId: tokenId,
                itemImage: eggImage,
                contractFunction: batchCount > 1 ? batchMethod : contractMethod,
                batchCount: batchCount
            };
            
            // Open payment confirmation page
            openPaymentConfirmation(paymentInfo, async () => {
                // When user confirms payment
                debug.log('User confirmed payment, starting to purchase eggs', { tokenId, batchCount });
                
                try {
                    // Get payment token
                    let payToken = null;
                    
                    // First try using the initialized USDT contract
                    if (tokenContracts.USDT && tokenContracts.USDT._address) {
                        debug.log("Using initialized USDT token");
                        payToken = tokenContracts.USDT._address;
                    } 
                    // Then try to get from supportedTokens
                    else if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                        // Find default token or first token
                        const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault) || window.SUPPORTED_PAYMENT_TOKENS[0];
                        debug.log("Get token from SUPPORTED_PAYMENT_TOKENS:", defaultToken);
                        
                        if (defaultToken && defaultToken.contractAddress) {
                            payToken = defaultToken.contractAddress;
                            
                            // If the contract hasn't been initialized yet, initialize it
                            if (!tokenContracts[defaultToken.id] && typeof window.initERC20Contract === 'function') {
                                debug.log(`Initializing ${defaultToken.name} contract...`);
                                try {
                                    tokenContracts[defaultToken.id] = window.initERC20Contract(web3, defaultToken.contractAddress);
                                    debug.log(`${defaultToken.name} contract initialized successfully`);
                                } catch (err) {
                                    debug.error(`Failed to initialize ${defaultToken.name} contract:`, err);
                                }
                            }
                        }
                    }
                    else {
                        debug.log("Using default USDT address");
                        payToken = '0x55d398326f99059ff775485246999027b3197955'; 
                        
                        // Ensure the USDT ERC20 contract is initialized
                        if (!tokenContracts.USDT && typeof window.initERC20Contract === 'function') {
                            tokenContracts.USDT = window.initERC20Contract(web3, payToken);
                        }
                    }
                    
                    if (!payToken) {
                        throw new Error('Payment token not initialized');
                    }
                    
                    debug.log("Using payment token address:", payToken);
                    
                    // Find or create token contract instance
                    let tokenContract = null;
                    const tokenId = Object.keys(tokenContracts).find(key => 
                        tokenContracts[key] && tokenContracts[key]._address && 
                        tokenContracts[key]._address.toLowerCase() === payToken.toLowerCase()
                    );
                    
                    if (tokenId && tokenContracts[tokenId]) {
                        debug.log(`Using initialized ${tokenId} contract instance`);
                        tokenContract = tokenContracts[tokenId];
                    } else if (typeof window.initERC20Contract === 'function') {
                        debug.log("Creating new ERC20 contract instance");
                        tokenContract = window.initERC20Contract(web3, payToken);
                    } else if (window.GENERIC_ERC20_ABI) {
                        debug.log("Creating new ERC20 contract instance with generic ABI");
                        tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, payToken);
                    }
                    
                    if (!tokenContract) {
                        throw new Error('Failed to create token contract instance');
                    }
                    
                    // Get single price (convert to wei units)
                    const priceInWei = web3.utils.toWei(eggPrice, 'ether');
                    // Calculate total price (use for batch purchases)
                    const totalPriceInWei = web3.utils.toWei(totalPrice.toString(), 'ether');
                    
                    debug.log('Egg price (wei):', priceInWei, 'Total price (wei):', totalPriceInWei);
                    
                    // Check token approval
                    debug.log('Checking token approval...');
                    
                    // Use ContractApprovalManager's authorization method
                    if (window.ContractApprovalManager && window.ContractApprovalManager.checkIfApprovalNeeded) {
                        try {
                            // Check approval status (use total price)
                            const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                tokenContract,
                                currentAddress,
                                nftLotteryManagerContract._address,
                                totalPriceInWei
                            );
                            
                            if (approvalStatus.needsApproval) {
                                debug.log('Need to approve token:', approvalStatus);
                                showStatusMessage('requestingApproval', 'info');
                                
                                // Execute authorization
                                const approveResult = await window.ContractApprovalManager.approveERC20Token(
                                    tokenContract,
                                    nftLotteryManagerContract._address,
                                    totalPriceInWei,
                                    currentAddress,
                                    true // Use maximum approval limit
                                );
                                
                                if (!approveResult.success) {
                                    throw new Error('Token authorization failed: ' + (approveResult.error || 'Unknown error'));
                                }
                                
                                debug.log('Token authorization successful');
                            } else {
                                debug.log('Token has enough authorization');
                            }
                        } catch (error) {
                            debug.error('Error checking approval or authorization:', error);
                            throw new Error('Failed to authorize token: ' + getErrorMessage(error));
                        }
                    } else {
                        // Use old method as fallback
                        const approved = await checkAndApproveToken(tokenContract, nftLotteryManagerContract._address, totalPriceInWei);
                        if (!approved) {
                            throw new Error('Token authorization failed');
                        }
                    }
                    
                    // Check and set authorization for the contract
                    debug.log('Checking and setting contract authorization...');
                    if (window.ContractApprovalManager && window.ContractApprovalManager.setupEggApprovals) {
                        try {
                            const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                web3, 
                                currentAddress, 
                                tokenContract,
                                totalPriceInWei
                            );
                            
                            if (!allApproved) {
                                throw new Error('Failed to authorize contract');
                            }
                            
                            debug.log('All necessary contract authorizations completed');
                        } catch (error) {
                            debug.error('Failed to set contract authorization:', error);
                            throw new Error('Failed to set contract authorization: ' + getErrorMessage(error));
                        }
                    } else if (typeof window.setupRequiredApprovals === 'function') {
                        // Use old method as fallback
                        const allApproved = await window.setupRequiredApprovals(
                            web3, 
                            currentAddress, 
                            tokenContract, 
                            totalPriceInWei
                        );
                        
                        if (!allApproved) {
                            throw new Error('Failed to authorize contract');
                        }
                    } else {
                        debug.warn('Authorization setup function not available, skipping NFTManager and other contract authorizations');
                    }
                    
                    // based on whether it's a single or batch purchase
                    let result;
                    let statusMessage = batchCount > 1 ? 
                        `purchasingEggs` : 
                        `purchasingEggs`;
                    
                    showStatusMessage(statusMessage, 'info', { eggName: eggName });
                    debug.log('Token authorized, starting to purchase eggs, token address:', payToken, 'batch quantity:', batchCount);
                    
                    if (batchCount > 1) {
                        // Batch purchase
                        switch(batchMethod) {
                            case 'batchOpenCommonEgg':
                                result = await nftLotteryManagerContract.methods.batchOpenCommonEgg(payToken, batchCount).send({ 
                                    from: currentAddress,
                                    gas: 1000000 + (batchCount * 500000) // Adjust gas limit dynamically based on quantity
                                });
                                break;
                            case 'batchOpenRareEgg':
                                result = await nftLotteryManagerContract.methods.batchOpenRareEgg(payToken, batchCount).send({ 
                                    from: currentAddress,
                                    gas: 1000000 + (batchCount * 600000) // Adjust gas limit dynamically based on quantity
                                });
                                break;
                            case 'batchOpenLegendaryEgg':
                                result = await nftLotteryManagerContract.methods.batchOpenLegendaryEgg(payToken, batchCount).send({ 
                                    from: currentAddress,
                                    gas: 1000000 + (batchCount * 600000) // Adjust gas limit dynamically based on quantity
                                });
                                break;
                            default:
                                throw new Error('Unknown batch purchase method');
                        }
                    } else {
                        // Single purchase
                        switch(contractMethod) {
                            case 'openCommonEgg':
                                result = await nftLotteryManagerContract.methods.openCommonEgg(payToken).send({ 
                                    from: currentAddress,
                                    gas: 1000000 // Set enough gas limit
                                });
                                break;
                            case 'openRareEgg':
                                result = await nftLotteryManagerContract.methods.openRareEgg(payToken).send({ 
                                    from: currentAddress,
                                    gas: 1000000 // Set higher gas limit for VRF request
                                });
                                break;
                            case 'openLegendaryEgg':
                                result = await nftLotteryManagerContract.methods.openLegendaryEgg(payToken).send({ 
                                    from: currentAddress,
                                    gas: 1000000 // Set higher gas limit for VRF request
                                });
                                break;
                            default:
                                throw new Error('Unknown egg type');
                        }
                    }
                    
                    debug.log('Purchase egg transaction successful:', result);
                    
                    let successMessage = batchCount > 1 ? 
                        `purchaseEggsSuccess` : 
                        `purchaseEggsSuccess`;
                    
                    showStatusMessage(successMessage, 'success', { count: batchCount, eggName: eggName });
                    
                    // Get lottery result from transaction
                    if (result && result.transactionHash) {
                        try {
                            // Save transaction hash
                            localStorage.setItem('lastEggTxHash', result.transactionHash);
                            
                            // Rare and legendary eggs need to display waiting prompts (because they need to be claimed through claimEggs)
                            if ((contractMethod === 'openRareEgg' || contractMethod === 'openLegendaryEgg' || 
                                batchMethod === 'batchOpenRareEgg' || batchMethod === 'batchOpenLegendaryEgg') && 
                                typeof showPendingEggAlert === 'function') {
                                showPendingEggAlert(eggName);
                            }
                            
                            // Based on whether it's a batch purchase, call different methods to get results
                            if (batchCount > 1) {
                                // Try to get batch lottery results
                                if (typeof window.getLotteryResultsFromTransaction === 'function') {
                                    debug.log('Attempting to get batch lottery results from transaction...');
                                    const batchResults = await window.getLotteryResultsFromTransaction(
                                        web3, 
                                        nftLotteryManagerContract, 
                                        result.transactionHash, 
                                        batchCount
                                    );
                                    
                                    if (batchResults && Array.isArray(batchResults) && batchResults.length > 0) {
                                        debug.log('Successfully got batch lottery results:', batchResults);
                                        
                                        // Only common eggs display batch lottery results, rare and legendary eggs already have pending prompts
                                        if (batchMethod === 'batchOpenCommonEgg') {
                                            // Call new function to handle batch lottery results
                                            handleLotteryBatchResults(batchResults);
                                        }
                                    } else {
                                        debug.warn('Failed to get batch lottery results or results are empty');
                                        showStatusMessage('purchaseNoLotteryResult', 'success');
                                    }
                                } else {
                                    debug.warn('Batch lottery result retrieval method not available');
                                    showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                }
                            } else {
                                // Single lottery result processing
                                if (typeof window.getLotteryResultFromTransaction === 'function') {
                                    debug.log('Attempting to get lottery result from transaction...');
                                    
                                    const lotteryResult = await window.getLotteryResultFromTransaction(
                                        web3, 
                                        nftLotteryManagerContract, 
                                        result.transactionHash
                                    );
                                    
                                    if (lotteryResult) {
                                        debug.log('Successfully got lottery result:', lotteryResult);
                                        // Common eggs display lottery results, rare and legendary eggs already have pending prompts
                                        if (contractMethod === 'openCommonEgg' || batchMethod === 'batchOpenCommonEgg') {
                                            handleLotteryResult(lotteryResult);
                                        }
                                    } else {
                                        debug.warn('Failed to get lottery result');
                                        showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                    }
                                } else if (nftLotteryManagerContract.methods.getLotteryResultFromTransaction) {
                                    // Try using contract method to get result
                                    const lotteryResult = await nftLotteryManagerContract.getLotteryResultFromTransaction(result.transactionHash);
                                    if (lotteryResult) {
                                        debug.log('Successfully got lottery result:', lotteryResult);
                                        // Common eggs display lottery results, rare and legendary eggs already have pending prompts
                                        if (contractMethod === 'openCommonEgg' || batchMethod === 'batchOpenCommonEgg') {
                                            handleLotteryResult(lotteryResult);
                                        }
                                    }
                                } else {
                                    debug.warn('Lottery result retrieval method not available');
                                    showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                }
                            }
                        } catch (error) {
                            debug.error('Error getting lottery result:', error);
                            showStatusMessage('purchaseNoLotteryDisplay', 'success');
                        }
                    }
                } catch (error) {
                    debug.error('Error purchasing eggs:', error);
                    showStatusMessage('purchaseFailed', 'error', { message: getErrorMessage(error) });
                    throw error; // Re-throw error so it can be handled by the upper layer
                }
            });
        } catch (error) {
            debug.error('Error preparing to purchase:', error);
            resetBuyButton(buyButton);
        } finally {
            // Ensure button state is reset, regardless of error
            setTimeout(() => {
                resetBuyButton(button);
            }, 2000); // Short delay to avoid conflict with other reset logic
        }
    }
    
    /**
     * Handle lottery results
     * @param {Object} result - Lottery result data
     */
    function handleLotteryResult(result) {
        debug.log('Handling lottery result:', result);
        
        // Check if there is a lottery result
        if (!result) {
            debug.error('Invalid lottery result');
            showStatusMessage('invalidLotteryResult', 'error');
            return;
        }
        
        // Build lottery result object
        const lotteryResultData = {
            user: result.user || currentAddress,
            tokenId: result.tokenId,
            quality: result.quality,
            qualityName: result.qualityName,
            nftId: result.nftId,
            lotteryType: result.lotteryType,
            lotteryTypeName: result.lotteryTypeName
        };
        
        // Try to save result to localStorage
        try {
            localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryResultData));
        } catch (error) {
            debug.error('Failed to save lottery result to localStorage:', error);
        }
        
        // Create lottery result display frame
        const resultFrame = createLotteryResultFrame();
        
        // Listen for iframe load completion event
        resultFrame.onload = function() {
            debug.log('Lottery result iframe loaded, data will be sent after it is ready');
            // Internal message communication will handle data sending, no need to handle it here
        };
        
    }
    
    /**
     * Get lottery result from transaction result
     * @param {Object} txResult - Transaction result
     */
    async function processLotteryResult(txResult) {
        debug.log('Processing transaction result to get lottery information:', txResult);
        
        try {
            if (!txResult || !txResult.transactionHash) {
                debug.error('Invalid transaction result');
                return;
            }
            
            // First try using the method of the NFTLotteryManagerContract instance
            if (nftLotteryManagerContractInstance && typeof nftLotteryManagerContractInstance.getLotteryResultFromTransaction === 'function') {
                try {
                    debug.log('Using the method of the NFTLotteryManagerContract instance to get the result...');
                    const result = await nftLotteryManagerContractInstance.getLotteryResultFromTransaction(txResult.transactionHash);
                    if (result) {
                        debug.log('Successfully got lottery result:', result);
                        handleLotteryResult(result);
                        return;
                    }
                } catch (error) {
                    debug.error('Failed to get result using the NFTLotteryManagerContract instance:', error);
                    // Continue trying other methods
                }
            }
            
            // Secondly try using the global function
            if (typeof window.getLotteryResultFromTransaction === 'function') {
                try {
                    debug.log('Using the global getLotteryResultFromTransaction function to get the result...');
                    const result = await window.getLotteryResultFromTransaction(web3, nftLotteryManagerContract, txResult.transactionHash);
                    if (result) {
                        debug.log('Successfully got lottery result:', result);
                        handleLotteryResult(result);
                        return;
                    }
                } catch (error) {
                    debug.error('Failed to get result using the global function:', error);
                    // Continue trying other methods
                }
            }
            
            // Finally try using the original method to get the result
            debug.log('Attempting to parse transaction receipt using the original method...');
            
            // Get transaction receipt
            const receipt = await web3.eth.getTransactionReceipt(txResult.transactionHash);
            if (!receipt) {
                debug.error('Failed to get transaction receipt');
                return;
            }
            
            // Define quality level mapping
            const qualityNames = {
                0: 'COMMON',  // COMMON
                1: 'GOOD',  // GOOD
                2: 'EXCELLENT',  // EXCELLENT
                3: 'RARE',  // RARE
                4: 'LEGENDARY'   // LEGENDARY
            };
            
            // Define lottery type mapping
            const lotteryTypeNames = {
                'CommonEgg': 'COMMON EGG',
                'RareEgg': 'RARE EGG',
                'LegendaryEgg': 'LEGENDARY EGG',
                'FreeNFT': '免费宠物'
            };
            
            // Get event signature from ABI
            const abi = nftLotteryManagerContract._jsonInterface;
            let nftLotteryResultEventAbi = abi.find(item => item.type === 'event' && item.name === 'NFTLotteryResult');
            let freeNFTClaimedEventAbi = abi.find(item => item.type === 'event' && item.name === 'FreeNFTClaimed');
            
            if (!nftLotteryResultEventAbi && !freeNFTClaimedEventAbi) {
                debug.error('can not find the ABI definition of NFTLotteryResult or FreeNFTClaimed event');
                return;
            }
            
            // Iterate through transaction logs
            for (const log of receipt.logs) {
                // Try to parse NFTLotteryResult event
                if (nftLotteryResultEventAbi && nftLotteryResultEventAbi.signature === log.topics[0]) {
                    try {
                        const decodedLog = web3.eth.abi.decodeLog(
                            nftLotteryResultEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: parseInt(decodedLog.quality),
                            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
                            nftId: decodedLog.nftId,
                            lotteryType: decodedLog.lotteryType,
                            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                        };
                        
                        debug.log('Successfully parsed NFTLotteryResult event:', result);
                        handleLotteryResult(result);
                        return;
                    } catch (error) {
                        debug.error('Failed to parse NFTLotteryResult event:', error);
                    }
                }
                
                // Try to parse FreeNFTClaimed event
                if (freeNFTClaimedEventAbi && freeNFTClaimedEventAbi.signature === log.topics[0]) {
                    try {
                        const decodedLog = web3.eth.abi.decodeLog(
                            freeNFTEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: 0,  // FreeNFT defaults to common quality
                            qualityName: qualityNames[0] || 'COMMON',
                            nftId: decodedLog.nftId,
                            lotteryType: 'FreeNFT',
                            lotteryTypeName: 'Free Pet'
                        };
                        
                        debug.log('Successfully parsed FreeNFTClaimed event:', result);
                        handleLotteryResult(result);
                        return;
                    } catch (error) {
                        debug.error('Failed to parse FreeNFTClaimed event:', error);
                    }
                }
            }
            
            debug.warn('can not find the lottery result event in the transaction logs');
            showStatusMessage('can not find the lottery result, please check your collection for your new pet', 'warning');
            
        } catch (error) {
            debug.error('Failed to process lottery result:', error);
            showStatusMessage('Failed to process lottery result', 'error');
        }
    }
    
    /**
     * Purchase pet food
     * @param {string} foodId - Food ID
     * @param {string} paymentToken - Payment token
     * @param {HTMLElement} buyButton - Buy button
     */
    function purchaseFood(foodId, paymentToken, buyButton) {
        console.log('Purchase food:', { foodId, paymentToken });
        
        if (!web3 || !currentAddress) {
            debug.error('Purchase failed: Web3 is not initialized or wallet is not connected');
            resetBuyButton(buyButton);
            return;
        }
        
        try {
            // Get the amount input by the user
            const amountInput = document.getElementById('food-amount');
            if (!amountInput) {
                showStatusMessage('amountInputNotFound', 'error');
                resetBuyButton(buyButton);
                return;
            }
            
            // Get the input value and check if it is a valid integer
            const inputValue = amountInput.value;
            const amount = parseInt(inputValue, 10);
            
            // Check if it is an integer
            if (!inputValue.match(/^\d+$/)) {
                showSimpleAlert('Input error', 'Please enter an integer amount');
                resetBuyButton(buyButton);
                return;
            }
            
            // Check if it is within the allowed range
            if (amount < 1 || amount > 5) {
                showSimpleAlert('Range error', 'Please enter an amount between 1 and 5');
                resetBuyButton(buyButton);
                return;
            }
            
            // Create payment information object
            const paymentInfo = {
                itemId: 'pwfood',
                itemType: 'food',
                itemName: 'Pet food',
                price: amount.toString(), // Use the user input amount
                basePrice: "1", // The base price is 1 USD
                itemQuantity: 1, // Set to 1 to avoid multiplying by quantity
                foodQuantity: (3000 * amount).toString(), // 3000 pet food per USD
                itemImage: '../../resources/images/items/pwfood.png',
                description: `Purchase ${amount} USD, get ${3000 * amount} pet food`
            };
            
            // Open payment confirmation page
            openPaymentConfirmation(paymentInfo, async () => {
                // When the user confirms the payment, execute
                debug.log('User confirmed payment, starting to purchase food');
                
                try {
                    // Get the payment token
                    let payToken = null;
                    
                    // First try using the initialized USDT contract
                    if (tokenContracts.USDT && tokenContracts.USDT._address) {
                        debug.log("Using the initialized USDT token");
                        payToken = tokenContracts.USDT._address;
                    } 
                    // Then try to get from supportedTokens
                    else if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                        // Find the default token or the first token
                        const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault) || window.SUPPORTED_PAYMENT_TOKENS[0];
                        debug.log("Get token from SUPPORTED_PAYMENT_TOKENS:", defaultToken);
                        
                        if (defaultToken && defaultToken.contractAddress) {
                            payToken = defaultToken.contractAddress;
                            
                            // If the contract of this token has not been initialized, initialize it first
                            if (!tokenContracts[defaultToken.id] && typeof window.initERC20Contract === 'function') {
                                debug.log(`Initialize ${defaultToken.name} contract...`);
                                try {
                                    tokenContracts[defaultToken.id] = window.initERC20Contract(web3, defaultToken.contractAddress);
                                    debug.log(`${defaultToken.name} contract initialized successfully`);
                                } catch (err) {
                                    debug.error(`Failed to initialize ${defaultToken.name} contract:`, err);
                                }
                            }
                        }
                    }
                    // Finally use the fixed USDT address as a backup option
                    else {
                        debug.log("Using the fixed USDT address as a backup option");
                        payToken = '0x55d398326f99059ff775485246999027b3197955'; // Default USDT address
                        
                        // Ensure the USDT ERC20 contract is initialized
                        if (!tokenContracts.USDT && typeof window.initERC20Contract === 'function') {
                            tokenContracts.USDT = window.initERC20Contract(web3, payToken);
                        }
                    }
                    
                    if (!payToken) {
                        throw new Error('Payment token not initialized');
                    }
                    
                    debug.log("Using the payment token address:", payToken);
                    
                    // Convert the amount to wei units ($ amount * 10^18)
                    const dollarAmount = web3.utils.toWei(amount.toString(), 'ether');
                    
                    // Find or create the token contract instance
                    let tokenContract = null;
                    const tokenId = Object.keys(tokenContracts).find(key => 
                        tokenContracts[key] && tokenContracts[key]._address && 
                        tokenContracts[key]._address.toLowerCase() === payToken.toLowerCase()
                    );
                    
                    if (tokenId && tokenContracts[tokenId]) {
                        debug.log(`Using the initialized ${tokenId} contract instance`);
                        tokenContract = tokenContracts[tokenId];
                    } else if (typeof window.initERC20Contract === 'function') {
                        debug.log("Creating a new ERC20 contract instance");
                        tokenContract = window.initERC20Contract(web3, payToken);
                    } else if (window.GENERIC_ERC20_ABI) {
                        debug.log("Creating a new ERC20 contract instance using the generic ABI");
                        tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, payToken);
                    }
                    
                    if (!tokenContract) {
                        throw new Error('Failed to create the token contract instance');
                    }
                    
                    // Check token authorization
                    debug.log('Checking token authorization...');
                    const approved = await checkAndApproveToken(tokenContract, pwFoodManagerContract._address, dollarAmount);
                    if (!approved) {
                        throw new Error('Token authorization failed');
                    }
                    
                    // Check the authorization of PaymentManager
                    debug.log('Checking the authorization of PaymentManager...');
                    let paymentManagerAddress;
                    
                    // Determine the PaymentManager address
                    if (paymentManagerContract && paymentManagerContract._address) {
                        paymentManagerAddress = paymentManagerContract._address;
                        debug.log('Using paymentManagerContract to get the address:', paymentManagerAddress);
                    } else {
                        debug.error('PaymentManager contract not initialized or address not available');
                        throw new Error('Failed to get the PaymentManager address');
                    }
                    
                    const paymentApproved = await checkAndApproveToken(tokenContract, paymentManagerAddress, dollarAmount);
                    if (!paymentApproved) {
                        throw new Error('PaymentManager authorization failed');
                    }
                    
                    // Call the contract to purchase food - use the available method
                    debug.log('Token authorized, starting to purchase food, token address:', payToken, 'amount:', dollarAmount);
                    let result;
                    
                    // Try to purchase food using the PaymentManager contract
                    try {
                        debug.log('Using paymentManagerContract to purchase food');
                        if (paymentManagerContract.methods.payForPWFood) {
                            result = await paymentManagerContract.methods
                                .payForPWFood(payToken, dollarAmount, currentAddress)
                                .send({ from: currentAddress });
                            debug.log('Successfully purchased food using PaymentManager');
                        } else {
                            // Fallback to PwFoodManager contract
                            debug.log('PaymentManager contract does not have payForPWFood method, using pwFoodManagerContract');
                            result = await pwFoodManagerContract.methods
                                .buyPwFood(payToken, dollarAmount)
                                .send({ from: currentAddress });
                            debug.log('Successfully purchased food using PwFoodManager');
                        }
                    } catch (error) {
                        debug.error('Failed to purchase food using PaymentManager, trying to use pwFoodManagerContract:', error);
                        // Finally try to use pwFoodManagerContract directly
                        result = await pwFoodManagerContract.methods
                            .buyPwFood(payToken, dollarAmount)
                            .send({ from: currentAddress });
                        debug.log('Successfully purchased food using PwFoodManager directly');
                    }
                    
                    debug.log('Purchase food transaction successful:', result);
                    showStatusMessage(`purchaseFoodSuccess`, 'success', { quantity: 3000 * amount });
                } catch (error) {
                    debug.error('Failed to purchase food:', error);
                    showStatusMessage(`purchaseFailed`, 'error', { message: getErrorMessage(error) });
                } finally {
                    // Reset the button status
                    resetBuyButton(buyButton);
                }
            });
        } catch (error) {
            debug.error('Failed to purchase food:', error);
            showStatusMessage(`purchaseFailed`, 'error', { message: getErrorMessage(error) });
            resetBuyButton(buyButton);
        }
    }

    /**
     * Open the payment confirmation page
     * @param {Object} paymentInfo - Payment information object
     * @param {Function} confirmCallback - Confirm payment callback function
     */
    function openPaymentConfirmation(paymentInfo, confirmCallback) {
        debug.log('Open the payment confirmation page:', paymentInfo);
        
        // Check if there is already a payment iframe
        const paymentFrame = document.getElementById('paymentFrame');
        if (paymentFrame) {
            // If it exists, remove it first
            paymentFrame.remove();
        }
        
        // Create the payment iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'paymentFrame';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1000';
        iframe.src = '../../webPages/other/payment.html';
        
        // Add to the page
        document.body.appendChild(iframe);
        
        // Save the callback function to respond to payment messages
        window.confirmPaymentCallback = confirmCallback;
        
        // Save the payment information object
        window.currentPaymentInfo = paymentInfo;
        
        // Set the message listener
        window.addEventListener('message', handlePaymentMessage);
        
        // Add the batch purchase information
        if (paymentInfo.batchCount && paymentInfo.batchCount > 1) {
            paymentInfo.isBatch = true;
            paymentInfo.batchCount = paymentInfo.batchCount;
        }
        
        // Add the iframe loaded event handler
        iframe.onload = function() {
            debug.log('Payment iframe loaded, sending payment information');
            
            // Delay a little time to ensure the scripts in the iframe are initialized
            setTimeout(() => {
                if (iframe.contentWindow) {
                    // Send the payment information
                    iframe.contentWindow.postMessage({
                        type: 'paymentInfo',
                        data: paymentInfo
                    }, '*');
                    
                    // Send the wallet information
                    iframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: !!currentAddress,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // Send the Web3 information
                    iframe.contentWindow.postMessage({
                        type: 'web3Ready',
                        data: { web3: true }
                    }, '*');
                    
                    debug.log('Sent the initial data to the payment iframe');
                } else {
                    debug.error('Unable to access the contentWindow of the payment iframe');
                }
            }, 200);
        };
    }

    /**
     * Handle messages from the payment page
     * @param {MessageEvent} event - Message event
     */
    function handlePaymentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('Received message from the payment page:', message);
        
        switch (message.type) {
            case 'closePayment':
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentStarted':
                // Payment started
                showStatusMessage('paymentProcessing', 'info');
                break;
                
            case 'paymentConfirmed':
                // Payment confirmed, execute the purchase callback
                if (typeof window.confirmPaymentCallback === 'function') {
                    debug.log('Executing the purchase callback function');
                    
                    try {
                        // Capture and handle the Promise that may occur in the callback
                        const result = window.confirmPaymentCallback();
                        
                        // If the result is a Promise, add processing
                        if (result && typeof result.then === 'function') {
                            result.then(txResult => {
                                // Process the transaction result
                                if (txResult && txResult.transactionHash) {
                                    debug.log('Transaction successful, processing the lottery result');
                                    
                                    // Call processLotteryResult to process the lottery result
                                    try {
                                        processLotteryResult(txResult);
                                    } catch (err) {
                                        debug.error('Error processing the lottery result:', err);
                                    }
                                }
                            }).catch(err => {
                                debug.error('Failed to execute the purchase callback:', err);
                                showStatusMessage('purchaseFailed', 'error', { message: getErrorMessage(err) });
                            });
                        }
                    } catch (error) {
                        debug.error('Error executing the purchase callback:', error);
                        showStatusMessage('purchaseFailed', 'error', { message: getErrorMessage(error) });
                    }
                    
                    // After execution, clear the callback
                    window.confirmPaymentCallback = null;
                }
                break;
                
            case 'paymentCancelled':
                // Payment cancelled
                debug.log('User cancelled payment');
                showStatusMessage('paymentCancelled', 'info');
                
                // Clear the callback
                window.confirmPaymentCallback = null;
                
                // Reset all purchase buttons, ensuring they can be used for the next purchase
                const buyButtons = document.querySelectorAll('.buy-btn');
                buyButtons.forEach(btn => {
                    resetBuyButton(btn);
                });
                
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentResult':
                // Process the payment result
                if (message.data && message.data.success) {
                    debug.log('Payment successful:', message.data);
                    showStatusMessage('paymentSuccess', 'success');
                } else {
                    debug.error('Payment failed:', message.data && message.data.error);
                    showStatusMessage('paymentFailed', 'error', { message: message.data && message.data.error || 'Unknown error' });
                    
                    // Reset all purchase buttons, ensuring they can be used for the next purchase
                    const resultBuyButtons = document.querySelectorAll('.buy-btn');
                    resultBuyButtons.forEach(btn => {
                        resetBuyButton(btn);
                    });
                }
                
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'requestData':
                // Payment page requests data
                const paymentFrame = document.getElementById('paymentFrame');
                if (paymentFrame && paymentFrame.contentWindow) {
                    // Send wallet information
                    paymentFrame.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: !!currentAddress,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // Send the Web3 instance
                    paymentFrame.contentWindow.postMessage({
                        type: 'web3Ready',
                        data: {
                            web3: true
                        }
                    }, '*');
                    
                    // Send the payment information
                    if (window.currentPaymentInfo) {
                        paymentFrame.contentWindow.postMessage({
                            type: 'paymentInfo',
                            data: window.currentPaymentInfo
                        }, '*');
                    }
                }
                break;
        }
    }

    /**
     * Close the payment confirmation iframe
     */
    function closePaymentFrame() {
        const paymentFrame = document.getElementById('paymentFrame');
        if (paymentFrame) {
            paymentFrame.remove();
        }
        
        // Remove the message listener
        window.removeEventListener('message', handlePaymentMessage);
        
        // Ensure all buttons are reset
        const allButtons = document.querySelectorAll('.buy-btn');
        allButtons.forEach(btn => {
            resetBuyButton(btn);
        });
    }
    

    /**
     * Check and approve token transfer
     * @param {object} tokenContract - Token contract instance
     * @param {string} spender - Spender address
     * @param {string} amount - Amount to approve
     * @returns {Promise<boolean>} - Whether approval was successful
     */
    function checkAndApproveToken(tokenContract, spender, amount) {
        debug.log('Checking token authorization:', { spender, amount });
        
        return new Promise(async (resolve, reject) => {
            if (!tokenContract || !currentAddress) {
                reject(new Error('Token contract not initialized or wallet not connected'));
                return;
            }
            
            try {
                // Use ContractApprovalManager first
                if (window.ContractApprovalManager) {
                    if (typeof window.ContractApprovalManager.checkIfApprovalNeeded === 'function') {
                        // Use the new check approval need function
                        const checkResult = await window.ContractApprovalManager.checkIfApprovalNeeded(
                            tokenContract, 
                            currentAddress, 
                            spender, 
                            amount
                        );
                        
                        debug.log('Authorization check result:', checkResult);
                        
                        if (!checkResult.needsApproval) {
                            debug.log('No authorization needed');
                            resolve(true);
                            return;
                        }
                        
                        if (!checkResult.sufficientFunds) {
                            debug.error('Insufficient balance:', checkResult);
                            reject(new Error('Insufficient token balance'));
                            return;
                        }
                    }
                    
                    if (typeof window.ContractApprovalManager.approveERC20Token === 'function') {
                        // Use the new authorization function
                        debug.log('Using ContractApprovalManager.approveERC20Token for authorization');
                        const approveResult = await window.ContractApprovalManager.approveERC20Token(
                            tokenContract,
                            spender,
                            amount,
                            currentAddress,
                            true // Use the maximum value
                        );
                        
                        if (approveResult.success) {
                            debug.log('Authorization successful:', approveResult);
                            resolve(true);
                        } else {
                            debug.error('Authorization failed:', approveResult);
                            reject(new Error(approveResult.error || 'Authorization failed'));
                        }
                        return;
                    }
                }
                
                // Fallback to the original implementation
                debug.log('Using traditional method to check authorization');
                
                // Check existing authorization
                const allowance = await tokenContract.methods
                    .allowance(currentAddress, spender)
                    .call();
                
                debug.log('Current authorization amount:', allowance);
                
                if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
                    debug.log('Already enough authorization');
                    resolve(true);
                    return;
                }
                
                debug.log('Need to approve token transfer');
                
                // Need to approve more tokens
                const receipt = await tokenContract.methods
                    .approve(spender, amount)
                    .send({ from: currentAddress });
                
                debug.log('Token approval successful:', receipt);
                resolve(true);
            } catch (error) {
                debug.error('Token approval failed:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Claim free NFT
     * @param {HTMLElement} button - Claim button
     */
    async function claimFreeNFT(button) {
        debug.log('Claim the free NFT');
        
        if (!button) {
            button = document.getElementById('free-nft-btn');
            if (!button) {
                debug.error('Cannot find the free NFT button');
                return;
            }
        }
        
        // Set the button to loading state
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> ' + i18n.t('claimingNFT');
        
        try {
            // Check if the user has already claimed the free NFT
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            if (hasClaimedFreeNFT) {
                debug.warn('The user has already claimed the free NFT');
                showStatusMessage('alreadyClaimedNFT', 'warning');
                
                // Update the button status
                button.textContent = i18n.t('shop.alreadyClaimed');
                button.classList.add('disabled');
                
                // Update the status display
                checkFreeNFTClaimStatus();
                return;
            }
            
            // Get the inviter address (if any)
            let inviterAddress = '0x0000000000000000000000000000000000000000';  // Default no inviter
            
            // First try to get the inviter address from the input field
            const inviterInput = document.getElementById('inviter-address');
            if (inviterInput && inviterInput.value.trim()) {
                const inputAddress = inviterInput.value.trim();
                if (web3.utils.isAddress(inputAddress)) {
                    inviterAddress = inputAddress;
                    debug.log('Get the inviter address from the input field:', inviterAddress);
                } else {
                    debug.warn('The inviter address format is invalid:', inputAddress);
                    showStatusMessage('invalidInviterAddress', 'warning');
                }
            } else {
                // If the input field is empty, try to get it from the URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('inviter')) {
                    const urlInviter = urlParams.get('inviter');
                    if (web3.utils.isAddress(urlInviter)) {
                        inviterAddress = urlInviter;
                        debug.log('Get the inviter address from the URL:', inviterAddress);
                    }
                }
            }
            
            debug.log('Call the contract to claim the free NFT, inviter address:', inviterAddress);
            
            // Before claiming the free NFT, ensure all necessary contracts are authorized
            try {
                showStatusMessage('checkingApprovals', 'info');
                
                // Use the authorization method of ContractApprovalManager
                if (window.ContractApprovalManager && window.ContractApprovalManager.ensureFreeNFTApprovals) {
                    const approvalsSuccess = await window.ContractApprovalManager.ensureFreeNFTApprovals(
                        web3, 
                        currentAddress
                    );
                    
                    if (!approvalsSuccess) {
                        throw new Error('Failed to set necessary approvals');
                    }
                    
                    debug.log('NFT necessary approvals completed');
                } else {
                    // Use the old authorization function as a fallback
                    debug.log('Try to use the old ensureFreeNFTApprovals function...');
                    if (typeof window.ensureFreeNFTApprovals === 'function') {
                        const approvalsSuccess = await window.ensureFreeNFTApprovals(web3, currentAddress);
                        if (!approvalsSuccess) {
                            throw new Error('Failed to set necessary approvals');
                        }
                    } else {
                        throw new Error('The authorization check function is not available, please ensure the correct contract initialization script is loaded');
                    }
                }
            } catch (error) {
                debug.error('Error during authorization:', error);
                if (error.message.includes('User denied transaction signature')) {
                    showStatusMessage('userCancelledAuth', 'warning');
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                } else {
                    showStatusMessage('authorizationFailed', 'error', { message: getErrorMessage(error) });
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                }
            }
            
            // Execute the claim transaction
            const result = await nftLotteryManagerContract.methods.claimFreeNFT(inviterAddress).send({
                from: currentAddress
            });
            
            debug.log('Free NFT claim successful:', result);
            showStatusMessage('claimNFTSuccess', 'success');
            
            // Update the button status
            checkFreeNFTClaimStatus();
            
        } catch (error) {
            debug.error('Free NFT claim failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // Restore the button status
            button.disabled = false;
            button.textContent = originalText;
        } finally {
            resetBuyButton(button);
        }
    }
    
    /**
     * Check if the user has already claimed the free NFT
     */
    async function checkFreeNFTClaimStatus() {
        try {
            debug.log('Checking the free NFT claim status');
            
            if (!nftLotteryManagerContract || !currentAddress) {
                debug.warn('The contract is not initialized or the wallet is not connected, cannot check the free NFT status');
                return;
            }
            
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            const freeNftButton = document.getElementById('free-nft-btn');
            const freeNftItem = document.getElementById('product-free-nft');
            
            if (freeNftButton && freeNftItem) {
                if (hasClaimedFreeNFT) {
                    debug.log('The user has already claimed the free NFT, update the UI display');
                    
                    // Disable the button
                    freeNftButton.disabled = true;
                    freeNftButton.classList.add('disabled');
                    freeNftButton.textContent = i18n.t('shop.alreadyClaimed');
                    
                    // Add the already claimed style
                    freeNftItem.classList.add('already-claimed');
                    
                    // Add the already claimed badge
                    if (!freeNftItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = i18n.t('shop.claimed');
                        freeNftItem.appendChild(claimedBadge);
                    }
                } else {
                    debug.log('The user has not claimed the free NFT, the button is clickable');
                    
                    // Enable the button
                    freeNftButton.disabled = false;
                    freeNftButton.classList.remove('disabled');
                    freeNftButton.textContent = i18n.t('shop.claim');
                    
                    // Remove the already claimed style
                    freeNftItem.classList.remove('already-claimed');
                    
                    // Remove the claimed badge
                    const claimedBadge = freeNftItem.querySelector('.claimed-badge');
                    if (claimedBadge) {
                        freeNftItem.removeChild(claimedBadge);
                    }
                }
            } else {
                debug.warn('Cannot find the free NFT button or product element');
            }
        } catch (error) {
            debug.error('Error checking the free NFT claim status:', error);
        }
    }

    /**
     * Check if the user can claim the free PwFood
     */
    async function checkFreePwFoodClaimStatus() {
        try {
            debug.log('Checking the free PwFood claim status');
            
            if (!pwFoodManagerContract || !currentAddress) {
                debug.warn('PwFoodManager contract is not initialized or the wallet is not connected, cannot check the free PwFood status');
                return;
            }
            
            // Get the daily reward amount of free PwFood
            const dayRewardElem = document.getElementById('pwfood-day-reward');
            try {
                // If there is a class instance, use the class method to get
                if (typeof window.PwFoodManagerContract === 'function') {
                    const pwFoodManager = new window.PwFoodManagerContract(web3);
                    const reward = await pwFoodManager.getPwFoodDayReward();
                    if (dayRewardElem) dayRewardElem.textContent = reward;
                } else {
                    // Try to get directly from the contract
                    const reward = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
                    if (dayRewardElem) dayRewardElem.textContent = reward;
                }
            } catch (error) {
                debug.error('Failed to get the daily reward amount:', error);
                if (dayRewardElem) dayRewardElem.textContent = '10';
            }
            
            // Get the last claim time
            let lastClaimTime = 0;
            const nextClaimTimeElem = document.getElementById('next-claim-time');
            
            try {
                lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
                lastClaimTime = parseInt(lastClaimTime);
                
                // Calculate the start time of the current UTC day
                const currentTime = Math.floor(Date.now() / 1000);
                const utcDayStart = Math.floor(currentTime / 86400) * 86400;
                const nextDayStart = utcDayStart + 86400; // The start time of the next UTC day
                
                if (lastClaimTime >= utcDayStart) {
                    // Already claimed today, the next claim time is tomorrow UTC 00:00
                    const nextClaimDate = new Date(nextDayStart * 1000);
                    
                    // Calculate the remaining time until the next claim
                    const remainingSeconds = nextDayStart - currentTime;
                    const remainingHours = Math.floor(remainingSeconds / 3600);
                    const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                    
                    const formattedNextTime = nextClaimDate.toLocaleDateString() + ' ' + nextClaimDate.toLocaleTimeString();
                    const remainingTimeText = `${remainingHours} hours ${remainingMinutes} minutes later`;
                    
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.innerHTML = `${formattedNextTime}<br>(${remainingTimeText})`;
                        nextClaimTimeElem.classList.remove('available-now');
                    }
                } else if (lastClaimTime > 0) {
                    // Today has not claimed but claimed before, can claim immediately
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.textContent = i18n.t('shop.nowCanClaim');
                        nextClaimTimeElem.classList.add('available-now');
                    }
                } else {
                    // Never claimed before, can claim immediately
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.textContent = i18n.t('shop.nowCanClaim');
                        nextClaimTimeElem.classList.add('available-now');
                    }
                }
            } catch (error) {
                debug.error('Failed to get the last claim time:', error);
                if (nextClaimTimeElem) nextClaimTimeElem.textContent = i18n.t('shop.failedToGet');
            }
            
            // Check if the user has already claimed the free NFT (the prerequisite for claiming PwFood)
            let hasClaimedFreeNFT = false;
            try {
                hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            } catch (error) {
                debug.error('Failed to check the free NFT claim status:', error);
            }
            
            // Calculate the start time of the current UTC day
            const currentTime = Math.floor(Date.now() / 1000);
            const utcDayStart = Math.floor(currentTime / 86400) * 86400;
            
            // Check if today has claimed
            const todayClaimed = lastClaimTime >= utcDayStart;
            
            const freePwFoodButton = document.getElementById('free-pwfood-btn');
            const freePwFoodItem = document.getElementById('product-free-pwfood');
            
            if (freePwFoodButton && freePwFoodItem) {
                // 1. If the user has not claimed the free NFT, display "Need to claim the free pet"
                if (!hasClaimedFreeNFT) {
                    debug.log('The user has not claimed the free NFT, cannot claim the free PwFood');
                    
                    freePwFoodButton.disabled = true;
                    freePwFoodButton.classList.add('disabled');
                    freePwFoodButton.textContent = i18n.t('shop.notification.requiredNFTFirst');
                    
                    // Add the prompt style, but do not add the already claimed style
                    freePwFoodItem.classList.add('nft-required');
                    
                    // Add the prompt label
                    if (!freePwFoodItem.querySelector('.claimed-badge')) {
                        const nftRequiredBadge = document.createElement('div');
                        nftRequiredBadge.className = 'claimed-badge';
                        nftRequiredBadge.textContent = i18n.t('shop.notification.requiredNFTFirst');
                        freePwFoodItem.appendChild(nftRequiredBadge);
                    }
                }
                // 2. If today has claimed, display "Today has claimed"
                else if (todayClaimed) {
                    debug.log('The user has claimed today, cannot claim the free PwFood');
                    
                    freePwFoodButton.disabled = true;
                    freePwFoodButton.classList.add('disabled');
                    freePwFoodButton.textContent = i18n.t('shop.todayClaimed');
                    
                    // Add the already claimed style
                    freePwFoodItem.classList.add('already-claimed');
                    
                    // Add the already claimed badge
                    if (!freePwFoodItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = i18n.t('shop.todayClaimed');
                        freePwFoodItem.appendChild(claimedBadge);
                    }
                }
                // 3. Otherwise, can claim
                else {
                    debug.log('The user can claim the free PwFood');
                    
                    freePwFoodButton.disabled = false;
                    freePwFoodButton.classList.remove('disabled');
                    freePwFoodButton.textContent = i18n.t('shop.claim');
                    
                    // Remove the already claimed style
                    freePwFoodItem.classList.remove('already-claimed');
                    freePwFoodItem.classList.remove('nft-required');
                    
                    // Remove the prompt label
                    const badge = freePwFoodItem.querySelector('.claimed-badge');
                    if (badge) {
                        freePwFoodItem.removeChild(badge);
                    }
                }
            } else {
                debug.warn('Cannot find the free PwFood button or product element');
            }
        } catch (error) {
            debug.error('Failed to check the free PwFood claim status:', error);
        }
    }

    /**
     * Claim the free NFT
     * @param {HTMLElement} button - The claim button
     */
    async function claimFreeNFT(button) {
        debug.log('Claim the free NFT');
        
        if (!button) {
            button = document.getElementById('free-nft-btn');
            if (!button) {
                debug.error('Cannot find the free NFT button');
                return;
            }
        }
        
        // Set the button to loading state
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> ' + i18n.t('claimingNFT');
        
        try {
            // Check if the user has already claimed the free NFT
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            if (hasClaimedFreeNFT) {
                debug.warn('The user has already claimed the free NFT');
                showStatusMessage('alreadyClaimedNFT', 'warning');
                
                // Update the button status
                button.textContent = i18n.t('shop.alreadyClaimed');
                button.classList.add('disabled');
                
                // Update the status display
                checkFreeNFTClaimStatus();
                return;
            }
            
            // Get the inviter address (if any)
            let inviterAddress = '0x0000000000000000000000000000000000000000';  // Default no inviter
            
            // First try to get the inviter address from the input field
            const inviterInput = document.getElementById('inviter-address');
            if (inviterInput && inviterInput.value.trim()) {
                const inputAddress = inviterInput.value.trim();
                if (web3.utils.isAddress(inputAddress)) {
                    inviterAddress = inputAddress;
                    debug.log('Get the inviter address from the input field:', inviterAddress);
                } else {
                    debug.warn('The inviter address format is invalid:', inputAddress);
                    showStatusMessage('invalidInviterAddress', 'warning');
                }
            } else {
                // If the input field is empty, try to get it from the URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('inviter')) {
                    const urlInviter = urlParams.get('inviter');
                    if (web3.utils.isAddress(urlInviter)) {
                        inviterAddress = urlInviter;
                        debug.log('Get the inviter address from the URL:', inviterAddress);
                    }
                }
            }
            
            debug.log('Call the contract to claim the free NFT, inviter address:', inviterAddress);
            
            // Before claiming the free NFT, ensure all necessary contracts are authorized
            try {
                showStatusMessage('checkingApprovals', 'info');
                
                // Use the authorization method of ContractApprovalManager
                if (window.ContractApprovalManager && window.ContractApprovalManager.ensureFreeNFTApprovals) {
                    const approvalsSuccess = await window.ContractApprovalManager.ensureFreeNFTApprovals(
                        web3, 
                        currentAddress
                    );
                    
                    if (!approvalsSuccess) {
                        throw new Error('Failed to set necessary approvals');
                    }
                    
                    debug.log('NFT necessary approvals completed');
                } else {
                    // Use the old authorization function as a fallback
                    debug.log('Try to use the old ensureFreeNFTApprovals function...');
                    if (typeof window.ensureFreeNFTApprovals === 'function') {
                        const approvalsSuccess = await window.ensureFreeNFTApprovals(web3, currentAddress);
                        if (!approvalsSuccess) {
                            throw new Error('Failed to set necessary approvals');
                        }
                    } else {
                        throw new Error('The authorization check function is not available, please ensure the correct contract initialization script is loaded');
                    }
                }
            } catch (error) {
                debug.error('Error during authorization:', error);
                if (error.message.includes('User denied transaction signature')) {
                    showStatusMessage('userCancelledAuth', 'warning');
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                } else {
                    showStatusMessage('authorizationFailed', 'error', { message: getErrorMessage(error) });
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                }
            }
            
            // Execute the claim transaction
            const result = await nftLotteryManagerContract.methods.claimFreeNFT(inviterAddress).send({
                from: currentAddress
            });
            
            debug.log('Free NFT claim successful:', result);
            showStatusMessage('claimNFTSuccess', 'success');
            
            // Update the button status
            checkFreeNFTClaimStatus();
            
        } catch (error) {
            debug.error('Free NFT claim failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // Restore the button status
            button.disabled = false;
            button.textContent = originalText;
        } finally {
            resetBuyButton(button);
        }
    }
    
    /**
     * Claim the free PwFood
     * @param {HTMLElement} button - The claim button
     */
    async function claimFreePwFood(button) {
        debug.log('Claim the free PwFood');
        
        if (!button) {
            button = document.getElementById('free-pwfood-btn');
            if (!button) {
                debug.error('Cannot find the free PwFood button');
                return;
            }
        }
        
        // Set the button to loading state
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> ' + i18n.t('claimingFood');
        
        try {
            // Check if the user has already claimed the free NFT (the prerequisite for claiming PwFood)
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            if (!hasClaimedFreeNFT) {
                debug.warn('The user has not claimed the free NFT, cannot claim the free PwFood');
                showStatusMessage('requiredNFTFirst', 'warning');
                
                // Update the button status
                button.textContent = i18n.t('shop.needClaimFreePet');
                button.classList.add('disabled');
                
                // Update the status display
                checkFreePwFoodClaimStatus();
                return;
            }
            
            // Check if today has claimed
            const lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
            const currentTime = Math.floor(Date.now() / 1000);
            const utcDayStart = Math.floor(currentTime / 86400) * 86400;
            
            if (parseInt(lastClaimTime) >= utcDayStart) {
                debug.warn('The user has already claimed the free PwFood today');
                showStatusMessage('alreadyClaimedFood', 'warning');
                
                // Update the button status
                button.textContent = i18n.t('shop.todayClaimed');
                button.classList.add('disabled');
                
                // Update the status display
                checkFreePwFoodClaimStatus();
                return;
            }
            
            debug.log('Call the contract to claim the free PwFood');
            showStatusMessage('claimingFood', 'info');
            
            // Execute the claim transaction
            let result;
            
            // First try to use the class instance method
            if (typeof window.PwFoodManagerContract === 'function') {
                debug.log('Use the class instance to claim the free PwFood');
                try {
                    const pwFoodManager = new window.PwFoodManagerContract(web3);
                    result = await pwFoodManager.claimFreePwFood({ from: currentAddress });
                } catch (error) {
                    debug.error('Use the class instance to claim the free PwFood failed, try to use the contract method:', error);
                    result = await pwFoodManagerContract.methods.claimFreePwFood().send({
                        from: currentAddress
                    });
                }
            } else {
                // Use the contract method directly
                result = await pwFoodManagerContract.methods.claimFreePwFood().send({
                    from: currentAddress
                });
            }
            
            debug.log('Free PwFood claim successful:', result);
            
            // Get the daily reward amount for display in the success message
            let rewardAmount = "10"; // Default value
            try {
                rewardAmount = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
            } catch (error) {
                debug.error('Failed to get the daily reward amount:', error);
            }
            
            showStatusMessage('claimFoodSuccess', 'success', { count: rewardAmount });
            
            // Update the button status and the last claim time
            checkFreePwFoodClaimStatus();
            
        } catch (error) {
            debug.error('Claim the free PwFood failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // Restore the button status
            button.disabled = false;
            button.textContent = originalText;
        } finally {
            resetBuyButton(button);
        }
    }

    /**
     * Send data to the lottery result iframe
     * @param {Object} lotteryData - The lottery result data
     */
    function sendLotteryResultToIframe(lotteryData) {
        debug.log('Send the lottery result data to the iframe:', lotteryData);
        
        try {
            // Save to localStorage as a backup
            localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryData));
            
            // Find the iframe
            const frame = document.getElementById('lottery-result-frame');
            if (!frame) {
                debug.error('Cannot find the lottery result iframe');
                return;
            }
            
            // First get the pet details, then send to the iframe
            if (lotteryData.tokenId) {
                // Get the pet details and enhance the result data
                fetchPetDetailsForLottery(lotteryData.tokenId)
                    .then(petData => {
                        // Merge the pet details into the result data
                        if (petData) {
                            if (petData.name) lotteryData.petName = petData.name;
                            if (petData.type) lotteryData.petType = petData.type;
                            if (petData.imageUrl) lotteryData.imageUrl = petData.imageUrl;
                            if (petData.quality) lotteryData.qualityDisplay = petData.quality;
                        }
                        
                        // Update the localStorage backup
                        localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryData));
                        
                        // Check if the iframe is loaded
                        if (frame.contentWindow) {
                            // Send the enhanced data to the iframe
                            frame.contentWindow.postMessage({
                                type: 'lotteryResult',
                                data: lotteryData
                            }, '*');
                            debug.log('Send the lottery result data (includes pet details) to the iframe');
                        }
                    })
                    .catch(error => {
                        debug.error('Failed to get the pet details:', error);
                        // Even if getting the details fails, send the original data
                        sendMessageToFrame(lotteryData);
                    });
            } else {
                // No tokenId, send the original data
                sendMessageToFrame(lotteryData);
            }
        } catch (error) {
            debug.error('Failed to send the lottery result data to the iframe:', error);
        }
        
        // Helper function: send message to the iframe
        function sendMessageToFrame(data) {
            const frame = document.getElementById('lottery-result-frame');
            if (!frame || !frame.contentWindow) {
                debug.error('Cannot access the iframe window object');
                return;
            }
            
            frame.contentWindow.postMessage({
                type: 'lotteryResult',
                data: data
            }, '*');
            debug.log('Send the lottery result data to the iframe');
        }
    }
    
    /**
     * Show a simple alert dialog
     * @param {string} title - The dialog title
     * @param {string} message - The dialog message
     */
    function showSimpleAlert(title, message) {
        ModalDialog.alert(message, {
            title: title,
            confirmText: i18n.t('button.confirm')
        });
    }

    // Get the batch lottery input boxes
    const commonEggAmountInput = document.getElementById('common-egg-amount');
    const rareEggAmountInput = document.getElementById('rare-egg-amount');
    const legendaryEggAmountInput = document.getElementById('legendary-egg-amount');
    
    // If the input box exists, add the event listener to update the total price
    if (commonEggAmountInput) {
        commonEggAmountInput.addEventListener('input', updateEggTotalPrice);
        updateEggTotalPrice({ target: commonEggAmountInput }); // Initialize the total price
    }
    
    if (rareEggAmountInput) {
        rareEggAmountInput.addEventListener('input', updateEggTotalPrice);
        updateEggTotalPrice({ target: rareEggAmountInput }); // Initialize the total price
    }
    
    if (legendaryEggAmountInput) {
        legendaryEggAmountInput.addEventListener('input', updateEggTotalPrice);
        updateEggTotalPrice({ target: legendaryEggAmountInput }); // Initialize the total price
    }
    
    /**
     * Update the total price of the egg
     * @param {Event} event - The input event
     */
    function updateEggTotalPrice(event) {
        const input = event.target;
        const shopItem = input.closest('.shop-item');
        if (!shopItem) return;
        
        // Get the unit price element
        const priceElement = shopItem.querySelector('.item-price');
        if (!priceElement) return;
        
        // Get the total price element
        const totalPriceElement = shopItem.querySelector('.batch-total-price');
        if (!totalPriceElement) return;
        
        // Parse the unit price
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/\$(\d+(\.\d+)?)/);
        if (!priceMatch) return;
        
        const unitPrice = parseFloat(priceMatch[1]);
        
        // Get the quantity (ensure it is between 1-5)
        let quantity = parseInt(input.value) || 1;
        if (quantity < 1) {
            quantity = 1;
            input.value = 1;
        } else if (quantity > 5) {
            quantity = 5;
            input.value = 5;
        }
        
        // Calculate the total price and update
        const totalPrice = (unitPrice * quantity).toFixed(2);
        totalPriceElement.textContent = `$${totalPrice}`;
    }

    /**
     * Create the lottery result iframe
     * Used to display the lottery result page
     */
    function createLotteryResultFrame() {
        debug.log('Create the lottery result iframe');
        
        // Remove any existing iframe and overlay, ensuring a clean state
        const existingFrame = document.getElementById('lottery-result-frame');
        const existingOverlay = document.getElementById('lottery-result-overlay');
        
        if (existingFrame) existingFrame.remove();
        if (existingOverlay) existingOverlay.remove();
        
        // Create a new overlay
        const overlay = document.createElement('div');
        overlay.id = 'lottery-result-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        
        document.body.appendChild(overlay);
        
        // Create a new iframe
        const resultFrame = document.createElement('iframe');
        resultFrame.id = 'lottery-result-frame';
        resultFrame.style.width = '90%';
        resultFrame.style.maxWidth = '450px';
        resultFrame.style.height = '600px';
        resultFrame.style.border = 'none';
        resultFrame.style.borderRadius = '12px';
        resultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        resultFrame.src = '../../webPages/other/lotteryResult.html';
        
        // Add to the overlay
        overlay.appendChild(resultFrame);
        
        // Initialize the message listener
        initLotteryResultMessageListener();
        
        // Return the created iframe element
        return resultFrame;
    }

    /**
     * Initialize the message listener of the lottery result iframe
     */
    function initLotteryResultMessageListener() {
        // Clear the old listener
        if (window.lotteryResultMessageHandler) {
            window.removeEventListener('message', window.lotteryResultMessageHandler);
        }
        
        // Create a new event handler
        const messageHandler = function(event) {
            if (event.data && event.data.type) {
                debug.log('Received iframe message:', event.data);
                
                if (event.data.type === 'lotteryResultClosed') {
                    // Received the close message, hide the overlay
                    const overlay = document.getElementById('lottery-result-overlay');
                    if (overlay) {
                        overlay.style.display = 'none';
                        // Optional: Remove from the DOM
                        overlay.remove();
                    }
                } else if (event.data.type === 'iframeReady') {
                    // iframe is ready, ready to send data
                    debug.log('The lottery result iframe is ready, ready to send data');
                    
                    // Find the saved lottery result data
                    const savedResult = localStorage.getItem('lastLotteryResult');
                    if (savedResult) {
                        try {
                            const resultData = JSON.parse(savedResult);
                            debug.log('Found the saved lottery result, send to the iframe:', resultData);
                            
                            const frame = document.getElementById('lottery-result-frame');
                            if (frame && frame.contentWindow) {
                                setTimeout(() => {
                                    frame.contentWindow.postMessage({
                                        type: 'lotteryResult',
                                        data: resultData
                                    }, '*');
                                }, 500);
                            }
                        } catch (e) {
                            debug.error('Failed to parse the saved lottery result:', e);
                        }
                    }
                } else if (event.data.type === 'requestPetDetails' && event.data.tokenId) {
                    // iframe requests pet details
                    fetchPetDetailsForLottery(event.data.tokenId)
                        .then(petData => {
                            const frame = document.getElementById('lottery-result-frame');
                            if (frame && frame.contentWindow) {
                                frame.contentWindow.postMessage({
                                    type: 'petDetails',
                                    tokenId: event.data.tokenId,
                                    data: petData
                                }, '*');
                            }
                        })
                        .catch(error => {
                            debug.error('Failed to get the pet details:', error);
                        });
                }
            }
        };
        
        // Add the event listener
        window.addEventListener('message', messageHandler);
        window.lotteryResultMessageHandler = messageHandler;
    }

    /**
     * Initialize the batch purchase quantity input box
     */
    function initBatchPurchaseInputs() {
        debug.log('Initialize the batch purchase quantity input box');
        
        // Get the batch lottery input boxes
        const commonEggAmountInput = document.getElementById('common-egg-amount');
        const rareEggAmountInput = document.getElementById('rare-egg-amount');
        const legendaryEggAmountInput = document.getElementById('legendary-egg-amount');
        
        // Initialize the common egg quantity input box
        if (commonEggAmountInput) {
            commonEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // Set the initial value
            commonEggAmountInput.value = 1;
            updateEggTotalPrice({ target: commonEggAmountInput });
        }
        
        // Initialize the rare egg quantity input box
        if (rareEggAmountInput) {
            rareEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // Set the initial value
            rareEggAmountInput.value = 1;
            updateEggTotalPrice({ target: rareEggAmountInput });
        }
        
        // Initialize the legendary egg quantity input box
        if (legendaryEggAmountInput) {
            legendaryEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // Set the initial value
            legendaryEggAmountInput.value = 1;
            updateEggTotalPrice({ target: legendaryEggAmountInput });
        }
    }
    
    /**
     * Validate the batch purchase quantity
     * @param {HTMLInputElement} input - The quantity input box element
     */
    function validateBatchAmount(input) {
        let value = parseInt(input.value);
        if (isNaN(value) || value < 1) {
            input.value = 1;
        } else if (value > 5) {  
            input.value = 5;
        }
        updateEggTotalPrice();
    }
    
    /**
     * Update the total price of the egg
     * @param {Event} event - The input event
     */
    function updateEggTotalPrice(event) {
        const input = event.target;
        const shopItem = input.closest('.shop-item');
        if (!shopItem) return;
        
        // Get the unit price element
        const priceElement = shopItem.querySelector('.item-price');
        if (!priceElement) return;
        
        // Get the total price element
        const totalPriceElement = shopItem.querySelector('.batch-total-price');
        if (!totalPriceElement) return;
        
        // Parse the unit price
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/\$(\d+(\.\d+)?)/);
        if (!priceMatch) return;
        
        const unitPrice = parseFloat(priceMatch[1]);
        
        // Get the quantity (ensure it is between 1-10)
        let quantity = parseInt(input.value) || 1;
        if (quantity < 1) {
            quantity = 1;
            input.value = 1;
        } else if (quantity > 10) {
            quantity = 10;
            input.value = 10;
        }
        
        // Calculate the total price and update
        const totalPrice = (unitPrice * quantity).toFixed(2);
        totalPriceElement.textContent = `$${totalPrice}`;
    }

    /**
     * Handle the batch lottery results
     * @param {Array<Object>} results - The batch lottery results array
     */
    function handleLotteryBatchResults(results) {
        debug.log('Handle the batch lottery results:', results);
        
        // Ensure the petName and imageUrl fields are correctly processed in the results
        const processedResults = results.map(result => {
            // Ensure all necessary fields exist
            const processed = { ...result };
            
            // Ensure the displayName field exists
            if (!processed.displayName) {
                processed.displayName = processed.petName || `Pet #${processed.tokenId}`;
            }
            
            // Ensure the imageUrl field exists
            if (!processed.image && processed.imageUrl) {
                processed.image = processed.imageUrl;
            }
            
            return processed;
        });
        
        // Check if there are lottery results
        if (!processedResults || !Array.isArray(processedResults) || processedResults.length === 0) {
            debug.error('Invalid batch lottery results');
            showStatusMessage('invalidLotteryResult', 'error');
            return;
        }
        
        // Try to save the results to localStorage
        try {
            localStorage.setItem('lastLotteryBatchResults', JSON.stringify(processedResults));
        } catch (error) {
            debug.error('Failed to save the batch lottery results to localStorage:', error);
        }
        
        // Use the improved overlay display method, consistent with the game mode
        try {
            // Check if the iframe and overlay exist, if not, create them
            let lotteryResultFrame = document.getElementById('lottery-result-frame');
            let overlay = document.getElementById('lottery-result-overlay');
            
            if (!overlay) {
                // Create the overlay
                overlay = document.createElement('div');
                overlay.id = 'lottery-result-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                overlay.style.zIndex = '9999';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                
                document.body.appendChild(overlay);
            } else {
                // If it already exists, ensure it is visible
                overlay.style.display = 'flex';
            }
            
            if (!lotteryResultFrame) {
                // Create the iframe
                lotteryResultFrame = document.createElement('iframe');
                lotteryResultFrame.id = 'lottery-result-frame';
                lotteryResultFrame.src = '../../webPages/other/lotteryResult.html';
                lotteryResultFrame.style.width = '90%';
                lotteryResultFrame.style.maxWidth = '450px';
                lotteryResultFrame.style.height = '600px';
                lotteryResultFrame.style.border = 'none';
                lotteryResultFrame.style.borderRadius = '12px';
                lotteryResultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                
                // Add to the overlay
                overlay.appendChild(lotteryResultFrame);
            }
            
            // Define the function to handle the iframe message
            const handleResultMessage = function(event) {
                if (event.data && event.data.type === 'lotteryResultClosed') {
                    // Received the close message, hide the overlay
                    if (overlay) {
                        overlay.style.display = 'none';
                    }
                    // Remove the event listener, avoid duplicate listening
                    window.removeEventListener('message', handleResultMessage);
                } else if (event.data && event.data.type === 'iframeReady') {
                    // The iframe is ready, ready to send data
                    debug.log('The lottery result iframe is ready, ready to send data');
                    
                    // Find the saved lottery result data
                    const savedResult = localStorage.getItem('lastLotteryResult');
                    if (savedResult) {
                        try {
                            const resultData = JSON.parse(savedResult);
                            debug.log('Found the saved lottery result, send to the iframe:', resultData);
                            
                            const frame = document.getElementById('lottery-result-frame');
                            if (frame && frame.contentWindow) {
                                setTimeout(() => {
                                    frame.contentWindow.postMessage({
                                        type: 'lotteryResult',
                                        data: resultData
                                    }, '*');
                                }, 500);
                            }
                        } catch (e) {
                            debug.error('Failed to parse the saved lottery result:', e);
                        }
                    }
                } else if (event.data && event.data.type === 'requestPetDetails' && event.data.tokenId) {
                    // iframe requests pet details
                    fetchPetDetailsForLottery(event.data.tokenId)
                        .then(petData => {
                            const frame = document.getElementById('lottery-result-frame');
                            if (frame && frame.contentWindow) {
                                frame.contentWindow.postMessage({
                                    type: 'petDetails',
                                    tokenId: event.data.tokenId,
                                    data: petData
                                }, '*');
                            }
                        })
                        .catch(error => {
                            debug.error('Failed to get the pet details:', error);
                        });
                }
            }
            
            // Clear the old listener and add the new listener
            if (window.lotteryBatchResultMessageHandler) {
                window.removeEventListener('message', window.lotteryBatchResultMessageHandler);
            }
            window.addEventListener('message', handleResultMessage);
            window.lotteryBatchResultMessageHandler = handleResultMessage;
            
            // Listen to the iframe load completion
            lotteryResultFrame.onload = function() {
                // Extend the waiting time, ensure the iframe internal script is fully initialized
                setTimeout(() => {
                    try {
                        if (lotteryResultFrame.contentWindow) {
                            lotteryResultFrame.contentWindow.postMessage({
                                type: 'lotteryBatchResults',
                                data: processedResults
                            }, '*');
                            debug.log('The iframe onload, send the batch lottery results data');
                        } else {
                            debug.error('The iframe.contentWindow is not available');
                        }
                    } catch (error) {
                        debug.error('Failed to send the batch lottery results to the iframe:', error);
                    }
                }, 800);
            };
            
            // If the iframe is already loaded, send the data directly
            if (lotteryResultFrame.contentWindow && lotteryResultFrame.contentDocument && 
                lotteryResultFrame.contentDocument.readyState === 'complete') {
                setTimeout(() => {
                    try {
                        lotteryResultFrame.contentWindow.postMessage({
                            type: 'lotteryBatchResults',
                            data: processedResults
                        }, '*');
                        debug.log('Send the batch lottery results data to the loaded iframe');
                    } catch (error) {
                        debug.error('Failed to send the batch lottery results to the iframe:', error);
                    }
                }, 300);
            }
        } catch (error) {
            debug.error('Failed to create the batch lottery result overlay:', error);
            
            // Degrade processing: use a simple prompt
            showStatusMessage(`purchaseEggsSuccess`, 'success', { count: processedResults.length, eggName: 'pets' });
        }
    }

    /**
     * Check if the user has claimable NFTs
     */
    async function checkClaimableEggsStatus() {
        try {
            debug.log('Check if the user has claimable NFTs');
            
            if (!nftLotteryManagerContract || !currentAddress) {
                debug.warn('The contract is not initialized or the wallet is not connected, cannot check the claimable NFT status');
                return;
            }
            
            // Check if the user has claimable NFTs
            const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
            
            // Get the number of pending eggs
            let pendingRareCount = 0;
            let pendingLegendaryCount = 0;
            let pendingTotal = 0;
            
            if (hasClaimableEggs) {
                try {
                    const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
                    pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
                    pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
                    pendingTotal = pendingRareCount + pendingLegendaryCount;
                    
                    debug.log('The number of pending eggs:', {
                        rare: pendingRareCount,
                        legendary: pendingLegendaryCount,
                        total: pendingTotal
                    });
                } catch (error) {
                    debug.error('Failed to get the number of pending eggs:', error);
                }
            }
            
            // Update the DOM display
            const pendingRareElement = document.getElementById('pending-rare-count');
            const pendingLegendaryElement = document.getElementById('pending-legendary-count');
            const pendingTotalElement = document.getElementById('pending-eggs-total');
            
            if (pendingRareElement) pendingRareElement.textContent = pendingRareCount;
            if (pendingLegendaryElement) pendingLegendaryElement.textContent = pendingLegendaryCount;
            if (pendingTotalElement) pendingTotalElement.textContent = pendingTotal;
            
            const claimEggsButton = document.getElementById('claim-eggs-btn');
            const claimEggsItem = document.getElementById('product-claim-eggs');
            
            if (claimEggsButton && claimEggsItem) {
                if (!hasClaimableEggs || pendingTotal === 0) {
                    debug.log('The user does not have claimable NFTs, update the UI display');
                    
                    // Disable the button
                    claimEggsButton.disabled = true;
                    claimEggsButton.classList.add('disabled');
                    claimEggsButton.textContent = i18n.t('shop.notification.noClaimableEggs');
                    
                    // Add the already claimed style
                    claimEggsItem.classList.add('already-claimed');
                    
                    // Add the prompt label
                    if (!claimEggsItem.querySelector('.claimed-badge')) {
                        const noPendingBadge = document.createElement('div');
                        noPendingBadge.className = 'claimed-badge';
                        noPendingBadge.textContent = i18n.t('shop.notification.noClaimableEggs');
                        claimEggsItem.appendChild(noPendingBadge);
                    }
                } else {
                    debug.log('The user has claimable NFTs, the button is clickable');
                    
                    // Enable the button
                    claimEggsButton.disabled = false;
                    claimEggsButton.classList.remove('disabled');
                    claimEggsButton.textContent = i18n.t('shop.claim');
                    
                    // Remove the disabled style
                    claimEggsItem.classList.remove('already-claimed');
                    
                    // Remove the prompt label
                    const noPendingBadge = claimEggsItem.querySelector('.claimed-badge');
                    if (noPendingBadge) {
                        claimEggsItem.removeChild(noPendingBadge);
                    }
                }
            } else {
                debug.warn('Cannot find the claimable NFT button or product element');
            }
        } catch (error) {
            debug.error('Failed to check the claimable NFT status:', error);
        }
    }
    
    /**
     * Claim the claimable NFTs
     * @param {HTMLElement} button - The claim button
     */
    async function claimEggs(button) {
        debug.log('Claim the claimable NFTs');
        
        if (!button) {
            button = document.getElementById('claim-eggs-btn');
            if (!button) {
                debug.error('Cannot find the claimable NFT button');
                return;
            }
        }
        
        try {
            // Check if the user has claimable NFTs
            const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
            
            if (!hasClaimableEggs) {
                debug.warn('The user does not have claimable NFTs');
                showStatusMessage('noClaimableEggs', 'warning');
                
                // Update the button status
                button.textContent = i18n.t('shop.noClaimableEggs');
                button.classList.add('disabled');
                
                // Update the status display
                checkClaimableEggsStatus();
                return;
            }
            
            // Get the number of pending eggs
            const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
            const pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
            const pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
            const pendingTotal = pendingRareCount + pendingLegendaryCount;
            
            if (pendingTotal === 0) {
                debug.warn('There are no pending eggs');
                showStatusMessage('noPendingEggs', 'warning');
                return;
            }
            
            // Display the confirmation dialog
            const message = `<strong>${pendingTotal}</strong> ${i18n.t('shop.notification.noClaimableEggs')}:<br>
                <span style="color:#03A9F4;font-weight:500;">${pendingRareCount} ${i18n.t('shop.rareEggs')}</span><br>
                <span style="color:#FF9800;font-weight:500;">${pendingLegendaryCount} ${i18n.t('shop.legendaryEggs')}</span><br><br>
                ${i18n.t('shop.confirmClaim')}`;
                
            // Display the confirmation dialog
            const confirmOptions = {
                title: i18n.t('shop.claimUnclaimedEggs'),
                confirmLabel: i18n.t('button.confirm'),
                cancelLabel: i18n.t('button.cancel'),
                animationEnabled: true
            };
            
            const confirmed = await ModalDialog.confirm(message, confirmOptions);
            
            if (!confirmed) {
                debug.log('The user cancelled the claim operation');
                return;
            }
            
            // Set the button to loading state
            const originalText = button.textContent;
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> ' + i18n.t('claimingEggs');
            
            // Execute the claim transaction
            debug.log('Call the contract to claim the unclaimed NFTs');
            showStatusMessage('claimingEggs', 'info');
            
            const result = await nftLotteryManagerContract.methods.claimEggs().send({
                from: currentAddress,
                gas: 1000000 + (pendingTotal * 600000) // Use the contract base gas limit + enough gas for each NFT
            });
            
            debug.log('The unclaimed NFTs claim successfully:', result);
            showStatusMessage('claimEggsSuccess', 'success', { count: pendingTotal });
            
            // Get the lottery results from the transaction
            try {
                // Use the lotteryResultParser to parse the lottery results
                if (typeof window.getLotteryResultsFromTransaction === 'function') {
                    const txHash = result.transactionHash;
                    
                    // Load the lotteryResult module
                    let lotteryResults = await window.getLotteryResultsFromTransaction(
                        web3,
                        nftLotteryManagerContract,
                        txHash,
                        pendingTotal
                    );
                    
                    debug.log('The lottery results from the transaction:', lotteryResults);
                    
                    // Ensure the NFTManager contract is initialized
                    if (!nftManagerContract) {
                        debug.log('The NFTManager contract is not initialized, try to initialize it');
                        nftManagerContract = initNFTManagerContract();
                        // Wait a moment to ensure the initialization is complete
                        if (nftManagerContract) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    
                    // Filter and normalize the results, and get the real pet name and image
                    if (lotteryResults && lotteryResults.length > 0) {
                        // Add the necessary properties and get the detailed information for each result
                        lotteryResults = await Promise.all(
                            lotteryResults.map(async (item) => {
                                // Ensure the basic properties
                                if (!item.qualityName && item.quality !== undefined) {
                                    const qualityNames = {
                                        0: 'COMMON',
                                        1: 'GOOD',
                                        2: 'EXCELLENT', 
                                        3: 'RARE',
                                        4: 'LEGENDARY'
                                    };
                                    item.qualityName = qualityNames[item.quality] || 'Unknown';
                                }
                                
                                if (!item.lotteryTypeName && item.lotteryType) {
                                    const lotteryTypeNames = {
                                        'CommonEgg': 'COMMON EGG',
                                        'RareEgg': 'RARE EGG',
                                        'LegendaryEgg': 'LEGENDARY EGG',
                                        'FreeNFT': 'Free Pet',
                                        'ClaimEgg': 'Claim Pet'
                                    };
                                    item.lotteryTypeName = lotteryTypeNames[item.lotteryType] || item.lotteryType;
                                }
                                
                                // Add the user address (if not exists)
                                if (!item.user) {
                                    item.user = currentAddress;
                                }
                                
                                try {
                                    // If the NFTManager contract is initialized, get the pet details information
                                    if (nftManagerContract && item.tokenId) {
                                        // Get the pet URI
                                        try {
                                            const tokenURI = await nftManagerContract.methods._tokenURIs(item.tokenId).call();
                                            item.tokenURI = tokenURI;
                                            
                                            // Get the pet quality and quality ID
                                            const quality = await nftManagerContract.methods.tokenQuality(item.tokenId).call();
                                            const qualityId = await nftManagerContract.methods.tokenQualityId(item.tokenId).call();
                                            
                                            // Get the NFT information using the quality and quality ID
                                            const nftInfo = await nftManagerContract.methods.nfts(quality, qualityId).call();
                                            if (nftInfo && nftInfo.name) {
                                                item.petName = `Pet #${nftInfo.name}`;
                                            }
                                            
                                            // Get the pet image URL
                                            if (tokenURI) {
                                                if (tokenURI.startsWith('data:application/json;base64,')) {
                                                    // Parse the Base64 encoded metadata
                                                    const base64Data = tokenURI.replace('data:application/json;base64,', '');
                                                    const jsonString = atob(base64Data);
                                                    const metadata = JSON.parse(jsonString);
                                                    
                                                    if (metadata.image) {
                                                        item.imageUrl = metadata.image;
                                                    }
                                                    if (metadata.name) {
                                                        item.petName = metadata.name;
                                                    }
                                                } else if (tokenURI.startsWith('http')) {
                                                    // Try to get the metadata from the HTTP URL
                                                    try {
                                                        const response = await fetch(tokenURI);
                                                        const metadata = await response.json();
                                                        
                                                        if (metadata.image) {
                                                            item.imageUrl = metadata.image;
                                                        }
                                                        if (metadata.name) {
                                                            item.petName = metadata.name;
                                                        }
                                                    } catch (e) {
                                                        debug.error('Failed to get the pet metadata:', e);
                                                    }
                                                }
                                            }
                                        } catch (error) {
                                            debug.error('Failed to get the pet URI:', error);
                                        }
                                    }
                                    
                                } catch (error) {
                                    debug.error('get pet details failed:', error);
                                }
                                
                                return item;
                            })
                        );
                        
                        debug.log('processed lottery results:', lotteryResults);
                        
                        // directly use handleLotteryBatchResults to display the results
                        handleLotteryBatchResults(lotteryResults);
                    } else {
                        // no valid lottery results found, show a simple success message
                        debug.warn('no valid lottery results found');
                        showStatusMessage('claimSuccess', 'success');
                    }
                } else {
                    debug.warn('getLotteryResultsFromTransaction function is not defined');
                    showStatusMessage('claimSuccess', 'success');
                }
            } catch (parseError) {
                debug.error('parse lottery results failed:', parseError);
                showStatusMessage('claimFailed', 'error', { message: getErrorMessage(parseError) });
            }
            
            // update the button status
            checkClaimableEggsStatus();
            
        } catch (error) {
            debug.error('claim unclaimed NFTs failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // restore the button status
            button.disabled = false;
            button.textContent = i18n.t('shop.claim');
        } finally {
            resetBuyButton(button);
        }
    }

    /**
     * show the pending claim pets alert dialog
     * @param {string} eggType - the type name of the egg
     */
    function showPendingEggAlert(eggType) {
        try {
            const confirmContent = `
                <div style="padding: 10px 0;">
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-info-circle" style="color: #03A9F4; font-size: 24px; margin-right: 10px;"></i>
                        <span style="font-size: 18px; font-weight: bold;">${i18n.t('shop.notification.pendingClaimAlert')}</span>
                    </div>
                    <p>${i18n.t('shop.notification.pendingClaimAlertMessage', { eggType: eggType })}</p>
                    <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; border-left: 4px solid #03A9F4;">
                        <p style="margin: 0;">${i18n.t('shop.notification.pendingClaimAlertTip')}</p>
                    </div>
                </div>
            `;
            
            const confirmOptions = {
                title: i18n.t('shop.purchaseSuccess'),
                confirmText: i18n.t('button.ok'),
                cancelText: null, // 不显示取消按钮
                animation: true
            };
            
            ModalDialog.confirm(confirmContent, confirmOptions);
        } catch (error) {
            debug.error('show the pending claim pets alert dialog failed:', error);
            
            // fallback to the simple alert dialog
            const fallbackTitle = i18n.t('shop.notification.pendingClaimAlert');
            const fallbackMessage = i18n.t('shop.notification.pendingClaimAlertMessage', { eggType: eggType });
            
            // create the alert dialog container
            const fallbackOverlay = document.createElement('div');
            fallbackOverlay.className = 'simple-alert-overlay';
            
            // create the alert dialog content
            const fallbackBox = document.createElement('div');
            fallbackBox.className = 'simple-alert-box';
            
            // add the title
            const fallbackTitleElement = document.createElement('h3');
            fallbackTitleElement.textContent = fallbackTitle;
            fallbackBox.appendChild(fallbackTitleElement);
            
            // add the message content
            const fallbackMessageElement = document.createElement('p');
            fallbackMessageElement.innerHTML = fallbackMessage;
            fallbackBox.appendChild(fallbackMessageElement);
            
            // add the confirm button
            const fallbackButton = document.createElement('button');
            fallbackButton.textContent = i18n.t('button.ok');
            fallbackButton.className = 'simple-alert-button';
            fallbackButton.onclick = function() {
                document.body.removeChild(fallbackOverlay);
            };
            fallbackBox.appendChild(fallbackButton);
            
            // add the alert dialog to the page
            fallbackOverlay.appendChild(fallbackBox);
            document.body.appendChild(fallbackOverlay);
            
            // auto focus the confirm button
            fallbackButton.focus();
        }
    }

    /**
     * get multiple lottery results from the transaction
     * @param {Object} web3 - Web3 instance
     * @param {Object} contract - contract instance
     * @param {string} txHash - transaction hash
     * @param {number} expectedCount - expected result count
     * @returns {Promise<Array<Object>|null>} lottery results array or null (if no event found)
     */
    window.getLotteryResultsFromTransaction = async function(web3, contract, txHash, expectedCount = 1) {
        if (!txHash) {
            console.error('get lottery results failed: transaction hash is empty');
            return null;
        }
        
        try {
            console.log(`get multiple lottery results from the transaction ${txHash} (expected count: ${expectedCount})...`);
            
            // get the transaction receipt
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            if (!receipt) {
                console.error('get transaction receipt failed');
                return null;
            }
            
            // define the quality level mapping
            const qualityNames = {
                0: 'COMMON',
                1: 'GOOD',
                2: 'EXCELLENT',
                3: 'RARE',
                4: 'LEGENDARY'
            };
            
            // define the lottery type mapping
            const lotteryTypeNames = {
                'CommonEgg': 'COMMON EGG',
                'RareEgg': 'RARE EGG',
                'LegendaryEgg': 'LEGENDARY EGG',
                'FreeNFT': 'Free Pet'
            };
            
            // find the event signature
            const lotteryResultEventAbi = contract._jsonInterface.find(
                abi => abi.type === 'event' && abi.name === 'NFTLotteryResult'
            );
            
            const freeNFTEventAbi = contract._jsonInterface.find(
                abi => abi.type === 'event' && abi.name === 'FreeNFTClaimed'
            );
            
            
            if (!lotteryResultEventAbi && !freeNFTEventAbi) {
                console.error('NFTLotteryResult/FreeNFTClaimed event not found in the contract ABI');
                return null;
            }
            
            // store the found results
            const results = [];
            
            // find the event in the logs
            for (const log of receipt.logs) {
                // check if it matches the NFTLotteryResult event
                if (lotteryResultEventAbi && log.topics[0] === lotteryResultEventAbi.signature) {
                    const decodedLog = web3.eth.abi.decodeLog(
                        lotteryResultEventAbi.inputs,
                        log.data,
                        log.topics.slice(1)
                    );
                    
                    // build the result object
                    const result = {
                        user: decodedLog.user,
                        tokenId: decodedLog.tokenId,
                        quality: parseInt(decodedLog.quality),
                        qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
                        nftId: decodedLog.nftId,
                        lotteryType: decodedLog.lotteryType,
                        lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                    };
                    
                    results.push(result);
                    console.log('add the result from the NFTLotteryResult event:', result);
                }
                // check if it matches the FreeNFTClaimed event
                else if (freeNFTEventAbi && log.topics[0] === freeNFTEventAbi.signature) {
                    const decodedLog = web3.eth.abi.decodeLog(
                        freeNFTEventAbi.inputs,
                        log.data,
                        log.topics.slice(1)
                    );
                    
                    // build the result object
                    const result = {
                        user: decodedLog.user,
                        tokenId: decodedLog.tokenId,
                        quality: 0, // free NFT is common quality
                        qualityName: 'COMMON',
                        nftId: decodedLog.nftId,
                        lotteryType: 'FreeNFT',
                        lotteryTypeName: 'Free Pet'
                    };
                    
                    results.push(result);
                    console.log('add the result from the FreeNFTClaimed event:', result);
                }
            }
            
            // check if the result count matches the expected count
            console.log(`found ${results.length} lottery results in the transaction ${txHash}, expected ${expectedCount} results`);
            
            // validate the results and check for duplicates
            if (results.length > 0) {
                // remove duplicate results (same tokenId)
                const uniqueResults = [];
                const seenTokenIds = new Set();
                
                for (const result of results) {
                    // only process the real tokenId (not 0 or undefined)
                    if (result.tokenId && result.tokenId !== '0') {
                        if (!seenTokenIds.has(result.tokenId)) {
                            seenTokenIds.add(result.tokenId);
                            uniqueResults.push(result);
                        } else {
                            console.log(`ignore the duplicate tokenId: ${result.tokenId}`);
                        }
                    } else {
                        // unprocessed temporary event, assume it will not be repeated
                        uniqueResults.push(result);
                    }
                }
                
                console.log(`after filtering, there are ${uniqueResults.length} unique lottery results`);
                return uniqueResults;
            }
            
            console.warn('no valid lottery results found');
            return null;
        } catch (error) {
            console.error('get lottery results failed:', error);
            return null;
        }
    };

    /**
     * initialize the NFT remaining quantity UI elements
     */
    function initNFTRemainingUI() {
        debug.log('initialize the NFT remaining quantity UI elements');
        
        // since the HTML already has the basic container structure, no need to create elements
        // just ensure the container exists
        if (!document.getElementById('nft-remaining-container')) {
            debug.warn('NFT remaining quantity container not found, the UI may have changed');
            return;
        }
        
        debug.log('NFT remaining quantity UI elements already exist, prepare to update the data');
        
        // immediately try to update the NFT remaining quantity
        updateNFTRemaining();
    }
    
    /**
     * update the NFT remaining quantity
     */
    function updateNFTRemaining() {
        debug.log('update the NFT remaining quantity...');
        
        if (!web3 || !nftManagerContract) {
            debug.warn('Web3 or NFTManager contract not initialized, cannot get the NFT remaining quantity');
            // retry after 3 seconds
            setTimeout(updateNFTRemaining, 3000);
            return;
        }
        
        // check if NFTManagerABI is loaded
        if (!window.NFTManagerABI) {
            debug.error('NFTManagerABI not loaded, try to load the ABI file');
            loadNFTManagerABI();
            setTimeout(updateNFTRemaining, 2000);
            return;
        }
        
        try {
            // first check if the contract methods are available
            if (!nftManagerContract.methods) {
                debug.error('NFTManager contract methods not available');
                // try to reinitialize the contract
                initNFTManagerContract();
                setTimeout(updateNFTRemaining, 2000);
                return;
            }
            
            // check if the contract has the totalRareRemaining method
            if (typeof nftManagerContract.methods.totalRareRemaining !== 'function') {
                debug.error('NFTManager contract does not have the totalRareRemaining method');
                
                // update the UI to show 'unavailable'
                const rareRemainingElement = document.getElementById('rare-remaining-count');
                const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                if (rareRemainingElement) rareRemainingElement.textContent = 'unavailable';
                if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'unavailable';
                
                return;
            }
            
            // get the remaining quantity of rare NFTs
            nftManagerContract.methods.totalRareRemaining().call()
                .then(rareRemaining => {
                    debug.log('remaining quantity of rare NFTs:', rareRemaining);
                    
                    // update the UI
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = rareRemaining;
                    }
                })
                .catch(error => {
                    debug.error('get the remaining quantity of rare NFTs failed:', error);
                    
                    // update the UI to show the error status
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = 'error';
                    }
                });
                
            // get the remaining quantity of legendary NFTs
            nftManagerContract.methods.totalLegendaryRemaining().call()
                .then(legendaryRemaining => {
                    debug.log('remaining quantity of legendary NFTs:', legendaryRemaining);
                    
                    // update the UI
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = legendaryRemaining;
                    }
                })
                .catch(error => {
                    debug.error('get the remaining quantity of legendary NFTs failed:', error);
                    
                    // update the UI to show the error status
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = 'error';
                    }
                });
        } catch (error) {
            debug.error('error when updating the NFT remaining quantity:', error);
            
            // update the UI to show the error status
            const rareRemainingElement = document.getElementById('rare-remaining-count');
            const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
            if (rareRemainingElement) rareRemainingElement.textContent = 'error';
            if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'error';
        }
    }
    
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

    /**
     * handle messages from the iframe
     * @param {MessageEvent} event - the message event
     */
    function handleIframeMessages(event) {
        if (!event.data || typeof event.data !== 'object') return;
        
        debug.log('received message from the iframe:', event.data);
        
        // handle messages from the lottery result iframe
        if (event.data.type === 'requestPetDetails' && event.data.tokenId) {
            debug.log('received the request for the pet details:', event.data.tokenId);
            
            // try to get the pet details
            fetchPetDetailsForLottery(event.data.tokenId)
                .then(petData => {
                    // send the pet details to the iframe
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage({
                            type: 'petDetails',
                            tokenId: event.data.tokenId,
                            data: petData
                        }, '*');
                        debug.log('sent the pet details to the iframe:', petData);
                    }
                })
                .catch(error => {
                    debug.error('failed to get the pet details:', error);
                });
        } else if (event.data.type === 'lotteryResultClosed') {
            // the lottery result popup is closed
            debug.log('the lottery result popup is closed');
            
            // remove the overlay
            const overlay = document.getElementById('lottery-result-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                // optional: remove the overlay from the DOM
                // overlay.remove();
            }
        } else if (event.data.type === 'requestContractAddress') {
            // the iframe requests the contract address
            if (event.data.contract === 'NFTManager' && typeof window.getContractAddress === 'function') {
                const address = window.getContractAddress('NFTManager');
                if (address && event.source && event.source.postMessage) {
                    event.source.postMessage({
                        type: 'contractAddress',
                        contract: 'NFTManager',
                        address: address
                    }, '*');
                    debug.log('sent the NFTManager contract address to the iframe:', address);
                }
            }
        }
    }

    /**
     * get the pet details for the lottery result display
     * @param {string|number} tokenId - the tokenId of the pet
     * @returns {Promise<Object>} the pet details object
     */
    async function fetchPetDetailsForLottery(tokenId) {
        debug.log('fetching the pet details:', tokenId);
        
        const petData = {
            name: null,
            type: null,
            imageUrl: null,
            quality: null
        };
        
        try {
            // if the NFTManager contract is not available, try to initialize
            if (!nftManagerContract || !nftManagerContract.methods) {
                debug.log('the NFTManager contract is not available, try to initialize');
                
                if (typeof initNFTManagerContract === 'function') {
                    nftManagerContract = initNFTManagerContract();
                }
                
                // wait for the initialization to complete
                if (!nftManagerContract || !nftManagerContract.methods) {
                    debug.error('failed to initialize the NFTManager contract');
                    return petData;
                }
            }
            
            // try to get the pet URI
            let tokenURI;
            try {
                if (typeof nftManagerContract.methods._tokenURIs === 'function') {
                    tokenURI = await nftManagerContract.methods._tokenURIs(tokenId).call();
                    debug.log('use _tokenURIs to get the pet URI:', tokenURI);
                } else if (typeof nftManagerContract.methods.tokenURI === 'function') {
                    tokenURI = await nftManagerContract.methods.tokenURI(tokenId).call();
                    debug.log('use tokenURI to get the pet URI:', tokenURI);
                }
            } catch (uriError) {
                debug.error('failed to get the pet URI:', uriError);
            }
            
            // parse the URI to get the metadata
            if (tokenURI) {
                try {
                    let metadata;
                    
                    if (tokenURI.startsWith('http')) {
                        // HTTP URL
                        const response = await fetch(tokenURI);
                        metadata = await response.json();
                    } else if (tokenURI.startsWith('data:application/json;base64,')) {
                        // Base64 encoded JSON
                        const base64Data = tokenURI.replace('data:application/json;base64,', '');
                        const jsonString = atob(base64Data);
                        metadata = JSON.parse(jsonString);
                    } else if (tokenURI.startsWith('ipfs://')) {
                        // IPFS link
                        const ipfsHash = tokenURI.replace('ipfs://', '');
                        const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                        
                        try {
                            const response = await fetch(ipfsGatewayUrl);
                            metadata = await response.json();
                        } catch (ipfsError) {
                            debug.error('failed to get the metadata from IPFS, try the backup gateway:', ipfsError);
                            // try the backup gateway
                            const backupGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                            const backupResponse = await fetch(backupGatewayUrl);
                            metadata = await backupResponse.json();
                        }
                    }
                    
                    if (metadata) {
                        // set the pet data
                        petData.name = metadata.name || `pet #${tokenId}`;
                        petData.type = metadata.species || metadata.type || 'unknown type';
                        
                        if (metadata.image) {
                            if (metadata.image.startsWith('ipfs://')) {
                                const ipfsHash = metadata.image.replace('ipfs://', '');
                                petData.imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                            } else {
                                petData.imageUrl = metadata.image;
                            }
                        }
                        
                        // try to get more information from the attributes
                        if (metadata.attributes && Array.isArray(metadata.attributes)) {
                            for (const attr of metadata.attributes) {
                                if (attr.trait_type === 'Type' || attr.trait_type === 'Species') {
                                    petData.type = attr.value || petData.type;
                                } else if (attr.trait_type === 'Quality' || attr.trait_type === 'Rarity') {
                                    petData.quality = attr.value;
                                }
                            }
                        }
                        
                        debug.log('successfully get the pet details:', petData);
                    }
                } catch (metadataError) {
                    debug.error('failed to parse the metadata:', metadataError);
                }
            }
            
            // try to get the quality information (if not yet obtained)
            if (!petData.quality) {
                try {
                    if (typeof nftManagerContract.methods.tokenQualityId === 'function') {
                        const qualityId = await nftManagerContract.methods.tokenQualityId(tokenId).call();
                        debug.log('get the pet quality ID:', qualityId);
                        
                        // convert the quality ID to the name
                        const qualityNames = ['common', 'good', 'rare', 'epic', 'legendary'];
                        if (qualityId >= 0 && qualityId < qualityNames.length) {
                            petData.quality = qualityNames[qualityId];
                        }
                    }
                } catch (qualityError) {
                    debug.error('failed to get the pet quality:', qualityError);
                }
            }
        } catch (error) {
            debug.error('failed to get the pet details:', error);
        }
        
        return petData;
    }

    /**
     * Initialize the test buttons for development
     */
    // function initTestButtons() {
    //     debug.log('Initializing test buttons for development');
        
    //     // Get the test buttons
    //     const singleLotteryButton = document.getElementById('test-single-lottery');
    //     const batchLotteryButton = document.getElementById('test-batch-lottery');
        
    //     // Add event listeners to the buttons
    //     if (singleLotteryButton) {
    //         singleLotteryButton.addEventListener('click', testSingleLotteryResult);
    //     }
        
    //     if (batchLotteryButton) {
    //         batchLotteryButton.addEventListener('click', testBatchLotteryResults);
    //     }
    // }
    
    // /**
    //  * Test the single lottery result display
    //  */
    // function testSingleLotteryResult() {
    //     debug.log('Testing single lottery result display');
        
    //     // Create a sample lottery result
    //     const sampleResult = {
    //         user: currentAddress || '0x1234567890abcdef1234567890abcdef12345678',
    //         tokenId: '123456',
    //         quality: 3, // RARE
    //         qualityName: 'RARE',
    //         nftId: '789',
    //         lotteryType: 'CommonEgg',
    //         lotteryTypeName: 'COMMON EGG',
    //         petName: 'Test Pet #123456',
    //         imageUrl: '../../resources/images/pets/cat_01.png'
    //     };
        
    //     // Call the handleLotteryResult function to display the result
    //     handleLotteryResult(sampleResult);
        
    //     debug.log('Single lottery result test started');
    // }
    
    // /**
    //  * Test the batch lottery results display
    //  */
    // function testBatchLotteryResults() {
    //     debug.log('Testing batch lottery results display');
        
    //     // Create sample batch lottery results (3 items)
    //     const sampleBatchResults = [
    //         {
    //             user: currentAddress || '0x1234567890abcdef1234567890abcdef12345678',
    //             tokenId: '123456',
    //             quality: 0, // COMMON
    //             qualityName: 'COMMON',
    //             nftId: '789',
    //             lotteryType: 'CommonEgg',
    //             lotteryTypeName: 'COMMON EGG',
    //             petName: 'Common Pet #123456',
    //             imageUrl: '../../resources/images/pets/dog_01.png'
    //         },
    //         {
    //             user: currentAddress || '0x1234567890abcdef1234567890abcdef12345678',
    //             tokenId: '123457',
    //             quality: 2, // EXCELLENT
    //             qualityName: 'EXCELLENT',
    //             nftId: '790',
    //             lotteryType: 'CommonEgg',
    //             lotteryTypeName: 'COMMON EGG',
    //             petName: 'Excellent Pet #123457',
    //             imageUrl: '../../resources/images/pets/cat_02.png'
    //         },
    //         {
    //             user: currentAddress || '0x1234567890abcdef1234567890abcdef12345678',
    //             tokenId: '123458',
    //             quality: 3, // RARE
    //             qualityName: 'RARE',
    //             nftId: '791',
    //             lotteryType: 'CommonEgg',
    //             lotteryTypeName: 'COMMON EGG',
    //             petName: 'Rare Pet #123458',
    //             imageUrl: '../../resources/images/pets/chicken_01.png'
    //         }
    //     ];
        
    //     // Call the handleLotteryBatchResults function to display the results
    //     handleLotteryBatchResults(sampleBatchResults);
        
    //     debug.log('Batch lottery results test started');
    // }
}); // End of DOMContentLoaded 