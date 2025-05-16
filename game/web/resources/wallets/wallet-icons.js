/**
 * Wallet icon inline SVG
 * Used to display when images cannot be loaded
 */

const WALLET_ICONS = {
    // SVG data for MetaMask icon
    metamask: `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
            <path d="M21.4125 0h-18.825v24h18.825v-24zm-7.06554 18.7801h-4.69387v-1.23h4.69387v1.23zm6.39719 -3.81084c0 1.13232 -.92183 2.05416 -2.05416 2.05416h-8.37988c-1.13232 0 -2.05416 -.92183 -2.05416 -2.05416v-10.02541c0 -1.13232.92183 -2.05416 2.05416 -2.05416h8.37988c1.13232 0 2.05416.92183 2.05416 2.05416v10.02541z" 
            fill="#f7931a"/>
        </svg>`,
    
    // SVG data for WalletConnect icon
    walletconnect: `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
            <path d="M5.96 8.48c3.27 -3.27 8.58 -3.27 11.86 0l.39.39c.16.16.16.42 0 .58l-1.33 1.33c-.08.08 -.21.08 -.29 0l-.54 -.54c-2.28 -2.28 -5.98 -2.28 -8.27 0l-.58.58c-2.28 2.28 -2.28 5.98 0 8.27l.58.58c2.28 2.28 5.98 2.28 8.27 0l.54 -.54c .08 -.08.21 -.08.29 0l1.33 1.33c .16.16.16.42 0 .58l-.39.39c-3.27 3.27 -8.58 3.27 -11.86 0l-3.9 -3.9c-3.27 -3.26 -3.27 -8.58 0 -11.86l2.9 -2.9z" 
            fill="#3b99fc"/>
        </svg>`,
    
    // SVG data for OKX wallet icon
    okx: `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
            <path d="M12 0c6.63 0 12 5.37 12 12s-5.37 12-12 12S0 18.63 0 12 5.37 0 12 0zm-2.293 4.828c-1.917 0-3.472 1.555-3.472 3.472s1.555 3.472 3.472 3.472 3.472-1.555 3.472-3.472-1.555-3.472-3.472-3.472zm4.586 4.586c-1.917 0-3.472 1.555-3.472 3.472s1.555 3.472 3.472 3.472 3.472-1.555 3.472-3.472-1.555-3.472-3.472-3.472z" 
            fill="#0285c0"/>
        </svg>`
};

// Add icons to global variable
window.WALLET_ICONS = WALLET_ICONS; 