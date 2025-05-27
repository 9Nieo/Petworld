/**
 * Pet Size Helper Module
 * Provides intelligent size checking and waiting logic for pet animation managers
 */

const PetSizeHelper = (function() {
    // Debug logging
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[PetSizeHelper]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[PetSizeHelper]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[PetSizeHelper]', ...args);
        }
    };

    /**
     * Wait for element to have dimensions with intelligent retry logic
     * @param {HTMLElement} element - The element to check
     * @param {Object} options - Configuration options
     * @param {number} options.maxAttempts - Maximum number of attempts (default: 10)
     * @param {number} options.initialDelay - Initial delay in ms (default: 100)
     * @param {number} options.maxDelay - Maximum delay in ms (default: 2000)
     * @param {Function} options.onProgress - Progress callback
     * @returns {Promise<boolean>} - Resolves to true if element has dimensions, false if timeout
     */
    async function waitForElementDimensions(element, options = {}) {
        const config = {
            maxAttempts: options.maxAttempts || 10,
            initialDelay: options.initialDelay || 100,
            maxDelay: options.maxDelay || 2000,
            onProgress: options.onProgress || (() => {}),
            ...options
        };

        debug.log(`Waiting for element dimensions, max attempts: ${config.maxAttempts}`);

        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            // Check if element is still in DOM
            if (!element.isConnected) {
                debug.warn('Element is no longer connected to DOM');
                return false;
            }

            // Check dimensions
            const width = element.offsetWidth;
            const height = element.offsetHeight;
            
            debug.log(`Attempt ${attempt}: Element dimensions ${width}x${height}`);

            if (width > 0 && height > 0) {
                debug.log(`Element has dimensions after ${attempt} attempts`);
                return true;
            }

            // Call progress callback
            config.onProgress(attempt, config.maxAttempts, { width, height });

            // Calculate delay with exponential backoff, but cap at maxDelay
            const delay = Math.min(config.initialDelay * Math.pow(1.5, attempt - 1), config.maxDelay);
            
            debug.log(`Waiting ${delay}ms before next attempt...`);
            
            // Use requestAnimationFrame + setTimeout for better timing
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, delay);
                });
            });
        }

        debug.warn(`Element still has zero dimensions after ${config.maxAttempts} attempts`);
        return false;
    }

    /**
     * Apply size to element with fallback logic
     * @param {HTMLElement} element - The element to size
     * @param {string} petType - Type of pet (for PetSizeManager)
     * @param {Object} fallbackSize - Fallback size {width, height}
     * @returns {boolean} - True if sizing was successful
     */
    function applySizeWithFallback(element, petType, fallbackSize = { width: '50px', height: '50px' }) {
        debug.log(`Applying size to ${petType} element`);

        // First try PetSizeManager if available
        if (window.PetSizeManager) {
            try {
                const detectedType = window.PetSizeManager.detectPetType(element) || petType;
                window.PetSizeManager.setSize(element, detectedType);
                
                // Check if PetSizeManager worked
                if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                    debug.log('PetSizeManager successfully applied size');
                    return true;
                }
            } catch (error) {
                debug.warn('PetSizeManager failed:', error);
            }
        }

        // Fallback to manual sizing
        debug.log('Applying fallback size:', fallbackSize);
        element.style.setProperty('width', fallbackSize.width, 'important');
        element.style.setProperty('height', fallbackSize.height, 'important');
        
        // Force a reflow to ensure dimensions are applied
        element.offsetHeight;
        
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    }

    /**
     * Smart animation application with size checking
     * @param {HTMLElement} element - The element to animate
     * @param {string} petType - Type of pet
     * @param {Function} animationCallback - Function to call when ready to animate
     * @param {Object} options - Configuration options
     */
    async function applyAnimationWithSizeCheck(element, petType, animationCallback, options = {}) {
        const config = {
            maxWaitAttempts: 8,
            fallbackSize: { width: '50px', height: '50px' },
            skipSizeCheck: false,
            ...options
        };

        debug.log(`Applying animation to ${petType} element with size check`);

        // Skip size check if requested
        if (config.skipSizeCheck) {
            debug.log('Skipping size check as requested');
            animationCallback(element);
            return;
        }

        // Check current dimensions
        const initialWidth = element.offsetWidth;
        const initialHeight = element.offsetHeight;

        debug.log(`Initial dimensions: ${initialWidth}x${initialHeight}`);

        // If element already has dimensions, apply animation immediately
        if (initialWidth > 0 && initialHeight > 0) {
            debug.log('Element already has dimensions, applying animation immediately');
            animationCallback(element);
            return;
        }

        // Wait for dimensions with progress tracking
        debug.log('Element has zero dimensions, waiting for size...');
        
        const hasSize = await waitForElementDimensions(element, {
            maxAttempts: config.maxWaitAttempts,
            onProgress: (attempt, maxAttempts, dimensions) => {
                debug.log(`Size check progress: ${attempt}/${maxAttempts}, dimensions: ${dimensions.width}x${dimensions.height}`);
            }
        });

        if (hasSize) {
            debug.log('Element now has dimensions, applying animation');
            animationCallback(element);
        } else {
            debug.warn('Element still has zero dimensions, applying fallback size');
            
            const sizeApplied = applySizeWithFallback(element, petType, config.fallbackSize);
            
            if (sizeApplied) {
                debug.log('Fallback size applied successfully, applying animation');
                animationCallback(element);
            } else {
                debug.error('Failed to apply any size to element, animation may not work correctly');
                // Still try to apply animation as last resort
                animationCallback(element);
            }
        }
    }

    /**
     * Check if element needs size assistance
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} - True if element needs size help
     */
    function needsSizeAssistance(element) {
        if (!element || !element.isConnected) {
            return false;
        }

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        
        return width === 0 || height === 0;
    }

    /**
     * Get element size info for debugging
     * @param {HTMLElement} element - The element to inspect
     * @returns {Object} - Size information
     */
    function getElementSizeInfo(element) {
        if (!element) {
            return { error: 'Element is null or undefined' };
        }

        if (!element.isConnected) {
            return { error: 'Element is not connected to DOM' };
        }

        return {
            offsetWidth: element.offsetWidth,
            offsetHeight: element.offsetHeight,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight,
            computedStyle: {
                width: getComputedStyle(element).width,
                height: getComputedStyle(element).height,
                display: getComputedStyle(element).display,
                visibility: getComputedStyle(element).visibility
            },
            boundingRect: element.getBoundingClientRect()
        };
    }

    // Public API
    return {
        waitForElementDimensions,
        applySizeWithFallback,
        applyAnimationWithSizeCheck,
        needsSizeAssistance,
        getElementSizeInfo
    };
})();

// Export to global scope
window.PetSizeHelper = PetSizeHelper;

// Also export for CommonJS environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PetSizeHelper;
}

console.log('[PetSizeHelper] Module loaded and registered globally'); 