/**
 * Secure Wallet Manager
 * Handles private key storage and management with encryption
 * Provides global access while maintaining security
 * Optimized version with enhanced reliability and retry mechanisms
 */

class SecureWalletManager {
    constructor() {
        // Multi-key support
        this.encryptedKeys = {}; // Store multiple encrypted keys by ID
        this.keyMetadata = {}; // Store metadata for each key (name, address, timestamp)
        this.activeKeyId = null; // Currently active key ID
        this.masterPassword = null; // Master password for session
        this.isAuthenticated = false; // Whether user has entered master password
        
        // Current active key data
        this.encryptedKey = null;
        this.privateKey = null;
        this.web3Instance = null;
        this.account = null;
        this.isInitializing = false;
        this.initializationPromise = null;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        
        // Auto-lock functionality
        this.isLocked = false;
        this.lastActivityTime = Date.now();
        this.autoLockTimer = null;
        this.autoLockOptions = {
            '24h': 24 * 60 * 60 * 1000,      // 24 hours
            '3d': 3 * 24 * 60 * 60 * 1000,   // 3 days
            '7d': 7 * 24 * 60 * 60 * 1000,   // 7 days
            '14d': 14 * 24 * 60 * 60 * 1000, // 14 days
            '30d': 30 * 24 * 60 * 60 * 1000, // 30 days
            '90d': 90 * 24 * 60 * 60 * 1000, // 90 days
            'never': 0                        // Never auto-lock
        };
        
        // Gas price settings
        this.gasSettings = {
            maxGasPrice: null, // Will be loaded from localStorage
            // Unified settings for both mainnet and testnet
            unified: {
                defaultGasPrice: '100000000', // 0.1 gwei in wei
                minGasPrice: '100000000', // 0.1 gwei minimum
                maxGasPrice: '10000000000', // 10 gwei maximum
                defaultGwei: '0.1',
                minGwei: '0.1',
                maxGwei: '10'
            },
            gasLimitMultiplier: 1.2 // 20% buffer for gas limit
        };
        
        // Load gas settings from localStorage
        this.loadGasSettings();
        
        // Load auto-lock settings
        this.loadAutoLockSettings();
        
        // Load stored keys metadata
        this.loadStoredKeysMetadata();
        
        // Multiple RPC endpoints for better reliability
        this.rpcEndpoints = {
            mainnet: [
                'https://bsc-dataseed1.binance.org/',
                'https://bsc-dataseed2.binance.org/',
                'https://bsc-dataseed3.binance.org/',
                'https://bsc-dataseed4.binance.org/',
                'https://bsc-dataseed1.defibit.io/',
                'https://bsc-dataseed2.defibit.io/'
            ],
            testnet: [
                'https://bsc-testnet-dataseed.bnbchain.org/',
                'https://data-seed-prebsc-1-s1.binance.org:8545/',
                'https://data-seed-prebsc-2-s1.binance.org:8545/',
                'https://data-seed-prebsc-1-s2.binance.org:8545/',
                'https://data-seed-prebsc-2-s2.binance.org:8545/'
            ]
        };
        
        // Initialize on construction
        this.init();
    }
    
    /**
     * Initialize the wallet manager with enhanced reliability
     */
    async init() {
        if (this.isInitializing) {
            return this.initializationPromise;
        }
        
        this.isInitializing = true;
        console.log('Initializing Secure Wallet Manager (Enhanced)...');
        
        this.initializationPromise = this._performInit();
        
        try {
            await this.initializationPromise;
        } catch (error) {
            console.error('Failed to initialize wallet manager:', error);
        } finally {
            this.isInitializing = false;
        }
        
        return this.initializationPromise;
    }
    
    /**
     * Perform the actual initialization
     */
    async _performInit() {
        // Wait for contract addresses to be loaded first (critical for network configuration)
        await this.waitForContractAddresses();
        
        // Ensure network configuration is synchronized
        this.synchronizeNetworkConfiguration();
        
        // Initialize Web3 with correct network configuration
        await this.initializeWeb3WithRetry();
        
        // Initialize session manager
        if (window.WalletSessionManager) {
            await window.WalletSessionManager.init();
        }
        
        // Load stored keys metadata
        this.loadStoredKeysMetadata();
        
        // Migrate legacy key if exists
        this.migrateLegacyKey();
        
        // Load auto-lock settings
        this.loadAutoLockSettings();
        
        // Check for auto-authentication based on auto-lock settings
        await this.checkAutoAuthentication();
        
        // Check if there's an encrypted key in storage and auto-load it (legacy support)
        await this.loadStoredKey();
    }
    
    /**
     * Wait for contract addresses to be loaded
     */
    async waitForContractAddresses() {
        console.log('Waiting for contractAddresses.js to load...');
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        while (attempts < maxAttempts) {
            if (window.contractAddresses && window.getContractAddress && window.currentNetwork) {
                console.log(`Contract addresses loaded successfully, currentNetwork: ${window.currentNetwork}`);
                return true;
            }
            await this.wait(100);
            attempts++;
        }
        
        console.warn('Contract addresses not loaded within timeout, proceeding with defaults');
        return false;
    }
    
    /**
     * Synchronize network configuration between different components
     */
    synchronizeNetworkConfiguration() {
        console.log('Synchronizing network configuration...');
        
        // Check if contractAddresses.js has loaded and set a network
        if (window.currentNetwork) {
            console.log(`Found existing network configuration: ${window.currentNetwork}`);
            
            // Validate the network value
            if (window.currentNetwork !== 'MAIN' && window.currentNetwork !== 'TEST') {
                console.warn(`Invalid network value found: ${window.currentNetwork}, resetting to TEST`);
                window.currentNetwork = 'TEST';
            }
        } else {
            // Set default network if none is configured
            console.log('No network configuration found, setting default to TEST');
            window.currentNetwork = 'TEST';
        }
        
        // Ensure CONTRACT_NETWORKS is available
        if (!window.CONTRACT_NETWORKS) {
            console.warn('CONTRACT_NETWORKS not found, creating default configuration');
            window.CONTRACT_NETWORKS = {
                TEST: 'TEST',
                MAIN: 'MAIN',
                LOCAL: 'LOCAL'
            };
        }
        
        console.log(`Network configuration synchronized: ${window.currentNetwork}`);
    }
    
    /**
     * Check if auto-authentication is possible based on auto-lock settings
     */
    async checkAutoAuthentication() {
        try {
            // Check if we have stored keys
            if (Object.keys(this.keyMetadata).length === 0) {
                console.log('No stored keys found, skipping auto-authentication');
                return;
            }
            
            // Use WalletSessionManager if available
            if (window.WalletSessionManager && window.WalletSessionManager.isReady()) {
                const validSession = window.WalletSessionManager.getValidSession();
                
                if (validSession) {
                    console.log('Valid session found, attempting auto-authentication');
                    await this.attemptAutoAuthenticationWithSession(validSession);
                    return;
                } else {
                    console.log('No valid session found or session expired');
                    this.isLocked = true;
                    return;
                }
            }
            
            // Fallback to old method if WalletSessionManager is not available
            console.log('WalletSessionManager not available, using fallback method');
            await this.attemptLegacyAutoAuthentication();
        } catch (error) {
            console.error('Error during auto-authentication check:', error);
        }
    }
    
    /**
     * Attempt auto-authentication using WalletSessionManager session data
     */
    async attemptAutoAuthenticationWithSession(sessionData) {
        try {
            // Check if the active key still exists
            if (!this.keyMetadata[sessionData.activeKeyId]) {
                console.log('Active key from session no longer exists');
                if (window.WalletSessionManager) {
                    await window.WalletSessionManager.clearSession();
                }
                return;
            }
            
            // Set authentication state
            this.isAuthenticated = true;
            this.masterPassword = atob(sessionData.masterPasswordHash); // Decode from base64
            this.activeKeyId = sessionData.activeKeyId;
            this.isLocked = false;
            
            // Load the active key
            const encryptedKey = localStorage.getItem(`wallet_encrypted_key_${this.activeKeyId}`);
            if (encryptedKey) {
                const privateKey = this.decrypt(encryptedKey, this.masterPassword);
                if (privateKey && this.validatePrivateKey(privateKey)) {
                    this.privateKey = privateKey;
                    this.encryptedKey = encryptedKey;
                    
                    // Update metadata
                    Object.keys(this.keyMetadata).forEach(id => {
                        this.keyMetadata[id].isActive = (id === this.activeKeyId);
                    });
                    
                    // Initialize account
                    const success = await this.initializeAccount();
                    if (success) {
                        console.log('Auto-authentication successful with session manager, wallet ready');
                        
                        // Start auto-lock timer
                        this.resetAutoLockTimer();
                        
                        return;
                    }
                }
            }
            
            console.log('Failed to auto-authenticate with session, clearing session data');
            if (window.WalletSessionManager) {
                await window.WalletSessionManager.clearSession();
            }
            this.isAuthenticated = false;
            this.masterPassword = null;
            this.isLocked = true;
        } catch (error) {
            console.error('Error during session-based auto-authentication:', error);
            if (window.WalletSessionManager) {
                await window.WalletSessionManager.clearSession();
            }
            this.isAuthenticated = false;
            this.masterPassword = null;
            this.isLocked = true;
        }
    }
    
    /**
     * Legacy auto-authentication method (fallback)
     */
    async attemptLegacyAutoAuthentication() {
        try {
            // Check auto-lock settings
            const autoLockTime = this.getAutoLockTime();
            const lastAuthTime = localStorage.getItem('wallet_last_auth_time');
            
            console.log('Auto-lock time:', autoLockTime);
            console.log('Last auth time:', lastAuthTime);
            
            if (autoLockTime === 'never') {
                console.log('Auto-lock is set to never, attempting auto-authentication');
                await this.attemptAutoAuthentication();
                return;
            }
            
            if (!lastAuthTime) {
                console.log('No last auth time found, user needs to authenticate');
                return;
            }
            
            // Calculate time since last authentication
            const timeSinceAuth = Date.now() - parseInt(lastAuthTime);
            const autoLockMs = this.getAutoLockTimeInMs(autoLockTime);
            
            console.log('Time since auth:', timeSinceAuth, 'Auto-lock time (ms):', autoLockMs);
            
            if (timeSinceAuth < autoLockMs) {
                console.log('Within auto-lock time window, attempting auto-authentication');
                await this.attemptAutoAuthentication();
            } else {
                console.log('Auto-lock time expired, user needs to re-authenticate');
                this.isLocked = true;
            }
        } catch (error) {
            console.error('Error during legacy auto-authentication:', error);
        }
    }
    
    /**
     * Attempt auto-authentication using session data (legacy method)
     */
    async attemptAutoAuthentication() {
        try {
            // Check if we have session authentication data
            const sessionAuth = sessionStorage.getItem('wallet_session_auth');
            if (!sessionAuth) {
                console.log('No session authentication data found');
                return;
            }
            
            // Parse session data
            const authData = JSON.parse(sessionAuth);
            if (!authData.masterPasswordHash || !authData.activeKeyId) {
                console.log('Invalid session authentication data');
                return;
            }
            
            // Check if the active key still exists
            if (!this.keyMetadata[authData.activeKeyId]) {
                console.log('Active key from session no longer exists');
                sessionStorage.removeItem('wallet_session_auth');
                return;
            }
            
            // Set authentication state
            this.isAuthenticated = true;
            this.masterPassword = atob(authData.masterPasswordHash); // Decode from base64
            this.activeKeyId = authData.activeKeyId;
            this.isLocked = false;
            
            // Load the active key
            const encryptedKey = localStorage.getItem(`wallet_encrypted_key_${this.activeKeyId}`);
            if (encryptedKey) {
                const privateKey = this.decrypt(encryptedKey, this.masterPassword);
                if (privateKey && this.validatePrivateKey(privateKey)) {
                    this.privateKey = privateKey;
                    this.encryptedKey = encryptedKey;
                    
                    // Update metadata
                    Object.keys(this.keyMetadata).forEach(id => {
                        this.keyMetadata[id].isActive = (id === this.activeKeyId);
                    });
                    
                    // Initialize account
                    const success = await this.initializeAccount();
                    if (success) {
                        console.log('Legacy auto-authentication successful, wallet ready');
                        
                        // Start auto-lock timer
                        this.resetAutoLockTimer();
                        
                        return;
                    }
                }
            }
            
            console.log('Failed to auto-authenticate (legacy), clearing session data');
            sessionStorage.removeItem('wallet_session_auth');
            this.isAuthenticated = false;
            this.masterPassword = null;
            this.isLocked = true;
        } catch (error) {
            console.error('Error during legacy auto-authentication:', error);
            sessionStorage.removeItem('wallet_session_auth');
            this.isAuthenticated = false;
            this.masterPassword = null;
            this.isLocked = true;
        }
    }
    
    /**
     * Convert auto-lock time string to milliseconds
     */
    getAutoLockTimeInMs(autoLockTime) {
        switch (autoLockTime) {
            case '24h': return 24 * 60 * 60 * 1000;
            case '3d': return 3 * 24 * 60 * 60 * 1000;
            case '7d': return 7 * 24 * 60 * 60 * 1000;
            case '14d': return 14 * 24 * 60 * 60 * 1000;
            case '30d': return 30 * 24 * 60 * 60 * 1000;
            case '90d': return 90 * 24 * 60 * 60 * 1000;
            case 'never': return Infinity;
            default: return 24 * 60 * 60 * 1000; // Default to 24 hours
        }
    }
    
    /**
     * Simple encryption function (for demo - use stronger encryption in production)
     * @param {string} text - Text to encrypt
     * @param {string} password - Password for encryption
     * @returns {string} - Encrypted text
     */
    encrypt(text, password) {
        // Simple XOR encryption (replace with AES in production)
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ password.charCodeAt(i % password.length)
            );
        }
        return btoa(result); // Base64 encode
    }
    
    /**
     * Simple decryption function
     * @param {string} encryptedText - Encrypted text
     * @param {string} password - Password for decryption
     * @returns {string} - Decrypted text
     */
    decrypt(encryptedText, password) {
        try {
            const text = atob(encryptedText); // Base64 decode
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(
                    text.charCodeAt(i) ^ password.charCodeAt(i % password.length)
                );
            }
            return result;
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
    
    /**
     * Store private key with encryption and auto-activate (enhanced)
     * @param {string} privateKey - The private key to store
     * @param {string} password - Password for encryption
     * @returns {boolean} - Success status
     */
    async storePrivateKey(privateKey, password) {
        try {
            // Validate private key format
            if (!this.validatePrivateKey(privateKey)) {
                throw new Error('Invalid private key format');
            }
            
            // Encrypt the private key
            const encrypted = this.encrypt(privateKey, password);
            
            // Store encrypted key
            localStorage.setItem('wallet_encrypted_key', encrypted);
            localStorage.setItem('wallet_key_timestamp', Date.now().toString());
            localStorage.setItem('wallet_password_hash', btoa(password)); // Store password for auto-unlock
            
            this.encryptedKey = encrypted;
            this.privateKey = privateKey;
            this.isLocked = false; // Unlock when storing new key
            
            // Initialize Web3 and account with retry mechanism
            console.log('Private key stored, initializing Web3 and account...');
            const success = await this.initializeAccount();
            
            if (success) {
                console.log('Private key stored and activated successfully');
                
                // Start auto-lock timer
                this.resetAutoLockTimer();
                
                return true;
            } else {
                console.error('Private key stored but failed to initialize account');
                return false;
            }
        } catch (error) {
            console.error('Failed to store private key:', error);
            return false;
        }
    }
    
    /**
     * Remove stored private key
     */
    removeStoredKey() {
        localStorage.removeItem('wallet_encrypted_key');
        localStorage.removeItem('wallet_key_timestamp');
        localStorage.removeItem('wallet_password_hash');
        
        // Clear auto-lock timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
        
        this.encryptedKey = null;
        this.privateKey = null;
        this.account = null;
        this.isLocked = false; // Reset lock state
        
        console.log('Stored private key removed');
    }
    
    /**
     * Validate private key format
     * @param {string} privateKey - Private key to validate
     * @returns {boolean} - Validation result
     */
    validatePrivateKey(privateKey) {
        // Remove 0x prefix if present
        const cleanKey = privateKey.replace(/^0x/, '');
        
        // Check if it's 64 hex characters
        return /^[a-fA-F0-9]{64}$/.test(cleanKey);
    }
    
    /**
     * Load stored key and auto-activate if available (enhanced)
     */
    async loadStoredKey() {
        const stored = localStorage.getItem('wallet_encrypted_key');
        const timestamp = localStorage.getItem('wallet_key_timestamp');
        const passwordHash = localStorage.getItem('wallet_password_hash');
        
        if (stored && timestamp && passwordHash) {
            // Check if key is not too old (optional security measure)
            const keyAge = Date.now() - parseInt(timestamp);
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            
            if (keyAge < maxAge) {
                this.encryptedKey = stored;
                
                try {
                    // Auto-decrypt with stored password
                    const password = atob(passwordHash);
                    const decryptedKey = this.decrypt(stored, password);
                    
                    if (decryptedKey && this.validatePrivateKey(decryptedKey)) {
                        this.privateKey = decryptedKey;
                        this.isLocked = false; // Unlock when auto-loading
                        console.log('Private key auto-loaded, initializing account...');
                        
                        // Initialize account with retry mechanism
                        const success = await this.initializeAccount();
                        
                        if (success) {
                            console.log('Private key auto-loaded and activated successfully');
                            
                            // Start auto-lock timer
                            this.resetAutoLockTimer();
                        } else {
                            console.warn('Private key loaded but failed to initialize account');
                        }
                    } else {
                        console.warn('Failed to auto-decrypt stored key');
                        this.removeStoredKey();
                    }
                } catch (error) {
                    console.error('Error auto-loading key:', error);
                    this.removeStoredKey();
                }
            } else {
                console.log('Stored key expired, removing...');
                this.removeStoredKey();
            }
        }
    }
    
    /**
     * Initialize Web3 instance with retry mechanism and multiple RPC endpoints
     */
    async initializeWeb3WithRetry() {
        if (typeof Web3 === 'undefined') {
            console.warn('Web3 not available');
            return false;
        }

        // Get current network from contractAddresses.js with proper fallback handling
        let currentNetwork = window.currentNetwork;
        
        // If currentNetwork is not set, check if CONTRACT_NETWORKS is available
        if (!currentNetwork && window.CONTRACT_NETWORKS) {
            // Default to TEST if no network is explicitly set
            currentNetwork = window.CONTRACT_NETWORKS.TEST || 'TEST';
            console.warn('No currentNetwork set, defaulting to TEST network');
        } else if (!currentNetwork) {
            // Fallback if CONTRACT_NETWORKS is also not available
            currentNetwork = 'TEST';
            console.warn('No network configuration found, defaulting to TEST network');
        }
        
        // Ensure we have a valid network value
        if (currentNetwork !== 'MAIN' && currentNetwork !== 'TEST') {
            console.warn(`Invalid network value: ${currentNetwork}, defaulting to TEST`);
            currentNetwork = 'TEST';
        }
        
        console.log(`Network configuration: currentNetwork=${currentNetwork}, window.currentNetwork=${window.currentNetwork}`);
        console.log(`Contract addresses available:`, !!window.contractAddresses);
        console.log(`Contract networks available:`, !!window.CONTRACT_NETWORKS);
        
        if (window.contractAddresses) {
            console.log(`Available networks in contractAddresses:`, Object.keys(window.contractAddresses));
            if (window.contractAddresses[currentNetwork]) {
                console.log(`Contracts available for ${currentNetwork}:`, Object.keys(window.contractAddresses[currentNetwork]));
            }
        }
        
        let rpcUrls;
        let networkName;
        
        // Choose RPC URLs based on current network
        if (currentNetwork === 'MAIN' || currentNetwork === window.CONTRACT_NETWORKS?.MAIN) {
            rpcUrls = this.rpcEndpoints.mainnet;
            networkName = 'BSC Mainnet';
        } else {
            rpcUrls = this.rpcEndpoints.testnet;
            networkName = 'BSC Testnet';
        }
        
        console.log(`Initializing Web3 with ${networkName} (${currentNetwork} network)`);
        
        // Try each RPC endpoint until one works
        for (let i = 0; i < rpcUrls.length; i++) {
            const rpcUrl = rpcUrls[i];
            console.log(`Trying RPC endpoint ${i + 1}/${rpcUrls.length}: ${rpcUrl}`);
            
            try {
                // Enhanced Web3 provider configuration for better reliability
                const providerOptions = {
                    timeout: 15000, // Increased timeout to 15 seconds
                    keepAlive: true,
                    headers: [{
                        name: 'Access-Control-Allow-Origin',
                        value: '*'
                    }],
                    // Add retry configuration
                    reconnect: {
                        auto: true,
                        delay: 5000,
                        maxAttempts: 3,
                        onTimeout: false
                    }
                };
                
                const web3Instance = new Web3(new Web3.providers.HttpProvider(rpcUrl, providerOptions));
                
                // Enhanced connection testing with better error handling
                console.log('Testing Web3 connection with enhanced verification...');
                
                // Test with progressive timeouts and multiple checks
                const connectionTests = [
                    // Test 1: Basic network connectivity
                    async () => {
                        const networkId = await Promise.race([
                            web3Instance.eth.net.getId(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Network ID timeout')), 8000)
                            )
                        ]);
                        return { networkId };
                    },
                    
                    // Test 2: Block number retrieval
                    async () => {
                        const blockNumber = await Promise.race([
                            web3Instance.eth.getBlockNumber(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Block number timeout')), 8000)
                            )
                        ]);
                        return { blockNumber };
                    },
                    
                    // Test 3: Gas price retrieval (important for contract calls)
                    async () => {
                        try {
                            const gasPrice = await Promise.race([
                                web3Instance.eth.getGasPrice(),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Gas price timeout')), 8000)
                                )
                            ]);
                            return { gasPrice };
                        } catch (gasPriceError) {
                            console.warn('Gas price test failed, but continuing:', gasPriceError.message);
                            return { gasPrice: 'unavailable' };
                        }
                    }
                ];
                
                // Run all tests
                const testResults = {};
                for (let testIndex = 0; testIndex < connectionTests.length; testIndex++) {
                    try {
                        const result = await connectionTests[testIndex]();
                        Object.assign(testResults, result);
                        console.log(`Connection test ${testIndex + 1} passed:`, result);
                    } catch (testError) {
                        console.warn(`Connection test ${testIndex + 1} failed:`, testError.message);
                        
                        // If critical tests fail, throw error
                        if (testIndex < 2) { // Network ID and block number are critical
                            throw testError;
                        }
                    }
                }
                
                // Verify we're connected to the correct network
                const expectedChainId = (currentNetwork === 'MAIN' || currentNetwork === window.CONTRACT_NETWORKS?.MAIN) ? 56 : 97;
                if (testResults.networkId && testResults.networkId !== expectedChainId) {
                    const actualNetwork = testResults.networkId === 56 ? 'MAIN' : (testResults.networkId === 97 ? 'TEST' : 'UNKNOWN');
                    console.error(`CRITICAL: Network ID mismatch detected!`);
                    console.error(`Expected: ${expectedChainId} (${currentNetwork} network)`);
                    console.error(`Actual: ${testResults.networkId} (${actualNetwork} network)`);
                    console.error(`This will cause contract call failures!`);
                    
                    // This is a critical error that will cause contract failures
                    throw new Error(`Network mismatch: connected to chain ${testResults.networkId} but expected ${expectedChainId}. Contract addresses won't match!`);
                }
                
                // Additional Web3 instance validation
                if (!web3Instance.eth || !web3Instance.utils) {
                    throw new Error('Web3 instance missing required modules (eth or utils)');
                }
                
                // Test basic utility functions
                try {
                    const testWei = web3Instance.utils.toWei('1', 'ether');
                    const testEther = web3Instance.utils.fromWei(testWei, 'ether');
                    if (testEther !== '1') {
                        throw new Error('Web3 utils functions not working correctly');
                    }
                } catch (utilsError) {
                    console.warn('Web3 utils test failed:', utilsError.message);
                }
                
                console.log(`Successfully connected to ${networkName} via ${rpcUrl}`);
                console.log('Connection test results:', testResults);
                
                this.web3Instance = web3Instance;
                
                // Set gas settings for this instance
                this.configureGasSettings(web3Instance, testResults.gasPrice);
                
                // Verify network consistency after successful connection
                this.verifyNetworkConsistency(testResults.networkId, currentNetwork);
                
                return true;
                
            } catch (error) {
                console.warn(`Failed to connect to ${rpcUrl}:`, error.message);
                
                // Provide specific error analysis
                if (error.message.includes('timeout')) {
                    console.warn('Connection timeout - network may be slow or overloaded');
                } else if (error.message.includes('network')) {
                    console.warn('Network connectivity issue detected');
                } else if (error.message.includes('Out of Gas')) {
                    console.warn('Gas-related issue during connection test');
                }
                
                // If this is not the last endpoint, continue to the next one
                if (i < rpcUrls.length - 1) {
                    console.log('Trying next RPC endpoint...');
                    continue;
                }
            }
        }
        
        console.error(`Failed to connect to any ${networkName} RPC endpoint`);
        return false;
    }
    
    /**
     * Configure gas settings for the Web3 instance
     */
    configureGasSettings(web3Instance, currentGasPrice) {
        try {
            if (!currentGasPrice || currentGasPrice === 'unavailable') {
                console.log('Using default gas settings');
                return;
            }
            
            // Convert gas price to gwei for logging
            const gasPriceGwei = web3Instance.utils.fromWei(currentGasPrice.toString(), 'gwei');
            console.log(`Current network gas price: ${gasPriceGwei} gwei`);
            
            // Check if current gas price exceeds our limit
            const maxGasPrice = this.gasSettings.maxGasPrice;
            if (maxGasPrice && parseInt(currentGasPrice) > parseInt(maxGasPrice)) {
                const maxGasPriceGwei = web3Instance.utils.fromWei(maxGasPrice, 'gwei');
                console.log(`Network gas price (${gasPriceGwei} gwei) exceeds limit (${maxGasPriceGwei} gwei)`);
            }
            
        } catch (gasConfigError) {
            console.warn('Failed to configure gas settings:', gasConfigError.message);
        }
    }
    
    /**
     * Verify network consistency between Web3 connection and configuration
     */
    verifyNetworkConsistency(actualNetworkId, configuredNetwork) {
        try {
            const expectedNetworkId = configuredNetwork === 'MAIN' ? 56 : 97;
            const actualNetwork = actualNetworkId === 56 ? 'MAIN' : (actualNetworkId === 97 ? 'TEST' : 'UNKNOWN');
            
            console.log(`Network consistency check:`);
            console.log(`- Configured network: ${configuredNetwork} (expected chain ID: ${expectedNetworkId})`);
            console.log(`- Actual connection: Chain ID ${actualNetworkId} (${actualNetwork} network)`);
            
            if (actualNetworkId === expectedNetworkId) {
                console.log('✅ Network configuration is consistent');
                
                // Additional verification: check if contract addresses exist for this network
                this.verifyContractAddressesForNetwork(configuredNetwork);
                
                return true;
            } else {
                console.error('❌ Network configuration mismatch detected!');
                console.error('This will cause contract call failures because:');
                console.error(`- Contract addresses are configured for ${configuredNetwork} network`);
                console.error(`- But Web3 is connected to ${actualNetwork} network`);
                console.error('- The contracts do not exist at those addresses on the connected network');
                
                // Log specific guidance
                if (configuredNetwork === 'MAIN' && actualNetwork === 'TEST') {
                    console.error('SOLUTION: Either switch to mainnet RPC or change contract configuration to TEST network');
                } else if (configuredNetwork === 'TEST' && actualNetwork === 'MAIN') {
                    console.error('SOLUTION: Either switch to testnet RPC or change contract configuration to MAIN network');
                }
                
                return false;
            }
        } catch (error) {
            console.error('Error during network consistency verification:', error);
            return false;
        }
    }
    
    /**
     * Verify that contract addresses are available for the current network
     */
    verifyContractAddressesForNetwork(network) {
        try {
            if (!window.contractAddresses || !window.contractAddresses[network]) {
                console.error(`❌ No contract addresses found for ${network} network!`);
                return false;
            }
            
            const addresses = window.contractAddresses[network];
            const requiredContracts = ['PwPoint', 'PwFood', 'PwBounty', 'PwNFT', 'NFTManager'];
            const missingContracts = [];
            
            for (const contractName of requiredContracts) {
                if (!addresses[contractName]) {
                    missingContracts.push(contractName);
                }
            }
            
            if (missingContracts.length > 0) {
                console.warn(`⚠️ Missing contract addresses for ${network} network:`, missingContracts);
                return false;
            }
            
            console.log(`✅ All required contract addresses found for ${network} network`);
            console.log(`Available contracts:`, Object.keys(addresses));
            return true;
        } catch (error) {
            console.error('Error verifying contract addresses:', error);
            return false;
        }
    }
    
    /**
     * Initialize Web3 instance (legacy method for backward compatibility)
     */
    async initializeWeb3() {
        return await this.initializeWeb3WithRetry();
    }
    
    /**
     * Initialize account from private key with enhanced retry mechanism
     */
    async initializeAccount() {
        const networkInfo = this.getCurrentNetworkInfo();
        console.log('Attempting to initialize account...', {
            hasWeb3Instance: !!this.web3Instance,
            hasPrivateKey: !!this.privateKey,
            privateKeyLength: this.privateKey ? this.privateKey.length : 0,
            web3Available: typeof Web3 !== 'undefined',
            networkInfo: networkInfo
        });
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Ensure Web3 is initialized first
                if (!this.web3Instance) {
                    console.log(`Attempt ${attempt}: Web3 instance not found, initializing...`);
                    const success = await this.initializeWeb3WithRetry();
                    if (!success) {
                        throw new Error('Failed to initialize Web3');
                    }
                }
                
                if (this.web3Instance && this.privateKey) {
                    // Add 0x prefix if not present
                    const privateKey = this.privateKey.startsWith('0x') ? 
                        this.privateKey : '0x' + this.privateKey;
                    
                    console.log(`Attempt ${attempt}: Creating account from private key...`);
                    this.account = this.web3Instance.eth.accounts.privateKeyToAccount(privateKey);
                    
                    // Verify the account by checking if we can get the address
                    if (this.account && this.account.address) {
                        console.log(`Account initialized successfully on attempt ${attempt}:`, this.account.address);
                        
                        // Test the account by trying to get balance (optional verification)
                        try {
                            await Promise.race([
                                this.web3Instance.eth.getBalance(this.account.address),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Balance check timeout')), 5000)
                                )
                            ]);
                            console.log('Account verification successful - balance check passed');
                        } catch (balanceError) {
                            console.warn('Account balance check failed, but account creation succeeded:', balanceError.message);
                        }
                        
                        return true;
                    } else {
                        throw new Error('Account creation returned invalid result');
                    }
                } else {
                    throw new Error(`Missing requirements - Web3: ${!!this.web3Instance}, PrivateKey: ${!!this.privateKey}`);
                }
            } catch (error) {
                console.error(`Account initialization attempt ${attempt} failed:`, error);
                
                if (attempt < this.maxRetries) {
                    console.log(`Retrying in ${this.retryDelay}ms...`);
                    await this.wait(this.retryDelay);
                    // Increase delay for next attempt
                    this.retryDelay *= 1.5;
                } else {
                    console.error('All account initialization attempts failed');
                    return false;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get current account address
     * @returns {string|null} - Account address or null
     */
    getAddress() {
        return this.account ? this.account.address : null;
    }
    
    /**
     * Get Web3 instance
     * @returns {Web3|null} - Web3 instance or null
     */
    getWeb3() {
        return this.web3Instance;
    }
    
    /**
     * Get account object
     * @returns {object|null} - Account object or null
     */
    getAccount() {
        return this.account;
    }
    
    /**
     * Check if wallet is ready (has private key and account)
     * @returns {boolean} - Ready status
     */
    isWalletReady() {
        return this.privateKey !== null && this.account !== null;
    }
    
    /**
     * Enhanced hasStoredKey method for multi-key support
     * @returns {boolean} - Whether any keys are stored
     */
    hasStoredKey() {
        // Check if we have any keys in metadata
        const hasKeys = Object.keys(this.keyMetadata).length > 0;
        
        // Also check legacy single key storage for backward compatibility
        const hasLegacyKey = localStorage.getItem('wallet_encrypted_key') !== null;
        
        // If we have legacy key but no metadata, migrate it
        if (hasLegacyKey && !hasKeys) {
            this.migrateLegacyKey();
            return Object.keys(this.keyMetadata).length > 0;
        }
        
        return hasKeys;
    }
    
    /**
     * Sign transaction
     * @param {object} txData - Transaction data
     * @returns {Promise<object>} - Signed transaction
     */
    async signTransaction(txData) {
        if (!this.isWalletReady()) {
            throw new Error('Wallet is not ready');
        }
        
        try {
            const signedTx = await this.account.signTransaction(txData);
            return signedTx;
        } catch (error) {
            console.error('Failed to sign transaction:', error);
            throw error;
        }
    }
    
    /**
     * Send transaction
     * @param {object} txData - Transaction data
     * @returns {Promise<object>} - Transaction receipt
     */
    async sendTransaction(txData) {
        if (!this.isWalletReady()) {
            throw new Error('Wallet is not ready');
        }
        
        try {
            // Add from address
            txData.from = this.account.address;
            
            // Sign and send transaction
            const signedTx = await this.signTransaction(txData);
            const receipt = await this.web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction);
            
            console.log('Transaction sent:', receipt.transactionHash);
            return receipt;
        } catch (error) {
            console.error('Failed to send transaction:', error);
            throw error;
        }
    }
    
    /**
     * Get balance
     * @returns {Promise<string>} - Balance in BNB
     */
    async getBalance() {
        if (!this.account || !this.web3Instance) {
            throw new Error('Wallet not initialized');
        }
        
        try {
            const balance = await this.web3Instance.eth.getBalance(this.account.address);
            return this.web3Instance.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Failed to get balance:', error);
            throw error;
        }
    }
    
    /**
     * Check if private key wallet should be used (is ready and available)
     * @returns {boolean} - Whether to use private key wallet
     */
    shouldUsePrivateKeyWallet() {
        return this.isWalletReady();
    }
    
    /**
     * Get the current active wallet address (prioritizes private key wallet)
     * @returns {string|null} - Active wallet address or null
     */
    getActiveWalletAddress() {
        // Priority 1: Private key wallet if ready
        if (this.shouldUsePrivateKeyWallet()) {
            return this.account.address;
        }
        
        // Priority 2: Connected wallet from sessionStorage/localStorage
        const connectedAddress = sessionStorage.getItem('walletAddress') || 
                                localStorage.getItem('walletAddress');
        
        return connectedAddress;
    }
    
    /**
     * Get wallet connection status with enhanced reliability check
     * @returns {object} - Wallet status information
     */
    getWalletStatus() {
        const privateKeyReady = this.shouldUsePrivateKeyWallet();
        const connectedWallet = sessionStorage.getItem('walletConnected') === 'true' || 
                               localStorage.getItem('walletConnected') === 'true';
        const activeAddress = this.getActiveWalletAddress();
        
        const status = {
            hasWallet: privateKeyReady || connectedWallet,
            usingPrivateKey: privateKeyReady,
            usingConnectedWallet: connectedWallet && !privateKeyReady,
            activeAddress: activeAddress,
            walletType: privateKeyReady ? 'privateKey' : 
                       (connectedWallet ? (localStorage.getItem('walletType') || 'metamask') : null),
            isReady: privateKeyReady && !!this.web3Instance,
            web3Available: !!this.web3Instance
        };
        
        // Enhanced debug logging
        const networkInfo = this.getCurrentNetworkInfo();
        console.log('SecureWalletManager.getWalletStatus():', {
            isReady: this.isWalletReady(),
            hasAccount: !!this.account,
            accountAddress: this.account ? this.account.address : null,
            hasStoredKey: this.hasStoredKey(),
            hasWeb3Instance: !!this.web3Instance,
            privateKeyReady: privateKeyReady,
            connectedWallet: connectedWallet,
            networkInfo: networkInfo,
            isInitializing: this.isInitializing,
            status: status
        });
        
        return status;
    }
    
    /**
     * Force reinitialize account with enhanced retry (useful for debugging)
     * @returns {boolean} - Success status
     */
    async forceReinitializeAccount() {
        console.log('Force reinitializing account with enhanced retry...');
        
        if (!this.privateKey) {
            console.error('Cannot reinitialize: no private key available');
            return false;
        }
        
        // Reset account and Web3 instance
        this.account = null;
        this.web3Instance = null;
        
        // Reset retry delay
        this.retryDelay = 1000;
        
        // Reinitialize Web3 and account
        const web3Success = await this.initializeWeb3WithRetry();
        if (!web3Success) {
            console.error('Failed to reinitialize Web3');
            return false;
        }
        
        const accountSuccess = await this.initializeAccount();
        if (accountSuccess) {
            console.log('Account reinitialized successfully');
        } else {
            console.error('Failed to reinitialize account');
        }
        
        return accountSuccess;
    }
    
    /**
     * Wait for specified milliseconds
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} - Promise that resolves after the specified time
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Check if wallet manager is ready for use
     * @returns {boolean} - Ready status
     */
    isManagerReady() {
        return !this.isInitializing && this.isWalletReady();
    }
    
    /**
     * Get current network information
     * @returns {object} - Network information
     */
    getCurrentNetworkInfo() {
        const currentNetwork = window.currentNetwork || window.CONTRACT_NETWORKS?.TEST || 'TEST';
        
        let chainId, networkName, rpcUrl;
        
        if (currentNetwork === 'MAIN' || currentNetwork === window.CONTRACT_NETWORKS?.MAIN) {
            chainId = 56; // BSC Mainnet
            networkName = 'BSC Mainnet';
            rpcUrl = 'https://bsc-dataseed1.binance.org/';
        } else {
            chainId = 97; // BSC Testnet
            networkName = 'BSC Testnet';
            rpcUrl = 'https://bsc-testnet-dataseed.bnbchain.org/';
        }
        
        return {
            currentNetwork,
            chainId,
            networkName,
            rpcUrl
        };
    }
    
    /**
     * Debug network configuration - provides comprehensive network status
     * @returns {object} - Detailed network debug information
     */
    debugNetworkConfiguration() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            windowCurrentNetwork: window.currentNetwork,
            contractNetworks: window.CONTRACT_NETWORKS,
            hasContractAddresses: !!window.contractAddresses,
            contractAddressesKeys: window.contractAddresses ? Object.keys(window.contractAddresses) : [],
            web3Connected: !!this.web3Instance,
            web3NetworkId: null,
            walletReady: this.isWalletReady(),
            accountAddress: this.getAddress()
        };
        
        // Get Web3 network ID if available
        if (this.web3Instance) {
            try {
                this.web3Instance.eth.net.getId().then(networkId => {
                    debugInfo.web3NetworkId = networkId;
                    console.log('Updated debug info with network ID:', networkId);
                }).catch(error => {
                    console.warn('Failed to get network ID for debug info:', error);
                });
            } catch (error) {
                console.warn('Error getting network ID for debug:', error);
            }
        }
        
        // Check contract addresses for current network
        if (window.contractAddresses && window.currentNetwork) {
            debugInfo.currentNetworkAddresses = window.contractAddresses[window.currentNetwork] || null;
            debugInfo.availableContracts = debugInfo.currentNetworkAddresses ? 
                Object.keys(debugInfo.currentNetworkAddresses) : [];
        }
        
        console.log('🔍 Network Configuration Debug Info:', debugInfo);
        return debugInfo;
    }
    
    /**
     * Send contract transaction with private key wallet
     * @param {object} contract - Web3 contract instance
     * @param {string} methodName - Contract method name
     * @param {array} methodParams - Method parameters
     * @param {object} txOptions - Transaction options (gas, gasPrice, etc.)
     * @returns {Promise<object>} - Transaction receipt
     */
    async sendContractTransaction(contract, methodName, methodParams = [], txOptions = {}) {
        if (!this.isWalletReady()) {
            throw new Error('Wallet is not ready');
        }
        
        if (!contract || !contract.methods || !contract.methods[methodName]) {
            throw new Error(`Contract method ${methodName} not found`);
        }
        
        try {
            console.log(`Sending contract transaction: ${methodName}`, {
                params: methodParams,
                options: txOptions
            });
            
            // Get contract method
            const method = contract.methods[methodName](...methodParams);
            
            // Estimate gas if not provided
            let gasLimit = txOptions.gas;
            if (!gasLimit) {
                try {
                    gasLimit = await method.estimateGas({ from: this.account.address });
                    gasLimit = Math.floor(gasLimit * 1.2); // Add 20% buffer
                    console.log(`Estimated gas: ${gasLimit}`);
                } catch (gasError) {
                    console.warn('Gas estimation failed, using default:', gasError);
                    gasLimit = 1000000; // Default gas limit
                }
            }
            
            // Get gas price if not provided
            let gasPrice = txOptions.gasPrice;
            if (!gasPrice) {
                try {
                    const networkGasPrice = await this.web3Instance.eth.getGasPrice();
                    gasPrice = this.getSafeGasPrice(networkGasPrice);
                    console.log(`Network gas price: ${this.web3Instance.utils.fromWei(networkGasPrice, 'gwei')} gwei, Using: ${this.web3Instance.utils.fromWei(gasPrice, 'gwei')} gwei`);
                } catch (gasPriceError) {
                    console.warn('Gas price fetch failed, using default:', gasPriceError);
                    gasPrice = this.getSafeGasPrice(null); // Use user's limit as fallback
                }
            }
            
            // Get nonce
            const nonce = await this.web3Instance.eth.getTransactionCount(this.account.address, 'pending');
            
            // Prepare transaction data
            const txData = {
                to: contract._address,
                data: method.encodeABI(),
                gas: gasLimit,
                gasPrice: gasPrice,
                nonce: nonce,
                from: this.account.address
            };
            
            // Add value if specified
            if (txOptions.value) {
                txData.value = txOptions.value;
            }
            
            console.log('Transaction data prepared:', {
                to: txData.to,
                gas: txData.gas,
                gasPrice: txData.gasPrice,
                nonce: txData.nonce,
                hasData: !!txData.data
            });
            
            // Sign and send transaction
            const signedTx = await this.account.signTransaction(txData);
            console.log('Transaction signed, sending...');
            
            const receipt = await this.web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Contract transaction successful:', receipt.transactionHash);
            
            return receipt;
        } catch (error) {
            console.error(`Failed to send contract transaction ${methodName}:`, error);
            throw error;
        }
    }
    
    /**
     * Estimate gas for contract transaction
     * @param {object} contract - Web3 contract instance
     * @param {string} methodName - Contract method name
     * @param {array} methodParams - Method parameters
     * @returns {Promise<number>} - Estimated gas
     */
    async estimateContractGas(contract, methodName, methodParams = []) {
        if (!this.isWalletReady()) {
            throw new Error('Wallet is not ready');
        }
        
        if (!contract || !contract.methods || !contract.methods[methodName]) {
            throw new Error(`Contract method ${methodName} not found`);
        }
        
        try {
            const method = contract.methods[methodName](...methodParams);
            const gasEstimate = await method.estimateGas({ from: this.account.address });
            return Math.floor(gasEstimate * 1.2); // Add 20% buffer
        } catch (error) {
            console.error(`Failed to estimate gas for ${methodName}:`, error);
            return 1000000; // Default gas limit
        }
    }
    
    /**
     * Check if using private key wallet for transactions
     * @returns {boolean} - Whether to use private key wallet for transactions
     */
    shouldUsePrivateKeyForTransactions() {
        return this.isWalletReady() && this.web3Instance && this.account;
    }
    
    /**
     * Load gas settings from localStorage
     */
    loadGasSettings() {
        try {
            // Use unified storage key for all networks
            const storageKey = 'wallet_max_gas_price_unified';
            
            const savedMaxGasPrice = localStorage.getItem(storageKey);
            if (savedMaxGasPrice) {
                this.gasSettings.maxGasPrice = savedMaxGasPrice;
                console.log(`Loaded unified max gas price setting:`, this.web3Instance ? 
                    this.web3Instance.utils.fromWei(savedMaxGasPrice, 'gwei') + ' gwei' : savedMaxGasPrice);
            } else {
                // Set default unified gas price
                this.setDefaultGasPrice();
            }
        } catch (error) {
            console.error('Failed to load gas settings:', error);
            this.setDefaultGasPrice();
        }
    }
    
    /**
     * Set default gas price based on unified settings
     */
    setDefaultGasPrice() {
        // Use unified settings for all networks
        this.gasSettings.maxGasPrice = this.gasSettings.unified.defaultGasPrice;
        
        console.log(`Set default unified gas price:`, 
            this.web3Instance ? this.web3Instance.utils.fromWei(this.gasSettings.maxGasPrice, 'gwei') + ' gwei' : this.gasSettings.maxGasPrice);
    }
    
    /**
     * Save gas price limit setting
     * @param {string} maxGasPriceGwei - Maximum gas price in gwei
     * @returns {boolean} - Success status
     */
    saveGasPriceLimit(maxGasPriceGwei) {
        try {
            if (!maxGasPriceGwei || isNaN(parseFloat(maxGasPriceGwei))) {
                throw new Error('Invalid gas price value');
            }
            
            // Use unified settings for validation
            const unifiedSettings = this.gasSettings.unified;
            
            // Validate gas price range using unified settings
            const gasPriceFloat = parseFloat(maxGasPriceGwei);
            const minGwei = parseFloat(unifiedSettings.minGwei);
            const maxGwei = parseFloat(unifiedSettings.maxGwei);
            
            if (gasPriceFloat < minGwei || gasPriceFloat > maxGwei) {
                throw new Error(`Gas price must be between ${minGwei} and ${maxGwei} gwei`);
            }
            
            // Convert gwei to wei
            const maxGasPriceWei = this.web3Instance ? 
                this.web3Instance.utils.toWei(maxGasPriceGwei.toString(), 'gwei') :
                (parseFloat(maxGasPriceGwei) * 1000000000).toString();
            
            this.gasSettings.maxGasPrice = maxGasPriceWei;
            
            // Save to unified storage key
            const storageKey = 'wallet_max_gas_price_unified';
            localStorage.setItem(storageKey, maxGasPriceWei);
            
            console.log(`Gas price limit saved:`, maxGasPriceGwei, 'gwei');
            return true;
        } catch (error) {
            console.error('Failed to save gas price limit:', error);
            return false;
        }
    }
    
    /**
     * Get current gas price limit in gwei
     * @returns {string} - Gas price limit in gwei
     */
    getGasPriceLimitGwei() {
        if (!this.gasSettings.maxGasPrice) {
            this.setDefaultGasPrice();
        }
        
        if (this.web3Instance) {
            return this.web3Instance.utils.fromWei(this.gasSettings.maxGasPrice, 'gwei');
        } else {
            // Fallback calculation
            return (parseInt(this.gasSettings.maxGasPrice) / 1000000000).toString();
        }
    }
    
    /**
     * Get current unified gas price settings
     * @returns {object} - Unified gas price settings
     */
    getCurrentNetworkGasSettings() {
        const networkInfo = this.getCurrentNetworkInfo();
        const unifiedSettings = this.gasSettings.unified;
        
        return {
            networkName: networkInfo.networkName,
            isMainnet: networkInfo.currentNetwork === 'MAIN' || networkInfo.currentNetwork === window.CONTRACT_NETWORKS?.MAIN,
            defaultGwei: unifiedSettings.defaultGwei,
            minGwei: unifiedSettings.minGwei,
            maxGwei: unifiedSettings.maxGwei,
            currentLimit: this.getGasPriceLimitGwei()
        };
    }
    
    /**
     * Validate gas price using unified settings
     * @param {string} gasPriceGwei - Gas price in gwei to validate
     * @returns {object} - Validation result
     */
    validateGasPriceForNetwork(gasPriceGwei) {
        const unifiedSettings = this.gasSettings.unified;
        const gasPriceFloat = parseFloat(gasPriceGwei);
        const minGwei = parseFloat(unifiedSettings.minGwei);
        const maxGwei = parseFloat(unifiedSettings.maxGwei);
        
        const isValid = !isNaN(gasPriceFloat) && gasPriceFloat >= minGwei && gasPriceFloat <= maxGwei;
        
        return {
            isValid: isValid,
            value: gasPriceFloat,
            min: minGwei,
            max: maxGwei,
            networkName: 'All Networks',
            errorMessage: isValid ? null : `Gas price must be between ${minGwei} and ${maxGwei} gwei`
        };
    }
    
    /**
     * Get safe gas price (respects user's limit)
     * @param {string} networkGasPrice - Current network gas price in wei
     * @returns {string} - Safe gas price in wei
     */
    getSafeGasPrice(networkGasPrice) {
        if (!this.gasSettings.maxGasPrice) {
            this.setDefaultGasPrice();
        }
        
        const maxGasPrice = this.gasSettings.maxGasPrice;
        
        // If network gas price is higher than user's limit, use the limit
        if (networkGasPrice && parseInt(networkGasPrice) > parseInt(maxGasPrice)) {
            console.log('Network gas price exceeds limit, using user limit:', 
                this.web3Instance ? this.web3Instance.utils.fromWei(maxGasPrice, 'gwei') + ' gwei' : maxGasPrice);
            return maxGasPrice;
        }
        
        // Otherwise use network gas price with small buffer
        const bufferedPrice = networkGasPrice ? 
            Math.floor(parseInt(networkGasPrice) * 1.1).toString() : maxGasPrice;
        
        // Still respect the maximum limit
        if (parseInt(bufferedPrice) > parseInt(maxGasPrice)) {
            return maxGasPrice;
        }
        
        return bufferedPrice;
    }
    
    /**
     * Load auto-lock settings from localStorage
     */
    loadAutoLockSettings() {
        try {
            const autoLockSetting = localStorage.getItem('wallet_auto_lock_time');
            if (autoLockSetting && this.autoLockOptions[autoLockSetting] !== undefined) {
                this.currentAutoLockTime = autoLockSetting;
            } else {
                this.currentAutoLockTime = '24h'; // Default to 24 hours
            }
            
            console.log('Loaded auto-lock setting:', this.currentAutoLockTime);
            this.startAutoLockTimer();
        } catch (error) {
            console.error('Failed to load auto-lock settings:', error);
            this.currentAutoLockTime = '24h';
        }
    }
    
    /**
     * Save auto-lock time setting
     * @param {string} autoLockTime - Auto-lock time setting key
     * @returns {boolean} - Success status
     */
    saveAutoLockTime(autoLockTime) {
        try {
            if (!this.autoLockOptions.hasOwnProperty(autoLockTime)) {
                throw new Error('Invalid auto-lock time setting');
            }
            
            this.currentAutoLockTime = autoLockTime;
            localStorage.setItem('wallet_auto_lock_time', autoLockTime);
            
            // Update WalletSessionManager if available
            if (window.WalletSessionManager) {
                window.WalletSessionManager.updateAutoLockTime(autoLockTime);
            }
            
            // Restart the auto-lock timer with new setting
            this.startAutoLockTimer();
            
            console.log('Auto-lock time saved:', autoLockTime);
            return true;
        } catch (error) {
            console.error('Failed to save auto-lock time:', error);
            return false;
        }
    }
    
    /**
     * Get current auto-lock time setting
     * @returns {string} - Current auto-lock time setting
     */
    getAutoLockTime() {
        return this.currentAutoLockTime || '24h';
    }
    
    /**
     * Get auto-lock options for UI
     * @returns {object} - Auto-lock options with labels
     */
    getAutoLockOptions() {
        return {
            '24h': '24 Hours',
            '3d': '3 Days',
            '7d': '7 Days',
            '14d': '14 Days',
            '30d': '30 Days',
            '90d': '90 Days',
            'never': 'Never Auto-lock'
        };
    }
    
    /**
     * Start auto-lock timer
     */
    startAutoLockTimer() {
        // Clear existing timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
        
        const autoLockTime = this.getAutoLockTime();
        const timeoutMs = this.autoLockOptions[autoLockTime];
        
        // If never auto-lock, don't start timer
        if (timeoutMs === 0) {
            console.log('Auto-lock disabled');
            return;
        }
        
        console.log(`Starting auto-lock timer for ${autoLockTime} (${timeoutMs}ms)`);
        
        this.autoLockTimer = setTimeout(() => {
            console.log('Auto-lock timer expired, locking wallet');
            this.lockWallet();
        }, timeoutMs);
    }
    
    /**
     * Reset auto-lock timer (call this on user activity)
     */
    resetAutoLockTimer() {
        this.lastActivityTime = Date.now();
        
        // Only restart timer if wallet is unlocked
        if (!this.isLocked) {
            this.startAutoLockTimer();
        }
    }
    
    /**
     * Lock the wallet
     */
    lockWallet() {
        console.log('Locking wallet');
        this.isLocked = true;
        
        // Clear the auto-lock timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
        
        // Clear session authentication data from WalletSessionManager
        if (window.WalletSessionManager) {
            window.WalletSessionManager.clearSession();
        }
        
        // Clear session authentication data (fallback)
        sessionStorage.removeItem('wallet_session_auth');
        
        // Clear sensitive data from memory but keep encrypted key
        this.privateKey = null;
        this.account = null;
        
        console.log('Wallet locked successfully');
    }
    
    /**
     * Unlock the wallet with password
     * @param {string} password - Password to unlock the wallet
     * @returns {boolean} - Success status
     */
    async unlockWallet(password) {
        try {
            if (!this.encryptedKey) {
                throw new Error('No encrypted key found');
            }
            
            // Decrypt the private key
            const decryptedKey = this.decrypt(this.encryptedKey, password);
            
            if (!decryptedKey || !this.validatePrivateKey(decryptedKey)) {
                throw new Error('Invalid password or corrupted key');
            }
            
            this.privateKey = decryptedKey;
            this.isLocked = false;
            
            // Reinitialize account
            const success = await this.initializeAccount();
            
            if (success) {
                console.log('Wallet unlocked successfully');
                
                // Restart auto-lock timer
                this.resetAutoLockTimer();
                
                return true;
            } else {
                console.error('Failed to initialize account after unlock');
                this.lockWallet(); // Lock again if initialization failed
                return false;
            }
        } catch (error) {
            console.error('Failed to unlock wallet:', error);
            return false;
        }
    }
    
    /**
     * Check if wallet is locked
     * @returns {boolean} - Lock status
     */
    isWalletLocked() {
        return this.isLocked;
    }
    
    /**
     * Check if wallet is ready (unlocked and initialized)
     * @returns {boolean} - Ready status
     */
    isWalletReady() {
        return !this.isLocked && this.account && this.web3Instance && this.privateKey;
    }
    
    /**
     * Load stored keys metadata from localStorage
     */
    loadStoredKeysMetadata() {
        try {
            const metadata = localStorage.getItem('wallet_keys_metadata');
            if (metadata) {
                this.keyMetadata = JSON.parse(metadata);
                console.log('Loaded keys metadata:', Object.keys(this.keyMetadata).length, 'keys');
            }
            
            const activeKeyId = localStorage.getItem('wallet_active_key_id');
            if (activeKeyId && this.keyMetadata[activeKeyId]) {
                this.activeKeyId = activeKeyId;
                console.log('Active key ID:', activeKeyId);
            }
        } catch (error) {
            console.error('Failed to load keys metadata:', error);
            this.keyMetadata = {};
        }
    }
    
    /**
     * Save keys metadata to localStorage
     */
    saveStoredKeysMetadata() {
        try {
            localStorage.setItem('wallet_keys_metadata', JSON.stringify(this.keyMetadata));
            if (this.activeKeyId) {
                localStorage.setItem('wallet_active_key_id', this.activeKeyId);
            }
        } catch (error) {
            console.error('Failed to save keys metadata:', error);
        }
    }
    
    /**
     * Generate a unique key ID
     */
    generateKeyId() {
        return 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get address from private key without initializing account
     */
    getAddressFromPrivateKey(privateKey) {
        try {
            if (!this.web3Instance) {
                return null;
            }
            const account = this.web3Instance.eth.accounts.privateKeyToAccount(privateKey);
            return account.address;
        } catch (error) {
            console.error('Failed to get address from private key:', error);
            return null;
        }
    }
    
    /**
     * Authenticate user with master password
     * @param {string} password - Master password
     * @returns {boolean} - Authentication success
     */
    async authenticateUser(password) {
        try {
            // For first-time setup, any password becomes the master password
            if (Object.keys(this.keyMetadata).length === 0) {
                this.masterPassword = password;
                this.isAuthenticated = true;
                
                // Save authentication time and session data
                this.saveAuthenticationSession();
                
                return true;
            }
            
            // For existing users, try to decrypt any existing key to verify password
            const keyIds = Object.keys(this.keyMetadata);
            if (keyIds.length > 0) {
                const testKeyId = keyIds[0];
                const encryptedKey = localStorage.getItem(`wallet_encrypted_key_${testKeyId}`);
                if (encryptedKey) {
                    const decrypted = this.decrypt(encryptedKey, password);
                    if (decrypted && this.validatePrivateKey(decrypted)) {
                        this.masterPassword = password;
                        this.isAuthenticated = true;
                        this.isLocked = false;
                        
                        // If there's an active key, switch to it
                        const activeKeyId = this.getActiveKeyId();
                        if (activeKeyId) {
                            await this.switchToKey(activeKeyId);
                        }
                        
                        // Save authentication time and session data
                        this.saveAuthenticationSession();
                        
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }
    
    /**
     * Save authentication session data
     */
    saveAuthenticationSession() {
        try {
            // Use WalletSessionManager if available
            if (window.WalletSessionManager && this.isAuthenticated && this.masterPassword && this.activeKeyId) {
                const autoLockTime = this.getAutoLockTime();
                window.WalletSessionManager.saveAuthSession(this.masterPassword, this.activeKeyId, autoLockTime);
                console.log('Authentication session saved via WalletSessionManager');
                return;
            }
            
            // Fallback to old method
            // Save last authentication time
            localStorage.setItem('wallet_last_auth_time', Date.now().toString());
            
            // Save session authentication data (for auto-authentication)
            if (this.isAuthenticated && this.masterPassword && this.activeKeyId) {
                const sessionData = {
                    masterPasswordHash: btoa(this.masterPassword), // Encode to base64
                    activeKeyId: this.activeKeyId,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('wallet_session_auth', JSON.stringify(sessionData));
                console.log('Authentication session saved via fallback method');
            }
        } catch (error) {
            console.error('Failed to save authentication session:', error);
        }
    }
    
    /**
     * Get the active key ID from metadata
     */
    getActiveKeyId() {
        for (const [keyId, metadata] of Object.entries(this.keyMetadata)) {
            if (metadata.isActive) {
                return keyId;
            }
        }
        // If no active key found, return the first key
        const keyIds = Object.keys(this.keyMetadata);
        return keyIds.length > 0 ? keyIds[0] : null;
    }
    
    /**
     * Add a new private key
     * @param {string} privateKey - The private key to add
     * @param {string} keyName - Name for this key
     * @returns {object} - Result with success status and key ID
     */
    async addPrivateKey(privateKey, keyName = '') {
        try {
            if (!this.isAuthenticated || !this.masterPassword) {
                throw new Error('User not authenticated');
            }
            
            // Validate private key format
            if (!this.validatePrivateKey(privateKey)) {
                throw new Error('Invalid private key format');
            }
            
            // Get address for this key
            const address = this.getAddressFromPrivateKey(privateKey);
            if (!address) {
                throw new Error('Failed to derive address from private key');
            }
            
            // Check if this key already exists
            for (const [keyId, metadata] of Object.entries(this.keyMetadata)) {
                if (metadata.address.toLowerCase() === address.toLowerCase()) {
                    throw new Error('This private key is already stored');
                }
            }
            
            // Generate unique key ID
            const keyId = this.generateKeyId();
            
            // Encrypt the private key
            const encrypted = this.encrypt(privateKey, this.masterPassword);
            
            // Store encrypted key
            localStorage.setItem(`wallet_encrypted_key_${keyId}`, encrypted);
            
            // Create metadata
            const metadata = {
                id: keyId,
                name: keyName || `Wallet ${Object.keys(this.keyMetadata).length + 1}`,
                address: address,
                timestamp: Date.now(),
                isActive: Object.keys(this.keyMetadata).length === 0 // First key is active by default
            };
            
            this.keyMetadata[keyId] = metadata;
            
            // If this is the first key, make it active
            if (Object.keys(this.keyMetadata).length === 1) {
                this.activeKeyId = keyId;
                await this.switchToKey(keyId);
            }
            
            // Save metadata
            this.saveStoredKeysMetadata();
            
            console.log('Private key added successfully:', keyId, address);
            return { success: true, keyId: keyId, address: address };
        } catch (error) {
            console.error('Failed to add private key:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Switch to a different key
     * @param {string} keyId - Key ID to switch to
     * @returns {boolean} - Success status
     */
    async switchToKey(keyId) {
        try {
            if (!this.isAuthenticated || !this.masterPassword) {
                throw new Error('User not authenticated');
            }
            
            if (!this.keyMetadata[keyId]) {
                throw new Error('Key not found');
            }
            
            // Load encrypted key
            const encryptedKey = localStorage.getItem(`wallet_encrypted_key_${keyId}`);
            if (!encryptedKey) {
                throw new Error('Encrypted key not found in storage');
            }
            
            // Decrypt the private key
            const privateKey = this.decrypt(encryptedKey, this.masterPassword);
            if (!privateKey || !this.validatePrivateKey(privateKey)) {
                throw new Error('Failed to decrypt private key');
            }
            
            // Update active key
            this.activeKeyId = keyId;
            this.encryptedKey = encryptedKey;
            this.privateKey = privateKey;
            this.isLocked = false;
            
            // Update metadata
            Object.keys(this.keyMetadata).forEach(id => {
                this.keyMetadata[id].isActive = (id === keyId);
            });
            
            // Initialize account with new key
            const success = await this.initializeAccount();
            
            if (success) {
                this.saveStoredKeysMetadata();
                console.log('Switched to key:', keyId, this.getAddress());
                
                // Update authentication session data
                this.saveAuthenticationSession();
                
                // Restart auto-lock timer
                this.resetAutoLockTimer();
                
                return true;
            } else {
                console.error('Failed to initialize account after key switch');
                return false;
            }
        } catch (error) {
            console.error('Failed to switch key:', error);
            return false;
        }
    }
    
    /**
     * Remove a private key
     * @param {string} keyId - Key ID to remove
     * @returns {boolean} - Success status
     */
    removePrivateKey(keyId) {
        try {
            if (!this.keyMetadata[keyId]) {
                throw new Error('Key not found');
            }
            
            // Remove from storage
            localStorage.removeItem(`wallet_encrypted_key_${keyId}`);
            
            // Remove from metadata
            delete this.keyMetadata[keyId];
            
            // If this was the active key, switch to another one or clear
            if (this.activeKeyId === keyId) {
                const remainingKeys = Object.keys(this.keyMetadata);
                if (remainingKeys.length > 0) {
                    // Switch to the first remaining key
                    this.switchToKey(remainingKeys[0]);
                } else {
                    // No keys left, clear everything
                    this.activeKeyId = null;
                    this.encryptedKey = null;
                    this.privateKey = null;
                    this.account = null;
                    this.isAuthenticated = false;
                    this.masterPassword = null;
                    
                    // Clear auto-lock timer
                    if (this.autoLockTimer) {
                        clearTimeout(this.autoLockTimer);
                        this.autoLockTimer = null;
                    }
                    this.isLocked = false;
                }
            }
            
            // Save metadata
            this.saveStoredKeysMetadata();
            
            console.log('Private key removed:', keyId);
            return true;
        } catch (error) {
            console.error('Failed to remove private key:', error);
            return false;
        }
    }
    
    /**
     * Get all stored keys metadata
     * @returns {object} - Keys metadata
     */
    getAllKeys() {
        return { ...this.keyMetadata };
    }
    
    /**
     * Get active key metadata
     * @returns {object|null} - Active key metadata
     */
    getActiveKey() {
        if (this.activeKeyId && this.keyMetadata[this.activeKeyId]) {
            return { ...this.keyMetadata[this.activeKeyId] };
        }
        return null;
    }
    
    /**
     * Update key name
     * @param {string} keyId - Key ID
     * @param {string} newName - New name
     * @returns {boolean} - Success status
     */
    updateKeyName(keyId, newName) {
        try {
            if (!this.keyMetadata[keyId]) {
                throw new Error('Key not found');
            }
            
            this.keyMetadata[keyId].name = newName;
            this.saveStoredKeysMetadata();
            
            console.log('Key name updated:', keyId, newName);
            return true;
        } catch (error) {
            console.error('Failed to update key name:', error);
            return false;
        }
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.masterPassword !== null;
    }
    
    /**
     * Get number of stored keys
     * @returns {number} - Number of keys
     */
    getKeyCount() {
        return Object.keys(this.keyMetadata).length;
    }
    
    /**
     * Migrate legacy single key to multi-key format
     */
    migrateLegacyKey() {
        try {
            const legacyEncryptedKey = localStorage.getItem('wallet_encrypted_key');
            if (!legacyEncryptedKey) return;
            
            console.log('Migrating legacy key to multi-key format...');
            
            // Generate key ID for legacy key
            const keyId = this.generateKeyId();
            
            // Move encrypted key to new format
            localStorage.setItem(`wallet_encrypted_key_${keyId}`, legacyEncryptedKey);
            
            // Try to get address if possible (requires password)
            let address = 'Unknown';
            
            // Create metadata for legacy key
            const metadata = {
                id: keyId,
                name: 'Migrated Wallet',
                address: address,
                timestamp: Date.now(),
                isActive: true
            };
            
            this.keyMetadata[keyId] = metadata;
            this.activeKeyId = keyId;
            
            // Save new metadata
            this.saveStoredKeysMetadata();
            
            // Remove legacy key
            localStorage.removeItem('wallet_encrypted_key');
            localStorage.removeItem('wallet_key_timestamp');
            localStorage.removeItem('wallet_password_hash');
            
            console.log('Legacy key migrated successfully');
        } catch (error) {
            console.error('Failed to migrate legacy key:', error);
        }
    }
}

// Create global instance
window.SecureWalletManager = new SecureWalletManager();

// Add global debug function for easy access from browser console
window.debugWalletNetwork = function() {
    console.log('=== WALLET NETWORK DEBUG ===');
    
    if (window.SecureWalletManager) {
        return window.SecureWalletManager.debugNetworkConfiguration();
    } else {
        console.error('SecureWalletManager not available');
        return null;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureWalletManager;
}

console.log('Secure Wallet Manager loaded (optimized version with network debugging)'); 