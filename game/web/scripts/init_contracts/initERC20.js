/**
 * Generic ERC20 Token Contract Initialization File
 * This file provides the initialization function for the generic ERC20 token contract
 */

/**
 * Initialize ERC20 token contract
 * @param {Object} web3 - Web3 instance
 * @param {string} contractAddress - Contract address
 * @param {Array} [customABI] - Custom ABI, if not provided, the generic ABI will be used
 * @returns {Object} ERC20 contract instance
 */
function initERC20Contract(web3, contractAddress, customABI) {
    if (!web3) {
        console.error('Failed to initialize ERC20 contract: Web3 not initialized');
        return null;
    }
    
    if (!contractAddress) {
        console.error('Failed to initialize ERC20 contract: Contract address is empty');
        return null;
    }
    
    try {
        // Get contract ABI, prioritize custom ABI, otherwise use generic ERC20 ABI
        const abi = customABI || window.GENERIC_ERC20_ABI;
        
        if (!abi) {
            console.error('Failed to initialize ERC20 contract: Generic ERC20 ABI not found, please ensure GENERIC_ERC20_ABI.js is loaded');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, contractAddress);
        console.log('Generic ERC20 contract initialized successfully, address:', contractAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize ERC20 contract:', error);
        return null;
    }
}

/**
 * Get token balance
 * @param {Object} contract - ERC20 contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} Token balance
 */
async function getERC20Balance(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get ERC20 balance: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        // Call balanceOf method to get balance
        console.log(`Calling contract balanceOf method, address:${contract._address}, user:${userAddress}`);
        const balance = await contract.methods.balanceOf(userAddress).call();
        return balance;
    } catch (error) {
        console.error(`Failed to get ERC20 balance (${userAddress}):`, error);
        return '0';
    }
}

/**
 * Get token information
 * @param {Object} contract - ERC20 contract instance
 * @returns {Promise<Object>} Token information
 */
async function getERC20TokenInfo(contract) {
    if (!contract) {
        console.error('Failed to get ERC20 token information: Contract instance is empty');
        return null;
    }
    
    try {
        // Fetch token information in parallel
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            contract.methods.name().call(),
            contract.methods.symbol().call(),
            contract.methods.decimals().call(),
            contract.methods.totalSupply().call()
        ]);
        
        return {
            name,
            symbol,
            decimals: parseInt(decimals),
            totalSupply
        };
    } catch (error) {
        console.error('Failed to get ERC20 token information:', error);
        return null;
    }
}

// Export functions to the global object
window.initERC20Contract = initERC20Contract;
window.getERC20Balance = getERC20Balance;
window.getERC20TokenInfo = getERC20TokenInfo; 