/**
 * Supported Stable Coins List
 * Provides information on stable coins required for staking functionality
 */
window.SupportedStableCoins = (function() {
    // Predefined list of supported stable coins for staking
    const stableCoins = [
        {
            symbol: 'USDT',
            name: 'USDT',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdt.png',
            address: '0xD9f52afe5EA8d84309888Dcf05a28bbF25c4630E'
        },
        {
            symbol: 'USDC',
            name: 'USDC',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdc.png',
            address: '0x0d1dd796C390b7980F0528ce697a0e545fC3C647'
        }
    ];
    
    const withdrawableStableCoins = [
        {
            symbol: 'USDT',
            name: 'USDT',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdt.png',
            address: '0xD9f52afe5EA8d84309888Dcf05a28bbF25c4630E'
        },
        {
            symbol: 'USDC',
            name: 'USDC',
            decimals: 18,
            logoUrl: '../../resources/images/icons/usdc.png',
            address: '0x0d1dd796C390b7980F0528ce697a0e545fC3C647'
        }
    ];

    /**
     * Get all supported stable coins list
     * @returns {Array} Array of stable coin information
     */
    function getAllStableCoins() {
        return stableCoins;
    }
    
    /**
     * Get all withdrawable stable coins list
     * @returns {Array} Array of withdrawable stable coin information
     */
    function getAllWithdrawableStableCoins() {
        return withdrawableStableCoins;
    }

    /**
     * Get stable coin information by symbol
     * @param {string} symbol - Stable coin symbol
     * @returns {Object|null} Stable coin information object, returns null if not found
     */
    function getStableCoinBySymbol(symbol) {
        return stableCoins.find(coin => coin.symbol === symbol) || null;
    }

    /**
     * Get stable coin address
     * @param {string} symbol - Stable coin symbol
     * @returns {string|null} Stable coin address, returns null if not found
     */
    function getStableCoinAddress(symbol) {
        const coin = getStableCoinBySymbol(symbol);
        return coin ? coin.address : null;
    }

    /**
     * Get stable coin information by address
     * @param {string} address - Stable coin contract address
     * @returns {Object|null} Stable coin information object, returns null if not found
     */
    function getStableCoinByAddress(address) {
        if (!address) return null;
        return stableCoins.find(coin => 
            coin.address.toLowerCase() === address.toLowerCase()
        ) || null;
    }
    
    /**
     * Get withdrawable stable coin information by address
     * @param {string} address - Stable coin contract address
     * @returns {Object|null} Withdrawable stable coin information object, returns null if not found
     */
    function getWithdrawableStableCoinByAddress(address) {
        if (!address) return null;
        return withdrawableStableCoins.find(coin => 
            coin.address.toLowerCase() === address.toLowerCase()
        ) || null;
    }

    /**
     * Check if the address is a supported stable coin
     * @param {string} address - Stable coin contract address
     * @returns {boolean} Whether it is a supported stable coin
     */
    function isAddressSupported(address) {
        return getStableCoinByAddress(address) !== null;
    }
    
    /**
     * Check if the address is a withdrawable stable coin
     * @param {string} address - Stable coin contract address
     * @returns {boolean} Whether it is a withdrawable stable coin
     */
    function isAddressSupportedForWithdrawal(address) {
        return getWithdrawableStableCoinByAddress(address) !== null;
    }

    // Return public API
    return {
        getAllStableCoins,
        getAllWithdrawableStableCoins,
        getStableCoinBySymbol,
        getStableCoinAddress,
        getStableCoinByAddress,
        getWithdrawableStableCoinByAddress,
        isAddressSupported,
        isAddressSupportedForWithdrawal
    };
})(); 