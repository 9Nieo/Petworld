document.addEventListener('DOMContentLoaded', function() {
    // global variables
    let web3;
    let pwusdStakingContract;
    let pwPointManagerContract;
    let pwusdContract;
    let currentUserAddress;
    let supportedStableCoins = [];
    let userStakingInfo = [];
    let currentCycleValue = 0;
    let rewardRateValue = 0;
    let isInitialized = false; // mark if the page is initialized
    let nextCycleUpdateTimestamp = 0; // the timestamp of the next cycle update
    let nextCycleUpdateInterval = null; // the timer for the dynamic update
    
    // the maximum number of retries
    const MAX_RETRIES = 5;
    // the counter for the initialization retries
    let initRetryCount = 0;
    
    // the debug log control
    const debug = {
        enabled: true,
        log: function() {
            if (this.enabled) console.log('[stable coin staking]', ...arguments);
        },
        error: function() {
            if (this.enabled) console.error('[stable coin staking]', ...arguments);
        },
        warn: function() {
            if (this.enabled) console.warn('[stable coin staking]', ...arguments);
        }
    };
    
    // mark if the contracts are being initialized
    let isInitializingContracts = false;
    
    /**
     * the initialization function
     */
    function init() {
        debug.log('initializing the stable coin staking page...');
        
        // bind the events
        bindTabEvents();
        bindButtonEvents();
        
        // Listen for language change event
        window.addEventListener('localeChanged', function(event) {
            debug.log('Detected language change event:', event.detail);
            updateUITexts();
        });
        
        // Listen for language initialization event
        window.addEventListener('localeInitialized', function(event) {
            debug.log('Detected language initialization event:', event.detail);
            updateUITexts();
        });
        
        // Apply current language
        updateUITexts();
        
        // detect the wallet status
        autoDetectWalletStatus();
        
        // try to get the basic contract information after the page is loaded
        setTimeout(() => {
            // if the contracts are already initialized, load the contract information immediately
            if (pwusdStakingContract) {
                debug.log('the page is loaded, load the basic contract information immediately');
                loadContractInfo();
            } else {
                // if the contracts are not initialized, listen to the contract initialization completion event
                debug.log('waiting for the contract initialization to complete before loading the basic information');
                
                // create a one-time event listener, load the information after the contract is initialized
                const checkContractInterval = setInterval(() => {
                    if (pwusdStakingContract) {
                        clearInterval(checkContractInterval);
                        debug.log('detected the contracts are initialized, load the basic information immediately');
                        loadContractInfo();
                    }
                }, 500); // check every 500ms
                
                // 30 seconds later, automatically clear the timer to avoid infinite checks
                setTimeout(() => {
                    if (checkContractInterval) {
                        clearInterval(checkContractInterval);
                    }
                }, 30000);
            }
        }, 1000);
    }
    
    /**
     * Update UI texts based on the current locale
     */
    function updateUITexts() {
        // Only execute if i18n is available
        if (!window.i18n) return;
        
        // Update page title
        document.title = window.i18n.t('navigation.stableStaking') + ' - ' + window.i18n.t('game.title');
        
        // Update elements with data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = window.i18n.t(key);
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        // Update elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = window.i18n.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        debug.log('UI texts updated to language:', window.i18n.getCurrentLocale());
    }
    
    /**
     * automatically detect and solve the wallet connection status problem
     */
    function autoDetectWalletStatus() {
        debug.log('automatically detect and solve the wallet connection status problem...');
        
        // wait for the WalletHeader to load
        if (typeof window.WalletHeader === 'undefined') {
            debug.log('waiting for the WalletHeader to load...');
            setTimeout(autoDetectWalletStatus, 500);
            return;
        }
        
        try {
            // check the consistency of the wallet connection status
            const isConnectedUI = window.WalletHeader.isWalletConnected;
            const hasAddressUI = !!window.WalletHeader.currentAddress;
            const hasWeb3 = !!window.WalletHeader.web3;
            
            debug.log('wallet status check:', {
                isConnectedUI: isConnectedUI,
                hasAddressUI: hasAddressUI,
                hasWeb3: hasWeb3
            });
            
            // detect the inconsistent status
            if (isConnectedUI && (!hasAddressUI || !hasWeb3)) {
                debug.warn('detected the inconsistent wallet connection status!');
                
                // try to refresh to get the web3
                if (!hasWeb3 && typeof window.WalletHeader.getWeb3 === 'function') {
                    debug.log('try to get the Web3 instance again...');
                    web3 = window.WalletHeader.getWeb3();
                    if (web3 && web3.eth) {
                        debug.log('successfully get the Web3 instance');
                        
                        // if there is an address, continue
                        if (hasAddressUI) {
                            currentUserAddress = window.WalletHeader.currentAddress;
                            checkWalletStatus();
                            return;
                        }
                    }
                }
                
                // the status is inconsistent, try to disconnect and reconnect
                showNotification('detected the wallet connection status is abnormal, trying to fix...', 'warning');
                
                if (typeof window.WalletHeader.disconnectWallet === 'function') {
                    debug.log('try to disconnect the wallet...');
                    window.WalletHeader.disconnectWallet();
                    
                    // 2 seconds later, check the status
                    setTimeout(() => {
                        // check if the wallet is disconnected
                        if (!window.WalletHeader.isWalletConnected) {
                            debug.log('the wallet is disconnected, reset the page status');
                            resetStakingPage();
                            
                            // add the wallet connection prompt
                            setPageStatus("please click the button in the upper right corner to connect the wallet to continue");
                        } else {
                            debug.error('failed to disconnect the wallet automatically');
                            // continue to try the normal process
                            checkWalletStatus();
                        }
                    }, 2000);
                    return;
                }
            }
            
            // normal status check
            checkWalletStatus();
        } catch (error) {
            debug.error('failed to automatically detect the wallet status:', error);
            // fallback to the normal check
            checkWalletStatus();
        }
    }
    
    /**
     * bind the tab switch events
     */
    function bindTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // remove the active status of all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // activate the current selected tab
                const tabId = this.getAttribute('data-tab');
                this.classList.add('active');
                document.getElementById(tabId + 'Pane').classList.add('active');
            });
        });
    }
    
    /**
     * bind the button events
     */
    function bindButtonEvents() {
        // refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshData);
        }
        
        // stake panel button
        const stableCoinSelect = document.getElementById('stableCoinSelect');
        const maxStakeBtn = document.getElementById('maxStakeBtn');
        const stakeBtn = document.getElementById('stakeBtn');
        
        if (stableCoinSelect) {
            stableCoinSelect.addEventListener('change', handleStableCoinSelect);
        }
        
        if (maxStakeBtn) {
            maxStakeBtn.addEventListener('click', function() {
                const selectedStableCoin = stableCoinSelect.value;
                if (selectedStableCoin) {
                    setMaxAmount('stake');
                }
            });
        }
        
        if (stakeBtn) {
            stakeBtn.addEventListener('click', stake);
        }
        
        // withdraw panel button
        const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
        const maxWithdrawBtn = document.getElementById('maxWithdrawBtn');
        const withdrawBtn = document.getElementById('withdrawBtn');
        
        if (withdrawStableCoinSelect) {
            withdrawStableCoinSelect.addEventListener('change', handleWithdrawCoinSelect);
        }
        
        if (maxWithdrawBtn) {
            maxWithdrawBtn.addEventListener('click', function() {
                setMaxAmount('withdraw');
            });
        }
        
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', withdraw);
        }
    }
    
    /**
     * check the wallet status
     */
    function checkWalletStatus() {
        debug.log('check the wallet status...');
        
        setTimeout(function() {
            if (!isInitialized) {
                debug.log('the page is not initialized, try to load the basic UI...');
                const stableCoinSelect = document.getElementById('stableCoinSelect');
                
                // only load the stable coin list when the dropdown is empty
                if (stableCoinSelect && stableCoinSelect.options.length <= 1) {
                    // load the basic UI
                    loadSupportedStableCoins();
                    // mark as initialized
                    isInitialized = true;
                }
            }
        }, 1000);
        
        // wait for the WalletHeader to load
        if (typeof window.WalletHeader === 'undefined') {
            debug.log('WalletHeader is not loaded, waiting for loading...');
            setTimeout(checkWalletStatus, 500);
            return;
        }
        
        try {
            // if the wallet is connected, get the Web3 instance and address
            if (window.WalletHeader.isWalletConnected && window.WalletHeader.currentAddress) {
                debug.log('the wallet is connected, address:', window.WalletHeader.currentAddress);
                
                currentUserAddress = window.WalletHeader.currentAddress;
                
                // check if the Web3 is valid
                if (window.WalletHeader.web3) {
                    web3 = window.WalletHeader.web3;
                    
                    // further validate if the web3 instance is valid
                    if (web3.eth && typeof web3.eth.getAccounts === 'function') {
                        debug.log('the Web3 instance is valid, initialize the contracts...');
                        initializeContracts();
                    } else {
                        debug.error('the Web3 instance is invalid, try to get it again');
                        
                        // request the WalletHeader to reconnect the wallet to get the valid Web3 instance
                        if (typeof window.WalletHeader.getWeb3 === 'function') {
                            web3 = window.WalletHeader.getWeb3();
                            if (web3 && web3.eth) {
                                debug.log('successfully get the Web3 instance again');
                                initializeContracts();
                            } else {
                                debug.error('failed to get the Web3 instance again');
                                // show the reconnect wallet button or prompt
                                showNotification('failed to get the valid Web3 instance, please disconnect the wallet and reconnect', 'error');
                            }
                        } else {
                            // listen to the Web3 ready event
                            window.addEventListener('wallet.web3Ready', function(event) {
                                debug.log('received the Web3 ready event');
                                web3 = window.WalletHeader.web3;
                                if (web3 && web3.eth) {
                                    debug.log('successfully get the valid Web3 instance through the event');
                                    initializeContracts();
                                }
                            }, { once: true }); // only execute once
                        }
                    }
                } else {
                    debug.error('WalletHeader shows that the wallet is connected but the Web3 is not initialized');
                    
                    // check if there is a method to get the Web3
                    if (typeof window.WalletHeader.getWeb3 === 'function') {
                        web3 = window.WalletHeader.getWeb3();
                        if (web3) {
                            debug.log('successfully get the Web3 instance through the getWeb3 method');
                            initializeContracts();
                        } else {
                            debug.error('failed to get the Web3 instance through the getWeb3 method');
                        }
                    }
                    
                    // listen to the Web3 ready event   
                    window.addEventListener('wallet.web3Ready', function handler(event) {
                        debug.log('received the Web3 ready event');
                        web3 = event.detail.web3 || window.WalletHeader.web3;
                        if (web3) {
                            debug.log('successfully get the Web3 instance through the web3Ready event');
                            window.removeEventListener('wallet.web3Ready', handler); // remove the listener
                            initializeContracts();
                        }
                    });
                    
                    // 5 seconds later, if still not get the Web3, try to disconnect and reconnect
                    setTimeout(() => {
                        if (!web3 && window.WalletHeader.isWalletConnected) {
                            debug.warn('5 seconds later, still not get the Web3 instance, try to reset the connection status');
                            if (typeof window.WalletHeader.disconnectWallet === 'function') {
                                window.WalletHeader.disconnectWallet();
                                showNotification('the wallet connection status is abnormal, the connection has been reset. please reconnect the wallet', 'warning');
                            }
                        }
                    }, 5000);
                }
            } else {
                debug.log('the wallet is not connected, show the initial status');
                // ensure the page is loaded before resetting (delayed execution)
                setTimeout(resetStakingPage, 100);
                // try to initialize the page, it will automatically load the stable coin list
                setTimeout(initStakingPage, 500);
            }
        } catch (error) {
            debug.error('failed to check the wallet status:', error);
            showNotification('failed to check the wallet status', 'error');
        }
    }
    
    /**
     * initialize the contracts
     */
    function initializeContracts() {
        // prevent the duplicate initialization
        if (isInitializingContracts) {
            debug.log('the contracts are being initialized, skip the duplicate call');
            return;
        }
        
        // mark as initializing
        isInitializingContracts = true;
        
        try {
            // check the Web3 instance
            if (!web3 || !web3.eth) {
                debug.error('the Web3 is not initialized or invalid');

                // try to get the Web3 instance from the walletHeader
                if (window.WalletHeader && window.WalletHeader.web3 && window.WalletHeader.web3.eth) {
                    web3 = window.WalletHeader.web3;
                    debug.log('try to get the Web3 instance directly from the walletHeader');
                } else {
                    // reset the initialization mark
                    isInitializingContracts = false;
                    
                    // try again to get the Web3
                    debug.log('start to check the Web3 availability asynchronously...');
                    checkWeb3Availability(3); // try up to 3 times
                    return;
                }
            }
            
            // verify the current user address
            if (!currentUserAddress) {
                debug.error('the current user address is not set');
                if (window.WalletHeader && window.WalletHeader.currentAddress) {
                    currentUserAddress = window.WalletHeader.currentAddress;
                    debug.log('successfully get the user address from the walletHeader:', currentUserAddress);
                } else {
                    // try to get the address from the web3
                    web3.eth.getAccounts().then(accounts => {
                        if (accounts && accounts.length > 0) {
                            currentUserAddress = accounts[0];
                            debug.log('successfully get the user address from the web3.eth.getAccounts:', currentUserAddress);
                            // try again to initialize
                            isInitializingContracts = false;
                            initializeContracts();
                        } else {
                            debug.error('failed to get the user address');
                            showNotification('failed to get the wallet address, please reconnect the wallet', 'error');
                            isInitializingContracts = false;
                        }
                    }).catch(err => {
                        debug.error('failed to get the user address:', err);
                        showNotification('failed to get the wallet address, please reconnect the wallet', 'error');
                        isInitializingContracts = false;
                    });
                    return;
                }
            }
            
            debug.log('initialize the contracts...');
            
            // confirm the contractAddresses exists
            if (!window.contractAddresses) {
                debug.error('contractAddresses is not defined');
                showNotification('the contract address configuration does not exist, please check the page loading status', 'error');
                isInitializingContracts = false; // reset the initialization mark
                return;
            }
            
            // confirm the currentNetwork exists
            if (!window.currentNetwork) {
                debug.error('currentNetwork is not defined');
                window.currentNetwork = 'MAIN'; // default to the main network
                debug.log('set the default network to MAIN');
            }
            
            // get the contract address function
            const getContractAddress = (name) => {
                // if the stable coin, try to get the address from the SupportedStableCoins
                if (window.SupportedStableCoins) {
                    const stableCoinAddress = window.SupportedStableCoins.getStableCoinAddress(name);
                    if (stableCoinAddress) {
                        debug.log(`successfully get the address of ${name} from the SupportedStableCoins:`, stableCoinAddress);
                        return stableCoinAddress;
                    }
                }
                
                // try to get the address from the original contract address manager
                if (window.getContractAddress) {
                    try {
                        return window.getContractAddress(name);
                    } catch (e) {
                        debug.error(`failed to get the address of ${name} through the getContractAddress:`, e);
                    }
                }
                
                if (window.contractAddresses && window.currentNetwork) {
                    try {
                        if (window.contractAddresses[window.currentNetwork] && 
                            window.contractAddresses[window.currentNetwork][name]) {
                            return window.contractAddresses[window.currentNetwork][name];
                        }
                    } catch (e) {
                        debug.error(`failed to get the address of ${name} from the contractAddresses:`, e);
                    }
                }
                
                // use the fallback address for the test network
                if (window.currentNetwork === 'MAIN') {
                    if (name === 'PwUSDStaking') {
                        debug.log('use the fallback address for the main network PwUSDStaking');
                        return '0x0000000000000000000000000000000000001000';
                    } else if (name === 'PwPointManager') {
                        debug.log('use the fallback address for the main network PwPointManager');
                        return '0x0000000000000000000000000000000000002000';
                    }
                }
                
                return null;
            };
            
            // initialize the PwUSDStaking contract
            let pwusdStakingAddressFound = false;
            
            if (window.initPwUSDStakingContract) {
                try {
                    pwusdStakingContract = window.initPwUSDStakingContract(web3, getContractAddress);
                    if (pwusdStakingContract) {
                        pwusdStakingAddressFound = true;
                    }
                } catch (e) {
                    debug.error('failed to initialize the PwUSDStaking contract through the initPwUSDStakingContract:', e);
                }
            }
            
            if (!pwusdStakingAddressFound) {
                try {
                    const pwusdStakingAddress = getContractAddress('PwUSDStaking');
                    if (pwusdStakingAddress && window.PwUSDStakingABI) {
                        pwusdStakingContract = new web3.eth.Contract(window.PwUSDStakingABI, pwusdStakingAddress);
                        pwusdStakingAddressFound = true;
                    } else {
                        debug.error('failed to initialize the PwUSDStaking contract, the address or ABI is missing');
                    }
                } catch (e) {
                    debug.error('failed to initialize the PwUSDStaking contract:', e);
                }
            }
            
            // initialize the PwPointManager contract
            if (window.initPwPointManagerContract) {
                try {
                    pwPointManagerContract = window.initPwPointManagerContract(web3, getContractAddress);
                } catch (e) {
                    debug.error('failed to initialize the PwPointManager contract through the initPwPointManagerContract:', e);
                }
            } else {
                try {
                    const pwPointManagerAddress = getContractAddress('PwPointManager');
                    if (pwPointManagerAddress && window.PwPointManagerABI) {
                        pwPointManagerContract = new web3.eth.Contract(window.PwPointManagerABI, pwPointManagerAddress);
                    } else {
                        debug.error('failed to initialize the PwPointManager contract, the address or ABI is missing');
                    }
                } catch (e) {
                    debug.error('failed to initialize the PwPointManager contract:', e);
                }
            }
            
            // check if the necessary contracts are initialized
            if (!pwusdStakingContract) {
                debug.error('the PwUSDStaking contract is not initialized, cannot continue');
                showNotification('staking contract initialization failed, some features may not be available', 'error');
                
                // mark the initialization as completed, but without the contract
                isInitialized = true;
                
                // try to load the basic UI of the page
                initStakingPage();
                return;
            }
            
            // get the PWUSD token address and contract
            try {
                pwusdStakingContract.methods.pwusdToken().call()
                    .then(pwusdTokenAddress => {
                        debug.log('the PWUSD token address:', pwusdTokenAddress);
                        
                        if (window.PwUSDABI) {
                            pwusdContract = new web3.eth.Contract(window.PwUSDABI, pwusdTokenAddress);
                        }
                        
                        // mark the initialization as completed
                        isInitialized = true;
                        
                        // load the data after the initialization
                        initStakingPage();
                    })
                    .catch(error => {
                        debug.error('failed to get the PWUSD token address:', error);
                        showNotification('failed to get the PWUSD token information, please check the contract configuration', 'error');
                        
                        // even if there is an error, mark the initialization as completed, so that the UI can be loaded
                        isInitialized = true;
                        initStakingPage();
                    });
            } catch (e) {
                debug.error('failed to call the pwusdToken method:', e);
                // mark the initialization as completed
                isInitialized = true;
                initStakingPage();
            }
            
            debug.log('the contract initialization process is completed');
        } catch (error) {
            debug.error('failed to initialize the contracts:', error);
            showNotification('failed to initialize the contracts', 'error');
            
            // even if there is an error, mark the initialization as completed, so that the UI can be loaded
            isInitialized = true;
            initStakingPage();
        } finally {
            // reset the initialization mark in all cases
            isInitializingContracts = false;
        }
    }
    
    /**
     * check the Web3 availability
     * @param {number} retryCount - the remaining retry count
     */
    function checkWeb3Availability(retryCount) {
        if (retryCount <= 0) {
            debug.error('the Web3 check retry count is used up, cannot get a valid Web3 instance');
            showNotification('failed to connect to the wallet, please reconnect or refresh the page', 'error');
            return;
        }
        
        debug.log(`check the Web3 availability, the remaining retry count: ${retryCount}`);
        
        // first check the WalletHeader
        if (window.WalletHeader && window.WalletHeader.web3 && window.WalletHeader.web3.eth) {
            web3 = window.WalletHeader.web3;
            debug.log('successfully get the Web3 instance');
            
            // if the address is also available, continue the initialization
            if (window.WalletHeader.currentAddress) {
                currentUserAddress = window.WalletHeader.currentAddress;
                initializeContracts();
            } else {
                // only the Web3 is available, try to get the address
                web3.eth.getAccounts().then(accounts => {
                    if (accounts && accounts.length > 0) {
                        currentUserAddress = accounts[0];
                        initializeContracts();
                    } else {
                        throw new Error('failed to get the account address');
                    }
                }).catch(err => {
                    debug.error('failed to get the account address:', err);
                    setTimeout(() => checkWeb3Availability(retryCount - 1), 1000);
                });
            }
        } else {
            // wait for a while and retry
            setTimeout(() => checkWeb3Availability(retryCount - 1), 1000);
        }
    }
    
    /**
     * initialize the staking page
     */
    async function initStakingPage() {
        try {
            if (!isInitialized) {
                debug.error('the page is not initialized yet, waiting for the initialization to complete');
                
                // check if the maximum retry count is exceeded
                if (initRetryCount >= MAX_RETRIES) {
                    debug.error(`failed to initialize the page, the maximum retry count is exceeded: ${MAX_RETRIES}`);
                    // force the initialization status and continue
                    isInitialized = true;
                    showNotification('the contract initialization is timeout, some features may not be available', 'warning');
                } else {
                    initRetryCount++; // increase the retry count
                    console.log(`try to initialize the page, the ${initRetryCount}th time`);
                    
                    // initialize the contracts
                    await initializeContracts();
                    
                    // if still not initialized, check again after 2 seconds
                    setTimeout(function() {
                        if (!isInitialized) {
                            initStakingPage();
                        }
                    }, 2000);
                    
                    return;
                }
            }
            
            // check the dropdown options
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            const needsLoading = !stableCoinSelect || stableCoinSelect.options.length <= 1;
            
            // only load the basic UI when needed
            if (needsLoading) {
                loadContractInfo();
                loadSupportedStableCoins();
            }
            
            // if the wallet is connected, try to load the user information and the withdrawable stable coins, ensuring that the failure of one does not affect the other
            if (currentUserAddress) {
                try {
                    // get the account information
                    await refreshUserAccountInfo();
                } catch (userInfoError) {
                    debug.error('failed to refresh the user account information, but the other content will be loaded:', userInfoError);
                    showNotification('failed to load the user information, some data may be unavailable', 'warning');
                }
            } else {
                // reset the current page
                resetStakingPage();
            }
            
            // try to load the withdrawable stable coins
            try {
                await loadWithdrawableStableCoins();
            } catch (withdrawableError) {
                debug.error('failed to load the withdrawable stable coins:', withdrawableError);
            }
            
            setPageStatus("");
            
        } catch (error) {
            console.error("failed to initialize the staking page:", error);
            
            // ensure the dropdown options are loaded
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            if (stableCoinSelect && stableCoinSelect.options.length <= 1) {
                loadSupportedStableCoins();
            }
            
            // try to load the withdrawable stable coins
            try {
                loadWithdrawableStableCoins();
            } catch (withdrawableError) {
                debug.error('failed to load the withdrawable stable coins:', withdrawableError);
            }
            
            // if the maximum retry count is not reached, delay and retry
            if (initRetryCount < MAX_RETRIES) {
                console.log(`failed to initialize the page, ${2000}ms later retry...`);
                setTimeout(initStakingPage, 2000);
            } else {
                setPageStatus("failed to initialize the page, please refresh the page or try again later");
                showNotification("failed to initialize the page, please refresh the page or try again later", "warning");
            }
        }
    }
    
    /**
     * load the contract basic information
     */
    async function loadContractInfo() {
        try {
            if (!pwusdStakingContract) {
                debug.error('failed to load the contract information: the contract is not initialized');
                // set the default values
                document.getElementById('currentCycle').textContent = '?';
                document.getElementById('rewardRate').textContent = '?';
                document.getElementById('totalStakedAmount').textContent = '?';
                document.getElementById('totalClaimedPwPoints').textContent = '?';
                // clear the possible timers
                clearNextCycleUpdateTimer();
                return;
            }
            
            // get the information of the cycle, including the current cycle and the last update time
            try {
                let currentCycle = 0;
                let lastUpdateTime = 0;
                let cycleDuration = 0;
                
                // get the basic information
                try {
                    // get the current cycle
                    const cycleResult = await pwusdStakingContract.methods.currentCycle().call();
                    currentCycle = parseInt(cycleResult);
                    
                    // get the last update timestamp
                    const lastUpdateTimestampResult = await pwusdStakingContract.methods.lastUpdateTimestamp().call();
                    lastUpdateTime = parseInt(lastUpdateTimestampResult);
                    window.lastUpdateTimestamp = lastUpdateTimestampResult; // save as a global variable for calculating the rewards
                    
                    // get the cycle duration (usually 1 day = 86400 seconds)
                    const cycleDurationResult = await pwusdStakingContract.methods.CYCLE_DURATION().call();
                    cycleDuration = parseInt(cycleDurationResult);
                    
                    debug.log(`get the basic cycle information: current cycle=${currentCycle}, last update time=${lastUpdateTime}, cycle duration=${cycleDuration} seconds`);
                } catch (infoError) {
                    debug.error('failed to get the cycle basic information:', infoError);
                    throw infoError; // rethrow the error, trigger the external catch
                }
                
                // check if the values are valid
                if (isNaN(currentCycle) || isNaN(lastUpdateTime) || isNaN(cycleDuration) || cycleDuration === 0) {
                    debug.error('the cycle related values are invalid:', {currentCycle, lastUpdateTime, cycleDuration});
                    throw new Error('invalid cycle data');
                }
                
                // calculate the actual cycle (considering the case where the chain data is not updated)
                let displayCycle = currentCycle;
                const now = Math.floor(Date.now() / 1000); // the current timestamp (seconds)
                const timeSinceLastUpdate = now - lastUpdateTime;
                
                // calculate the number of complete cycles since the last update
                if (timeSinceLastUpdate > 0 && cycleDuration > 0) {
                    const additionalCycles = Math.floor(timeSinceLastUpdate / cycleDuration);
                    
                    if (additionalCycles > 0) {
                        displayCycle += additionalCycles;
                        debug.log(`calculate the additional cycles based on the time difference: +${additionalCycles}, the latest cycle=${displayCycle}`);
                    }
                }
                
                // update the global variable
                currentCycleValue = displayCycle;
                
                // calculate the next cycle update timestamp
                nextCycleUpdateTimestamp = lastUpdateTime + ((Math.floor(timeSinceLastUpdate / cycleDuration) + 1) * cycleDuration);
                
                // update the UI display
                const currentCycleElement = document.getElementById('currentCycle');
                if (currentCycleElement) {
                    // display the calculated cycle value
                    currentCycleElement.textContent = displayCycle.toString();
                    
                    // start or update the dynamic time display
                    updateNextCycleDisplay();
                    
                    // clear the old timer and start a new timer
                    clearNextCycleUpdateTimer();
                    nextCycleUpdateInterval = setInterval(updateNextCycleDisplay, 1000);
                    
                    // if there are additional cycles, add the prompt information
                    if (displayCycle > currentCycle) {
                        // create or update the prompt element
                        let cycleTooltip = document.getElementById('cycleTooltip');
                        if (!cycleTooltip) {
                            cycleTooltip = document.createElement('small');
                            cycleTooltip.id = 'cycleTooltip';
                            cycleTooltip.style.display = 'block';
                            cycleTooltip.style.fontSize = '0.8rem';
                            cycleTooltip.style.color = '#666';
                            cycleTooltip.style.marginTop = '4px';
                            
                            // insert it after the cycle element, but before the next update time
                            const parentElement = currentCycleElement.parentElement;
                            const nextUpdateElement = document.getElementById('nextCycleUpdate');
                            if (parentElement && nextUpdateElement) {
                                parentElement.insertBefore(cycleTooltip, nextUpdateElement);
                            }
                        }
                        
                        // calculate the number of days since the last update
                        const daysSinceUpdate = Math.floor(timeSinceLastUpdate / 86400); // 86400 seconds = 1 day
                        cycleTooltip.textContent = `chain data:${currentCycle} (${daysSinceUpdate} days ago)`;
                    } else {
                        // if there are no additional cycles, remove the prompt (if it exists)
                        const cycleTooltip = document.getElementById('cycleTooltip');
                        if (cycleTooltip && cycleTooltip.parentElement) {
                            cycleTooltip.parentElement.removeChild(cycleTooltip);
                        }
                    }
                    
                    debug.log(`the cycle display has been updated, current value:${displayCycle}, chain value:${currentCycle}`);
                } else {
                    debug.error('cannot find the currentCycle element');
                }
            } catch (cycleError) {
                debug.error('failed to process the cycle information:', cycleError);
                const currentCycleElement = document.getElementById('currentCycle');
                if (currentCycleElement) currentCycleElement.textContent = '?';
                clearNextCycleUpdateTimer(); // clear the timer
                
                // remove the cycle related prompt element (if it exists)
                const cycleTooltip = document.getElementById('cycleTooltip');
                if (cycleTooltip && cycleTooltip.parentElement) {
                    cycleTooltip.parentElement.removeChild(cycleTooltip);
                }
                
                const nextUpdateElement = document.getElementById('nextCycleUpdate');
                if (nextUpdateElement && nextUpdateElement.parentElement) {
                    nextUpdateElement.parentElement.removeChild(nextUpdateElement);
                }
            }
            
            // get and display the total staked amount
            try {
                const totalStakedAmountElement = document.getElementById('totalStakedAmount');
                if (totalStakedAmountElement) {
                    const totalStakedResult = await pwusdStakingContract.methods.totalStakedAmount().call();
                    // format the amount (convert from 18 decimal places to a readable format)
                    const formattedTotalStaked = formatTokenAmount(totalStakedResult, 18);
                    totalStakedAmountElement.textContent = `$${formattedTotalStaked}`;
                    debug.log('total staked amount:', formattedTotalStaked);
                }
            } catch (totalStakedError) {
                debug.error('failed to get the total staked amount:', totalStakedError);
                const totalStakedAmountElement = document.getElementById('totalStakedAmount');
                if (totalStakedAmountElement) totalStakedAmountElement.textContent = '?';
            }
            
            // get and display the total claimed PWP
            try {
                const totalClaimedPwPointsElement = document.getElementById('totalClaimedPwPoints');
                if (totalClaimedPwPointsElement) {
                    const totalClaimedResult = await pwusdStakingContract.methods.totalClaimedPwPoints().call();
                    // format the number (remove the decimal part)
                    const formattedTotalClaimed = formatTokenAmount(totalClaimedResult, 0);
                    totalClaimedPwPointsElement.textContent = `${formattedTotalClaimed} (PWP,PWB)`;
                    debug.log('total claimed:', formattedTotalClaimed);
                }
            } catch (totalClaimedError) {
                debug.error('failed to get the total claimed:', totalClaimedError);
                const totalClaimedPwPointsElement = document.getElementById('totalClaimedPwPoints');
                if (totalClaimedPwPointsElement) totalClaimedPwPointsElement.textContent = '?';
            }
            
            const rewardRateElement = document.getElementById('rewardRate');
            if (rewardRateElement) {
                rewardRateElement.textContent = "$10 = 2PWP + 2PWB";
            } 
            
            debug.log('the contract basic information has been loaded');
        } catch (error) {
            debug.error('failed to load the contract basic information:', error);
            
            // set the default values
            const currentCycleElement = document.getElementById('currentCycle');
            const rewardRateElement = document.getElementById('rewardRate');
            const totalStakedAmountElement = document.getElementById('totalStakedAmount');
            const totalClaimedPwPointsElement = document.getElementById('totalClaimedPwPoints');
            
            if (currentCycleElement) currentCycleElement.textContent = '?';
            if (rewardRateElement) rewardRateElement.textContent = '?';
            if (totalStakedAmountElement) totalStakedAmountElement.textContent = '?';
            if (totalClaimedPwPointsElement) totalClaimedPwPointsElement.textContent = '?';
            
            clearNextCycleUpdateTimer(); // clear the timer
            
            // remove the cycle related prompt element (if it exists)
            const cycleTooltip = document.getElementById('cycleTooltip');
            if (cycleTooltip && cycleTooltip.parentElement) {
                cycleTooltip.parentElement.removeChild(cycleTooltip);
            }
            
            const nextUpdateElement = document.getElementById('nextCycleUpdate');
            if (nextUpdateElement && nextUpdateElement.parentElement) {
                nextUpdateElement.parentElement.removeChild(nextUpdateElement);
            }
        }
    }

    /**
     * update the next cycle countdown display
     */
    function updateNextCycleDisplay() {
        if (nextCycleUpdateTimestamp <= 0) {
            return; // no valid timestamp
        }
        
        const now = Math.floor(Date.now() / 1000);
        const timeUntilNextUpdate = nextCycleUpdateTimestamp - now;
        let nextUpdateDisplay = '';
        
        if (timeUntilNextUpdate > 0) {
            const hoursLeft = Math.floor(timeUntilNextUpdate / 3600);
            const minutesLeft = Math.floor((timeUntilNextUpdate % 3600) / 60);
            const secondsLeft = Math.floor(timeUntilNextUpdate % 60);
            
            if (hoursLeft > 0) {
                nextUpdateDisplay = `${hoursLeft} hours ${minutesLeft} minutes later`;
            } else if (minutesLeft > 0) {
                nextUpdateDisplay = `${minutesLeft} minutes ${secondsLeft} seconds later`;
            } else {
                nextUpdateDisplay = `${secondsLeft} seconds later`;
            }
        } else {
            nextUpdateDisplay = 'updating soon';
            // the time is up, stop the timer, and optionally trigger a refresh
            clearNextCycleUpdateTimer();
            // optionally: automatically refresh the data
            // refreshData(); 
        }
        
        // update the UI
        let nextUpdateElement = document.getElementById('nextCycleUpdate');
        if (!nextUpdateElement) {
            // if the element does not exist, create it
            const currentCycleElement = document.getElementById('currentCycle');
            if (!currentCycleElement) return; // if the current cycle element does not exist, exit
            
            nextUpdateElement = document.createElement('small');
            nextUpdateElement.id = 'nextCycleUpdate';
            nextUpdateElement.style.display = 'block';
            nextUpdateElement.style.fontSize = '0.8rem';
            nextUpdateElement.style.color = '#666';
            nextUpdateElement.style.marginTop = '4px';
            
            const parentElement = currentCycleElement.parentElement;
            if (parentElement) {
                parentElement.appendChild(nextUpdateElement);
            }
        }
        
        nextUpdateElement.textContent = `next cycle: ${nextUpdateDisplay}`;
    }
    
    /**
     * clear the next cycle update timer
     */
    function clearNextCycleUpdateTimer() {
        if (nextCycleUpdateInterval) {
            clearInterval(nextCycleUpdateInterval);
            nextCycleUpdateInterval = null;
            debug.log('cleared the next cycle update timer');
        }
    }
    
    /**
     * load the supported stable coins list
     */
    async function loadSupportedStableCoins() {
        try {
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            
            if (!stableCoinSelect) {
                debug.error('cannot find the stable coin select dropdown');
                return;
            }
            
            // check if the options have been loaded, if yes and it is not just the default option, skip the repeated loading
            if (stableCoinSelect.options.length > 1) {
                debug.log('the stable coin options have been loaded, skip the repeated loading');
                return;
            }
            
            // clear the existing options
            stableCoinSelect.innerHTML = '<option value="" disabled selected data-i18n="stableStaking.form.selectPlaceholder">Select a stable coin</option>';
            
            // get the stable coin list from the SupportedStableCoins module
            if (!window.SupportedStableCoins) {
                debug.error('the SupportedStableCoins module is not loaded');
                showNotification('the stable coin module is not loaded, please refresh the page', 'error');
                return;
            }
            
            // get all the supported stable coins
            const allStableCoins = window.SupportedStableCoins.getAllStableCoins();
            debug.log('the supported stable coin list:', allStableCoins);
            
            // if no stable coin is found
            if (!allStableCoins || allStableCoins.length === 0) {
                debug.error('no stable coin definition found');
                
                // add the prompt option
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.textContent = "no stable coin definition found";
                stableCoinSelect.appendChild(option);
                return;
            }
            
            // used to track the addresses that have been added to the dropdown
            const addedAddresses = new Set();

            // check if the pwusdStakingContract is available
            if (!pwusdStakingContract || !isInitialized) {
                debug.log('the PwUSDStaking contract is not initialized or the page is not fully initialized, show all the available stable coins');
                
                // use the fallback scheme: show all the known stable coins but do not check the contract support
                for (const coin of allStableCoins) {
                    // if the address has been added to the dropdown, skip it
                    if (addedAddresses.has(coin.address.toLowerCase())) {
                        continue;
                    }
                    
                    // add to the supported list (assuming it is supported)
                    let coinExists = supportedStableCoins.find(c => c.address.toLowerCase() === coin.address.toLowerCase());
                    if (!coinExists) {
                        supportedStableCoins.push(coin);
                    }
                    
                    // add to the dropdown
                    const option = document.createElement('option');
                    option.value = coin.address;
                    option.textContent = `${coin.symbol} (${coin.name})`;
                    stableCoinSelect.appendChild(option);
                    
                    // record the added address
                    addedAddresses.add(coin.address.toLowerCase());
                    
                    debug.log(`${coin.symbol} has been added to the possible supported list (not verified)`);
                }
                
                return;
            }

            // if the contract is available, verify the supported stable coins
            try {
                // create the supported stable coin list
                let foundSupportedCoins = false;
                
                for (const coin of allStableCoins) {
                    try {
                        // if the address has been added to the dropdown, skip it
                        if (addedAddresses.has(coin.address.toLowerCase())) {
                            continue;
                        }
                        
                        // check if the stable coin is supported by the contract
                        const supported = await pwusdStakingContract.methods.supportedStableCoins(coin.address).call();
                        
                        if (supported) {
                            foundSupportedCoins = true;
                            
                            // add to the supported list
                            let coinExists = supportedStableCoins.find(c => c.address.toLowerCase() === coin.address.toLowerCase());
                            if (!coinExists) {
                                supportedStableCoins.push(coin);
                            }
                            
                            // add to the dropdown
                            const option = document.createElement('option');
                            option.value = coin.address;
                            option.textContent = `${coin.symbol} (${coin.name})`;
                            stableCoinSelect.appendChild(option);
                            
                            // record the added address
                            addedAddresses.add(coin.address.toLowerCase());
                            
                            debug.log(`${coin.symbol} has been added to the supported list`);
                        } else {
                            debug.log(`${coin.symbol} is not in the contract supported list`);
                        }
                    } catch (error) {
                        debug.error(`error checking if ${coin.symbol} is supported:`, error);
                    }
                }
                
                // if no supported stable coin is found
                if (!foundSupportedCoins && supportedStableCoins.length === 0) {
                    debug.log('no supported stable coin found');
                    
                    // add the prompt option
                    const option = document.createElement('option');
                    option.value = "";
                    option.disabled = true;
                    option.textContent = "no supported stable coin found";
                    stableCoinSelect.appendChild(option);
                }
            } catch (error) {
                debug.error('failed to verify the stable coin support, use all the known stable coins as the fallback:', error);
                
                // if the verification fails, show all the known stable coins
                for (const coin of allStableCoins) {
                    // if the address has been added to the dropdown, skip it
                    if (addedAddresses.has(coin.address.toLowerCase())) {
                        continue;
                    }
                    
                    // add to the supported list (assuming it is supported)
                    let coinExists = supportedStableCoins.find(c => c.address.toLowerCase() === coin.address.toLowerCase());
                    if (!coinExists) {
                        supportedStableCoins.push(coin);
                    }
                    
                    // add to the dropdown
                    const option = document.createElement('option');
                    option.value = coin.address;
                    option.textContent = `${coin.symbol} (${coin.name})`;
                    stableCoinSelect.appendChild(option);
                    
                    // record the added address
                    addedAddresses.add(coin.address.toLowerCase());
                }
            }
            
            debug.log('supported stable coin list loaded', supportedStableCoins);
        } catch (error) {
            debug.error('failed to load the supported stable coin list:', error);
            showNotification('failed to load the stable coin list', 'error');
            
            // add the error prompt option
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            if (stableCoinSelect) {
                const option = document.createElement('option');
                option.value = "";
                option.disabled = true;
                option.textContent = "failed to load, please refresh and try again";
                stableCoinSelect.appendChild(option);
            }
        }
    }
    
    /**
     * load the user staking information
     */
    async function loadUserStakingInfo() {
        try {
            if (!currentUserAddress || !pwusdStakingContract) {
                debug.error('failed to load the user staking information: the user address or the contract is not initialized');
                return;
            }
            
            debug.log('loading the user staking information...');
            
            // ensure the staking history element is present
            const stakingHistoryElement = document.querySelector('.staking-history');
            const rewardsListElement = document.querySelector('.rewards-list');
            
            if (!stakingHistoryElement) {
                debug.error('cannot find the staking history container (.staking-history), cannot display the staking history');
                return;
            }
            
            if (!rewardsListElement) {
                debug.error('cannot find the rewards list container (.rewards-list), cannot display the rewards information');
                return;
            }
            
            // create or get the necessary DOM elements
            let noHistoryMessage = document.getElementById('noHistoryMessage');
            let stakingHistoryList = document.getElementById('stakingHistoryList');
            let noRewardsMessage = document.getElementById('noRewardsMessage');
            let rewardsList = document.getElementById('rewardsList');
            let withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
            
            // create the staking history list element (if it does not exist)
            if (!stakingHistoryList) {
                debug.log('create the staking history list element');
                stakingHistoryList = document.createElement('div');
                stakingHistoryList.id = 'stakingHistoryList';
                stakingHistoryList.className = 'staking-history-list';
                
                // find the most suitable parent element
                const historyTable = stakingHistoryElement.querySelector('.history-table') || stakingHistoryElement;
                historyTable.appendChild(stakingHistoryList);
            }
            
            // create the no staking history prompt (if it does not exist)
            if (!noHistoryMessage) {
                debug.log('create the noHistoryMessage element');
                noHistoryMessage = document.createElement('div');
                noHistoryMessage.id = 'noHistoryMessage';
                noHistoryMessage.className = 'no-history';
                noHistoryMessage.innerHTML = '<p data-i18n="stableStaking.history.noHistory">you have no staking record</p>';
                stakingHistoryElement.appendChild(noHistoryMessage);
            }
            
            // create the rewards list element (if it does not exist)
            if (!rewardsList) {
                debug.log('create the rewardsList element');
                rewardsList = document.createElement('div');
                rewardsList.id = 'rewardsList';
                rewardsList.className = 'rewards-list-items';
                rewardsListElement.appendChild(rewardsList);
            }
            
            // create the no rewards prompt (if it does not exist)
            if (!noRewardsMessage) {
                debug.log('create the noRewardsMessage element');
                noRewardsMessage = document.createElement('div');
                noRewardsMessage.id = 'noRewardsMessage';
                noRewardsMessage.className = 'no-rewards';
                noRewardsMessage.innerHTML = '<p data-i18n="stableStaking.rewards.noRewards">you have no rewards to claim</p>';
                rewardsListElement.appendChild(noRewardsMessage);
            }
            
            // check the necessary DOM elements again
            if (!stakingHistoryList) {
                debug.error('failed to create or find the stakingHistoryList element, abort the loading');
                return;
            }
            
            if (!rewardsList) {
                debug.error('failed to create or find the rewardsList element, abort the loading');
                return;
            }
            
            // clear the staking history list and rewards list
            stakingHistoryList.innerHTML = '';
            rewardsList.innerHTML = '';
            debug.log('cleared the staking history list and rewards list, ready to reload');
            
            // clear the withdraw stable coin select, keep the default option
            if (withdrawStableCoinSelect) {
                withdrawStableCoinSelect.innerHTML = '<option value="" disabled selected data-i18n="stableStaking.form.selectPlaceholder">Select a stable coin</option>';
                debug.log('cleared the withdraw stable coin select, keep the default option');
            }
            
            // first query if the user has any staked stable coins, instead of directly accessing the array
            let isActiveStaker = false;
            try {
                isActiveStaker = await pwusdStakingContract.methods.isActiveStaker(currentUserAddress).call();
                debug.log('is the user an active staker:', isActiveStaker);
            } catch (error) {
                debug.error('failed to check if the user is an active staker:', error);
                // if the user is not an active staker, show the empty list
                if (noHistoryMessage) noHistoryMessage.style.display = 'block';
                if (noRewardsMessage) noRewardsMessage.style.display = 'block';
                return;
            }
            
            if (!isActiveStaker) {
                // show the no staking record information
                if (noHistoryMessage) noHistoryMessage.style.display = 'block';
                if (stakingHistoryList) stakingHistoryList.innerHTML = '';
                if (noRewardsMessage) noRewardsMessage.style.display = 'block';
                if (rewardsList) rewardsList.innerHTML = '';
                return;
            }
            
            // the user is an active staker, try to get the supported stable coin list
            let supportedCoinAddresses = [];
            try {
                // if there is a supported stable coin list, use it
                if (supportedStableCoins && supportedStableCoins.length > 0) {
                    supportedCoinAddresses = supportedStableCoins.map(coin => coin.address);
                }
            } catch (error) {
                debug.error('failed to get the supported stable coin list:', error);
            }
            
            // get the user all staking information
            userStakingInfo = [];
            
            // do not use the loop to access the array directly, instead, check each supported stable coin if the user has staked
            for (let i = 0; i < supportedCoinAddresses.length; i++) {
                const coinAddress = supportedCoinAddresses[i];
                let hasActiveStaking = false;
                let stakingIndex = 0;
                
                // first step: check if the user has staked the stable coin
                try {
                    hasActiveStaking = await pwusdStakingContract.methods.hasActiveStaking(currentUserAddress, coinAddress).call();
                } catch (checkError) {
                    debug.error(`failed to check if the user has staked ${coinAddress}:`, checkError);
                    continue; // skip this stable coin, and continue to the next one
                }
                
                if (!hasActiveStaking) {
                    debug.log(`the user has no staking for ${coinAddress}`);
                    continue; // skip this stable coin, and continue to the next one
                }
                
                debug.log(`the user has staked ${coinAddress}, try to get the staking information`);
                
                // second step: try to get the staking index
                try {
                    stakingIndex = await pwusdStakingContract.methods.userStakingIndexByToken(currentUserAddress, coinAddress).call();
                } catch (indexError) {
                    debug.error(`failed to get the staking index for ${coinAddress}:`, indexError);
                    continue; // skip this stable coin, and continue to the next one
                }
                
                // third step: use the index to get the full information
                try {
                    const info = await pwusdStakingContract.methods.userStakingInfo(currentUserAddress, stakingIndex).call();
                    
                    // verify if the information is valid
                    if (!info || !info.stakedAmount || info.stakedAmount === '0') {
                        debug.warn(`the staking information for ${coinAddress} is invalid or zero:`, info);
                        continue; // the information is invalid, skip this stable coin
                    }
                    
                    // add to the staking information list
                    userStakingInfo.push({
                        index: parseInt(stakingIndex),
                        stableCoin: info.stableCoin,
                        stakedAmount: info.stakedAmount,
                        lastClaimedCycle: parseInt(info.lastClaimedCycle || '0'),
                        pendingPwPoints: info.pendingPwPoints || '0'
                    });
                    
                    // add to the staking history table
                    addStakingHistoryItem(info, stakingIndex);
                    
                    // add to the withdraw dropdown (if it exists)
                    if (withdrawStableCoinSelect) {
                        addWithdrawOption(info);
                    }
                    
                    // add to the rewards list (if it exists)
                    addRewardItem(info, stakingIndex);
                    
                } catch (infoError) {
                    debug.error(`failed to get the full staking information for ${coinAddress}:`, infoError);
                    // continue to the next stable coin
                    continue;
                }
            }
            
            // if there is no staking record, show the corresponding prompt
            if (userStakingInfo.length === 0) {
                if (noHistoryMessage) noHistoryMessage.style.display = 'block';
                if (noRewardsMessage) noRewardsMessage.style.display = 'block';
            } else {
                if (noHistoryMessage) noHistoryMessage.style.display = 'none';
                if (noRewardsMessage) {
                    // check if there are really no rewards
                    const hasRewards = userStakingInfo.some(info => info.pendingPwPoints !== '0');
                    noRewardsMessage.style.display = hasRewards ? 'none' : 'block';
                }
            }
            
            debug.log('the user staking information loaded', userStakingInfo);
        } catch (error) {
            debug.error('failed to load the user staking information:', error);
            showNotification('failed to load the staking information, please refresh the page and try again', 'error');
            
            // show the empty state
            const noHistoryMessage = document.getElementById('noHistoryMessage');
            const noRewardsMessage = document.getElementById('noRewardsMessage');
            if (noHistoryMessage) noHistoryMessage.style.display = 'block';
            if (noRewardsMessage) noRewardsMessage.style.display = 'block';
        }
    }
    
    /**
     * calculate the pending rewards
     * @param {Object} stakingInfo - the staking information
     * @param {number} currentCycle - the current cycle
     * @param {number} lastUpdateTime - the last update timestamp
     * @returns {string} the calculated pending rewards
     */
    function calculatePendingRewards(stakingInfo, currentCycle, lastUpdateTime) {
        try {
            if (!stakingInfo || !stakingInfo.stakedAmount || stakingInfo.stakedAmount === '0') {
                return '0';
            }
            
            // convert the staked amount from 18 decimal places to the normal unit (equivalent to dividing by 10^18)
            // first create the BigInt version
            const stakedAmountBigInt = BigInt(stakingInfo.stakedAmount);
            // then convert to the normal uint unit to reduce the calculation
            const stakedAmountUint = Number(stakedAmountBigInt / BigInt(1e18));
            
            // the number of cycles from the last claimed cycle to the current cycle
            let cyclesPassed = currentCycle - stakingInfo.lastClaimedCycle;
            
            // consider the case that the chain data is not updated, calculate the additional cycles
            const now = Math.floor(Date.now() / 1000); // the current timestamp (seconds)
            const timeSinceLastUpdate = now - lastUpdateTime;
            const cycleDuration = 86400; // one cycle per day, unit: seconds
            
            // calculate the number of complete cycles that have passed since the last update
            if (timeSinceLastUpdate > 0) {
                const additionalCycles = Math.floor(timeSinceLastUpdate / cycleDuration);
                cyclesPassed += additionalCycles;
            }
            
            // if there are no complete cycles passed, return the pending rewards in the contract
            if (cyclesPassed <= 0) {
                return stakingInfo.pendingPwPoints || '0';
            }
            
            // use the normal uint to calculate
            // the reward rate: 5 PWP per 10 USD
            // assume each stable coin unit is 1 USD, each unit of stable coin gets 0.5 PWP
            const rewardRatePerToken = 0.5; // the normal unit, each stable coin gets 0.5 PWP
            
            // calculate the total rewards: staked amount * reward rate * cycles passed
            const contractPendingRewards = parseInt(stakingInfo.pendingPwPoints || '0');
            const additionalRewards = stakedAmountUint * rewardRatePerToken * cyclesPassed;
            const totalPendingRewards = contractPendingRewards + Math.floor(additionalRewards);
            
            console.log(`calculate the rewards (optimized): original rewards=${contractPendingRewards}, additional rewards=${additionalRewards}, total rewards=${totalPendingRewards}`);

            return totalPendingRewards.toString();
        } catch (error) {
            debug.error('failed to calculate the pending rewards:', error);
            return stakingInfo.pendingPwPoints || '0';
        }
    }
    
    /**
     * add the staking history item to the table
     * @param {Object} info - the staking information
     * @param {number} index - the staking index
     */
    function addStakingHistoryItem(info, index) {
        try {
            const stakingHistoryList = document.getElementById('stakingHistoryList');
            if (!stakingHistoryList) {
                debug.error('cannot find the stakingHistoryList element');
                return;
            }
            
            // check if the item already exists
            const existingItem = stakingHistoryList.querySelector(`.history-item[data-coin="${info.stableCoin}"][data-index="${index}"]`);
            if (existingItem) {
                debug.log(`the staking history item already exists: coin=${info.stableCoin}, index=${index}`);
                
                // calculate the actual pending rewards (considering the case that the chain data is not updated)
                const calculatedPendingRewards = calculatePendingRewards(
                    info, 
                    currentCycleValue, 
                    pwusdStakingContract ? parseInt(lastUpdateTimestamp || '0') : 0
                );
                
                const lastClaimed = info.lastClaimedCycle > 0 ? `cycle ${info.lastClaimedCycle}` : 'not claimed';
                
                existingItem.querySelector('.history-cell:nth-child(3)').textContent = lastClaimed;
                existingItem.querySelector('.history-cell:nth-child(4)').textContent = `${calculatedPendingRewards} (PWP,PWB)`;
                
                return;
            }
            
            // get the stable coin symbol
            let stableCoinSymbol = getStableCoinSymbol(info.stableCoin);
            
            // format the amount
            const formattedAmount = formatTokenAmount(info.stakedAmount, 18);
            
            // format the last claimed cycle
            const formattedLastClaim = info.lastClaimedCycle > 0 ? 
                `cycle ${info.lastClaimedCycle}` : 
                'not claimed';
            
            // calculate the actual pending rewards (considering the case that the chain data is not updated)
            const calculatedPendingRewards = calculatePendingRewards(
                info, 
                currentCycleValue, 
                pwusdStakingContract ? parseInt(lastUpdateTimestamp || '0') : 0
            );
            
            // format the pending rewards
            const formattedPendingRewards = formatTokenAmount(calculatedPendingRewards, 0);
            
            // create the history item
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            // add the data attribute for later lookup and update
            historyItem.setAttribute('data-coin', info.stableCoin);
            historyItem.setAttribute('data-index', index);
            historyItem.innerHTML = `
                <div class="history-cell">${stableCoinSymbol}</div>
                <div class="history-cell">${formattedAmount}</div>
                <div class="history-cell">${formattedLastClaim}</div>
                <div class="history-cell">${formattedPendingRewards} PWP</div>
                <div class="history-cell">
                    <button class="action-btn claim-btn" data-index="${index}" data-coin="${info.stableCoin}">claim</button>
                </div>
            `;
            
            // add to the list
            stakingHistoryList.appendChild(historyItem);
            
            // bind the claim button event
            const claimBtn = historyItem.querySelector('.claim-btn');
            if (claimBtn) {
                claimBtn.addEventListener('click', function() {
                    const stableCoin = this.getAttribute('data-coin');
                    claimRewards(stableCoin);
                });
            }
        } catch (error) {
            debug.error('failed to add the staking history item:', error);
        }
    }
    
    /**
     * add the withdraw option to the dropdown
     * @param {Object} info - the staking information
     */
    function addWithdrawOption(info) {
        try {
            const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
            if (!withdrawStableCoinSelect) {
                debug.error('cannot find the withdrawStableCoinSelect element');
                return;
            }
            
            // check if the option already exists
            const existingOption = Array.from(withdrawStableCoinSelect.options).find(
                option => option.value === info.stableCoin
            );
            
            if (existingOption) {
                debug.log(`the withdraw option already exists: ${info.stableCoin}`);
                return;
            }
            
            // format the amount
            const formattedAmount = formatTokenAmount(info.stakedAmount, 18);
            
            // try to get the information from the withdrawable stable coin list
            let withdrawableCoin = null;
            if (window.SupportedStableCoins && typeof window.SupportedStableCoins.getAllWithdrawableStableCoins === 'function') {
                const withdrawableCoins = window.SupportedStableCoins.getAllWithdrawableStableCoins();
                withdrawableCoin = withdrawableCoins.find(coin => 
                    coin.address.toLowerCase() === info.stableCoin.toLowerCase()
                );
            }
            
            // if the withdrawable stable coin definition is found, use it
            let displaySymbol, displayName;
            if (withdrawableCoin) {
                displaySymbol = withdrawableCoin.symbol;
                displayName = withdrawableCoin.name;
            } else {
                // otherwise, use the original stable coin symbol
                displaySymbol = getStableCoinSymbol(info.stableCoin);
                displayName = "";
            }
            
            // create the option
            const option = document.createElement('option');
            option.value = info.stableCoin;
            if (displayName) {
                option.textContent = `${displaySymbol} (${displayName} - staked: ${formattedAmount})`;
            } else {
                option.textContent = `${displaySymbol} (staked: ${formattedAmount})`;
            }
            option.dataset.amount = info.stakedAmount;
            
            // add to the dropdown
            withdrawStableCoinSelect.appendChild(option);
            
            debug.log(`add the withdraw option: ${displaySymbol}, address: ${info.stableCoin}`);
        } catch (error) {
            debug.error('failed to add the withdraw option:', error);
        }
    }
    
    /**
     * add the reward item to the rewards list
     * @param {Object} info - the staking information
     * @param {number} index - the staking index
     */
    function addRewardItem(info, index) {
        try {
            // calculate the actual pending rewards (considering the case that the chain data is not updated)
            const calculatedPendingRewards = calculatePendingRewards(
                info, 
                currentCycleValue, 
                pwusdStakingContract ? parseInt(lastUpdateTimestamp || '0') : 0
            );
            
            // if there is no pending rewards, do not add the item
            if (calculatedPendingRewards === '0') {
                return;
            }
            
            const rewardsList = document.getElementById('rewardsList');
            if (!rewardsList) {
                debug.error('cannot find the rewardsList element');
                return;
            }
            
            // check if the item already exists
            const existingItem = rewardsList.querySelector(`.reward-item[data-coin="${info.stableCoin}"][data-index="${index}"]`);
            if (existingItem) {
                debug.log(`the reward item already exists: coin=${info.stableCoin}, index=${index}`);
                
                // update the existing item (if there is any change)
                const formattedPendingRewards = formatTokenAmount(calculatedPendingRewards, 0);
                existingItem.querySelector('.reward-amount').textContent = `${formattedPendingRewards} PWP`;
                
                return;
            }
            
            // get the stable coin symbol
            let stableCoinSymbol = getStableCoinSymbol(info.stableCoin);
            
            // format the pending rewards
            const formattedPendingRewards = formatTokenAmount(calculatedPendingRewards, 0);
            
            // create the reward item
            const rewardItem = document.createElement('div');
            rewardItem.className = 'reward-item';
            // add the data attribute for later lookup and update
            rewardItem.setAttribute('data-coin', info.stableCoin);
            rewardItem.setAttribute('data-index', index);
            rewardItem.innerHTML = `
                <div class="reward-info">
                    <div class="reward-token">${stableCoinSymbol} staked</div>
                    <div class="reward-amount">${formattedPendingRewards} PWP</div>
                </div>
                <button class="action-btn claim-btn" data-index="${index}" data-coin="${info.stableCoin}">claim</button>
            `;
            
            // add to the list
            rewardsList.appendChild(rewardItem);
            
            // bind the claim button event
            const claimBtn = rewardItem.querySelector('.claim-btn');
            if (claimBtn) {
                claimBtn.addEventListener('click', function() {
                    const stableCoin = this.getAttribute('data-coin');
                    claimRewards(stableCoin);
                });
            }
        } catch (error) {
            debug.error('failed to add the reward item:', error);
        }
    }
    
    /**
     * get the stable coin symbol
     * @param {string} address - the stable coin address
     * @returns {string} the stable coin symbol
     */
    function getStableCoinSymbol(address) {
        // first try to find from the locally cached supportedStableCoins
        const localCoin = supportedStableCoins.find(c => c.address.toLowerCase() === address.toLowerCase());
        if (localCoin) {
            return localCoin.symbol;
        }
        
        // if there is no coin in the locally cached supportedStableCoins, try to find from the SupportedStableCoins module directly
        if (window.SupportedStableCoins) {
            const coin = window.SupportedStableCoins.getStableCoinByAddress(address);
            if (coin) {
                return coin.symbol;
            }
        }
        
        return 'unknown stable coin';
    }
    
    /**
     * format the token amount
     * @param {string} amount - the original amount
     * @param {number} decimals - the number of decimal places
     * @returns {string} the formatted amount
     */
    function formatTokenAmount(amount, decimals) {
        if (!amount) return '0';
        
        // convert the big integer to the decimal string
        const balanceStr = amount.toString();
        
        if (balanceStr === '0') return '0';
        
        if (balanceStr.length <= decimals) {
            // if the number of digits is less than the number of decimal places, add zeros in front
            const zeros = '0'.repeat(decimals - balanceStr.length + 1);
            return `0.${zeros}${balanceStr}`.replace(/\.?0+$/, '');
        } else {
            // insert the decimal point
            const intPart = balanceStr.slice(0, balanceStr.length - decimals);
            const fracPart = balanceStr.slice(balanceStr.length - decimals);
            return `${intPart || '0'}.${fracPart}`.replace(/\.?0+$/, '');
        }
    }
    
    /**
     * handle the change of the stable coin select dropdown
     */
    async function handleStableCoinSelect() {
        const stableCoinSelect = document.getElementById('stableCoinSelect');
        const selectedStableCoin = stableCoinSelect.value;
        
        if (!selectedStableCoin) {
            document.getElementById('selectedStableCoinBalance').textContent = '0';
            return;
        }
        
        try {
            // get the contract of the selected stable coin
            const coin = supportedStableCoins.find(c => c.address === selectedStableCoin);
            if (!coin) {
                debug.error('cannot find the information of the selected stable coin');
                return;
            }
            
            // get the contract of the selected stable coin
            const stableCoinContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, selectedStableCoin);
            
            // get the balance
            const balance = await stableCoinContract.methods.balanceOf(currentUserAddress).call();
            
            // display the balance, using the specific number of decimal places of the coin
            document.getElementById('selectedStableCoinBalance').textContent = formatTokenAmount(balance, coin.decimals);
            
            debug.log(`get the balance of ${coin.symbol} successfully:`, balance);
        } catch (error) {
            debug.error('failed to get the balance of the stable coin:', error);
            document.getElementById('selectedStableCoinBalance').textContent = '0';
        }
    }
    
    /**
     * handle the change of the withdrawable stable coin select dropdown
     */
    function handleWithdrawCoinSelect() {
        const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
        const selectedOption = withdrawStableCoinSelect.options[withdrawStableCoinSelect.selectedIndex];
        
        if (!selectedOption || !selectedOption.value) {
            document.getElementById('stakedBalance').textContent = '0';
            return;
        }
        
        // get the staked amount
        const stakedAmount = selectedOption.dataset.amount;
        
        // display the staked amount
        document.getElementById('stakedBalance').textContent = formatTokenAmount(stakedAmount, 18);
    }
    
    /**
     * set the maximum amount
     * @param {string} type - the operation type, 'stake' or 'withdraw'
     */
    function setMaxAmount(type) {
        if (type === 'stake') {
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            const stakeAmount = document.getElementById('stakeAmount');
            const balance = document.getElementById('selectedStableCoinBalance').textContent;
            
            if (balance && balance !== '0') {
                stakeAmount.value = balance;
            }
        } else if (type === 'withdraw') {
            const withdrawAmount = document.getElementById('withdrawAmount');
            const stakedBalance = document.getElementById('stakedBalance').textContent;
            
            if (stakedBalance && stakedBalance !== '0') {
                withdrawAmount.value = stakedBalance;
            }
        }
    }
    
    /**
     * reset the staking page
     */
    function resetStakingPage() {
        debug.log('reset the staking page...');
        
        // reset the global variables
        supportedStableCoins = [];
        userStakingInfo = [];
        nextCycleUpdateTimestamp = 0;
        clearNextCycleUpdateTimer(); // stop the timer
        
        try {
            // reset the UI display
            const currentCycleElement = document.getElementById('currentCycle');
            const rewardRateElement = document.getElementById('rewardRate');
            const totalStakedAmountElement = document.getElementById('totalStakedAmount');
            const totalClaimedPwPointsElement = document.getElementById('totalClaimedPwPoints');
            
            if (currentCycleElement) {
                currentCycleElement.textContent = '-';
            }
            
            if (rewardRateElement) {
                rewardRateElement.textContent = '-';
            }
            
            if (totalStakedAmountElement) {
                totalStakedAmountElement.textContent = '-';
            }
            
            if (totalClaimedPwPointsElement) {
                totalClaimedPwPointsElement.textContent = '-';
            }
            
            // remove the cycle related tooltip element
            const cycleTooltip = document.getElementById('cycleTooltip');
            if (cycleTooltip && cycleTooltip.parentElement) {
                cycleTooltip.parentElement.removeChild(cycleTooltip);
            }
            
            const nextUpdateElement = document.getElementById('nextCycleUpdate');
            if (nextUpdateElement && nextUpdateElement.parentElement) {
                nextUpdateElement.parentElement.removeChild(nextUpdateElement);
            }
            
            // clear the dropdown
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
            
            if (stableCoinSelect) {
                stableCoinSelect.innerHTML = '<option value="" disabled selected data-i18n="stableStaking.form.selectPlaceholder">please select the stable coin</option>';
            }
            
            if (withdrawStableCoinSelect) {
                withdrawStableCoinSelect.innerHTML = '<option value="" disabled selected data-i18n="stableStaking.form.selectPlaceholder">please select the stable coin</option>';
            }
            
            // clear the balance display
            const selectedStableCoinBalance = document.getElementById('selectedStableCoinBalance');
            const stakedBalance = document.getElementById('stakedBalance');
            
            if (selectedStableCoinBalance) {
                selectedStableCoinBalance.textContent = '0';
            }
            
            if (stakedBalance) {
                stakedBalance.textContent = '0';
            }
            
            // handle the staking history
            const stakingHistoryList = document.getElementById('stakingHistoryList');
            if (stakingHistoryList) {
                // save or create the "no history" message element
                let noHistoryMessage = document.getElementById('noHistoryMessage');
                if (!noHistoryMessage) {
                    noHistoryMessage = document.createElement('div');
                    noHistoryMessage.id = 'noHistoryMessage';
                    noHistoryMessage.className = 'no-history';
                    noHistoryMessage.innerHTML = '<p data-i18n="stableStaking.history.noHistory">you have no staking history</p>';
                }
                
                // clear the list
                stakingHistoryList.innerHTML = '';
                
                // add the "no history" message back
                stakingHistoryList.appendChild(noHistoryMessage);
                noHistoryMessage.style.display = 'block';
            }
            
            // handle the rewards list
            const rewardsList = document.getElementById('rewardsList');
            if (rewardsList) {
                rewardsList.innerHTML = '';
            }
            
            // handle the "no rewards" message
            const noRewardsMessage = document.getElementById('noRewardsMessage');
            if (noRewardsMessage) {
                noRewardsMessage.style.display = 'block';
            }
            
            debug.log('the staking page has been reset');
        } catch (error) {
            debug.error('failed to reset the staking page:', error);
        }
    }
    
    /**
     * update the user staking information display
     * @param {Object|null} userInfo - the user staking information object, null when displaying the default value
     */
    function updateUserStakingDisplay(userInfo) {
        debug.log('update the user staking information display:', userInfo);
        
        try {
            // update the reward rate display - fixed to 1 PWP per $10 per day
            const rewardRateElement = document.getElementById('rewardRate');
            if (rewardRateElement) {
                // fixed to display the reward rate as "5 PWP / $10 / day"
                rewardRateElement.textContent = "5 PWP / $10 / day";
                debug.log('the reward rate has been updated to a fixed value: 1 PWP / $10 / day');
            }
            
            if (!userInfo) {
                debug.log('the user information is empty, displaying the default value');
                
                // clear the user related display
                const stakingHistoryList = document.getElementById('stakingHistoryList');
                const noHistoryMessage = document.getElementById('noHistoryMessage');
                const rewardsList = document.getElementById('rewardsList');
                const noRewardsMessage = document.getElementById('noRewardsMessage');
                
                // display the "no staking history" message
                if (noHistoryMessage) noHistoryMessage.style.display = 'block';
                if (stakingHistoryList) stakingHistoryList.innerHTML = '';
                
                // display the "no rewards" message
                if (noRewardsMessage) noRewardsMessage.style.display = 'block';
                if (rewardsList) rewardsList.innerHTML = '';
                
                return;
            }
            
            // if there is user information, here you can add additional user information display logic
            // but in the current implementation, the detailed user staking information and rewards display are handled by the loadUserStakingInfo function
        } catch (error) {
            debug.error('failed to update the user staking information display:', error);
        }
    }
    
    /**
     * load the withdrawable stable coin options
     */
    async function loadWithdrawableStableCoins() {
        try {
            const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
            
            if (!withdrawStableCoinSelect) {
                debug.error('failed to find the withdrawable stable coin select dropdown');
                return;
            }
            
            // check if the options have been loaded
            if (withdrawStableCoinSelect.options.length > 1) {
                debug.log('the withdrawable stable coin options have been loaded, skipping the duplicate loading');
                return;
            }
            
            // get the withdrawable stable coin list from the SupportedStableCoins module
            if (!window.SupportedStableCoins || typeof window.SupportedStableCoins.getAllWithdrawableStableCoins !== 'function') {
                debug.error('the SupportedStableCoins module is not loaded or does not support getting the withdrawable stable coin list');
                return;
            }
            
            // get the withdrawable stable coin list
            const withdrawableCoins = window.SupportedStableCoins.getAllWithdrawableStableCoins();
            debug.log('the withdrawable stable coin list:', withdrawableCoins);
            
            // if no withdrawable stable coin is found
            if (!withdrawableCoins || withdrawableCoins.length === 0) {
                debug.log('no withdrawable stable coin definition is found');
                return;
            }
            
            // used to track the addresses that have been added to the dropdown
            const addedAddresses = new Set();
            
            // add all the withdrawable stable coins
            for (const coin of withdrawableCoins) {
                // if the address has been added to the dropdown, skip
                if (addedAddresses.has(coin.address.toLowerCase())) {
                    continue;
                }
                
                try {
                    // check if the user has staking balance
                    let userHasStake = false;
                    
                    if (currentUserAddress && pwusdStakingContract) {
                        try {
                            const hasStake = await pwusdStakingContract.methods.hasActiveStaking(
                                currentUserAddress, 
                                coin.address
                            ).call();
                            
                            if (hasStake) {
                                userHasStake = true;
                                debug.log(`the user has ${coin.symbol} staking balance, will be loaded by the loadUserStakingInfo function`);
                                continue; // the user has staking balance, will be loaded by the loadUserStakingInfo function
                            }
                        } catch (error) {
                            debug.error(`failed to check if the user has ${coin.symbol} staking balance:`, error);
                        }
                    }
                    
                    if (!userHasStake) {
                        // create a virtual staking information object
                        const mockStakingInfo = {
                            stableCoin: coin.address,
                            stakedAmount: '0', // no staking balance
                        };
                        
                        // add to the dropdown
                        addWithdrawOption(mockStakingInfo);
                        
                        // record the added address
                        addedAddresses.add(coin.address.toLowerCase());
                    }
                } catch (error) {
                    debug.error(`failed to add the withdrawable stable coin ${coin.symbol}:`, error);
                }
            }
            
            debug.log('the withdrawable stable coin list has been loaded');
        } catch (error) {
            debug.error('failed to load the withdrawable stable coin list:', error);
        }
    }
    
    // add a refreshing flag
    let isRefreshing = false;

    /**
     * refresh the page data
     */
    async function refreshData() {
        debug.log('start to refresh the data...');
        
        try {
            // load the contract basic information, whether the wallet is connected or not
            await loadContractInfo();
            
            const walletHeader = window.WalletHeader;
            const isConnected = walletHeader && walletHeader.isWalletConnected;
            
            // if the wallet is connected, load the user related staking information
            if (isConnected) {
                // load the user staking data
                try {
                    if (pwusdStakingContract) {
                        // get the user's account address
                        const accounts = await web3.eth.getAccounts();
                        const userAddress = accounts[0];
                        
                        if (userAddress) {
                            // load the user staking data
                            loadUserStakingInfo(userAddress);
                        } else {
                            debug.warn('no user address found, cannot load the user staking information');
                        }
                    } else {
                        debug.warn('the contract is not initialized, cannot load the user staking information');
                    }
                } catch (userInfoError) {
                    debug.error('failed to load the user staking information:', userInfoError);
                    // even if failed to load the user staking information, continue to try to load the withdrawable stable coin
                }
                
                // load the withdrawable stable coin, even if the previous operation failed
                try {
                    loadWithdrawableStableCoins();
                } catch (withdrawError) {
                    debug.error('failed to load the withdrawable stable coin:', withdrawError);
                }
            } else {
                debug.warn('the wallet is not connected, skip to load the user staking information');
                updateUserStakingDisplay(null);
            }
            
            debug.log('the data has been refreshed');
        } catch (error) {
            debug.error('failed to refresh the data:', error);
            showNotification('failed to refresh the data, please try again later', 'error');
        }
    }

    // global export functions
    window.initStakingPage = initStakingPage;
    window.resetStakingPage = resetStakingPage;
    window.initializeContracts = initializeContracts;
    
    // listen to the wallet connection event
    window.addEventListener('wallet.walletConnected', function(event) {
        debug.log('received the wallet connection event:', event.detail);
        if (event.detail && event.detail.address) {
            currentUserAddress = event.detail.address;
        }
        
        // if the Web3 instance is not initialized, try to get it from the WalletHeader
        if (!web3 && window.WalletHeader) {
            web3 = window.WalletHeader.web3;
        }
        
        // if the Web3 instance and the address are already initialized, initialize the contracts
        if (web3 && currentUserAddress) {
            initializeContracts();
        }
    });

    // listen to the wallet disconnection event
    window.addEventListener('wallet.walletDisconnected', function() {
        debug.log('received the wallet disconnection event');
        // reset the status
        web3 = null;
        currentUserAddress = null;
        pwusdStakingContract = null;
        pwPointManagerContract = null;
        pwusdContract = null;
        isInitialized = false;
        
        // reset the page
        resetStakingPage();
    });

    // listen to the wallet connection warning event
    window.addEventListener('wallet.walletConnectionWarning', function(event) {
        debug.log('received the wallet connection warning event:', event.detail);
        // show the warning
        if (event.detail && event.detail.message) {
            showNotification(event.detail.message, 'warning');
        }
        
        // if the UI shows that the wallet is connected but the actual connection is not, try to reset the connection status
        if (window.WalletHeader && window.WalletHeader.isWalletConnected && (!web3 || !currentUserAddress)) {
            debug.warn('the UI shows that the wallet is connected but the actual connection is not, try to disconnect the connection');
            // call the WalletHeader's disconnect method
            if (typeof window.WalletHeader.disconnectWallet === 'function') {
                window.WalletHeader.disconnectWallet();
            }
        }
    });

    // listen to the global Web3 ready event
    window.addEventListener('wallet.web3Ready', function(event) {
        debug.log('received the global Web3 ready event');
        if (!web3 && window.WalletHeader) {
            web3 = window.WalletHeader.web3;
            
            if (web3 && !isInitialized && window.WalletHeader.isWalletConnected) {
                currentUserAddress = window.WalletHeader.currentAddress;
                debug.log('get the Web3 instance and the wallet address through the web3Ready event');
                initializeContracts();
            }
        }
    });
    
    // handle the contract address change
    window.addEventListener('contractAddressesChanged', function() {
        debug.log('the contract address has been changed, reinitialize the contracts');
        if (web3 && currentUserAddress) {
            // reset the status
            isInitialized = false;
            pwusdStakingContract = null;
            pwPointManagerContract = null;
            pwusdContract = null;
            
            // reinitialize the contracts
            initializeContracts();
        }
    });
    
    
    /**
     * authorize the staking contract to use the stable coin (internal use)
     * @param {string} selectedStableCoin - the stable coin address
     * @param {string} amountInWei - the authorized amount (wei format)
     * @returns {Promise<boolean>} whether the authorization is successful
     * @private
     */
    async function _approveStaking(selectedStableCoin, amountInWei) {
        try {
            if (!selectedStableCoin || !amountInWei) {
                debug.error('the authorization parameters are invalid');
                return false;
            }
            
            // get the stable coin contract
            const stableCoinContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, selectedStableCoin);
            
            // authorize the staking contract to use the stable coin - do not show the notification, let the caller decide whether to show it
            debug.log('start the authorization transaction');
            
            const tx = await stableCoinContract.methods.approve(pwusdStakingContract._address, amountInWei).send({
                from: currentUserAddress
            });
            
            if (tx.status) {
                debug.log('the authorization is successful:', tx);
                return true;
            } else {
                debug.error('the authorization failed:', tx);
                return false;
            }
        } catch (error) {
            debug.error('failed to authorize the stable coin:', error);
            return false;
        }
    }
    
    /**
     * stake the stable coin
     */
    async function stake() {
        try {
            const stableCoinSelect = document.getElementById('stableCoinSelect');
            const stakeAmount = document.getElementById('stakeAmount');
            const selectedStableCoin = stableCoinSelect.value;
            const amount = stakeAmount.value;
            
            if (!selectedStableCoin) {
                showNotification('please select the stable coin', 'error');
                return;
            }
            
            if (!amount || parseFloat(amount) <= 0) {
                showNotification('please enter a valid stake amount', 'error');
                return;
            }
            
            // find the stable coin information
            const coin = supportedStableCoins.find(c => c.address === selectedStableCoin);
            if (!coin) {
                debug.error('the stable coin information is not found');
                return;
            }
            
            // get the stable coin contract
            const stableCoinContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, selectedStableCoin);
            
            // check the authorization
            const allowance = await stableCoinContract.methods.allowance(currentUserAddress, pwusdStakingContract._address).call();
            
            // convert the amount based on the stable coin decimal places
            let amountInWei;
            if (coin.decimals === 18) {
                amountInWei = web3.utils.toWei(amount.toString(), 'ether');
            } else {
                // for the stable coin with non-18 decimal places, manually calculate the amount
                amountInWei = (BigInt(Math.floor(parseFloat(amount) * 10**coin.decimals))).toString();
            }
            
            // if the authorization is insufficient, automatically request the authorization
            if (BigInt(allowance) < BigInt(amountInWei)) {
                debug.log('the authorization is insufficient, automatically request the authorization');
                
                // show a single authorization notification
                showNotification('the authorization is insufficient, authorizing...', 'info');
                
                try {
                    // authorize the staking contract to use the stable coin
                    const tx = await stableCoinContract.methods.approve(pwusdStakingContract._address, amountInWei).send({
                        from: currentUserAddress
                    });
                    
                    if (!tx.status) {
                        showNotification('the authorization failed, cannot continue to stake', 'error');
                        debug.error('the authorization failed:', tx);
                        return;
                    }
                    
                    debug.log('the authorization is successful, prepare to stake');
                    // do not show additional success notification, reduce the notification count
                } catch (error) {
                    showNotification('the authorization failed, cannot continue to stake', 'error');
                    debug.error('the authorization failed:', error);
                    return;
                }
            }
            
            // stake the stable coin
            showNotification('staking in progress...', 'info');
            
            const tx = await pwusdStakingContract.methods.stake(selectedStableCoin, amountInWei).send({
                from: currentUserAddress
            });
            
            if (tx.status) {
                showNotification('stake successful', 'success');
                debug.log('stake successful:', tx);
                
                // clear the input field
                stakeAmount.value = '';
                
                // refresh the data
                refreshData();
            } else {
                showNotification('stake failed', 'error');
                debug.error('stake failed:', tx);
            }
        } catch (error) {
            showNotification('stake failed', 'error');
            debug.error('stake failed:', error);
        }
    }
    
    /**
     * withdraw the staked stable coin
     */
    async function withdraw() {
        try {
            const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
            const withdrawAmount = document.getElementById('withdrawAmount');
            const selectedStableCoin = withdrawStableCoinSelect.value;
            const amount = withdrawAmount.value;
            
            if (!selectedStableCoin) {
                showNotification('please select the stable coin to withdraw', 'error');
                return;
            }
            
            if (!amount || parseFloat(amount) <= 0) {
                showNotification('please enter a valid withdraw amount', 'error');
                return;
            }
            
            // get the staked amount
            const selectedOption = withdrawStableCoinSelect.options[withdrawStableCoinSelect.selectedIndex];
            const stakedAmount = selectedOption.dataset.amount;
            
            // find the stable coin information
            const coin = supportedStableCoins.find(c => c.address === selectedStableCoin);
            if (!coin) {
                // try to find the stable coin information from the original staking record
                const stakingRecord = userStakingInfo.find(info => info.stableCoin === selectedStableCoin);
                if (!stakingRecord) {
                    debug.error('the stable coin information is not found');
                    return;
                }
            }
            
            // calculate the withdraw amount based on the stable coin decimal places
            let amountInWei;
            const decimals = coin ? coin.decimals : 18; // if the stable coin information is not found, use 18 as the default decimal places
            
            if (decimals === 18) {
                amountInWei = web3.utils.toWei(amount.toString(), 'ether');
            } else {
                // for the stable coin with non-18 decimal places, manually calculate the amount
                amountInWei = (BigInt(Math.floor(parseFloat(amount) * 10**decimals))).toString();
            }
            
            // check if the withdraw amount exceeds the staked amount
            if (BigInt(amountInWei) > BigInt(stakedAmount)) {
                showNotification('the withdraw amount cannot exceed the staked amount', 'error');
                return;
            }
            
            // check if the user has authorized the PWUSD contract
            try {
                // when withdrawing the stable coin, check if the enough PWUSD has been authorized to the staking contract
                if (!pwusdContract) {
                    debug.error('the PWUSD contract is not initialized, cannot check the authorization');
                    showNotification('the PWUSD contract is not initialized, please refresh the page and try again', 'error');
                    return;
                }
                
                // check the user's PWUSD authorization amount
                const allowance = await pwusdContract.methods.allowance(
                    currentUserAddress, 
                    pwusdStakingContract._address
                ).call();
                
                debug.log(`PWUSD authorization amount check: current=${allowance}, required=${amountInWei}`);
                
                // if the authorization amount is insufficient
                if (BigInt(allowance) < BigInt(amountInWei)) {
                    showNotification('the authorization is insufficient, please authorize PWUSD', 'info');
                    
                    // request the maximum authorization amount
                    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256 - 1
                    
                    const approveTx = await pwusdContract.methods.approve(
                        pwusdStakingContract._address, 
                        maxUint256
                    ).send({
                        from: currentUserAddress
                    });
                    
                    if (!approveTx.status) {
                        showNotification('the authorization failed, cannot continue to withdraw', 'error');
                        return;
                    }
                    
                    showNotification('the authorization is successful, continue to withdraw', 'success');
                }
            } catch (approveError) {
                debug.error('the error occurred when checking or authorizing PWUSD:', approveError);
                showNotification('the error occurred when checking or authorizing PWUSD, please try again later', 'error');
                return;
            }
            
            // withdraw the stable coin
            showNotification('withdraw in progress...', 'info');
            
            const tx = await pwusdStakingContract.methods.withdraw(selectedStableCoin, amountInWei).send({
                from: currentUserAddress
            });
            
            if (tx.status) {
                showNotification('withdraw successful', 'success');
                debug.log('withdraw successful:', tx);
                
                // clear the input field
                withdrawAmount.value = '';
                
                // refresh the data
                refreshData();
            } else {
                showNotification('withdraw failed', 'error');
                debug.error('withdraw failed:', tx);
            }
        } catch (error) {
            showNotification('the error occurred when withdrawing the stable coin', 'error');
            debug.error('the error occurred when withdrawing the stable coin:', error);
        }
    }
    
    /**
     * claim the staking rewards
     * @param {string} stableCoin - the stable coin address
     */
    async function claimRewards(stableCoin) {
        try {
            if (!stableCoin) {
                showNotification('the stable coin address is invalid', 'error');
                return;
            }
            
            // claim the staking rewards
            showNotification('claim the staking rewards in progress...', 'info');
            
            const tx = await pwusdStakingContract.methods.claimPwPoints(stableCoin).send({
                from: currentUserAddress
            });
            
            if (tx.status) {
                showNotification('claim the staking rewards successfully', 'success');
                debug.log('claim the staking rewards successfully:', tx);
                
                // refresh the data
                refreshData();
            } else {
                showNotification('claim the staking rewards failed', 'error');
                debug.error('claim the staking rewards failed:', tx);
            }
        } catch (error) {
            showNotification('the error occurred when claiming the staking rewards', 'error');
            debug.error('the error occurred when claiming the staking rewards:', error);
        }
    }
    
    // record the last notification content and time
    let lastNotification = {
        message: '',
        type: '',
        timestamp: 0
    };
    
    // add a flag to track whether the current notification is visible
    let isNotificationVisible = false;
    // the ID of the current notification dialog
    let currentDialogId = null;
    // use a variable to track the last closeAll time
    let lastCloseAllTime = 0;
    // debounce timer
    let notificationTimer = null;
    
    /**
     * show the notification
     * @param {string} message - the notification message
     * @param {string} type - the notification type 'success', 'error', 'info', 'warning'
     */
    function showNotification(message, type = 'info') {
        // Check if message looks like an i18n key and try to translate
        if (window.i18n && typeof window.i18n.t === 'function' && message.indexOf('.') > 0) {
            const translatedMessage = window.i18n.t(message);
            // If translation is different from key, use it
            if (translatedMessage !== message) {
                message = translatedMessage;
            }
        }
        
        // clear any existing timers
        if (notificationTimer) {
            clearTimeout(notificationTimer);
            notificationTimer = null;
        }
        
        // prevent duplicate notifications: check if the same message is displayed within a short period of time (1.5 seconds)
        const now = Date.now();
        if (message === lastNotification.message && 
            type === lastNotification.type && 
            now - lastNotification.timestamp < 1500) {
            debug.log('prevent duplicate notifications:', message);
            return;
        }
        
        // update the last notification record
        lastNotification = {
            message,
            type,
            timestamp: now
        };
        
        // define the function to display the notification
        const displayNotification = () => {
            // ensure no other notifications are displayed
            if (isNotificationVisible && window.ModalDialog && typeof window.ModalDialog.closeAll === 'function') {
                debug.log(`force close all existing notifications, prepare to display: "${message}"`);
                window.ModalDialog.closeAll();
                lastCloseAllTime = Date.now();
                
                // delay a short period of time before displaying the new notification, ensure the previous notification is fully closed
                notificationTimer = setTimeout(() => {
                    notificationTimer = null;
                    isNotificationVisible = false;
                    // call the display notification function again
                    displayNotification();
                }, 350); //略大于modalDialog.js中的关闭动画时间(300ms)
                return;
            }
            
            // mark the current notification as visible
            isNotificationVisible = true;
            
            if (window.ModalDialog) {
                let title;
                let icon;
                
                switch (type) {
                    case 'success':
                        title = 'success';
                        icon = '✅';
                        break;
                    case 'error':
                        title = 'error';
                        icon = '❌';
                        break;
                    case 'warning':
                        title = 'warning';
                        icon = '⚠️';
                        break;
                    default:
                        title = 'info';
                        icon = 'ℹ️';
                }
                
                debug.log(`display the notification: "${message}"`);
                window.ModalDialog.show({
                    title: title,
                    content: `<div style="text-align:center;">
                        <div style="font-size:48px;margin:20px 0;">${icon}</div>
                        <p style="font-size:16px;">${message}</p>
                    </div>`,
                    confirmText: 'confirm'
                }).then(() => {
                    debug.log(`the notification is closed: "${message}"`);
                    isNotificationVisible = false;
                });
            } else {
                alert(message);
                // reset the flag
                isNotificationVisible = false;
            }
        };
        
        // if the last close time is very recent, wait for a while before displaying
        const timeSinceLastClose = now - lastCloseAllTime;
        if (timeSinceLastClose < 350) {
            const waitTime = 350 - timeSinceLastClose;
            debug.log(`recently closed the dialog, wait for ${waitTime}ms before displaying the new notification`);
            notificationTimer = setTimeout(displayNotification, waitTime);
        } else {
            // otherwise, display the notification directly
            displayNotification();
        }
    }

    /**
     * set the page status
     * @param {string} message - the status message
     */
    function setPageStatus(message) {
        // Check if message looks like an i18n key and try to translate
        if (window.i18n && typeof window.i18n.t === 'function' && message && message.indexOf('.') > 0) {
            const translatedMessage = window.i18n.t(message);
            // If translation is different from key, use it
            if (translatedMessage !== message) {
                message = translatedMessage;
            }
        }
        
        const statusElement = document.getElementById('pageStatus');
        
        // if the status element does not exist, try to create one
        if (!statusElement) {
            // only create the status element when the message is not empty
            if (message && message.trim() !== "") {
                const newStatusElement = document.createElement('div');
                newStatusElement.id = 'pageStatus';
                newStatusElement.className = 'page-status';
                newStatusElement.textContent = message;
                
                // add to the dashboard below
                const dashboard = document.querySelector('.dashboard');
                if (dashboard) {
                    dashboard.appendChild(newStatusElement);
                } else {
                    // if the dashboard is not found, add to the body
                    document.body.appendChild(newStatusElement);
                }
            }
        } else {
            // update the existing status element
            if (message && message.trim() !== "") {
                statusElement.textContent = message;
                statusElement.style.display = 'block';
            } else {
                statusElement.textContent = '';
                statusElement.style.display = 'none';
            }
        }
        
        debug.log('set the page status:', message);
    }

    /**
     * refresh the user account information
     */
    async function refreshUserAccountInfo() {
        try {
            if (!web3 || !currentUserAddress) {
                debug.error('failed to refresh the account information: Web3 or user address is not initialized');
                return;
            }
            
            debug.log('refresh the user account information...');
            
            try {
                // load the user staking information
                await loadUserStakingInfo();
            } catch (stakingError) {
                debug.error('failed to load the user staking information, but continue to load other information:', stakingError);
                // remind the user but do not interrupt the process
                showNotification('failed to load the staking information, some data may be incomplete', 'warning');
            }
            
            // if there is a selected stable coin, refresh the balance display
            try {
                const stableCoinSelect = document.getElementById('stableCoinSelect');
                if (stableCoinSelect && stableCoinSelect.value) {
                    await handleStableCoinSelect();
                }
            } catch (selectError) {
                debug.error('failed to refresh the stable coin balance:', selectError);
            }
            
            debug.log('the user account information is refreshed');
        } catch (error) {
            debug.error('failed to refresh the user account information:', error);
            showNotification('failed to refresh the account information', 'error');
        }
    }

    // initialize the page
    init();
}); 