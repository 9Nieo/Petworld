/**
 * List of supported payment tokens for the trading market
 * Provides payment token information required for the NFT trading market
 */
window.SupportedMarketTokens = (function() {
    // Predefined list of tokens supporting NFT trading
    const marketTokens = [
        {
            symbol: 'USDT',
            name: 'USDT',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdt.png',
            address: '0x4e79347Ea521Af7E3D948C63E22711fd24472158'
        },
        {
            symbol: 'USDC',
            name: 'USDC',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdc.png',
            address: '0x94B77aa27935D75618621B871dcb5A8C1cF83002'
        }
    ];

    /**
     * Get all tokens supported for NFT trading
     * @returns {Array} Array of token information
     */
    function getAllMarketTokens() {
        return marketTokens;
    }

    /**
     * Get token information by symbol
     * @param {string} symbol - Token symbol
     * @returns {Object|null} Token information object, returns null if not found
     */
    function getMarketTokenBySymbol(symbol) {
        return marketTokens.find(token => token.symbol === symbol) || null;
    }

    /**
     * Get token address
     * @param {string} symbol - Token symbol
     * @returns {string|null} Token address, returns null if not found
     */
    function getMarketTokenAddress(symbol) {
        const token = getMarketTokenBySymbol(symbol);
        return token ? token.address : null;
    }

    /**
     * Get token information by address
     * @param {string} address - Token contract address
     * @returns {Object|null} Token information object, returns null if not found
     */
    function getMarketTokenByAddress(address) {
        if (!address) return null;
        return marketTokens.find(token => 
            token.address.toLowerCase() === address.toLowerCase()
        ) || null;
    }

    /**
     * Check if the address is a supported trading token
     * @param {string} address - Token contract address
     * @returns {boolean} Whether it is a supported trading token
     */
    function isTokenAddressSupported(address) {
        return getMarketTokenByAddress(address) !== null;
    }

    /**
     * Get ETH token information
     * @returns {Object} ETH token information object
     */
    function getETHToken() {
        return getMarketTokenBySymbol('ETH');
    }

    /**
     * Check if the address is an ETH address (zero address)
     * @param {string} address - Token address
     * @returns {boolean} Whether it is an ETH address
     */
    function isETHAddress(address) {
        if (!address) return false;
        return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
    }

    // Return public API
    return {
        getAllMarketTokens,
        getMarketTokenBySymbol,
        getMarketTokenAddress,
        getMarketTokenByAddress,
        isTokenAddressSupported,
        getETHToken,
        isETHAddress
    };
})(); 