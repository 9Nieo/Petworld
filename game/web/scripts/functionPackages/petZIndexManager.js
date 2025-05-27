/**
 * Pet Z-Index Manager
 * 
 * This module manages the z-index stacking of pets in the farm to create proper visual layering.
 * Pets with their feet closer to the bottom of the screen (closer to the viewer) will appear in front of pets higher up.
 * The system continuously monitors pet positions and adjusts their z-index accordingly.
 */

class PetZIndexManager {
    constructor() {
        this.config = {
            // General configuration
            enabled: true,         // Whether the system is enabled
            updateInterval: 100,   // How often to update z-indexes (in milliseconds)
            debug: true,          // Enable debug logging
            
            // Z-index range settings
            baseZIndex: 10,        // Base z-index value for pets
            zIndexRange: 90,       // Range of z-index values to use (baseZIndex to baseZIndex + zIndexRange)
            
            // Selectors
            petSelector: '.animal', // Selector for pet elements
            
            // Activation settings
            autoStart: true,       // Whether to automatically start monitoring on init
            
            // Farm container
            containerSelector: '#farm-animals-container', // Selector for the farm container
            
            // Foot detection settings
            footDetectionMethod: 'bottom', // 'bottom', 'visual', or 'offset'
            
            // Pet foot offset percentages (for different pet types)
            // This helps calculate where the "feet" are for different types of pets
            // Values are percentage of pet height from the top of the pet element
            footOffsets: {
                default: 0.95,    // Default: 95% from top (almost at bottom)
                egg: 0.9,         // Eggs are round, so feet are at 90%
                duck: 0.85,       // Duck's feet are a bit higher
                chicken: 0.85,
                cat: 0.85,
                dog: 0.85,
                dragon: 0.8,
                unicorn: 0.85,
                'white tiger': 0.85,
                'white lion': 0.85,
                'black panther': 0.85,
                'moonlit wolf': 0.85
            }
        };

        // State tracking
        this.isRunning = false;      // Whether the system is currently running
        this.updateIntervalId = null; // Interval ID for updates
        this.container = null;       // Reference to the farm container
        this.pets = [];              // Array of tracked pets

        // Initialization
        this.initialized = false;
    }

    /**
     * Initialize the z-index manager
     */
    init() {
        if (this.initialized) return;

        this.log('Initializing Pet Z-Index Manager');

        // Find farm container
        this.container = document.querySelector(this.config.containerSelector);
        if (!this.container) {
            this.error('Could not find farm container with selector:', this.config.containerSelector);
            return;
        }

        // Set up observers to detect new pets
        this.setupObservers();

        // Auto-start if configured
        if (this.config.autoStart) {
            this.start();
        }

        // Initial update to set correct z-indexes for existing pets
        this.updateAllPetZIndexes();

        this.initialized = true;
    }

    /**
     * Set up mutation observers to detect new pets
     */
    setupObservers() {
        // Create mutation observer to watch for new pets
        const observer = new MutationObserver((mutations) => {
            let petsAdded = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes are pets
                    Array.from(mutation.addedNodes).forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches(this.config.petSelector) || node.querySelector(this.config.petSelector)) {
                                petsAdded = true;
                            }
                        }
                    });
                }
            });
            
            // If pets were added, update z-indexes
            if (petsAdded) {
                // this.log('New pets detected, updating z-indexes');
                this.updateAllPetZIndexes();
            }
        });
        
        // Start observing the container
        observer.observe(this.container, { childList: true, subtree: true });
        
        this.log('Pet observers set up');
    }

    /**
     * Start the z-index manager
     */
    start() {
        if (this.isRunning) return;
        
        this.log('Starting Pet Z-Index Manager');
        
        // Set up interval to update z-indexes periodically
        this.updateIntervalId = setInterval(() => {
            this.updateAllPetZIndexes();
        }, this.config.updateInterval);
        
        this.isRunning = true;
    }

    /**
     * Stop the z-index manager
     */
    stop() {
        if (!this.isRunning) return;
        
        this.log('Stopping Pet Z-Index Manager');
        
        // Clear update interval
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        this.isRunning = false;
    }

    /**
     * Get the type of pet from its element
     * @param {HTMLElement} element - The pet element
     * @returns {string} - The detected pet type
     */
    detectPetType(element) {
        // First check for data-type attribute
        if (element.dataset && element.dataset.type) {
            return element.dataset.type.toLowerCase();
        }
        
        // Then check class names
        const classNames = Array.from(element.classList);
        for (const className of classNames) {
            // Check for class names like 'cat-nft', 'dog-nft', etc.
            if (className.endsWith('-nft')) {
                const petType = className.replace('-nft', '');
                return petType;
            }
        }
        
        // Check if name contains a pet type
        if (element.dataset && element.dataset.name) {
            const name = element.dataset.name.toLowerCase();
            for (const type in this.config.footOffsets) {
                if (type !== 'default' && name.includes(type)) {
                    return type;
                }
            }
        }
        
        return 'default';
    }

    /**
     * Calculate the foot position of a pet
     * @param {HTMLElement} element - The pet element
     * @param {DOMRect} rect - The bounding rectangle of the pet
     * @returns {number} - The y-coordinate of the pet's feet
     */
    calculateFootPosition(element, rect) {
        const petType = this.detectPetType(element);
        
        // Get the foot offset percentage for this pet type (or use default)
        const footOffsetPercentage = this.config.footOffsets[petType] || this.config.footOffsets.default;
        
        // Calculate the foot position based on the pet's position and height
        const footPosition = rect.top + (rect.height * footOffsetPercentage);
        
        return footPosition;
    }

    /**
     * Update z-indexes for all pets based on their feet position
     */
    updateAllPetZIndexes() {
        if (!this.container) return;
        
        // Find all pets
        const petElements = this.container.querySelectorAll(this.config.petSelector);
        if (petElements.length === 0) return;
        
        // Get pet positions and store in array
        const petsWithPositions = Array.from(petElements).map(element => {
            const rect = element.getBoundingClientRect();
            
            // Get the foot position for this pet
            const footPosition = this.calculateFootPosition(element, rect);
            
            return { 
                element, 
                rect, 
                footPosition,
                type: this.detectPetType(element)
            };
        });
        
        // Sort by foot position (highest foot position first, which means closest to bottom of screen)
        petsWithPositions.sort((a, b) => b.footPosition - a.footPosition);
        
        // Assign z-indexes based on position
        const { baseZIndex, zIndexRange } = this.config;
        const count = petsWithPositions.length;
        
        petsWithPositions.forEach((pet, index) => {
            // Calculate z-index based on position in sorted array
            // Pets with feet closer to the bottom (beginning of sorted array) get higher z-index
            const zIndex = baseZIndex + Math.floor(zIndexRange * (count - index) / count);
            
            // Only update if z-index has changed
            if (parseInt(pet.element.style.zIndex) !== zIndex) {
                pet.element.style.zIndex = zIndex;
                
                if (this.config.debug && index < 3) {
                    // this.log(`Pet ${pet.type} at foot position ${Math.round(pet.footPosition)} gets z-index ${zIndex}`);
                }
                
                // Make sure the animation container has higher z-index
                this.ensureAnimationContainerZIndex(pet.element, zIndex);
                
                // Make sure shadow has lower z-index
                this.ensureShadowLowerZIndex(pet.element, zIndex);
            }
        });
        
        if (this.config.debug) {
            // this.log(`Updated z-indexes for ${petsWithPositions.length} pets based on foot positions`);
        }
    }

    /**
     * Ensure animation container has a higher z-index than its parent pet
     */
    ensureAnimationContainerZIndex(petElement, parentZIndex) {
        // Find all possible animation containers for different pet types
        const animContainers = petElement.querySelectorAll(
            '.egg-animation-container, .duck-animation-container, .chicken-animation-container, ' +
            '.cat-animation-container, .dog-animation-container, .dragon-animation-container, ' +
            '.unicorn-animation-container, .white-tiger-animation-container, .white-lion-animation-container, ' +
            '.black-panther-animation-container, .moonlit-wolf-animation-container, .pet-animation-container'
        );
        
        animContainers.forEach(container => {
            container.style.zIndex = parentZIndex + 1;
        });
    }

    /**
     * Ensure shadow has lower z-index than its parent pet
     */
    ensureShadowLowerZIndex(petElement, parentZIndex) {
        // Find shadow elements
        const shadows = petElement.querySelectorAll('.pet-shadow');
        
        shadows.forEach(shadow => {
            // Keep shadow z-index as a very negative value to ensure it's below everything
            shadow.style.zIndex = -100;
        });
    }

    /**
     * Apply initial z-index to a new pet
     * @param {HTMLElement} petElement - The pet element to initialize
     */
    initializePet(petElement) {
        if (!petElement || !this.config.enabled) return;
        
        // Set initial z-index based on vertical position
        this.updatePetZIndex(petElement);
    }

    /**
     * Update z-index for a single pet
     * @param {HTMLElement} petElement - The pet element to update
     */
    updatePetZIndex(petElement) {
        if (!petElement || !this.config.enabled) return;
        
        // Get pet position
        const rect = petElement.getBoundingClientRect();
        
        // Calculate foot position
        const footPosition = this.calculateFootPosition(petElement, rect);
        
        // Normalize position within container
        const containerRect = this.container.getBoundingClientRect();
        
        // Normalize foot position relative to container height
        // Pets with feet closer to the bottom of the container get higher z-index values
        const relativeFootPosition = footPosition - containerRect.top;
        const normalizedPosition = relativeFootPosition / containerRect.height;
        const zIndex = this.config.baseZIndex + Math.floor(this.config.zIndexRange * normalizedPosition);
        
        // Apply z-index
        petElement.style.zIndex = zIndex;
        
        // Ensure animation container has higher z-index
        this.ensureAnimationContainerZIndex(petElement, zIndex);
        
        // Ensure shadow has lower z-index
        this.ensureShadowLowerZIndex(petElement, zIndex);
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.config.debug) {
            // console.log('[PetZIndex]', ...args);
        }
    }

    /**
     * Error logging
     */
    error(...args) {
        console.error('[PetZIndex Error]', ...args);
    }
}

// Create global instance
const petZIndexManager = new PetZIndexManager();

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        petZIndexManager.init();
    }, 500);
});

// Export the manager for use in other modules
window.PetZIndexManager = petZIndexManager; 