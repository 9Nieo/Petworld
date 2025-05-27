/**
 * Egg Animation and Logic Module
 * Handles animation and special behaviors for Egg NFTs in PetWorld
 * Extends the PetAnimationBase class for common functionality
 */

class EggManager extends PetAnimationBase {
    constructor() {
        // Set up pet-specific configuration
        const eggConfig = {
            // Animation paths - using relative paths
            animations: {
                left: '../../resources/actions/Egg/left.png',
                leftAtlas: '../../resources/actions/Egg/left.atlas'
            },
            // Animation settings
            animationSettings: {
                frameDuration: 40,     // Duration of each frame in milliseconds
                loopDelay: 0,          // Set to 0, like ducks, play continuously
                totalFrames: 17,       // Based on the total number of frames in the Egg atlas file
                walkingFrames: {
                    start: 0,          // Walking animation start frame
                    end: 16            // Walking animation end frame
                },
                idleFrames: {
                    start: 0,          // Idle animation start frame
                    end: 0             // Idle animation end frame (use the first frame as the idle frame)
                }
            },
            // Movement settings
            movement: {
                enabled: true,        // Whether to enable movement functionality
                minSpeed: 0.2,        // Egg movement speed is slower
                maxSpeed: 0.5         // Egg movement speed is slower
            },
            // Shadow settings
            shadow: {
                enabled: true,        // Whether to enable shadow
                applyToExisting: true // Whether to apply to existing eggs
            }
        };

        try {
            // Initialize the base class with this pet type and config
            super('egg', eggConfig);
            
            // Enable debug mode to see detailed logs
            this.debug = true;
            
            console.log('[EggManager] Successfully initialized with PetAnimationBase');
        } catch (error) {
            console.error('[EggManager] Error initializing with PetAnimationBase, using fallback:', error);
            
            // If PetAnimationBase does not exist or cannot be extended, revert to the original implementation
            this.initializeFallback(eggConfig);
        }
    }
    
    /**
     * Emergency fallback method: use if PetAnimationBase is not available
     */
    initializeFallback(config) {
        console.log('[EggManager] Using fallback initialization');
        
        // Copy basic configuration
        this.config = JSON.parse(JSON.stringify(config));
        this.petType = 'egg';
        this.debug = true;
        
        // Basic state variables
        this.initialized = false;
        this.animatedPets = new Map();
        this.processedNftIds = new Set();
        this.atlasData = null;
        this.loadedAnimations = {};
    }

    /**
     * Load and parse the atlas file
     */
    async loadAtlasData() {
        this.log('[EggManager] Loading atlas data...');
        
        try {
            // Get full path
            const atlasPath = this.getAbsoluteResourcePath(this.config.animations.leftAtlas);
            this.log(`[EggManager] Atlas path: ${atlasPath}`);
            
            // Fetch the atlas file
            const response = await fetch(atlasPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load atlas file: ${response.statusText}`);
            }
            
            const atlasText = await response.text();
            
            // Use SpriteAtlasHelper to parse atlas data
            if (window.SpriteAtlasHelper && window.SpriteAtlasHelper.parseAtlas) {
                this.atlasData = window.SpriteAtlasHelper.parseAtlas(atlasText);
                this.log('[EggManager] Atlas data parsed using SpriteAtlasHelper');
            } else {
                // If SpriteAtlasHelper is not available, use the fallback parsing method
                this.createFallbackAtlasData();
            }
            
            this.log('[EggManager] Atlas data loaded successfully');
        } catch (error) {
            this.error('[EggManager] Error loading atlas file:', error);
            // Create a simple fallback atlas data if loading fails
            this.createFallbackAtlasData();
        }
    }

    /**
     * Create a fallback atlas data if loading fails
     * Implementation specific to egg animation
     */
    createFallbackAtlasData() {
        this.log('[EggManager] Creating fallback atlas data');
        
        // Create a simple atlas with 17 frames in a 4x5 grid
        const frames = {};
        const frameWidth = 261;
        const frameHeight = 324;
        
        for (let i = 0; i < this.config.animationSettings.totalFrames; i++) {
            // Format number with padding
            const paddedNum = i.toString().padStart(2, '0');
            const frameName = `skeleton-left_${paddedNum}`;
            
            frames[frameName] = {
                x: (i % 4) * frameWidth,
                y: Math.floor(i / 4) * frameHeight,
                width: frameWidth,
                height: frameHeight,
                offsetX: 75,
                offsetY: 42 + (i * 5), // Approximate offset adjustment based on frame
                originalWidth: 410,
                originalHeight: 486
            };
        }
        
        this.atlasData = {
            meta: {
                image: 'left.png',
                size: { w: frameWidth * 4, h: frameHeight * 5 }
            },
            frames: frames
        };
    }
    
    /**
     * Check if an element represents our pet type (egg)
     * @param {HTMLElement} element - The DOM element to check
     * @returns {boolean} - True if the element is an egg NFT
     */
    isPetTypeElement(element) {
        if (!element) return false;
        
        // Check if element has egg-nft class
        if (element.classList.contains('egg-nft')) {
            return true;
        }
        
        // Check element's dataset type
        if (element.dataset.type === 'egg') {
            return true;
        }
        
        // Check the name attribute (fallback)
        const name = (element.dataset.name || '').toLowerCase();
        if (name.includes('egg')) {
            return true;
        }
        
        // console.log(`[EggDebug] Not an egg: ${element.dataset.name || 'unknown'} (classes: ${Array.from(element.classList)})`);
        return false;
    }
    
    /**
     * Check if NFT data represents an egg
     * Implementation of base class abstract method
     * @param {Object} nftData - The NFT data object
     * @returns {boolean} - True if the NFT is an egg
     */
    isPetType(nftData) {
        if (!nftData) return false;
        
        // Check metadata name
        if (nftData.metadata && nftData.metadata.name) {
            return nftData.metadata.name.toLowerCase().includes('egg');
        }
        
        // Check direct name property
        if (nftData.name) {
            return nftData.name.toLowerCase().includes('egg');
        }
        
        return false;
    }
    
    /**
     * Check the page for egg NFTs and apply animations
     * Implementation of base class abstract method
     * @param {boolean} applyShadows - Whether to apply shadows, default is true
     */
    checkForPets(applyShadows = true) {
        // console.log('[EggDebug] checkForPets/checkForEggs called on page:', window.location.href);
        
        // Find all NFT elements in the farm
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) {
            console.error('[EggDebug] Farm container not found!');
            return;
        }
        
        // console.log('[EggDebug] Farm container found:', farmContainer);
        
        // Find all animal elements - use several selectors to catch all possibilities
        const animalElements = farmContainer.querySelectorAll('.animal, .nft-animal, .egg-nft');
        // console.log(`[EggDebug] Found ${animalElements.length} animal elements:`, animalElements);
        
        // More detailed logging of found animals
        // Array.from(animalElements).forEach((el, idx) => {
        //     console.log(`[EggDebug] Animal #${idx}:`, {
        //         id: el.dataset.id || 'none',
        //         name: el.dataset.name || 'none',
        //         classes: Array.from(el.classList),
        //         isEgg: this.isPetTypeElement(el),
        //         hasPet: !!this.animatedPets.get(el),
        //         isProcessed: this.processedNftIds.has(el.dataset.id || 'unknown')
        //     });
        // });
        
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
                this.log(`[EggManager] NFT already processed, skipping: ${nftId}`);
                return;
            }
            
            // Skip elements that are already animated
            if (this.animatedPets.has(animalElement)) {
                this.log(`[EggManager] Element already animated, skipping: ${nftId}`);
                return;
            }
            
            // Check if this is an egg
            if (this.isPetTypeElement(animalElement)) {
                // console.log(`[EggDebug] Found egg NFT #${index} (ID: ${nftId}) - applying animation:`, animalElement.dataset.name);
                
                // Mark this NFT as processed
                this.processedNftIds.add(nftId);
                
                // Apply animation
                this.applyPetAnimation(animalElement);
            }
        });
        
        // Clean up animations for NFTs that no longer exist
        this.cleanupNonExistentAnimations(currentNftIds);
    }
    
    /**
     * Clean up animations for NFTs that no longer exist
     * @param {Set} currentNftIds - Set of all NFT IDs currently on the page
     */
    cleanupNonExistentAnimations(currentNftIds) {
        // Find elements that are no longer on the page but still have animations
        const elementsToRemove = [];
        
        this.animatedPets.forEach((eggData, element) => {
            // Get element's NFT ID
            const nftId = element.dataset.id || element.dataset.contractAddress;
            
            // If element has been removed from page or ID not in current set
            if (!element.isConnected || (nftId && !currentNftIds.has(nftId))) {
                elementsToRemove.push(element);
            }
        });
        
        // Clean up animations for these elements
        elementsToRemove.forEach(element => {
            this.log(`[EggManager] Cleaning up animation for removed element: ${element.dataset.id || element.dataset.name}`);
            this.cleanupAnimation(element);
            
            // If ID exists, also remove from processed list
            if (element.dataset.id) {
                this.processedNftIds.delete(element.dataset.id);
            }
        });
    }
    
    /**
     * Apply pet animation to an element
     * Implementation of base class abstract method
     * @param {HTMLElement} element - The NFT element to animate
     */
    applyPetAnimation(element) {
        // If we're already animating this egg, don't do it again
        if (this.animatedPets.has(element)) return;
        
        this.log('[EggManager] Applying egg animation to element:', element);
        
        // Check if element is visible and has dimensions
        if (!element.isConnected) {
            this.error('[EggManager] Element is not connected to DOM, cannot animate:', element);
            return;
        }
        
        // Use PetSizeHelper for intelligent size checking and animation application
        if (window.PetSizeHelper) {
            window.PetSizeHelper.applyAnimationWithSizeCheck(
                element,
                'egg',
                (el) => this.doApplyEggAnimation(el),
                {
                    maxWaitAttempts: 8,
                    fallbackSize: { width: '50px', height: '50px' }
                }
            );
        } else {
            // Fallback to original logic if PetSizeHelper is not available
            this.log('[EggManager] PetSizeHelper not available, using fallback logic');
            
        // Check element dimensions, delay processing if zero
        if (element.offsetWidth === 0 || element.offsetHeight === 0) {
            this.log('[EggManager] Element has zero dimensions, delaying animation:', element);
            
            // Use setTimeout to delay applying animation, wait for element to render
            setTimeout(() => {
                // Recheck dimensions
                if (element.isConnected && element.offsetWidth > 0 && element.offsetHeight > 0) {
                    this.log('[EggManager] Element now has dimensions, applying animation');
                    this.doApplyEggAnimation(element);
                } else {
                    this.error('[EggManager] Element still has zero dimensions after delay, applying PetSizeManager or default size');
                    
                    // First try to apply PetSizeManager if available
                    if (window.PetSizeManager) {
                        const petType = window.PetSizeManager.detectPetType(element);
                        window.PetSizeManager.setSize(element, petType);
                        this.log('[EggManager] Applied PetSizeManager sizing');
                    }
                    
                    // Only set fallback size if PetSizeManager didn't set dimensions
                    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                        element.style.width = element.style.width || '50px';
                        element.style.height = element.style.height || '50px';
                        this.log('[EggManager] Applied fallback size as last resort');
                    }
                    
                    // Try to apply animation
                    this.doApplyEggAnimation(element);
                }
            }, 500); // Delay 500ms
            
            return;
        }
        
        // If dimensions are normal, apply animation directly
        this.doApplyEggAnimation(element);
        }
    }
    
    /**
     * Actual method to apply egg animation (separated to support delayed processing)
     * @param {HTMLElement} element - The NFT element to animate
     */
    doApplyEggAnimation(element) {
        // Set default facing direction
        const initialFacingDirection = Math.random() > 0.5 ? 'right' : 'left';
        const isFlipped = initialFacingDirection === 'right';
        
        // Set initial facing class
        if (initialFacingDirection === 'right') {
            element.classList.add('facing-right');
            element.classList.remove('facing-left');
        } else {
            element.classList.add('facing-left');
            element.classList.remove('facing-right');
        }
        
        // Add egg-nft class for styling
        element.classList.add('egg-nft');
        
        // Save reference to this animated egg
        this.animatedPets.set(element, {
            element,
            isFlipped,
            animationInterval: null,
            currentFrame: 0,
            hasShadow: false  // Shadow tracking flag
        });
        
        // Create animation container
        this.prepareElementForAnimation(element, isFlipped);
        
        // Start the animation
        this.startEggAnimation(element, isFlipped);
        
        // Apply shadow effect first, ensuring shadow exists before movement
        if (this.config.shadow.enabled) {
            // Mark as having shadow state, to avoid duplicate application
            this.applyEggShadow(element);
        }
        
        // If movement is enabled and PetMovementManager is available, enable movement
        if (this.config.movement.enabled && window.PetMovementManager) {
            this.enableMovement(element);
        }
    }
    
    /**
     * Apply shadow effect to egg element
     * @param {HTMLElement} element - Egg element
     */
    applyEggShadow(element) {
        if (!this.config.shadow.enabled || !window.PetShadowManager) return;
        
        // If already in tracking map, check if already has shadow
        const eggData = this.animatedPets.get(element);
        if (eggData && eggData.hasShadow) {
            this.log('[EggManager] Egg already has shadow, skipping:', element.dataset.name || element.dataset.id || 'unnamed');
            return;
        }
        
        // Add egg-nft class to support shadow selector
        element.classList.add('egg-nft');
        
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
            ratio: 0.8,                     // Shadow width relative to egg
            jumpEffect: true,               // Enable jump effect
            opacity: 0.6,                   // Set higher opacity
            display: true                   // Ensure always displayed
        });
        
        // Set shadow direction attribute
        if (shadowElement) {
            shadowElement.setAttribute('data-direction', isFacingRight ? 'right' : 'left');
        }
        
        // Update tracking data
        if (eggData) {
            eggData.hasShadow = true;
            this.animatedPets.set(element, eggData);
        }
        
        this.log('[EggManager] Applied shadow to egg:', element.dataset.name || element.dataset.id || 'unnamed');
    }
    
    /**
     * Enable movement for pet
     * @param {HTMLElement} element - Pet element
     */
    enableMovement(element) {
        if (!window.PetMovementManager) {
            this.log('[EggManager] PetMovementManager not available, cannot enable movement');
            return;
        }
        
        // Generate random movement speed
        const speed = this.config.movement.minSpeed + 
                     Math.random() * (this.config.movement.maxSpeed - this.config.movement.minSpeed);
        
        // Get farm container
        const farmContainer = document.getElementById('farm-animals-container');
        if (farmContainer) {
            // Ensure initial position is within the bottom 60% of the container, but not in bottom 8%
            const containerHeight = farmContainer.offsetHeight;
            const verticalLimit = window.PetMovementManager.config.movement.verticalLimit || 0.6;
            const bottomPadding = window.PetMovementManager.config.movement.bottomPadding || 0.08;
            
            // Calculate valid vertical range
            const minTop = containerHeight * (1 - verticalLimit);
            const maxTop = containerHeight * (1 - bottomPadding) - element.offsetHeight;
            
            // Convert percentage position to pixels (important: resolves shadow positioning issue)
            this.convertPositionToPixels(element, farmContainer);
            
            // Check current position
            const currentTop = parseFloat(element.style.top) || 0;
            
            // If position is outside valid area, reposition
            if (currentTop < minTop || currentTop > maxTop) {
                // Generate random position within valid area
                const newTop = minTop + Math.random() * (maxTop - minTop);
                element.style.top = `${newTop}px`;
                this.log(`[EggManager] Repositioning egg "${element.dataset.name || 'unnamed'}" to within vertical area: ${newTop}px`);
            }
        }
        
        // Use PetMovementManager to enable movement
        window.PetMovementManager.enableMovement(element, {
            speed: speed,
            onStateChange: (isMoving) => {
                // When egg movement state changes, trigger custom event to notify shadow system
                const event = new CustomEvent('pet-moving-state-changed', {
                    detail: {
                        element: element,
                        isMoving: isMoving
                    },
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
                
                // Also dispatch an egg-specific event for specialized handling
                const eggEvent = new CustomEvent('egg-moving-state-changed', {
                    detail: {
                        element: element,
                        isMoving: isMoving
                    },
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(eggEvent);
                
                // Add or remove movement class to trigger CSS animation
                if (isMoving) {
                    element.classList.add('egg-moving');
                    element.classList.add('pet-moving');  // Also add generic moving class
                } else {
                    element.classList.remove('egg-moving');
                    element.classList.remove('pet-moving');  // Also remove generic moving class
                }
            }
        });
        
        this.log(`[EggManager] Enabled movement for egg: ${element.dataset.name || 'unnamed'} with speed ${speed.toFixed(2)}`);
    }
    
    /**
     * Prepare an element for animation
     * @param {HTMLElement} element - The element to prepare
     * @param {boolean} isFlipped - Whether to flip the animation horizontally
     */
    prepareElementForAnimation(element, isFlipped) {
        // Check if element is connected to DOM
        if (!element || !element.isConnected) {
            this.error('[EggManager] Cannot prepare element - element is not connected to DOM');
            return false;
        }
        
        // Apply size using PetSizeManager first if available
        if (window.PetSizeManager) {
            window.PetSizeManager.setSize(element, 'egg');
            this.log('[EggManager] Applied size using PetSizeManager');
        }
        
        // Check element dimensions after PetSizeManager
        if (element.offsetWidth === 0 || element.offsetHeight === 0) {
            this.error('[EggManager] Element still has zero dimensions after PetSizeManager, applying fallback size');
            // Set minimum size as fallback
            element.style.width = element.style.width || '50px';
            element.style.height = element.style.height || '50px';
        }

        // Ensure the element has position relative for absolute positioning of the animation
        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'visible';
        // Ensure element background is transparent
        element.style.backgroundColor = 'transparent';
        
        try {
            // Remove any existing animation container to prevent duplication
            const oldContainer = element.querySelector('.egg-animation-container');
            if (oldContainer) {
                element.removeChild(oldContainer);
            }
            
            // If there's an existing img inside, make it semi-transparent during animation
            const existingImg = element.querySelector('img');
            if (existingImg) {
                existingImg.style.opacity = '0.7';
            }
            
            // Create animation container
            const animContainer = document.createElement('div');
            animContainer.className = 'egg-animation-container';
            animContainer.style.position = 'absolute';
            animContainer.style.top = '0';
            animContainer.style.left = '0';
            animContainer.style.width = '100%';
            animContainer.style.height = '100%';
            animContainer.style.pointerEvents = 'none'; // Don't interfere with clicks
            animContainer.style.zIndex = '10'; // Show above the egg image
            // Ensure animation container background is transparent
            animContainer.style.backgroundColor = 'transparent';
            
            // Apply flip transformation if needed
            if (isFlipped) {
                animContainer.style.transform = 'scaleX(-1)';
            }
            
            // Add container to the element
            element.appendChild(animContainer);
            
            // Get element's actual dimensions
            const elementWidth = element.offsetWidth || 50;
            const elementHeight = element.offsetHeight || 50;
            
            this.log(`[EggManager] Element dimensions: ${elementWidth}x${elementHeight}`);
            
            // Create canvas for sprite animation
            const canvas = document.createElement('canvas');
            canvas.className = 'egg-animation-canvas';
            
            // Let PetSizeManager handle the canvas dimensions if available
            if (window.PetSizeManager) {
                canvas.width = elementWidth ;  // Higher quality default
                canvas.height = elementHeight ;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
            } else {
                // Original sizing logic for backward compatibility
                canvas.width = elementWidth ; // Make canvas larger for better quality
                canvas.height = elementHeight ;
                canvas.style.position = 'absolute';
                canvas.style.width = '100%'; // Make the animation larger than the container
                canvas.style.height = '100%';
                canvas.style.top = '-50%';
                canvas.style.left = '-50%';
                canvas.style.transformOrigin = 'center center';
            }
            
            // Ensure canvas background is transparent
            canvas.style.backgroundColor = 'transparent';
            
            // Add canvas to the animation container
            animContainer.appendChild(canvas);
            
            return true;
        } catch (error) {
            this.error('[EggManager] Error preparing element for animation:', error);
            return false;
        }
    }
    
    /**
     * Start the egg animation
     * @param {HTMLElement} element - The element to animate
     * @param {boolean} isFlipped - Whether the animation is flipped
     */
    startEggAnimation(element, isFlipped) {
        // Check element
        if (!element || !element.isConnected) {
            this.error('[EggManager] Cannot start animation - element is not connected to DOM');
            return;
        }
        
        try {
            // Get animation container
            const animContainer = element.querySelector('.egg-animation-container');
            if (!animContainer) {
                this.error('[EggManager] Animation container not found');
                return;
            }
            
            // Get the canvas
            const canvas = animContainer.querySelector('.egg-animation-canvas');
            if (!canvas) {
                this.error('[EggManager] Canvas not found');
                return;
            }
            
            // Find the egg data in our tracking map
            const eggData = this.animatedPets.get(element);
            if (!eggData) {
                this.error('[EggManager] Egg data not found');
                return;
            }
            
            // Wait until the atlas data is loaded
            if (!this.atlasData) {
                this.log('[EggManager] Atlas data not loaded yet, creating fallback');
                this.createFallbackAtlasData();
            }
            
            // Start the sprite sheet animation
            this.startSpriteAnimation(element, canvas, isFlipped);
        } catch (error) {
            this.error('[EggManager] Error starting egg animation:', error);
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
            // Get egg data from tracking map
            const eggData = this.animatedPets.get(element);
            if (!eggData) return;
            
            // Get the canvas context
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                this.error('[EggManager] Failed to get canvas context');
                return;
            }
            
            // Make sure the image is loaded
            if (!this.loadedAnimations.left || !this.loadedAnimations.left.complete) {
                // If not loaded, load it now
                const img = new Image();
                img.onload = () => {
                    this.log('[EggManager] Image loaded for animation');
                    this.loadedAnimations.left = img;
                    // Start animation when image is loaded
                    this.initializeAnimation(element, canvas, ctx, isFlipped);
                };
                img.onerror = (err) => {
                    this.error('[EggManager] Failed to load image for animation:', err);
                };
                
                // Get full path
                const imagePath = this.getAbsoluteResourcePath(this.config.animations.left);
                this.log(`[EggManager] Loading image from: ${imagePath}`);
                img.src = imagePath;
            } else {
                // Image already loaded, start animation
                this.initializeAnimation(element, canvas, ctx, isFlipped);
            }
        } catch (error) {
            this.error('[EggManager] Error in startSpriteAnimation:', error);
        }
    }
    
    /**
     * Initialize animation sequence
     */
    initializeAnimation(element, canvas, ctx, isFlipped) {
        try {
            // Check if element is still connected to DOM
            if (!element || !element.isConnected) {
                this.error('[EggManager] Element no longer connected to DOM');
                return;
            }
            
            const eggData = this.animatedPets.get(element);
            if (!eggData) {
                this.error('[EggManager] Egg data not found in initializeAnimation');
                return;
            }
            
            // Get the sprite sheet image
            const spriteSheet = this.loadedAnimations.left;
            if (!spriteSheet || !spriteSheet.complete) {
                this.error('[EggManager] Sprite sheet not loaded or incomplete');
                return;
            }
            
            // Clear any existing animation
            if (eggData.animationInterval) {
                clearInterval(eggData.animationInterval);
                eggData.animationInterval = null;
            }
            
            // Initialize animation state
            const isMoving = element.classList.contains('pet-moving') || element.classList.contains('egg-moving');
            
            // Whether to move or not, start from frame 0
            eggData.currentFrame = 0;
            eggData.animationState = isMoving ? 'walking' : 'idle';
            
            // Draw the first frame immediately
            this.drawFrame(ctx, canvas, spriteSheet, eggData.currentFrame);
            
            // Set the animation interval
            const frameDuration = this.config.animationSettings.frameDuration;
            
            eggData.animationInterval = setInterval(() => {
                // Check if the element is still connected to DOM
                if (!element.isConnected) {
                    if (eggData.animationInterval) {
                        clearInterval(eggData.animationInterval);
                        eggData.animationInterval = null;
                    }
                    return;
                }
                
                // Check if the element is currently moving
                const isCurrentlyMoving = element.classList.contains('pet-moving') || 
                                          element.classList.contains('egg-moving');
                
                // Update the animation based on the current state
                if (isCurrentlyMoving) {
                    // When in moving state, play the complete walking animation
                    if (eggData.animationState !== 'walking') {
                        // State changed from idle to moving, reset to frame 0
                        eggData.currentFrame = 0;
                        eggData.animationState = 'walking';
                    } else {
                        // Loop within the walking frame range
                        const {start, end} = this.config.animationSettings.walkingFrames;
                        eggData.currentFrame++;
                        
                        // Loop back to the start frame
                        if (eggData.currentFrame > end) {
                            eggData.currentFrame = start;
                        }
                    }
                } else {
                    // When not in moving state, only display the idle frame
                    if (eggData.animationState !== 'idle') {
                        eggData.currentFrame = this.config.animationSettings.idleFrames.start;
                        eggData.animationState = 'idle';
                    }
                    // In idle state, do not loop, stay on the same frame
                }
                
                // Draw the current frame
                this.drawFrame(ctx, canvas, spriteSheet, eggData.currentFrame);
            }, frameDuration);
            
            // Update animation data
            this.animatedPets.set(element, eggData);
            
            // Add egg-nft class for CSS selector to recognize
            element.classList.add('egg-nft');
        } catch (error) {
            this.error('[EggManager] Error in initializeAnimation:', error);
        }
    }
    
    /**
     * Draw a specific frame from the sprite sheet
     */
    drawFrame(ctx, canvas, spriteSheet, frameIndex) {
        // Completely clear canvas for transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Format the frame name
        const paddedIndex = frameIndex.toString().padStart(2, '0');
        const frameName = `skeleton-left_${paddedIndex}`;
        
        // Get frame data from atlas
        const frameData = this.atlasData.frames[frameName];
        
        if (!frameData) {
            this.error(`[EggManager] Frame data not found for: ${frameName}`);
            return;
        }
        
        try {
            // Use the same drawing method as ducks
            const isDebugMode = false;
            
            // Check if it is a rotated frame
            const isRotated = frameData.rotate === true;
            
            // Basic rotation options - for normal frames
            let rotationOptions = {
                correctRotation: true,
                rotationDirection: 1,         // Clockwise rotation
                rotationFlipX: false,         // Default not horizontal flip
                rotationFlipY: false,         // Default not vertical flip
                flipX: false,                 // Not horizontal flip original frame
                flipY: false,                 // Not vertical flip original frame
                scale: 1                      // Use 1 as default scale factor, scale is handled by PetSizeManager
            };
            
            // Special handling for rotated frames (if any)
            if (isRotated) {
                rotationOptions = {
                    ...rotationOptions,
                    rotationDirection: -1,     // Counterclockwise rotation
                    rotationFlipX: true,       // Horizontal flip
                    rotationFlipY: true        // Vertical flip
                };
            }
            
            // Use SpriteAtlasHelper to draw frame
            if (window.SpriteAtlasHelper && window.SpriteAtlasHelper.drawFrame) {
                window.SpriteAtlasHelper.drawFrame(ctx, canvas, spriteSheet, frameData, {
                    ...rotationOptions,
                    debug: isDebugMode  // Disable debug mode
                });
            } else {
                this.error('[EggManager] SpriteAtlasHelper not available, falling back to basic drawing');
                
                // Basic drawing method as fallback
                const scaleX = canvas.width / frameData.originalWidth;
                const scaleY = canvas.height / frameData.originalHeight;
                const scale = Math.min(scaleX, scaleY);
                
                // Calculate center position
                const centerX = (canvas.width / scale - frameData.width) / 2;
                const centerY = (canvas.height / scale - frameData.height) / 2;
                
                // Draw frame
                ctx.save();
                ctx.scale(scale, scale);
                ctx.drawImage(
                    spriteSheet,
                    frameData.x, frameData.y, frameData.width, frameData.height,
                    centerX, centerY, frameData.width, frameData.height
                );
                ctx.restore();
            }
        } catch (error) {
            this.error('[EggManager] Error drawing frame:', error);
        }
    }
    
    /**
     * Pause all egg animations
     */
    pauseAllAnimations() {
        this.animatedPets.forEach((petData, element) => {
            if (petData.animationInterval) {
                clearInterval(petData.animationInterval);
                petData.animationInterval = null;
            }
        });
        
        this.log('[EggManager] Paused all animations');
    }
    
    /**
     * Resume all pet animations
     * Implementation of base class abstract method
     */
    resumeAllAnimations() {
        this.animatedPets.forEach((eggData, element) => {
            if (!eggData.animationInterval && element.isConnected) {
                // Restart animation
                const animContainer = element.querySelector('.egg-animation-container');
                if (animContainer) {
                    const canvas = animContainer.querySelector('.egg-animation-canvas');
                    if (canvas) {
                        this.startEggAnimation(element, eggData.isFlipped);
                    }
                }
            }
        });
        
        this.log('[EggManager] Resumed all animations');
    }

    /**
     * Backward compatibility method - calls checkForPets
     * @param {boolean} applyShadows - Whether to apply shadows
     */
    checkForEggs(applyShadows = true) {
        return this.checkForPets(applyShadows);
    }

    // Use the base class method, but add debug output
    getAbsoluteResourcePath(relativePath) {
        // Output current URL and relative path
            // console.log(`[EggDebug] Current URL: ${window.location.href}`);
            // console.log(`[EggDebug] Relative path: ${relativePath}`);
            
        // Call the base class method
        const result = super.getAbsoluteResourcePath(relativePath);
        
        // Output the result
        // console.log(`[EggDebug] Resolved path: ${result}`);
        return result;
    }

    /**
     * Ensure init method can run even if base class is not available
     */
    async init() {
        if (this.initialized) {
            console.log('[EggManager] Already initialized.');
            return;
        }
        
        try {
            console.log('[EggManager] Calling super.init()...');
            // Try calling the base class init() method
            await super.init();
            
            console.log('[EggManager] Base class initialization successful');
        } catch (error) {
            console.error('[EggManager] Error in super.init(), using fallback initialization:', error);
            
            // If base class init() fails, use custom initialization
            console.log('[EggManager] Initializing egg animation system directly...');
            
            // Load atlas data
            try {
                await this.loadAtlasData();
            } catch (atlasError) {
                console.error('[EggManager] Failed to load atlas data:', atlasError);
            }
            
            // Set event listeners
            this.setupEventListeners();
            
            // Preload animations
            this.preloadAnimations();
            
            this.initialized = true;
            
            // Clear processed NFT list
            this.processedNftIds.clear();
            
            // If on the main page, check eggs
            if (window.location.href.includes('home.html')) {
                setTimeout(() => this.checkForEggs(), 1000);
            }
        }
        
        return this;
    }

    /**
     * Setup event listeners for system
     */
    setupEventListeners() {
        // Listen for custom NFT loaded events if they exist
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('nftLoaded', this.handleNFTLoadedEvent.bind(this));
            window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
        
        // If we're on the main game page, observe DOM changes to detect new eggs
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
     * Observe the NFT container for new eggs
     */
    observeNFTContainer() {
        // Find the farm animals container
        const farmContainer = document.getElementById('farm-animals-container');
        if (!farmContainer) return;
        
        // Create a mutation observer to watch for new NFTs
        const observer = new MutationObserver((mutations) => {
            let shouldCheckEggs = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheckEggs = true;
                }
            });
            
            if (shouldCheckEggs) {
                this.checkForEggs();
            }
        });
        
        // Start observing the container for changes
        observer.observe(farmContainer, { childList: true, subtree: true });
        
        this.log('[EggManager] Now monitoring farm container for new NFTs');
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
            this.log(`[EggManager] NFT element not connected to DOM, skipping processing`);
            return;
        }
        
        // Get NFT ID
        const nftId = nftData.tokenId || nftElement.dataset.id || 'unknown-nft';
        
        // If this NFT has already been processed, skip
        if (this.processedNftIds.has(nftId)) {
            this.log(`[EggManager] NFT already processed, skipping: ${nftId}`);
            return;
        }
        
        // If element already has animation, skip
        if (this.animatedPets.has(nftElement)) {
            this.log(`[EggManager] Element already animated, skipping: ${nftId}`);
            return;
        }
        
        // Check if this is an egg
        if (this.isPetType(nftData)) {
            this.log('[EggManager] Egg NFT detected from event:', nftData.metadata?.name || nftData.name || nftId);
            
            // Mark this NFT as processed
            this.processedNftIds.add(nftId);
            
            // Apply animation
            this.applyPetAnimation(nftElement);
        }
    }
    
    /**
     * Preload animations for performance
     */
    preloadAnimations() {
        // Preload the left animation
        const leftImg = new Image();
        leftImg.onload = () => {
            this.log('[EggManager] Image preloaded successfully');
            this.loadedAnimations.left = leftImg;
        };
        leftImg.onerror = (err) => {
            this.error('[EggManager] Error preloading image:', err);
        };
        
        // Get full path
        const imagePath = this.getAbsoluteResourcePath(this.config.animations.left);
        this.log(`[EggManager] Image path: ${imagePath}`);
        leftImg.src = imagePath;
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
     * Clean up animation for an element
     * @param {HTMLElement} element - The element to clean up
     */
    cleanupAnimation(element) {
        const eggData = this.animatedPets.get(element);
        if (!eggData) return;
        
        // Clear any animation intervals
        if (eggData.animationInterval) {
            clearInterval(eggData.animationInterval);
        }
        
        // Clean up event listeners if any
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
        const container = element.querySelector('.egg-animation-container');
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
     * @param {HTMLElement} element - Element to clean up
     */
    cleanupEventListeners(element) {
        // 移除可能的事件监听器
        if (element.movingStateChangeHandler) {
            document.removeEventListener('pet-moving-state-changed', element.movingStateChangeHandler);
            delete element.movingStateChangeHandler;
        }
        
        if (element.directionChangeHandler) {
            document.removeEventListener('pet-direction-changed', element.directionChangeHandler);
            delete element.directionChangeHandler;
        }
    }
    
    /**
     * Reset processed state, called when NFT collection is completely updated
     */
    resetProcessedState() {
        this.log('[EggManager] Resetting processed state, will recheck all NFTs');
        this.processedNftIds.clear();
        
        // Clean up all existing animations
        const elementsToCleanup = Array.from(this.animatedPets.keys());
        elementsToCleanup.forEach(element => {
            this.cleanupAnimation(element);
        });
    }
}

// Create and initialize the egg manager
const eggManager = new EggManager();

// Report initialization process in more detail
console.log('[INIT] Egg Manager created, calling init()...');

// Use window.onload instead of DOMContentLoaded, ensure all dependencies are loaded
window.addEventListener('load', () => {
    console.log('[INIT] Window loaded, checking required dependencies...');
    
    // Check if dependencies exist
    const dependencies = {
        PetAnimationBase: !!window.PetAnimationBase,
        EggManager: !!window.EggManager,
        SpriteAtlasHelper: !!window.SpriteAtlasHelper
    };
    
    console.log('[INIT] Dependencies check:', dependencies);
    
    if (!dependencies.PetAnimationBase) {
        console.error('[INIT] PetAnimationBase not found! Animation will fail.');
    }
    
    // Initialize
    eggManager.init().then(() => {
        console.log('[INIT] Egg Manager initialization complete');
        
        // Check for eggs after initialization
        if (window.location.href.includes('home.html')) {
            console.log('[INIT] On home page, checking for eggs immediately...');
            eggManager.checkForEggs();
        }
    }).catch(error => {
        console.error('[INIT] Error during egg manager initialization:', error);
    });
});

// Listen for NFT refresh events on the page
window.addEventListener('nftRefreshed', () => {
    if (eggManager.initialized) {
        // When NFTs are refreshed, reset processed state and recheck
        eggManager.resetProcessedState();
        // Delay slightly to ensure DOM has updated
        setTimeout(() => eggManager.checkForEggs(), 500);
    }
});

// Export the egg manager for use in other modules
window.EggManager = eggManager;
