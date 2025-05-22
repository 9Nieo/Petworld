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
    
    // Wallet connection status
    let isWalletConnected = false;
    let currentAddress = null;
    
    // Web3 instance and contract instances
    let web3 = null;
    
    // Game token contract instances
    let pwPointContract = null;
    let pwBountyContract = null;
    let pwFoodContract = null;
    
    // Dropdown menu instance
    let dropupMenu = null;
    
    // NFT update flag to control NFT refresh frequency
    let lastNFTUpdateTime = 0;
    const NFT_REFRESH_COOLDOWN = 30000; // 30 seconds cooldown time, increased to reduce refresh
    
    // Loading NFT flag to prevent concurrent loading
    let isLoadingNFT = false;
    
    // Sound manager reference
    let soundManager = null;
    
    // Initialization
    init();
    
    /**
     * Initialization function
     */
    function init() {
        console.log('Initializing game home page...');
        
        // Check key DOM elements
        if (!walletBtn) console.error('Wallet connection button not found');
        if (!walletAddressSpan) console.error('Wallet address display element not found');
        if (!walletFrame) console.error('Wallet iframe not found');
        if (!pwPointBalanceElem) console.error('PwPoint balance display element not found');
        if (!pwBountyBalanceElem) console.error('PwBounty balance display element not found');
        if (!pwFoodBalanceElem) console.error('PwFood balance display element not found');
        if (!moreButton) console.error('More button not found');
        
        // Initialize sound manager
        initSoundManager();
        
        // Clean up all static example animals
        cleanupStaticAnimals();
        
        // Output iframe source
        if (walletFrame) {
            console.log('Wallet iframe source:', walletFrame.src);
            
            // Ensure iframe has loaded
            walletFrame.onload = function() {
                debug.log('Wallet iframe has loaded');
                // Check wallet status after iframe has loaded
                checkWalletStatus();
            };
        }
        
        // Initialize PetNFTService
        // Note: To avoid repeated refreshes, the loadFarmAnimals call has been removed here,
        // now handled uniformly in checkWalletStatus
        if (window.PetNFTService) {
            debug.log('Initializing PetNFTService...');
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialization ' + (success ? 'succeeded' : 'failed'));
                // Do not call loadFarmAnimals here to reduce repeated refreshes
            });
        } else {
            debug.warn('PetNFTService not found, unable to initialize');
        }
        
        // Bind wallet connection button click event
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind refresh NFT button click event
        const refreshNFTBtn = document.getElementById('refreshNFTBtn');
        if (refreshNFTBtn) {
            refreshNFTBtn.addEventListener('click', function() {
                debug.log('Clicked refresh button, forcing refresh of NFT data...');
                // Show refresh prompt
                showRefreshToast();
                // Force refresh NFT data
                loadFarmAnimals(true);
            });
        }
        
        // Bind navigation bar modal button
        navItems.forEach(item => {
            if (item.id !== 'moreButton') {
                item.addEventListener('click', () => {
                    console.log('Navigation item clicked:', item);
                    const modalId = item.getAttribute('data-modal');
                    console.log('Modal ID:', modalId);
                    if (modalId) {
                        console.log('Opening modal:', modalId + '-modal');
                        openModal(modalId + '-modal');
                    }
                });
            }
        });
        
        // Bind close buttons
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                closeAllModals();
            });
        });
        
        // Click outside modal to close
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                closeAllModals();
            }
        });
        
        // Listen for messages from wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for language change events
        window.addEventListener('localeChanged', function(event) {
            debug.log('Detected language change event:', event.detail);
            localizeContent();
        });
        
        // Listen for language initialization events
        window.addEventListener('localeInitialized', function(event) {
            debug.log('Detected language initialization event:', event.detail);
            localizeContent();
        });
        
        // Localize content
        localizeContent();

        // Initialize dropdown menu for more button
        initMoreMenu();
        
        // Load initial contract files
        loadContractInitializers();
        
        // Add page visibility change listener, refresh NFT data when user returns to page
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Listen for audio-related settings changes from iframes
        window.addEventListener('message', handleSettingsMessage);
        
        // Initialize pet features after the page has fully loaded, including shadow handling
        // Only needs to be processed once, no need to repeatedly call loadFarmAnimals
        setTimeout(initializeAllPetFeatures, 2000);
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
            // Enable debug mode if needed
            // window.PetSizeManager.debug = true;
            
            // Apply to all pets
            setTimeout(() => {
                window.PetSizeManager.applyToAll();
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
            
            // Reapply shadows
            setTimeout(() => {
                window.PetShadowManager.applyToAll();
            }, 300);
        } else {
            debug.error('PetShadowManager not available, unable to apply shadows');
        }
        
        // If NFTs have not been loaded, load once
        const farmAnimalsContainer = document.getElementById('farm-animals-container');
        if (farmAnimalsContainer && (!farmAnimalsContainer.children || farmAnimalsContainer.children.length === 0)) {
            debug.log('Pet container is empty, loading NFT data...');
            loadFarmAnimals(false);  // Use non-force mode, respect refresh interval
        } else {
            debug.log('Pet container already has content, skipping NFT load');
            
            // Only process existing pet animations
            setTimeout(() => {
                applyAnimationsToExistingPets();
            }, 400);
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
    
    /**
     * Handle page visibility change
     */
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            debug.log('Page became visible, checking if NFT data needs to be refreshed');
            
            // Resume background music if it was playing before
            if (soundManager && !soundManager.settings.muteBackground) {
                soundManager.playBackgroundMusic();
                debug.log('Resumed background music on page visibility change');
            }
            
            // Get current time
            const currentTime = Date.now();
            
            // Check if the time since the last update exceeds the cooldown time, using a longer time interval
            if (currentTime - lastNFTUpdateTime > NFT_REFRESH_COOLDOWN * 3) {
                debug.log('Time since last NFT update has exceeded cooldown time, refreshing NFT data');
                loadFarmAnimals(true);
            } else {
                debug.log('NFT refresh is still in cooldown, skipping refresh');
                
                // Only reapply existing animations and shadows, do not refresh data
                if (window.PetShadowManager) {
                    setTimeout(() => {
                        window.PetShadowManager.applyToAll();
                    }, 300);
                }
            }
        } else if (document.visibilityState === 'hidden') {
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
     * Check wallet connection status and restore session
     */
    function checkWalletStatus() {
        debug.log('Checking wallet connection status...');
        
        // First check sessionStorage (cross-page transfer)
        const sessionWalletConnected = sessionStorage.getItem('walletConnected');
        const sessionWalletAddress = sessionStorage.getItem('walletAddress');
        const sessionWalletType = sessionStorage.getItem('walletType');
        
        if (sessionWalletConnected === 'true' && sessionWalletAddress) {
            debug.log('Restoring wallet connection status from sessionStorage:', sessionWalletAddress);
            
            // Restore wallet connection status
            isWalletConnected = true;
            currentAddress = sessionWalletAddress;
            
            // Update UI
            updateWalletUI(true, currentAddress);
            
            // Notify wallet iframe to auto-connect
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        debug.log('Sending auto-connect message to wallet iframe');
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: sessionWalletType || 'metamask'
                        }, '*');
                    } catch (error) {
                        debug.error('Failed to send message to iframe:', error);
                    }
                }
            }, 500);
            
            // Check Web3 instance
            if (!web3 && window.ethereum) {
                try {
                    debug.log('Creating Web3 instance');
                    web3 = new Web3(window.ethereum);
                    
                    // Initialize game token contracts
                    initGameTokens();
                    
                    // Only update balance once after creating new Web3 instance
                    updateTokenBalances();
                } catch (error) {
                    debug.error('Failed to create Web3 instance:', error);
                }
            }
            
            // Force refresh NFT data 
            if (window.PetNFTService) {
                debug.log('Restoring session, initializing PetNFTService');
                window.PetNFTService.init().then(success => {
                    debug.log('PetNFTService initialization ' + (success ? 'succeeded' : 'failed'));
                    
                    // Reload farm animals, force refresh
                    loadFarmAnimals(true);
                });
            } else {
                // Even without PetNFTService, load farm animals (will use default animals)
                loadFarmAnimals();
            }
            
            return;
        }
        
        // If not found in sessionStorage, check localStorage
        const storedWalletConnected = localStorage.getItem('walletConnected');
        const storedWalletAddress = localStorage.getItem('walletAddress');
        const storedWalletType = localStorage.getItem('walletType');
        
        if (storedWalletConnected === 'true' && storedWalletAddress) {
            debug.log('Restoring wallet connection status from localStorage:', storedWalletAddress);
            
            // Restore wallet connection status
            isWalletConnected = true;
            currentAddress = storedWalletAddress;
            
            // Update UI
            updateWalletUI(true, currentAddress);
            
            // Sync to sessionStorage
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', storedWalletAddress);
            sessionStorage.setItem('walletType', storedWalletType || 'metamask');
            
            // Notify wallet iframe to auto-connect
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        debug.log('Sending auto-connect message to wallet iframe');
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: storedWalletType || 'metamask'
                        }, '*');
                    } catch (error) {
                        debug.error('Failed to send message to iframe:', error);
                    }
                }
            }, 500);
            
            // Check Web3 instance
            if (!web3 && window.ethereum) {
                try {
                    debug.log('Creating Web3 instance');
                    web3 = new Web3(window.ethereum);
                    
                    // Initialize game token contracts
                    initGameTokens();
                    
                    // Only update balance once after creating new Web3 instance
                    updateTokenBalances();
                } catch (error) {
                    debug.error('Failed to create Web3 instance:', error);
                }
            }
            
            // Force refresh NFT data
            if (window.PetNFTService) {
                debug.log('Restoring session, initializing PetNFTService');
                window.PetNFTService.init().then(success => {
                    debug.log('PetNFTService initialization ' + (success ? 'succeeded' : 'failed'));
                    
                    // Reload farm animals, force refresh
                    loadFarmAnimals(true);
                });
            } else {
                // Even without PetNFTService, load farm animals (will use default animals)
                loadFarmAnimals();
            }
            
            return;
        }
        
        // If no connected wallet is found, try to load NFTs from cache
        debug.log('No connected wallet found, trying to load NFTs from cache');
        if (window.PetNFTService) {
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialization ' + (success ? 'succeeded' : 'failed'));
                // Load farm animals (will try to load NFTs from cache)
                loadFarmAnimals(false);
            });
        } else {
            // Load default animals
            loadFarmAnimals();
        }
    }
    
    /**
     * Load user's farm animals
     * @param {boolean} forceUpdate - Whether to force refresh NFT data
     */
    function loadFarmAnimals(forceUpdate = false) {
        const farmAnimalsContainer = document.getElementById('farm-animals-container');
        if (!farmAnimalsContainer) return;
        
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
        
        // Try to load NFTs using PetNFTService (even if wallet is not connected, try to load from cache)
        if (window.PetNFTService) {
            debug.log('Trying to load cached or online NFT pets using PetNFTService');
            
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-animal-indicator';
            loadingIndicator.textContent = 'Loading pets...';
            farmAnimalsContainer.appendChild(loadingIndicator);
            
            // Get user address (connected or from local storage)
            const userAddress = currentAddress || localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
            
            // First ensure PetNFTService is initialized
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialization ' + (success ? 'succeeded' : 'failed'));
                
                if (!success) {
                    debug.error('PetNFTService initialization failed, unable to load NFTs');
                    // Remove loading indicator
                    farmAnimalsContainer.removeChild(loadingIndicator);
                    isLoadingNFT = false; // Reset loading flag
                    
                    // Show adopt button
                    showAdoptPetButton(farmAnimalsContainer);
                    return;
                }
                
                // Check if NFT data needs to be refreshed
                const needsRefresh = forceUpdate || window.PetNFTService.needsRefresh({
                    userAddress: userAddress,
                    refreshInterval: 60000, // Reduce to 1 minute refresh interval
                });
                
                if ((needsRefresh || forceUpdate) && isWalletConnected && userAddress) {
                    debug.log('Need to refresh NFT data, fetching latest data from the chain...');
                    
                    // Call PetNFTService to refresh NFT data
                    window.PetNFTService.refreshNFTs(userAddress, {
                        forceUpdate: true, // Force to get the latest data from the chain
                        refreshInterval: 60000, // Reduce to 1 minute refresh interval
                        skipIntervalCheck: true // Skip interval check, always refresh
                    }).then(result => {
                        debug.log('NFT data refresh result:', result);
                        
                        // Remove loading indicator
                        farmAnimalsContainer.removeChild(loadingIndicator);
                        
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
                                const animalElement = createNFTAnimalElement(nft, positions[index]);
                                farmAnimalsContainer.appendChild(animalElement);
                            });
                            
                            // Ensure all pets' Z-axis order is correct and apply animations
                            setTimeout(() => {
                                // Apply Z-axis order
                                if (window.PetZIndexManager) {
                                    debug.log('Updating pets\' Z-axis order');
                                    window.PetZIndexManager.updateAllPetZIndexes();
                                }
                                
                                // Apply animations and shadows
                                setTimeout(() => {
                                    applyAnimationsToExistingPets();
                                    
                                    // Trigger NFT refresh event to notify other components that data has been updated
                                    debug.log('Triggering nftRefreshed event, notifying that page data has been loaded');
                                    window.dispatchEvent(new CustomEvent('nftRefreshed', {
                                        detail: { 
                                            count: nftsToShow.length,
                                            source: 'online'
                                        }
                                    }));
                                }, 300);
                            }, 300);
                        } else {
                            debug.log('No NFT pets found or loading failed, trying to load from cache');
                            loadFromCacheOrDefault(farmAnimalsContainer, userAddress);
                        }
                        
                        // Reset loading flag
                        isLoadingNFT = false;
                    }).catch(error => {
                        debug.error('Failed to refresh NFT data:', error);
                        
                        // Remove loading indicator
                        if (loadingIndicator.parentNode) {
                            farmAnimalsContainer.removeChild(loadingIndicator);
                        }
                        
                        // Try to load from cache on failure
                        loadFromCacheOrDefault(farmAnimalsContainer, userAddress);
                        
                        // Reset loading flag
                        isLoadingNFT = false;
                    });
                } else {
                    // If no need to refresh or cannot refresh, try to load from cache
                    debug.log('Using cached NFT data');
                    
                    // Remove loading indicator
                    farmAnimalsContainer.removeChild(loadingIndicator);
                    
                    loadFromCacheOrDefault(farmAnimalsContainer, userAddress);
                    
                    // Reset loading flag
                    isLoadingNFT = false;
                }
            }).catch(error => {
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
                        error: error.message || 'Initialization failed'
                    }
                }));
            });
        } else {
            // PetNFTService is not available, restore loading state
            debug.log('PetNFTService is not available, unable to load NFTs');
            isLoadingNFT = false;
            
            // Show adopt button
            showAdoptPetButton(farmAnimalsContainer);
            
            // Trigger NFT refresh failure event
            debug.log('Triggering nftRefreshed event (service unavailable)');
            window.dispatchEvent(new CustomEvent('nftRefreshed', {
                detail: { 
                    success: false,
                    error: 'PetNFTService is not available'
                }
            }));
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
                const animalElement = createNFTAnimalElement(nft, positions[index]);
                container.appendChild(animalElement);
            });
            
            // check and enable Egg animation
            if (window.EggManager && typeof window.EggManager.checkForEggs === 'function') {
            setTimeout(() => {
                    debug.log('check cached NFTs for Egg pets and apply animation');
                    window.EggManager.checkForEggs();
                    
                    // trigger nftRefreshed event to notify EggManager to reset state
                    debug.log('trigger nftRefreshed event (cache loaded)');
                    window.dispatchEvent(new CustomEvent('nftRefreshed', {
                        detail: { 
                            count: nftsToShow.length,
                            source: 'cache'
                        }
                    }));
                }, 500);
            } else {
                // if there is no EggManager, also trigger refresh event
                setTimeout(() => {
                    debug.log('trigger nftRefreshed event (cache loaded, no EggManager)');
                    window.dispatchEvent(new CustomEvent('nftRefreshed', {
                        detail: { 
                            count: nftsToShow.length,
                            source: 'cache'
                        }
                    }));
            }, 500);
            }
            
            // check and enable Duck animation
            if (window.DuckManager && typeof window.DuckManager.checkForDucks === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Duck pets and apply animation');
                    window.DuckManager.checkForDucks();
                }, 600);
            }

            // check and enable Chicken animation
            if (window.ChickenManager && typeof window.ChickenManager.checkForChickens === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Chicken pets and apply animation');
                    window.ChickenManager.checkForChickens();
                }, 600);
            }

            // check and enable Cat animation
            if (window.CatManager && typeof window.CatManager.checkForCats === 'function') {
            setTimeout(() => {
                    debug.log('check cached NFTs for Cat pets and apply animation');
                    window.CatManager.checkForCats();
                }, 600);
            }

            // check and enable White Tiger animation
            if (window.WhiteTigerManager && typeof window.WhiteTigerManager.checkForWhiteTigers === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for White Tiger pets and apply animation');
                    window.WhiteTigerManager.checkForWhiteTigers();
                }, 600);
            }

            // check and enable White Lion animation
            if (window.WhiteLionManager && typeof window.WhiteLionManager.checkForWhiteLions === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for White Lion pets and apply animation');
                    window.WhiteLionManager.checkForWhiteLions();
                }, 600);
            }

            // check and enable Black Panther animation
            if (window.BlackPantherManager && typeof window.BlackPantherManager.checkForBlackPanthers === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Black Panther pets and apply animation');
                    window.BlackPantherManager.checkForBlackPanthers();
                }, 600);
            }

            // check and enable Moonlit Wolf animation
            if (window.MoonlitWolfManager && typeof window.MoonlitWolfManager.checkForMoonlitWolves === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Moonlit Wolf pets and apply animation');
                    window.MoonlitWolfManager.checkForMoonlitWolves();
                }, 600);
            }

            // check and enable Dragon animation
            if (window.DragonManager && typeof window.DragonManager.checkForDragons === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Dragon pets and apply animation');
                    window.DragonManager.checkForDragons();
                }, 600);
            }

            // check and enable Unicorn animation
            if (window.UnicornManager && typeof window.UnicornManager.checkForUnicorns === 'function') {
                setTimeout(() => {  
                    debug.log('check cached NFTs for Unicorn pets and apply animation');
                    window.UnicornManager.checkForUnicorns();
                }, 600);
            }

            // check and enable Dog animation
            if (window.DogManager && typeof window.DogManager.checkForDogs === 'function') {
                setTimeout(() => {
                    debug.log('check cached NFTs for Dog pets and apply animation');
                    window.DogManager.checkForDogs();
                }, 600);
            }   

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
                                }, 300);
        }
    }
    
    /**
     * handle wallet button click event
     */
    function handleWalletBtnClick() {
        if (isWalletConnected) {
            // if connected, disconnect
            disconnectWallet();
        } else {
            // if not connected, show wallet connection modal
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
     * handle iframe message
     */
    function handleIframeMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;
        
        const message = event.data;
        debug.log('receive iframe message:', message.type);
        
        switch (message.type) {
            case 'walletConnected':
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                // close wallet modal
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // handle wallet disconnect
                handleWalletDisconnect();
                break;
                
            case 'refreshNFT':
                // handle refresh NFT request
                debug.log('receive refresh NFT request:', message.forceUpdate);
                if (currentAddress) {
                    loadFarmAnimals(true); // force refresh
                    showRefreshToast('NFT data refreshed');
                }
                break;
                
            case 'syncStorage':
                // handle sync storage request
                debug.log('receive sync storage request:', message.data);
                if (message.data) {
                    try {
                        // save old address for address change detection
                        const oldAddress = localStorage.getItem('walletAddress');
                        
                        // sync localStorage
                        if (message.data.localStorage) {
                            Object.entries(message.data.localStorage).forEach(([key, value]) => {
                                localStorage.setItem(key, value);
                                debug.log(`synced localStorage: ${key}=${value}`);
                            });
                        }
                        
                        // sync sessionStorage
                        if (message.data.sessionStorage) {
                            Object.entries(message.data.sessionStorage).forEach(([key, value]) => {
                                sessionStorage.setItem(key, value);
                                debug.log(`synced sessionStorage: ${key}=${value}`);
                            });
                        }
                        
                        // if sync is wallet connection info, update UI
                        if (message.data.localStorage && message.data.localStorage.walletAddress) {
                            const newAddress = message.data.localStorage.walletAddress;
                            isWalletConnected = true;
                            
                            // detect if wallet address changed
                            if (oldAddress && oldAddress !== newAddress) {
                                debug.log(`detected wallet address changed: ${oldAddress} -> ${newAddress}`);
                                // update current address
                                currentAddress = newAddress;
                                // update UI
                                updateWalletUI(true, currentAddress);
                                // force refresh NFT data
                                loadFarmAnimals(true);
                                // show toast
                                showRefreshToast('wallet switched, refreshing NFT data...', 3000);
                            } else if (!currentAddress || currentAddress !== newAddress) {
                                // first connection or other cases
                                currentAddress = newAddress;
                                // update UI
                                updateWalletUI(true, currentAddress);
                            }
                        }
                    } catch (error) {
                        debug.error('sync storage error:', error);
                    }
                }
                break;
                
            case 'web3Ready':
                debug.log('receive web3 ready message:', message.data);
                
                if (!message.data) {
                    debug.error('receive invalid web3 connection info');
                    return;
                }
                
                try {
                    // save old address for address change detection
                    const oldAddress = currentAddress;
                    
                    // select provider based on wallet type
                    if (message.data.walletType === 'metamask' && window.ethereum) {
                        web3 = new Web3(window.ethereum);
                        debug.log('created web3 instance via MetaMask');
                    } else if (message.data.walletType === 'okx' && window.okxwallet) {
                        web3 = new Web3(window.okxwallet);
                        debug.log('created web3 instance via OKX wallet');
                    } else if (window.ethereum) {
                        web3 = new Web3(window.ethereum);
                        debug.log('created web3 instance via available provider');
                    } else {
                        debug.error('cannot create web3 instance: no compatible provider found');
                        return;
                    }
                    
                    // share web3 instance globally
                    window.gameWeb3 = web3;
                    
                    // initialize game token contracts
                    initGameTokens();
                    
                    // if there is address info but UI not updated, update UI
                    if (message.data.address) {
                        const noWalletText = i18n && typeof i18n.t === 'function' ? 
                            i18n.t('wallet.noWallet') : 'no wallet connected';
                        
                        // check if UI needs update (if wallet address not shown)
                        if (walletAddressSpan && (
                            walletAddressSpan.textContent === noWalletText || 
                            !walletAddressSpan.textContent ||
                            !isWalletConnected ||
                            oldAddress !== message.data.address // add address change detection
                        )) {
                            debug.log('update wallet UI, address:', message.data.address);
                            
                            // detect if wallet address changed
                            if (oldAddress && oldAddress !== message.data.address) {
                                debug.log(`detected wallet address changed: ${oldAddress} -> ${message.data.address}`);
                                // force refresh NFT data
                                showRefreshToast('wallet switched, refreshing NFT data...', 3000);
                            }
                            
                            currentAddress = message.data.address;
                            isWalletConnected = true;
                            
                            // use unified UI update function
                            updateWalletUI(true, currentAddress);
                            
                            // ensure saved to localStorage and sessionStorage
                            localStorage.setItem('walletConnected', 'true');
                            localStorage.setItem('walletAddress', currentAddress);
                            localStorage.setItem('walletType', message.data.walletType || 'metamask');
                            
                            sessionStorage.setItem('walletConnected', 'true');
                            sessionStorage.setItem('walletAddress', currentAddress);
                            sessionStorage.setItem('walletType', message.data.walletType || 'metamask');
                            
                            // force refresh NFT data
                            if (oldAddress !== message.data.address) {
                                loadFarmAnimals(true);
                            }
                        }
                    }
                } catch (error) {
                    debug.error('create web3 instance failed:', error);
                }
                break;
                
            case 'clearStorage':
                // clear specified storage data
                debug.log('receive clear storage request:', message.data);
                if (message.data) {
                    try {
                        // clear specified items in localStorage
                        if (message.data.localStorage && Array.isArray(message.data.localStorage)) {
                            message.data.localStorage.forEach(key => {
                                localStorage.removeItem(key);
                                debug.log(`cleared localStorage: ${key}`);
                            });
                        }
                        
                        // clear specified items in sessionStorage
                        if (message.data.sessionStorage && Array.isArray(message.data.sessionStorage)) {
                            message.data.sessionStorage.forEach(key => {
                                sessionStorage.removeItem(key);
                                debug.log(`cleared sessionStorage: ${key}`);
                            });
                        }
                        
                        // reset connection status and UI
                        isWalletConnected = false;
                        currentAddress = null;
                        
                        if (walletAddressSpan) {
                            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'no wallet connected';
                        }
                        
                        if (walletBtn) {
                            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'connect wallet';
                            walletBtn.classList.remove('connected');
                        }
                    } catch (error) {
                        debug.error('clear storage error:', error);
                    }
                }
                break;
                
            default:
                debug.log('unhandled message type:', message.type);
                break;
        }
    }
    
    /**
     * handle wallet connected event
     * @param {Object} data - wallet connection data, contains address and walletType
     */
    function handleWalletConnected(data) {
        debug.log('receive wallet connected message:', data);
        
        // extract address and wallet type from data object
        let address, walletType;
        if (typeof data === 'object' && data !== null) {
            address = data.address;
            walletType = data.walletType || 'metamask';
        } else {
            // if only address string is provided
            address = data;
            walletType = 'metamask'; // default value
        }
        
        // save old address for wallet switch detection
        const oldAddress = currentAddress;
        
        // detect if wallet address changed
        if (oldAddress && oldAddress !== address) {
            debug.log(`detected wallet address changed: ${oldAddress} -> ${address}`);
        }
        
        // update connection status
        isWalletConnected = true;
        currentAddress = address;
        
        // update UI
        updateWalletUI(true, currentAddress);
        
        // ensure saved to localStorage and sessionStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', currentAddress);
        localStorage.setItem('walletType', walletType);
        
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', currentAddress);
        sessionStorage.setItem('walletType', walletType);
        
        debug.log('saved wallet connection status to localStorage and sessionStorage:', {
            address: currentAddress,
            type: walletType
        });
        
        // hide wallet modal
        hideWalletModal();
        
        // if web3 instance exists, initialize game token contracts
        if (web3) {
            initGameTokens();
            
            // update token balances after wallet connected
            updateTokenBalances();
        }
        
        // initialize PetNFTService and reload NFT pets
        if (window.PetNFTService) {
            window.PetNFTService.init().then(success => {
                debug.log('PetNFTService initialized' + (success ? 'successfully' : 'failed'));
                
                // detect if wallet address changed
                if (oldAddress && oldAddress !== address) {
                    // show wallet switch toast
                    showRefreshToast('wallet switched, refreshing NFT data...', 3000);
                    
                    // force refresh NFT data
                    loadFarmAnimals(true);
                } else {
                    // new wallet connected but not switch, delay 500ms to load, avoid overlapping with other initialization processes
                    setTimeout(() => {
                        loadFarmAnimals(true); // also force refresh, ensure data is up to date
                    }, 500);
                }
            });
        } else {
            // even if PetNFTService is not available, try to load farm animals
            loadFarmAnimals();
        }
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
     * initialize game token contracts
     */
    function initGameTokens() {
        try {
            debug.log('initializing game token contracts...');
            
            if (!web3) {
                debug.error('cannot initialize game token contracts: Web3 not initialized');
                return;
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
            
            // update token balances
            if (currentAddress) {
                updateTokenBalances();
            }
            
            debug.log('game token contracts initialized');
        } catch (error) {
            debug.error('initialize game token contracts failed:', error);
        }
    }
    
    /**
     * update token balance display
     */
    async function updateTokenBalances() {
        if (!web3 || !currentAddress) {
            debug.log('cannot update token balances: web3 or currentAddress not initialized');
            return Promise.reject(new Error('web3 or currentAddress not initialized'));
        }
        
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
        // send disconnect wallet message to wallet iframe
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        
        // handle wallet disconnect directly
        handleWalletDisconnect();
    }
    
    /**
     * handle wallet disconnect
     */
    function handleWalletDisconnect() {
        debug.log('wallet disconnected');
        
        // reset status
        isWalletConnected = false;
        currentAddress = null;
        web3 = null;
        
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
    }
    
    /**
     * update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        if (connected) {
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'disconnect wallet';
            walletBtn.classList.add('connected');
            walletAddressSpan.textContent = formatAddress(address);
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
        } else {
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'connect wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'no wallet connected';
            walletAddressSpan.title = '';
            walletAddressSpan.classList.remove('truncated-address');
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
                break;
                
            case 'market-modal':
                // load market page
                document.getElementById('market-iframe').src = '../../webPages/gamePages/market.html';
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
        
        console.log(`[NFTDebug] Creating NFT animal element: ${animalDiv.dataset.name} (ID: ${animalDiv.dataset.id})`);
        
        // check if it is a special type of NFT (like Egg or Duck)
        const nftName = (animalDiv.dataset.name || '').toLowerCase();
        
        // more clearly add type mark
        if (nftName.includes('egg')) {
            animalDiv.classList.add('egg-nft');
            animalDiv.dataset.type = 'egg';
            console.log(`[NFTDebug] Marked as EGG: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('duck')) {
            animalDiv.classList.add('duck-nft');
            animalDiv.dataset.type = 'duck';
            console.log(`[NFTDebug] Marked as DUCK: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('chicken')) {
            animalDiv.classList.add('chicken-nft');
            animalDiv.dataset.type = 'chicken';
            console.log(`[NFTDebug] Marked as CHICKEN: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('cat')) {
            animalDiv.classList.add('cat-nft');
            animalDiv.dataset.type = 'cat';
            console.log(`[NFTDebug] Marked as CAT: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('dog')) {
            animalDiv.classList.add('dog-nft');
            animalDiv.dataset.type = 'dog';
            console.log(`[NFTDebug] Marked as DOG: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('dragon')) {
            animalDiv.classList.add('dragon-nft');
            animalDiv.dataset.type = 'dragon';
            console.log(`[NFTDebug] Marked as DRAGON: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('unicorn')) {
            animalDiv.classList.add('unicorn-nft');
            animalDiv.dataset.type = 'unicorn';
            console.log(`[NFTDebug] Marked as UNICORN: ${animalDiv.dataset.name}`); 
        } else if (nftName.includes('white tiger')) {
            animalDiv.classList.add('white-tiger-nft');
            animalDiv.dataset.type = 'white tiger';
            console.log(`[NFTDebug] Marked as WHITE TIGER: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('white lion')) {
            animalDiv.classList.add('white-lion-nft');
            animalDiv.dataset.type = 'white lion';
            console.log(`[NFTDebug] Marked as WHITE LION: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('black panther')) {
            animalDiv.classList.add('black-panther-nft');
            animalDiv.dataset.type = 'black panther';
            console.log(`[NFTDebug] Marked as BLACK PANTHER: ${animalDiv.dataset.name}`);
        } else if (nftName.includes('moonlit wolf')) {
            animalDiv.classList.add('moonlit-wolf-nft');
            animalDiv.dataset.type = 'moonlit wolf';
            console.log(`[NFTDebug] Marked as MOONLIT WOLF: ${animalDiv.dataset.name}`);
        } else {
            console.log(`[NFTDebug] Unknown pet type: ${animalDiv.dataset.name}`);
        }
        
        // use PetSizeManager to set pet size
        if (window.PetSizeManager) {
            // apply size in next render cycle, ensure element is added to DOM
            setTimeout(() => {
                window.PetSizeManager.setSize(animalDiv, animalDiv.dataset.type);
            }, 0);
        } else {
        // basic style, not区分品质
        animalDiv.style.position = 'absolute';
        // remove background color and rounded corners, no circle
        animalDiv.style.transition = 'all 0.3s ease';
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

    /**
     * apply animations to existing pets, without reloading data
     */
    function applyAnimationsToExistingPets() {
        // check and update all egg animations
        if (window.EggManager) {
            debug.log('check all egg animations...');
            // disable auto shadow application
            window.EggManager.checkForEggs(false);
        }
        
        // check and update all duck animations
        if (window.DuckManager) {
            debug.log('check all duck animations...');
            // disable auto shadow application
            window.DuckManager.checkForDucks(false);
        }

        // check and update all chicken animations
        if (window.ChickenManager) {
            debug.log('check all chicken animations...');
            // disable auto shadow application
            window.ChickenManager.checkForChickens(false);
        }

        // check and update all cat animations
        if (window.CatManager) {
            debug.log('check all cat animations...');
            // disable auto shadow application
            window.CatManager.checkForCats(false);
        }

        // check and update all white tiger animations
        if (window.WhiteTigerManager) {
            debug.log('check all white tiger animations...');
            // disable auto shadow application
            window.WhiteTigerManager.checkForWhiteTigers(false);
        }   

        // check and update all white lion animations
        if (window.WhiteLionManager) {
            debug.log('check all white lion animations...');
            // disable auto shadow application
            window.WhiteLionManager.checkForWhiteLions(false);
        }   

        // check and update all black panther animations
        if (window.BlackPantherManager) {
            debug.log('check all black panther animations...');
            // disable auto shadow application
            window.BlackPantherManager.checkForBlackPanthers(false);
        }   

        // check and update all moonlit wolf animations
        if (window.MoonlitWolfManager) {
            debug.log('check all moonlit wolf animations...');
            // disable auto shadow application
            window.MoonlitWolfManager.checkForMoonlitWolves(false);
        }      

        // check and update all dragon animations
        if (window.DragonManager) {
            debug.log('check all dragon animations...');
            // disable auto shadow application
            window.DragonManager.checkForDragons(false);
        }      

        // check and update all unicorn animations
        if (window.UnicornManager) {
            debug.log('check all unicorn animations...');
            // disable auto shadow application
            window.UnicornManager.checkForUnicorns(false);
        }      

        // check and update all dog animations
        if (window.DogManager) {
            debug.log('check all dog animations...');
            // disable auto shadow application
            window.DogManager.checkForDogs(false);
        }
    }

    // Add loading animation to cursor
    document.body.classList.add('loading');

    // Remove loading animation when page is fully loaded
    window.addEventListener('load', () => {
        document.body.classList.remove('loading');
    });

    // Add click animation to cursor
    document.addEventListener('click', () => {
        document.body.classList.add('clicked');
        setTimeout(() => {
            document.body.classList.remove('clicked');
        }, 500);
    });
}); 
