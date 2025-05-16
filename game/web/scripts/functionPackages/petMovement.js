/**
 * Pet Movement System
 * Handles pet movement, direction, and animations in the farm
 */

// Pet Movement Manager
class PetMovementManager {
    constructor() {
        // Configuration parameters
        this.config = {
            // Movement settings
            movement: {
                minSpeed: 0.2,       // Minimum movement speed (px/frame)
                maxSpeed: 1.0,       // Maximum movement speed (px/frame)
                changeDirectionInterval: {
                    min: 2000,       // Minimum direction change time (ms)
                    max: 10000        // Maximum direction change time (ms)
                },
                pauseInterval: {
                    min: 1000,       // Minimum pause time (ms)
                    max: 10000        // Maximum pause time (ms)
                },
                boundsMargin: 20,    // Boundary detection margin (px)
                randomWalkChance: 0.7, // Probability of random walking
                verticalLimit: 0.6,    // Vertical activity range limit (60% of container height)
                bottomPadding: 0.15   // Bottom padding area (to avoid pets going to the bottom 15% area)
            }
        };

        // Track moving pets
        this.movingPets = new Map();
        
        // Boundary detection container
        this.container = null;
        
        // Animation frame request ID
        this.animationFrameId = null;
        
        // Initialization flag
        this.initialized = false;
        
        // Debug mode
        this.debug = false;
    }
    
    /**
     * Initialize the movement manager
     * @param {HTMLElement} container - The container element for pet movement
     */
    init(container) {
        if (this.initialized) return;
        
        this.log('Initializing Pet Movement Manager');
        
        // Set the container for pet activity
        this.container = container || document.getElementById('farm-animals-container');
        if (!this.container) {
            this.error('Unable to find pet container');
            return;
        }
        
        // Start animation loop
        this.startAnimationLoop();
        
        // Set up boundary change listener
        this.setupResizeObserver();
        
        this.initialized = true;
    }
    
    /**
     * Start the animation loop
     */
    startAnimationLoop() {
        // Stop any existing animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Last frame timestamp
        let lastFrameTime = performance.now();
        
        // Animation loop function
        const animate = (timestamp) => {
            // Calculate time delta (seconds)
            const deltaTime = (timestamp - lastFrameTime) / 1000;
            lastFrameTime = timestamp;
            
            // Update all moving pets
            this.updateMovingPets(deltaTime);
            
            // Continue loop
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        // Start loop
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    /**
     * Set up window size change listener to update active boundaries
     */
    setupResizeObserver() {
        // Use ResizeObserver to listen for container size changes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === this.container) {
                        this.log('Container size changed, updating boundaries');
                        // Update boundary checks for all pets
                        this.movingPets.forEach(pet => {
                            this.updatePetBounds(pet);
                        });
                    }
                }
            });
            
            resizeObserver.observe(this.container);
        } else {
            // Fall back to window resize event
            window.addEventListener('resize', () => {
                this.log('Window size changed, updating boundaries');
                this.movingPets.forEach(pet => {
                    this.updatePetBounds(pet);
                });
            });
        }
    }
    
    /**
     * Enable movement for a pet
     * @param {HTMLElement} element - Pet element
     * @param {Object} options - Movement options
     */
    enableMovement(element, options = {}) {
        if (!element || !(element instanceof HTMLElement)) {
            this.error('Invalid pet element');
            return;
        }
        
        // If already moving, stop first
        if (this.movingPets.has(element)) {
            this.stopMovement(element);
        }
        
        // Ensure element has position:absolute
        const currentPosition = window.getComputedStyle(element).position;
        if (currentPosition !== 'absolute') {
            element.style.position = 'absolute';
        }
        
        // Initialize pet data
        const pet = {
            element: element,
            options: {
                speed: options.speed || this.getRandomSpeed(),
                // Merge custom options with default options
                ...options
            },
            state: {
                position: {
                    x: parseFloat(element.style.left) || 0,
                    y: parseFloat(element.style.top) || 0
                },
                direction: {
                    x: Math.random() > 0.5 ? 1 : -1,
                    y: Math.random() > 0.5 ? 1 : -1
                },
                isMoving: true,
                nextDirectionChange: performance.now() + this.getRandomTime(
                    this.config.movement.changeDirectionInterval.min,
                    this.config.movement.changeDirectionInterval.max
                ),
                bounds: {
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                }
            }
        };
        
        // Initial parse of current position
        this.parseCurrentPosition(pet);
        
        // Update active boundaries
        this.updatePetBounds(pet);
        
        // Add to moving pets list
        this.movingPets.set(element, pet);
        
        // Update initial direction state
        this.updateDirectionState(pet);
        
        this.log(`Enabled pet movement: ${element.dataset.name || 'unnamed pet'}`);
        
        return pet;
    }
    
    /**
     * Stop pet movement
     * @param {HTMLElement} element - Pet element
     */
    stopMovement(element) {
        if (this.movingPets.has(element)) {
            this.movingPets.delete(element);
            this.log(`Stopped pet movement: ${element.dataset.name || 'unnamed pet'}`);
        }
    }
    
    /**
     * Get all currently moving pets
     * @returns {Map} - Map of moving pets
     */
    getMovingPets() {
        return this.movingPets;
    }
    
    /**
     * Stop all pet movements
     */
    stopAllMovements() {
        this.movingPets.clear();
        this.log('Stopped all pet movements');
    }
    
    /**
     * Pause all pet movements
     */
    pauseAllMovements() {
        this.movingPets.forEach(pet => {
            pet.state.isMoving = false;
        });
    }
    
    /**
     * Resume all pet movements
     */
    resumeAllMovements() {
        this.movingPets.forEach(pet => {
            pet.state.isMoving = true;
        });
    }
    
    /**
     * Parse current position of the pet
     * @param {Object} pet - Pet object
     */
    parseCurrentPosition(pet) {
        const element = pet.element;
        
        // Parse current position (supports percentage and pixels)
        let x = element.style.left;
        let y = element.style.top;
        
        // Handle percentage values
        if (x && x.includes('%')) {
            const containerWidth = this.container.offsetWidth;
            x = (parseFloat(x) / 100) * containerWidth;
        } else {
            x = parseFloat(x) || 0;
        }
        
        if (y && y.includes('%')) {
            const containerHeight = this.container.offsetHeight;
            y = (parseFloat(y) / 100) * containerHeight;
        } else {
            y = parseFloat(y) || 0;
        }
        
        // Update pet position state
        pet.state.position.x = x;
        pet.state.position.y = y;
    }
    
    /**
     * Update the active boundaries for the pet
     * @param {Object} pet - Pet object
     */
    updatePetBounds(pet) {
        if (!this.container) return;
        
        const element = pet.element;
        const margin = this.config.movement.boundsMargin;
        
        // Get container and pet dimensions
        const containerRect = this.container.getBoundingClientRect();
        const petWidth = element.offsetWidth;
        const petHeight = element.offsetHeight;
        
        // Calculate vertical limit area - only active in the bottom 60% of the container
        const verticalLimit = this.config.movement.verticalLimit;
        const bottomPadding = this.config.movement.bottomPadding;
        const topBoundary = containerRect.height * (1 - verticalLimit) + margin;
        
        // Calculate bottom boundary - avoid entering the bottom 8% area
        const bottomBoundary = containerRect.height * (1 - bottomPadding) - petHeight - margin;
        
        // Set active boundaries
        pet.state.bounds = {
            top: topBoundary,  // Vertical limit, only active in the bottom 60%
            left: margin,
            right: containerRect.width - petWidth - margin,
            bottom: bottomBoundary  // Avoid entering the bottom 8% area
        };
        
        // Ensure pet position is within the new boundaries
        if (pet.state.position.y < topBoundary) {
            pet.state.position.y = topBoundary + Math.random() * 50; // Randomly distribute within valid area
            pet.element.style.top = `${pet.state.position.y}px`;
        }
        
        // Also check bottom boundary
        if (pet.state.position.y > bottomBoundary) {
            pet.state.position.y = bottomBoundary - Math.random() * 50; // Randomly offset slightly from bottom boundary
            pet.element.style.top = `${pet.state.position.y}px`;
        }
    }
    
    /**
     * Update all moving pets
     * @param {number} deltaTime - Time elapsed (seconds)
     */
    updateMovingPets(deltaTime) {
        // If no container, do not update
        if (!this.container) return;
        
        const now = performance.now();
        
        // Iterate through all moving pets
        this.movingPets.forEach(pet => {
            // Update moving state class
            this.updateMovingClass(pet);
            
            // If pet is not moving, skip
            if (!pet.state.isMoving) return;
            
            // Check if direction needs to change
            if (now >= pet.state.nextDirectionChange) {
                this.changeDirection(pet);
            }
            
            // Move pet
            this.movePet(pet, deltaTime);
            
            // Update direction state (left/right facing)
            this.updateDirectionState(pet);
        });
    }
    
    /**
     * Update the moving state class of the pet
     * @param {Object} pet - Pet object
     */
    updateMovingClass(pet) {
        const element = pet.element;
        const wasMoving = element.classList.contains('pet-moving'); // Save previous moving state
        
        // Add or remove moving class based on pet's moving state
        if (pet.state.isMoving) {
            // Check if it has egg-nft class or name contains egg
            const isEgg = element.classList.contains('egg-nft') || 
                         (element.dataset.name && element.dataset.name.toLowerCase().includes('egg'));
                         
            // Add general moving class
            element.classList.add('pet-moving');
            
            // If it's an egg, add specific egg moving class
            if (isEgg) {
                element.classList.add('egg-moving');
            }
        } else {
            // Remove moving class
            element.classList.remove('pet-moving', 'egg-moving');
        }
        
        // Check if moving state has changed
        const isMovingNow = element.classList.contains('pet-moving');
        if (wasMoving !== isMovingNow) {
            // State has changed, call callback function (if exists)
            if (pet.options && typeof pet.options.onStateChange === 'function') {
                pet.options.onStateChange(isMovingNow);
            }
            
            // Trigger state change event
            const event = new CustomEvent('pet-moving-state-changed', {
                detail: {
                    element: element,
                    isMoving: isMovingNow
                },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Change the pet's movement direction
     * @param {Object} pet - Pet object
     */
    changeDirection(pet) {
        // Randomly decide whether to pause or change direction
        const shouldPause = Math.random() > this.config.movement.randomWalkChance;
        
        if (shouldPause) {
            // Pause movement for a while
            pet.state.isMoving = false;
            
            // Update moving state class (immediately remove moving class)
            this.updateMovingClass(pet);
            
            // Set pause time
            const pauseDuration = this.getRandomTime(
                this.config.movement.pauseInterval.min,
                this.config.movement.pauseInterval.max
            );
            
            // Resume movement after pause
            setTimeout(() => {
                if (this.movingPets.has(pet.element)) {
                    pet.state.isMoving = true;
                    
                    // Update moving state class (restore moving class)
                    this.updateMovingClass(pet);
                    
                    // Set next direction change time
                    pet.state.nextDirectionChange = performance.now() + this.getRandomTime(
                        this.config.movement.changeDirectionInterval.min,
                        this.config.movement.changeDirectionInterval.max
                    );
                    
                    // Change direction
                    pet.state.direction.x = Math.random() > 0.5 ? 1 : -1;
                    pet.state.direction.y = Math.random() > 0.5 ? 1 : -1;
                }
            }, pauseDuration);
        } else {
            // Directly change direction
            pet.state.direction.x = Math.random() > 0.5 ? 1 : -1;
            pet.state.direction.y = Math.random() > 0.5 ? 1 : -1;
            
            // Set next direction change time
            pet.state.nextDirectionChange = performance.now() + this.getRandomTime(
                this.config.movement.changeDirectionInterval.min,
                this.config.movement.changeDirectionInterval.max
            );
        }
    }
    
    /**
     * Move the pet
     * @param {Object} pet - Pet object
     * @param {number} deltaTime - Time elapsed (seconds)
     */
    movePet(pet, deltaTime) {
        const { position, direction, bounds } = pet.state;
        const speed = pet.options.speed || this.getRandomSpeed();
        
        // Calculate new position
        let newX = position.x + direction.x * speed * deltaTime * 60; // Normalize based on 60fps
        let newY = position.y + direction.y * speed * deltaTime * 60;
        
        // Boundary check and bounce
        if (newX <= bounds.left) {
            newX = bounds.left;
            direction.x *= -1; // Reverse
        } else if (newX >= bounds.right) {
            newX = bounds.right;
            direction.x *= -1; // Reverse
        }
        
        if (newY <= bounds.top) {
            newY = bounds.top;
            direction.y *= -1; // Reverse
        } else if (newY >= bounds.bottom) {
            newY = bounds.bottom;
            direction.y *= -1; // Reverse
        }
        
        // Update position
        position.x = newX;
        position.y = newY;
        
        // Update element style
        pet.element.style.left = `${newX}px`;
        pet.element.style.top = `${newY}px`;
    }
    
    /**
     * Update the direction state of the pet (left/right facing)
     * @param {Object} pet - Pet object
     */
    updateDirectionState(pet) {
        // Use X direction to determine facing
        const isFacingRight = pet.state.direction.x > 0;
        
        // First try to find the animation container
        let animContainer = pet.element.querySelector('.egg-animation-container');
        
        // If found, update facing
        if (animContainer) {
            // Right facing needs to flip
            if (isFacingRight) {
                animContainer.style.transform = 'scaleX(-1)';
            } else {
                animContainer.style.transform = 'scaleX(1)';
            }
        }
        
        // Regardless of whether there is an animation container, add facing class to the element
        // This way CSS can apply appropriate styles for different types of pets
        if (isFacingRight) {
            pet.element.classList.add('facing-right');
            pet.element.classList.remove('facing-left');
            
            // Trigger direction change event
            const event = new CustomEvent('pet-direction-changed', {
                detail: {
                    element: pet.element,
                    direction: 'right'
                },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        } else {
            pet.element.classList.add('facing-left');
            pet.element.classList.remove('facing-right');
            
            // Trigger direction change event
            const event = new CustomEvent('pet-direction-changed', {
                detail: {
                    element: pet.element,
                    direction: 'left'
                },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }
        
        // Save current facing state
        pet.state.isFacingRight = isFacingRight;
    }
    
    /**
     * Get random speed value
     * @returns {number} - Random speed
     */
    getRandomSpeed() {
        const { minSpeed, maxSpeed } = this.config.movement;
        return minSpeed + Math.random() * (maxSpeed - minSpeed);
    }
    
    /**
     * Get random time value
     * @param {number} min - Minimum value (ms)
     * @param {number} max - Maximum value (ms)
     * @returns {number} - Random time value (ms)
     */
    getRandomTime(min, max) {
        return min + Math.random() * (max - min);
    }
    
    /**
     * Debug log
     * @param  {...any} args - Log parameters
     */
    log(...args) {
        if (this.debug) {
            console.log('[PetMovement]', ...args);
        }
    }
    
    /**
     * Error log
     * @param  {...any} args - Log parameters
     */
    error(...args) {
        console.error('[PetMovement Error]', ...args);
    }
}

// Create global instance
const petMovementManager = new PetMovementManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to ensure DOM is ready
    setTimeout(() => {
        const farmContainer = document.getElementById('farm-animals-container');
        if (farmContainer) {
            petMovementManager.init(farmContainer);
        }
    }, 1000);
});

// Export global instance
window.PetMovementManager = petMovementManager; 