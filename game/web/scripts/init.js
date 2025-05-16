/**
 * Global initialization script
 * Used to handle the initialization of wallet connection status shared across all pages
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Global initialization script is starting to load...');
    
    // Check elements to synchronize
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletAddressSpan = document.getElementById('walletAddress');
    const walletFrame = document.getElementById('walletFrame');
    
    // If there are no wallet-related elements, do not execute synchronization
    if (!walletBtn && !walletAddressSpan) {
        console.log('Wallet-related DOM elements not found, skipping initialization');
        return;
    }
    
    console.log('Starting to check wallet connection status...');
    
    // First, try to read connection information from sessionStorage
    const sessionWalletConnected = sessionStorage.getItem('walletConnected');
    const sessionWalletAddress = sessionStorage.getItem('walletAddress');
    
    // If sessionStorage has connection information, use it
    if (sessionWalletConnected === 'true' && sessionWalletAddress) {
        console.log('Wallet connection status read from sessionStorage');
        syncWalletUI(true, sessionWalletAddress);
        
        // Ensure to save to localStorage for long-term storage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', sessionWalletAddress);
        localStorage.setItem('walletType', sessionStorage.getItem('walletType') || 'metamask');
    }
    // Otherwise, try to read from localStorage
    else {
        const localWalletConnected = localStorage.getItem('walletConnected');
        const localWalletAddress = localStorage.getItem('walletAddress');
        
        if (localWalletConnected === 'true' && localWalletAddress) {
            console.log('Wallet connection status read from localStorage');
            syncWalletUI(true, localWalletAddress);
            
            // Synchronize to sessionStorage to ensure sharing across pages
            sessionStorage.setItem('walletConnected', 'true');
            sessionStorage.setItem('walletAddress', localWalletAddress);
            sessionStorage.setItem('walletType', localStorage.getItem('walletType') || 'metamask');
        }
    }
    
    // Global event listener to actively synchronize wallet information across all pages
    window.addEventListener('storage', function(event) {
        // Only handle storage changes related to the wallet
        if (event.key === 'walletConnected' || event.key === 'walletAddress' || event.key === 'walletType') {
            console.log('Detected storage change:', event.key, event.newValue);
            
            const isConnected = localStorage.getItem('walletConnected') === 'true';
            const address = localStorage.getItem('walletAddress');
            
            if (isConnected && address) {
                // If connection status is true, synchronize UI
                syncWalletUI(true, address);
                
                // Synchronize to sessionStorage
                sessionStorage.setItem('walletConnected', 'true');
                sessionStorage.setItem('walletAddress', address);
                sessionStorage.setItem('walletType', localStorage.getItem('walletType') || 'metamask');
            } else {
                // If connection status is false, reset UI
                syncWalletUI(false, null);
                
                // Clear sessionStorage
                sessionStorage.removeItem('walletConnected');
                sessionStorage.removeItem('walletAddress');
                sessionStorage.removeItem('walletType');
            }
        }
    });
    
    /**
     * Synchronize wallet UI status
     * @param {boolean} connected Whether connected
     * @param {string|null} address Wallet address
     */
    function syncWalletUI(connected, address) {
        // Format address display
        const formattedAddress = address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
        
        // Update address display
        if (walletAddressSpan) {
            if (connected && address) {
                walletAddressSpan.textContent = formattedAddress;
                walletAddressSpan.title = address;
                if (walletAddressSpan.classList.contains('truncated-address')) {
                    walletAddressSpan.classList.add('truncated-address');
                }
            } else {
                // i18n support
                const i18n = window.i18n;
                walletAddressSpan.textContent = i18n ? i18n.t('wallet.noWallet') : 'No Wallet Connected';
                walletAddressSpan.title = '';
                if (walletAddressSpan.classList.contains('truncated-address')) {
                    walletAddressSpan.classList.remove('truncated-address');
                }
            }
        }
        
        // Update button status
        if (walletBtn) {
            const i18n = window.i18n;
            if (connected) {
                walletBtn.textContent = i18n ? i18n.t('wallet.disconnect') : 'Disconnect Wallet';
                walletBtn.classList.add('connected');
            } else {
                walletBtn.textContent = i18n ? i18n.t('wallet.connect') : 'Connect Wallet';
                walletBtn.classList.remove('connected');
            }
        }
        
        console.log('Wallet UI synchronized, status:', connected ? 'Connected' : 'Not Connected');
    }
}); 