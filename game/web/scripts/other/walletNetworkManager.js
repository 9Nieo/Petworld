/**
 * Wallet Network Manager
 * Integrates wallet detection and network configuration to provide unified interface
 * for determining wallet type, network settings, and connection status
 */

class WalletNetworkManager {
    constructor() {
        this.isInitialized = false;
        this.currentWalletType = null; // 'private_key' | 'external' | null
        this.currentNetwork = null; // 'MAIN' | 'TEST'
        this.isConnected = false;
        this.connectionStatus = {
            hasPrivateKey: false,
            isPrivateKeyReady: false,
            hasExternalWallet: false,
            isExternalWalletConnected: false,
            rpcConnected: false,
            networkDetected: false
        };
        this.callbacks = {
            onWalletReady: [],
            onNetworkChanged: [],
            onConnectionStatusChanged: []
        };
        
        // Debug utility
        this.debug = {
            log: (...args) => console.log('[WalletNetworkManager]', ...args),
            warn: (...args) => console.warn('[WalletNetworkManager]', ...args),
            error: (...args) => console.error('[WalletNetworkManager]', ...args)
        };
    }

    /**
     * Initialize the wallet network manager
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Initialization result
     */
    async init(options = {}) {
        this.debug.log('Initializing WalletNetworkManager...');
        
        try {
            // Wait for required dependencies
            await this._waitForDependencies();
            
            // Detect current network preference
            await this._detectNetworkPreference();
            
            // Check wallet availability and status
            const walletStatus = await this._checkWalletStatus();
            
            // Determine connection strategy
            const connectionStrategy = this._determineConnectionStrategy(walletStatus);
            
            // Execute connection strategy
            const connectionResult = await this._executeConnectionStrategy(connectionStrategy);
            
            this.isInitialized = true;
            
            const result = {
                success: true,
                walletType: this.currentWalletType,
                network: this.currentNetwork,
                isConnected: this.isConnected,
                connectionStatus: { ...this.connectionStatus },
                strategy: connectionStrategy,
                ...connectionResult
            };
            
            this.debug.log('WalletNetworkManager initialized successfully:', result);
            this._notifyCallbacks('onConnectionStatusChanged', result);
            
            return result;
        } catch (error) {
            this.debug.error('Failed to initialize WalletNetworkManager:', error);
            return {
                success: false,
                error: error.message,
                walletType: null,
                network: this.currentNetwork,
                isConnected: false,
                connectionStatus: { ...this.connectionStatus }
            };
        }
    }

    /**
     * Wait for required dependencies to be available
     * @private
     */
    async _waitForDependencies() {
        this.debug.log('Waiting for dependencies...');
        
        // Wait for SecureWalletManager if it's expected to load
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        while (attempts < maxAttempts) {
            if (window.SecureWalletManager || window.ethereum || window.web3) {
                break;
            }
            await this._wait(100);
            attempts++;
        }
        
        // Wait for NetworkDetector if available
        if (window.NetworkDetector) {
            this.debug.log('NetworkDetector found, waiting for initialization...');
            // NetworkDetector is already an instance, not a constructor
            if (!window.networkDetector) {
                window.networkDetector = window.NetworkDetector;
            }
        }
        
        this.debug.log('Dependencies check completed');
    }

    /**
     * Detect network preference from various sources
     * @private
     */
    async _detectNetworkPreference() {
        this.debug.log('Detecting network preference...');
        
        // Priority 1: Check global window.currentNetwork
        if (window.currentNetwork) {
            this.currentNetwork = window.currentNetwork;
            this.debug.log('Using global currentNetwork:', this.currentNetwork);
            return;
        }
        
        // Priority 2: Check localStorage
        const storedNetwork = localStorage.getItem('currentNetwork');
        if (storedNetwork && (storedNetwork === 'MAIN' || storedNetwork === 'TEST')) {
            this.currentNetwork = storedNetwork;
            window.currentNetwork = storedNetwork;
            this.debug.log('Using stored network preference:', this.currentNetwork);
            return;
        }
        
        // Priority 3: Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const networkParam = urlParams.get('network');
        if (networkParam && (networkParam.toUpperCase() === 'MAIN' || networkParam.toUpperCase() === 'TEST')) {
            this.currentNetwork = networkParam.toUpperCase();
            window.currentNetwork = this.currentNetwork;
            localStorage.setItem('currentNetwork', this.currentNetwork);
            this.debug.log('Using URL network parameter:', this.currentNetwork);
            return;
        }
        
        // Priority 4: Detect from connected wallet network
        if (window.ethereum) {
            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const networkFromChain = this._getNetworkFromChainId(chainId);
                if (networkFromChain) {
                    this.currentNetwork = networkFromChain;
                    window.currentNetwork = this.currentNetwork;
                    this.debug.log('Detected network from wallet chain:', this.currentNetwork);
                    return;
                }
            } catch (error) {
                this.debug.warn('Failed to detect network from wallet:', error);
            }
        }
        
        // Default to TEST network
        this.currentNetwork = 'TEST';
        window.currentNetwork = this.currentNetwork;
        this.debug.log('Using default network:', this.currentNetwork);
    }

    /**
     * Check wallet availability and status
     * @private
     * @returns {Object} Wallet status information
     */
    async _checkWalletStatus() {
        this.debug.log('Checking wallet status...');
        
        const status = {
            hasPrivateKey: false,
            isPrivateKeyReady: false,
            privateKeyAddress: null,
            hasExternalWallet: false,
            isExternalWalletConnected: false,
            externalWalletAddress: null,
            web3Available: false
        };

        // Check private key wallet
        if (window.SecureWalletManager) {
            try {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isReady = window.SecureWalletManager.isWalletReady();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const address = window.SecureWalletManager.getAddress();
                
                status.hasPrivateKey = keyCount > 0;
                status.isPrivateKeyReady = status.hasPrivateKey && isReady && !isLocked && !!address;
                status.privateKeyAddress = address;
                
                if (status.isPrivateKeyReady) {
                    status.web3Available = !!window.SecureWalletManager.getWeb3();
                }
                
                this.debug.log('Private key wallet status:', {
                    keyCount,
                    isReady,
                    isLocked,
                    address,
                    web3Available: status.web3Available
                });
            } catch (error) {
                this.debug.warn('Error checking private key wallet:', error);
            }
        }

        // Check external wallet
        if (window.ethereum) {
            status.hasExternalWallet = true;
            
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                status.isExternalWalletConnected = accounts && accounts.length > 0;
                status.externalWalletAddress = accounts && accounts.length > 0 ? accounts[0] : null;
                
                this.debug.log('External wallet status:', {
                    hasWallet: status.hasExternalWallet,
                    isConnected: status.isExternalWalletConnected,
                    address: status.externalWalletAddress
                });
            } catch (error) {
                this.debug.warn('Error checking external wallet:', error);
            }
        }

        // Check Web3 availability
        if (!status.web3Available && (window.web3 || window.Web3)) {
            status.web3Available = true;
        }

        this.connectionStatus = { ...this.connectionStatus, ...status };
        return status;
    }

    /**
     * Determine the best connection strategy based on wallet status
     * @private
     * @param {Object} walletStatus - Current wallet status
     * @returns {Object} Connection strategy
     */
    _determineConnectionStrategy(walletStatus) {
        this.debug.log('Determining connection strategy...');
        
        // Priority 1: Use private key wallet if available and ready
        if (walletStatus.isPrivateKeyReady) {
            return {
                type: 'private_key',
                priority: 1,
                description: 'Use private key wallet (highest priority)',
                requiresRpcConnection: true,
                address: walletStatus.privateKeyAddress
            };
        }
        
        // Priority 2: Use private key wallet if available but needs initialization
        if (walletStatus.hasPrivateKey && !walletStatus.isPrivateKeyReady) {
            return {
                type: 'private_key_init',
                priority: 2,
                description: 'Initialize private key wallet',
                requiresRpcConnection: true,
                address: null
            };
        }
        
        // Priority 3: Use external wallet if connected
        if (walletStatus.isExternalWalletConnected) {
            return {
                type: 'external_wallet',
                priority: 3,
                description: 'Use connected external wallet',
                requiresRpcConnection: false,
                address: walletStatus.externalWalletAddress
            };
        }
        
        // Priority 4: External wallet available but not connected
        if (walletStatus.hasExternalWallet) {
            return {
                type: 'external_wallet_connect',
                priority: 4,
                description: 'Connect external wallet',
                requiresRpcConnection: false,
                address: null
            };
        }
        
        // Priority 5: No wallet available
        return {
            type: 'no_wallet',
            priority: 5,
            description: 'No wallet available',
            requiresRpcConnection: false,
            address: null
        };
    }

    /**
     * Execute the determined connection strategy
     * @private
     * @param {Object} strategy - Connection strategy to execute
     * @returns {Promise<Object>} Execution result
     */
    async _executeConnectionStrategy(strategy) {
        this.debug.log('Executing connection strategy:', strategy.description);
        
        let result;
        
        switch (strategy.type) {
            case 'private_key':
                result = await this._executePrivateKeyStrategy(strategy);
                break;
            
            case 'private_key_init':
                result = await this._executePrivateKeyInitStrategy(strategy);
                
                // If private key init failed but fallback is allowed, try other strategies
                if (!result.success && !result.requiresUserAction) {
                    this.debug.log('Private key initialization failed, trying fallback strategies...');
                    
                    // Re-check wallet status for fallback options
                    const walletStatus = await this._checkWalletStatus();
                    
                    // Try external wallet if available
                    if (walletStatus.isExternalWalletConnected) {
                        this.debug.log('Falling back to external wallet...');
                        const fallbackStrategy = {
                            type: 'external_wallet',
                            priority: 3,
                            description: 'Fallback to external wallet',
                            requiresRpcConnection: false,
                            address: walletStatus.externalWalletAddress
                        };
                        result = await this._executeExternalWalletStrategy(fallbackStrategy);
                    }
                    
                    // If external wallet also failed, try read-only mode
                    if (!result.success) {
                        this.debug.log('Falling back to read-only mode...');
                        const fallbackStrategy = {
                            type: 'no_wallet',
                            priority: 5,
                            description: 'Fallback to read-only mode',
                            requiresRpcConnection: false,
                            address: null
                        };
                        result = await this._executeNoWalletStrategy(fallbackStrategy);
                    }
                }
                break;
            
            case 'external_wallet':
                result = await this._executeExternalWalletStrategy(strategy);
                break;
            
            case 'external_wallet_connect':
                result = await this._executeExternalWalletConnectStrategy(strategy);
                break;
            
            case 'no_wallet':
                result = await this._executeNoWalletStrategy(strategy);
                break;
            
            default:
                throw new Error(`Unknown strategy type: ${strategy.type}`);
        }
        
        return result;
    }

    /**
     * Execute private key wallet strategy
     * @private
     */
    async _executePrivateKeyStrategy(strategy) {
        this.debug.log('Executing private key wallet strategy...');
        
        try {
            // Get Web3 instance from private key wallet
            const web3 = window.SecureWalletManager.getWeb3();
            if (!web3) {
                throw new Error('Failed to get Web3 instance from private key wallet');
            }
            
            // Test RPC connection
            await this._testRpcConnection(web3);
            
            // Set global Web3 instance
            window.web3 = web3;
            
            this.currentWalletType = 'private_key';
            this.isConnected = true;
            this.connectionStatus.rpcConnected = true;
            this.connectionStatus.isPrivateKeyReady = true;
            
            return {
                success: true,
                web3Instance: web3,
                address: strategy.address,
                rpcConnected: true,
                message: 'Private key wallet connected successfully'
            };
        } catch (error) {
            this.debug.error('Private key wallet strategy failed:', error);
            return {
                success: false,
                error: error.message,
                rpcConnected: false
            };
        }
    }

    /**
     * Execute private key initialization strategy
     * @private
     */
    async _executePrivateKeyInitStrategy(strategy) {
        this.debug.log('Executing private key initialization strategy...');
        
        try {
            // Check if wallet is locked and needs authentication
            const isLocked = window.SecureWalletManager.isWalletLocked();
            const keyCount = window.SecureWalletManager.getKeyCount();
            
            this.debug.log('Private key wallet status:', {
                isLocked,
                keyCount,
                isReady: window.SecureWalletManager.isWalletReady()
            });
            
            // If wallet is locked, don't wait - it needs user authentication
            if (isLocked) {
                this.debug.log('Private key wallet is locked, requires user authentication');
                return {
                    success: false,
                    error: 'Private key wallet is locked',
                    requiresUserAction: true,
                    message: 'Private key wallet needs to be unlocked',
                    walletLocked: true
                };
            }
            
            // If wallet has no keys, it needs setup
            if (keyCount === 0) {
                this.debug.log('Private key wallet has no keys, requires setup');
                return {
                    success: false,
                    error: 'Private key wallet has no keys',
                    requiresUserAction: true,
                    message: 'Private key wallet needs to be set up',
                    walletEmpty: true
                };
            }
            
            // Wait for private key wallet to be ready (extended timeout for initialization)
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds for unlocked wallets
            
            while (attempts < maxAttempts) {
                if (window.SecureWalletManager.isWalletReady() && 
                    !window.SecureWalletManager.isWalletLocked() &&
                    window.SecureWalletManager.getAddress()) {
                    break;
                }
                await this._wait(100);
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                this.debug.log('Private key wallet initialization timeout, falling back to external wallet or read-only mode');
                return {
                    success: false,
                    error: 'Private key wallet initialization timeout',
                    requiresUserAction: false, // Don't require user action, fall back to other options
                    message: 'Private key wallet initialization timeout, using fallback',
                    timeout: true
                };
            }
            
            // Recursively call with private key strategy
            const updatedStrategy = {
                ...strategy,
                type: 'private_key',
                address: window.SecureWalletManager.getAddress()
            };
            
            return await this._executePrivateKeyStrategy(updatedStrategy);
        } catch (error) {
            this.debug.error('Private key initialization failed:', error);
            return {
                success: false,
                error: error.message,
                requiresUserAction: false, // Allow fallback to other wallet types
                fallbackAllowed: true
            };
        }
    }

    /**
     * Execute external wallet strategy
     * @private
     */
    async _executeExternalWalletStrategy(strategy) {
        this.debug.log('Executing external wallet strategy...');
        
        try {
            // Create Web3 instance with external provider
            if (!window.Web3) {
                throw new Error('Web3 library not available');
            }
            
            const web3 = new window.Web3(window.ethereum);
            
            // Test connection
            const blockNumber = await web3.eth.getBlockNumber();
            this.debug.log('External wallet connection test successful, block:', blockNumber);
            
            // Check network
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const detectedNetwork = this._getNetworkFromChainId(chainId);
            
            if (detectedNetwork && detectedNetwork !== this.currentNetwork) {
                this.debug.warn(`Network mismatch: expected ${this.currentNetwork}, detected ${detectedNetwork}`);
                // Update current network to match wallet
                this.currentNetwork = detectedNetwork;
                window.currentNetwork = detectedNetwork;
                this._notifyCallbacks('onNetworkChanged', { network: detectedNetwork, source: 'wallet' });
            }
            
            // Set global Web3 instance
            window.web3 = web3;
            
            this.currentWalletType = 'external';
            this.isConnected = true;
            this.connectionStatus.rpcConnected = true;
            this.connectionStatus.networkDetected = true;
            
            return {
                success: true,
                web3Instance: web3,
                address: strategy.address,
                rpcConnected: true,
                networkDetected: detectedNetwork,
                message: 'External wallet connected successfully'
            };
        } catch (error) {
            this.debug.error('External wallet strategy failed:', error);
            return {
                success: false,
                error: error.message,
                rpcConnected: false
            };
        }
    }

    /**
     * Execute external wallet connection strategy
     * @private
     */
    async _executeExternalWalletConnectStrategy(strategy) {
        this.debug.log('Executing external wallet connection strategy...');
        
        return {
            success: false,
            error: 'External wallet not connected',
            requiresUserAction: true,
            message: 'Please connect your external wallet (MetaMask, etc.)',
            action: 'connect_external_wallet'
        };
    }

    /**
     * Execute no wallet strategy
     * @private
     */
    async _executeNoWalletStrategy(strategy) {
        this.debug.log('Executing no wallet strategy...');
        
        // Try to create a read-only Web3 instance for contract reading
        try {
            const rpcUrl = this._getRpcUrlForNetwork(this.currentNetwork);
            if (rpcUrl && window.Web3) {
                const web3 = new window.Web3(new window.Web3.providers.HttpProvider(rpcUrl));
                
                // Test connection
                await this._testRpcConnection(web3);
                
                // Verify network ID matches expected network
                const networkId = await web3.eth.net.getId();
                const expectedNetworkId = this.currentNetwork === 'MAIN' ? 56 : 97;
                
                if (networkId !== expectedNetworkId) {
                    throw new Error(`Network mismatch: connected to ${networkId}, expected ${expectedNetworkId}`);
                }
                
                window.web3 = web3;
                this.connectionStatus.rpcConnected = true;
                this.connectionStatus.networkDetected = true;
                
                return {
                    success: true,
                    web3Instance: web3,
                    address: null,
                    rpcConnected: true,
                    readOnly: true,
                    networkId: networkId,
                    message: 'Read-only RPC connection established'
                };
            }
        } catch (error) {
            this.debug.warn('Failed to establish read-only connection:', error);
        }
        
        return {
            success: false,
            error: 'No wallet available',
            requiresUserAction: true,
            message: 'Please install and connect a wallet (MetaMask, etc.) or set up private key wallet',
            action: 'install_wallet'
        };
    }

    /**
     * Test RPC connection
     * @private
     */
    async _testRpcConnection(web3) {
        this.debug.log('Testing RPC connection...');
        
        try {
            const blockNumber = await web3.eth.getBlockNumber();
            this.debug.log('RPC connection test successful, latest block:', blockNumber);
            return true;
        } catch (error) {
            this.debug.error('RPC connection test failed:', error);
            throw new Error(`RPC connection failed: ${error.message}`);
        }
    }

    /**
     * Get RPC URL for network with fallback options
     * @private
     */
    _getRpcUrlForNetwork(network) {
        const rpcUrls = {
            'MAIN': [
                'https://bsc-dataseed1.binance.org/',
                'https://bsc-dataseed2.binance.org/',
                'https://bsc-dataseed3.binance.org/',
                'https://bsc-dataseed4.binance.org/',
                'https://bsc-dataseed1.defibit.io/',
                'https://bsc-dataseed1.ninicoin.io/'
            ],
            'TEST': [
                'https://data-seed-prebsc-1-s1.binance.org:8545/',
                'https://data-seed-prebsc-2-s1.binance.org:8545/',
                'https://bsc-testnet-dataseed.bnbchain.org/',
                'https://bsc-testnet.public.blastapi.io/'
            ]
        };
        
        const urls = rpcUrls[network] || rpcUrls['TEST'];
        return urls[0]; // Return primary URL, fallback logic handled elsewhere
    }

    /**
     * Get all RPC URLs for network (for fallback attempts)
     * @private
     */
    _getAllRpcUrlsForNetwork(network) {
        const rpcUrls = {
            'MAIN': [
                'https://bsc-dataseed1.binance.org/',
                'https://bsc-dataseed2.binance.org/',
                'https://bsc-dataseed3.binance.org/',
                'https://bsc-dataseed4.binance.org/',
                'https://bsc-dataseed1.defibit.io/',
                'https://bsc-dataseed1.ninicoin.io/'
            ],
            'TEST': [
                'https://data-seed-prebsc-1-s1.binance.org:8545/',
                'https://data-seed-prebsc-2-s1.binance.org:8545/',
                'https://bsc-testnet-dataseed.bnbchain.org/',
                'https://bsc-testnet.public.blastapi.io/'
            ]
        };
        
        return rpcUrls[network] || rpcUrls['TEST'];
    }

    /**
     * Get network from chain ID
     * @private
     */
    _getNetworkFromChainId(chainId) {
        const chainIdNum = parseInt(chainId, 16);
        
        switch (chainIdNum) {
            case 56: return 'MAIN'; // BSC Mainnet
            case 97: return 'TEST'; // BSC Testnet
            default: return null;
        }
    }

    /**
     * Register callback for events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Notify callbacks
     * @private
     */
    _notifyCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.debug.error(`Callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get current connection status
     * @returns {Object} Current status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            walletType: this.currentWalletType,
            network: this.currentNetwork,
            isConnected: this.isConnected,
            connectionStatus: { ...this.connectionStatus }
        };
    }

    /**
     * Get current wallet address
     * @returns {string|null} Current address
     */
    getCurrentAddress() {
        if (this.currentWalletType === 'private_key' && window.SecureWalletManager) {
            return window.SecureWalletManager.getAddress();
        }
        
        if (this.currentWalletType === 'external' && this.connectionStatus.externalWalletAddress) {
            return this.connectionStatus.externalWalletAddress;
        }
        
        return null;
    }

    /**
     * Get current Web3 instance
     * @returns {Object|null} Web3 instance
     */
    getWeb3() {
        if (this.currentWalletType === 'private_key' && window.SecureWalletManager) {
            return window.SecureWalletManager.getWeb3();
        }
        
        return window.web3 || null;
    }

    /**
     * Check if ready for contract operations
     * @returns {boolean} Whether ready for contracts
     */
    isReadyForContracts() {
        return this.isInitialized && 
               this.connectionStatus.rpcConnected && 
               !!this.getWeb3();
    }

    /**
     * Refresh connection status
     * @returns {Promise<Object>} Updated status
     */
    async refresh() {
        this.debug.log('Refreshing connection status...');
        return await this.init();
    }

    /**
     * Initialize contracts with the current Web3 instance
     * @param {Object} options - Contract initialization options
     * @returns {Promise<Object>} Contract initialization result
     */
    async initializeContracts(options = {}) {
        this.debug.log('Initializing contracts...');
        
        if (!this.isReadyForContracts()) {
            throw new Error('WalletNetworkManager not ready for contract operations');
        }
        
        const web3Instance = this.getWeb3();
        if (!web3Instance) {
            throw new Error('No Web3 instance available for contract initialization');
        }
        
        try {
            // Ensure contract addresses are loaded
            await this._ensureContractAddressesLoaded();
            
            // Verify network before initializing contracts
            await this._verifyNetworkBeforeContracts(web3Instance);
            
            // Initialize contracts based on options
            const contractResults = await this._initializeContractInstances(web3Instance, options);
            
            this.debug.log('Contract initialization completed:', contractResults);
            
            return {
                success: true,
                contracts: contractResults.contracts,
                initialized: contractResults.initialized,
                failed: contractResults.failed,
                web3Instance: web3Instance,
                network: this.currentNetwork
            };
        } catch (error) {
            this.debug.error('Contract initialization failed:', error);
            throw error;
        }
    }

    /**
     * Ensure contract addresses are loaded
     * @private
     */
    async _ensureContractAddressesLoaded() {
        if (!window.contractAddresses) {
            this.debug.log('Contract addresses not loaded, attempting to load...');
            
            // Try to load contract addresses script
            try {
                await this._loadScript('../../scripts/contracts/contractAddresses.js');
                
                // Wait a bit for the script to execute
                await this._wait(100);
                
                if (!window.contractAddresses) {
                    throw new Error('Contract addresses still not available after loading script');
                }
                
                this.debug.log('Contract addresses loaded successfully');
            } catch (error) {
                throw new Error(`Failed to load contract addresses: ${error.message}`);
            }
        }
        
        // Verify current network has contract addresses
        if (!window.contractAddresses[this.currentNetwork]) {
            throw new Error(`No contract addresses found for network: ${this.currentNetwork}`);
        }
    }

    /**
     * Verify network before contract initialization
     * @private
     */
    async _verifyNetworkBeforeContracts(web3Instance) {
        try {
            // Get current network ID from Web3
            const networkId = await web3Instance.eth.net.getId();
            const expectedNetworkId = this.currentNetwork === 'MAIN' ? 56 : 97;
            
            if (networkId !== expectedNetworkId) {
                this.debug.warn(`Network mismatch detected: connected to ${networkId}, expected ${expectedNetworkId}`);
                
                // Try to switch network if using external wallet
                if (this.currentWalletType === 'external' && window.ethereum) {
                    await this._attemptNetworkSwitch(expectedNetworkId);
                } else {
                    throw new Error(`Network mismatch: connected to ${networkId}, expected ${expectedNetworkId} for ${this.currentNetwork}`);
                }
            }
            
            this.debug.log(`Network verification passed: ${networkId} (${this.currentNetwork})`);
        } catch (error) {
            throw new Error(`Network verification failed: ${error.message}`);
        }
    }

    /**
     * Attempt to switch network for external wallets
     * @private
     */
    async _attemptNetworkSwitch(targetNetworkId) {
        if (!window.ethereum) {
            throw new Error('Cannot switch network: no external wallet available');
        }
        
        try {
            const chainIdHex = '0x' + targetNetworkId.toString(16);
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }]
            });
            
            this.debug.log(`Successfully switched to network ${targetNetworkId}`);
            
            // Wait for network switch to complete
            await this._wait(1000);
            
            // Verify the switch was successful
            const newNetworkId = await window.ethereum.request({ method: 'eth_chainId' });
            const newNetworkIdNum = parseInt(newNetworkId, 16);
            
            if (newNetworkIdNum !== targetNetworkId) {
                throw new Error(`Network switch failed: still on ${newNetworkIdNum}, expected ${targetNetworkId}`);
            }
        } catch (error) {
            if (error.code === 4902) {
                // Network not added to wallet, try to add it
                await this._addNetworkToWallet(targetNetworkId);
            } else {
                throw error;
            }
        }
    }

    /**
     * Add network to external wallet
     * @private
     */
    async _addNetworkToWallet(networkId) {
        const networkConfigs = {
            56: {
                chainId: '0x38',
                chainName: 'Binance Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed1.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/']
            },
            97: {
                chainId: '0x61',
                chainName: 'Binance Smart Chain Testnet',
                nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
                rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                blockExplorerUrls: ['https://testnet.bscscan.com/']
            }
        };
        
        const config = networkConfigs[networkId];
        if (!config) {
            throw new Error(`Unsupported network ID: ${networkId}`);
        }
        
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [config]
        });
    }

    /**
     * Initialize contract instances
     * @private
     */
    async _initializeContractInstances(web3Instance, options) {
        const contracts = {};
        const initialized = [];
        const failed = [];
        
        // Define contract initialization functions
        const contractInitializers = {
            'PwNFT': 'initPwNFTContract',
            'NFTManager': 'initNFTManagerContract',
            'NFTMarketplace': 'initNFTMarketplaceContract',
            'NFTLotteryManager': 'initNFTLotteryManagerContract',
            'NFTFeedingManager': 'initNFTFeedingManagerContract',
            'PaymentManager': 'initPaymentManagerContract',
            'PwFoodManager': 'initPwFoodManagerContract',
            'PetWorld': 'initPetWorldContract',
            'PetWorldManager': 'initPetWorldManagerContract',
            'PetWorldStaking': 'initPetWorldStakingContract'
        };
        
        // Get contract address function
        const getContractAddress = this._createGetContractAddressFunction();
        
        // Initialize requested contracts or all available contracts
        const contractsToInit = options.contracts || Object.keys(contractInitializers);
        
        for (const contractName of contractsToInit) {
            try {
                const initFunctionName = contractInitializers[contractName];
                
                if (!initFunctionName || typeof window[initFunctionName] !== 'function') {
                    this.debug.warn(`Initialization function ${initFunctionName} not available for ${contractName}`);
                    failed.push({ name: contractName, error: 'Initialization function not available' });
                    continue;
                }
                
                this.debug.log(`Initializing ${contractName} contract...`);
                
                const contractInstance = window[initFunctionName](web3Instance, getContractAddress);
                
                if (contractInstance && contractInstance.methods) {
                    contracts[contractName] = contractInstance;
                    initialized.push(contractName);
                    
                    // Set global variable for backward compatibility
                    const globalVarName = this._getGlobalContractVariableName(contractName);
                    if (globalVarName) {
                        window[globalVarName] = contractInstance;
                    }
                    
                    this.debug.log(`${contractName} contract initialized successfully`);
                } else {
                    throw new Error('Contract initialization returned invalid instance');
                }
            } catch (error) {
                this.debug.error(`Failed to initialize ${contractName} contract:`, error);
                failed.push({ name: contractName, error: error.message });
            }
        }
        
        return { contracts, initialized, failed };
    }

    /**
     * Create getContractAddress function
     * @private
     */
    _createGetContractAddressFunction() {
        return (contractName) => {
            if (!window.contractAddresses || !window.contractAddresses[this.currentNetwork]) {
                this.debug.error(`Contract addresses not available for network: ${this.currentNetwork}`);
                return null;
            }
            
            const address = window.contractAddresses[this.currentNetwork][contractName];
            if (!address) {
                this.debug.warn(`Contract address not found for ${contractName} on ${this.currentNetwork}`);
                return null;
            }
            
            return address;
        };
    }

    /**
     * Get global contract variable name for backward compatibility
     * @private
     */
    _getGlobalContractVariableName(contractName) {
        const mapping = {
            'PwNFT': 'pwNFTContract',
            'NFTManager': 'nftManagerContract',
            'NFTMarketplace': 'nftMarketplaceContract',
            'NFTLotteryManager': 'nftLotteryManagerContract',
            'NFTFeedingManager': 'nftFeedingManagerContract',
            'PaymentManager': 'paymentManagerContract',
            'PwFoodManager': 'pwFoodManagerContract',
            'PetWorld': 'petWorldContract',
            'PetWorldManager': 'petWorldManagerContract',
            'PetWorldStaking': 'petWorldStakingContract'
        };
        
        return mapping[contractName] || null;
    }

    /**
     * Load script dynamically
     * @private
     */
    _loadScript(src) {
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
    }

    /**
     * Create a ready-to-use Web3 instance with proper network configuration
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} Web3 instance with network verification
     */
    async createVerifiedWeb3Instance(options = {}) {
        this.debug.log('Creating verified Web3 instance...');
        
        if (!this.isInitialized) {
            await this.init();
        }
        
        const web3Instance = this.getWeb3();
        if (!web3Instance) {
            throw new Error('No Web3 instance available');
        }
        
        // Verify network
        try {
            const networkId = await web3Instance.eth.net.getId();
            const expectedNetworkId = this.currentNetwork === 'MAIN' ? 56 : 97;
            
            if (networkId !== expectedNetworkId) {
                throw new Error(`Network mismatch: connected to ${networkId}, expected ${expectedNetworkId}`);
            }
            
            // Test connection
            await web3Instance.eth.getBlockNumber();
            
            return {
                web3: web3Instance,
                network: this.currentNetwork,
                networkId: networkId,
                walletType: this.currentWalletType,
                address: this.getCurrentAddress(),
                verified: true
            };
        } catch (error) {
            throw new Error(`Web3 verification failed: ${error.message}`);
        }
    }

    /**
     * Wait for contracts to be ready and initialized
     * @param {Array} requiredContracts - List of required contract names
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} Whether contracts are ready
     */
    async waitForContracts(requiredContracts = [], timeout = 10000) {
        this.debug.log('Waiting for contracts to be ready...', requiredContracts);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                if (!this.isReadyForContracts()) {
                    await this._wait(100);
                    continue;
                }
                
                // Check if required contracts are available
                let allContractsReady = true;
                
                for (const contractName of requiredContracts) {
                    const globalVarName = this._getGlobalContractVariableName(contractName);
                    if (globalVarName && (!window[globalVarName] || !window[globalVarName].methods)) {
                        allContractsReady = false;
                        break;
                    }
                }
                
                if (allContractsReady) {
                    this.debug.log('All required contracts are ready');
                    return true;
                }
                
                await this._wait(100);
            } catch (error) {
                this.debug.warn('Error checking contract readiness:', error);
                await this._wait(100);
            }
        }
        
        this.debug.error('Timeout waiting for contracts to be ready');
        return false;
    }

    /**
     * Get contract initialization status
     * @returns {Object} Contract status information
     */
    getContractStatus() {
        const status = {
            ready: this.isReadyForContracts(),
            network: this.currentNetwork,
            walletType: this.currentWalletType,
            contracts: {}
        };
        
        // Check status of common contracts
        const contractNames = ['PwNFT', 'NFTManager', 'NFTMarketplace', 'NFTLotteryManager', 'NFTFeedingManager'];
        
        for (const contractName of contractNames) {
            const globalVarName = this._getGlobalContractVariableName(contractName);
            if (globalVarName) {
                status.contracts[contractName] = {
                    available: !!window[globalVarName],
                    hasMethod: !!(window[globalVarName] && window[globalVarName].methods),
                    address: window[globalVarName] && window[globalVarName].options ? window[globalVarName].options.address : null
                };
            }
        }
        
        return status;
    }

    /**
     * Wait utility
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance
window.WalletNetworkManager = WalletNetworkManager;

// Auto-initialize if not in a module environment
if (typeof module === 'undefined') {
    window.walletNetworkManager = new WalletNetworkManager();
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletNetworkManager;
} 