/**
 * Reward Claim Modal
 * Used to display the estimated reward quantity before claiming NFT rewards
 */
const RewardClaimModal = (function() {
    // DOM elements
    let modalOverlay = document.getElementById('rewardModalOverlay');
    let modal = document.getElementById('rewardClaimModal');
    let closeBtn = document.querySelector('.close-btn');
    let cancelBtn = document.getElementById('cancelClaimBtn');
    let confirmBtn = document.getElementById('confirmClaimBtn');
    let loadingIndicator = document.getElementById('loadingIndicator');
    let errorMessage = document.getElementById('errorMessage');
    
    // NFT information elements
    let nftImage = document.getElementById('nftModalImage');
    let nftName = document.getElementById('nftModalName');
    let nftId = document.getElementById('nftModalId');
    let nftQuality = document.getElementById('nftModalQuality');
    
    // Reward information elements
    let rewardStartTime = document.getElementById('rewardStartTime');
    let rewardEndTime = document.getElementById('rewardEndTime');
    let rewardHours = document.getElementById('rewardHours');
    let pwpotReward = document.getElementById('pwpotReward');
    let pwbotReward = document.getElementById('pwbotReward');
    
    // Current NFT data
    let currentNftData = null;
    
    // Modal initialization status
    let isInitialized = false;
    
    /**
     * Open the reward claim modal
     * @param {Object} nftData - NFT data object
     * @param {Object} rewardData - Reward data object
     */
    function openRewardModal(nftData, rewardData) {
        // Ensure DOM elements are loaded
        if (!isInitialized) {
            console.log('Modal has not been initialized, attempting to initialize...');
            init();
            
            // If still not loaded after initialization, create modal DOM
            if (!modalOverlay || !modal) {
                createModalDOM();
                getAllElements();
            }
        }
        
        if (!nftData || !rewardData) {
            console.error('No valid NFT or reward data provided');
            return;
        }
        
        if (!modalOverlay || !modal) {
            console.error('Modal DOM elements do not exist, cannot display');
            return false;
        }
        
        currentNftData = nftData;
        
        // Fill NFT information
        if (nftImage) nftImage.src = nftData.imageUrl || '';
        if (nftName) nftName.textContent = nftData.name || 'NFT';
        if (nftId) nftId.textContent = `ID: #${nftData.id || '000000'}`;
        if (nftQuality) nftQuality.textContent = `Quality: ${getQualityText(nftData.quality) || 'Common'}`;
        
        // Fill reward information
        if (rewardStartTime) rewardStartTime.textContent = formatDate(rewardData.startTime);
        if (rewardEndTime) rewardEndTime.textContent = formatDate(rewardData.endTime);
        
        // Handle accumulated hours and accumulated cycle display
        if (rewardHours) {
            let hourText = rewardData.hours.toFixed(2);
            
            // Check if accumulated cycle information is included
            if (rewardData.hasAccumulated || rewardData.accumulatedHours > 0) {
                const rewardHoursParent = rewardHours.parentElement;
                
                // Update accumulated hours display
                rewardHours.textContent = hourText;
                
                // Check if accumulated cycle notice has already been added
                let cycleNotice = rewardHoursParent.querySelector('.accumulated-cycles-notice');
                if (!cycleNotice) {
                    cycleNotice = document.createElement('div');
                    cycleNotice.className = 'accumulated-cycles-notice';
                    cycleNotice.style.fontSize = '0.85em';
                    cycleNotice.style.color = '#4caf50';
                    cycleNotice.style.marginTop = '4px';
                    // Display details: accumulated cycle and new cycle
                    cycleNotice.textContent = `(Accumulated Cycle: ${rewardData.accumulatedHours || 0} hours, New Cycle: ${rewardData.newHours || 0} hours)`;
                    rewardHoursParent.appendChild(cycleNotice);
                } else {
                    // Update existing notice text
                    cycleNotice.textContent = `(Accumulated Cycle: ${rewardData.accumulatedHours || 0} hours, New Cycle: ${rewardData.newHours || 0} hours)`;
                }
            } else {
                // Normal display, remove any existing accumulated cycle notice
                rewardHours.textContent = hourText;
                
                const cycleNotice = rewardHours.parentElement.querySelector('.accumulated-cycles-notice');
                if (cycleNotice) {
                    cycleNotice.remove();
                }
            }
        }
        
        // Add level multiplier display
        const nftLevel = rewardData.nftLevel || nftData.level || 1;
        const levelMultiplier = rewardData.levelMultiplier || nftLevel;
        
        // Check if level information area has been added
        let levelInfoDiv = document.querySelector('.level-multiplier-info');
        if (!levelInfoDiv) {
            // Create level information area and insert it after accumulated hours
            levelInfoDiv = document.createElement('div');
            levelInfoDiv.className = 'level-multiplier-info';
            levelInfoDiv.style.marginBottom = '10px';
            levelInfoDiv.style.fontSize = '0.95em';
            levelInfoDiv.innerHTML = `
                <span>Pet Level: </span>
                <span class="level-value" style="font-weight:bold;color:#ff9800">Lv.${nftLevel}</span>
                <span> (</span>
                <span class="multiplier-value" style="font-weight:bold;color:#ff9800">${levelMultiplier}x</span>
                <span> Reward)</span>
            `;
            
            const rewardHoursDiv = document.querySelector('.reward-hours');
            if (rewardHoursDiv && rewardHoursDiv.parentNode) {
                rewardHoursDiv.parentNode.insertBefore(levelInfoDiv, rewardHoursDiv.nextSibling);
            }
        } else {
            // Update existing level information
            const levelValueEl = levelInfoDiv.querySelector('.level-value');
            const multiplierValueEl = levelInfoDiv.querySelector('.multiplier-value');
            
            if (levelValueEl) levelValueEl.textContent = `Lv.${nftLevel}`;
            if (multiplierValueEl) multiplierValueEl.textContent = `${levelMultiplier}x`;
        }
        
        // Update reward quantity display, including base reward and level bonus information
        if (pwpotReward && rewardData.baseRewardPwpot !== undefined) {
            const baseReward = rewardData.baseRewardPwpot.toFixed(2);
            const totalReward = rewardData.pwpot.toFixed(2);
            
            // Create or update reward formula display
            let formulaDiv = pwpotReward.parentElement.querySelector('.reward-formula');
            if (!formulaDiv) {
                formulaDiv = document.createElement('div');
                formulaDiv.className = 'reward-formula';
                formulaDiv.style.fontSize = '0.85em';
                formulaDiv.style.color = '#777';
                formulaDiv.style.marginTop = '2px';
                pwpotReward.parentElement.appendChild(formulaDiv);
            }
            
            formulaDiv.textContent = `${baseReward} × ${levelMultiplier}x = ${totalReward}`;
            pwpotReward.textContent = totalReward;
        } else if (pwpotReward) {
            pwpotReward.textContent = rewardData.pwpot.toFixed(4);
        }
        
        if (pwbotReward && rewardData.baseRewardPwbot !== undefined) {
            const baseReward = rewardData.baseRewardPwbot.toFixed(2);
            const totalReward = rewardData.pwbot.toFixed(2);
            
            // Create or update reward formula display
            let formulaDiv = pwbotReward.parentElement.querySelector('.reward-formula');
            if (!formulaDiv) {
                formulaDiv = document.createElement('div');
                formulaDiv.className = 'reward-formula';
                formulaDiv.style.fontSize = '0.85em';
                formulaDiv.style.color = '#777';
                formulaDiv.style.marginTop = '2px';
                pwbotReward.parentElement.appendChild(formulaDiv);
            }
            
            formulaDiv.textContent = `${baseReward} × ${levelMultiplier}x = ${totalReward}`;
            pwbotReward.textContent = totalReward;
        } else if (pwbotReward) {
            pwbotReward.textContent = rewardData.pwbot.toFixed(4);
        }
        
        // Show modal
        modalOverlay.classList.remove('hidden');
        // Use setTimeout to delay removing the hidden class for transition animation
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 10);
        
        // Reset UI state
        hideLoading();
        hideError();
        
        // Set button states
        if (confirmBtn) confirmBtn.disabled = false;
        
        return true;
    }
    
    /**
     * Create modal DOM structure
     */
    function createModalDOM() {
        console.log('Creating modal DOM structure');
        // Check if modal already exists
        if (document.getElementById('rewardModalOverlay')) {
            return;
        }
        
        // Create modal HTML
        const modalHTML = `
            <div id="rewardModalOverlay" class="modal-overlay hidden">
                <div id="rewardClaimModal" class="reward-claim-modal hidden">
                    <div class="modal-content">
                        <span class="close-btn">&times;</span>
                        <h3 class="modal-title">Reward Claim Confirmation</h3>
                        
                        <div class="nft-info">
                            <div class="nft-image"><img src="" alt="NFT Image" id="nftModalImage"></div>
                            <div class="nft-details">
                                <h4 class="nft-name" id="nftModalName">NFT Name</h4>
                                <p class="nft-id" id="nftModalId">ID: #000000</p>
                                <p class="nft-quality" id="nftModalQuality">Quality: Common</p>
                            </div>
                        </div>
                        
                        <div class="reward-info">
                            <h4>Estimated Reward</h4>
                            <div class="reward-period">
                                <span>Reward Calculation Period: </span>
                                <span class="reward-start-time" id="rewardStartTime">-</span>
                                <span> to </span>
                                <span class="reward-end-time" id="rewardEndTime">-</span>
                            </div>
                            
                            <div class="reward-hours">
                                <span>Accumulated Hours: </span>
                                <span class="hours-value" id="rewardHours">0</span>
                                <span> hours</span>
                            </div>
                            
                            <div class="reward-amounts">
                                <div class="reward-item">
                                    <span class="reward-icon">🪙</span>
                                    <div>
                                        <span class="reward-name">PWPOT:</span>
                                        <span class="reward-value" id="pwpotReward">0</span>
                                    </div>
                                </div>
                                
                                <div class="reward-item">
                                    <span class="reward-icon">💎</span>
                                    <div>
                                        <span class="reward-name">PWBOT:</span>
                                        <span class="reward-value" id="pwbotReward">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="errorMessage" class="error-message hidden">
                            An error occurred while processing the request. Please try again later.
                        </div>
                        
                        <div class="modal-actions">
                            <button id="cancelClaimBtn" class="cancel-btn">Cancel</button>
                            <button id="confirmClaimBtn" class="confirm-btn">Confirm Claim</button>
                        </div>
                        
                        <div id="loadingIndicator" class="loading-indicator hidden">
                            <div class="spinner"></div>
                            <p>Processing, please wait...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Ensure stylesheet is loaded
        if (!document.querySelector('link[href*="rewardClaimModal.css"]')) {
            const styleEl = document.createElement('link');
            styleEl.rel = 'stylesheet';
            styleEl.href = '../../css/other/rewardClaimModal.css';
            document.head.appendChild(styleEl);
        }
    }
    
    /**
     * Get all DOM elements
     */
    function getAllElements() {
        modalOverlay = document.getElementById('rewardModalOverlay');
        modal = document.getElementById('rewardClaimModal');
        closeBtn = document.querySelector('.close-btn');
        cancelBtn = document.getElementById('cancelClaimBtn');
        confirmBtn = document.getElementById('confirmClaimBtn');
        loadingIndicator = document.getElementById('loadingIndicator');
        errorMessage = document.getElementById('errorMessage');
        
        nftImage = document.getElementById('nftModalImage');
        nftName = document.getElementById('nftModalName');
        nftId = document.getElementById('nftModalId');
        nftQuality = document.getElementById('nftModalQuality');
        
        rewardStartTime = document.getElementById('rewardStartTime');
        rewardEndTime = document.getElementById('rewardEndTime');
        rewardHours = document.getElementById('rewardHours');
        pwpotReward = document.getElementById('pwpotReward');
        pwbotReward = document.getElementById('pwbotReward');
    }
    
    /**
     * Close the reward claim modal
     */
    function closeRewardModal() {
        if (!modal || !modalOverlay) {
            return;
        }
        
        // Add hidden class to trigger transition animation
        modal.classList.add('hidden');
        
        // Wait for transition animation to complete, then hide overlay
        setTimeout(() => {
            modalOverlay.classList.add('hidden');
            // Clear current NFT data
            currentNftData = null;
        }, 300); // 300ms matches the transition time in CSS
    }
    
    /**
     * Show loading indicator
     */
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        if (confirmBtn) confirmBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
    }
    
    /**
     * Hide loading indicator
     */
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message || 'An error occurred while processing the request. Please try again later.';
            errorMessage.classList.remove('hidden');
        }
    }
    
    /**
     * Hide error message
     */
    function hideError() {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    }
    
    /**
     * Handle reward claim confirmation
     */
    async function handleClaimConfirm() {
        if (!currentNftData) {
            showError('Invalid NFT data, please refresh the page and try again.');
            return;
        }
        
        showLoading();
        hideError();
        
        try {
            // Use the externally defined callback function to handle reward claiming
            if (window.onRewardClaimConfirm && typeof window.onRewardClaimConfirm === 'function') {
                console.log('Using externally defined onRewardClaimConfirm function to handle reward claiming');
                
                try {
                    // Call external callback to handle claiming logic
                    const result = await window.onRewardClaimConfirm(currentNftData);
                    
                    if (result && result.success) {
                        // Close modal
                        closeRewardModal();
                        
                        // Show actual reward amounts if available in result
                        if (window.RewardNotification && window.RewardNotification.showRewardClaimed && result.actualRewards) {
                            window.RewardNotification.showRewardClaimed({
                                pwpotAmount: result.actualRewards.pwpotAmount || 0,
                                pwbotAmount: result.actualRewards.pwbotAmount || 0,
                                transactionHash: result.transactionHash || result.transaction?.transactionHash,
                                tokenId: currentNftData.id,
                                nftName: currentNftData.name
                            });
                        }
                        
                        // Trigger reward claimed event
                        if (window.onRewardClaimed) {
                            window.onRewardClaimed(currentNftData.id);
                        }
                    } else {
                        // Show error message
                        showError(result?.message || 'Failed to claim reward, please try again later.');
                        hideLoading();
                    }
                } catch (callbackError) {
                    console.error('Error executing reward claim callback:', callbackError);
                    showError(callbackError.message || 'An error occurred while processing the reward claim.');
                    hideLoading();
                }
            } else {
                // Default to using built-in API call method to handle claiming
                console.log('Using default API call to handle reward claiming');
                const response = await claimReward(currentNftData.id);
                
                if (response.success) {
                    // Close modal
                    closeRewardModal();
                    
                    // Show actual reward amounts if available in response
                    if (window.RewardNotification && window.RewardNotification.showRewardClaimed && response.actualRewards) {
                        window.RewardNotification.showRewardClaimed({
                            pwpotAmount: response.actualRewards.pwpotAmount || 0,
                            pwbotAmount: response.actualRewards.pwbotAmount || 0,
                            transactionHash: response.transactionHash || response.transaction?.transactionHash,
                            tokenId: currentNftData.id,
                            nftName: currentNftData.name
                        });
                    }
                    
                    // If a page refresh is needed, can trigger a custom event or directly call related functions
                    if (window.onRewardClaimed) {
                        window.onRewardClaimed(currentNftData.id);
                    }
                } else {
                    showError(response.message || 'Failed to claim reward, please try again later.');
                    hideLoading();
                }
            }
        } catch (error) {
            console.error('An error occurred while claiming the reward:', error);
            showError('Network error, please check your connection and try again.');
            hideLoading();
        }
    }
    
    /**
     * Call API to claim reward
     * @param {string} nftId - NFT ID
     * @returns {Promise<Object>} Response object
     */
    async function claimReward(nftId) {
        // This should be the actual API call
        // Example of a simulated API call
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                // Simulate successful response
                resolve({
                    success: true,
                    message: 'Reward claimed successfully',
                    data: {
                        transactionId: 'tx_' + Math.random().toString(36).substring(2, 15)
                    }
                });
                
                // Simulate failure response
                /* resolve({
                    success: false,
                    message: 'You have already claimed this NFT reward'
                }); */
            }, 1500);
        });
    }
    
    /**
     * Format date
     * @param {string|number|Date} date - Date object, timestamp, or date string
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        if (!date) return '-';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
    }
    
    /**
     * Pad zero for numbers
     * @param {number} num - Number to pad
     * @returns {string} Padded string
     */
    function padZero(num) {
        return num < 10 ? '0' + num : num;
    }
    
    /**
     * Get quality text description
     * @param {number|string} quality - Quality level
     * @returns {string} Quality description
     */
    function getQualityText(quality) {
        const qualityMap = {
            '1': 'Common',
            '2': 'Rare',
            '3': 'Epic',
            '4': 'Legendary',
            '5': 'Mythical'
        };
        
        return qualityMap[quality] || 'Common';
    }
    
    /**
     * Bind event listeners
     */
    function bindEvents() {
        if (closeBtn) {
            closeBtn.addEventListener('click', closeRewardModal);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeRewardModal);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleClaimConfirm);
        }
        
        // Click overlay to close modal
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(event) {
                if (event.target === modalOverlay) {
                    closeRewardModal();
                }
            });
        }
        
        // Close modal on ESC key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) {
                closeRewardModal();
            }
        });
    }
    
    /**
     * Initialization function
     */
    function init() {
        console.log('Initializing reward modal...');
        
        // Get DOM elements
        getAllElements();
        
        // Ensure all DOM elements are loaded
        if (!modalOverlay || !modal) {
            console.log('Modal DOM elements not found, attempting to create');
            createModalDOM();
            getAllElements();
        }
        
        // If DOM elements are loaded, bind events directly
        if (modalOverlay && modal) {
            bindEvents();
            isInitialized = true;
            console.log('Modal initialization complete');
        } else {
            // Try again after DOMContentLoaded event
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded event triggered, re-fetching DOM elements');
                // Re-fetch DOM elements
                getAllElements();
                
                // If still not found, try to create
                if (!modalOverlay || !modal) {
                    createModalDOM();
                    getAllElements();
                }
                
                // Bind events
                bindEvents();
                isInitialized = true;
                console.log('Modal initialization complete (DOMContentLoaded)');
            });
        }
    }
    
    // Immediately initialize
    init();
    
    // Expose public API
    window.RewardClaimModal = {
        open: openRewardModal,
        close: closeRewardModal,
        isInitialized: function() { return isInitialized; }
    };
    
    return {
        init: init
    };
})();

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RewardClaimModal;
} else {
    // Ensure RewardClaimModal is defined on the window object
    if (!window.RewardClaimModal) {
        console.error('Failed to define RewardClaimModal, please check the code');
    }
} 