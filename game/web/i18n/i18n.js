/**
 * Internationalization utility class
 * Provides multilingual support functionality
 */
(function() {
    class I18n {
        constructor() {
            // Default locale
            this.defaultLocale = 'en';
            
            // Current locale
            this.currentLocale = this.defaultLocale;
            
            // Loaded language packs
            this.locales = {};
            
            // Supported locales list
            this.supportedLocales = ['en', 'zh_tw' , 'es', 'ko', 'ja'];
            
            // Do not auto-load language packs on init; rely on manual script imports
            this.initLocale();
        }
        
        /**
         * Initialize locale settings
         */
        initLocale() {
            // Try retrieving user-specified locale from localStorage
            let savedLocale = localStorage.getItem('app_locale');
            // Normalize locale code (lowercase and replace '-' with '_')
            if (savedLocale) {
                savedLocale = savedLocale.toLowerCase().replace(/-/g, '_');
            }
            console.log('Reading saved locale from localStorage:', savedLocale);
            
            // If the saved locale is not supported, clear it
            if (savedLocale && !this.supportedLocales.includes(savedLocale)) {
                console.warn('Saved locale is not supported:', savedLocale);
                localStorage.removeItem('app_locale');
                savedLocale = null;
            }
            
            // If a supported locale exists in localStorage, use it
            if (savedLocale && this.supportedLocales.includes(savedLocale)) {
                this.currentLocale = savedLocale;
                console.log('Using saved locale from localStorage:', this.currentLocale);
            } else {
                // Get browser language
                let browserLang = navigator.language || navigator.userLanguage || '';
                // Normalize browser language code
                browserLang = browserLang.toLowerCase().replace(/-/g, '_').split('_')[0];
                console.log('Detected browser language:', browserLang);
                
                // If the browser language is supported, use it
                if (browserLang && this.supportedLocales.includes(browserLang)) {
                    this.currentLocale = browserLang;
                    console.log('Using browser language:', this.currentLocale);
                } else {
                    // Otherwise, use the default locale
                    this.currentLocale = this.defaultLocale;
                    console.log('Using default language:', this.currentLocale);
                }
                
                // Save to localStorage
                localStorage.setItem('app_locale', this.currentLocale);
                console.log('Saved locale to localStorage:', this.currentLocale);
            }
            
            // Assume supported language packs are loaded via script tags
            console.log('I18n initialized with locale:', this.currentLocale);
            
            // Notify that locale has been initialized
            setTimeout(() => {
                const event = new CustomEvent('localeInitialized', { 
                    detail: { locale: this.currentLocale } 
                });
                window.dispatchEvent(event);
                console.log('Dispatched localeInitialized event');
            }, 0);
        }
        
        /**
         * Set the current locale
         * @param {string} locale - locale code
         * @returns {boolean} - whether the locale was set successfully
         */
        setLocale(locale) {
            // Normalize input locale code (lowercase and replace '-' with '_')
            const normalized = locale.toLowerCase().replace(/-/g, '_');
            console.log(`Attempting to set locale to: ${locale}, normalized to: ${normalized}`);
            const standardLocale = normalized;
            
            if (!this.supportedLocales.includes(standardLocale)) {
                console.warn(`Unsupported locale: ${locale}`);
                return false;
            }
            
            const previousLocale = this.currentLocale;
            
            // Update the current locale
            this.currentLocale = standardLocale;
            
            // Save the locale to localStorage for persistence across pages
            localStorage.setItem('app_locale', standardLocale);
            console.log(`Language changed from ${previousLocale} to ${standardLocale}, saved to localStorage`);
            
            // Trigger global locale change event so all listeners can respond to the change
            const event = new CustomEvent('localeChanged', { 
                detail: { 
                    locale: standardLocale,
                    previousLocale: previousLocale 
                } 
            });
            window.dispatchEvent(event);
            
            console.log('Locale changed to:', standardLocale);
            
            return true;
        }
        
        /**
         * Legacy API-compatible locale change method
         * @param {string} locale - locale code
         * @returns {Promise<boolean>} - whether the locale was set successfully
         */
        changeLocale(locale) {
            return Promise.resolve(this.setLocale(locale));
        }
        
        /**
         * Register translations
         * @param {string} locale - locale code
         * @param {object} translations - translation object
         */
        registerTranslations(locale, translations) {
            if (!window.APP_LOCALES) {
                window.APP_LOCALES = {};
            }
            
            // Save to global variable
            window.APP_LOCALES[locale] = translations;
            
            // Save to instance
            this.locales[locale] = translations;
            
            console.log(`Registered translations for locale: ${locale}`);
        }
        
        /**
         * Get translation
         * @param {string} key - translation key, supports dot notation paths
         * @param {object} params - replacement parameters
         * @returns {string} - translation result
         */
        t(key, params = {}) {
            // Ensure the language pack is loaded
            if (!this.locales[this.currentLocale]) {
                // If not loaded, attempt loading from APP_LOCALES
                if (window.APP_LOCALES && window.APP_LOCALES[this.currentLocale]) {
                    this.locales[this.currentLocale] = window.APP_LOCALES[this.currentLocale];
                    console.log(`Loaded translations for ${this.currentLocale} from APP_LOCALES`);
                } else {
                    // If still not found, use an empty object
                    this.locales[this.currentLocale] = {};
                    console.warn(`Translation for locale ${this.currentLocale} not found`);
                }
            }
            
            // Retrieve nested property
            const value = key.split('.').reduce((obj, k) => {
                return obj && obj[k] !== undefined ? obj[k] : undefined;
            }, this.locales[this.currentLocale]);
            
            // If translation not found, attempt default locale
            if (value === undefined) {
                if (this.currentLocale !== this.defaultLocale && this.locales[this.defaultLocale]) {
                    const defaultValue = key.split('.').reduce((obj, k) => {
                        return obj && obj[k] !== undefined ? obj[k] : undefined;
                    }, this.locales[this.defaultLocale]);
                    
                    if (defaultValue !== undefined) {
                        // Uncomment this for verbose debugging
                        // console.log(`Using default locale (${this.defaultLocale}) translation for key: ${key}`);
                        return this.formatMessage(defaultValue, params);
                    }
                }
                
                // If still not found, return the key
                // Uncomment this for verbose debugging
                // console.warn(`No translation found for key: ${key} in ${this.currentLocale} or ${this.defaultLocale}`);
                return key;
            }
            
            // Return the formatted translation
            return this.formatMessage(value, params);
        }
        
        /**
         * Format message with parameter substitution
         * @param {string} message - message template
         * @param {object} params - replacement parameters
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
         * Get current locale
         * @returns {string} - current locale code
         */
        getLocale() {
            return this.currentLocale;
        }
        
        /**
         * Get current locale (compatibility method)
         * @returns {string} - current locale code
         */
        getCurrentLocale() {
            return this.currentLocale;
        }
        
        /**
         * Get translation (compatibility method)
         * @param {string} key - translation key
         * @param {object} params - replacement parameters
         * @returns {string} - translation result
         */
        get(key, params = {}) {
            return this.t(key, params);
        }
        
        /**
         * Get list of supported locales
         * @returns {string[]} - array of supported locale codes
         */
        getSupportedLocales() {
            return this.supportedLocales;
        }
        
        /**
         * Get singleton instance
         * @returns {I18n} - the I18n instance
         */
        static getInstance() {
            return window.i18n;
        }
    }

    // Create singleton instance and export to global scope
    window.i18n = new I18n();
    
    // For CommonJS and ES module compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { i18n: window.i18n };
    }
})(); 