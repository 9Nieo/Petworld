    /**
     * Safe i18n translation function
     * @param {string} key - Translation key
     * @param {object} params - Translation parameters
     * @returns {string} - Translated text or fallback
     */
    function safeTranslate(key, params = {}) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            try {
                return window.i18n.t(key, params);
            } catch (error) {
                console.warn('Translation failed for key:', key, error);
            }
        }
        
        // Fallback translations
        const fallbacks = {
            'shop.notification.purchaseSuccess': 'Purchase Successful!',
            'shop.notification.purchaseFoodSuccessModal': 'Successfully purchased {quantity} pet food!',
            'shop.notification.purchaseFoodTip': 'Pet food has been added to your inventory. Use it to feed your pets and keep them happy!',
            'shop.notification.claimSuccess': 'Claim Successful!',
            'shop.notification.claimFreeFoodSuccessModal': 'Successfully claimed {count} free pet food!',
            'shop.notification.claimFreeFoodTip': 'Come back tomorrow to claim more free pet food. Feed your pets regularly to keep them healthy!',
            'button.ok': 'OK',
            'button.confirm': 'Confirm',
            'shop.nowCanClaim': 'Available to claim',
            'shop.failedToGet': 'Failed to get',
            'shop.notification.requiredNFTFirst': 'Need to claim free pet first',
            'shop.todayClaimed': 'Already claimed today',
            'shop.claim': 'Claim',
            'claimingFood': 'Claiming...',
            'shop.needClaimFreePet': 'Need to claim free pet first'
        };
        
        let text = fallbacks[key] || key;
        
        // Simple parameter replacement
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
            });
        }
        
        return text;
    }

    /**
     * Purchase pet food
     * @param {string} foodId - Food ID
     * @param {string} paymentToken - Payment token
     * @param {HTMLElement} buyButton - Buy button
     */
    function purchaseFood(foodId, paymentToken, buyButton) {
        console.log('Purchase food:', { foodId, paymentToken });
        
        if (!web3 || !currentAddress) {
            debug.error('Purchase failed: Web3 is not initialized or wallet is not connected');
            resetBuyButton(buyButton);
            return;
        }
        
        try {
            // Get the amount input by the user
            const amountInput = document.getElementById('food-amount');
            if (!amountInput) {
                showStatusMessage('amountInputNotFound', 'error');
                resetBuyButton(buyButton);
                return;
            }
            
            // Get the input value and check if it is a valid integer
            const inputValue = amountInput.value;
            const amount = parseInt(inputValue, 10);
            
            // Check if it is an integer
            if (!inputValue.match(/^\d+$/)) {
                showSimpleAlert('Input error', 'Please enter an integer amount');
                resetBuyButton(buyButton);
                return;
            }
            
            // Check if it is within the allowed range
            if (amount < 1 || amount > 5) {
                showSimpleAlert('Range error', 'Please enter an amount between 1 and 5');
                resetBuyButton(buyButton);
                return;
            }
            
            // Create payment information object
            const paymentInfo = {
                itemId: 'pwfood',
                itemType: 'food',
                itemName: 'Pet food',
                price: amount.toString(), // Use the user input amount
                basePrice: "1", // The base price is 1 USD
                itemQuantity: 1, // Set to 1 to avoid multiplying by quantity
                foodQuantity: (3000 * amount).toString(), // 3000 pet food per USD
                itemImage: '../../resources/images/items/pwfood.png',
                description: `Purchase ${amount} USD, get ${3000 * amount} pet food`
            };
            
            // Open payment confirmation page
            openPaymentConfirmation(paymentInfo, async () => {
                // When the user confirms the payment, execute
                debug.log('User confirmed payment, starting to purchase food');
                
                try {
                    // Get the payment token
                    let payToken = null;
                    
                    // First try using the initialized USDT contract
                    if (tokenContracts.USDT && tokenContracts.USDT._address) {
                        debug.log("Using the initialized USDT token");
                        payToken = tokenContracts.USDT._address;
                    } 
                    // Then try to get from supportedTokens
                    else if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                        // Find the default token or the first token
                        const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault) || window.SUPPORTED_PAYMENT_TOKENS[0];
                        debug.log("Get token from SUPPORTED_PAYMENT_TOKENS:", defaultToken);
                        
                        if (defaultToken && defaultToken.contractAddress) {
                            payToken = defaultToken.contractAddress;
                            
                            // If the contract of this token has not been initialized, initialize it first
                            if (!tokenContracts[defaultToken.id] && typeof window.initERC20Contract === 'function') {
                                debug.log(`Initialize ${defaultToken.name} contract...`);
                                try {
                                    tokenContracts[defaultToken.id] = window.initERC20Contract(web3, defaultToken.contractAddress);
                                    debug.log(`${defaultToken.name} contract initialized successfully`);
                                } catch (err) {
                                    debug.error(`Failed to initialize ${defaultToken.name} contract:`, err);
                                }
                            }
                        }
                    }
                    // Finally use the fixed USDT address as a backup option
                    else {
                        debug.log("Using the fixed USDT address as a backup option");
                        payToken = '0x55d398326f99059ff775485246999027b3197955'; // Default USDT address
                        
                        // Ensure the USDT ERC20 contract is initialized
                        if (!tokenContracts.USDT && typeof window.initERC20Contract === 'function') {
                            tokenContracts.USDT = window.initERC20Contract(web3, payToken);
                        }
                    }
                    
                    if (!payToken) {
                        throw new Error('Payment token not initialized');
                    }
                    
                    debug.log("Using the payment token address:", payToken);
                    
                    // Convert the amount to wei units ($ amount * 10^18)
                    const dollarAmount = web3.utils.toWei(amount.toString(), 'ether');
                    
                    // Find or create the token contract instance
                    let tokenContract = null;
                    const tokenId = Object.keys(tokenContracts).find(key => 
                        tokenContracts[key] && tokenContracts[key]._address && 
                        tokenContracts[key]._address.toLowerCase() === payToken.toLowerCase()
                    );
                    
                    if (tokenId && tokenContracts[tokenId]) {
                        debug.log(`Using the initialized ${tokenId} contract instance`);
                        tokenContract = tokenContracts[tokenId];
                    } else if (typeof window.initERC20Contract === 'function') {
                        debug.log("Creating a new ERC20 contract instance");
                        tokenContract = window.initERC20Contract(web3, payToken);
                    } else if (window.GENERIC_ERC20_ABI) {
                        debug.log("Creating a new ERC20 contract instance using the generic ABI");
                        tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, payToken);
                    }
                    
                    if (!tokenContract) {
                        throw new Error('Failed to create the token contract instance');
                    }
                    
                    // Check token authorization
                    debug.log('Checking token authorization...');
                    const approved = await checkAndApproveToken(tokenContract, pwFoodManagerContract._address, dollarAmount);
                    if (!approved) {
                        throw new Error('Token authorization failed');
                    }
                    
                    // Check the authorization of PaymentManager
                    debug.log('Checking the authorization of PaymentManager...');
                    let paymentManagerAddress;
                    
                    // Determine the PaymentManager address
                    if (paymentManagerContract && paymentManagerContract._address) {
                        paymentManagerAddress = paymentManagerContract._address;
                        debug.log('Using paymentManagerContract to get the address:', paymentManagerAddress);
                    } else {
                        debug.error('PaymentManager contract not initialized or address not available');
                        throw new Error('Failed to get the PaymentManager address');
                    }
                    
                    const paymentApproved = await checkAndApproveToken(tokenContract, paymentManagerAddress, dollarAmount);
                    if (!paymentApproved) {
                        throw new Error('PaymentManager authorization failed');
                    }
                    
                    // Only use PwFoodManager contract's buyPwFood method
                    debug.log('Token authorized, starting to purchase food, token address:', payToken, 'amount:', dollarAmount);
                    
                    // Check if using private key wallet
                    const shouldUsePrivateKey = window.SecureWalletManager && 
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                    
                    let result;
                    
                    // Only use PwFoodManager contract's buyPwFood method
                            if (shouldUsePrivateKey) {
                                debug.log('Using private key wallet for PwFoodManager transaction');
                                result = await window.SecureWalletManager.sendContractTransaction(
                                    pwFoodManagerContract,
                                    'buyPwFood',
                                    [payToken, dollarAmount]
                                );
                            } else {
                                debug.log('Using connected wallet for PwFoodManager transaction');
                            result = await pwFoodManagerContract.methods
                                .buyPwFood(payToken, dollarAmount)
                                .send({ from: currentAddress });
                            }
                            debug.log('Successfully purchased food using PwFoodManager');
                    
                    debug.log('Purchase food transaction successful:', result);
                    
                    // Show success modal dialog
                    const purchaseQuantity = 3000 * amount;
                    const modalContent = `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 48px; color: #4CAF50; margin-bottom: 15px;">
                                🎉
                            </div>
                            <h3 style="color: #4CAF50; margin-bottom: 15px;">${safeTranslate('shop.notification.purchaseSuccess')}</h3>
                            <p style="font-size: 16px; margin-bottom: 10px;">
                                ${safeTranslate('shop.notification.purchaseFoodSuccessModal', { quantity: purchaseQuantity })}
                            </p>
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin-top: 15px;">
                                <small style="color: #666;">
                                    ${safeTranslate('shop.notification.purchaseFoodTip')}
                                </small>
                            </div>
                        </div>
                    `;
                    
                    ModalDialog.alert(modalContent, {
                        title: safeTranslate('shop.notification.purchaseSuccess'),
                        confirmText: safeTranslate('button.ok'),
                        animation: true
                    });
                    
                    showStatusMessage(`purchaseFoodSuccess`, 'success', { quantity: purchaseQuantity });
                } catch (error) {
                    debug.error('Failed to purchase food:', error);
                    showStatusMessage(`purchaseFailed`, 'error', { message: getErrorMessage(error) });
                    // Reset the button status
                    resetBuyButton(buyButton);
                    return;
                } finally {
                    // Reset the button status
                    resetBuyButton(buyButton);
                }
            });
        } catch (error) {
            debug.error('Failed to purchase food:', error);
            showStatusMessage(`purchaseFailed`, 'error', { message: getErrorMessage(error) });
            resetBuyButton(buyButton);
        }
    }
        /**
     * Check if the user can claim the free PwFood
     */
        async function checkFreePwFoodClaimStatus() {
            try {
                debug.log('Checking the free PwFood claim status');
                
                if (!pwFoodManagerContract || !currentAddress) {
                    debug.warn('PwFoodManager contract is not initialized or the wallet is not connected, cannot check the free PwFood status');
                    return;
                }
                
                // Get the daily reward amount of free PwFood
                const dayRewardElem = document.getElementById('pwfood-day-reward');
                try {
                    // If there is a class instance, use the class method to get
                    if (typeof window.PwFoodManagerContract === 'function') {
                        const pwFoodManager = new window.PwFoodManagerContract(web3);
                        const reward = await pwFoodManager.getPwFoodDayReward();
                        if (dayRewardElem) dayRewardElem.textContent = reward;
                    } else {
                        // Try to get directly from the contract
                        const reward = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
                        if (dayRewardElem) dayRewardElem.textContent = reward;
                    }
                } catch (error) {
                    debug.error('Failed to get the daily reward amount:', error);
                    if (dayRewardElem) dayRewardElem.textContent = '10';
                }
                
                // Get the last claim time
                let lastClaimTime = 0;
                const nextClaimTimeElem = document.getElementById('next-claim-time');
                
                try {
                    lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
                    lastClaimTime = parseInt(lastClaimTime);
                    
                    // Calculate the start time of the current UTC day
                    const currentTime = Math.floor(Date.now() / 1000);
                    const utcDayStart = Math.floor(currentTime / 86400) * 86400;
                    const nextDayStart = utcDayStart + 86400; // The start time of the next UTC day
                    
                    if (lastClaimTime >= utcDayStart) {
                        // Already claimed today, the next claim time is tomorrow UTC 00:00
                        const nextClaimDate = new Date(nextDayStart * 1000);
                        
                        // Calculate the remaining time until the next claim
                        const remainingSeconds = nextDayStart - currentTime;
                        const remainingHours = Math.floor(remainingSeconds / 3600);
                        const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);
                        
                        const formattedNextTime = nextClaimDate.toLocaleDateString() + ' ' + nextClaimDate.toLocaleTimeString();
                        const remainingTimeText = `${remainingHours} hours ${remainingMinutes} minutes later`;
                        
                        if (nextClaimTimeElem) {
                            nextClaimTimeElem.innerHTML = `${formattedNextTime}<br>(${remainingTimeText})`;
                            nextClaimTimeElem.classList.remove('available-now');
                        }
                    } else if (lastClaimTime > 0) {
                        // Today has not claimed but claimed before, can claim immediately
                        if (nextClaimTimeElem) {
                            nextClaimTimeElem.textContent = safeTranslate('shop.nowCanClaim');
                            nextClaimTimeElem.classList.add('available-now');
                        }
                    } else {
                        // Never claimed before, can claim immediately
                        if (nextClaimTimeElem) {
                            nextClaimTimeElem.textContent = safeTranslate('shop.nowCanClaim');
                            nextClaimTimeElem.classList.add('available-now');
                        }
                    }
                } catch (error) {
                    debug.error('Failed to get the last claim time:', error);
                    if (nextClaimTimeElem) nextClaimTimeElem.textContent = safeTranslate('shop.failedToGet');
                }
                
                // Check if the user has already claimed the free NFT (the prerequisite for claiming PwFood)
                let hasClaimedFreeNFT = false;
                try {
                    hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
                } catch (error) {
                    debug.error('Failed to check the free NFT claim status:', error);
                }
                
                // Calculate the start time of the current UTC day
                const currentTime = Math.floor(Date.now() / 1000);
                const utcDayStart = Math.floor(currentTime / 86400) * 86400;
                
                // Check if today has claimed
                const todayClaimed = lastClaimTime >= utcDayStart;
                
                const freePwFoodButton = document.getElementById('free-pwfood-btn');
                const freePwFoodItem = document.getElementById('product-free-pwfood');
                
                if (freePwFoodButton && freePwFoodItem) {
                    // 1. If the user has not claimed the free NFT, display "Need to claim the free pet"
                    if (!hasClaimedFreeNFT) {
                        debug.log('The user has not claimed the free NFT, cannot claim the free PwFood');
                        
                        freePwFoodButton.disabled = true;
                        freePwFoodButton.classList.add('disabled');
                        freePwFoodButton.textContent = safeTranslate('shop.notification.requiredNFTFirst');
                        
                        // Add the prompt style, but do not add the already claimed style
                        freePwFoodItem.classList.add('nft-required');
                        
                        // Add the prompt label
                        if (!freePwFoodItem.querySelector('.claimed-badge')) {
                            const nftRequiredBadge = document.createElement('div');
                            nftRequiredBadge.className = 'claimed-badge';
                            nftRequiredBadge.textContent = safeTranslate('shop.notification.requiredNFTFirst');
                            freePwFoodItem.appendChild(nftRequiredBadge);
                        }
                    }
                    // 2. If today has claimed, display "Today has claimed"
                    else if (todayClaimed) {
                        debug.log('The user has claimed today, cannot claim the free PwFood');
                        
                        freePwFoodButton.disabled = true;
                        freePwFoodButton.classList.add('disabled');
                        freePwFoodButton.textContent = safeTranslate('shop.todayClaimed');
                        
                        // Add the already claimed style
                        freePwFoodItem.classList.add('already-claimed');
                        
                        // Add the already claimed badge
                        if (!freePwFoodItem.querySelector('.claimed-badge')) {
                            const claimedBadge = document.createElement('div');
                            claimedBadge.className = 'claimed-badge';
                            claimedBadge.textContent = safeTranslate('shop.todayClaimed');
                            freePwFoodItem.appendChild(claimedBadge);
                        }
                    }
                    // 3. Otherwise, can claim
                    else {
                        debug.log('The user can claim the free PwFood');
                        
                        freePwFoodButton.disabled = false;
                        freePwFoodButton.classList.remove('disabled');
                        freePwFoodButton.textContent = safeTranslate('shop.claim');
                        
                        // Remove the already claimed style
                        freePwFoodItem.classList.remove('already-claimed');
                        freePwFoodItem.classList.remove('nft-required');
                        
                        // Remove the prompt label
                        const badge = freePwFoodItem.querySelector('.claimed-badge');
                        if (badge) {
                            freePwFoodItem.removeChild(badge);
                        }
                    }
                } else {
                    debug.warn('Cannot find the free PwFood button or product element');
                }
            } catch (error) {
                debug.error('Failed to check the free PwFood claim status:', error);
            }
        }
        
        /**
         * Claim the free PwFood
         * @param {HTMLElement} button - The claim button
         */
        async function claimFreePwFood(button) {
            debug.log('Claim the free PwFood');
            
            if (!button) {
                button = document.getElementById('free-pwfood-btn');
                if (!button) {
                    debug.error('Cannot find the free PwFood button');
                    return;
                }
            }
            
            // Set the button to loading state
            const originalText = button.textContent;
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> ' + safeTranslate('claimingFood');
            
            try {
                // Check if the user has already claimed the free NFT (the prerequisite for claiming PwFood)
                const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
                
                if (!hasClaimedFreeNFT) {
                    debug.warn('The user has not claimed the free NFT, cannot claim the free PwFood');
                    showStatusMessage('requiredNFTFirst', 'warning');
                    
                    // Update the button status
                    button.textContent = safeTranslate('shop.needClaimFreePet');
                    button.classList.add('disabled');
                    
                    // Update the status display
                    checkFreePwFoodClaimStatus();
                    return;
                }
                
                // Check if today has claimed
                const lastClaimTime = await pwFoodManagerContract.methods.lastClaimTime(currentAddress).call();
                const currentTime = Math.floor(Date.now() / 1000);
                const utcDayStart = Math.floor(currentTime / 86400) * 86400;
                
                if (parseInt(lastClaimTime) >= utcDayStart) {
                    debug.warn('The user has already claimed the free PwFood today');
                    showStatusMessage('alreadyClaimedFood', 'warning');
                    
                    // Update the button status
                    button.textContent = safeTranslate('shop.todayClaimed');
                    button.classList.add('disabled');
                    
                    // Update the status display
                    checkFreePwFoodClaimStatus();
                    return;
                }
                
                debug.log('Call the contract to claim the free PwFood');
                showStatusMessage('claimingFood', 'info');
                
                // Execute the claim transaction
                // Check if using private key wallet for transactions
                const usePrivateKeyWallet = window.SecureWalletManager && 
                                           window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                
                debug.log('Claim PwFood transaction method:', usePrivateKeyWallet ? 'Private Key Wallet' : 'Connected Wallet');
                
                let result;
                
                if (usePrivateKeyWallet) {
                    // Use private key wallet for claim transaction
                    result = await window.SecureWalletManager.sendContractTransaction(
                        pwFoodManagerContract,
                        'claimFreePwFood',
                        [],
                        { gas: 500000 } // Increased gas limit for PwFood claim
                    );
                } else {
                // First try to use the class instance method
                if (typeof window.PwFoodManagerContract === 'function') {
                    debug.log('Use the class instance to claim the free PwFood');
                    try {
                        const pwFoodManager = new window.PwFoodManagerContract(web3);
                            result = await pwFoodManager.claimFreePwFood({ 
                                from: currentAddress,
                                gas: 500000 // Add gas limit for class instance method
                            });
                    } catch (error) {
                        debug.error('Use the class instance to claim the free PwFood failed, try to use the contract method:', error);
                        result = await pwFoodManagerContract.methods.claimFreePwFood().send({
                                from: currentAddress,
                                gas: 500000 // Add gas limit for contract method
                        });
                    }
                } else {
                    // Use the contract method directly
                    result = await pwFoodManagerContract.methods.claimFreePwFood().send({
                            from: currentAddress,
                            gas: 500000 // Add gas limit for direct contract method
                    });
                    }
                }
                
                debug.log('Free PwFood claim successful:', result);
                
                // Get the daily reward amount for display in the success message
                let rewardAmount = "10"; // Default value
                try {
                    rewardAmount = await pwFoodManagerContract.methods.PWFOOD_DAY_REWARD().call();
                } catch (error) {
                    debug.error('Failed to get the daily reward amount:', error);
                }
                
                // Show success modal dialog
                const modalContent = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; color: #4CAF50; margin-bottom: 15px;">
                            🎁
                        </div>
                        <h3 style="color: #4CAF50; margin-bottom: 15px;">${safeTranslate('shop.notification.claimSuccess')}</h3>
                        <p style="font-size: 16px; margin-bottom: 10px;">
                            ${safeTranslate('shop.notification.claimFreeFoodSuccessModal', { count: rewardAmount })}
                        </p>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin-top: 15px;">
                            <small style="color: #666;">
                                ${safeTranslate('shop.notification.claimFreeFoodTip')}
                            </small>
                        </div>
                    </div>
                `;
                
                ModalDialog.alert(modalContent, {
                    title: safeTranslate('shop.notification.claimSuccess'),
                    confirmText: safeTranslate('button.ok'),
                    animation: true
                });
                
                showStatusMessage('claimFoodSuccess', 'success', { count: rewardAmount });
                
                // Update the button status and the last claim time
                checkFreePwFoodClaimStatus();
                
            } catch (error) {
                debug.error('Claim the free PwFood failed:', error);
                showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
                
                // Restore the button status
                button.disabled = false;
                button.textContent = originalText;
            } finally {
                resetBuyButton(button);
            }
        }

// Make functions globally accessible for the main shop.js file
window.purchaseFood = purchaseFood;
window.checkFreePwFoodClaimStatus = checkFreePwFoodClaimStatus;
window.claimFreePwFood = claimFreePwFood;