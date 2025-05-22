// Common wallet header handling script

/**
 * Wallet Header module - Handles wallet connection, disconnection, and status display at the top of the application
 */
(function() {
    // Use global i18n object
    const i18n = window.i18n;

    // Debugging tools
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Wallet Header]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Wallet Header Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Wallet Header Warning]', ...args);
        }
    };

    // API exposed by the module
    const WalletHeader = {
        // Initialization state
        isWalletConnected: false,
        currentAddress: null,
        web3: null,
        walletBtn: null,
        walletAddressSpan: null,
        walletFrame: null,

        /**
         * Initialize the wallet header
         * @param {Object} options Configuration options
         */
        init: function(options = {}) {
            debug.log('Initializing wallet header...');
            
            // Get DOM elements
            this.walletBtn = document.getElementById('connectWalletBtn');
            this.walletAddressSpan = document.getElementById('walletAddress');
            this.walletFrame = document.getElementById('walletFrame');
            
            // Check critical DOM elements
            if (!this.walletBtn) debug.error('Wallet connection button not found');
            if (!this.walletAddressSpan) debug.error('Wallet address display element not found');
            if (!this.walletFrame) debug.error('Wallet iframe not found');
            
            // Preload wallet iframe
            if (this.walletFrame) {
                debug.log('Preloading wallet iframe');
                
                // Ensure iframe has src
                if (!this.walletFrame.src || this.walletFrame.src === '') {
                    this.walletFrame.src = '../../webPages/wallets/wallets.html';
                }
                
                // Output iframe source
                debug.log('Wallet iframe source:', this.walletFrame.src);
                
                // Ensure iframe has loaded
                this.walletFrame.onload = () => {
                    debug.log('Wallet iframe has loaded');
                    // Check wallet status after iframe has loaded
                    this.checkWalletStatus();
                };
                
                // If iframe has already loaded, check wallet status directly
                if (this.walletFrame.complete) {
                    debug.log('Wallet iframe has already loaded');
                    this.checkWalletStatus();
                }
            }
            
            // Bind wallet connection button click event
            if (this.walletBtn) {
                this.walletBtn.addEventListener('click', this.handleWalletBtnClick.bind(this));
            }
            
            // Listen for messages from wallet iframe
            window.addEventListener('message', this.handleIframeMessage.bind(this));
            
            // Listen for language change events
            window.addEventListener('localeChanged', this.handleLocaleChanged.bind(this));
            
            // Initialize current language
            this.updateUITexts();
            
            return this;
        },
        
        /**
         * Check wallet status
         * First check sessionStorage, then check localStorage
         */
        checkWalletStatus: function() {
            debug.log('Checking wallet connection status...');
            // First check sessionStorage (cross-page transfer), then check localStorage (long-term storage)
            const sessionWalletConnected = sessionStorage.getItem('walletConnected');
            const sessionWalletAddress = sessionStorage.getItem('walletAddress');
            const sessionWalletType = sessionStorage.getItem('walletType');
            
            if (sessionWalletConnected === 'true' && sessionWalletAddress) {
                debug.log('Wallet connection information found in sessionStorage:', sessionWalletAddress);
                // Restore connection status from sessionStorage
                this.isWalletConnected = true;
                this.currentAddress = sessionWalletAddress;
                
                // Use unified UI update function
                this.updateWalletUI(true, this.currentAddress);
                
                // Save to localStorage for long-term storage
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('walletAddress', this.currentAddress);
                localStorage.setItem('walletType', sessionWalletType || 'metamask');
                
                debug.log('Wallet connected, requesting Web3 instance');
                // Request Web3 instance from iframe to get balance
                setTimeout(() => {
                    if (this.walletFrame && this.walletFrame.contentWindow) {
                        try {
                            debug.log('Sending getWeb3Instance message to wallet iframe');
                            this.walletFrame.contentWindow.postMessage({ 
                                type: 'getWeb3Instance',
                                walletType: sessionWalletType
                            }, '*');
                            // Also try to auto-connect
                            this.walletFrame.contentWindow.postMessage({ 
                                type: 'autoConnect',
                                walletType: sessionWalletType
                            }, '*');
                        } catch (error) {
                            debug.error('Failed to send message to iframe:', error);
                        }
                    } else {
                        debug.error('Wallet iframe or its contentWindow is not available');
                    }
                }, 500);
            } else {
                debug.log('No wallet information in sessionStorage, checking localStorage');
                // If no information in sessionStorage, check localStorage
                this.checkStoredWalletConnection();
            }
        },
        
        /**
         * Handle wallet button click event
         */
        handleWalletBtnClick: function() {
            if (this.isWalletConnected) {
                // If connected, disconnect
                this.disconnectWallet();
            } else {
                // If not connected, show wallet connection modal
                this.showWalletModal();
            }
        },
        
        /**
         * Show wallet connection modal
         */
        showWalletModal: function() {
            if (this.walletFrame) {
                this.walletFrame.style.display = 'block';
            }
        },
        
        /**
         * Hide wallet connection modal
         */
        hideWalletModal: function() {
            if (this.walletFrame) {
                this.walletFrame.style.display = 'none';
            }
        },
        
        /**
         * Disconnect wallet
         */
        disconnectWallet: function() {
            if (this.walletFrame && this.walletFrame.contentWindow) {
                // Send disconnect message to wallet iframe
                this.walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
            }
            
            // Directly handle disconnection
            this.handleWalletDisconnected();
        },
        
        /**
         * Handle wallet disconnection
         */
        handleWalletDisconnected: function() {
            debug.log('Wallet disconnected');
            
            // Reset state
            this.isWalletConnected = false;
            this.currentAddress = null;
            this.web3 = null;
            
            // Update UI
            this.updateWalletUI(false);
            
            // Clear local storage
            debug.log('Clearing wallet connection information from localStorage and sessionStorage');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
            localStorage.removeItem('walletType');
            
            // Also clear sessionStorage
            sessionStorage.removeItem('walletConnected');
            sessionStorage.removeItem('walletAddress');
            sessionStorage.removeItem('walletType');
            
            // Trigger wallet disconnected event for other parts of the application to respond
            this.triggerEvent('walletDisconnected');
        },
        
        /**
         * Handle iframe messages
         */
        handleIframeMessage: function(event) {
            if (!event.data || typeof event.data !== 'object') return;
            
            const message = event.data;
            
            switch (message.type) {
                case 'walletConnected':
                    debug.log('Received wallet connection success message:', message.data);
                    // Update connection status
                    this.isWalletConnected = true;
                    this.currentAddress = message.data.address;
                    
                    // Update UI
                    this.updateWalletUI(true, this.currentAddress);
                    
                    // Ensure to save to localStorage and sessionStorage
                    localStorage.setItem('walletConnected', 'true');
                    localStorage.setItem('walletAddress', this.currentAddress);
                    localStorage.setItem('walletType', message.data.walletType || 'metamask');
                    
                    sessionStorage.setItem('walletConnected', 'true');
                    sessionStorage.setItem('walletAddress', this.currentAddress);
                    sessionStorage.setItem('walletType', message.data.walletType || 'metamask');
                    
                    debug.log('Wallet connection status saved to localStorage and sessionStorage:', {
                        address: this.currentAddress,
                        type: message.data.walletType
                    });
                    
                    // Hide wallet modal
                    this.hideWalletModal();
                    
                    // Trigger wallet connected event for other parts of the application to respond
                    this.triggerEvent('walletConnected', message.data);
                    break;
                    
                case 'walletModalClosed':
                    // Close wallet modal
                    this.hideWalletModal();
                    break;
                    
                case 'walletDisconnected':
                    // Handle wallet disconnection
                    this.handleWalletDisconnected();
                    break;
                    
                case 'syncStorage':
                    // Sync storage data
                    debug.log('Received sync storage request:', message.data);
                    if (message.data) {
                        try {
                            // Sync localStorage
                            if (message.data.localStorage) {
                                Object.entries(message.data.localStorage).forEach(([key, value]) => {
                                    localStorage.setItem(key, value);
                                    debug.log(`Synchronized localStorage: ${key}=${value}`);
                                });
                            }
                            
                            // Sync sessionStorage
                            if (message.data.sessionStorage) {
                                Object.entries(message.data.sessionStorage).forEach(([key, value]) => {
                                    sessionStorage.setItem(key, value);
                                    debug.log(`Synchronized sessionStorage: ${key}=${value}`);
                                });
                            }
                            
                            // If syncing wallet connection information, update UI
                            if (message.data.localStorage && message.data.localStorage.walletAddress) {
                                this.isWalletConnected = true;
                                this.currentAddress = message.data.localStorage.walletAddress;
                                
                                // Update UI
                                this.updateWalletUI(true, this.currentAddress);
                            }
                        } catch (error) {
                            debug.error('Error syncing storage:', error);
                        }
                    }
                    break;
                    
                case 'web3Instance':
                    debug.log('Received Web3 instance information:', message.data);
                    
                    // Clear timeout timer (if exists)
                    if (window.web3TimeoutId) {
                        clearTimeout(window.web3TimeoutId);
                        window.web3TimeoutId = null;
                        debug.log('Cleared Web3 request timeout timer');
                    }
                    
                    // Reset retry count
                    window.web3RetryCount = 0;
                    
                    if (!message.data) {
                        debug.error('Received invalid Web3 connection information');
                        return;
                    }
                    
                    // Handle connection information
                    try {
                        // Check status consistency
                        const uiConnected = this.isWalletConnected;
                        const msgConnected = message.data.connected;
                        const hasAddress = !!message.data.address;
                        
                        // If wallet is connected, try to create Web3 instance
                        if (msgConnected && hasAddress) {
                            debug.log('Wallet is connected, trying to create Web3 instance');
                            
                            // Choose Provider based on wallet type
                            if (message.data.walletType === 'metamask' && window.ethereum) {
                                this.web3 = new Web3(window.ethereum);
                                debug.log('Web3 instance created via MetaMask');
                            } else if (message.data.walletType === 'okx' && window.okxwallet) {
                                this.web3 = new Web3(window.okxwallet);
                                debug.log('Web3 instance created via OKX wallet');
                            } else if (window.ethereum) {
                                this.web3 = new Web3(window.ethereum);
                                debug.log('Web3 instance created via available Provider');
                            } else {
                                debug.warn('Unable to create Web3 instance: No compatible provider found, but still marked as connected');
                            }
                            
                            // Globally share Web3 instance (if successfully created)
                            if (this.web3) {
                                window.sharedWeb3 = this.web3;
                            }
                            
                            // If there is address information, ensure UI and status are consistent
                            if (message.data.address) {
                                // If UI is not showing connection or address is inconsistent, update status
                                if (!uiConnected || this.currentAddress !== message.data.address) {
                                    debug.log('Updating wallet UI display, address:', message.data.address);
                                    this.currentAddress = message.data.address;
                                    this.isWalletConnected = true;
                                    
                                    // Use unified UI update function
                                    this.updateWalletUI(true, this.currentAddress);
                                    
                                    // Ensure to save to localStorage and sessionStorage
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
                            // This may be a temporary state during auto-connect attempts, not necessarily an error
                            
                            // Check if wallet is really connected
                            if ((window.ethereum && window.ethereum.isConnected()) || 
                                (window.okxwallet && window.okxwallet.isConnected())) {
                                debug.log('Wallet is indeed connected, ignoring false-negative status message');
                                
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
                            
                            // Modification: Do not automatically disconnect wallet, just log a warning
                            debug.warn('UI shows connected but wallet may not be connected, maintaining current connection status');
                            
                            // Ensure we keep maintaining connection status
                            if (this.currentAddress) {
                                // Keep using current address
                                debug.log('Maintaining connection with current address:', this.currentAddress);
                                
                                // Make sure local storage reflects connected state
                                localStorage.setItem('walletConnected', 'true');
                                localStorage.setItem('walletAddress', this.currentAddress);
                                
                                // Make sure session storage reflects connected state
                                sessionStorage.setItem('walletConnected', 'true');
                                sessionStorage.setItem('walletAddress', this.currentAddress);
                            }
                            
                            // Try to request Web3 instance again as a fallback
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
                    
                case 'web3Ready':
                    // For backward compatibility, keep this message type handling
                    debug.log('Received Web3 ready message, forwarding to web3Instance handling logic');
                    
                    // Forward to web3Instance handling logic
                    if (message.data) {
                        // Create a new web3Instance formatted message
                        const web3InstanceMsg = {
                            type: 'web3Instance',
                            data: {
                                walletType: message.data.walletType || 'unknown',
                                connected: true,
                                address: message.data.address || '',
                                providerType: message.data.providerType || 'unknown'
                            }
                        };
                        // Call its own handleIframeMessage method to process
                        this.handleIframeMessage({data: web3InstanceMsg});
                    }
                    break;
                    
                case 'clearStorage':
                    // Clear specified storage data
                    debug.log('Received clear storage request:', message.data);
                    if (message.data) {
                        try {
                            // Clear specified items in localStorage
                            if (message.data.localStorage && Array.isArray(message.data.localStorage)) {
                                message.data.localStorage.forEach(key => {
                                    localStorage.removeItem(key);
                                    debug.log(`Cleared localStorage: ${key}`);
                                });
                            }
                            
                            // Clear specified items in sessionStorage
                            if (message.data.sessionStorage && Array.isArray(message.data.sessionStorage)) {
                                message.data.sessionStorage.forEach(key => {
                                    sessionStorage.removeItem(key);
                                    debug.log(`Cleared sessionStorage: ${key}`);
                                });
                            }
                            
                            // Reset connection status and UI
                            this.isWalletConnected = false;
                            this.currentAddress = null;
                            
                            // Update UI
                            this.updateWalletUI(false);
                            
                            // Trigger storage cleared event
                            this.triggerEvent('storageCleared');
                        } catch (error) {
                            debug.error('Error clearing storage:', error);
                        }
                    }
                    break;
                    
                default:
                    break;
            }
        },
        
        /**
         * Check if there is stored wallet connection status
         */
        checkStoredWalletConnection: function() {
            const storedConnected = localStorage.getItem('walletConnected');
            const storedAddress = localStorage.getItem('walletAddress');
            const storedWalletType = localStorage.getItem('walletType');
            
            debug.log('Checking wallet connection status in localStorage:', {
                connected: storedConnected,
                address: storedAddress ? this.formatAddress(storedAddress) : null,
                type: storedWalletType
            });
            
            if (storedConnected === 'true' && storedAddress) {
                debug.log('Wallet connection information found in localStorage');
                // Restore connection status from local storage
                this.isWalletConnected = true;
                this.currentAddress = storedAddress;
                this.updateWalletUI(true, storedAddress);
                
                // Ensure sessionStorage is also kept in sync
                sessionStorage.setItem('walletConnected', 'true');
                sessionStorage.setItem('walletAddress', storedAddress);
                sessionStorage.setItem('walletType', storedWalletType || 'metamask');
                
                // Ensure iframe has loaded
                if (!this.walletFrame) {
                    this.walletFrame = document.getElementById('walletFrame');
                }
                
                // Ensure src is set
                if (this.walletFrame && (!this.walletFrame.src || this.walletFrame.src === '')) {
                    this.walletFrame.src = '../../webPages/wallets/wallets.html';
                }
                
                // Wait for iframe to load before sending messages
                if (this.walletFrame) {
                    // If 2 seconds later still no Web3 instance received, retry
                    const timeoutId = setTimeout(() => {
                        debug.log('Web3 instance request timed out, trying to request again...');
                        if (this.walletFrame.contentWindow) {
                            try {
                                this.walletFrame.contentWindow.postMessage({ 
                                    type: 'getWeb3Instance' 
                                }, '*');
                                
                                this.walletFrame.contentWindow.postMessage({ 
                                    type: 'autoConnect',
                                    walletType: storedWalletType || 'metamask'
                                }, '*');
                            } catch (error) {
                                debug.error('Failed to send message after timeout retry:', error);
                            }
                        }
                    }, 2000);
                    
                    // Store timeout ID to clear when receiving web3Ready message
                    window.web3TimeoutId = timeoutId;
                    
                    this.walletFrame.onload = () => {
                        debug.log('Wallet iframe has loaded, now sending messages');
                        
                        // Delay a bit to ensure internal scripts of iframe have initialized
                        setTimeout(() => {
                            if (this.walletFrame.contentWindow) {
                                try {
                                    debug.log('Sending getWeb3Instance and autoConnect messages to wallet iframe');
                                    // Request Web3 instance
                                    this.walletFrame.contentWindow.postMessage({ 
                                        type: 'getWeb3Instance' 
                                    }, '*');
                                    
                                    // Try to auto-connect
                                    this.walletFrame.contentWindow.postMessage({ 
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
                    
                    // If iframe has already loaded, directly call onload handler
                    if (this.walletFrame.complete) {
                        debug.log('Wallet iframe has already loaded, executing onload handler directly');
                        this.walletFrame.onload();
                    }
                } else {
                    debug.error('Wallet iframe element not found');
                }
            } else {
                debug.log('No wallet connection information found in local storage');
            }
        },
        
        /**
         * Update wallet UI
         */
        updateWalletUI: function(connected, address = null) {
            if (!this.walletBtn || !this.walletAddressSpan) {
                debug.error('Unable to update wallet UI: button or address display element does not exist');
                return;
            }
            
            if (connected) {
                this.walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
                this.walletBtn.classList.add('connected');
                this.walletAddressSpan.textContent = this.formatAddress(address);
                this.walletAddressSpan.title = address;
                this.walletAddressSpan.classList.add('truncated-address');
            } else {
                this.walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
                this.walletBtn.classList.remove('connected');
                this.walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected';
                this.walletAddressSpan.title = '';
                this.walletAddressSpan.classList.remove('truncated-address');
            }
        },
        
        /**
         * Format address display
         */
        formatAddress: function(address) {
            if (!address) return '';
            return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        },
        
        /**
         * Handle language change event
         */
        handleLocaleChanged: function(event) {
            debug.log('Language has changed, updating UI texts');
            this.updateUITexts();
        },
        
        /**
         * Update UI texts
         */
        updateUITexts: function() {
            // Only execute if i18n is available
            if (!i18n) return;
            
            // Update button text
            if (this.walletBtn) {
                this.walletBtn.textContent = this.isWalletConnected ? 
                    i18n.t('wallet.disconnect') : 
                    i18n.t('wallet.connect');
            }
            
            // Update wallet address text
            if (this.walletAddressSpan && !this.isWalletConnected) {
                this.walletAddressSpan.textContent = i18n.t('wallet.noWallet');
            }
        },
        
        /**
         * Trigger custom event
         */
        triggerEvent: function(eventName, data = {}) {
            const event = new CustomEvent(`wallet.${eventName}`, { 
                detail: { ...data, source: 'walletHeader' } 
            });
            window.dispatchEvent(event);
            debug.log(`Triggered event: wallet.${eventName}`, data);
        },
        
        /**
         * Get current wallet address
         */
        getAddress: function() {
            return this.currentAddress;
        },
        
        /**
         * Get Web3 instance
         */
        getWeb3: function() {
            return this.web3;
        },
        
        /**
         * Check if wallet is connected
         */
        isConnected: function() {
            return this.isWalletConnected;
        }
    };

    // Export module to global scope
    window.WalletHeader = WalletHeader;
})(); 