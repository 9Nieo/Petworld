/**
 *  Wallet connector script
 *  Use CDN imported WalletConnect and Web3, do not use ESM import
 */

// Wallet connector class
class WalletConnector {
    constructor() {
        console.log('Initializing wallet connector...');
        
        // Select status DOM elements
        this.walletSelectionState = document.getElementById('walletSelectState') || null;
        this.connectingState = document.getElementById('walletConnectingState') || null;
        this.errorState = document.getElementById('walletErrorState') || null;
        
        console.log('Status elements:', {
            selection: this.walletSelectionState ? 'Found' : 'Not found',
            connecting: this.connectingState ? 'Found' : 'Not found',
            error: this.errorState ? 'Found' : 'Not found'
        });
        
        // Button and message DOM elements
        this.closeBtn = document.getElementById('closeWalletBtn') || null;
        this.cancelBtn = document.getElementById('cancelConnectBtn') || null;
        this.tryAgainBtn = document.getElementById('retryConnectBtn') || null;
        this.connectingMessage = document.getElementById('connectingWalletName') || null;
        this.errorMessage = document.getElementById('errorMessage') || null;
        
        console.log('Button elements:', {
            close: this.closeBtn ? 'Found' : 'Not found',
            cancel: this.cancelBtn ? 'Found' : 'Not found',
            retry: this.tryAgainBtn ? 'Found' : 'Not found'
        });
        
        // Wallet items
        this.walletItems = document.querySelectorAll('.wallet-option') || [];
        console.log(`Found ${this.walletItems.length} wallet options`);
        
        // Current connected wallet provider
        this.currentProvider = null;
        this.currentWalletType = null;
        
        // Web3 instance
        this.web3 = null;
        
        // Check if in localhost environment
        this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Internationalization tool instance
        this.i18n = window.walletI18n || null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize wallet connector
     */
    init() {
        console.log('Initializing wallet connector events...');
        
        // Show wallet modal
        const walletModal = document.getElementById('walletModal');
        if (walletModal) {
            walletModal.style.display = 'flex';
            console.log('Wallet modal set to display');
        } else {
            console.error('Wallet modal element not found');
        }
        
        // Show wallet selection status
        this.showWalletSelection();
        
        // Bind close button click event
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Bind click events for each wallet option
        const metamaskBtn = document.getElementById('connectMetamask');
        const walletConnectBtn = document.getElementById('connectWalletConnect');
        const okxBtn = document.getElementById('connectOKX');
        
        if (metamaskBtn) {
            metamaskBtn.addEventListener('click', () => this.connectWallet('metamask'));
        }
        
        if (walletConnectBtn) {
            walletConnectBtn.addEventListener('click', () => this.connectWallet('walletconnect'));
        }
        
        if (okxBtn) {
            okxBtn.addEventListener('click', () => this.connectWallet('okx'));
        }
        
        // Bind cancel button click event
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.showWalletSelection();
            });
        }
        
        // Bind retry button click event
        if (this.tryAgainBtn) {
            this.tryAgainBtn.addEventListener('click', () => {
                this.showWalletSelection();
            });
        }
        
        // Bind close error button
        const closeErrorBtn = document.getElementById('closeErrorBtn');
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', () => {
                this.showWalletSelection();
            });
        }
        
        // Listen for language change events
        window.addEventListener('localeChanged', () => {
            this.updateUI();
        });
        
        // Listen for messages from the parent window
        window.addEventListener('message', this.handleParentMessage.bind(this));
    }
    
    /**
     * Handle messages from the parent window
     * @param {MessageEvent} event - Message event
     */
    handleParentMessage(event) {
        // Ensure the message is an object
        if (!event.data || typeof event.data !== 'object') return;
        
        const message = event.data;
        
        switch (message.type) {
            case 'disconnectWallet':
                // Parent window requests disconnection
                this.disconnectWallet();
                break;
                
            case 'getWeb3Instance':
                // Parent window requests Web3 instance
                this.sendWeb3InstanceToParent();
                break;
                
            case 'autoConnect':
                // Parent window requests automatic connection of a specified wallet type
                if (message.walletType) {
                    this.attemptAutoConnect(message.walletType);
                }
                break;
            
            case 'web3Instance':
                debug.log('Received Web3 instance information:', message.data);
                
                // Clear timeout timer (if it exists)
                if (window.web3TimeoutId) {
                    clearTimeout(window.web3TimeoutId);
                    window.web3TimeoutId = null;
                    debug.log('Web3 request timeout timer cleared');
                }
                
                // Reset retry count
                window.web3RetryCount = 0;
                
                if (!message.data) {
                    debug.error('Received invalid Web3 connection information');
                    return;
                }
                
                // Process connection information
                try {
                    // Check status consistency
                    const uiConnected = this.isWalletConnected;
                    const msgConnected = message.data.connected;
                    const hasAddress = !!message.data.address;
                    
                    // If the wallet is connected, try to create a Web3 instance
                    if (msgConnected && hasAddress) {
                        debug.log('Wallet is connected, trying to create a Web3 instance');
                        
                        // Select Provider based on wallet type
                        if (message.data.walletType === 'metamask' && window.ethereum) {
                            this.web3 = new Web3(window.ethereum);
                            debug.log('Web3 instance created through MetaMask');
                        } else if (message.data.walletType === 'okx' && window.okxwallet) {
                            this.web3 = new Web3(window.okxwallet);
                            debug.log('Web3 instance created through OKX wallet');
                        } else if (window.ethereum) {
                            this.web3 = new Web3(window.ethereum);
                            debug.log('Web3 instance created through available provider');
                        } else {
                            debug.warn('Unable to create Web3 instance: No compatible provider found, but still marked as connected');
                        }
                        
                        // Share Web3 instance globally (if created)
                        if (this.web3) {
                            window.sharedWeb3 = this.web3;
                        }
                        
                        // If there is address information, ensure UI and status consistency
                        if (message.data.address) {
                            // If the UI is not yet displayed as connected or the address is inconsistent, update the status
                            if (!uiConnected || this.currentAddress !== message.data.address) {
                                debug.log('Update wallet UI display, address:', message.data.address);
                                this.currentAddress = message.data.address;
                                this.isWalletConnected = true;
                                
                                // Use a unified UI update function
                                this.updateWalletUI(true, this.currentAddress);
                                
                                // Ensure both localStorage and sessionStorage are saved
                                localStorage.setItem('walletConnected', 'true');
                                localStorage.setItem('walletAddress', this.currentAddress);
                                localStorage.setItem('walletType', message.data.walletType || 'metamask');
                                
                                sessionStorage.setItem('walletConnected', 'true');
                                sessionStorage.setItem('walletAddress', this.currentAddress);
                                sessionStorage.setItem('walletType', message.data.walletType || 'metamask');
                            }
                        }
                        
                        // Trigger web3 ready event
                        this.triggerEvent('web3Ready', {
                            web3: this.web3,
                            address: this.currentAddress,
                            walletType: message.data.walletType
                        });
                    } else if (uiConnected && !msgConnected) {
                        // Special case: UI shows connected, but message indicates not connected
                        // This may be a temporary state during automatic connection attempts, not necessarily an error
                        
                        // Check if the wallet is actually connected
                        if ((window.ethereum && window.ethereum.isConnected()) || 
                            (window.okxwallet && window.okxwallet.isConnected())) {
                            debug.log('Wallet is actually connected, ignoring false-negative status message');
                            
                            // Try to request Web3 instance again
                            setTimeout(() => {
                                if (this.walletFrame && this.walletFrame.contentWindow) {
                                    this.walletFrame.contentWindow.postMessage({ 
                                        type: 'getWeb3Instance'
                                    }, '*');
                                }
                            }, 500);
                            
                            return;
                        }
                        
                        // Modify: Do not automatically disconnect wallet connection, only record warning
                        debug.warn('UI shows connected but wallet may not be connected, keep current connection status');
                        
                        // Ensure we retrieve any stored connection status
                        const storedAddress = localStorage.getItem('walletAddress');
                        if (storedAddress) {
                            debug.log('Found stored wallet address, maintaining connection with:', storedAddress);
                            
                            // Update stored connection status to ensure consistency
                            localStorage.setItem('walletConnected', 'true');
                            sessionStorage.setItem('walletConnected', 'true');
                            sessionStorage.setItem('walletAddress', storedAddress);
                        }
                        
                        // Try to request Web3 instance again as a backup
                        setTimeout(() => {
                            if (this.walletFrame && this.walletFrame.contentWindow) {
                                this.walletFrame.contentWindow.postMessage({ 
                                    type: 'getWeb3Instance'
                                }, '*');
                            }
                        }, 1000);
                    }
                } catch (error) {
                    debug.error('Failed to process Web3 instance message:', error);
                }
                break;
        }
    }
    
    /**
     * Try to automatically connect wallet
     * @param {string} walletType The type of wallet to connect
     */
    async attemptAutoConnect(walletType) {
        console.log(`Attempting to automatically connect ${walletType} wallet...`);
        
        try {
            // Select automatic connection method based on wallet type
            switch (walletType) {
                case 'metamask':
                    if (typeof window.ethereum !== 'undefined') {
                        // Check if MetaMask is already connected
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                        if (accounts && accounts.length > 0) {
                            await this.connectMetaMask(true);
                        }
                    }
                    break;
                    
                case 'okx':
                    if (typeof window.okxwallet !== 'undefined') {
                        const accounts = await window.okxwallet.request({ method: 'eth_accounts' });
                        if (accounts && accounts.length > 0) {
                            await this.connectOKX(true);
                        }
                    }
                    break;
                    
                case 'walletconnect':
                    // WalletConnect usually does not support automatic connection, as it requires QR code scanning
                    console.log('WalletConnect does not support automatic connection, as it requires QR code scanning');
                    break;
                    
                default:
                    console.log(`Does not support automatic connection for wallet type: ${walletType}`);
                    break;
            }
        } catch (error) {
            console.error('Failed to automatically connect wallet:', error);
        }
    }
    
    /**
     * Send Web3 instance to parent
     */
    sendWeb3InstanceToParent() {
        try {
            // Get the current connected wallet address
            let currentAddress = '';
            let isConnected = false;
            
            // Check if Web3 is initialized
            if (this.web3) {
                // If initialized, try to get address
                isConnected = true;
                
                if (this.web3.eth && this.web3.eth.defaultAccount) {
                    currentAddress = this.web3.eth.defaultAccount;
                }
            }
            
            // If Web3 is not initialized or cannot get address, try to get from Provider
            if (!currentAddress) {
                // Try to get from Provider
                if (this.currentWalletType === 'metamask' && window.ethereum) {
                    // Check if connected
                    const isEthereumConnected = window.ethereum.isConnected && window.ethereum.isConnected();
                    
                    if (isEthereumConnected) {
                        window.ethereum.request({ method: 'eth_accounts' })
                            .then(accounts => {
                                if (accounts && accounts.length > 0) {
                                    currentAddress = accounts[0];
                                    // Mark as connected
                                    isConnected = true;
                                    this.sendWeb3StatusToParent(true, currentAddress);
                                } else {
                                    console.log('MetaMask is connected but no account was retrieved, possibly requiring user authorization in MetaMask');
                                    this.sendWeb3StatusToParent(false);
                                }
                            })
                            .catch(error => {
                                console.error('Failed to get MetaMask account:', error);
                                this.sendWeb3StatusToParent(false);
                            });
                        return; // Since an asynchronous request is used, return here to avoid sending duplicate messages
                    } else {
                        console.log('MetaMask is not connected');
                        isConnected = false;
                    }
                } else if (this.currentWalletType === 'okx' && window.okxwallet) {
                    // Check if connected
                    const isOkxConnected = window.okxwallet.isConnected && window.okxwallet.isConnected();
                    
                    if (isOkxConnected) {
                        window.okxwallet.request({ method: 'eth_accounts' })
                            .then(accounts => {
                                if (accounts && accounts.length > 0) {
                                    currentAddress = accounts[0];
                                    // Mark as connected
                                    isConnected = true;
                                    this.sendWeb3StatusToParent(true, currentAddress);
                                } else {
                                    console.log('OKX wallet is connected but no account was retrieved, possibly requiring user authorization in OKX wallet');
                                    this.sendWeb3StatusToParent(false);
                                }
                            })
                            .catch(error => {
                                console.error('Failed to get OKX wallet account:', error);
                                this.sendWeb3StatusToParent(false);
                            });
                        return; // Since an asynchronous request is used, return here to avoid sending duplicate messages
                    } else {
                        console.log('OKX wallet is not connected');
                        isConnected = false;
                    }
                }
            }
            
            // Additional check local storage, see if there is saved connection information
            const storedAddress = localStorage.getItem('walletAddress');
            const storedConnected = localStorage.getItem('walletConnected') === 'true';
            
                            // If local storage has an address and is marked as connected, but we cannot detect a connection, perform additional verification
            if (storedConnected && storedAddress && !isConnected) {
                console.log('Stored display shows connected but detection shows not connected, attempting additional verification...');
                
                // Try to check if the wallet is actually connected
                const ethereumConnected = window.ethereum && window.ethereum.isConnected && window.ethereum.isConnected();
                const okxConnected = window.okxwallet && window.okxwallet.isConnected && window.okxwallet.isConnected();
                
                if (ethereumConnected || okxConnected) {
                    console.log('Wallet is actually connected, retrying to get address');
                    
                    // Delay reply, give the wallet some time to connect
                    setTimeout(() => {
                        // Call itself again
                        this.sendWeb3InstanceToParent();
                    }, 500);
                    return;
                }
                
                // Even if we can't detect a connection, maintain the connection status
                // to prevent auto-disconnection
                console.log('Cannot verify wallet connection, but maintaining connected state based on stored data');
                isConnected = true;
                currentAddress = storedAddress;
            }
            
            // Send current status directly
            this.sendWeb3StatusToParent(isConnected, currentAddress);
            
        } catch (error) {
            console.error('Failed to send Web3 connection information:', error);
            // Even if there is an error, try to send the disconnected status
            this.sendWeb3StatusToParent(false);
        }
    }
    
    /**
     * Send Web3 status information to parent
     * @param {boolean} connected - Whether connected
     * @param {string} address - Wallet address (if connected)
     */
    sendWeb3StatusToParent(connected, address = '') {
        // If the address is empty but claims to be connected, check if there is a stored address
        if (connected && !address) {
            const storedAddress = localStorage.getItem('walletAddress');
            if (storedAddress) {
                console.log('Using stored address as a backup:', storedAddress);
                address = storedAddress;
            } else {
                // Instead of disconnecting, try to use stored status
                const storedConnected = localStorage.getItem('walletConnected') === 'true';
                if (storedConnected) {
                    console.log('Maintaining connected status based on stored data, even without address');
                    // Don't modify connected status, it should remain true
                } else {
                    console.warn('No stored connection status and no address, cannot maintain connection');
                    connected = false;
                }
            }
        }
        
        // Build status information
        const statusInfo = {
            type: 'web3Instance',
            data: {
                walletType: this.currentWalletType || localStorage.getItem('walletType') || 'unknown',
                connected: connected,
                address: address,
                providerType: this.currentProvider ? (
                    this.currentProvider.isMetaMask ? 'metamask' : 
                    this.currentProvider.isOKX ? 'okx' : 
                    'generic'
                ) : 'unknown'
            }
        };
        
        // If the parent window does not exist or is not accessible, do not send the message
        if (!window.parent) {
            console.error('Unable to access parent window, message not sent');
            return;
        }
        
        // Send message to parent window
        try {
            window.parent.postMessage(statusInfo, '*');
            console.log('Sent Web3 status information to parent window:', 
                        connected ? `Connected, address: ${address}` : 'Disconnected');
        } catch (err) {
            console.error('Failed to send status message to parent window:', err);
        }
    }
    
    /**
     * Update UI element text
     */
    updateUI() {
        // Use internationalization tool to update common UI elements
        if (this.i18n) {
            this.i18n.updateTranslations();
        }
    }
    
    /**
     * Connect wallet
     * @param {string} walletType - Wallet type
     */
    async connectWallet(walletType) {
        this.currentWalletType = walletType;
        
        try {
            // Display connecting status
            const walletName = this.getWalletDisplayName(walletType);
            const connectingMsg = this.i18n ? 
                this.i18n.t('connectingTo', { walletName }) : 
                `Connecting to ${walletName}...`;
            
            this.showConnecting(connectingMsg);
            
            this.checkWalletInstalled(walletType);
            
            // Check if it is a localhost environment下的WalletConnect
            if (walletType === 'walletconnect' && this.isLocalhost) {
                this.showWarningForLocalhostWalletConnect();
                return;
            }
            
            switch (walletType) {
                case 'metamask':
                    await this.connectMetaMask();
                    break;
                    
                case 'walletconnect':
                    await this.connectWalletConnect();
                    break;
                    
                case 'okx':
                    await this.connectOKX();
                    break;
                    
                default:
                    throw new Error(this.i18n ? 
                        this.i18n.t('errors.unsupportedWallet', { walletType }) : 
                        `Unsupported wallet type: ${walletType}`);
            }
            
            // After connection, try to send Web3 instance to parent
            this.sendWeb3InstanceToParent();
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showError(error.message || (this.i18n ? this.i18n.t('states.error') : 'Error connecting wallet'));
            return false;
        }
    }
    
    /**
     * Display special提示 for localhost environment下的WalletConnect
     */
    showWarningForLocalhostWalletConnect() {
        if (this.i18n) {
            // Use internationalization tool to build message
            const title = `<strong>${this.i18n.t('localhostWarning.title')}</strong><br><br>`;
            const description = `<p>${this.i18n.t('localhostWarning.description')}</p>`;
            
            // Build reason list
            const reasons = this.i18n.t('localhostWarning.reasons');
            let reasonsHtml = '<ul style="margin-left:20px;margin-top:10px;margin-bottom:10px;">';
            if (Array.isArray(reasons)) {
                reasons.forEach(reason => {
                    reasonsHtml += `<li>${reason}</li>`;
                });
            }
            reasonsHtml += '</ul>';
            
            // Build solution list
            const solutionsTitle = `<p><strong>${this.i18n.t('localhostWarning.solutions.title')}</strong></p>`;
            const solutions = this.i18n.t('localhostWarning.solutions.options');
            let solutionsHtml = '<ol style="margin-left:20px;margin-top:10px;margin-bottom:10px;">';
            if (Array.isArray(solutions)) {
                solutions.forEach(solution => {
                    solutionsHtml += `<li>${solution}</li>`;
                });
            }
            solutionsHtml += '</ol>';
            
            const message = `
                <div style="text-align:left;">
                    ${title}
                    ${description}
                    ${reasonsHtml}
                    ${solutionsTitle}
                    ${solutionsHtml}
                </div>
            `;
            
            this.showError(message, false);
        } else {
            // When there is no i18n, use the default message
            const message = `
                <div style="text-align:left;">
                    <strong>There are restrictions on using WalletConnect in the localhost environment</strong><br><br>
                    <p>Due to security reasons, WalletConnect may not work properly in the localhost environment. This is because:</p>
                    <ul style="margin-left:20px;margin-top:10px;margin-bottom:10px;">
                        <li>WalletConnect requires an HTTPS environment or a secure context</li>
                        <li>The HTTP protocol used in local development environments does not meet security requirements</li>
                    </ul>
                    <p><strong>Solutions:</strong></p>
                    <ol style="margin-left:20px;margin-top:10px;margin-bottom:10px;">
                        <li>Deploy the application to a server that supports HTTPS</li>
                        <li>Use a browser plugin wallet like MetaMask for local testing</li>
                        <li>Use a local HTTPS server (such as ngrok, localtunnel, etc.)</li>
                    </ol>
                </div>
            `;
            this.showError(message, false);
        }
    }
    
    /**
     * Connect MetaMask wallet
     * @param {boolean} autoConnect - Whether it is an automatic connection
     */
    async connectMetaMask(autoConnect = false) {
        if (typeof window.ethereum === 'undefined') {
            throw new Error(this.i18n ? 
                this.i18n.t('errors.walletNotInstalled', { walletName: 'MetaMask' }) : 
                'MetaMask is not installed, please install the MetaMask wallet plugin first');
        }
        
        try {
            // Request account access permission
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
                throw new Error(this.i18n ? 
                    this.i18n.t('errors.noAccounts') : 
                    'Unable to get account information, please ensure that your MetaMask is unlocked');
            }
            
            const address = accounts[0];
            
            // Get chainId
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            // Create Web3 instance
            if (typeof Web3 !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                console.log('MetaMask Web3 instance created');
            } else {
                console.error('Web3 library not loaded');
            }
            
            // Save provider
            this.currentProvider = window.ethereum;
            
            // Get the current connected network
            this.onWalletConnected('metamask', address, chainId);
            
            // Listen for account change events
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected from wallet
                    this.onWalletDisconnected();
                } else {
                    // User switched accounts
                    this.onWalletConnected('metamask', accounts[0], chainId);
                }
            });
            
            // Listen for chain change events
            window.ethereum.on('chainChanged', (newChainId) => {
                // User switched networks
                window.location.reload();
            });
            
            if (autoConnect) {
                // In automatic connection mode, do not close the modal, but send a connection success message to the parent window
                window.parent.postMessage({
                    type: 'walletConnected',
                    data: {
                        walletType: 'metamask',
                        address: address,
                        chainId: chainId
                    }
                }, '*');
                
                // After connection, try to send Web3 instance to parent
                this.sendWeb3InstanceToParent();
            }
        } catch (error) {
            console.error('MetaMask connection error:', error);
            throw error;
        }
    }
    
    /**
     * Connect WalletConnect
     */
    async connectWalletConnect() {
        try {
            // Check if WalletConnectProvider is available
            if (typeof WalletConnectProvider === 'undefined') {
                throw new Error(this.i18n ? 
                    this.i18n.t('errors.walletNotDetected', { walletName: 'WalletConnect' }) : 
                    'WalletConnect library not loaded. Please check your network connection and try again.');
            }
            
            // Create WalletConnect provider
            this.currentProvider = new WalletConnectProvider.default({
                rpc: {
                    1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Ethereum mainnet
                    56: 'https://bsc-dataseed.binance.org/', // Binance Smart Chain
                    137: 'https://polygon-rpc.com/' // Polygon
                },
                chainId: 1, // Default Ethereum mainnet
                bridge: 'https://bridge.walletconnect.org', // Use official bridge server
                qrcodeModalOptions: {
                    mobileLinks: ['metamask', 'trust', 'rainbow', 'argent', 'imtoken', 'pillar', 'okxwallet']
                }
            });
            
            // Enable session
            await this.currentProvider.enable();
            
            // Create Web3 instance
            this.web3 = new Web3(this.currentProvider);
            
            // Get account
            const accounts = await this.web3.eth.getAccounts();
            
            if (!accounts || accounts.length === 0) {
                throw new Error(this.i18n ? 
                    this.i18n.t('errors.noAddressReturned') : 
                    'Unable to get wallet address');
            }
            
            // Get chainId
            const chainId = await this.web3.eth.getChainId();
            
            // Connected successfully
            this.onWalletConnected('walletconnect', accounts[0], chainId);
            
            // Listen for disconnection
            this.currentProvider.on('disconnect', () => {
                this.onWalletDisconnected();
            });
            
            // Listen for account change
            this.currentProvider.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected
                    this.onWalletDisconnected();
                } else {
                    // Account changed
                    this.onWalletConnected('walletconnect', accounts[0], chainId);
                }
            });
            
            // Listen for chain change
            this.currentProvider.on('chainChanged', (chainId) => {
                // Refresh page is the simplest way to handle chain changes
                window.location.reload();
            });
            
        } catch (error) {
            console.error('WalletConnect connection error:', error);
            
            // Clean up provider
            if (this.currentProvider && typeof this.currentProvider.disconnect === 'function') {
                await this.currentProvider.disconnect();
            }
            
            const errorMsg = error.message || 'Unknown error';
            if (errorMsg.includes('User closed modal')) {
                throw new Error(this.i18n ? 
                    this.i18n.t('errors.userRejected') : 
                    'Connection request rejected');
            }
            
            throw new Error(this.i18n ? 
                this.i18n.t('errors.failedToConnect', { walletName: 'WalletConnect', message: errorMsg }) : 
                `Failed to connect WalletConnect: ${errorMsg}`);
        }
    }
    
    /**
     * Connect OKX wallet
     * @param {boolean} autoConnect - Whether it is an automatic connection
     */
    async connectOKX(autoConnect = false) {
        if (typeof window.okxwallet === 'undefined') {
            throw new Error(this.i18n ? 
                this.i18n.t('errors.walletNotInstalled', { walletName: 'OKX Wallet' }) : 
                'OKX wallet not installed, please install the OKX wallet plugin first');
        }
        
        try {
            // Request account access permission
            const accounts = await window.okxwallet.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
                throw new Error(this.i18n ? 
                    this.i18n.t('errors.noAccounts') : 
                    'Unable to get account information, please ensure that your OKX wallet is unlocked');
            }
            
            const address = accounts[0];
            
            // Get chainId
            const chainId = await window.okxwallet.request({ method: 'eth_chainId' });
            
            // Create Web3 instance
            if (typeof Web3 !== 'undefined') {
                this.web3 = new Web3(window.okxwallet);
                console.log('OKX Web3 instance created');
            } else {
                console.error('Web3 library not loaded');
            }
            
            // Save provider
            this.currentProvider = window.okxwallet;
            
            // Get current connected network
            this.onWalletConnected('okx', address, chainId);
            
            // Listen for account change events
            window.okxwallet.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected from wallet
                    this.onWalletDisconnected();
                } else {
                    // User switched accounts
                    this.onWalletConnected('okx', accounts[0], chainId);
                }
            });
            
            // Listen for chain change events
            window.okxwallet.on('chainChanged', (newChainId) => {
                // User switched networks
                window.location.reload();
            });
            
            if (autoConnect) {
                // In automatic connection mode, do not close the modal, but send a connection success message to the parent window
                window.parent.postMessage({
                    type: 'walletConnected',
                    data: {
                        walletType: 'okx',
                        address: address,
                        chainId: chainId
                    }
                }, '*');
                
                // After connection, try to send Web3 instance to parent
                this.sendWeb3InstanceToParent();
            }
        } catch (error) {
            console.error('OKX wallet connection error:', error);
            throw error;
        }
    }
    
    /**
     * Disconnect wallet
     */
    async disconnectWallet() {
        try {
            if (this.currentProvider) {
                if (this.currentWalletType === 'walletconnect' && typeof this.currentProvider.disconnect === 'function') {
                    // WalletConnect needs to call the disconnect method
                    await this.currentProvider.disconnect();
                }
                
                // Reset status
                this.currentProvider = null;
                this.web3 = null;
                this.currentWalletType = null;
                
                // Notify disconnection
                this.onWalletDisconnected();
            }
        } catch (error) {
            console.error('Disconnect wallet error:', error);
        }
    }
    
    /**
     * Wallet connection success callback
     * @param {string} walletType - Wallet type
     * @param {string} address - Wallet address
     * @param {string} chainId - Chain ID
     */
    onWalletConnected(walletType, address, chainId) {
        console.log('wallet connected successfully:', { walletType, address, chainId });
        
        // Save current wallet type
        this.currentWalletType = walletType;
        
        // Send connection success message to parent window
        if (window.parent) {
            console.log('Send wallet connection message to parent window');
            try {
                // Prepare wallet data to send
                const walletData = {
                    walletType,
                    address,
                    chainId
                };
                
                // Immediately save connection status in localStorage and sessionStorage in the parent window
                try {
                    // Use JSON serialization to write directly to the parent window's storage
                    window.parent.eval(`
                        try {
                            localStorage.setItem('walletConnected', 'true');
                            localStorage.setItem('walletAddress', '${address}');
                            localStorage.setItem('walletType', '${walletType}');
                            
                            sessionStorage.setItem('walletConnected', 'true');
                            sessionStorage.setItem('walletAddress', '${address}');
                            sessionStorage.setItem('walletType', '${walletType}');
                            
                            console.log('[Wallet connector] Directly saved wallet connection status in parent window', { 
                                address: '${address}',
                                type: '${walletType}'
                            });
                        } catch (err) {
                            console.error('[Wallet connector] Unable to save wallet status in parent window:', err);
                        }
                    `);
                } catch (storageError) {
                    console.error('Unable to save wallet status in parent window:', storageError);
                    
                    // Fall back to message passing
                    window.parent.postMessage({
                        type: 'syncStorage',
                        data: {
                            localStorage: {
                                walletConnected: 'true',
                                walletAddress: address,
                                walletType: walletType
                            },
                            sessionStorage: {
                                walletConnected: 'true',
                                walletAddress: address,
                                walletType: walletType
                            }
                        }
                    }, '*');
                }
                
                // Send connection success message
                window.parent.postMessage({
                    type: 'walletConnected',
                    data: walletData
                }, '*');
                
                // If there is a Web3 instance, send Web3 connection information immediately
                if (this.web3 && this.currentProvider) {
                    console.log('Send Web3 connection information to parent window');
                    window.parent.postMessage({
                        type: 'web3Ready',
                        data: {
                            walletType: this.currentWalletType,
                            connected: true,
                            providerType: this.currentProvider ? (
                                this.currentProvider.isMetaMask ? 'metamask' : 
                                this.currentProvider.isOKX ? 'okx' : 
                                'generic'
                            ) : 'unknown',
                            address: address,
                            chainId: chainId
                        }
                    }, '*');
                }
            } catch (error) {
                console.error('Failed to send message to parent window:', error);
            }
        } else {
            console.error('Unable to get parent window');
        }
        
        // Check and set necessary token approvals
        this.setupRequiredTokenApprovals(address)
            .then(() => console.log('Completed necessary token approval check'))
            .catch(error => console.error('Token approval check failed:', error));
        
        // Close modal
        this.closeModal();
    }
    
    /**
     * Check and set necessary token approvals
     * @param {string} userAddress - User wallet address
     */
    async setupRequiredTokenApprovals(userAddress) {
        console.log('Checking necessary token approvals...');

        if (!this.web3 || !userAddress) {
            console.error('Web3 not initialized or wallet address invalid, cannot check authorization');
            return;
        }
        
        try {
            // Get contract address
            const getContractAddress = typeof window.getContractAddress === 'function' ? 
                window.getContractAddress : 
                (name) => {
                    const network = window.currentNetwork || 'TEST';
                    if (window.contractAddresses && window.contractAddresses[network]) {
                        return window.contractAddresses[network][name];
                    }
                    return null;
                };
            
            
            // Get supported payment tokens
            const supportedTokens = window.SUPPORTED_PAYMENT_TOKENS || [];
            if (supportedTokens.length === 0) {
                console.warn('No supported payment tokens found, skipping authorization check');
                return;
            }
            
            console.log('Starting token approval check...');
            
            // Ensure generic ERC20 ABI is available
            let genericERC20ABI = window.GENERIC_ERC20_ABI;
            if (!genericERC20ABI && typeof window.initERC20Contract !== 'function') {
                console.warn('Unable to get ERC20 ABI, cannot check authorization');
                return;
            }
            
            // Check each supported token
            for (const token of supportedTokens) {
                if (!token.contractAddress) continue;
                
                console.log(`Checking ${token.name} token authorization...`);
                
                // Create token contract instance
                let tokenContract;
                if (typeof window.initERC20Contract === 'function') {
                    tokenContract = window.initERC20Contract(this.web3, token.contractAddress);
                } else {
                    tokenContract = new this.web3.eth.Contract(genericERC20ABI, token.contractAddress);
                }
                
                if (!tokenContract) {
                    console.warn(`Unable to create ${token.name} contract instance, skipping authorization check`);
                    continue;
                }
                
                // Check authorization
                let allowance;
                try {
                    allowance = await tokenContract.methods.allowance(userAddress, paymentManagerAddress).call();
                    console.log(`Current allowance for ${token.name} to PaymentManager:`, allowance);
                } catch (error) {
                    console.error(`Failed to check ${token.name} authorization:`, error);
                    continue;
                }
                
                // Authorize a large amount to avoid frequent authorization
                const largeAmount = this.web3.utils.toWei('1000000', 'ether');
                
                // If the allowance is less than the large amount, prompt the user to authorize
                if (this.web3.utils.toBN(allowance).lt(this.web3.utils.toBN(largeAmount))) {
                    this.showConnecting(`Need to authorize ${token.name} to payment system`);
                    
                    // Create authorization transaction
                    try {
                        console.log(`Authorizing ${token.name}...`);
                        await tokenContract.methods.approve(paymentManagerAddress, largeAmount)
                            .send({ from: userAddress });
                        console.log(`${token.name} authorization successful`);
                    } catch (error) {
                        console.error(`${token.name} authorization failed:`, error);
                        // Show error but continue checking other tokens
                        this.showError(`${token.name} authorization failed: ${error.message}`, false);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } else {
                    console.log(`${token.name} has enough authorization, no need to re-authorize`);
                }
            }
            
            this.showWalletSelection();
            console.log('Token approval check completed');
            
        } catch (error) {
            console.error('Token approval check failed:', error);
            this.showError('Token approval check failed', false);
            setTimeout(() => this.showWalletSelection(), 2000);
        }
    }
    
    /**
     * Wallet disconnected callback
     */
    onWalletDisconnected() {
        // Send disconnection message to parent window
        if (window.parent) {
            try {
                // Try to clear the parent window's storage directly
                window.parent.eval(`
                    try {
                        // Clear wallet connection data from localStorage and sessionStorage
                        localStorage.removeItem('walletConnected');
                        localStorage.removeItem('walletAddress');
                        localStorage.removeItem('walletType');
                        
                        sessionStorage.removeItem('walletConnected');
                        sessionStorage.removeItem('walletAddress');
                        sessionStorage.removeItem('walletType');
                        
                        console.log('[Wallet connector] Cleared wallet connection status in parent window');
                    } catch (err) {
                        console.error('[Wallet connector] Unable to clear wallet status in parent window:', err);
                    }
                `);
            } catch (storageError) {
                console.error('Unable to clear wallet status in parent window:', storageError);
                
                // Use message notification method
                window.parent.postMessage({
                    type: 'clearStorage',
                    data: {
                        localStorage: ['walletConnected', 'walletAddress', 'walletType'],
                        sessionStorage: ['walletConnected', 'walletAddress', 'walletType']
                    }
                }, '*');
            }
            
            // Send disconnection message
            window.parent.postMessage({
                type: 'walletDisconnected'
            }, '*');
        }
        
        // Reset status
        this.currentProvider = null;
        this.web3 = null;
        this.currentWalletType = null;
        
        // Show wallet selection view
        this.showWalletSelection();
    }
    
    /**
     * Close modal
     */
    closeModal() {
        // Try to sync storage again
        this.syncStorageWithParent();
        
        // Send close modal message to parent window
        window.parent.postMessage({
            type: 'walletModalClosed'
        }, '*');
    }
    
    /**
     * Sync storage status to parent window
     */
    syncStorageWithParent() {
        if (!this.currentWalletType || !window.parent) return;
        
        try {
            const address = this.web3 ? this.web3.eth.defaultAccount : null;
            if (!address) return;
            
            // Send sync request through postMessage
            window.parent.postMessage({
                type: 'syncStorage',
                data: {
                    localStorage: {
                        walletConnected: 'true',
                        walletAddress: address,
                        walletType: this.currentWalletType
                    },
                    sessionStorage: {
                        walletConnected: 'true',
                        walletAddress: address,
                        walletType: this.currentWalletType
                    }
                }
            }, '*');
            
            console.log('Sent data sync request to parent window');
        } catch (error) {
            console.error('Failed to sync storage status:', error);
        }
    }
    
    /**
     * Show wallet selection interface
     */
    showWalletSelection() {
        if (this.connectingState) {
            this.connectingState.classList.add('hidden');
        }
        if (this.errorState) {
            this.errorState.classList.add('hidden');
        }
        if (this.walletSelectionState) {
            this.walletSelectionState.classList.remove('hidden');
        }
    }
    
    /**
     * Show connecting status
     */
    showConnecting(message) {
        if (this.walletSelectionState) {
            this.walletSelectionState.classList.add('hidden');
        }
        if (this.errorState) {
            this.errorState.classList.add('hidden');
        }
        if (this.connectingState) {
            this.connectingState.classList.remove('hidden');
        }
        
        // Update connection message
        if (this.connectingMessage && message) {
            this.connectingMessage.textContent = message;
        }
        
        // Update connection text
        const connectingText = document.querySelector('.connecting-text');
        if (connectingText) {
            const text = this.i18n ? this.i18n.t('states.connecting') : 'Connecting wallet...';
            connectingText.textContent = text;
        }
    }
    
    /**
     * Show error information
     */
    showError(message, showRetry = true) {
        if (this.walletSelectionState) {
            this.walletSelectionState.classList.add('hidden');
        }
        if (this.connectingState) {
            this.connectingState.classList.add('hidden');
        }
        if (this.errorState) {
            this.errorState.classList.remove('hidden');
        }
        
        // Update error message
        if (this.errorMessage && message) {
            this.errorMessage.innerHTML = message;
        }
        
        // Show or hide retry button
        if (this.tryAgainBtn) {
            this.tryAgainBtn.style.display = showRetry ? 'block' : 'none';
        }
    }
    
    /**
     * Get wallet display name
     */
    getWalletDisplayName(walletType) {
        if (this.i18n) {
            return this.i18n.t(`${walletType}.name`);
        }
        
        switch (walletType) {
            case 'metamask':
                return 'MetaMask';
            case 'walletconnect':
                return 'WalletConnect';
            case 'okx':
                return 'OKX Wallet';
            default:
                return 'Wallet';
        }
    }
    
    /**
     * Check if the wallet is installed
     * @param {string} walletType - Wallet type
     * @throws {Error} If the wallet is not installed, throw an error
     */
    checkWalletInstalled(walletType) {
        switch (walletType) {
            case 'metamask':
                if (!window.ethereum || !window.ethereum.isMetaMask) {
                    // Internationalized error information
                    const installLink = this.i18n ? 
                        `<br><a href="https://metamask.io/download/" target="_blank" style="color:#3498db;text-decoration:underline;">${this.i18n.t('install.metamask')}</a>` : 
                        '<br><a href="https://metamask.io/download/" target="_blank" style="color:#3498db;text-decoration:underline;">点击此处安装MetaMask</a>';
                    
                    const errorMsg = this.i18n ? 
                        this.i18n.t('errors.walletNotDetected', { walletName: 'MetaMask' }) + installLink : 
                        `Not detected MetaMask. Please install the MetaMask plugin and try again.${installLink}`;
                    
                    throw new Error(errorMsg);
                }
                break;
            case 'walletconnect':
                // WalletConnect does not require pre-installation, just check if the library is available
                if (typeof WalletConnectProvider === 'undefined') {
                    const errorMsg = this.i18n ? 
                        this.i18n.t('errors.walletNotDetected', { walletName: 'WalletConnect' }) : 
                        'Unable to load WalletConnect. Please refresh the page and try again, or check the network connection.';
                    
                    throw new Error(errorMsg);
                }
                break;
            case 'okx':
                if (typeof window.okxwallet === 'undefined') {
                    // Internationalized error information
                    const installLink = this.i18n ? 
                        `<br><a href="https://www.okx.com/cn/web3/wallet" target="_blank" style="color:#3498db;text-decoration:underline;">${this.i18n.t('install.okx')}</a>` : 
                        '<br><a href="https://www.okx.com/cn/web3/wallet" target="_blank" style="color:#3498db;text-decoration:underline;">点击此处安装OKX钱包</a>';
                    
                    const errorMsg = this.i18n ? 
                        this.i18n.t('errors.walletNotDetected', { walletName: 'OKX' }) + installLink : 
                        `Not detected OKX wallet. Please install the OKX wallet plugin and try again.${installLink}`;
                    
                    throw new Error(errorMsg);
                }
                break;
            default:
                const errorMsg = this.i18n ? 
                    this.i18n.t('errors.unsupportedWallet', { walletType }) : 
                    `Unsupported wallet type: ${walletType}`;
                
                throw new Error(errorMsg);
        }
    }
}

// Create wallet connector instance
const walletConnector = new WalletConnector();

// Listen for messages from the parent window
window.addEventListener('message', (event) => {
    const message = event.data;
    
    if (!message || typeof message !== 'object') return;
    
    if (message.type === 'disconnectWallet') {
        walletConnector.disconnectWallet();
    } else if (message.type === 'getWeb3Instance') {
        // If the wallet is connected, return the Web3 instance to the parent window
        if (walletConnector.web3) {
            try {
                // Try to get the current address
                let currentAddress = '';
                if (walletConnector.currentWalletType === 'metamask' && window.ethereum) {
                    // Sync to get the MetaMask account
                    (async () => {
                        try {
                            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                            if (accounts && accounts.length > 0) {
                                currentAddress = accounts[0];
                            }
                            sendWeb3ReadyMessage(currentAddress);
                        } catch (error) {
                            console.error('Failed to get MetaMask account:', error);
                            sendWeb3ReadyMessage('');
                        }
                    })();
                } else if (walletConnector.currentWalletType === 'okx' && window.okxwallet) {
                    // Sync to get the OKX account
                    (async () => {
                        try {
                            const accounts = await window.okxwallet.request({ method: 'eth_accounts' });
                            if (accounts && accounts.length > 0) {
                                currentAddress = accounts[0];
                            }
                            sendWeb3ReadyMessage(currentAddress);
                        } catch (error) {
                            console.error('Failed to get OKX account:', error);
                            sendWeb3ReadyMessage('');
                        }
                    })();
                } else {
                    // Get the saved wallet address from localStorage
                    currentAddress = localStorage.getItem('walletAddress') || '';
                    sendWeb3ReadyMessage(currentAddress);
                }
                
                function sendWeb3ReadyMessage(address) {
                window.parent.postMessage({
                    type: 'web3Ready',
                    data: {
                        walletType: walletConnector.currentWalletType,
                        connected: true,
                            address: address,
                        providerType: walletConnector.currentProvider ? (
                            walletConnector.currentProvider.isMetaMask ? 'metamask' : 
                            walletConnector.currentProvider.isOKX ? 'okx' : 
                            'generic'
                        ) : 'unknown'
                    }
                }, '*');
                    console.log('Sent Web3 ready information, including address:', address);
                }
            } catch (error) {
                console.error('Failed to send Web3 instance information:', error);
            }
        }
    }
});

// Export wallet connector (available in the console for debugging)
window.walletConnector = walletConnector; 