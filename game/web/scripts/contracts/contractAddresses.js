/**
 * Contract address configuration file
 * Centralize management of all smart contract addresses for testing and updating
 */

// Initialize global variables
window.process = window.process || { env: { NODE_DEBUG: false } };
window.global = window.global || window;

// Contract network configuration
window.CONTRACT_NETWORKS = window.CONTRACT_NETWORKS || {
  // Test network
  TEST: 'TEST',
  // Main network
  MAIN: 'MAIN',
  // Local development network
  LOCAL: 'LOCAL'
};

// Current network environment
window.currentNetwork = window.CONTRACT_NETWORKS.TEST;

// Contract address configuration for different network environments
window.contractAddresses = window.contractAddresses || {
    [window.CONTRACT_NETWORKS.TEST]: {
      PwPoint: '0x0000000000000000000000000000000000000000',  
      PwFood: '0x0000000000000000000000000000000000000000',  
      PwBounty: '0x0000000000000000000000000000000000000000',  
      PwReverse: '0x0000000000000000000000000000000000000000',  
      PwNFT: '0x0000000000000000000000000000000000000000',  
      PwUSD: '0x0000000000000000000000000000000000000000',  
      NFTManager: '0x0000000000000000000000000000000000000000',  
      NFTFeedingManager: '0x0000000000000000000000000000000000000000',  
      NFTLotteryManager: '0x0000000000000000000000000000000000000000',  
      PwPointManager: '0x0000000000000000000000000000000000000000',  
      PaymentManager: '0x0000000000000000000000000000000000000000',  
      PwFoodManager: '0x0000000000000000000000000000000000000000',  
      PwUSDStaking: '0x0000000000000000000000000000000000000000',  
      NFTMarketplace: '0x0000000000000000000000000000000000000000',  
      RareNFTTransactionIndexer: '0x0000000000000000000000000000000000000000',  
      PetWorld: '0x0000000000000000000000000000000000000000',  
      PetWorldManager: '0x0000000000000000000000000000000000000000',  
      PwPointBurner: '0x0000000000000000000000000000000000000000',  
      PetWorldStaking: '0x0000000000000000000000000000000000000000',  
      PwReverseBurner: '0x0000000000000000000000000000000000000000',  
  },
    [window.CONTRACT_NETWORKS.MAIN]: {
        PwPoint: '0x0000000000000000000000000000000000000000',  
        PwFood: '0x0000000000000000000000000000000000000000',  
        PwBounty: '0x0000000000000000000000000000000000000000',  
        PwReverse: '0x0000000000000000000000000000000000000000',  
        PwNFT: '0x0000000000000000000000000000000000000000',  
        PwUSD: '0x0000000000000000000000000000000000000000',  
        NFTManager: '0x0000000000000000000000000000000000000000',  
        NFTFeedingManager: '0x0000000000000000000000000000000000000000',  
        NFTLotteryManager: '0x0000000000000000000000000000000000000000',  
        PwPointManager: '0x0000000000000000000000000000000000000000',  
        PaymentManager: '0x0000000000000000000000000000000000000000',  
        PwFoodManager: '0x0000000000000000000000000000000000000000',  
        PwUSDStaking: '0x0000000000000000000000000000000000000000',  
        NFTMarketplace: '0x0000000000000000000000000000000000000000',  
        RareNFTTransactionIndexer: '0x0000000000000000000000000000000000000000',  
    PetWorld: '0x0000000000000000000000000000000000000000',  
    PetWorldManager: '0x0000000000000000000000000000000000000000',  
    PwPointBurner: '0x0000000000000000000000000000000000000000',  
    PetWorldStaking: '0x0000000000000000000000000000000000000000',  
    PwReverseBurner: '0x0000000000000000000000000000000000000000',  
  },
    [window.CONTRACT_NETWORKS.LOCAL]: {
  },
};

/**
 * Get the address of the specified contract in the current network environment
 * @param {string} contractName - Contract name
 * @returns {string} Contract address
 */
function getContractAddress(contractName) {
  // Check if current network exists in contractAddresses
  if (!window.contractAddresses[window.currentNetwork]) {
    console.warn(`Network ${window.currentNetwork} not found, falling back to TEST network`);
    window.currentNetwork = window.CONTRACT_NETWORKS.TEST;
  }
  
  // Check if the contract exists in the current network
  if (!window.contractAddresses[window.currentNetwork][contractName]) {
    console.warn(`Contract ${contractName} not found in network ${window.currentNetwork}, checking TEST network`);
    
    // Try to use TEST network as fallback
    if (window.contractAddresses[window.CONTRACT_NETWORKS.TEST] && 
        window.contractAddresses[window.CONTRACT_NETWORKS.TEST][contractName]) {
      return window.contractAddresses[window.CONTRACT_NETWORKS.TEST][contractName];
    }
    
    // If not in TEST, try LOCAL
    if (window.contractAddresses[window.CONTRACT_NETWORKS.LOCAL] && 
        window.contractAddresses[window.CONTRACT_NETWORKS.LOCAL][contractName]) {
      return window.contractAddresses[window.CONTRACT_NETWORKS.LOCAL][contractName];
    }
    
    // If all else fails, throw an error
    throw new Error(`Contract ${contractName} address not found on any network`);
  }
  
  return window.contractAddresses[window.currentNetwork][contractName];
}

function getAllContractAddresses() {
  return { ...window.contractAddresses[window.currentNetwork] };
}

function getCurrentNetwork() {
  return window.currentNetwork;
}

/**
 * Check if the contract address is valid
 * @param {string} address - Contract address
 * @returns {boolean} - Is valid
 */
function isValidContractAddress(address) {
  // Check if the address is empty
  if (!address) return false;
  
  // Check if it is a placeholder address
  if (address === '0x...' || address === '0x0' || /^0x0+$/.test(address)) {
    return false;
  }
  
  // Check if the address format is correct
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(address)) {
    return false;
  }
  
  // Check if the address is a zero address
  if (address === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  
  return true;
}

/**
 * Check if the contract is deployed
 * @param {string} contractName - Contract name
 * @returns {boolean} - Is deployed
 */
function isContractDeployed(contractName) {
  try {
    const address = getContractAddress(contractName);
    return isValidContractAddress(address);
  } catch (error) {
    return false;
  }
}

// Export variables and functions to the global object for access in the browser environment
window.getContractAddress = getContractAddress;
window.getAllContractAddresses = getAllContractAddresses;
window.getCurrentNetwork = getCurrentNetwork;
window.isValidContractAddress = isValidContractAddress;
window.isContractDeployed = isContractDeployed;

// The following module exports are retained for use in Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONTRACT_NETWORKS: window.CONTRACT_NETWORKS,
    getContractAddress,
    getAllContractAddresses,
    getCurrentNetwork,
    isValidContractAddress,
    isContractDeployed,
  };
} 