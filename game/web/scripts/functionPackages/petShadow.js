/**
 * Pet Shadow Handling System
 * Adds shadow effects to pets and dynamically adjusts the shadow based on the pet's size and action state
 */

// Pet Shadow Manager
class PetShadowManager {
    constructor() {
        // Configuration parameters
        this.config = {
            // Shadow style settings
            shadow: {
                defaultSize: 0.8,       // Default shadow size (relative to the pet's scale)
                minSize: 0.5,           // Minimum shadow size (when jumping)
                maxSize: 1.5,           // Maximum shadow size (when standing)
                opacity: 0.6,           // Shadow opacity
                blur: 2,                // Shadow blur level (px)
                color: 'rgba(0, 0, 0, 0.3)', // Shadow color
                verticalOffset: -10,    // Vertical offset of the shadow from the pet's bottom (px) - negative value to ensure it is close to the bottom
                zIndex: -100             // Shadow's z-index value - set to a very small negative value to ensure it is below all pets
            },
            // Shadow settings for different types of pets
            petTypes: {
                egg: { 
                    ratio: 0.8,         // Ratio of shadow width to pet width
                    jumpEffect: true,   // Whether to apply jump effect
                    shape: 'ellipse'    // Shadow shape: ellipse or rect
                },
                duck: { 
                    ratio: 0.8, 
                    jumpEffect: true,
                    shape: 'ellipse'
                },
                default: { 
                    ratio: 0.8, 
                    jumpEffect: true,
                    shape: 'ellipse'
                }
            }
        };

        // Track pets that have shadows added
        this.shadowedPets = new Map();
        
        // Initialization flag
        this.initialized = false;
        
        // Debug mode
        this.debug = false;
    }
    
    /**
     * Initialize the shadow manager
     */
    init() {
        if (this.initialized) return;
        
        this.log('Initializing Pet Shadow Manager');
        
        // Add shadow styles
        this.injectShadowStyles();
        
        // Listen for scroll and resize events to update shadow positions
        window.addEventListener('scroll', this.updateAllShadows.bind(this));
        window.addEventListener('resize', this.updateAllShadows.bind(this));
        
        this.initialized = true;
    }
    
    /**
     * Inject shadow styles into the page
     */
    injectShadowStyles() {
        // Create style element
        const style = document.createElement('style');
        style.textContent = `
            .pet-shadow {
                position: absolute;
                border-radius: 50%;
                background: ${this.config.shadow.color};
                filter: blur(${this.config.shadow.blur}px);
                opacity: ${this.config.shadow.opacity};
                z-index: ${this.config.shadow.zIndex} !important;
                pointer-events: none;
                bottom: ${this.config.shadow.verticalOffset}px !important;
                display: block !important;
                /* Ensure the shadow is below all pets and does not obscure other pets */
                transform: translateZ(-50px); 
            }
            
            /* Ensure pet elements support 3D transformations so shadows can be positioned correctly */
            .animal {
                transform-style: preserve-3d;
                position: relative;
                z-index: 10;
            }
            
            /* All pet shadows are visible */
            .animal .pet-shadow {
                opacity: ${this.config.shadow.opacity} !important;
                display: block !important;
                z-index: ${this.config.shadow.zIndex} !important;
                transform: translateZ(-50px) !important;
            }
            
            /* Ensure shadows are below the animation container */
            .egg-animation-container, .duck-animation-container, .pet-animation-container {
                z-index: 20;
            }
            
            /* Specifically for different types of pets' shadows, ensuring all pet shadows are at the bottom */
            .animal.duck-nft .pet-shadow,
            .animal.cat-nft .pet-shadow,
            .animal.dog-nft .pet-shadow,
            .animal.egg-nft .pet-shadow {
                z-index: ${this.config.shadow.zIndex} !important;
                transform: translateZ(-50px) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add shadow to a pet
     * @param {HTMLElement} petElement - Pet element
     * @param {Object} options - Shadow options
     */
    addShadow(petElement, options = {}) {
        if (!petElement || !(petElement instanceof HTMLElement)) {
            this.error('Invalid pet element');
            return;
        }
        
        // First remove all existing shadow elements within the element to avoid multiple shadows
        const existingShadows = petElement.querySelectorAll('.pet-shadow');
        existingShadows.forEach(shadow => {
            shadow.parentNode.removeChild(shadow);
        });
        
        // If already in the tracking map, remove from the map first
        if (this.shadowedPets.has(petElement)) {
            this.shadowedPets.delete(petElement);
        }
        
        // Determine pet type
        let petType = 'default';
        if (petElement.classList.contains('egg-nft') || petElement.dataset.type === 'egg') {
            petType = 'egg';
        } else if (petElement.classList.contains('duck-nft') || petElement.dataset.type === 'duck') {
            petType = 'duck';
        } else if (petElement.dataset.type) {
            petType = petElement.dataset.type;
        }
        
        // Merge options
        const petTypeConfig = this.config.petTypes[petType] || this.config.petTypes.default;
        const shadowOptions = {
            ratio: petTypeConfig.ratio,
            jumpEffect: petTypeConfig.jumpEffect,
            shape: petTypeConfig.shape,
            opacity: this.config.shadow.opacity,
            display: true,
            ...options
        };
        
        // Create shadow element
        const shadowElement = document.createElement('div');
        shadowElement.className = 'pet-shadow';
        shadowElement.setAttribute('data-shadow-type', petType);
        
        // Apply custom style options
        if (shadowOptions.opacity !== undefined) {
            shadowElement.style.opacity = shadowOptions.opacity;
        }
        
        if (shadowOptions.display) {
            shadowElement.style.display = 'block';
        }
        
        // Set low z-index to ensure it is below the pet
        shadowElement.style.zIndex = this.config.shadow.zIndex;
        
        // Ensure the pet element has positioning properties so the shadow can be positioned relative to it
        if (window.getComputedStyle(petElement).position === 'static') {
            petElement.style.position = 'relative';
        }
        
        // Add shadow to the pet element
        petElement.insertBefore(shadowElement, petElement.firstChild); // Insert before the first child to ensure it is at the bottom
        
        // Save reference
        this.shadowedPets.set(petElement, shadowElement);
        
        // Calculate and set the initial position and size of the shadow
        this.updateShadow(petElement);
        
        return shadowElement;
    }
    
    /**
     * Update the shadow's direction to match the pet's orientation
     * @param {HTMLElement} petElement - Pet element
     * @param {string} direction - Direction ('left' or 'right')
     */
    updateShadowDirection(petElement, direction) {
        if (!this.shadowedPets.has(petElement)) return;
        
        const shadowElement = this.shadowedPets.get(petElement);
        
        // Set direction attribute for CSS style selector
        shadowElement.setAttribute('data-direction', direction);
        
        // Update shadow position to ensure correct alignment
        this.updateShadow(petElement);
    }
    
    /**
     * Remove the pet's shadow
     * @param {HTMLElement} petElement - Pet element
     */
    removeShadow(petElement) {
        if (this.shadowedPets.has(petElement)) {
            const shadowElement = this.shadowedPets.get(petElement);
            if (shadowElement && shadowElement.parentNode) {
                shadowElement.parentNode.removeChild(shadowElement);
            }
            this.shadowedPets.delete(petElement);
        }
    }
    
    /**
     * Update a single pet's shadow
     * @param {HTMLElement} petElement - Pet element
     */
    updateShadow(petElement) {
        if (!this.shadowedPets.has(petElement)) return;
        
        const shadowElement = this.shadowedPets.get(petElement);
        
        // Get the size and position of the pet element
        const petRect = petElement.getBoundingClientRect();
        
        // Determine pet type
        let petType = 'default';
        if (petElement.classList.contains('egg-nft') || petElement.dataset.type === 'egg') {
            petType = 'egg';
        } else if (petElement.classList.contains('duck-nft') || petElement.dataset.type === 'duck') {
            petType = 'duck';
        } else if (petElement.dataset.type) {
            petType = petElement.dataset.type;
        }
        
        // Get the shadow configuration for that type of pet
        const petTypeConfig = this.config.petTypes[petType] || this.config.petTypes.default;
        
        // Calculate shadow width (based on pet width and type ratio)
        const shadowWidth = petRect.width * petTypeConfig.ratio;
        
        // Set shadow styles
        shadowElement.style.width = `${shadowWidth}px`;
        shadowElement.style.height = `${shadowWidth * 0.4}px`; // Elliptical shadow, height is 40% of width
        
        // Calculate shadow position (horizontally centered)
        shadowElement.style.left = `${(petRect.width - shadowWidth) / 2}px`;
        
        // Ensure the shadow is always at the bottom
        shadowElement.style.bottom = `${this.config.shadow.verticalOffset}px`;
        
        // Force set to absolute positioning
        shadowElement.style.position = 'absolute';
        
        // Set opacity and display properties
        shadowElement.style.opacity = `${this.config.shadow.opacity}`;
        shadowElement.style.display = 'block';
        
        // Set z-index to ensure the shadow is always below the pet
        shadowElement.style.zIndex = `${this.config.shadow.zIndex}`;
        
        // Check if the pet is moving, may need to adjust shadow size
        const isMoving = petElement.classList.contains('pet-moving') || 
                         petElement.classList.contains('egg-moving') || 
                         petElement.classList.contains('duck-moving');
                         
        if (isMoving && petTypeConfig.jumpEffect) {
            // When the pet is moving/jumping, slightly reduce the shadow effect
            shadowElement.style.transform = 'scale(0.9) translateZ(-50px)';
        } else {
            shadowElement.style.transform = 'translateZ(-50px)';
        }
    }
    
    /**
     * Update all pets' shadows
     */
    updateAllShadows() {
        this.shadowedPets.forEach((_, petElement) => {
            this.updateShadow(petElement);
        });
    }
    
    /**
     * Clean up all shadows - completely remove all shadows from the page
     * @param {boolean} preserveTracked - Whether to preserve tracked shadows
     * @returns {number} - Number of shadows removed
     */
    cleanupAllShadows(preserveTracked = false) {
        // Find all shadow elements on the page
        const allShadows = document.querySelectorAll('.pet-shadow');
        let removedCount = 0;
        
        allShadows.forEach(shadow => {
            // If set to preserve tracked shadows, check if it is being tracked
            if (preserveTracked) {
                let isTracked = false;
                this.shadowedPets.forEach((trackedShadow, _) => {
                    if (trackedShadow === shadow) {
                        isTracked = true;
                    }
                });
                
                // If it is tracked, preserve it
                if (isTracked) {
                    return;
                }
            }
            
            // Remove shadow
            if (shadow.parentNode) {
                shadow.parentNode.removeChild(shadow);
                removedCount++;
            }
        });
        
        // If not preserving any shadows, clear the tracking map
        if (!preserveTracked) {
            this.shadowedPets.clear();
        }
        
        this.log(`Cleaned up ${removedCount} shadow elements`);
        return removedCount;
    }
    
    /**
     * Clean up all orphaned shadows (not attached to any element or not in the tracking set)
     */
    cleanupOrphanedShadows() {
        // Find all shadow elements on the page
        const allShadows = document.querySelectorAll('.pet-shadow');
        let removedCount = 0;
        
        allShadows.forEach(shadow => {
            // Check if the parent element is a pet element
            const parentElement = shadow.parentElement;
            if (!parentElement || 
                (!parentElement.classList.contains('animal') && 
                 !parentElement.classList.contains('egg-nft') &&
                 !parentElement.classList.contains('nft-animal') &&
                 !parentElement.classList.contains('duck-nft'))) {
                
                // Remove shadows without a proper parent
                if (shadow.parentNode) {
                    shadow.parentNode.removeChild(shadow);
                    removedCount++;
                    this.log('Removed orphaned shadow element');
                }
                return;
            }
            
            // Check if the shadow is in our tracking set
            let isShadowTracked = false;
            this.shadowedPets.forEach((trackedShadow, pet) => {
                if (trackedShadow === shadow) {
                    isShadowTracked = true;
                    
                    // Check if the parent element is correct
                    if (pet !== parentElement) {
                        // Shadow attached to the wrong element, remove it
                        shadow.parentNode.removeChild(shadow);
                        removedCount++;
                        this.shadowedPets.delete(pet);
                        this.log('Removed shadow attached to the wrong element');
                    }
                }
            });
            
            // If the shadow is not in the tracking set, it is orphaned and should be removed
            if (!isShadowTracked) {
                const parent = shadow.parentNode;
                parent.removeChild(shadow);
                removedCount++;
                this.log(`Removed untracked shadow: from ${parent.dataset.name || parent.dataset.id || 'unknown'}`);
            }
        });
        
        this.log(`Total cleaned up ${removedCount} orphaned shadows`);
        return removedCount;
    }
    
    /**
     * Apply shadow to all matching pet elements
     * @param {string} selector - CSS selector for selecting pet elements to add shadows
     * @param {Object} options - Shadow options
     */
    applyToAll(selector = '.animal, .egg-nft, .duck-nft', options = {}) {
        // First clean up all orphaned shadows
        this.cleanupOrphanedShadows();
        
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            this.addShadow(element, options);
        });
        
        return elements.length;
    }
    
    /**
     * Debug log
     */
    log(...args) {
        if (this.debug) {
            console.log('[PetShadow]', ...args);
        }
    }
    
    /**
     * Error log
     */
    error(...args) {
        console.error('[PetShadow Error]', ...args);
    }
}

// Create global instance
const petShadowManager = new PetShadowManager();

// Initialize after the page has loaded
document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to ensure the DOM is ready
    setTimeout(() => {
        petShadowManager.init();
        
        // Automatically add shadows to existing pets
        const count = petShadowManager.applyToAll();
        if (petShadowManager.debug) {
            console.log(`[PetShadow] Added shadows to ${count} pets`);
        }
    }, 1000);
});

// Listen for changes and automatically add shadows to newly added pets
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    if (node.classList.contains('animal') || 
                        node.classList.contains('egg-nft') ||
                        node.classList.contains('duck-nft') ||
                        node.querySelector('.animal, .egg-nft, .duck-nft')) {
                        
                        // For directly added elements
                        if (node.classList.contains('animal') || 
                            node.classList.contains('egg-nft') || 
                            node.classList.contains('duck-nft')) {
                            setTimeout(() => petShadowManager.addShadow(node), 100);
                        }
                        
                        // For pet elements contained within added elements
                        const petElements = node.querySelectorAll('.animal, .egg-nft, .duck-nft');
                        if (petElements.length > 0) {
                            setTimeout(() => {
                                petElements.forEach(pet => petShadowManager.addShadow(pet));
                            }, 100);
                        }
                    }
                }
            });
        }
    });
});

// Start observing DOM changes
observer.observe(document.body, { childList: true, subtree: true });

// Listen for pet direction change events to update shadow direction as needed
document.addEventListener('pet-direction-changed', (event) => {
    if (event.detail && event.detail.element) {
        const petElement = event.detail.element;
        const direction = event.detail.direction || 'left';
        
        // Update shadow direction
        petShadowManager.updateShadowDirection(petElement, direction);
    }
});

// Export global instance
window.PetShadowManager = petShadowManager; 