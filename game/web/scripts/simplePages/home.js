const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Debug tool, useful for troubleshooting
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet World Normal Mode]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet World Normal Mode Error]', ...args);
        }
    };
    
    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const refreshBtn = document.querySelector('.action-btn');
    
    // Token balance display elements
    const pwPointBalanceElem = document.getElementById('pwPointBalance');
    const pwBountyBalanceElem = document.getElementById('pwBountyBalance');
    const pwFoodBalanceElem = document.getElementById('pwFoodBalance');
    
    // Wallet connection status
    let isWalletConnected = false;
    // Current connected wallet address
    let currentAddress = null;
    // Web3 instance and contract instances
    let web3 = null;
    let tokenBalanceManager = null;
    
    // Game token contract instances
    let pwPointContract = null;
    let pwBountyContract = null;
    let pwFoodContract = null;
    
    // Initialize
    init();
    
    /**
     * Initialize function
     */
    function init() {
        debug.log('Initializing normal mode homepage...');
        
        // Initialize bubble background
        if (window.BubbleBackground) {
            debug.log('Initializing bubble background...');
            new BubbleBackground({
                bubbleCount: 30,  
                colors: [
                    'rgba(123, 206, 234, 0.2)', // Light blue
                    'rgba(194, 145, 255, 0.2)', // Light purple
                    'rgba(148, 224, 250, 0.2)', // Light cyan
                    'rgba(255, 255, 255, 0.5)'  // White
                ],
                minDuration: 8,
                maxDuration: 20,
                bgColor: 'white' 
            }).init();
        } else {
            debug.error('BubbleBackground not available, please ensure bubbleBackground.js is loaded correctly');
        }
        
        // Check critical DOM elements
        if (!walletBtn) debug.error('Wallet connection button not found');
        if (!walletAddressSpan) debug.error('Wallet address display element not found');
        if (!walletFrame) debug.error('Wallet iframe not found');
        if (!pwPointBalanceElem) debug.error('PwPoint balance display element not found');
        if (!pwBountyBalanceElem) debug.error('PwBounty balance display element not found');
        if (!pwFoodBalanceElem) debug.error('PwFood balance display element not found');
        
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
                // Check wallet status after iframe loads
                checkWalletStatus();
            };
            
            // If iframe is already loaded, check wallet status directly
            if (walletFrame.complete) {
                debug.log('Wallet iframe loaded');
                checkWalletStatus();
            }
        }
        
        // Bind wallet connection button click event
        if (walletBtn) {
            walletBtn.addEventListener('click', handleWalletBtnClick);
        }
        
        // Bind refresh button click event
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshAssets();
            });
        }
        
        // Initialize asset card interactions
        initCardInteractions();
        
        // Bind new feature buttons click event
        bindFeatureButtons();
        
        // Listen for messages from wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for language change event
        window.addEventListener('localeChanged', handleLocaleChanged);
        
        // Listen for language initialization event
        window.addEventListener('localeInitialized', function(event) {
            debug.log('Detected language initialization event:', event.detail);
            updateUITexts();
        });
        
        // Apply current language
        updateUITexts();
        
        // Add refresh balance button
        addRefreshBalanceButton();
        
        // Load initial contract files
        loadContractInitializers();
    }
    
    /**
     * Add refresh balance button
     */
    function addRefreshBalanceButton() {
        // Find suitable area to place button
        const tokenArea = document.querySelector('.token-balances') || 
                          document.querySelector('.game-header-right') ||
                          document.querySelector('.game-header');
                          
        if (!tokenArea) {
            debug.log('No suitable area found to add refresh balance button');
            return;
        }
        
        // Create refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshBalanceBtn';
        refreshBtn.className = 'refresh-balance-btn';
        refreshBtn.innerHTML = '🔄'; // Use refresh icon
        refreshBtn.title = i18n && i18n.t ? i18n.t('wallet.refreshBalance') : 'Refresh token balance';
        
        // Button styles
        refreshBtn.style.background = 'transparent';
        refreshBtn.style.border = 'none';
        refreshBtn.style.fontSize = '16px';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.style.padding = '5px';
        refreshBtn.style.marginLeft = '5px';
        refreshBtn.style.opacity = '0.7';
        refreshBtn.style.transition = 'all 0.3s ease';
        
        // Hover effect
        refreshBtn.onmouseenter = function() {
            this.style.opacity = '1';
            this.style.transform = 'rotate(180deg)';
        };
        refreshBtn.onmouseleave = function() {
            this.style.opacity = '0.7';
            this.style.transform = 'rotate(0deg)';
        };
        
        // Add click event
        refreshBtn.addEventListener('click', handleRefreshBalanceBtnClick);
        
        // Add to page
        tokenArea.appendChild(refreshBtn);
        debug.log('Refresh balance button added');
    }
    
    /**
     * Handle refresh balance button click event
     */
    function handleRefreshBalanceBtnClick() {
        if (!isWalletConnected) {
            showToast(i18n && i18n.t ? i18n.t('wallet.connectFirst') : 'Please connect wallet first');
            return;
        }
        
        debug.log('Manually refresh token balance');
        
        // Show refresh toast
        showToast(i18n && i18n.t ? i18n.t('wallet.refreshingBalance') : 'Refreshing balance...');
        
        // Execute balance update
        updateTokenBalances().then(() => {
            // Show update completed toast
            showToast(i18n && i18n.t ? i18n.t('wallet.balanceUpdated') : 'Balance updated');
        }).catch(error => {
            // Show update failed toast
            showToast(i18n && i18n.t ? i18n.t('wallet.balanceUpdateFailed') : 'Balance update failed');
            debug.error('Balance update failed:', error);
        });
    }
    
    /**
     * Show toast message
     * @param {string} message - Toast message
     * @param {number} duration - Display duration, default 2000ms
     */
    function showToast(message, duration = 2000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s ease';
        
        document.body.appendChild(toast);
        
        // Hide toast after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
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
                        // Try auto-connect simultaneously
                        walletFrame.contentWindow.postMessage({ 
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
            debug.log('No wallet info in sessionStorage, checking localStorage');
            // Check localStorage if sessionStorage has no info
            checkStoredWalletConnection();
        }
    }
    
    /**
     * Initialize card interactions
     */
    function initCardInteractions() {
        // Asset card interactions - Since buttons have been removed, no need to bind click events here
        const assetCards = document.querySelectorAll('.asset-card');
        
        // Keep other card interactions if any
        assetCards.forEach(card => {
            // Add card-specific click or hover effects here if needed
        });
    }
    
    /**
     * Refresh asset data
     */
    function refreshAssets() {
        debug.log('Refreshing asset data');
        
        // Show loading state
        if (refreshBtn) {
            refreshBtn.textContent = 'Loading...';
            refreshBtn.disabled = true;
        }
        
        // Update token balances
        updateTokenBalances().then(() => {
            // Restore button state
            if (refreshBtn) {
                refreshBtn.textContent = 'Refresh';
                refreshBtn.disabled = false;
            }
        });
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
        if (!event.data || typeof event.data !== 'object') return;
        
        const message = event.data;
        debug.log('Received iframe message:', message.type);
        
        switch (message.type) {
            case 'walletConnected':
                debug.log('Received wallet connection success message:', message.data);
                // Update connection status
                isWalletConnected = true;
                currentAddress = message.data.address;
                
                // Update UI
                updateWalletUI(true, currentAddress);
                
                // Ensure both localStorage and sessionStorage are saved
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('walletAddress', currentAddress);
                localStorage.setItem('walletType', message.data.walletType || 'metamask');
                
                sessionStorage.setItem('walletConnected', 'true');
                sessionStorage.setItem('walletAddress', currentAddress);
                sessionStorage.setItem('walletType', message.data.walletType || 'metamask');
                
                debug.log('Saved wallet connection status to localStorage and sessionStorage:', {
                    address: currentAddress,
                    type: message.data.walletType
                });
                
                // Handle wallet connection success
                handleWalletConnected(message.data);
                
                // Hide wallet modal
                hideWalletModal();
                
                // If Web3 is initialized, update balance
                if (web3) {
                    updateTokenBalances();
                }
                break;
                
            case 'walletModalClosed':
                // Close wallet modal
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Handle wallet disconnection
                handleWalletDisconnected();
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
                                debug.log(`Synced localStorage: ${key}=${value}`);
                            });
                        }
                        
                        // Sync sessionStorage
                        if (message.data.sessionStorage) {
                            Object.entries(message.data.sessionStorage).forEach(([key, value]) => {
                                sessionStorage.setItem(key, value);
                                debug.log(`Synced sessionStorage: ${key}=${value}`);
                            });
                        }
                        
                        // If the sync is wallet connection information, update UI
                        if (message.data.localStorage && message.data.localStorage.walletAddress) {
                            isWalletConnected = true;
                            currentAddress = message.data.localStorage.walletAddress;
                            
                            // Update UI
                            updateWalletUI(true, currentAddress);
                        }
                    } catch (error) {
                        debug.error('Sync storage error:', error);
                    }
                }
                break;
                
            case 'web3Ready':
                debug.log('Received Web3 ready message:', message.data);
                
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
                
                try {
                    // Select Provider based on wallet type
                    if (message.data.walletType === 'metamask' && window.ethereum) {
                        web3 = new Web3(window.ethereum);
                        debug.log('Created Web3 instance via MetaMask');
                    } else if (message.data.walletType === 'okx' && window.okxwallet) {
                        web3 = new Web3(window.okxwallet);
                        debug.log('Created Web3 instance via OKX wallet');
                    } else if (window.ethereum) {
                        web3 = new Web3(window.ethereum);
                        debug.log('Created Web3 instance via available provider');
                    } else {
                        debug.error('Failed to create Web3 instance: No compatible provider found');
                        
                        // If unable to create Web3 instance, try auto-connect again (max 3 times)
                        if (!window.web3RetryCount) {
                            window.web3RetryCount = 1;
                        } else if (window.web3RetryCount < 3) {
                            window.web3RetryCount++;
                        } else {
                            debug.error('Failed to create Web3 instance after multiple attempts,放弃');
                            return;
                        }
                        
                        debug.log(`Retrying to get Web3 instance, attempt ${window.web3RetryCount}...`);
                        setTimeout(() => {
                            if (walletFrame && walletFrame.contentWindow) {
                                try {
                                    debug.log('Re-sending getWeb3Instance message to wallet iframe');
                                    walletFrame.contentWindow.postMessage({ 
                                        type: 'getWeb3Instance',
                                        walletType: message.data.walletType
                                    }, '*');
                                } catch (retryError) {
                                    debug.error('Failed to get Web3 instance after retry:', retryError);
                                }
                            }
                        }, 500);
                        return;
                    }
                    
                    // Global shared Web3 instance
                    window.homeWeb3 = web3;
                    
                    // Initialize contracts
                    initializeContracts();
                    
                    // If there is address information but the UI is not updated, update UI
                    if (message.data.address) {
                        const noWalletText = i18n && typeof i18n.t === 'function' ? 
                            i18n.t('wallet.noWallet') : 'No wallet connected';
                        
                        // Check if UI needs to be updated (if wallet address is not displayed)
                        if (walletAddressSpan && (
                            walletAddressSpan.textContent === noWalletText || 
                            !walletAddressSpan.textContent ||
                            !isWalletConnected
                        )) {
                            debug.log('Update wallet UI display, address:', message.data.address);
                            currentAddress = message.data.address;
                            isWalletConnected = true;
                            
                            // Use unified UI update function
                            updateWalletUI(true, currentAddress);
                            
                            // Ensure both localStorage and sessionStorage are saved
                            localStorage.setItem('walletConnected', 'true');
                            localStorage.setItem('walletAddress', currentAddress);
                            localStorage.setItem('walletType', message.data.walletType || 'metamask');
                            
                            sessionStorage.setItem('walletConnected', 'true');
                            sessionStorage.setItem('walletAddress', currentAddress);
                            sessionStorage.setItem('walletType', message.data.walletType || 'metamask');
                        }
                    }
                    
                    // Update balance once then stop auto-refresh
                    updateTokenBalances().catch(err => {
                        debug.log('Initial balance update failed, can be manually refreshed later:', err);
                    });
                } catch (error) {
                    debug.error('Failed to create Web3 instance:', error);
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
                        isWalletConnected = false;
                        currentAddress = null;
                        
                        // Update UI
                        updateWalletUI(false);
                        
                        // Reset token balance display
                        if (pwPointBalanceElem) pwPointBalanceElem.textContent = '0';
                        if (pwBountyBalanceElem) pwBountyBalanceElem.textContent = '0';
                        if (pwFoodBalanceElem) pwFoodBalanceElem.textContent = '0';
                    } catch (error) {
                        debug.error('Failed to clear storage:', error);
                    }
                }
                break;
                
            default:
                debug.log('Unhandled message type:', message.type);
                break;
        }
    }
    
    /**
     * Handle wallet connection success
     * @param {Object} data Wallet connection data
     */
    function handleWalletConnected(data) {
        // Web3 has been updated in handleIframeMessage, here mainly handle other business logic
        debug.log('Handle wallet connection success, start initializing contracts');
        
        // If there is already a web3 instance, update balance
        if (web3) {
            initGameTokens();
            
            // Update balance once after wallet connection
            updateTokenBalances();
        } else {
            // Send message to get Web3 instance
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        walletFrame.contentWindow.postMessage({ type: 'getWeb3Instance' }, '*');
                    } catch (error) {
                        debug.error('Error requesting Web3 instance:', error);
                    }
                }
            }, 300);
        }
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send message to disconnect wallet
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        
        // Handle disconnection directly
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleWalletDisconnected() {
        debug.log('Wallet disconnected');
        
        // Reset status
        isWalletConnected = false;
        currentAddress = null;
        web3 = null;
        
        // Update UI - Use the previously modified updateWalletUI function
        updateWalletUI(false);
        
        // Clear localStorage
        debug.log('Clear wallet connection information in localStorage and sessionStorage');
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        // Reset token balance display
        if (pwPointBalanceElem) pwPointBalanceElem.textContent = '0';
        if (pwBountyBalanceElem) pwBountyBalanceElem.textContent = '0';
        if (pwFoodBalanceElem) pwFoodBalanceElem.textContent = '0';
    }
    
    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        if (connected) {
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect wallet';
            walletBtn.classList.add('connected');
            walletAddressSpan.textContent = formatAddress(address);
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
        } else {
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No wallet connected';
            walletAddressSpan.title = '';
            walletAddressSpan.classList.remove('truncated-address');
        }
    }
    
    /**
     * Format address display
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
        
        debug.log('Check wallet connection status in localStorage:', {
            connected: storedConnected,
            address: storedAddress ? formatAddress(storedAddress) : null,
            type: storedWalletType
        });
        
        if (storedConnected === 'true' && storedAddress) {
            debug.log('Found wallet connection information in localStorage');
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
                                type: 'getWeb3Instance' 
                            }, '*');
                            
                            walletFrame.contentWindow.postMessage({ 
                                type: 'autoConnect',
                                walletType: storedWalletType || 'metamask'
                            }, '*');
                        } catch (error) {
                            debug.error('Timeout after retry, send message failed:', error);
                        }
                    }
                }, 2000);
                
                // Store timeout ID, so it can be cleared when web3Ready message is received
                window.web3TimeoutId = timeoutId;
                
                walletFrame.onload = function() {
                    debug.log('Wallet iframe loaded, now send messages');
                    
                    // Delay a little time to ensure iframe internal scripts are initialized
                    setTimeout(() => {
                        if (walletFrame.contentWindow) {
                            try {
                                debug.log('Send getWeb3Instance and autoConnect messages to wallet iframe');
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
                                debug.error('Send message to iframe failed:', error);
                            }
                        } else {
                            debug.error('Wallet iframe contentWindow is not available');
                        }
                    }, 500);
                };
                
                // If iframe has already loaded, directly call onload handler
                if (walletFrame.complete) {
                    debug.log('Wallet iframe already loaded, directly execute onload handler');
                    walletFrame.onload();
                }
            } else {
                debug.error('Wallet iframe element not found');
            }
        } else {
            debug.log('No wallet connection information found in localStorage');
        }
    }
    
    /**
     * Handle language change event
     * @param {CustomEvent} event Language change event
     */
    function handleLocaleChanged(event) {
        console.log('Language has changed, update UI texts');
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
        document.title = i18n.t('navigation.home') + ' - ' + i18n.t('game.title');
        
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
        
        console.log('UI texts updated to language:', i18n.getCurrentLocale());
    }
    
    /**
     * Load contract initializer files
     */
    function loadContractInitializers() {
        debug.log('Loading contract initializer files...');
        
        // Check if already loaded
        if (
            typeof window.initPwPointContract !== 'undefined' &&
            typeof window.initPwBountyContract !== 'undefined' &&
            typeof window.initPwFoodContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initPwNFTContract !== 'undefined'
        ) {
            debug.log('Contract initializer files already loaded');
            return;
        }
        
        // Load PwPoint initializer file
        const pwPointScript = document.createElement('script');
        pwPointScript.src = '../../scripts/init_contracts/initPwPoint.js';
        pwPointScript.onload = function() {
            debug.log('PwPoint initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwPointScript.onerror = function() {
            debug.error('Failed to load PwPoint initializer file');
        };
        
        // Load PwBounty initializer file
        const pwBountyScript = document.createElement('script');
        pwBountyScript.src = '../../scripts/init_contracts/initPwBounty.js';
        pwBountyScript.onload = function() {
            debug.log('PwBounty initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwBountyScript.onerror = function() {
            debug.error('Failed to load PwBounty initializer file');
        };
        
        // Load PwFood initializer file
        const pwFoodScript = document.createElement('script');
        pwFoodScript.src = '../../scripts/init_contracts/initPwFood.js';
        pwFoodScript.onload = function() {
            debug.log('PwFood initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwFoodScript.onerror = function() {
            debug.error('Failed to load PwFood initializer file');
        };
        
        // Load NFTManager initializer file
        const nftManagerScript = document.createElement('script');
        nftManagerScript.src = '../../scripts/init_contracts/initNFTManager.js';
        nftManagerScript.onload = function() {
            debug.log('NFTManager initializer file loaded successfully');
            // Ensure initNFTManagerContract function is correctly exported to the global window object
            if (typeof window.initNFTManagerContract === 'function') {
                debug.log('initNFTManagerContract function is available on the window object');
            } else {
                debug.error('initNFTManagerContract function not found on the window object');
                // If the function exists but is not on the window object, assign it to window
                if (typeof initNFTManagerContract === 'function') {
                    window.initNFTManagerContract = initNFTManagerContract;
                    debug.log('initNFTManagerContract function assigned to window object');
                }
            }
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        nftManagerScript.onerror = function() {
            debug.error('Failed to load NFTManager initializer file');
        };
        
        // Load PwNFT initializer file
        const pwNFTScript = document.createElement('script');
        pwNFTScript.src = '../../scripts/init_contracts/initPwNFT.js';
        pwNFTScript.onload = function() {
            debug.log('PwNFT initializer file loaded successfully');
            // Ensure initPwNFTContract function is correctly exported to the global window object
            if (typeof window.initPwNFTContract === 'function') {
                debug.log('initPwNFTContract function is available on the window object');
            } else {
                debug.error('initPwNFTContract function not found on the window object');
                // If the function exists but is not on the window object, assign it to window
                if (typeof initPwNFTContract === 'function') {
                    window.initPwNFTContract = initPwNFTContract;
                    debug.log('initPwNFTContract function assigned to window object');
                }
            }
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwNFTScript.onerror = function() {
            debug.error('Failed to load PwNFT initializer file');
        };
        
        // Add to document
        document.head.appendChild(pwPointScript);
        document.head.appendChild(pwBountyScript);
        document.head.appendChild(pwFoodScript);
        document.head.appendChild(nftManagerScript);
        document.head.appendChild(pwNFTScript);
    }
    
    /**
     * Initialize game token contracts
     */
    function initGameTokens() {
        try {
            debug.log('Initializing game token contracts...');
            
            if (!web3) {
                debug.error('Failed to initialize game token contracts: Web3 not initialized');
                return;
            }
            
            // Get contract address function
            const getContractAddress = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'MAIN';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // Check if the initialization function is available
            if (typeof window.initPwPointContract !== 'function') {
                debug.error('PwPoint contract initialization function not loaded');
                return;
            }
            
            if (typeof window.initPwBountyContract !== 'function') {
                debug.error('PwBounty contract initialization function not loaded');
                return;
            }
            
            if (typeof window.initPwFoodContract !== 'function') {
                debug.error('PwFood contract initialization function not loaded');
                return;
            }
            
            if (typeof window.initNFTManagerContract !== 'function') {
                debug.error('NFTManager contract initialization function not loaded');

            }
            
            if (typeof window.initPwNFTContract !== 'function') {
                debug.error('PwNFT contract initialization function not loaded');
            }
            
            // Initialize game token contracts
            pwPointContract = window.initPwPointContract(web3, getContractAddress);
            pwBountyContract = window.initPwBountyContract(web3, getContractAddress);
            pwFoodContract = window.initPwFoodContract(web3, getContractAddress);
            
            // Initialize NFT related contracts
            if (typeof window.initNFTManagerContract === 'function') {
                window.nftManagerContract = window.initNFTManagerContract(web3, getContractAddress);
                debug.log('NFTManager contract initialized');
            }
            
            if (typeof window.initPwNFTContract === 'function') {
                window.pwNFTContract = window.initPwNFTContract(web3, getContractAddress);
                debug.log('PwNFT contract initialized');
            }
            
            // Update token balances
            if (currentAddress) {
                updateTokenBalances();
            }
            
            debug.log('Game token contracts initialized');
        } catch (error) {
            debug.error('Failed to initialize game token contracts:', error);
        }
    }
    
    /**
     * Initialize contract instances
     */
    function initializeContracts() {
        if (!web3) {
            debug.error('Web3 instance not initialized');
            return;
        }
        
        try {
            debug.log('Initializing contracts...');
            
            // Initialize game token contracts
            initGameTokens();
            
        } catch (error) {
            debug.error('Failed to initialize contracts:', error);
        }
    }
    
    /**
     * Update token balances
     */
    async function updateTokenBalances() {
        if (!web3 || !currentAddress) {
            debug.log('Web3 or wallet address not available, cannot update token balances');
            return Promise.reject(new Error('Web3 or wallet address not available'));
        }
        
        if (!isWalletConnected) {
            debug.log('Wallet not connected, skip updating token balances');
            return Promise.reject(new Error('Wallet not connected'));
        }
        
        debug.log('Starting to update token balances, address:', currentAddress);
        
        try {
            const promises = [];
            let pwPointBalance = '0';
            let pwBountyBalance = '0';
            let pwFoodBalance = '0';
            
            // Check if the contract exists
            if (!pwPointContract) {
                debug.error('PwPoint contract not initialized');
            }
            if (!pwBountyContract) {
                debug.error('PwBounty contract not initialized');
            }
            if (!pwFoodContract) {
                debug.error('PwFood contract not initialized');
            }
            
            // Get PwPoint balance
            if (pwPointContract) {
                promises.push(
                    (async () => {
                        try {
                            // Try calling the contract method
                            debug.log('Calling PwPoint.balanceOf()...');
                            // Check if the contract method exists
                            if (!pwPointContract.methods || typeof pwPointContract.methods.balanceOf !== 'function') {
                                debug.error('PwPoint contract has no balanceOf method');
                                return;
                            }
                            
                            // Output contract address and ABI information to troubleshoot
                            debug.log('PwPoint contract address:', pwPointContract._address);
                            
                            const balance = await pwPointContract.methods.balanceOf(currentAddress).call();
                            // PwPoint has 18 decimal places
                            pwPointBalance = formatBalance(balance, 0);
                            debug.log('PwPoint balance retrieved successfully:', balance);
                        } catch (error) {
                            debug.error('Failed to retrieve PwPoint balance:', error);
                            // Try other possible method names
                            try {
                                if (pwPointContract.methods.getBalance) {
                                    const balance = await pwPointContract.methods.getBalance(currentAddress).call();
                                    pwPointBalance = formatBalance(balance, 0);
                                    debug.log('Successfully retrieved PwPoint balance using getBalance:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('Failed to retrieve PwPoint balance using fallback method:', fallbackError);
                            }
                        }
                    })()
                );
            } else if (typeof window.initPwPointContract === 'function') {
                debug.log('Initializing temporary contract instance: PwPoint');
                const getContractAddress = (name) => {
                    const network = window.currentNetwork || 'LOCAL';
                    if (window.contractAddresses && window.contractAddresses[network]) {
                        return window.contractAddresses[network][name];
                    }
                    return null;
                };
                const tempPwPointContract = window.initPwPointContract(web3, getContractAddress);
                
                if (tempPwPointContract) {
                    promises.push(
                        (async () => {
                            try {
                                debug.log('Calling PwPoint.balanceOf()...');
                                if (!tempPwPointContract.methods || typeof tempPwPointContract.methods.balanceOf !== 'function') {
                                    debug.error('PwPoint contract has no balanceOf method');
                                    return;
                                }
                                
                                debug.log('PwPoint contract address:', tempPwPointContract._address);
                                const balance = await tempPwPointContract.methods.balanceOf(currentAddress).call();
                                pwPointBalance = formatBalance(balance, 0);
                                debug.log('PwPoint balance retrieved successfully:', balance);
                            } catch (error) {
                                debug.error('Failed to retrieve PwPoint balance:', error);
                                // Try other possible method names
                                try {
                                    if (tempPwPointContract.methods.getBalance) {
                                        const balance = await tempPwPointContract.methods.getBalance(currentAddress).call();
                                        pwPointBalance = formatBalance(balance, 0);
                                        debug.log('Successfully retrieved PwPoint balance using getBalance:', balance);
                                    }
                                } catch (fallbackError) {
                                    debug.error('Failed to retrieve PwPoint balance using fallback method:', fallbackError);
                                }
                            }
                        })()
                    );
                }
            }
            
            // Get PwBounty balance
            if (pwBountyContract) {
                promises.push(
                    (async () => {
                        try {
                            // Try calling the contract method
                            debug.log('Calling PwBounty.balanceOf()...');
                            // Check if the contract method exists
                            if (!pwBountyContract.methods || typeof pwBountyContract.methods.balanceOf !== 'function') {
                                debug.error('PwBounty contract has no balanceOf method');
                                return;
                            }
                            
                            // Output contract address and ABI information to troubleshoot
                            debug.log('PwBounty contract address:', pwBountyContract._address);
                            
                            const balance = await pwBountyContract.methods.balanceOf(currentAddress).call();
                            // PwBounty has 18 decimal places
                            pwBountyBalance = formatBalance(balance, 0);
                            debug.log('PwBounty balance retrieved successfully:', balance);
                        } catch (error) {
                            debug.error('Failed to retrieve PwBounty balance:', error);
                            // Try other possible method names
                            try {
                                if (pwBountyContract.methods.getBalance) {
                                    const balance = await pwBountyContract.methods.getBalance(currentAddress).call();
                                    pwBountyBalance = formatBalance(balance, 0);
                                    debug.log('Successfully retrieved PwBounty balance using getBalance:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('Failed to retrieve PwBounty balance using fallback method:', fallbackError);
                            }
                        }
                    })()
                );
            } else if (typeof window.initPwBountyContract === 'function') {
                debug.log('Initializing temporary contract instance: PwBounty');
                const getContractAddress = (name) => {
                    const network = window.currentNetwork || 'LOCAL';
                    if (window.contractAddresses && window.contractAddresses[network]) {
                        return window.contractAddresses[network][name];
                    }
                    return null;
                };
                const tempPwBountyContract = window.initPwBountyContract(web3, getContractAddress);
                
                if (tempPwBountyContract) {
                    promises.push(
                        (async () => {
                            try {
                                debug.log('Calling PwBounty.balanceOf()...');
                                if (!tempPwBountyContract.methods || typeof tempPwBountyContract.methods.balanceOf !== 'function') {
                                    debug.error('PwBounty contract has no balanceOf method');
                                    return;
                                }
                                
                                debug.log('PwBounty contract address:', tempPwBountyContract._address);
                                const balance = await tempPwBountyContract.methods.balanceOf(currentAddress).call();
                                pwBountyBalance = formatBalance(balance, 0);
                                debug.log('PwBounty balance retrieved successfully:', balance);
                            } catch (error) {
                                debug.error('Failed to retrieve PwBounty balance:', error);
                                // Try other possible method names
                                try {
                                    if (tempPwBountyContract.methods.getBalance) {
                                        const balance = await tempPwBountyContract.methods.getBalance(currentAddress).call();
                                        pwBountyBalance = formatBalance(balance, 0);
                                        debug.log('Successfully retrieved PwBounty balance using getBalance:', balance);
                                    }
                                } catch (fallbackError) {
                                    debug.error('Failed to retrieve PwBounty balance using fallback method:', fallbackError);
                                }
                            }
                        })()
                    );
                }
            }
            
            // Get PwFood balance
            if (pwFoodContract) {
                promises.push(
                    (async () => {
                        try {
                            // Try calling the contract method
                            debug.log('Calling PwFood.balanceOf()...');
                            // Check if the contract method exists
                            if (!pwFoodContract.methods || typeof pwFoodContract.methods.balanceOf !== 'function') {
                                debug.error('PwFood contract has no balanceOf method');
                                return;
                            }
                            
                            // Output contract address and ABI information to troubleshoot
                            debug.log('PwFood contract address:', pwFoodContract._address);
                            
                            const balance = await pwFoodContract.methods.balanceOf(currentAddress).call();
                            // PwFood has no decimal places
                            pwFoodBalance = formatBalance(balance, 0);
                            debug.log('PwFood balance retrieved successfully:', balance);
                        } catch (error) {
                            debug.error('Failed to retrieve PwFood balance:', error);
                            // Try other possible method names
                            try {
                                if (pwFoodContract.methods.getBalance) {
                                    const balance = await pwFoodContract.methods.getBalance(currentAddress).call();
                                    pwFoodBalance = formatBalance(balance, 0);
                                    debug.log('Successfully retrieved PwFood balance using getBalance:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('Failed to retrieve PwFood balance using fallback method:', fallbackError);
                            }
                        }
                    })()
                );
            } else if (typeof window.initPwFoodContract === 'function') {
                debug.log('Initializing temporary contract instance: PwFood');
                const getContractAddress = (name) => {
                    const network = window.currentNetwork || 'LOCAL';
                    if (window.contractAddresses && window.contractAddresses[network]) {
                        return window.contractAddresses[network][name];
                    }
                    return null;
                };
                const tempPwFoodContract = window.initPwFoodContract(web3, getContractAddress);
                
                if (tempPwFoodContract) {
                    promises.push(
                        (async () => {
                            try {
                                debug.log('Calling PwFood.balanceOf()...');
                                if (!tempPwFoodContract.methods || typeof tempPwFoodContract.methods.balanceOf !== 'function') {
                                    debug.error('PwFood contract has no balanceOf method');
                                    return;
                                }
                                
                                debug.log('PwFood contract address:', tempPwFoodContract._address);
                                const balance = await tempPwFoodContract.methods.balanceOf(currentAddress).call();
                                pwFoodBalance = formatBalance(balance, 0);
                                debug.log('PwFood balance retrieved successfully:', balance);
                            } catch (error) {
                                debug.error('Failed to retrieve PwFood balance:', error);
                                // Try other possible method names
                                try {
                                    if (tempPwFoodContract.methods.getBalance) {
                                        const balance = await tempPwFoodContract.methods.getBalance(currentAddress).call();
                                        pwFoodBalance = formatBalance(balance, 0);
                                        debug.log('Successfully retrieved PwFood balance using getBalance:', balance);
                                    }
                                } catch (fallbackError) {
                                    debug.error('Failed to retrieve PwFood balance using fallback method:', fallbackError);
                                }
                            }
                        })()
                    );
                }
            }
            
            // Wait for all balance queries to complete
            await Promise.all(promises);
            
            // Update UI display
            if (pwPointBalanceElem) {
                pwPointBalanceElem.textContent = pwPointBalance;
            }
            
            if (pwBountyBalanceElem) {
                pwBountyBalanceElem.textContent = pwBountyBalance;
            }
            
            if (pwFoodBalanceElem) {
                pwFoodBalanceElem.textContent = pwFoodBalance;
            }
            
            debug.log('Token balances updated successfully', {
                PwPoint: pwPointBalance,
                PwBounty: pwBountyBalance,
                PwFood: pwFoodBalance
            });
            
            return Promise.resolve({
                PwPoint: pwPointBalance,
                PwBounty: pwBountyBalance,
                PwFood: pwFoodBalance
            });
        } catch (error) {
            debug.error('Failed to update token balances:', error);
            return Promise.reject(error);
        }
    }
    
    /**
     * Format balance, handle decimal places
     * @param {string} balance - Original balance (big integer string)
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted balance
     */
    function formatBalance(balance, decimals) {
        if (decimals === 0) {
            return balance;
        }
        
        // Convert big integer to decimal string with decimal places
        const balanceStr = balance.toString();
        
        if (balanceStr.length <= decimals) {
            // If the number length is less than the number of decimal places, add zeros in front
            const zeros = '0'.repeat(decimals - balanceStr.length + 1);
            return `0.${zeros}${balanceStr}`.replace(/\.?0+$/, '');
        } else {
            // Insert decimal point
            const intPart = balanceStr.slice(0, balanceStr.length - decimals);
            const fracPart = balanceStr.slice(balanceStr.length - decimals);
            return `${intPart}.${fracPart}`.replace(/\.?0+$/, '');
        }
    }
    
    /**
     * Bind feature button click events
     */
    function bindFeatureButtons() {
        const stableStakingBtn = document.getElementById('stableStakingBtn');
        const pwStakingBtn = document.getElementById('pwStakingBtn');
        const burnBtn = document.getElementById('burnBtn');
        const reverseBurnBtn = document.getElementById('reverseBurnBtn');
        const exchangeBtn = document.getElementById('exchangeBtn');
        
        // Check buttons and bind events
        if (stableStakingBtn) {
            stableStakingBtn.addEventListener('click', function() {
                window.location.href = './stableStaking.html';
            });
        }
        
        if (pwStakingBtn) {
            pwStakingBtn.addEventListener('click', function() {
                // window.location.href = './staking.html';
                ModalDialog.alert('Coming soon.......', {
                    title: 'Notice'
                });
            });
        }
        
        if (burnBtn) {
            burnBtn.addEventListener('click', function() {
                // window.location.href = './burn.html';
                ModalDialog.alert('Coming soon.......', {
                    title: 'Notice'
                });
            });
        }
        
        if (reverseBurnBtn) {
            reverseBurnBtn.addEventListener('click', function() {
                // window.location.href = './reverseburn.html';
                ModalDialog.alert('Coming soon.......', {
                    title: 'Notice'
                });
            });
        }
        
        if (exchangeBtn) {
            exchangeBtn.addEventListener('click', function() {
                // window.location.href = './exchange.html';
                ModalDialog.alert('Coming soon.......', {
                    title: 'Notice'
                });
            });
        }
    }
    
}); 