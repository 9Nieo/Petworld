// Game Mode Home Script - Farm Version

// Use regular JavaScript to get the i18n instance
// Ensure script loading order, load i18n.js first, then this script

document.addEventListener('DOMContentLoaded', () => {
    // Debugging tool for troubleshooting
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet World]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet World Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet World Warning]', ...args);
        }
    };
    
    // DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const modalContainer = document.getElementById('modalContainer');
    const settingsButton = document.querySelector('.settings-button');
    const modals = document.querySelectorAll('.game-modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const moreButton = document.getElementById('moreButton');
    
    // Token balance display elements
    const pwPointBalanceElem = document.getElementById('pwPointBalance');
    const pwBountyBalanceElem = document.getElementById('pwBountyBalance');
    const pwFoodBalanceElem = document.getElementById('pwFoodBalance');
    
    // Game state variables (managed by WalletNetworkManager)
    let isWalletConnected = false;
    let currentAddress = null;
    let currentWalletType = null;
    let web3 = null;
    
    // Game token contract instances
    let pwPointContract = null;
    let pwBountyContract = null;
    let pwFoodContract = null;
    
    // Dropdown menu instance
    let dropupMenu = null;
    
    // NFT update flag to control NFT refresh frequency
    let lastNFTUpdateTime = 0;
    const NFT_REFRESH_COOLDOWN = 120000; // 2 minutes cooldown time 
    const VISIBILITY_REFRESH_COOLDOWN = 3600000; // 1 hour cooldown for visibility change refresh
    
    // Loading NFT flag to prevent concurrent loading
    let isLoadingNFT = false;
    
    // Sound manager reference
    let soundManager = null;
    
    // WalletNetworkManager instance
    let walletNetworkManager = null;
    
    // Initialization
    init();
    
    /**
     * Initialization function
     */
    async function init() {
        console.log('Initializing game home page...');
        
        // Initialize sound manager
        initSoundManager();
        
        // Bind UI event listeners
        bindEventListeners();
        
        // Initialize WalletNetworkManager
        await initializeWalletNetworkManager();
        
        // Apply current language settings
        localizeContent();
        
        // Initialize all pet features
        initializeAllPetFeatures();
        
        // Start memory cleanup interval
        startMemoryCleanup();
    }
    
    /**
     * Bind all UI event listeners
     */
    function bindEventListeners() {
        // Bind wallet connection button click event
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind navigation buttons click events
        navItems.forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                const modalType = navItem.getAttribute('data-modal');
                if (modalType && modalType !== 'more') {
                    const modalId = modalType + '-modal';
                    debug.log('Navigation item clicked:', modalType, 'opening modal:', modalId);
                    openModal(modalId);
                }
            });
        });
        
        // Bind close modal buttons click events
        closeButtons.forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debug.log('Close button clicked, closing all modals');
                closeAllModals();
            });
        });
        
        // Bind modal container click event to close modals when clicking outside
        if (modalContainer) {
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) {
                    debug.log('Modal container clicked, closing all modals');
                    closeAllModals();
                }
            });
        }
        
        // Bind ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalContainer && modalContainer.classList.contains('active')) {
                debug.log('ESC key pressed, closing all modals');
                closeAllModals();
            }
        });
        
        // Listen for messages from the wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for settings messages
        window.addEventListener('message', handleSettingsMessage);
        
        // Listen for visibility change events (with passive option for better performance)
        document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
        
        // Initialize more menu
        initMoreMenu();
    }
    
    /**
     * Initialize WalletNetworkManager
     */
    async function initializeWalletNetworkManager() {
        debug.log('Initializing WalletNetworkManager...');
        
        try {
            // Wait for WalletNetworkManager to be available
        let attempts = 0;
            const maxAttempts = 50;
        
            while (!window.WalletNetworkManager && attempts < maxAttempts) {
                debug.log(`Waiting for WalletNetworkManager... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
            if (!window.WalletNetworkManager) {
                throw new Error('WalletNetworkManager not available after timeout');
        }
        
            // Create WalletNetworkManager instance
            walletNetworkManager = new window.WalletNetworkManager();
            
            // Set up event listeners
            setupWalletNetworkManagerEventListeners();
            
            // Initialize WalletNetworkManager
            const initResult = await walletNetworkManager.init();
            
            debug.log('WalletNetworkManager initialization result:', initResult);
            
            if (initResult.success) {
                // Update local state from manager
                updateLocalStateFromManager(initResult);
                
                // Initialize contracts if wallet is connected
                if (initResult.isConnected && initResult.walletType) {
                    await initializeContractsWithManager();
                }
                
                // Additional wallet status check after initialization (optimized timing)
                setTimeout(() => {
                    debug.log('Performing additional wallet status check after WalletNetworkManager initialization');
                    checkWalletStatus();
                }, 200);
                
                // Load farm animals (reduced delay for better performance)
                setTimeout(() => {
                    loadFarmAnimals(false);
                }, 500);
            } else {
                debug.warn('WalletNetworkManager initialization failed:', initResult.error);
                // Still check for stored wallet status
                setTimeout(() => {
                    debug.log('WalletNetworkManager failed, checking stored wallet status');
                    checkWalletStatus();
                }, 500);
                // Still try to load farm animals without wallet
                loadFarmAnimals(false);
            }
        } catch (error) {
            debug.error('Failed to initialize WalletNetworkManager:', error);
            // Show error message but continue
            showRefreshToast('Failed to initialize wallet manager. Some features may not work properly.');
            loadFarmAnimals(false);
        }
            }
            
    /**
     * Set up WalletNetworkManager event listeners
     */
    function setupWalletNetworkManagerEventListeners() {
        if (!walletNetworkManager) return;
        
        // Listen for wallet ready events
        walletNetworkManager.on('onWalletReady', (data) => {
            debug.log('Wallet ready event received:', data);
            updateLocalStateFromManager(data);
            
            // Initialize contracts when wallet becomes ready
            initializeContractsWithManager().then(() => {
                debug.log('Contracts initialized after wallet ready');
                loadFarmAnimals(true);
            }).catch(error => {
                debug.error('Failed to initialize contracts after wallet ready:', error);
            });
        });
        
        // Listen for network change events
        walletNetworkManager.on('onNetworkChanged', (data) => {
            debug.log('Network changed event received:', data);
            // Reinitialize contracts for new network
            initializeContractsWithManager().then(() => {
                debug.log('Contracts reinitialized after network change');
                loadFarmAnimals(true);
            }).catch(error => {
                debug.error('Failed to reinitialize contracts after network change:', error);
            });
        });
        
        // Listen for connection status changes
        walletNetworkManager.on('onConnectionStatusChanged', (data) => {
            debug.log('Connection status changed:', data);
            updateLocalStateFromManager(data);
        });
    }
    
    /**
     * Update local state from WalletNetworkManager
     */
    function updateLocalStateFromManager(managerData) {
        const wasConnected = isWalletConnected;
        const oldAddress = currentAddress;
        
        debug.log('Updating local state from WalletNetworkManager, received data:', managerData);
        
        // Update local state
        isWalletConnected = managerData.isConnected || false;
        
        // Get current address from manager with multiple fallback methods
        let newAddress = null;
        if (walletNetworkManager) {
            newAddress = walletNetworkManager.getCurrentAddress();
            debug.log('Address from walletNetworkManager.getCurrentAddress():', newAddress);
            
            // If no address from getCurrentAddress, try other methods
            if (!newAddress && managerData.address) {
                newAddress = managerData.address;
                debug.log('Using address from managerData:', newAddress);
            }
            
            // If still no address, check stored values
            if (!newAddress && isWalletConnected) {
                newAddress = sessionStorage.getItem('walletAddress') || localStorage.getItem('walletAddress');
                debug.log('Using stored address as fallback:', newAddress);
            }
        }
        
        currentAddress = newAddress;
        currentWalletType = managerData.walletType;
    
        // Get Web3 instance from manager
        const managerWeb3 = walletNetworkManager ? walletNetworkManager.getWeb3() : null;
        if (managerWeb3) {
            web3 = managerWeb3;
            window.web3 = managerWeb3;
            window.gameWeb3 = managerWeb3;
        }
        
        debug.log('Local state updated from WalletNetworkManager:', {
            isConnected: isWalletConnected,
            address: currentAddress,
            walletType: currentWalletType,
            hasWeb3: !!web3,
            wasConnected: wasConnected,
            oldAddress: oldAddress
        });
            
        // Always update UI, even if address is null (for disconnected state)
        updateWalletUI(isWalletConnected, currentAddress);
        
        // Also update stored values if connected
        if (isWalletConnected && currentAddress) {
            debug.log('Updating stored wallet connection info');
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', currentAddress);
            if (currentWalletType) {
                localStorage.setItem('walletType', currentWalletType);
            }
            
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', currentAddress);
            if (currentWalletType) {
                sessionStorage.setItem('walletType', currentWalletType);
            }
        }
            
        // Update token balances if wallet is connected and contracts are initialized
        if (isWalletConnected && currentAddress && web3 && pwPointContract && pwBountyContract && pwFoodContract) {
            updateTokenBalances().catch(error => {
                debug.error('Failed to update token balances:', error);
            });
        } else if (isWalletConnected && currentAddress && web3) {
            debug.log('Wallet connected but contracts not yet initialized, skipping token balance update');
        }
        
        // If wallet status changed, refresh farm animals
        if (wasConnected !== isWalletConnected || oldAddress !== currentAddress) {
            setTimeout(() => {
                loadFarmAnimals(true);
            }, 500);
        }
    }
    
    /**
     * Initialize contracts using WalletNetworkManager
     */
    async function initializeContractsWithManager() {
        try {
            debug.log('Initializing contracts with WalletNetworkManager...');
            
            if (!walletNetworkManager || !walletNetworkManager.isReadyForContracts()) {
                throw new Error('WalletNetworkManager not ready for contract operations');
            }
            
            // Initialize main contracts through WalletNetworkManager
            const contractResult = await walletNetworkManager.initializeContracts({
                contracts: ['NFTManager', 'PwNFT', 'NFTFeedingManager', 'PaymentManager']
            });
            
            debug.log('WalletNetworkManager contract initialization result:', contractResult);
    
            // Initialize token contracts separately using traditional method
            debug.log('Initializing token contracts using traditional method...');
            const tokenInitSuccess = await initGameTokens();
            
                         if (contractResult.success && tokenInitSuccess) {
                debug.log('All contracts initialized successfully');
            
                // Verify contracts are properly set
                debug.log('Contract verification:', {
                    pwPointContract: !!pwPointContract,
                    pwBountyContract: !!pwBountyContract,
                    pwFoodContract: !!pwFoodContract,
                    currentAddress: !!currentAddress
                });
            
                // Update token balances only if all contracts are initialized
                if (currentAddress && pwPointContract && pwBountyContract && pwFoodContract) {
                    debug.log('All contracts verified, updating token balances...');
                    await updateTokenBalances();
                } else {
                    debug.warn('Some contracts not initialized, skipping token balance update');
                }
                
            return true;
            } else {
                throw new Error('Contract initialization failed');
            }
        } catch (error) {
            debug.error('Failed to initialize contracts with manager:', error);
            
            // Fallback to original contract initialization
            debug.log('Falling back to original contract initialization...');
            return await initGameTokens();
        }
    }
    
    // Removed deprecated wallet initialization functions - functionality moved to WalletNetworkManager
    
    /**
     * Initialize contracts with retry mechanism
     */
    async function initContractsWithRetry() {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                debug.log(`Initializing contracts (attempt ${retryCount + 1}/${maxRetries})...`);
                
                // If using private key wallet, add additional verification
                if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                    debug.log('Using private key wallet, performing additional checks...');
                    
                    // Verify wallet is ready
                    const walletStatus = window.SecureWalletManager.getWalletStatus();
                    if (!walletStatus.isReady || !walletStatus.web3Available) {
                        throw new Error('Private key wallet not ready for contract initialization');
                    }
                    
                    // Verify Web3 instance
                    const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                    if (!privateKeyWeb3 || !privateKeyWeb3.eth) {
                        throw new Error('Private key wallet Web3 instance invalid');
                    }
                    
                    // Test network connectivity
                    try {
                        const networkId = await privateKeyWeb3.eth.net.getId();
                        const blockNumber = await privateKeyWeb3.eth.getBlockNumber();
                        debug.log('Private key wallet network test successful:', { networkId, blockNumber });
                    } catch (networkError) {
                        throw new Error('Private key wallet network connectivity test failed: ' + networkError.message);
                    }
                    
                    // Ensure global Web3 instances are set
                    web3 = privateKeyWeb3;
                    window.web3 = privateKeyWeb3;
                    window.gameWeb3 = privateKeyWeb3;
                }
        
                // Call the original initGameTokens function
                await initGameTokens();
                
                // Verify that key contracts are initialized
                if (pwPointContract && pwBountyContract && pwFoodContract) {
                    debug.log('Contracts initialized successfully');
                    
                    // Additional verification: test contract calls
                    try {
                        debug.log('Testing contract functionality...');
                        
                        // Test PwPoint contract
                        if (pwPointContract.methods && typeof pwPointContract.methods.balanceOf === 'function') {
                            debug.log('PwPoint contract methods verified');
                        } else {
                            throw new Error('PwPoint contract methods not available');
                        }
                        
                        // Test PwBounty contract
                        if (pwBountyContract.methods && typeof pwBountyContract.methods.balanceOf === 'function') {
                            debug.log('PwBounty contract methods verified');
                        } else {
                            throw new Error('PwBounty contract methods not available');
                        }
                        
                        // Test PwFood contract
                        if (pwFoodContract.methods && typeof pwFoodContract.methods.balanceOf === 'function') {
                            debug.log('PwFood contract methods verified');
                        } else {
                            throw new Error('PwFood contract methods not available');
                        }
                        
                        debug.log('All contract functionality tests passed');
                        
                    } catch (testError) {
                        debug.warn('Contract functionality test failed:', testError.message);
                        // Continue anyway, as the contracts might still work
                    }
                    
                    return true;
                } else {
                    throw new Error('Key contracts not initialized properly');
                }
            } catch (error) {
                debug.error(`Contract initialization attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    // Progressive delay: 1s, 2s, 3s
                    const delay = 1000 * retryCount;
                    debug.log(`Retrying contract initialization in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // If using private key wallet and this is not the last attempt, try to reinitialize
                    if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                        debug.log('Attempting to reinitialize private key wallet before retry...');
                        try {
                            if (window.SecureWalletManager.forceReinitializeAccount) {
                                await window.SecureWalletManager.forceReinitializeAccount();
                                debug.log('Private key wallet reinitialized for retry');
                            }
                        } catch (reinitError) {
                            debug.warn('Failed to reinitialize private key wallet:', reinitError.message);
                        }
                    }
                }
            }
        }
        
        throw new Error('Failed to initialize contracts after all retries');
    }
    
    /**
     * Initialize sound manager and play background music
     */
    function initSoundManager() {
        // Get global sound manager instance
        if (window.SoundManager) {
            soundManager = window.SoundManager;
            debug.log('Got SoundManager instance from global object');
            
            // Enable debug mode if needed
            // soundManager.debug = true;
            
            // Initialize the sound manager
            soundManager.init().then(success => {
                if (success) {
                    debug.log('SoundManager initialized successfully');
                    
                    // Play background music
                    soundManager.playBackgroundMusic();
                } else {
                    debug.error('Failed to initialize SoundManager');
                }
            });
        } else {
            debug.error('SoundManager not found, unable to play background music');
        }
    }
    
    /**
     * Handle settings messages from iframes
     */
    function handleSettingsMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;
        
        const message = event.data;
        
        if (message.type === 'settingsAction' && message.action === 'save' && message.settings) {
            debug.log('Received settings update:', message.settings);
            
            // Apply audio settings if they exist
            if (message.settings.audio && soundManager) {
                soundManager.applySettings(message.settings.audio);
                debug.log('Applied audio settings from settings page');
            }
        }
    }
    
    /**
     * Clean up all static example animals and related elements
     */
    function cleanupStaticAnimals() {
        debug.log('Cleaning up all static example animals...');
        
        // Get the farm animal container
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) {
            debug.error('Farm animal container not found');
            return;
        }
        
        // Clear all content inside the container
        farmContainer.innerHTML = '';
        
        // Check if there are shadow elements remaining elsewhere
        const shadowElements = document.querySelectorAll('.pet-shadow');
        shadowElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        debug.log('Static example animals cleanup completed');
    }
    
    /**
     * Initialize all pet features, including shadows and animations
     */
    function initializeAllPetFeatures() {
        // Clean up the page
        cleanupAllPageElements();
        
        // Initialize pet size manager
        if (window.PetSizeManager) {
            debug.log('Initializing pet size manager...');
            // Enable debug mode to see sizing process
            window.PetSizeManager.debug = true;
            
            // Apply to all pets
            setTimeout(() => {
                const farmContainer = document.getElementById('farm-animals-container');
                window.PetSizeManager.applyToAll(farmContainer || document);
            }, 200);
        }
        
        // Initialize pet Z-Index manager
        if (window.PetZIndexManager) {
            debug.log('Initializing pet Z-Index manager...');
            // Can enable debug mode to see detailed logs
            // window.PetZIndexManager.config.debug = true;
            
            // Ensure initialized
            if (!window.PetZIndexManager.initialized) {
                window.PetZIndexManager.init();
            }
            
            // Update Z-Index for all pets
            setTimeout(() => {
                window.PetZIndexManager.updateAllPetZIndexes();
            }, 300);
        }
        
        // Check and apply all shadows
        if (window.PetShadowManager) {
            debug.log('Initializing all pet shadows...');
            // First clean up all orphaned shadows
            if (typeof window.PetShadowManager.cleanupOrphanedShadows === 'function') {
                debug.log('Cleaning up orphaned pet shadows...');
                window.PetShadowManager.cleanupOrphanedShadows();
            }
            
            // Reapply shadows with better timing
            requestAnimationFrame(() => {
            setTimeout(() => {
                window.PetShadowManager.applyToAll();
                }, 200);
            });
        } else {
            debug.error('PetShadowManager not available, unable to apply shadows');
        }
        
        // If NFTs have not been loaded, load once with delay for private key wallet
        const farmAnimalsContainer = document.getElementById('farm-animals-container');
        if (farmAnimalsContainer && (!farmAnimalsContainer.children || farmAnimalsContainer.children.length === 0)) {
            debug.log('Pet container is empty, loading NFT data...');
            
            // Check if using private key wallet and add delay if needed
            if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
                debug.log('Using private key wallet, adding delay before loading NFTs...');
                setTimeout(() => {
                    loadFarmAnimals(false);  // Use non-force mode, respect refresh interval
                }, 5000); // Increased to 5 seconds delay for private key wallet network sync
            } else {
                loadFarmAnimals(false);  // Use non-force mode, respect refresh interval
            }
        } else {
            debug.log('Pet container already has content, skipping NFT load');
            
            // Only process existing pet animations with better timing
            requestAnimationFrame(() => {
            setTimeout(() => {
                applyAnimationsToExistingPets();
                }, 500);
            });
        }
    }
    
    /**
     * Clean up all page elements
     */
    function cleanupAllPageElements() {
        debug.log('Cleaning up page elements...');
        
        // Find all shadow elements and remove them directly
        const allShadows = document.querySelectorAll('.pet-shadow');
        for (const shadow of allShadows) {
            if (shadow.parentNode) {
                shadow.parentNode.removeChild(shadow);
            }
        }
        
        // Ensure all egg elements have only one shadow
        const allEggs = document.querySelectorAll('.egg-nft, .animal');
        allEggs.forEach(egg => {
            // Remove data-has-shadow attribute
            egg.removeAttribute('data-has-shadow');
            
            // Remove all shadows from the element
            const eggShadows = egg.querySelectorAll('.pet-shadow');
            eggShadows.forEach(shadow => {
                shadow.parentNode.removeChild(shadow);
            });
        });
        
        debug.log(`Cleanup completed: Removed ${allShadows.length} shadow elements`);
    }
    
    // Visibility change optimization
    let lastVisibilityChangeTime = 0;
    let visibilityChangeTimeout = null;
    const VISIBILITY_CHANGE_DEBOUNCE = 500; // 500ms debounce for visibility changes
    
    /**
     * Handle page visibility change (optimized)
     */
    function handleVisibilityChange() {
        const currentTime = Date.now();
        
        // Debounce rapid visibility changes
        if (currentTime - lastVisibilityChangeTime < VISIBILITY_CHANGE_DEBOUNCE) {
            if (visibilityChangeTimeout) {
                clearTimeout(visibilityChangeTimeout);
            }
            visibilityChangeTimeout = setTimeout(() => {
                handleVisibilityChangeInternal();
            }, VISIBILITY_CHANGE_DEBOUNCE);
            return;
        }
        
        lastVisibilityChangeTime = currentTime;
        handleVisibilityChangeInternal();
    }
    
    /**
     * Internal visibility change handler
     */
    function handleVisibilityChangeInternal() {
        if (document.visibilityState === 'visible') {
            debug.log('Page became visible, checking if NFT data needs to be refreshed');
            
            // Resume background music if it was playing before
            if (soundManager && !soundManager.settings.muteBackground) {
                soundManager.playBackgroundMusic();
                debug.log('Resumed background music on page visibility change');
            }
            
            // Get current time
            const currentTime = Date.now();
            
            // Check if the time since the last update exceeds the visibility change cooldown time
            if (currentTime - lastNFTUpdateTime > VISIBILITY_REFRESH_COOLDOWN) {
                debug.log('Time since last NFT update has exceeded visibility cooldown time, refreshing NFT data');
                loadFarmAnimals(true);
            } else {
                debug.log(`NFT refresh is still in cooldown (${Math.floor((VISIBILITY_REFRESH_COOLDOWN - (currentTime - lastNFTUpdateTime))/1000)} seconds remaining), skipping refresh`);
                
                // Only reapply existing animations and shadows if not currently applying effects
                if (!isApplyingEffects && window.PetShadowManager) {
                    setTimeout(() => {
                        if (!isApplyingEffects) { // Double check to avoid conflicts
                        window.PetShadowManager.applyToAll();
                        }
                    }, 300);
                }
            }
        } else if (document.visibilityState === 'hidden') {
            // Clear any pending visibility change timeouts
            if (visibilityChangeTimeout) {
                clearTimeout(visibilityChangeTimeout);
                visibilityChangeTimeout = null;
            }
            
            // Optionally pause the music when the page is hidden (tab changed, etc.)
            // Uncomment if you want to pause music when the page is not visible
            // if (soundManager && soundManager.isMusicPlaying) {
            //     soundManager.stopBackgroundMusic();
            //     debug.log('Paused background music when page became hidden');
            // }
        }
    }
    
    /**
     * Initialize dropdown menu for more button
     */
    function initMoreMenu() {
        if (!window.DropupMenu) {
            debug.error('DropupMenu component not loaded, unable to initialize more menu');
            return;
        }

        // Menu item definitions
        const menuItems = [
            {
                id: 'settings',
                icon: '⚙️',
                text: i18n ? i18n.t('navigation.settings') : 'Settings',
                i18nKey: 'navigation.settings',
                action: () => {
                    openModal('settings-modal');
                }
            },
            {
                id: 'stableStaking',
                icon: '💰',
                text: i18n ? i18n.t('navigation.stableStaking') : 'Stablecoin Staking',
                i18nKey: 'navigation.stableStaking',
                action: () => {
                    openModal('stableStaking-modal');
                }
            },
            {
                id: 'pwStaking',
                icon: '⏳',
                text: i18n ? i18n.t('navigation.pwStaking') : 'PW Staking',
                i18nKey: 'navigation.pwStaking',
                action: () => {
                    showFeatureNotImplemented('PW Staking feature');
                }
            },
            {
                id: 'burn',
                icon: '🔥',
                text: i18n ? i18n.t('navigation.burn') : 'Burn',
                i18nKey: 'navigation.burn',
                action: () => {
                    showFeatureNotImplemented('Burn feature');
                }
            },
            {
                id: 'reverseBurn',
                icon: '♻️',
                text: i18n ? i18n.t('navigation.reverseBurn') : 'Reverse Burn',
                i18nKey: 'navigation.reverseBurn',
                action: () => {
                    showFeatureNotImplemented('Reverse Burn feature');
                }
            },
            {
                id: 'exchange',
                icon: '🔄',
                text: i18n ? i18n.t('navigation.exchange') : 'Exchange',
                i18nKey: 'navigation.exchange',
                action: () => {
                    showFeatureNotImplemented('Exchange feature');
                }
            }
        ];

        // Initialize dropdown menu
        dropupMenu = new DropupMenu({
            triggerButtonId: 'moreButton',
            menuItems: menuItems,
            i18n: window.i18n
        });

        debug.log('More menu initialization completed');
    }

    /**
     * Show feature not implemented prompt
     * @param {string} featureName - Feature name
     */
    function showFeatureNotImplemented(featureName) {
        // Always return "Coming soon" for these features
        const featureKey = featureName.toLowerCase();
        const comingSoonMessage = "Coming soon......";

        // Use ModalDialog if available
        if (window.ModalDialog) {
            window.ModalDialog.show({
                title: featureName,
                content: comingSoonMessage,
                confirmText: i18n ? i18n.t('common.ok') : 'OK'
            });
        } else {
            // Fallback to simple alert
            alert(comingSoonMessage);
        }
    }
    
    
    /**
     * Check wallet connection status using WalletNetworkManager
     */
    function checkWalletStatus() {
        debug.log('Checking wallet status...');
        
        if (walletNetworkManager) {
            try {
            const status = walletNetworkManager.getStatus();
            debug.log('Wallet status from WalletNetworkManager:', status);
                
                // If WalletNetworkManager has status, use it
                if (status && (status.isConnected || status.address)) {
            updateLocalStateFromManager(status);
                } else {
                    // If WalletNetworkManager doesn't have status, try to get current address
                    const currentAddr = walletNetworkManager.getCurrentAddress();
                    debug.log('Current address from WalletNetworkManager:', currentAddr);
                    
                    if (currentAddr) {
                        // Create status object if we have an address
                        const manualStatus = {
                            isConnected: true,
                            address: currentAddr,
                            walletType: localStorage.getItem('walletType') || 'unknown'
                        };
                        updateLocalStateFromManager(manualStatus);
                    } else {
                        // No address from manager, fall back to stored values
                        debug.log('No address from WalletNetworkManager, checking stored values');
                        checkStoredWalletStatus();
                    }
                }
            } catch (error) {
                debug.error('Error getting status from WalletNetworkManager:', error);
                // Fall back to stored values
                checkStoredWalletStatus();
            }
                            } else {
            debug.warn('WalletNetworkManager not available, falling back to basic check');
            checkStoredWalletStatus();
        }
    }
    
    /**
     * Check stored wallet status as fallback
     */
    function checkStoredWalletStatus() {
        debug.log('Checking stored wallet status...');
        
            // Basic fallback check
            const connectedWallet = sessionStorage.getItem('walletConnected') === 'true' || 
                                   localStorage.getItem('walletConnected') === 'true';
            const storedAddress = sessionStorage.getItem('walletAddress') || 
                                 localStorage.getItem('walletAddress');
        const storedWalletType = sessionStorage.getItem('walletType') || 
                                localStorage.getItem('walletType');
    
        debug.log('Stored wallet info:', {
            connected: connectedWallet,
            address: storedAddress,
            type: storedWalletType
        });
        
            if (connectedWallet && storedAddress) {
            isWalletConnected = true;
                currentAddress = storedAddress;
            currentWalletType = storedWalletType;
            updateWalletUI(true, currentAddress);
            debug.log('Restored wallet connection from storage:', currentAddress);
                } else {
                isWalletConnected = false;
                currentAddress = null;
            currentWalletType = null;
                updateWalletUI(false);
            debug.log('No stored wallet connection found');
        }
    }
    
    /**
     * Load user's farm animals
     * @param {boolean} forceUpdate - Whether to force refresh NFT data
     */
    async function loadFarmAnimals(forceUpdate = false) {
        const farmAnimalsContainer = document.getElementById('farm-animals-container');
        if (!farmAnimalsContainer) {
            debug.error('Farm animals container not found');
            return;
        }
        
        // Prevent concurrent loading - if loading is in progress, do not start a new loading process
        if (isLoadingNFT) {
            debug.log('NFT data is currently loading, ignoring duplicate load request');
            return;
        }
        
        // Check if repeated loading occurs in a short time (unless forced refresh)
        const currentTime = Date.now();
        
        if (!forceUpdate && (currentTime - lastNFTUpdateTime < NFT_REFRESH_COOLDOWN)) {
            debug.log(`Repeated loading in a short time (${Math.floor((currentTime - lastNFTUpdateTime)/1000)} seconds), ignored`);
            return;
        }
        
        // Set loading flag
        isLoadingNFT = true;
        
        // Update loading time
        lastNFTUpdateTime = currentTime;
        
        debug.log(`Starting to load NFT data ${forceUpdate ? '(forced refresh)' : '(regular refresh)'}`);
        
        // Clear existing content
        farmAnimalsContainer.innerHTML = '';
        
        // Priority 1: Use WalletNetworkManager to get current address
        if (walletNetworkManager) {
            const managerAddress = walletNetworkManager.getCurrentAddress();
            if (managerAddress) {
                debug.log('Using WalletNetworkManager address for NFT loading:', managerAddress);
                currentAddress = managerAddress;
                isWalletConnected = true;
                
                // Verify WalletNetworkManager is ready for contracts
                if (!walletNetworkManager.isReadyForContracts()) {
                    debug.warn('WalletNetworkManager not ready for contracts, waiting...');
                    // Add a delay to allow manager to fully initialize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Re-check status
                    if (!walletNetworkManager.isReadyForContracts()) {
                        debug.error('WalletNetworkManager still not ready after waiting');
                        isLoadingNFT = false;
                        showAdoptPetButton(farmAnimalsContainer);
                        return;
                    }
                }
            }
        }
        
        // Fallback: Check if using private key wallet directly
        if (!currentAddress && window.SecureWalletManager) {
            const walletStatus = window.SecureWalletManager.getWalletStatus();
            if (walletStatus.usingPrivateKey && walletStatus.activeAddress) {
                debug.log('Using private key wallet for NFT loading (fallback):', walletStatus.activeAddress);
                currentAddress = walletStatus.activeAddress;
                isWalletConnected = true;
                
                // Verify private key wallet is fully ready before proceeding
                if (!walletStatus.isReady || !walletStatus.web3Available) {
                    debug.warn('Private key wallet not fully ready, waiting...');
                    // Add a delay to allow wallet to fully initialize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Re-check status
                    const updatedStatus = window.SecureWalletManager.getWalletStatus();
                    if (!updatedStatus.isReady || !updatedStatus.web3Available) {
                        debug.error('Private key wallet still not ready after waiting');
                        isLoadingNFT = false;
                        showAdoptPetButton(farmAnimalsContainer);
                        return;
                    }
                }
            }
        }
        
        // Try to load NFTs using PetNFTService
        if (window.PetNFTService) {
            debug.log('Trying to load cached or online NFT pets using PetNFTService');
            
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-animal-indicator';
            loadingIndicator.textContent = 'Loading pets...';
            loadingIndicator.style.textAlign = 'center';
            loadingIndicator.style.padding = '20px';
            loadingIndicator.style.color = '#666';
            farmAnimalsContainer.appendChild(loadingIndicator);
            
            // Get user address (priority: WalletNetworkManager > current address > private key wallet > storage)
            let userAddress = currentAddress;
            
            // Priority 1: Use WalletNetworkManager
            if (!userAddress && walletNetworkManager) {
                userAddress = walletNetworkManager.getCurrentAddress();
                if (userAddress) {
                    currentAddress = userAddress;
                    isWalletConnected = true;
                }
            }
            
            // Priority 2: Use private key wallet directly
            if (!userAddress && window.SecureWalletManager) {
                const walletStatus = window.SecureWalletManager.getWalletStatus();
                if (walletStatus.activeAddress) {
                    userAddress = walletStatus.activeAddress;
                    currentAddress = userAddress;
                    isWalletConnected = true;
                }
            }
            
            // Priority 3: Use stored address
            if (!userAddress) {
                userAddress = localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
            }
            
            debug.log('Loading NFTs for address:', userAddress);
            
            // First ensure PetNFTService is initialized
            try {
                const initSuccess = await window.PetNFTService.init();
                debug.log('PetNFTService initialization ' + (initSuccess ? 'succeeded' : 'failed'));
                
                if (!initSuccess) {
                    debug.error('PetNFTService initialization failed, unable to load NFTs');
                    // Remove loading indicator
                    if (loadingIndicator.parentNode) {
                        farmAnimalsContainer.removeChild(loadingIndicator);
                    }
                    isLoadingNFT = false; // Reset loading flag
                    
                    // Show adopt button
                    showAdoptPetButton(farmAnimalsContainer);
                    return;
                }
                
                // Check if NFT data needs to be refreshed
                const needsRefresh = forceUpdate || window.PetNFTService.needsRefresh({
                    userAddress: userAddress,
                    refreshInterval: NFT_REFRESH_COOLDOWN, // Use the same cooldown as defined above (2 minutes)
                });
                
                if ((needsRefresh || forceUpdate) && userAddress) {
                    debug.log('Need to refresh NFT data, fetching latest data from the chain...');
                    
                    // Call PetNFTService to refresh NFT data
                    const result = await window.PetNFTService.refreshNFTs(userAddress, {
                        forceUpdate: true, // Force to get the latest data from the chain
                        refreshInterval: NFT_REFRESH_COOLDOWN, // Use the same cooldown as defined above (2 minutes)
                        skipIntervalCheck: true, // Skip interval check, always refresh
                        removeDuplicates: true // Add duplicate removal
                    });
                    
                    debug.log('NFT data refresh result:', result);
                    
                    // Remove loading indicator
                    if (loadingIndicator.parentNode) {
                        farmAnimalsContainer.removeChild(loadingIndicator);
                    }
                    
                    if (result.success && result.nfts && result.nfts.length > 0) {
                        debug.log(`Successfully refreshed and loaded ${result.nfts.length} NFT pets`);
                        
                        // Sort NFTs by quality (from high to low)
                        const sortedNFTs = sortNFTsByQuality(result.nfts);
                        debug.log(`Sorted NFT list by quality:`, sortedNFTs.map(nft => 
                            `${nft.metadata?.name || `#${nft.tokenId}`} - ${nft.metadata?.attributes?.find(attr => attr.trait_type === 'Quality')?.value || 'unknown'}`
                        ));
                        
                        // Show up to 10 pets in the farm
                        const nftsToShow = sortedNFTs.slice(0, 10);
                        
                        // Generate positions based on the number of pets
                        const positions = generatePositions(nftsToShow.length);
                        
                        // Add NFTs as animals to the farm
                        nftsToShow.forEach((nft, index) => {
                            try {
                                const animalElement = createNFTAnimalElement(nft, positions[index]);
                                farmAnimalsContainer.appendChild(animalElement);
                                
                                // PetSizeManager will be applied later in the timing sequence
                                // to ensure proper rendering before sizing
                            } catch (error) {
                                debug.error(`Failed to create NFT animal element for token ${nft.tokenId}:`, error);
                            }
                        });
                        
                        // Apply PetSizeManager first, then Z-index and shadows, then animations with proper delays (optimized)
                        applyPetEffectsOptimized(farmAnimalsContainer, nftsToShow, 'refreshed');
                    } else {
                        debug.log('No NFT pets found or loading failed, trying to load from cache');
                        loadFromCacheOrDefault(farmAnimalsContainer, userAddress);
                    }
                    
                    // Reset loading flag
                    isLoadingNFT = false;
                } else {
                    // If no need to refresh or cannot refresh, try to load from cache
                    debug.log('Using cached NFT data');
                    
                    // Remove loading indicator
                    if (loadingIndicator.parentNode) {
                        farmAnimalsContainer.removeChild(loadingIndicator);
                    }
                    
                    loadFromCacheOrDefault(farmAnimalsContainer, userAddress);
                    
                    // Reset loading flag
                    isLoadingNFT = false;
                }
            } catch (error) {
                debug.error('PetNFTService initialization failed:', error);
                
                // Remove loading indicator
                if (loadingIndicator.parentNode) {
                    farmAnimalsContainer.removeChild(loadingIndicator);
                }
                
                // Show adopt button
                showAdoptPetButton(farmAnimalsContainer);
                
                // Reset loading flag
                isLoadingNFT = false;
                
                // Trigger NFT refresh failure event
                debug.log('Triggering nftRefreshed event (initialization failed)');
                window.dispatchEvent(new CustomEvent('nftRefreshed', {
                    detail: { 
                        success: false,
                        error: error.message || 'Initialization failed',
                        count: 0,
                        source: 'error'
                    }
                }));
                
                // Also trigger animations complete since there are no animations to apply
                setTimeout(() => {
                    debug.log('trigger allAnimationsComplete event (initialization failed)');
                    window.dispatchEvent(new CustomEvent('allAnimationsComplete', {
                        detail: { 
                            success: false,
                            error: error.message || 'Initialization failed',
                            count: 0,
                            source: 'error'
                        }
                    }));
                }, 100);
            }
        } else {
            // PetNFTService is not available, restore loading state
            debug.log('PetNFTService is not available, unable to load NFTs');
            isLoadingNFT = false;
            
            // Show adopt button
            showAdoptPetButton(farmAnimalsContainer);
        }
    }
    
    /**
     * Show adopt pet button
     * @param {HTMLElement} container - Farm animals container
     */
    function showAdoptPetButton(container) {
        if (!container) return;
        
        // Check connection status, show different messages when wallet is not connected
        const isConnected = isWalletConnected || localStorage.getItem('walletConnected') === 'true' || sessionStorage.getItem('walletConnected') === 'true';
        
        // Create a cute hint text element - replace noPets text with adoptHint
        const noNftMessage = document.createElement('div');
        noNftMessage.className = 'no-nft-message';
        
        // Set message text, showing different information based on wallet connection status
        if (isConnected) {
            noNftMessage.textContent = i18n && typeof i18n.t === 'function' ? 
                i18n.t('pets.adoptHint') : 'Click the bubble to adopt your first pet!';
        } else {
            noNftMessage.textContent = i18n && typeof i18n.t === 'function' ? 
                i18n.t('wallet.pleaseConnect') : 'Please connect your wallet to continue';
        }
        
        container.appendChild(noNftMessage);
        
        // Create adopt button container
        const adoptButtonContainer = document.createElement('div');
        adoptButtonContainer.className = 'adopt-pet-container';
        
        // If wallet is connected, show adopt button
        if (isConnected) {
            // Create adopt button
            const adoptButton = document.createElement('button');
            adoptButton.className = 'adopt-pet-button';
            
            // Use image instead of emoji
            const buttonImage = document.createElement('img');
            buttonImage.src = '../../resources/images/icons/common.png';
            buttonImage.alt = 'Adopt';
            
            // Assemble button - only add image
            adoptButton.appendChild(buttonImage);
            adoptButtonContainer.appendChild(adoptButton);
            
            // Add to container
            container.appendChild(adoptButtonContainer);
            
            // Add click event to open shop
            adoptButton.addEventListener('click', () => {
                openModal('shop-modal');
            });
        } else {
            // If wallet is not connected, show connect wallet button
            const connectButton = document.createElement('button');
            connectButton.className = 'adopt-pet-button connect-wallet-button';
            
            // Use image instead of emoji
            const buttonImage = document.createElement('img');
            buttonImage.src = '../../resources/images/icons/common.png';
            buttonImage.alt = 'Connect';
            
            // Assemble button - only add image
            connectButton.appendChild(buttonImage);
            adoptButtonContainer.appendChild(connectButton);
            
            // Add to container
            container.appendChild(adoptButtonContainer);
            
            // Add click event to connect wallet
            connectButton.addEventListener('click', () => {
                handleWalletBtnClick();
            });
        }
    }
    
    /**
     * sort NFTs by quality (from high to low)
     * @param {Array} nfts - NFT data array
     * @returns {Array} Sorted NFT array
     */
    function sortNFTsByQuality(nfts) {
        if (!nfts || !Array.isArray(nfts)) {
            return [];
        }
        
        // remain sort function but simplify logic, only sort by tokenId
        return [...nfts].sort((a, b) => {
            const tokenIdA = parseInt(a.tokenId) || 0;
            const tokenIdB = parseInt(b.tokenId) || 0;
            return tokenIdA - tokenIdB;
        });
    }
    
    /**
     * get quality from NFT data 
     * @param {Object} nft - NFT data object
     * @returns {string} NFT quality
     */
    function getQualityFromNFT(nft) {
        return 'COMMON'; 
    }
    
    /**
     * determine quality rank for sorting 
     * @param {string} quality - quality value
     * @returns {number} sorting rank
     */
    function determineQualityRank(quality) {
        return 1; 
    }
    
    /**
     * generate positions array based on pet count
     * @param {number} count - pet count
     * @returns {Array} positions array
     */
    function generatePositions(count) {
        // preset positions, can be adjusted based on actual farm layout
        const positions = [
            { top: '40%', left: '35%' },  // center left
            { top: '60%', left: '55%' },  // center right down
            { top: '50%', left: '25%' },  // left
            { top: '35%', left: '60%' },  // right up
            { top: '70%', left: '40%' },  // down
            { top: '55%', left: '75%' },  // right down
            { top: '25%', left: '45%' },  // up
            { top: '65%', left: '20%' },  // left down
            { top: '30%', left: '15%' },  // left up
            { top: '45%', left: '70%' }   // right
        ];
        
        // return the number of positions needed
        return positions.slice(0, Math.min(count, positions.length));
    }
    
    /**
     * load NFTs from cache or use default animals
     * @param {HTMLElement} container - container for animals
     * @param {string} userAddress - user address
     */
    function loadFromCacheOrDefault(container, userAddress) {
        // try to get NFTs from cache
        let cachedNFTs = window.PetNFTService.getCachedNFTs({
            userAddress: userAddress
        });
        
        if (cachedNFTs && cachedNFTs.length > 0) {
            debug.log(`load ${cachedNFTs.length} NFT pets from cache`);
            
            // sort NFTs by quality
            const sortedNFTs = sortNFTsByQuality(cachedNFTs);
            
            // show at most 10 pets in the farm
            const nftsToShow = sortedNFTs.slice(0, 10);
            
            // generate positions based on pet count
            const positions = generatePositions(nftsToShow.length);
            
            // add NFTs as animals to the farm
            nftsToShow.forEach((nft, index) => {
                try {
                const animalElement = createNFTAnimalElement(nft, positions[index]);
                container.appendChild(animalElement);
                    
                    // PetSizeManager will be applied later in the timing sequence
                    // to ensure proper rendering before sizing
                } catch (error) {
                    debug.error(`Failed to create NFT animal element for token ${nft.tokenId}:`, error);
                }
            });
            
            // Apply PetSizeManager first, then Z-index and shadows, then animations with proper delays (optimized)
            applyPetEffectsOptimized(container, nftsToShow, 'cache');
        } else {
            debug.log('no NFT data in cache, show adopt button');
            
            // ensure loading page is hidden before showing adopt button, avoid visual conflict
            setTimeout(() => {
                // show adopt button
                showAdoptPetButton(container);
                
                // no NFT data in cache, trigger event but mark as empty data
                debug.log('trigger nftRefreshed event (no cache data)');
                                    window.dispatchEvent(new CustomEvent('nftRefreshed', {
                                        detail: { 
                        count: 0,
                        source: 'empty'
                                        }
                                    }));
                
                // Also trigger animations complete since there are no animations to apply
                setTimeout(() => {
                    debug.log('trigger allAnimationsComplete event (no data)');
                    window.dispatchEvent(new CustomEvent('allAnimationsComplete', {
                        detail: { 
                            count: 0,
                            source: 'empty'
                        }
                    }));
                }, 100);
                                }, 300);
        }
    }
    
    /**
     * handle wallet button click event
     */
    function handleWalletBtnClick() {
        debug.log('Wallet button clicked, current connection status:', isWalletConnected);
        
        if (isWalletConnected) {
            // if connected, disconnect
            disconnectWallet();
        } else {
            // if not connected, try to connect using WalletNetworkManager first
            if (walletNetworkManager) {
                debug.log('Using WalletNetworkManager to connect wallet');
                connectWalletViaManager();
            } else {
                debug.log('WalletNetworkManager not available, falling back to iframe method');
                // fallback to traditional iframe method
                showWalletModal();
            }
        }
    }
    
    /**
     * Connect wallet using WalletNetworkManager
     */
    async function connectWalletViaManager() {
        try {
            debug.log('Attempting to connect wallet via WalletNetworkManager...');
            
            // Check if WalletNetworkManager is ready
            if (!walletNetworkManager.isReady()) {
                debug.log('WalletNetworkManager not ready, initializing...');
                const initResult = await walletNetworkManager.init();
                if (!initResult.success) {
                    throw new Error('Failed to initialize WalletNetworkManager: ' + initResult.error);
                }
            }
            
            // Try to auto-connect first (for previously connected wallets)
            let connectResult = await walletNetworkManager.autoConnect();
            debug.log('WalletNetworkManager auto-connect result:', connectResult);
            
            if (!connectResult.success || !connectResult.isConnected) {
                debug.log('Auto-connect failed or no previous connection, trying manual connect...');
                
                // If auto-connect fails, try to connect with default wallet type
                // First check if MetaMask is available
                if (window.ethereum && window.ethereum.isMetaMask) {
                    debug.log('MetaMask detected, attempting MetaMask connection...');
                    connectResult = await walletNetworkManager.connectWallet('metamask');
                } else if (window.okxwallet) {
                    debug.log('OKX wallet detected, attempting OKX connection...');
                    connectResult = await walletNetworkManager.connectWallet('okx');
                } else {
                    debug.log('No specific wallet detected, trying default connection...');
                    connectResult = await walletNetworkManager.connectWallet();
                }
            }
            
            debug.log('Final WalletNetworkManager connect result:', connectResult);
            
            if (connectResult.success && connectResult.isConnected) {
                debug.log('Wallet connected successfully via WalletNetworkManager');
                // Update local state
                updateLocalStateFromManager(connectResult);
                
                // Initialize contracts if needed
                await initializeContractsWithManager();
                loadFarmAnimals(true);
            } else {
                debug.warn('WalletNetworkManager connection failed, falling back to iframe method');
                // Fallback to iframe method
                showWalletModal();
            }
        } catch (error) {
            debug.error('Error connecting wallet via WalletNetworkManager:', error);
            // Fallback to iframe method
            debug.log('Falling back to iframe wallet connection method');
            showWalletModal();
        }
    }
    
    /**
     * show wallet connection modal
     */
    function showWalletModal() {
        if (!walletFrame) {
            console.error('wallet iframe not found');
            return;
        }
        
        console.log('show wallet connection modal');
        
        // ensure src is set
        if (!walletFrame.src || walletFrame.src === '') {
            walletFrame.src = '../../webPages/wallets/wallets.html';
        }
        
        // show wallet frame
        walletFrame.style.display = 'block';
    }
    
    /**
     * hide wallet connection modal
     */
    function hideWalletModal() {
        walletFrame.style.display = 'none';
    }
    
    /**
     * Handle iframe messages
     */
    function handleIframeMessage(event) {
        // Filter out messages that are not objects or don't have proper structure
        if (!event.data || typeof event.data !== 'object') {
            return; // Silently ignore non-object messages
        }
        
        const message = event.data;
        
        // Filter out messages that don't have a type or have undefined/null type
        if (!message.type || message.type === undefined || message.type === null) {
            return; // Silently ignore messages without valid type
        }
        
        // Filter out MetaMask internal messages that we don't need to handle
        if (message.target && (message.target.includes('metamask') || message.target.includes('inpage'))) {
            return; // Silently ignore MetaMask internal messages
        }
        
        debug.log('Received iframe message:', message.type, message);
        
        switch (message.type) {
            case 'walletConnected':
                debug.log('Received wallet connection success message:', message.data);
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                // Close wallet modal
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Wallet disconnected
                handleWalletDisconnect();
                break;
                
            case 'closeModal':
                // Close game modal (from iframe)
                debug.log('Received close modal message from iframe');
                closeAllModals();
                break;
                
            case 'requestNFTData':
                // Handle request for NFT data from pets page
                debug.log('Received NFT data request from:', message.source);
                
                let nftData = [];
                
                // Try to get NFT data from multiple sources
                // Priority 1: Get from PetNFTService cache
                if (window.PetNFTService && typeof window.PetNFTService.getCachedNFTs === 'function') {
                    try {
                        const cachedNFTs = window.PetNFTService.getCachedNFTs();
                        if (cachedNFTs && cachedNFTs.length > 0) {
                            nftData = cachedNFTs;
                            debug.log(`Sending ${nftData.length} NFTs from PetNFTService cache to pets page`);
                        }
                    } catch (error) {
                        debug.warn('Error getting NFTs from PetNFTService cache:', error);
                    }
                }
                
                // Priority 2: Get from localStorage cache if PetNFTService cache is empty
                if (nftData.length === 0) {
                    try {
                        const savedCache = localStorage.getItem('nftCache');
                        if (savedCache) {
                            const parsedCache = JSON.parse(savedCache);
                            if (parsedCache.allNfts && parsedCache.allNfts.length > 0) {
                                nftData = parsedCache.allNfts;
                                debug.log(`Sending ${nftData.length} NFTs from localStorage cache to pets page`);
                            }
                        }
                    } catch (error) {
                        debug.warn('Error getting NFTs from localStorage cache:', error);
                    }
                }
                
                // Send NFT data response to pets page
                event.source.postMessage({
                    type: 'nftDataResponse',
                    nfts: nftData,
                    timestamp: Date.now()
                }, '*');
                
                debug.log(`Sent NFT data response with ${nftData.length} NFTs to pets page`);
                break;
                
            case 'web3Ready':
                // Get Web3 instance
                debug.log('Received Web3 instance');
                
                // Check if private key wallet is already active and should take priority
                if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
                    debug.log('Private key wallet is active, using its Web3 instance instead of iframe Web3');
                    const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                    if (privateKeyWeb3) {
                        web3 = privateKeyWeb3;
                        window.web3 = privateKeyWeb3;
                        window.gameWeb3 = privateKeyWeb3;
                        debug.log('Using private key wallet Web3 instance');
                        
                        // If wallet is connected, initialize contracts and load NFTs
                        if (isWalletConnected && currentAddress) {
                            initGameTokens().then((success) => {
                                if (success) {
                                    debug.log('Contracts initialized with private key wallet, loading farm animals');
                                    loadFarmAnimals(true); // Force update to load NFTs
                                } else {
                                    debug.error('Failed to initialize contracts with private key wallet');
                                }
                            }).catch(error => {
                                debug.error('Error initializing contracts with private key wallet:', error);
                            });
                        }
                        break;
                    }
                }
                
                // Use iframe Web3 if private key wallet is not available
                if (message.data && message.data.web3) {
                    web3 = message.data.web3;
                    window.web3 = web3;
                    window.gameWeb3 = web3;
                    debug.log('Web3 instance set from iframe');
                            
                    // If wallet is connected, initialize contracts and load NFTs
                    if (isWalletConnected && currentAddress) {
                        initGameTokens().then((success) => {
                            if (success) {
                                debug.log('Contracts initialized with iframe Web3, loading farm animals');
                                loadFarmAnimals(true); // Force update
                            } else {
                                debug.error('Failed to initialize contracts with iframe Web3');
                            }
                        }).catch(error => {
                            debug.error('Error initializing contracts with iframe Web3:', error);
                        });
                    }
                } else if (window.ethereum) {
                    try {
                        web3 = new Web3(window.ethereum);
                        window.web3 = web3;
                        window.gameWeb3 = web3;
                        debug.log('Web3 instance created from window.ethereum');
                        
                        // If wallet is connected, initialize contracts and load NFTs
                        if (isWalletConnected && currentAddress) {
                            initGameTokens().then((success) => {
                                if (success) {
                                    debug.log('Contracts initialized with window.ethereum, loading farm animals');
                                    loadFarmAnimals(true); // Force update
                                } else {
                                    debug.error('Failed to initialize contracts with window.ethereum');
                                }
                            }).catch(error => {
                                debug.error('Error initializing contracts with window.ethereum:', error);
                            });
                        }
                    } catch (error) {
                        debug.error('Failed to create Web3 instance:', error);
                    }
                } else {
                    debug.error('Failed to create Web3 instance, neither message.data.web3 nor window.ethereum is available');
                }
                break;
                
            default:
                // Only log unhandled message types that seem relevant (not MetaMask internal messages)
                if (!message.target || (!message.target.includes('metamask') && !message.target.includes('inpage'))) {
                    debug.log('unhandled message type:', message.type);
                }
                break;
        }
    }
    
    /**
     * Handle wallet connection success
     */
    function handleWalletConnected(data) {
        const { walletType, address, chainId } = data;
        
        // Check if WalletNetworkManager is managing wallets
        if (walletNetworkManager) {
            debug.log('WalletNetworkManager is active, refreshing manager status');
            
            // Refresh WalletNetworkManager to detect the new connection
            walletNetworkManager.refresh().then(result => {
                debug.log('WalletNetworkManager refresh result after external wallet connection:', result);
                
                if (result.success && result.isConnected) {
                    updateWalletStatusFromManager(result);
                }
            }).catch(error => {
                debug.error('Failed to refresh WalletNetworkManager after external wallet connection:', error);
            });
            
            // Store connection status for compatibility
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
            localStorage.setItem('walletType', walletType);
            
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', address);
            sessionStorage.setItem('walletType', walletType);
            
            // Hide wallet modal
            hideWalletModal();
            
            console.log(`External wallet connected, WalletNetworkManager will handle: ${walletType}, address: ${address}, chain ID: ${chainId}`);
            return;
        }
        
        // Fallback: Check if private key wallet is already active
        if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
            console.log('Private key wallet is active, not updating to connected wallet address');
            
            // Still save the connected wallet info but don't change the displayed address
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
            localStorage.setItem('walletType', walletType);
            
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', address);
            sessionStorage.setItem('walletType', walletType);
            
            // Hide wallet modal
            hideWalletModal();
            
            console.log(`External wallet connected but private key wallet takes priority: ${walletType}, address: ${address}, chain ID: ${chainId}`);
            return;
        }
        
        // Set connection status (fallback mode)
        isWalletConnected = true;
        currentAddress = address;
        currentWalletType = 'external';
        
        // Update UI
        updateWalletUI(true, address);
        
        // Store connection status in localStorage and sessionStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletType', walletType);
        
        // Update sessionStorage
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', address);
        sessionStorage.setItem('walletType', walletType);
        
        // Hide wallet modal
        hideWalletModal();
        
        console.log(`Wallet connected successfully (fallback mode): ${walletType}, address: ${address}, chain ID: ${chainId}`);
    }
    
    /**
     * load contract initializer files
     */
    function loadContractInitializers() {
        debug.log('loading contract initializer files...');
        
        // check if already loaded
        if (
            typeof window.initPwPointContract !== 'undefined' &&
            typeof window.initPwBountyContract !== 'undefined' &&
            typeof window.initPwFoodContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initPwNFTContract !== 'undefined'
        ) {
            debug.log('contract initializer files already loaded');
            return;
        }
        
        // load PwPoint initializer file
        const pwPointScript = document.createElement('script');
        pwPointScript.src = '../../scripts/init_contracts/initPwPoint.js';
        pwPointScript.onload = function() {
            debug.log('PwPoint initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwPointScript.onerror = function() {
            debug.error('load PwPoint initializer file failed');
        };
        
        // load PwBounty initializer file
        const pwBountyScript = document.createElement('script');
        pwBountyScript.src = '../../scripts/init_contracts/initPwBounty.js';
        pwBountyScript.onload = function() {
            debug.log('PwBounty initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwBountyScript.onerror = function() {
            debug.error('load PwBounty initializer file failed');
        };
        
        // load PwFood initializer file
        const pwFoodScript = document.createElement('script');
        pwFoodScript.src = '../../scripts/init_contracts/initPwFood.js';
        pwFoodScript.onload = function() {
            debug.log('PwFood initializer file loaded successfully');
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwFoodScript.onerror = function() {
            debug.error('load PwFood initializer file failed');
        };
        
        // load NFTManager initializer file
        const nftManagerScript = document.createElement('script');
        nftManagerScript.src = '../../scripts/init_contracts/initNFTManager.js';
        nftManagerScript.onload = function() {
            debug.log('NFTManager initializer file loaded successfully');
            // ensure initNFTManagerContract function is exported correctly to global window object
            if (typeof window.initNFTManagerContract === 'function') {
                debug.log('initNFTManagerContract function is available on window object');
            } else {
                debug.error('initNFTManagerContract function not found on window object');
                // if function exists but not on window object, assign it to window
                if (typeof initNFTManagerContract === 'function') {
                    window.initNFTManagerContract = initNFTManagerContract;
                    debug.log('assigned initNFTManagerContract function to window object');
                }
            }
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        nftManagerScript.onerror = function() {
            debug.error('load NFTManager initializer file failed');
        };
        
        // load PwNFT initializer file
        const pwNFTScript = document.createElement('script');
        pwNFTScript.src = '../../scripts/init_contracts/initPwNFT.js';
        pwNFTScript.onload = function() {
            debug.log('PwNFT initializer file loaded successfully');
            // ensure initPwNFTContract function is exported correctly to global window object
            if (typeof window.initPwNFTContract === 'function') {
                debug.log('initPwNFTContract function is available on window object');
            } else {
                debug.error('initPwNFTContract function not found on window object');
                // if function exists but not on window object, assign it to window
                if (typeof initPwNFTContract === 'function') {
                    window.initPwNFTContract = initPwNFTContract;
                    debug.log('assigned initPwNFTContract function to window object');
                }
            }
            if (web3 && currentAddress) {
                initGameTokens();
            }
        };
        pwNFTScript.onerror = function() {
            debug.error('load PwNFT initializer file failed');
        };
        
        // add to document
        document.head.appendChild(pwPointScript);
        document.head.appendChild(pwBountyScript);
        document.head.appendChild(pwFoodScript);
        document.head.appendChild(nftManagerScript);
        document.head.appendChild(pwNFTScript);
    }
    
    /**
     * Initialize game token contracts
     * @returns {Promise<boolean>} - Success status
     */
    async function initGameTokens() {
        try {
            debug.log('initializing game token contracts...');
            
            if (!web3) {
                debug.error('cannot initialize game token contracts: Web3 not initialized');
                return false;
            }
            
            // get contract address function
            const getContractAddress = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // check if initialization function is available
            if (typeof window.initPwPointContract !== 'function') {
                debug.error('PwPoint contract initialization function not loaded');
                return false;
            }
            
            if (typeof window.initPwBountyContract !== 'function') {
                debug.error('PwBounty contract initialization function not loaded');
                return false;
            }
            
            if (typeof window.initPwFoodContract !== 'function') {
                debug.error('PwFood contract initialization function not loaded');
                return false;
            }
            
            if (typeof window.initNFTManagerContract !== 'function') {
                debug.error('NFTManager contract initialization function not loaded');
                // continue execution,不影响其他合约的初始化
            }
            
            if (typeof window.initPwNFTContract !== 'function') {
                debug.error('PwNFT contract initialization function not loaded');
                // continue execution,不影响其他合约的初始化
            }
            
            // initialize game token contracts
            pwPointContract = window.initPwPointContract(web3, getContractAddress);
            pwBountyContract = window.initPwBountyContract(web3, getContractAddress);
            pwFoodContract = window.initPwFoodContract(web3, getContractAddress);
            
            // initialize NFT related contracts
            if (typeof window.initNFTManagerContract === 'function') {
                window.nftManagerContract = window.initNFTManagerContract(web3, getContractAddress);
                debug.log('NFTManager contract initialized');
            }
            
            if (typeof window.initPwNFTContract === 'function') {
                window.pwNFTContract = window.initPwNFTContract(web3, getContractAddress);
                debug.log('PwNFT contract initialized');
            }
            
            debug.log('game token contracts initialized successfully');
            return true;
        } catch (error) {
            debug.error('initialize game token contracts failed:', error);
            return false;
        }
    }
    
    // Token balance update optimization
    let lastTokenBalanceUpdateTime = 0;
    let isUpdatingTokenBalances = false;
    const TOKEN_BALANCE_UPDATE_COOLDOWN = 5000; // 5 seconds cooldown between balance updates
    
    /**
     * update token balance display (optimized with throttling)
     */
    async function updateTokenBalances() {
        if (!web3 || !currentAddress) {
            debug.log('cannot update token balances: web3 or currentAddress not initialized');
            return Promise.reject(new Error('web3 or currentAddress not initialized'));
        }
        
        const currentTime = Date.now();
        
        // Throttle balance updates
        if (isUpdatingTokenBalances) {
            debug.log('Token balance update already in progress, skipping');
            return Promise.resolve({ message: 'Update in progress' });
        }
        
        if (currentTime - lastTokenBalanceUpdateTime < TOKEN_BALANCE_UPDATE_COOLDOWN) {
            debug.log(`Token balance update throttled (${Math.floor((TOKEN_BALANCE_UPDATE_COOLDOWN - (currentTime - lastTokenBalanceUpdateTime))/1000)} seconds remaining)`);
            return Promise.resolve({ message: 'Update throttled' });
        }
        
        isUpdatingTokenBalances = true;
        lastTokenBalanceUpdateTime = currentTime;
        
        try {
            debug.log('updating token balances...');
            
            // parallel get all token balances
            const promises = [];
            let pwPointBalance = '0';
            let pwBountyBalance = '0';
            let pwFoodBalance = '0';
            
            // check if contracts exist
            if (!pwPointContract) {
                debug.error('PwPoint contract not initialized');
            }
            if (!pwBountyContract) {
                debug.error('PwBounty contract not initialized');
            }
            if (!pwFoodContract) {
                debug.error('PwFood contract not initialized');
            }
            
            // get PwPoint balance
            if (pwPointContract) {
                promises.push(
                    (async () => {
                        try {
                            // try to call contract method
                            debug.log('calling PwPoint.balanceOf()...');
                            // check if contract method exists
                            if (!pwPointContract.methods || typeof pwPointContract.methods.balanceOf !== 'function') {
                                debug.error('PwPoint contract has no balanceOf method');
                                return;
                            }
                            
                            // output contract address and ABI information to troubleshoot
                            debug.log('PwPoint contract address:', pwPointContract._address);
                            
                            const balance = await pwPointContract.methods.balanceOf(currentAddress).call();
                            // PwPoint has 0 decimal places
                            pwPointBalance = formatBalance(balance, 0);
                            debug.log('PwPoint balance fetched successfully:', balance);
                        } catch (error) {
                            debug.error('failed to fetch PwPoint balance:', error);
                            // try other possible method names
                            try {
                                if (pwPointContract.methods.getBalance) {
                                    const balance = await pwPointContract.methods.getBalance(currentAddress).call();
                                    pwPointBalance = formatBalance(balance, 0);
                                    debug.log('fetched PwPoint balance successfully:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('fallback method also failed:', fallbackError);
                            }
                        }
                    })()
                );
            }
            
            // get PwBounty balance
            if (pwBountyContract) {
                promises.push(
                    (async () => {
                        try {
                            // try to call contract method
                            debug.log('calling PwBounty.balanceOf()...');
                            // check if contract method exists
                            if (!pwBountyContract.methods || typeof pwBountyContract.methods.balanceOf !== 'function') {
                                debug.error('PwBounty contract has no balanceOf method');
                                return;
                            }
                            
                            // output contract address and ABI information to troubleshoot
                            debug.log('PwBounty contract address:', pwBountyContract._address);
                            
                            const balance = await pwBountyContract.methods.balanceOf(currentAddress).call();
                            // PwBounty has 18 decimal places
                            pwBountyBalance = formatBalance(balance, 0);
                            debug.log('PwBounty balance fetched successfully:', balance);
                        } catch (error) {
                            debug.error('failed to fetch PwBounty balance:', error);
                            // try other possible method names
                            try {
                                if (pwBountyContract.methods.getBalance) {
                                    const balance = await pwBountyContract.methods.getBalance(currentAddress).call();
                                    pwBountyBalance = formatBalance(balance, 0);
                                    debug.log('fetched PwBounty balance successfully:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('fallback method also failed:', fallbackError);
                            }
                        }
                    })()
                );
            }
            
            // get PwFood balance
            if (pwFoodContract) {
                promises.push(
                    (async () => {
                        try {
                            // try to call contract method
                            debug.log('calling PwFood.balanceOf()...');
                            // check if contract method exists
                            if (!pwFoodContract.methods || typeof pwFoodContract.methods.balanceOf !== 'function') {
                                debug.error('PwFood contract has no balanceOf method');
                                return;
                            }
                            
                            // output contract address and ABI information to troubleshoot
                            debug.log('PwFood contract address:', pwFoodContract._address);
                            
                            const balance = await pwFoodContract.methods.balanceOf(currentAddress).call();
                            // PwFood has no decimal places
                            pwFoodBalance = formatBalance(balance, 0);
                            debug.log('PwFood balance fetched successfully:', balance);
                        } catch (error) {
                            debug.error('failed to fetch PwFood balance:', error);
                            // try other possible method names
                            try {
                                if (pwFoodContract.methods.getBalance) {
                                    const balance = await pwFoodContract.methods.getBalance(currentAddress).call();
                                    pwFoodBalance = formatBalance(balance, 0);
                                    debug.log('fetched PwFood balance successfully:', balance);
                                }
                            } catch (fallbackError) {
                                debug.error('fallback method also failed:', fallbackError);
                            }
                        }
                    })()
                );
            }
            
            // wait for all balance queries to complete
            await Promise.all(promises);
            
            // update UI display
            if (pwPointBalanceElem) {
                pwPointBalanceElem.textContent = pwPointBalance;
            }
            
            if (pwBountyBalanceElem) {
                pwBountyBalanceElem.textContent = pwBountyBalance;
            }
            
            if (pwFoodBalanceElem) {
                pwFoodBalanceElem.textContent = pwFoodBalance;
            }
            
            debug.log('token balances updated:', {
                PwPoint: pwPointBalance,
                PwBounty: pwBountyBalance,
                PwFood: pwFoodBalance
            });
            
            return Promise.resolve({ PwPoint: pwPointBalance, PwBounty: pwBountyBalance, PwFood: pwFoodBalance });
        } catch (error) {
            debug.error('failed to update token balances:', error);
            return Promise.reject(error);
        } finally {
            // Always reset the updating flag
            isUpdatingTokenBalances = false;
        }
    }
    
    /**
     * format balance, handle decimal places
     * @param {string} balance - original balance (big integer string)
     * @param {number} decimals - number of decimal places
     * @returns {string} formatted balance
     */
    function formatBalance(balance, decimals) {
        if (decimals === 0) {
            return balance;
        }
        
        // convert big integer to string with decimal point
        const balanceStr = balance.toString();
        
        if (balanceStr.length <= decimals) {
            // if number length is less than decimal places, add zeros in front
            const zeros = '0'.repeat(decimals - balanceStr.length + 1);
            return `0.${zeros}${balanceStr}`.replace(/\.?0+$/, '');
        } else {
            // insert decimal point
            const intPart = balanceStr.slice(0, balanceStr.length - decimals);
            const fracPart = balanceStr.slice(balanceStr.length - decimals);
            return `${intPart}.${fracPart}`.replace(/\.?0+$/, '');
        }
    }
    
    /**
     * disconnect wallet
     */
    function disconnectWallet() {
        debug.log('Disconnecting wallet...');
        
        // Try to disconnect using WalletNetworkManager first
        if (walletNetworkManager) {
            debug.log('Using WalletNetworkManager to disconnect wallet');
            disconnectWalletViaManager();
        } else {
            debug.log('WalletNetworkManager not available, using iframe method');
            // Fallback to iframe method
            if (walletFrame && walletFrame.contentWindow) {
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
            }
            // Handle disconnect directly
            handleWalletDisconnect();
        }
    }
    
    /**
     * Disconnect wallet using WalletNetworkManager
     */
    async function disconnectWalletViaManager() {
        try {
            debug.log('Attempting to disconnect wallet via WalletNetworkManager...');
            
            const disconnectResult = await walletNetworkManager.disconnectWallet();
            debug.log('WalletNetworkManager disconnect result:', disconnectResult);
            
            if (disconnectResult.success) {
                debug.log('Wallet disconnected successfully via WalletNetworkManager');
                // Update local state
                updateLocalStateFromManager(disconnectResult);
            } else {
                debug.warn('WalletNetworkManager disconnect failed, handling manually');
                // Handle disconnect manually
        handleWalletDisconnect();
            }
        } catch (error) {
            debug.error('Error disconnecting wallet via WalletNetworkManager:', error);
            // Handle disconnect manually as fallback
            handleWalletDisconnect();
        }
    }
    
    /**
     * handle wallet disconnect
     */
    function handleWalletDisconnect() {
        debug.log('wallet disconnected');
        
        // reset status
        isWalletConnected = false;
        currentAddress = null;
        currentWalletType = null;
        web3 = null;
        
        // Clear global Web3 instances
        window.web3 = null;
        window.gameWeb3 = null;
        
        // Reset contract instances
        pwPointContract = null;
        pwBountyContract = null;
        pwFoodContract = null;
        
        // update UI
        updateWalletUI(false);
        
        // clear localStorage
        debug.log('clearing localStorage and sessionStorage wallet connection information');
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        // reset token balance display
        if (pwPointBalanceElem) pwPointBalanceElem.textContent = '0';
        if (pwBountyBalanceElem) pwBountyBalanceElem.textContent = '0';
        if (pwFoodBalanceElem) pwFoodBalanceElem.textContent = '0';
        
        // Refresh farm animals to show adopt button
        setTimeout(() => {
            loadFarmAnimals(true);
        }, 500);
    }
    
    /**
     * update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        debug.log('Updating wallet UI:', { connected, address });
        
        // Ensure DOM elements are available
        if (!walletBtn) {
            walletBtn = document.getElementById('connectWalletBtn');
            if (!walletBtn) {
                debug.error('Wallet button element not found, cannot update UI');
                return;
            }
        }
        
        if (!walletAddressSpan) {
            walletAddressSpan = document.getElementById('walletAddress');
            if (!walletAddressSpan) {
                debug.error('Wallet address span element not found, cannot update UI');
                return;
            }
        }
        
        if (connected && address) {
            debug.log('Setting wallet UI to connected state with address:', address);
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'disconnect wallet';
            walletBtn.classList.add('connected');
            
            const formattedAddress = formatAddress(address);
            walletAddressSpan.textContent = formattedAddress;
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
            
            debug.log('Wallet UI updated to connected state:', {
                buttonText: walletBtn.textContent,
                addressText: walletAddressSpan.textContent,
                fullAddress: address
            });
        } else {
            debug.log('Setting wallet UI to disconnected state');
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'connect wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'no wallet connected';
            walletAddressSpan.title = '';
            walletAddressSpan.classList.remove('truncated-address');
            
            debug.log('Wallet UI updated to disconnected state:', {
                buttonText: walletBtn.textContent,
                addressText: walletAddressSpan.textContent
            });
        }
    }
    
    /**
     * format address display
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * localize content
     */
    function localizeContent() {
        // only execute when i18n is available
        if (!i18n) return;
        
        // update page title
        document.title = i18n.t('home.title') + ' - ' + i18n.t('game.title');
        
        // update text using data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translation = i18n.t(key);
            
            // check if there are parameters
            const argsAttr = el.getAttribute('data-i18n-args');
            if (argsAttr) {
                try {
                    const args = JSON.parse(argsAttr);
                    // handle parameter replacement
                    Object.keys(args).forEach(argKey => {
                        translation = translation.replace(`{${argKey}}`, args[argKey]);
                    });
                } catch (e) {
                    console.error('error parsing data-i18n-args:', e);
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
        
        // handle placeholder translation
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = i18n.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        // update wallet connection text, because it needs to be set dynamically based on status
        if (walletBtn) {
            walletBtn.textContent = isWalletConnected ? 
                i18n.t('wallet.disconnect') : 
                i18n.t('wallet.connect');
        }
        
        if (walletAddressSpan && !isWalletConnected) {
            walletAddressSpan.textContent = i18n.t('wallet.noWallet');
        }
        
        // update dropdown menu localization
        if (dropupMenu) {
            dropupMenu.updateI18n();
        }
    }

    /**
     * show refresh toast message
     * @param {string} message - toast message, default is "refreshing..."
     * @param {number} duration - display duration, default is 2000 milliseconds
     */
    function showRefreshToast(message = null, duration = 2000) {
        // use i18n to get localized message, if available
        const toastMessage = message || (i18n && typeof i18n.t === 'function' ? i18n.t('pets.refreshing') : 'refreshing...');
        
        // create toast element
        const toast = document.createElement('div');
        toast.className = 'refresh-toast';
        toast.textContent = toastMessage;
        document.body.appendChild(toast);
        
        // hide toast after 2 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, duration);
    }



    /**
     * open modal
     */
    function openModal(modalId) {
        console.log('openModal called, modalId =', modalId);
        const modal = document.getElementById(modalId);
        console.log('found modal element:', modal);
        if (!modal) return;
        
        // close all opened modals
        modals.forEach(m => m.classList.remove('active'));
        
        // show modal container and specific modal
        modalContainer.classList.add('active');
        modal.classList.add('active');
        
        // load modal content (in actual project, it may need to get data from API)
        loadModalContent(modalId);
    }
    
    /**
     * close all modals
     */
    function closeAllModals() {
        modalContainer.classList.remove('active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    /**
     * load modal content
     * @param {string} modalId - modal ID
     */
    function loadModalContent(modalId) {
        switch (modalId) {
            case 'shop-modal':
                // load shop page
                document.getElementById('shop-iframe').src = '../../webPages/gamePages/shop.html';
                
                // wait for iframe to load and send data
                const shopIframe = document.getElementById('shop-iframe');
                shopIframe.onload = function() {
                    debug.log('shop iframe loaded, sending data');
                    // send wallet information
                    shopIframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: isWalletConnected,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // send Web3 instance
                    if (web3) {
                        try {
                            // create a cloneable data structure
                            const web3Data = {
                                type: 'web3Ready',
                                data: { 
                                    connected: isWalletConnected,
                                    address: currentAddress,
                                    walletType: localStorage.getItem('walletType') || 'metamask'
                                }
                            };
                            // directly attach web3 instance to window object to avoid postMessage clone failure
                            window.gameWeb3 = web3;
                            shopIframe.contentWindow.postMessage(web3Data, '*');
                            debug.log('sent web3 ready message to iframe');
                        } catch (error) {
                            debug.error('error sending web3 instance:', error);
                            // ensure web3 instance can be used in iframe
                            window.gameWeb3 = web3;
                        }
                    } else {
                        debug.error('web3 instance not initialized, cannot send to iframe');
                    }
                };
                break;
                
            case 'pets-modal':
                // load pets page
                document.getElementById('pets-iframe').src = '../../webPages/gamePages/pets.html';
                
                // wait for iframe to load and send data
                const petsIframe = document.getElementById('pets-iframe');
                petsIframe.onload = function() {
                    debug.log('pets iframe loaded, sending data');
                    // send wallet information
                    petsIframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: isWalletConnected,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // send Web3 instance
                    if (web3) {
                        try {
                            // create a cloneable data structure
                            const web3Data = {
                                type: 'web3Ready',
                                data: { 
                                    connected: isWalletConnected,
                                    address: currentAddress,
                                    walletType: localStorage.getItem('walletType') || 'metamask'
                                }
                            };
                            // directly attach web3 instance to window object to avoid postMessage clone failure
                            window.gameWeb3 = web3;
                            petsIframe.contentWindow.postMessage(web3Data, '*');
                            debug.log('sent web3 ready message to pets iframe');
                        } catch (error) {
                            debug.error('error sending web3 instance to pets iframe:', error);
                            // ensure web3 instance can be used in iframe
                            window.gameWeb3 = web3;
                        }
                    } else {
                        debug.error('web3 instance not initialized, cannot send to pets iframe');
                    }
                };
                break;
                
            case 'market-modal':
                // load market page
                document.getElementById('market-iframe').src = '../../webPages/gamePages/market.html';
                
                // wait for iframe to load and send data
                const marketIframe = document.getElementById('market-iframe');
                marketIframe.onload = function() {
                    debug.log('market iframe loaded, sending data');
                    // send wallet information
                    marketIframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: isWalletConnected,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // send Web3 instance
                    if (web3) {
                        try {
                            // create a cloneable data structure
                            const web3Data = {
                                type: 'web3Ready',
                                data: { 
                                    connected: isWalletConnected,
                                    address: currentAddress,
                                    walletType: localStorage.getItem('walletType') || 'metamask'
                                }
                            };
                            // directly attach web3 instance to window object to avoid postMessage clone failure
                            window.gameWeb3 = web3;
                            marketIframe.contentWindow.postMessage(web3Data, '*');
                            debug.log('sent web3 ready message to market iframe');
                        } catch (error) {
                            debug.error('error sending web3 instance to market iframe:', error);
                            // ensure web3 instance can be used in iframe
                            window.gameWeb3 = web3;
                        }
                    } else {
                        debug.error('web3 instance not initialized, cannot send to market iframe');
                    }
                };
                break;
                
            case 'settings-modal':
                // load settings page
                document.getElementById('settings-iframe').src = '../../webPages/gamePages/settings.html';
                break;
                
            case 'stableStaking-modal':
                // load stablecoin staking page
                document.getElementById('stableStaking-iframe').src = '../../webPages/gamePages/stableStaking.html';
                
                // wait for iframe to load and send data
                const stakingIframe = document.getElementById('stableStaking-iframe');
                stakingIframe.onload = function() {
                    debug.log('stablecoin stableStaking iframe loaded, sending data');
                    // send wallet information
                    stakingIframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: isWalletConnected,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // send Web3 instance
                    if (web3) {
                        try {
                            // create a cloneable data structure
                            const web3Data = {
                                type: 'web3Ready',
                                data: { 
                                    connected: isWalletConnected,
                                    address: currentAddress,
                                    walletType: localStorage.getItem('walletType') || 'metamask'
                                }
                            };
                            // directly attach web3 instance to window object to avoid postMessage clone failure
                            window.gameWeb3 = web3;
                            stakingIframe.contentWindow.postMessage(web3Data, '*');
                            debug.log('sent web3 ready message to iframe');
                        } catch (error) {
                            debug.error('error sending web3 instance:', error);
                            // ensure web3 instance can be used in iframe
                            window.gameWeb3 = web3;
                        }
                    } else {
                        debug.error('web3 instance not initialized, cannot send to iframe');
                    }
                };
                break;
        }
    }

   

    /**
     * create NFT animal element
     * @param {Object} nft - NFT data
     * @param {Object} position - position information {top, left}
     */
    function createNFTAnimalElement(nft, position) {
        const animalDiv = document.createElement('div');
        animalDiv.className = 'animal nft-animal';
        animalDiv.style.top = position.top;
        animalDiv.style.left = position.left;
        animalDiv.dataset.id = nft.tokenId;
        animalDiv.dataset.contractAddress = nft.contractAddress;
        animalDiv.dataset.name = nft.metadata?.name || `pet #${nft.tokenId}`;
        
        // Set basic styles (let PetSizeManager control dimensions)
        animalDiv.style.position = 'absolute';
        animalDiv.style.transition = 'all 0.3s ease';
        animalDiv.style.cursor = 'pointer';
        animalDiv.style.zIndex = '10';
        // Don't set width/height here - let PetSizeManager control it completely
        
        debug.log(`[NFTDebug] Creating NFT animal element: ${animalDiv.dataset.name} (ID: ${animalDiv.dataset.id})`);
        
        // check if it is a special type of NFT (like Egg or Duck)
        const nftName = (animalDiv.dataset.name || '').toLowerCase();
        
        // more clearly add type mark
        if (nftName.includes('egg')) {
            animalDiv.classList.add('egg-nft');
            animalDiv.dataset.type = 'egg';
            debug.log(`[NFTDebug] Marked as EGG: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('duck')) {
            animalDiv.classList.add('duck-nft');
            animalDiv.dataset.type = 'duck';
            debug.log(`[NFTDebug] Marked as DUCK: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('chicken')) {
            animalDiv.classList.add('chicken-nft');
            animalDiv.dataset.type = 'chicken';
            debug.log(`[NFTDebug] Marked as CHICKEN: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('cat')) {
            animalDiv.classList.add('cat-nft');
            animalDiv.dataset.type = 'cat';
            debug.log(`[NFTDebug] Marked as CAT: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('dog')) {
            animalDiv.classList.add('dog-nft');
            animalDiv.dataset.type = 'dog';
            debug.log(`[NFTDebug] Marked as DOG: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('dragon')) {
            animalDiv.classList.add('dragon-nft');
            animalDiv.dataset.type = 'dragon';
            debug.log(`[NFTDebug] Marked as DRAGON: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('unicorn')) {
            animalDiv.classList.add('unicorn-nft');
            animalDiv.dataset.type = 'unicorn';
            debug.log(`[NFTDebug] Marked as UNICORN: ${animalDiv.dataset.name}`); 
        } else if (nftName.includes('white tiger')) {
            animalDiv.classList.add('white-tiger-nft');
            animalDiv.dataset.type = 'white tiger';
            debug.log(`[NFTDebug] Marked as WHITE TIGER: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('white lion')) {
            animalDiv.classList.add('white-lion-nft');
            animalDiv.dataset.type = 'white lion';
            debug.log(`[NFTDebug] Marked as WHITE LION: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('black panther')) {
            animalDiv.classList.add('black-panther-nft');
            animalDiv.dataset.type = 'black panther';
            debug.log(`[NFTDebug] Marked as BLACK PANTHER: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('moonlit wolf')) {
            animalDiv.classList.add('moonlit-wolf-nft');
            animalDiv.dataset.type = 'moonlit wolf';
            debug.log(`[NFTDebug] Marked as MOONLIT WOLF: ${animalDiv.dataset.name}`);
        } else {
            debug.log(`[NFTDebug] Unknown pet type: ${animalDiv.dataset.name}`);
        }
        
        // hover effect - only keep zoom effect
        animalDiv.onmouseenter = function() {
            this.style.transform = 'scale(1.1)';
        };
        
        animalDiv.onmouseleave = function() {
            this.style.transform = 'scale(1)';
        };
        
        // handle click event
        animalDiv.addEventListener('click', () => {
            // call handle function
            handleNFTAnimalClick(nft);
        });
        
        // Apply PetSizeManager after element is added to DOM and rendered
        // Use requestAnimationFrame to ensure element is properly rendered before sizing
        requestAnimationFrame(() => {
            if (window.PetSizeManager) {
                debug.log(`[NFTDebug] Applying PetSizeManager to ${animalDiv.dataset.name} (type: ${animalDiv.dataset.type}) after DOM render`);
            // Get farm container dimensions for proper sizing
            const farmContainer = document.getElementById('farm-animals-container');
            const containerWidth = farmContainer ? farmContainer.offsetWidth : 800;
            const containerHeight = farmContainer ? farmContainer.offsetHeight : 600;
            
                // Check if element has been added to DOM and has dimensions
                if (animalDiv.parentNode && (animalDiv.offsetWidth > 0 || animalDiv.offsetHeight > 0)) {
                    window.PetSizeManager.setSize(animalDiv, animalDiv.dataset.type, {
                        containerWidth: containerWidth,
                        containerHeight: containerHeight
                    });
                } else {
                    // If element still has no dimensions, wait a bit more
                    setTimeout(() => {
                        if (window.PetSizeManager && animalDiv.parentNode) {
                            debug.log(`[NFTDebug] Delayed PetSizeManager application for ${animalDiv.dataset.name}`);
            window.PetSizeManager.setSize(animalDiv, animalDiv.dataset.type, {
                containerWidth: containerWidth,
                containerHeight: containerHeight
            });
        }
                    }, 100);
                }
            }
        });
        
        // dispatch NFT loaded event, allow other components to handle special NFTs (like Egg animation or Duck animation)
        dispatchNFTLoadedEvent(animalDiv, nft);
        
        return animalDiv;
    }
    
    /**
     * dispatch NFT loaded event, allow other components to handle special NFTs (like Egg animation or Duck animation)
     * @param {HTMLElement} element - NFT element
     * @param {Object} nftData - NFT data
     */
    function dispatchNFTLoadedEvent(element, nftData) {
        // ensure environment supports CustomEvent
        if (typeof CustomEvent === 'function') {
            // create custom event
            const nftLoadedEvent = new CustomEvent('nftLoaded', {
                detail: {
                    element: element,
                    data: nftData
                },
                bubbles: true,
                cancelable: true
            });
            
            // dispatch event
            element.dispatchEvent(nftLoadedEvent);
            
            // also dispatch on window,便于全局监听
            window.dispatchEvent(nftLoadedEvent);
            
            debug.log(`dispatched nftLoaded event: ${nftData.metadata?.name || `#${nftData.tokenId}`}`);
        }
    }
    
    /**
     * handle NFT animal click event
     * @param {Object} nft - NFT data
     */
    function handleNFTAnimalClick(nft) {
        // use PetDetailPopup component to show pet detail
        if (window.PetDetailPopup) {
            // check if NFTFeedingManager contract is loaded
            if (!window.initNFTFeedingManagerContract && !window.NFTFeedingManagerABI) {
                // try to load NFTFeedingManager related scripts dynamically
                loadNFTFeedingManagerScripts().then(() => {
                    showPetDetailPopup(nft);
                    }).catch(error => {
                    console.error('error loading NFTFeedingManager scripts:', error);
                    // even if loading fails, show popup, will use default data
                    showPetDetailPopup(nft);
                });
            } else {
                // directly show popup
                showPetDetailPopup(nft);
            }
        } else {
            // fallback to original behavior or show error
            console.error('PetDetailPopup component not found');
            alert(`pet detail - ID: ${nft.tokenId}, name: ${nft.metadata?.name || 'no name'}`);
        }
    }

    /**
     * show pet detail popup
     * @param {Object} nft - NFT data
     */
    function showPetDetailPopup(nft) {
        try {
            // ensure global variables are available
            if (!window.gameWeb3 && window.web3) {
                window.gameWeb3 = window.web3;
            }

            // check if PetDetailPopup instance is initialized
            if (!window.petDetailPopupInstance) {
                console.log('create PetDetailPopup instance');
                // create new instance
                window.petDetailPopupInstance = new PetDetailPopup();
            }
            
            // prepare pet data
            const petData = {
                name: nft.metadata?.name || `pet #${nft.tokenId}`,
                tokenId: nft.tokenId,
                id: nft.tokenId,
                // health and hunger, get from attributes or use random value
                health: nft.metadata?.attributes?.find(attr => attr.trait_type === 'Health')?.value || 
                       Math.floor(Math.random() * 100),
                hunger: nft.metadata?.attributes?.find(attr => attr.trait_type === 'Hunger')?.value || 
                        Math.floor(Math.random() * 100),
                // add original metadata and attributes data
                metadata: nft.metadata,
                attributes: nft.metadata?.attributes
            };
            
            console.log('show pet detail:', petData);
            
            // show popup
            window.petDetailPopupInstance.show(petData);
        } catch (error) {
            console.error('error showing pet detail popup:', error);
            // fallback to simple prompt
            alert(`pet detail - ID: ${nft.tokenId}, name: ${nft.metadata?.name || 'no name'}`);
        }
    }

    /**
     * load NFTFeedingManager related scripts dynamically
     * @returns {Promise} loaded Promise
     */
    function loadNFTFeedingManagerScripts() {
        return new Promise((resolve, reject) => {
            // already loaded
            if (window.initNFTFeedingManagerContract && window.NFTFeedingManagerABI) {
                resolve();
                return;
            }
            
            let loadedScripts = 0;
            const totalScripts = 2;
            
            // load ABI file
            const abiScript = document.createElement('script');
            abiScript.src = '../../scripts/contracts/ABI/NFTFeedingManagerABI.js';
            abiScript.onload = () => {
                console.log('NFTFeedingManagerABI.js loaded');
                loadedScripts++;
                if (loadedScripts === totalScripts) resolve();
            };
            abiScript.onerror = (error) => {
                console.error('error loading NFTFeedingManagerABI.js:', error);
                reject(error);
            };
            document.head.appendChild(abiScript);
            
            // load initialization file
            const initScript = document.createElement('script');
            initScript.src = '../../scripts/init_contracts/initNFTFeedingManager.js';
            initScript.onload = () => {
                console.log('initNFTFeedingManager.js loaded');
                loadedScripts++;
                if (loadedScripts === totalScripts) resolve();
            };
            initScript.onerror = (error) => {
                console.error('error loading initNFTFeedingManager.js:', error);
                reject(error);
            };
            document.head.appendChild(initScript);
        });
    }

    // Animation managers cache and throttling
    let animationManagersCache = null;
    let lastAnimationApplyTime = 0;
    const ANIMATION_APPLY_COOLDOWN = 1000; // 1 second cooldown between animation applications
    
    // Performance optimization flags
    let isApplyingEffects = false;
    let pendingEffectsQueue = [];
    
    // Memory management
    let memoryCleanupInterval = null;
    const MEMORY_CLEANUP_INTERVAL = 300000; // 5 minutes
    
    /**
     * Get animation managers with caching
     */
    function getAnimationManagers() {
        if (!animationManagersCache) {
            animationManagersCache = [
                { name: 'EggManager', manager: window.EggManager, method: 'checkForEggs' },
                { name: 'DuckManager', manager: window.DuckManager, method: 'checkForDucks' },
                { name: 'ChickenManager', manager: window.ChickenManager, method: 'checkForChickens' },
                { name: 'CatManager', manager: window.CatManager, method: 'checkForCats' },
                { name: 'WhiteTigerManager', manager: window.WhiteTigerManager, method: 'checkForWhiteTigers' },
                { name: 'WhiteLionManager', manager: window.WhiteLionManager, method: 'checkForWhiteLions' },
                { name: 'BlackPantherManager', manager: window.BlackPantherManager, method: 'checkForBlackPanthers' },
                { name: 'MoonlitWolfManager', manager: window.MoonlitWolfManager, method: 'checkForMoonlitWolves' },
                { name: 'DragonManager', manager: window.DragonManager, method: 'checkForDragons' },
                { name: 'UnicornManager', manager: window.UnicornManager, method: 'checkForUnicorns' },
                { name: 'DogManager', manager: window.DogManager, method: 'checkForDogs' }
            ].filter(item => item.manager && typeof item.manager[item.method] === 'function');
        }
        return animationManagersCache;
    }
    
    /**
     * Optimized pet effects application (sizing, shadows, animations)
     */
    function applyPetEffectsOptimized(container, nftsData, source) {
        // Prevent concurrent effects application
        if (isApplyingEffects) {
            debug.log('Effects application already in progress, queuing request');
            pendingEffectsQueue.push({ container, nftsData, source });
            return;
        }
        
        isApplyingEffects = true;
        
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            // Step 1: Apply sizing and basic effects
            setTimeout(() => {
                try {
                    // Apply PetSizeManager to all pets first to ensure correct sizing
                    if (window.PetSizeManager) {
                        debug.log('Applying PetSizeManager to all pets for proper sizing');
                        window.PetSizeManager.applyToAll(container);
                    }
                    
                    // Apply Z-axis order
                    if (window.PetZIndexManager) {
                        debug.log('Updating pets\' Z-axis order');
                        window.PetZIndexManager.updateAllPetZIndexes();
                    }
                    
                    // Apply shadows
                    if (window.PetShadowManager) {
                        debug.log('Applying pet shadows...');
                        window.PetShadowManager.applyToAll();
                    }
                } catch (error) {
                    debug.error('Error applying basic pet effects:', error);
        }   

                // Step 2: Apply animations with optimized batching
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        applyAnimationsOptimized(() => {
                            // Step 3: Trigger events and cleanup
                            setTimeout(() => {
                                debug.log(`Triggering nftRefreshed event (${source})`);
                                window.dispatchEvent(new CustomEvent('nftRefreshed', {
                                    detail: { 
                                        count: nftsData ? nftsData.length : 0,
                                        source: source
                                    }
                                }));
                                
                                // Trigger all animations complete event
                                setTimeout(() => {
                                    debug.log(`Triggering allAnimationsComplete event (${source})`);
                                    window.dispatchEvent(new CustomEvent('allAnimationsComplete', {
                                        detail: { 
                                            count: nftsData ? nftsData.length : 0,
                                            source: source
                                        }
                                    }));
                                    
                                    // Mark effects application as complete
                                    isApplyingEffects = false;
                                    
                                    // Process any queued requests
                                    if (pendingEffectsQueue.length > 0) {
                                        const nextRequest = pendingEffectsQueue.shift();
                                        debug.log('Processing queued effects application request');
                                        setTimeout(() => {
                                            applyPetEffectsOptimized(nextRequest.container, nextRequest.nftsData, nextRequest.source);
                                        }, 100);
                                    }
                                }, 200);
                            }, 100);
                        });
                    }, 200);
                });
            }, 100);
        });
    }
    
    /**
     * Apply animations with optimized batching
     */
    function applyAnimationsOptimized(callback) {
        const managers = getAnimationManagers();
        
        if (managers.length === 0) {
            debug.log('No animation managers available');
            if (callback) callback();
            return;
        }
        
        // Apply animations in smaller batches to prevent blocking
        let currentIndex = 0;
        const batchSize = 2; // Reduced batch size for better performance
        
        function processBatch() {
            const batch = managers.slice(currentIndex, currentIndex + batchSize);
            
            batch.forEach(({ name, manager, method }) => {
                try {
                    debug.log(`Applying ${name} animations...`);
                    manager[method](false); // disable auto shadow application
                } catch (error) {
                    debug.error(`Error applying ${name} animations:`, error);
                }
            });
            
            currentIndex += batchSize;
            
            if (currentIndex < managers.length) {
                // Process next batch after a small delay
                setTimeout(processBatch, 30); // Reduced delay for faster processing
            } else {
                debug.log('All animations applied successfully');
                if (callback) callback();
            }
        }
        
        // Start processing immediately
        processBatch();
    }
    
    /**
     * apply animations to existing pets, without reloading data (optimized)
     */
    function applyAnimationsToExistingPets() {
        const currentTime = Date.now();
        
        // Throttle animation applications
        if (currentTime - lastAnimationApplyTime < ANIMATION_APPLY_COOLDOWN) {
            debug.log('Animation application throttled, skipping');
            return;
        }
        
        lastAnimationApplyTime = currentTime;
        
        // Use requestAnimationFrame to ensure elements are properly rendered before applying animations
        requestAnimationFrame(() => {
            const managers = getAnimationManagers();
            
            if (managers.length === 0) {
                debug.log('No animation managers available');
                return;
        }      

            // Apply animations in batches to prevent blocking
            let currentIndex = 0;
            const batchSize = 3; // Process 3 managers at a time
            
            function processBatch() {
                const batch = managers.slice(currentIndex, currentIndex + batchSize);
                
                batch.forEach(({ name, manager, method }) => {
                    try {
                        debug.log(`Applying ${name} animations...`);
                        manager[method](false); // disable auto shadow application
                    } catch (error) {
                        debug.error(`Error applying ${name} animations:`, error);
                    }
                });
                
                currentIndex += batchSize;
                
                if (currentIndex < managers.length) {
                    // Process next batch after a small delay
                    setTimeout(processBatch, 50);
                } else {
                    debug.log('All animations applied successfully');
                }
            }
            
            // Start processing with a small delay
            setTimeout(processBatch, 100);
        });
    }

    // Add loading animation to cursor
    document.body.classList.add('loading');

    // Remove loading animation when page is fully loaded
    window.addEventListener('load', () => {
        document.body.classList.remove('loading');
    });

    // Add click animation to cursor (optimized with throttling)
    let lastClickTime = 0;
    const CLICK_ANIMATION_COOLDOWN = 200; // 200ms cooldown between click animations
    
    document.addEventListener('click', () => {
        const currentTime = Date.now();
        if (currentTime - lastClickTime < CLICK_ANIMATION_COOLDOWN) {
            return; // Skip animation if too frequent
        }
        lastClickTime = currentTime;
        
        document.body.classList.add('clicked');
        setTimeout(() => {
            document.body.classList.remove('clicked');
        }, 500);
    }, { passive: true });

    // Removed deprecated wallet connection functions - functionality moved to WalletNetworkManager
}); 
