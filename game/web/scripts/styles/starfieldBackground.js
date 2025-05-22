/**
 * Starfield Background Plugin
 * Creates an immersive space-themed starfield animation with particles
 * Version 1.0.0
 */

class StarfieldBackground {
    constructor(options = {}) {
        // Default options
        this.options = {
            starCount: options.starCount || 150,
            colors: options.colors || [
                'rgba(255, 255, 255, 0.8)',   // White stars
                'rgba(135, 206, 250, 0.8)',   // Light blue stars
                'rgba(238, 130, 238, 0.7)',   // Violet stars
                'rgba(255, 215, 0, 0.6)'      // Gold stars
            ],
            shootingStarChance: options.shootingStarChance || 0.2, // 20% chance of shooting stars
            minSize: options.minSize || 1,
            maxSize: options.maxSize || 4,
            minSpeed: options.minSpeed || 0.1,
            maxSpeed: options.maxSpeed || 1,
            bgColor: options.bgColor || 'linear-gradient(to bottom, #000000, #101035, #191970)',
            zIndex: options.zIndex || -1,
            nebulae: options.nebulae !== undefined ? options.nebulae : true, // Colorful nebulae in background
            pulse: options.pulse !== undefined ? options.pulse : true,        // Pulsing stars
            interactive: options.interactive !== undefined ? options.interactive : true // Mouse interaction
        };
        
        this.initialized = false;
        this.animationFrameId = null;
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
        this.time = 0;
        this.mouse = { x: 0, y: 0, active: false };
        this.mouseRadius = 100; // Radius of mouse influence
    }
    
    /**
     * Initialize the starfield background
     */
    init() {
        if (this.initialized) return this;
        
        // Add CSS styles for body background
        this._addBodyStyles();
        
        // Create and setup canvas
        this._createCanvas();
        
        // Initialize stars
        this._initStars();
        
        // Setup mouse interaction
        if (this.options.interactive) {
            this._setupMouseInteraction();
        }
        
        // Start animation
        this._animate();
        
        this.initialized = true;
        return this;
    }
    
    /**
     * Add CSS styles to the document
     */
    _addBodyStyles() {
        // Create style element if it doesn't exist
        let styleEl = document.getElementById('starfield-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'starfield-style';
            document.head.appendChild(styleEl);
        }
        
        // CSS styles for starfield background
        const css = `
            body {
                background: ${this.options.bgColor};
                position: relative;
                overflow-x: hidden;
            }
            
            .starfield-canvas {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: ${this.options.zIndex};
                pointer-events: none;
            }
            
            /* Add nebulae if enabled */
            ${this.options.nebulae ? `
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    radial-gradient(circle at 20% 30%, rgba(76, 0, 153, 0.15) 0%, transparent 40%),
                    radial-gradient(circle at 80% 70%, rgba(102, 45, 140, 0.1) 0%, transparent 30%),
                    radial-gradient(circle at 40% 80%, rgba(0, 128, 128, 0.1) 0%, transparent 40%);
                z-index: ${this.options.zIndex - 1};
            }
            ` : ''}
        `;
        
        styleEl.textContent = css;
    }
    
    /**
     * Create canvas element
     */
    _createCanvas() {
        // Create canvas if it doesn't exist
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'starfield-canvas';
        document.body.appendChild(this.canvas);
        
        // Set canvas size
        this._resizeCanvas();
        
        // Get context
        this.ctx = this.canvas.getContext('2d');
        
        // Handle window resize
        window.addEventListener('resize', () => this._resizeCanvas());
    }
    
    /**
     * Setup mouse interaction events
     */
    _setupMouseInteraction() {
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
            
            // Create a ripple effect at mouse position
            this._createRipple(e.clientX, e.clientY);
        });
        
        // Track touch movement for mobile
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
                this.mouse.active = true;
                
                // Create a ripple effect at touch position
                this._createRipple(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
        
        // Reset mouse active state when not moving
        document.addEventListener('mouseleave', () => {
            this.mouse.active = false;
        });
        
        // Reset mouse active state when touch ends
        document.addEventListener('touchend', () => {
            this.mouse.active = false;
        });
        
        // Create shooting star on click
        document.addEventListener('click', (e) => {
            this._createShootingStarAt(e.clientX, e.clientY);
        });
        
        // Create shooting star on tap (mobile)
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this._createShootingStarAt(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
    }
    
    /**
     * Create a ripple effect at specified position
     */
    _createRipple(x, y) {
        // Only create a ripple occasionally
        if (Math.random() > 0.1) return;
        
        // Add a ripple to the stars array
        this.stars.push({
            x: x,
            y: y,
            size: 0,
            color: 'rgba(255, 255, 255, 0.4)',
            isRipple: true,
            maxSize: Math.random() * 50 + 30,
            speed: Math.random() * 2 + 1,
            pulseRate: 0,
            pulseOffset: 0,
        });
    }
    
    /**
     * Create a shooting star at specified position
     */
    _createShootingStarAt(x, y) {
        // Random angle (but mostly downward)
        const angle = Math.random() * Math.PI + Math.PI / 2;
        
        // Add a shooting star to the stars array
        this.stars.push({
            x: x,
            y: y,
            size: Math.random() * 2 + 2,
            color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
            speed: Math.random() * 3 + 3,
            pulseRate: Math.random() * 0.1 + 0.05,
            pulseOffset: Math.random() * Math.PI * 2,
            isShooting: true,
            tail: Math.random() * 150 + 100, // Longer tail for user-created shooting stars
            angle: angle,
            userCreated: true // Flag for user-created shooting stars
        });
    }
    
    /**
     * Resize canvas to window size
     */
    _resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reinitialize stars when resizing
        if (this.initialized) {
            this._initStars();
        }
    }
    
    /**
     * Initialize stars
     */
    _initStars() {
        const { starCount, colors, minSize, maxSize, minSpeed, maxSpeed, shootingStarChance } = this.options;
        this.stars = [];
        
        for (let i = 0; i < starCount; i++) {
            // Create star with random properties
            const star = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * (maxSize - minSize) + minSize,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
                pulseRate: Math.random() * 0.1 + 0.05,
                pulseOffset: Math.random() * Math.PI * 2,
                isShooting: Math.random() < shootingStarChance,
                tail: Math.random() * 80 + 50, // Shooting star tail length
                angle: Math.random() * Math.PI * 2, // Random angle for shooting stars
                // Add properties for mouse interaction
                originalX: 0,
                originalY: 0,
                vx: 0,
                vy: 0
            };
            
            // Store original position for mouse interaction
            star.originalX = star.x;
            star.originalY = star.y;
            
            this.stars.push(star);
        }
    }
    
    /**
     * Animation loop
     */
    _animate() {
        if (!this.initialized) return;
        
        this.time += 0.01;
        
        this._drawStars();
        
        this.animationFrameId = requestAnimationFrame(() => this._animate());
    }
    
    /**
     * Draw stars on canvas
     */
    _drawStars() {
        const { pulse, interactive } = this.options;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars and handle removal
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            
            // Handle ripple animation
            if (star.isRipple) {
                this._updateRipple(star, i);
                continue;
            }
            
            // Handle mouse interaction
            if (interactive && this.mouse.active && !star.isShooting) {
                this._handleMouseInteraction(star);
            } else {
                // Slowly return to original position when mouse is inactive
                if (!star.isShooting && !star.userCreated) {
                    star.x += (star.originalX - star.x) * 0.02;
                    star.y += (star.originalY - star.y) * 0.02;
                }
            }
            
            // Set star opacity based on pulse option
            const pulseEffect = pulse ? 
                0.3 * Math.sin(this.time + star.pulseOffset) + 0.7 : 
                1;
            
            if (star.isShooting) {
                // Draw shooting star
                this._drawShootingStar(star, pulseEffect);
                
                // Move shooting star
                if (star.userCreated) {
                    // User-created shooting stars move faster
                    star.x += Math.cos(star.angle) * star.speed * 2;
                    star.y += Math.sin(star.angle) * star.speed * 2;
                } else {
                    // Regular shooting stars follow general movement
                    star.y += star.speed;
                }
                
                // Remove shooting star if it goes off screen
                if (star.x < -100 || star.x > this.canvas.width + 100 || 
                    star.y < -100 || star.y > this.canvas.height + 100) {
                    // Remove this star and create a new one
                    this.stars.splice(i, 1);
                    i--;
                    
                    if (!star.userCreated) {
                        // Only replace non-user created stars
                        this._addNewStar();
                    }
                }
            } else {
                // Draw regular star
                this._drawStar(star, pulseEffect);
                
                // Move the star
                star.y += star.speed;
                
                // If star goes off screen, reset position
                if (star.y > this.canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * this.canvas.width;
                    star.originalX = star.x;
                    star.originalY = star.y;
                    // 5% chance to become a shooting star when resetting
                    star.isShooting = Math.random() < 0.05;
                }
            }
        }
    }
    
    /**
     * Add a new star to replace removed ones
     */
    _addNewStar() {
        const { colors, minSize, maxSize, minSpeed, maxSpeed } = this.options;
        
        const star = {
            x: Math.random() * this.canvas.width,
            y: 0, // Start at top
            size: Math.random() * (maxSize - minSize) + minSize,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
            pulseRate: Math.random() * 0.1 + 0.05,
            pulseOffset: Math.random() * Math.PI * 2,
            isShooting: Math.random() < 0.05, // 5% chance to be a shooting star
            tail: Math.random() * 80 + 50,
            angle: Math.random() * Math.PI * 2,
            originalX: 0,
            originalY: 0,
            vx: 0,
            vy: 0
        };
        
        // Store original position
        star.originalX = star.x;
        star.originalY = star.y;
        
        this.stars.push(star);
    }
    
    /**
     * Handle mouse interaction with stars
     */
    _handleMouseInteraction(star) {
        const dx = this.mouse.x - star.x;
        const dy = this.mouse.y - star.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Only interact with stars within mouseRadius
        if (dist < this.mouseRadius) {
            // Create gravitational effect - closer stars are affected more
            const force = (this.mouseRadius - dist) / this.mouseRadius;
            const angle = Math.atan2(dy, dx);
            
            // Different effects based on star size
            if (star.size < 2) {
                // Smaller stars are attracted to mouse
                star.x += Math.cos(angle) * force * 2;
                star.y += Math.sin(angle) * force * 2;
            } else {
                // Larger stars are repelled from mouse
                star.x -= Math.cos(angle) * force * 3;
                star.y -= Math.sin(angle) * force * 3;
            }
        }
    }
    
    /**
     * Update and draw ripple effect
     */
    _updateRipple(ripple, index) {
        // Increase size until maximum
        ripple.size += ripple.speed;
        
        // Draw ripple
        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, ripple.size, 0, Math.PI * 2);
        this.ctx.strokeStyle = ripple.color.replace(/[\d.]+\)$/g, `${(1 - ripple.size / ripple.maxSize)})`);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Remove ripple when it reaches max size
        if (ripple.size >= ripple.maxSize) {
            this.stars.splice(index, 1);
        }
    }
    
    /**
     * Draw a regular star
     */
    _drawStar(star, pulseEffect) {
        const { x, y, size, color } = star;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * pulseEffect, 0, Math.PI * 2);
        this.ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${pulseEffect})`);
        this.ctx.fill();
        
        // Add glow effect for larger stars
        if (size > 2) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 2 * pulseEffect, 0, Math.PI * 2);
            this.ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${0.1 * pulseEffect})`);
            this.ctx.fill();
        }
    }
    
    /**
     * Draw a shooting star
     */
    _drawShootingStar(star, pulseEffect) {
        const { x, y, size, color, tail, angle, userCreated } = star;
        
        // Calculate tail end point
        const tailX = x - Math.cos(angle) * tail;
        const tailY = y - Math.sin(angle) * tail;
        
        // Create gradient for tail
        const gradient = this.ctx.createLinearGradient(x, y, tailX, tailY);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        // Draw tail
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(tailX, tailY);
        this.ctx.lineWidth = size * pulseEffect * (userCreated ? 1.5 : 1); // Thicker tail for user-created stars
        this.ctx.strokeStyle = gradient;
        this.ctx.stroke();
        
        // Draw star head
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 1.5 * pulseEffect, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Add glow effect for user-created shooting stars
        if (userCreated) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 4 * pulseEffect, 0, Math.PI * 2);
            this.ctx.fillStyle = color.replace(/[\d.]+\)$/g, '0.2)');
            this.ctx.fill();
        }
    }
    
    /**
     * Remove all starfield elements
     */
    destroy() {
        if (!this.initialized) return;
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        if (this.options.interactive) {
            document.removeEventListener('mousemove', this._handleMouseMove);
            document.removeEventListener('touchmove', this._handleTouchMove);
            document.removeEventListener('mouseleave', this._handleMouseLeave);
            document.removeEventListener('touchend', this._handleTouchEnd);
            document.removeEventListener('click', this._handleClick);
            document.removeEventListener('touchstart', this._handleTouchStart);
        }
        
        // Remove canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
            this.ctx = null;
        }
        
        // Remove style
        const styleEl = document.getElementById('starfield-style');
        if (styleEl) {
            document.head.removeChild(styleEl);
        }
        
        this.initialized = false;
    }
}

// Make it globally available
window.StarfieldBackground = StarfieldBackground; 