/**
 * Common footer component
 * Provides a consistent footer for all pages in normal mode
 */
window.CommonFooter = (function() {
    // Footer HTML template
    const footerTemplate = `
        <p data-i18n="common.copyright">&copy; 2025 PetWorld - All Rights Reserved</p>
        <div class="footer-links">
            <a href="#" data-i18n="footer.about">About Us</a>
            <a href="#" data-i18n="footer.terms">Terms of Service</a>
            <a href="#" data-i18n="footer.privacy">Privacy Policy</a>
            <a href="#" data-i18n="footer.help">Help Center</a>
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
                event.preventDefault();
                
                const key = this.getAttribute('data-i18n');
                let pageName = '';
                
                switch (key) {
                    case 'footer.about':
                        pageName = 'About Us';
                        break;
                    case 'footer.terms':
                        pageName = 'Terms of Service';
                        break;
                    case 'footer.privacy':
                        pageName = 'Privacy Policy';
                        break;
                    case 'footer.help':
                        pageName = 'Help Center';
                        break;
                }
                
                // Show "Feature not implemented" message
                if (window.ModalDialog) {
                    window.ModalDialog.show({
                        title: pageName,
                        content: `<div style="text-align:center;">
                            <div style="font-size:48px;margin:20px 0;">🚧</div>
                            <p style="font-size:16px;">The ${pageName} page is under construction, stay tuned!</p>
                        </div>`,
                        confirmText: 'OK'
                    });
                } else {
                    alert(`${pageName} page is under construction, stay tuned!`);
                }
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