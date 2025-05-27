const i18n = window.i18n;

document.addEventListener('DOMContentLoaded', () => {
    // Debug object for stable staking
    const debug = {
        log: function(message, ...args) {
            console.log('[StableStaking Debug]', message, ...args);
        },
        error: function(message, ...args) {
            console.error('[StableStaking Debug]', message, ...args);
        },
        warn: function(message, ...args) {
            console.warn('[StableStaking Debug]', message, ...args);
        }
    };

    // Global variables
    let web3 = null;
    let walletNetworkManager = null;
    let pwusdStakingContract = null;
    let pwPointManagerContract = null;
    let pwusdContract = null;
    let currentUserAddress = null;
    let supportedStableCoins = [];
    let userStakingInfo = [];
    let currentCycleValue = 0;
    let rewardRateValue = 0;
    let isInitialized = false;
    let nextCycleUpdateTimestamp = 0;
    let nextCycleUpdateInterval = null;
    let contractsInitialized = false;
    let isInitializingContracts = false;

    // Constants
    const MAX_RETRIES = 5;
    let initRetryCount = 0;

    // Get DOM elements
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    const refreshBtn = document.getElementById('refreshBtn');
    const stakeBtn = document.getElementById('stakeBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const maxStakeBtn = document.getElementById('maxStakeBtn');
    const maxWithdrawBtn = document.getElementById('maxWithdrawBtn');

    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Form elements
    const stableCoinSelect = document.getElementById('stableCoinSelect');
    const stakeAmountInput = document.getElementById('stakeAmount');
    const withdrawStableCoinSelect = document.getElementById('withdrawStableCoinSelect');
    const withdrawAmountInput = document.getElementById('withdrawAmount');

    // Display elements
    const currentCycleDisplay = document.getElementById('currentCycle');
    const rewardRateDisplay = document.getElementById('rewardRate');
    const totalStakedAmountDisplay = document.getElementById('totalStakedAmount');
    const totalClaimedPwPointsDisplay = document.getElementById('totalClaimedPwPoints');
    const selectedStableCoinBalanceDisplay = document.getElementById('selectedStableCoinBalance');
    const stakedBalanceDisplay = document.getElementById('stakedBalance');
    const stakingHistoryList = document.getElementById('stakingHistoryList');
    const rewardsList = document.getElementById('rewardsList');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    const noRewardsMessage = document.getElementById('noRewardsMessage');

    // Initialize
    init();

    /**
     * Initialize function
     */
    function init() {
        debug.log('Initializing stable staking page...');

        // Bind events
        bindEvents();

        // Initialize wallet network manager and try to initialize staking
        tryInitializeStaking();

        // Update UI texts
        updateUITexts();
    }

    /**
     * Bind all event listeners
     */
    function bindEvents() {
        // Wallet button
        if (walletBtn) {
            walletBtn.addEventListener('click', handleWalletBtnClick);
        }

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefreshClick);
        }

        // Tab buttons
        tabBtns.forEach(btn => {
            btn.addEventListener('click', handleTabClick);
        });

        // Form buttons
        if (stakeBtn) {
            stakeBtn.addEventListener('click', handleStakeClick);
        }

        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', handleWithdrawClick);
        }

        if (maxStakeBtn) {
            maxStakeBtn.addEventListener('click', () => setMaxAmount('stake'));
        }

        if (maxWithdrawBtn) {
            maxWithdrawBtn.addEventListener('click', () => setMaxAmount('withdraw'));
        }

        // Form selects
        if (stableCoinSelect) {
            stableCoinSelect.addEventListener('change', handleStableCoinSelect);
        }

        if (withdrawStableCoinSelect) {
            withdrawStableCoinSelect.addEventListener('change', handleWithdrawCoinSelect);
        }

        // Listen for locale changes
        window.addEventListener('localeChanged', handleLocaleChanged);

        // Listen for wallet events
        window.addEventListener('wallet.walletConnected', handleWalletConnected);
        window.addEventListener('wallet.walletDisconnected', handleWalletDisconnected);
    }

    /**
     * Try to initialize staking with wallet network manager
     */
    function tryInitializeStaking() {
        debug.log('Attempting to initialize staking...');

        // Show loading status
        setPageStatus('Initializing...');

        // If contracts are already initialized, load staking data directly
        if (contractsInitialized && pwusdStakingContract) {
            loadStakingData();
            return;
        }

        // Initialize WalletNetworkManager
        if (!walletNetworkManager) {
            walletNetworkManager = new window.WalletNetworkManager();
        }

        // Initialize wallet network manager
        walletNetworkManager.init().then((result) => {
            debug.log('WalletNetworkManager initialization result:', result);

            if (result.success) {
                // Get Web3 instance and address
                web3 = walletNetworkManager.getWeb3();
                currentUserAddress = walletNetworkManager.getCurrentAddress();

                debug.log('Wallet network manager ready:', {
                    walletType: result.walletType,
                    network: result.network,
                    address: currentUserAddress,
                    hasWeb3: !!web3
                });

                // Update wallet UI
                updateWalletUI(result.isConnected, currentUserAddress);

                // Initialize contracts
                if (web3) {
                    initializeContracts(web3).then((success) => {
                        if (success) {
                            debug.log('Contracts initialized successfully');
                            loadStakingData();
                        } else {
                            debug.error('Failed to initialize contracts');
                            setPageStatus('Failed to initialize contracts');
                        }
                    });
                } else {
                    debug.warn('No Web3 instance available');
                    setPageStatus('No Web3 connection available');
                }
            } else {
                debug.error('WalletNetworkManager initialization failed:', result.error);
                
                if (result.requiresUserAction) {
                    setPageStatus(result.message || 'Please connect your wallet');
                } else {
                    // Try read-only mode
                    tryReadOnlyMode();
                }
            }
        }).catch((error) => {
            debug.error('Error initializing WalletNetworkManager:', error);
            tryReadOnlyMode();
        });
    }

    /**
     * Try read-only mode for viewing data without wallet
     */
    function tryReadOnlyMode() {
        debug.log('Attempting read-only mode...');

        // Create read-only Web3 instance
        const rpcUrl = window.currentNetwork === 'MAIN' ? 
            'https://bsc-dataseed1.binance.org/' : 
            'https://bsc-testnet-dataseed.bnbchain.org/';

        try {
            web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
            
            // Test connection
            web3.eth.getBlockNumber().then(() => {
                debug.log('Read-only Web3 connection established');
                
                // Initialize contracts in read-only mode
                initializeContracts(web3, true).then((success) => {
                    if (success) {
                        debug.log('Contracts initialized in read-only mode');
                        loadContractInfo(); // Load basic contract info only
                        setPageStatus('Read-only mode - Connect wallet to interact');
                    } else {
                        setPageStatus('Failed to initialize contracts');
                    }
                });
            }).catch((error) => {
                debug.error('Read-only Web3 connection failed:', error);
                setPageStatus('Failed to connect to network');
            });
        } catch (error) {
            debug.error('Failed to create read-only Web3 instance:', error);
            setPageStatus('Failed to initialize');
        }
    }

    /**
     * Initialize contracts
     * @param {object} web3Instance - Web3 instance
     * @param {boolean} readOnly - Whether in read-only mode
     * @returns {Promise<boolean>} - Success status
     */
    async function initializeContracts(web3Instance, readOnly = false) {
        if (isInitializingContracts) {
            debug.log('Contracts already being initialized, waiting...');
            return false;
        }

        isInitializingContracts = true;

        try {
            debug.log('Initializing contracts...', { readOnly });

            // Ensure contract addresses are available
            if (!window.contractAddresses || !window.getContractAddress) {
                throw new Error('Contract addresses not available');
            }

            const getContractAddress = window.getContractAddress;

            // Initialize PwUSD Staking contract
            if (window.initPwUSDStakingContract) {
                pwusdStakingContract = window.initPwUSDStakingContract(web3Instance, getContractAddress);
                if (!pwusdStakingContract) {
                    throw new Error('Failed to initialize PwUSD Staking contract');
                }
                debug.log('PwUSD Staking contract initialized');
            }

            // Initialize PwPoint Manager contract
            if (window.initPwPointManagerContract) {
                pwPointManagerContract = window.initPwPointManagerContract(web3Instance, getContractAddress);
                if (!pwPointManagerContract) {
                    throw new Error('Failed to initialize PwPoint Manager contract');
                }
                debug.log('PwPoint Manager contract initialized');
            }

            // Initialize PwUSD contract
            if (window.initERC20Contract) {
                const pwusdAddress = getContractAddress('PwUSD');
                if (pwusdAddress) {
                    pwusdContract = window.initERC20Contract(web3Instance, pwusdAddress);
                    debug.log('PwUSD contract initialized');
                }
            }

            contractsInitialized = true;
            debug.log('All contracts initialized successfully');

            return true;
        } catch (error) {
            debug.error('Failed to initialize contracts:', error);
            contractsInitialized = false;
            return false;
        } finally {
            isInitializingContracts = false;
        }
    }

    /**
     * Load staking data (full data when wallet is connected)
     */
    async function loadStakingData() {
        try {
            debug.log('Loading staking data...');
            setPageStatus('Loading staking data...');

            // Load contract info
            await loadContractInfo();

            // Load supported stable coins
            await loadSupportedStableCoins();

            // If wallet is connected, load user-specific data
            if (currentUserAddress) {
                await loadUserStakingInfo();
            }

            setPageStatus('');
            isInitialized = true;
            debug.log('Staking data loaded successfully');
        } catch (error) {
            debug.error('Failed to load staking data:', error);
            setPageStatus('Failed to load staking data');
        }
    }

    /**
     * Load basic contract information
     */
    async function loadContractInfo() {
        try {
            if (!pwusdStakingContract) return;

            debug.log('Loading contract info...');

            // Load current cycle
            const currentCycle = await pwusdStakingContract.methods.getCurrentCycle().call();
            currentCycleValue = parseInt(currentCycle);
            if (currentCycleDisplay) {
                currentCycleDisplay.textContent = currentCycleValue.toString();
            }

            // Load reward rate (24h)
            const rewardRate = await pwusdStakingContract.methods.getRewardRate().call();
            rewardRateValue = parseFloat(web3.utils.fromWei(rewardRate, 'ether'));
            if (rewardRateDisplay) {
                rewardRateDisplay.textContent = rewardRateValue.toFixed(4) + ' PWP/24h';
            }

            // Load total staked amount
            const totalStaked = await pwusdStakingContract.methods.getTotalStaked().call();
            const totalStakedFormatted = parseFloat(web3.utils.fromWei(totalStaked, 'ether'));
            if (totalStakedAmountDisplay) {
                totalStakedAmountDisplay.textContent = totalStakedFormatted.toFixed(2) + ' PwUSD';
            }

            debug.log('Contract info loaded:', {
                currentCycle: currentCycleValue,
                rewardRate: rewardRateValue,
                totalStaked: totalStakedFormatted
            });
        } catch (error) {
            debug.error('Failed to load contract info:', error);
        }
    }

    /**
     * Load supported stable coins
     */
    async function loadSupportedStableCoins() {
        try {
            if (!pwusdStakingContract) return;

            debug.log('Loading supported stable coins...');

            // Get supported stable coins from contract or config
            if (window.supportedStableCoins) {
                supportedStableCoins = window.supportedStableCoins;
            } else {
                // Fallback: try to get from contract
                supportedStableCoins = await pwusdStakingContract.methods.getSupportedStableCoins().call();
            }

            // Populate stable coin select
            if (stableCoinSelect) {
                stableCoinSelect.innerHTML = '<option value="" disabled selected data-i18n="stableStaking.form.selectPlaceholder">Please select a stablecoin</option>';
                
                supportedStableCoins.forEach(coin => {
                    const option = document.createElement('option');
                    option.value = coin.address;
                    option.textContent = coin.symbol;
                    stableCoinSelect.appendChild(option);
                });
            }

            debug.log('Supported stable coins loaded:', supportedStableCoins);
        } catch (error) {
            debug.error('Failed to load supported stable coins:', error);
        }
    }

    /**
     * Load user staking information
     */
    async function loadUserStakingInfo() {
        try {
            if (!pwusdStakingContract || !currentUserAddress) return;

            debug.log('Loading user staking info...');

            // Load user staking records
            const stakingRecords = await pwusdStakingContract.methods.getUserStakingRecords(currentUserAddress).call();
            userStakingInfo = stakingRecords;

            // Update staking history display
            updateStakingHistoryDisplay();

            // Update rewards display
            updateRewardsDisplay();

            // Load total claimed rewards
            const totalClaimed = await pwusdStakingContract.methods.getUserTotalClaimed(currentUserAddress).call();
            const totalClaimedFormatted = parseFloat(web3.utils.fromWei(totalClaimed, 'ether'));
            if (totalClaimedPwPointsDisplay) {
                totalClaimedPwPointsDisplay.textContent = totalClaimedFormatted.toFixed(2) + ' PWP';
            }

            debug.log('User staking info loaded:', {
                records: userStakingInfo.length,
                totalClaimed: totalClaimedFormatted
            });
        } catch (error) {
            debug.error('Failed to load user staking info:', error);
        }
    }

    /**
     * Update staking history display
     */
    function updateStakingHistoryDisplay() {
        if (!stakingHistoryList) return;

        // Clear existing content
        stakingHistoryList.innerHTML = '';

        if (!userStakingInfo || userStakingInfo.length === 0) {
            if (noHistoryMessage) {
                stakingHistoryList.appendChild(noHistoryMessage.cloneNode(true));
            }
            return;
        }

        // Add staking records
        userStakingInfo.forEach((record, index) => {
            const recordElement = createStakingHistoryItem(record, index);
            stakingHistoryList.appendChild(recordElement);
        });
    }

    /**
     * Create staking history item element
     */
    function createStakingHistoryItem(record, index) {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const stableCoinSymbol = getStableCoinSymbol(record.stableCoinAddress);
        const amount = parseFloat(web3.utils.fromWei(record.amount, 'ether'));
        const lastClaimed = new Date(record.lastClaimedTime * 1000).toLocaleDateString();
        const pendingRewards = calculatePendingRewards(record);

        item.innerHTML = `
            <div class="history-cell">${stableCoinSymbol}</div>
            <div class="history-cell">${amount.toFixed(2)}</div>
            <div class="history-cell">${lastClaimed}</div>
            <div class="history-cell">${pendingRewards.toFixed(4)} PWP</div>
            <div class="history-cell">
                <button class="action-btn claim-btn" onclick="claimRewards('${record.id}')">Claim</button>
                <button class="action-btn withdraw-btn" onclick="showWithdrawModal('${record.id}')">Withdraw</button>
            </div>
        `;

        return item;
    }

    /**
     * Update rewards display
     */
    function updateRewardsDisplay() {
        if (!rewardsList) return;

        // Clear existing content
        rewardsList.innerHTML = '';

        if (!userStakingInfo || userStakingInfo.length === 0) {
            if (noRewardsMessage) {
                noRewardsMessage.style.display = 'block';
            }
            return;
        }

        // Hide no rewards message
        if (noRewardsMessage) {
            noRewardsMessage.style.display = 'none';
        }

        // Add reward items
        userStakingInfo.forEach((record, index) => {
            const pendingRewards = calculatePendingRewards(record);
            if (pendingRewards > 0) {
                const rewardElement = createRewardItem(record, index, pendingRewards);
                rewardsList.appendChild(rewardElement);
            }
        });
    }

    /**
     * Create reward item element
     */
    function createRewardItem(record, index, pendingRewards) {
        const item = document.createElement('div');
        item.className = 'reward-item';
        
        const stableCoinSymbol = getStableCoinSymbol(record.stableCoinAddress);
        const amount = parseFloat(web3.utils.fromWei(record.amount, 'ether'));

        item.innerHTML = `
            <div class="reward-info">
                <div class="reward-title">${stableCoinSymbol} Staking Rewards</div>
                <div class="reward-details">Staked: ${amount.toFixed(2)} ${stableCoinSymbol}</div>
                <div class="reward-amount">${pendingRewards.toFixed(4)} PWP</div>
            </div>
            <button class="claim-reward-btn" onclick="claimRewards('${record.id}')">Claim</button>
        `;

        return item;
    }

    /**
     * Calculate pending rewards for a staking record
     */
    function calculatePendingRewards(record) {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const timeSinceLastClaim = currentTime - record.lastClaimedTime;
            const dailyRewardRate = rewardRateValue; // PWP per day
            const secondsPerDay = 24 * 60 * 60;
            
            const pendingRewards = (timeSinceLastClaim / secondsPerDay) * dailyRewardRate;
            return Math.max(0, pendingRewards);
        } catch (error) {
            debug.error('Error calculating pending rewards:', error);
            return 0;
        }
    }

    /**
     * Get stable coin symbol from address
     */
    function getStableCoinSymbol(address) {
        const coin = supportedStableCoins.find(c => c.address.toLowerCase() === address.toLowerCase());
        return coin ? coin.symbol : 'Unknown';
    }

    /**
     * Handle wallet button click
     */
    function handleWalletBtnClick() {
        debug.log('Wallet button clicked');
        
        if (currentUserAddress) {
            // Disconnect wallet
            disconnectWallet();
        } else {
            // Show wallet modal
            showWalletModal();
        }
    }

    /**
     * Show wallet modal
     */
    function showWalletModal() {
        if (walletFrame) {
            walletFrame.style.display = 'block';
        }
    }

    /**
     * Hide wallet modal
     */
    function hideWalletModal() {
        if (walletFrame) {
            walletFrame.style.display = 'none';
        }
    }

    /**
     * Disconnect wallet
     */
    function disconnectWallet() {
        debug.log('Disconnecting wallet...');
        
        currentUserAddress = null;
        web3 = null;
        contractsInitialized = false;
        isInitialized = false;
        
        // Clear user data
        userStakingInfo = [];
        
        // Update UI
        updateWalletUI(false);
        resetStakingPage();
        
        // Clear wallet connection data
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletAddress');
        sessionStorage.removeItem('walletType');
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletType');
        
        debug.log('Wallet disconnected');
    }

    /**
     * Reset staking page to initial state
     */
    function resetStakingPage() {
        // Clear displays
        if (currentCycleDisplay) currentCycleDisplay.textContent = '-';
        if (rewardRateDisplay) rewardRateDisplay.textContent = '-';
        if (totalStakedAmountDisplay) totalStakedAmountDisplay.textContent = '-';
        if (totalClaimedPwPointsDisplay) totalClaimedPwPointsDisplay.textContent = '-';
        if (selectedStableCoinBalanceDisplay) selectedStableCoinBalanceDisplay.textContent = '0';
        if (stakedBalanceDisplay) stakedBalanceDisplay.textContent = '0';
        
        // Clear lists
        if (stakingHistoryList) {
            stakingHistoryList.innerHTML = '';
            if (noHistoryMessage) {
                stakingHistoryList.appendChild(noHistoryMessage.cloneNode(true));
            }
        }
        
        if (rewardsList) {
            rewardsList.innerHTML = '';
            if (noRewardsMessage) {
                noRewardsMessage.style.display = 'block';
            }
        }
        
        // Clear form inputs
        if (stakeAmountInput) stakeAmountInput.value = '';
        if (withdrawAmountInput) withdrawAmountInput.value = '';
        if (stableCoinSelect) stableCoinSelect.selectedIndex = 0;
        if (withdrawStableCoinSelect) withdrawStableCoinSelect.selectedIndex = 0;
        
        setPageStatus('Please connect your wallet');
    }

    /**
     * Update wallet UI
     */
    function updateWalletUI(connected, address = null) {
        debug.log('Updating wallet UI:', { connected, address });
        
        if (connected && address) {
            // Update wallet button
            if (walletBtn) {
                walletBtn.textContent = 'Disconnect';
                walletBtn.className = 'wallet-btn connected';
            }
            
            // Update address display
            if (walletAddressSpan) {
                walletAddressSpan.textContent = formatAddress(address);
            }
        } else {
            // Update wallet button
            if (walletBtn) {
                walletBtn.textContent = 'Connect Wallet';
                walletBtn.className = 'wallet-btn';
            }
            
            // Update address display
            if (walletAddressSpan) {
                walletAddressSpan.textContent = 'No Wallet Connected';
            }
        }
    }

    /**
     * Format address for display
     */
    function formatAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }

    /**
     * Handle refresh button click
     */
    async function handleRefreshClick() {
        debug.log('Refresh button clicked');
        
        if (isInitialized) {
            await loadStakingData();
            showNotification('Data refreshed successfully', 'success');
        } else {
            tryInitializeStaking();
        }
    }

    /**
     * Handle tab click
     */
    function handleTabClick(event) {
        const tabName = event.target.getAttribute('data-tab');
        
        // Update tab buttons
        tabBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update tab panes
        tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(tabName + 'Pane');
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    /**
     * Handle stable coin select
     */
    async function handleStableCoinSelect() {
        const selectedAddress = stableCoinSelect.value;
        if (!selectedAddress || !currentUserAddress || !web3) return;
        
        try {
            // Get ERC20 contract for selected stable coin
            const tokenContract = window.initERC20Contract(web3, selectedAddress);
            if (!tokenContract) return;
            
            // Get user balance
            const balance = await tokenContract.methods.balanceOf(currentUserAddress).call();
            const balanceFormatted = parseFloat(web3.utils.fromWei(balance, 'ether'));
            
            if (selectedStableCoinBalanceDisplay) {
                selectedStableCoinBalanceDisplay.textContent = balanceFormatted.toFixed(2);
            }
        } catch (error) {
            debug.error('Error loading stable coin balance:', error);
        }
    }

    /**
     * Handle withdraw coin select
     */
    function handleWithdrawCoinSelect() {
        const selectedRecordId = withdrawStableCoinSelect.value;
        if (!selectedRecordId) return;
        
        const record = userStakingInfo.find(r => r.id === selectedRecordId);
        if (record && stakedBalanceDisplay) {
            const balance = parseFloat(web3.utils.fromWei(record.amount, 'ether'));
            stakedBalanceDisplay.textContent = balance.toFixed(2);
        }
    }

    /**
     * Set max amount for stake or withdraw
     */
    function setMaxAmount(type) {
        if (type === 'stake') {
            const balance = selectedStableCoinBalanceDisplay ? 
                parseFloat(selectedStableCoinBalanceDisplay.textContent) : 0;
            if (stakeAmountInput) {
                stakeAmountInput.value = Math.floor(balance / 10) * 10; // Round down to nearest 10
            }
        } else if (type === 'withdraw') {
            const balance = stakedBalanceDisplay ? 
                parseFloat(stakedBalanceDisplay.textContent) : 0;
            if (withdrawAmountInput) {
                withdrawAmountInput.value = Math.floor(balance / 10) * 10; // Round down to nearest 10
            }
        }
    }

    /**
     * Handle stake button click
     */
    async function handleStakeClick() {
        if (!currentUserAddress || !web3 || !pwusdStakingContract) {
            showNotification('Please connect your wallet first', 'error');
            return;
        }
        
        const selectedStableCoin = stableCoinSelect.value;
        const amount = parseFloat(stakeAmountInput.value);
        
        if (!selectedStableCoin) {
            showNotification('Please select a stablecoin', 'error');
            return;
        }
        
        if (!amount || amount < 10 || amount % 10 !== 0) {
            showNotification('Amount must be at least 10 and a multiple of 10', 'error');
            return;
        }
        
        try {
            await stake(selectedStableCoin, amount);
        } catch (error) {
            debug.error('Stake failed:', error);
            showNotification('Staking failed: ' + error.message, 'error');
        }
    }

    /**
     * Handle withdraw button click
     */
    async function handleWithdrawClick() {
        if (!currentUserAddress || !web3 || !pwusdStakingContract) {
            showNotification('Please connect your wallet first', 'error');
            return;
        }
        
        const selectedRecordId = withdrawStableCoinSelect.value;
        const amount = parseFloat(withdrawAmountInput.value);
        
        if (!selectedRecordId) {
            showNotification('Please select a staking record', 'error');
            return;
        }
        
        if (!amount || amount < 10 || amount % 10 !== 0) {
            showNotification('Amount must be at least 10 and a multiple of 10', 'error');
            return;
        }
        
        try {
            await withdraw(selectedRecordId, amount);
        } catch (error) {
            debug.error('Withdraw failed:', error);
            showNotification('Withdrawal failed: ' + error.message, 'error');
        }
    }

    /**
     * Stake stable coins
     */
    async function stake(stableCoinAddress, amount) {
        debug.log('Staking:', { stableCoinAddress, amount });
        
        setPageStatus('Processing stake...');
        
        try {
            const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
            
            // First approve the staking contract to spend tokens
            await approveStaking(stableCoinAddress, amountInWei);
            
            // Then call stake function
            const stakeMethod = pwusdStakingContract.methods.stake(stableCoinAddress, amountInWei);
            
            let txHash;
            if (walletNetworkManager && walletNetworkManager.currentWalletType === 'private_key') {
                // Use private key wallet
                const receipt = await window.SecureWalletManager.sendContractTransaction(
                    pwusdStakingContract, 'stake', [stableCoinAddress, amountInWei]
                );
                txHash = receipt.transactionHash;
            } else {
                // Use external wallet
                const receipt = await stakeMethod.send({ from: currentUserAddress });
                txHash = receipt.transactionHash;
            }
            
            debug.log('Stake transaction successful:', txHash);
            showNotification('Staking successful!', 'success');
            
            // Refresh data
            await loadStakingData();
            
            // Clear form
            if (stakeAmountInput) stakeAmountInput.value = '';
            
        } catch (error) {
            debug.error('Stake transaction failed:', error);
            throw error;
        } finally {
            setPageStatus('');
        }
    }

    /**
     * Approve staking contract to spend tokens
     */
    async function approveStaking(tokenAddress, amount) {
        debug.log('Approving staking:', { tokenAddress, amount });
        
        const tokenContract = window.initERC20Contract(web3, tokenAddress);
        if (!tokenContract) {
            throw new Error('Failed to initialize token contract');
        }
        
        const stakingContractAddress = pwusdStakingContract.options.address;
        const approveMethod = tokenContract.methods.approve(stakingContractAddress, amount);
        
        if (walletNetworkManager && walletNetworkManager.currentWalletType === 'private_key') {
            // Use private key wallet
            await window.SecureWalletManager.sendContractTransaction(
                tokenContract, 'approve', [stakingContractAddress, amount]
            );
        } else {
            // Use external wallet
            await approveMethod.send({ from: currentUserAddress });
        }
        
        debug.log('Approval successful');
    }

    /**
     * Withdraw staked tokens
     */
    async function withdraw(recordId, amount) {
        debug.log('Withdrawing:', { recordId, amount });
        
        setPageStatus('Processing withdrawal...');
        
        try {
            const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
            const withdrawMethod = pwusdStakingContract.methods.withdraw(recordId, amountInWei);
            
            let txHash;
            if (walletNetworkManager && walletNetworkManager.currentWalletType === 'private_key') {
                // Use private key wallet
                const receipt = await window.SecureWalletManager.sendContractTransaction(
                    pwusdStakingContract, 'withdraw', [recordId, amountInWei]
                );
                txHash = receipt.transactionHash;
            } else {
                // Use external wallet
                const receipt = await withdrawMethod.send({ from: currentUserAddress });
                txHash = receipt.transactionHash;
            }
            
            debug.log('Withdraw transaction successful:', txHash);
            showNotification('Withdrawal successful!', 'success');
            
            // Refresh data
            await loadStakingData();
            
            // Clear form
            if (withdrawAmountInput) withdrawAmountInput.value = '';
            
        } catch (error) {
            debug.error('Withdraw transaction failed:', error);
            throw error;
        } finally {
            setPageStatus('');
        }
    }

    /**
     * Claim rewards for a specific record
     */
    window.claimRewards = async function(recordId) {
        if (!currentUserAddress || !web3 || !pwusdStakingContract) {
            showNotification('Please connect your wallet first', 'error');
            return;
        }
        
        debug.log('Claiming rewards for record:', recordId);
        
        setPageStatus('Processing claim...');
        
        try {
            const claimMethod = pwusdStakingContract.methods.claimRewards(recordId);
            
            let txHash;
            if (walletNetworkManager && walletNetworkManager.currentWalletType === 'private_key') {
                // Use private key wallet
                const receipt = await window.SecureWalletManager.sendContractTransaction(
                    pwusdStakingContract, 'claimRewards', [recordId]
                );
                txHash = receipt.transactionHash;
            } else {
                // Use external wallet
                const receipt = await claimMethod.send({ from: currentUserAddress });
                txHash = receipt.transactionHash;
            }
            
            debug.log('Claim transaction successful:', txHash);
            showNotification('Rewards claimed successfully!', 'success');
            
            // Refresh data
            await loadStakingData();
            
        } catch (error) {
            debug.error('Claim transaction failed:', error);
            showNotification('Claim failed: ' + error.message, 'error');
        } finally {
            setPageStatus('');
        }
    };

    /**
     * Show withdraw modal for a specific record
     */
    window.showWithdrawModal = function(recordId) {
        // Switch to withdraw tab
        const withdrawTab = document.querySelector('[data-tab="withdraw"]');
        if (withdrawTab) {
            withdrawTab.click();
        }
        
        // Select the record in the dropdown
        if (withdrawStableCoinSelect) {
            withdrawStableCoinSelect.value = recordId;
            handleWithdrawCoinSelect();
        }
    };

    /**
     * Handle wallet connected event
     */
    function handleWalletConnected(event) {
        debug.log('Wallet connected event:', event.detail);
        
        // Reinitialize with new wallet
        setTimeout(() => {
            tryInitializeStaking();
        }, 500);
    }

    /**
     * Handle wallet disconnected event
     */
    function handleWalletDisconnected(event) {
        debug.log('Wallet disconnected event');
        disconnectWallet();
    }

    /**
     * Handle locale changed event
     */
    function handleLocaleChanged(event) {
        updateUITexts();
    }

    /**
     * Update UI texts based on current locale
     */
    function updateUITexts() {
        if (window.i18n && window.i18n.updatePageTexts) {
            window.i18n.updatePageTexts();
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Set page status message
     */
    function setPageStatus(message) {
        // You can implement a status display area in your UI
        debug.log('Page status:', message);
    }

    // Expose functions for global access
    window.stableStakingPage = {
        claimRewards: window.claimRewards,
        showWithdrawModal: window.showWithdrawModal,
        refresh: handleRefreshClick,
        disconnect: disconnectWallet
    };
}); 