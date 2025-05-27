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
            'claimingNFT': 'Claiming...',
            'shop.alreadyClaimed': 'Already claimed',
            'shop.claimed': 'Claimed',
            'shop.claim': 'Claim',
            'shop.notification.noClaimableEggs': 'No claimable pets',
            'shop.noClaimableEggs': 'No claimable pets',
            'shop.rareEggs': 'rare pets',
            'shop.legendaryEggs': 'legendary pets',
            'shop.confirmClaim': 'Do you want to claim these pets?',
            'shop.claimUnclaimedEggs': 'Claim Unclaimed Pets',
            'button.confirm': 'Confirm',
            'button.cancel': 'Cancel',
            'claimingEggs': 'Claiming pets...',
            'shop.notification.pendingClaimAlert': 'Pending Claim Alert',
            'shop.notification.pendingClaimAlertMessage': 'Your {eggType} purchase is successful! Your pets are being processed.',
            'shop.notification.pendingClaimAlertTip': 'Please wait a moment and then click "Claim Unclaimed Pets" to get your new pets.',
            'shop.purchaseSuccess': 'Purchase Successful!',
            'button.ok': 'OK',
            'shop.items.commonEgg': 'Common Egg',
            'shop.items.rareEgg': 'Rare Egg',
            'shop.items.legendaryEgg': 'Legendary Egg'
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
     * Claim free NFT
     * @param {HTMLElement} button - Claim button
     */
    async function claimFreeNFT(button) {
        debug.log('Claim the free NFT');
        
        if (!button) {
            button = document.getElementById('free-nft-btn');
            if (!button) {
                debug.error('Cannot find the free NFT button');
                return;
            }
        }
        
        // Set the button to loading state
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> ' + safeTranslate('claimingNFT');
        
        try {
            // Check if the user has already claimed the free NFT
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            if (hasClaimedFreeNFT) {
                debug.warn('The user has already claimed the free NFT');
                showStatusMessage('alreadyClaimedNFT', 'warning');
                
                // Update the button status
                button.textContent = safeTranslate('shop.alreadyClaimed');
                button.classList.add('disabled');
                
                // Update the status display
                checkFreeNFTClaimStatus();
                return;
            }
            
            // Get the inviter address (if any)
            let inviterAddress = '0x0000000000000000000000000000000000000000';  // Default no inviter
            
            // First try to get the inviter address from the input field
            const inviterInput = document.getElementById('inviter-address');
            if (inviterInput && inviterInput.value.trim()) {
                const inputAddress = inviterInput.value.trim();
                if (web3.utils.isAddress(inputAddress)) {
                    inviterAddress = inputAddress;
                    debug.log('Get the inviter address from the input field:', inviterAddress);
                } else {
                    debug.warn('The inviter address format is invalid:', inputAddress);
                    showStatusMessage('invalidInviterAddress', 'warning');
                }
            } else {
                // If the input field is empty, try to get it from the URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('inviter')) {
                    const urlInviter = urlParams.get('inviter');
                    if (web3.utils.isAddress(urlInviter)) {
                        inviterAddress = urlInviter;
                        debug.log('Get the inviter address from the URL:', inviterAddress);
                    }
                }
            }
            
            debug.log('Call the contract to claim the free NFT, inviter address:', inviterAddress);
            
            // Before claiming the free NFT, ensure all necessary contracts are authorized
            try {
                showStatusMessage('checkingApprovals', 'info');
                
                // Use the authorization method of ContractApprovalManager
                if (window.ContractApprovalManager && window.ContractApprovalManager.ensureFreeNFTApprovals) {
                    // Get or create PwPoint contract instance
                    let pwPointContract = null;
                    try {
                        // Try to get PwPoint contract from global variables
                        if (window.pwPointContract) {
                            pwPointContract = window.pwPointContract;
                        } else {
                            // Create PwPoint contract instance
                            const network = window.currentNetwork || 'TEST';
                            let pwPointAddress = null;
                            
                            if (window.contractAddresses && window.contractAddresses[network] && window.contractAddresses[network].PwPoint) {
                                pwPointAddress = window.contractAddresses[network].PwPoint;
                            }
                            
                            if (pwPointAddress && window.PwPointABI) {
                                pwPointContract = new web3.eth.Contract(window.PwPointABI, pwPointAddress);
                                debug.log('Created PwPoint contract instance:', pwPointAddress);
                            }
                        }
                    } catch (error) {
                        debug.error('Failed to get PwPoint contract:', error);
                    }
                    
                    const approvalsSuccess = await window.ContractApprovalManager.ensureFreeNFTApprovals(
                        web3, 
                        currentAddress,
                        pwPointContract
                    );
                    
                    if (!approvalsSuccess) {
                        throw new Error('Failed to set necessary approvals');
                    }
                    
                    debug.log('NFT necessary approvals completed');
                } else {
                    // Use the old authorization function as a fallback
                    debug.log('Try to use the old ensureFreeNFTApprovals function...');
                    if (typeof window.ensureFreeNFTApprovals === 'function') {
                        const approvalsSuccess = await window.ensureFreeNFTApprovals(web3, currentAddress);
                        if (!approvalsSuccess) {
                            throw new Error('Failed to set necessary approvals');
                        }
                    } else {
                        throw new Error('The authorization check function is not available, please ensure the correct contract initialization script is loaded');
                    }
                }
            } catch (error) {
                debug.error('Error during authorization:', error);
                if (error.message.includes('User denied transaction signature')) {
                    showStatusMessage('userCancelledAuth', 'warning');
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                } else {
                    showStatusMessage('authorizationFailed', 'error', { message: getErrorMessage(error) });
                    // Restore the button status
                    button.disabled = false;
                    button.textContent = originalText;
                    return;
                }
            }
            
            // Execute the claim transaction
            // Check if using private key wallet for transactions
            const usePrivateKeyWallet = window.SecureWalletManager && 
                                       window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
            
            debug.log('Claim transaction method:', usePrivateKeyWallet ? 'Private Key Wallet' : 'Connected Wallet');
            
            let result;
            if (usePrivateKeyWallet) {
                // Use private key wallet for claim transaction
                result = await window.SecureWalletManager.sendContractTransaction(
                    nftLotteryManagerContract,
                    'claimFreeNFT',
                    [inviterAddress],
                    { gas: 800000 } // Increased gas limit for complex contract calls
                );
            } else {
                // Use connected wallet for claim transaction
                result = await nftLotteryManagerContract.methods.claimFreeNFT(inviterAddress).send({
                    from: currentAddress,
                    gas: 800000 // Also specify gas limit for connected wallet
            });
            }
            
            debug.log('Free NFT claim successful:', result);
            showStatusMessage('claimNFTSuccess', 'success');
            
            // Update the button status
            checkFreeNFTClaimStatus();
            
        } catch (error) {
            debug.error('Free NFT claim failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // Restore the button status
            button.disabled = false;
            button.textContent = originalText;
        } finally {
            resetBuyButton(button);
        }
    }
        /**
 * Check if the user has already claimed the free NFT
 */
    async function checkFreeNFTClaimStatus() {
        try {
            debug.log('Checking the free NFT claim status');
            
            if (!nftLotteryManagerContract || !currentAddress) {
                debug.warn('The contract is not initialized or the wallet is not connected, cannot check the free NFT status');
                return;
            }
            
            const hasClaimedFreeNFT = await nftLotteryManagerContract.methods.hasClaimedFreeNFT(currentAddress).call();
            
            const freeNftButton = document.getElementById('free-nft-btn');
            const freeNftItem = document.getElementById('product-free-nft');
            
            if (freeNftButton && freeNftItem) {
                if (hasClaimedFreeNFT) {
                    debug.log('The user has already claimed the free NFT, update the UI display');
                    
                    // Disable the button
                    freeNftButton.disabled = true;
                    freeNftButton.classList.add('disabled');
                    freeNftButton.textContent = safeTranslate('shop.alreadyClaimed');
                    
                    // Add the already claimed style
                    freeNftItem.classList.add('already-claimed');
                    
                    // Add the already claimed badge
                    if (!freeNftItem.querySelector('.claimed-badge')) {
                        const claimedBadge = document.createElement('div');
                        claimedBadge.className = 'claimed-badge';
                        claimedBadge.textContent = safeTranslate('shop.claimed');
                        freeNftItem.appendChild(claimedBadge);
                    }
                } else {
                    debug.log('The user has not claimed the free NFT, the button is clickable');
                    
                    // Enable the button
                    freeNftButton.disabled = false;
                    freeNftButton.classList.remove('disabled');
                    freeNftButton.textContent = safeTranslate('shop.claim');
                    
                    // Remove the already claimed style
                    freeNftItem.classList.remove('already-claimed');
                    
                    // Remove the claimed badge
                    const claimedBadge = freeNftItem.querySelector('.claimed-badge');
                    if (claimedBadge) {
                        freeNftItem.removeChild(claimedBadge);
                    }
                }
            } else {
                debug.warn('Cannot find the free NFT button or product element');
            }
        } catch (error) {
            debug.error('Error checking the free NFT claim status:', error);
        }
    }

    /**
     * Handle lottery results
     * @param {Object} result - Lottery result data
     */
    function handleLotteryResult(result) {
        debug.log('Handling lottery result:', result);
        
        // Check if there is a lottery result
        if (!result) {
            debug.error('Invalid lottery result');
            showStatusMessage('invalidLotteryResult', 'error');
            return;
        }
        
        // Build lottery result object
        const lotteryResultData = {
            user: result.user || currentAddress,
            tokenId: result.tokenId,
            quality: result.quality,
            qualityName: result.qualityName,
            nftId: result.nftId,
            lotteryType: result.lotteryType,
            lotteryTypeName: result.lotteryTypeName
        };
        
        // Try to save result to localStorage
        try {
            localStorage.setItem('lastLotteryResult', JSON.stringify(lotteryResultData));
        } catch (error) {
            debug.error('Failed to save lottery result to localStorage:', error);
        }
        
        // Create lottery result display frame
        const resultFrame = createLotteryResultFrame();
        
        // Listen for iframe load completion event
        resultFrame.onload = function() {
            debug.log('Lottery result iframe loaded, data will be sent after it is ready');
            // Internal message communication will handle data sending, no need to handle it here
        };
        
    }
    
    /**
     * Get lottery result from transaction result
     * @param {Object} txResult - Transaction result
     */
    async function processLotteryResult(txResult) {
        debug.log('Processing transaction result to get lottery information:', txResult);
        
        try {
            if (!txResult || !txResult.transactionHash) {
                debug.error('Invalid transaction result');
                return;
            }
            
            // First try using the method of the NFTLotteryManagerContract instance
            if (nftLotteryManagerContractInstance && typeof nftLotteryManagerContractInstance.getLotteryResultFromTransaction === 'function') {
                try {
                    debug.log('Using the method of the NFTLotteryManagerContract instance to get the result...');
                    const result = await nftLotteryManagerContractInstance.getLotteryResultFromTransaction(txResult.transactionHash);
                    if (result) {
                        debug.log('Successfully got lottery result:', result);
                        handleLotteryResult(result);
                        return;
                    }
                } catch (error) {
                    debug.error('Failed to get result using the NFTLotteryManagerContract instance:', error);
                    // Continue trying other methods
                }
            }
            
            // Secondly try using the global function
            if (typeof window.getLotteryResultFromTransaction === 'function') {
                try {
                    debug.log('Using the global getLotteryResultFromTransaction function to get the result...');
                    const result = await window.getLotteryResultFromTransaction(web3, nftLotteryManagerContract, txResult.transactionHash);
                    if (result) {
                        debug.log('Successfully got lottery result:', result);
                        handleLotteryResult(result);
                        return;
                    }
                } catch (error) {
                    debug.error('Failed to get result using the global function:', error);
                    // Continue trying other methods
                }
            }
            
            // Finally try using the original method to get the result
            debug.log('Attempting to parse transaction receipt using the original method...');
            
            // Get transaction receipt
            const receipt = await web3.eth.getTransactionReceipt(txResult.transactionHash);
            if (!receipt) {
                debug.error('Failed to get transaction receipt');
                return;
            }
            
            // Define quality level mapping
            const qualityNames = {
                0: 'COMMON',  // COMMON
                1: 'GOOD',  // GOOD
                2: 'EXCELLENT',  // EXCELLENT
                3: 'RARE',  // RARE
                4: 'LEGENDARY'   // LEGENDARY
            };
            
            // Define lottery type mapping
            const lotteryTypeNames = {
                'CommonEgg': 'COMMON EGG',
                'RareEgg': 'RARE EGG',
                'LegendaryEgg': 'LEGENDARY EGG',
                'FreeNFT': '免费宠物'
            };
            
            // Get event signature from ABI
            const abi = nftLotteryManagerContract._jsonInterface;
            let nftLotteryResultEventAbi = abi.find(item => item.type === 'event' && item.name === 'NFTLotteryResult');
            let freeNFTClaimedEventAbi = abi.find(item => item.type === 'event' && item.name === 'FreeNFTClaimed');
            
            if (!nftLotteryResultEventAbi && !freeNFTClaimedEventAbi) {
                debug.error('can not find the ABI definition of NFTLotteryResult or FreeNFTClaimed event');
                return;
            }
            
            // Iterate through transaction logs
            for (const log of receipt.logs) {
                // Try to parse NFTLotteryResult event
                if (nftLotteryResultEventAbi && nftLotteryResultEventAbi.signature === log.topics[0]) {
                    try {
                        const decodedLog = web3.eth.abi.decodeLog(
                            nftLotteryResultEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: parseInt(decodedLog.quality),
                            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
                            nftId: decodedLog.nftId,
                            lotteryType: decodedLog.lotteryType,
                            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                        };
                        
                        debug.log('Successfully parsed NFTLotteryResult event:', result);
                        handleLotteryResult(result);
                        return;
                    } catch (error) {
                        debug.error('Failed to parse NFTLotteryResult event:', error);
                    }
                }
                
                // Try to parse FreeNFTClaimed event
                if (freeNFTClaimedEventAbi && freeNFTClaimedEventAbi.signature === log.topics[0]) {
                    try {
                        const decodedLog = web3.eth.abi.decodeLog(
                            freeNFTClaimedEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: 0,  // FreeNFT defaults to common quality
                            qualityName: qualityNames[0] || 'COMMON',
                            nftId: decodedLog.nftId,
                            lotteryType: 'FreeNFT',
                            lotteryTypeName: 'Free Pet'
                        };
                        
                        debug.log('Successfully parsed FreeNFTClaimed event:', result);
                        handleLotteryResult(result);
                        return;
                    } catch (error) {
                        debug.error('Failed to parse FreeNFTClaimed event:', error);
                    }
                }
            }
            
            debug.warn('can not find the lottery result event in the transaction logs');
            showStatusMessage('can not find the lottery result, please check your collection for your new pet', 'warning');
            
        } catch (error) {
            debug.error('Failed to process lottery result:', error);
            showStatusMessage('Failed to process lottery result', 'error');
        }
    }
        /**
     * Create the lottery result iframe
     * Used to display the lottery result page
     */
        function createLotteryResultFrame() {
            debug.log('Create the lottery result iframe');
            
            // Remove any existing iframe and overlay, ensuring a clean state
            const existingFrame = document.getElementById('lottery-result-frame');
            const existingOverlay = document.getElementById('lottery-result-overlay');
            
            if (existingFrame) existingFrame.remove();
            if (existingOverlay) existingOverlay.remove();
            
            // Create a new overlay
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
            
            document.body.appendChild(overlay);
            
            // Create a new iframe
            const resultFrame = document.createElement('iframe');
            resultFrame.id = 'lottery-result-frame';
            resultFrame.style.width = '90%';
            resultFrame.style.maxWidth = '450px';
            resultFrame.style.height = '600px';
            resultFrame.style.border = 'none';
            resultFrame.style.borderRadius = '12px';
            resultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            resultFrame.src = '../../webPages/other/lotteryResult.html';
            
            // Add to the overlay
            overlay.appendChild(resultFrame);
            
            // Initialize the message listener
            initLotteryResultMessageListener();
            
            // Return the created iframe element
            return resultFrame;
        }
    
        /**
         * Initialize the message listener of the lottery result iframe
         */
        function initLotteryResultMessageListener() {
            // Clear the old listener
            if (window.lotteryResultMessageHandler) {
                window.removeEventListener('message', window.lotteryResultMessageHandler);
            }
            
            // Create a new event handler
            const messageHandler = function(event) {
                if (event.data && event.data.type) {
                    debug.log('Received iframe message:', event.data);
                    
                    if (event.data.type === 'lotteryResultClosed') {
                        // Received the close message, hide the overlay
                        const overlay = document.getElementById('lottery-result-overlay');
                        if (overlay) {
                            overlay.style.display = 'none';
                            // Optional: Remove from the DOM
                            overlay.remove();
                        }
                    } else if (event.data.type === 'iframeReady') {
                        // iframe is ready, ready to send data
                        debug.log('The lottery result iframe is ready, ready to send data');
                        
                        // Find the saved lottery result data
                        const savedResult = localStorage.getItem('lastLotteryResult');
                        if (savedResult) {
                            try {
                                const resultData = JSON.parse(savedResult);
                                debug.log('Found the saved lottery result, send to the iframe:', resultData);
                                
                                const frame = document.getElementById('lottery-result-frame');
                                if (frame && frame.contentWindow) {
                                    setTimeout(() => {
                                        frame.contentWindow.postMessage({
                                            type: 'lotteryResult',
                                            data: resultData
                                        }, '*');
                                    }, 500);
                                }
                            } catch (e) {
                                debug.error('Failed to parse the saved lottery result:', e);
                            }
                        }
                    } else if (event.data.type === 'requestPetDetails' && event.data.tokenId) {
                        // iframe requests pet details
                        fetchPetDetailsForLottery(event.data.tokenId)
                            .then(petData => {
                                const frame = document.getElementById('lottery-result-frame');
                                if (frame && frame.contentWindow) {
                                    frame.contentWindow.postMessage({
                                        type: 'petDetails',
                                        tokenId: event.data.tokenId,
                                        data: petData
                                    }, '*');
                                }
                            })
                            .catch(error => {
                                debug.error('Failed to get the pet details:', error);
                            });
                    }
                }
            };
            
            // Add the event listener
            window.addEventListener('message', messageHandler);
            window.lotteryResultMessageHandler = messageHandler;
        }
            /**
     * Update the total price of the egg
     * @param {Event} event - The input event
     */
    function updateEggTotalPrice(event) {
        const input = event.target;
        const shopItem = input.closest('.shop-item');
        if (!shopItem) return;
        
        // Get the unit price element
        const priceElement = shopItem.querySelector('.item-price');
        if (!priceElement) return;
        
        // Get the total price element
        const totalPriceElement = shopItem.querySelector('.batch-total-price');
        if (!totalPriceElement) return;
        
        // Parse the unit price
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/\$(\d+(\.\d+)?)/);
        if (!priceMatch) return;
        
        const unitPrice = parseFloat(priceMatch[1]);
        
        // Get the quantity (ensure it is between 1-10)
        let quantity = parseInt(input.value) || 1;
        if (quantity < 1) {
            quantity = 1;
            input.value = 1;
        } else if (quantity > 10) {
            quantity = 10;
            input.value = 10;
        }
        
        // Calculate the total price and update
        const totalPrice = (unitPrice * quantity).toFixed(2);
        totalPriceElement.textContent = `$${totalPrice}`;
    }
        /**
     * Handle the batch lottery results
     * @param {Array<Object>} results - The batch lottery results array
     */
        function handleLotteryBatchResults(results) {
            debug.log('Handle the batch lottery results:', results);
            
            // Ensure the petName and imageUrl fields are correctly processed in the results
            const processedResults = results.map(result => {
                // Ensure all necessary fields exist
                const processed = { ...result };
                
                // Ensure the displayName field exists
                if (!processed.displayName) {
                    processed.displayName = processed.petName || `Pet #${processed.tokenId}`;
                }
                
                // Ensure the imageUrl field exists
                if (!processed.image && processed.imageUrl) {
                    processed.image = processed.imageUrl;
                }
                
                return processed;
            });
            
            // Check if there are lottery results
            if (!processedResults || !Array.isArray(processedResults) || processedResults.length === 0) {
                debug.error('Invalid batch lottery results');
                showStatusMessage('invalidLotteryResult', 'error');
                return;
            }
            
            // Try to save the results to localStorage
            try {
                localStorage.setItem('lastLotteryBatchResults', JSON.stringify(processedResults));
            } catch (error) {
                debug.error('Failed to save the batch lottery results to localStorage:', error);
            }
            
            // Use the improved overlay display method, consistent with the game mode
            try {
                // Check if the iframe and overlay exist, if not, create them
                let lotteryResultFrame = document.getElementById('lottery-result-frame');
                let overlay = document.getElementById('lottery-result-overlay');
                
                if (!overlay) {
                    // Create the overlay
                    overlay = document.createElement('div');
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
                    
                    document.body.appendChild(overlay);
                } else {
                    // If it already exists, ensure it is visible
                    overlay.style.display = 'flex';
                }
                
                if (!lotteryResultFrame) {
                    // Create the iframe
                    lotteryResultFrame = document.createElement('iframe');
                    lotteryResultFrame.id = 'lottery-result-frame';
                    lotteryResultFrame.src = '../../webPages/other/lotteryResult.html';
                    lotteryResultFrame.style.width = '90%';
                    lotteryResultFrame.style.maxWidth = '450px';
                    lotteryResultFrame.style.height = '600px';
                    lotteryResultFrame.style.border = 'none';
                    lotteryResultFrame.style.borderRadius = '12px';
                    lotteryResultFrame.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                    
                    // Add to the overlay
                    overlay.appendChild(lotteryResultFrame);
                }
                
                // Define the function to handle the iframe message
                const handleResultMessage = function(event) {
                    if (event.data && event.data.type === 'lotteryResultClosed') {
                        // Received the close message, hide the overlay
                        if (overlay) {
                            overlay.style.display = 'none';
                        }
                        // Remove the event listener, avoid duplicate listening
                        window.removeEventListener('message', handleResultMessage);
                    } else if (event.data && event.data.type === 'iframeReady') {
                        // The iframe is ready, ready to send data
                        debug.log('The lottery result iframe is ready, ready to send data');
                        
                        // Find the saved lottery result data
                        const savedResult = localStorage.getItem('lastLotteryResult');
                        if (savedResult) {
                            try {
                                const resultData = JSON.parse(savedResult);
                                debug.log('Found the saved lottery result, send to the iframe:', resultData);
                                
                                const frame = document.getElementById('lottery-result-frame');
                                if (frame && frame.contentWindow) {
                                    setTimeout(() => {
                                        frame.contentWindow.postMessage({
                                            type: 'lotteryResult',
                                            data: resultData
                                        }, '*');
                                    }, 500);
                                }
                            } catch (e) {
                                debug.error('Failed to parse the saved lottery result:', e);
                            }
                        }
                    } else if (event.data && event.data.type === 'requestPetDetails' && event.data.tokenId) {
                        // iframe requests pet details
                        fetchPetDetailsForLottery(event.data.tokenId)
                            .then(petData => {
                                const frame = document.getElementById('lottery-result-frame');
                                if (frame && frame.contentWindow) {
                                    frame.contentWindow.postMessage({
                                        type: 'petDetails',
                                        tokenId: event.data.tokenId,
                                        data: petData
                                    }, '*');
                                }
                            })
                            .catch(error => {
                                debug.error('Failed to get the pet details:', error);
                            });
                    }
                }
                
                // Clear the old listener and add the new listener
                if (window.lotteryBatchResultMessageHandler) {
                    window.removeEventListener('message', window.lotteryBatchResultMessageHandler);
                }
                window.addEventListener('message', handleResultMessage);
                window.lotteryBatchResultMessageHandler = handleResultMessage;
                
                // Listen to the iframe load completion
                lotteryResultFrame.onload = function() {
                    // Extend the waiting time, ensure the iframe internal script is fully initialized
                    setTimeout(() => {
                        try {
                            if (lotteryResultFrame.contentWindow) {
                                lotteryResultFrame.contentWindow.postMessage({
                                    type: 'lotteryBatchResults',
                                    data: processedResults
                                }, '*');
                                debug.log('The iframe onload, send the batch lottery results data');
                            } else {
                                debug.error('The iframe.contentWindow is not available');
                            }
                        } catch (error) {
                            debug.error('Failed to send the batch lottery results to the iframe:', error);
                        }
                    }, 800);
                };
                
                // If the iframe is already loaded, send the data directly
                if (lotteryResultFrame.contentWindow && lotteryResultFrame.contentDocument && 
                    lotteryResultFrame.contentDocument.readyState === 'complete') {
                    setTimeout(() => {
                        try {
                            lotteryResultFrame.contentWindow.postMessage({
                                type: 'lotteryBatchResults',
                                data: processedResults
                            }, '*');
                            debug.log('Send the batch lottery results data to the loaded iframe');
                        } catch (error) {
                            debug.error('Failed to send the batch lottery results to the iframe:', error);
                        }
                    }, 300);
                }
            } catch (error) {
                debug.error('Failed to create the batch lottery result overlay:', error);
                
                // Degrade processing: use a simple prompt
                showStatusMessage(`purchaseEggsSuccess`, 'success', { count: processedResults.length, eggName: 'pets' });
            }
        }
    
        /**
         * Check if the user has claimable NFTs
         */
        async function checkClaimableEggsStatus() {
            try {
                debug.log('Check if the user has claimable NFTs');
                
                if (!nftLotteryManagerContract || !currentAddress) {
                    debug.warn('The contract is not initialized or the wallet is not connected, cannot check the claimable NFT status');
                    return;
                }
                
                // Check if the user has claimable NFTs
                const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
                
                // Get the number of pending eggs
                let pendingRareCount = 0;
                let pendingLegendaryCount = 0;
                let pendingTotal = 0;
                
                if (hasClaimableEggs) {
                    try {
                        const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
                        pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
                        pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
                        pendingTotal = pendingRareCount + pendingLegendaryCount;
                        
                        debug.log('The number of pending eggs:', {
                            rare: pendingRareCount,
                            legendary: pendingLegendaryCount,
                            total: pendingTotal
                        });
                    } catch (error) {
                        debug.error('Failed to get the number of pending eggs:', error);
                    }
                }
                
                // Update the DOM display
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
                        debug.log('The user does not have claimable NFTs, update the UI display');
                        
                        // Disable the button
                        claimEggsButton.disabled = true;
                        claimEggsButton.classList.add('disabled');
                        claimEggsButton.textContent = safeTranslate('shop.notification.noClaimableEggs');
                        
                        // Add the already claimed style
                        claimEggsItem.classList.add('already-claimed');
                        
                        // Add the prompt label
                        if (!claimEggsItem.querySelector('.claimed-badge')) {
                            const noPendingBadge = document.createElement('div');
                            noPendingBadge.className = 'claimed-badge';
                            noPendingBadge.textContent = safeTranslate('shop.notification.noClaimableEggs');
                            claimEggsItem.appendChild(noPendingBadge);
                        }
                    } else {
                        debug.log('The user has claimable NFTs, the button is clickable');
                        
                        // Enable the button
                        claimEggsButton.disabled = false;
                        claimEggsButton.classList.remove('disabled');
                        claimEggsButton.textContent = safeTranslate('shop.claim');
                        
                        // Remove the disabled style
                        claimEggsItem.classList.remove('already-claimed');
                        
                        // Remove the prompt label
                        const noPendingBadge = claimEggsItem.querySelector('.claimed-badge');
                        if (noPendingBadge) {
                            claimEggsItem.removeChild(noPendingBadge);
                        }
                    }
                } else {
                    debug.warn('Cannot find the claimable NFT button or product element');
                }
            } catch (error) {
                debug.error('Failed to check the claimable NFT status:', error);
            }
        }
    
    /**
     * Claim the claimable NFTs
     * @param {HTMLElement} button - The claim button
     */
    async function claimEggs(button) {
        debug.log('Claim the claimable NFTs');
        
        if (!button) {
            button = document.getElementById('claim-eggs-btn');
            if (!button) {
                debug.error('Cannot find the claimable NFT button');
                return;
            }
        }

        // Prevent duplicate clicks - if the button is disabled, return directly
        if (button.disabled || button.classList.contains('processing')) {
            debug.log('The button is disabled or processing, ignore duplicate clicks');
            return;
        }

        // Mark the button as processing state
        button.disabled = true;
        button.classList.add('processing');
        
        try {
            // Check if the user has claimable NFTs
            const hasClaimableEggs = await nftLotteryManagerContract.methods.hasClaimableEggs(currentAddress).call();
            
            if (!hasClaimableEggs) {
                debug.warn('The user does not have claimable NFTs');
                showStatusMessage('noClaimableEggs', 'warning');
                
                // Update the button status
                button.textContent = safeTranslate('shop.noClaimableEggs');
                button.classList.add('disabled');
                
                // Update the status display
                checkClaimableEggsStatus();
                return;
            }
            
            // Get the number of pending eggs
            const pendingEggs = await nftLotteryManagerContract.methods.getPendingEggs(currentAddress).call();
            const pendingRareCount = parseInt(pendingEggs.rareEggs) || 0;
            const pendingLegendaryCount = parseInt(pendingEggs.legendaryEggs) || 0;
            const pendingTotal = pendingRareCount + pendingLegendaryCount;
            
            if (pendingTotal === 0) {
                debug.warn('There are no pending eggs');
                showStatusMessage('noPendingEggs', 'warning');
                return;
            }
            
            // Display the confirmation dialog
            const message = `<strong>${pendingTotal}</strong> ${safeTranslate('shop.notification.noClaimableEggs')}:<br>
                <span style="color:#03A9F4;font-weight:500;">${pendingRareCount} ${safeTranslate('shop.rareEggs')}</span><br>
                <span style="color:#FF9800;font-weight:500;">${pendingLegendaryCount} ${safeTranslate('shop.legendaryEggs')}</span><br><br>
                ${safeTranslate('shop.confirmClaim')}`;
                
            // Display the confirmation dialog
            const confirmOptions = {
                title: safeTranslate('shop.claimUnclaimedEggs'),
                confirmLabel: safeTranslate('button.confirm'),
                cancelLabel: safeTranslate('button.cancel'),
                animationEnabled: true
            };
            
            const confirmed = await ModalDialog.confirm(message, confirmOptions);
            
            if (!confirmed) {
                debug.log('The user cancelled the claim operation');
                return;
            }
            
            // Set the button to loading state
            const originalText = button.textContent;
            button.innerHTML = '<span class="loading"></span> ' + safeTranslate('claimingEggs');
            
            // Execute the claim transaction
            debug.log('Call the contract to claim the unclaimed NFTs');
            showStatusMessage('claimingEggs', 'info');
            
            // Check if using private key wallet
            const shouldUsePrivateKey = window.SecureWalletManager && 
                                       window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                       window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
            
            let result;
            if (shouldUsePrivateKey) {
                debug.log('Using private key wallet for claiming eggs');
                
                // Use SecureWalletManager for private key transactions
                result = await window.SecureWalletManager.sendContractTransaction(
                    nftLotteryManagerContract,
                    'claimEggs',
                    [],
                    {
                        gas: 1000000 + (pendingTotal * 600000) // Use the contract base gas limit + 600,000 gas for each NFT
                    }
                );
            } else {
                debug.log('Using connected wallet for claiming eggs');
                
                result = await nftLotteryManagerContract.methods.claimEggs().send({
                from: currentAddress,
                gas: 1000000 + (pendingTotal * 600000) // Use the contract base gas limit + enough gas for each NFT
            });
            }
            
            debug.log('The unclaimed NFTs claim successfully:', result);
            showStatusMessage('claimEggsSuccess', 'success', { count: pendingTotal });
            
            // Get the lottery results from the transaction
            try {
                // Use the lotteryResultParser to parse the lottery results
                if (typeof window.getLotteryResultsFromTransaction === 'function') {
                    const txHash = result.transactionHash;
                    
                    // Load the lotteryResult module
                    let lotteryResults = await window.getLotteryResultsFromTransaction(
                        web3,
                        nftLotteryManagerContract,
                        txHash,
                        pendingTotal
                    );
                    
                    debug.log('The lottery results from the transaction:', lotteryResults);
                    
                    // Ensure the NFTManager contract is initialized
                    if (!nftManagerContract) {
                        debug.log('The NFTManager contract is not initialized, try to initialize it');
                        
                        // Try to use the global initialization function
                        if (typeof window.initNFTManagerContract === 'function') {
                            const getContractAddressFunc = window.getContractAddress || function(name) {
                                const network = window.currentNetwork || 'LOCAL';
                                if (window.contractAddresses && window.contractAddresses[network]) {
                                    return window.contractAddresses[network][name];
                                }
                                return null;
                            };
                            nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                        } else if (typeof window.shopInitNFTManagerContract === 'function') {
                            nftManagerContract = window.shopInitNFTManagerContract();
                        }
                        
                        // Wait a moment to ensure the initialization is complete
                        if (nftManagerContract) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    
                    // Filter and normalize the results, and get the real pet name and image
                    if (lotteryResults && lotteryResults.length > 0) {
                        // Add the necessary properties and get the detailed information for each result
                        lotteryResults = await Promise.all(
                            lotteryResults.map(async (item) => {
                                // Ensure the basic properties
                                if (!item.qualityName && item.quality !== undefined) {
                                    const qualityNames = {
                                        0: 'COMMON',
                                        1: 'GOOD',
                                        2: 'EXCELLENT', 
                                        3: 'RARE',
                                        4: 'LEGENDARY'
                                    };
                                    item.qualityName = qualityNames[item.quality] || 'Unknown';
                                }
                                
                                if (!item.lotteryTypeName && item.lotteryType) {
                                    const lotteryTypeNames = {
                                        'CommonEgg': 'COMMON EGG',
                                        'RareEgg': 'RARE EGG',
                                        'LegendaryEgg': 'LEGENDARY EGG',
                                        'FreeNFT': 'Free Pet',
                                        'ClaimEgg': 'Claim Pet'
                                    };
                                    item.lotteryTypeName = lotteryTypeNames[item.lotteryType] || item.lotteryType;
                                }
                                
                                // Add the user address (if not exists)
                                if (!item.user) {
                                    item.user = currentAddress;
                                }
                                
                                try {
                                    // If the NFTManager contract is initialized, get the pet details information
                                    if (nftManagerContract && item.tokenId) {
                                        // Get the pet URI
                                        try {
                                            const tokenURI = await nftManagerContract.methods._tokenURIs(item.tokenId).call();
                                            item.tokenURI = tokenURI;
                                            
                                            // Get the pet quality and quality ID
                                            const quality = await nftManagerContract.methods.tokenQuality(item.tokenId).call();
                                            const qualityId = await nftManagerContract.methods.tokenQualityId(item.tokenId).call();
                                            
                                            // Get the NFT information using the quality and quality ID
                                            const nftInfo = await nftManagerContract.methods.nfts(quality, qualityId).call();
                                            if (nftInfo && nftInfo.name) {
                                                item.petName = `Pet #${nftInfo.name}`;
                                            }
                                            
                                            // Get the pet image URL
                                            if (tokenURI) {
                                                if (tokenURI.startsWith('data:application/json;base64,')) {
                                                    // Parse the Base64 encoded metadata
                                                    const base64Data = tokenURI.replace('data:application/json;base64,', '');
                                                    const jsonString = atob(base64Data);
                                                    const metadata = JSON.parse(jsonString);
                                                    
                                                    if (metadata.image) {
                                                        item.imageUrl = metadata.image;
                                                    }
                                                    if (metadata.name) {
                                                        item.petName = metadata.name;
                                                    }
                                                } else if (tokenURI.startsWith('http')) {
                                                    // Try to get the metadata from the HTTP URL
                                                    try {
                                                        const response = await fetch(tokenURI);
                                                        const metadata = await response.json();
                                                        
                                                        if (metadata.image) {
                                                            item.imageUrl = metadata.image;
                                                        }
                                                        if (metadata.name) {
                                                            item.petName = metadata.name;
                                                        }
                                                    } catch (e) {
                                                        debug.error('Failed to get the pet metadata:', e);
                                                    }
                                                }
                                            }
                                        } catch (error) {
                                            debug.error('Failed to get the pet URI:', error);
                                        }
                                    }
                                    
                                } catch (error) {
                                    debug.error('get pet details failed:', error);
                                }
                                
                                return item;
                            })
                        );
                        
                        debug.log('processed lottery results:', lotteryResults);
                        
                        // directly use handleLotteryBatchResults to display the results
                        handleLotteryBatchResults(lotteryResults);
                    } else {
                        // no valid lottery results found, show a simple success message
                        debug.warn('no valid lottery results found');
                        showStatusMessage('claimSuccess', 'success');
                    }
                } else {
                    debug.warn('getLotteryResultsFromTransaction function is not defined');
                    showStatusMessage('claimSuccess', 'success');
                }
            } catch (parseError) {
                debug.error('parse lottery results failed:', parseError);
                showStatusMessage('claimFailed', 'error', { message: getErrorMessage(parseError) });
            }
            
            // update the button status
            checkClaimableEggsStatus();
            
        } catch (error) {
            debug.error('claim unclaimed NFTs failed:', error);
            showStatusMessage('claimFailed', 'error', { message: getErrorMessage(error) });
            
            // restore the button status
            button.disabled = false;
            button.textContent = safeTranslate('shop.claim');
        } finally {
            resetBuyButton(button);
        }
    }
        /**
     * get multiple lottery results from the transaction
     * @param {Object} web3 - Web3 instance
     * @param {Object} contract - contract instance
     * @param {string} txHash - transaction hash
     * @param {number} expectedCount - expected result count
     * @returns {Promise<Array<Object>|null>} lottery results array or null (if no event found)
     */
        window.getLotteryResultsFromTransaction = async function(web3, contract, txHash, expectedCount = 1) {
            if (!txHash) {
                console.error('get lottery results failed: transaction hash is empty');
                return null;
            }
            
            try {
                console.log(`get multiple lottery results from the transaction ${txHash} (expected count: ${expectedCount})...`);
                
                // get the transaction receipt
                const receipt = await web3.eth.getTransactionReceipt(txHash);
                if (!receipt) {
                    console.error('get transaction receipt failed');
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
                    'FreeNFT': 'Free Pet'
                };
                
                // find the event signature
                const lotteryResultEventAbi = contract._jsonInterface.find(
                    abi => abi.type === 'event' && abi.name === 'NFTLotteryResult'
                );
                
                const freeNFTEventAbi = contract._jsonInterface.find(
                    abi => abi.type === 'event' && abi.name === 'FreeNFTClaimed'
                );
                
                
                if (!lotteryResultEventAbi && !freeNFTEventAbi) {
                    console.error('NFTLotteryResult/FreeNFTClaimed event not found in the contract ABI');
                    return null;
                }
                
                // store the found results
                const results = [];
                
                // find the event in the logs
                for (const log of receipt.logs) {
                    // check if it matches the NFTLotteryResult event
                    if (lotteryResultEventAbi && log.topics[0] === lotteryResultEventAbi.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            lotteryResultEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: parseInt(decodedLog.quality),
                            qualityName: qualityNames[parseInt(decodedLog.quality)] || 'Unknown',
                            nftId: decodedLog.nftId,
                            lotteryType: decodedLog.lotteryType,
                            lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || decodedLog.lotteryType
                        };
                        
                        results.push(result);
                        console.log('add the result from the NFTLotteryResult event:', result);
                    }
                    // check if it matches the FreeNFTClaimed event
                    else if (freeNFTEventAbi && log.topics[0] === freeNFTEventAbi.signature) {
                        const decodedLog = web3.eth.abi.decodeLog(
                            freeNFTEventAbi.inputs,
                            log.data,
                            log.topics.slice(1)
                        );
                        
                        // build the result object
                        const result = {
                            user: decodedLog.user,
                            tokenId: decodedLog.tokenId,
                            quality: 0, // free NFT is common quality
                            qualityName: 'COMMON',
                            nftId: decodedLog.nftId,
                            lotteryType: 'FreeNFT',
                            lotteryTypeName: 'Free Pet'
                        };
                        
                        results.push(result);
                        console.log('add the result from the FreeNFTClaimed event:', result);
                    }
                }
                
                // check if the result count matches the expected count
                console.log(`found ${results.length} lottery results in the transaction ${txHash}, expected ${expectedCount} results`);
                
                // validate the results and check for duplicates
                if (results.length > 0) {
                    // remove duplicate results (same tokenId)
                    const uniqueResults = [];
                    const seenTokenIds = new Set();
                    
                    for (const result of results) {
                        // only process the real tokenId (not 0 or undefined)
                        if (result.tokenId && result.tokenId !== '0') {
                            if (!seenTokenIds.has(result.tokenId)) {
                                seenTokenIds.add(result.tokenId);
                                uniqueResults.push(result);
                            } else {
                                console.log(`ignore the duplicate tokenId: ${result.tokenId}`);
                            }
                        } else {
                            // unprocessed temporary event, assume it will not be repeated
                            uniqueResults.push(result);
                        }
                    }
                    
                    console.log(`after filtering, there are ${uniqueResults.length} unique lottery results`);
                    return uniqueResults;
                }
                
                console.warn('no valid lottery results found');
                return null;
            } catch (error) {
                console.error('get lottery results failed:', error);
                return null;
            }
        };
        
            /**
     * get the pet details for the lottery result display
     * @param {string|number} tokenId - the tokenId of the pet
     * @returns {Promise<Object>} the pet details object
     */
    async function fetchPetDetailsForLottery(tokenId) {
        debug.log('fetching the pet details:', tokenId);
        
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
                
                // Try to use the global initialization function
                if (typeof window.initNFTManagerContract === 'function') {
                    const getContractAddressFunc = window.getContractAddress || function(name) {
                        const network = window.currentNetwork || 'LOCAL';
                        if (window.contractAddresses && window.contractAddresses[network]) {
                            return window.contractAddresses[network][name];
                        }
                        return null;
                    };
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                } else if (typeof window.shopInitNFTManagerContract === 'function') {
                    nftManagerContract = window.shopInitNFTManagerContract();
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
                    debug.log('use _tokenURIs to get the pet URI:', tokenURI);
                } else if (typeof nftManagerContract.methods.tokenURI === 'function') {
                    tokenURI = await nftManagerContract.methods.tokenURI(tokenId).call();
                    debug.log('use tokenURI to get the pet URI:', tokenURI);
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
                        
                        debug.log('successfully get the pet details:', petData);
                    }
                } catch (metadataError) {
                    debug.error('failed to parse the metadata:', metadataError);
                }
            }
            
            // try to get the quality information (if not yet obtained)
            if (!petData.quality) {
                try {
                    if (typeof nftManagerContract.methods.tokenQualityId === 'function') {
                        const qualityId = await nftManagerContract.methods.tokenQualityId(tokenId).call();
                        debug.log('get the pet quality ID:', qualityId);
                        
                        // convert the quality ID to the name
                        const qualityNames = ['common', 'good', 'rare', 'epic', 'legendary'];
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
        /**
     * Update the total price of the egg
     * @param {Event} event - The input event
     */
        function updateEggTotalPrice(event) {
            const input = event.target;
            const shopItem = input.closest('.shop-item');
            if (!shopItem) return;
            
            // Get the unit price element
            const priceElement = shopItem.querySelector('.item-price');
            if (!priceElement) return;
            
            // Get the total price element
            const totalPriceElement = shopItem.querySelector('.batch-total-price');
            if (!totalPriceElement) return;
            
            // Parse the unit price
            const priceText = priceElement.textContent;
            const priceMatch = priceText.match(/\$(\d+(\.\d+)?)/);
            if (!priceMatch) return;
            
            const unitPrice = parseFloat(priceMatch[1]);
            
            // Get the quantity (ensure it is between 1-5)
            let quantity = parseInt(input.value) || 1;
            if (quantity < 1) {
                quantity = 1;
                input.value = 1;
            } else if (quantity > 5) {
                quantity = 5;
                input.value = 5;
            }
            
            // Calculate the total price and update
            const totalPrice = (unitPrice * quantity).toFixed(2);
            totalPriceElement.textContent = `$${totalPrice}`;
        }
            /**
     * show the pending claim pets alert dialog
     * @param {string} eggType - the type name of the egg
     */
    function showPendingEggAlert(eggType) {
        try {
            const confirmContent = `
                <div style="padding: 10px 0;">
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-info-circle" style="color: #03A9F4; font-size: 24px; margin-right: 10px;"></i>
                        <span style="font-size: 18px; font-weight: bold;">${safeTranslate('shop.notification.pendingClaimAlert')}</span>
                    </div>
                    <p>${safeTranslate('shop.notification.pendingClaimAlertMessage', { eggType: eggType })}</p>
                    <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; border-left: 4px solid #03A9F4;">
                        <p style="margin: 0;">${safeTranslate('shop.notification.pendingClaimAlertTip')}</p>
                    </div>
                </div>
            `;
            
            const confirmOptions = {
                title: safeTranslate('shop.purchaseSuccess'),
                confirmText: safeTranslate('button.ok'),
                cancelText: null, // 不显示取消按钮
                animation: true
            };
            
            ModalDialog.confirm(confirmContent, confirmOptions);
        } catch (error) {
            debug.error('show the pending claim pets alert dialog failed:', error);
            
            // fallback to the simple alert dialog
            const fallbackTitle = safeTranslate('shop.notification.pendingClaimAlert');
            const fallbackMessage = safeTranslate('shop.notification.pendingClaimAlertMessage', { eggType: eggType });
            
            // create the alert dialog container
            const fallbackOverlay = document.createElement('div');
            fallbackOverlay.className = 'simple-alert-overlay';
            
            // create the alert dialog content
            const fallbackBox = document.createElement('div');
            fallbackBox.className = 'simple-alert-box';
            
            // add the title
            const fallbackTitleElement = document.createElement('h3');
            fallbackTitleElement.textContent = fallbackTitle;
            fallbackBox.appendChild(fallbackTitleElement);
            
            // add the message content
            const fallbackMessageElement = document.createElement('p');
            fallbackMessageElement.innerHTML = fallbackMessage;
            fallbackBox.appendChild(fallbackMessageElement);
            
            // add the confirm button
            const fallbackButton = document.createElement('button');
            fallbackButton.textContent = safeTranslate('button.ok');
            fallbackButton.className = 'simple-alert-button';
            fallbackButton.onclick = function() {
                document.body.removeChild(fallbackOverlay);
            };
            fallbackBox.appendChild(fallbackButton);
            
            // add the alert dialog to the page
            fallbackOverlay.appendChild(fallbackBox);
            document.body.appendChild(fallbackOverlay);
            
            // auto focus the confirm button
            fallbackButton.focus();
        }
    }

    
    /**
     * update the NFT remaining quantity
     */
    function updateNFTRemaining() {
        debug.log('update the NFT remaining quantity...');
        
        if (!web3 || !nftManagerContract) {
            debug.warn('Web3 or NFTManager contract not initialized, cannot get the NFT remaining quantity');
            // retry after 3 seconds
            setTimeout(updateNFTRemaining, 3000);
            return;
        }
        
        // check if NFTManagerABI is loaded
        if (!window.NFTManagerABI) {
            debug.error('NFTManagerABI not loaded, try to load the ABI file');
            loadNFTManagerABI();
            setTimeout(updateNFTRemaining, 2000);
            return;
        }
        
        try {
            // first check if the contract methods are available
            if (!nftManagerContract.methods) {
                debug.error('NFTManager contract methods not available');
                // try to reinitialize the contract
                if (typeof window.initNFTManagerContract === 'function') {
                    const getContractAddressFunc = window.getContractAddress || function(name) {
                        const network = window.currentNetwork || 'LOCAL';
                        if (window.contractAddresses && window.contractAddresses[network]) {
                            return window.contractAddresses[network][name];
                        }
                        return null;
                    };
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                } else if (typeof window.shopInitNFTManagerContract === 'function') {
                    nftManagerContract = window.shopInitNFTManagerContract();
                }
                setTimeout(updateNFTRemaining, 2000);
                return;
            }
            
            // check if the contract has the totalRareRemaining method
            if (typeof nftManagerContract.methods.totalRareRemaining !== 'function') {
                debug.error('NFTManager contract does not have the totalRareRemaining method');
                
                // update the UI to show 'unavailable'
                const rareRemainingElement = document.getElementById('rare-remaining-count');
                const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                if (rareRemainingElement) rareRemainingElement.textContent = 'unavailable';
                if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'unavailable';
                
                return;
            }
            
            // get the remaining quantity of rare NFTs
            nftManagerContract.methods.totalRareRemaining().call()
                .then(rareRemaining => {
                    debug.log('remaining quantity of rare NFTs:', rareRemaining);
                    
                    // update the UI
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = rareRemaining;
                    }
                })
                .catch(error => {
                    debug.error('get the remaining quantity of rare NFTs failed:', error);
                    
                    // update the UI to show the error status
                    const rareRemainingElement = document.getElementById('rare-remaining-count');
                    if (rareRemainingElement) {
                        rareRemainingElement.textContent = 'error';
                    }
                });
                
            // get the remaining quantity of legendary NFTs
            nftManagerContract.methods.totalLegendaryRemaining().call()
                .then(legendaryRemaining => {
                    debug.log('remaining quantity of legendary NFTs:', legendaryRemaining);
                    
                    // update the UI
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = legendaryRemaining;
                    }
                })
                .catch(error => {
                    debug.error('get the remaining quantity of legendary NFTs failed:', error);
                    
                    // update the UI to show the error status
                    const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
                    if (legendaryRemainingElement) {
                        legendaryRemainingElement.textContent = 'error';
                    }
                });
        } catch (error) {
            debug.error('error when updating the NFT remaining quantity:', error);
            
            // update the UI to show the error status
            const rareRemainingElement = document.getElementById('rare-remaining-count');
            const legendaryRemainingElement = document.getElementById('legendary-remaining-count');
            if (rareRemainingElement) rareRemainingElement.textContent = 'error';
            if (legendaryRemainingElement) legendaryRemainingElement.textContent = 'error';
        }
    }
        /**
     * Purchase pet eggs
     * @param {number} tokenId - Egg type ID (1: common, 2: rare, 3: legendary)
     * @param {string} paymentToken - Payment token
     * @param {HTMLElement} buyButton - Buy button
     */
        async function purchaseEgg(tokenId, paymentToken, buyButton) {
            debug.log('Purchase pet eggs:', { tokenId, paymentToken });
            
            if (!web3 || !currentAddress) {
                debug.error('Purchase failed: Web3 not initialized or wallet not connected');
                resetBuyButton(buyButton);
                return;
            }
            
            try {
                // Set different names and prices based on egg type
                let eggName = '';
                let eggPrice = '';
                let eggImage = '';
                let contractMethod = '';
                let batchMethod = '';
                let batchAmountInput = null;
                
                switch(tokenId) {
                    case 1:
                        eggName = i18n && typeof i18n.t === 'function' ? safeTranslate('shop.items.commonEgg') : 'Common Egg';
                        eggPrice = '9.9';
                        eggImage = '../../resources/images/items/egg-common.png';
                        contractMethod = 'openCommonEgg';
                        batchMethod = 'batchOpenCommonEgg';
                        batchAmountInput = document.getElementById('common-egg-amount');
                        break;
                    case 2:
                        eggName = i18n && typeof i18n.t === 'function' ? safeTranslate('shop.items.rareEgg') : 'Rare Egg';
                        eggPrice = '99';
                        eggImage = '../../resources/images/items/egg-rare.png';
                        contractMethod = 'openRareEgg';
                        batchMethod = 'batchOpenRareEgg';
                        batchAmountInput = document.getElementById('rare-egg-amount');
                        break;
                    case 3:
                        eggName = i18n && typeof i18n.t === 'function' ? safeTranslate('shop.items.legendaryEgg') : 'Legendary Egg';
                        eggPrice = '599';
                        eggImage = '../../resources/images/items/egg-legendary.png';
                        contractMethod = 'openLegendaryEgg';
                        batchMethod = 'batchOpenLegendaryEgg';
                        batchAmountInput = document.getElementById('legendary-egg-amount');
                        break;
                    default:
                        eggName = 'Pet Egg';
                        eggPrice = '10';
                        eggImage = '../../resources/images/items/egg-common.png';
                        contractMethod = 'openCommonEgg';
                        batchMethod = 'batchOpenCommonEgg';
                }
                
                // Get batch purchase quantity
                let batchCount = 1;
                if (batchAmountInput) {
                    batchCount = parseInt(batchAmountInput.value) || 1;
                    if (batchCount < 1) batchCount = 1;
                    if (batchCount > 5) batchCount = 5;
                }
                
                // Calculate total price
                const totalPrice = (parseFloat(eggPrice) * batchCount).toFixed(2);
                
                // Create payment info object
                const paymentInfo = {
                    itemType: "egg", 
                    itemName: batchCount > 1 ? `${eggName} x${batchCount}` : eggName,
                    itemPrice: totalPrice,
                    itemId: tokenId,
                    itemImage: eggImage,
                    contractFunction: batchCount > 1 ? batchMethod : contractMethod,
                    batchCount: batchCount
                };
                
                // Open payment confirmation page
                openPaymentConfirmation(paymentInfo, async () => {
                    // When user confirms payment
                    debug.log('User confirmed payment, starting to purchase eggs', { tokenId, batchCount });
                    
                    try {
                        // Get payment token
                        let payToken = null;
                        
                        // First try using the initialized USDT contract
                        if (tokenContracts.USDT && tokenContracts.USDT._address) {
                            debug.log("Using initialized USDT token");
                            payToken = tokenContracts.USDT._address;
                        } 
                        // Then try to get from supportedTokens
                        else if (window.SUPPORTED_PAYMENT_TOKENS && window.SUPPORTED_PAYMENT_TOKENS.length > 0) {
                            // Find default token or first token
                            const defaultToken = window.SUPPORTED_PAYMENT_TOKENS.find(t => t.isDefault) || window.SUPPORTED_PAYMENT_TOKENS[0];
                            debug.log("Get token from SUPPORTED_PAYMENT_TOKENS:", defaultToken);
                            
                            if (defaultToken && defaultToken.contractAddress) {
                                payToken = defaultToken.contractAddress;
                                
                                // If the contract hasn't been initialized yet, initialize it
                                if (!tokenContracts[defaultToken.id] && typeof window.initERC20Contract === 'function') {
                                    debug.log(`Initializing ${defaultToken.name} contract...`);
                                    try {
                                        tokenContracts[defaultToken.id] = window.initERC20Contract(web3, defaultToken.contractAddress);
                                        debug.log(`${defaultToken.name} contract initialized successfully`);
                                    } catch (err) {
                                        debug.error(`Failed to initialize ${defaultToken.name} contract:`, err);
                                    }
                                }
                            }
                        }
                        else {
                            debug.log("Using default USDT address");
                            payToken = '0x55d398326f99059ff775485246999027b3197955'; 
                            
                            // Ensure the USDT ERC20 contract is initialized
                            if (!tokenContracts.USDT && typeof window.initERC20Contract === 'function') {
                                tokenContracts.USDT = window.initERC20Contract(web3, payToken);
                            }
                        }
                        
                        if (!payToken) {
                            throw new Error('Payment token not initialized');
                        }
                        
                        debug.log("Using payment token address:", payToken);
                        
                        // Find or create token contract instance
                        let tokenContract = null;
                        const tokenId = Object.keys(tokenContracts).find(key => 
                            tokenContracts[key] && tokenContracts[key]._address && 
                            tokenContracts[key]._address.toLowerCase() === payToken.toLowerCase()
                        );
                        
                        if (tokenId && tokenContracts[tokenId]) {
                            debug.log(`Using initialized ${tokenId} contract instance`);
                            tokenContract = tokenContracts[tokenId];
                        } else if (typeof window.initERC20Contract === 'function') {
                            debug.log("Creating new ERC20 contract instance");
                            tokenContract = window.initERC20Contract(web3, payToken);
                        } else if (window.GENERIC_ERC20_ABI) {
                            debug.log("Creating new ERC20 contract instance with generic ABI");
                            tokenContract = new web3.eth.Contract(window.GENERIC_ERC20_ABI, payToken);
                        }
                        
                        if (!tokenContract) {
                            throw new Error('Failed to create token contract instance');
                        }
                        
                        // Get single price (convert to wei units)
                        const priceInWei = web3.utils.toWei(eggPrice, 'ether');
                        // Calculate total price (use for batch purchases)
                        const totalPriceInWei = web3.utils.toWei(totalPrice.toString(), 'ether');
                        
                        debug.log('Egg price (wei):', priceInWei, 'Total price (wei):', totalPriceInWei);
                        
                        // Check token approval
                        debug.log('Checking token approval...');
                        
                        // Use ContractApprovalManager's authorization method
                        if (window.ContractApprovalManager && window.ContractApprovalManager.checkIfApprovalNeeded) {
                            try {
                                // Check approval status (use total price)
                                const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                    tokenContract,
                                    currentAddress,
                                    nftLotteryManagerContract._address,
                                    totalPriceInWei
                                );
                                
                                if (approvalStatus.needsApproval) {
                                    debug.log('Need to approve token:', approvalStatus);
                                    showStatusMessage('requestingApproval', 'info');
                                    
                                    // Execute authorization
                                    const approveResult = await window.ContractApprovalManager.approveERC20Token(
                                        tokenContract,
                                        nftLotteryManagerContract._address,
                                        totalPriceInWei,
                                        currentAddress,
                                        true // Use maximum approval limit
                                    );
                                    
                                    if (!approveResult.success) {
                                        throw new Error('Token authorization failed: ' + (approveResult.error || 'Unknown error'));
                                    }
                                    
                                    debug.log('Token authorization successful');
                                } else {
                                    debug.log('Token has enough authorization');
                                }
                            } catch (error) {
                                debug.error('Error checking approval or authorization:', error);
                                throw new Error('Failed to authorize token: ' + getErrorMessage(error));
                            }
                        } else {
                            // Use old method as fallback
                            const approved = await checkAndApproveToken(tokenContract, nftLotteryManagerContract._address, totalPriceInWei);
                            if (!approved) {
                                throw new Error('Token authorization failed');
                            }
                        }
                        
                        // Check and set authorization for the contract
                        debug.log('Checking and setting contract authorization...');
                        if (window.ContractApprovalManager && window.ContractApprovalManager.setupEggApprovals) {
                            try {
                                const allApproved = await window.ContractApprovalManager.setupEggApprovals(
                                    web3, 
                                    currentAddress, 
                                    tokenContract,
                                    totalPriceInWei
                                );
                                
                                if (!allApproved) {
                                    throw new Error('Failed to authorize contract');
                                }
                                
                                debug.log('All necessary contract authorizations completed');
                            } catch (error) {
                                debug.error('Failed to set contract authorization:', error);
                                throw new Error('Failed to set contract authorization: ' + getErrorMessage(error));
                            }
                        } else if (typeof window.setupRequiredApprovals === 'function') {
                            // Use old method as fallback
                            const allApproved = await window.setupRequiredApprovals(
                                web3, 
                                currentAddress, 
                                tokenContract, 
                                totalPriceInWei
                            );
                            
                            if (!allApproved) {
                                throw new Error('Failed to authorize contract');
                            }
                        } else {
                            debug.warn('Authorization setup function not available, skipping NFTManager and other contract authorizations');
                        }
                        
                        // based on whether it's a single or batch purchase
                        let result;
                        let statusMessage = batchCount > 1 ? 
                            `purchasingEggs` : 
                            `purchasingEggs`;
                        
                        showStatusMessage(statusMessage, 'info', { eggName: eggName });
                        debug.log('Token authorized, starting to purchase eggs, token address:', payToken, 'batch quantity:', batchCount);
                        
                        // Check if using private key wallet for transactions
                        const usePrivateKeyWallet = window.SecureWalletManager && 
                                                   window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
                        
                        debug.log('Transaction method:', usePrivateKeyWallet ? 'Private Key Wallet' : 'Connected Wallet');
                        
                        if (batchCount > 1) {
                            // Batch purchase
                            if (usePrivateKeyWallet) {
                                // Use private key wallet for batch transactions
                                switch(batchMethod) {
                                    case 'batchOpenCommonEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'batchOpenCommonEgg',
                                            [payToken, batchCount],
                                            { gas: 1000000 + (batchCount * 500000) }
                                        );
                                        break;
                                    case 'batchOpenRareEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'batchOpenRareEgg',
                                            [payToken, batchCount],
                                            { gas: 1000000 + (batchCount * 600000) }
                                        );
                                        break;
                                    case 'batchOpenLegendaryEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'batchOpenLegendaryEgg',
                                            [payToken, batchCount],
                                            { gas: 1000000 + (batchCount * 600000) }
                                        );
                                        break;
                                    default:
                                        throw new Error('Unknown batch purchase method');
                                }
                            } else {
                                // Use connected wallet for batch transactions
                            switch(batchMethod) {
                                case 'batchOpenCommonEgg':
                                    result = await nftLotteryManagerContract.methods.batchOpenCommonEgg(payToken, batchCount).send({ 
                                        from: currentAddress,
                                        gas: 1000000 + (batchCount * 500000) // Adjust gas limit dynamically based on quantity
                                    });
                                    break;
                                case 'batchOpenRareEgg':
                                    result = await nftLotteryManagerContract.methods.batchOpenRareEgg(payToken, batchCount).send({ 
                                        from: currentAddress,
                                        gas: 1000000 + (batchCount * 600000) // Adjust gas limit dynamically based on quantity
                                    });
                                    break;
                                case 'batchOpenLegendaryEgg':
                                    result = await nftLotteryManagerContract.methods.batchOpenLegendaryEgg(payToken, batchCount).send({ 
                                        from: currentAddress,
                                        gas: 1000000 + (batchCount * 600000) // Adjust gas limit dynamically based on quantity
                                    });
                                    break;
                                default:
                                    throw new Error('Unknown batch purchase method');
                                }
                            }
                        } else {
                            // Single purchase
                            if (usePrivateKeyWallet) {
                                // Use private key wallet for single transactions
                                switch(contractMethod) {
                                    case 'openCommonEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'openCommonEgg',
                                            [payToken],
                                            { gas: 1000000 }
                                        );
                                        break;
                                    case 'openRareEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'openRareEgg',
                                            [payToken],
                                            { gas: 1000000 }
                                        );
                                        break;
                                    case 'openLegendaryEgg':
                                        result = await window.SecureWalletManager.sendContractTransaction(
                                            nftLotteryManagerContract,
                                            'openLegendaryEgg',
                                            [payToken],
                                            { gas: 1000000 }
                                        );
                                        break;
                                    default:
                                        throw new Error('Unknown egg type');
                                }
                            } else {
                                // Use connected wallet for single transactions
                            switch(contractMethod) {
                                case 'openCommonEgg':
                                    result = await nftLotteryManagerContract.methods.openCommonEgg(payToken).send({ 
                                        from: currentAddress,
                                        gas: 1000000 // Set enough gas limit
                                    });
                                    break;
                                case 'openRareEgg':
                                    result = await nftLotteryManagerContract.methods.openRareEgg(payToken).send({ 
                                        from: currentAddress,
                                        gas: 1000000 // Set higher gas limit for VRF request
                                    });
                                    break;
                                case 'openLegendaryEgg':
                                    result = await nftLotteryManagerContract.methods.openLegendaryEgg(payToken).send({ 
                                        from: currentAddress,
                                        gas: 1000000 // Set higher gas limit for VRF request
                                    });
                                    break;
                                default:
                                    throw new Error('Unknown egg type');
                                }
                            }
                        }
                        
                        debug.log('Purchase egg transaction successful:', result);
                        
                        let successMessage = batchCount > 1 ? 
                            `purchaseEggsSuccess` : 
                            `purchaseEggsSuccess`;
                        
                        showStatusMessage(successMessage, 'success', { count: batchCount, eggName: eggName });
                        
                        // Get lottery result from transaction
                        if (result && result.transactionHash) {
                            try {
                                // Save transaction hash
                                localStorage.setItem('lastEggTxHash', result.transactionHash);
                                
                                // Rare and legendary eggs need to display waiting prompts (because they need to be claimed through claimEggs)
                                if ((contractMethod === 'openRareEgg' || contractMethod === 'openLegendaryEgg' || 
                                    batchMethod === 'batchOpenRareEgg' || batchMethod === 'batchOpenLegendaryEgg') && 
                                    typeof showPendingEggAlert === 'function') {
                                    showPendingEggAlert(eggName);
                                }
                                
                                // Based on whether it's a batch purchase, call different methods to get results
                                if (batchCount > 1) {
                                    // Try to get batch lottery results
                                    if (typeof window.getLotteryResultsFromTransaction === 'function') {
                                        debug.log('Attempting to get batch lottery results from transaction...');
                                        const batchResults = await window.getLotteryResultsFromTransaction(
                                            web3, 
                                            nftLotteryManagerContract, 
                                            result.transactionHash, 
                                            batchCount
                                        );
                                        
                                        if (batchResults && Array.isArray(batchResults) && batchResults.length > 0) {
                                            debug.log('Successfully got batch lottery results:', batchResults);
                                            
                                            // Only common eggs display batch lottery results, rare and legendary eggs already have pending prompts
                                            if (batchMethod === 'batchOpenCommonEgg') {
                                                // Call new function to handle batch lottery results
                                                handleLotteryBatchResults(batchResults);
                                            }
                                        } else {
                                            debug.warn('Failed to get batch lottery results or results are empty');
                                            showStatusMessage('purchaseNoLotteryResult', 'success');
                                        }
                                    } else {
                                        debug.warn('Batch lottery result retrieval method not available');
                                        showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                    }
                                } else {
                                    // Single lottery result processing
                                    if (typeof window.getLotteryResultFromTransaction === 'function') {
                                        debug.log('Attempting to get lottery result from transaction...');
                                        
                                        const lotteryResult = await window.getLotteryResultFromTransaction(
                                            web3, 
                                            nftLotteryManagerContract, 
                                            result.transactionHash
                                        );
                                        
                                        if (lotteryResult) {
                                            debug.log('Successfully got lottery result:', lotteryResult);
                                            // Common eggs display lottery results, rare and legendary eggs already have pending prompts
                                            if (contractMethod === 'openCommonEgg' || batchMethod === 'batchOpenCommonEgg') {
                                                handleLotteryResult(lotteryResult);
                                            }
                                        } else {
                                            debug.warn('Failed to get lottery result');
                                            showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                        }
                                    } else if (nftLotteryManagerContract.methods.getLotteryResultFromTransaction) {
                                        // Try using contract method to get result
                                        const lotteryResult = await nftLotteryManagerContract.getLotteryResultFromTransaction(result.transactionHash);
                                        if (lotteryResult) {
                                            debug.log('Successfully got lottery result:', lotteryResult);
                                            // Common eggs display lottery results, rare and legendary eggs already have pending prompts
                                            if (contractMethod === 'openCommonEgg' || batchMethod === 'batchOpenCommonEgg') {
                                                handleLotteryResult(lotteryResult);
                                            }
                                        }
                                    } else {
                                        debug.warn('Lottery result retrieval method not available');
                                        showStatusMessage('purchaseNoLotteryDisplay', 'success');
                                    }
                                }
                            } catch (error) {
                                debug.error('Error getting lottery result:', error);
                                showStatusMessage('purchaseNoLotteryDisplay', 'success');
                            }
                        }
                    } catch (error) {
                        debug.error('Error purchasing eggs:', error);
                        showStatusMessage('purchaseFailed', 'error', { message: getErrorMessage(error) });
                        // Don't re-throw error to avoid duplicate error handling
                        return;
                    }
                });
            } catch (error) {
                debug.error('Error preparing to purchase:', error);
                resetBuyButton(buyButton);
            } finally {
                // Ensure button state is reset, regardless of error
                setTimeout(() => {
                    resetBuyButton(buyButton);
                }, 2000); // Short delay to avoid conflict with other reset logic
            }
        }

    // Make functions globally accessible for the main shop.js file
    window.claimFreeNFT = claimFreeNFT;
    window.checkFreeNFTClaimStatus = checkFreeNFTClaimStatus;
    window.handleLotteryResult = handleLotteryResult;
    window.processLotteryResult = processLotteryResult;
    window.createLotteryResultFrame = createLotteryResultFrame;
    window.initLotteryResultMessageListener = initLotteryResultMessageListener;
    window.updateEggTotalPrice = updateEggTotalPrice;
    window.handleLotteryBatchResults = handleLotteryBatchResults;
    window.checkClaimableEggsStatus = checkClaimableEggsStatus;
    window.claimEggs = claimEggs;
    window.fetchPetDetailsForLottery = fetchPetDetailsForLottery;
    window.showPendingEggAlert = showPendingEggAlert;
    window.updateNFTRemaining = updateNFTRemaining;
    window.purchaseEgg = purchaseEgg;