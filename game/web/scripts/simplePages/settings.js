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
    const addKeySection = document.getElementById('add-key-section');
    const newKeyNameInput = document.getElementById('new-key-name-input');
    const privateKeyInput = document.getElementById('private-key-input');
    const showAddKeyBtn = document.getElementById('show-add-key-btn');
    const addKeyBtn = document.getElementById('add-key-btn');
    const cancelAddKeyBtn = document.getElementById('cancel-add-key-btn');
    const mainWalletActions = document.getElementById('main-wallet-actions');
    const lockWalletBtn = document.getElementById('lock-wallet-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Status elements
    const walletStatusIcon = document.getElementById('wallet-status-icon');
    const walletStatusText = document.getElementById('wallet-status-text');
    const walletAddressDisplay = document.getElementById('wallet-address-display');
    const walletAddressText = document.getElementById('wallet-address-text');
    
    // Auto-lock elements
    const autoLockTimeSelect = document.getElementById('auto-lock-time-select');
    
    // Wallet connection status
    let isWalletConnected = false;
    // Current connected wallet address
    let currentAddress = null;
    
    // Add state tracking for UI sections
    let isAddingNewKey = false;
    let lastWalletState = null;
    
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
        
        // Bind wallet private key events
        bindWalletEvents();
        
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
            showMessage(i18n ? i18n.t('settings.enterPassword') : 'Please enter your password', 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            window.SecureWalletManager.authenticateUser(password).then(success => {
                if (success) {
                    showMessage(i18n ? i18n.t('settings.authSuccess') : 'Authentication successful');
                    masterPasswordInput.value = '';
                    updateWalletUI();
                } else {
                    showMessage(i18n ? i18n.t('settings.authFailed') : 'Authentication failed. Please check your password.', 'error');
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
            showMessage(i18n ? i18n.t('settings.enterMasterPassword') : 'Please enter a master password', 'error');
            return;
        }
        
        if (masterPassword.length < 6) {
            showMessage(i18n ? i18n.t('settings.passwordTooShort') : 'Password must be at least 6 characters', 'error');
            return;
        }
        
        if (!keyName) {
            showMessage(i18n ? i18n.t('settings.enterKeyName') : 'Please enter a name for your wallet', 'error');
            return;
        }
        
        if (!privateKey) {
            showMessage(i18n ? i18n.t('settings.enterPrivateKey') : 'Please enter your private key', 'error');
            return;
        }
        
        if (!window.SecureWalletManager.validatePrivateKey(privateKey)) {
            showMessage(i18n ? i18n.t('settings.invalidPrivateKey') : 'Invalid private key format. Must be 64 hex characters.', 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            // First authenticate with master password
            window.SecureWalletManager.authenticateUser(masterPassword).then(authSuccess => {
                if (authSuccess) {
                    // Then add the first key
                    window.SecureWalletManager.addPrivateKey(privateKey, keyName).then(result => {
                        if (result.success) {
                            showMessage(i18n ? i18n.t('settings.walletSetupSuccess') : 'Wallet setup successful!');
                            
                            // Clear input fields
                            setupMasterPasswordInput.value = '';
                            setupKeyNameInput.value = '';
                            setupPrivateKeyInput.value = '';
                            
                            // Update UI
                            updateWalletUI();
                        } else {
                            showMessage(i18n ? i18n.t('settings.walletSetupFailed') : 'Wallet setup failed: ' + result.error, 'error');
                        }
                    });
                } else {
                    showMessage(i18n ? i18n.t('settings.authFailed') : 'Authentication failed', 'error');
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
                    showMessage(i18n ? i18n.t('settings.keySwitched') : 'Switched to selected wallet');
                    updateWalletUI();
                } else {
                    showMessage(i18n ? i18n.t('settings.keySwitchFailed') : 'Failed to switch wallet', 'error');
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
            showMessage(i18n ? i18n.t('settings.enterKeyName') : 'Please enter a name for this wallet', 'error');
            return;
        }
        
        if (!privateKey) {
            showMessage(i18n ? i18n.t('settings.enterPrivateKey') : 'Please enter your private key', 'error');
            return;
        }
        
        if (!window.SecureWalletManager.validatePrivateKey(privateKey)) {
            showMessage(i18n ? i18n.t('settings.invalidPrivateKey') : 'Invalid private key format. Must be 64 hex characters.', 'error');
            return;
        }
        
        if (window.SecureWalletManager) {
            window.SecureWalletManager.addPrivateKey(privateKey, keyName).then(result => {
                if (result.success) {
                    showMessage(i18n ? i18n.t('settings.keyAdded') : 'Wallet added successfully!');
                    hideAddKeySection();
                    updateWalletUI();
        } else {
                    showMessage(i18n ? i18n.t('settings.keyAddFailed') : 'Failed to add wallet: ' + result.error, 'error');
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
            showMessage(i18n ? i18n.t('settings.walletLocked') : 'Wallet locked successfully');
            updateWalletUI();
        }
    }
    
    /**
     * Handle logout
     */
    function handleLogout() {
        const confirmMessage = i18n ? i18n.t('settings.confirmLogout') : 'Are you sure you want to logout? You will need to re-enter your master password.';
        
        if (confirm(confirmMessage)) {
            if (window.SecureWalletManager) {
                // Clear authentication
                window.SecureWalletManager.isAuthenticated = false;
                window.SecureWalletManager.masterPassword = null;
                window.SecureWalletManager.lockWallet();
                
                showMessage(i18n ? i18n.t('settings.loggedOut') : 'Logged out successfully');
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
        
        const confirmMessage = i18n ? i18n.t('settings.confirmRemoveKey', 'Are you sure you want to remove wallet "{{name}}"? This action cannot be undone.')
            .replace('{{name}}', keyMetadata.name) : 'Are you sure you want to remove wallet "' + keyMetadata.name + '"? This action cannot be undone.';
        
        if (confirm(confirmMessage)) {
            if (window.SecureWalletManager.removePrivateKey(keyId)) {
                showMessage(i18n ? i18n.t('settings.keyRemoved') : 'Wallet removed successfully');
                updateWalletUI();
            } else {
                showMessage(i18n ? i18n.t('settings.keyRemoveFailed') : 'Failed to remove wallet', 'error');
            }
        }
    }
    
    /**
     * Handle edit key name
     */
    function handleEditKeyName(keyId) {
        const keyMetadata = window.SecureWalletManager.getAllKeys()[keyId];
        if (!keyMetadata) return;
        
        const newName = prompt(i18n ? i18n.t('settings.enterNewKeyName', 'Enter new name for this wallet:') : 'Enter new name for this wallet:', keyMetadata.name);
        
        if (newName && newName.trim() && newName.trim() !== keyMetadata.name) {
            if (window.SecureWalletManager.updateKeyName(keyId, newName.trim())) {
                showMessage(i18n ? i18n.t('settings.keyNameUpdated') : 'Wallet name updated successfully');
                updateWalletUI();
            } else {
                showMessage(i18n ? i18n.t('settings.keyNameUpdateFailed') : 'Failed to update wallet name', 'error');
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
        
        walletStatusText.textContent = i18n ? i18n.t(`settings.wallet${status.charAt(0).toUpperCase() + status.slice(1)}`, text) : text;
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
            emptyMessage.textContent = i18n ? i18n.t('settings.noKeysStored', 'No wallets stored') : 'No wallets stored';
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
                    showMessage(i18n ? i18n.t('settings.keySwitched') : 'Switched to selected wallet');
                    updateWalletUI();
                } else {
                    showMessage(i18n ? i18n.t('settings.keySwitchFailed') : 'Failed to switch wallet', 'error');
                }
            });
        }
    }
    
    // Make functions globally accessible for inline onclick handlers
    window.handleRemoveKey = handleRemoveKey;
    window.handleEditKeyName = handleEditKeyName;
    window.handleSwitchToKey = handleSwitchToKey;
            
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
                let message = i18n.t('settings.languageChanged') || 'Language changed successfully';
                if (!gasLimitSaved || !autoLockSaved) {
                    message = i18n.t('settings.languageChangedWithWarnings') || 'Language changed with some warnings';
                }
                showMessage(message);
                
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
            let message = i18n.t('settings.saved') || 'Settings saved successfully';
            if (!gasLimitSaved || !autoLockSaved) {
                message = i18n.t('settings.savedWithWarnings') || 'Settings saved with some warnings';
            }
            showMessage(message);
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
}); 