/**
 * Sakura Background Plugin
 * Creates a floating cherry blossom background effect
 * Version 1.0.0
 */

class SakuraBackground {
    constructor(options = {}) {
        // Default options
        this.options = {
            petalCount: options.petalCount || 100,
            colors: options.colors || [
                'rgba(255, 183, 197, 0.7)', // Soft pink
                'rgba(255, 192, 203, 0.7)', // Cherry blossom pink
                'rgba(255, 209, 220, 0.7)'  // Light pink
            ],
            minSize: options.minSize || 15,
            maxSize: options.maxSize || 30,
            minDuration: options.minDuration || 5,
            maxDuration: options.maxDuration || 15,
            bgColor: options.bgColor || 'linear-gradient(135deg, #fff5f5 0%, #fff0e6 100%)',
            zIndex: options.zIndex || -1
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize the sakura background
     */
    init() {
        if (this.initialized) return;
        
        // Add CSS styles
        this._addStyles();
        
        // Create petals
        this._createPetals();
        
        this.initialized = true;
        return this;
    }
    
    /**
     * Add CSS styles to the document
     */
    _addStyles() {
        // Create style element if it doesn't exist
        let styleEl = document.getElementById('sakura-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'sakura-style';
            document.head.appendChild(styleEl);
        }
        
        // CSS styles for sakura background
        const css = `
            body {
                background: ${this.options.bgColor};
                position: relative;
                overflow-x: hidden;
            }
            
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    radial-gradient(circle at 20% 30%, rgba(255, 192, 203, 0.1) 0%, transparent 25%),
                    radial-gradient(circle at 80% 70%, rgba(255, 218, 185, 0.1) 0%, transparent 25%);
                z-index: ${this.options.zIndex};
            }
            
            body::after {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 0C40 20 20 30 0 50c20 20 30 40 50 50 20-20 40-30 50-50C80 30 60 20 50 0z" fill="rgba(255, 192, 203, 0.05)" /></svg>');
                background-size: 100px 100px;
                opacity: 0.2;
                z-index: ${this.options.zIndex};
            }
            
            .sakura-petal {
                position: fixed;
                background: transparent;
                pointer-events: none;
                z-index: ${this.options.zIndex};
                animation: sakuraFall 15s infinite linear;
                opacity: 0;
                background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8 6 6 10 2 12c4 2 6 6 10 10 4-4 6-8 10-10-4-2-6-6-10-10z" fill="rgba(255, 183, 197, 0.7)" /></svg>');
                background-repeat: no-repeat;
            }
            
            @keyframes sakuraFall {
                0% {
                    transform: translateY(-30px) translateX(0) rotate(0deg) scale(0.8);
                    opacity: 0;
                }
                10% {
                    opacity: 0.8;
                }
                90% {
                    opacity: 0.8;
                }
                100% {
                    transform: translateY(100vh) translateX(var(--sway-distance)) rotate(360deg) scale(1.2);
                    opacity: 0;
                }
            }
        `;
        
        styleEl.textContent = css;
    }
    
    /**
     * Create sakura petals
     */
    _createPetals() {
        const { petalCount, colors, minSize, maxSize, minDuration, maxDuration } = this.options;
        
        for (let i = 0; i < petalCount; i++) {
            const petal = document.createElement('div');
            petal.classList.add('sakura-petal');
            
            // Random size between minSize and maxSize
            const size = Math.random() * (maxSize - minSize) + minSize;
            petal.style.width = `${size}px`;
            petal.style.height = `${size}px`;
            
            // Position at top with random horizontal position
            petal.style.left = `${Math.random() * 100}vw`;
            petal.style.top = `-30px`; // Start above the viewport
            
            // Random rotation
            const rotation = Math.random() * 360;
            petal.style.transform = `rotate(${rotation}deg)`;
            
            // Random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            petal.style.backgroundImage = petal.style.backgroundImage.replace(/rgba\([^)]+\)/, color);
            
            // Random animation duration and delay
            const duration = Math.random() * (maxDuration - minDuration) + minDuration;
            const delay = Math.random() * 5;
            petal.style.animation = `sakuraFall ${duration}s ${delay}s infinite linear`;
            
            // Random sway effect
            petal.style.setProperty('--sway-distance', `${Math.random() * 200 - 100}px`);
            
            document.body.appendChild(petal);
        }
    }
    
    /**
     * Remove all sakura petals
     */
    destroy() {
        if (!this.initialized) return;
        
        // Remove all petals
        const petals = document.querySelectorAll('.sakura-petal');
        petals.forEach(petal => {
            document.body.removeChild(petal);
        });
        
        // Remove style
        const styleEl = document.getElementById('sakura-style');
        if (styleEl) {
            document.head.removeChild(styleEl);
        }
        
        this.initialized = false;
    }
}

// Make it globally available
window.SakuraBackground = SakuraBackground; 