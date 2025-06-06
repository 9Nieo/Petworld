/**
 * game mode stable coin staking page script
 */
 
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
let isInitialized = false; // mark if it is initialized
let nextCycleUpdateTimestamp = 0; // the timestamp of the next cycle update
let nextCycleUpdateInterval = null; // the timer for the dynamic update time
let lastUpdateTimestamp = 0; // the timestamp of the last update

// the constant of the maximum retries
const MAX_RETRIES = 5;
// the counter of the initial retries
let initRetryCount = 0;

// the debug log control
const debug = {
    enabled: true,
    log: function() {
        if (this.enabled) console.log('[game mode stable coin staking]', ...arguments);
    },
    error: function() {
        if (this.enabled) console.error('[game mode stable coin staking]', ...arguments);
    },
    warn: function() {
        if (this.enabled) console.warn('[game mode stable coin staking]', ...arguments);
    }
};

// the mark of the contract initialization
let isInitializingContracts = false;

// the content and time of the last notification
let lastNotification = {
    message: '',
    type: '',
    timestamp: 0
};

// add a flag to track if there is a notification currently visible
let isNotificationVisible = false;
// the ID of the current notification dialog
let currentDialogId = null;
// use a variable to track the last time closeAll was called
let lastCloseAllTime = 0;
// the debounce timer
let notificationTimer = null;

/**
 * Check if private key wallet should be used
 * @returns {boolean} - Whether to use private key wallet
 */
function shouldUsePrivateKeyWallet() {
    // Check parent window first (for iframe context)
    if (window.parent && window.parent.SecureWalletManager) {
        return window.parent.SecureWalletManager.isWalletReady && 
               window.parent.SecureWalletManager.isWalletReady();
    }
    
    // Check current window
    return window.SecureWalletManager && 
           window.SecureWalletManager.isWalletReady && 
           window.SecureWalletManager.isWalletReady();
}

/**
 * Get private key wallet status and information
 * @returns {object} - Private key wallet status
 */
function getPrivateKeyWalletStatus() {
    let walletManager = null;
    
    // Check parent window first (for iframe context)
    if (window.parent && window.parent.SecureWalletManager) {
        walletManager = window.parent.SecureWalletManager;
    } else if (window.SecureWalletManager) {
        walletManager = window.SecureWalletManager;
    }
    
    if (!walletManager) {
        return {
            available: false,
            ready: false,
            address: null,
            web3: null
        };
    }
    
    const isReady = walletManager.isWalletReady();
    const address = isReady ? walletManager.getAddress() : null;
    const web3Instance = isReady ? walletManager.getWeb3() : null;
    
    return {
        available: true,
        ready: isReady,
        address: address,
        web3: web3Instance,
        locked: walletManager.isWalletLocked && walletManager.isWalletLocked()
    };
}

/**
 * Send contract transaction using private key wallet
 * @param {object} contract - Web3 contract instance
 * @param {string} methodName - Contract method name
 * @param {array} methodParams - Method parameters
 * @param {object} txOptions - Transaction options
 * @returns {Promise<object>} - Transaction receipt
 */
async function sendPrivateKeyTransaction(contract, methodName, methodParams = [], txOptions = {}) {
    let walletManager = null;
    
    // Check parent window first (for iframe context)
    if (window.parent && window.parent.SecureWalletManager) {
        walletManager = window.parent.SecureWalletManager;
    } else if (window.SecureWalletManager) {
        walletManager = window.SecureWalletManager;
    }
    
    if (!walletManager) {
        throw new Error('SecureWalletManager not available');
    }
    
    return await walletManager.sendContractTransaction(contract, methodName, methodParams, txOptions);
}

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
    
    // listen to the iframe message event
    window.addEventListener('message', handleIframeMessage);
    
    // Priority 1: Check private key wallet first
    const privateKeyStatus = getPrivateKeyWalletStatus();
    debug.log('Private key wallet status:', privateKeyStatus);
    
    if (privateKeyStatus.ready && privateKeyStatus.address && privateKeyStatus.web3) {
        debug.log('Private key wallet is ready, using it for staking');
        web3 = privateKeyStatus.web3;
        currentUserAddress = privateKeyStatus.address;
        
        // Initialize contracts with private key wallet
        initializeContracts();
        
        // Send ready message to parent window
        if (window.parent) {
            window.parent.postMessage({ 
                type: 'iframeReady', 
                source: 'stableStaking',
                walletType: 'privateKey'
            }, '*');
        }
        return; // Exit early since private key wallet is ready
    }
    
    // Priority 2: Try to get Web3 and wallet information from parent window (traditional method)
    if (window.parent) {
        debug.log('Private key wallet not ready, trying to get wallet information from parent window...');
        
        // try to get the shared web3 instance from the parent window
        if (window.parent.gameWeb3) {
            debug.log('got the gameWeb3 from the parent window, preparing to initialize the contracts...');
            web3 = window.parent.gameWeb3;
            
            // try to get the wallet address from the parent window
            if (window.parent.localStorage && window.parent.localStorage.getItem('walletAddress')) {
                currentUserAddress = window.parent.localStorage.getItem('walletAddress');
                debug.log('got the wallet address from the parent window localStorage:', currentUserAddress);
            }
            
            // initialize the contracts
            initializeContracts();
            
            // send the ready message to the parent window
            window.parent.postMessage({ type: 'iframeReady', source: 'stableStaking' }, '*');
        } else {
            debug.log('failed to get the parent window web3, waiting for the message...');
            
            // request the web3 instance from the parent window
            window.parent.postMessage({ type: 'requestWeb3', source: 'stableStaking' }, '*');
        }
    } else {
        debug.warn('failed to access the parent window, probably not running in the iframe environment');
    }
}

/**
 * handle the iframe message
 */
function handleIframeMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;
    
    const message = event.data;
    debug.log('received the iframe message:', message.type);
    
    switch (message.type) {
        case 'walletInfo':
            if (message.data && message.data.connected && message.data.address) {
                debug.log('received the wallet information:', message.data);
                currentUserAddress = message.data.address;
                
                // if the web3 is initialized, load the user data
                if (web3 && pwusdStakingContract) {
                    loadUserData();
                }
            }
            break;
            
        case 'web3Ready':
            debug.log('received the Web3 ready message:', message.data);
            if (message.data && message.data.connected) {
                // get the Web3 instance from the parent window
                if (window.parent && window.parent.gameWeb3) {
                    web3 = window.parent.gameWeb3;
                    debug.log('got the gameWeb3 instance from the parent window');
                } else {
                    debug.warn('failed to get the gameWeb3 instance from the parent window');
                    
                    // try to get the web3 provider information from the message and create the instance
                    if (window.Web3 && message.data.provider) {
                        try {
                            web3 = new Web3(message.data.provider);
                            debug.log('successfully created the web3 instance using the provided provider');
                        } catch (error) {
                            debug.error('failed to create the web3 instance:', error);
                        }
                    }
                }
                
                // get the address information
                if (message.data.address) {
                    currentUserAddress = message.data.address;
                    debug.log('got the wallet address:', currentUserAddress);
                }
                
                // initialize the contracts
                initializeContracts();
            }
            break;
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
            // remove the active status from all tabs
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
            setMaxAmount('stake');
        });
    }
    
    if (stakeBtn) {
        stakeBtn.addEventListener('click', stake);
    }
    
    // withdraw panel button
    const withdrawCoinSelect = document.getElementById('withdrawStableCoinSelect');
    const maxWithdrawBtn = document.getElementById('maxWithdrawBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    
    if (withdrawCoinSelect) {
        withdrawCoinSelect.addEventListener('change', handleWithdrawCoinSelect);
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
 * initialize the contracts
 */
function initializeContracts() {
    if (isInitializingContracts) {
        debug.log('the contract initialization is ongoing, skipping the duplicate initialization');
        return;
    }
    
    debug.log('initializing the contracts...');
    isInitializingContracts = true;
    
    try {
        // ensure the web3 is available
        if (!web3 || !web3.eth) {
            debug.error('Web3 is not available, cannot initialize the contracts');
            showNotification('Web3 is not available, please ensure the wallet is correctly connected', 'error');
            isInitializingContracts = false;
            return;
        }
        
        // get the contract address
        const getContractAddress = (name) => {
            // use the contract address manager from the parent window first
            if (window.parent && window.parent.getContractAddress) {
                try {
                    return window.parent.getContractAddress(name);
                } catch (e) {
                    debug.error(`failed to get the ${name} contract address from the parent window:`, e);
                }
            }
            
            // if it is a stable coin, try to get the address from the SupportedStableCoins
            if (window.SupportedStableCoins) {
                const stableCoinAddress = window.SupportedStableCoins.getStableCoinAddress(name);
                if (stableCoinAddress) {
                    debug.log(`got the ${name} contract address from the SupportedStableCoins:`, stableCoinAddress);
                    return stableCoinAddress;
                }
            }
            
            // try to get the contract address from the current window's contract address manager
            if (window.getContractAddress) {
                try {
                    return window.getContractAddress(name);
                } catch (e) {
                    debug.error(`failed to get the ${name} contract address from the getContractAddress:`, e);
                }
            }
            
            // try to get the contract address from the contractAddresses directly
            if (window.contractAddresses) {
                let network = window.currentNetwork || 'MAIN';
                if (window.contractAddresses[network] && window.contractAddresses[network][name]) {
                    debug.log(`got the ${name} contract address from the contractAddresses[${network}]:`, window.contractAddresses[network][name]);
                    return window.contractAddresses[network][name];
                }
            }
            
            // try to get the contract address from the parent window's contractAddresses directly
            if (window.parent && window.parent.contractAddresses) {
                let network = window.parent.currentNetwork || 'MAIN';
                if (window.parent.contractAddresses[network] && window.parent.contractAddresses[network][name]) {
                    debug.log(`got the ${name} contract address from the parent window's contractAddresses[${network}]:`, window.parent.contractAddresses[network][name]);
                    return window.parent.contractAddresses[network][name];
                }
            }
            
            // use the hardcoded contract addresses (the last fallback)
            const hardcodedAddresses = {
                'MAIN': {
                    'PwUSDStaking': '0xDf9C2eD2230F3A4Ad19b418c92D3330C8A8D9b38',
                    'PwUSD': '0xB599D41c47E6FDeaAD71291868B900d41875a351',
                    'PwPointManager': '0xb02C46470fB98Ba3f44C1DEaD5EB02c1fa0525Fd'
                }
            };
            
            if (hardcodedAddresses['MAIN'] && hardcodedAddresses['MAIN'][name]) {
                debug.log(`using the hardcoded ${name} contract address`);
                return hardcodedAddresses['MAIN'][name];
            }
            
            debug.error(`failed to get the ${name} contract address`);
            return null;
        };
        
        // get the contract ABI
        const getContractABI = (name) => {
            switch (name) {
                case 'PwUSDStaking':
                    return typeof PwUSDStakingABI !== 'undefined' ? PwUSDStakingABI : 
                           (window.parent && typeof window.parent.PwUSDStakingABI !== 'undefined' ? window.parent.PwUSDStakingABI : null);
                case 'PwPointManager':
                    return typeof PwPointManagerABI !== 'undefined' ? PwPointManagerABI : 
                           (window.parent && typeof window.parent.PwPointManagerABI !== 'undefined' ? window.parent.PwPointManagerABI : null);
                case 'PwUSD':
                    return typeof PwUSDABI !== 'undefined' ? PwUSDABI : 
                           (window.parent && typeof window.parent.PwUSDABI !== 'undefined' ? window.parent.PwUSDABI : null);
                case 'ERC20':
                    return typeof GENERIC_ERC20_ABI !== 'undefined' ? GENERIC_ERC20_ABI : 
                           (window.parent && typeof window.parent.GENERIC_ERC20_ABI !== 'undefined' ? window.parent.GENERIC_ERC20_ABI : null);
                default:
                    debug.error(`failed to get the ${name} contract ABI`);
                    return null;
            }
        };
        
        // initialize the stake contract
        const pwusdStakingAddress = getContractAddress('PwUSDStaking');
        const pwusdStakingABI = getContractABI('PwUSDStaking');
        
        if (pwusdStakingAddress && pwusdStakingABI) {
            pwusdStakingContract = new web3.eth.Contract(pwusdStakingABI, pwusdStakingAddress);
            debug.log('stake contract initialized successfully:', pwusdStakingAddress);
        } else {
            debug.error('failed to initialize the stake contract');
            showNotification('failed to initialize the contract, please refresh the page', 'error');
        }
        
        // initialize the PWUSD contract
        const pwusdAddress = getContractAddress('PwUSD');
        const pwusdABI = getContractABI('PwUSD');
        
        if (pwusdAddress && pwusdABI) {
            pwusdContract = new web3.eth.Contract(pwusdABI, pwusdAddress);
            debug.log('PWUSD contract initialized successfully:', pwusdAddress);
        } else {
            debug.error('failed to initialize the PWUSD contract');
        }
        
        // initialize the PwPointManager contract
        const pwPointManagerAddress = getContractAddress('PwPointManager');
        const pwPointManagerABI = getContractABI('PwPointManager');
        
        if (pwPointManagerAddress && pwPointManagerABI) {
            pwPointManagerContract = new web3.eth.Contract(pwPointManagerABI, pwPointManagerAddress);
            debug.log('PwPointManager contract initialized successfully:', pwPointManagerAddress);
        } else {
            debug.error('failed to initialize the PwPointManager contract');
        }
        
        // the contract initialization is completed, load the page data
        if (pwusdStakingContract) {
            debug.log('all contracts initialized, loading the page data');
            loadContractInfo();
            
            // if the user has connected the wallet, load the user specific data
            if (currentUserAddress) {
                loadUserData();
            }
        } else {
            debug.error('failed to initialize the key contracts, cannot load the page data');
            showNotification('failed to connect to the smart contract, please check the network connection', 'error');
        }
    } catch (error) {
        debug.error('failed to initialize the contracts:', error);
        showNotification('failed to initialize the contracts: ' + error.message, 'error');
    } finally {
        isInitializingContracts = false;
    }
}

/**
 * load the user data
 */
function loadUserData() {
    if (!currentUserAddress) {
        debug.warn('no wallet address detected, skipping the loading of the user data');
        return;
    }
    
    debug.log('loading the user data...');
    
    // load the supported stable coins list
    loadSupportedStableCoins()
        .then(() => {
            // load the user stake information
            return loadUserStakingInfo();
        })
        .then(() => {
            // load the withdrawable stable coins
            return loadWithdrawableStableCoins();
        })
        .catch(error => {
            debug.error('failed to load the user data:', error);
            showNotification('failed to load the user data: ' + error.message, 'warning');
        });
}

/**
 * calculate the pending rewards
 * @param {Object} stakingInfo - the stake information object
 * @param {number} currentCycle - the current cycle
 * @returns {string} the calculated reward amount
 */
function calculatePendingRewards(stakingInfo, currentCycle, lastUpdateTime) {
    try {
        // ensure the stakingInfo exists
        if (!stakingInfo) {
            debug.log('failed to calculate the pending rewards: stakingInfo does not exist');
            return '0';
        }
        
        // try to use the directly stored pendingRewards value first
        if (stakingInfo.pendingRewards && stakingInfo.pendingRewards !== '0') {
            debug.log(`using the stored pendingRewards value: ${stakingInfo.pendingRewards}`);
            return stakingInfo.pendingRewards;
        }
        
        // compatibility for different data structures (game mode uses amount, normal mode uses stakedAmount)
        const amount = stakingInfo.amount || stakingInfo.stakedAmount;
        if (!amount || amount === '0') {
            debug.log('failed to calculate the pending rewards: the stake amount is 0');
            return '0';
        }
        
        // convert the stake amount from 18 decimal places to the normal unit (equivalent to dividing by 10^18)
        // first create the BigInt version
        const stakedAmountBigInt = BigInt(amount);
        // then convert to the normal uint unit to reduce the calculation amount
        const stakedAmountUint = Number(stakedAmountBigInt / BigInt(1e18));
        
        debug.log(`the stake amount for calculating the pending rewards: ${stakedAmountUint} (converted to the normal unit)`);
        
        // the number of cycles from the last claimed cycle to the current cycle
        let cyclesPassed = currentCycle - stakingInfo.lastClaimedCycle;
        debug.log(`the cycle difference: current cycle ${currentCycle} - last claimed cycle ${stakingInfo.lastClaimedCycle} = ${cyclesPassed}`);
        
        // consider the case where the chain data is not updated, calculate the additional cycles
        const now = Math.floor(Date.now() / 1000); // the current timestamp (seconds)
        // check if there is a saved last update time
        if (lastUpdateTime > 0) {
            const timeSinceLastUpdate = now - lastUpdateTime;
            const cycleDuration = 86400; // one cycle per day, unit: seconds
            
            // calculate the number of complete cycles since the last update
            if (timeSinceLastUpdate > 0) {
                const additionalCycles = Math.floor(timeSinceLastUpdate / cycleDuration);
                cyclesPassed += additionalCycles;
                debug.log(`considering the time factor: ${cyclesPassed}, additional cycles: ${additionalCycles}`);
            }
        }
        
        // if no valid cycles passed, try to return the original pending rewards
        if (cyclesPassed <= 0) {
            debug.log(`no valid cycles passed, returning the original pending rewards: ${stakingInfo.pendingRewards || '0'}`);
            return stakingInfo.pendingRewards || '0';
        }
        
        // use the normal unit to calculate, no longer use BigInt
        // calculate the reward rate: 1 PWP per 10 USD
        // assume each stable coin unit is 1 USD, each stable coin unit gets 0.2 PWP
        const rewardRatePerToken = 0.2; 
        
        // convert the pending rewards from the contract to the normal unit
        const contractPendingRewards = parseInt(stakingInfo.pendingRewards || '0');
        
        // calculate the additional rewards: stake amount * reward rate * cycle number
        const additionalRewards = stakedAmountUint * rewardRatePerToken * cyclesPassed;
        
        // merge the existing rewards and the additional rewards
        const totalPendingRewards = contractPendingRewards + Math.floor(additionalRewards);
        
        debug.log(`reward calculation details (optimized version):
        - original rewards = ${contractPendingRewards}
        - additional rewards calculation = (${stakedAmountUint} * ${rewardRatePerToken} * ${cyclesPassed}) = ${additionalRewards}
        - total rewards = ${contractPendingRewards} + ${Math.floor(additionalRewards)} = ${totalPendingRewards}`);
        
        return totalPendingRewards.toString();
    } catch (error) {
        debug.error('failed to calculate the pending rewards:', error);
        return stakingInfo.pendingRewards || '0';
    }
}

/**
 * Calculate the actual current cycle based on time
 * @param {number} contractCycle - Current cycle from contract
 * @param {number} lastUpdateTimestamp - Last update timestamp from contract
 * @returns {number} - Actual current cycle
 */
function calculateActualCurrentCycle(contractCycle, lastUpdateTimestamp) {
    if (!lastUpdateTimestamp || lastUpdateTimestamp === 0) {
        return contractCycle;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const elapsedTime = now - lastUpdateTimestamp;
    const cycleDuration = 86400; // 24 hours in seconds
    const elapsedCycles = Math.floor(elapsedTime / cycleDuration);
    
    const actualCurrentCycle = contractCycle + elapsedCycles;
    
    debug.log('Cycle calculation:', {
        contractCycle,
        lastUpdateTimestamp,
        now,
        elapsedTime,
        elapsedCycles,
        actualCurrentCycle
    });
    
    return actualCurrentCycle;
}

/**
 * Start dynamic cycle update timer
 */
function startDynamicCycleTimer() {
    // Clear existing timer
    if (window.dynamicCycleTimer) {
        clearInterval(window.dynamicCycleTimer);
    }
    
    // Update immediately
    updateDynamicCycleDisplay();
    
    // Update every second
    window.dynamicCycleTimer = setInterval(updateDynamicCycleDisplay, 1000);
}

/**
 * Update dynamic cycle display
 */
function updateDynamicCycleDisplay() {
    if (!lastUpdateTimestamp) {
        return;
    }
    
    const actualCurrentCycle = calculateActualCurrentCycle(currentCycleValue, lastUpdateTimestamp);
    const currentCycleElement = document.getElementById('currentCycle');
    if (currentCycleElement) {
        currentCycleElement.textContent = actualCurrentCycle.toString();
    }
    
    // Update global variable for other calculations
    window.actualCurrentCycle = actualCurrentCycle;
}

/**
 * load the contract basic information
 */
async function loadContractInfo() {
    if (!pwusdStakingContract) {
        debug.error('the stake contract is not initialized, cannot load the contract information');
        return;
    }
    
    debug.log('loading the contract basic information...');
    
    try {
        // check the available methods based on the PwUSDStakingABI
        const availableMethods = Object.keys(pwusdStakingContract.methods).filter(
            method => typeof pwusdStakingContract.methods[method] === 'function'
        );
        debug.log('the available contract methods:', availableMethods);
        
        // get the current cycle - adjust the method name based on the ABI interface
        let currentCycle;
        if (typeof pwusdStakingContract.methods.getCurrentCycle === 'function') {
            currentCycle = await pwusdStakingContract.methods.getCurrentCycle().call();
        } else if (typeof pwusdStakingContract.methods.currentCycle === 'function') {
            currentCycle = await pwusdStakingContract.methods.currentCycle().call();
        } else {
            // alternative solution, manually set a default value
            currentCycle = 1;
            debug.warn('failed to get the current cycle from the contract, using the default value:', currentCycle);
        }
        
        currentCycleValue = parseInt(currentCycle);
        
        // Store the contract cycle value for reference
        window.contractCurrentCycle = currentCycleValue;
        debug.log('the current cycle:', currentCycleValue);
        
        // get the last update timestamp
        try {
            if (typeof pwusdStakingContract.methods.lastUpdateTimestamp === 'function') {
                const lastUpdateTimestampResult = await pwusdStakingContract.methods.lastUpdateTimestamp().call();
                lastUpdateTimestamp = parseInt(lastUpdateTimestampResult);
                window.lastUpdateTimestamp = lastUpdateTimestamp;
                debug.log('got the last update timestamp:', lastUpdateTimestamp);
                
                // calculate the next cycle update time (the cycle is usually 24 hours)
                const cycleDuration = 86400; // 24 hours, unit: seconds
                nextCycleUpdateTimestamp = lastUpdateTimestamp + cycleDuration;
                
                // start the dynamic cycle timer
                startDynamicCycleTimer();
                
                // start the update timer
                startNextCycleUpdateTimer();
            }
        } catch (error) {
            debug.error('failed to get the last update timestamp:', error);
            // If no timestamp available, just display the contract cycle
            const currentCycleElement = document.getElementById('currentCycle');
            if (currentCycleElement) {
                currentCycleElement.textContent = currentCycleValue.toString();
            }
        }
        
        // get the total staked amount
        try {
            if (typeof pwusdStakingContract.methods.totalStakedAmount === 'function') {
                const totalStakedAmountResult = await pwusdStakingContract.methods.totalStakedAmount().call();
                const formattedTotalStaked = formatTokenAmount(totalStakedAmountResult, 18);
                document.getElementById('totalStakedAmount').textContent = formattedTotalStaked;
                debug.log('got the total staked amount:', formattedTotalStaked);
            } else {
                document.getElementById('totalStakedAmount').textContent = 'not available';
            }
        } catch (error) {
            debug.error('failed to get the total staked amount:', error);
            document.getElementById('totalStakedAmount').textContent = 'failed to get';
        }
        
        // get the total claimed PwPoint
        try {
            if (typeof pwusdStakingContract.methods.totalClaimedPwPoints === 'function') {
                const totalClaimedPwPointsResult = await pwusdStakingContract.methods.totalClaimedPwPoints().call();
                document.getElementById('totalClaimedPwPoints').textContent = totalClaimedPwPointsResult;
                debug.log('got the total claimed PwPoint:', totalClaimedPwPointsResult);
            } else {
                document.getElementById('totalClaimedPwPoints').textContent = 'not available';
            }
        } catch (error) {
            debug.error('failed to get the total claimed PwPoint:', error);
            document.getElementById('totalClaimedPwPoints').textContent = 'failed to get';
        }
        
        // update the reward rate display - use the fixed format
        const rewardRateElement = document.getElementById('rewardRate');
        if (rewardRateElement) {
            // fixed display the reward rate as "5 PWP / $10 / day", keep the same as the normal mode
            rewardRateElement.textContent = "2 PWP + 2 PWB / $10 / day";
        }
    } catch (error) {
        debug.error('failed to load the contract basic information:', error);
        showNotification('failed to load the contract basic information', 'error');
    }
}

/**
 * start the timer for the next cycle update
 */
function startNextCycleUpdateTimer() {
    // first clear the possible existing timer
    if (nextCycleUpdateInterval) {
        clearInterval(nextCycleUpdateInterval);
    }
    
    // update the display immediately
    updateNextCycleDisplay();
    
    // start the timer, update the display every second
    nextCycleUpdateInterval = setInterval(updateNextCycleDisplay, 1000);
}

/**
 * update the display for the next cycle
 */
function updateNextCycleDisplay() {
    if (!nextCycleUpdateTimestamp) {
        return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = nextCycleUpdateTimestamp - now;
    
    if (timeRemaining <= 0) {
        // the cycle is updated, but the contract data may not be updated yet
        document.getElementById('nextCycleUpdate').textContent = "the next cycle is about to be updated";
        return;
    }
    
    // calculate the remaining time
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    // format the display time
    const timeString = `the next cycle is about to be updated: ${hours} hours ${minutes} minutes ${seconds} seconds`;
    document.getElementById('nextCycleUpdate').textContent = timeString;
}

/**
 * reset the staking page
 */
function resetStakingPage() {
    debug.log('resetting the staking page...');
    
    // reset the global variables
    supportedStableCoins = [];
    userStakingInfo = [];
    
    // clear the timer for the next cycle update
    if (nextCycleUpdateInterval) {
        clearInterval(nextCycleUpdateInterval);
        nextCycleUpdateInterval = null;
    }
    
    // clear the dynamic cycle timer
    if (window.dynamicCycleTimer) {
        clearInterval(window.dynamicCycleTimer);
        window.dynamicCycleTimer = null;
    }
    
    try {
        // reset the UI display
        const currentCycleElement = document.getElementById('currentCycle');
        const rewardRateElement = document.getElementById('rewardRate');
        const totalStakedAmountElement = document.getElementById('totalStakedAmount');
        const totalClaimedPwPointsElement = document.getElementById('totalClaimedPwPoints');
        const nextCycleUpdateElement = document.getElementById('nextCycleUpdate');
        
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
        
        if (nextCycleUpdateElement) {
            nextCycleUpdateElement.textContent = '';
        }
        
        // reset the staking history
        const historyList = document.getElementById('stakingHistoryList');
        const noHistoryMessage = document.getElementById('noHistoryMessage');
        
        if (historyList && noHistoryMessage) {
            // clear the history records (keep the no record message)
            const children = Array.from(historyList.children);
            for (const child of children) {
                if (child.id !== 'noHistoryMessage') {
                    historyList.removeChild(child);
                }
            }
            
            // display the no record message
            noHistoryMessage.style.display = 'block';
        }
        
        // reset the stable coin select dropdown
        const stableCoinSelect = document.getElementById('stableCoinSelect');
        const withdrawCoinSelect = document.getElementById('withdrawStableCoinSelect');
        
        if (stableCoinSelect) {
            while (stableCoinSelect.options.length > 1) {
                stableCoinSelect.remove(1);
            }
        }
        
        if (withdrawCoinSelect) {
            while (withdrawCoinSelect.options.length > 1) {
                withdrawCoinSelect.remove(1);
            }
        }
        
        // reset the balance display
        const selectedStableCoinBalance = document.getElementById('selectedStableCoinBalance');
        const stakedBalance = document.getElementById('stakedBalance');
        
        if (selectedStableCoinBalance) {
            selectedStableCoinBalance.textContent = '0';
        }
        
        if (stakedBalance) {
            stakedBalance.textContent = '0';
        }
    } catch (error) {
        debug.error('failed to reset the staking page:', error);
    }
}

/**
 * refresh the data
 */
async function refreshData() {
    debug.log('refreshing the page data...');
    
    try {
        // display the refreshing status
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.textContent;
            refreshBtn.textContent = '刷新中...';
            refreshBtn.disabled = true;
            
            // restore the button status
            setTimeout(() => {
                refreshBtn.textContent = originalText;
                refreshBtn.disabled = false;
            }, 2000);
        }
        
        // load the contract information
        await loadContractInfo();
        
        // if the user has connected the wallet, load the user data
        if (currentUserAddress) {
            await loadUserData();
            showNotification('data refreshed', 'success');
        } else {
            debug.log('the user has not connected the wallet, skipping the loading of the user data');
            showNotification('please connect the wallet to view the personal data', 'info');
        }
    } catch (error) {
        debug.error('failed to refresh the data:', error);
        showNotification('failed to refresh the data: ' + error.message, 'error');
    }
}

/**
 * load the supported stable coins
 */
async function loadSupportedStableCoins() {
    if (!pwusdStakingContract || !web3) {
        debug.error('the contract is not initialized, cannot load the supported stable coins');
        return;
    }
    
    try {
        debug.log('loading the supported stable coins...');
        
        // Check if the SupportedStableCoins utility is available
        if (window.SupportedStableCoins && typeof window.SupportedStableCoins.getAllStableCoins === 'function') {
            // Get the list of supported stable coins from the utility
            supportedStableCoins = window.SupportedStableCoins.getAllStableCoins();
            debug.log('Got supported stable coins from SupportedStableCoins utility:', supportedStableCoins);
        } else {
            // Fallback to contract method if the utility is not available
            debug.warn('SupportedStableCoins utility not found, trying to get from contract');
            
            // get the supported stable coins list from the contract
            let stableCoins = [];
            
            // try different methods to get the stable coins list
            if (typeof pwusdStakingContract.methods.getSupportedStableCoins === 'function') {
                stableCoins = await pwusdStakingContract.methods.getSupportedStableCoins().call();
            } else if (typeof pwusdStakingContract.methods.supportedStableCoinList === 'function') {
                // may need to iterate the list to get all the supported stable coins
                try {
                    // try to get the list length
                    let index = 0;
                    let hasMore = true;
                    
                    while (hasMore && index < 20) { // try up to 20 indexes, avoid infinite loop
                        try {
                            const coinAddress = await pwusdStakingContract.methods.supportedStableCoinList(index).call();
                            if (coinAddress && coinAddress !== '0x0000000000000000000000000000000000000000') {
                                stableCoins.push(coinAddress);
                            }
                            index++;
                        } catch (e) {
                            hasMore = false;
                        }
                    }
                } catch (error) {
                    debug.error('failed to get the length of the supported stable coins list:', error);
                }
            }
            
            // if still no stable coins list, use the hardcoded default value
            if (stableCoins.length === 0) {
                // use some common testnet stable coins as the default value
                stableCoins = [
                    '0x4e79347Ea521Af7E3D948C63E22711fd24472158' // USDT
                ];
                debug.warn('failed to get the stable coins list from the contract, using the hardcoded default value');
            }
            
            // get the symbol and precision of each stable coin
            supportedStableCoins = [];
            for (const coin of stableCoins) {
                try {
                    // create the ERC20 contract instance
                    const coinContract = new web3.eth.Contract(GENERIC_ERC20_ABI, coin);
                    
                    // get the token symbol and precision
                    const symbol = await coinContract.methods.symbol().call();
                    const decimals = await coinContract.methods.decimals().call();
                    
                    supportedStableCoins.push({
                        address: coin,
                        symbol: symbol,
                        decimals: parseInt(decimals)
                    });
                } catch (error) {
                    debug.error(`failed to get the information of the stable coin ${coin}:`, error);
                }
            }
            debug.log('got the supported stable coins list:', supportedStableCoins);
        }
        
        // update the stable coin select dropdown
        updateStableCoinSelect();
    } catch (error) {
        debug.error('failed to load the supported stable coins list:', error);
        showNotification('failed to load the supported stable coins list', 'error');
    }
}

/**
 * update the stable coin select dropdown
 */
function updateStableCoinSelect() {
    const stakeCoinSelect = document.getElementById('stableCoinSelect');
    
    if (!stakeCoinSelect) {
        debug.error('the stable coin select control is not found');
        return;
    }
    
    // clear the existing options (keep the first default option)
    while (stakeCoinSelect.options.length > 1) {
        stakeCoinSelect.remove(1);
    }
    
    // used to track the added addresses, avoid adding the same address multiple times
    const addedAddresses = new Set();
    
    // add the supported stable coins
    supportedStableCoins.forEach(coin => {
        // check if the same address has been added
        if (addedAddresses.has(coin.address.toLowerCase())) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = coin.address;
        option.textContent = coin.symbol;
        option.setAttribute('data-decimals', coin.decimals);
        stakeCoinSelect.appendChild(option);
        
        // record the added address
        addedAddresses.add(coin.address.toLowerCase());
    });
    
    debug.log('the stable coin select dropdown is updated');
}

/**
 * handle the stable coin select change
 */
async function handleStableCoinSelect() {
    const select = document.getElementById('stableCoinSelect');
    const balanceElement = document.getElementById('selectedStableCoinBalance');
    
    if (!select || !balanceElement || !web3 || !currentUserAddress) {
        debug.error('the elements or data required to get the stable coin balance are not available');
        return;
    }
    
    const selectedAddress = select.value;
    if (!selectedAddress) {
        balanceElement.textContent = '0';
        return;
    }
    
    try {
        // show the loading status
        balanceElement.textContent = 'loading...';
        
        // create the stable coin contract instance
        const stableCoinContract = new web3.eth.Contract(GENERIC_ERC20_ABI, selectedAddress);
        
        // get the selected stable coin decimal places
        const decimalsOption = select.options[select.selectedIndex].getAttribute('data-decimals');
        const decimals = decimalsOption ? parseInt(decimalsOption) : 18;
        
        // get the balance
        const balance = await stableCoinContract.methods.balanceOf(currentUserAddress).call();
        
        // format and display the balance
        const formattedBalance = formatTokenAmount(balance, decimals);
        balanceElement.textContent = formattedBalance;
    } catch (error) {
        debug.error('failed to get the stable coin balance:', error);
        balanceElement.textContent = 'failed to get';
        showNotification('failed to get the stable coin balance: ' + error.message, 'error');
    }
}

/**
 * format the token amount
 */
function formatTokenAmount(amount, decimals = 18) {
    if (!amount) return '0';
    
    try {
        const divisor = BigInt(10) ** BigInt(decimals);
        const bigIntAmount = BigInt(amount);
        const integerPart = (bigIntAmount / divisor).toString();
        const fractionalPart = (bigIntAmount % divisor).toString().padStart(decimals, '0');
        
        // take the 6 decimal places, truncate the trailing 0s
        const formattedFraction = fractionalPart.substring(0, 6).replace(/0+$/, '');
        
        return formattedFraction ? `${integerPart}.${formattedFraction}` : integerPart;
    } catch (error) {
        debug.error('failed to format the token amount:', error);
        return amount;
    }
}

/**
 * load the user staking info
 */
async function loadUserStakingInfo() {
    if (!pwusdStakingContract || !web3 || !currentUserAddress) {
        debug.error('the contract is not initialized or the user has not connected the wallet, cannot load the staking info');
        return;
    }
    
    try {
        debug.log('loading the user staking info...');
        
        // clear the existing info
        userStakingInfo = [];
        
        // Get user staking record count
        if (typeof pwusdStakingContract.methods.userStakingRecordCount === 'function') {
            const recordCount = await pwusdStakingContract.methods.userStakingRecordCount(currentUserAddress).call();
            debug.log(`user has ${recordCount} staking records`);
            
            // Get each staking record
            for (let i = 0; i < recordCount; i++) {
                try {
                    const stakingInfo = await pwusdStakingContract.methods.userStakingInfo(currentUserAddress, i).call();
                    
                    if (stakingInfo && stakingInfo.stakedAmount && stakingInfo.stakedAmount !== '0') {
                        const coinAddress = stakingInfo.stableCoin;
                        const recordId = parseInt(stakingInfo.recordId);
                        
                        // Create the ERC20 contract instance to get token details
                        const coinContract = new web3.eth.Contract(GENERIC_ERC20_ABI, coinAddress);
                        
                        // Get token symbol and decimals
                        const symbol = await coinContract.methods.symbol().call();
                        const decimals = await coinContract.methods.decimals().call();
                        
                        // Get pending rewards directly from the record
                        const pendingRewards = stakingInfo.pendingRewards || '0';
                        
                        userStakingInfo.push({
                            address: coinAddress,
                            symbol: symbol,
                            amount: stakingInfo.stakedAmount,
                            decimals: parseInt(decimals),
                            lastClaimedCycle: parseInt(stakingInfo.lastClaimedCycle),
                            pendingRewards: pendingRewards,
                            recordId: recordId
                        });
                        
                        debug.log(`loaded staking record #${recordId}: ${symbol}, amount: ${stakingInfo.stakedAmount}, pending rewards: ${pendingRewards}`);
                    }
                } catch (error) {
                    debug.error(`failed to get staking record at index ${i}:`, error);
                }
            }
            
            debug.log('the user staking info:', userStakingInfo);
            
            // update the staking history list
            updateStakingHistoryUI();
        } else {
            // Fallback to old method
            debug.log('userStakingRecordCount method not found, trying legacy method');
            // The legacy code from the old implementation is removed to avoid 
            // conflicts with the new implementation
            debug.log('the contract does not support userStakingRecordCount, cannot load staking info');
            document.getElementById('noHistoryMessage').style.display = 'block';
        }
    } catch (error) {
        debug.error('failed to load the user staking info:', error);
        showNotification('failed to load the staking info: ' + error.message, 'error');
    }
}

/**
 * update the staking history UI
 */
function updateStakingHistoryUI() {
    const historyList = document.getElementById('stakingHistoryList');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    
    if (!historyList) {
        debug.error('the staking history list element is not found');
        return;
    }
    
    // clear the existing history records (keep the no record message)
    const children = Array.from(historyList.children);
    for (const child of children) {
        if (child.id !== 'noHistoryMessage') {
            historyList.removeChild(child);
        }
    }
    
    // check if there is any staking record
    if (userStakingInfo.length === 0) {
        if (noHistoryMessage) {
            noHistoryMessage.style.display = 'block';
        }
        return;
    } else {
        if (noHistoryMessage) {
            noHistoryMessage.style.display = 'none';
        }
    }
    
    // Add "Claim All Rewards" button if we have multiple records with rewards
    let totalRewards = 0;
    for (const info of userStakingInfo) {
        const rewards = parseInt(info.pendingRewards || '0');
        if (!isNaN(rewards)) {
            totalRewards += rewards;
        }
    }
    
    // if (totalRewards > 0 && userStakingInfo.length > 1 && typeof pwusdStakingContract.methods.claimAllRewards === 'function') {
    //     const claimAllContainer = document.createElement('div');
    //     claimAllContainer.className = 'claim-all-container';
    //     claimAllContainer.style.textAlign = 'right';
    //     claimAllContainer.style.margin = '10px 0';
        
    //     const claimAllButton = document.createElement('button');
    //     claimAllButton.className = 'primary-btn';
    //     claimAllButton.textContent = window.i18n && window.i18n.t ? window.i18n.t('button.claimAll') : 'Claim All Rewards';
    //     claimAllButton.addEventListener('click', claimAllRewards);
        
    //     claimAllContainer.appendChild(claimAllButton);
    //     historyList.parentNode.insertBefore(claimAllContainer, historyList);
    // }
    
    // used to track the added staking records
    const addedRecords = new Set();
    
    // add the staking records
    userStakingInfo.forEach((coin, index) => {
        // create the unique identifier
        const recordId = coin.recordId || index;
        const uniqueId = `record_${recordId}`;
        
        // check if the same record has been added
        if (addedRecords.has(uniqueId)) {
            return;
        }
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-row';
        historyItem.setAttribute('data-record-id', recordId);
        
        // calculate the last claimed time
        const lastClaimedText = coin.lastClaimedCycle === 0 ? 
            (window.i18n && window.i18n.t ? window.i18n.t('stableStaking.history.notClaimed') : 'Not Claimed') : 
            (window.i18n && window.i18n.t ? window.i18n.t('stableStaking.history.cycle', {cycle: coin.lastClaimedCycle}) : `Cycle ${coin.lastClaimedCycle}`);
        
        // format the staked amount
        const formattedAmount = formatTokenAmount(coin.amount, coin.decimals);
        
        // use the already calculated pending rewards, avoid calculating it again
        let rewardsToShow = coin.pendingRewards || '0';
        
        // only try to calculate the pending rewards when the original rewards are 0
        if (rewardsToShow === '0') {
            // calculate the pending rewards, ensure the latest data is displayed
            // Use actual current cycle if available, otherwise use contract cycle
            const actualCycle = window.actualCurrentCycle || calculateActualCurrentCycle(currentCycleValue, lastUpdateTimestamp);
            rewardsToShow = calculatePendingRewards({
                amount: coin.amount,
                lastClaimedCycle: coin.lastClaimedCycle,
                pendingRewards: '0'
            }, actualCycle, lastUpdateTimestamp);
        }
        
        debug.log(`the rewards displayed in the staking history UI: ${rewardsToShow}, token: ${coin.symbol}, record ID: ${recordId}, staked amount: ${coin.amount}, last claimed cycle: ${coin.lastClaimedCycle}`);
        
        // display the rewards value - ensure it is an integer (because PWP precision is 0)
        let rewardsAsInt;
        try {
            rewardsAsInt = parseInt(rewardsToShow);
            if (isNaN(rewardsAsInt)) rewardsAsInt = 0;
        } catch (e) {
            rewardsAsInt = 0;
        }
        
        const formattedRewards = `${rewardsAsInt} PWP, ${rewardsAsInt} PWB`;
        const claimButtonText = window.i18n && window.i18n.t ? window.i18n.t('button.claim') : 'claim rewards';
        
        historyItem.innerHTML = `
            <div class="history-cell">${coin.symbol} (ID: ${recordId})</div>
            <div class="history-cell">${formattedAmount}</div>
            <div class="history-cell">${lastClaimedText}</div>
            <div class="history-cell">${formattedRewards}</div>
            <div class="history-cell">
                <button class="claim-btn" data-record-id="${recordId}">${claimButtonText}</button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
        
        // record the added record
        addedRecords.add(uniqueId);
        
        // bind the claim rewards button event
        const claimBtn = historyItem.querySelector('.claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                claimRewards(this.getAttribute('data-record-id'));
            });
        }
    });
}

/**
 * set the max amount
 * @param {string} type - the operation type, 'stake' or 'withdraw'
 */
function setMaxAmount(type) {
    try {
        if (type === 'stake') {
            const select = document.getElementById('stableCoinSelect');
            const amountInput = document.getElementById('stakeAmount');
            const balanceElement = document.getElementById('selectedStableCoinBalance');
            
            if (!select || !amountInput || !balanceElement) {
                debug.error('the stake related DOM elements are not found');
                return;
            }
            
            // get the balance text and convert it to a number
            const balanceText = balanceElement.textContent;
            if (balanceText && balanceText !== '0' && balanceText !== 'loading...') {
                amountInput.value = balanceText;
            }
        } else if (type === 'withdraw') {
            const select = document.getElementById('withdrawStableCoinSelect');
            const amountInput = document.getElementById('withdrawAmount');
            const balanceElement = document.getElementById('stakedBalance');
            
            if (!select || !amountInput || !balanceElement) {
                debug.error('the withdraw related DOM elements are not found');
                return;
            }
            
            // get the staked balance text and convert it to a number
            const balanceText = balanceElement.textContent;
            if (balanceText && balanceText !== '0' && balanceText !== 'loading...') {
                amountInput.value = balanceText;
            }
        }
    } catch (error) {
        debug.error('failed to set the max amount:', error);
        showNotification('failed to set the max amount', 'error');
    }
}

/**
 * handle the withdraw coin select change
 */
async function handleWithdrawCoinSelect() {
    const select = document.getElementById('withdrawStableCoinSelect');
    const balanceElement = document.getElementById('stakedBalance');
    
    if (!select || !balanceElement) {
        debug.error('the elements required to get the staked balance are not available');
        return;
    }
    
    const selectedRecordId = select.value;
    if (!selectedRecordId && selectedRecordId !== '0') {
        balanceElement.textContent = '0';
        return;
    }
    
    try {
        // show the loading status
        balanceElement.textContent = 'loading...';
        
        // find the info of the selected staking record
        const recordInfo = userStakingInfo.find(info => info.recordId.toString() === selectedRecordId.toString());
        
        if (recordInfo) {
            // format and display the staked balance
            const formattedBalance = formatTokenAmount(recordInfo.amount, recordInfo.decimals);
            balanceElement.textContent = formattedBalance;
        } else {
            balanceElement.textContent = '0';
        }
    } catch (error) {
        debug.error('failed to get the staked balance:', error);
        balanceElement.textContent = 'failed to get';
        showNotification('failed to get the staked balance: ' + error.message, 'error');
    }
}

/**
 * stake the stable coin
 */
async function stake() {
    if (!web3 || !pwusdStakingContract || !currentUserAddress) {
        showNotification('stableStaking.notification.connectWallet', 'warning');
        return;
    }
    
    const select = document.getElementById('stableCoinSelect');
    const amountInput = document.getElementById('stakeAmount');
    
    if (!select || !amountInput) {
        debug.error('the stake related DOM elements are not found');
        return;
    }
    
    const selectedCoinAddress = select.value;
    const amount = amountInput.value.trim();
    
    if (!selectedCoinAddress) {
        showNotification('stableStaking.notification.selectCoin', 'warning');
        return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('stableStaking.notification.invalidAmount', 'warning');
        return;
    }

    // Add validation for multiple of 10
    const amountNumber = parseFloat(amount);
    if (amountNumber % 10 !== 0) {
        showNotification('stableStaking.notification.amountMultiple10', 'warning');
        return;
    }
    
    try {
        debug.log('prepare to stake the stable coin:', selectedCoinAddress, amount);
        
        // get the decimal places of the stable coin
        const selectedOption = select.options[select.selectedIndex];
        const decimals = selectedOption.getAttribute('data-decimals') || 18;
        
        // convert the input amount to the precision required by the contract
        const amountInWei = web3.utils.toWei(amount, 'ether');
        
        // create the stable coin contract instance
        const stableCoinContract = new web3.eth.Contract(GENERIC_ERC20_ABI, selectedCoinAddress);
        
        // check the user's authorization
        const allowance = await stableCoinContract.methods.allowance(currentUserAddress, pwusdStakingContract._address).call();
        
        // if the allowance is not enough, need to approve first
        if (BigInt(allowance) < BigInt(amountInWei)) {
            // use the confirm dialog to ask the user if they want to approve
            const confirmResult = await ModalDialog.confirm(
                window.i18n && window.i18n.t ? window.i18n.t('stableStaking.notification.approveConfirmation') : 'need to approve the contract to use your stable coin, continue?', 
                {
                    title: window.i18n && window.i18n.t ? window.i18n.t('stableStaking.notification.approveTitle') : 'approve confirmation',
                    confirmText: window.i18n && window.i18n.t ? window.i18n.t('button.approve') : 'approve',
                    cancelText: window.i18n && window.i18n.t ? window.i18n.t('button.cancel') : 'cancel'
                }
            );
            
            if (confirmResult.action !== 'confirm') {
                return; // the user cancels the approval
            }
            
            showNotification('stableStaking.notification.approving', 'info');
            
            // request the approval
            const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
            
            if (shouldUsePrivateKeyWallet()) {
                debug.log('Using private key wallet for approval transaction');
                await sendPrivateKeyTransaction(
                    stableCoinContract,
                    'approve',
                    [pwusdStakingContract._address, maxUint256],
                    { from: currentUserAddress }
                );
            } else {
                debug.log('Using traditional wallet for approval transaction');
                await stableCoinContract.methods.approve(
                    pwusdStakingContract._address, 
                    maxUint256
                ).send({ from: currentUserAddress });
            }
            
            showNotification('stableStaking.notification.approveSuccess', 'success');
        }
        
        // execute the stake operation
        let stakeTx;
        
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Using private key wallet for staking transaction');
            stakeTx = await sendPrivateKeyTransaction(
                pwusdStakingContract,
                'stake',
                [selectedCoinAddress, amountInWei],
                { from: currentUserAddress }
            );
        } else {
            debug.log('Using traditional wallet for staking transaction');
            stakeTx = await pwusdStakingContract.methods.stake(
                selectedCoinAddress,
                amountInWei
            ).send({ from: currentUserAddress });
        }
        
        debug.log('stake transaction successful:', stakeTx);
        showNotification('stableStaking.notification.stakeSuccess', 'success');
        
        // clear the input
        amountInput.value = '';
        
        // refresh the data
        setTimeout(() => {
            refreshData();
        }, 2000);
    } catch (error) {
        debug.error('failed to stake the stable coin:', error);
        showNotification('stableStaking.notification.stakeFailed', 'error');
    }
}

/**
 * withdraw the stable coin
 */
async function withdraw() {
    if (!web3 || !pwusdStakingContract || !currentUserAddress) {
        showNotification('stableStaking.notification.connectWallet', 'warning');
        return;
    }
    
    const select = document.getElementById('withdrawStableCoinSelect');
    const amountInput = document.getElementById('withdrawAmount');
    
    if (!select || !amountInput) {
        debug.error('the withdraw related DOM elements are not found');
        return;
    }
    
    const selectedRecordId = select.value;
    const amount = amountInput.value.trim();
    
    if (!selectedRecordId && selectedRecordId !== '0') {
        showNotification('stableStaking.notification.noStakingRecord', 'warning');
        return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('stableStaking.notification.invalidAmount', 'warning');
        return;
    }
    
    // Validate that the amount is a multiple of 10
    const amountNumber = parseFloat(amount);
    if (amountNumber % 10 !== 0) {
        showNotification('stableStaking.notification.amountMultiple10', 'warning');
        return;
    }
    
    try {
        // use the confirm dialog to ask the user if they want to confirm the withdraw
        const confirmResult = await ModalDialog.confirm(
            window.i18n && window.i18n.t 
                ? window.i18n.t('stableStaking.notification.withdrawConfirmation', {amount: amount}) 
                : `confirm to withdraw ${amount} stable coin from record #${selectedRecordId}?`, 
            {
                title: window.i18n && window.i18n.t ? window.i18n.t('stableStaking.notification.withdrawTitle') : 'withdraw confirmation',
                confirmText: window.i18n && window.i18n.t ? window.i18n.t('button.confirm') : 'confirm',
                cancelText: window.i18n && window.i18n.t ? window.i18n.t('button.cancel') : 'cancel'
            }
        );
        
        if (confirmResult.action !== 'confirm') {
            return; // the user cancels the withdraw
        }
        
        // Find the staking record information
        const recordInfo = userStakingInfo.find(info => info.recordId.toString() === selectedRecordId.toString());
        
        if (!recordInfo) {
            showNotification('stableStaking.notification.stakingInfoNotFound', 'error');
            return;
        }
        
        debug.log('prepare to withdraw from staking record:', selectedRecordId, 'amount:', amount);
        
        // get the decimal places of the stable coin
        const decimals = recordInfo.decimals || 18;
        
        // convert the input amount to the precision required by the contract
        const amountInWei = web3.utils.toWei(amount, 'ether');
        
        // Check if PWUSD needs approval
        try {
            // If withdrawing stablecoins, we need to burn PWUSD so we may need to approve that
            if (pwusdContract) {
                const allowance = await pwusdContract.methods.allowance(
                    currentUserAddress, 
                    pwusdStakingContract._address
                ).call();
                
                if (BigInt(allowance) < BigInt(amountInWei)) {
                    showNotification('Approving PWUSD for withdrawal...', 'info');
                    
                    // Request maximum approval amount
                    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256 - 1
                    
                    if (shouldUsePrivateKeyWallet()) {
                        debug.log('Using private key wallet for PWUSD approval transaction');
                        await sendPrivateKeyTransaction(
                            pwusdContract,
                            'approve',
                            [pwusdStakingContract._address, maxUint256],
                            { from: currentUserAddress }
                        );
                    } else {
                        debug.log('Using traditional wallet for PWUSD approval transaction');
                        await pwusdContract.methods.approve(
                            pwusdStakingContract._address, 
                            maxUint256
                        ).send({
                            from: currentUserAddress
                        });
                    }
                    
                    showNotification('PWUSD approved successfully', 'success');
                }
            }
        } catch (approveError) {
            debug.error('Failed to approve PWUSD:', approveError);
            showNotification('Failed to approve PWUSD for withdrawal', 'error');
            return;
        }
        
        // Execute the withdraw operation directly without checking if method exists
        showNotification('Processing withdrawal...', 'info');
        
        let withdrawTx;
        
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Using private key wallet for withdraw transaction');
            withdrawTx = await sendPrivateKeyTransaction(
                pwusdStakingContract,
                'withdraw',
                [selectedRecordId, amountInWei],
                { from: currentUserAddress }
            );
        } else {
            debug.log('Using traditional wallet for withdraw transaction');
            withdrawTx = await pwusdStakingContract.methods.withdraw(
                selectedRecordId,
                amountInWei
            ).send({ from: currentUserAddress });
        }
        
        debug.log('withdraw transaction successful:', withdrawTx);
        
        // Success notification
        showNotification(
            window.i18n && window.i18n.t 
                ? window.i18n.t('stableStaking.notification.withdrawSuccess', {amount: amount}) 
                : `successfully withdrew ${amount} stable coin!`, 
            'success'
        );
        
        // Clear the input
        amountInput.value = '';
        
        // refresh the data
        setTimeout(() => {
            refreshData();
        }, 2000);
    } catch (error) {
        debug.error('withdraw stable coin failed:', error);
        showNotification('stableStaking.notification.withdrawFailed', 'error');
    }
}

/**
 * show the notification
 * @param {string} message - the notification message
 * @param {string} type - the notification type 'success', 'error', 'info', 'warning'
 */
function showNotification(message, type = 'info') {
    // Check if message looks like an i18n key and try to translate
    if (window.i18n && typeof window.i18n.t === 'function' && message && message.indexOf('.') > 0) {
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
                    title = window.i18n && window.i18n.t ? window.i18n.t('notification.success') : 'success';
                    icon = '✅';
                    break;
                case 'error':
                    title = window.i18n && window.i18n.t ? window.i18n.t('notification.error') : 'error';
                    icon = '❌';
                    break;
                case 'warning':
                    title = window.i18n && window.i18n.t ? window.i18n.t('notification.warning') : 'warning';
                    icon = '⚠️';
                    break;
                default:
                    title = window.i18n && window.i18n.t ? window.i18n.t('notification.info') : 'info';
                    icon = 'ℹ️';
            }
            
            debug.log(`display the notification: "${message}"`);
            window.ModalDialog.show({
                title: title,
                content: `<div style="text-align:center;">
                    <div style="font-size:48px;margin:20px 0;">${icon}</div>
                    <p style="font-size:16px;">${message}</p>
                </div>`,
                confirmText: window.i18n && window.i18n.t ? window.i18n.t('button.confirm') : 'confirm'
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
 * load the withdrawable stable coins
 */
async function loadWithdrawableStableCoins() {
    if (!pwusdStakingContract || !web3 || !currentUserAddress || userStakingInfo.length === 0) {
        debug.warn('failed to load the withdrawable stable coins');
        return;
    }
    
    try {
        debug.log('loading the withdrawable stable coins...');
        
        const withdrawCoinSelect = document.getElementById('withdrawStableCoinSelect');
        
        if (!withdrawCoinSelect) {
            debug.error('the withdrawable stable coin select element is not found');
            return;
        }
        
        // clear the existing options (keep the first default option)
        while (withdrawCoinSelect.options.length > 1) {
            withdrawCoinSelect.remove(1);
        }
        
        // used to track the added records, avoid adding the same record twice
        const addedRecords = new Set();
        
        // Add the user's staking records
        userStakingInfo.forEach(staking => {
            // Check if staking record ID is valid
            if (!staking.recordId && staking.recordId !== 0) {
                return;
            }
            
            // check if the record has been added
            const recordKey = `record-${staking.recordId}`;
            if (addedRecords.has(recordKey)) {
                return;
            }
            
            if (staking.amount && staking.amount !== '0') {
                const option = document.createElement('option');
                option.value = staking.recordId;
                option.textContent = `${staking.symbol} (ID: ${staking.recordId} - staked: ${formatTokenAmount(staking.amount, staking.decimals)})`;
                option.setAttribute('data-decimals', staking.decimals);
                option.setAttribute('data-amount', staking.amount);
                option.setAttribute('data-record-id', staking.recordId);
                option.setAttribute('data-address', staking.address);
                withdrawCoinSelect.appendChild(option);
                
                // record the added record
                addedRecords.add(recordKey);
            }
        });
        
        debug.log('the withdrawable staking records select element is updated');
        
        // update the staking history list
        updateStakingHistoryUI();
    } catch (error) {
        debug.error('failed to load the withdrawable staking records:', error);
        showNotification('failed to load the withdrawable staking records', 'error');
    }
}

/**
 * Update UI texts based on the current locale
 */
function updateUITexts() {
    // Only execute if i18n is available
    if (!window.i18n) return;
    
    debug.log('Updating UI texts for locale:', window.i18n.getCurrentLocale());
    
    // Update page title
    document.title = window.i18n.t('stableStaking.title') + ' - ' + window.i18n.t('game.title');
    
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
    
    debug.log('UI texts updated for language:', window.i18n.getCurrentLocale());
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
 * claim all rewards at once
 */
async function claimAllRewards() {
    if (!web3 || !pwusdStakingContract || !currentUserAddress) {
        showNotification('stableStaking.notification.connectWallet', 'warning');
        return;
    }
    
    try {
        // Show confirmation dialog
        const confirmResult = await ModalDialog.confirm(
            window.i18n && window.i18n.t 
                ? window.i18n.t('stableStaking.notification.claimAllConfirmation') 
                : 'Do you want to claim all your staking rewards?', 
            {
                title: window.i18n && window.i18n.t ? window.i18n.t('stableStaking.notification.claimTitle') : 'claim confirmation',
                confirmText: window.i18n && window.i18n.t ? window.i18n.t('button.confirm') : 'confirm',
                cancelText: window.i18n && window.i18n.t ? window.i18n.t('button.cancel') : 'cancel'
            }
        );
        
        if (confirmResult.action !== 'confirm') {
            return; // User canceled the operation
        }
        
        // Show processing notification
        showNotification('stableStaking.notification.claiming', 'info');
        
        // Execute the claimAllRewards function
        let claimTx;
        
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Using private key wallet for claim all rewards transaction');
            claimTx = await sendPrivateKeyTransaction(
                pwusdStakingContract,
                'claimAllRewards',
                [],
                { from: currentUserAddress }
            );
        } else {
            debug.log('Using traditional wallet for claim all rewards transaction');
            claimTx = await pwusdStakingContract.methods.claimAllRewards().send({ 
                from: currentUserAddress 
            });
        }
        
        debug.log('claim all rewards transaction successful:', claimTx);
        
        // Show success notification
        showNotification('stableStaking.notification.claimSuccess', 'success');
        
        // Refresh the data after a short delay
        setTimeout(() => {
            refreshData();
        }, 2000);
    } catch (error) {
        debug.error('failed to claim all rewards:', error);
        showNotification('stableStaking.notification.claimFailed', 'error');
    }
}

/**
 * claim staking rewards for a specific record
 * @param {string} recordId - the record ID of the staking
 */
async function claimRewards(recordId) {
    if (!web3 || !pwusdStakingContract || !currentUserAddress) {
        showNotification('stableStaking.notification.connectWallet', 'warning');
        return;
    }
    
    try {
        // Show confirmation dialog
        const confirmResult = await ModalDialog.confirm(
            window.i18n && window.i18n.t 
                ? window.i18n.t('stableStaking.notification.claimConfirmation', {recordId: recordId}) 
                : `Do you want to claim rewards for record #${recordId}?`, 
            {
                title: window.i18n && window.i18n.t ? window.i18n.t('stableStaking.notification.claimTitle') : 'claim confirmation',
                confirmText: window.i18n && window.i18n.t ? window.i18n.t('button.confirm') : 'confirm',
                cancelText: window.i18n && window.i18n.t ? window.i18n.t('button.cancel') : 'cancel'
            }
        );
        
        if (confirmResult.action !== 'confirm') {
            return; // User canceled the operation
        }
        
        // Show processing notification
        showNotification('stableStaking.notification.claiming', 'info');
        
        // Execute the claimRewards function
        let claimTx;
        
        if (shouldUsePrivateKeyWallet()) {
            debug.log('Using private key wallet for claim rewards transaction');
            claimTx = await sendPrivateKeyTransaction(
                pwusdStakingContract,
                'claimRewards',
                [recordId],
                { from: currentUserAddress }
            );
        } else {
            debug.log('Using traditional wallet for claim rewards transaction');
            claimTx = await pwusdStakingContract.methods.claimRewards(recordId).send({ 
                from: currentUserAddress 
            });
        }
        
        debug.log('claim rewards transaction successful:', claimTx);
        
        // Show success notification
        showNotification('stableStaking.notification.claimSuccess', 'success');
        
        // Refresh the data after a short delay
        setTimeout(() => {
            refreshData();
        }, 2000);
    } catch (error) {
        debug.error('failed to claim rewards:', error);
        showNotification('stableStaking.notification.claimFailed', 'error');
    }
}

// initialize after the page is loaded
document.addEventListener('DOMContentLoaded', init); 