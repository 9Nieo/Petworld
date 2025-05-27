/**
 * Reward Notification Module
 * Used to display actual reward amounts claimed by users
 */
const RewardNotification = (function() {
    
    /**
     * Show reward claim success notification
     * @param {Object} rewardData - Reward data object
     * @param {number} rewardData.pwpotAmount - PWPOT amount claimed
     * @param {number} rewardData.pwbotAmount - PWBOT amount claimed
     * @param {string} rewardData.transactionHash - Transaction hash
     * @param {number} rewardData.tokenId - NFT token ID
     * @param {string} rewardData.nftName - NFT name (optional)
     */
    function showRewardClaimedNotification(rewardData) {
        console.log('Reward claimed notification:', rewardData);
        
        // Create and show the beautiful notification
        const notification = createCustomRewardNotification(rewardData);
        document.body.appendChild(notification);
        
        // Also log to console for debugging
        console.log(`🎉 Rewards claimed for ${rewardData.nftName || `NFT #${rewardData.tokenId}`}:`, {
            PWPOT: rewardData.pwpotAmount,
            PWBOT: rewardData.pwbotAmount,
            Transaction: rewardData.transactionHash
        });
    }
    
    /**
     * Extract reward amounts from transaction receipt
     * @param {Object} txReceipt - Transaction receipt
     * @returns {Object} - Extracted reward amounts
     */
    function extractRewardAmountsFromTransaction(txReceipt) {
        let pwpotAmount = 0;
        let pwbotAmount = 0;
        
        console.log('Extracting reward amounts from transaction:', txReceipt);
        
        try {
            // First try to get from decoded events
            if (txReceipt.events && txReceipt.events.RewardsClaimed) {
                console.log('Found RewardsClaimed event in txReceipt.events:', txReceipt.events.RewardsClaimed);
                const event = txReceipt.events.RewardsClaimed;
                
                if (event.returnValues) {
                    pwpotAmount = parseInt(event.returnValues.totalPwpotRewards || '0');
                    pwbotAmount = parseInt(event.returnValues.totalPwbotRewards || '0');
                    console.log('Extracted from event.returnValues:', { pwpotAmount, pwbotAmount });
                }
            } 
            // If not found in events, try to parse from logs
            else if (txReceipt.logs && txReceipt.logs.length > 0) {
                console.log('Parsing logs manually, found', txReceipt.logs.length, 'logs');
                
                // Get Web3 instance
                let web3Instance = window.web3 || 
                                 (window.SecureWalletManager && window.SecureWalletManager.getWeb3()) ||
                                 (typeof Web3 !== 'undefined' && window.ethereum ? new Web3(window.ethereum) : null);
                
                if (!web3Instance) {
                    console.error('No Web3 instance available for log parsing');
                    return { pwpotAmount, pwbotAmount };
                }
                
                // RewardsClaimed event signature (from contract: address indexed user, uint256[] tokenIds, uint256 totalPwpotRewards, uint256 totalPwbotRewards)
                const rewardsClaimedTopic = web3Instance.utils.keccak256('RewardsClaimed(address,uint256[],uint256,uint256)');
                console.log('Looking for RewardsClaimed topic:', rewardsClaimedTopic);
                
                for (let i = 0; i < txReceipt.logs.length; i++) {
                    const log = txReceipt.logs[i];
                    console.log(`Checking log ${i + 1}:`, log);
                    
                    if (log.topics && log.topics[0] === rewardsClaimedTopic) {
                        console.log('Found RewardsClaimed event, decoding...');
                        
                        try {
                            // Decode the data part (tokenIds[], totalPwpotRewards, totalPwbotRewards)
                            const decoded = web3Instance.eth.abi.decodeParameters([
                                'uint256[]',  // tokenIds
                                'uint256',    // totalPwpotRewards  
                                'uint256'     // totalPwbotRewards
                            ], log.data);
                            
                            pwpotAmount = parseInt(decoded[1] || '0');
                            pwbotAmount = parseInt(decoded[2] || '0');
                            
                            console.log('Successfully decoded RewardsClaimed:', {
                                tokenIds: decoded[0],
                                pwpotAmount: pwpotAmount,
                                pwbotAmount: pwbotAmount
                            });
                            break;
                        } catch (decodeError) {
                            console.warn('Failed to decode RewardsClaimed event:', decodeError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error extracting reward amounts from transaction:', error);
        }
        
        console.log('Final extracted amounts:', { pwpotAmount, pwbotAmount });
        return { pwpotAmount, pwbotAmount };
    }
    
    /**
     * Format reward amount for display
     * @param {number} amount - Reward amount
     * @returns {string} - Formatted amount
     */
    function formatRewardAmount(amount) {
        if (!amount || amount === 0) {
            return '0';
        }
        
        // Convert to integer since tokens have no decimals
        const intAmount = Math.floor(amount);
        
        // Format based on amount size
        if (intAmount >= 1000000) {
            return (intAmount / 1000000).toFixed(1) + 'M';
        } else if (intAmount >= 1000) {
            return (intAmount / 1000).toFixed(1) + 'K';
        } else {
            return intAmount.toString();
        }
    }
    
    /**
     * Format transaction hash for display
     * @param {string} hash - Transaction hash
     * @returns {string} - Formatted hash
     */
    function formatTransactionHash(hash) {
        if (!hash) return '';
        
        if (hash.length > 20) {
            return hash.substring(0, 10) + '...' + hash.substring(hash.length - 8);
        }
        
        return hash;
    }
    
    /**
     * Show batch reward claim notification
     * @param {Object} batchRewardData - Batch reward data
     * @param {number} batchRewardData.totalPwpot - Total PWPOT claimed
     * @param {number} batchRewardData.totalPwbot - Total PWBOT claimed
     * @param {number} batchRewardData.nftCount - Number of NFTs processed
     * @param {string} batchRewardData.transactionHash - Transaction hash
     */
    function showBatchRewardClaimedNotification(batchRewardData) {
        const { totalPwpot, totalPwbot, nftCount, transactionHash } = batchRewardData;
        
        const pwpotFormatted = formatRewardAmount(totalPwpot);
        const pwbotFormatted = formatRewardAmount(totalPwbot);
        
        const message = `🎉 Batch Rewards Claimed Successfully!\n\n` +
                       `Pets Processed: ${nftCount}\n` +
                       `Total PWPOT: ${pwpotFormatted}\n` +
                       `Total PWBOT: ${pwbotFormatted}\n\n` +
                       `Transaction: ${transactionHash ? formatTransactionHash(transactionHash) : 'Completed'}`;
        
        if (window.showNotification) {
            window.showNotification(message, 'success', { duration: 6000 });
        } else if (window.ModalDialog && window.ModalDialog.alert) {
            window.ModalDialog.alert(message, { 
                title: 'Batch Rewards Claimed', 
                confirmText: 'OK' 
            });
        } else {
            alert(message);
        }
        
        if (window.showToast) {
            const toastMessage = `Batch claimed: ${pwpotFormatted} PWPOT, ${pwbotFormatted} PWBOT from ${nftCount} pets`;
            window.showToast(toastMessage, 5000);
        }
    }
    
    /**
     * Create custom reward notification with beautiful styling
     * @param {Object} rewardData - Reward data object
     * @returns {HTMLElement} - Notification element
     */
    function createCustomRewardNotification(rewardData) {
        const { pwpotAmount, pwbotAmount, transactionHash, tokenId, nftName } = rewardData;
        
        // Create notification container
        const notification = document.createElement('div');
        notification.className = 'reward-notification';
        notification.innerHTML = `
            <div class="reward-notification-content">
                <div class="reward-header">
                    <div class="reward-icon">🎉</div>
                    <h3 class="reward-title">Reward Claimed Successfully!</h3>
                    <button class="reward-close" onclick="this.closest('.reward-notification').remove()">×</button>
                </div>
                <div class="reward-body">
                    <div class="reward-pet-info">
                        <span class="pet-name">${nftName}</span>
                    </div>
                    <div class="reward-amounts">
                        <div class="reward-item pwpot">
                            <div class="reward-icon-small">🌟</div>
                            <div class="reward-details">
                                <span class="reward-label">PWPOT</span>
                                <span class="reward-value">${formatRewardAmount(pwpotAmount)}</span>
                            </div>
                        </div>
                        <div class="reward-item pwbot">
                            <div class="reward-icon-small">🪙</div>
                            <div class="reward-details">
                                <span class="reward-label">PWBOT</span>
                                <span class="reward-value">${formatRewardAmount(pwbotAmount)}</span>
                            </div>
                        </div>
                    </div>
                    ${transactionHash ? `
                    <div class="reward-transaction">
                        <span class="tx-label">Transaction Hash:</span>
                        <span class="tx-hash" title="${transactionHash}">${formatTransactionHash(transactionHash)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('reward-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'reward-notification-styles';
            styles.textContent = `
                .reward-notification {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10000;
                    max-width: 400px;
                    background-color: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    animation: fadeInScale 0.4s ease-out;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    color: #333;
                }
                
                .reward-notification-content {
                    background: none;
                    backdrop-filter: none;
                    margin: 0;
                    border-radius: 0;
                    padding: 0;
                }
                
                .reward-header {
                    background: #f0f0f0;
                    color: #333;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    position: relative;
                    border-bottom: 1px solid #eee;
                }
                
                .reward-icon {
                    font-size: 24px;
                }
                
                .reward-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    flex: 1;
                }
                
                .reward-close {
                    background: none;
                    border: none;
                    color: #999;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s;
                }
                
                .reward-close:hover {
                    color: #333;
                    background: none;
                }
                
                .reward-body {
                    padding: 20px;
                }
                
                .reward-pet-info {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .pet-name {
                    background: #e0e0e0;
                    color: #333;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .reward-amounts {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .reward-item {
                    flex: 1;
                    background: #f9f9f9;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #333;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .reward-item.pwbot {
                    background: #f9f9f9;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .reward-icon-small {
                    font-size: 24px;
                    color: #4285f4;
                }
                
                .reward-item.pwbot .reward-icon-small {
                    color: #ff6d00;
                }
                
                .reward-details {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .reward-label {
                    font-size: 13px;
                    opacity: 0.8;
                    font-weight: 500;
                }
                
                .reward-value {
                    font-size: 20px;
                    font-weight: 700;
                    color: #333;
                }
                
                .reward-transaction {
                    background: #f0f0f0;
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 12px;
                    color: #555;
                }
                
                .tx-label {
                    font-weight: 500;
                    margin-right: 8px;
                }
                
                .tx-hash {
                    font-family: monospace;
                    background: #e0e0e0;
                    padding: 2px 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    color: #333;
                    word-break: break-all;
                }
                
                @keyframes fadeInScale {
                    from {
                        transform: translate(-50%, -50%) scale(0.8);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOutScale {
                    from {
                         transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                    to {
                         transform: translate(-50%, -50%) scale(0.8);
                        opacity: 0;
                    }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }
                
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                
                /* Mobile responsive */
                @media (max-width: 480px) {
                    .reward-notification {
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: calc(100% - 40px);
                        max-width: none;
                    }
                    
                    .reward-amounts {
                        flex-direction: column;
                    }

                     .reward-item {
                        padding: 12px;
                    }

                     .reward-icon-small {
                        font-size: 20px;
                    }

                     .reward-value {
                        font-size: 18px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOutScale 0.4s ease-in forwards';
                setTimeout(() => notification.remove(), 400);
            }
        }, 8000);
        
        return notification;
    }
    
    // Public interface
    return {
        showRewardClaimed: showRewardClaimedNotification,
        showBatchRewardClaimed: showBatchRewardClaimedNotification,
        extractRewardAmountsFromTransaction: extractRewardAmountsFromTransaction,
        formatRewardAmount: formatRewardAmount,
        formatTransactionHash: formatTransactionHash
    };
})();

// Make it globally available
window.RewardNotification = RewardNotification;

console.log('Reward Notification module loaded');