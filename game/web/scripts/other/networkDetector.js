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
        
        // Automatically check network if requested
        if (autoCheck && this.provider) {
            await this.checkNetwork();
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
     * Initialize network change event listeners
     */
    _initNetworkChangeListeners() {
        // Listen for chain changes
        window.addEventListener('ethereum#chainChanged', (chainId) => {
            console.log(`[NetworkDetector] Chain changed to: ${chainId}`);
            this.checkNetwork();
        });
        
        // Fallback for older metamask versions
        if (window.ethereum) {
            window.ethereum.on('chainChanged', (chainId) => {
                console.log(`[NetworkDetector] Chain changed to: ${chainId}`);
                this.checkNetwork();
            });
        }
        
        // Listen for account changes (which might also indicate network changes)
        window.addEventListener('wallet.walletConnected', () => {
            console.log('[NetworkDetector] Wallet connected, checking network');
            this.checkNetwork();
        });
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
     */
    async checkNetwork() {
        if (this.checking) return;
        
        this.checking = true;
        
        try {
            // Get the provider again in case it changed
            this.provider = this._getProvider();
            
            if (!this.provider) {
                console.log('[NetworkDetector] No provider available, waiting for wallet connection');
                this.checking = false;
                return false;
            }
            
            // Get the current chain ID
            const chainId = await this.provider.request({ method: 'eth_chainId' });
            console.log(`[NetworkDetector] Current chainId: ${chainId}`);
            
            // Check if the current network matches the required network
            if (this.currentNetworkName === 'TEST' && chainId === NETWORK_CONFIG.TEST.chainId) {
                console.log('[NetworkDetector] Correct network: BSC Testnet');
                this.isCorrectNetwork = true;
                this.modalContainer.classList.remove('active');
                this.checking = false;
                return true;
            } else if (this.currentNetworkName === 'MAIN' && chainId === NETWORK_CONFIG.MAIN.chainId) {
                console.log('[NetworkDetector] Correct network: BSC Mainnet');
                this.isCorrectNetwork = true;
                this.modalContainer.classList.remove('active');
                this.checking = false;
                return true;
            } else {
                console.log(`[NetworkDetector] Wrong network. Current: ${chainId}, Required: ${this.requiredNetworkConfig.chainId}`);
                this.isCorrectNetwork = false;
                this._showNetworkSwitchModal(chainId);
                this.checking = false;
                return false;
            }
        } catch (error) {
            console.error('[NetworkDetector] Error checking network:', error);
            this.checking = false;
            return false;
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
    // Initialize network detector after a short delay to ensure other scripts are loaded
    setTimeout(() => {
        window.NetworkDetector.init();
    }, 500);
});

// Listen for page visibility changes to recheck network when user returns to the page
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        window.NetworkDetector.checkNetwork();
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