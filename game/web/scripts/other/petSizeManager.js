/**
 * Pet Size Manager
 * 
 * A utility to manage the sizing of different pets in the game world.
 * This allows for consistent sizing across different components and easy adjustment.
 */

class PetSizeManager {
    constructor() {
        // Default configuration for pet sizes
        this.config = {
            // Scale factors for different pet types (relative to container size)
            scaleFactor: {
                default: 0.08,   // Default scale for unspecified pets
                egg: 0.04,       // Eggs are slightly smaller
                duck: 0.06,     
                chicken: 0.06,   // Chickens
                cat: 0.1,      // Cats
                dog: 0.1,      // Dogs
                dragon: 0.41,    // Dragons are large
                unicorn: 0.3,   // Unicorns
                'white tiger': 0.3,    // Tigers
                'white lion': 0.2,     // Lions
                'black panther': 0.2,    // Panthers
                'moonlit wolf': 0.2,    // Wolves  
            },
            
            // Fixed dimensions for certain pets (if preferred over scaling)
            fixedSize: {
                // Format: petType: { width: value, height: value }
                // Example: duck: { width: 50, height: 60 }
            },
            
            // Position adjustments (to fine-tune pet placement)
            position: {
                // Format: petType: { x: value, y: value }
                // These values are percentage offsets from center
                egg: { x: 0, y: 0 },      // Centered
                duck: { x: 0, y: 0 },     // Centered
            },
            
            // Canvas size multiplier (for higher quality rendering)
            canvasQuality: {
                default: 2,  // 2x the container size for better quality
                egg: 2,
                duck: 2,
                dragon: 3
            }
        };
        
        // Track elements that have had sizing applied
        this.managedElements = new Map();
        
        this.debug = false;
    }
    
    /**
     * Initialize the size manager
     */
    init() {
        this.log('Pet Size Manager initialized');
        return this;
    }
    
    /**
     * Set the size of a pet element based on its type
     * @param {HTMLElement} element - The pet element to size
     * @param {string} petType - The type of pet (egg, duck, etc.)
     * @param {Object} options - Additional options
     * @returns {Object} Applied size data
     */
    setSize(element, petType, options = {}) {
        if (!element) return null;
        
        // Normalize pet type to lowercase
        petType = (petType || '').toLowerCase();
        if (!petType) {
            // Try to detect pet type from element classes or data attributes
            petType = this.detectPetType(element);
        }
        
        this.log(`Setting size for ${petType} pet`);
        
        // Get appropriate scale factor for this pet type
        const scaleFactor = this.getScaleFactor(petType, options);
        
        // Check if there's a fixed size for this pet type
        const fixedSize = this.getFixedSize(petType, options);
        
        // Get position adjustment
        const posAdjust = this.getPositionAdjustment(petType, options);
        
        // Get canvas quality multiplier
        const canvasQuality = this.getCanvasQuality(petType, options);
        
        // Calculate size based on element's parent container or specified dimensions
        let containerWidth, containerHeight;
        
        if (options.containerWidth && options.containerHeight) {
            containerWidth = options.containerWidth;
            containerHeight = options.containerHeight;
        } else {
            // Use parent dimensions if available, otherwise element dimensions
            const parent = element.parentElement;
            containerWidth = parent ? parent.offsetWidth : element.offsetWidth || 100;
            containerHeight = parent ? parent.offsetHeight : element.offsetHeight || 100;
        }
        
        let width, height;
        
        if (fixedSize) {
            // Use fixed size
            width = fixedSize.width;
            height = fixedSize.height;
        } else {
            // Calculate based on scale factor
            // Use the smaller dimension to ensure pet fits within container
            const baseDimension = Math.min(containerWidth, containerHeight);
            width = baseDimension * scaleFactor;
            height = baseDimension * scaleFactor;
        }
        
        // Apply size to element
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        
        // If we need to adjust position
        if (posAdjust && (posAdjust.x !== 0 || posAdjust.y !== 0)) {
            // Make sure element has position set
            const currentPosition = window.getComputedStyle(element).position;
            if (currentPosition === 'static') {
                element.style.position = 'relative';
            }
            
            // Calculate and apply position adjustments
            const xOffset = (containerWidth * posAdjust.x) / 100;
            const yOffset = (containerHeight * posAdjust.y) / 100;
            
            // Apply as transform to avoid affecting layout flow
            element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        }
        
        // Find animation container and canvas if they exist
        const animContainer = element.querySelector(`.${petType}-animation-container`) || 
                              element.querySelector('.pet-animation-container');
                              
        // Apply canvas quality if there's a canvas element
        if (animContainer) {
            const canvas = animContainer.querySelector('canvas');
            if (canvas && canvasQuality > 1) {
                // Set canvas size to be higher quality than display size
                canvas.width = width * canvasQuality;
                canvas.height = height * canvasQuality;
                
                // Keep display size the same as the element
                canvas.style.width = '100%';
                canvas.style.height = '100%';
            }
        }
        
        // Store the sizing info for this element
        const sizeData = {
            element,
            petType,
            width,
            height,
            scaleFactor,
            canvasQuality,
            positionAdjustment: posAdjust,
            timestamp: Date.now()
        };
        
        this.managedElements.set(element, sizeData);
        
        // Return the applied size data
        return sizeData;
    }
    
    /**
     * Get the scale factor for a pet type
     */
    getScaleFactor(petType, options = {}) {
        // Check if override provided in options
        if (options.scaleFactor !== undefined) {
            return options.scaleFactor;
        }
        
        // Use type-specific scale or default
        return this.config.scaleFactor[petType] || this.config.scaleFactor.default;
    }
    
    /**
     * Get fixed size for a pet type if defined
     */
    getFixedSize(petType, options = {}) {
        // Check if override provided in options
        if (options.width !== undefined && options.height !== undefined) {
            return { width: options.width, height: options.height };
        }
        
        // Return pet-specific fixed size or null
        return this.config.fixedSize[petType] || null;
    }
    
    /**
     * Get position adjustment for a pet type
     */
    getPositionAdjustment(petType, options = {}) {
        // Check if override provided in options
        if (options.position !== undefined) {
            return options.position;
        }
        
        // Return pet-specific position adjustment or default (no adjustment)
        return this.config.position[petType] || { x: 0, y: 0 };
    }
    
    /**
     * Get canvas quality multiplier for a pet type
     */
    getCanvasQuality(petType, options = {}) {
        // Check if override provided in options
        if (options.canvasQuality !== undefined) {
            return options.canvasQuality;
        }
        
        // Return pet-specific quality or default
        return this.config.canvasQuality[petType] || this.config.canvasQuality.default;
    }
    
    /**
     * Detect pet type from element
     */
    detectPetType(element) {
        if (!element) return 'default';
        
        // Check data-type attribute
        if (element.dataset.type) {
            return element.dataset.type.toLowerCase();
        }
        
        // Check class names for hyphenated formats (white-tiger-nft)
        const classList = Array.from(element.classList);
        for (const cls of classList) {
            // Look for classes like egg-nft, duck-nft, white-tiger-nft, etc.
            if (cls.endsWith('-nft')) {
                const petType = cls.replace('-nft', '');
                // Convert hyphenated form to spaced form if needed (white-tiger → white tiger)
                if (petType === 'white-tiger') return 'white tiger';
                if (petType === 'white-lion') return 'white lion';
                if (petType === 'black-panther') return 'black panther';
                if (petType === 'moonlit-wolf') return 'moonlit wolf';
                return petType;
            }
        }
        
        // Check element name
        if (element.dataset.name) {
            const name = element.dataset.name.toLowerCase();
            // Check for common pet types in the name
            for (const type in this.config.scaleFactor) {
                if (type !== 'default' && name.includes(type)) {
                    return type;
                }
            }
        }
        
        return 'default';
    }
    
    /**
     * Update the size configuration
     * @param {Object} newConfig - New configuration to merge with existing
     */
    updateConfig(newConfig) {
        if (!newConfig) return;
        
        // Deep merge configs
        this.config = this.mergeConfigs(this.config, newConfig);
        this.log('Configuration updated');
    }
    
    /**
     * Deep merge two configuration objects
     */
    mergeConfigs(target, source) {
        const output = { ...target };
        
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.mergeConfigs(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
        
        // Helper to check if value is an object
        function isObject(item) {
            return (item && typeof item === 'object' && !Array.isArray(item));
        }
    }
    
    /**
     * Apply sizes to all matching pet elements in a container
     * @param {HTMLElement} container - The container to search in (default: document)
     */
    applyToAll(container = document) {
        const petElements = container.querySelectorAll('.animal, .egg-nft, .duck-nft, [data-type]');
        
        this.log(`Found ${petElements.length} pet elements to size`);
        
        petElements.forEach(element => {
            const petType = this.detectPetType(element);
            this.setSize(element, petType);
        });
    }
    
    /**
     * Update a specific pet type's scale factor
     * @param {string} petType - The type of pet to update
     * @param {number} scaleFactor - New scale factor value
     */
    setPetTypeScale(petType, scaleFactor) {
        if (!petType || typeof scaleFactor !== 'number') return;
        
        petType = petType.toLowerCase();
        this.config.scaleFactor[petType] = scaleFactor;
        
        // Update any existing elements of this type
        this.managedElements.forEach((data, element) => {
            if (data.petType === petType && element.isConnected) {
                this.setSize(element, petType);
            }
        });
    }
    
    /**
     * Clean up disconnected elements from tracking
     */
    cleanup() {
        const elementsToRemove = [];
        
        this.managedElements.forEach((data, element) => {
            if (!element.isConnected) {
                elementsToRemove.push(element);
            }
        });
        
        elementsToRemove.forEach(element => {
            this.managedElements.delete(element);
        });
        
        this.log(`Cleaned up ${elementsToRemove.length} disconnected elements`);
    }
    
    /**
     * Debug logging helper
     */
    log(...args) {
        if (this.debug) {
            console.log('[PetSizeManager]', ...args);
        }
    }
}

// Create and initialize singleton instance
const petSizeManager = new PetSizeManager().init();

// Export to global window for use in other modules
window.PetSizeManager = petSizeManager; 