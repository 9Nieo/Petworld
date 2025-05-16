/**
 * Internationalization utility for the wallet module
 * Handles multilingual support for the wallet connection component
 */

(function() {
    class WalletI18n {
        constructor() {
            // Obtain the global i18n instance
            this.i18n = window.i18n;
            
            // Namespace prefix; all translation keys for the wallet module reside under the 'wallet' namespace
            this.namespace = 'wallet';
            
            // Bind event listeners
            this.bindEvents();
        }
        
        /**
         * Bind locale change events
         */
        bindEvents() {
            // Listen for global locale change events
            window.addEventListener('localeChanged', this.handleLocaleChanged.bind(this));
        }
        
        /**
         * Handle locale change events
         */
        handleLocaleChanged() {
            // Update all elements on the page marked for translation
            this.updateTranslations();
        }
        
        /**
         * Update all elements on the page marked for translation
         */
        updateTranslations() {
            // Find all elements with the data-i18n attribute
            const elements = document.querySelectorAll('[data-i18n]');
            
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                
                // Check if there are parameter attributes
                let params = {};
                const paramsAttr = element.getAttribute('data-i18n-params');
                if (paramsAttr) {
                    try {
                        params = JSON.parse(paramsAttr);
                    } catch (e) {
                        console.error('Invalid i18n params:', paramsAttr, e);
                    }
                }
                
                // Obtain the translation and update element content
                const text = this.t(key, params);
                
                // Determine the translation type
                const type = element.getAttribute('data-i18n-type') || 'text';
                
                if (type === 'html') {
                    element.innerHTML = text;
                } else if (type === 'placeholder') {
                    element.placeholder = text;
                } else if (type === 'title') {
                    element.title = text;
                } else if (type === 'value' && element.tagName === 'INPUT') {
                    element.value = text;
                } else if (type === 'aria-label') {
                    element.setAttribute('aria-label', text);
                } else {
                    element.textContent = text;
                }
            });
        }
        
        /**
         * Get translation
         * @param {string} key - translation key, without the namespace
         * @param {object} params - parameters for replacement
         * @returns {string} - translation result
         */
        t(key, params = {}) {
            // Use the global i18n instance to retrieve the translation
            if (this.i18n) {
                // Add namespace prefix
                const fullKey = `${this.namespace}.${key}`;
                return this.i18n.t(fullKey, params);
            }
            
            // If no i18n instance is available, use the fallback method
            return this.fallbackTranslate(key, params);
        }
        
        /**
         * Fallback translation method, used when global i18n is unavailable
         * @param {string} key - translation key
         * @param {object} params - parameters for replacement
         * @returns {string} - fallback translation result
         */
        fallbackTranslate(key, params = {}) {
            // Look up the language pack in global variables
            if (window.APP_LOCALES) {
                const locale = localStorage.getItem('app_locale') || 'en';
                const translations = window.APP_LOCALES[locale];
                
                if (translations) {
                    // Retrieve nested properties
                    const keys = [this.namespace, ...key.split('.')];
                    const value = keys.reduce((obj, k) => {
                        return obj && obj[k] !== undefined ? obj[k] : undefined;
                    }, translations);
                    
                    if (value !== undefined) {
                        return this.formatMessage(value, params);
                    }
                }
                
                // If the translation for the current locale is not found, try using the default locale
                const defaultTranslations = window.APP_LOCALES['en'];
                if (defaultTranslations) {
                    const keys = [this.namespace, ...key.split('.')];
                    const defaultValue = keys.reduce((obj, k) => {
                        return obj && obj[k] !== undefined ? obj[k] : undefined;
                    }, defaultTranslations);
                    
                    if (defaultValue !== undefined) {
                        return this.formatMessage(defaultValue, params);
                    }
                }
            }
            
            // If all methods fail, return the key name
            return key;
        }
        
        /**
         * Format the message and substitute parameters
         * @param {string} message - message template
         * @param {object} params - parameters for replacement
         * @returns {string} - formatted message
         */
        formatMessage(message, params) {
            if (typeof message !== 'string') {
                return message;
            }
            
            return message.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }
        
        /**
         * Set element translation
         * @param {HTMLElement} element - element for which to set translation
         * @param {string} key - translation key
         * @param {object} params - parameters for replacement
         * @param {string} type - translation type; possible values: text (default), html, placeholder, title, value, aria-label
         */
        setElementTranslation(element, key, params = {}, type = 'text') {
            if (!element) return;
            
            // Set the data-i18n attribute for future updates
            element.setAttribute('data-i18n', key);
            
            // If there are parameters, set the parameters attribute
            if (Object.keys(params).length > 0) {
                element.setAttribute('data-i18n-params', JSON.stringify(params));
            }
            
            // Set the translation type
            if (type !== 'text') {
                element.setAttribute('data-i18n-type', type);
            }
            
            // Apply translation
            const text = this.t(key, params);
            
            if (type === 'html') {
                element.innerHTML = text;
            } else if (type === 'placeholder') {
                element.placeholder = text;
            } else if (type === 'title') {
                element.title = text;
            } else if (type === 'value' && element.tagName === 'INPUT') {
                element.value = text;
            } else if (type === 'aria-label') {
                element.setAttribute('aria-label', text);
            } else {
                element.textContent = text;
            }
        }
    }

    // Create an instance
    const walletI18n = new WalletI18n();

    // Export the wallet internationalization utility instance to the global scope
    window.walletI18n = walletI18n;
})(); 