/**
 * Lottery Result Parser
 * Used to parse lottery result events from transactions
 */

/**
 * Get a single lottery result from a transaction
 * @param {Object} web3 - Web3 instance
 * @param {Object} nftLotteryManagerContract - NFTLotteryManager contract instance
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object|null>} Lottery result object or null
 */
async function getLotteryResultFromTransaction(web3, nftLotteryManagerContract, txHash) {
    if (!txHash) {
        console.error('Failed to get lottery result: Transaction hash is empty');
        return null;
    }
    
    try {
        console.log(`Getting lottery result from transaction ${txHash}...`);
        
        // Get transaction receipt
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
            console.error('Failed to get transaction receipt');
            return null;
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
            'FreeNFT': 'Free Pet'
        };
        
        // Get event signature from ABI
        const nftLotteryResultEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'NFTLotteryResult'
        );
        
        const freeNFTClaimedEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'FreeNFTClaimed'
        );
        
        // Get EggClaimed event ABI, which is triggered when claiming unclaimed pets
        const eggClaimedEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'EggClaimed'
        );
        
        if (!nftLotteryResultEventAbi && !freeNFTClaimedEventAbi && !eggClaimedEventAbi) {
            console.error('Cannot find ABI definitions for NFTLotteryResult, FreeNFTClaimed, or EggClaimed events');
            return null;
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
                    
                    console.log('Successfully parsed NFTLotteryResult event:', result);
                    return result;
                } catch (error) {
                    console.error('Failed to parse NFTLotteryResult event:', error);
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
                        quality: 0,  // Free NFT defaults to common quality
                        qualityName: qualityNames[0] || 'COMMON',
                        nftId: decodedLog.nftId,
                        lotteryType: 'FreeNFT',
                        lotteryTypeName: 'Free Pet'
                    };
                    
                    console.log('Successfully parsed FreeNFTClaimed event:', result);
                    return result;
                } catch (error) {
                    console.error('Failed to parse FreeNFTClaimed event:', error);
                }
            }
            
            // Try to parse EggClaimed event (triggered when claiming unclaimed pets)
            if (eggClaimedEventAbi && eggClaimedEventAbi.signature === log.topics[0]) {
                try {
                    const decodedLog = web3.eth.abi.decodeLog(
                        eggClaimedEventAbi.inputs,
                        log.data,
                        log.topics.slice(1)
                    );
                    
                    // The EggClaimed event contains the quality field, read it directly
                    const quality = parseInt(decodedLog.quality);
                    
                    const result = {
                        user: decodedLog.user,
                        tokenId: decodedLog.tokenId,
                        quality: quality,
                        qualityName: qualityNames[quality] || 'Unknown',
                        nftId: decodedLog.nftId,
                        lotteryType: decodedLog.lotteryType || 'ClaimEgg',
                        lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || 'Claim Pet'
                    };
                    
                    console.log('Successfully parsed EggClaimed event:', result);
                    return result;
                } catch (error) {
                    console.error('Failed to parse EggClaimed event:', error);
                }
            }
        }
        
        console.warn('No lottery result events found in transaction logs');
        return null;
    } catch (error) {
        console.error('Failed to parse lottery result:', error);
        return null;
    }
}

/**
 * Get batch lottery results from a transaction
 * @param {Object} web3 - Web3 instance
 * @param {Object} nftLotteryManagerContract - NFTLotteryManager contract instance
 * @param {string} txHash - Transaction hash
 * @param {number} expectedCount - Expected number of results
 * @returns {Promise<Array<Object>|null>} Array of lottery result objects or null
 */
async function getLotteryResultsFromTransaction(web3, nftLotteryManagerContract, txHash, expectedCount = 1) {
    if (!txHash) {
        console.error('Failed to get batch lottery results: Transaction hash is empty');
        return null;
    }
    
    try {
        console.log(`Getting batch lottery results from transaction ${txHash} (expected count: ${expectedCount})...`);
        
        // Get transaction receipt
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
            console.error('Failed to get transaction receipt');
            return null;
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
            'FreeNFT': 'Free Pet'
        };
        
        // Get event signature from ABI
        const nftLotteryResultEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'NFTLotteryResult'
        );
        
        const freeNFTClaimedEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'FreeNFTClaimed'
        );
        
        // Get EggClaimed event ABI, which is triggered when claiming unclaimed pets
        const eggClaimedEventAbi = nftLotteryManagerContract._jsonInterface.find(
            item => item.type === 'event' && item.name === 'EggClaimed'
        );
        
        if (!nftLotteryResultEventAbi && !freeNFTClaimedEventAbi && !eggClaimedEventAbi) {
            console.error('Cannot find ABI definitions for NFTLotteryResult, FreeNFTClaimed, or EggClaimed events');
            return null;
        }
        
        // Store found results
        const results = [];
        
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
                    
                    results.push(result);
                } catch (error) {
                    console.error('Failed to parse NFTLotteryResult event:', error);
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
                        quality: 0,  // Free NFT defaults to common quality
                        qualityName: qualityNames[0] || 'COMMON',
                        nftId: decodedLog.nftId,
                        lotteryType: 'FreeNFT',
                        lotteryTypeName: 'Free Pet'
                    };
                    
                    results.push(result);
                } catch (error) {
                    console.error('Failed to parse FreeNFTClaimed event:', error);
                }
            }
            
            // Try to parse EggClaimed event (triggered when claiming unclaimed pets)
            if (eggClaimedEventAbi && eggClaimedEventAbi.signature === log.topics[0]) {
                try {
                    const decodedLog = web3.eth.abi.decodeLog(
                        eggClaimedEventAbi.inputs,
                        log.data,
                        log.topics.slice(1)
                    );
                    
                    // The EggClaimed event contains the quality field, read it directly
                    const quality = parseInt(decodedLog.quality);
                    
                    const result = {
                        user: decodedLog.user,
                        tokenId: decodedLog.tokenId,
                        quality: quality,
                        qualityName: qualityNames[quality] || 'Unknown',
                        nftId: decodedLog.nftId,
                        lotteryType: decodedLog.lotteryType || 'ClaimEgg',
                        lotteryTypeName: lotteryTypeNames[decodedLog.lotteryType] || 'Claim Pet'
                    };
                    
                    console.log('Successfully parsed EggClaimed event:', result);
                    results.push(result);
                } catch (error) {
                    console.error('Failed to parse EggClaimed event:', error);
                }
            }
        }
        
        if (results.length === 0) {
            console.warn('No lottery result events found in transaction');
            return null;
        }
        
        if (results.length < expectedCount) {
            console.warn(`The number of results found (${results.length}) is less than the expected count (${expectedCount})`);
        }
        
        console.log(`Successfully parsed ${results.length} lottery results:`, results);
        return results;
    } catch (error) {
        console.error('Failed to parse batch lottery results:', error);
        return null;
    }
}

// Export module
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        getLotteryResultFromTransaction,
        getLotteryResultsFromTransaction
    };
} else {
    // Use as global functions in the browser environment
    window.getLotteryResultFromTransaction = getLotteryResultFromTransaction;
    window.getLotteryResultsFromTransaction = getLotteryResultsFromTransaction;
} 