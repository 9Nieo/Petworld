/**
 * Network Detector Utility
 * 
 * This utility checks if the user is connected to the correct BSC network based on the 
 * currentNetwork setting in contractAddresses.js.
 * 
 * It provides functions to detect and prompt users to switch networks if needed.
 */

// Network configuration
const NETWORK_CONFIG = {
    TEST: {
        chainId: '0x61', // BSC Testnet chainId in hex
        chainIdDecimal: 97, // BSC Testnet chainId in decimal
        name: 'BSC Testnet',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        blockExplorerUrl: 'https://testnet.bscscan.com',
        currencySymbol: 'BNB',
        currencyName: 'BNB',
        currencyDecimals: 18
    },
    MAIN: {
        chainId: '0x38', // BSC Mainnet chainId in hex
        chainIdDecimal: 56, // BSC Mainnet chainId in decimal
        name: 'Binance Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        blockExplorerUrl: 'https://bscscan.com',
        currencySymbol: 'BNB',
        currencyName: 'BNB',
        currencyDecimals: 18
    }
};

// NetworkDetector class
class NetworkDetector {
    constructor() {
        // Modal DOM elements
        this.modalContainer = null;
        this.modalContent = null;

        // State
        this.currentNetworkName = null;
        this.requiredNetworkConfig = null;
        this.isCorrectNetwork = false;
        this.provider = null;
        this.checking = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Network switch prompt interval control (1 minute)
        this.lastPromptTime = 0;
        this.promptInterval = 60000; // 1 minute in milliseconds
        
        // Initialize event listeners for network changes
        this._initNetworkChangeListeners();
    }

    /**
     * Initialize the detector
     * @param {boolean} autoCheck - Whether to perform an automatic check on initialization
     */
    async init(autoCheck = true) {
        console.log('[NetworkDetector] Initializing network detector');
        
        // Get required network from contractAddresses.js
        this.currentNetworkName = window.getCurrentNetwork ? window.getCurrentNetwork() : window.CONTRACT_NETWORKS.TEST;
        this.requiredNetworkConfig = NETWORK_CONFIG[this.currentNetworkName];
        
        if (!this.requiredNetworkConfig) {
            console.error(`[NetworkDetector] Unknown network: ${this.currentNetworkName}`);
            return;
        }
        
        // Create modal elements if they don't exist
        this._createModal();
        
        // Get provider
        this.provider = this._getProvider();
        
        // Check if private key wallet is being used - if so, delay auto check
        if (autoCheck && this.provider) {
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                
                if (keyCount > 0) {
                    console.log('[NetworkDetector] Private key wallet detected, delaying network check to allow initialization');
                    // Delay network check for private key wallet to allow full initialization
                    setTimeout(() => {
                        this.checkNetwork();
                    }, 10000); // 10 second delay for private key wallet
                } else {
                    // No private key wallet, check immediately for external wallets
                    await this.checkNetwork();
                }
            } else {
                // SecureWalletManager not available, check immediately
                await this.checkNetwork();
            }
        }
        
        return this;
    }

    /**
     * Get the Ethereum provider from available wallet
     * @returns {Object|null} - The Ethereum provider or null if not available
     */
    _getProvider() {
        // Try to get provider from different wallet sources
        if (window.ethereum) {
            return window.ethereum;
        } else if (window.web3 && window.web3.currentProvider) {
            return window.web3.currentProvider;
        } else if (window.okxwallet) {
            return window.okxwallet;
        }
        
        return null;
    }

    /**
     * Initialize network change listeners
     */
    _initNetworkChangeListeners() {
        // Listen for chain changes
        if (window.ethereum) {
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('[NetworkDetector] Chain changed to:', chainId);
                // Add delay to avoid immediate check after chain change
                setTimeout(() => {
                    this.checkNetwork();
                }, 1000);
            });
        }
        
        // Listen for wallet connection events
        window.addEventListener('wallet.walletConnected', () => {
            console.log('[NetworkDetector] Wallet connected, checking network');
            this.checkNetwork();
        });
        
        // Listen for private key wallet status changes with interval control
        setInterval(() => {
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isAuthenticated = window.SecureWalletManager.isUserAuthenticated();
                const isReady = window.SecureWalletManager.isWalletReady();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const isInitializing = window.SecureWalletManager.isInitializing;
                
                // If private key wallet exists (has keys), hide network modal and skip all checks
                if (keyCount > 0) {
                    if (this.modalContainer && this.modalContainer.classList.contains('active')) {
                        console.log('[NetworkDetector] Private key wallet detected (has keys), hiding network modal');
                        this.modalContainer.classList.remove('active');
                        this.isCorrectNetwork = true;
                    }
                    return; // Skip all network checks for private key wallet users
                }
                
                // If SecureWalletManager is still initializing, skip checks
                if (isInitializing) {
                    console.log('[NetworkDetector] SecureWalletManager is initializing, skipping network check');
                    return;
                }
                
                // Only check external wallet network if no private key wallet is active
                const isExternalWalletConnected = sessionStorage.getItem('walletConnected') === 'true' || 
                                                localStorage.getItem('walletConnected') === 'true';
                if (isExternalWalletConnected) {
                    // Only check if enough time has passed since last prompt
                    const currentTime = Date.now();
                    if (currentTime - this.lastPromptTime >= this.promptInterval) {
                        this.checkNetwork();
                    }
                }
            }
        }, 10000); // Reduced frequency to every 10 seconds to minimize interference
    }

    /**
     * Create the network switch modal UI
     */
    _createModal() {
        if (this.modalContainer) return;
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'network-modal-container';

        this.modalContent = document.createElement('div');
        this.modalContent.className = 'network-modal-content';

        this.modalContainer.appendChild(this.modalContent);
        document.body.appendChild(this.modalContainer);
    }

    /**
     * Show the network switch modal
     * @param {string} currentChainId - The current chain ID
     */
    _showNetworkSwitchModal(currentChainId) {
        // Check if enough time has passed since last prompt
        const currentTime = Date.now();
        if (currentTime - this.lastPromptTime < this.promptInterval) {
            console.log('[NetworkDetector] Network switch prompt skipped due to interval control');
            return;
        }
        
        // Update last prompt time
        this.lastPromptTime = currentTime;
        
        if (!this.modalContainer || !this.modalContent) {
            this._createModal();
        }
        
        const requiredNetwork = this.requiredNetworkConfig.name;
        const i18n = window.i18n;
        
        // Localized text using i18n if available
        const wrongNetworkText = i18n && typeof i18n.t === 'function' ? 
            i18n.t('network.wrongNetwork', { requiredNetwork }) : 
            `Wrong network connection`;
            
        const detailText = i18n && typeof i18n.t === 'function' ? 
            i18n.t('network.pleaseSwitch', { requiredNetwork }) : 
            `Please switch your wallet to the ${requiredNetwork} network to continue using Pet World.`;
            
        const switchButtonText = i18n && typeof i18n.t === 'function' ? 
            i18n.t('network.switchNetwork') : 
            'Switch Network';
            
        const closeButtonText = i18n && typeof i18n.t === 'function' ? 
            i18n.t('common.close') : 
            'Close';
        
        // Set modal content
        this.modalContent.innerHTML = `
            <div class="network-modal-header">
                <h2>${wrongNetworkText}</h2>
            </div>
            <p class="network-modal-body">${detailText}</p>
            <div class="network-modal-info">
                <p><strong>Current Network:</strong> ${this._getNetworkNameFromChainId(currentChainId) || 'Unknown Network'}</p>
                <p><strong>Required Network:</strong> ${this.requiredNetworkConfig.name}</p>
            </div>
            <div class="network-modal-footer">
                <button id="switchNetworkBtn" class="network-modal-btn switch">${switchButtonText}</button>
                <button id="closeNetworkModalBtn" class="network-modal-btn close">${closeButtonText}</button>
            </div>
        `;
        
        // Show modal
        this.modalContainer.classList.add('active');
        
        // Add event listeners
        document.getElementById('switchNetworkBtn').addEventListener('click', () => {
            this.switchNetwork();
        });
        
        document.getElementById('closeNetworkModalBtn').addEventListener('click', () => {
            this.modalContainer.classList.remove('active');
        });
        
        console.log('[NetworkDetector] Network switch modal shown');
    }

    /**
     * Get network name from chain ID
     * @param {string} chainId - The chain ID in hex or decimal
     * @returns {string} - The network name
     */
    _getNetworkNameFromChainId(chainId) {
        // Convert to decimal for easier comparison
        const chainIdDec = parseInt(chainId, chainId.startsWith('0x') ? 16 : 10);
        
        if (chainIdDec === NETWORK_CONFIG.TEST.chainIdDecimal) {
            return NETWORK_CONFIG.TEST.name;
        } else if (chainIdDec === NETWORK_CONFIG.MAIN.chainIdDecimal) {
            return NETWORK_CONFIG.MAIN.name;
        }
        
        // Special cases for some common networks
        switch (chainIdDec) {
            case 1: return 'Ethereum Mainnet';
            case 3: return 'Ropsten Testnet';
            case 4: return 'Rinkeby Testnet';
            case 5: return 'Goerli Testnet';
            case 42: return 'Kovan Testnet';
            default: return `Unknown Network (${chainId})`;
        }
    }

    /**
     * Check if the current network matches the required network
     * Only checks for external wallets, skips check for private key wallets
     */
    async checkNetwork() {
        if (this.checking) return;
        
        this.checking = true;
        
        try {
            // Enhanced check for private key wallet - if so, skip network check entirely
            if (window.SecureWalletManager) {
                const keyCount = window.SecureWalletManager.getKeyCount();
                const isAuthenticated = window.SecureWalletManager.isUserAuthenticated();
                const isReady = window.SecureWalletManager.isWalletReady();
                const isLocked = window.SecureWalletManager.isWalletLocked();
                const isInitializing = window.SecureWalletManager.isInitializing;
                
                // If private key wallet exists (has keys), skip network check regardless of state
                if (keyCount > 0) {
                    console.log('[NetworkDetector] Private key wallet detected (has keys), skipping network check');
                    this.isCorrectNetwork = true;
                    
                    // Hide network modal if it's showing
                    if (this.modalContainer && this.modalContainer.classList.contains('active')) {
                        this.modalContainer.classList.remove('active');
                    }
                    
                    this.checking = false;
                    return;
                }
                
                // If SecureWalletManager is still initializing, delay the check
                if (isInitializing) {
                    console.log('[NetworkDetector] SecureWalletManager is still initializing, delaying network check');
                    this.checking = false;
                    
                    // Retry after a delay
                    setTimeout(() => {
                        this.checkNetwork();
                    }, 3000);
                    return;
                }
            }
            
            // Only check network for external wallets
            const isExternalWalletConnected = sessionStorage.getItem('walletConnected') === 'true' || 
                                            localStorage.getItem('walletConnected') === 'true';
            
            if (!isExternalWalletConnected) {
                console.log('[NetworkDetector] No external wallet connected, skipping network check');
                this.checking = false;
                return;
            }
            
            // Get provider for external wallet check
            this.provider = this._getProvider();
            
            if (!this.provider) {
                console.log('[NetworkDetector] No provider available for network check');
                this.checking = false;
                return;
            }
            
            // Get current chain ID
            let currentChainId;
            try {
                if (this.provider.request) {
                    currentChainId = await this.provider.request({ method: 'eth_chainId' });
                } else if (this.provider.send) {
                    currentChainId = await new Promise((resolve, reject) => {
                        this.provider.send({ method: 'eth_chainId' }, (error, result) => {
                            if (error) reject(error);
                            else resolve(result.result);
                        });
                    });
                } else {
                    console.warn('[NetworkDetector] Provider does not support network detection');
                    this.checking = false;
                    return;
                }
            } catch (error) {
                console.error('[NetworkDetector] Failed to get chain ID:', error);
                this.checking = false;
                return;
            }
            
            const requiredChainId = this.requiredNetworkConfig.chainId;
            
            console.log('[NetworkDetector] Current chain ID:', currentChainId);
            console.log('[NetworkDetector] Required chain ID:', requiredChainId);
            
            if (currentChainId === requiredChainId) {
                console.log('[NetworkDetector] Connected to correct network');
                this.isCorrectNetwork = true;
                
                // Hide modal if it's showing
                if (this.modalContainer && this.modalContainer.classList.contains('active')) {
                    this.modalContainer.classList.remove('active');
                }
            } else {
                console.log('[NetworkDetector] Wrong network detected');
                this.isCorrectNetwork = false;
                
                // Show network switch modal with interval control
                this._showNetworkSwitchModal(currentChainId);
            }
        } catch (error) {
            console.error('[NetworkDetector] Network check failed:', error);
            this.isCorrectNetwork = false;
        } finally {
            this.checking = false;
        }
    }

    /**
     * Prompt the user to switch to the required network
     */
    async switchNetwork() {
        if (!this.provider) {
            console.error('[NetworkDetector] No provider available');
            return false;
        }
        
        try {
            // Get required network config
            const network = this.requiredNetworkConfig;
            
            // Request chain switch first
            try {
                await this.provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: network.chainId }],
                });
                
                console.log(`[NetworkDetector] Successfully switched to ${network.name}`);
                this.modalContainer.classList.remove('active');
                return true;
            } catch (switchError) {
                // This error code means the chain has not been added to MetaMask
                if (switchError.code === 4902 || 
                    // Handle errors differently as different wallets might use different error codes
                    switchError.message.includes('wallet_addEthereumChain') ||
                    switchError.message.includes('Unrecognized chain')) {
                    
                    console.log(`[NetworkDetector] Network not added to wallet. Adding ${network.name}...`);
                    
                    // Add the network
                    await this.provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: network.chainId,
                            chainName: network.name,
                            nativeCurrency: {
                                name: network.currencyName,
                                symbol: network.currencySymbol,
                                decimals: network.currencyDecimals
                            },
                            rpcUrls: [network.rpcUrl],
                            blockExplorerUrls: [network.blockExplorerUrl]
                        }]
                    });
                    
                    console.log(`[NetworkDetector] Successfully added ${network.name}`);
                    this.modalContainer.classList.remove('active');
                    return true;
                } else {
                    throw switchError;
                }
            }
        } catch (error) {
            console.error('[NetworkDetector] Error switching network:', error);
            
            // Show error in modal
            const errorMsg = document.createElement('p');
            errorMsg.className = 'network-modal-body';
            errorMsg.style.color = '#e74c3c';
            errorMsg.style.marginTop = '10px';
            errorMsg.textContent = 'Network switch failed, please switch networks manually or refresh the page to try again.';
            
            const errorDetail = document.createElement('p');
            errorDetail.className = 'network-modal-body';
            errorDetail.style.fontSize = '12px';
            errorDetail.style.color = '#7f8c8d';
            errorDetail.style.marginTop = '5px';
            errorDetail.textContent = error.message || 'Unknown error';
            
            this.modalContent.appendChild(errorMsg);
            this.modalContent.appendChild(errorDetail);
            
            return false;
        }
    }

    /**
     * Get the required chain ID based on current network setting
     * @returns {string} The required chain ID in hex format
     */
    getRequiredChainId() {
        return this.requiredNetworkConfig ? this.requiredNetworkConfig.chainId : null;
    }

    /**
     * Get the required network name
     * @returns {string} The required network name
     */
    getRequiredNetworkName() {
        return this.requiredNetworkConfig ? this.requiredNetworkConfig.name : null;
    }

    /**
     * Check if the user is on the correct network
     * @returns {boolean} Whether the user is on the correct network
     */
    isOnCorrectNetwork() {
        return this.isCorrectNetwork;
    }
}

// Create a singleton instance
window.NetworkDetector = new NetworkDetector();

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize network detector after a delay to ensure other scripts are loaded
    setTimeout(() => {
        // Check if private key wallet is being used - if so, use longer delay
        if (window.SecureWalletManager) {
            const keyCount = window.SecureWalletManager.getKeyCount();
            
            if (keyCount > 0) {
                console.log('[NetworkDetector] Private key wallet detected on DOMContentLoaded, using longer initialization delay');
                // Longer delay for private key wallet users
                setTimeout(() => {
                    window.NetworkDetector.init();
                }, 15000); // 15 second additional delay
                return;
            }
        }
        
        // Normal initialization for external wallet users
        window.NetworkDetector.init();
    }, 500);
});

// Listen for page visibility changes to recheck network when user returns to the page
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Check if private key wallet is being used - if so, skip network check
        if (window.SecureWalletManager) {
            const keyCount = window.SecureWalletManager.getKeyCount();
            
            if (keyCount > 0) {
                console.log('[NetworkDetector] Private key wallet detected on visibility change, skipping network check');
                return;
            }
        }
        
        // Only check for external wallets
        const isExternalWalletConnected = sessionStorage.getItem('walletConnected') === 'true' || 
                                        localStorage.getItem('walletConnected') === 'true';
        
        if (isExternalWalletConnected) {
            window.NetworkDetector.checkNetwork();
        }
    }
});

// Expose network detector to global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NetworkDetector: window.NetworkDetector };
}

// Inject CSS for prettier modal styling
;(function() {
  const css = `
    .network-modal-container {
      position: fixed; top:0; left:0; width:100%; height:100%;
      background-color: rgba(0,0,0,0.5);
      display: flex; justify-content: center; align-items: center;
      z-index: 10000; opacity: 0; visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .network-modal-container.active {
      opacity: 1; visibility: visible;
    }
    .network-modal-content {
      background: #fff; border-radius: 12px; padding: 24px;
      width: 90%; max-width: 400px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      transform: scale(0.95); transition: transform 0.3s ease;
    }
    .network-modal-container.active .network-modal-content {
      transform: scale(1);
    }
    .network-modal-header {
      display: flex; align-items: center; margin-bottom: 16px;
    }
    .network-modal-header h2 {
      flex: 1; font-size: 1.25rem; color: #333; margin: 0;
    }
    .network-modal-close {
      background: transparent; border: none; font-size: 1.25rem;
      cursor: pointer; color: #aaa; transition: color 0.2s;
    }
    .network-modal-close:hover { color: #333; }
    .network-modal-body p {
      margin: 8px 0; color: #555; line-height: 1.4;
    }
    .network-modal-info {
      background: #f5f5f5; border-radius: 8px; padding: 12px;
      margin: 16px 0; font-size: 0.875rem; color: #333;
    }
    .network-modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
    }
    .network-modal-btn {
      padding: 8px 16px; border-radius: 6px; border: none;
      cursor: pointer; font-size: 0.875rem;
      transition: background 0.2s;
    }
    .network-modal-btn.switch {
      background: #4caf50; color: #fff;
    }
    .network-modal-btn.switch:hover {
      background: #45a049;
    }
    .network-modal-btn.close {
      background: #e0e0e0; color: #333;
    }
    .network-modal-btn.close:hover {
      background: #ccc;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.appendChild(document.createTextNode(css));
  document.head.appendChild(styleEl);
})(); 