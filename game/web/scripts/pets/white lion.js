// WhiteLionManager class to handle all white lion-related functionality
class WhiteLionManager {
    constructor() {
        // Configuration settings
        this.config = {
            // Animation paths - using relative paths
            animations: {
                left: '../../resources/actions/White lion/left.png',
                leftAtlas: '../../resources/actions/White lion/left.atlas'
            },
            // Animation settings
            animationSettings: {
                frameDuration: 30,      // Duration of each frame in milliseconds
                loopDelay: 0,           // Delay between animation loops in milliseconds
                totalFrames: 30,        // total frames (0-28)
                walkingFrames: {         // walking animation frame range
                    start: 0,            // walking animation start frame
                    end: 29             // walking animation end frame
                },
                idleFrames: {            // idle animation frame range
                    start: 0,            // idle animation start frame
                    end: 0               // idle animation end frame (use the first frame as the idle frame)
                }
            },
            // Movement settings
            movement: {
                enabled: true,           // Whether to enable movement functionality
                minSpeed: 0.3,           // Minimum movement speed
                maxSpeed: 0.8           // Maximum movement speed
            },
            // Shadow settings
            shadow: {
                enabled: true,           // Whether to enable shadow
                applyToExisting: true    // Whether to apply to existing white lions
            }
        };

        // Atlas data parsed from the atlas file
        this.atlasData = null;
        
        // References to loaded animations
        this.loadedAnimations = {};
        
        // Track animated white lions
        this.animatedWhiteLions = new Map();
        
        // Track processed NFT IDs to prevent duplicate rendering
        this.processedNftIds = new Set();
        
        // Flag to track if the animation system has been initialized
        this.initialized = false;
        
        // Debug mode
        this.debug = false;
        
        // rotation test configuration
        this.rotationTestConfig = {
            enabled: false,                 // disable rotation test, use the final determined configuration
            currentTest: 0,                // index of the current test configuration
            timePerTest: 2000,             // time for each test configuration (milliseconds)
            lastChangeTime: 0,             // timestamp of the last configuration change
            // test configurations to be tested
            testConfigurations: [
                { rotationDirection: 1, rotationFlipX: false, rotationFlipY: false, description: "clockwise, no flip" },
                { rotationDirection: 1, rotationFlipX: true, rotationFlipY: false, description: "clockwise, horizontal flip" },
                { rotationDirection: 1, rotationFlipX: false, rotationFlipY: true, description: "clockwise, vertical flip" },
                { rotationDirection: 1, rotationFlipX: true, rotationFlipY: true, description: "clockwise, double axis flip" },
                { rotationDirection: -1, rotationFlipX: false, rotationFlipY: false, description: "counterclockwise, no flip" },
                { rotationDirection: -1, rotationFlipX: true, rotationFlipY: false, description: "counterclockwise, horizontal flip" },
                { rotationDirection: -1, rotationFlipX: false, rotationFlipY: true, description: "counterclockwise, vertical flip" },
                { rotationDirection: -1, rotationFlipX: true, rotationFlipY: true, description: "counterclockwise, double axis flip" },
            ]
        };
    }

    /**
     * Initialize the White Lion Manager
     */
    async init() {
        if (this.initialized) return;
        
        this.log('[WhiteLionManager] Initializing white lion animation system...');
        
        // Load and parse the atlas file
        try {
            await this.loadAtlasData();
        } catch (error) {
            this.error('[WhiteLionManager] Failed to load atlas data:', error);
        }
        
        // Listen for NFT loaded events to detect white lions
        this.setupEventListeners();
        
        // Preload animations if possible
        this.preloadAnimations();
        
        this.setupDirectionChangeListener();
        
        this.initialized = true;
        
        // Clear processed NFT list to ensure all NFTs are rechecked after initialization
        this.processedNftIds.clear();
        
        // Check for white lions immediately if we're on the main page
        if (window.location.href.includes('home.html')) {
            // Short delay to ensure DOM is fully loaded
            setTimeout(() => this.checkForWhiteLions(), 1000);
        }
        
        // Setup periodic white lion checking on main page
        this.setupPeriodicWhiteLionCheck();
        
        // Initialize shadow system
        this.initShadowSystem();
    }
    
    /**
     * Debug logging helper
     */
    log(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }
    
    /**
     * Error logging helper
     */
    error(...args) {
        console.error(...args);
    }

    /**
     * Initialize shadow system, ensuring integration with PetShadowManager
     */
    initShadowSystem() {
        if (!this.config.shadow.enabled) return;
        
        this.log('[WhiteLionManager] Initializing shadow system...');
        
        // Check if PetShadowManager is available
        if (window.PetShadowManager) {
            this.log('[WhiteLionManager] PetShadowManager found, will use for white lion shadows');
            
            if (this.config.shadow.applyToExisting) {
                setTimeout(() => {
                    this.applyAllWhiteLionShadows();
                }, 1500);
            }
            
            document.addEventListener('white-lion-moving-state-changed', (event) => {
                if (event.detail && event.detail.element) {
                    const whiteLionElement = event.detail.element;
                    
                    // Update shadow state
                    if (window.PetShadowManager && window.PetShadowManager.updateShadow) {
                        window.PetShadowManager.updateShadow(whiteLionElement);
                    }
                }
            });
        } else {
            this.log('[WhiteLionManager] PetShadowManager not available, shadows will not be applied');
        }
    }
    
    applyAllWhiteLionShadows() {
        if (!window.PetShadowManager) return;
        
        this.log('[WhiteLionManager] Applying shadows to all white lions...');
        
        const whiteLionElements = document.querySelectorAll('.white-lion-nft');
        let count = 0;
        
        whiteLionElements.forEach(whiteLionElement => {
            // Add shadow
            window.PetShadowManager.addShadow(whiteLionElement, {
                ratio: 0.8,  // Shadow width relative to white lion
                jumpEffect: true  // Enable jumping effect
            });
            count++;
        });
        
        this.log(`[WhiteLionManager] Applied shadows to ${count} white lions`);
    }
    
    /**
     * Load and parse the atlas file
     */
    async loadAtlasData() {
        
        try {
            // Get full path
            const atlasPath = this.getAbsoluteResourcePath(this.config.animations.leftAtlas);
            this.log(`[WhiteLionManager] Atlas path: ${atlasPath}`);
            
            // Fetch the atlas file
            const response = await fetch(atlasPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load atlas file: ${response.statusText}`);
            }
            
            const atlasText = await response.text();
            
            // parse atlas data using SpriteAtlasHelper
            this.atlasData = window.SpriteAtlasHelper.parseAtlas(atlasText);
            this.log('[WhiteLionManager] Atlas data parsed using SpriteAtlasHelper');
            
            // get all image files to load
            const imageFiles = this.atlasData.meta.images.map(img => img.file);
            this.log(`[WhiteLionManager] Atlas references ${imageFiles.length} image files:`, imageFiles);
            
            // preload all images
            const basePath = this.getAbsoluteResourcePathDir(this.config.animations.left);
            await this.preloadAllAnimations(basePath, imageFiles);
            
            this.log('[WhiteLionManager] Atlas data and all images loaded successfully');
        } catch (error) {
            this.error('[WhiteLionManager] Error loading atlas file:', error);
            // Create a simple fallback atlas data if loading fails
            this.createFallbackAtlasData();
        }
    }
    
    /**
     * Get absolute resource path
     */
    getAbsoluteResourcePath(relativePath) {
        // Remove relative path prefix
        const cleanPath = relativePath.replace(/^\.\.\//, '');
        
        // Build full path based on current page
        let baseUrl = window.location.href;
        
        // Remove filename part from current URL
        baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        
        // Navigate up to root directory
        const segments = baseUrl.split('/');
        // Remove last two segments (usually the page and its directory)
        segments.splice(-2, 2);
        
        // Construct new URL
        return segments.join('/') + '/' + cleanPath;
    }

    /**
     * Get absolute directory path for a resource
     */
    getAbsoluteResourcePathDir(relativePath) {
        // Remove the filename part from the path
        const pathWithoutFile = relativePath.substring(0, relativePath.lastIndexOf('/') + 1);
        // Convert to absolute path
        return this.getAbsoluteResourcePath(pathWithoutFile);
    }
    
    /**
     * Preload all animations referenced in the atlas
     * @param {string} basePath - Base path for images
     * @param {Array} imageFiles - Array of image filenames
     */
    async preloadAllAnimations(basePath, imageFiles) {
        try {
            // load all images using SpriteAtlasHelper
            this.loadedAnimations = await window.SpriteAtlasHelper.loadImages(basePath, imageFiles);
            this.log(`[WhiteLionManager] Successfully loaded ${Object.keys(this.loadedAnimations).length - 1} sprite sheets`);
        } catch (error) {
            this.error('[WhiteLionManager] Error preloading animations:', error);
            // Create a fallback animation if loading fails
            this.loadedAnimations = { default: new Image() };
        }
    }
    
    /**
     * Preload animations for performance
     * This is a simplified version that gets called automatically, but the main loading
     * is now done in preloadAllAnimations
     */
    preloadAnimations() {
        if (!this.config.animations.left) return;
        
        // If animations aren't already loaded, load just the main one
        if (!this.loadedAnimations || Object.keys(this.loadedAnimations).length === 0) {
            // Preload the left animation
            const leftImg = new Image();
            leftImg.onload = () => {
                this.log(`[WhiteLionManager] Main image preloaded successfully`);
                this.loadedAnimations = { default: leftImg, 0: leftImg };
            };
            leftImg.onerror = (err) => {
                this.error(`[WhiteLionManager] Error preloading main image:`, err);
            };
            
            // Get full path
            const imagePath = this.getAbsoluteResourcePath(this.config.animations.left);
            this.log(`[WhiteLionManager] Main image path: ${imagePath}`);
            leftImg.src = imagePath;
        }
    }
    

    setupEventListeners() {
        // Listen for custom NFT loaded events if they exist
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('nftLoaded', this.handleNFTLoadedEvent.bind(this));
            window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
        
        if (window.location.href.includes('home.html')) {
            this.observeNFTContainer();
        }
    }
    

    setupPeriodicWhiteLionCheck() {
        if (window.location.href.includes('home.html')) {
            setInterval(() => {
                this.checkForWhiteLions(false); // Pass false to indicate not to auto-apply shadows
            }, 10000);
        }
    }
    
    /**
     * Handle visibility change events to pause/resume animations
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Page is hidden, pause all animations
            this.pauseAllAnimations();
        } else if (document.visibilityState === 'visible') {
            // Page is visible again, resume animations
            this.resumeAllAnimations();
        }
    }
    
    /**
     * Observe the NFT container for new white lions
     */
    observeNFTContainer() {
        // Find the farm animals container
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) return;
        
        // Create a mutation observer to watch for new NFTs
        const observer = new MutationObserver((mutations) => {
            let shouldCheckWhiteLions = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheckWhiteLions = true;
                }
            });
            
            if (shouldCheckWhiteLions) {
                this.checkForWhiteLions();
            }
        });
        
        // Start observing the container for changes
        observer.observe(farmContainer, { childList: true, subtree: true });
        
        this.log('[WhiteLionManager] Now monitoring farm container for new NFTs');
    }
    
    /**
     * Parse an atlas file text into usable data
     * This method is retained just for fallback atlas creation - not used for actual parsing
     */
    parseAtlas(atlasText) {
        if (window.SpriteAtlasHelper) {
            return window.SpriteAtlasHelper.parseAtlas(atlasText);
        }
        
        // simple structure, only used for ensuring fallback data structure is correct
        return {
            meta: {
                image: 'left.png',
                size: { w: 1000, h: 1000 }
            },
            frames: {}
        };
    }
    
    /**
     * Create a fallback atlas data if loading fails
     */
    createFallbackAtlasData() {
        this.log('[WhiteLionManager] Creating fallback atlas data');
        
        // create frames data based on the actual size in left.atlas file
        const frames = {};
        
        for (let i = 0; i < this.config.animationSettings.totalFrames; i++) {
            // Format number with padding
            const paddedNum = i.toString().padStart(2, '0');
            const frameName = `skeleton-left_${paddedNum}`;
            
            // use the typical size in left.atlas file
            frames[frameName] = {
                x: (i % 4) * 329,
                y: Math.floor(i / 4) * 387,
                width: 329,
                height: 387,
                offsetX: 229,
                offsetY: 213,
                originalWidth: 810,
                originalHeight: 798
            };
        }
        
        this.atlasData = {
            meta: {
                image: 'left.png',
                size: { w: 1988, h: 1893 }  // use the actual size in left.atlas file
            },
            frames: frames
        };
    }

    /**
     * Handle NFT loaded events
     * @param {Event} event - The NFT loaded event
     */
    handleNFTLoadedEvent(event) {
        if (!event.detail || !event.detail.element) return;
        
        const nftElement = event.detail.element;
        const nftData = event.detail.data;
        
        // Check if element is connected to DOM
        if (!nftElement.isConnected) {
            this.log(`[WhiteLionManager] NFT element not connected to DOM, skipping processing`);
            return;
        }
        
        // Get NFT ID
        const nftId = nftData.tokenId || nftElement.dataset.id || 'unknown-nft';
        
        // If this NFT has already been processed, skip
        if (this.processedNftIds.has(nftId)) {
            this.log(`[WhiteLionManager] NFT already processed, skipping: ${nftId}`);
            return;
        }
        
        // If element already has animation, skip
        if (this.animatedWhiteLions.has(nftElement)) {
            this.log(`[WhiteLionManager] Element already animated, skipping: ${nftId}`);
            return;
        }
        
        // Check if this is a white lion
        if (this.isWhiteLionNFT(nftData)) {
            this.log('[WhiteLionManager] White lion NFT detected from event:', nftData.metadata?.name || nftData.name || nftId);
            
            // Mark this NFT as processed
            this.processedNftIds.add(nftId);
            
            // Apply animation
            this.applyWhiteLionAnimation(nftElement);
        }
    }
    
    /**
     * Check the page for white lion NFTs and apply animations
     * @param {boolean} applyShadows - Whether to apply shadows, default is true
     */
    checkForWhiteLions(applyShadows = true) {
        this.log('[WhiteLionManager] Checking for white lions on the page...');
        
        // Find all NFT elements in the farm
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) {
            this.error('[WhiteLionManager] Farm container not found');
            return;
        }
        
        // Find all animal elements
        const animalElements = farmContainer.querySelectorAll('.animal');
        this.log(`[WhiteLionManager] Found ${animalElements.length} animal elements`);
        
        // Create set of all NFT IDs currently on the page, for cleaning up animations later
        const currentNftIds = new Set();
        
        // First clean up orphaned shadows
        if (window.PetShadowManager && window.PetShadowManager.cleanupOrphanedShadows) {
            window.PetShadowManager.cleanupOrphanedShadows();
        }
        
        animalElements.forEach((animalElement, index) => {
            // Get NFT ID or generate a unique ID
            const nftId = animalElement.dataset.id || animalElement.dataset.contractAddress || `unknown-nft-${index}`;
            
            // Add ID to current NFT set
            currentNftIds.add(nftId);
            
            // If this NFT has already been processed, skip
            if (this.processedNftIds.has(nftId)) {
                this.log(`[WhiteLionManager] NFT already processed, skipping: ${nftId}`);
                return;
            }
            
            // Skip elements that are already animated
            if (this.animatedWhiteLions.has(animalElement)) {
                this.log(`[WhiteLionManager] Element already animated, skipping: ${nftId}`);
                return;
            }
            
            // Check if this is a white lion
            if (this.isWhiteLionNFTElement(animalElement)) {
                this.log(`[WhiteLionManager] Found white lion NFT #${index} (ID: ${nftId}):`, animalElement.dataset.name);
                
                // Mark this NFT as processed
                this.processedNftIds.add(nftId);
                
                // Apply animation
                this.applyWhiteLionAnimation(animalElement);
            }
        });
        
        // Clean up animations for NFTs that no longer exist
        this.cleanupNonExistentAnimations(currentNftIds);
    }
    
    isWhiteLionNFTElement(element) {
        // Check if the element has dataset
        if (!element.dataset) return false;
        
        // Check for white lion name, type, or class
        const name = element.dataset.name || '';
        const type = element.dataset.type || '';
        
        const hasWhiteLionName = name.toLowerCase().includes('white lion');
        const hasWhiteLionType = type.toLowerCase() === 'white lion';
        const hasWhiteLionClass = element.classList.contains('white-lion-nft') || element.classList.contains('white lion');
        
        return hasWhiteLionName || hasWhiteLionType || hasWhiteLionClass;
    }
    
    isWhiteLionNFT(nftData) {
        if (!nftData) return false;
        
        // Check metadata name
        if (nftData.metadata && nftData.metadata.name) {
            return nftData.metadata.name.toLowerCase().includes('white lion');
        }
        
        // Check direct name property
        if (nftData.name) {
            return nftData.name.toLowerCase().includes('white lion');
        }
        
        // Check any other properties that could identify a white lion
        if (nftData.type) {
            return nftData.type.toLowerCase() === 'white lion';
        }
        
        return false;
    }

    applyWhiteLionAnimation(element) {
        if (this.animatedWhiteLions.has(element)) return;
        
        this.log('[WhiteLionManager] Applying white lion animation to element:', element);
        
        // Check if element is visible and has dimensions
        if (!element.isConnected) {
            this.error('[WhiteLionManager] Element is not connected to DOM, cannot animate:', element);
            return;
        }
        
        // Use PetSizeHelper for intelligent size checking and animation application
        if (window.PetSizeHelper) {
            window.PetSizeHelper.applyAnimationWithSizeCheck(
                element,
                'white lion',
                (el) => this.doApplyWhiteLionAnimation(el),
                {
                    maxWaitAttempts: 8,
                    fallbackSize: { width: '60px', height: '60px' }
                }
            );
        } else {
            // Fallback to original logic if PetSizeHelper is not available
            this.log('[WhiteLionManager] PetSizeHelper not available, using fallback logic');
            
            // Check element dimensions, delay processing if zero
            if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                this.log('[WhiteLionManager] Element has zero dimensions, delaying animation:', element);
                
                // Use setTimeout to delay applying animation, wait for element to render
                setTimeout(() => {
                    // Recheck dimensions
                    if (element.isConnected && element.offsetWidth > 0 && element.offsetHeight > 0) {
                        this.log('[WhiteLionManager] Element now has dimensions, applying animation');
                        this.doApplyWhiteLionAnimation(element);
                    } else {
                        this.error('[WhiteLionManager] Element still has zero dimensions after delay, applying PetSizeManager or default size');
                        
                        // First try to apply PetSizeManager if available
                        if (window.PetSizeManager) {
                            const petType = window.PetSizeManager.detectPetType(element);
                            window.PetSizeManager.setSize(element, petType);
                            this.log('[WhiteLionManager] Applied PetSizeManager sizing');
                        }
                        
                        // Check if PetSizeManager worked
                        if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                            // Fallback to minimum size
                            element.style.setProperty('width', '60px', 'important');
                            element.style.setProperty('height', '60px', 'important');
                            this.log('[WhiteLionManager] Applied fallback size as last resort');
                        }
                        
                        // Try to apply animation
                        this.doApplyWhiteLionAnimation(element);
                    }
                }, 500); // Delay 500ms
                
                return;
            }
            
            // If dimensions are normal, apply animation directly
            this.doApplyWhiteLionAnimation(element);
        }
    }
    
    /**
     * Actual method to apply white lion animation (separated to support delayed processing)
     * @param {HTMLElement} element - The NFT element to animate
     */
    doApplyWhiteLionAnimation(element) {
        let initialFacingDirection;
        
        if (element.classList.contains('facing-right')) {
            initialFacingDirection = 'right';
        } else if (element.classList.contains('facing-left')) {
            initialFacingDirection = 'left';
        } else {
            initialFacingDirection = Math.random() > 0.5 ? 'right' : 'left';
        }
        
        const isFlipped = initialFacingDirection === 'right';
        
        if (initialFacingDirection === 'right') {
            element.classList.add('facing-right');
            element.classList.remove('facing-left');
        } else {
            element.classList.add('facing-left');
            element.classList.remove('facing-right');
        }
        
        element.classList.add('white-lion-nft');
        
        this.animatedWhiteLions.set(element, {
            element,
            isFlipped,
            animationInterval: null,
            currentFrame: 0,
            hasShadow: false  // Shadow tracking flag
        });
        
        // create animation container
        const success = this.prepareElementForAnimation(element, isFlipped);
        
        if (!success) {
            this.error('[WhiteLionManager] Failed to prepare element for animation');
            return;
        }
        
        // start animation
        this.startWhiteLionAnimation(element, isFlipped);
        
        // apply shadow - ensure shadow is applied before setting movement
        if (this.config.shadow.enabled) {
            this.applyWhiteLionShadow(element);
        }
        
        // if movement is supported and PetMovementManager is available, enable movement
        if (this.config.movement.enabled && window.PetMovementManager) {
            this.enableMovement(element);
        }
        
        // immediately sync current direction state
        this.updateWhiteLionDirection(element, isFlipped);
        
        this.log(`[WhiteLionManager] White lion animation applied for: ${element.dataset.name || 'unnamed white lion'}`);
    }
    
    applyWhiteLionShadow(element) {
        if (!this.config.shadow.enabled || !window.PetShadowManager) return;
        
        // If already in tracking map, check if already has shadow
        const whiteLionData = this.animatedWhiteLions.get(element);
        if (whiteLionData && whiteLionData.hasShadow) {
            this.log('[WhiteLionManager] White lion already has shadow, skipping:', element.dataset.name || element.dataset.id || 'unnamed');
            return;
        }
        
        // Add white lion-nft class to support shadow selector
        element.classList.add('white-lion-nft');
        
        // Ensure any existing shadows are removed
        if (window.PetShadowManager.removeShadow) {
            window.PetShadowManager.removeShadow(element);
        }
        
        // Remove all existing shadow elements to ensure no residual
        const existingShadows = element.querySelectorAll('.pet-shadow');
        existingShadows.forEach(shadow => shadow.parentNode.removeChild(shadow));
        
        // Add a custom attribute to mark it as having an "official" shadow
        element.setAttribute('data-has-shadow', 'true');
        
        // Determine facing direction
        const isFacingRight = element.classList.contains('facing-right');
        
        // Use PetShadowManager to add shadow
        const shadowElement = window.PetShadowManager.addShadow(element, {
            ratio: 0.8,                     // Shadow width relative to white lion
            jumpEffect: true,               // Enable jump effect
            opacity: 0.6,                   // Set higher opacity
            display: true                   // Ensure always displayed
        });
        
        // Set shadow direction attribute
        if (shadowElement) {
            shadowElement.setAttribute('data-direction', isFacingRight ? 'right' : 'left');
        }
        
        // Update tracking data
        if (whiteLionData) {
            whiteLionData.hasShadow = true;
            this.animatedWhiteLions.set(element, whiteLionData);
        }
        
        this.log('[WhiteLionManager] Applied shadow to white lion:', element.dataset.name || element.dataset.id || 'unnamed');
    }
    
    /**
     * Enable movement for white lions
     * @param {HTMLElement} element - White lion element
     */
    enableMovement(element) {
        if (!window.PetMovementManager) {
            this.log('[WhiteLionManager] PetMovementManager not available, cannot enable movement');
            return;
        }
        
        // Generate random movement speed
        const speed = this.config.movement.minSpeed + 
                     Math.random() * (this.config.movement.maxSpeed - this.config.movement.minSpeed);
        
        // Get farm container
        const farmContainer = document.getElementById('farm-animals-container');
        if (farmContainer) {
            // Convert percentage position to pixels (important: resolves shadow positioning issue)
            this.convertPositionToPixels(element, farmContainer);
        }
        
        let lastX = parseFloat(element.style.left) || 0;
        
        const positionObserver = setInterval(() => {
            const currentX = parseFloat(element.style.left) || 0;
            const deltaX = currentX - lastX;
            
            if (Math.abs(deltaX) > 0.5) {
                const isMovingRight = deltaX > 0;
                this.updateWhiteLionDirection(element, isMovingRight);
                lastX = currentX;
            }
        }, 100); 
        
        const whiteLionData = this.animatedWhiteLions.get(element) || {};
        whiteLionData.positionObserver = positionObserver;
        this.animatedWhiteLions.set(element, whiteLionData);
        
        // Use PetMovementManager to enable movement
        window.PetMovementManager.enableMovement(element, {
            speed: speed,
            onStateChange: (isMoving) => {
                const event = new CustomEvent('pet-moving-state-changed', {
                    detail: {
                        element: element,
                        isMoving: isMoving
                    },
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
                
                const whiteLionEvent = new CustomEvent('white-lion-moving-state-changed', {
                    detail: {
                        element: element,
                        isMoving: isMoving
                    },
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(whiteLionEvent);
                
                // Add or remove movement class to trigger appropriate animation state
                if (isMoving) {
                    element.classList.add('white-lion-moving');
                    element.classList.add('pet-moving');  // Also add generic moving class
                } else {
                    element.classList.remove('white-lion-moving');
                    element.classList.remove('pet-moving');  // Also remove generic moving class
                }
            }
        });
        
        const directionHandler = (event) => {
            if (event.detail && event.detail.element === element) {
                const isRight = event.detail.direction === 'right';
                this.updateWhiteLionDirection(element, isRight);
            }
        };
        
        // add event listener
        document.addEventListener('pet-direction-changed', directionHandler);
        
        // save event handler for cleanup
        element.directionChangeHandler = directionHandler;
        
        this.log(`[WhiteLionManager] Enabled movement for white lion: ${element.dataset.name || 'unnamed'} with speed ${speed.toFixed(2)}`);
    }
    
    /**
     * Convert element's percentage position to pixels
     * @param {HTMLElement} element - Element to convert position for
     * @param {HTMLElement} container - Container element
     */
    convertPositionToPixels(element, container) {
        if (!element || !container) return;
        
        // Get current position style
        let leftStyle = element.style.left;
        let topStyle = element.style.top;
        
        // Convert left position
        if (leftStyle && leftStyle.includes('%')) {
            const containerWidth = container.offsetWidth;
            const percentLeft = parseFloat(leftStyle);
            const pixelLeft = (percentLeft / 100) * containerWidth;
            element.style.left = `${pixelLeft}px`;
        }
        
        // Convert top position
        if (topStyle && topStyle.includes('%')) {
            const containerHeight = container.offsetHeight;
            const percentTop = parseFloat(topStyle);
            const pixelTop = (percentTop / 100) * containerHeight;
            element.style.top = `${pixelTop}px`;
        }
    }
    
    /**
     * Prepare an element for animation
     * @param {HTMLElement} element - The element to prepare
     * @param {boolean} isFlipped - Whether to flip the animation horizontally
     * @returns {boolean} - Success status
     */
    prepareElementForAnimation(element, isFlipped) {
        // Check if element is connected to DOM
        if (!element || !element.isConnected) {
            this.error('[WhiteLionManager] Cannot prepare element - element is not connected to DOM');
            return false;
        }
        // Check element dimensions using multiple methods
        const offsetWidth = element.offsetWidth;
        const offsetHeight = element.offsetHeight;
        const computedStyle = window.getComputedStyle(element);
        const cssWidth = parseFloat(computedStyle.width) || 0;
        const cssHeight = parseFloat(computedStyle.height) || 0;
        
        this.log(`[White LionManager] Element dimension check: offset(${offsetWidth}x${offsetHeight}), css(${cssWidth}x${cssHeight})`);
        
        // Use CSS dimensions if offset dimensions are zero but CSS dimensions exist
        let effectiveWidth = offsetWidth || cssWidth;
        let effectiveHeight = offsetHeight || cssHeight;
        
        // Apply size using PetSizeManager first if available
        if (window.PetSizeManager) {
            window.PetSizeManager.setSize(element, 'white lion');
            this.log('[White LionManager] Applied size using PetSizeManager');
            
            // Re-check dimensions after PetSizeManager
            effectiveWidth = element.offsetWidth || parseInt(element.style.width) || 0;
            effectiveHeight = element.offsetHeight || parseInt(element.style.height) || 0;
        }
        
        if (effectiveWidth === 0 || effectiveHeight === 0) {
            this.error('[White LionManager] Element still has zero effective dimensions after PetSizeManager, applying fallback size');
            // Force set minimum size with important flag as last resort
            element.style.setProperty('width', '50px', 'important');
            element.style.setProperty('height', '50px', 'important');
            element.style.setProperty('min-width', '50px', 'important');
            element.style.setProperty('min-height', '50px', 'important');
            effectiveWidth = 50;
            effectiveHeight = 50;
        }
        
        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'visible';
        element.style.backgroundColor = 'transparent';
        
        try {
            // Remove any existing animation container to prevent duplication
            const oldContainer = element.querySelector('.white-lion-animation-container');
            if (oldContainer) {
                element.removeChild(oldContainer);
            }
            
            // If there's an existing img inside, make it transparent during animation
            const existingImg = element.querySelector('img');
            if (existingImg) {
                existingImg.style.opacity = '0';  // Hide the original image completely
            }
            
            // Create animation container
            const animContainer = document.createElement('div');
            animContainer.className = 'white-lion-animation-container';
            animContainer.style.position = 'absolute';
            animContainer.style.top = '0';
            animContainer.style.left = '0';
            animContainer.style.width = '100%';
            animContainer.style.height = '100%';
            animContainer.style.pointerEvents = 'none'; // Don't interfere with clicks
            animContainer.style.zIndex = '10'; // Show above the white lion image
            animContainer.style.backgroundColor = 'transparent';
            animContainer.style.overflow = 'visible';
            animContainer.style.transformOrigin = 'center center';
            
            // Apply flip transformation based on initial facing direction and current facing classes
            const isFacingRight = element.classList.contains('facing-right');
            const shouldFlip = isFacingRight || isFlipped;
            
            if (shouldFlip) {
                this.log('[WhiteLionManager] Setting initial animation direction: right (flipped)');
                animContainer.style.transform = 'scaleX(-1)'; // Horizontal flip
                
                // Also make sure the element has the right class
                element.classList.add('facing-right');
                element.classList.remove('facing-left');
            } else {
                this.log('[WhiteLionManager] Setting initial animation direction: left (normal)');
                animContainer.style.transform = 'scaleX(1)'; // Normal (no flip)
                
                // Also make sure the element has the right class
                element.classList.add('facing-left');
                element.classList.remove('facing-right');
            }
            
            animContainer.dataset.facing = shouldFlip ? 'right' : 'left';
            
            // Add container to the element
            element.appendChild(animContainer);
            
            // Get element's actual dimensions
            const elementWidth = element.offsetWidth || 50;
            const elementHeight = element.offsetHeight || 50;
            
            this.log(`[WhiteLionManager] Element dimensions: ${elementWidth}x${elementHeight}`); 
            
            // Create canvas for sprite animation
            const canvas = document.createElement('canvas');
            canvas.className = 'white-lion-animation-canvas';
            
            // Calculate optimal canvas size based on element dimensions
            // Using a slightly larger canvas improves image quality and allows for full display
            const canvasScaleFactor = 1.2; // Slightly larger to avoid clipping
            
            // Apply canvas size
            if (window.PetSizeManager) {
                canvas.width = Math.floor(elementWidth * canvasScaleFactor);
                canvas.height = Math.floor(elementHeight * canvasScaleFactor);
                
                // Set CSS size to 100% to properly fit container
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '50%';
                canvas.style.left = '50%';
                canvas.style.transform = 'translate(-50%, -50%)';
                canvas.style.overflow = 'visible';
                canvas.style.objectFit = 'contain';
            } else {
                // as a fallback
                canvas.width = Math.floor(elementWidth * canvasScaleFactor);
                canvas.height = Math.floor(elementHeight * canvasScaleFactor);
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '50%';
                canvas.style.left = '50%';
                canvas.style.transform = 'translate(-50%, -50%)';
            }
            
            // Ensure canvas background is transparent
            canvas.style.backgroundColor = 'transparent';
            
            // Add canvas to the animation container
            animContainer.appendChild(canvas);
            
            return true;
        } catch (error) {
            this.error('[WhiteLionManager] Error preparing element for animation:', error);
            return false;
        }
    }
    
    /**
     * Start the white lion animation
     * @param {HTMLElement} element - The element to animate
     * @param {boolean} isFlipped - Whether the animation is flipped
     */
    startWhiteLionAnimation(element, isFlipped) {
        // Check element
        if (!element || !element.isConnected) {
            this.error('[WhiteLionManager] Cannot start animation - element is not connected to DOM');
            return;
        }
        
        try {
            // Get animation container
            const animContainer = element.querySelector('.white-lion-animation-container');
            if (!animContainer) {
                this.error('[WhiteLionManager] Animation container not found');
                return;
            }
            
            // Get the canvas
            const canvas = animContainer.querySelector('.white-lion-animation-canvas');
            if (!canvas) {
                this.error('[WhiteLionManager] Canvas not found');
                return;
            }
            
            const whiteLionData = this.animatedWhiteLions.get(element);
            if (!whiteLionData) {
                this.error('[WhiteLionManager] White lion data not found');
                return;
            }
            
            // Wait until the atlas data is loaded
            if (!this.atlasData) {
                this.log('[WhiteLionManager] Atlas data not loaded yet, creating fallback');
                this.createFallbackAtlasData();
            }
            
            // Start the sprite sheet animation
            this.startSpriteAnimation(element, canvas, isFlipped);
        } catch (error) {
            this.error('[WhiteLionManager] Error starting white lion animation:', error);
        }
    }
    
    /**
     * Start sprite sheet animation using canvas
     * @param {HTMLElement} element - The parent element
     * @param {HTMLCanvasElement} canvas - The canvas element for drawing
     * @param {boolean} isFlipped - Whether animation is flipped
     */
    startSpriteAnimation(element, canvas, isFlipped) {
        try {
            // Get white lion data from tracking map
            const whiteLionData = this.animatedWhiteLions.get(element);
            if (!whiteLionData) return;
            
            // Get the canvas context
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                this.error('[WhiteLionManager] Failed to get canvas context');
                return;
            }
            
            // check if sprite sheets are loaded
            if (!this.loadedAnimations || Object.keys(this.loadedAnimations).length === 0) {
                this.log('[WhiteLionManager] Sprite sheets not yet loaded, trying to load now...');
                
                // try to load main image from the path in config
                const leftImgPath = this.getAbsoluteResourcePath(this.config.animations.left);
                const img = new Image();
                img.onload = () => {
                    this.log('[WhiteLionManager] Main image loaded for animation');
                    this.loadedAnimations = { default: img, 0: img };
                    // initialize animation after image is loaded
                    this.initializeAnimation(element, canvas, ctx, isFlipped);
                };
                img.onerror = (err) => {
                    this.error('[WhiteLionManager] Failed to load image for animation:', err);
                };
                img.src = leftImgPath;
                return;
            }
            
            // initialize animation using loaded sprite sheets
            this.initializeAnimation(element, canvas, ctx, isFlipped);
        } catch (error) {
            this.error('[WhiteLionManager] Error in startSpriteAnimation:', error);
        }
    }
    
    /**
     * Initialize animation sequence
     */
    initializeAnimation(element, canvas, ctx, isFlipped) {
        try {
            // Check if element is still connected to DOM
            if (!element || !element.isConnected) {
                this.error('[WhiteLionManager] Element no longer connected to DOM');
                return;
            }
            
            const whiteLionData = this.animatedWhiteLions.get(element);
            if (!whiteLionData) {
                this.error('[WhiteLionManager] White lion data not found in initializeAnimation');
                return;
            }
            
            // check if sprite sheets are loaded
            if (!this.loadedAnimations || Object.keys(this.loadedAnimations).length === 0) {
                this.error('[WhiteLionManager] Sprite sheets not loaded');
                return;
            }
            
            // at least one default image is required
            if (!this.loadedAnimations.default || !this.loadedAnimations.default.complete) {
                this.error('[WhiteLionManager] Default sprite sheet not loaded or incomplete');
                return;
            }
            
            // Clear any existing animation
            if (whiteLionData.animationInterval) {
                clearInterval(whiteLionData.animationInterval);
                whiteLionData.animationInterval = null;
            }
            
            // analyze element size, ensure good adaptability
            const elementRect = element.getBoundingClientRect();
            const elementWidth = elementRect.width || element.offsetWidth || 50;
            const elementHeight = elementRect.height || element.offsetHeight || 50;
            
            // if container size changes, update canvas size
            if (canvas.width !== elementWidth * 1.2 || canvas.height !== elementHeight * 1.2) {
                this.log(`[WhiteLionManager] Updating canvas size to match element: ${elementWidth}x${elementHeight}`);
                
                // use a slightly larger size to ensure full display
                canvas.width = Math.floor(elementWidth * 1.2);
                canvas.height = Math.floor(elementHeight * 1.2);
            }
            
            // initialize animation state - always start from the 0th frame
            const isMoving = element.classList.contains('pet-moving') || element.classList.contains('white-lion-moving');
            
            whiteLionData.currentFrame = 0;
            whiteLionData.animationState = isMoving ? 'walking' : 'idle';
            
            // immediately draw the first frame
            this.drawFrame(ctx, canvas, this.loadedAnimations, whiteLionData.currentFrame);
            
            // set animation interval
            const frameDuration = this.config.animationSettings.frameDuration;
            
            whiteLionData.animationInterval = setInterval(() => {
                // check if element is still connected to DOM
                if (!element.isConnected) {
                    if (whiteLionData.animationInterval) {
                        clearInterval(whiteLionData.animationInterval);
                        whiteLionData.animationInterval = null;
                    }
                    return;
                }
                
                // check if currently in moving state
                const isCurrentlyMoving = element.classList.contains('pet-moving') || 
                                          element.classList.contains('white-lion-moving');
                
                // update animation based on current state
                if (isCurrentlyMoving) {
                    // when in moving state, play the complete walking animation
                    if (whiteLionData.animationState !== 'walking') {
                        // state changed from idle to moving, reset to the 0th frame
                        whiteLionData.currentFrame = 0;
                        whiteLionData.animationState = 'walking';
                    } else {
                        // loop within the walking frame range
                        const {start, end} = this.config.animationSettings.walkingFrames;
                        whiteLionData.currentFrame++;
                        
                        // loop back to the start frame
                        if (whiteLionData.currentFrame > end) {
                            whiteLionData.currentFrame = start;
                        }
                    }
                } else {
                    // when not in moving state, only display idle frame
                    if (whiteLionData.animationState !== 'idle') {
                        whiteLionData.currentFrame = this.config.animationSettings.idleFrames.start;
                        whiteLionData.animationState = 'idle';
                    }
                    // idle state does not need to loop, stay on the same frame
                }
                
                // check if element size has changed before drawing the current frame
                const currentRect = element.getBoundingClientRect();
                const currentWidth = currentRect.width || element.offsetWidth;
                const currentHeight = currentRect.height || element.offsetHeight;
                
                // if element size changes by more than 10%, update canvas size
                if (Math.abs(currentWidth - elementWidth) > elementWidth * 0.1 ||
                    Math.abs(currentHeight - elementHeight) > elementHeight * 0.1) {
                    // update canvas size
                    canvas.width = Math.floor(currentWidth * 1.2);
                    canvas.height = Math.floor(currentHeight * 1.2);
                    this.log(`[WhiteLionManager] Element size changed, updated canvas: ${canvas.width}x${canvas.height}`);
                }
                
                // draw the current frame
                this.drawFrame(ctx, canvas, this.loadedAnimations, whiteLionData.currentFrame);
            }, frameDuration);
            
            // update animation data
            this.animatedWhiteLions.set(element, whiteLionData);
            
        } catch (error) {
            this.error('[WhiteLionManager] Error in initializeAnimation:', error);
        }
    }
    
    /**
     * get current rotation test configuration
     * @returns {Object} current rotation test configuration
     */
    getCurrentRotationTestConfig() {
        if (!this.rotationTestConfig.enabled) {
            // if test is not enabled, return default configuration
            return {
                rotationDirection: 1,
                rotationFlipX: false,
                rotationFlipY: false
            };
        }
        
        // check if need to switch to next test configuration
        const now = Date.now();
        if (now - this.rotationTestConfig.lastChangeTime > this.rotationTestConfig.timePerTest) {
            this.rotationTestConfig.currentTest = 
                (this.rotationTestConfig.currentTest + 1) % this.rotationTestConfig.testConfigurations.length;
            this.rotationTestConfig.lastChangeTime = now;
            
            // output current test configuration
            const currentConfig = this.rotationTestConfig.testConfigurations[this.rotationTestConfig.currentTest];
            console.log(`[WhiteLionManager] Test rotation configuration #${this.rotationTestConfig.currentTest}: ${currentConfig.description}`);
        }
        
        // return current test configuration
        return this.rotationTestConfig.testConfigurations[this.rotationTestConfig.currentTest];
    }

    /**
     * Draw a specific frame from the sprite sheet
     */
    drawFrame(ctx, canvas, spriteSheets, frameIndex) {
        // Completely clear canvas for transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Format the frame name
        const paddedIndex = frameIndex.toString().padStart(2, '0');
        const frameName = `skeleton-left_${paddedIndex}`;
        
        // Get frame data from atlas
        const frameData = this.atlasData.frames[frameName];
        
        if (!frameData) {
            this.error(`[WhiteLionManager] Frame data not found for: ${frameName}`);
            return;
        }
        
        try {
            // close debug mode, prepare for production
            const isDebugMode = false;
            
            // check if it is a rotated frame
            const isRotated = frameData.rotate === true;
            
            // check if this is a problem frame (frames 15, 23, 26, 27, 28 are marked as rotated)
            const isProblemFrame = [15, 23, 26, 27, 28].includes(frameIndex);
            
            // get size ratio from original frame data
            const frameWidth = isRotated ? frameData.height : frameData.width;
            const frameHeight = isRotated ? frameData.width : frameData.height;
            
            // basic rotation options - for normal frames
            let rotationOptions = {
                correctRotation: true,
                rotationDirection: 1,         // clockwise rotation
                rotationFlipX: false,         // default not horizontal flip
                rotationFlipY: false,         // default not vertical flip
                flipX: false,                 // not horizontal flip original frame
                flipY: false,                 // not vertical flip original frame
                scale: 1,                     // basic scale factor
                preserveAspectRatio: true,    // keep aspect ratio, prevent变形
                fitToContainer: true,         // ensure image fits completely into container
                alignment: 'center'           // center alignment
            };
            
            // special handling for rotated frames - ensure head is up
            if (isRotated) {
                // after testing, found this configuration can solve the head down problem
                rotationOptions = {
                    ...rotationOptions,
                    rotationDirection: -1,     // counterclockwise rotation
                    rotationFlipX: true,       // horizontal flip 
                    rotationFlipY: true        // vertical flip
                };
            }
            
            // draw frame - pass in the entire sprite sheet, let SpriteAtlasHelper choose the correct image
            window.SpriteAtlasHelper.drawFrame(ctx, canvas, spriteSheets, frameData, {
                ...rotationOptions,
                debug: isDebugMode  // disable debug mode
            });
        } catch (error) {
            this.error('[WhiteLionManager] Error drawing frame:', error);
        }
    }
    
    pauseAllAnimations() {
        this.animatedWhiteLions.forEach((whiteLionData, element) => {
            if (whiteLionData.animationInterval) {
                clearInterval(whiteLionData.animationInterval);
                whiteLionData.animationInterval = null;
            }
        });
    }
    
    resumeAllAnimations() {
        this.animatedWhiteLions.forEach((whiteLionData, element) => {
            if (!whiteLionData.animationInterval && element.isConnected) {
                // Restart animation
                const animContainer = element.querySelector('.white-lion-animation-container');
                if (animContainer) {
                    const canvas = animContainer.querySelector('.white-lion-animation-canvas');
                    if (canvas) {
                        this.startWhiteLionAnimation(element, whiteLionData.isFlipped);
                    }
                }
            }
        });
    }
    
    /**
     * Clean up animations for NFTs that no longer exist
     * @param {Set} currentNftIds - Set of all NFT IDs currently on the page
     */
    cleanupNonExistentAnimations(currentNftIds) {
        // Find elements that are no longer on the page but still have animations
        const elementsToRemove = [];
        
        this.animatedWhiteLions.forEach((whiteLionData, element) => {
            // Get element's NFT ID
            const nftId = element.dataset.id || element.dataset.contractAddress;
            
            // If element has been removed from page or ID not in current set
            if (!element.isConnected || (nftId && !currentNftIds.has(nftId))) {
                elementsToRemove.push(element);
            }
        });
        
        // Clean up animations for these elements
        elementsToRemove.forEach(element => {
            this.log(`[WhiteLionManager] Cleaning up animation for removed element: ${element.dataset.id || element.dataset.name}`);
            this.cleanupAnimation(element);
            
            // If ID exists, also remove from processed list
            if (element.dataset.id) {
                this.processedNftIds.delete(element.dataset.id);
            }
        });
    }
    
    updateWhiteLionDirection(element, isRight) {
        this.log(`[WhiteLionManager] Updating white lion direction: ${isRight ? 'right' : 'left'}`);
        
        // update element's orientation class
        if (isRight) {
            element.classList.add('facing-right');
            element.classList.remove('facing-left');
        } else {
            element.classList.add('facing-left');
            element.classList.remove('facing-right');
        }
        
        // get animation container and update flip
        const container = element.querySelector('.white-lion-animation-container');
        if (container) {
            if (isRight) {
                container.style.transform = 'scaleX(-1)';
            } else {
                container.style.transform = 'scaleX(1)';
            }
        }
        
        // update direction information in tracking data
        const whiteLionData = this.animatedWhiteLions.get(element);
        if (whiteLionData) {
            whiteLionData.isFlipped = isRight;
            this.animatedWhiteLions.set(element, whiteLionData);
        }
        
        // update shadow direction
        if (window.PetShadowManager) {
            window.PetShadowManager.updateShadowDirection?.(element, isRight ? 'right' : 'left');
        }
    }
    
    /**
     * Clean up animation for an element
     * @param {HTMLElement} element - The element to clean up
     */
    cleanupAnimation(element) {
        const whiteLionData = this.animatedWhiteLions.get(element);
        if (!whiteLionData) return;
        
        // Clear any animation intervals
        if (whiteLionData.animationInterval) {
            clearInterval(whiteLionData.animationInterval);
        }
        
        // clean up position observer
        if (whiteLionData.positionObserver) {
            clearInterval(whiteLionData.positionObserver);
        }
        
        // Clean up event listeners
        this.cleanupEventListeners(element);
        
        // If PetMovementManager is available, stop movement
        if (window.PetMovementManager && window.PetMovementManager.stopMovement) {
            window.PetMovementManager.stopMovement(element);
        }
        
        // If PetShadowManager is available, remove shadow
        if (this.config.shadow.enabled && window.PetShadowManager && window.PetShadowManager.removeShadow) {
            window.PetShadowManager.removeShadow(element);
        }
        
        // Remove animation container
        const container = element.querySelector('.white-lion-animation-container');
        if (container) {
            element.removeChild(container);
        }
        
        // Reset any modified styles
        const existingImg = element.querySelector('img');
        if (existingImg) {
            existingImg.style.opacity = '1';
        }
        
        // Remove from tracking
        this.animatedWhiteLions.delete(element);
    }
    
    /**
     * Clean up event listeners for element
     * @param {HTMLElement} element - Element to clean up
     */
    cleanupEventListeners(element) {
        // remove direction change listener
        if (element.directionChangeHandler) {
            document.removeEventListener('pet-direction-changed', element.directionChangeHandler);
            delete element.directionChangeHandler;
        }
        
        // Clean up moving state change event listener (if any)
        if (element.movingStateChangeHandler) {
            document.removeEventListener('pet-moving-state-changed', element.movingStateChangeHandler);
            delete element.movingStateChangeHandler;
        }
    }
    
    /**
     * Clean up all animations
     */
    cleanupAllAnimations() {
        this.animatedWhiteLions.forEach((_, element) => {
            this.cleanupAnimation(element);
        });
    }
    
    /**
     * Reset processed state, called when NFT collection is completely updated
     */
    resetProcessedState() {
        this.log('[WhiteLionManager] Resetting processed state, will recheck all NFTs');
        this.processedNftIds.clear();
        
        // Clear all existing animations
        this.cleanupAllAnimations();
    }

    setupDirectionChangeListener() {
        // listen to the global pet direction change event
        document.addEventListener('pet-direction-changed', (event) => {
            if (!event.detail || !event.detail.element) return;
            
            const element = event.detail.element;
            const direction = event.detail.direction;
            
            if (this.isWhiteLionNFTElement(element)) {
                this.updateWhiteLionDirection(element, direction === 'right');
            }
        });
        
        // if PetMovementManager is available, listen to its direction change event
        if (window.PetMovementManager) {
            this.log('[WhiteLionManager] Adding PetMovementManager direction change hook');
            
            // directly listen to its internal state change
            const originalUpdateDirectionState = window.PetMovementManager.updateDirectionState;
            
            if (typeof originalUpdateDirectionState === 'function') {
                window.PetMovementManager.updateDirectionState = (pet) => {
                    // first call the original method
                    originalUpdateDirectionState.call(window.PetMovementManager, pet);
                    
                    // then check if it is a white lion and update direction
                    if (this.isWhiteLionNFTElement(pet.element)) {
                        // get direction information
                        const isFacingRight = pet.state.direction.x > 0;
                        
                        // delay update to ensure state has been updated by the original method
                        setTimeout(() => {
                            this.updateWhiteLionDirection(pet.element, isFacingRight);
                        }, 10);
                    }
                };
            }
        }
    }
}

// Create and initialize the white lion manager
const whiteLionManager = new WhiteLionManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    whiteLionManager.init();
});

// Listen for NFT refresh events on the page
window.addEventListener('nftRefreshed', () => {
    if (whiteLionManager.initialized) {
        // When NFTs are refreshed, reset processed state and recheck
        whiteLionManager.resetProcessedState();
        // Delay slightly to ensure DOM has updated
        setTimeout(() => whiteLionManager.checkForWhiteLions(), 500);
    }
});

// Export the white lion manager for use in other modules
window.WhiteLionManager = whiteLionManager;

// Add the backward compatibility method checkForWhiteLions just like in egg.js
// First check if this is already using PetAnimationBase
if (WhiteLionManager.prototype instanceof PetAnimationBase) {
    /**
     * Backward compatibility method - calls checkForPets
     * @param {boolean} applyShadows - Whether to apply shadows
     */
    WhiteLionManager.prototype.checkForWhiteLions = function(applyShadows = true) {
        return this.checkForPets(applyShadows);
    };
} 