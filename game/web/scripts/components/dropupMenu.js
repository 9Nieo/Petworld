/**
 * Dropup menu component
 * Provides a customizable pop-up menu that appears from the bottom
 * @version 1.0.0
 */

class DropupMenu {
    /**
     * Creates a new dropup menu
     * @param {Object} options - Configuration options
     * @param {string} options.triggerButtonId - ID of the trigger button
     * @param {Array} options.menuItems - Array of menu items, each containing {id, icon, text, action, disabled}
     * @param {string} options.positionClass - Positioning class name, default is 'bottom-right'
     * @param {Object} options.i18n - Internationalization instance, optional
     */
    constructor(options) {
        this.options = Object.assign({
            triggerButtonId: 'moreButton',
            menuItems: [],
            positionClass: 'bottom-right',
            i18n: null,
            zIndex: 1000
        }, options);

        this.menuVisible = false;
        this.menuElem = null;
        this.backdropElem = null;
        this.triggerButton = document.getElementById(this.options.triggerButtonId);

        if (!this.triggerButton) {
            console.error(`[DropupMenu] Trigger button with ID "${this.options.triggerButtonId}" not found`);
            return;
        }

        this.init();
    }

    /**
     * Initialize the menu
     */
    init() {
        // Create menu elements
        this.createMenu();
        
        // Bind click event to trigger button
        this.triggerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.menuVisible && !this.menuElem.contains(e.target) && e.target !== this.triggerButton) {
                this.hideMenu();
            }
        });

        // Close menu with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuVisible) {
                this.hideMenu();
            }
        });
    }

    /**
     * Create menu DOM elements
     */
    createMenu() {
        // Create menu container
        this.menuElem = document.createElement('div');
        this.menuElem.className = `dropup-menu`;
        this.menuElem.style.display = 'none';
        this.menuElem.style.zIndex = this.options.zIndex;
        
        // Directly set background color to semi-transparent white
        this.menuElem.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; 
        this.menuElem.style.backdropFilter = 'blur(10px)';

        // Create menu item list
        const menuList = document.createElement('ul');
        menuList.className = 'dropup-menu-list';

        // Add menu items
        this.options.menuItems.forEach(item => {
            const menuItem = document.createElement('li');
            menuItem.className = 'dropup-menu-item';
            if (item.disabled) {
                menuItem.classList.add('disabled');
            }

            // Create menu item content
            const itemContent = document.createElement('button');
            itemContent.className = 'dropup-menu-button';
            
            // Add icon
            if (item.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'dropup-menu-icon';
                
                // Check if it's an emoji or HTML content
                if (item.icon.startsWith('<') && item.icon.endsWith('>')) {
                    iconSpan.innerHTML = item.icon;
                } else {
                    iconSpan.textContent = item.icon;
                }
                
                itemContent.appendChild(iconSpan);
            }
            
            // Add text
            const textSpan = document.createElement('span');
            textSpan.className = 'dropup-menu-text';
            
            // Check if internationalization is needed
            if (this.options.i18n && item.i18nKey) {
                textSpan.textContent = this.options.i18n.t(item.i18nKey) || item.text;
                // Add i18n attribute for future updates
                textSpan.setAttribute('data-i18n', item.i18nKey);
            } else {
                textSpan.textContent = item.text;
            }
            
            itemContent.appendChild(textSpan);
            menuItem.appendChild(itemContent);
            
            // Bind click event
            if (!item.disabled && typeof item.action === 'function') {
                itemContent.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Execute action
                    item.action(item);
                    
                    // Close menu
                    this.hideMenu();
                });
            }
            
            menuList.appendChild(menuItem);
        });

        this.menuElem.appendChild(menuList);

        // Create backdrop
        this.backdropElem = document.createElement('div');
        this.backdropElem.className = 'dropup-menu-backdrop';
        this.backdropElem.style.display = 'none';
        this.backdropElem.style.zIndex = this.options.zIndex - 1;
        
        // Close menu when clicking backdrop
        this.backdropElem.addEventListener('click', () => {
            this.hideMenu();
        });

        // Add menu and backdrop to document
        document.body.appendChild(this.backdropElem);
        document.body.appendChild(this.menuElem);

        // Add CSS styles
        this.addStyles();
    }

    /**
     * Add menu styles
     */
    addStyles() {
        // Check if styles already exist
        if (document.getElementById('dropup-menu-styles')) {
            return;
        }

        // Create style tag
        const styleElem = document.createElement('style');
        styleElem.id = 'dropup-menu-styles';
        
        // Menu styles
        styleElem.textContent = `
            .dropup-menu {
                position: fixed;
                border-radius: 12px;
                background-color: rgba(255, 255, 255, 0.8); 
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                width: 240px;
                max-height: 80vh;
                overflow-y: auto;
                transform-origin: bottom center;
                animation: dropup-menu-in 0.25s ease forwards;
            }
            
            .dropup-menu-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0,0,0,0.5);
                animation: dropup-backdrop-in 0.25s ease forwards;
            }
            
            .dropup-menu-list {
                list-style: none;
                padding: 8px 0;
                margin: 0;
            }
            
            .dropup-menu-item {
                padding: 0;
                margin: 0;
            }
            
            .dropup-menu-button {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: none;
                text-align: left;
                cursor: pointer;
                font-size: 16px;
                color: #333; /* Dark text color */
                transition: background-color 0.2s;
            }
            
            .dropup-menu-button:hover {
                background-color: rgba(0,0,0,0.05);
            }
            
            .dropup-menu-button:active {
                background-color: rgba(0,0,0,0.1);
            }
            
            .dropup-menu-icon {
                margin-right: 12px;
                font-size: 20px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333; /* Dark icon color */
            }
            
            .dropup-menu-item.disabled .dropup-menu-button {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .dropup-menu-item.disabled .dropup-menu-button:hover {
                background-color: transparent;
            }
            
            @keyframes dropup-menu-in {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes dropup-backdrop-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            
            @keyframes dropup-menu-out {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }
            
            @keyframes dropup-backdrop-out {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
            
            /* Dark theme support */
            @media (prefers-color-scheme: dark) {
                .dropup-menu {
                    background-color: rgba(45, 45, 45, 0.9); 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }
                
                .dropup-menu-button {
                    color: #eee;
                }
                
                .dropup-menu-button:hover {
                    background-color: rgba(255,255,255,0.1);
                }
                
                .dropup-menu-button:active {
                    background-color: rgba(255,255,255,0.15);
                }
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .dropup-menu {
                    width: calc(100% - 30px);
                    max-width: 240px;
                }
            }
        `;
        
        // Add to document head
        document.head.appendChild(styleElem);
    }

    /**
     * Show/hide menu
     */
    toggleMenu() {
        if (this.menuVisible) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }

    /**
     * Show menu
     */
    showMenu() {
        this.menuElem.style.display = 'block';
        this.backdropElem.style.display = 'block';
        
        // Dynamically calculate button position to center the menu above the button
        const buttonRect = this.triggerButton.getBoundingClientRect();
        const menuWidth = this.menuElem.offsetWidth;
        
        // Calculate left position to center the menu horizontally
        let leftPosition = buttonRect.left + (buttonRect.width / 2) - (menuWidth / 2);
        
        // Ensure menu does not exceed screen boundaries
        const rightEdge = leftPosition + menuWidth;
        if (rightEdge > window.innerWidth) {
            leftPosition = window.innerWidth - menuWidth - 10; // 10px for padding
        }
        if (leftPosition < 10) {
            leftPosition = 10; // 10px minimum margin from left
        }
        
        // Set position
        this.menuElem.style.left = `${leftPosition}px`;
        this.menuElem.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`; // 10px gap above button
        
        this.menuVisible = true;
        
        // Trigger reflow, then add transition effect
        setTimeout(() => {
            this.menuElem.style.animation = 'dropup-menu-in 0.25s ease forwards';
            this.backdropElem.style.animation = 'dropup-backdrop-in 0.25s ease forwards';
        }, 10);
        
        // Trigger custom event
        this.triggerButton.dispatchEvent(new CustomEvent('dropupMenuShown'));
    }

    /**
     * Hide menu
     */
    hideMenu() {
        this.menuElem.style.animation = 'dropup-menu-out 0.2s ease forwards';
        this.backdropElem.style.animation = 'dropup-backdrop-out 0.2s ease forwards';
        
        // Hide elements after animation ends
        setTimeout(() => {
            this.menuElem.style.display = 'none';
            this.backdropElem.style.display = 'none';
            this.menuVisible = false;
        }, 200);
        
        // Trigger custom event
        this.triggerButton.dispatchEvent(new CustomEvent('dropupMenuHidden'));
    }

    /**
     * Update menu items
     * @param {Array} menuItems - New array of menu items
     */
    updateMenuItems(menuItems) {
        this.options.menuItems = menuItems;
        
        // Remove old menu
        if (this.menuElem) {
            document.body.removeChild(this.menuElem);
            document.body.removeChild(this.backdropElem);
        }
        
        // Recreate menu
        this.createMenu();
    }

    /**
     * Set menu item enabled/disabled state
     * @param {string} itemId - Menu item ID
     * @param {boolean} disabled - Whether to disable
     */
    setItemDisabled(itemId, disabled) {
        const menuItemIndex = this.options.menuItems.findIndex(item => item.id === itemId);
        
        if (menuItemIndex !== -1) {
            this.options.menuItems[menuItemIndex].disabled = disabled;
            
            // Update DOM
            const menuItems = this.menuElem.querySelectorAll('.dropup-menu-item');
            if (menuItems[menuItemIndex]) {
                if (disabled) {
                    menuItems[menuItemIndex].classList.add('disabled');
                } else {
                    menuItems[menuItemIndex].classList.remove('disabled');
                }
            }
        }
    }

    /**
     * Internationalization update
     * Update the texts in the menu to the current language
     */
    updateI18n() {
        if (!this.options.i18n) return;
        
        const textElements = this.menuElem.querySelectorAll('[data-i18n]');
        textElements.forEach(elem => {
            const key = elem.getAttribute('data-i18n');
            const translation = this.options.i18n.t(key);
            if (translation) {
                elem.textContent = translation;
            }
        });
    }

    /**
     * Destroy component, remove event listeners and DOM elements
     */
    destroy() {
        if (this.menuElem) {
            document.body.removeChild(this.menuElem);
        }
        
        if (this.backdropElem) {
            document.body.removeChild(this.backdropElem);
        }
        
        // Unbind trigger button event
        if (this.triggerButton) {
            this.triggerButton.removeEventListener('click', this.toggleMenu);
        }
    }
}

// Export component for page use
window.DropupMenu = DropupMenu; 