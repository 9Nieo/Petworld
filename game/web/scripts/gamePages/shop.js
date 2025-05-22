// shop page script
document.addEventListener('DOMContentLoaded', () => {
    // debug tool
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Pet World Shop]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Pet World Shop Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Pet World Shop Warning]', ...args);
        }
    };
    
    // get the DOM elements
    const shopItems = document.querySelectorAll('.shop-item');
    const buyButtons = document.querySelectorAll('.buy-btn');
    const statusMessage = document.getElementById('status-message');
    const refreshBtn = document.getElementById('refresh-shop-btn');
    
    // Web3 instance and contract instance
    let web3 = null;
    let currentAddress = null;
    let nftLotteryManager = null;
    let pwPointAddress = null;
    let nftLotteryManagerContract = null;
    let nftManagerContract = null;
    let paymentManagerContract = null;
    let paymentManagerContractInstance = null;
    let pwFoodManagerContract = null;
    let pwNFTContract = null;
    let tokenContracts = {
        USDT: null,
        USDC: null,
        DAI: null
    };
    
    // initialize
    init();
    
    /**
     * initialize function
     */
    function init() {
        console.log('initialize the lottery shop page');
        
        // add the NFTLotteryManagerContract class
        window.NFTLotteryManagerContract = class NFTLotteryManagerContract {
            /**
             * constructor
             * @param {Object} web3 - Web3 instance
             */
            constructor(web3) {
                this.web3 = web3;
                // use the global function or object to get the contract address
                const getAddress = window.getContractAddress || function(name) {
                    const network = window.currentNetwork || 'TEST';
                    if (window.contractAddresses && window.contractAddresses[network]) {
                        return window.contractAddresses[network][name];
                    }
                    return null;
                };
                
                this.contractAddress = getAddress('NFTLotteryManager');
                // use the global ABI variable
                this.abi = window.NFTLotteryManagerABI;
                
                // if the abi does not exist, use the default abi
                if (!this.abi) {
                    console.warn('NFTLotteryManagerABI not found, using the minimal ABI');
                    this.abi = []; // minimal ABI
                }
                // create the contract instance
                this.contract = new web3.eth.Contract(this.abi, this.contractAddress);
            }
            /**
             * process the complete lottery transaction process
             * @param {string} lotteryType - the lottery type ('free', 'common', 'rare', 'legendary')
             * @param {string} tokenAddress - the payment token address
             * @param {string} statusElementId - the status information element ID
             * @param {Object} options - additional options
             * @returns {Promise<Object>} - the lottery result object
             */
            async processLotteryTransaction(lotteryType, tokenAddress, statusElementId, options = {}) {
                // default options
                const defaultOptions = {
                    inviter: '0x0000000000000000000000000000000000000000',
                    txOptions: {
                        from: this.web3.eth.defaultAccount || options.txOptions?.from,
                        gas: 1000000
                    },
                    showResult: true,
                    batchCount: 1 // default to 1, representing a single purchase
                };
                
                // merge the options
                const mergedOptions = {...defaultOptions, ...options};
                
                // verify the lotteryType
                if (!['free', 'common', 'rare', 'legendary'].includes(lotteryType)) {
                    console.error(`invalid lottery type: ${lotteryType}`);
                    throw new Error(`invalid lottery type: ${lotteryType}`);
                }
                
                try {
                    let txResult;
                    
                    // call the corresponding contract method based on the lottery type
                    if (lotteryType === 'free') {
                        // claim the free NFT
                        txResult = await this.contract.methods.claimFreeNFT(mergedOptions.inviter).send({
                            from: mergedOptions.txOptions.from,
                            gas: mergedOptions.txOptions.gas
                        });
                    } else {
                        const batchCount = mergedOptions.batchCount || 1;
                        
                        // call the corresponding contract method based on the lottery type and whether it is a batch purchase
                        if (batchCount > 1) {
                            switch (lotteryType) {
                                case 'common':
                                    txResult = await this.contract.methods.batchOpenCommonEgg(tokenAddress, batchCount).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: 1000000 + (batchCount * 500000) // dynamic calculation of the gas limit
                                    });
                                    break;
                                case 'rare':
                                    txResult = await this.contract.methods.batchOpenRareEgg(tokenAddress, batchCount).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: 1000000 + (batchCount * 600000) // dynamic calculation of the gas limit
                                    });
                                    break;
                                case 'legendary':
                                    txResult = await this.contract.methods.batchOpenLegendaryEgg(tokenAddress, batchCount).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: 1000000 + (batchCount * 600000) // dynamic calculation of the gas limit
                                    });
                                    break;
                                default:
                                    throw new Error(`unknown lottery type: ${lotteryType}`);
                            }
                        } else {
                            // single purchase
                            switch (lotteryType) {
                                case 'common':
                                    txResult = await this.contract.methods.openCommonEgg(tokenAddress).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: mergedOptions.txOptions.gas
                                    });
                                    break;
                                case 'rare':
                                    txResult = await this.contract.methods.openRareEgg(tokenAddress).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: mergedOptions.txOptions.gas
                                    });
                                    break;
                                case 'legendary':
                                    txResult = await this.contract.methods.openLegendaryEgg(tokenAddress).send({
                                        from: mergedOptions.txOptions.from,
                                        gas: mergedOptions.txOptions.gas
                                    });
                                    break;
                                default:
                                    throw new Error(`unknown lottery type: ${lotteryType}`);
                            }
                        }
                    }
                    
                    // get the transaction hash
                    const txHash = txResult.transactionHash;
                    console.log('lottery transaction confirmed:', txHash);
                    
                    // get the lottery result
                    const lotteryResultModule = window.getLotteryResultFromTransaction || this.getLotteryResultFromTransaction;
                    if (typeof lotteryResultModule === 'function') {
                        // call the function with the passed web3 and contract instance
                        const lotteryResult = await lotteryResultModule(this.web3, this.contract, txHash);
                        return lotteryResult;
                    }
                    
                    // if there is no function to get the result, return the transaction result
                    return txResult;
                    
                } catch (error) {
                    console.error('lottery process error:', error);
                    throw error;
                }
            }
        };
        
        // check the PWFoodManagerABI loading status
        debug.log('PWFoodManagerABI loading status:', !!window.PWFoodManagerABI);
        
        // try to initialize Web3 first
        if (!web3) {
            if (window.ethereum) {
                debug.log('use window.ethereum to create a Web3 instance');
                try {
                    web3 = new Web3(window.ethereum);
                    debug.log('Web3 initialized from ethereum successfully');
                } catch (e) {
                    debug.error('failed to initialize Web3 from ethereum:', e);
                }
            } else if (window.web3) {
                debug.log('use window.web3 to create a Web3 instance');
                try {
                    web3 = new Web3(window.web3.currentProvider);
                    debug.log('Web3 initialized from web3.currentProvider successfully');
                } catch (e) {
                    debug.error('failed to initialize Web3 from web3.currentProvider:', e);
                }
            } else if (window.parent && window.parent.gameWeb3) {
                debug.log('get the gameWeb3 instance from the parent window');
                web3 = window.parent.gameWeb3;
                debug.log('Web3 got from the parent window successfully');
            } else if (window.gameWeb3) {
                debug.log('use the global gameWeb3 instance');
                web3 = window.gameWeb3;
                debug.log('Web3 got from the global gameWeb3 successfully');
            } else {
                debug.warn('no available Web3 source found, trying other initialization methods');
            }
        }
        
        // initialize or load the payment token configuration
        initPaymentTokens();
        
        // load the contract initializers
        loadContractInitializers();
        
        // if Web3 is initialized, try to initialize the contracts
        if (web3) {
            // initialize the shop contracts
            initShopContracts();
        } else {
            debug.warn('Web3 is not initialized, skipping contract initialization, will try again later');
        }

        // initialize the user interface
        setupShopUI();
        
        // add the balance styles
        addBalanceStyles();
        
        // update the item prices
        updateItemPrices();
        
        // bind the buy button event
        document.querySelector('.shop-grid').addEventListener('click', handleBuyButtonClick);
        
        // check the wallet status in the local storage
        checkStoredWalletConnection();
        
        // add the contract status check after the page is fully loaded
        window.addEventListener('load', function() {
            debug.log('the page is fully loaded, checking the contract status...');
            debug.log('contract status check:', {
                nftLotteryManagerContract: !!nftLotteryManagerContract,
                pwFoodManagerContract: !!pwFoodManagerContract,
                web3Status: !!web3,
                PWFoodManagerABI: !!window.PWFoodManagerABI,
                initPwFoodManagerContract: !!window.initPwFoodManagerContract
            });
            
            // if Web3 is not initialized, try to initialize it again
            if (!web3) {
                debug.log('Web3 is not initialized, trying to initialize it again...');
                if (window.ethereum) {
                    try {
                        web3 = new Web3(window.ethereum);
                        debug.log('successfully initialized Web3 from ethereum after the page is fully loaded');
                        
                        // initialize the contracts
                        if (!nftLotteryManagerContract) {
                            initShopContracts();
                        }
                    } catch (e) {
                        debug.error('failed to initialize Web3 from ethereum after the page is fully loaded:', e);
                    }
                } else if (window.web3) {
                    try {
                        web3 = new Web3(window.web3.currentProvider);
                        debug.log('successfully initialized Web3 from web3.currentProvider after the page is fully loaded');
                        
                        // initialize the contracts
                        if (!nftLotteryManagerContract) {
                            initShopContracts();
                        }
                    } catch (e) {
                        debug.error('failed to initialize Web3 from web3.currentProvider after the page is fully loaded:', e);
                    }
                }
            }
            
            // if the PwFoodManager contract is not initialized but Web3 is available, try to initialize it again
            if (!pwFoodManagerContract && web3 && typeof window.initPwFoodManagerContract === 'function') {
                debug.log('trying to initialize the PwFoodManager contract again...');
                try {
                    const getContractAddressFunc = window.getContractAddress || function(name) {
                        const network = window.currentNetwork || 'LOCAL';
                        if (window.contractAddresses && window.contractAddresses[network]) {
                            return window.contractAddresses[network][name];
                        }
                        return null;
                    };
                    
                    pwFoodManagerContract = window.initPwFoodManagerContract(web3, getContractAddressFunc);
                    if (pwFoodManagerContract) {
                        debug.log('successfully initialized the PwFoodManager contract after the page is fully loaded');
                    } else {
                        debug.error('failed to initialize the PwFoodManager contract after the page is fully loaded');
                    }
                } catch (error) {
                    debug.error('failed to initialize the PwFoodManager contract after the page is fully loaded:', error);
                }
            }
            
            // if the NFTLotteryManager contract is not initialized but Web3 is available, try to initialize it again
            if (!nftLotteryManagerContract && web3 && typeof initNFTLotteryManagerContract === 'function') {
                debug.log('trying to initialize the NFTLotteryManager contract again...');
                try {
                    const getContractAddressFunc = window.getContractAddress || function(name) {
                        const network = window.currentNetwork || 'LOCAL';
                        if (window.contractAddresses && window.contractAddresses[network]) {
                            return window.contractAddresses[network][name];
                        }
                        return null;
                    };
                    
                    nftLotteryManagerContract = initNFTLotteryManagerContract(web3, getContractAddressFunc);
                    if (nftLotteryManagerContract) {
                        debug.log('successfully initialized the NFTLotteryManager contract after the page is fully loaded');
                        
                        // automatically check the claimable NFT status when the page is loaded
                        if (currentAddress) {
                            debug.log('automatically checking the claimable NFT status when the page is loaded');
                            checkClaimableEggsStatus();
                            checkFreeNFTClaimStatus();
                            checkFreePwFoodClaimStatus();
                            updateNFTRemaining();
                        }
                    } else {
                        debug.error('failed to initialize the NFTLotteryManager contract after the page is fully loaded');
                    }
                } catch (error) {
                    debug.error('failed to initialize the NFTLotteryManager contract after the page is fully loaded:', error);
                }
            } else if (nftLotteryManagerContract && currentAddress) {
                // if the NFTLotteryManager contract is initialized, but the claimable NFT status is not checked
                debug.log('automatically checking the claimable NFT status when the page is loaded');
                checkClaimableEggsStatus();
                checkFreeNFTClaimStatus();
                checkFreePwFoodClaimStatus();
                updateNFTRemaining();
            }
        });
        
        // request the Web3 instance and wallet address
        requestWalletData();
        
        // check again, ensure the contracts are initialized
        setTimeout(() => {
            if (!nftLotteryManagerContract) {
                debug.warn('2 seconds later, the NFTLotteryManager contract is not initialized, trying to force initialize');
                if (web3 && typeof initNFTLotteryManagerContract === 'function') {
                    initShopContracts();
                }
            }
            
            // add extra delay, ensure the claimable NFT status is checked after the contracts are initialized
            setTimeout(() => {
                if (nftLotteryManagerContract && currentAddress) {
                    debug.log('delay 3 seconds, automatically checking the claimable NFT status');
                    checkClaimableEggsStatus();
                    checkFreeNFTClaimStatus();
                    checkFreePwFoodClaimStatus();
                    updateNFTRemaining();
                }
            }, 3000);
        }, 2000);
        
        // listen the wallet connection status
        window.addEventListener('walletChanged', function(event) {
            if (event.detail) {
                currentAddress = event.detail.address;
                updateWalletUI(true, currentAddress);
                
                // when the wallet address changes, automatically check the claimable NFT status
                if (nftLotteryManagerContract) {
                    debug.log('when the wallet address changes, automatically checking the claimable NFT status');
                    checkClaimableEggsStatus();
                    checkFreeNFTClaimStatus();
                    checkFreePwFoodClaimStatus();
                    updateNFTRemaining();
                }
            } else {
                currentAddress = null;
                updateWalletUI(false);
            }
        });
        
        // localize the content
        localizeContent();
        
        // register the global showGameModeLotteryResult function, so it can be called by other scripts
        window.showGameModeLotteryResult = showGameModeLotteryResult;
        
        debug.log('the shop page is initialized');
        
        // initialize the batch purchase input boxes
        initBatchPurchaseInputs();
        
        // bind the refresh button click event
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshShop);
        }
        
        // update the NFT remaining quantity
        updateNFTRemaining();

        // initialize the language switch
        if (window.i18n) {
            window.i18n.init();
            localizeContent();
        }
    }
    
    /**
     * check the wallet connection status in the local storage
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            debug.log('from the local storage, restore the wallet connection status:', storedAddress);
            currentAddress = storedAddress;
            
            // if the wallet address is restored from the local storage, and the contracts are initialized, automatically check the claimable NFT status
            if (nftLotteryManagerContract) {
                debug.log('from the local storage, restore the wallet address, and automatically check the claimable NFT status');
                checkClaimableEggsStatus();
                checkFreeNFTClaimStatus();
                checkFreePwFoodClaimStatus();
            }
        }
    }
    
    /**
     * request the wallet data
     */
    function requestWalletData() {
        debug.log('request the wallet data');
        // request the Web3 instance and wallet address from the parent window
        window.parent.postMessage({
            type: 'requestData',
            pageType: 'shop',
            action: 'getWalletInfo'
        }, '*');
        
        // listen the messages from the parent window
        window.addEventListener('message', handleParentMessage);
    }
    
    /**
     * handle the messages from the parent window
     */
    function handleParentMessage(event) {
        debug.log('receive the message from the parent window:', event.data);
        
        // parse the message data
        let messageData = event.data;
        
        // if the message is a string, try to parse it as JSON
        if (typeof messageData === 'string') {
            try {
                messageData = JSON.parse(messageData);
            } catch (e) {
                debug.error('failed to parse the message:', e);
                return;
            }
        }
        
        // handle different types of messages
        if (messageData.type === 'walletConnected') {
            debug.log('receive the wallet connection message');
            const walletData = messageData.data;
            
            // update the current address and network
            currentAddress = walletData.address;
            currentNetwork = walletData.network;
            
            // update the UI
            updateWalletUI(true, currentAddress);
            
            // check the free NFT claim status
            if (typeof checkFreeNFTClaimStatus === 'function') {
                checkFreeNFTClaimStatus();
            }
            
            // check the claimable NFT status
            if (typeof checkClaimableEggsStatus === 'function') {
                checkClaimableEggsStatus();
            }
            
            // if there is a tokenBalanceManager, update the token balance
            if (window.tokenBalanceManager) {
                window.tokenBalanceManager.updateAllBalances();
            } 
            // the shop page does not need to query the balance, remove the call to updateTokenBalances
            // else {
            //     updateTokenBalances();
            // }
        } else if (messageData.type === 'walletDisconnected') {
            debug.log('receive the wallet disconnected message');
            
            // clear the current wallet address
            currentAddress = null;
            
            // update the UI
            updateWalletUI(false);
        } else if (messageData.type === 'web3Ready') {
            debug.log('receive the web3 ready message');
            
            // initialize the web3 and contracts
            initContracts();
            
            // after the web3 is ready, if there is a wallet address, check the claimable NFT status
            if (currentAddress) {
                setTimeout(() => {
                    if (nftLotteryManagerContract) {
                        debug.log('after the web3 is ready, automatically check the claimable NFT status');
                        checkClaimableEggsStatus();
                        checkFreeNFTClaimStatus();
                        checkFreePwFoodClaimStatus();
                        updateNFTRemaining();
                    }
                }, 1000); // delay 1 second, ensure the contracts are initialized
            }
        }
    }
    
    /**
     * initialize the contracts
     */
    function initContracts() {
        try {
            debug.log('start to initialize the contracts...');
            
            // check the NFTLotteryManagerABI and the contract address
            if (typeof NFTLotteryManagerABI === 'undefined') {
                // try to get the NFTLotteryManagerABI from the window object
                if (typeof window.NFTLotteryManagerABI !== 'undefined') {
                    debug.log('get the NFTLotteryManagerABI from the window object');
                } else {
                    debug.error('cannot find the NFTLotteryManagerABI');
                    showStatus('cannot find the NFTLotteryManagerABI, cannot initialize the contracts', 'error');
                    return;
                }
            } else {
                debug.log('find the NFTLotteryManagerABI');
            }
            
            // check the contract address function
            if (typeof getContractAddress === 'undefined') {
                if (typeof window.getContractAddress !== 'undefined') {
                    debug.log('get the getContractAddress from the window object');
                } else {
                    debug.error('cannot find the getContractAddress function');
                    showStatus('cannot find the getContractAddress function, cannot initialize the contracts', 'error');
                    return;
                }
            } else {
                debug.log('find the getContractAddress function');
            }
            
            // get the contract address
            const nftLotteryManagerAddress = getContractAddress ? 
                getContractAddress('NFTLotteryManager') : 
                window.getContractAddress('NFTLotteryManager');
            
            const pwPointAddress = getContractAddress ? 
                getContractAddress('PwPoint') : 
                window.getContractAddress('PwPoint');
            
            const nftFeedingManagerAddress = getContractAddress ? 
                getContractAddress('NFTFeedingManager') : 
                window.getContractAddress('NFTFeedingManager');
            
            const paymentManagerAddress = getContractAddress ? 
                getContractAddress('PaymentManager') : 
                window.getContractAddress('PaymentManager');
                
            if (!nftLotteryManagerAddress) {
                debug.error('cannot get the NFTLotteryManager contract address');
                showStatus('cannot get the NFTLotteryManager contract address', 'error');
                return;
            }
            
            if (!pwPointAddress) {
                debug.error('cannot get the PwPoint contract address');
                showStatus('cannot get the PwPoint contract address', 'error');
                return;
            }
            
            if (!nftFeedingManagerAddress) {
                debug.error('cannot get the NFTFeedingManager contract address');
                showStatus('cannot get the NFTFeedingManager contract address', 'error');
                return;
            }
            
            debug.log('NFTLotteryManager contract address:', nftLotteryManagerAddress);
            debug.log('PwPoint contract address:', pwPointAddress);
            debug.log('NFTFeedingManager contract address:', nftFeedingManagerAddress);
            // create the contract instance
            const abi = typeof NFTLotteryManagerABI !== 'undefined' ? 
                NFTLotteryManagerABI : window.NFTLotteryManagerABI;
                
            debug.log('ABI length:', abi.length);
            
            nftLotteryManagerContract = new web3.eth.Contract(
                abi,
                nftLotteryManagerAddress
            );
            
            debug.log('the contracts are initialized successfully!');
            
            // verify the contract instance
            if (nftLotteryManagerContract && nftLotteryManagerContract.methods) {
                debug.log('the contracts are initialized successfully!');
                
                // initialize the shop contracts
                initShopContracts();
            } else {
                debug.error('the contract instance is created successfully, but the methods are not available');
                showStatus('the contract methods are not available', 'error');
            }
        } catch (error) {
            debug.error('initialize the contracts failed:', error);
            showStatus('initialize the contracts failed: ' + error.message, 'error');
        }
    }
    
    /**
     * update the token balance display
     */
    async function updateTokenBalances() {
        // check the balance container whether it exists, if it exists and is called by the refresh button, directly hide it
        const balanceContainer = document.getElementById('user-balance-container');
        if (balanceContainer) {
            balanceContainer.style.display = 'none';
        }
        
        if (!currentAddress) {
            // silent handle, do not show the error information
            debug.log('the address is not available, skip the token balance update');
            return;
        }
        
        try {
            debug.log('get the token balance...');
            
            // create or update the user balance display area
            let balanceContainer = document.getElementById('user-balance-container');
            
            if (!balanceContainer) {
                balanceContainer = document.createElement('div');
                balanceContainer.id = 'user-balance-container';
                balanceContainer.className = 'user-balance-container';
                
                // add to the top of the shop container
                const shopContainer = document.querySelector('.shop-container');
                if (shopContainer) {
                    const shopHeader = shopContainer.querySelector('.shop-header');
                    if (shopHeader) {
                        shopHeader.after(balanceContainer);
            } else {
                        shopContainer.prepend(balanceContainer);
                    }
                } else {
                    document.body.prepend(balanceContainer);
                }
            }
            
            // add the balance display styles
            addBalanceStyles();
            
        } catch (error) {
            debug.log('get the token balance failed:', error);
            // silent handle the error, do not show the error status
        }
    }
    
    /**
     * add the balance display styles
     */
    function addBalanceStyles() {
        // check whether the styles are already added
        if (document.getElementById('balance-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'balance-styles';
        style.textContent = `
            .user-balance-container {
                margin: 10px 0 20px;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .balance-title {
                font-weight: bold;
                margin-bottom: 5px;
                color: #333;
            }
            
            .balance-items {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .balance-item {
                display: flex;
                align-items: center;
                background-color: #fff;
                padding: 5px 10px;
                border-radius: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .token-icon {
                margin-right: 5px;
                font-weight: bold;
            }
            
            .token-amount {
                margin-right: 5px;
                font-weight: bold;
            }
            
            .token-symbol {
                color: #666;
            }
            
            .pwp-icon {
                color: gold;
            }
            
            .eth-icon {
                color: #627eea;
            }
        `;
        document.head.appendChild(style);
        
        // add the processing button status styles
        const processingButtonStyle = document.createElement('style');
        processingButtonStyle.textContent = `
            .buy-btn.processing {
                cursor: not-allowed;
                opacity: 0.7;
                position: relative;
            }
            
            .loading {
                display: inline-block;
                width: 12px;
                height: 12px;
                border: 2px solid rgba(255,255,255,.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
                margin-right: 6px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(processingButtonStyle);
    }
    
    /**
     * handle the buy button click
     */
    function handleBuyButtonClick(event) {
        const button = event.currentTarget;
        const shopItem = button.closest('.shop-item');
        
        if (!shopItem) return;
        
        const itemId = shopItem.getAttribute('data-id');
        const itemCategory = shopItem.getAttribute('data-category');
        
        if (!web3 || !currentAddress) {
            showStatus('please connect the wallet first to buy', 'error');
            return;
        }
        
        debug.log(`click the buy button: ${itemId}, category: ${itemCategory}`);
        
        switch (itemId) {
            case 'free-nft':
                claimFreeNFT();
                break;
            case 'claim-eggs':
                claimEggs();
                break;
            case 'free-pwfood':
                claimFreePwFood();
                break;
            case 'egg-common':
                buyCommonEgg();
                break;
            case 'egg-rare':
                buyRareEgg();
                break;
            case 'egg-legendary':
                buyLegendaryEgg();
                break;
            case 'pwfood':
                buyPwFood();
                break;
            default:
                debug.error(`unknown item ID: ${itemId}`);
                showStatus('unknown item', 'error');
        }
    }
    
    /**
     * open the payment confirmation page
     * @param {Object} paymentInfo - the payment information
     * @param {Function} confirmCallback - the confirm callback function
     */
    function openPaymentConfirmation(paymentInfo, confirmCallback) {
        debug.log('open the payment confirmation page, the payment information:', paymentInfo);
        
        try {
            // check whether the payment iframe exists
            let paymentFrame = document.getElementById('payment-frame');
            
            // if it does not exist, create one
            if (!paymentFrame) {
                // create the overlay
                const overlay = document.createElement('div');
                overlay.id = 'payment-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                overlay.style.zIndex = '9999';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                
                // create the iframe
                paymentFrame = document.createElement('iframe');
                paymentFrame.id = 'payment-frame';
                paymentFrame.src = '../../webPages/other/payment.html';
                paymentFrame.style.width = '450px';
                paymentFrame.style.height = '600px';
                paymentFrame.style.border = 'none';
                paymentFrame.style.borderRadius = '10px';
                paymentFrame.style.backgroundColor = '#fff';
                paymentFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                
                // add to the overlay
                overlay.appendChild(paymentFrame);
                
                // add to the document
                document.body.appendChild(overlay);
                
                // listen the messages from the payment iframe
                window.addEventListener('message', handlePaymentMessage);
            } else {
                // if it exists, show the overlay
                document.getElementById('payment-overlay').style.display = 'flex';
            }
            
            // set the current buy callback function
            window.currentBuyCallback = confirmCallback;
            
            // set the action after the iframe is loaded
            paymentFrame.onload = function() {
                // wait for the iframe is loaded, and send the payment information
                setTimeout(() => {
                    paymentFrame.contentWindow.postMessage({
                        type: 'paymentInfo',
                        data: paymentInfo
                    }, '*');
                    
                    // send the wallet information
                    paymentFrame.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: !!currentAddress,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // send the web3 instance
                    paymentFrame.contentWindow.postMessage({
                        type: 'web3Ready',
                        data: {
                            web3: true // web3 object cannot be passed directly, only send the signal to the iframe
                        }
                    }, '*');
                    
                    // try to pass the gameWeb3 reference (if possible)
                    try {
                        window.paymentWeb3 = web3; // store the web3 instance in the global variable
                        paymentFrame.contentWindow.gameWeb3 = web3; // try to set it directly
                        debug.log('try to share the web3 instance to the payment page');
                    } catch (error) {
                        debug.error('share the web3 instance failed:', error);
                    }
                }, 500);
            };
        } catch (error) {
            debug.error('open the payment confirmation page failed:', error);
            showStatus('open the payment confirmation page failed', 'error');
        }
    }
    
    /**
     * handle the messages from the payment page
     * @param {MessageEvent} event - the message event
     */
    function handlePaymentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('receive the message from the payment page:', message);
        
        switch (message.type) {
            case 'closePayment':
                // close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentStarted':
                // payment started
                showStatus('paymentProcessing', 'info');
                break;
                
            case 'paymentConfirmed':
                // payment confirmed, execute the buy callback
                if (typeof window.currentBuyCallback === 'function') {
                    debug.log('execute the buy callback function');
                    
                    // check whether the contract is still available, if not, try to reinitialize it
                    if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                        debug.warn('execute the callback before finding the contract is not initialized, try to reinitialize the contract');
                        
                        // try to reinitialize the contract
                        try {
                            initShopContracts();
                            
                            // check the contract status again
                            if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                                debug.error('cannot reinitialize the contract, the buy operation cannot continue');
                                showStatus('the contract initialization failed, please refresh the page and try again', 'error');
                                
                                // clear the callback after the execution
                                window.currentBuyCallback = null;
                                
                                // close the payment page
                                closePaymentFrame();
                                return;
                            }
                        } catch (error) {
                            debug.error('reinitialize the contract failed:', error);
                            showStatus('the contract initialization failed, please refresh the page and try again', 'error');
                            
                            // clear the callback after the execution
                            window.currentBuyCallback = null;
                            
                            // close the payment page
                            closePaymentFrame();
                            return;
                        }
                    }
                    
                    // execute the callback
                    window.currentBuyCallback();
                    
                    // clear the callback after the execution
                    window.currentBuyCallback = null;
                }
                
                // close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentCancelled':
                // payment cancelled
                debug.log('the user cancelled the payment');
                showStatus('paymentCancelled', 'info');
                
                // clear the callback
                window.currentBuyCallback = null;
                
                // close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentResult':
                // handle the payment result
                if (message.data && message.data.success) {
                    debug.log('the payment is successful:', message.data);
                    showStatus('purchaseSuccess', 'success');
                    
                    // handle the logic after the payment is successful
                    processPaymentSuccess(message.data);
                } else {
                    debug.error('the payment failed:', message.data && message.data.error);
                    showStatus('paymentFailed', 'error', { message: message.data && message.data.error || 'unknown error' });
                }
                
                // close the payment page
                closePaymentFrame();
                break;
                
            case 'requestData':
                // the payment page requests data
                if (message.data && message.data.action === 'getWalletInfo') {
                    const paymentFrame = document.getElementById('payment-frame');
                    if (paymentFrame) {
                        paymentFrame.contentWindow.postMessage({
                            type: 'walletInfo',
                            data: {
                                connected: currentAddress ? true : false,
                                address: currentAddress
                            }
                        }, '*');
                    }
                }
                break;
        }
    }
    
    /**
     * close the payment frame
     */
    function closePaymentFrame() {
        const overlay = document.getElementById('payment-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * handle the logic after the payment is successful
     * @param {Object} paymentData - the payment result data
     */
    async function processPaymentSuccess(paymentData) {
        try {
            debug.log('handle the logic after the payment is successful:', paymentData);
            
            // check whether there is a transaction hash
            if (paymentData.transactionHash) {
                showStatus('paymentProcessing', 'info');
                
                // wait for the transaction confirmation
                await waitForTransactionConfirmation(paymentData.transactionHash);
            }
            
            // check the lottery result
            await checkLotteryResult();
            
            // get the user wallet address
            const userAddress = localStorage.getItem('connectedWalletAddress');
            
            if (userAddress) {
                // force refresh the NFT
                showStatus('refreshing the NFT data...', 'info');
                
                try {
                    // if the petNFTService is available, use it to refresh the NFT
                    if (window.petNFTService && typeof window.petNFTService.refreshNFTs === 'function') {
                        debug.log('use the petNFTService.refreshNFTs to refresh the NFT data');
                        await window.petNFTService.refreshNFTs(userAddress, { 
                            forceUpdate: true,
                            skipIntervalCheck: true
                        });
                        showStatus('the NFT data is updated', 'success');
                    } else {
                        // send the message to the parent window to refresh the NFT
                        debug.log('send the message to the parent window to refresh the NFT');
                        window.parent.postMessage({
                            type: 'refreshNFT',
                            forceUpdate: true
                        }, '*');
                        showStatus('the request to refresh the NFT data is sent', 'info');
                    }
                } catch (error) {
                    debug.warn('error when refreshing the NFT data:', error);
                    // the error does not affect the normal process, continue to execute
                }
            }
        } catch (error) {
            debug.error('error when handling the logic after the payment is successful:', error);
            showStatus('error when handling the payment operation, please check the "my pets" page', 'warning');
        }
    }
    
    /**
     * wait for the transaction confirmation
     * @param {string} txHash - the transaction hash
     */
    async function waitForTransactionConfirmation(txHash) {
        try {
            debug.log('wait for the transaction confirmation:', txHash);
            
            // show the status of waiting for the confirmation
            showStatus('paymentProcessing', 'info');
            
            // poll the transaction receipt
            let receipt = null;
            let attempts = 0;
            const maxAttempts = 30; // wait for 30 times
            
            while (!receipt && attempts < maxAttempts) {
                attempts++;
                
                try {
                    // get the transaction receipt
                    receipt = await web3.eth.getTransactionReceipt(txHash);
                    
                    if (receipt) {
                        debug.log('the transaction is confirmed:', receipt);
                        
                        if (receipt.status) {
                            showStatus('purchaseSuccess', 'success');
                        } else {
                            showStatus('purchaseFailed', 'error');
                        }
                        
                        return receipt;
                    } else {
                        debug.log(`the transaction is not confirmed, waiting... (${attempts}/${maxAttempts})`);
                        showStatus('paymentProcessing', 'info', { attempts: attempts, maxAttempts: maxAttempts });
                        
                        // wait for 5 seconds and check again
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                } catch (error) {
                    debug.error('error when checking the transaction confirmation:', error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            
            if (!receipt) {
                showStatus('the transaction confirmation timeout, please check the status on the blockchain explorer', 'warning');
            }
            
            return receipt;
        } catch (error) {
            debug.error('error when waiting for the transaction confirmation:', error);
            showStatus('error when waiting for the transaction confirmation', 'error');
            throw error;
        }
    }
    
    /**
     * check the lottery result
     * @param {Object} data - the data object containing the requestId
     * @returns {Promise<void>}
     */
    async function checkLotteryResult() {
        try {
            debug.log("check the lottery result...");
            
            // get the requestId
            const requestId = localStorage.getItem('currentLotteryRequestId');
            const lotteryType = localStorage.getItem('currentLotteryType');
            
            if (!requestId) {
                debug.log("no lottery request ID found");
                return null;
            }
            
            if (!nftLotteryManagerContract) {
                debug.error("NFT lottery manager contract is not initialized, cannot get the lottery result");
                return null;
            }
            
            // query the request status
            debug.log(`query the request status, ID: ${requestId}`);
            const isRequestComplete = await nftLotteryManagerContract.methods.isRequestComplete(requestId).call();
            debug.log(`the request completion status: ${isRequestComplete}`);
            
            if (isRequestComplete) {
                // get the lottery result details
                const result = await getLotteryResultFromTransaction(web3, nftLotteryManagerContract, requestId);
                
                if (result) {
                    debug.log("successfully get the lottery result details:", result);
                    
                    // directly use showGameModeLotteryResult to display the result
                    showGameModeLotteryResult(result);
                    
                    // after the request is completed, clear the requestId from the localStorage
                    localStorage.removeItem('currentLotteryRequestId');
                    localStorage.removeItem('currentLotteryType');
                    
                    return result; // return the result for the caller
                }
            } else {
                debug.log("the lottery request is not completed, please try again later");
                return null;
            }
        } catch (error) {
            debug.error("error when checking the lottery result:", error);
            return null;
        }
    }

    /**
     * get the lottery result details from the transaction
     * @param {Object} web3 - the Web3 instance
     * @param {Object} contract - the NFTLotteryManager contract instance
     * @param {string} txHash - the transaction hash
     * @returns {Promise<Object|null>} the lottery result details
     */
    async function getLotteryResultFromTransaction(web3, contract, txHash) {
        try {
            debug.log(`get the lottery result, transaction hash: ${txHash}`);
            
            // get the transaction receipt
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            if (!receipt) {
                debug.error('failed to get the transaction receipt');
                return null;
            }
            
            // define the quality level mapping
            const qualityNames = {
                0: 'common',  // COMMON
                1: 'good',  // GOOD
                2: 'excellent',  // EXCELLENT
                3: 'rare',  // RARE
                4: 'legendary'   // LEGENDARY
            };
            
            // define the lottery type mapping
            const lotteryTypeNames = {
                'CommonEgg': 'common egg',
                'RareEgg': 'rare egg',
                'LegendaryEgg': 'legendary egg',
                'FreeNFT': 'free pet'
            };
            
            // parse the event logs
            const events = receipt.logs.map(log => {
                try {
                    return contract.options.jsonInterface.find(
                        abi => abi.type === 'event' && 
                        abi.signature === log.topics[0]
                    );
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
            
            // find the NFTLotteryResult event
            const lotteryResultEvent = events.find(e => e.name === 'NFTLotteryResult');
            if (lotteryResultEvent) {
                // find the NFTLotteryResult event in the logs
                for (const log of receipt.logs) {
                    if (log.topics[0] === lotteryResultEvent.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            lotteryResultEvent.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
            
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: parseInt(decodedLog.quality),
                            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'unknown',
                            nftId: decodedLog.nftId,
                            lotteryType: decodedLog.lotteryType,
                            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                        };
                        
                        debug.log('successfully parse the lottery result:', result);
                        return result;
                    }
                }
            }
            
            // find the FreeNFTClaimed event
            const freeNFTEvent = events.find(e => e.name === 'FreeNFTClaimed');
            if (freeNFTEvent) {
                // find the FreeNFTClaimed event in the logs
                for (const log of receipt.logs) {
                    if (log.topics[0] === freeNFTEvent.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            freeNFTEvent.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,    
                            quality: 0, // free NFT is always common (COMMON) quality
                            qualityName: qualityNames[0],
                            nftId: decodedLog.nftId,
                            lotteryType: 'FreeNFT',
                            lotteryTypeName: 'free pet'
                        };
                        
                        debug.log('successfully parse the free NFT claim result:', result);
                        return result;
                    }
                }
            }
            
            // if no related event is found, try to use the generic Transfer event
            const transferEvent = events.find(e => e.name === 'Transfer');
            if (transferEvent) {
                for (const log of receipt.logs) {
                    if (log.topics[0] === transferEvent.signature) {
                        try {
                            const decodedLog = web3.eth.abi.decodeLog(
                                transferEvent.inputs,
                                log.data,
                                log.topics.slice(1)
                            );
                            
                            // try to build the basic result object from the Transfer event
                            const result = {
                                user: decodedLog.to || currentAddress,
                                tokenId: decodedLog.tokenId,
                                quality: 0, // default to common quality, as the quality cannot be determined directly from the Transfer event
                                qualityName: qualityNames[0],
                                nftId: decodedLog.tokenId,
                                lotteryType: 'Unknown',
                                lotteryTypeName: 'unknown type'
                            };
                            
                            debug.log('successfully parse the basic result from the Transfer event:', result);
                            return result;
                        } catch (decodeError) {
                            debug.error('failed to parse the Transfer event:', decodeError);
                        }
                    }
                }
            }
            
            debug.warn('no related event is found in the transaction');
            return null;
        } catch (error) {
            debug.error('failed to get the lottery result details:', error);
            return null;
        }
    }
    
    /**
     * show the lottery result
     * @param {Object} requestStatus - the lottery result status
     */
    function showLotteryResult(requestStatus) {
        // check whether there is the lottery result data
        if (!requestStatus || !requestStatus.lottery) {
            showStatus('failed to show the lottery result: data is incomplete', 'warning');
            return;
        }
        
        // debug output
        console.log('lottery result:', requestStatus);
        
        const lotteryResultData = {
            user: requestStatus.lottery.user || currentAddress,
            tokenId: requestStatus.lottery.tokenId,
            quality: requestStatus.lottery.quality,
            qualityName: requestStatus.lottery.qualityName,
            nftId: requestStatus.lottery.nftId,
            lotteryType: requestStatus.lottery.lotteryType,
            lotteryTypeName: requestStatus.lottery.lotteryTypeName
        };
        
        // use the game mode popup to show the result, using the same way as the test button
        try {
            console.log('use the game mode popup to show the lottery result');
            const modal = showGameModeLotteryResult(lotteryResultData);
            console.log('the result of the lottery result popup:', modal);
        } catch (error) {
            console.error('failed to show the lottery result popup:', error);
            
            // downgrade processing: if the game mode popup fails, try the old iframe way
            try {
                // try to save the result to the localStorage
                localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryResultData));
                
                // check whether the iframe exists, if not, create it
                let lotteryResultFrame = document.getElementById('lottery-result-frame');
                
                if (!lotteryResultFrame) {
                    lotteryResultFrame = document.createElement('iframe');
                    lotteryResultFrame.id = 'lottery-result-frame';
                    lotteryResultFrame.style.position = 'fixed';
                    lotteryResultFrame.style.top = '0';
                    lotteryResultFrame.style.left = '0';
                    lotteryResultFrame.style.width = '100%';
                    lotteryResultFrame.style.height = '100%';
                    lotteryResultFrame.style.border = 'none';
                    lotteryResultFrame.style.zIndex = '10000';
                    lotteryResultFrame.src = '../../webPages/other/lotteryResult.html';
                    
                    // add it to the page
                    document.body.appendChild(lotteryResultFrame);
                    
                    // listen to the iframe loading completion
                    lotteryResultFrame.onload = function() {
                        // send the result data to the iframe
                        setTimeout(() => {
                            sendLotteryResultToIframe(lotteryResultData);
                        }, 500); // delay sending, ensure the iframe internal script has been initialized
                    };
                } else {
                    // the iframe already exists, just send the data
                    lotteryResultFrame.style.display = 'block';
                    sendLotteryResultToIframe(lotteryResultData);
                }
                
                // add the message listener, handle the message from the iframe
                window.addEventListener('message', function(event) {
                    if (event.data && event.data.type === 'lotteryResultClosed') {
                        // receive the close message, hide the iframe
                        if (lotteryResultFrame) {
                            lotteryResultFrame.style.display = 'none';
                        }
                    }
                });
            } catch (fallbackError) {
                console.error('failed to show the lottery result:', fallbackError);
                showStatus('failed to show the lottery result, please check the console for details', 'error');
                
                // final downgrade: directly show the basic information on the page
                debug.error('failed to create the lottery result popup:', error);
                showStatus('congratulations! you have got a ' + (lotteryResultData.qualityName || '') + ' quality pet', 'success');
                return null;
            }
        }
    }

    /**
     * send the lottery result data to the lottery result iframe
     * @param {Object} lotteryData - the lottery result data
     */
    function sendLotteryResultToIframe(lotteryData) {
        debug.log('prepare to send the lottery result data to the lottery result iframe:', lotteryData);
        
        try {
            // save it to the localStorage as a backup
            localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryData));
            
            // find the iframe
            const frame = document.getElementById('lottery-result-frame');
            if (!frame) {
                debug.error('failed to find the lottery result iframe');
                return;
            }
            
            // if there is a tokenId, get the pet details first and then send
            if (lotteryData.tokenId) {
                debug.log('there is a tokenId, try to get the pet details:', lotteryData.tokenId);
                
                // use the NFTManager contract to get the pet details
                fetchPetDetailsForLottery(lotteryData.tokenId)
                    .then(petData => {
                        // merge the pet details to the result data
                        if (petData) {
                            debug.log('successfully get the pet details:', petData);
                            if (petData.name) lotteryData.petName = petData.name;
                            if (petData.type) lotteryData.petType = petData.type;
                            if (petData.imageUrl) lotteryData.imageUrl = petData.imageUrl;
                            if (petData.quality) lotteryData.qualityDisplay = petData.quality;
                        }
                        
                        // update the localStorage backup
                        localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryData));
                        
                        // send the enhanced data to the iframe
                        sendDataToFrame(lotteryData);
                    })
                    .catch(error => {
                        debug.error('failed to get the pet details:', error);
                        // even if failed to get the pet details, send the original data
                        sendDataToFrame(lotteryData);
                    });
            } else {
                // no tokenId, just send the original data
                sendDataToFrame(lotteryData);
            }
        } catch (error) {
            debug.error('failed to send the lottery result data to the lottery result iframe:', error);
        }
        
        // auxiliary function: send the data to the iframe
        function sendDataToFrame(data) {
            const frame = document.getElementById('lottery-result-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({
                    type: 'lotteryResult',
                    data: data
                }, '*');
                debug.log('successfully send the lottery result data to the lottery result iframe');
            } else {
                debug.error('the lottery result iframe does not exist or cannot be accessed');
            }
        }
    }
    
    /**
     * handle the transaction status update
     */
    function handleTransactionStatus(status) {
        if (status.success) {
            showStatus(status.message || 'transactionSuccess', 'success');
        } else {
            // use the modal alert to show the important information of the failed transaction
            showModalAlert('transactionFailed', status.message || 'transactionExecutionFailed', 'error');
        }
    }
    
    /**
     * Show status message with translation support
     * @param {string} message - Message key or direct message
     * @param {string} type - Message type (info, success, error, warning)
     * @param {object} params - Parameters for translation
     */
    function showStatus(message, type = 'info', params = {}) {
        // Get status element
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;
        
        // Try to translate the message from shop.notification namespace if it looks like a key
        let displayMessage = message;
        if (window.i18n && typeof window.i18n.t === 'function') {
            // Check if this might be a translation key
            if (message.match(/^[a-zA-Z0-9_\.]+$/) && !message.includes(' ')) {
                // Try to get the translation from shop.notification namespace
                const translationKey = `shop.notification.${message}`;
                const translated = window.i18n.t(translationKey, params);
                
                // Only use translation if it's different from the key (meaning translation exists)
                if (translated !== translationKey) {
                    displayMessage = translated;
                }
            }
        }
        
        // Set status message text
        statusElement.textContent = displayMessage;
        
        // Remove existing status classes
        statusElement.classList.remove('info', 'success', 'error', 'warning');
        
        // Add the appropriate status class
        statusElement.classList.add(type);
        
        // Make status visible
        statusElement.style.display = 'block';
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Update status text
     * @param {string} message - Status message or key
     * @param {object} params - Parameters for translation
     */
    function updateStatusText(message, params = {}) {
        // Simply call showStatus with info type
        showStatus(message, 'info', params);
    }

    /**
     * localize the content
     */
    function localizeContent() {
        // only execute when i18n is available
        if (!window.i18n) return;
        
        // update the page title
        document.title = i18n.t('shop.title') || 'shop - pet world';
        
        // update the text using the data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translation = i18n.t(key);
            
            // check whether there are parameters
            const argsAttr = el.getAttribute('data-i18n-args');
            if (argsAttr) {
                try {
                    const args = JSON.parse(argsAttr);
                    // handle the parameter replacement
                    Object.keys(args).forEach(argKey => {
                        translation = translation.replace(`{${argKey}}`, args[argKey]);
                    });
                } catch (e) {
                    console.error('failed to parse the data-i18n-args:', e);
                }
            }
            
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
    }
    
    /**
     * buy the common egg
     */
    async function buyCommonEgg() {
        try {
            // check whether the contract is initialized
            if (!nftLotteryManagerContract) {
                debug.error('the contract is not initialized, cannot purchase');
                updateStatusText(i18n.t('shop.contractNotInitialized') || "the contract is not initialized, please refresh the page and try again");
                return;
            }
            
            // check whether the wallet is connected
            if (!currentAddress) {
                debug.error('the wallet is not connected, cannot purchase');
                updateStatusText(i18n.t('shop.walletNotConnected') || "please connect the wallet first");
                showModalAlert('need to connect the wallet', i18n.t('shop.connectWalletFirst') || "please connect the wallet first and then purchase", 'error');
                return;
            }
            
            // get the purchase quantity
            const batchCount = getBatchAmount('common');
            const unitPrice = 9.9;
            const totalPrice = (unitPrice * batchCount).toFixed(2);
            
            const paymentInfo = {
                itemType: "egg", 
                itemName: batchCount > 1 ? 
                    `${i18n.t('shop.commonEgg') || "common egg"} x${batchCount}` : 
                    i18n.t('shop.commonEgg') || "common egg",
                itemPrice: `$${totalPrice}`, 
                itemImage: "../../resources/images/items/egg-common.png",
                contractFunction: batchCount > 1 ? "batchOpenCommonEgg" : "openCommonEgg",
                batchCount: batchCount
            };
            
            // open the payment confirmation popup
            openPaymentConfirmation(paymentInfo, async () => {
                // check whether the contract exists
                if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                    debug.error('the contract instance does not exist or is incomplete, cannot execute the purchase');
                    showStatus('the contract is not correctly initialized, please refresh the page and try again', 'error');
                    return;
                }
                
                updateStatusText(i18n.t('shop.buyingCommonEgg') || "buying common egg...");
                debug.log("buying common egg...");
                
                // get the USDT token address
                let tokenAddress = '';
                if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                    const usdt = window.SUPPORTED_PAYMENT_TOKENS.find(token => token.id === 'USDT');
                    if (usdt) {
                        tokenAddress = usdt.contractAddress;
                    }
                }
                
                // if cannot get the token address from the SUPPORTED_PAYMENT_TOKENS, use the hardcoded backup address
                if (!tokenAddress) {
                    debug.log('cannot get the token address from the SUPPORTED_PAYMENT_TOKENS, use the backup address');
                    tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // backup USDT address
                }
                
                // check whether the address is valid
                if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
                    debug.error('cannot find the valid USDT token address');
                    updateStatusText(i18n.t('shop.buyCommonEggFailed') || "buy common egg failed: cannot find the payment token");
                    return;
                }
                
                try {
                    // get and check the token balance
                    const formattedBalance = await getTokenBalance(tokenAddress);
                    const requiredAmount = "10"; // common egg needs 10 tokens
                    
                    // if there is a decimal point, compare the values
                    if (parseFloat(formattedBalance) < parseFloat(requiredAmount)) {
                        debug.error(`token balance is insufficient: need ${requiredAmount} USDT, but you only have ${formattedBalance} USD`);
                        // use the modal dialog to show the insufficient balance information
                        showModalAlert('insufficient balance', `your token balance is insufficient: need ${requiredAmount} USDT, but you only have ${formattedBalance} USD`, 'error');
                        return;
                    }
                    
                    debug.log(`token balance check passed: ${formattedBalance} USD (need: ${requiredAmount} USD)`);
                    
                    // query the NFT lottery manager contract address
                    const spenderAddress = nftLotteryManagerContract._address;
                    if (!spenderAddress) {
                        debug.error('cannot get the NFT lottery manager contract address');
                        updateStatusText('the contract address cannot be obtained, please refresh the page and try again');
                        return;
                    }
                    
                    // authorize the token usage (the price of the common egg is 9.9 USD)
                    debug.log('authorizing the token usage...');
                    try {
                        // calculate the amount to be authorized based on the batch count
                        const unitPrice = 10; // authorize 10 (enough to pay for the unit price of 9.9 USD)
                        const totalRequiredAmount = unitPrice * batchCount;
                        const approvalAmount = web3.utils.toWei(totalRequiredAmount.toString(), 'ether');
                        
                        debug.log(`need to authorize: ${totalRequiredAmount} (${batchCount} common eggs)`);
                        
                        const isApproved = await approveTokenIfNeeded(tokenAddress, spenderAddress, approvalAmount);
                        
                        if (!isApproved) {
                            debug.error('token authorization failed, cannot continue to purchase');
                            updateStatusText("token authorization failed, please try again");
                            return;
                        }
                        
                        debug.log('token authorization passed');
                        
                        // after the authorization, wait for a while to ensure the blockchain network has processed the authorization transaction
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // check and set the authorization for the PaymentManager contract
                        debug.log('checking the PaymentManager contract authorization...');
                        if (typeof window.setupRequiredApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    let allApproved = false;
                                    // first try to use window.setupRequiredApprovals
                                    allApproved = await window.setupRequiredApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    // if failed, try to use ContractApprovalManager
                                    if (!allApproved && window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                                        debug.log('try to use ContractApprovalManager.setupEggApprovals to retry the authorization...');
                                        allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            approvalAmount
                                        );
                                    }
                                    
                                    if (!allApproved) {
                                        debug.warn('the PaymentManager contract authorization is not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations have been completed');
                                    }
                                    
                                    // wait again to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('failed to set the other contract authorization:', setupError);
                                debug.warn('will continue to purchase the eggs, even if the authorization may be incomplete');
                            }
                        } else if (window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    debug.log('try to use ContractApprovalManager.setupEggApprovals to authorize...');
                                    const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    if (!allApproved) {
                                        debug.warn('the PaymentManager contract authorization is not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations have been completed');
                                    }
                                    
                                    // wait again to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('failed to set the other contract authorization:', setupError);
                                debug.warn('will continue to purchase the eggs, even if the authorization may be incomplete');
                            }
                        } else {
                            debug.warn('setupRequiredApprovals function and ContractApprovalManager are not available, skip the PaymentManager authorization');
                        }
                        
                    } catch (approvalError) {
                        debug.error('token authorization failed:', approvalError);
                        updateStatusText(i18n.t('shop.tokenApprovalFailed') || "token authorization failed, cannot purchase");
                        return;
                    }
                    
                    debug.log(`using the token address to purchase: ${tokenAddress}`);
                    try {
                        // print more parameter information for easier checking
                        debug.log(`token address: ${tokenAddress}`);
                        debug.log(`consumer address: ${nftLotteryManagerContract._address}`);
                        debug.log(`calling method: openCommonEgg`);
                        debug.log(`user address: ${currentAddress}`);
                        
                        // ensure the token address format is correct, remove any possible spaces
                        const cleanTokenAddress = tokenAddress.trim();
                        if (!web3.utils.isAddress(cleanTokenAddress)) {
                            debug.error(`token address format is incorrect: ${cleanTokenAddress}`);
                            updateStatusText("token address format is incorrect, please contact the administrator");
                            return;
                        }
                        
                        // check the contract instance
                        if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                            debug.error('NFT lottery manager contract instance is invalid');
                            updateStatusText("contract instance is invalid, please refresh the page and try again");
                            return;
                        }
                        
                        // check whether the openCommonEgg method exists
                        if (!nftLotteryManagerContract.methods.openCommonEgg) {
                            debug.error('cannot find the openCommonEgg method');
                            updateStatusText("contract method is not available, please refresh the page and try again");
                            return;
                        }
                        
                        debug.log(`preparing to send the transaction...`);
                        
                        // add a brief delay to ensure the authorization transaction has been processed
                        debug.log('adding a delay to wait for the authorization transaction confirmation...');
                        await wait(5000); // wait for 5 seconds
                        
                        // in the BSC network, let the network automatically handle the gas setting
                        if (batchCount > 1) {
                            // batch purchase
                            debug.log(`batch purchasing ${batchCount} common eggs...`);
                            updateStatusText(`batch purchasing ${batchCount} common eggs...`);
                            
                            const result = await nftLotteryManagerContract.methods.batchOpenCommonEgg(cleanTokenAddress, batchCount).send({
                                from: currentAddress,
                                gas: 1000000 + (batchCount * 500000) // base gas + additional gas per egg
                            });
                            
                            debug.log(`batch purchase ${batchCount} common eggs result:`, result);
                            updateStatusText(`batch purchase ${batchCount} common eggs successfully!`);
                            
                            // try to get the batch lottery results
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the batch lottery results...');
                                    
                                    // get the batch lottery results
                                    const lotteryResults = await getLotteryBatchResultsFromTransaction(web3, nftLotteryManagerContract, txHash, batchCount);
                                    
                                    if (lotteryResults && lotteryResults.length > 0) {
                                        // show the batch lottery results
                                        handleLotteryBatchResults(lotteryResults);
                                    } else {
                                        debug.warn('cannot get the batch lottery results');
                                        updateStatusText('purchase successful! please check your collection for the new pet');
                                    }
                                } catch (resultError) {
                                    debug.error('cannot get the lottery results:', resultError);
                                    updateStatusText('purchase successful! please check your collection for the new pet');
                                }
                            }
                        } else {
                            // single purchase
                            const result = await nftLotteryManagerContract.methods.openCommonEgg(cleanTokenAddress).send({
                                from: currentAddress
                            });
                        
                            debug.log("purchase common egg result:", result);
                            updateStatusText(i18n.t('shop.buyCommonEggSuccess') || "purchase common egg successfully!");
                            
                            // after successfully purchasing using the traditional method, try to get and display the lottery results
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the lottery results...');
                                    
                                    // get the lottery results
                                    const lotteryResult = await getLotteryResultFromTransaction(
                                        web3, 
                                        nftLotteryManagerContract, 
                                        txHash
                                    );
                                    
                                    if (lotteryResult) {
                                        console.log('successfully get the lottery results, preparing to show the popup:', lotteryResult);
                                        
                                        // use the game mode popup to show the lottery results
                                        try {
                                            const modal = showGameModeLotteryResult(lotteryResult);
                                            console.log('lottery result popup created:', modal);
                                            
                                            // check whether the popup element exists in the DOM
                                            setTimeout(() => {
                                                const overlay = document.getElementById('lottery-result-overlay');
                                                console.log('popup element exists:', !!overlay);
                                                if (overlay) {
                                                    console.log('popup element styles:', {
                                                        display: overlay.style.display,
                                                        zIndex: overlay.style.zIndex,
                                                        position: overlay.style.position
                                                    });
                                                }
                                            }, 100);
                                        } catch (error) {
                                            console.error('error when showing the lottery result popup:', error);
                                        }
                                    } else {
                                        debug.warn('cannot get the lottery results from the transaction');
                                        // save the transaction information for later query
                                        localStorage.setItem('currentLotteryRequestId', txHash);
                                        localStorage.setItem('currentLotteryType', 'CommonEgg');
                                        // set a timer task to check the lottery results
                                        setTimeout(checkLotteryResult, 5000);
                                    }
                                } catch (resultError) {
                                    debug.error('cannot get the lottery results:', resultError);
                                }
                            }
                        }
                    } catch (txError) {
                        // handle specific transaction errors
                        debug.error("purchase common egg transaction detailed error:", txError);
                        
                        // check the error message
                        const errorMsg = txError.message || "";
                        
                        if (errorMsg.includes("Token allowance too low")) {
                            debug.error("token allowance is insufficient, need to re-authorize");
                            updateStatusText("purchase failed: token allowance is insufficient, please re-click to purchase and authorize");
                            
                            // try to re-authorize, using a larger amount
                            try {
                                // clear the previous authorization record, force to re-authorize
                                await approveTokenIfNeeded(tokenAddress, spenderAddress, web3.utils.toWei('1000000', 'ether'));
                                debug.log('re-authorized, please try to purchase again');
                                updateStatusText("re-authorized, please try to purchase again");
                            } catch (reapproveError) {
                                debug.error("re-authorization failed:", reapproveError);
                                updateStatusText("re-authorization failed, please try again later");
                            }
                        } else if (errorMsg.includes("insufficient funds")) {
                            debug.error("wallet ETH balance is insufficient, cannot pay for the gas fee");
                            updateStatusText("purchase failed: wallet ETH balance is insufficient, cannot pay for the gas fee");
                        } else if (errorMsg.includes("out of gas")) {
                            debug.error("transaction gas is insufficient");
                            updateStatusText("purchase failed: transaction gas is insufficient, please increase the gas limit");
                        } else if (errorMsg.includes("Insufficient balance")) {
                            debug.error("token balance is insufficient");
                            updateStatusText("purchase failed: token balance is insufficient, please ensure you have enough USDT tokens");
                        } else if (errorMsg.includes("Transaction has been reverted by the EVM")) {
                            // 检查是否包含更详细的错误信息
                            if (txError.data) {
                                debug.error("EVM error data:", txError.data);
                            }
                            
                            debug.error("transaction has been reverted by the EVM, possibly due to insufficient token balance or incorrect authorization");
                            updateStatusText("purchase failed: transaction has been reverted by the EVM, please check the token balance and authorization");
                            
                            // try to get more error information
                            if (web3 && txError.transactionHash) {
                                try {
                                    debug.log("getting the transaction traceback information:", txError.transactionHash);
                                    web3.eth.getTransaction(txError.transactionHash)
                                        .then(tx => {
                                            debug.log("transaction details:", tx);
                                        })
                                        .catch(err => {
                                            debug.error("cannot get the transaction details:", err);
                                        });
                                } catch (err) {
                                    debug.error("cannot get the transaction information:", err);
                                }
                            }
                        } else {
                            debug.error("purchase common egg transaction failed:", txError);
                            updateStatusText(i18n.t('shop.buyCommonEggFailed') || "purchase common egg failed");
                        }
                    }
                } catch (err) {
                    debug.error("purchase common egg transaction failed:", err);
                    updateStatusText(i18n.t('shop.buyCommonEggFailed') || "purchase common egg failed");
                }
            });
        } catch (error) {
            debug.error("purchase common egg failed:", error);
            updateStatusText(i18n.t('shop.buyCommonEggFailed') || "purchase common egg failed");
        }
    }
    
    /**
     * buy rare egg
     */
    async function buyRareEgg() {
        try {
            // check whether the contract is initialized
            if (!nftLotteryManagerContract) {
                debug.error('contract is not initialized, cannot purchase');
                updateStatusText(i18n.t('shop.contractNotInitialized') || "contract is not initialized, please refresh the page and try again");
                return;
            }
            
            // check whether the wallet is connected
            if (!currentAddress) {
                debug.error('wallet is not connected, cannot purchase');
                updateStatusText(i18n.t('shop.walletNotConnected') || "please connect the wallet first");
                showStatus(i18n.t('shop.connectWalletFirst') || "please connect the wallet first", 'error');
                return;
            }
            
            // get the purchase quantity
            const batchCount = getBatchAmount('rare');
            const unitPrice = 99;
            const totalPrice = (unitPrice * batchCount).toFixed(2);
            
            const paymentInfo = {
                itemType: "egg", 
                itemName: batchCount > 1 ? 
                    `${i18n.t('shop.rareEgg') || "rare egg"} x${batchCount}` : 
                    i18n.t('shop.rareEgg') || "rare egg",
                itemPrice: `$${totalPrice}`, 
                itemImage: "../../resources/images/items/egg-rare.png",
                contractFunction: batchCount > 1 ? "batchOpenRareEgg" : "openRareEgg",
                batchCount: batchCount
            };
            
            // open the payment confirmation popup
            openPaymentConfirmation(paymentInfo, async () => {
                // check whether the contract exists and is initialized
                if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                    debug.error('contract instance does not exist or is incomplete, cannot execute the purchase');
                    showStatus('contract is not properly initialized, please refresh the page and try again', 'error');
                    return;
                }
                
                updateStatusText(i18n.t('shop.buyingRareEgg') || "buying rare egg...");
                debug.log("buying rare egg...");
                
                // get the USDT token address
                let tokenAddress = '';
                if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                    const usdt = window.SUPPORTED_PAYMENT_TOKENS.find(token => token.id === 'USDT');
                    if (usdt) {
                        tokenAddress = usdt.contractAddress;
                    }
                }
                
                // if cannot get the token address from SUPPORTED_PAYMENT_TOKENS, use the fallback address
                if (!tokenAddress) {
                    debug.log('cannot get the token address from SUPPORTED_PAYMENT_TOKENS, using the fallback address');
                    tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // fallback USDT address
                }
                
                // check whether the address is valid
                if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
                    debug.error('cannot find the valid USDT token address');
                    updateStatusText(i18n.t('shop.buyRareEggFailed') || "purchase rare egg failed: cannot find the payment token");
                    return;
                }
                
                try {
                    // get and check the token balance
                    const formattedBalance = await getTokenBalance(tokenAddress);
                    const requiredAmount = "100"; // rare egg requires 100 tokens
                    
                    // if there is a decimal point, compare the values
                    if (parseFloat(formattedBalance) < parseFloat(requiredAmount)) {
                        debug.error(`token balance is insufficient: need ${requiredAmount} USD, but only ${formattedBalance} USD`);
                        // use the modal dialog to show the insufficient balance information
                        showModalAlert('insufficient balance', `your token balance is insufficient: need ${requiredAmount} USDT, but you only have ${formattedBalance} USD`, 'error');
                        return;
                    }
                    
                    debug.log(`token balance check passed: ${formattedBalance} USDT (need: ${requiredAmount} USDT)`);
                    
                    // query the NFT lottery manager contract address
                    const spenderAddress = nftLotteryManagerContract._address;
                    if (!spenderAddress) {
                        debug.error('cannot get the NFT lottery manager contract address');
                        updateStatusText('failed to get the contract address, please refresh the page and try again');
                        return;
                    }
                    
                    // authorize the token usage (rare egg price is 99 USD)
                    debug.log('authorizing the token usage...');
                    try {
                        // calculate the amount to be authorized based on the batch count
                        const unitPrice = 100; // the authorization unit is 100 (enough to pay for the unit price of 99 USD)
                        const totalRequiredAmount = unitPrice * batchCount;
                        const approvalAmount = web3.utils.toWei(totalRequiredAmount.toString(), 'ether');
                        
                        debug.log(`need to authorize amount: ${totalRequiredAmount} (${batchCount} rare eggs)`);
                        
                        const isApproved = await approveTokenIfNeeded(tokenAddress, spenderAddress, approvalAmount);
                        
                        if (!isApproved) {
                            debug.error('token authorization failed, cannot continue to purchase');
                            updateStatusText("token authorization failed, please try again");
                            return;
                        }
                        
                        debug.log('token authorization successful');
                        
                        // wait for a while to ensure the blockchain network has processed the authorization transaction
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // check and set the authorization for the PaymentManager contract
                        debug.log('checking the PaymentManager contract authorization...');
                        if (typeof window.setupRequiredApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    let allApproved = false;
                                    // first try to use window.setupRequiredApprovals
                                    allApproved = await window.setupRequiredApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    // if failed, try to use ContractApprovalManager
                                    if (!allApproved && window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                                        debug.log('using ContractApprovalManager.setupEggApprovals to retry the authorization...');
                                        allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            approvalAmount
                                        );
                                    }
                                    
                                    if (!allApproved) {
                                        debug.warn('PaymentManager contract authorization not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations completed');
                                    }
                                    
                                    // wait for a while to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('error when setting up other contract authorizations:', setupError);
                                debug.warn('will continue to purchase eggs, even if the authorization may be incomplete');
                            }
                        } else if (window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    debug.log('using ContractApprovalManager.setupEggApprovals to authorize...');
                                    const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    if (!allApproved) {
                                        debug.warn('PaymentManager contract authorization not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations completed');
                                    }
                                    
                                    // wait for a while to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('error when setting up other contract authorizations:', setupError);
                                debug.warn('will continue to purchase eggs, even if the authorization may be incomplete');
                            }
                        } else {
                            debug.warn('setupRequiredApprovals function and ContractApprovalManager are not available, skip the PaymentManager authorization');
                        }
                        
                    } catch (approvalError) {
                        debug.error('token authorization failed:', approvalError);
                        updateStatusText(i18n.t('shop.tokenApprovalFailed') || "token authorization failed, cannot purchase");
                        return;
                    }
                    
                    debug.log(`using the token address to purchase: ${tokenAddress}`);
                    try {
                        // print more parameter information for easier checking
                        debug.log(`token address: ${tokenAddress}`);
                        debug.log(`consumer address: ${nftLotteryManagerContract._address}`);
                        debug.log(`calling method: openRareEgg`);
                        debug.log(`user address: ${currentAddress}`);
                        
                        // ensure the token address format is correct, remove any possible spaces
                        const cleanTokenAddress = tokenAddress.trim();
                        if (!web3.utils.isAddress(cleanTokenAddress)) {
                            debug.error(`token address format is incorrect: ${cleanTokenAddress}`);
                            updateStatusText("token address format is incorrect, please contact the administrator");
                            return;
                        }
                        
                        // check the contract instance
                        if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                            debug.error('NFT lottery manager contract instance is invalid');
                            updateStatusText("contract instance is invalid, please refresh the page and try again");
                            return;
                        }
                        
                        // check if the openRareEgg method exists
                        if (!nftLotteryManagerContract.methods.openRareEgg) {
                            debug.error('cannot find the openRareEgg method');
                            updateStatusText("contract method is not available, please refresh the page and try again");
                            return;
                        }
                        
                        debug.log(`preparing to send the transaction...`);
                        
                        // add a short delay to ensure the authorization transaction has been processed
                        debug.log('adding a short delay to ensure the authorization transaction has been processed...');
                        await wait(5000); // wait for 5 seconds
                        
                        // use the processLotteryTransaction function to handle the full lottery process
                        if (typeof window.processLotteryTransaction === 'function') {
                            try {
                                debug.log('using processLotteryTransaction to handle the full lottery process...');
                                updateStatusText('checking the authorization...');
                                
                                // check and set the contract authorization
                                let tokenContract;
                                if (window.tokenContracts && window.tokenContracts.USDT) {
                                    tokenContract = window.tokenContracts.USDT;
                                } else {
                                    // create a temporary token contract
                                    const erc20Abi = window.GENERIC_ERC20_ABI || [
                                        // minimal ERC20 ABI
                                        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
                                        {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},
                                        {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"type":"function"}
                                    ];
                                    tokenContract = new web3.eth.Contract(erc20Abi, cleanTokenAddress);
                                }
                                
                                // estimate the required authorization amount
                                const price = 100; // rare egg is 100, legendary egg is 600
                                const totalAmount = price * batchCount;
                                const amountInWei = web3.utils.toWei(totalAmount.toString(), 'ether');
                                
                                // check the authorization
                                let needsApproval = true;
                                
                                // if there is a ContractApprovalManager, use it to check the authorization
                                if (window.ContractApprovalManager && window.ContractApprovalManager.checkIfApprovalNeeded) {
                                    updateStatusText('checking the token authorization...');
                                    try {
                                        const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                            tokenContract,
                                            currentAddress,
                                            nftLotteryManagerContract._address,
                                            amountInWei
                                        );
                                        
                                        if (approvalStatus.needsApproval) {
                                            debug.log('need to authorize the token:', approvalStatus);
                                            updateStatusText('requesting the token authorization transfer...');
                                            
                                            // execute the authorization
                                            const approveResult = await window.ContractApprovalManager.approveERC20Token(
                                                tokenContract,
                                                nftLotteryManagerContract._address,
                                                amountInWei,
                                                currentAddress,
                                                true // use the maximum authorization amount
                                            );
                                            
                                            if (!approveResult.success) {
                                                throw new Error('token authorization failed: ' + (approveResult.error || 'unknown error'));
                                            }
                                            
                                            debug.log('token authorization successful');
                                        } else {
                                            debug.log('token has enough authorization');
                                        }
                                    } catch (error) {
                                        debug.error('error when checking the authorization or authorizing the token:', error);
                                        throw new Error('token authorization failed: ' + error.message);
                                    }
                                    
                                    // check and set the authorization for the NFTManager and related contracts
                                    if (window.ContractApprovalManager.setupEggApprovals) {
                                        updateStatusText('checking the NFTManager and related contract authorization...');
                                        try {
                                            const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                                web3, 
                                                currentAddress, 
                                                tokenContract,
                                                amountInWei
                                            );
                                            
                                            if (!allApproved) {
                                                throw new Error('other contract authorization failed, cannot purchase eggs');
                                            }
                                            
                                            debug.log('all necessary contract authorizations completed');
                                        } catch (error) {
                                            debug.error('error when setting up the contract authorization:', error);
                                            throw new Error('setting up the contract authorization failed: ' + error.message);
                                        }
                                    } else if (typeof window.setupRequiredApprovals === 'function') {
                                        // use the old method as a fallback
                                        const allApproved = await window.setupRequiredApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            amountInWei
                                        );
                                        
                                        if (!allApproved) {
                                            throw new Error('other contract authorization failed, cannot purchase eggs');
                                        }
                                    } else {
                                        debug.warn('authorization setup function is not available, skip the NFTManager and related contract authorization');
                                    }
                                } else if (typeof approveTokenIfNeeded === 'function') {
                                    // use the own authorization function
                                    updateStatusText('checking the token authorization...');
                                    const isApproved = await approveTokenIfNeeded(
                                        cleanTokenAddress, 
                                        nftLotteryManagerContract._address, 
                                        amountInWei
                                    );
                                    
                                    if (!isApproved) {
                                        throw new Error('token authorization failed, cannot continue to purchase');
                                    }
                                    
                                    debug.log('token authorization successful');
                                }
                                
                                // wait a while after the authorization is successful, to ensure the blockchain network has processed the authorization transaction
                                updateStatusText('waiting for the authorization confirmation...');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                
                                // process the lottery process
                                updateStatusText('executing the purchase transaction...');
                                
                                // process the lottery process
                                const lotteryResult = await window.processLotteryTransaction(
                                    web3,
                                    nftLotteryManagerContract,
                                    'rare',
                                    cleanTokenAddress,
                                    'status-message',
                                    null, // set to null, to avoid using the container
                                    {
                                        txOptions: { from: currentAddress },
                                        useModal: true, // add the flag, to indicate using the modal instead of the container
                                        batchCount: batchCount
                                    }
                                ).catch(error => {
                                    debug.error('processLotteryTransaction failed:', error);
                                    throw error;
                                });
                                
                                if (lotteryResult) {
                                    debug.log('lottery successful, result:', lotteryResult);
                                    updateStatusText(`please wait for 1 minute and then claim your new pet in the "claim unclaimed pets" module`);
                                } else {
                                    debug.warn('lottery completed, but no result information obtained');
                                    updateStatusText('purchase successful! please check your collection for your new pet');
                                }
                                
                                return; // successfully completed, return directly
                            } catch (processError) {
                                debug.error('processLotteryTransaction failed:', processError);
                                updateStatusText('purchase failed, please check the detailed information');
                                // show more detailed error information
                                showStatus(`lottery processing failed: ${processError.message || 'unknown error'}`, 'error');
                                // if processLotteryTransaction fails, continue to use the original method to try
                            }
                        } else {
                            debug.warn('processLotteryTransaction function is not available, use the traditional method to purchase');
                        }
                        
                        // in the BSC network, let the network automatically handle the gas setting
                        if (batchCount > 1) {
                            // batch purchase
                            debug.log(`batch purchasing ${batchCount} rare eggs...`);
                            updateStatusText(`batch purchasing ${batchCount} rare eggs...`);
                            
                            const result = await nftLotteryManagerContract.methods.batchOpenRareEgg(cleanTokenAddress, batchCount).send({
                                from: currentAddress,
                                gas: 1000000 + (batchCount * 600000) // base gas + additional gas for each egg
                            });
                            
                            debug.log(`batch purchase ${batchCount} rare eggs result:`, result);
                            updateStatusText(`batch purchase ${batchCount} rare eggs successful!`);
                            
                            // show the claim reminder
                            showEggClaimReminder(`rare egg x${batchCount}`);
                            
                            // try to get the batch lottery result
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the batch lottery result...');
                                    
                                    // get the batch lottery result
                                    const lotteryResults = await getLotteryBatchResultsFromTransaction(web3, nftLotteryManagerContract, txHash, batchCount);
                                    
                                    if (lotteryResults && lotteryResults.length > 0) {
                                        // show the batch lottery result
                                        handleLotteryBatchResults(lotteryResults);
                                    } else {
                                        debug.warn('cannot get the batch lottery result');
                                        updateStatusText('purchase successful! please check your collection for your new pet');
                                    }
                                } catch (resultError) {
                                    debug.error('error when getting the lottery result:', resultError);
                                    updateStatusText('purchase successful! please check your collection for your new pet');
                                }
                            }
                        } else {
                            // single purchase
                            const result = await nftLotteryManagerContract.methods.openRareEgg(cleanTokenAddress).send({
                                from: currentAddress
                            });
                        
                            debug.log("purchase rare egg result:", result);
                            updateStatusText(i18n.t('shop.buyRareEggSuccess') || "purchase rare egg successful!");
                            
                            // show the claim reminder
                            showEggClaimReminder('rare egg');
                            
                            // try to get and show the lottery result after successfully purchasing
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the lottery result...');
                                    
                                    // get the lottery result
                                    const lotteryResult = await getLotteryResultFromTransaction(
                                        web3, 
                                        nftLotteryManagerContract, 
                                        txHash
                                    );
                                    
                                    if (lotteryResult) {
                                        console.log('successfully get the lottery result, preparing to show the modal:', lotteryResult);
                                        
                                        // use the game mode modal to show the lottery result
                                        try {
                                            showGameModeLotteryResult(lotteryResult);
                                            console.log('rare egg lottery result modal created');
                                        } catch (error) {
                                            console.error('error when showing the rare egg lottery result modal:', error);
                                        }
                                    } else {
                                        debug.warn('cannot get the lottery result from the transaction');
                                        // save the transaction information for later query
                                        localStorage.setItem('currentLotteryRequestId', txHash);
                                        localStorage.setItem('currentLotteryType', 'RareEgg');
                                        // set a timer to check the lottery result
                                        setTimeout(checkLotteryResult, 5000);
                                    }
                                } catch (resultError) {
                                    debug.error('error when getting the lottery result:', resultError);
                                }
                            }
                        }
                    } catch (txError) {
                        // handle the specific transaction error
                        if (txError.message.includes("Token allowance too low")) {
                            debug.error("token allowance is not enough, need to re-authorize");
                            updateStatusText("purchase failed: token allowance is not enough, please re-click the purchase to authorize");
                            
                            // try to re-authorize
                            try {
                                // clear the previous authorization record, force to re-authorize
                                await approveTokenIfNeeded(tokenAddress, spenderAddress, web3.utils.toWei('1000000', 'ether'));
                                debug.log('re-authorized, please try to purchase again');
                                updateStatusText("re-authorized, please try to purchase again");
                            } catch (reapproveError) {
                                debug.error("error when re-authorizing:", reapproveError);
                                updateStatusText("error when re-authorizing, please try again later");
                            }
                        } else if (txError.message.includes("Transaction has been reverted by the EVM")) {
                            debug.error("transaction reverted by the EVM, maybe the token balance is not enough or not correctly authorized");
                            updateStatusText("purchase failed: transaction reverted by the EVM, please ensure you have enough USDT tokens");
                        } else {
                            debug.error("error when purchasing the rare egg:", txError);
                            updateStatusText(i18n.t('shop.buyRareEggFailed') || "purchase rare egg failed");
                        }
                    }
                } catch (err) {
                    debug.error("error when purchasing the rare egg:", err);
                    updateStatusText(i18n.t('shop.buyRareEggFailed') || "purchase rare egg failed");
                }
            });
        } catch (error) {
            debug.error("error when purchasing the rare egg:", error);
            updateStatusText(i18n.t('shop.buyRareEggFailed') || "purchase rare egg failed");
        }
    }
    
    /**
     * purchase the legendary egg
     */
    async function buyLegendaryEgg() {
        try {
            // check if the contract is initialized
            if (!nftLotteryManagerContract) {
                debug.error('contract not initialized, cannot purchase');
                updateStatusText(i18n.t('shop.contractNotInitialized') || "contract not initialized, please refresh the page and try again");
                return;
            }
            
            // check if the wallet is connected
            if (!currentAddress) {
                debug.error('wallet not connected, cannot purchase');
                updateStatusText(i18n.t('shop.walletNotConnected') || "please connect the wallet first");
                showStatus(i18n.t('shop.connectWalletFirst') || "please connect the wallet first", 'error');
                return;
            }
            
            // get the purchase quantity
            const batchCount = getBatchAmount('legendary');
            const unitPrice = 599;
            const totalPrice = (unitPrice * batchCount).toFixed(2);
            
            const paymentInfo = {
                itemType: "egg", 
                itemName: batchCount > 1 ? 
                    `${i18n.t('shop.legendaryEgg') || "legendary egg"} x${batchCount}` : 
                    i18n.t('shop.legendaryEgg') || "legendary egg",
                itemPrice: `$${totalPrice}`, 
                itemImage: "../../resources/images/items/egg-legendary.png",
                contractFunction: batchCount > 1 ? "batchOpenLegendaryEgg" : "openLegendaryEgg",
                batchCount: batchCount
            };
            
            // open the payment confirmation popup
            openPaymentConfirmation(paymentInfo, async () => {
                // check if the contract exists
                if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                    debug.error('contract instance does not exist or is incomplete, cannot execute the purchase');
                    showStatus('contract not correctly initialized, please refresh the page and try again', 'error');
                    return;
                }
                
                updateStatusText(i18n.t('shop.buyingLegendaryEgg') || "purchasing the legendary egg...");
                debug.log("purchasing the legendary egg...");
                
                // get the USDT token address
                let tokenAddress = '';
                if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                    const usdt = window.SUPPORTED_PAYMENT_TOKENS.find(token => token.id === 'USDT');
                    if (usdt) {
                        tokenAddress = usdt.contractAddress;
                    }
                }
                
                // if cannot get the token address from SUPPORTED_PAYMENT_TOKENS, use the backup address
                if (!tokenAddress) {
                    debug.log('cannot get the token address from SUPPORTED_PAYMENT_TOKENS, use the backup address');
                    tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // backup USDT address
                }
                
                // check if the address is valid
                if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
                    debug.error('cannot find the valid USDT token address');
                    updateStatusText(i18n.t('shop.buyLegendaryEggFailed') || "purchase legendary egg failed: cannot find the payment token");
                    return;
                }
                
                try {
                    // get and check the token balance
                    const formattedBalance = await getTokenBalance(tokenAddress);
                    const requiredAmount = (600 * batchCount).toString(); // legendary egg needs 600 tokens
                    
                    // if there is a decimal point, compare the values
                    if (parseFloat(formattedBalance) < parseFloat(requiredAmount)) {
                        debug.error(`token balance is not enough: need ${requiredAmount} USDT, but only ${formattedBalance} USD`);
                        // use the modal dialog to show the balance is not enough
                        showModalAlert('balance not enough', `your token balance is not enough: need ${requiredAmount} USD, but you only have ${formattedBalance} USD`, 'error');
                        return;
                    }
                    
                    debug.log(`token balance check passed: ${formattedBalance} USD (need: ${requiredAmount} USD)`);
                    
                    // get the NFT lottery manager contract address
                    const spenderAddress = nftLotteryManagerContract._address;
                    if (!spenderAddress) {
                        debug.error('cannot get the NFT lottery manager contract address');
                        updateStatusText('cannot get the contract address, please refresh the page and try again');
                        return;
                    }
                    
                    // authorize the token usage (legendary egg price is 599 USD)
                    debug.log('authorizing the token usage...');
                    try {
                        // calculate the amount to be authorized based on the batch count
                        const unitPrice = 600; // the authorization unit is 600 (enough to pay for the price of 599 USD)
                        const totalRequiredAmount = unitPrice * batchCount;
                        const approvalAmount = web3.utils.toWei(totalRequiredAmount.toString(), 'ether');
                        
                        debug.log(`need to authorize amount: ${totalRequiredAmount} (${batchCount} legendary eggs)`);
                        
                        const isApproved = await approveTokenIfNeeded(tokenAddress, spenderAddress, approvalAmount);
                        
                        if (!isApproved) {
                            debug.error('token authorization failed, cannot continue to purchase');
                            updateStatusText("token authorization failed, please try again");
                            return;
                        }
                        
                        debug.log('token authorization successful');
                        
                        // after the authorization is successful, wait for a while to ensure the blockchain network has processed the authorization transaction
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // check and set the authorization for the PaymentManager contract
                        debug.log('checking the PaymentManager contract authorization...');
                        if (typeof window.setupRequiredApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    let allApproved = false;
                                    // first try to use window.setupRequiredApprovals
                                    allApproved = await window.setupRequiredApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    // if failed, try to use ContractApprovalManager
                                    if (!allApproved && window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                                        debug.log('using ContractApprovalManager.setupEggApprovals to retry the authorization...');
                                        allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            approvalAmount
                                        );
                                    }
                                    
                                    if (!allApproved) {
                                        debug.warn('PaymentManager contract authorization not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations have been completed');
                                    }
                                    
                                    // wait again to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('error when setting up other contract authorizations:', setupError);
                                debug.warn('will continue to purchase the egg, even if the authorization may be incomplete');
                            }
                        } else if (window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                            try {
                                // get or create the ERC20 contract instance
                                let tokenContract;
                                const tokenId = Object.keys(tokenContracts).find(key => 
                                    tokenContracts[key] && tokenContracts[key]._address && 
                                    tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
                                );
                                
                                if (tokenId && tokenContracts[tokenId]) {
                                    tokenContract = tokenContracts[tokenId];
                                } else if (typeof initERC20Contract === 'function') {
                                    tokenContract = initERC20Contract(web3, tokenAddress);
                                } else if (window.GENERIC_ERC20_ABI) {
                                    tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
                                }
                                
                                if (tokenContract) {
                                    debug.log('using ContractApprovalManager.setupEggApprovals to authorize...');
                                    const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                        web3, 
                                        currentAddress, 
                                        tokenContract, 
                                        approvalAmount
                                    );
                                    
                                    if (!allApproved) {
                                        debug.warn('PaymentManager contract authorization not completed, but will continue to purchase');
                                    } else {
                                        debug.log('all necessary contract authorizations have been completed');
                                    }
                                    
                                    // wait again to ensure the authorization transaction has been processed
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else {
                                    debug.warn('cannot create the token contract instance, skip the PaymentManager authorization');
                                }
                            } catch (setupError) {
                                debug.error('error when setting up other contract authorizations:', setupError);
                                debug.warn('will continue to purchase the egg, even if the authorization may be incomplete');
                            }
                        } else {
                            debug.warn('setupRequiredApprovals function and ContractApprovalManager are not available, skip the PaymentManager authorization');
                        }
                        
                    } catch (approvalError) {
                        debug.error('token authorization failed:', approvalError);
                        updateStatusText(i18n.t('shop.tokenApprovalFailed') || "token authorization failed, cannot purchase");
                        return;
                    }
                    
                    debug.log(`using the token address to purchase: ${tokenAddress}`);
                    try {
                        // print more parameter information for easier checking
                        debug.log(`token address: ${tokenAddress}`);
                        debug.log(`consumer address: ${nftLotteryManagerContract._address}`);
                        debug.log(`calling method: openLegendaryEgg`);
                        debug.log(`user address: ${currentAddress}`);
                        
                        // ensure the token address format is correct, remove any possible spaces
                        const cleanTokenAddress = tokenAddress.trim();
                        if (!web3.utils.isAddress(cleanTokenAddress)) {
                            debug.error(`token address format is not correct: ${cleanTokenAddress}`);
                            updateStatusText("token address format is not correct, please contact the administrator");
                            return;
                        }
                        
                        // check the contract instance
                        if (!nftLotteryManagerContract || !nftLotteryManagerContract.methods) {
                            debug.error('NFT lottery manager contract instance is invalid');
                            updateStatusText("contract instance is invalid, please refresh the page and try again");
                            return;
                        }
                        
                        // check if the openLegendaryEgg method exists
                        if (!nftLotteryManagerContract.methods.openLegendaryEgg) {
                            debug.error('cannot find the openLegendaryEgg method');
                            updateStatusText("contract method is not available, please refresh the page and try again");
                            return;
                        }
                        
                        debug.log(`preparing to send the transaction...`);
                        
                        // add a brief delay to ensure the authorization transaction has been processed
                        debug.log('adding a delay to wait for the authorization transaction to be confirmed...');
                        await wait(5000); // wait for 5 seconds
                        
                        // use the processLotteryTransaction function to handle the complete lottery process
                        if (typeof window.processLotteryTransaction === 'function') {
                            try {
                                debug.log('using processLotteryTransaction to handle the lottery process...');
                                updateStatusText('checking the authorization...');
                                
                                // check and set the contract authorization
                                let tokenContract;
                                if (window.tokenContracts && window.tokenContracts.USDT) {
                                    tokenContract = window.tokenContracts.USDT;
                                } else {
                                    // create a temporary token contract
                                    const erc20Abi = window.GENERIC_ERC20_ABI || [
                                        // minimal ERC20 ABI
                                        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
                                        {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},
                                        {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"type":"function"}
                                    ];
                                    tokenContract = new web3.eth.Contract(erc20Abi, cleanTokenAddress);
                                }
                                
                                // estimate the required authorization amount
                                const price = 600; // legendary egg needs 600 tokens
                                const totalAmount = price * batchCount;
                                const amountInWei = web3.utils.toWei(totalAmount.toString(), 'ether');
                                
                                // check the authorization
                                let needsApproval = true;
                                
                                // if there is a ContractApprovalManager, use it to check the authorization
                                if (window.ContractApprovalManager && window.ContractApprovalManager.checkIfApprovalNeeded) {
                                    updateStatusText('checking the token authorization...');
                                    try {
                                        const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                            tokenContract,
                                            currentAddress,
                                            nftLotteryManagerContract._address,
                                            amountInWei
                                        );
                                        
                                        if (approvalStatus.needsApproval) {
                                            debug.log('needs token authorization:', approvalStatus);
                                            updateStatusText('requesting the token authorization...');
                                            
                                            // execute the authorization
                                            const approveResult = await window.ContractApprovalManager.approveERC20Token(
                                                tokenContract,
                                                nftLotteryManagerContract._address,
                                                amountInWei,
                                                currentAddress,
                                                true // use the maximum authorization amount
                                            );
                                            
                                            if (!approveResult.success) {
                                                throw new Error('token authorization failed: ' + (approveResult.error || 'unknown error'));
                                            }
                                            
                                            debug.log('token authorization successful');
                                        } else {
                                            debug.log('token has enough authorization');
                                        }
                                    } catch (error) {
                                        debug.error('error when checking the authorization or authorizing:', error);
                                        throw new Error('token authorization failed: ' + error.message);
                                    }
                                    
                                    // check and set the authorization for the NFTManager and other contracts
                                    if (window.ContractApprovalManager.setupEggApprovals) {
                                        updateStatusText('checking the NFTManager and related contracts authorization...');
                                        try {
                                            const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                                web3, 
                                                currentAddress, 
                                                tokenContract,
                                                amountInWei
                                            );
                                            
                                            if (!allApproved) {
                                                throw new Error('other contracts authorization failed, cannot purchase the egg');
                                            }
                                            
                                            debug.log('all necessary contract authorizations have been completed');
                                        } catch (error) {
                                            debug.error('error when setting up other contract authorizations:', error);
                                            throw new Error('setting up other contract authorizations failed: ' + error.message);
                                        }
                                    } else if (typeof window.setupRequiredApprovals === 'function') {
                                        // use the old method as a backup
                                        const allApproved = await window.setupRequiredApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            amountInWei
                                        );
                                        
                                        if (!allApproved) {
                                            throw new Error('other contracts authorization failed, cannot purchase the egg');
                                        }
                                    } else if (typeof setupRequiredApprovals === 'function') {
                                        // use the function in the current file
                                        const allApproved = await setupRequiredApprovals(
                                            web3, 
                                            currentAddress, 
                                            tokenContract, 
                                            amountInWei
                                        );
                                        
                                        if (!allApproved) {
                                            throw new Error('other contracts authorization failed, cannot purchase the egg');
                                        }
                                    } else {
                                        debug.warn('authorization setup function is not available, skip the NFTManager and other contracts authorization');
                                    }
                                } else if (typeof approveTokenIfNeeded === 'function') {
                                    // use the own authorization function
                                    updateStatusText('checking the token authorization...');
                                    const isApproved = await approveTokenIfNeeded(
                                        cleanTokenAddress, 
                                        nftLotteryManagerContract._address, 
                                        amountInWei
                                    );
                                    
                                    if (!isApproved) {
                                        throw new Error('token authorization failed, cannot continue to purchase');
                                    }
                                    
                                    debug.log('token authorization successful');
                                }
                                
                                // wait a while to ensure the authorization transaction has been processed
                                updateStatusText('waiting for the authorization transaction to be confirmed...');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                
                                // process the lottery process
                                updateStatusText('processing the purchase transaction...');
                                
                                // process the lottery process
                                const lotteryResult = await window.processLotteryTransaction(
                                    web3,
                                    nftLotteryManagerContract,
                                    'legendary',
                                    cleanTokenAddress,
                                    'status-message',
                                    null, // set to null, avoid using the container
                                    {
                                        txOptions: { from: currentAddress },
                                        useModal: true, // add the flag,表示使用弹窗而不是容器
                                        batchCount: batchCount
                                    }
                                ).catch(error => {
                                    debug.error('processLotteryTransaction failed:', error);
                                    throw error;
                                });
                                
                                if (lotteryResult) {
                                    debug.log('lottery successful, result:', lotteryResult);
                                    showModalAlert(`please wait for 1 minute and then claim your new pet in the "Claim Unclaimed Pets" module`);
                                } else {
                                    debug.warn('lottery completed, but no result information obtained');
                                    updateStatusText('purchase successful! please check your collection for your new pet');
                                }
                                
                                return; // successfully completed, return directly
                            } catch (processError) {
                                debug.error('lottery process failed:', processError);
                                updateStatusText('purchase process failed, please check the detailed information');
                                // show more detailed error information
                                showStatus(`lottery process failed: ${processError.message || 'unknown error'}`, 'error');
                                // if processLotteryTransaction fails, continue to use the original method to try
                            }
                        } else {
                            debug.warn('processLotteryTransaction function is not available, use the traditional method to purchase');
                        }
                        
                        // in the BSC network, let the network automatically handle the gas setting
                        if (batchCount > 1) {
                            // batch purchase
                            debug.log(`batch purchase ${batchCount} legendary eggs...`);
                            updateStatusText(`batch purchasing ${batchCount} legendary eggs...`);
                            
                            const result = await nftLotteryManagerContract.methods.batchOpenLegendaryEgg(cleanTokenAddress, batchCount).send({
                                from: currentAddress,
                                gas: 1000000 + (batchCount * 600000) // base gas + additional gas for each egg
                            });
                            
                            debug.log(`batch purchase ${batchCount} legendary eggs result:`, result);
                            updateStatusText(`batch purchase ${batchCount} legendary eggs successful!`);
                            
                            // show the claim reminder
                            showEggClaimReminder(`legendary eggs x${batchCount}`);
                            
                            // try to get the batch lottery results
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the batch lottery results...');
                                    
                                    // get the batch lottery results
                                    const lotteryResults = await getLotteryBatchResultsFromTransaction(web3, nftLotteryManagerContract, txHash, batchCount);
                                    
                                    if (lotteryResults && lotteryResults.length > 0) {
                                        // show the batch lottery results
                                        handleLotteryBatchResults(lotteryResults);
                                    } else {
                                        debug.warn('cannot get the batch lottery results');
                                        updateStatusText('purchase successful! please check your collection for your new pet');
                                    }
                                } catch (resultError) {
                                    debug.error('cannot get the lottery results:', resultError);
                                    updateStatusText('purchase successful! please check your collection for your new pet');
                                }
                            }
                        } else {
                            // single purchase
                            const result = await nftLotteryManagerContract.methods.openLegendaryEgg(cleanTokenAddress).send({
                                from: currentAddress
                            });
                        
                            debug.log("purchase legendary egg result:", result);
                            updateStatusText(i18n.t('shop.buyLegendaryEggSuccess') || "purchase legendary egg successful!");
                            
                            // show the claim reminder
                            showEggClaimReminder('legendary egg');
                            
                            // try to get and show the lottery results after successfully purchasing using the traditional method
                            if (result && result.transactionHash) {
                                try {
                                    const txHash = result.transactionHash;
                                    debug.log('transaction confirmed, trying to get the lottery results...');
                                    
                                    // get the lottery results
                                    const lotteryResult = await getLotteryResultFromTransaction(
                                        web3, 
                                        nftLotteryManagerContract, 
                                        txHash
                                    );
                                    
                                    if (lotteryResult) {
                                        console.log('successfully get the lottery results, preparing to show the modal:', lotteryResult);
                                        
                                        // show the lottery result using the game mode modal
                                        try {
                                            showGameModeLotteryResult(lotteryResult);
                                            console.log('legendary egg lottery result modal created');
                                        } catch (error) {
                                            console.error('error when showing the legendary egg lottery result modal:', error);
                                        }
                                    } else {
                                        debug.warn('cannot get the lottery results from the transaction');
                                        // save the transaction information for later query
                                        localStorage.setItem('currentLotteryRequestId', txHash);
                                        localStorage.setItem('currentLotteryType', 'LegendaryEgg');
                                        // set a timer to check the lottery results
                                        setTimeout(checkLotteryResult, 5000);
                                    }
                                } catch (resultError) {
                                    debug.error('cannot get the lottery results:', resultError);
                                }
                            }
                        }
                    } catch (txError) {
                        // handle the specific transaction errors
                        if (txError.message.includes("Token allowance too low")) {
                            debug.error("token allowance is too low, need to re-authorize");
                            updateStatusText("purchase failed: token allowance is too low, please re-click purchase to authorize");
                            
                            // try to re-authorize
                            try {
                                // clear the previous authorization record, force to re-authorize
                                await approveTokenIfNeeded(tokenAddress, spenderAddress, web3.utils.toWei('1000000', 'ether'));
                                debug.log('re-authorized, please re-click purchase');
                                updateStatusText("re-authorized, please re-click purchase");
                            } catch (reapproveError) {
                                debug.error("re-authorization failed:", reapproveError);
                                updateStatusText("re-authorization failed, please try again later");
                            }
                        } else if (txError.message.includes("Transaction has been reverted by the EVM")) {
                            debug.error("transaction reverted by the EVM, maybe the token balance is not enough or not correctly authorized");
                            updateStatusText("purchase failed: transaction reverted by the EVM, please ensure you have enough USDT");
                        } else {
                            debug.error("purchase legendary egg transaction failed:", txError);
                            updateStatusText(i18n.t('shop.buyLegendaryEggFailed') || "purchase legendary egg failed");
                        }
                    }
                } catch (err) {
                    debug.error("purchase legendary egg transaction failed:", err);
                    updateStatusText(i18n.t('shop.buyLegendaryEggFailed') || "purchase legendary egg failed");
                }
            });
        } catch (error) {
            debug.error("purchase legendary egg failed:", error);
            updateStatusText(i18n.t('shop.buyLegendaryEggFailed') || "purchase legendary egg failed");
        }
    }
    
    /**
     * load the contract initializer files
     */
    function loadContractInitializers() {
        debug.log('loading the contract initializer files...');
        
        // check if the files have been loaded
        if (
            typeof window.initNFTLotteryManagerContract !== 'undefined' &&
            typeof window.initNFTManagerContract !== 'undefined' &&
            typeof window.initPaymentManagerContract !== 'undefined' &&
            typeof window.initPwFoodManagerContract !== 'undefined' &&
            typeof window.initPwNFTContract !== 'undefined' &&
            typeof window.initERC20Contract !== 'undefined'
        ) {
            debug.log('the contract initializer files have been loaded');
            return;
        }
        
        // load the NFTLotteryManager contract class file
        const nftLotteryContractClassScript = document.createElement('script');
        nftLotteryContractClassScript.src = '../../scripts/contracts/NFTLotteryManager.js';
        nftLotteryContractClassScript.onload = function() {
            debug.log('NFTLotteryManager contract class file loaded successfully');
        };
        nftLotteryContractClassScript.onerror = function() {
            debug.error('failed to load the NFTLotteryManager contract class file');
        };
        document.head.appendChild(nftLotteryContractClassScript);
        
        // load the NFTLotteryManager initializer file
        const nftLotteryManagerScript = document.createElement('script');
        nftLotteryManagerScript.src = '../../scripts/init_contracts/initNFTLotteryManager.js';
        nftLotteryManagerScript.onload = function() {
            debug.log('NFTLotteryManager initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        nftLotteryManagerScript.onerror = function() {
            debug.error('failed to load the NFTLotteryManager initializer file');
        };
        
        // load the NFTManager initializer file
        const nftManagerScript = document.createElement('script');
        nftManagerScript.src = '../../scripts/init_contracts/initNFTManager.js';
        nftManagerScript.onload = function() {
            debug.log('NFTManager initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        nftManagerScript.onerror = function() {
            debug.error('failed to load the NFTManager initializer file');
        };
        
        // load the PaymentManager initializer file
        const paymentManagerScript = document.createElement('script');
        paymentManagerScript.src = '../../scripts/init_contracts/initPaymentManager.js';
        paymentManagerScript.onload = function() {
            debug.log('PaymentManager initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        paymentManagerScript.onerror = function() {
            debug.error('failed to load the PaymentManager initializer file');
        };
        
        // load the PwFoodManager initializer file
        const pwFoodManagerScript = document.createElement('script');
        pwFoodManagerScript.src = '../../scripts/init_contracts/initPwFoodManager.js';
        pwFoodManagerScript.onload = function() {
            debug.log('PwFoodManager initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        pwFoodManagerScript.onerror = function() {
            debug.error('failed to load the PwFoodManager initializer file');
        };
        
        // load the PwNFT initializer file
        const pwNFTScript = document.createElement('script');
        pwNFTScript.src = '../../scripts/init_contracts/initPwNFT.js';
        pwNFTScript.onload = function() {
            debug.log('PwNFT initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        pwNFTScript.onerror = function() {
            debug.error('failed to load the PwNFT initializer file');
        };
        
        // load the ERC20 initializer file
        const erc20Script = document.createElement('script');
        erc20Script.src = '../../scripts/init_contracts/initERC20.js';
        erc20Script.onload = function() {
            debug.log('ERC20 initializer file loaded successfully');
            if (web3 && currentAddress) {
                initShopContracts();
            }
        };
        erc20Script.onerror = function() {
            debug.error('failed to load the ERC20 initializer file');
        };
        
        // add to the document
        document.head.appendChild(nftLotteryManagerScript);
        document.head.appendChild(nftManagerScript);
        document.head.appendChild(paymentManagerScript);
        document.head.appendChild(pwFoodManagerScript);
        document.head.appendChild(pwNFTScript);
        document.head.appendChild(erc20Script);
    }
    
    /**
     * initialize the shop contracts
     */
    function initShopContracts() {
        console.log('initializing the shop contracts...');
        
        try {
            // first ensure that web3 is initialized
            if (!web3) {
                debug.error('Web3 is not initialized, trying to initialize...');
                
                if (window.ethereum) {
                    try {
                        debug.log('trying to initialize Web3 using window.ethereum');
                        web3 = new Web3(window.ethereum);
                        debug.log('Web3 initialized successfully using window.ethereum');
                    } catch (e) {
                        debug.error('failed to initialize Web3 using window.ethereum:', e);
                        return; // no Web3 available, continue
                    }
                } else if (window.web3) {
                    try {
                        debug.log('trying to initialize Web3 using window.web3');
                        web3 = new Web3(window.web3.currentProvider);
                        debug.log('Web3 initialized successfully using window.web3.currentProvider');
                    } catch (e) {
                        debug.error('failed to initialize Web3 using window.web3.currentProvider:', e);
                        return; // no Web3 available, continue
                    }
                } else {
                    debug.error('no available Web3 source found, cannot initialize the contracts');
                    return; // no Web3 available, continue
                }
            }
            
            // get the contract address function
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // if the contract instance has been initialized through initContracts, use it directly
            if (nftLotteryManagerContract && nftLotteryManagerContract.methods) {
                debug.log('using the existing NFTLotteryManager contract instance');
                
                // if the contract is initialized and has the current address, automatically check the claimable NFT status
                if (currentAddress) {
                    debug.log('contract initialized, automatically check the claimable NFT status');
                    checkClaimableEggsStatus();
                    checkFreeNFTClaimStatus();
                    checkFreePwFoodClaimStatus();
                    updateNFTRemaining();
                }
                
                return;
            }
            
            if (typeof initNFTLotteryManagerContract === 'function') {
                try {
                    // check the web3 status
                    if (!web3) {
                        debug.error('Web3 is not initialized, cannot create the NFTLotteryManager contract');
                        return;
                    }
                    
                    // check if the ABI exists
                    if (typeof window.NFTLotteryManagerABI === 'undefined' && typeof NFTLotteryManagerABI === 'undefined') {
                        debug.error('NFTLotteryManagerABI does not exist, cannot initialize the contract');
                        
                        // try to load the ABI dynamically
                        const abiScript = document.createElement('script');
                        abiScript.src = '../../scripts/contracts/ABI/NFTLotteryManagerABI.js';
                        abiScript.onload = function() {
                            debug.log('successfully loaded the NFTLotteryManagerABI, trying to initialize the contract again');
                            if (typeof window.NFTLotteryManagerABI !== 'undefined' || typeof NFTLotteryManagerABI !== 'undefined') {
                                initShopContracts();
                            }
                        };
                        abiScript.onerror = function() {
                            debug.error('failed to load the NFTLotteryManagerABI');
                        };
                        document.head.appendChild(abiScript);
                        return;
                    }
                    
                    debug.log('starting to initialize the NFTLotteryManager contract...');
                    
                    // use the same way as other contracts to initialize, pass the getContractAddress parameter
                    nftLotteryManagerContract = initNFTLotteryManagerContract(web3, getContractAddressFunc);
                    
                    if (nftLotteryManagerContract) {
                        debug.log('NFT lottery manager contract initialized successfully, address:', nftLotteryManagerContract._address);
                        
                        // check if the methods are available
                        if (nftLotteryManagerContract.methods) {
                            debug.log('NFT lottery manager contract methods are available');
                            
                            // check the claimable NFT status after the contract is initialized
                            if (currentAddress) {
                                debug.log('checking the claimable NFT status after the contract is initialized');
                                checkClaimableEggsStatus();
                                checkFreeNFTClaimStatus();
                                checkFreePwFoodClaimStatus();
                                updateNFTRemaining();
                            }
                        } else {
                            debug.error('NFT lottery manager contract methods are not available');
                        }
                    } else {
                        debug.error('NFT lottery manager contract initialization returned null');
                    }
                } catch (error) {
                    debug.error('failed to initialize the NFT lottery manager contract:', error);
                }
            } else {
                debug.error('cannot find the initNFTLotteryManagerContract function');
            }
            
            // initialize the NFTManager contract
            if (typeof initNFTManagerContract === 'function') {
                try {
                    nftManagerContract = initNFTManagerContract(web3, getContractAddressFunc);
                    debug.log('NFT manager contract initialized successfully');
                } catch (error) {
                    debug.error('failed to initialize the NFT manager contract:', error);
                }
            } else if (typeof window.initNFTManagerContract === 'function') {
                try {
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                    debug.log('NFT manager contract initialized successfully using the window object');
                } catch (error) {
                    debug.error('failed to initialize the NFT manager contract using the window object:', error);
                }
            } else {
                debug.error('cannot find the initNFTManagerContract function, please ensure initNFTManager.js is loaded correctly');
            }
            
            // initialize the PwNFT contract
            if (typeof initPwNFTContract === 'function') {
                try {
                    pwNFTContract = initPwNFTContract(web3, getContractAddressFunc);
                    debug.log('PwNFT contract initialized successfully');
                } catch (error) {
                    debug.error('failed to initialize the PwNFT contract:', error);
                }
            } else if (typeof window.initPwNFTContract === 'function') {
                try {
                    pwNFTContract = window.initPwNFTContract(web3, getContractAddressFunc);
                    debug.log('PwNFT contract initialized successfully using the window object');
                } catch (error) {
                    debug.error('failed to initialize the PwNFT contract using the window object:', error);
                }
            } else {
                debug.error('cannot find the initPwNFTContract function, please ensure initPwNFT.js is loaded correctly');
            }
            
            // initialize the PwFoodManager contract
            if (typeof initPwFoodManagerContract === 'function') {
                try {
                    // check if the PWFoodManagerABI exists
                    if (!window.PwFoodManagerABI) {
                        debug.error('PwFoodManagerABI does not exist, trying to load dynamically');
                        
                        // try to load the ABI dynamically
                        const abiScript = document.createElement('script');
                        abiScript.src = '../../scripts/contracts/ABI/PwFoodManagerABI.js';
                        abiScript.onload = function() {
                            debug.log('successfully loaded the PwFoodManagerABI, trying to initialize the contract again');
                            if (window.PwFoodManagerABI) {
                                try {
                                    pwFoodManagerContract = initPwFoodManagerContract(web3, getContractAddressFunc);
                                    if (pwFoodManagerContract) {
                                        debug.log('successfully loaded the PwFoodManagerABI, trying to initialize the contract again');
                                    } else {
                                        debug.error('failed to initialize the PwFoodManager contract using the loaded ABI');
                                    }
                                } catch (e) {
                                    debug.error('failed to initialize the PwFoodManager contract using the loaded ABI:', e);
                                }
                            }
                        };
                        abiScript.onerror = function() {
                            debug.error('failed to load the PwFoodManagerABI');
                        };
                        document.head.appendChild(abiScript);
                        return;
                    }
                    
                    debug.log('trying to initialize the PwFoodManager contract, parameters:', {
                        web3: !!web3,
                        getContractAddressFunc: !!getContractAddressFunc,
                        PwFoodManagerABI: !!window.PwFoodManagerABI
                    });
                    
                    pwFoodManagerContract = initPwFoodManagerContract(web3, getContractAddressFunc);
                    
                    if (pwFoodManagerContract) {
                        debug.log('PwFoodManager contract initialized successfully, address:', pwFoodManagerContract._address);
                    } else {
                        debug.error('PwFoodManager contract initialization returned null');
                        
                        // try to use the window.initPwFoodManagerContract
                        if (typeof window.initPwFoodManagerContract === 'function') {
                            debug.log('trying to use the window.initPwFoodManagerContract');
                            pwFoodManagerContract = window.initPwFoodManagerContract(web3, getContractAddressFunc);
                            
                            if (pwFoodManagerContract) {
                                debug.log('successfully initialized the PwFoodManager contract using the window object');
                            } else {
                                debug.error('failed to initialize the PwFoodManager contract using the window object');
                            }
                        }
                    }
                } catch (error) {
                    debug.error('failed to initialize the PwFoodManager contract:', error);
                }
            } else if (typeof window.initPwFoodManagerContract === 'function') {
                try {
                    debug.log('using the initPwFoodManagerContract from the window object');
                    pwFoodManagerContract = window.initPwFoodManagerContract(web3, getContractAddressFunc);
                    
                    if (pwFoodManagerContract) {
                        debug.log('successfully initialized the PwFoodManager contract using the window object');
                    } else {
                        debug.error('failed to initialize the PwFoodManager contract using the window object');
                    }
                } catch (error) {
                    debug.error('failed to initialize the PwFoodManager contract using the window object:', error);
                }
            } else {
                debug.error('cannot find the initPwFoodManagerContract function, please ensure initPwFoodManager.js is loaded correctly');
            }
            
            // initialize the PaymentManager contract
            if (typeof initPaymentManagerContract === 'function') {
                try {
                    paymentManagerContract = initPaymentManagerContract(web3, getContractAddressFunc);
                    debug.log('PaymentManager contract initialized successfully');
                    
                    // try to initialize the PaymentManagerContract class instance
                    if (typeof window.PaymentManagerContract === 'function') {
                        try {
                            debug.log('trying to initialize the PaymentManagerContract class instance...');
                            paymentManagerContractInstance = new window.PaymentManagerContract(web3);
                            if (paymentManagerContractInstance) {
                                debug.log('PaymentManagerContract class instance initialized successfully');
                            }
                        } catch (err) {
                            debug.error('failed to initialize the PaymentManagerContract class instance:', err);
                        }
                    }
                } catch (error) {
                    debug.error('failed to initialize the PaymentManager contract:', error);
                }
            } else if (typeof window.initPaymentManagerContract === 'function') {
                try {
                    paymentManagerContract = window.initPaymentManagerContract(web3, getContractAddressFunc);
                    debug.log('PaymentManager contract initialized successfully using the window object');
                    
                    // try to initialize the PaymentManagerContract class instance
                    if (typeof window.PaymentManagerContract === 'function') {
                        try {
                            debug.log('trying to initialize the PaymentManagerContract class instance...');
                            paymentManagerContractInstance = new window.PaymentManagerContract(web3);
                            if (paymentManagerContractInstance) {
                                debug.log('successfully initialized the PaymentManagerContract class instance using the window object');
                            }
                        } catch (err) {
                            debug.error('failed to initialize the PaymentManagerContract class instance using the window object:', err);
                        }
                    }
                } catch (error) {
                    debug.error('failed to initialize the PaymentManager contract using the window object:', error);
                }
            } else {
                debug.error('cannot find the initPaymentManagerContract function, please ensure initPaymentManager.js is loaded correctly');
            }
            
            // initialize the token contracts
            if (typeof initUSDTContract === 'function') {
                tokenContracts.USDT = initUSDTContract(web3, getContractAddressFunc);
                debug.log('USDT contract initialized successfully');
            }
            
            if (typeof initUSDCContract === 'function') {
                tokenContracts.USDC = initUSDCContract(web3, getContractAddressFunc);
                debug.log('USDC contract initialized successfully');
            }
            
            if (typeof initDAIContract === 'function') {
                tokenContracts.DAI = initDAIContract(web3, getContractAddressFunc);
                debug.log('DAI contract initialized successfully');
            }
            
            if (typeof initWETHContract === 'function') {
                tokenContracts.WETH = initWETHContract(web3, getContractAddressFunc);
                debug.log('WETH contract initialized successfully');
            }
            
            // set the shop UI
            setupShopUI();
            
        } catch (error) {
            debug.error('failed to initialize the shop contracts:', error);
        }
    }
    
    /**
     * set the shop UI
     */
    function setupShopUI() {
        debug.log('setting the shop UI...');
        
        // hide the balance container (if it exists)
        const balanceContainer = document.getElementById('user-balance-container');
        if (balanceContainer) {
            balanceContainer.style.display = 'none';
        }
        
        // bind the free NFT claim button
        const freeNftBtn = document.getElementById('claim-free-nft-btn');
        if (freeNftBtn) {
            freeNftBtn.addEventListener('click', claimFreeNFT);
        }
        
        // bind the common egg purchase button
        const commonEggBtn = document.querySelector('[data-id="egg-common"] .buy-btn');
        if (commonEggBtn) {
            commonEggBtn.addEventListener('click', buyCommonEgg);
        }
        
        // bind the rare egg purchase button
        const rareEggBtn = document.querySelector('[data-id="egg-rare"] .buy-btn');
        if (rareEggBtn) {
            rareEggBtn.addEventListener('click', buyRareEgg);
        }
        
        // bind the legendary egg purchase button
        const legendaryEggBtn = document.querySelector('[data-id="egg-legendary"] .buy-btn');
        if (legendaryEggBtn) {
            legendaryEggBtn.addEventListener('click', buyLegendaryEgg);
        }
        
        // bind the pet food purchase button
        const pwFoodBtn = document.querySelector('[data-id="pwfood"] .buy-btn');
        if (pwFoodBtn) {
            pwFoodBtn.addEventListener('click', buyPwFood);
        }
        
        // bind the refresh button click event
        const refreshBtn = document.getElementById('refresh-shop-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshShop);
        }
        
        // initialize the batch purchase inputs
        initBatchPurchaseInputs();
        
        // initialize the item prices
        updateItemPrices();
        
        // initialize the payment options
            setupPaymentOptions();
            
        // check the free NFT claim status
        if (web3 && currentAddress) {
            checkFreeNFTClaimStatus();
            
            // check if there are any claimable NFTs
            checkClaimableEggsStatus();
        }
    }
    
    /**
     * update the item prices
     */
    async function updateItemPrices() {
        debug.log('updating the item prices...');
        
        try {
            // use the hardcoded prices, no longer get from the contract
            const prices = {
                commonPrice: web3.utils.toWei('9.9', 'ether'),
                rarePrice: web3.utils.toWei('99', 'ether'),
                legendaryPrice: web3.utils.toWei('599', 'ether')
            };

            debug.log('using the hardcoded prices:', prices);
            
            // update the price display
            const shopItems = document.querySelectorAll('.shop-item');
            
            shopItems.forEach(item => {
                const itemId = item.getAttribute('data-id');
                const priceElement = item.querySelector('.item-price');
                
                if (!priceElement) return;
                
                let price;
                let tokenSymbol = 'USDT'; // default using USDT token
                
                switch (itemId) {
                    case 'free-nft':
                        // free NFT does not need to update the price
                        break;
                    case 'egg-common':
                        price = web3.utils.fromWei(prices.commonPrice, 'ether');
                        break;
                    case 'egg-rare':
                        price = web3.utils.fromWei(prices.rarePrice, 'ether');
                        break;
                    case 'egg-legendary':
                        price = web3.utils.fromWei(prices.legendaryPrice, 'ether');
                        break;
                    case 'pwfood':
                        // PwFood price is fixed at $1
                        price = "1 USD = 3000";
                        tokenSymbol = "PWFOOD";
                        break;
                    default:
                        return;
                }
                
                // update the price display
                if (itemId !== 'free-nft') {  // only non-free items need to update the price display
                    priceElement.innerHTML = `${price} <span class="coin-icon">${tokenSymbol}</span>`;
                }
            });
            
            debug.log('price updated successfully');
        } catch (error) {
            debug.error('failed to update the price:', error);
            showStatus('failed to get the latest price, displaying the default price', 'warning');
        }
    }
    
    /**
     * set the payment options
     */
    function setupPaymentOptions() {
        debug.log('setting the payment options...');
        
        try {
            // check the available payment options
            const availableTokens = [];
            
            // check the native ETH payment
            availableTokens.push({
                symbol: 'BNB',
                name: 'BNB',
                icon: '../../resources/images/tokens/bnb.png'
            });
            
            // check the ERC20 tokens
            for (const [symbol, contract] of Object.entries(tokenContracts)) {
                if (contract) {
                    availableTokens.push({
                        symbol: symbol,
                        name: getTokenFullName(symbol),
                        icon: `../../resources/images/tokens/${symbol.toLowerCase()}.png`
                    });
                }
            }
            
            debug.log('available payment options:', availableTokens);
            
            // create or update the payment options container
            let paymentOptionsContainer = document.getElementById('payment-options-container');
            
            if (!paymentOptionsContainer) {
                // add a click listener to the buy buttons, open the payment options
                const buyButtons = document.querySelectorAll('.buy-btn');
                buyButtons.forEach(btn => {
                    btn.addEventListener('click', function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        
                        const shopItem = this.closest('.shop-item');
                        if (!shopItem) return;
                        
                        const itemId = shopItem.getAttribute('data-id');
                        const itemMethod = shopItem.getAttribute('data-contract-method');
                        const itemName = shopItem.querySelector('h3').textContent;
                        const itemPrice = shopItem.querySelector('.item-price').textContent;
                        
                        // handle the purchase logic
                        handleBuyButtonClick(event);
                    });
                });
            }
            
        } catch (error) {
            debug.error('failed to set the payment options:', error);
        }
    }
    
    /**
     * get the full name of the token
     */
    function getTokenFullName(symbol) {
        const tokenNames = {
            'USDT': 'Tether USD',
            'USDC': 'USD Coin',
            'DAI': 'Dai Stablecoin',
        };
        
        return tokenNames[symbol] || symbol;
    }

    /**
     * buy PwFood pet food
     */
    async function buyPwFood() {
        try {
            // check if the contract is initialized
            if (!pwFoodManagerContract) {
                debug.error('PwFoodManager contract not initialized, cannot purchase');
                showModalAlert('purchase failed', 'contract not initialized correctly, please refresh the page', 'error');
                return;
            }
            
            // check if the wallet is connected
            if (!currentAddress) {
                debug.error('wallet not connected, cannot purchase');
                showStatus('please connect the wallet', 'error');
                return;
            }
            
            // get the user input amount
            const amountInput = document.getElementById('food-amount');
            if (!amountInput) {
                debug.error('cannot find the amount input field');
                showStatus('cannot find the amount input field', 'error');
                return;
            }
            
            // get the input value and check if it is a number
            const inputValue = amountInput.value;
            if (!inputValue.match(/^\d+$/)) {
                debug.error('amount is not an integer:', inputValue);
                
                // create and show the alert
                showCustomAlert('please enter an integer amount', 'amount must be an integer between 1 and 10000');
                return;
            }
            
            // convert to an integer and validate the range
            let amount = parseInt(inputValue);
            if (amount < 1 || amount > 10000) {
                debug.error('amount out of range:', amount);
                
                // create and show the alert
                showCustomAlert('amount out of range', 'please enter an integer amount between 1 and 10000');
                return;
            }
            
            // ensure the amount is an integer
            amount = Math.floor(amount);
            
            debug.log('user input amount:', amount);
            
            const paymentInfo = {
                itemId: "pwfood",
                itemType: "food", 
                itemName: "pet food",
                price: amount.toString(),  // use the user input amount
                basePrice: "1", // the base price is 1 USD
                itemQuantity: 1, // set the quantity to 1, avoid multiplying by the quantity
                foodQuantity: (3000 * amount).toString(), // 3000 pet food per USD
                itemImage: "../../resources/images/items/pwfood.png",
                contractFunction: "buyPwFood",
                description: `purchase ${amount} USD, get ${3000 * amount} pet food`
            };
            
            // open the payment confirmation alert
            openPaymentConfirmation(paymentInfo, async () => {
                // check if the contract exists
                if (!pwFoodManagerContract || !pwFoodManagerContract.methods) {
                    debug.error('contract instance does not exist or is incomplete, cannot execute the purchase');
                    showStatus('contract not initialized correctly, please refresh the page', 'error');
                    return;
                }
                
                showStatus('purchasing pet food...', 'info');
                
                // get the USDT token address
                let tokenAddress = '';
                if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                    const usdt = window.SUPPORTED_PAYMENT_TOKENS.find(token => token.id === 'USDT');
                    if (usdt) {
                        tokenAddress = usdt.contractAddress;
                    }
                }
                
                // if cannot get the token address from SUPPORTED_PAYMENT_TOKENS, use the fallback address
                if (!tokenAddress) {
                    debug.log('cannot get the token address from SUPPORTED_PAYMENT_TOKENS, using the fallback address');
                    tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // fallback USDT address
                }
                
                // check if the address is valid
                if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
                    debug.error('cannot find a valid USDT address');
                    showStatus('purchase failed: cannot find the payment token', 'error');
                    return;
                }
                
                try {
                    // convert the amount to wei unit ($ amount * 10^18)
                    const dollarAmount = web3.utils.toWei(amount.toString(), 'ether');
                    
                    // query the PwFoodManager contract address
                    const spenderAddress = pwFoodManagerContract._address;
                    if (!spenderAddress) {
                        debug.error('cannot get the PwFoodManager contract address');
                        showStatus('cannot get the contract address, please refresh the page', 'error');
                        return;
                    }
                    
                    debug.log('preparing to authorize the token to the PwFoodManager contract:', spenderAddress);
                    
                    // use the ContractApprovalManager to authorize the token
                    let approved = false;
                    if (window.ContractApprovalManager) {
                        try {
                            debug.log('using the ContractApprovalManager to authorize the token');
                            approved = await approveTokenIfNeeded(tokenAddress, spenderAddress, dollarAmount);
                        } catch (approvalError) {
                            debug.error('ContractApprovalManager authorization failed:', approvalError);
                            // if the ContractApprovalManager method fails, fallback to the original method
                            approved = false;
                        }
                    }
                    
                    // if the above authorization fails, use the traditional method
                    if (!approved) {
                        debug.log('using the traditional method to authorize the token');
                        approved = await approveTokenIfNeeded(tokenAddress, spenderAddress, dollarAmount);
                    }
                    
                    if (!approved) {
                        debug.error('token authorization failed, cannot continue the purchase');
                        showStatus('token authorization failed, please try again', 'error');
                        return;
                    }
                    
                    debug.log('token authorization successful, starting to purchase food');
                    showStatus('token authorized, purchasing food...', 'info');
                    
                    // check if the PaymentManager needs to be authorized
                    let paymentManagerAddress;
                    if (paymentManagerContractInstance) {
                        debug.log('using the PaymentManagerContract instance to get the address');
                        paymentManagerAddress = paymentManagerContractInstance.contractAddress;
                    } else if (paymentManagerContract && paymentManagerContract._address) {
                        paymentManagerAddress = paymentManagerContract._address;
                    }
                    
                    if (paymentManagerAddress) {
                        debug.log('checking the authorization of the PaymentManager...');
                        const paymentApproved = await approveTokenIfNeeded(tokenAddress, paymentManagerAddress, dollarAmount);
                        if (!paymentApproved) {
                            debug.error('PaymentManager authorization failed');
                            showStatus('payment manager authorization failed, please try again', 'error');
                            return;
                        }
                    }
                    
                    let result;
                    // use the PaymentManagerContract instance
                    if (paymentManagerContractInstance && typeof paymentManagerContractInstance.payForPWFood === 'function') {
                        debug.log('using the PaymentManagerContract instance to call payForPWFood');
                        try {
                            result = await paymentManagerContractInstance.payForPWFood(
                                tokenAddress, 
                                dollarAmount,
                                currentAddress, 
                                { from: currentAddress }
                            );
                            debug.log('using the PaymentManagerContract to purchase food successfully:', result);
                        } catch (pmError) {
                            debug.error('using the PaymentManagerContract to purchase food failed:', pmError);
                            // fallback to the traditional method
                            result = await pwFoodManagerContract.methods
                                .buyPwFood(tokenAddress, dollarAmount)
                                .send({ from: currentAddress });
                        }
                    } else {
                        // call the contract to purchase food
                        result = await pwFoodManagerContract.methods
                            .buyPwFood(tokenAddress, dollarAmount)
                            .send({ from: currentAddress });
                    }
                    
                    debug.log('purchase food successfully:', result);
                    showStatus(`congratulations! successfully purchased ${3000 * amount} pet food`, 'success');
                    
                    // notify the parent window to update the resource data
                    if (window.parent) {
                        window.parent.postMessage({
                            type: 'resourceUpdate',
                            resource: 'pwfood',
                            action: 'increase',
                            amount: 3000 * amount // update to the actual purchased amount
                        }, '*');
                    }
                } catch (error) {
                    debug.error('purchase food failed:', error);
                    
                    if (error.message) {
                        if (error.message.includes('denied')) {
                            showStatus('you denied the transaction', 'warning');
                        } else if (error.message.includes('insufficient funds')) {
                            showStatus('insufficient ETH balance, cannot pay for the gas fee', 'error');
                        } else if (error.message.includes('Insufficient balance')) {
                            showStatus('token balance is insufficient, cannot complete the purchase', 'error');
                        } else {
                            showStatus('purchase failed: ' + error.message, 'error');
                        }
                    } else {
                        showStatus('purchase failed, please try again later', 'error');
                    }
                }
            });
        } catch (error) {
            debug.error('error occurred while processing the purchase:', error);
            showStatus('failed to process the purchase request', 'error');
        }
    }
    
    /**
     * check and approve the token usage permission
     * @param {string} tokenAddress - the token contract address
     * @param {string} spenderAddress - the contract address to be authorized
     * @param {string} amount - the authorization amount
     * @returns {Promise<boolean>} - whether the approval is successful
     */
    async function approveTokenIfNeeded(tokenAddress, spenderAddress, amount) {
        try {
        if (!web3 || !currentAddress) {
                debug.error('Web3 or wallet address not initialized');
            return false;
        }

            // use the ContractApprovalManager
            if (window.ContractApprovalManager && 
                window.ContractApprovalManager.checkIfApprovalNeeded && 
                window.ContractApprovalManager.approveERC20Token) {
                
                debug.log('using the ContractApprovalManager to check and approve the token usage permission');
                
                // get or create the token contract instance
            let tokenContract;
                if (tokenContracts[tokenAddress]) {
                    tokenContract = tokenContracts[tokenAddress];
                } else {
                    // try to find the token contract instance from the existing token contracts
            const tokenId = Object.keys(tokenContracts).find(key => 
                tokenContracts[key] && tokenContracts[key]._address && 
                tokenContracts[key]._address.toLowerCase() === tokenAddress.toLowerCase()
            );
            
                    if (tokenId) {
                tokenContract = tokenContracts[tokenId];
            } else {
                        // otherwise, create a new contract instance
                        const tokenABI = window.GENERIC_ERC20_ABI || [];
                        tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
                        
                        // store to the tokenContracts
                        tokenContracts[tokenAddress] = tokenContract;
                    }
                }
                
                // check the approval status
                const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                    tokenContract,
                    currentAddress,
                    spenderAddress,
                    amount
                );
                
                debug.log('the approval status check result:', approvalStatus);
                
                if (approvalStatus.needsApproval) {
                    debug.log('need to approve the token');
                    
                    // execute the approval
                    const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                        tokenContract,
                        spenderAddress,
                        amount,
                        currentAddress,
                        true // use the maximum approval amount
                    );
                    
                    debug.log('the approval result:', approvalResult);
                    
                    return approvalResult.success;
                } else {
                    if (!approvalStatus.sufficientFunds) {
                        debug.error('token balance is insufficient:', approvalStatus);
                        showModalAlert('insufficientBalance', `tokenBalanceIsInsufficient`, 'error', { need: web3.utils.fromWei(amount, 'ether'), balance: web3.utils.fromWei(approvalStatus.balance, 'ether') });
                return false;
            }
            
                    debug.log('token has enough authorization');
                    return true;
                }
            } else {
                // the old approval method as a fallback
                debug.log('using the traditional method to check and approve the token usage permission');
                
                // create the token contract instance
                const tokenABI = window.GENERIC_ERC20_ABI || [];
                const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
            
                // check the existing authorization
                const allowance = await tokenContract.methods.allowance(currentAddress, spenderAddress).call();
                debug.log(`current authorization amount: ${allowance}, need: ${amount}`);
            
            if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
                    debug.log('token has enough authorization');
                return true;
            }
            
                debug.log('need to approve the token');
                
                // authorize the maximum amount
                const maxAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256 - 1
                
                const result = await tokenContract.methods.approve(spenderAddress, maxAmount)
                    .send({ from: currentAddress });
                
                debug.log('the approval result:', result);
                
                return result.status;
            }
        } catch (error) {
            debug.error('authorize the token failed:', error);
            showModalAlert('authorizeTheTokenFailed', 'authorizeTheTokenFailed', 'error', { message: error.message || 'unknownError' });
            return false;
        }
    }

    /**
     * initialize the payment tokens
     */
    function initPaymentTokens() {
        debug.log('initializing the payment tokens...');
        
        try {
            // check if there is already a payment token configuration
            if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                debug.log('found the payment token configuration, total:', window.SUPPORTED_PAYMENT_TOKENS.length);
                
                // still check if the default token is needed
                const hasDefaultToken = window.SUPPORTED_PAYMENT_TOKENS.some(token => token.id === 'USDT');
                if (!hasDefaultToken) {
                    debug.log('default USDT token not found, adding the default configuration');
                    createDefaultPaymentToken();
                }
            } else {
                debug.log('no payment token configuration found, creating the default configuration');
                window.SUPPORTED_PAYMENT_TOKENS = [];
                createDefaultPaymentToken();
            }
            
            // ensure the supportedTokens.js is loaded
            if (typeof window.addSupportedToken !== 'function' && !document.querySelector('script[src*="supportedTokens.js"]')) {
                debug.log('trying to load supportedTokens.js...');
                
                // dynamically load the supportedTokens.js
                const script = document.createElement('script');
                script.src = '../../scripts/other/supportedTokens.js';
                script.onload = function() {
                debug.log('supportedTokens.js loaded successfully');
                
                    // ensure the default token is loaded correctly
                    const hasDefaultToken = window.SUPPORTED_PAYMENT_TOKENS.some(token => token.id === 'USDT');
                    if (!hasDefaultToken) {
                    createDefaultPaymentToken();
                }
                
                    // if the web3 is initialized, reinitialize the token contracts
                    if (web3) {
                        setTimeout(() => {
                initializeTokenContracts();
                        }, 100);
                    }
                };
                script.onerror = function() {
                    debug.error('failed to load supportedTokens.js, using the default configuration');
                    if (!window.SUPPORTED_PAYMENT_TOKENS || window.SUPPORTED_PAYMENT_TOKENS.length === 0) {
                        window.SUPPORTED_PAYMENT_TOKENS = [];
                createDefaultPaymentToken();
                    }
                };
                document.head.appendChild(script);
            } 
            // if already loaded, and there is a web3 instance, initialize the token contracts
            else if (web3) {
                // delay a little to initialize the token contracts, ensure other scripts are loaded
                setTimeout(() => {
            initializeTokenContracts();
                }, 100);
            }
        } catch (error) {
            debug.error('error occurred while initializing the payment tokens:', error);
            // ensure at least one default token
            if (!window.SUPPORTED_PAYMENT_TOKENS || window.SUPPORTED_PAYMENT_TOKENS.length === 0) {
                window.SUPPORTED_PAYMENT_TOKENS = [];
                createDefaultPaymentToken();
            }
        }
    }
    
    /**
     * initialize the token contracts
     */
    function initializeTokenContracts() {
        debug.log('starting to initialize the token contracts...');
        
        // ensure the web3 and initERC20Contract are available
        if (!web3 || typeof initERC20Contract !== 'function') {
            debug.error('initialize the token contracts failed: web3 or initERC20Contract is not available');
            
            // try to initialize the web3 (if not initialized yet)
            if (!web3 && window.ethereum) {
                try {
                    debug.log('trying to initialize the web3 using window.ethereum...');
                    web3 = new Web3(window.ethereum);
                } catch (e) {
                    debug.error('failed to initialize the web3 using window.ethereum:', e);
                }
            } else if (!web3 && window.web3) {
                try {
                    debug.log('trying to initialize the web3 using window.web3...');
                    web3 = new Web3(window.web3.currentProvider);
                } catch (e) {
                    debug.error('failed to initialize the web3 using window.web3:', e);
                }
            }
            
            // if the initERC20Contract is not available, try to load
            if (typeof initERC20Contract !== 'function') {
                debug.log('trying to load initERC20.js...');
                
                // check if the script is already loaded, avoid duplicate loading
                if (!document.querySelector('script[src*="initERC20.js"]')) {
                    return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = '../../scripts/init_contracts/initERC20.js';
                script.onload = function() {
                    debug.log('initERC20.js loaded successfully, retrying to initialize the token contracts');
                            if (web3 && typeof initERC20Contract === 'function') {
                        initializeTokenContracts();
                                resolve();
                            } else {
                                debug.error('even though the script is loaded, web3 or initERC20Contract is still not available');
                                resolve();
                    }
                };
                script.onerror = function() {
                    debug.error('failed to load initERC20.js');
                            resolve();
                };
                document.head.appendChild(script);
                    });
                }
            }
            
            return;
        }
        
        // ensure the payment token list is available
        if (!window.SUPPORTED_PAYMENT_TOKENS || window.SUPPORTED_PAYMENT_TOKENS.length === 0) {
            debug.error('initialize the token contracts failed: no available payment tokens');
            return;
        }
        
        // initialize the contract of each payment token
        window.SUPPORTED_PAYMENT_TOKENS.forEach(token => {
            if (token.contractAddress && !tokenContracts[token.id]) {
                try {
                    debug.log(`initializing the ${token.name} contract...`);
                    tokenContracts[token.id] = initERC20Contract(web3, token.contractAddress);
                    
                    if (tokenContracts[token.id]) {
                        debug.log(`${token.name} contract initialized successfully`);
                    } else {
                        debug.error(`${token.name} contract initialization failed`);
                    }
                } catch (error) {
                    debug.error(`error occurred while initializing the ${token.name} contract:`, error);
                }
            }
        });
        
        debug.log('token contracts initialized successfully, initialized tokens:', Object.keys(tokenContracts));
    }
    
    /**
     * create the default payment token
     */
    function createDefaultPaymentToken() {
        debug.log('creating the default USDT token');
        
        // create the default payment token object
        const defaultToken = {
            id: 'USDT',
            name: 'USDT',
            contractAddress: '0x55d398326f99059fF775485246999027B3197955',
            icon: '../../resources/images/icons/usdt-coin.png',
            decimals: 18,
            isDefault: true
        };
        
        // ensure the global array exists
        if (!window.SUPPORTED_PAYMENT_TOKENS) {
            window.SUPPORTED_PAYMENT_TOKENS = [];
        }
        
        // add the default token
        window.SUPPORTED_PAYMENT_TOKENS.push(defaultToken);
        debug.log('the default USDT token has been created');
        
        // if the addSupportedToken function exists, also add it through it
        if (typeof window.addSupportedToken === 'function') {
            window.addSupportedToken(defaultToken);
        }
    }
    
    /**
     * get the balance of the user's token
     * @param {string} tokenAddress - the contract address of the token
     * @returns {Promise<string>} the balance of the token
     */
    async function getTokenBalance(tokenAddress) {
        try {
            if (!web3 || !currentAddress || !tokenAddress) {
                debug.error('failed to get the balance of the token: web3, address or token address is empty');
                return '0';
            }
            
            const tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, tokenAddress);
            
            // get the balance of the token
            const balance = await tokenContract.methods.balanceOf(currentAddress).call();
            
            // get the decimal places of the token
            let decimals = 18; // default to 18 decimal places
            try {
                decimals = await tokenContract.methods.decimals().call();
            } catch (error) {
                debug.warn('failed to get the decimal places of the token, using the default value 18:', error);
            }
            
            // format the balance
            const formattedBalance = formatTokenAmount(balance, decimals);
            debug.log(`the balance of the token of the user ${currentAddress}: ${formattedBalance}`);
            
            return formattedBalance;
        } catch (error) {
            debug.error('failed to get the balance of the token:', error);
            return '0';
        }
    }
    
    /**
     * format the token amount
     * @param {string} amount - the amount (represented in the smallest unit)
     * @param {number} decimals - the number of decimal places
     * @returns {string} the formatted amount
     */
    function formatTokenAmount(amount, decimals) {
        if (!amount) return '0';
        
        try {
            const divisor = web3.utils.toBN(10).pow(web3.utils.toBN(decimals));
            const bnAmount = web3.utils.toBN(amount);
            
            const integerPart = bnAmount.div(divisor).toString();
            const fractionPart = bnAmount.mod(divisor).toString().padStart(decimals, '0');
            
            // trim the trailing 0s
            let trimmedFraction = fractionPart;
            while (trimmedFraction.endsWith('0') && trimmedFraction.length > 0) {
                trimmedFraction = trimmedFraction.substring(0, trimmedFraction.length - 1);
            }
            
            if (trimmedFraction.length > 0) {
                return `${integerPart}.${trimmedFraction}`;
            } else {
                return integerPart;
            }
        } catch (error) {
            debug.error('failed to format the token amount:', error);
            return amount;
        }
    }

    /**
     * wait function, used to add a delay between key operations
     * @param {number} ms - the delay in milliseconds
     * @returns {Promise} - returns a Promise object
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * claim the free NFT
     */
    async function claimFreeNFT() {
        try {
            if (!nftLotteryManagerContract || !currentAddress) {
                showStatus('pleaseConnectWalletOrWaitForContractInitialization', 'error');
                return;
            }
            
            // update the status
            showStatus('claimingFreePet', 'info');
            
            // check if the user has already claimed the free NFT
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            if (hasClaimedFreeNFT) {
                showStatus('alreadyClaimedNFT', 'warning');
                checkFreeNFTClaimStatus();
                return;
            }
            
            // get the inviter address (if any)
            let inviterAddress = '0x0000000000000000000000000000000000000000'; // default to no inviter
            
            // try to get the inviter address from the input field
            const inviterInput = document.getElementById('inviter-address');
            if (inviterInput && inviterInput.value.trim()) {
                if (web3.utils.isAddress(inviterInput.value.trim())) {
                    inviterAddress = inviterInput.value.trim();
                    debug.log('using the inputted inviter address:', inviterAddress);
                } else {
                    showStatus('invalidInviterAddress', 'warning');
                }
            }
            
            // before claiming the free NFT, ensure all necessary contracts are authorized
            try {
                showStatus('checkingNecessaryApprovals', 'info');
                
                // use the ContractApprovalManager's authorization method
                if (window.ContractApprovalManager && window.ContractApprovalManager.ensureFreeNFTApprovals) {
                    debug.log('using the ContractApprovalManager to set the necessary approvals for the free NFT');
                    const approvalsSuccess = await window.ContractApprovalManager.ensureFreeNFTApprovals(
                        web3, 
                        currentAddress
                    );
                    
                    if (!approvalsSuccess) {
                        throw new Error('failedToSetNecessaryApprovals');
                    }
                    
                    debug.log('the necessary approvals for the free NFT have been set');
                } else {
                    debug.warn('the ContractApprovalManager is not available, skipping the authorization check');
                }
            } catch (error) {
                debug.error('error occurred during the authorization process:', error);
                if (error.message && error.message.includes('UserDenied')) {
                    showStatus('authorizationTransactionCancelled', 'warning');
                    return;
                } else {
                    showStatus('failedToSetNecessaryApprovals', 'error', { message: error.message || 'unknownError' });
                    return;
                }
            }
            
            debug.log('calling the contract to claim the free NFT, inviter:', inviterAddress);
            
            // call the contract to claim the free NFT
            const result = await nftLotteryManagerContract.methods.claimFreeNFT(inviterAddress).send({
                from: currentAddress
            });
            
            debug.log('the result of claiming the free NFT:', result);
            showStatus('freePetClaimedSuccessfully', 'success');
            
            // update the UI status
            checkFreeNFTClaimStatus();
            
            // try to get the transaction result and show the lottery result
            if (result && result.transactionHash) {
                try {
                    const lotteryResult = await getLotteryResultFromTransaction(
                            web3, 
                            nftLotteryManagerContract, 
                        result.transactionHash
                        );
                        
                        if (lotteryResult) {
                        debug.log('successfully got the lottery result of the free NFT:', lotteryResult);
                        // add a special mark, indicating this is the free NFT
                        lotteryResult.lotteryType = 'FreeNFT';
                        lotteryResult.lotteryTypeName = 'freePet';
                            
                        // use the game mode popup to show the lottery result
                        showGameModeLotteryResult(lotteryResult);
                        } else {
                            debug.warn('failed to get the lottery result from the transaction');
                        }
                    } catch (resultError) {
                        debug.error('failed to get the lottery result:', resultError);
                    }
                }
        } catch (error) {
            debug.error('failed to claim the free NFT:', error);
            
            if (error.message) {
                if (error.message.includes('AlreadyClaimed')) {
                    showStatus('alreadyClaimedNFT', 'warning');
                    checkFreeNFTClaimStatus();
                } else if (error.message.includes('denied')) {
                    showStatus('transactionCancelled', 'warning');
                } else {
                    showStatus('failedToClaimNFT', 'error', { message: error.message });
                }
            } else {
                showStatus('failedToClaimNFTTryAgainLater', 'error');
            }
        }
    }

    /**
     * check if the user has already claimed the free NFT and update the button status
     */
    async function checkFreeNFTClaimStatus() {
        try {
            if (!nftLotteryManagerContract || !currentAddress) return;
            
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            // find the free NFT button and item in the game mode
            const claimFreeNftBtn = document.getElementById('claim-free-nft-btn');
            const freeNftItem = document.querySelector('.free-nft-item');
            
            // handle the free NFT button in the game mode
            if (claimFreeNftBtn && freeNftItem) {
                if (hasClaimedFreeNFT) {
                    // the user has already claimed the free NFT
                    claimFreeNftBtn.classList.add('disabled');
                    claimFreeNftBtn.textContent = i18n.t('shop.alreadyClaimed') || 'already claimed';
                    
                    // add the already claimed style and label
                    freeNftItem.classList.add('already-claimed');
                    
                    // check if the claimed-badge exists, if not, add it
                    if (!freeNftItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = i18n.t('shop.claimed') || 'claimed';
                        freeNftItem.appendChild(claimedBadge);
                    }
                    
                    // disable the inviter input field
                    const inviterInput = document.getElementById('inviter-address');
                    if (inviterInput) {
                        inviterInput.disabled = true;
                        inviterInput.placeholder = 'youHaveAlreadyClaimedTheFreeNFT';
                    }
                } else {
                    // the user has not claimed the free NFT
                    claimFreeNftBtn.classList.remove('disabled');
                    claimFreeNftBtn.textContent = i18n.t('shop.claim') || 'claim';
                    
                    // remove the already claimed style and label
                    freeNftItem.classList.remove('already-claimed');
                    
                    // remove the claimed label
                    const claimedBadge = freeNftItem.querySelector('.claimed-badge');
                    if (claimedBadge) {
                        freeNftItem.removeChild(claimedBadge);
                    }
                    
                    // enable the inviter input field
                    const inviterInput = document.getElementById('inviter-address');
                    if (inviterInput) {
                        inviterInput.disabled = false;
                        inviterInput.placeholder = i18n.t('shop.inviterPlaceholder'); // Add this line
                    }
                }
            }
            
            // handle the free NFT button in the simple mode
            const freeNftButton = document.querySelector('#free-nft-btn');
            const simpleFreeNftItem = document.querySelector('#product-free-nft');
            
            if (freeNftButton && simpleFreeNftItem) {
                if (hasClaimedFreeNFT) {
                    // the user has already claimed the free NFT
                    freeNftButton.classList.add('disabled');
                    freeNftButton.textContent = i18n.t('shop.alreadyClaimed') || 'already claimed';

                    // add the already claimed style and label
                    simpleFreeNftItem.classList.add('already-claimed');
                    
                    // check if the claimed-badge exists, if not, add it
                    if (!simpleFreeNftItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = i18n.t('shop.claimed') || 'claimed';
                        simpleFreeNftItem.appendChild(claimedBadge);
                    }
                } else {
                    // the user has not claimed the free NFT
                    freeNftButton.classList.remove('disabled');
                    freeNftButton.textContent = i18n.t('shop.claimFree') || 'claim free';
                    
                    // remove the already claimed style and label
                    simpleFreeNftItem.classList.remove('already-claimed');
                    
                    // remove the claimed label
                    const claimedBadge = simpleFreeNftItem.querySelector('.claimed-badge');
                    if (claimedBadge) {
                        simpleFreeNftItem.removeChild(claimedBadge);
                    }
                }
            }
        } catch (error) {
            debug.error('failed to check the free NFT claim status:', error);
        }
    }

    // modify the function after the wallet connection, add the check for the free NFT status
    function updateWalletUI(connected, address = null) {
        debug.log('update the wallet UI:', connected, address);
        currentAddress = address;
        
        if (connected && address) {
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);
            
            // update the balance display (if needed)
            // updateTokenBalances();
            
            // check if the user has claimable NFTs
            if (nftLotteryManagerContract) {
                debug.log('check the claimable NFT status after the wallet connection');
                checkClaimableEggsStatus();
                checkFreeNFTClaimStatus();
                checkFreePwFoodClaimStatus();
                updateNFTRemaining();
            } else {
                // if the contract is not initialized, set a delay check
                setTimeout(() => {
                    if (nftLotteryManagerContract) {
                        debug.log('check the claimable NFT status after the wallet connection');
                        checkClaimableEggsStatus();
                        checkFreeNFTClaimStatus();
                        checkFreePwFoodClaimStatus();
                        updateNFTRemaining();
                    }
                }, 1000);
            }
        } else {
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
        }
    }

    /**
     * show the lottery result in the game mode
     * @param {Object} lotteryData - the lottery result data
     */
    function showGameModeLotteryResult(lotteryData) {
        debug.log('show the lottery result in the game mode:', lotteryData);
        
        if (!lotteryData) {
            debug.error('the lottery result data is empty, cannot show');
            return null;
        }
        
        try {
            // remove any existing iframe and overlay, ensure the clean state
            const existingFrame = document.getElementById('lottery-result-frame');
            const existingOverlay = document.getElementById('lottery-result-overlay');
            
            if (existingFrame) existingFrame.remove();
            if (existingOverlay) existingOverlay.remove();
            
            // save the result to localStorage for the iframe usage
            localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryData));
            
            // create the overlay
            const overlay = document.createElement('div');
            overlay.id = 'lottery-result-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            
            // create the iframe
            const lotteryResultFrame = document.createElement('iframe');
            lotteryResultFrame.id = 'lottery-result-frame';
            lotteryResultFrame.src = '../../webPages/other/lotteryResult.html';
            lotteryResultFrame.style.width = '90%';
            lotteryResultFrame.style.maxWidth = '450px';
            lotteryResultFrame.style.height = '600px';
            lotteryResultFrame.style.border = 'none';
            lotteryResultFrame.style.borderRadius = '12px';
            lotteryResultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            
            // add to the overlay
            overlay.appendChild(lotteryResultFrame);
            
            // add to the document
            document.body.appendChild(overlay);
            
            // clear the old listener
            if (window.lotteryResultMessageHandler) {
                window.removeEventListener('message', window.lotteryResultMessageHandler);
            }
            
            // add the message handler, handle the message from the iframe
            const handleResultMessage = function(event) {
                if (!event.data || typeof event.data !== 'object') return;
                
                debug.log('received the message from the iframe:', event.data);
                
                if (event.data.type === 'lotteryResultClosed') {
                    // received the close message, hide the overlay
                    const overlay = document.getElementById('lottery-result-overlay');
                    if (overlay) {
                        overlay.style.display = 'none';
                        // remove the overlay from the DOM
                        overlay.remove();
                    }
                } else if (event.data.type === 'iframeReady') {
                    // the iframe is ready, can send the data
                    debug.log('the lottery result iframe is ready, prepare to send the data');
                    
                    // delay a little, ensure the iframe is fully initialized
                    setTimeout(() => {
                        // first get the pet details, then send to the iframe
                        sendLotteryResultToIframe(lotteryData);
                    }, 500);
                } else if (event.data.type === 'requestPetDetails' && event.data.tokenId) {
                    // the iframe requests the pet details
                    debug.log('received the request for the pet details:', event.data.tokenId);
                    
                    fetchPetDetailsForLottery(event.data.tokenId)
                        .then(petData => {
                            // send the pet details to the iframe
                            const frame = document.getElementById('lottery-result-frame');
                            if (frame && frame.contentWindow) {
                                frame.contentWindow.postMessage({
                                    type: 'petDetails',
                                    tokenId: event.data.tokenId,
                                    data: petData
                                }, '*');
                                debug.log('sent the pet details to the iframe:', petData);
                            }
                        })
                        .catch(error => {
                            debug.error('failed to get the pet details:', error);
                        });
                }
            };
            
            // register the message handler
            window.addEventListener('message', handleResultMessage);
            window.lotteryResultMessageHandler = handleResultMessage;
            
            // listen to the iframe load completed
            lotteryResultFrame.onload = function() {
                debug.log('the lottery result iframe is loaded');
                // the iframe will send the iframeReady message, we will respond in the message handler
            };
            
            return overlay;
        } catch (error) {
            debug.error('failed to create the lottery result modal:', error);
            // downgrade processing: directly show the basic information in the page
            showModalAlert(
                'lotteryResult', 
                'congratulationsYouWonAPet', 
                'success',
                { qualityName: lotteryData.qualityName || '', tokenId: lotteryData.tokenId }
            );
            return null;
        }
    }
    
    /**
     * close the lottery result modal
     */
    function closeLotteryResultModal() {
        const overlay = document.getElementById('lottery-result-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * setup the necessary contract approvals for the payment
     * @param {Object} web3 - Web3 instance
     * @param {string} userAddress - user wallet address
     * @param {Object} tokenContract - payment token contract instance
     * @param {string} amount - the amount to approve (string format, supports large values)
     * @returns {Promise<boolean>} - whether all approvals are successful
     */
    async function setupRequiredApprovals(web3, userAddress, tokenContract, amount = null) {
        debug.log('setting up the necessary contract approvals for the purchase...');
        
        try {
            // use the ContractApprovalManager if available
            if (window.ContractApprovalManager && typeof window.ContractApprovalManager.setupEggApprovals === 'function') {
                debug.log('using ContractApprovalManager.setupEggApprovals to setup the approvals');
                const result = await window.ContractApprovalManager.setupEggApprovals(
                        web3, 
                        userAddress, 
                        tokenContract, 
                        amount
                    );
                    
                // add a delay to wait for the approval confirmation
                debug.log('the approval has been sent, waiting for confirmation...');
                await wait(8000); // wait for 8 seconds to ensure the approval transaction is confirmed
                
                return result;
            }
            
            // if the ContractApprovalManager is not available, fallback to the original method
            debug.log('ContractApprovalManager is not available, using the original method to setup the approvals');
            
            // get the contract addresses to approve
            const network = window.currentNetwork || 'TEST';
            let nftLotteryManagerAddress, paymentManagerAddress;
            
            if (typeof window.getContractAddress === 'function') {
                nftLotteryManagerAddress = window.getContractAddress('NFTLotteryManager');
                paymentManagerAddress = window.getContractAddress('PaymentManager');
            } else if (window.contractAddresses && window.contractAddresses[network]) {
                nftLotteryManagerAddress = window.contractAddresses[network].NFTLotteryManager;
                paymentManagerAddress = window.contractAddresses[network].PaymentManager;
            } else {
                debug.error('failed to get the required contract addresses');
                return false;
            }
            
            // 确保所有地址有效
            if (!nftLotteryManagerAddress || !paymentManagerAddress) {
                debug.error('one or more contract addresses are empty', {
                    nftLotteryManagerAddress,
                    paymentManagerAddress
                });
                return false;
            }
            
            // set a large approval amount
            const largeAmount = amount || web3.utils.toWei('10000000', 'ether');
            
            // check and setup the approvals for each contract
            const contracts = [
                { name: 'NFTLotteryManager', address: nftLotteryManagerAddress },
                { name: 'PaymentManager', address: paymentManagerAddress }
            ];
            
            for (const contract of contracts) {
                debug.log(`checking the ${contract.name} approval...`);
                
                try {
                    // 检查现有授权
                    const allowance = await tokenContract.methods.allowance(userAddress, contract.address).call();
                    debug.log(`the current ${contract.name} approval amount:`, allowance);
                    
                    if (web3.utils.toBN(allowance).gte(web3.utils.toBN(largeAmount))) {
                        debug.log(`${contract.name} has enough approval`);
                        continue;
                    }
                    
                    debug.log(`need to approve the token transfer for the ${contract.name}`);
                    
                    // send the approval transaction
                    const receipt = await tokenContract.methods
                        .approve(contract.address, largeAmount)
                        .send({ from: userAddress });
                    
                    debug.log(`${contract.name} token approval successful:`, receipt.transactionHash);
                } catch (error) {
                    debug.error(`failed to approve the ${contract.name}:`, error);
                    return false;
                }
            }
            
            // add a delay to wait for the approval confirmation
            debug.log('the approval has been sent, waiting for confirmation...');
            await wait(8000); // wait for 8 seconds to ensure the approval transaction is confirmed
            
            debug.log('all necessary approvals have been set');
            return true;
        } catch (error) {
            debug.error('failed to setup the approvals:', error);
            return false;
        }
    }
    
    // export the function to the global scope, so it can be accessed in other places
    window.setupRequiredApprovals = setupRequiredApprovals;

    // helper function to wait for a specified number of milliseconds
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * show the custom alert dialog
     * @param {string} title - the dialog title
     * @param {string} message - the dialog message
     */
    function showCustomAlert(title, message) {
        // check if the dialog already exists (prevent duplicate display)
        if (document.getElementById('custom-alert')) {
            return;
        }
        
        // create the dialog container
        const alertContainer = document.createElement('div');
        alertContainer.id = 'custom-alert';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '0';
        alertContainer.style.left = '0';
        alertContainer.style.width = '100%';
        alertContainer.style.height = '100%';
        alertContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        alertContainer.style.display = 'flex';
        alertContainer.style.justifyContent = 'center';
        alertContainer.style.alignItems = 'center';
        alertContainer.style.zIndex = '10000';
        
        // create the dialog content
        const alertBox = document.createElement('div');
        alertBox.style.width = '300px';
        alertBox.style.backgroundColor = 'white';
        alertBox.style.borderRadius = '8px';
        alertBox.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
        alertBox.style.padding = '20px';
        alertBox.style.textAlign = 'center';
        
        // add the title
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.margin = '0 0 10px 0';
        titleElement.style.color = '#d32f2f'; // red title
        alertBox.appendChild(titleElement);
        
        // add the message
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.margin = '10px 0 20px 0';
        alertBox.appendChild(messageElement);
        
        // add the confirm button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'confirm';
        confirmButton.style.backgroundColor = '#4d7bef';
        confirmButton.style.color = 'white';
        confirmButton.style.border = 'none';
        confirmButton.style.borderRadius = '4px';
        confirmButton.style.padding = '8px 15px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '14px';
        confirmButton.onclick = function() {
            document.body.removeChild(alertContainer);
        };
        alertBox.appendChild(confirmButton);
        
        // add the dialog to the page
        alertContainer.appendChild(alertBox);
        document.body.appendChild(alertContainer);
    }

    /**
     * initialize the batch purchase quantity input
     */
    function initBatchPurchaseInputs() {
        debug.log('initialize the batch purchase quantity input');
        
        // get the batch lottery input
        const commonEggAmountInput = document.getElementById('common-egg-amount');
        const rareEggAmountInput = document.getElementById('rare-egg-amount');
        const legendaryEggAmountInput = document.getElementById('legendary-egg-amount');
        
        // initialize the common egg quantity input
        if (commonEggAmountInput) {
            commonEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // set the initial value
            commonEggAmountInput.value = 1;
            updateEggTotalPrice({ target: commonEggAmountInput });
        }
        
        // initialize the rare egg quantity input
        if (rareEggAmountInput) {
            rareEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // set the initial value
            rareEggAmountInput.value = 1;
            updateEggTotalPrice({ target: rareEggAmountInput });
        }
        
        // initialize the legendary egg quantity input
        if (legendaryEggAmountInput) {
            legendaryEggAmountInput.addEventListener('input', function() {
                validateBatchAmount(this);
                updateEggTotalPrice({ target: this });
            });
            // set the initial value
            legendaryEggAmountInput.value = 1;
            updateEggTotalPrice({ target: legendaryEggAmountInput });
        }
    }

    /**
     * validate the batch purchase quantity
     * @param {HTMLInputElement} input - the quantity input element
     */
    function validateBatchAmount(input) {
        let value = parseInt(input.value) || 1;
        if (value < 1) {
            value = 1;
        } else if (value > 5) {
            value = 5;
        }
        input.value = value;
    }

    /**
     * update the egg total price
     * @param {Event} event - the input event
     */
    function updateEggTotalPrice(event) {
        const input = event.target,
            shopItem = input.closest('.shop-item');
        
        if (!shopItem) return;
        
        // get the price element
        const priceElement = shopItem.querySelector('.item-price');
        if (!priceElement) return;
        
        // get the total price element
        const totalPriceElement = shopItem.querySelector('.batch-total-price');
        if (!totalPriceElement) return;
        
        // parse the unit price
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/\$(\d+(\.\d+)?)/);
        if (!priceMatch) return;
        
        const unitPrice = parseFloat(priceMatch[1]);
        
        // get the quantity (ensure it is between 1 and 10)
        let quantity = parseInt(input.value) || 1;
        if (quantity < 1) {
            quantity = 1;
            input.value = 1;
        } else if (quantity > 10) {
            quantity = 10;
            input.value = 10;
        }
        
        // calculate the total price and update
        const totalPrice = (unitPrice * quantity).toFixed(2);
        totalPriceElement.textContent = `$${totalPrice}`;
    }

    /**
     * get the batch lottery amount
     * @param {string} eggType - the egg type: common, rare, legendary
     * @returns {number} - the batch purchase amount, default is 1
     */
    function getBatchAmount(eggType) {
        const amountInput = document.getElementById(`${eggType}-egg-amount`);
        if (!amountInput) return 1;
        
        const amount = parseInt(amountInput.value);
        return (amount >= 1 && amount <= 10) ? amount : 1;
    }

    /**
     * handle the batch lottery results
     * @param {Array<Object>} results - the batch lottery results array
     */
    function handleLotteryBatchResults(results) {
        debug.log('handle the batch lottery results:', results);
        
        // check if there is any lottery result
        if (!results || !Array.isArray(results) || results.length === 0) {
            debug.error('the batch lottery results are invalid');
            showModalAlert('lottery result', 'the batch lottery results are invalid, please try again later', 'error');
            return;
        }
        
        try {
            // save the results to the localStorage
            localStorage.setItem('lastLotteryBatchResults', JSON.stringify(results));
            
            // create the batch lottery result modal
            // check if the iframe exists, if not, create it
            let lotteryResultFrame = document.getElementById('lottery-result-frame');
            
            if (!lotteryResultFrame) {
                // create the overlay
                const overlay = document.createElement('div');
                overlay.id = 'lottery-result-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                overlay.style.zIndex = '9999';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                
                // create the iframe
                lotteryResultFrame = document.createElement('iframe');
                lotteryResultFrame.id = 'lottery-result-frame';
                lotteryResultFrame.src = '../../webPages/other/lotteryResult.html';
                lotteryResultFrame.style.width = '90%';
                lotteryResultFrame.style.maxWidth = '450px';
                lotteryResultFrame.style.height = '600px';
                lotteryResultFrame.style.border = 'none';
                lotteryResultFrame.style.borderRadius = '12px';
                lotteryResultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                
                // add to the overlay
                overlay.appendChild(lotteryResultFrame);
                
                // add to the document
                document.body.appendChild(overlay);
                
                // listen to the iframe load completed
                lotteryResultFrame.onload = function() {
                    // send the lottery results data to the iframe
                    setTimeout(() => {
                        // send the batch results to the iframe
                        lotteryResultFrame.contentWindow.postMessage({
                            type: 'lotteryBatchResults',
                            data: results
                        }, '*');
                    }, 300);
                };
                
                // add the message handler function, handle the message from the iframe
                const handleResultMessage = function(event) {
                    if (event.data && event.data.type === 'lotteryResultClosed') {
                        // receive the close message, hide the overlay
                        const overlay = document.getElementById('lottery-result-overlay');
                        if (overlay) {
                            overlay.style.display = 'none';
                        }
                    }
                };
                
                // register the message handler function
                window.addEventListener('message', handleResultMessage);
            } else {
                // the iframe already exists, update the data and show it
                const overlay = document.getElementById('lottery-result-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    
                    // send the batch results to the iframe
                    lotteryResultFrame.contentWindow.postMessage({
                        type: 'lotteryBatchResults',
                        data: results
                    }, '*');
                }
            }
        } catch (error) {
            debug.error('failed to create the batch lottery result modal:', error);
            
            // downgrade processing: directly show the basic information in the page
            let qualitySummary = "";
            const qualityCounts = {};
            
            // count the quality numbers
            results.forEach(result => {
                const quality = parseInt(result.quality);
                const qualityName = getQualityName(quality);
                qualityCounts[qualityName] = (qualityCounts[qualityName] || 0) + 1;
            });
            
            // build the summary text
            const parts = [];
            const qualityOrder = ['legendary', 'rare', 'excellent', 'good', 'common'];
            
            for (const quality of qualityOrder) {
                if (qualityCounts[quality]) {
                    parts.push(`${quality} ${qualityCounts[quality]}`);
                }
            }
            
            qualitySummary = parts.join('，');
            
            showStatus(`congratulations! you have got ${results.length} pets,其中${qualitySummary}`, 'success');
        }
    }
    
    /**
     * get the quality name
     * @param {number} quality - the quality level (0-4)
     * @returns {string} the quality name
     */
    function getQualityName(quality) {
        const qualityNames = {
            0: 'common',
            1: 'good',
            2: 'excellent',
            3: 'rare',
            4: 'legendary'
        };
        
        return qualityNames[quality] || 'common';
    }
    
    /**
     * get the batch lottery results from the transaction
     * @param {Object} web3 - Web3 instance
     * @param {Object} contract - NFTLotteryManager contract instance
     * @param {string} txHash - the transaction hash
     * @param {number} expectedCount - the expected result count
     * @returns {Promise<Array<Object>|null>} the lottery results object array or null
     */
    async function getLotteryBatchResultsFromTransaction(web3, contract, txHash, expectedCount = 1) {
        if (!txHash) {
            debug.error('failed to get the lottery results: the transaction hash is empty');
            return null;
        }
        
        try {
            debug.log(`get the batch lottery results from the transaction ${txHash} (expected count: ${expectedCount})...`);
            
            // get the transaction receipt
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            if (!receipt) {
                debug.error('failed to get the transaction receipt');
                return null;
            }
            
            // define the quality level mapping
            const qualityNames = {
                0: 'COMMON',
                1: 'GOOD',
                2: 'EXCELLENT',
                3: 'RARE',
                4: 'LEGENDARY'
            };
            
            // define the lottery type mapping
            const lotteryTypeNames = {
                'CommonEgg': 'COMMON EGG',
                'RareEgg': 'RARE EGG',
                'LegendaryEgg': 'LEGENDARY EGG',
                'FreeNFT': 'FREE NFT'
            };
            
            // find the event signature
            const lotteryResultEventAbi = contract._jsonInterface.find(
                abi => abi.type === 'event' && abi.name === 'NFTLotteryResult'
            );
            
            const freeNFTEventAbi = contract._jsonInterface.find(
                abi => abi.type === 'event' && abi.name === 'FreeNFTClaimed'
            );

            
            if (!lotteryResultEventAbi && !freeNFTEventAbi) {
                debug.error('the NFTLotteryResult/FreeNFTClaimed/EggClaimed event is not found in the contract ABI');
                return null;
            }
            
            // store the found results
            const results = [];
            
            // find the event in the logs
            for (const log of receipt.logs) {
                // check if the NFTLotteryResult event matches
                if (lotteryResultEventAbi && log.topics[0] === lotteryResultEventAbi.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            lotteryResultEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                    // only add the result when the tokenId is not 0
                    if (decodedLog.tokenId !== '0') {
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: parseInt(decodedLog.quality),
                            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'unknown',
                            nftId: decodedLog.nftId,
                            lotteryType: decodedLog.lotteryType,
                            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                        };
                        
                        results.push(result);
                    }
                }
                // check if the FreeNFTClaimed event matches
                else if (freeNFTEventAbi && log.topics[0] === freeNFTEventAbi.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            freeNFTEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                    // only add the result when the tokenId is not 0
                    if (decodedLog.tokenId !== '0') {
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: 0, // free NFT is always common (COMMON) quality
                            qualityName: qualityNames[0],
                            nftId: decodedLog.nftId,
                            lotteryType: 'FreeNFT',
                            lotteryTypeName: 'FREE NFT'
                        };
                        
                        results.push(result);
                    }
                }
                // remove the part that attempts to decode all logs, to avoid data format mismatch errors
                // only decode the logs that match the expected event signature
            }
            
            if (results.length === 0) {
                debug.warn('no lottery result event found in the transaction');
                return null;
            }
            
            if (results.length < expectedCount) {
                debug.warn(`the number of found results (${results.length}) is less than the expected number (${expectedCount})`);
            }
            
            debug.log(`successfully parsed ${results.length} lottery results:`, results);
            return results;
        } catch (error) {
            debug.error('failed to parse the batch lottery results:', error);
            return null;
        }
    }

    // load the contract approval manager script
    if (typeof window.ContractApprovalManager === 'undefined') {
        debug.log('load the contract approval manager script...');
        const approvalManagerScript = document.createElement('script');
        approvalManagerScript.src = '../../scripts/other/ContractApprovalManager.js';
        approvalManagerScript.async = true;
        approvalManagerScript.onload = () => {
            debug.log('the contract approval manager script is loaded successfully');
        };
        approvalManagerScript.onerror = () => {
            debug.error('failed to load the contract approval manager script');
        };
        document.head.appendChild(approvalManagerScript);
    } else {
        debug.log('the contract approval manager script is loaded successfully');
    }

    // initialize the shop page UI
    setupShopUI();

    /**
     * check if the user has claimable NFTs
     */
    async function checkClaimableEggsStatus() {
        try {
            debug.log('check if the user has claimable NFTs...');
            
            if (!nftLotteryManagerContract || !currentAddress) {
                debug.warn('the contract is not initialized or the wallet is not connected, cannot check the claimable NFT status');
                return;
            }
            
            // check if the user has claimable NFTs
            const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
            
            // get the number of claimable NFTs
            let pendingRareCount = 0;
            let pendingLegendaryCount = 0;
            let pendingTotal = 0;
            
            if (hasClaimableEggs) {
                try {
                    const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
                    pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
                    pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
                    pendingTotal = pendingRareCount + pendingLegendaryCount;
                    
                    debug.log('the number of claimable NFTs:', {
                        rare: pendingRareCount,
                        legendary: pendingLegendaryCount,
                        total: pendingTotal
                    });
                } catch (error) {
                    debug.error('failed to get the number of claimable NFTs:', error);
                }
            }
            
            // update the DOM display
            const pendingRareElement = document.getElementById('pending-rare-count');
            const pendingLegendaryElement = document.getElementById('pending-legendary-count');
            const pendingTotalElement = document.getElementById('pending-eggs-total');
            
            if (pendingRareElement) pendingRareElement.textContent = pendingRareCount;
            if (pendingLegendaryElement) pendingLegendaryElement.textContent = pendingLegendaryCount;
            if (pendingTotalElement) pendingTotalElement.textContent = pendingTotal;
            
            const claimEggsButton = document.getElementById('claim-eggs-btn');
            const claimEggsItem = document.getElementById('product-claim-eggs');
            
            if (claimEggsButton && claimEggsItem) {
                if (!hasClaimableEggs || pendingTotal === 0) {
                    debug.log('the user has no claimable NFTs, update the UI display');
                    
                    // disable the button
                    claimEggsButton.disabled = true;
                    claimEggsButton.classList.add('disabled');
                    claimEggsButton.textContent = window.i18n.t('shop.notification.noClaimableEggs');
                    
                    // add the already claimed style
                    claimEggsItem.classList.add('already-claimed');
                    
                    // add the pending badge (if not added yet)
                    if (!claimEggsItem.querySelector('.claimed-badge')) {
                        const noPendingBadge = document.createElement('div');
                        noPendingBadge.className = 'claimed-badge';
                        noPendingBadge.textContent = window.i18n.t('shop.notification.noClaimableEggs');
                        claimEggsItem.appendChild(noPendingBadge);
                    }
                } else {
                    debug.log('the user has claimable NFTs, the button is clickable');
                    
                    // enable the button
                    claimEggsButton.disabled = false;
                    claimEggsButton.classList.remove('disabled');
                    claimEggsButton.textContent = i18n.t('shop.claim') || 'claim';
                    
                    // remove the disabled style
                    claimEggsItem.classList.remove('already-claimed');
                    
                    // remove the pending badge
                    const noPendingBadge = claimEggsItem.querySelector('.claimed-badge');
                    if (noPendingBadge) {
                        claimEggsItem.removeChild(noPendingBadge);
                    }
                }
            } else {
                debug.warn('cannot find the claimable NFT button or the product element');
            }
        } catch (error) {
            debug.error('failed to check the claimable NFT status:', error);
        }
    }

    /**
     * claim the claimable NFTs
     */
    async function claimEggs() {
        debug.log('claim the claimable NFTs...');

        // get the claim button
        const claimButton = document.getElementById('claim-eggs-btn');
        if (!claimButton) {
            debug.error('cannot find the claimable NFT button');
            return;
        }

        // prevent the duplicate clicks - if the button is disabled, return directly
        if (claimButton.disabled || claimButton.classList.contains('processing')) {
            debug.log('the button is disabled or processing, ignore the duplicate clicks');
            return;
        }

        // ensure the NFTManager contract is initialized
        if (!nftManagerContract) {
            debug.log('the NFTManager contract is not initialized, try to initialize it');
            nftManagerContract = initNFTManagerContract();
            // wait a moment to ensure the initialization is completed
            if (nftManagerContract) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // mark the button as processing state
        claimButton.disabled = true;
        claimButton.classList.add('processing');

        try {
            // check if the user has claimable NFTs
            const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
            
            if (!hasClaimableEggs) {
                debug.warn('the user has no claimable NFTs');
                showStatus(window.i18n.t('shop.notification.noClaimableEggs'), 'info');
                
                // update the button status
                claimButton.textContent = window.i18n.t('shop.notification.noClaimableEggs');
                claimButton.classList.add('disabled');
                
                // update the status display
                checkClaimableEggsStatus();
                return;
            }
            
            // get the number of pending eggs
            const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
            const pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
            const pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
            const pendingTotal = pendingRareCount + pendingLegendaryCount;
            
            if (pendingTotal === 0) {
                debug.warn('no pending eggs');
                showStatus('noPendingNFTs', 'warning');
                return;
            }
            
            // use the modalDialog to show the confirm dialog
            const confirmContent = `
                <div style="padding: 10px 0;">
                    <p>youHaveUnclaimedNFTs</p>
                    <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #03A9F4; font-weight: 500;">rareNFTs:</span>
                            <span style="font-weight: bold;">${pendingRareCount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #FF9800; font-weight: 500;">legendaryNFTs:</span>
                            <span style="font-weight: bold;">${pendingLegendaryCount}</span>
                        </div>
                        <div style="border-top: 1px solid #ddd; margin-top: 5px; padding-top: 5px; text-align: center; font-weight: bold;">
                            total: ${pendingTotal}
                        </div>
                    </div>
                    <p>areYouSureToClaimThemNow</p>
                </div>
            `;
            
            const confirmOptions = {
                title: 'claimTheUnclaimedNFTs',
                confirmText: 'confirm',
                cancelText: 'cancel',
                animation: true
            };
            
            const result = await ModalDialog.confirm(confirmContent, confirmOptions);
            
            // if the user cancelled, return directly
            if (result.action !== 'confirm') {
                debug.log('the user cancelled the claim operation', result);
                return;
            }
            
            // set the button as loading state
            const originalText = claimButton.textContent;
            claimButton.innerHTML = '<span class="loading"></span> claiming...';
            
            // execute the claim transaction
            debug.log('call the contract to claim the unclaimed NFTs');
            updateStatusText('claimingTheUnclaimedNFTs');
            
            // set a higher gas limit, ensure the transaction can be executed successfully
            const txResult = await nftLotteryManagerContract.methods.claimEggs().send({
                from: currentAddress,
                gas: 1000000 + (pendingTotal * 600000) // use the contract base gas limit + 300,000 gas for each NFT
            });
            
            debug.log('successfully claimed the unclaimed NFTs:', txResult);
            updateStatusText('claimEggsSuccess', 'success', { count: pendingTotal });
            showStatus('claimEggsSuccess', 'success', { count: pendingTotal });
            
            // get the lottery results from the transaction
            try {
                // use the lotteryResultParser to parse the lottery results
                if (typeof getLotteryBatchResultsFromTransaction === 'function') {
                    const txHash = txResult.transactionHash;
                    const lotteryResults = await getLotteryBatchResultsFromTransaction(
                        web3,
                        nftLotteryManagerContract,
                        txHash,
                        pendingTotal
                    );
                    
                    if (lotteryResults && lotteryResults.length > 0) {
                        debug.log('parsed the lottery results:', lotteryResults);
                        
                        // get the NFT details information (name and image)
                        const enrichedResults = await Promise.all(
                            lotteryResults.map(async (result) => {
                                try {
                                    // if the NFTManager contract is initialized
                                    if (nftManagerContract) {
                                        // get the NFT URI
                                        let tokenURI;
                                        try {
                                            // use the _tokenURIs method instead of tokenURI
                                            tokenURI = await nftManagerContract.methods._tokenURIs(result.tokenId).call();
                                            result.tokenURI = tokenURI;
                                        } catch (uriError) {
                                            debug.error('failed to get the NFT URI:', uriError);
                                        }
                                        
                                        // get the NFT quality
                                        try {
                                            const quality = await nftManagerContract.methods.tokenQuality(result.tokenId).call();
                                            const qualityId = await nftManagerContract.methods.tokenQualityId(result.tokenId).call();
                                            
                                            // use the quality and quality ID to get the NFT information
                                            const nftInfo = await nftManagerContract.methods.nfts(quality, qualityId).call();
                                            if (nftInfo && nftInfo.name) {
                                                result.petName = `NFT #${nftInfo.name}`;
                                            }
                                        } catch (nftInfoError) {
                                            debug.error('failed to get the NFT quality information:', nftInfoError);
                                        }
                                        
                                        // get the NFT image URL
                                        if (tokenURI) {
                                            if (tokenURI.startsWith('data:application/json;base64,')) {
                                                // parse the Base64 encoded metadata
                                                const base64Data = tokenURI.replace('data:application/json;base64,', '');
                                                const jsonString = atob(base64Data);
                                                const metadata = JSON.parse(jsonString);
                                                
                                                if (metadata.image) {
                                                    result.imageUrl = metadata.image;
                                                }
                                                if (metadata.name) {
                                                    result.petName = metadata.name;
                                                }
                                            } else if (tokenURI.startsWith('http')) {
                                                // try to get the metadata from the HTTP URL
                                                try {
                                                    const response = await fetch(tokenURI);
                                                    const metadata = await response.json();
                                                    
                                                    if (metadata.image) {
                                                        result.imageUrl = metadata.image;
                                                    }
                                                    if (metadata.name) {
                                                        result.petName = metadata.name;
                                                    }
                                                } catch (e) {
                                                    debug.error('failed to get the NFT metadata:', e);
                                                }
                                            }
                                        }
                                    }
                                    
                                    // if there is no NFT name, use the default name
                                    if (!result.petName) {
                                        result.petName = `${getQualityName(result.quality)} NFT #${result.tokenId}`;
                                    }
                                    
                                    return result;
                                } catch (error) {
                                    debug.error('failed to get the NFT details:', error);
                                    // return the original result, ensure the processing continues
                                    result.petName = `${getQualityName(result.quality)} NFT #${result.tokenId}`;
                                    return result;
                                }
                            })
                        );
                        
                        // show the lottery results
                        handleLotteryBatchResults(enrichedResults);
                    }
                } else {
                    debug.warn('failed to get the batch lottery results parser function');
                }
            } catch (resultError) {
                debug.error('failed to get the lottery results:', resultError);
            }
            
            // update the status display
            setTimeout(() => {
                checkClaimableEggsStatus();
                claimButton.disabled = false;
                claimButton.textContent = originalText;
            }, 3000);
            
        } catch (error) {
            debug.error('failed to claim the unclaimed NFTs:', error);
            updateStatusText('claimFailed', 'error', { message: error.message || 'unknownError' });
            // use the modalDialog to show the error information
            showModalAlert('claimFailed', 'failedToClaimTheUnclaimedNFTs', 'error', { message: error.message || 'unknownError' });
            
            // restore the button status
            claimButton.disabled = false;
            claimButton.classList.remove('processing');
            claimButton.textContent = 'claim';
        } finally {
            // ensure the button status is reset after 3 seconds, whether the operation is successful or not
            setTimeout(() => {
                if (claimButton && document.body.contains(claimButton)) {
                    claimButton.classList.remove('processing');
                }
            }, 3000);
        }
    }

    /**
     * show the claim reminder after buying the egg
     * @param {string} eggType - the type of the egg, such as "rare egg" or "legendary egg"
     */
    function showEggClaimReminder(eggType) {
        try {
            const confirmContent = `
                <div style="padding: 10px 0;">
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-info-circle" style="color: #03A9F4; font-size: 24px; margin-right: 10px;"></i>
                        <span style="font-size: 18px; font-weight: bold;">claimReminder</span>
                    </div>
                    <p>the ${eggType} you purchased needs to wait for blockchain confirmation (about 1 minute).</p>
                    <p>please check your new NFTs in the <span style="color: #FF9800; font-weight: bold;">「claim the unclaimed NFTs」</span> module later.</p>
                    <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; border-left: 4px solid #03A9F4;">
                        <p style="margin: 0;">tip: after purchasing the special egg, the system needs a little time to process. this is to ensure that your pet data is correctly generated on the blockchain.</p>
                    </div>
                </div>
            `;
            
            const confirmOptions = {
                title: 'purchaseSuccessful',
                confirmText: 'iKnow',
                cancelText: null, // do not show the cancel button
                animation: true
            };
            
            ModalDialog.confirm(confirmContent, confirmOptions);
        } catch (error) {
            debug.error('failed to show the claim reminder dialog:', error);
        }
    }

    // add a new modal alert function, add it above the showCustomAlert function
    /**
     * use the ModalDialog to show the important information
     * @param {string} title - the title of the modal dialog
     * @param {string} message - the content of the modal dialog
     * @param {string} type - the type of the message, such as "error", "warning", "success", "info"
     */
    function showModalAlert(title, message, type = 'info') {
        try {
            // build the content with the styles
            let iconHtml = '';
            let iconColor = '#4a90e2'; // default blue
            
            // set the icon and color based on the type
            switch (type) {
                case 'error':
                    iconHtml = '<i class="fas fa-exclamation-circle"></i>';
                    iconColor = '#e53935'; // red
                    break;
                case 'warning':
                    iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
                    iconColor = '#ff9800'; // orange
                    break;
                case 'success':
                    iconHtml = '<i class="fas fa-check-circle"></i>';
                    iconColor = '#4caf50'; // green
                    break;
                case 'info':
                default:
                    iconHtml = '<i class="fas fa-info-circle"></i>';
                    iconColor = '#4a90e2'; // blue
                    break;
            }
            
            const content = `
                <div style="padding: 10px 0;">
                    <div style="margin-bottom: 15px; display: flex; align-items: center;">
                        <span style="font-size: 24px; color: ${iconColor}; margin-right: 10px;">${iconHtml}</span>
                        <span style="font-size: 18px; font-weight: bold;">${title}</span>
                    </div>
                    <p style="margin-bottom: 10px;">${message}</p>
                </div>
            `;
            
            // set the modal dialog options
            const options = {
                title: '',  // use the title style in the content
                content: content,
                confirmText: 'confirm',
                cancelText: null, // do not show the cancel button
                animation: true
            };
            
            // show the modal dialog
            ModalDialog.confirm(content, options);
            
            // update the status message, keep the compatibility
            showStatus(message, type);
        } catch (error) {
            debug.error('failed to show the modal dialog:', error);
            // downgrade to the original showStatus
            showStatus(message, type);
        }
    }

    /**
     * refresh the shop function
     */
    async function refreshShop() {
        console.log('refresh the shop data');
        
        // add the rotating animation
        const refreshBtn = document.getElementById('refresh-shop-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('rotating');
        }
        
        try {
            // update the item prices
            await updateItemPrices();
            
            // check the free NFT claim status
            await checkFreeNFTClaimStatus();
            
            // check the claimable eggs status
            await checkClaimableEggsStatus();
            
            // check the free PwFood claim status
            await checkFreePwFoodClaimStatus();
            
            // update the token balances
            await updateTokenBalances();
            
            // update the NFT remaining count
            updateNFTRemaining();
            
            // show the success message
            showStatus('the shop data has been refreshed', 'success');
        } catch (error) {
            console.error('failed to refresh the shop:', error);
            showStatus('failed to refresh the shop: ' + error.message, 'error');
        } finally {
            // remove the rotating animation
            if (refreshBtn) {
                refreshBtn.classList.remove('rotating');
            }
        }
    }
    
    /**
     * update the NFT remaining count
     */
    function updateNFTRemaining() {
        console.log('update the NFT remaining count...');
        
        if (!web3 || !nftManagerContract) {
            console.warn('Web3 or NFTManager contract is not initialized, cannot get the NFT remaining count');
            // check if the NFTManagerABI is loaded, if not, try to load the ABI file
            if (!window.NFTManagerABI) {
                console.error('NFTManagerABI is not loaded, try to load the ABI file');
                loadNFTManagerABI();
            } else {
                // try to initialize the NFTManager contract
                initNFTManagerContract();
            }
            return;
        }
        
        try {
            // first check if the contract methods are available
            if (!nftManagerContract.methods) {
                console.error('NFTManager contract methods are not available');
                // try to initialize the contract
                initNFTManagerContract();
                return;
            }
            
            // check if the contract has the totalRareRemaining method
            if (typeof nftManagerContract.methods.totalRareRemaining !== 'function') {
                console.error('NFTManager contract does not have the totalRareRemaining method');
                
                // update the UI to show 'unavailable'
                const rareRemainingElement = document.getElementById('rare-remaining-count');
                const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                if (rareRemainingElement) rareRemainingElement.textContent = 'unavailable';
                if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'unavailable';
                
                return;
            }
            
            // get the rare NFT remaining count
            nftManagerContract.methods.totalRareRemaining().call()
                .then(rareRemaining => {
                    console.log('rare NFT remaining count:', rareRemaining);
                    
                    // update the UI
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = rareRemaining;
                    }
                })
                .catch(error => {
                    console.error('failed to get the rare NFT remaining count:', error);
                    
                    // update the UI to show the error status
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = 'error';
                    }
                });
                
            // get the legendary NFT remaining count
            nftManagerContract.methods.totalLegendaryRemaining().call()
                .then(legendaryRemaining => {
                    console.log('legendary NFT remaining count:', legendaryRemaining);
                    
                    // update the UI
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = legendaryRemaining;
                    }
                })
                .catch(error => {
                    console.error('failed to get the legendary NFT remaining count:', error);
                    
                    // update the UI to show the error status
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = 'error';
                    }
                });
        } catch (error) {
            console.error('failed to update the NFT remaining count:', error);
            
            // update the UI to show the error status
            const rareRemainingElement = document.getElementById('rare-remaining-count');
            const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
            if (rareRemainingElement) rareRemainingElement.textContent = 'error';
            if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'error';
        }
    }
    
    /**
     * load the NFTManagerABI file
     */
    function loadNFTManagerABI() {
        if (window.NFTManagerABI) {
            console.log('NFTManagerABI has been loaded, no need to load it again');
            return;
        }
        
        console.log('loading the NFTManagerABI...');
        
        // create a script tag to load the ABI file
        const script = document.createElement('script');
        script.src = '../../scripts/contracts/ABI/NFTManagerABI.js';
        script.async = true;
        
        script.onload = function() {
            console.log('NFTManagerABI has been loaded successfully');
            
            // check if the ABI has been loaded successfully
            if (window.NFTManagerABI) {
                console.log('NFTManagerABI has been loaded to the global variable successfully');
                
                // try to re-initialize the NFTManager contract
                initNFTManagerContract();
            } else {
                console.error('NFTManagerABI has been loaded but the global variable is not found');
            }
        };
        
        script.onerror = function() {
            console.error('failed to load the NFTManagerABI');
        };
        
        document.head.appendChild(script);
    }
    
    /**
     * initialize the NFTManager contract
     */
    function initNFTManagerContract() {
        try {
            // get the contract address
            const nftManagerAddress = window.getContractAddress('NFTManager');
            
            // check if the ABI has been loaded
            if (!window.NFTManagerABI) {
                debug.warn('NFTManagerABI has not been loaded, try to load the ABI');
                loadNFTManagerABI();
                
                // if it still has not been loaded, return null
                if (!window.NFTManagerABI) {
                    debug.error('failed to load the NFTManagerABI');
                    return null;
                }
            }
            
            debug.log('initialize the NFTManager contract:', nftManagerAddress);
            
            // create the contract instance
            if (web3) {
                nftManagerContract = new web3.eth.Contract(window.NFTManagerABI, nftManagerAddress);
                
                // test if the contract is working
                nftManagerContract.methods.owner().call()
                    .then(ownerAddress => {
                        debug.log('NFTManager contract has been initialized successfully, the owner address:', ownerAddress);
                    })
                    .catch(error => {
                        debug.error('failed to call the NFTManager contract methods:', error);
                    });
                    
                return nftManagerContract;
            } else {
                debug.error('failed to initialize the NFTManager contract: web3 is not defined');
                return null;
            }
        } catch (error) {
            debug.error('failed to initialize the NFTManager contract:', error);
            return null;
        }
    }
    
    /**
     * initialize the shop contracts
     */
    function initShopContracts() {
        console.log('initialize the shop contracts...');
        
        try {
            // get the contract address function
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // the existing code, initialize the NFTLotteryManager and other contracts...
            
            // add the initialization of the NFTManager contract
            try {
                if (!nftManagerContract && typeof window.initNFTManagerContract === 'function') {
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                    console.log('NFTManager contract has been initialized');
                } else if (!nftManagerContract) {
                    // use the manual initialization method
                    initNFTManagerContract();
                }
            } catch (error) {
                console.error('failed to initialize the NFTManager contract:', error);
                // try the manual initialization method
                initNFTManagerContract();
            }
            
            // the other contracts initialization remains unchanged...
            
        } catch (error) {
            console.error('failed to initialize the shop contracts:', error);
        }
    }

    /**
     * check if the user can claim the free PwFood and update the button status
     */
    async function checkFreePwFoodClaimStatus() {
        try {
            if (!pwFoodManagerContract || !currentAddress || !nftLotteryManagerContract) {
                debug.warn('PwFoodManager contract has not been initialized or the wallet is not connected, cannot check the free PwFood status');
                return;
            }
            
            // get the daily reward amount of the free PwFood
            const dayRewardElem = document.getElementById('pwfood-day-reward');
            try {
                const reward = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
                if (dayRewardElem) dayRewardElem.textContent = reward;
            } catch (error) {
                debug.error('failed to get the daily reward amount of the free PwFood:', error);
                if (dayRewardElem) dayRewardElem.textContent = '10';
            }
            
            // get the last claim time
            let lastClaimTime = 0;
            const nextClaimTimeElem = document.getElementById('next-claim-time');
            
            try {
                lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
                lastClaimTime = parseInt(lastClaimTime);
                
                // calculate the start time of the current UTC day
                const currentTime = Math.floor(Date.now() / 1000);
                const utcDayStart = Math.floor(currentTime / 86400) * 86400;
                const nextDayStart = utcDayStart + 86400; // the start time of the next UTC day
                
                if (lastClaimTime >= utcDayStart) {
                    // already claimed today, the next claim time is tomorrow UTC 00:00
                    const nextClaimDate = new Date(nextDayStart * 1000);
                    
                    // calculate the remaining time to the next claim
                    const remainingSeconds = nextDayStart - currentTime;
                    const remainingHours = Math.floor(remainingSeconds / 3600);
                    const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                    
                    const formattedNextTime = nextClaimDate.toLocaleDateString() + ' ' + nextClaimDate.toLocaleTimeString();
                    const remainingTimeText = `${remainingHours}小时${remainingMinutes}分钟后`;
                    
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.innerHTML = `${formattedNextTime}<br>(${remainingTimeText})`;
                        nextClaimTimeElem.classList.remove('available-now');
                    }
                } else if (lastClaimTime > 0) {
                    // today has not claimed but claimed before, can claim now
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.textContent = 'nowCanClaim';
                        nextClaimTimeElem.classList.add('available-now');
                    }
                } else {
                    // never claimed before, can claim now
                    if (nextClaimTimeElem) {
                        nextClaimTimeElem.textContent = 'nowCanClaim';
                        nextClaimTimeElem.classList.add('available-now');
                    }
                }
            } catch (error) {
                debug.error('failed to get the last claim time:', error);
                if (nextClaimTimeElem) nextClaimTimeElem.textContent = 'failedToGet';
            }
            
            // check if the user has claimed the free NFT (the prerequisite for claiming the PwFood)
            let hasClaimedFreeNFT = false;
            try {
                hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            } catch (error) {
                debug.error('failed to check the free NFT claim status:', error);
            }
            
            // calculate the start time of the current UTC day
            const currentTime = Math.floor(Date.now() / 1000);
            const utcDayStart = Math.floor(currentTime / 86400) * 86400;
            
            // check if today has claimed
            const todayClaimed = lastClaimTime >= utcDayStart;
            
            const freePwFoodButton = document.getElementById('free-pwfood-btn');
            const freePwFoodItem = document.getElementById('product-free-pwfood');
            
            if (freePwFoodButton && freePwFoodItem) {
                // 1. if the user has not claimed the free NFT, show "need to claim the free pet"
                if (!hasClaimedFreeNFT) {
                    debug.log('the user has not claimed the free NFT, cannot claim the free PwFood');
                    
                    freePwFoodButton.classList.add('disabled');
                    freePwFoodButton.textContent = window.i18n.t('shop.notification.requiredNFTFirst');
                    
                    // add the hint style, but not add the already claimed style
                    freePwFoodItem.classList.add('nft-required');
                    
                    // add the hint label
                    if (!freePwFoodItem.querySelector('.claimed-badge')) {
                        const nftRequiredBadge = document.createElement('div');
                        nftRequiredBadge.className = 'claimed-badge';
                        nftRequiredBadge.textContent = window.i18n.t('shop.notification.requiredNFTFirst');
                        freePwFoodItem.appendChild(nftRequiredBadge);
                    }
                }
                // 2. if today has claimed, show "today has claimed"
                else if (todayClaimed) {
                    debug.log('the user has claimed the free PwFood today');
                    
                    freePwFoodButton.classList.add('disabled');
                    freePwFoodButton.textContent = 'todayHasClaimed';
                    
                    // add the already claimed style
                    freePwFoodItem.classList.add('already-claimed');
                    
                    // add the claimed label
                    if (!freePwFoodItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = 'todayHasClaimed';
                        freePwFoodItem.appendChild(claimedBadge);
                    }
                }
                // 3. otherwise, can claim now
                else {
                    debug.log('the user can claim the free PwFood now');
                    
                    freePwFoodButton.classList.remove('disabled');
                    freePwFoodButton.textContent = i18n.t('shop.claim') || 'claim';
                    
                    // remove the already claimed style
                    freePwFoodItem.classList.remove('already-claimed');
                    freePwFoodItem.classList.remove('nft-required');
                    
                    // remove the hint label
                    const badge = freePwFoodItem.querySelector('.claimed-badge');
                    if (badge) {
                        freePwFoodItem.removeChild(badge);
                    }
                }
            }
        } catch (error) {
            debug.error('failed to check the free PwFood claim status:', error);
        }
    }
    
    /**
     * claim the free PwFood
     */
    async function claimFreePwFood() {
        try {
            if (!pwFoodManagerContract || !currentAddress) {
                showStatus('pleaseConnectWalletOrWaitForContractInitialization', 'error');
                return;
            }
            
            // update the status
            showStatus('claimingFreeFood', 'info');
            
            // check if the user has claimed the free NFT (the prerequisite for claiming the PwFood)
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            if (!hasClaimedFreeNFT) {
                debug.warn('the user has not claimed the free NFT, cannot claim the free PwFood');
                showStatus(window.i18n.t('shop.notification.requiredNFTFirst'), 'warning');
                
                // update the button status
                checkFreePwFoodClaimStatus();
                return;
            }
            
            // check if today has claimed
            const lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
            const currentTime = Math.floor(Date.now() / 1000);
            const utcDayStart = Math.floor(currentTime / 86400) * 86400;
            
            if (parseInt(lastClaimTime) >= utcDayStart) {
                debug.warn('the user has claimed the free PwFood today');
                showStatus('todayHasClaimedFood', 'warning');
                
                // update the button status
                checkFreePwFoodClaimStatus();
                return;
            }
            
            debug.log('call the contract to claim the free PwFood');
            
            // execute the claim transaction
            const result = await pwFoodManagerContract.methods.claimFreePwFood().send({
                from: currentAddress
            });
            
            debug.log('the free PwFood has been claimed successfully:', result);
            
            // get the daily reward amount for displaying in the success message
            let rewardAmount = "10"; // default value
            try {
                rewardAmount = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
            } catch (error) {
                debug.error('failed to get the daily reward amount:', error);
            }
            
            showStatus('claimFoodSuccess', 'success', { count: rewardAmount });
            
            // update the button status and the last claim time
            checkFreePwFoodClaimStatus();
            
        } catch (error) {
            debug.error('failed to claim the free PwFood:', error);
            
            if (error.message) {
                if (error.message.includes('Today\'s pwfood already claimed')) {
                    showStatus('todayHasClaimedFood', 'warning');
                } else if (error.message.includes('Must claim free NFT first')) {
                    showStatus(window.i18n.t('shop.notification.requiredNFTFirst'), 'warning');
                } else if (error.message.includes('denied')) {
                    showStatus('transactionCancelled', 'warning');
                } else {
                    showStatus('failedToClaimFood', 'error', { message: error.message });
                }
            } else {
                showStatus('failedToClaimFoodTryAgainLater', 'error');
            }
            
            // update the button status
            checkFreePwFoodClaimStatus();
        }
    }

    /**
     * get the pet details for the lottery result display
     * @param {string|number} tokenId - the tokenId of the pet
     * @returns {Promise<Object>} the pet details object
     */
    async function fetchPetDetailsForLottery(tokenId) {
        debug.log('getting the pet details:', tokenId);
        
        const petData = {
            name: null,
            type: null,
            imageUrl: null,
            quality: null
        };
        
        try {
            // if the NFTManager contract is not available, try to initialize
            if (!nftManagerContract || !nftManagerContract.methods) {
                debug.log('the NFTManager contract is not available, try to initialize');
                
                if (typeof initNFTManagerContract === 'function') {
                    nftManagerContract = await initNFTManagerContract();
                }
                
                // wait for the initialization to complete
                if (!nftManagerContract || !nftManagerContract.methods) {
                    debug.error('failed to initialize the NFTManager contract');
                    return petData;
                }
            }
            
            // try to get the pet URI
            let tokenURI;
            try {
                if (typeof nftManagerContract.methods._tokenURIs === 'function') {
                    tokenURI = await nftManagerContract.methods._tokenURIs(tokenId).call();
                    debug.log('using _tokenURIs to get the pet URI:', tokenURI);
                } else if (typeof nftManagerContract.methods.tokenURI === 'function') {
                    tokenURI = await nftManagerContract.methods.tokenURI(tokenId).call();
                    debug.log('using tokenURI to get the pet URI:', tokenURI);
                }
            } catch (uriError) {
                debug.error('failed to get the pet URI:', uriError);
            }
            
            // parse the URI to get the metadata
            if (tokenURI) {
                try {
                    let metadata;
                    
                    if (tokenURI.startsWith('http')) {
                        // HTTP URL
                        const response = await fetch(tokenURI);
                        metadata = await response.json();
                    } else if (tokenURI.startsWith('data:application/json;base64,')) {
                        // Base64 encoded JSON
                        const base64Data = tokenURI.replace('data:application/json;base64,', '');
                        const jsonString = atob(base64Data);
                        metadata = JSON.parse(jsonString);
                    } else if (tokenURI.startsWith('ipfs://')) {
                        // IPFS link
                        const ipfsHash = tokenURI.replace('ipfs://', '');
                        const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                        
                        try {
                            const response = await fetch(ipfsGatewayUrl);
                            metadata = await response.json();
                        } catch (ipfsError) {
                            debug.error('failed to get the metadata from IPFS, try the backup gateway:', ipfsError);
                            // try the backup gateway
                            const backupGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                            const backupResponse = await fetch(backupGatewayUrl);
                            metadata = await backupResponse.json();
                        }
                    }
                    
                    if (metadata) {
                        // set the pet data
                        petData.name = metadata.name || `pet #${tokenId}`;
                        petData.type = metadata.species || metadata.type || 'unknown type';
                        
                        if (metadata.image) {
                            if (metadata.image.startsWith('ipfs://')) {
                                const ipfsHash = metadata.image.replace('ipfs://', '');
                                petData.imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                            } else {
                                petData.imageUrl = metadata.image;
                            }
                        }
                        
                        // try to get more information from the attributes
                        if (metadata.attributes && Array.isArray(metadata.attributes)) {
                            for (const attr of metadata.attributes) {
                                if (attr.trait_type === 'Type' || attr.trait_type === 'Species') {
                                    petData.type = attr.value || petData.type;
                                } else if (attr.trait_type === 'Quality' || attr.trait_type === 'Rarity') {
                                    petData.quality = attr.value;
                                }
                            }
                        }
                        
                        debug.log('successfully got the pet details:', petData);
                    }
                } catch (metadataError) {
                    debug.error('failed to parse the metadata:', metadataError);
                }
            }
            
            // try to get the quality information (if not yet got)
            if (!petData.quality) {
                try {
                    if (typeof nftManagerContract.methods.tokenQualityId === 'function') {
                        const qualityId = await nftManagerContract.methods.tokenQualityId(tokenId).call();
                        debug.log('got the pet quality ID:', qualityId);
                        
                        // convert the quality ID to the name
                        const qualityNames = ['COMMON', 'GOOD', 'EXCELLENT', 'RARE', 'LEGENDARY'];
                        if (qualityId >= 0 && qualityId < qualityNames.length) {
                            petData.quality = qualityNames[qualityId];
                        }
                    }
                } catch (qualityError) {
                    debug.error('failed to get the pet quality:', qualityError);
                }
            }
        } catch (error) {
            debug.error('failed to get the pet details:', error);
        }
        
        return petData;
    }
})(); // End of IIFE