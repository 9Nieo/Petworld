/**
 * language switcher
 */
(function() {
    class LanguageSwitcher {
        constructor(container, options = {}) {
            // set default options
            this.options = {
                showFlags: true,           // whether to show the flag icon
                dropdownStyle: 'select',   // dropdown menu style: 'select' or 'custom'
                position: 'top-right',     // position: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
                i18nInstance: null,        // i18n instance
                onChange: null,            // language change callback
                className: '',             // custom CSS class
                localeNames: {             // language name mapping
                    'en': 'English',
                    'zh_tw': '中文(繁體)'
                },
                flagPath: '../../assets/images/flags/', // flag icon path
                container: null            // container element or ID
            };
            
            // get i18n instance
            this.i18n = this.options.i18nInstance || window.i18n;
            if (!this.i18n) {
                console.error('LanguageSwitcher: i18n instance not found.');
                return;
            }
            
            // get supported language list
            this.supportedLocales = this.i18n.getSupportedLocales();
            
            // get current language
            this.currentLocale = this.i18n.getCurrentLocale();
            
            // get container element
            this.container = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!this.container) {
                // if the container does not exist, but an ID is provided, create one
                if (typeof container === 'string') {
                    this.container = this.createContainer(container);
                } else {
                    console.error('LanguageSwitcher: Container not found and no valid ID provided.');
                    return;
                }
            }
            
            // add default styles
            this.addDefaultStyles();
            
            // initialize UI
            this.init();
            
            // listen to language change event
            window.addEventListener('localeChanged', this.handleLocaleChanged.bind(this));
        }
        
        /**
         * create container element
         * @param {string} containerId - container ID
         * @returns {HTMLElement} - created container element
         */
        createContainer(containerId) {
            const container = document.createElement('div');
            container.id = containerId;
            container.className = 'language-switcher-container';
            
            // set styles based on position
            if (this.options.position.includes('top')) {
                container.style.position = 'fixed';
                container.style.top = '10px';
            } else if (this.options.position.includes('bottom')) {
                container.style.position = 'fixed';
                container.style.bottom = '10px';
            }
            
            if (this.options.position.includes('right')) {
                container.style.right = '10px';
            } else if (this.options.position.includes('left')) {
                container.style.left = '10px';
            }
            
            container.style.zIndex = '1000';
            
            document.body.appendChild(container);
            return container;
        }
        
        /**
         * initialize UI
         */
        init() {
            this.container.innerHTML = '';
            this.container.classList.add('language-switcher');
            
            if (this.options.dropdownStyle === 'select') {
                this.createSelectDropdown();
            } else {
                this.createCustomDropdown();
            }
            
            // add custom class
            if (this.options.className) {
                this.container.classList.add(this.options.className);
            }
        }
        
        /**
         * create select dropdown
         */
        createSelectDropdown() {
            const select = document.createElement('select');
            select.className = 'language-select';
            
            this.supportedLocales.forEach(locale => {
                const option = document.createElement('option');
                option.value = locale;
                
                let label = this.options.localeNames[locale] || locale;
                option.textContent = label;
                
                if (locale === this.currentLocale) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
            select.addEventListener('change', (e) => {
                const newLocale = e.target.value;
                this.setLocale(newLocale);
            });
            
            this.container.appendChild(select);
        }
        
        /**
         * create custom dropdown
         */
        createCustomDropdown() {
            const dropdown = document.createElement('div');
            dropdown.className = 'language-dropdown';
            
            // create dropdown button
            const button = document.createElement('div');
            button.className = 'language-dropdown-button';
            
            // find current language
            const currentLocaleName = this.options.localeNames[this.currentLocale] || this.currentLocale;
            
            // add flag icon (if enabled)
            if (this.options.showFlags) {
                const flag = document.createElement('span');
                const localeKey = this.currentLocale.split('-')[0]; // get simplified language code
                flag.className = `language-flag language-flag-${localeKey}`;
                button.appendChild(flag);
            }
            
            // add language name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = currentLocaleName;
            button.appendChild(nameSpan);
            
            // add dropdown arrow
            const arrow = document.createElement('span');
            arrow.className = 'language-arrow';
            button.appendChild(arrow);
            
            dropdown.appendChild(button);
            
            // create dropdown content
            const content = document.createElement('div');
            content.className = 'language-dropdown-content';
            
            this.supportedLocales.forEach(locale => {
                const option = document.createElement('div');
                option.className = 'language-option';
                if (locale === this.currentLocale) {
                    option.classList.add('active');
                }
                
                // add flag icon (if enabled)
                if (this.options.showFlags) {
                    const flag = document.createElement('span');
                    const localeKey = locale.split('-')[0]; // get simplified language code
                    flag.className = `language-flag language-flag-${localeKey}`;
                    option.appendChild(flag);
                }
                
                // add language name
                const name = document.createElement('span');
                name.textContent = this.options.localeNames[locale] || locale;
                option.appendChild(name);
                
                option.addEventListener('click', () => {
                    this.setLocale(locale);
                    dropdown.classList.remove('open');
                });
                
                content.appendChild(option);
            });
            
            dropdown.appendChild(content);
            
            // toggle dropdown state
            button.addEventListener('click', () => {
                dropdown.classList.toggle('open');
            });
            
            // click outside to close dropdown
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });
            
            this.container.appendChild(dropdown);
        }
        
        /**
         * handle language change event
         * @param {CustomEvent} event - custom event
         */
        handleLocaleChanged(event) {
            const { locale } = event.detail;
            if (locale !== this.currentLocale) {
                this.currentLocale = locale;
                // reinitialize UI to reflect new language
                this.init();
            }
        }
        
        /**
         * set current language
         * @param {string} locale - language code
         */
        setLocale(locale) {
            if (locale === this.currentLocale) return;
            
            if (this.i18n.setLocale) {
                const success = this.i18n.setLocale(locale);
                if (success) {
                    this.currentLocale = locale;
                    
                    // if there is a callback function, call it
                    if (typeof this.options.onChange === 'function') {
                        this.options.onChange(locale);
                    }
                }
            } else {
                console.error('i18n.setLocale method not found, using legacy method');
                // if setLocale method does not exist, try using legacy method
                if (this.i18n.changeLocale) {
                    this.i18n.changeLocale(locale).then(success => {
                        if (success) {
                            this.currentLocale = locale;
                            
                            // if there is a callback function, call it
                            if (typeof this.options.onChange === 'function') {
                                this.options.onChange(locale);
                            }
                        }
                    });
                } else {
                    console.error('No suitable locale change method found in i18n instance');
                }
            }
        }
        
        /**
         * add default styles
         */
        addDefaultStyles() {
            // check if styles have already been added
            if (document.getElementById('language-switcher-styles')) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = 'language-switcher-styles';
            style.textContent = `
                .language-switcher-container {
                    position: fixed;
                    ${this.options.position.includes('top') ? 'top: 10px;' : 'bottom: 10px;'}
                    ${this.options.position.includes('right') ? 'right: 10px;' : 'left: 10px;'}
                    z-index: 1000;
                }
                
                .language-switcher {
                    display: inline-block;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                }
                
                .language-select {
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background-color: #fff;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .language-dropdown {
                    position: relative;
                    display: inline-block;
                }
                
                .language-dropdown-button {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background-color: #fff;
                    cursor: pointer;
                    min-width: 100px;
                    justify-content: space-between;
                }
                
                .language-flag {
                    display: inline-block;
                    width: 16px;
                    height: 12px;
                    margin-right: 8px;
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                }
                
                .language-arrow {
                    margin-left: 10px;
                    border: solid #666;
                    border-width: 0 2px 2px 0;
                    display: inline-block;
                    padding: 2px;
                    transform: rotate(45deg);
                    transition: transform 0.2s;
                }
                
                .language-dropdown-content {
                    display: none;
                    position: absolute;
                    min-width: 120px;
                    background-color: #fff;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                    border-radius: 4px;
                    z-index: 1001;
                    margin-top: 2px;
                    ${this.options.position.includes('bottom') ? 'bottom: 100%;' : 'top: 100%;'}
                    ${this.options.position.includes('right') ? 'right: 0;' : 'left: 0;'}
                }
                
                .language-option {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    cursor: pointer;
                    white-space: nowrap;
                }
                
                .language-option:hover {
                    background-color: #f5f5f5;
                }
                
                .language-option.active {
                    background-color: #e0e0e0;
                    font-weight: bold;
                }
                
                .language-dropdown.open .language-dropdown-content {
                    display: block;
                }
                
                .language-dropdown.open .language-arrow {
                    transform: rotate(-135deg);
                }
                
                /* language flag icon style - using inline SVG */
                .language-flag-en {
                    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjM1IDY1MCIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KPGRlZnM+DQo8ZyBpZD0idW5pb24iPg0KPHVzZSB5PSItLjIxNiIgeGxpbms6aHJlZj0iI3g0Ii8+DQo8dXNlIHhsaW5rOmhyZWY9IiN4NC0iLz4NCjwvZz4NCjxnIGlkPSJ4NCI+DQo8cG9seWdvbiBpZD0ieDIiIHBvaW50cz0iLTAuMTYyNCwwIC0wLjE2MjQsMC4xNjI0IDAuMTYyNCwwIiBwYXR0ZXJuLXRyYW5zZm9ybT0ic2NhbGUoMjAuNDkzOCkiLz4NCjx1c2UgeD0iLTAuMzI0OCIgeGxpbms6aHJlZj0iI3gyIi8+DQo8dXNlIHg9IjAuMzI0OCIgeGxpbms6aHJlZj0iI3gyIi8+DQo8L2c+DQo8ZyBpZD0ieDE2Ij4NCjx1c2UgeD0iLTAuNjQ5NiIgeGxpbms6aHJlZj0iI3g0Ii8+DQo8dXNlIHg9IjAuNjQ5NiIgeGxpbms6aHJlZj0iI3g0Ii8+DQo8L2c+DQo8ZyBpZD0ic3RhciI+DQo8dXNlIHg9Ii0xLjI5OTIiIHhsaW5rOmhyZWY9IiN4MTYiLz4NCjx1c2UgeD0iMS4yOTkyIiB4bGluazpocmVmPSIjeDE2Ii8+DQo8dXNlIHk9IjAuODY0OCIgeGxpbms6aHJlZj0iI3g0Ii8+DQo8dXNlIHk9Ii0wLjg2NDgiIHhsaW5rOmhyZWY9IiN4NCIvPg0KPHVzZSB5PSIwLjQzMjQiIHhsaW5rOmhyZWY9IiN1bmlvbiIvPg0KPHVzZSB5PSItMC40MzI0IiB4bGluazpocmVmPSIjdW5pb24iLz4NCjwvZz4NCjwvZGVmcz4NCjxyZWN0IHdpZHRoPSIxMjM1IiBoZWlnaHQ9IjY1MCIgZmlsbD0iIzAwMjg3ZCIvPg0KPHBhdGggc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjUwIiBkPSJNMCwwIEwxMjM1LDY1MCBNMTIzNSwwIEwwLDY1MCIvPg0KPHBhdGggc3Ryb2tlPSIjYzgxMDJlIiBzdHJva2Utd2lkdGg9IjMzLjMzMzMiIGQ9Ik0wLDAgTDEyMzUsNjUwIE0xMjM1LDAgTDAsNjUwIi8+DQo8cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAwIiBkPSJNNjE3LjUsMCBWNjUwIE0wLDMyNSBIMTIzNSIvPg0KPHBhdGggc3Ryb2tlPSIjYzgxMDJlIiBzdHJva2Utd2lkdGg9IjY2LjY2NjciIGQ9Ik02MTcuNSwwIFY2NTAgTTAsNjUwIEgxMjM1Ii8+DQo8dXNlIHg9IjMwOC43NSIgeT0iMzI1IiB4bGluazpocmVmPSIjc3RhciIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+');
                }
                
                .language-flag-zh {
                    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAwIDgwMCI+PHBhdGggZmlsbD0iI2RlMjkxMCIgZD0iTTAgMGgxMjAwdjgwMEgweiIvPjxwYXRoIGZpbGw9IiNmZmRlMDAiIGQ9Ik0zMCAyMGw0MCA4MCBMMS44MzQgNjguMzIgaDk2LjMzMkw2MCAzMTZsNDAtODAgIEw4OC4xNjYgMTMxLjY4SDIxMS44MzRMMTQwIDE4MQ0KbDIwIDQwIC01Ni4yOTQtMTUuNDM0IDgwLjU4OCA1Ni43NQ0KMTU2LjcxIDgyLjMxNmwtMjMuNTU2IDMyLjM3NmE0My45NTggNDMuOTU4IDAgMS0xIDAgLTYyLjA0bDI0LjI4IDMxLjA4MnoiLz48L3N2Zz4=');
                }
            `;
            
            document.head.appendChild(style);
        }
    }
    
    // export component
    window.LanguageSwitcher = LanguageSwitcher;
})(); 