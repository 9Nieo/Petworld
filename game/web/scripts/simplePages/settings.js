document.addEventListener('DOMContentLoaded', () => {
    // Get global i18n object
    const i18n = window.i18n;
    
    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    const rangeInputs = document.querySelectorAll('.range-input');
    
    // Audio elements
    const musicVolumeInput = document.getElementById('musicVolume');
    const soundVolumeInput = document.getElementById('soundVolume');
    
    // Language elements
    const langRadioButtons = document.querySelectorAll('input[name="language"]');
    
    // Wallet connection status
    let isWalletConnected = false;
    // Current connected wallet address
    let currentAddress = null;
    
    // Initialize
    init();
    
    /**
     * Initialize function
     */
    function init() {
        // Bind wallet connection button click event
        if (walletBtn) {
            walletBtn.addEventListener('click', handleWalletBtnClick);
        }
        
        // Initialize SoundManager if available
        if (window.SoundManager) {
            console.log('Initializing SoundManager in settings page');
            window.SoundManager.init();
            // Ensure background music is stopped on settings page load
            window.SoundManager.stopBackgroundMusic();
        }
        
        // Bind save settings button click event
        if (saveBtn) {
            saveBtn.addEventListener('click', saveSettings);
        }
        
        // Bind reset settings button click event
        if (resetBtn) {
            resetBtn.addEventListener('click', resetSettings);
        }
        
        // Add event listeners to range sliders
        rangeInputs.forEach(input => {
            // Initial update display value
            updateRangeValue(input);
            
            // Listen for slider changes
            input.addEventListener('input', () => {
                updateRangeValue(input);
            });
        });
        
        // Add event listeners to language radio buttons
        langRadioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Only update the UI selection here, do not change the language immediately
                    // The actual language change happens on saveSettings
                    console.log('Language radio selected:', e.target.value);
                    updateLanguageRadio(e.target.value);
                }
            });
        });
        
        // Listen for messages from the wallet iframe
        window.addEventListener('message', handleIframeMessage);
        
        // Output iframe source
        if (walletFrame) {
            console.log('Wallet iframe source:', walletFrame.src);
            
            // Ensure iframe is loaded
            walletFrame.onload = function() {
                console.log('Wallet iframe loaded');
                // Check wallet status after iframe is loaded
                checkWalletStatus();
            };
            
            // If iframe is already loaded, check wallet status directly
             if (walletFrame.complete) {
                 checkWalletStatus();
             }
        } else {
             // If walletFrame does not exist, still check wallet status
             checkWalletStatus();
        }
        
        // Load saved settings
        loadSettings();
        
        // Update language radio button based on current language (loaded from settings)
        // Make sure i18n has loaded the current locale from localStorage before this point
        // Assuming i18n.js handles loading locale from localStorage on its own load
        updateLanguageRadio(i18n.getCurrentLocale() || 'en'); // Use i18n's current locale
        
        // Update UI texts based on the current locale *after* loading settings
        updateUITexts(); // Call updateUITexts after loadSettings and setting radio button
        
        // Bind import tokens button click event
        const importTokensBtn = document.getElementById('importTokensBtn');
        if (importTokensBtn) {
            importTokensBtn.addEventListener('click', importGameTokens);
            
            // Update button status based on wallet connection status
            updateImportTokensButton();
        }
        
        // Bind token status toggle event
        const tokenStatusToggle = document.getElementById('toggle-token-status');
        if (tokenStatusToggle) {
            tokenStatusToggle.addEventListener('click', toggleTokenStatusList);
        }
        
        // Load and display token deployment status
        updateTokenStatusList();
    }
    
    /**
     * Update language radio button
     * @param {string} locale - Current language
     */
    function updateLanguageRadio(locale) {
        const radioBtn = document.querySelector(`input[name="language"][value="${locale}"]`);
        if (radioBtn) {
            radioBtn.checked = true;
        } else {
            // Default to English if locale not found
            const enRadioBtn = document.querySelector('input[name="language"][value="en"]');
            if (enRadioBtn) {
                enRadioBtn.checked = true;
            }
        }
    }
    
    /**
     * Change language
     * @param {string} locale - Language code
     */
    function changeLanguage(locale) {
        console.log('Change language:', locale);
        
        // Only update radio button status, not apply language settings
        updateLanguageRadio(locale);
    }
    
    /**
     * Save language settings
     * @param {string} locale - Language code
     */
    function saveLanguageSetting(locale) {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                settings.language = locale;
                localStorage.setItem('userSettings', JSON.stringify(settings));
            } catch (error) {
                console.error('Error saving language settings:', error);
            }
        } else {
            // If no saved settings, create new
            const settings = {
                audio: {
                    music: musicVolumeInput.value,
                    sound: soundVolumeInput.value
                },
                language: locale
            };
            localStorage.setItem('userSettings', JSON.stringify(settings));
        }
    }
    
    /**
     * Update display value of range slider
     */
    function updateRangeValue(input) {
        const valueDisplay = input.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('range-value')) {
            valueDisplay.textContent = `${input.value}%`;
        }
    }
    
    /**
     * Save settings and apply language
     */
    function saveSettings() {
        // Get current selected language from radio buttons
        const selectedLangRadio = document.querySelector('input[name="language"]:checked');
        const newLocale = selectedLangRadio ? selectedLangRadio.value : 'en';
        
        // Collect all settings values
        const settings = {
            audio: {
                music: musicVolumeInput.value,
                sound: soundVolumeInput.value
            },
            language: newLocale // Save the newly selected locale
        };
        
        // Save to local storage
        localStorage.setItem('userSettings', JSON.stringify(settings));
        
        // Check if language has changed
        const currentLocale = i18n.getCurrentLocale();
        
        // Always apply audio settings immediately
        applyAudioSettings(settings.audio);

        if (currentLocale !== newLocale) {
            console.log(`Language changed from ${currentLocale} to ${newLocale}. Applying new locale and reloading...`);
             // Apply language settings by changing i18n locale
            i18n.changeLocale(newLocale).then(() => {
                // Update UI texts after changing locale (optional, will reload soon)
                updateUITexts(); 
                
                // Show success message before reloading
                showMessage(i18n.t('settings.languageChanged') || 'Language changed successfully');
                
                // Refresh page after a short delay to ensure all elements are updated
                setTimeout(() => {
                    window.location.reload();
                }, 800); // Shorter delay
            }).catch(error => {
                 console.error('Failed to change locale:', error);
                 showMessage(i18n.t('settings.languageChangeFailed') || 'Language change failed', 'error');
            });
        } else {
            console.log('Language not changed, only saving settings.');
            // Language is the same, just save other settings and show success message
            showMessage(i18n.t('settings.saved') || 'Settings saved successfully');
        }
        
        console.log('Saved settings:', settings);
    }
    
    /**
     * Reset settings
     */
    function resetSettings() {
        // Default settings
        const defaultSettings = {
            audio: {
                music: 70,
                sound: 80
            },
            language: 'en' // Default language
        };
        
        // Update UI
        musicVolumeInput.value = defaultSettings.audio.music;
        soundVolumeInput.value = defaultSettings.audio.sound;
        
        // Update slider display value
        updateRangeValue(musicVolumeInput);
        updateRangeValue(soundVolumeInput);
        
        // Update language radio button to default
        updateLanguageRadio(defaultSettings.language);
        
        // Save to local storage
        localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
        
        // Apply audio settings
        applyAudioSettings(defaultSettings.audio);

        // Check if current language is different from default
        if (i18n.getCurrentLocale() !== defaultSettings.language) {
             console.log(`Language reset to ${defaultSettings.language}. Applying new locale and reloading...`);
            // Change i18n locale and reload
            i18n.changeLocale(defaultSettings.language).then(() => {
                 updateUITexts();
                // Show message before reloading
                showMessage(i18n.t('settings.resetSuccess') || 'Settings reset to defaults');
                setTimeout(() => {
                    window.location.reload();
                }, 800); // Shorter delay
            }).catch(error => {
                 console.error('Failed to reset locale:', error);
                 showMessage(i18n.t('settings.resetFailed') || 'Settings reset failed', 'error');
            });
        } else {
             console.log('Language already default, only resetting other settings.');
            // Language is already default, just show message
            showMessage(i18n.t('settings.resetSuccess') || 'Settings reset to defaults');
        }
        
        console.log('Settings reset to defaults:', defaultSettings);
    }
    
    /**
     * Load saved settings
     */
    function loadSettings() {
        // Load audio settings from SoundManager (if it exists and loaded them)
        if (window.SoundManager) {
            const soundManager = window.SoundManager;
            // SoundManager should have loaded settings on its init
            const audioSettings = soundManager.settings;
             console.log('Loaded audio settings from SoundManager:', audioSettings);

            // Update UI display for audio settings
            const backgroundMusicVolumeInput = document.getElementById('backgroundMusicVolume');
            const backgroundMusicMuteCheckbox = document.getElementById('backgroundMusicMute');
            const soundEffectsVolumeInput = document.getElementById('soundEffectsVolume');
            const soundEffectsMuteCheckbox = document.getElementById('soundEffectsMute');

            if (backgroundMusicVolumeInput && audioSettings.musicVolume !== undefined) {
                 backgroundMusicVolumeInput.value = audioSettings.musicVolume;
                 updateRangeValue(backgroundMusicVolumeInput);
            }
             if (backgroundMusicMuteCheckbox && audioSettings.muteBackground !== undefined) {
                 backgroundMusicMuteCheckbox.checked = audioSettings.muteBackground;
             }
             // Assuming sound effects settings are also handled by SoundManager
             if (soundEffectsVolumeInput && audioSettings.effectsVolume !== undefined) { // Need to add effectsVolume to SoundManager settings
                 soundEffectsVolumeInput.value = audioSettings.effectsVolume;
                 updateRangeValue(soundEffectsVolumeInput);
             }
             if (soundEffectsMuteCheckbox && audioSettings.muteEffects !== undefined) { // Need to add muteEffects to SoundManager settings
                 soundEffectsMuteCheckbox.checked = audioSettings.muteEffects;
             }


        } else {
             console.warn('SoundManager not available, cannot load audio settings via SoundManager.');
        }

        // Load other settings from localStorage, including language
        const savedSettings = localStorage.getItem('userSettings');
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                
                // Update audio settings UI if not already updated by SoundManager (fallback)
                 if (settings.audio) {
                    const musicVolumeInput = document.getElementById('musicVolume');
                    const soundVolumeInput = document.getElementById('soundVolume');

                     if (settings.audio.music !== undefined && musicVolumeInput) {
                         musicVolumeInput.value = settings.audio.music;
                         updateRangeValue(musicVolumeInput);
                     }
                    
                     if (settings.audio.sound !== undefined && soundVolumeInput) {
                         soundVolumeInput.value = settings.audio.sound;
                         updateRangeValue(soundVolumeInput);
                     }
                 }
                
                // Update language radio button based on loaded settings
                if (settings.language) {
                     console.log('Loaded language setting from userSettings:', settings.language);
                    updateLanguageRadio(settings.language); // Update radio button based on loaded setting
                    // The i18n locale itself should be set by i18n.js on page load based on 'app_locale'
                }
                
                console.log('Loaded saved settings:', settings);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        } else {
             console.log('No userSettings found in localStorage.');
            // If no saved settings, default select English radio button
            updateLanguageRadio('en');
        }
        
        // After loading settings, ensure SoundManager has the correct state
        // This is important if SoundManager loaded defaults but settings were present
        if (window.SoundManager && savedSettings) {
             try {
                 const settings = JSON.parse(savedSettings);
                 if (settings.audio) {
                     SoundManager.applySettings({
                         musicVolume: settings.audio.music,
                         soundEffectsVolume: settings.audio.sound // Assuming this property name
                     });
                     // Also explicitly set mute state based on loaded settings
                     // Need UI elements for mute state in HTML for settings page
                     const muteMusicCheckbox = document.getElementById('backgroundMusicMute');
                     const muteEffectsCheckbox = document.getElementById('soundEffectsMute');
                     if(muteMusicCheckbox) SoundManager.setMuteBackground(muteMusicCheckbox.checked);
                     if(muteEffectsCheckbox && typeof SoundManager.setMuteEffects === 'function') SoundManager.setMuteEffects(muteEffectsCheckbox.checked);
                 }
             } catch (error) {
                 console.error('Error applying loaded settings to SoundManager:', error);
             }
        }
    }
    
    /**
     * Apply language settings
     * @param {string} locale - Language code
     * @returns {boolean} - Whether settings are applied successfully
     */
    function applyLanguage(locale) {
        if (!locale || !i18n) return false;
        
        // Set full language code based on radio button value
        const fullLocale = locale === 'zh_tw' ? 'zh_tw' : locale;
        
        // Use i18n's setLocale method to switch language
        if (i18n && i18n.setLocale) {
            return i18n.setLocale(fullLocale);
        }
        
        return false;
    }
    
    /**
     * Apply settings
     */
    function applySettings(settings) {
        // Apply audio settings to game
        applyAudioSettings(settings.audio);
        
        // Update UI texts
        updateUITexts();
    }
    
    /**
     * Apply audio settings
     */
    function applyAudioSettings(audioSettings) {
        // In the actual game, you can call the game's audio API
        if (window.game && window.game.audio) {
            if (audioSettings.music !== undefined) {
                window.game.audio.setMusicVolume(audioSettings.music / 100);
            }
            if (audioSettings.sound !== undefined) {
                window.game.audio.setSoundVolume(audioSettings.sound / 100);
            }
        }
        
        // Apply settings to SoundManager if available
        if (window.SoundManager) {
            console.log('Applying audio settings to SoundManager:', audioSettings);
            // Use a specific method or flag to apply settings without playing
            // Let's assume SoundManager has a method like applySettingsWithoutPlayback or just setting properties
            
            // Stop music immediately on settings page load/apply to prevent accidental playback
            SoundManager.stopBackgroundMusic(); 
            
            // Now apply the new volume/mute settings to the manager's state
            if (audioSettings.music !== undefined) {
                SoundManager.setMusicVolume(audioSettings.music);
            }
            if (audioSettings.muteBackground !== undefined) {
                 SoundManager.setMuteBackground(audioSettings.muteBackground);
            } else if (audioSettings.music !== undefined) {
                 // Also set mute state based on volume if muteBackground is not explicitly provided
                 SoundManager.setMuteBackground(audioSettings.music === 0);
            }
            // Sound effects volume is also handled in SoundManager if implemented
            if (audioSettings.sound !== undefined) {
                // Assuming SoundManager has a setSoundEffectsVolume method
                 if (typeof SoundManager.setSoundEffectsVolume === 'function') {
                     SoundManager.setSoundEffectsVolume(audioSettings.sound);
                 }
            }
             if (audioSettings.muteEffects !== undefined) {
                 // Assuming SoundManager has a setMuteEffects method
                 if (typeof SoundManager.setMuteEffects === 'function') {
                      SoundManager.setMuteEffects(audioSettings.muteEffects);
                 }
             } else if (audioSettings.sound !== undefined) {
                 // Mute effects if volume is zero
                 if (typeof SoundManager.setMuteEffects === 'function') {
                     SoundManager.setMuteEffects(audioSettings.sound === 0);
                 }
            }

        }
        
        console.log('Applied audio settings:', audioSettings);
    }
    
    /**
     * Show message
     */
    function showMessage(message, type = 'success') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `settings-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        messageEl.style.color = 'white';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '4px';
        messageEl.style.zIndex = '1000';
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 3000);
    }
    
    /**
     * Update UI texts
     */
    function updateUITexts() {
        // Only execute if i18n is available
        if (!i18n) return;
        
        // Update page title
        document.title = i18n.t('settings.title') + ' - ' + i18n.t('game.title');
        
        // Update text using data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        // Update wallet connection text, as it needs to be set dynamically based on status
        if (walletBtn) {
            walletBtn.textContent = isWalletConnected ? 
                i18n.t('wallet.disconnect') : 
                i18n.t('wallet.connect');
        }
        
        if (walletAddressSpan && !isWalletConnected) {
            walletAddressSpan.textContent = i18n.t('wallet.noWallet');
        }
        
        console.log('UI texts updated to language:', i18n.getCurrentLocale());
    }
    
    /**
     * Handle wallet button click event
     */
    function handleWalletBtnClick() {
        if (isWalletConnected) {
            // If connected, disconnect
            disconnectWallet();
        } else {
            // If not connected, show wallet connection modal
            showWalletModal();
        }
    }
    
    /**
     * Show wallet connection modal
     */
    function showWalletModal() {
        walletFrame.style.display = 'block';
    }
    
    /**
     * Hide wallet connection modal
     */
    function hideWalletModal() {
        walletFrame.style.display = 'none';
    }
    
    /**
     * Handle iframe messages
     */
    function handleIframeMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        switch (message.type) {
            case 'walletConnected':
                // Wallet connected successfully
                handleWalletConnected(message.data);
                break;
                
            case 'walletModalClosed':
                // Wallet modal closed
                hideWalletModal();
                break;
                
            case 'walletDisconnected':
                // Wallet disconnected
                handleWalletDisconnected();
                break;
                
            case 'tokenAdded':
                // Token added successfully
                if (message.success) {
                    console.log('Token added successfully:', message.tokenSymbol);
                    showMessage(i18n ? 
                        i18n.t('settings.tokenAddedSuccess', { symbol: message.tokenSymbol }) : 
                        `Token ${message.tokenSymbol} added successfully`
                    );
                } else {
                    console.error('Token addition failed:', message.error);
                    showMessage(i18n ? 
                        i18n.t('settings.tokenAddedFailed', { symbol: message.tokenSymbol }) : 
                        `Failed to add token ${message.tokenSymbol}`, 
                        'error'
                    );
                }
                break;
        }
    }
    
    /**
     * Check wallet status
     * First check sessionStorage, then check localStorage
     */
    function checkWalletStatus() {
        console.log('Checking wallet connection status...');
        // First check sessionStorage (cross-page transfer), then check localStorage (long-term storage)
        const sessionWalletConnected = sessionStorage.getItem('walletConnected');
        const sessionWalletAddress = sessionStorage.getItem('walletAddress');
        const sessionWalletType = sessionStorage.getItem('walletType');
        
        if (sessionWalletConnected === 'true' && sessionWalletAddress) {
            console.log('Found wallet connection info in sessionStorage:', sessionWalletAddress);
            // Restore connection status from sessionStorage
            isWalletConnected = true;
            currentAddress = sessionWalletAddress;
            
            // Use a unified UI update function
            updateWalletUI(true, currentAddress);
            
            // Save to localStorage for long-term storage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', currentAddress);
            localStorage.setItem('walletType', sessionWalletType || 'metamask');
            
            console.log('Wallet connected, requesting Web3 instance');
            // Request Web3 instance from iframe to get balance
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        console.log('Sending getWeb3Instance message to wallet iframe');
                        walletFrame.contentWindow.postMessage({ 
                            type: 'getWeb3Instance',
                            walletType: sessionWalletType
                        }, '*');
                        // Try to auto-connect at the same time
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: sessionWalletType
                        }, '*');
                    } catch (error) {
                        console.error('Failed to send message to iframe:', error);
                    }
                } else {
                    console.error('Wallet iframe or its contentWindow is unavailable');
                }
            }, 500);
        } else {
            console.log('No wallet info in sessionStorage, checking localStorage');
            // If sessionStorage has no info, check localStorage
            checkStoredWalletConnection();
        }
    }
    
    /**
     * Handle wallet connection success
     */
    function handleWalletConnected(data) {
        const { walletType, address, chainId } = data;
        
        // Set connection status
        isWalletConnected = true;
        currentAddress = address;
        
        // Update UI
        updateWalletUI(true, address);
        
        // Store connection status in localStorage and sessionStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletType', walletType);
        
        // Update sessionStorage
        sessionStorage.setItem('walletConnected', 'true');
        sessionStorage.setItem('walletAddress', address);
        sessionStorage.setItem('walletType', walletType);
        
        // Hide wallet modal
        hideWalletModal();
        
        console.log(`Wallet connected successfully: ${walletType}, address: ${address}, chain ID: ${chainId}`);
    }
    
    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        // Send disconnect message to wallet iframe
        walletFrame.contentWindow.postMessage({ type: 'disconnectWallet' }, '*');
        
        // Handle disconnection directly
        handleWalletDisconnected();
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleWalletDisconnected() {
        console.log('Wallet disconnected');
        
        // Set connection status
        isWalletConnected = false;
        currentAddress = null;
        
        // Update UI
        updateWalletUI(false);
        
        // Clear localStorage
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        // Clear sessionStorage
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        
        console.log('Wallet disconnected');
    }
    
    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        if (connected) {
            walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
            walletBtn.classList.add('connected');
            walletAddressSpan.textContent = formatAddress(address);
            walletAddressSpan.title = address;
            walletAddressSpan.classList.add('truncated-address');
        } else {
            walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
            walletBtn.classList.remove('connected');
            walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected';
            walletAddressSpan.title = '';
            walletAddressSpan.classList.remove('truncated-address');
        }
        
        // Update import tokens button status
        updateImportTokensButton();
    }
    
    /**
     * Format address for display
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Check if there is stored wallet connection status
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        const storedWalletType = localStorage.getItem('walletType');
        
        console.log('Checking wallet connection status in localStorage:', {
            connected: storedConnected,
            address: storedAddress ? formatAddress(storedAddress) : null,
            type: storedWalletType
        });
        
        if (storedConnected === 'true' && storedAddress) {
            console.log('Found wallet connection info in localStorage');
            // Restore connection status from localStorage
            isWalletConnected = true;
            currentAddress = storedAddress;
            updateWalletUI(true, storedAddress);
            
            // Ensure sessionStorage is also kept in sync
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', storedAddress);
            sessionStorage.setItem('walletType', storedWalletType || 'metamask');
            
            // Request Web3 instance (will be returned from wallet iframe)
            setTimeout(() => {
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        console.log('Sending getWeb3Instance and autoConnect messages to wallet iframe');
                        // Request Web3 instance
                        walletFrame.contentWindow.postMessage({ 
                            type: 'getWeb3Instance' 
                        }, '*');
                        
                        // Try auto-connect
                        walletFrame.contentWindow.postMessage({ 
                            type: 'autoConnect',
                            walletType: storedWalletType || 'metamask'
                        }, '*');
                    } catch (error) {
                        console.error('Failed to send message to iframe:', error);
                    }
                } else {
                    console.error('Wallet iframe or its contentWindow is unavailable');
                }
            }, 500);
        } else {
            console.log('No wallet connection info found in localStorage');
        }
    }
    
    /**
     * Update import tokens button status
     */
    function updateImportTokensButton() {
        const importTokensBtn = document.getElementById('importTokensBtn');
        if (importTokensBtn) {
            // Only enable button when wallet is connected
            importTokensBtn.disabled = !isWalletConnected;
            
            // Update button text based on button state
            if (isWalletConnected) {
                importTokensBtn.textContent = i18n ? i18n.t('settings.importTokens') : 'Import Game Tokens';
            } else {
                importTokensBtn.textContent = i18n ? i18n.t('settings.connectWalletFirst') : 'Connect Wallet First';
            }
        }
    }
    
    /**
     * Import game tokens to wallet
     */
    function importGameTokens() {
        if (!isWalletConnected) {
            // If wallet is not connected, prompt user to connect first
            showMessage(i18n ? i18n.t('settings.connectWalletFirst') : 'Please connect your wallet first', 'error');
            return;
        }
        
        // Disable button to prevent repeated clicks
        const importTokensBtn = document.getElementById('importTokensBtn');
        if (importTokensBtn) {
            importTokensBtn.disabled = true;
            importTokensBtn.textContent = i18n ? i18n.t('settings.importing') : 'Importing...';
        }
        
        // Get token list for current network
        const tokenContracts = [
            { name: 'PwPoint', symbol: 'PwP', decimals: 0 },
            { name: 'PwBounty', symbol: 'PwB', decimals: 0 },
            { name: 'PwReverse', symbol: 'PwR', decimals: 0 },
            { name: 'PwFood', symbol: 'PwF', decimals: 0 },
            { name: 'PwUSD', symbol: 'PwUSD', decimals: 18 },
            { name: 'PetWorld', symbol: 'PW', decimals: 18 }
        ];
        
        // Get contract addresses
        try {
            const currentNetwork = window.currentNetwork || window.CONTRACT_NETWORKS.TEST;
            let successCount = 0;
            let errorCount = 0;
            let notDeployedCount = 0;
            const validPromises = [];
            
            console.log(`Importing tokens for ${currentNetwork} network...`);
            
            // Iterate through token list, add to wallet
            tokenContracts.forEach(token => {
                try {
                    // Check if contract is deployed
                    if (!window.isContractDeployed || !window.isContractDeployed(token.name)) {
                        console.warn(`${token.name} contract is not deployed`);
                        notDeployedCount++;
                        return;
                    }
                    
                    // Get token address
                    const tokenAddress = window.getContractAddress(token.name);
                    
                    // Check if address is valid
                    if (!window.isValidContractAddress || !window.isValidContractAddress(tokenAddress)) {
                        console.warn(`${token.name} contract address is invalid: ${tokenAddress}`);
                        notDeployedCount++;
                        return;
                    }
                    
                    console.log(`Adding token ${token.name} (${token.symbol}): ${tokenAddress}`);
                    
                    // Add token to wallet
                    const promise = addTokenToWallet(tokenAddress, token.symbol, token.decimals)
                        .then(() => {
                            successCount++;
                        })
                        .catch(error => {
                            console.error(`Error adding ${token.name} to wallet:`, error);
                            errorCount++;
                        });
                    
                    validPromises.push(promise);
                } catch (error) {
                    console.error(`Error processing ${token.name} token:`, error);
                    errorCount++;
                }
            });
            
            // Wait for all tokens to be added
            Promise.all(validPromises).then(() => {
                // Enable button
                if (importTokensBtn) {
                    importTokensBtn.disabled = false;
                    importTokensBtn.textContent = i18n ? i18n.t('settings.importTokens') : 'Import Game Tokens';
                }
                
                // Show result message
                if (successCount > 0) {
                    let message = i18n ? 
                        i18n.t('settings.tokensImported', { count: successCount }) : 
                        `Successfully imported ${successCount} token(s)`;
                        
                    if (notDeployedCount > 0) {
                        message += i18n ? 
                            i18n.t('settings.tokensNotDeployed', { count: notDeployedCount }) : 
                            `, ${notDeployedCount} token(s) not yet deployed`;
                    }
                    
                    showMessage(message, 'success');
                    
                    // Update token status list
                    updateTokenStatusList();
                } else if (notDeployedCount > 0) {
                    showMessage(i18n ? 
                        i18n.t('settings.allTokensNotDeployed', { count: notDeployedCount }) : 
                        `All ${notDeployedCount} token(s) are not yet deployed`, 
                        'info');
                } else {
                    showMessage(i18n ? i18n.t('settings.noTokensImported') : 'No tokens were imported', 'error');
                }
            });
        } catch (error) {
            console.error('Error importing tokens:', error);
            
            // Enable button
            if (importTokensBtn) {
                importTokensBtn.disabled = false;
                importTokensBtn.textContent = i18n ? i18n.t('settings.importTokens') : 'Import Game Tokens';
            }
            
            // Show error message
            showMessage(i18n ? i18n.t('settings.importError') : 'Error importing tokens', 'error');
        }
    }
    
    /**
     * Add token to wallet
     * @param {string} tokenAddress - Token contract address
     * @param {string} symbol - Token symbol
     * @param {number} decimals - Token decimal places
     * @returns {Promise} - Promise for adding token
     */
    function addTokenToWallet(tokenAddress, symbol, decimals) {
        return new Promise((resolve, reject) => {
            // Check if wallet supports adding token method
            if (!window.ethereum || !window.ethereum.request) {
                // If not supported, try sending message through iframe
                if (walletFrame && walletFrame.contentWindow) {
                    try {
                        // Send add token message to iframe
                        walletFrame.contentWindow.postMessage({ 
                            type: 'addToken',
                            tokenAddress: tokenAddress,
                            tokenSymbol: symbol,
                            tokenDecimals: decimals
                        }, '*');
                        
                        // Set a timeout, resolve after 300ms
                        setTimeout(() => resolve(), 300);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('Wallet does not support adding tokens'));
                }
                return;
            }
            
            // Add token through ethereum API
            window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenAddress,
                        symbol: symbol,
                        decimals: decimals,
                        image: '' // Can add token icon URL
                    }
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }
    
    /**
     * Toggle token status list expansion/collapse state
     */
    function toggleTokenStatusList() {
        const header = document.getElementById('toggle-token-status');
        const list = document.getElementById('tokenStatusList');
        const toggleIcon = header ? header.querySelector('.toggle-icon') : null;
        
        if (!header || !list) return;

        // Toggle collapsed state
        list.classList.toggle('collapsed');
        header.classList.toggle('expanded');
        
        // Update toggle icon
        if (toggleIcon) {
            toggleIcon.textContent = list.classList.contains('collapsed') ? '▼' : '▲';
        }
        
        // If need to expand and content is empty or only contains loading prompt, update content
        if (!list.classList.contains('collapsed') && 
            (!list.children.length || 
            (list.children.length === 1 && list.querySelector('.token-status-loading')))) {
            updateTokenStatusList();
        }
        
        // Save collapsed state to localStorage
        localStorage.setItem('tokenStatusExpanded', !list.classList.contains('collapsed'));
    }
    
    /**
     * Update token status list
     */
    function updateTokenStatusList() {
        const tokenStatusList = document.getElementById('tokenStatusList');
        const tokenStatusHeader = document.getElementById('toggle-token-status');
        const toggleIcon = tokenStatusHeader ? tokenStatusHeader.querySelector('.toggle-icon') : null;
        
        if (!tokenStatusList) return;
        
        // Clear list
        tokenStatusList.innerHTML = '';
        
        // Check if should expand list
        const shouldExpand = localStorage.getItem('tokenStatusExpanded') === 'true';
        if (shouldExpand) {
            tokenStatusList.classList.remove('collapsed');
            if (tokenStatusHeader) {
                tokenStatusHeader.classList.add('expanded');
                if (toggleIcon) {
                    toggleIcon.textContent = '▲';
                }
            }
        } else {
            tokenStatusList.classList.add('collapsed');
            if (tokenStatusHeader) {
                tokenStatusHeader.classList.remove('expanded');
                if (toggleIcon) {
                    toggleIcon.textContent = '▼';
                }
            }
        }
        
        // Get token list to display
        const tokenContracts = [
            { name: 'PwPoint', symbol: 'PwP', decimals: 0 },
            { name: 'PwBounty', symbol: 'PwB', decimals: 0 },
            { name: 'PwReverse', symbol: 'PwR', decimals: 0 },
            { name: 'PwFood', symbol: 'PwF', decimals: 0 },
            { name: 'PwUSD', symbol: 'PwUSD', decimals: 18 },
            { name: 'PetWorld', symbol: 'PW', decimals: 18 }
        ];
        
        // Check if there is a contract address check function
        const canCheckDeployment = window.isContractDeployed && window.isValidContractAddress;
        
        // If contractAddresses.js is not loaded, load it first
        if (!canCheckDeployment && !window.getContractAddress) {
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/contractAddresses.js';
            script.onload = function() {
                updateTokenStatusList(); // Call itself after script is loaded
            };
            document.head.appendChild(script);
            return;
        }
        
        // Current network
        const currentNetwork = window.currentNetwork || 'TEST';
        
        // Create a wrapper container to reduce height
        const containerDiv = document.createElement('div');
        containerDiv.className = 'token-status-content';
        
        // Create a status item for each token
        tokenContracts.forEach(token => {
            const statusItem = document.createElement('div');
            statusItem.className = 'token-status-item';
            
            // Token info
            const tokenInfo = document.createElement('div');
            tokenInfo.className = 'token-info';
            
            // Token name
            const tokenName = document.createElement('span');
            tokenName.className = 'token-name';
            tokenName.textContent = `${token.name} (${token.symbol})`;
            tokenInfo.appendChild(tokenName);
            
            let isDeployed = false;
            let tokenAddress = '';
            
            // Get token address and check its deployment status
            try {
                if (canCheckDeployment) {
                    isDeployed = window.isContractDeployed(token.name);
                    if (isDeployed) {
                        tokenAddress = window.getContractAddress(token.name);
                    }
                } else {
                    try {
                        tokenAddress = window.getContractAddress ? 
                            window.getContractAddress(token.name) : 
                            'Unknown';
                        isDeployed = tokenAddress && tokenAddress !== '0x...' && 
                            !/^0x0+$/.test(tokenAddress);
                    } catch (error) {
                        isDeployed = false;
                    }
                }
            } catch (error) {
                console.error(`Error getting ${token.name} status:`, error);
                isDeployed = false;
            }
            
            // Show short address
            const addressSpan = document.createElement('span');
            addressSpan.className = 'token-address-short';
            if (isDeployed && tokenAddress) {
                addressSpan.textContent = formatAddress(tokenAddress);
                addressSpan.title = tokenAddress;
            } else {
                addressSpan.textContent = i18n ? i18n.t('settings.notDeployed') : 'Not deployed';
                addressSpan.title = i18n ? i18n.t('settings.tokenNotDeployedYet') : 'This token is not deployed yet';
            }
            tokenInfo.appendChild(addressSpan);
            
            // Status label
            const statusSpan = document.createElement('span');
            statusSpan.className = 'token-status';
            
            if (isDeployed) {
                statusSpan.textContent = i18n ? i18n.t('settings.tokenDeployed') : 'Deployed';
                statusSpan.classList.add('status-deployed');
            } else {
                statusSpan.textContent = i18n ? i18n.t('settings.tokenNotDeployed') : 'Not deployed';
                statusSpan.classList.add('status-not-deployed');
            }
            
            // Add elements to status item
            statusItem.appendChild(tokenInfo);
            statusItem.appendChild(statusSpan);
            
            // Add status item to container
            containerDiv.appendChild(statusItem);
        });
        
        // Add current network info
        const networkInfo = document.createElement('div');
        networkInfo.className = 'token-network-info';
        
        // Add container to list
        tokenStatusList.appendChild(containerDiv);
    }
}); 