/**
 * Process the complete lottery transaction flow
 * @param {Object} web3 - Web3 instance
 * @param {Object} contract - NFTLotteryManager contract instance
 * @param {string} lotteryType - Lottery type ('free', 'common', 'rare', 'legendary')
 * @param {string} tokenAddress - Payment token address
 * @param {string} statusElementId - Status information element ID
 * @param {HTMLElement} statusContainer - Status information container element
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Lottery result object
 */
window.processLotteryTransaction = async function(web3, contract, lotteryType, tokenAddress, statusElementId, statusContainer, options = {}) {
    if (!window.NFTLotteryManagerContract) {
        console.error('NFTLotteryManagerContract class is not defined, attempting to load dynamically...');
        
        // Attempt to dynamically load NFTLotteryManager.js
        return new Promise((resolve, reject) => {
            const scriptEl = document.createElement('script');
            scriptEl.src = '../../scripts/contracts/NFTLotteryManager.js';
            scriptEl.async = true;
            
            scriptEl.onload = () => {
                console.log('NFTLotteryManagerContract class loaded successfully, retrying lottery processing...');
                if (!window.NFTLotteryManagerContract) {
                    console.error('Still unable to find NFTLotteryManagerContract class after loading');
                    reject(new Error('Unable to load NFTLotteryManagerContract class'));
                    return;
                }
                
                // Retry processing
                window.processLotteryTransaction(web3, contract, lotteryType, tokenAddress, statusElementId, statusContainer, options)
                    .then(resolve)
                    .catch(reject);
            };
            
            scriptEl.onerror = () => {
                console.error('Failed to load NFTLotteryManagerContract class file');
                reject(new Error('Failed to load NFTLotteryManagerContract class file'));
            };
            
            document.head.appendChild(scriptEl);
        });
    }
    
    // Get status element
    const statusElement = statusElementId ? document.getElementById(statusElementId) : null;
    
    // Define function to update status
    const updateStatus = (message) => {
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        if (statusContainer) {
            statusContainer.textContent = message;
        }
        
        console.log('Lottery status:', message);
    };
    
    // Get options
    const txOptions = options.txOptions || {};
    const batchCount = options.batchCount || 1;
    
    // Default sender to the currently connected wallet address
    if (!txOptions.from) {
        if (window.currentAddress) {
            txOptions.from = window.currentAddress;
        } else if (typeof window.getCurrentWalletAddress === 'function') {
            txOptions.from = await window.getCurrentWalletAddress();
        } else {
            return Promise.reject(new Error('Sender address not specified and unable to retrieve current wallet address'));
        }
    }
    
    try {
        // Set status
        updateStatus(`Preparing for ${lotteryType === 'free' ? 'free' : ''} lottery...`);
        
        // Create contract instance (if a string address is passed instead of an instance)
        let contractInstance = contract;
        if (typeof contract === 'string') {
            const nftLotteryManager = new window.NFTLotteryManagerContract(web3);
            contractInstance = nftLotteryManager.contract;
        } else if (contract.contract) {
            contractInstance = contract.contract;
        }
        
        // Check approval (if not a free lottery)
        if (lotteryType !== 'free' && tokenAddress) {
            updateStatus('Checking token approval...');
            
            // Ensure enough time has passed for previous approval transactions to be confirmed
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Execute lottery transaction
        updateStatus(`Executing ${lotteryType === 'free' ? 'free' : ''} lottery transaction...`);
        
        let result;
        
        // Call different contract methods based on lottery type and batch count
        if (batchCount > 1) {
            // Batch lottery
            updateStatus(`Batch ${lotteryType} lottery in progress...`);
            
            // Set different gas limits for different types of eggs
            let gasLimit;
            switch (lotteryType) {
                case 'common':
                    gasLimit = 800000 + (batchCount * 800000);
                    break;
                case 'rare':
                    gasLimit = 1500000 + (batchCount * 1500000);
                    break;
                case 'legendary':
                    gasLimit = 2000000 + (batchCount * 2000000);
                    break;
                default:
                    gasLimit = 800000 + (batchCount * 800000);
            }
            
            // Set transaction options
            const txOpts = {
                ...txOptions,
                gas: gasLimit
            };
            
            // Single or batch purchase
            if (lotteryType === 'rare') {
                result = await contractInstance.methods.batchOpenRareEgg(tokenAddress, batchCount).send(txOpts);
            } else if (lotteryType === 'legendary') {
                result = await contractInstance.methods.batchOpenLegendaryEgg(tokenAddress, batchCount).send(txOpts);
            } else if (lotteryType === 'common') {
                result = await contractInstance.methods.batchOpenCommonEgg(tokenAddress, batchCount).send(txOpts);
            } else {
                return Promise.reject(new Error(`Unsupported batch lottery type: ${lotteryType}`));
            }
            
            updateStatus(`Batch ${lotteryType} lottery completed`);
            
            // Return batch lottery results
            return {
                success: true,
                transaction: result,
                isBatch: true,
                count: batchCount,
                type: lotteryType
            };
        } else {
            // Single lottery
            updateStatus(`${lotteryType} lottery in progress...`);
            
            // Set different gas limits for different types of eggs
            let gasLimit;
            switch (lotteryType) {
                case 'common':
                    gasLimit = 800000;
                    break;
                case 'rare':
                    gasLimit = 1500000;
                    break;
                case 'legendary':
                    gasLimit = 2000000;
                    break;
                case 'free':
                    gasLimit = 500000;
                    break;
                default:
                    gasLimit = 800000;
            }
            
            // Set transaction options
            const txOpts = {
                ...txOptions,
                gas: gasLimit
            };
            
            // Execute single lottery
            if (lotteryType === 'free') {
                const inviterAddress = options.inviterAddress || '0x0000000000000000000000000000000000000000';
                result = await contractInstance.methods.claimFreeNFT(inviterAddress).send(txOpts);
            } else if (lotteryType === 'common') {
                result = await contractInstance.methods.openCommonEgg(tokenAddress).send(txOpts);
            } else if (lotteryType === 'rare') {
                result = await contractInstance.methods.openRareEgg(tokenAddress).send(txOpts);
            } else if (lotteryType === 'legendary') {
                result = await contractInstance.methods.openLegendaryEgg(tokenAddress).send(txOpts);
            } else {
                return Promise.reject(new Error(`Unsupported lottery type: ${lotteryType}`));
            }
            
            updateStatus(`${lotteryType} lottery completed`);
            
            // Get lottery result
            if (result && result.events && result.events.LotteryResult) {
                const event = result.events.LotteryResult;
                const returnValues = event.returnValues;
                
                return {
                    success: true,
                    tokenId: returnValues.tokenId,
                    quality: returnValues.quality,
                    qualityName: getQualityName(returnValues.quality),
                    transaction: result,
                    type: lotteryType
                };
            }
            
            // If no event is directly obtained, try to get from transaction receipt
            if (result && result.transactionHash) {
                try {
                    // Get transaction receipt
                    const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
                    
                    // Try to parse event logs
                    if (receipt && receipt.logs && receipt.logs.length > 0) {
                        // Simply return transaction success
                        return {
                            success: true,
                            transaction: result,
                            needsFurtherProcessing: true,
                            type: lotteryType
                        };
                    }
                } catch (error) {
                    console.error('Failed to get transaction receipt:', error);
                }
            }
            
            // If unable to get detailed results, at least return transaction success
            return {
                success: true,
                transaction: result,
                type: lotteryType
            };
        }
    } catch (error) {
        console.error('Lottery transaction failed:', error);
        updateStatus(`Lottery failed: ${error.message || 'Unknown error'}`);
        return Promise.reject(error);
    }
};

/**
 * Get quality name
 * Used in lottery results
 * @param {number} quality - Quality level (0-4)
 * @returns {string} Quality name
 */
function getQualityName(quality) {
    const qualityNames = {
        0: 'Common',
        1: 'Good',
        2: 'Excellent',
        3: 'Rare',
        4: 'Legendary'
    };
    
    return qualityNames[quality] || 'Common';
} 