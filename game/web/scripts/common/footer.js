/**
 * Common footer component
 * Provides a consistent footer for all pages in normal mode
 */
window.CommonFooter = (function() {
    // Footer HTML template
    const footerTemplate = `
        <p data-i18n="common.copyright">&copy; 2025 PetWorld - All Rights Reserved</p>
        <div class="footer-links">
            <a href="https://x.com/petworldfun" target="_blank">
                <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
            </a>
            <a href="https://github.com/9Nieo/Petworld" target="_blank">
                <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                GitHub
            </a>
            <a href="https://www.petworldfun.com/" target="_blank">
                <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M19.5,12c0,0.5-0.3,0.9-0.8,1.1l-2.9,1.4c-0.2,0.1-0.3,0.3-0.3,0.5v2.9c0,0.5-0.3,0.9-0.8,1.1c-0.5,0.2-1.1,0.1-1.5-0.3l-2.1-2.1c-0.2-0.2-0.5-0.2-0.7,0l-2.1,2.1c-0.4,0.4-1,0.5-1.5,0.3c-0.5-0.2-0.8-0.6-0.8-1.1v-2.9c0-0.2-0.1-0.4-0.3-0.5l-2.9-1.4c-0.5-0.2-0.8-0.6-0.8-1.1c0-0.5,0.3-0.9,0.8-1.1l2.9-1.4c0.2-0.1,0.3-0.3,0.3-0.5V6.1c0-0.5,0.3-0.9,0.8-1.1c0.5-0.2,1.1-0.1,1.5,0.3l2.1,2.1c0.2,0.2,0.5,0.2,0.7,0l2.1-2.1c0.4-0.4,1-0.5,1.5-0.3c0.5,0.2,0.8,0.6,0.8,1.1v2.9c0,0.2,0.1,0.4,0.3,0.5l2.9,1.4C19.2,11.1,19.5,11.5,19.5,12z"/>
                </svg>
                Website
            </a>
        </div>
    `;
    
    // Initialization flag
    let isInitialized = false;
    
    /**
     * Initialize the footer
     * @param {string} selector - Footer container selector, defaults to '.app-footer'
     */
    function init(selector = '.app-footer') {
        const footerElement = document.querySelector(selector);
        if (!footerElement) {
            console.error('Footer container element not found:', selector);
            return;
        }
        
        // Set footer content
        footerElement.innerHTML = footerTemplate;
        
        // If i18n is available, update texts
        updateFooterTexts();
        
        // Bind events
        bindFooterEvents(footerElement);
        
        // Set initialization flag
        isInitialized = true;
        
        console.log('Common footer initialization complete');
    }
    
    /**
     * Update footer texts (i18n support)
     */
    function updateFooterTexts() {
        if (window.i18n && typeof window.i18n.updateTexts === 'function') {
            window.i18n.updateTexts(document.querySelector('.app-footer'));
        }
    }
    
    /**
     * Bind footer events
     * @param {HTMLElement} footerElement - Footer DOM element
     */
    function bindFooterEvents(footerElement) {
        const links = footerElement.querySelectorAll('.footer-links a');
        
        links.forEach(link => {
            link.addEventListener('click', function(event) {
                // Allow default link behavior (navigation)
                // No need to prevent default or show construction message
            });
        });
    }
    
    /**
     * Check if initialized
     * @returns {boolean} Whether it is initialized
     */
    function isFooterInitialized() {
        return isInitialized;
    }
    
    // Auto-initialize feature
    // Automatically check if already initialized when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (!isInitialized) {
                const footerElement = document.querySelector('.app-footer');
                if (footerElement && !footerElement.innerHTML.trim()) {
                    console.log('Footer not initialized, auto-initializing...');
                    init();
                }
            }
        }, 500); // Delay 500 milliseconds to ensure other initialization code has a chance to execute
    });
    
    // Return public API
    return {
        init: init,
        updateTexts: updateFooterTexts,
        isInitialized: isFooterInitialized
    };
})(); 