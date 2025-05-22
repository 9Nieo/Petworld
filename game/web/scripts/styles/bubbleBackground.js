/**
 * Bubble Background Plugin
 * Creates a dreamy bubble floating background effect
 * Version 1.0.0
 */

class BubbleBackground {
    constructor(options = {}) {
        // Default options
        this.options = {
            bubbleCount: options.bubbleCount || 10,
            colors: options.colors || [
                'rgba(173, 216, 230, 0.5)', // Light blue
                'rgba(189, 195, 255, 0.5)', // Light purple
                'rgba(210, 240, 250, 0.5)', // Light cyan
                'rgba(255, 255, 255, 0.5)'  // White
            ],
            minSize: options.minSize || 10,
            maxSize: options.maxSize || 50,
            minDuration: options.minDuration || 8,
            maxDuration: options.maxDuration || 20,
            bgColor: options.bgColor || 'white',
            zIndex: options.zIndex || -1
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize the bubble background
     */
    init() {
        if (this.initialized) return;
        
        // Add CSS styles
        this._addStyles();
        
        // Create bubbles
        this._createBubbles();
        
        this.initialized = true;
        return this;
    }
    
    /**
     * Add CSS styles to the document
     */
    _addStyles() {
        // Create style element if it doesn't exist
        let styleEl = document.getElementById('bubble-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'bubble-style';
            document.head.appendChild(styleEl);
        }
        
        // CSS styles for bubble background
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
                    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 25%),
                    radial-gradient(circle at 80% 70%, rgba(173, 216, 230, 0.15) 0%, transparent 25%);
                z-index: ${this.options.zIndex};
            }
            
            .bubble {
                position: fixed;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.9);
                pointer-events: none;
                z-index: ${this.options.zIndex};
                animation: float-bubble var(--duration) var(--delay) infinite linear;
                opacity: 0;
                background: radial-gradient(circle at 30% 30%, var(--bubble-color) 0%, rgba(255, 255, 255, 0.2) 90%);
                backdrop-filter: blur(1px);
                -webkit-backdrop-filter: blur(1px);
            }
            
            @keyframes float-bubble {
                0% {
                    transform: translate(var(--start-x), 120vh) scale(0.8);
                    opacity: 0;
                }
                5% {
                    opacity: var(--max-opacity);
                    transform: translate(calc(var(--start-x) + var(--drift-x) * 0.05), calc(120vh - 5vh)) scale(0.85);
                }
                50% {
                    transform: translate(calc(var(--start-x) + var(--drift-x) * 0.5), calc(120vh - 50vh)) scale(1);
                }
                95% {
                    opacity: var(--max-opacity);
                    transform: translate(calc(var(--start-x) + var(--drift-x) * 0.95), calc(120vh - 95vh)) scale(0.85);
                }
                100% {
                    transform: translate(calc(var(--start-x) + var(--drift-x)), -20vh) scale(0.8);
                    opacity: 0;
                }
            }
        `;
        
        styleEl.textContent = css;
    }
    
    /**
     * Create bubbles
     */
    _createBubbles() {
        const { bubbleCount, colors, minSize, maxSize, minDuration, maxDuration } = this.options;
        
        // Add a container for bubbles to improve performance
        const bubbleContainer = document.createElement('div');
        bubbleContainer.id = 'bubble-container';
        bubbleContainer.style.position = 'fixed';
        bubbleContainer.style.top = '0';
        bubbleContainer.style.left = '0';
        bubbleContainer.style.width = '100%';
        bubbleContainer.style.height = '100%';
        bubbleContainer.style.pointerEvents = 'none';
        bubbleContainer.style.zIndex = this.options.zIndex;
        document.body.appendChild(bubbleContainer);
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            
            // Random size between minSize and maxSize
            const size = Math.random() * (maxSize - minSize) + minSize;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            
            // Random position
            const startX = Math.random() * 100; // vw
            bubble.style.setProperty('--start-x', `${startX}vw`);
            
            // Random drift (horizontal movement)
            const driftX = (Math.random() * 30 - 15); // vw, between -15vw and 15vw
            bubble.style.setProperty('--drift-x', `${driftX}vw`);
            
            // Random animation duration and delay
            const duration = Math.random() * (maxDuration - minDuration) + minDuration;
            const delay = Math.random() * -maxDuration; // Negative delay for staggered start
            bubble.style.setProperty('--duration', `${duration}s`);
            bubble.style.setProperty('--delay', `${delay}s`);
            
            // Random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            bubble.style.setProperty('--bubble-color', color);
            
            // Random opacity max value (creates depth effect)
            const maxOpacity = Math.random() * 0.4 + 0.6; // Between 0.6 and 1.0
            bubble.style.setProperty('--max-opacity', maxOpacity);
            
            // Add a subtle pulsing animation for some bubbles
            if (Math.random() > 0.7) { // 30% of bubbles will pulse
                const pulseSpeed = Math.random() * 4 + 3; // Between 3 and 7 seconds
                bubble.style.animation = `float-bubble var(--duration) var(--delay) infinite linear, pulse ${pulseSpeed}s infinite alternate ease-in-out`;
            }
            
            bubbleContainer.appendChild(bubble);
        }
        
        // Add extra pulse animation to style element
        const styleEl = document.getElementById('bubble-style');
        if (styleEl) {
            styleEl.textContent += `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
            `;
        }
    }
    
    /**
     * Remove all bubbles
     */
    destroy() {
        if (!this.initialized) return;
        
        // Remove bubble container
        const bubbleContainer = document.getElementById('bubble-container');
        if (bubbleContainer) {
            document.body.removeChild(bubbleContainer);
        } else {
            // If container not found, try to remove individual bubbles
            const bubbles = document.querySelectorAll('.bubble');
            bubbles.forEach(bubble => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            });
        }
        
        // Remove style
        const styleEl = document.getElementById('bubble-style');
        if (styleEl) {
            document.head.removeChild(styleEl);
        }
        
        this.initialized = false;
    }
}

// Make it globally available
window.BubbleBackground = BubbleBackground; 