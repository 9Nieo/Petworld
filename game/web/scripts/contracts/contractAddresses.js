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
window.currentNetwork = window.CONTRACT_NETWORKS.MAIN;

// Contract address configuration for different network environments
window.contractAddresses = window.contractAddresses || {
      [window.CONTRACT_NETWORKS.TEST]: {
        PwPoint: '0x0000000000000000000000000000000000000000',  // test network's PwPoint contract address
        PwFood: '0x0000000000000000000000000000000000000000',  // test network's PwFood contract address
        PwBounty: '0x0000000000000000000000000000000000000000',  // test network's PwBounty contract address
        PwReverse: '0x0000000000000000000000000000000000000000',  // test network's PwReverse contract address
        PwNFT: '0x0000000000000000000000000000000000000000',  // test network's PwNFT contract address
        PwUSD: '0x0000000000000000000000000000000000000000',  // test network's PwUSD contract address
        NFTManager: '0x0000000000000000000000000000000000000000',  // test network's NFTManager contract address
        NFTFeedingManager: '0x0000000000000000000000000000000000000000',  // test network's NFTFeedingManager contract address
        NFTLotteryManager: '0x0000000000000000000000000000000000000000',  // test network's NFTLotteryManager contract address
        PwPointManager: '0x0000000000000000000000000000000000000000',  // test network's PwPointManager contract address
        PaymentManager: '0x0000000000000000000000000000000000000000',  // test network's PaymentManager contract address
        PwFoodManager: '0x0000000000000000000000000000000000000000',  // test network's PwFoodManager contract address
        PwUSDStaking: '0x0000000000000000000000000000000000000000',  // test network's PwUSDStaking contract address
        NFTMarketplace: '0x0000000000000000000000000000000000000000',  // test network's NFTMarketplace contract address
        RareNFTTransactionIndexer: '0x0000000000000000000000000000000000000000',  // test network's RareNFTTransactionIndexer contract address
  },
      [window.CONTRACT_NETWORKS.MAIN]: {
    PwPoint: '0xb9705AD3e3431ef63d33c9965A4Cdaf5Cc87139E',  // main network's PwPoint contract address
    PwFood: '0xB02716d358451eE61Bf304488dE1fd921c388841',  // main network's PwFood contract address
    PwBounty: '0x44f5CC77FA3c0302AE8A7Cfe833c4b30C82af9E2',  // main network's PwBounty contract address
    PwReverse: '0xaFCC6C3A807eFe46Cf2471b6ddB932196ed42C33',  // main network's PwReverse contract address
    PwNFT: '0x7C109a4DEd3fb919921349e42784673B115d1894',  // main network's PwNFT contract address
    PwUSD: '0xEB2a881aeBb4e95DA2F355c91C23435C48A84d4C',  // main network's PwUSD contract address
    NFTManager: '0x38C99E4338Badf6dC997927b534eF19A38EcFA65',  // main network's NFTManager contract address
    NFTFeedingManager: '0xF0A713E6Cf32A0392fd8020e0Eae6Cef16e72AF6',  // main network's NFTFeedingManager contract address
    NFTLotteryManager: '0x753f2Abe4091022fb7B43921163EEEE88F5Ddd82',  // main network's NFTLotteryManager contract address
    PwPointManager: '0x9b56dd201bC0656fFa64Ee385Cce1EbF65B5077B',  // main network's PwPointManager contract address
    PaymentManager: '0x7b713f315818c2eEF6490b7205c2407c21e88fd9',  // main network's PaymentManager contract address
    PwFoodManager: '0xeBCF08FbAaEFB3867d468BfBaDD156002eA47973',  // main network's PwFoodManager contract address
    PwUSDStaking: '0x8ad99d641B27056dC2862936e59395192f3E7EFf',  // main network's PwUSDStaking contract address
    NFTMarketplace: '0x1DAaD60260C2672c4ab84F887C12481d9c3aA6b5',  // main network's NFTMarketplace contract address
    RareNFTTransactionIndexer: '0x69a306dFD5Cb96b3200177040Ea142A8B803D604',  // main network's RareNFTTransactionIndexer contract address
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
    console.warn(`Network ${window.currentNetwork} not found, falling back to MAIN network`);
    window.currentNetwork = window.CONTRACT_NETWORKS.MAIN;
  }
  
  // Check if the contract exists in the current network
  if (!window.contractAddresses[window.currentNetwork][contractName]) {
    console.warn(`Contract ${contractName} not found in network ${window.currentNetwork}, checking MAIN network`);
    
    // Try to use MAIN network as fallback
    if (window.contractAddresses[window.CONTRACT_NETWORKS.MAIN] && 
        window.contractAddresses[window.CONTRACT_NETWORKS.MAIN][contractName]) {
      return window.contractAddresses[window.CONTRACT_NETWORKS.MAIN][contractName];
    }
    
    // If not in MAIN, try LOCAL
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