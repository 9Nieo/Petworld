const SUPPORTED_PAYMENT_TOKENS = [
    {
        id: 'USDT',
        name: 'USDT',
        contractAddress: '0x55d398326f99059ff775485246999027b3197955',
        icon: '../../resources/images/icons/usdt.png',
        decimals: 18,
        isDefault: true
    },
    {
        id: 'USDC',
        name: 'USDC',
        contractAddress: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
        icon: '../../resources/images/icons/usdc.png',
        decimals: 18,
        isDefault: false
    }
];

// Exposed to global scope
window.SUPPORTED_PAYMENT_TOKENS = SUPPORTED_PAYMENT_TOKENS;

/**
 * Add a new payment token
 * @param {Object} tokenInfo - Token information object
 * @returns {boolean} Whether the addition was successful
 */
function addSupportedToken(tokenInfo) {
    // Check for necessary fields
    if (!tokenInfo.id || !tokenInfo.name || !tokenInfo.contractAddress) {
        console.error('Failed to add token: missing required fields');
        return false;
    }
    
    // Check if a token with the same ID already exists
    const exists = SUPPORTED_PAYMENT_TOKENS.some(token => token.id === tokenInfo.id);
    if (exists) {
        console.warn(`Token with ID ${tokenInfo.id} already exists, skipping addition`);
        return false;
    }
    
    // Add default values
    if (tokenInfo.decimals === undefined) tokenInfo.decimals = 18;
    if (tokenInfo.isDefault === undefined) tokenInfo.isDefault = false;
    if (!tokenInfo.icon) tokenInfo.icon = '../../resources/images/icons/default-coin.png';
    
    // Add to the list
    SUPPORTED_PAYMENT_TOKENS.push(tokenInfo);
    
    // If set as default, unset default status for other tokens
    if (tokenInfo.isDefault) {
        SUPPORTED_PAYMENT_TOKENS.forEach(token => {
            if (token.id !== tokenInfo.id) {
                token.isDefault = false;
            }
        });
    }
    
    console.log(`Successfully added supported token: ${tokenInfo.name} (${tokenInfo.id})`);
    
    // If there is a TokenBalanceManager instance, also add to the manager
    if (window.tokenBalanceManager) {
        window.tokenBalanceManager.addPaymentToken(tokenInfo);
    }
    
    return true;
}

// Expose the add token method
window.addSupportedToken = addSupportedToken; 