// Wallet modal control script

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const closeModalBtn = document.getElementById('closeWalletModal');
    const metamaskOption = document.getElementById('metamaskOption');
    const okxOption = document.getElementById('okxOption');
    const walletconnectOption = document.getElementById('walletconnectOption');
    const walletStatusText = document.getElementById('walletStatusText');
    const walletLoading = document.getElementById('walletLoading');
    
    // If DOM elements do not exist, do not continue
    if (!closeModalBtn || !metamaskOption || !okxOption || 
        !walletconnectOption || !walletStatusText || !walletLoading) {
        console.error('Required DOM elements for wallet modal not found');
        return;
    }
    
    // Bind close button click event
    closeModalBtn.addEventListener('click', () => {
        closeWalletModal();
    });
    
    // Bind wallet option click events
    metamaskOption.addEventListener('click', () => {
        connectWallet('metamask');
    });
    
    okxOption.addEventListener('click', () => {
        connectWallet('okx');
    });
    
    walletconnectOption.addEventListener('click', () => {
        connectWallet('walletconnect');
    });
    
    /**
     * Close the wallet modal
     */
    function closeWalletModal() {
        // Send a message to the parent window to close the modal
        window.parent.postMessage({
            type: 'walletModalClosed'
        }, '*');
    }
    
    /**
     * Connect to a wallet
     * @param {string} walletType - Wallet type
     */
    function connectWallet(walletType) {
        try {
            // Show loading state
            showLoadingState(`Connecting to ${getWalletDisplayName(walletType)}...`);
            
            // Call the global wallet manager based on wallet type
            if (window.walletConnector) {
                window.walletConnector.connectWallet(walletType);
            } else {
                console.error('Wallet connector not found');
                showErrorState('Failed to initialize wallet connector');
            }
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            showErrorState(error.message || 'Failed to connect to wallet');
        }
    }
    
    /**
     * Show loading state
     * @param {string} message - Status message
     */
    function showLoadingState(message) {
        walletStatusText.textContent = message;
        walletLoading.style.display = 'block';
    }
    
    /**
     * Show error state
     * @param {string} message - Error message
     */
    function showErrorState(message) {
        walletStatusText.textContent = message;
        walletLoading.style.display = 'none';
    }
    
    /**
     * Get wallet display name
     * @param {string} walletType - Wallet type
     * @returns {string} Wallet display name
     */
    function getWalletDisplayName(walletType) {
        switch (walletType) {
            case 'metamask':
                return 'MetaMask';
            case 'okx':
                return 'OKX Wallet';
            case 'walletconnect':
                return 'WalletConnect';
            default:
                return 'Wallet';
        }
    }
    
    // Listen for messages from the parent window
    window.addEventListener('message', (event) => {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        // Handle disconnect wallet message
        if (message.type === 'disconnectWallet') {
            if (window.walletConnector) {
                window.walletConnector.disconnectWallet();
            }
        }
    });
}); 