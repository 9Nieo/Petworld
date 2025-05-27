    /**
     * Open the payment confirmation page
     * @param {Object} paymentInfo - Payment information object
     * @param {Function} confirmCallback - Confirm payment callback function
     */
    function openPaymentConfirmation(paymentInfo, confirmCallback) {
        debug.log('Open the payment confirmation page:', paymentInfo);
        
        // Check if there is already a payment iframe
        const paymentFrame = document.getElementById('paymentFrame');
        if (paymentFrame) {
            // If it exists, remove it first
            paymentFrame.remove();
        }
        
        // Create the payment iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'paymentFrame';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1000';
        iframe.src = '../../webPages/other/payment.html';
        
        // Add to the page
        document.body.appendChild(iframe);
        
        // Save the callback function to respond to payment messages
        window.confirmPaymentCallback = confirmCallback;
        
        // Save the payment information object
        window.currentPaymentInfo = paymentInfo;
        
        // Set the message listener
        window.addEventListener('message', handlePaymentMessage);
        
        // Add the batch purchase information
        if (paymentInfo.batchCount && paymentInfo.batchCount > 1) {
            paymentInfo.isBatch = true;
            paymentInfo.batchCount = paymentInfo.batchCount;
        }
        
        // Add the iframe loaded event handler
        iframe.onload = function() {
            debug.log('Payment iframe loaded, sending payment information');
            
            // Delay a little time to ensure the scripts in the iframe are initialized
            setTimeout(() => {
                if (iframe.contentWindow) {
                    // Send the payment information
                    iframe.contentWindow.postMessage({
                        type: 'paymentInfo',
                        data: paymentInfo
                    }, '*');
                    
                    // Send the wallet information
                    iframe.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: !!currentAddress,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // Send the Web3 information
                    iframe.contentWindow.postMessage({
                        type: 'web3Ready',
                        data: { web3: true }
                    }, '*');
                    
                    debug.log('Sent the initial data to the payment iframe');
                } else {
                    debug.error('Unable to access the contentWindow of the payment iframe');
                }
            }, 200);
        };
    }

    /**
     * Handle messages from the payment page
     * @param {MessageEvent} event - Message event
     */
    function handlePaymentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('Received message from the payment page:', message);
        
        switch (message.type) {
            case 'closePayment':
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentStarted':
                // Payment started
                showStatusMessage('paymentProcessing', 'info');
                break;
                
            case 'paymentConfirmed':
                // Payment confirmed, execute the purchase callback
                if (typeof window.confirmPaymentCallback === 'function') {
                    debug.log('Executing the purchase callback function');
                    
                    try {
                        // Capture and handle the Promise that may occur in the callback
                        const result = window.confirmPaymentCallback();
                        
                        // If the result is a Promise, add processing
                        if (result && typeof result.then === 'function') {
                            result.then(txResult => {
                                // Process the transaction result
                                if (txResult && txResult.transactionHash) {
                                    debug.log('Transaction successful, processing the lottery result');
                                    
                                    // Call processLotteryResult to process the lottery result
                                    try {
                                        processLotteryResult(txResult);
                                    } catch (err) {
                                        debug.error('Error processing the lottery result:', err);
                                    }
                                }
                            }).catch(err => {
                                debug.error('Failed to execute the purchase callback:', err);
                                // Don't show duplicate error message here, let the original function handle it
                                console.log('Purchase callback failed, error handled by original function');
                            });
                        }
                    } catch (error) {
                        debug.error('Error executing the purchase callback:', error);
                        // Don't show duplicate error message here, let the original function handle it
                        console.log('Purchase callback execution failed, error handled by original function');
                    }
                    
                    // After execution, clear the callback
                    window.confirmPaymentCallback = null;
                }
                break;
                
            case 'paymentCancelled':
                // Payment cancelled
                debug.log('User cancelled payment');
                showStatusMessage('paymentCancelled', 'info');
                
                // Clear the callback
                window.confirmPaymentCallback = null;
                
                // Reset all purchase buttons, ensuring they can be used for the next purchase
                const buyButtons = document.querySelectorAll('.buy-btn');
                buyButtons.forEach(btn => {
                    resetBuyButton(btn);
                });
                
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'paymentResult':
                // Process the payment result
                if (message.data && message.data.success) {
                    debug.log('Payment successful:', message.data);
                    showStatusMessage('paymentSuccess', 'success');
                } else {
                    debug.error('Payment failed:', message.data && message.data.error);
                    showStatusMessage('paymentFailed', 'error', { message: message.data && message.data.error || 'Unknown error' });
                    
                    // Reset all purchase buttons, ensuring they can be used for the next purchase
                    const resultBuyButtons = document.querySelectorAll('.buy-btn');
                    resultBuyButtons.forEach(btn => {
                        resetBuyButton(btn);
                    });
                }
                
                // Close the payment page
                closePaymentFrame();
                break;
                
            case 'requestData':
                // Payment page requests data
                const paymentFrame = document.getElementById('paymentFrame');
                if (paymentFrame && paymentFrame.contentWindow) {
                    // Send wallet information
                    paymentFrame.contentWindow.postMessage({
                        type: 'walletInfo',
                        data: {
                            connected: !!currentAddress,
                            address: currentAddress
                        }
                    }, '*');
                    
                    // Send the Web3 instance
                    paymentFrame.contentWindow.postMessage({
                        type: 'web3Ready',
                        data: {
                            web3: true
                        }
                    }, '*');
                    
                    // Send the payment information
                    if (window.currentPaymentInfo) {
                        paymentFrame.contentWindow.postMessage({
                            type: 'paymentInfo',
                            data: window.currentPaymentInfo
                        }, '*');
                    }
                }
                break;
        }
    }
        /**
     * Close the payment confirmation iframe
     */
        function closePaymentFrame() {
            const paymentFrame = document.getElementById('paymentFrame');
            if (paymentFrame) {
                paymentFrame.remove();
            }
            
            // Remove the message listener
            window.removeEventListener('message', handlePaymentMessage);
            
            // Ensure all buttons are reset
            const allButtons = document.querySelectorAll('.buy-btn');
            allButtons.forEach(btn => {
                resetBuyButton(btn);
            });
        }
        /**
     * Check and approve token transfer
     * @param {object} tokenContract - Token contract instance
     * @param {string} spender - Spender address
     * @param {string} amount - Amount to approve
     * @returns {Promise<boolean>} - Whether approval was successful
     */
        function checkAndApproveToken(tokenContract, spender, amount) {
            debug.log('Checking token authorization:', { spender, amount });
            
            return new Promise(async (resolve, reject) => {
                if (!tokenContract || !currentAddress) {
                    reject(new Error('Token contract not initialized or wallet not connected'));
                    return;
                }
                
                try {
                    // Check if using private key wallet for transactions
                    const usePrivateKeyWallet = window.SecureWalletManager && 
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                    
                    debug.log('Authorization method:', usePrivateKeyWallet ? 'Private Key Wallet' : 'Connected Wallet');
                    
                    // Use ContractApprovalManager first
                    if (window.ContractApprovalManager) {
                        if (typeof window.ContractApprovalManager.checkIfApprovalNeeded === 'function') {
                            // Use the new check approval need function
                            const checkResult = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                tokenContract, 
                                currentAddress, 
                                spender, 
                                amount
                            );
                            
                            debug.log('Authorization check result:', checkResult);
                            
                            if (!checkResult.needsApproval) {
                                debug.log('No authorization needed');
                                resolve(true);
                                return;
                            }
                            
                            if (!checkResult.sufficientFunds) {
                                debug.error('Insufficient balance:', checkResult);
                                reject(new Error('Insufficient token balance'));
                                return;
                            }
                        }
                        
                        if (typeof window.ContractApprovalManager.approveERC20Token === 'function') {
                            // Use the new authorization function
                            debug.log('Using ContractApprovalManager.approveERC20Token for authorization');
                            const approveResult = await window.ContractApprovalManager.approveERC20Token(
                                tokenContract,
                                spender,
                                amount,
                                currentAddress,
                                true // Use the maximum value
                            );
                            
                            if (approveResult.success) {
                                debug.log('Authorization successful:', approveResult);
                                resolve(true);
                            } else {
                                debug.error('Authorization failed:', approveResult);
                                reject(new Error(approveResult.error || 'Authorization failed'));
                            }
                            return;
                        }
                    }
                    
                    // Fallback to the original implementation
                    debug.log('Using traditional method to check authorization');
                    
                    // Check existing authorization
                    const allowance = await tokenContract.methods
                        .allowance(currentAddress, spender)
                        .call();
                    
                    debug.log('Current authorization amount:', allowance);
                    
                    if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
                        debug.log('Already enough authorization');
                        resolve(true);
                        return;
                    }
                    
                    debug.log('Need to approve token transfer');
                    
                    // Need to approve more tokens
                    if (usePrivateKeyWallet) {
                        // Use private key wallet for approval
                        debug.log('Using private key wallet for token approval');
                        const receipt = await window.SecureWalletManager.sendContractTransaction(
                            tokenContract,
                            'approve',
                            [spender, amount],
                            { gas: 100000 } // Standard gas limit for approval
                        );
                        debug.log('Token approval successful (private key):', receipt);
                    } else {
                        // Use connected wallet for approval
                        debug.log('Using connected wallet for token approval');
                    const receipt = await tokenContract.methods
                        .approve(spender, amount)
                        .send({ from: currentAddress });
                        debug.log('Token approval successful (connected wallet):', receipt);
                    }
                    
                    resolve(true);
                } catch (error) {
                    debug.error('Token approval failed:', error);
                    reject(error);
                }
            });
        }
        /**
     * Initialize or load payment token configuration
     */
        function initPaymentTokens() {
            debug.log('Initializing payment token configuration...');
            
            // First, set a default USDT address directly, ensuring the token address is always available
            if (!window.ERC20TokenAddresses) {
                window.ERC20TokenAddresses = {};
            }
            window.ERC20TokenAddresses.USDT = '0x55d398326f99059ff775485246999027b3197955';
            debug.log('Set default USDT address:', window.ERC20TokenAddresses.USDT);
            
            // Check if there is a global SUPPORTED_PAYMENT_TOKENS configuration
            if (!window.SUPPORTED_PAYMENT_TOKENS) {
                debug.warn('No SUPPORTED_PAYMENT_TOKENS configuration found, will try to load supported token configuration');
                
                // Dynamically load supportedTokens script
                const scriptEl = document.createElement('script');
                scriptEl.src = '../../scripts/other/supportedTokens.js';
                scriptEl.onload = function() {
                    debug.log('Supported token configuration loaded, entries:', window.SUPPORTED_PAYMENT_TOKENS?.length || 0);
                    // Initialize ERC20 token addresses after configuration is loaded
                    initializeERC20TokenAddresses();
                };
                scriptEl.onerror = function() {
                    debug.error('Failed to load supported token configuration');
                };
                document.head.appendChild(scriptEl);
            } else {
                debug.log('SUPPORTED_PAYMENT_TOKENS configuration found, entries:', window.SUPPORTED_PAYMENT_TOKENS.length);
                // Initialize ERC20 token addresses after configuration is loaded
                initializeERC20TokenAddresses();
            }
            
            // Payment token options
            const paymentOptions = document.querySelectorAll('.payment-options .payment-option');
            
            // If payment options exist, bind click event
            if (paymentOptions && paymentOptions.length > 0) {
                paymentOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        // Remove selected state from other options
                        paymentOptions.forEach(opt => opt.classList.remove('selected'));
                        
                        // Add selected state to current option
                        option.classList.add('selected');
                        
                        // Update item prices display
                        updateItemPrices(option.dataset.token);
                    });
                });
                
                // Default select first option
                if (paymentOptions[0]) {
                    paymentOptions[0].click();
                }
            } else {
                debug.warn('No payment options element found');
            }
        }
            /**
     * Initialize token contracts
     */
    function initializeTokenContracts() {
        debug.log('Initializing token contracts...');
        
        if (!web3) {
            debug.error('Web3 not initialized, cannot initialize token contracts');
            return;
        }
        
        try {
            // Get token address
            const getTokenAddress = window.getTokenAddress || function(token) {
                if (window.ERC20TokenAddresses) {
                    return window.ERC20TokenAddresses[token];
                }
                return null;
            };
            
            // Initialize payment token contracts (USDT, USDC)
            const supportedTokens = ['USDT', 'USDC', 'DAI'];
            supportedTokens.forEach(token => {
                const tokenAddress = getTokenAddress(token);
                if (!tokenAddress) {
                    debug.warn(`${token} address not defined`);
                    return;
                }
                
                try {
                    if (token === 'PwPoint' && typeof window.initPwPointContract === 'function') {
                        // Use dedicated PWPoint initialization function
                        const getContractAddressFunc = window.getContractAddress || function(name) {
                            const network = window.currentNetwork || 'MAIN';
                            if (window.contractAddresses && window.contractAddresses[network]) {
                                return window.contractAddresses[network][name];
                            }
                            return null;
                        };
                        tokenContracts[token] = window.initPwPointContract(web3, getContractAddressFunc);
                    } else if (typeof window.initERC20Contract === 'function') {
                        // Use generic ERC20 initialization function
                        tokenContracts[token] = window.initERC20Contract(web3, tokenAddress);
                    } else {
                        // Use ABI to create contract directly
                        const tokenABI = window.GENERIC_ERC20_ABI || [];
                        tokenContracts[token] = new web3.eth.Contract(tokenABI, tokenAddress);
                    }
                    
                    if (tokenContracts[token]) {
                        debug.log(`${token} contract initialized, address:`, tokenAddress);
                    } else {
                        debug.error(`Failed to initialize ${token} contract`);
                    }
                } catch (error) {
                    debug.error(`Failed to initialize ${token} contract:`, error);
                }
            });
        } catch (error) {
            debug.error('Failed to initialize token contracts:', error);
        }
    }
        /**
     * Initialize ERC20 token addresses
     */
        function initializeERC20TokenAddresses() {
            debug.log('Initializing ERC20 token addresses...');
            
            // If there is no global ERC20TokenAddresses object, create one
            if (!window.ERC20TokenAddresses) {
                window.ERC20TokenAddresses = {};
            }
            
            // If there is SUPPORTED_PAYMENT_TOKENS, get token addresses from it
            if (window.SUPPORTED_PAYMENT_TOKENS && Array.isArray(window.SUPPORTED_PAYMENT_TOKENS)) {
                window.SUPPORTED_PAYMENT_TOKENS.forEach(token => {
                    if (token.id && token.contractAddress) {
                        // Use ID as key, store contract address
                        window.ERC20TokenAddresses[token.id] = token.contractAddress;
                        debug.log(`Added token address: ${token.id} -> ${token.contractAddress}`);
                    }
                });
                
                // Add default hardcoded USDT address (if not found in SUPPORTED_PAYMENT_TOKENS)
                if (!window.ERC20TokenAddresses.USDT) {
                    window.ERC20TokenAddresses.USDT = window.ERC20TokenAddresses.USDT || '0x55d398326f99059ff775485246999027b3197955';
                    debug.log('Using default USDT address:', window.ERC20TokenAddresses.USDT);
                }
                
                debug.log('ERC20 token addresses initialized:', window.ERC20TokenAddresses);
            } else {
                debug.warn('No SUPPORTED_PAYMENT_TOKENS configuration found, using default token addresses');
                
                    // Set default token addresses
                window.ERC20TokenAddresses = {
                    USDT: '0x55d398326f99059ff775485246999027b3197955',  
                    USDC: '0x55d398326f99059ff775485246999027b3197955',  
                    DAI: '0x55d398326f99059ff775485246999027b3197955',   
                };
                
            }
        }
            /**
     * Get default payment token
     * @returns {string} Default token ID
     */
    function getDefaultPaymentToken() {
        // Use USDT first
        if (window.ERC20TokenAddresses && window.ERC20TokenAddresses.USDT) {
            return 'USDT';
        }
        
        // Find default token in SUPPORTED_PAYMENT_TOKENS
        if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
            const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault);
            if (defaultToken) {
                return defaultToken.id;
            }
            // Otherwise use first token
            return window.SUPPORTED_PAYMENT_TOKENS[0].id;
        }
        
        // Find first token in ERC20TokenAddresses
        if (window.ERC20TokenAddresses) {
            const tokens = Object.keys(window.ERC20TokenAddresses);
            if (tokens.length > 0) {
                return tokens[0];
            }
        }
        
        // Return USDT as default
        return 'USDT';
    }
        /**
     * Update item prices
     */
        function updateItemPrices() {
            debug.log('Updating item prices...');
            
            if (!web3 || !nftLotteryManagerContract) {
                debug.warn('Cannot update item prices: Web3 or NFTLotteryManager contract not initialized');
                return;
            }
            
            // Get shopItems from window or DOM
            const shopItemsArray = window.shopItems || Array.from(document.querySelectorAll('.shop-item'));
            
            if (!shopItemsArray || shopItemsArray.length === 0) {
                debug.warn('Cannot update item prices: shopItems not available or empty');
                return;
            }
            
            try {
                // Get default token
                const defaultToken = getDefaultPaymentToken();
                debug.log('Using default token to update prices:', defaultToken);
                
                // Update egg prices
                shopItemsArray.forEach(item => {
                    const itemId = item.getAttribute('data-id');
                    const category = item.getAttribute('data-category');
                    
                    if (!itemId || !category) {
                        debug.error('Unknown item type:', itemId);
                        return;
                    }
                    
                    const priceElem = item.querySelector('.item-price');
                    if (!priceElem) {
                        debug.error('Cannot find price element:', itemId);
                        return;
                    }
                    
                    // Get price based on item type
                    if (category === 'egg') {
                        let tokenId = 0;
                        // Determine egg type based on ID
                        if (itemId === 'egg-common') {
                            tokenId = 1; // Common egg ID
                        } else if (itemId === 'egg-rare') {
                            tokenId = 2; // Rare egg ID
                        } else if (itemId === 'egg-legendary') {
                            tokenId = 3; // Legendary egg ID
                        }
                        
                        // Get price
                        const tokenAddress = window.ERC20TokenAddresses?.[defaultToken];
                        if (tokenAddress && nftLotteryManagerContract.methods.getEggPrice) {
                            nftLotteryManagerContract.methods.getEggPrice(tokenId, tokenAddress)
                                .call()
                                .then(price => {
                                    if (price) {
                                        // Get token information
                                        let decimals = 18; // Default precision
                                        let symbol = defaultToken; // Use token ID as symbol
                                        
                                        // Find token precision and symbol
                                        if (window.SUPPORTED_PAYMENT_TOKENS) {
                                            const tokenInfo = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.id === defaultToken);
                                            if (tokenInfo) {
                                                decimals = tokenInfo.decimals || 18;
                                                symbol = tokenInfo.name || tokenInfo.id;
                                            }
                                        }
                                        
                                        // Convert wei to appropriate unit
                                        let formattedPrice;
                                        if (decimals === 18) {
                                            formattedPrice = web3.utils.fromWei(price, 'ether');
                                        } else if (decimals === 6) {
                                            formattedPrice = web3.utils.fromWei(price, 'mwei');
                                        } else {
                                            // Custom precision conversion
                                            formattedPrice = (Number(price) / Math.pow(10, decimals)).toString();
                                        }
                                        
                                        priceElem.textContent = `${formattedPrice} ${symbol}`;
                                        debug.log(`${itemId} price updated to: ${formattedPrice} ${symbol}`);
                                    } else {
                                        debug.warn(`Failed to get ${itemId} price`);
                                    }
                                })
                                .catch(error => {
                                    debug.error(`Failed to get ${itemId} price:`, error);
                                });
                        } else {
                            debug.warn(`${defaultToken} address not defined or contract method not available, cannot get egg price`);
                        }
                    } else if (category === 'food') {
                        // Food price logic
                        // Here you can add food price retrieval logic
                        // For now, using default price
                        priceElem.textContent = `3000 PWFOOD = 1 ${defaultToken}`;
                    }
                });
            } catch (error) {
                debug.error('Error updating item prices:', error);
            }
        }        

// Make functions globally accessible for the main shop.js file
window.openPaymentConfirmation = openPaymentConfirmation;
window.handlePaymentMessage = handlePaymentMessage;
window.closePaymentFrame = closePaymentFrame;
window.checkAndApproveToken = checkAndApproveToken;
window.initPaymentTokens = initPaymentTokens;
window.initializeTokenContracts = initializeTokenContracts;
window.initializeERC20TokenAddresses = initializeERC20TokenAddresses;
window.getDefaultPaymentToken = getDefaultPaymentToken;
window.updateItemPrices = updateItemPrices;        