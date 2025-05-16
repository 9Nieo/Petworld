/**
 * Pet animation handling module
 * Handles animations and direction flipping for non-egg pets
 */

// Pet animation manager
class PetAnimationManager {
    constructor() {
        // Track pet elements
        this.pets = new Set();
        
        // Initialization flag
        this.initialized = false;
        
        // Debug mode
        this.debug = false;
    }
    
    /**
     * Initialize the pet animation manager
     */
    init() {
        if (this.initialized) return;
        
        this.log('Initializing pet animation manager');
        
        // Listen for animal creation events
        document.addEventListener('animal-created', this.handleAnimalCreated.bind(this));
        
        // Listen for pet moving state changes
        document.addEventListener('pet-moving-state-changed', this.handleMovingStateChanged.bind(this));
        
        this.initialized = true;
    }
    
    /**
     * Handle animal creation events
     * @param {CustomEvent} event - Animal creation event
     */
    handleAnimalCreated(event) {
        const animalElement = event.detail.element;
        
        // Check if it is an egg - if so, the egg animation system will handle it
        const isEgg = animalElement.classList.contains('egg-nft') || 
                     (animalElement.dataset.name && animalElement.dataset.name.toLowerCase().includes('egg'));
        
        // If it is not an egg, set up pet animation handling
        if (!isEgg) {
            this.setupPetAnimation(animalElement);
        }
    }
    
    /**
     * Handle pet moving state changes
     * @param {CustomEvent} event - Moving state change event
     */
    handleMovingStateChanged(event) {
        const element = event.detail.element;
        const isMoving = event.detail.isMoving;
        
        // Check if it is a non-egg pet
        const isEgg = element.classList.contains('egg-nft') || 
                     (element.dataset.name && element.dataset.name.toLowerCase().includes('egg'));
        
        // If it is not an egg, update its animation state
        if (!isEgg) {
            this.updatePetAnimationState(element, isMoving);
        }
    }
    
    /**
     * Set up animation handling for a pet
     * @param {HTMLElement} element - Pet element
     */
    setupPetAnimation(element) {
        // Add to tracking set
        this.pets.add(element);
        
        // Ensure the pet image loads correctly
        const petImage = element.querySelector('img');
        if (petImage) {
            petImage.addEventListener('load', () => {
                // After the image loads, ensure the direction class is applied correctly
                this.updatePetDirection(element);
            });
        }
        
        this.log(`Setting up pet animation: ${element.dataset.name || 'unnamed pet'}`);
    }
    
    /**
     * Update the pet's animation state
     * @param {HTMLElement} element - Pet element
     * @param {boolean} isMoving - Whether it is moving
     */
    updatePetAnimationState(element, isMoving) {
        // Additional animation effects based on moving state can be added here
    }
    
    /**
     * Update the pet's direction
     * @param {HTMLElement} element - Pet element
     */
    updatePetDirection(element) {
        // Get the direction state from the element
        const isFacingRight = element.classList.contains('facing-right');
        
        // Ensure the image is flipped correctly
        const petImage = element.querySelector('img');
        if (petImage) {
            // Update the image based on direction
            if (isFacingRight) {
                petImage.style.transform = 'scaleX(-1)';
            } else {
                petImage.style.transform = 'scaleX(1)';
            }
        }
    }
    
    /**
     * Remove pet animation handling
     * @param {HTMLElement} element - Pet element
     */
    removePetAnimation(element) {
        // Remove from tracking set
        this.pets.delete(element);
        this.log(`Removing pet animation: ${element.dataset.name || 'unnamed pet'}`);
    }
    
    /**
     * Debug log
     * @param  {...any} args - Log arguments
     */
    log(...args) {
        if (this.debug) {
            console.log('[PetAnimation]', ...args);
        }
    }
}

// Create global instance
const petAnimationManager = new PetAnimationManager();

// Initialize after the page has loaded
document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to ensure the DOM is ready
    setTimeout(() => {
        petAnimationManager.init();
    }, 1000);
});

// Export global instance
window.PetAnimationManager = petAnimationManager; 