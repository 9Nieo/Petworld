// Home page script

document.addEventListener('DOMContentLoaded', () => {
    // Get loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Get global i18n object
    const i18n = window.i18n;
    
    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const gameModeCard = document.getElementById('gameMode');
    const simpleModelCard = document.getElementById('simpleMode');
    
    // Wallet connection status
    let isWalletConnected = false;
    // Current connected wallet address
    let currentAddress = null;
    // Web3 instance
    let web3Instance = null;
    // Sakura background instance
    let sakuraBackground = null;
    
    // Wallet choice modal elements
    const walletChoiceModal = document.getElementById('walletChoiceModal');
    const chooseWalletOption = document.getElementById('chooseWalletOption');
    const choosePrivateKeyOption = document.getElementById('choosePrivateKeyOption');
    const skipWalletChoice = document.getElementById('skipWalletChoice');
    
    // Private key modal elements
    const privateKeyModal = document.getElementById('privateKeyModal');
    const privateKeyForm = document.getElementById('privateKeyForm');
    const masterPasswordInput = document.getElementById('masterPasswordInput');
    const walletNameInput = document.getElementById('walletNameInput');
    const privateKeyInput = document.getElementById('privateKeyInput');
    const cancelPrivateKey = document.getElementById('cancelPrivateKey');
    const setupPrivateKey = document.getElementById('setupPrivateKey');
    
    // Wallet choice cooldown (30 seconds)
    const WALLET_CHOICE_COOLDOWN = 30000;
    let lastWalletChoiceTime = 0;
    
    // Hide loading overlay after a small delay to ensure all resources are loaded
    setTimeout(() => {
        if (loadingOverlay) {
            // Create a fade-out animation for the loading overlay
            gsap.to(loadingOverlay, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.inOut',
                onComplete: () => {
                    loadingOverlay.style.display = 'none';
                    // Initialize after loading screen is gone
                    init();
                }
            });
        } else {
            // Initialize immediately if overlay not found
            init();
        }
    }, 1500); // Adjust the delay time as needed
    
    /**
     * Initialization function
     */
    function init() {
        // Initialize sakura background
        initSakuraBackground();
        
        // Bind wallet connection button click event
        walletBtn.addEventListener('click', handleWalletBtnClick);
        
        // Bind game mode card click event
        gameModeCard.querySelector('.mode-btn').addEventListener('click', () => {
            enterGameMode();
        });
        
        // Bind simple mode card click event
        simpleModelCard.querySelector('.mode-btn').addEventListener('click', () => {
            enterSimpleMode();
        });
        
        // Listen for messages from wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Listen for language change events
        window.addEventListener('localeChanged', handleLocaleChanged);
        
        // Listen for private key wallet status changes
        setupPrivateKeyWalletListener();
        
        // Bind wallet choice modal events
        bindWalletChoiceEvents();
        
        // Wait for SecureWalletManager to be fully initialized before checking wallet status
        setTimeout(() => {
        // Check if there is a stored wallet connection status
        checkStoredWalletConnection();
        
        // Check if we should show wallet choice modal
        setTimeout(() => {
            checkAndShowWalletChoice();
        }, 2000); // Show after 2 seconds if no wallet is connected
        }, 100);
        
        // Apply current language settings
        updateUITexts();
        
        // Initialize GSAP animations
        initAnimations();
        
        // Initialize language selector
        initLanguageSelector();
    }
    
    /**
     * Initialize sakura background
     */
    function initSakuraBackground() {
        if (window.SakuraBackground) {
            sakuraBackground = new SakuraBackground({
                petalCount: 40,
                minDuration: 5,
                maxDuration: 15
            });
            sakuraBackground.init();
        } else {
            console.error('SakuraBackground not available, please ensure sakuraBackground.js is loaded correctly');
        }
    }
    
    /**
     * Initialize GSAP animations
     */
    function initAnimations() {
        // Register ScrollTrigger plugin
        gsap.registerPlugin(ScrollTrigger);
        
        // Create a timeline for entrance animations
        const tl = gsap.timeline();
        
        // Header animation
        tl.from('.logo-container', {
            y: -50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        })
        .from('.wallet-info', {
            y: -50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.5')
        
        // Welcome section animation
        .from('.welcome-section h2', {
            scale: 0.8,
            opacity: 0,
            duration: 0.8,
            ease: 'back.out(1.7)'
        }, '-=0.4')
        .from('.welcome-section p', {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        }, '-=0.6')
        
        // Mode cards animation (staggered)
        .from('.mode-card', {
            y: 100,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power2.out'
        }, '-=0.4')
        .from('.mode-icon', {
            scale: 0,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'back.out(2)'
        }, '-=0.8')
        .from('.mode-btn', {
            scale: 0.5,
            opacity: 0,
            duration: 0.5,
            stagger: 0.2,
            ease: 'power1.out'
        }, '-=0.4')
        
        // Footer animation
        .from('.app-footer', {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out'
        }, '-=0.2');
        
        // Add hover animations for mode cards
        gsap.utils.toArray('.mode-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                gsap.to(card.querySelector('.mode-icon'), {
                    scale: 1.2,
                    duration: 0.4,
                    ease: 'back.out(1.7)'
                });
                gsap.to(card.querySelector('.mode-btn'), {
                    y: -5,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
            
            card.addEventListener('mouseleave', () => {
                gsap.to(card.querySelector('.mode-icon'), {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
                gsap.to(card.querySelector('.mode-btn'), {
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        });
        
        // Add pulse animation to wallet button if not connected
        if (!isWalletConnected) {
            gsap.to('#connectWalletBtn', {
                scale: 1.05,
                duration: 1,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }
        
        // Add subtle parallax scroll effect to the cards
        gsap.utils.toArray('.mode-card').forEach(card => {
            gsap.to(card, {
                y: -20,
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        });
        
        // Add floating animation to logo
        gsap.to('.logo-icon', {
            y: 5,
            rotation: 5,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
        
        // Create a gentle background color shift on scroll
        gsap.to('body', {
            backgroundColor: 'rgba(226, 232, 240, 1)',
            scrollTrigger: {
                trigger: '.app-content',
                start: 'top 50%',
                end: 'bottom 50%',
                scrub: true
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
        
        // Animate the modal appearance
        gsap.fromTo(walletFrame, 
            { opacity: 0, scale: 0.9 },
            { 
                opacity: 1, 
                scale: 1, 
                duration: 0.4, 
                ease: 'back.out(1.7)'
            }
        );
    }
    
    /**
     * Hide wallet connection modal
     */
    function hideWalletModal() {
        // Animate the modal disappearance
        gsap.to(walletFrame, {
            opacity: 0,
            scale: 0.9,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                walletFrame.style.display = 'none';
            }
        });
    }
    
    /**
     * Handle iframe messages
     */
    function handleIframeMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        console.log('Parent page received message:', message.type);
        
        switch (message.type) {
            case 'walletConnected':
                // Wallet connected successfully
                handleWalletConnected(message.data);
                // Ensure to hide the wallet modal after successful connection
                hideWalletModal();
                break;
                
            case 'walletModalClosed':
                // Wallet modal closed
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Wallet disconnected
                handleWalletDisconnected();
                break;
                
            case 'syncStorage':
                // Sync storage data
                console.log('Received sync storage request:', message.data);
                if (message.data) {
                    try {
                        // Sync localStorage
                        if (message.data.localStorage) {
                            Object.entries(message.data.localStorage).forEach(([key, value]) => {
                                localStorage.setItem(key, value);
                                console.log(`Synchronized localStorage: ${key}=${value}`);
                            });
                        }
                        
                        // Sync sessionStorage
                        if (message.data.sessionStorage) {
                            Object.entries(message.data.sessionStorage).forEach(([key, value]) => {
                                sessionStorage.setItem(key, value);
                                console.log(`Synchronized sessionStorage: ${key}=${value}`);
                            });
                        }
                    } catch (error) {
                        console.error('Error syncing storage:', error);
                    }
                }
                break;
                
            case 'web3Instance':
            case 'web3Ready':
                // Receive Web3 connection information
                if (!message.data) {
                    console.error('Received invalid Web3 connection information');
                    return;
                }
                
                // Create Web3 instance based on connection information
                try {
                    console.log('Received Web3 connection information:', message.data);
                    const walletType = message.data.walletType || localStorage.getItem('walletType');
                    
                    // Select corresponding Provider based on wallet type
                    if (walletType === 'metamask' && window.ethereum) {
                        web3Instance = new Web3(window.ethereum);
                        console.log('Web3 instance created via MetaMask');
                    } else if (walletType === 'okx' && window.okxwallet) {
                        web3Instance = new Web3(window.okxwallet);
                        console.log('Web3 instance created via OKX Wallet');
                    } else if (window.ethereum) {
                        // Try using any available Provider
                        web3Instance = new Web3(window.ethereum);
                        console.log('Web3 instance created via available Provider');
                    } else {
                        console.error('Unable to create Web3 instance: No compatible provider found');
                        return;
                    }
                    
                    // If there is address information but UI is not updated, ensure correct display of address
                    if (message.data.address) {
                        currentAddress = message.data.address;
                        isWalletConnected = true;
                        updateWalletUI(true, currentAddress);
                        
                        // Ensure localStorage and sessionStorage also have this data
                        localStorage.setItem('walletConnected', 'true');
                        localStorage.setItem('walletAddress', currentAddress);
                        localStorage.setItem('walletType', walletType);
                        
                        sessionStorage.setItem('walletConnected', 'true');
                        sessionStorage.setItem('walletAddress', currentAddress);
                        sessionStorage.setItem('walletType', walletType);
                    }
                    
                    // Try to initialize contracts
                    initializeContracts();
                } catch (error) {
                    console.error('Failed to create Web3 instance:', error);
                }
                break;
                
            case 'clearStorage':
                // Clear specified storage data
                console.log('Received clear storage request:', message.data);
                if (message.data) {
                    try {
                        // Clear specified items in localStorage
                        if (message.data.localStorage && Array.isArray(message.data.localStorage)) {
                            message.data.localStorage.forEach(key => {
                                localStorage.removeItem(key);
                                console.log(`Cleared localStorage: ${key}`);
                            });
                        }
                        
                        // Clear specified items in sessionStorage
                        if (message.data.sessionStorage && Array.isArray(message.data.sessionStorage)) {
                            message.data.sessionStorage.forEach(key => {
                                sessionStorage.removeItem(key);
                                console.log(`Cleared sessionStorage: ${key}`);
                            });
                        }
                    } catch (error) {
                        console.error('Error clearing storage:', error);
                    }
                }
                break;
                
            default:
                console.log('Unhandled iframe message type:', message.type);
        }
    }
    
    /**
     * Initialize contracts
     */
    async function initializeContracts() {
        if (!web3Instance) {
            console.error('Unable to initialize contracts: Web3 not initialized');
            return;
        }
        
        try {
            // Check if contract addresses have been loaded
            if (!window.contractAddresses) {
                console.error('Contract addresses not loaded, please ensure contractAddresses.js is loaded correctly');
                return;
            }
            
            // Check if ABIs have been loaded
            if (!window.PwPointABI || !window.PwBountyABI || !window.PwFoodABI) {
                console.error('Contract ABIs not fully loaded, please ensure all ABI files are loaded correctly');
                return;
            }
            
            // Get contract address function, here simply demonstrating using addresses from the network
            // In actual projects, this function may get addresses from configuration or API
            const getContractAddress = (contractName) => {
                const addresses = window.contractAddresses || {};
                const network = window.currentNetwork || 'TEST';
                return addresses[network] ? addresses[network][contractName] : null;
            };
            
            console.log('Starting to initialize contracts...');
            
            // Explicitly test if contractManager has been loaded
            if (typeof window.initAllContracts !== 'function') {
                console.error('Contract manager unavailable, please ensure contractManager.js is loaded correctly');
                return;
            }
            
            // Explicitly test if initialization functions have been loaded
            if (typeof window.initPwPointContract !== 'function') {
                console.error('PwPoint initialization function not loaded, please ensure initPwPoint.js is loaded correctly');
                return;
            }
            
            if (typeof window.initPwBountyContract !== 'function') {
                console.error('PwBounty initialization function not loaded, please ensure initPwBounty.js is loaded correctly');
                return;
            }
            
            if (typeof window.initPwFoodContract !== 'function') {
                console.error('PwFood initialization function not loaded, please ensure initPwFood.js is loaded correctly');
                return;
            }
            
            // Use contract manager to initialize all contracts
            // Here initialize necessary base contracts, other contracts can be initialized as needed
            const priorityContracts = [
                'PwPoint', 
                'PwBounty', 
                'PwFood', 
                'PetWorld',
                'PetWorldManager'
            ];
            
            const contracts = await window.initAllContracts(web3Instance, getContractAddress, priorityContracts);
            console.log('Base contracts initialized, initialized:', Object.keys(contracts));
        } catch (error) {
            console.error('Error initializing contracts:', error);
        }
    }
    
    /**
     * Handle wallet connected
     */
    function handleWalletConnected(data) {
        const { walletType, address, chainId } = data;
        
        // Check if private key wallet is already active
        if (window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet()) {
            console.log('Private key wallet is active, not updating to connected wallet address');
            
            // Still save the connected wallet info but don't change the displayed address
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
            localStorage.setItem('walletType', walletType || 'metamask');
            
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', address);
            sessionStorage.setItem('walletType', walletType || 'metamask');
            
            // Hide wallet modal
            hideWalletModal();
            
            console.log(`External wallet connected but private key wallet takes priority: ${walletType}, address: ${address}, chain ID: ${chainId}`);
            return;
        }
        
        // Set connection status
        isWalletConnected = true;
        currentAddress = address;
        
        // Update UI
        updateWalletUI(true, address);
        
        // Add connection success animation
        gsap.killTweensOf('#connectWalletBtn'); // Kill any existing animations
        
        // Create a success animation timeline
        const connectionTl = gsap.timeline();
        connectionTl
            .to('#connectWalletBtn', {
                backgroundColor: '#10b981',
                duration: 0.3,
                ease: 'power2.inOut'
            })
            .to('#walletAddress', {
                backgroundColor: '#ecfdf5', // Light green bg
                color: '#10b981',
                duration: 0.5,
                ease: 'power2.out'
            }, '-=0.2')
            .to('#walletAddress', {
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                duration: 0.5,
                delay: 1,
                ease: 'power2.inOut'
            });
        
        // Ensure to save to both localStorage and sessionStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletType', walletType || 'metamask');
        
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', address);
        sessionStorage.setItem('walletType', walletType || 'metamask');
        
        console.log('Wallet connection status saved to localStorage and sessionStorage:', {
            address: address,
            type: walletType,
            chainId: chainId
        });
        
        // Set cooldown for wallet choice modal
        lastWalletChoiceTime = Date.now();
        
        // If there is a global Web3 instance, use it directly
        if (window.ethereum && walletType === 'metamask') {
            try {
                web3Instance = new Web3(window.ethereum);
                console.log('Web3 instance created via MetaMask');
                initializeContracts();
            } catch (error) {
                console.error('Failed to create Web3 instance:', error);
            }
        } else if (window.okxwallet && walletType === 'okx') {
            try {
                web3Instance = new Web3(window.okxwallet);
                console.log('Web3 instance created via OKX Wallet');
                initializeContracts();
            } catch (error) {
                console.error('Failed to create Web3 instance:', error);
            }
        } else {
            // Send request to wallet iframe to get Web3 instance
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        walletFrame.contentWindow.postMessage({ type: 'getWeb3Instance' }, '*');
                    } catch (error) {
                        console.error('Error requesting Web3 instance:', error);
                    }
                }
            }, 300);
        }
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send disconnect message to wallet iframe
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        
        // Directly handle disconnection
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnected
     */
    function handleWalletDisconnected() {
        // Set connection status
        isWalletConnected = false;
        currentAddress = null;
        
        // Update UI
        updateWalletUI(false);
        
        // Clear local storage
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Also clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        console.log('Wallet disconnected');
    }
    
    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        if (connected) {
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
            walletBtn.classList.add('connected');
            walletAddressSpan.textContent = formatAddress(address);
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
        } else {
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected';
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
     * Check if there is a stored wallet connection status
     */
    function checkStoredWalletConnection() {
        // Check wallet status using SecureWalletManager
        if (window.SecureWalletManager) {
            const walletStatus = window.SecureWalletManager.getWalletStatus();
            
            if (walletStatus.hasWallet) {
                console.log('Found wallet connection:', walletStatus);
                
                // Set connection status
                isWalletConnected = true;
                currentAddress = walletStatus.activeAddress;
                
                // Update UI with active wallet address
                updateWalletUI(true, currentAddress);
                
                // If using private key wallet, no need to auto-connect to external wallet
                if (walletStatus.usingPrivateKey) {
                    console.log('Using private key wallet:', currentAddress);
                    return;
                }
                
                // If using connected wallet, try to auto-connect
                if (walletStatus.usingConnectedWallet) {
                    console.log('Using connected wallet, attempting auto-connect');
                    // Notify wallet iframe to attempt auto connection
                    setTimeout(() => {
                        if (walletFrame && walletFrame.contentWindow) {
                            try {
                                walletFrame.contentWindow.postMessage({ 
                                    type: 'autoConnect',
                                    walletType: walletStatus.walletType
                                }, '*');
                            } catch (error) {
                                console.error('Failed to send auto-connect message:', error);
                            }
                        }
                    }, 500);
                }
                
                return;
            }
        }
        
        // Fallback to original logic if SecureWalletManager not available
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            // Restore connection status from local storage
            isWalletConnected = true;
            currentAddress = storedAddress;
            updateWalletUI(true, storedAddress);
            
            // Notify wallet iframe to attempt auto connection
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                walletFrame.contentWindow.postMessage({ 
                    type: 'autoConnect',
                    walletType: localStorage.getItem('walletType')
                }, '*');
                    } catch (error) {
                        console.error('Failed to send auto-connect message:', error);
                    }
                }
            }, 500);
        }
    }
    
    /**
     * Enter game mode
     */
    function enterGameMode() {
        // Store wallet connection status in sessionStorage to maintain it across page transitions
        if (isWalletConnected && currentAddress) {
            // Clear sessionStorage first to prevent conflicts
            sessionStorage.clear();
            
            // Store wallet connection status in sessionStorage
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', currentAddress);
            sessionStorage.setItem('walletType', localStorage.getItem('walletType') || 'metamask');
            
            console.log('Saved wallet connection information to sessionStorage, preparing to jump to game mode:', {
                address: currentAddress,
                type: localStorage.getItem('walletType')
            });
        } else {
            console.log('No wallet connected, directly jumping to game mode');
        }
        
        // Create an exit animation
        const exitTl = gsap.timeline({
            onComplete: () => {
                window.location.href = 'webPages/gamePages/home.html';
            }
        });
        
        exitTl
            .to('.app-content', {
                opacity: 0,
                y: -30,
                duration: 0.5,
                ease: 'power2.inOut'
            })
            .to('.app-header, .app-footer', {
                opacity: 0,
                duration: 0.3,
                ease: 'power2.inOut'
            }, '-=0.3');
    }
    
    /**
     * Enter simple mode
     */
    function enterSimpleMode() {
        // Store wallet connection status in sessionStorage to maintain it across page transitions
        if (isWalletConnected && currentAddress) {
            // Clear sessionStorage first to prevent conflicts
            sessionStorage.clear();
            
            // Store wallet connection status in sessionStorage
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', currentAddress);
            sessionStorage.setItem('walletType', localStorage.getItem('walletType') || 'metamask');
            
            console.log('Saved wallet connection information to sessionStorage, preparing to jump to simple mode:', {
                address: currentAddress,
                type: localStorage.getItem('walletType')
            });
        } else {
            console.log('No wallet connected, directly jumping to simple mode');
        }
        
        // Create an exit animation
        const exitTl = gsap.timeline({
            onComplete: () => {
                window.location.href = 'webPages/simplePages/home.html';
            }
        });
        
        exitTl
            .to('.app-content', {
                opacity: 0,
                y: -30,
                duration: 0.5,
                ease: 'power2.inOut'
            })
            .to('.app-header, .app-footer', {
                opacity: 0,
                duration: 0.3,
                ease: 'power2.inOut'
            }, '-=0.3');
    }
    
    /**
     * Handle language change event
     * @param {CustomEvent} event Language change event
     */
    function handleLocaleChanged(event) {
        console.log('Language has changed, updating UI texts');
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
        document.title = i18n.t('game.selectMode') + ' - ' + i18n.t('game.title');
        
        // Update wallet button text
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
                    el.textContent = translation;
                } else if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        // If there are no elements with data-i18n attribute, use manual updates (for compatibility)
        if (i18nElements.length === 0) {
            // Update title and description
            const welcomeTitle = document.querySelector('.welcome-section h2');
            const welcomeDesc = document.querySelector('.welcome-section p');
            
            if (welcomeTitle) {
                welcomeTitle.textContent = i18n.t('index.welcome') || 'Welcome to Pet World!';
            }
            
            if (welcomeDesc) {
                welcomeDesc.textContent = i18n.t('index.selectMode') || 'Please select the game mode you want to enter';
            }
            
            // Update game mode card
            const gameModeTitle = document.querySelector('#gameMode h3');
            const gameModeDesc = document.querySelector('#gameMode p');
            const gameModeBtn = document.querySelector('#gameMode .mode-btn');
            
            if (gameModeTitle) {
                gameModeTitle.textContent = i18n.t('index.gameMode') || 'Game Mode';
            }
            
            if (gameModeDesc) {
                gameModeDesc.textContent = i18n.t('index.gameModeDesc') || 'An immersive pet raising game experience, interact with pets and complete tasks to earn rewards';
            }
            
            if (gameModeBtn) {
                gameModeBtn.textContent = i18n.t('index.enterGame') || 'Enter Game';
            }
            
            // Update simple mode card
            const simpleModeTitle = document.querySelector('#simpleMode h3');
            const simpleModeDesc = document.querySelector('#simpleMode p');
            const simpleModeBtn = document.querySelector('#simpleMode .mode-btn');
            
            if (simpleModeTitle) {
                simpleModeTitle.textContent = i18n.t('index.simpleMode') || 'Simple Mode';
            }
            
            if (simpleModeDesc) {
                simpleModeDesc.textContent = i18n.t('index.simpleModeDesc') || 'A simple interface to easily manage your pets and assets';
            }
            
            if (simpleModeBtn) {
                simpleModeBtn.textContent = i18n.t('index.enterApp') || 'Enter App';
            }
            
            // Update copyright information
            const copyright = document.querySelector('.app-footer p');
            if (copyright) {
                copyright.textContent = i18n.t('common.copyright') || '© 2023 Pet World - All Rights Reserved';
            }
        }
        
        console.log('UI texts updated to language:', i18n.getCurrentLocale());
    }
    
    /**
     * Initialize language selector
     */
    function initLanguageSelector() {
        const languageSelector = document.querySelector('.language-selector');
        const languageDropdown = document.querySelector('.language-dropdown');
        
        if (!languageSelector || !languageDropdown) return;
        
        // Toggle dropdown on click
        languageSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            languageDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!languageSelector.contains(e.target)) {
                languageDropdown.classList.remove('show');
            }
        });
        
        // Handle language selection
        const languageOptions = document.querySelectorAll('.language-option');
        languageOptions.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.getAttribute('data-lang');
                i18n.setLocale(lang).then(() => {
                    languageDropdown.classList.remove('show');
                    updateUITexts();
                });
            });
        });
    }
    
    /**
     * Setup listener for private key wallet status changes (Enhanced for Multi-Key)
     */
    function setupPrivateKeyWalletListener() {
        // Immediately check private key wallet status on initialization
        setTimeout(() => {
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const activeAddress = window.SecureWalletManager.getAddress();
                
                console.log('Private key wallet status on initialization:', {
                    keyCount,
                    isLocked,
                    activeAddress: activeAddress ? formatAddress(activeAddress) : null
                });
                
                // Only check if we have keys and wallet is not locked
                if (keyCount > 0 && !isLocked && activeAddress) {
                    console.log('Private key wallet detected on initialization:', activeAddress);
                    isWalletConnected = true;
                    currentAddress = activeAddress;
                    updateWalletUI(true, activeAddress);
                }
            }
        }, 50); // Small delay to ensure SecureWalletManager is ready
        
        // Check for private key wallet status changes periodically
        setInterval(() => {
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const activeAddress = window.SecureWalletManager.getAddress();
                const currentDisplayedAddress = walletAddressSpan.textContent;
                
                // If wallet has keys, is not locked, and has active address
                if (keyCount > 0 && !isLocked && activeAddress) {
                    const formattedAddress = formatAddress(activeAddress);
                    
                    // Only update if the displayed address is different
                    if (currentDisplayedAddress !== formattedAddress && 
                        !currentDisplayedAddress.includes(activeAddress.substring(0, 6))) {
                        
                        console.log('Private key wallet status changed, updating UI');
                        isWalletConnected = true;
                        currentAddress = activeAddress;
                        updateWalletUI(true, activeAddress);
                    }
                } else if (isWalletConnected && (!keyCount || isLocked || !activeAddress)) {
                    // Private key wallet was locked/removed, check if we have connected wallet
                    const connectedWallet = localStorage.getItem('walletConnected') === 'true';
                    if (connectedWallet) {
                        const connectedAddress = localStorage.getItem('walletAddress');
                        console.log('Private key wallet removed, falling back to connected wallet');
                        currentAddress = connectedAddress;
                        updateWalletUI(true, connectedAddress);
                    } else {
                        console.log('No wallet available, updating UI to disconnected state');
                        isWalletConnected = false;
                        currentAddress = null;
                        updateWalletUI(false);
                    }
                }
            }
        }, 1000); // Check every second
    }
    
    /**
     * Bind wallet choice modal events
     */
    function bindWalletChoiceEvents() {
        // Choose wallet option
        if (chooseWalletOption) {
            chooseWalletOption.addEventListener('click', () => {
                hideWalletChoiceModal();
                showWalletModal();
            });
        }
        
        // Choose private key option
        if (choosePrivateKeyOption) {
            choosePrivateKeyOption.addEventListener('click', () => {
                hideWalletChoiceModal();
                showPrivateKeyModal();
            });
        }
        
        // Skip for now
        if (skipWalletChoice) {
            skipWalletChoice.addEventListener('click', () => {
                hideWalletChoiceModal();
                // Set cooldown to prevent showing again soon
                lastWalletChoiceTime = Date.now();
            });
        }
        
        // Private key form submission
        if (privateKeyForm) {
            privateKeyForm.addEventListener('submit', handlePrivateKeySetup);
        }
        
        // Cancel private key setup
        if (cancelPrivateKey) {
            cancelPrivateKey.addEventListener('click', () => {
                hidePrivateKeyModal();
                clearPrivateKeyForm();
            });
        }
        
        // Close modals when clicking outside
        if (walletChoiceModal) {
            walletChoiceModal.addEventListener('click', (e) => {
                if (e.target === walletChoiceModal) {
                    hideWalletChoiceModal();
                    lastWalletChoiceTime = Date.now();
                }
            });
        }
        
        if (privateKeyModal) {
            privateKeyModal.addEventListener('click', (e) => {
                if (e.target === privateKeyModal) {
                    hidePrivateKeyModal();
                    clearPrivateKeyForm();
                }
            });
        }
    }
    
    /**
     * Check if we should show wallet choice modal
     */
    function checkAndShowWalletChoice() {
        // Check cooldown
        const now = Date.now();
        if (now - lastWalletChoiceTime < WALLET_CHOICE_COOLDOWN) {
            console.log('Wallet choice modal on cooldown');
            return;
        }
        
        // Check if wallet is already connected
        if (isWalletConnected && currentAddress) {
            console.log('Wallet already connected, not showing choice modal');
            return;
        }
        
        // Check if private key wallet is available
        if (window.SecureWalletManager) {
            const keyCount = window.SecureWalletManager.getKeyCount();
            const isLocked = window.SecureWalletManager.isWalletLocked();
            const activeAddress = window.SecureWalletManager.getAddress();
            
            if (keyCount > 0 && !isLocked && activeAddress) {
                console.log('Private key wallet available, not showing choice modal');
                return;
            }
        }
        
        // Check if user has stored wallet connection
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            console.log('Stored wallet connection found, not showing choice modal');
            return;
        }
        
        // Show wallet choice modal
        console.log('No wallet connection found, showing choice modal');
        showWalletChoiceModal();
    }
    
    /**
     * Show wallet choice modal
     */
    function showWalletChoiceModal() {
        if (walletChoiceModal) {
            walletChoiceModal.classList.add('show');
            
            // Animate the modal appearance
            gsap.fromTo(walletChoiceModal.querySelector('.wallet-choice-content'), 
                { opacity: 0, scale: 0.9 },
                { 
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.4, 
                    ease: 'back.out(1.7)'
                }
            );
        }
    }
    
    /**
     * Hide wallet choice modal
     */
    function hideWalletChoiceModal() {
        if (walletChoiceModal) {
            // Animate the modal disappearance
            gsap.to(walletChoiceModal.querySelector('.wallet-choice-content'), {
                opacity: 0,
                scale: 0.9,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    walletChoiceModal.classList.remove('show');
                }
            });
        }
    }
    
    /**
     * Show private key modal
     */
    function showPrivateKeyModal() {
        if (privateKeyModal) {
            privateKeyModal.classList.add('show');
            
            // Animate the modal appearance
            gsap.fromTo(privateKeyModal.querySelector('.private-key-content'), 
                { opacity: 0, scale: 0.9 },
                { 
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.4, 
                    ease: 'back.out(1.7)'
                }
            );
            
            // Focus on first input
            setTimeout(() => {
                if (masterPasswordInput) {
                    masterPasswordInput.focus();
                }
            }, 400);
        }
    }
    
    /**
     * Hide private key modal
     */
    function hidePrivateKeyModal() {
        if (privateKeyModal) {
            // Animate the modal disappearance
            gsap.to(privateKeyModal.querySelector('.private-key-content'), {
                opacity: 0,
                scale: 0.9,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    privateKeyModal.classList.remove('show');
                }
            });
        }
    }
    
    /**
     * Handle private key setup
     */
    async function handlePrivateKeySetup(event) {
        event.preventDefault();
        
        const masterPassword = masterPasswordInput.value.trim();
        const walletName = walletNameInput.value.trim();
        const privateKey = privateKeyInput.value.trim();
        
        // Validate inputs
        if (!masterPassword) {
            showMessage(i18n ? i18n.t('wallet.enterMasterPassword') : 'Please enter a master password', 'error');
            return;
        }
        
        if (masterPassword.length < 6) {
            showMessage(i18n ? i18n.t('wallet.passwordTooShort') : 'Password must be at least 6 characters', 'error');
            return;
        }
        
        if (!walletName) {
            showMessage(i18n ? i18n.t('wallet.enterWalletName') : 'Please enter a wallet name', 'error');
            return;
        }
        
        if (!privateKey) {
            showMessage(i18n ? i18n.t('wallet.enterPrivateKey') : 'Please enter your private key', 'error');
            return;
        }
        
        // Validate private key format
        if (!window.SecureWalletManager || !window.SecureWalletManager.validatePrivateKey(privateKey)) {
            showMessage(i18n ? i18n.t('wallet.invalidPrivateKey') : 'Invalid private key format. Must be 64 hex characters.', 'error');
            return;
        }
        
        try {
            // Disable submit button
            setupPrivateKey.disabled = true;
            setupPrivateKey.textContent = i18n ? i18n.t('wallet.setting') : 'Setting up...';
            
            // Authenticate with master password
            const authSuccess = await window.SecureWalletManager.authenticateUser(masterPassword);
            
            if (authSuccess) {
                // Add the private key
                const result = await window.SecureWalletManager.addPrivateKey(privateKey, walletName);
                
                if (result.success) {
                    showMessage(i18n ? i18n.t('wallet.setupSuccess') : 'Wallet setup successful!');
                    
                    // Update wallet status
                    isWalletConnected = true;
                    currentAddress = window.SecureWalletManager.getAddress();
                    updateWalletUI(true, currentAddress);
                    
                    // Hide modal and clear form
                    hidePrivateKeyModal();
                    clearPrivateKeyForm();
                    
                    // Set cooldown
                    lastWalletChoiceTime = Date.now();
                } else {
                    showMessage(i18n ? i18n.t('wallet.setupFailed') : 'Wallet setup failed: ' + result.error, 'error');
                }
            } else {
                showMessage(i18n ? i18n.t('wallet.authFailed') : 'Authentication failed', 'error');
            }
        } catch (error) {
            console.error('Error setting up private key wallet:', error);
            showMessage(i18n ? i18n.t('wallet.setupError') : 'Error setting up wallet', 'error');
        } finally {
            // Re-enable submit button
            setupPrivateKey.disabled = false;
            setupPrivateKey.textContent = i18n ? i18n.t('wallet.setup') : 'Setup Wallet';
        }
    }
    
    /**
     * Clear private key form
     */
    function clearPrivateKeyForm() {
        if (masterPasswordInput) masterPasswordInput.value = '';
        if (walletNameInput) walletNameInput.value = '';
        if (privateKeyInput) privateKeyInput.value = '';
    }
    
    /**
     * Show message
     */
    function showMessage(message, type = 'success') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast ${type}`;
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        messageEl.style.color = 'white';
        messageEl.style.padding = '12px 20px';
        messageEl.style.borderRadius = '8px';
        messageEl.style.zIndex = '3000';
        messageEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        messageEl.style.fontSize = '0.9rem';
        messageEl.style.fontWeight = '500';
        messageEl.style.maxWidth = '300px';
        messageEl.style.wordWrap = 'break-word';
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Animate in
        gsap.fromTo(messageEl, 
            { opacity: 0, x: 50 },
            { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        );
        
        // Remove after 4 seconds
        setTimeout(() => {
            gsap.to(messageEl, {
                opacity: 0,
                x: 50,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    if (document.body.contains(messageEl)) {
                        document.body.removeChild(messageEl);
                    }
                }
            });
        }, 4000);
    }
}); 