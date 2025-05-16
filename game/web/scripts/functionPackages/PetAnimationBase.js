/**
 * PetAnimationBase.js
 * Base class for all pet animation systems in PetWorld
 * 
 * This class provides common functionality for handling pet animations, including:
 * - Atlas data loading and management
 * - Animation initialization and rendering
 * - Integration with shadow and movement systems
 * - Lifecycle management for animated elements
 */

class PetAnimationBase {
    constructor(petType, config) {
        // Store the pet type (e.g., 'duck', 'egg')
        this.petType = petType;
        
        // Default configuration that can be overridden
        this.defaultConfig = {
            // Animation paths
            animations: {
                left: null,
                leftAtlas: null
            },
            // Animation settings
            animationSettings: {
                frameDuration: 100,
                loopDelay: 0,
                totalFrames: 0,
                walkingFrames: {
                    start: 0,
                    end: 0
                },
                idleFrames: {
                    start: 0,
                    end: 0
                }
            },
            // Movement settings
            movement: {
                enabled: true,
                minSpeed: 0.3,
                maxSpeed: 0.7
            },
            // Shadow settings
            shadow: {
                enabled: true,
                applyToExisting: true
            },
            // Scale settings
            scale: {
                enabled: false,
                factor: 1.0
            }
        };
        
        // Merge provided config with defaults
        this.config = this.mergeConfig(this.defaultConfig, config || {});
        
        // Atlas data parsed from the atlas file
        this.atlasData = null;
        
        // References to loaded animations
        this.loadedAnimations = {};
        
        // Track animated pets
        this.animatedPets = new Map();
        
        // Track processed NFT IDs to prevent duplicate rendering
        this.processedNftIds = new Set();
        
        // Flag to track if the animation system has been initialized
        this.initialized = false;
        
        // Debug mode
        this.debug = false;
    }
    
    /**
     * Merge configuration objects
     */
    mergeConfig(defaultConfig, userConfig) {
        const result = JSON.parse(JSON.stringify(defaultConfig));
        
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && 
                typeof result[key] === 'object' && result[key] !== null) {
                result[key] = this.mergeConfig(result[key], userConfig[key]);
            } else {
                result[key] = userConfig[key];
            }
        }
        
        return result;
    }
    
    /**
     * Initialize the animation system
     */
    async init() {
        if (this.initialized) return;
        
        this.log(`[${this.petType}Manager] Initializing animation system...`);
        
        // Load and parse the atlas file
        try {
            await this.loadAtlasData();
        } catch (error) {
            this.error(`[${this.petType}Manager] Failed to load atlas data:`, error);
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Preload animations
        this.preloadAnimations();
        
        this.initialized = true;
        
        // Clear processed NFT list
        this.processedNftIds.clear();
        
        // Check for pets on main page
        if (window.location.href.includes('home.html')) {
            setTimeout(() => this.checkForPets(), 1000);
        }
        
        // Setup periodic checking
        this.setupPeriodicCheck();
        
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
     * Load and parse the atlas file
     */
    async loadAtlasData() {
        if (!this.config.animations.leftAtlas) {
            this.error(`[${this.petType}Manager] No atlas file specified in config`);
            return;
        }
        
        this.log(`[${this.petType}Manager] Loading atlas data...`);
        
        try {
            // Get full path
            const atlasPath = this.getAbsoluteResourcePath(this.config.animations.leftAtlas);
            this.log(`[${this.petType}Manager] Atlas path: ${atlasPath}`);
            
            // Fetch the atlas file
            const response = await fetch(atlasPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load atlas file: ${response.statusText}`);
            }
            
            const atlasText = await response.text();
            
            // Use SpriteAtlasHelper if available, otherwise use internal parser
            if (window.SpriteAtlasHelper) {
                this.atlasData = window.SpriteAtlasHelper.parseAtlas(atlasText);
                this.log(`[${this.petType}Manager] Atlas data parsed using SpriteAtlasHelper`);
            } else {
                this.atlasData = this.parseAtlas(atlasText);
                this.log(`[${this.petType}Manager] Atlas data parsed using internal parser`);
            }
            
            this.log(`[${this.petType}Manager] Atlas data loaded successfully`);
        } catch (error) {
            this.error(`[${this.petType}Manager] Error loading atlas file:`, error);
            // Create fallback atlas data
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
     * Parse an atlas file text into usable data
     * Basic implementation, override in derived classes if needed
     */
    parseAtlas(atlasText) {
        const lines = atlasText.split('\n');
        const frames = {};
        
        // First line is the png file name
        const pngFile = lines[0].trim();
        
        // Parse size line
        const sizeLine = lines[1].trim();
        const sizeMatch = sizeLine.match(/size:(\d+),(\d+)/);
        const atlasWidth = sizeMatch ? parseInt(sizeMatch[1]) : 1000;
        const atlasHeight = sizeMatch ? parseInt(sizeMatch[2]) : 1000;
        
        let currentFrameName = null;
        
        // Parse the rest of the file
        for (let i = 4; i < lines.length; i++) { // Start from 4 to skip header lines
            const line = lines[i].trim();
            
            if (line === '') continue;
            
            // Check if this line is a frame name
            if (!line.includes(':')) {
                currentFrameName = line;
                frames[currentFrameName] = {};
            } else if (currentFrameName) {
                // Parse frame data
                const [property, value] = line.split(':');
                
                if (property === 'bounds') {
                    // Parse bounds: x, y, width, height
                    const bounds = value.split(',').map(val => parseInt(val));
                    frames[currentFrameName].x = bounds[0];
                    frames[currentFrameName].y = bounds[1];
                    frames[currentFrameName].width = bounds[2];
                    frames[currentFrameName].height = bounds[3];
                } else if (property === 'offsets') {
                    // Parse offsets if needed
                    const offsets = value.split(',').map(val => parseInt(val));
                    frames[currentFrameName].offsetX = offsets[0];
                    frames[currentFrameName].offsetY = offsets[1];
                    frames[currentFrameName].originalWidth = offsets[2];
                    frames[currentFrameName].originalHeight = offsets[3];
                } else if (property === 'rotate') {
                    // Handle rotation if needed
                    frames[currentFrameName].rotate = value === '90';
                }
            }
        }
        
        return {
            meta: {
                image: pngFile,
                size: { w: atlasWidth, h: atlasHeight }
            },
            frames: frames
        };
    }
    
    /**
     * Create a fallback atlas data if loading fails
     * Must be implemented by derived classes
     */
    createFallbackAtlasData() {
        // Must be implemented by derived classes
        this.error(`[${this.petType}Manager] createFallbackAtlasData must be implemented by derived classes`);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for custom NFT loaded events if they exist
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('nftLoaded', this.handleNFTLoadedEvent.bind(this));
            window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
        
        // If we're on the main game page, observe DOM changes
        if (window.location.href.includes('home.html')) {
            this.observeNFTContainer();
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
     * Observe the NFT container for new pets
     */
    observeNFTContainer() {
        // Find the farm animals container
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) return;
        
        // Create a mutation observer to watch for new NFTs
        const observer = new MutationObserver((mutations) => {
            let shouldCheckPets = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheckPets = true;
                }
            });
            
            if (shouldCheckPets) {
                this.checkForPets();
            }
        });
        
        // Start observing the container for changes
        observer.observe(farmContainer, { childList: true, subtree: true });
        
        this.log(`[${this.petType}Manager] Now monitoring farm container for new NFTs`);
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
            this.log(`[${this.petType}Manager] NFT element not connected to DOM, skipping processing`);
            return;
        }
        
        // Get NFT ID
        const nftId = nftData.tokenId || nftElement.dataset.id || 'unknown-nft';
        
        // If this NFT has already been processed, skip
        if (this.processedNftIds.has(nftId)) {
            this.log(`[${this.petType}Manager] NFT already processed, skipping: ${nftId}`);
            return;
        }
        
        // If element already has animation, skip
        if (this.animatedPets.has(nftElement)) {
            this.log(`[${this.petType}Manager] Element already animated, skipping: ${nftId}`);
            return;
        }
        
        // Check if this is our pet type
        if (this.isPetType(nftData)) {
            this.log(`[${this.petType}Manager] ${this.petType} NFT detected from event:`, nftData.metadata?.name || nftData.name || nftId);
            
            // Mark this NFT as processed
            this.processedNftIds.add(nftId);
            
            // Apply animation
            this.applyPetAnimation(nftElement);
        }
    }
    
    /**
     * Check if NFT data represents our pet type
     * Must be implemented by derived classes
     */
    isPetType(nftData) {
        this.error(`[${this.petType}Manager] isPetType must be implemented by derived classes`);
        return false;
    }
    
    /**
     * Preload animations for performance
     */
    preloadAnimations() {
        if (!this.config.animations.left) return;
        
        // Preload the left animation
        const leftImg = new Image();
        leftImg.onload = () => {
            this.log(`[${this.petType}Manager] Image preloaded successfully`);
            this.loadedAnimations.left = leftImg;
        };
        leftImg.onerror = (err) => {
            this.error(`[${this.petType}Manager] Error preloading image:`, err);
        };
        
        // Get full path
        const imagePath = this.getAbsoluteResourcePath(this.config.animations.left);
        this.log(`[${this.petType}Manager] Image path: ${imagePath}`);
        leftImg.src = imagePath;
    }
    
    /**
     * Setup periodic checking for pets
     */
    setupPeriodicCheck() {
        if (window.location.href.includes('home.html')) {
            // Check for pets every 10 seconds
            setInterval(() => {
                this.checkForPets(false); // Pass false to indicate not to auto-apply shadows
            }, 10000);
        }
    }
    
    /**
     * Check the page for pet NFTs and apply animations
     * Must be implemented by derived classes
     */
    checkForPets(applyShadows = true) {
        this.error(`[${this.petType}Manager] checkForPets must be implemented by derived classes`);
    }
    
    /**
     * Initialize shadow system
     */
    initShadowSystem() {
        if (!this.config.shadow.enabled) return;
        
        this.log(`[${this.petType}Manager] Initializing shadow system...`);
        
        // Check if PetShadowManager is available
        if (window.PetShadowManager) {
            this.log(`[${this.petType}Manager] PetShadowManager found, will use for shadows`);
            
            // If set to apply to existing pets, delay execution
            if (this.config.shadow.applyToExisting) {
                setTimeout(() => {
                    this.applyAllPetShadows();
                }, 1500);
            }
            
            // Add event listener to update shadow when pet's moving state changes
            document.addEventListener(`${this.petType}-moving-state-changed`, (event) => {
                if (event.detail && event.detail.element) {
                    const petElement = event.detail.element;
                    
                    // Update shadow state
                    if (window.PetShadowManager && window.PetShadowManager.updateShadow) {
                        window.PetShadowManager.updateShadow(petElement);
                    }
                }
            });
        } else {
            this.log(`[${this.petType}Manager] PetShadowManager not available, shadows will not be applied`);
        }
    }
    
    /**
     * Apply shadows to all existing pet elements
     */
    applyAllPetShadows() {
        if (!window.PetShadowManager) return;
        
        this.log(`[${this.petType}Manager] Applying shadows to all ${this.petType}s...`);
        
        // Find all pet elements
        const petElements = document.querySelectorAll(`.${this.petType}-nft`);
        let count = 0;
        
        petElements.forEach(petElement => {
            // Add shadow
            window.PetShadowManager.addShadow(petElement, {
                ratio: 0.8,  // Shadow width relative to pet
                jumpEffect: true  // Enable jumping effect
            });
            count++;
        });
        
        this.log(`[${this.petType}Manager] Applied shadows to ${count} ${this.petType}s`);
    }
    
    /**
     * Apply pet animation to an element
     */
    applyPetAnimation(element) {
        // Must be implemented by derived classes
        this.error(`[${this.petType}Manager] applyPetAnimation must be implemented by derived classes`);
    }
    
    /**
     * Clean up animations for an element
     */
    cleanupAnimation(element) {
        const petData = this.animatedPets.get(element);
        if (!petData) return;
        
        // Clear any animation intervals
        if (petData.animationInterval) {
            clearInterval(petData.animationInterval);
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
        const container = element.querySelector(`.${this.petType}-animation-container`);
        if (container) {
            element.removeChild(container);
        }
        
        // Reset any modified styles
        const existingImg = element.querySelector('img');
        if (existingImg) {
            existingImg.style.opacity = '1';
        }
        
        // Remove from tracking
        this.animatedPets.delete(element);
    }
    
    /**
     * Clean up event listeners for element
     */
    cleanupEventListeners(element) {
        // Clean up moving state change event listener (if any)
        if (element.movingStateChangeHandler) {
            document.removeEventListener('pet-moving-state-changed', element.movingStateChangeHandler);
            delete element.movingStateChangeHandler;
        }
    }
    
    /**
     * Pause all pet animations
     */
    pauseAllAnimations() {
        this.animatedPets.forEach((petData, element) => {
            if (petData.animationInterval) {
                clearInterval(petData.animationInterval);
                petData.animationInterval = null;
            }
        });
    }
    
    /**
     * Resume all pet animations
     */
    resumeAllAnimations() {
        // Must be implemented by derived classes
        this.error(`[${this.petType}Manager] resumeAllAnimations must be implemented by derived classes`);
    }
    
    /**
     * Clean up all animations
     */
    cleanupAllAnimations() {
        this.animatedPets.forEach((_, element) => {
            this.cleanupAnimation(element);
        });
    }
    
    /**
     * Reset processed state
     */
    resetProcessedState() {
        this.log(`[${this.petType}Manager] Resetting processed state, will recheck all NFTs`);
        this.processedNftIds.clear();
        
        // Clear all existing animations
        this.cleanupAllAnimations();
    }
    
    /**
     * Convert element's percentage position to pixels
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
}

// Register PetAnimationBase as a global class for other modules to reference
console.log('[PetAnimationBase] Registering to global scope...');
window.PetAnimationBase = PetAnimationBase; 