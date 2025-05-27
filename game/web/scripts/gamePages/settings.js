document.addEventListener('DOMContentLoaded', () => {
    // get the DOM elements
    const langOptions = document.querySelectorAll('input[name="language"]');
    const musicVolumeSlider = document.getElementById('music-volume');
    const muteBackgroundCheckbox = document.getElementById('mute-background');
    const resetBtn = document.getElementById('reset-settings-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    
    // Wallet elements - Multi-key support
    const authSection = document.getElementById('auth-section');
    const keyManagementSection = document.getElementById('key-management-section');
    const firstTimeSetup = document.getElementById('first-time-setup');
    
    // Authentication elements
    const masterPasswordInput = document.getElementById('master-password-input');
    const authenticateBtn = document.getElementById('authenticate-btn');
    
    // First time setup elements
    const setupMasterPasswordInput = document.getElementById('setup-master-password-input');
    const setupKeyNameInput = document.getElementById('setup-key-name-input');
    const setupPrivateKeyInput = document.getElementById('setup-private-key-input');
    const setupWalletBtn = document.getElementById('setup-wallet-btn');
    
    // Key management elements
    const activeKeySelect = document.getElementById('active-key-select');
    const keySelectorGroup = document.getElementById('key-selector-group');
    const keyListGroup = document.getElementById('key-list-group');
    const storedKeysList = document.getElementById('stored-keys-list');
    
    // Add new key elements
    const addKeySection = document.getElementById('add-key-section');
    const newKeyNameInput = document.getElementById('new-key-name-input');
    const privateKeyInput = document.getElementById('private-key-input');
    const addKeyBtn = document.getElementById('add-key-btn');
    const cancelAddKeyBtn = document.getElementById('cancel-add-key-btn');
    const showAddKeyBtn = document.getElementById('show-add-key-btn');
    
    // Main action elements
    const mainWalletActions = document.getElementById('main-wallet-actions');
    const lockWalletBtn = document.getElementById('lock-wallet-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Legacy elements (for compatibility)
    const walletStatusIcon = document.getElementById('wallet-status-icon');
    const walletStatusText = document.getElementById('wallet-status-text');
    const walletAddressDisplay = document.getElementById('wallet-address-display');
    const walletAddressText = document.getElementById('wallet-address-text');
    
    // Auto-lock elements
    const autoLockTimeSelect = document.getElementById('auto-lock-time-select');
    
    // default settings
    const defaultSettings = {
        language: 'en',
        audio: {
            musicVolume: 60,
            muteBackground: false
        }
    };
    
    // Add state tracking for UI sections
    let isAddingNewKey = false;
    let lastWalletState = null;
    
    // initialize
    init();
    
    /**
     * initialize function
     */
    function init() {
        console.log('Initializing game settings page...');
        
        // Log the current locale from localStorage to help debug
        const savedLocale = localStorage.getItem('app_locale');
        const gameSettings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        console.log('Saved locale (app_locale):', savedLocale);
        console.log('Game settings from localStorage:', gameSettings);
        
        // Check if i18n is available and log its status
        if (window.i18n) {
            console.log('i18n is available, current locale:', window.i18n.getCurrentLocale());
            console.log('Supported locales:', window.i18n.getSupportedLocales ? window.i18n.getSupportedLocales() : 'unknown');
        } else {
            console.warn('i18n is not available yet, will attempt to get it from parent');
        }
        
        // load the current settings
        loadSettings();
        
        // Apply localized content immediately after loading settings
        localizeContent();
        
        // bind the volume slider event
        if (musicVolumeSlider) {
            musicVolumeSlider.addEventListener('input', handleSliderChange);
            // Add event handler for real-time sound updates
            musicVolumeSlider.addEventListener('input', updateAudioSettingsInRealTime);
        } else {
            console.warn('Music volume slider element not found');
        }
        
        // bind the language selection event
        if (langOptions && langOptions.length) {
            langOptions.forEach(option => {
                option.addEventListener('change', handleLanguageChange);
            });
        } else {
            console.warn('Language options not found');
        }
        
        // bind the mute checkbox event
        if (muteBackgroundCheckbox) {
            muteBackgroundCheckbox.addEventListener('change', handleCheckboxChange);
            // Add event handler for real-time mute updates
            muteBackgroundCheckbox.addEventListener('change', updateAudioSettingsInRealTime);
        } else {
            console.warn('Mute background checkbox not found');
        }
        
        // bind the reset button event
        if (resetBtn) {
            resetBtn.addEventListener('click', handleReset);
        } else {
            console.warn('Reset button not found');
        }
        
        // bind the save button event
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        } else {
            console.warn('Save button not found');
        }
        
        // bind the import tokens button event
        const importTokensBtn = document.getElementById('import-tokens-btn');
        if (importTokensBtn) {
            importTokensBtn.addEventListener('click', handleImportTokens);
            // update the button status
            updateImportTokenBtn();
        }
        
        // bind the token status toggle event (moved down for better flow)
        bindTokenStatusToggleEvent();
        
        // Bind wallet events
        bindWalletEvents();
        
        // Initialize wallet status
        updateWalletUI();
        
        // Add periodic wallet status check to handle async initialization
        // Only check if wallet state actually changed to avoid unnecessary UI updates
        const walletStatusCheckInterval = setInterval(() => {
            if (window.SecureWalletManager) {
                const currentState = {
                    keyCount: window.SecureWalletManager.getKeyCount(),
                    isAuthenticated: window.SecureWalletManager.isUserAuthenticated(),
                    isReady: window.SecureWalletManager.isWalletReady(),
                    isLocked: window.SecureWalletManager.isWalletLocked(),
                    address: window.SecureWalletManager.getAddress()
                };
                
                // Only update UI if state actually changed
                if (!lastWalletState || JSON.stringify(currentState) !== JSON.stringify(lastWalletState)) {
                    console.log('Wallet state changed, updating UI');
                    lastWalletState = currentState;
                    updateWalletUI();
                    
                    // If wallet is ready and was loading before, clear the interval
                    if (currentState.isReady && (!lastWalletState || !lastWalletState.isReady)) {
                        console.log('Wallet became ready, clearing check interval');
                        clearInterval(walletStatusCheckInterval);
                    }
                }
            }
        }, 2000); // Check every 2 seconds instead of 1 second
        
        // Clear interval after 30 seconds to avoid infinite checking
        setTimeout(() => {
            clearInterval(walletStatusCheckInterval);
        }, 30000);
        
        // listen to the language initialization event
        window.addEventListener('localeInitialized', function(event) {
            console.log('Detected the language initialization event:', event.detail);
            localizeContent();
            
            // Update language radio button based on the initialized locale
            if (event.detail && event.detail.locale) {
                updateLanguageRadio(event.detail.locale);
            }
        });
        
        // listen to the messages from the parent window
        window.addEventListener('message', function(event) {
            if (!event.data || typeof event.data !== 'object') return;
            
            console.log('Received message from parent:', event.data.type);
            
            switch (event.data.type) {
                case 'tokenAddedSuccess':
                    // token added successfully
                    showMessage(getTranslation(
                        'settings.tokenAddedSuccess', 
                        `token ${event.data.tokenSymbol} added successfully`
                    ));
                    break;
                    
                case 'tokenAddedFailed':
                    // token added failed
                    showMessage(getTranslation(
                        'settings.tokenAddedFailed', 
                        `token ${event.data.tokenSymbol} added failed`
                    ), 'error');
                    break;
                    
                case 'i18nData':
                    // update the internationalization data
                    console.log('Received i18n data from parent');
                    if (event.data.i18n) {
                        window.i18n = event.data.i18n;
                        console.log('Using i18n from parent with locale:', window.i18n.getCurrentLocale());
                        localizeContent();
                        
                        // Update language radio button
                        updateLanguageRadio(window.i18n.getCurrentLocale());
                    }
                    break;
                    
                case 'walletConnected':
                    // update the wallet connection status
                    updateImportTokenBtn();
                    break;
                    
                case 'walletDisconnected':
                    // update the wallet disconnected status
                    updateImportTokenBtn();
                    break;
            }
        });
        
        // set the language radio button initial status by reading current locale
        const currentLocale = window.i18n ? window.i18n.getCurrentLocale() : 
            (savedLocale || gameSettings.language || 'en');
        console.log('Setting initial language radio to:', currentLocale);
        updateLanguageRadio(currentLocale);
        
        // check the wallet connection status
        checkWalletStatus();
        
        // update the token deployment status display
        updateTokenStatusList();
        
        // Load and apply audio settings
        loadAndApplyAudioSettings();
        
        console.log('Game settings page initialization completed');
    }
    
    /**
     * Bind wallet-related events
     */
    function bindWalletEvents() {
        // Authentication events
        if (authenticateBtn) {
            authenticateBtn.addEventListener('click', handleAuthenticate);
        }
        
        if (masterPasswordInput) {
            masterPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAuthenticate();
                }
            });
        }
        
        // First time setup events
        if (setupWalletBtn) {
            setupWalletBtn.addEventListener('click', handleSetupWallet);
        }
        
        // Key management events
        if (activeKeySelect) {
            activeKeySelect.addEventListener('change', handleActiveKeyChange);
        }
        
        if (showAddKeyBtn) {
            showAddKeyBtn.addEventListener('click', showAddKeySection);
        }
        
        if (addKeyBtn) {
            addKeyBtn.addEventListener('click', handleAddKey);
        }
        
        if (cancelAddKeyBtn) {
            cancelAddKeyBtn.addEventListener('click', hideAddKeySection);
        }
        
        if (lockWalletBtn) {
            lockWalletBtn.addEventListener('click', handleLockWallet);
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Private key input validation
        if (privateKeyInput) {
            privateKeyInput.addEventListener('input', validatePrivateKeyInput);
        }
        
        if (setupPrivateKeyInput) {
            setupPrivateKeyInput.addEventListener('input', validateSetupPrivateKeyInput);
        }
        
        // Load current gas price limit
        loadGasPriceLimit();
        
        // Load auto-lock settings
        loadAutoLockSettings();
    }

    /**
     * Handle authentication
     */
    function handleAuthenticate() {
        const password = masterPasswordInput.value.trim();
        
        if (!password) {
            showMessage(getTranslation('settings.enterPassword', 'Please enter your password'), 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            window.SecureWalletManager.authenticateUser(password).then(success => {
                if (success) {
                    showMessage(getTranslation('settings.authSuccess', 'Authentication successful'));
                    masterPasswordInput.value = '';
                    updateWalletUI();
                } else {
                    showMessage(getTranslation('settings.authFailed', 'Authentication failed. Please check your password.'), 'error');
                }
            });
        }
    }
    
    /**
     * Handle first time wallet setup
     */
    function handleSetupWallet() {
        const masterPassword = setupMasterPasswordInput.value.trim();
        const keyName = setupKeyNameInput.value.trim();
        const privateKey = setupPrivateKeyInput.value.trim();
        
        if (!masterPassword) {
            showMessage(getTranslation('settings.enterMasterPassword', 'Please enter a master password'), 'error');
            return;
        }
        
        if (masterPassword.length < 6) {
            showMessage(getTranslation('settings.passwordTooShort', 'Password must be at least 6 characters'), 'error');
            return;
        }
        
        if (!keyName) {
            showMessage(getTranslation('settings.enterKeyName', 'Please enter a name for your wallet'), 'error');
            return;
        }
        
        if (!privateKey) {
            showMessage(getTranslation('settings.enterPrivateKey', 'Please enter your private key'), 'error');
            return;
        }
        
        if (!window.SecureWalletManager.validatePrivateKey(privateKey)) {
            showMessage(getTranslation('settings.invalidPrivateKey', 'Invalid private key format. Must be 64 hex characters.'), 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            // First authenticate with master password
            window.SecureWalletManager.authenticateUser(masterPassword).then(authSuccess => {
                if (authSuccess) {
                    // Then add the first key
                    window.SecureWalletManager.addPrivateKey(privateKey, keyName).then(result => {
                        if (result.success) {
                            showMessage(getTranslation('settings.walletSetupSuccess', 'Wallet setup successful!'));
                            
                            // Clear input fields
                            setupMasterPasswordInput.value = '';
                            setupKeyNameInput.value = '';
                            setupPrivateKeyInput.value = '';
                            
                            // Update UI
                            updateWalletUI();
                        } else {
                            showMessage(getTranslation('settings.walletSetupFailed', 'Wallet setup failed: ') + result.error, 'error');
                        }
                    });
                } else {
                    showMessage(getTranslation('settings.authFailed', 'Authentication failed'), 'error');
                }
            });
        }
    }
    
    /**
     * Handle active key change
     */
    function handleActiveKeyChange() {
        const selectedKeyId = activeKeySelect.value;
        
        if (selectedKeyId && window.SecureWalletManager) {
            window.SecureWalletManager.switchToKey(selectedKeyId).then(success => {
        if (success) {
                    showMessage(getTranslation('settings.keySwitched', 'Switched to selected wallet'));
                    updateWalletUI();
                } else {
                    showMessage(getTranslation('settings.keySwitchFailed', 'Failed to switch wallet'), 'error');
                    // Revert selection
                    const activeKey = window.SecureWalletManager.getActiveKey();
                    if (activeKey) {
                        activeKeySelect.value = activeKey.id;
                    }
                }
            });
        }
    }
    
    /**
     * Show add key section
     */
    function showAddKeySection() {
        isAddingNewKey = true;
        addKeySection.style.display = 'block';
        mainWalletActions.style.display = 'none';
        newKeyNameInput.focus();
    }
    
    /**
     * Hide add key section
     */
    function hideAddKeySection() {
        isAddingNewKey = false;
        addKeySection.style.display = 'none';
        mainWalletActions.style.display = 'block';
            
            // Clear input fields
        newKeyNameInput.value = '';
            privateKeyInput.value = '';
    }
    
    /**
     * Handle add new key
     */
    function handleAddKey() {
        const keyName = newKeyNameInput.value.trim();
        const privateKey = privateKeyInput.value.trim();
        
        if (!keyName) {
            showMessage(getTranslation('settings.enterKeyName', 'Please enter a name for this wallet'), 'error');
            return;
        }
        
        if (!privateKey) {
            showMessage(getTranslation('settings.enterPrivateKey', 'Please enter your private key'), 'error');
            return;
        }
        
        if (!window.SecureWalletManager.validatePrivateKey(privateKey)) {
            showMessage(getTranslation('settings.invalidPrivateKey', 'Invalid private key format. Must be 64 hex characters.'), 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            window.SecureWalletManager.addPrivateKey(privateKey, keyName).then(result => {
                if (result.success) {
                    showMessage(getTranslation('settings.keyAdded', 'Wallet added successfully!'));
                    hideAddKeySection();
                    updateWalletUI();
        } else {
                    showMessage(getTranslation('settings.keyAddFailed', 'Failed to add wallet: ') + result.error, 'error');
                }
            });
        }
    }
    
    /**
     * Handle lock wallet
     */
    function handleLockWallet() {
        if (window.SecureWalletManager) {
            window.SecureWalletManager.lockWallet();
            showMessage(getTranslation('settings.walletLocked', 'Wallet locked successfully'));
            updateWalletUI();
        }
    }
    
    /**
     * Handle logout
     */
    function handleLogout() {
        const confirmMessage = getTranslation('settings.confirmLogout', 'Are you sure you want to logout? You will need to re-enter your master password.');
        
        if (confirm(confirmMessage)) {
            if (window.SecureWalletManager) {
                // Clear authentication
                window.SecureWalletManager.isAuthenticated = false;
                window.SecureWalletManager.masterPassword = null;
                window.SecureWalletManager.lockWallet();
                
                showMessage(getTranslation('settings.loggedOut', 'Logged out successfully'));
                updateWalletUI();
            }
        }
    }

    /**
     * Handle remove key
     */
    function handleRemoveKey(keyId) {
        const keyMetadata = window.SecureWalletManager.getAllKeys()[keyId];
        if (!keyMetadata) return;
        
        const confirmMessage = getTranslation('settings.confirmRemoveKey', 'Are you sure you want to remove wallet "{{name}}"? This action cannot be undone.')
            .replace('{{name}}', keyMetadata.name);
        
        if (confirm(confirmMessage)) {
            if (window.SecureWalletManager.removePrivateKey(keyId)) {
                showMessage(getTranslation('settings.keyRemoved', 'Wallet removed successfully'));
                updateWalletUI();
            } else {
                showMessage(getTranslation('settings.keyRemoveFailed', 'Failed to remove wallet'), 'error');
            }
        }
    }
    
    /**
     * Handle edit key name
     */
    function handleEditKeyName(keyId) {
        const keyMetadata = window.SecureWalletManager.getAllKeys()[keyId];
        if (!keyMetadata) return;
        
        const newName = prompt(getTranslation('settings.enterNewKeyName', 'Enter new name for this wallet:'), keyMetadata.name);
        
        if (newName && newName.trim() && newName.trim() !== keyMetadata.name) {
            if (window.SecureWalletManager.updateKeyName(keyId, newName.trim())) {
                showMessage(getTranslation('settings.keyNameUpdated', 'Wallet name updated successfully'));
                updateWalletUI();
            } else {
                showMessage(getTranslation('settings.keyNameUpdateFailed', 'Failed to update wallet name'), 'error');
            }
        }
    }

    /**
     * Validate private key input
     */
    function validatePrivateKeyInput() {
        const privateKey = privateKeyInput.value.trim();
        
        if (privateKey && !window.SecureWalletManager.validatePrivateKey(privateKey)) {
            privateKeyInput.style.borderColor = '#dc3545';
        } else {
            privateKeyInput.style.borderColor = '#ddd';
        }
    }

    /**
     * Validate setup private key input
     */
    function validateSetupPrivateKeyInput() {
        const privateKey = setupPrivateKeyInput.value.trim();
        
        if (privateKey && !window.SecureWalletManager.validatePrivateKey(privateKey)) {
            setupPrivateKeyInput.style.borderColor = '#dc3545';
        } else {
            setupPrivateKeyInput.style.borderColor = '#ddd';
        }
    }

    /**
     * Update wallet UI based on current state
     */
    function updateWalletUI() {
        if (!window.SecureWalletManager) {
            console.log('SecureWalletManager not available');
            return;
        }
        
        const keyCount = window.SecureWalletManager.getKeyCount();
        const isAuthenticated = window.SecureWalletManager.isUserAuthenticated();
        const hasStoredKeys = window.SecureWalletManager.hasStoredKey();
        const isReady = window.SecureWalletManager.isWalletReady();
        const isLocked = window.SecureWalletManager.isWalletLocked();
        const address = window.SecureWalletManager.getAddress();
        
        console.log('Wallet UI update:', {
            keyCount,
            isAuthenticated,
            hasStoredKeys,
            isReady,
            isLocked,
            address: address ? address.substring(0, 10) + '...' : null,
            isAddingNewKey
        });
        
        // Hide sections first, but preserve add key section state if user is adding a key
        if (authSection) authSection.style.display = 'none';
        if (keyManagementSection) keyManagementSection.style.display = 'none';
        if (firstTimeSetup) firstTimeSetup.style.display = 'none';
        
        // Only hide add key section if user is not currently adding a new key
        if (addKeySection && !isAddingNewKey) {
            addKeySection.style.display = 'none';
        }
        
        if (keyCount === 0) {
            // First time setup
            if (firstTimeSetup) firstTimeSetup.style.display = 'block';
            updateWalletStatus('setup', 'No wallets configured');
        } else if (!isAuthenticated) {
            // Show authentication
            if (authSection) authSection.style.display = 'block';
            updateWalletStatus('auth', 'Authentication required');
        } else {
            // Show key management
            if (keyManagementSection) keyManagementSection.style.display = 'block';
            
            // Update key selector
            updateKeySelector();
            
            // Update key list
            updateKeyList();
            
            // Update wallet status
        if (isReady) {
                updateWalletStatus('ready', 'Wallet ready');
            
            // Show wallet address
                if (address && walletAddressDisplay && walletAddressText) {
                walletAddressDisplay.style.display = 'block';
                walletAddressText.textContent = address;
            }
            } else if (isLocked) {
                updateWalletStatus('locked', 'Wallet locked');
                if (walletAddressDisplay) walletAddressDisplay.style.display = 'none';
        } else {
                updateWalletStatus('loading', 'Wallet loading...');
                if (walletAddressDisplay) walletAddressDisplay.style.display = 'none';
            }
            
            // Show/hide sections based on state
            if (keySelectorGroup) {
                keySelectorGroup.style.display = keyCount > 1 ? 'block' : 'none';
            }
            if (keyListGroup) {
                keyListGroup.style.display = 'block';
            }
            
            // Only show main wallet actions if not adding a new key
            if (mainWalletActions) {
                mainWalletActions.style.display = isAddingNewKey ? 'none' : 'block';
            }
        }
    }
    
    /**
     * Update wallet status display
     */
    function updateWalletStatus(status, text) {
        if (!walletStatusIcon || !walletStatusText) return;
        
        // Remove all status classes
        walletStatusIcon.className = 'wallet-status-icon';
        
        // Add appropriate status class
        switch (status) {
            case 'ready':
                walletStatusIcon.classList.add('connected');
                break;
            case 'locked':
                walletStatusIcon.classList.add('locked');
                break;
            case 'loading':
                walletStatusIcon.classList.add('loading');
                break;
            case 'auth':
            case 'setup':
            default:
                walletStatusIcon.classList.add('disconnected');
                break;
        }
        
        walletStatusText.textContent = getTranslation(`settings.wallet${status.charAt(0).toUpperCase() + status.slice(1)}`, text);
    }
    
    /**
     * Update key selector dropdown
     */
    function updateKeySelector() {
        if (!activeKeySelect || !window.SecureWalletManager) return;
        
        const allKeys = window.SecureWalletManager.getAllKeys();
        const activeKey = window.SecureWalletManager.getActiveKey();
        
        // Clear existing options
        activeKeySelect.innerHTML = '';
            
        // Add options for each key
        Object.values(allKeys).forEach(key => {
            const option = document.createElement('option');
            option.value = key.id;
            option.textContent = `${key.name} (${formatAddress(key.address)})`;
            if (key.isActive) {
                option.selected = true;
            }
            activeKeySelect.appendChild(option);
        });
    }
    
    /**
     * Update key list display
     */
    function updateKeyList() {
        if (!storedKeysList || !window.SecureWalletManager) return;
        
        const allKeys = window.SecureWalletManager.getAllKeys();
        
        // Clear existing list
        storedKeysList.innerHTML = '';
        
        if (Object.keys(allKeys).length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-keys-message';
            emptyMessage.textContent = getTranslation('settings.noKeysStored', 'No wallets stored');
            storedKeysList.appendChild(emptyMessage);
            return;
        }
        
        // Add each key to the list
        Object.values(allKeys).forEach(key => {
            const keyItem = document.createElement('div');
            keyItem.className = `stored-key-item ${key.isActive ? 'active' : ''}`;
            
            keyItem.innerHTML = `
                <div class="key-info">
                    <div class="key-name">
                        <span class="${key.isActive ? 'active-key-indicator' : 'inactive-key-indicator'}"></span>
                        ${escapeHtml(key.name)}
                        ${key.isActive ? '<span class="key-count-badge">Active</span>' : ''}
                    </div>
                    <div class="key-address">${formatAddress(key.address)}</div>
                </div>
                <div class="key-actions">
                    ${!key.isActive ? `<button class="key-action-btn switch" onclick="handleSwitchToKey('${key.id}')" data-i18n="settings.switchTo">Switch</button>` : ''}
                    <button class="key-action-btn edit" onclick="handleEditKeyName('${key.id}')" data-i18n="settings.edit">Edit</button>
                    <button class="key-action-btn delete" onclick="handleRemoveKey('${key.id}')" data-i18n="settings.remove">Remove</button>
                </div>
            `;
            
            storedKeysList.appendChild(keyItem);
        });
    }
    
    /**
     * Handle switch to key (called from inline onclick)
     */
    function handleSwitchToKey(keyId) {
        if (window.SecureWalletManager) {
            window.SecureWalletManager.switchToKey(keyId).then(success => {
                if (success) {
                    showMessage(getTranslation('settings.keySwitched', 'Switched to selected wallet'));
                    updateWalletUI();
                } else {
                    showMessage(getTranslation('settings.keySwitchFailed', 'Failed to switch wallet'), 'error');
            }
            });
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Format address for display
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
            }
    
    /**
     * Load auto-lock settings
     */
    function loadAutoLockSettings() {
        if (window.SecureWalletManager && autoLockTimeSelect) {
            const currentAutoLockTime = window.SecureWalletManager.getAutoLockTime();
            autoLockTimeSelect.value = currentAutoLockTime;
            console.log('Loaded auto-lock time setting:', currentAutoLockTime);
        }
    }
    
    /**
     * Update audio settings in real-time without waiting for save
     * This provides immediate feedback to the user when changing audio settings
     */
    function updateAudioSettingsInRealTime() {
        if (window.SoundManager) {
            const soundManager = window.SoundManager;
            
            // 获取UI设置
            const backgroundVolume = parseInt(document.getElementById('backgroundMusicVolume').value);
            const muteBackground = document.getElementById('backgroundMusicMute').checked;
            const effectsVolume = parseInt(document.getElementById('soundEffectsVolume').value);
            const muteEffects = document.getElementById('soundEffectsMute').checked;
            
            // 应用设置但不自动播放
            soundManager.applySettings({
                backgroundVolume,
                muteBackground,
                effectsVolume, 
                muteEffects
            });
        }
    }
    
    /**
     * check the wallet connection status
     */
    function checkWalletStatus() {
        // check the wallet connection status in the local storage and session storage
        const isWalletConnected = 
            sessionStorage.getItem('walletConnected') === 'true' || 
            localStorage.getItem('walletConnected') === 'true';
        
        // check the ethereum object availability
        const hasEthereum = 
            !!window.ethereum || 
            (window.parent && !!window.parent.ethereum);
        
        console.log('wallet connection status:', {
            isWalletConnected,
            hasEthereum,
            ethereum: !!window.ethereum,
            parentEthereum: !!(window.parent && window.parent.ethereum)
        });
        
        // if there is no ethereum object in the page but the parent window has, inherit from the parent window
        if (!window.ethereum && window.parent && window.parent.ethereum) {
            window.ethereum = window.parent.ethereum;
            console.log('inherit the ethereum object from the parent window');
        }
        
        // update the import tokens button status
        updateImportTokenBtn();
    }
    
    /**
     * update the import tokens button status
     */
    function updateImportTokenBtn() {
        const importTokensBtn = document.getElementById('import-tokens-btn');
        if (!importTokensBtn) return;
        
        // check the wallet connection status
        const isWalletConnected = 
            sessionStorage.getItem('walletConnected') === 'true' || 
            localStorage.getItem('walletConnected') === 'true';
        
        // check the ethereum object availability
        const hasEthereum = 
            !!window.ethereum || 
            (window.parent && !!window.parent.ethereum);
        
        // update the import tokens button status based on the wallet connection status
        if (isWalletConnected && hasEthereum) {
            importTokensBtn.removeAttribute('disabled');
            importTokensBtn.textContent = getTranslation('settings.importTokens', 'import tokens');
        } else {
            importTokensBtn.setAttribute('disabled', 'disabled');
            importTokensBtn.textContent = getTranslation('settings.connectWalletFirst', 'connect wallet first');
        }
    }
    
    /**
     * update the language radio button status
     */
    function updateLanguageRadio(locale) {
        // First, try to get locale from parameter
        if (!locale) {
            // If no locale is provided, try getting it from i18n
            if (window.i18n && window.i18n.getCurrentLocale) {
                locale = window.i18n.getCurrentLocale();
            }
            
            // If still no locale, try getting it from localStorage
            if (!locale) {
                locale = localStorage.getItem('app_locale') || 'en';
            }
        }
        
        console.log('Updating language radio for locale:', locale);
        
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
     * handle the language change
     */
    function handleLanguageChange(event) {
        const lang = event.target.value;
        // We only update the radio button here but don't apply the language yet
        // The actual change will happen when the user clicks Save
        console.log('Language selection changed to:', lang);
    }
    
    /**
     * Saves the language setting to localStorage and optionally notifies parent.
     * Used internally after a language change is finalized (e.g. on Save).
     */
    function saveLanguageSetting(locale, notify = true) {
        const savedSettings = JSON.parse(localStorage.getItem('gameSettings') || '{}'); // Load existing settings first
        savedSettings.language = locale;
        localStorage.setItem('gameSettings', JSON.stringify(savedSettings));
        localStorage.setItem('app_locale', locale);
        
        // Notify parent page about language change
        if (notify && window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'languageChanged',
                locale: locale
            }, '*');
        }
    }
    
    /**
     * Applies the language settings using i18n and updates UI texts.
     * @param {string} locale - The locale code to apply.
     * @returns {boolean} Whether the language was successfully applied.
     */
    function applyLanguage(locale) {
        if (!locale) return false;
        
        console.log(`Attempting to apply language: ${locale}`);
        
        if (window.i18n) {
            try {
                // Some i18n implementations use setLocale, others use changeLocale
                if (typeof window.i18n.setLocale === 'function') {
                    const success = window.i18n.setLocale(locale);
                    if (success) {
                        updateUITexts(); // Update UI texts after setting locale
                        console.log('Successfully applied language (setLocale):', locale);
                        return true;
                    }
                } else if (typeof window.i18n.changeLocale === 'function') {
                    window.i18n.changeLocale(locale).then(() => {
                        updateUITexts(); // Update UI texts after setting locale
                        console.log('Successfully applied language (changeLocale):', locale);
                        return true;
                    });
                    return true; // Assuming the promise will resolve correctly
                }
                
                console.error('Failed to apply language, i18n API not compatible:', locale);
                return false;
            } catch (error) {
                console.error('Error applying language:', error);
                return false;
            }
        }
        
        console.warn('Could not apply language, i18n missing');
        return false;
    }
    
    /**
     * handle the checkbox change
     */
    function handleCheckboxChange(event) {
        // no special handling, will be processed in the save
    }
    
    /**
     * handle the reset settings
     */
    function handleReset() {
        const message = getTranslation('settings.confirmReset', 'confirm to reset all settings to default values');
        
        if (confirm(message)) {
            // restore the default settings
            localStorage.removeItem('gameSettings');
            
            // reset the app_locale
            const defaultLocale = defaultSettings.language === 'zh_tw' ? 'zh_tw' : defaultSettings.language;
            localStorage.setItem('app_locale', defaultLocale);
            
            // apply the language change
            applyLanguage(defaultLocale); // Apply language and update UI immediately
            
            // notify the parent page
            notifyParentPage({
                type: 'settingsAction',
                action: 'reset',
                settings: defaultSettings,
                language: defaultLocale
            });
            
            // show the reset message
            showMessage(getTranslation('settings.resetSuccess', 'settings reset to default values'));
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
    
    /**
     * handle the save settings
     */
    function handleSave() {
        // collect the settings
        const settings = collectSettings();
        
        // get the selected language
        const selectedLang = document.querySelector('input[name="language"]:checked');
        if (!selectedLang) {
            console.error('No language option selected');
            showMessage(getTranslation('settings.error', 'Error saving settings: No language selected'));
            return;
        }
        
        const langValue = selectedLang.value;
        const fullLocale = langValue === 'zh_tw' ? 'zh_tw' : langValue;
        
        console.log('Saving settings with language:', fullLocale);
        
        // Save gas price limit if SecureWalletManager is available
        let gasLimitSaved = true;
        if (window.SecureWalletManager) {
            const gasPriceLimitInput = document.getElementById('gas-price-limit-input');
            if (gasPriceLimitInput && gasPriceLimitInput.value.trim()) {
                const gasPriceValue = gasPriceLimitInput.value.trim();
                const validation = window.SecureWalletManager.validateGasPriceForNetwork(gasPriceValue);
                
                if (validation.isValid) {
                    const success = window.SecureWalletManager.saveGasPriceLimit(gasPriceValue);
                    if (!success) {
                        gasLimitSaved = false;
                        console.warn('Failed to save gas price limit');
                    }
                } else {
                    gasLimitSaved = false;
                    console.warn('Invalid gas price value:', validation.errorMessage);
                }
            }
        }
        
        // Save auto-lock time if SecureWalletManager is available
        let autoLockSaved = true;
        if (window.SecureWalletManager && autoLockTimeSelect) {
            const autoLockTime = autoLockTimeSelect.value;
            if (autoLockTime) {
                const success = window.SecureWalletManager.saveAutoLockTime(autoLockTime);
                if (!success) {
                    autoLockSaved = false;
                    console.warn('Failed to save auto-lock time');
                }
            }
        }
        
        // save the settings to the local storage
        settings.language = fullLocale;
        localStorage.setItem('gameSettings', JSON.stringify(settings));
        
        // most importantly: set the app_locale - this is the key setting for i18n.js
        localStorage.setItem('app_locale', fullLocale);
        
        // apply the language change - get current locale first
        const currentLocale = window.i18n ? window.i18n.getCurrentLocale() : null;
        
        console.log('Current locale:', currentLocale, 'New locale:', fullLocale);
        
        // Save language setting regardless of whether it's changed
        saveLanguageSetting(fullLocale, true);
        
        if (currentLocale !== fullLocale) {
            console.log(`Switching language from ${currentLocale} to ${fullLocale}`);
            
            // Apply the language change
            const success = applyLanguage(fullLocale);
            
            if (success) {
                // Show success message first
                let message = getTranslation('settings.settingsSaved', 'Settings saved! Reloading...');
                if (!gasLimitSaved || !autoLockSaved) {
                    message = getTranslation('settings.settingsPartialSaved', 'Settings saved with some warnings. Reloading...');
                }
                showMessage(message);
                
                // Reload after a short delay to ensure the language change takes effect
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
                // notify the parent page before reloading
                notifyParentPage({
                    type: 'settingsAction',
                    action: 'save',
                    settings: settings,
                    language: fullLocale
                });
                
                return; // Return early to avoid showing multiple messages
            } else {
                // Language change failed but still save other settings
                console.error('Failed to apply language change');
                showMessage(getTranslation('settings.languageChangeFailed', 'Language change failed, but other settings were saved.'));
            }
        }
        
        // notify the parent page
        notifyParentPage({
            type: 'settingsAction',
            action: 'save',
            settings: settings,
            language: fullLocale
        });
        
        // show the save success message
        let message = getTranslation('settings.settingsSaved', 'Settings saved!');
        if (!gasLimitSaved || !autoLockSaved) {
            message = getTranslation('settings.settingsPartialSaved', 'Settings saved with some warnings.');
        }
        showMessage(message);
    }
    
    /**
     * collect the settings
     */
    function collectSettings() {
        // collect the audio settings
        const audioSettings = {
            musicVolume: parseInt(document.getElementById('music-volume').value),
            muteBackground: document.getElementById('mute-background').checked
        };
        
        // get the selected language
        const selectedLang = document.querySelector('input[name="language"]:checked').value;
        const fullLocale = selectedLang === 'zh_tw' ? 'zh_tw' : selectedLang;
        
        // return the full settings
        return {
            language: fullLocale,
            audio: audioSettings
        };
    }
    
    /**
     * show the message
     */
    function showMessage(message) {
        // check if there is already a message element
        let messageElement = document.querySelector('.settings-message');
        
        if (!messageElement) {
            // create the message element
            messageElement = document.createElement('div');
            messageElement.className = 'settings-message';
            document.body.appendChild(messageElement);
        }
        
        // set the message content
        messageElement.textContent = message;
        
        // set the auto disappear
        setTimeout(() => {
            if (messageElement && messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }
    
    /**
     * get the translation
     */
    function getTranslation(key, fallback) {
        // try to get the translation from the i18n
        if (window.i18n && typeof window.i18n.t === 'function') {
            const translation = window.i18n.t(key);
            if (translation && translation !== key) {
                return translation;
            }
        }
        
        // if no translation is found, return the fallback
        return fallback;
    }
    
    /**
     * notify the parent page
     */
    function notifyParentPage(message) {
        // send the message to the parent page
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
        }
    }
    
    /**
     * localize the content
     */
    function localizeContent() {
        // only execute when the i18n is available
        if (window.i18n) {
            console.log('using the local i18n instance to localize the content');
            updateUITexts();
        } else {
            console.log('trying to get the i18n from the parent page');
            // try to get the i18n from the parent page
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'i18nData' && event.data.i18n) {
                    window.i18n = event.data.i18n;
                    console.log('got the i18n instance from the parent page');
                    updateUITexts(); // Update UI texts after receiving i18n instance
                }
            });
            
            // request the parent page to provide the i18n instance
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'requestI18n' }, '*');
            }
        }
    }
    
    /**
     * apply the localizations
     */
    function updateUITexts() {
        if (!window.i18n) return; // Ensure i18n is available

        // find all the elements with the data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = window.i18n.t(key);
            
            if (translation && translation !== key) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        // Update wallet connection button text if necessary
        const walletBtn = document.getElementById('connectWalletBtn'); 
        if (walletBtn) {
            const isWalletConnected = sessionStorage.getItem('walletConnected') === 'true' || 
                localStorage.getItem('walletConnected') === 'true';
            
            walletBtn.textContent = isWalletConnected ? 
                getTranslation('wallet.disconnect', 'Disconnect Wallet') : 
                getTranslation('wallet.connect', 'Connect Wallet');
        }

        // Safely update range slider display values if needed
        document.querySelectorAll('.range-slider[data-format="percent"]').forEach(input => {
            const nextElement = input.nextElementSibling;
            if (nextElement) { // Add null check here
                nextElement.textContent = `${input.value}%`;
            }
        });
        
        // Update the bgm-value display specifically
        const musicSlider = document.getElementById('music-volume');
        const bgmValueDisplay = document.getElementById('bgm-value');
        if (musicSlider && bgmValueDisplay) {
            bgmValueDisplay.textContent = `${musicSlider.value}%`;
        }
        
        // Update import tokens button text
        const importBtn = document.getElementById('import-tokens-btn');
        if (importBtn) {
            const isWalletConnected = sessionStorage.getItem('walletConnected') === 'true' || 
                localStorage.getItem('walletConnected') === 'true';
            
            if (!isWalletConnected) {
                importBtn.textContent = getTranslation('settings.connectWalletFirst', 'Connect wallet first');
            } else {
                importBtn.textContent = getTranslation('settings.importTokens', 'Import tokens');
            }
        }
        
        console.log('Completed content localizations for locale:', window.i18n.getCurrentLocale());
    }
    
    /**
     * handle the import tokens
     */
    function handleImportTokens() {
        // ensure the ethereum object is available
        if (!window.ethereum && window.parent && window.parent.ethereum) {
            window.ethereum = window.parent.ethereum;
            console.log('inherit the ethereum object from the parent window');
        }
        
        // check if the wallet is connected and the ethereum object is available
        const walletConnected = 
            sessionStorage.getItem('walletConnected') === 'true' || 
            localStorage.getItem('walletConnected') === 'true';
        
        const hasEthereum = !!window.ethereum || (window.parent && !!window.parent.ethereum);
        
        if (!walletConnected || !hasEthereum) {
            showMessage(getTranslation('settings.connectWalletFirst', 'please connect the wallet first'));
            
            // notify the parent page to open the wallet connection modal
            notifyParentPage({
                type: 'openWalletModal'
            });
            
            return;
        }
        
        // if the wallet is connected, perform the import tokens operation
        importGameTokens();
    }
    
    /**
     * import the game tokens to the wallet
     */
    function importGameTokens() {
        // load the contract addresses script (if not loaded yet)
        if (typeof window.getContractAddress !== 'function') {
            // dynamically load the contract addresses script
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/contractAddresses.js';
            script.onload = function() {
                // execute the import after the script is loaded
                performTokenImport();
            };
            script.onerror = function() {
                showMessage(getTranslation('settings.scriptLoadError', '加载合约地址脚本失败'), 'error');
            };
            document.head.appendChild(script);
        } else {
            // the contract addresses script is loaded, perform the import directly
            performTokenImport();
        }
    }
    
    /**
     * perform the token import operation
     */
    function performTokenImport() {
        // get the token contracts for the current network
        const tokenContracts = [
            { name: 'PwPoint', symbol: 'PwP', decimals: 0 },
            { name: 'PwBounty', symbol: 'PwB', decimals: 0 },
            { name: 'PwReverse', symbol: 'PwR', decimals: 0 },
            { name: 'PwFood', symbol: 'PwF', decimals: 0 },
            { name: 'PwUSD', symbol: 'PwUSD', decimals: 18 },
            { name: 'PetWorld', symbol: 'PW', decimals: 18 }
        ];
        
        // disable the import button to prevent duplicate clicks
        const importBtn = document.getElementById('import-tokens-btn');
        if (importBtn) {
            importBtn.disabled = true;
            importBtn.textContent = getTranslation('settings.importing', 'importing...');
        }
        
        try {
            // the current network environment
            const currentNetwork = window.currentNetwork || window.CONTRACT_NETWORKS.TEST;
            let successCount = 0;
            let errorCount = 0;
            let notDeployedCount = 0;
            const validPromises = [];
            
            console.log(`importing tokens for the ${currentNetwork} network...`);
            
            // iterate through the token contracts, add to the wallet
            tokenContracts.forEach(token => {
                try {
                    // check if the contract is deployed
                    if (!window.isContractDeployed || !window.isContractDeployed(token.name)) {
                        console.warn(`${token.name} contract is not deployed`);
                        notDeployedCount++;
                        return;
                    }
                    
                    // get the token address
                    const tokenAddress = window.getContractAddress(token.name);
                    
                    // check if the address is valid
                    if (!window.isValidContractAddress || !window.isValidContractAddress(tokenAddress)) {
                        console.warn(`${token.name} contract address is invalid: ${tokenAddress}`);
                        notDeployedCount++;
                        return;
                    }
                    
                    console.log(`adding token ${token.name} (${token.symbol}): ${tokenAddress}`);
                    
                    // add the token to the wallet
                    const promise = addTokenToWallet(tokenAddress, token.symbol, token.decimals, token.name)
                        .then(() => {
                            successCount++;
                        })
                        .catch(error => {
                            console.error(`error adding ${token.name} to the wallet:`, error);
                            errorCount++;
                        });
                    
                    validPromises.push(promise);
                } catch (error) {
                    console.error(`error processing ${token.name} token:`, error);
                    errorCount++;
                }
            });
            
            // wait for all the tokens to be added
            Promise.all(validPromises).then(() => {
                // restore the import button status
                if (importBtn) {
                    importBtn.disabled = false;
                    importBtn.textContent = getTranslation('settings.importTokens', 'import tokens');
                }
                
                // show the result message
                if (successCount > 0) {
                    let message = getTranslation('settings.tokensImported', `successfully added ${successCount} tokens`);
                    
                    if (notDeployedCount > 0) {
                        message += getTranslation('settings.tokensNotDeployed', `, ${notDeployedCount} tokens are not deployed`);
                    }
                    
                    showMessage(message);
                    
                    // update the token status list
                    updateTokenStatusList();
                } else if (notDeployedCount > 0) {
                    showMessage(
                        getTranslation('settings.allTokensNotDeployed', `all ${notDeployedCount} tokens are not deployed`),
                        'info'
                    );
                } else {
                    showMessage(getTranslation('settings.noTokensImported', 'no tokens were successfully added'), 'error');
                }
            });
        } catch (error) {
            console.error('error importing tokens:', error);
            
            // restore the import button status
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.textContent = getTranslation('settings.importTokens', 'import tokens');
            }
            
            // show the error message
            showMessage(getTranslation('settings.importError', 'error importing tokens'), 'error');
        }
    }
    
    /**
     * add the token to the wallet
     * @param {string} tokenAddress - the token contract address
     * @param {string} symbol - the token symbol
     * @param {number} decimals - the token decimal places
     * @param {string} name - the token name
     * @returns {Promise} - the promise of adding the token to the wallet
     */
    function addTokenToWallet(tokenAddress, symbol, decimals, name) {
        return new Promise((resolve, reject) => {
            // check if the wallet supports the add token method
            if (!window.ethereum || !window.ethereum.request) {
                // if not supported, try to use the ethereum object of the parent window
                if (window.parent && window.parent.ethereum && window.parent.ethereum.request) {
                    window.parent.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: tokenAddress,
                                symbol: symbol,
                                decimals: decimals,
                                image: '' // can add the token icon URL
                            }
                        }
                    })
                    .then(resolve)
                    .catch(reject);
                    return;
                } else {
                    // try to communicate with the parent window via postMessage
                    window.parent.postMessage({
                        type: 'addToken',
                        tokenAddress: tokenAddress,
                        tokenSymbol: symbol,
                        tokenDecimals: decimals,
                        tokenName: name
                    }, '*');
                    
                    // set a timeout, if the response is not received within a certain time, consider it as successful
                    setTimeout(() => resolve(), 500);
                    return;
                }
            }
            
            // add the token via the ethereum API
            window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenAddress,
                        symbol: symbol,
                        decimals: decimals,
                        image: '' // can add the token icon URL
                    }
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }
    
    /**
     * update the token status list
     */
    function updateTokenStatusList() {
        const tokenStatusList = document.getElementById('tokenStatusList');
        const tokenStatusHeader = document.getElementById('toggle-token-status');
        const toggleIcon = tokenStatusHeader ? tokenStatusHeader.querySelector('.toggle-icon') : null;
        
        if (!tokenStatusList) return;
        
        // clear the list
        tokenStatusList.innerHTML = '';
        
        // check if the list should be expanded
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
        
        // get the token contracts to be displayed
        const tokenContracts = [
            { name: 'PwPoint', symbol: 'PwP', decimals: 0 },
            { name: 'PwBounty', symbol: 'PwB', decimals: 0 },
            { name: 'PwReverse', symbol: 'PwR', decimals: 0 },
            { name: 'PwFood', symbol: 'PwF', decimals: 0 },
            { name: 'PwUSD', symbol: 'PwUSD', decimals: 18 },
            { name: 'PetWorld', symbol: 'PW', decimals: 18 }
        ];
        
        // check if there is a contract address check function
        const canCheckDeployment = window.isContractDeployed && window.isValidContractAddress;
        
        // if there is no contract address check function, load the contract addresses script first
        if (!canCheckDeployment && !window.getContractAddress) {
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/contractAddresses.js';
            script.onload = function() {
                updateTokenStatusList(); // call itself after the script is loaded
            };
            document.head.appendChild(script);
            return;
        }
        
        // the current network
        const currentNetwork = window.currentNetwork || 'TEST';
        
        // create a wrapper container to reduce the height
        const containerDiv = document.createElement('div');
        containerDiv.className = 'token-status-content';
        
        // create a status item for each token
        tokenContracts.forEach(token => {
            const statusItem = document.createElement('div');
            statusItem.className = 'token-status-item';
            
            // the token information
            const tokenInfo = document.createElement('div');
            tokenInfo.className = 'token-info';
            
            // the token name
            const tokenName = document.createElement('span');
            tokenName.className = 'token-name';
            tokenName.textContent = `${token.name} (${token.symbol})`;
            tokenInfo.appendChild(tokenName);
            
            let isDeployed = false;
            let tokenAddress = '';
            
            // get the token address and check its deployment status
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
                            'unknown';
                        isDeployed = tokenAddress && tokenAddress !== '0x...' && 
                            !/^0x0+$/.test(tokenAddress);
                    } catch (error) {
                        isDeployed = false;
                    }
                }
            } catch (error) {
                console.error(`error getting the ${token.name} status:`, error);
                isDeployed = false;
            }
            
            // show the short address
            const addressSpan = document.createElement('span');
            addressSpan.className = 'token-address-short';
            if (isDeployed && tokenAddress) {
                addressSpan.textContent = formatAddress(tokenAddress);
                addressSpan.title = tokenAddress;
            } else {
                addressSpan.textContent = getTranslation('settings.notDeployed', 'not deployed');
                addressSpan.title = getTranslation('settings.tokenNotDeployedYet', 'this token is not deployed yet');
            }
            tokenInfo.appendChild(addressSpan);
            
            // the status label
            const statusSpan = document.createElement('span');
            statusSpan.className = 'token-status';
            
            if (isDeployed) {
                statusSpan.textContent = getTranslation('settings.tokenDeployed', 'deployed');
                statusSpan.classList.add('status-deployed');
            } else {
                statusSpan.textContent = getTranslation('settings.tokenNotDeployed', 'not deployed');
                statusSpan.classList.add('status-not-deployed');
            }
            
            // add the elements to the status item
            statusItem.appendChild(tokenInfo);
            statusItem.appendChild(statusSpan);
            
            // add the status item to the container
            containerDiv.appendChild(statusItem);
        });
        
        // add the container to the list
        tokenStatusList.appendChild(containerDiv);
    }
    
    /**
     * format the address for display
     * @param {string} address - the full address
     * @returns {string} - the formatted address (first 6...last 4)
     */
    function formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * toggle the token status list
     */
    function toggleTokenStatusList() {
        const header = document.getElementById('toggle-token-status');
        const list = document.getElementById('tokenStatusList');
        const toggleIcon = header ? header.querySelector('.toggle-icon') : null;
        
        if (!header || !list) return;
        
        // toggle the collapsed state
        list.classList.toggle('collapsed');
        header.classList.toggle('expanded');
        
        // update the toggle icon
        if (toggleIcon) {
            toggleIcon.textContent = list.classList.contains('collapsed') ? '▼' : '▲';
        }
        
        // if the list needs to be expanded and the content is empty or only contains the loading indicator, update the content
        if (!list.classList.contains('collapsed') && 
            (!list.children.length || 
            (list.children.length === 1 && list.querySelector('.token-status-loading')))) {
            updateTokenStatusList();
        }
        
        // save the collapsed state to the local storage
        localStorage.setItem('tokenStatusExpanded', !list.classList.contains('collapsed'));
    }

    /**
     * Bind the token status toggle event listener.
     * Extracted into a separate function for better organization.
     */
    function bindTokenStatusToggleEvent() {
        const tokenStatusToggle = document.getElementById('toggle-token-status');
        if (tokenStatusToggle) {
            tokenStatusToggle.addEventListener('click', toggleTokenStatusList);
        }
    }

    /**
     * Load audio settings from localStorage and apply them.
     */
    function loadAndApplyAudioSettings() {
        // 获取全局SoundManager实例
        if (window.SoundManager) {
            const soundManager = window.SoundManager;
            
            // 只加载设置，不自动播放音乐
            soundManager.loadSettings();
            
            // 更新UI显示
            const audioSettings = soundManager.settings;
            document.getElementById('backgroundMusicVolume').value = audioSettings.backgroundVolume;
            document.getElementById('backgroundMusicMute').checked = audioSettings.muteBackground;
            document.getElementById('soundEffectsVolume').value = audioSettings.effectsVolume;
            document.getElementById('soundEffectsMute').checked = audioSettings.muteEffects;
            
            // 显示当前音量值
            updateRangeValue(document.getElementById('backgroundMusicVolume'));
            updateRangeValue(document.getElementById('soundEffectsVolume'));
        }
    }

    /**
     * handle the slider change
     */
    function handleSliderChange(event) {
        // For sliders with percentage display value
        const slider = event.target;
        const nextElement = slider.nextElementSibling;
        
        // If this is the music volume slider, update the bgm-value display
        if (slider.id === 'music-volume') {
            const bgmValueDisplay = document.getElementById('bgm-value');
            if (bgmValueDisplay) {
                bgmValueDisplay.textContent = `${slider.value}%`;
            }
        }
        
        // For any slider with data-format attribute
        if (nextElement && slider.hasAttribute('data-format')) {
            const format = slider.getAttribute('data-format');
            if (format === 'percent') {
                nextElement.textContent = `${slider.value}%`;
            }
        }
    }
    
    /**
     * load the settings
     */
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        
        // Load saved language and update radio button
        if (savedSettings.language) {
            updateLanguageRadio(savedSettings.language);
        } else {
            // If no language setting, try getting from app_locale
            const appLocale = localStorage.getItem('app_locale');
            if (appLocale) {
                updateLanguageRadio(appLocale);
            }
        }
        
        // Load audio settings
        if (savedSettings.audio) {
            if (musicVolumeSlider && savedSettings.audio.musicVolume !== undefined) {
                musicVolumeSlider.value = savedSettings.audio.musicVolume;
                // Update the displayed value
                const bgmValueDisplay = document.getElementById('bgm-value');
                if (bgmValueDisplay) {
                    bgmValueDisplay.textContent = `${musicVolumeSlider.value}%`;
                }
            }
            
            if (muteBackgroundCheckbox && savedSettings.audio.muteBackground !== undefined) {
                muteBackgroundCheckbox.checked = savedSettings.audio.muteBackground;
            }
        }
        
        // Initialize all sliders with format data attribute
        document.querySelectorAll('.range-slider[data-format="percent"]').forEach(slider => {
            const nextElement = slider.nextElementSibling;
            if (nextElement) {
                nextElement.textContent = `${slider.value}%`;
            }
        });
        
        console.log('Loaded settings:', savedSettings);
    }
    
    /**
     * Load current gas price limit
     */
    function loadGasPriceLimit() {
        const gasPriceLimitInput = document.getElementById('gas-price-limit-input');
        if (!gasPriceLimitInput) {
            return;
        }
        
        if (window.SecureWalletManager) {
            try {
                const currentLimit = window.SecureWalletManager.getGasPriceLimitGwei();
                if (currentLimit) {
                    gasPriceLimitInput.value = parseFloat(currentLimit).toFixed(1);
                }
                
                // Update network info and input constraints
                updateNetworkGasInfo();
            } catch (error) {
                console.warn('Failed to load gas price limit:', error);
            }
        }
    }
    
    /**
     * Update unified gas price information and input constraints
     */
    function updateNetworkGasInfo() {
        if (!window.SecureWalletManager) return;
        
        try {
            const gasSettings = window.SecureWalletManager.getCurrentNetworkGasSettings();
            const gasPriceLimitInput = document.getElementById('gas-price-limit-input');
            const gasPriceRangeInfo = document.getElementById('gas-price-range-info');
            const currentNetworkName = document.getElementById('current-network-name');
            
            // Update network name display
            if (currentNetworkName) {
                currentNetworkName.textContent = gasSettings.networkName;
            }
            
            // Update range info with unified settings
            if (gasPriceRangeInfo) {
                gasPriceRangeInfo.textContent = `Range: ${gasSettings.minGwei} - ${gasSettings.maxGwei} gwei (Default: ${gasSettings.defaultGwei} gwei)`;
            }
            
            // Update input constraints with unified settings
            if (gasPriceLimitInput) {
                gasPriceLimitInput.min = gasSettings.minGwei;
                gasPriceLimitInput.max = gasSettings.maxGwei;
                gasPriceLimitInput.placeholder = gasSettings.defaultGwei;
                
                // Use fine-grained step for unified settings
                gasPriceLimitInput.step = '0.1';
            }
            
            console.log('Updated unified gas info:', gasSettings);
        } catch (error) {
            console.warn('Failed to update gas info:', error);
        }
    }

    // Make functions globally accessible for inline onclick handlers
    window.handleRemoveKey = handleRemoveKey;
    window.handleEditKeyName = handleEditKeyName;
    window.handleSwitchToKey = handleSwitchToKey;
}); 