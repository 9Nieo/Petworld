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
window.currentNetwork = window.currentNetwork || window.CONTRACT_NETWORKS.TEST;

// Contract address configuration for different network environments
window.contractAddresses = window.contractAddresses || {
                  [window.CONTRACT_NETWORKS.TEST]: {
PwPoint: '0x9F64a24541A7E029dB20067C76C4e6Ab5Aa5e698',  // test network's PwPoint contract address
PwFood: '0x76729675B52d9850A86b46353cA466FAC5dFA8c4',  // test network's PwFood contract address
PwBounty: '0xbc34FB939D9e57466279f9A0EDa16C53781F71e5',  // test network's PwBounty contract address
PwReverse: '0xcA5921f3673A9F20d1D58140baB0613DdFB87e1F',  // test network's PwReverse contract address
PwNFT: '0xD9313b17eb115143Fb2B2c61388F04C992190135',  // test network's PwNFT contract address
PwUSD: '0xe38Ed222A3809119538162c14B0EaC89953Fb7D8',  // test network's PwUSD contract address
NFTManager: '0xE9D61ff60cC8020a20d73AEA50787240400804c1',  // test network's NFTManager contract address
NFTFeedingManager: '0x01050305d58E52E4eD42B88A10Fd6d9Bf647CA6b',  // test network's NFTFeedingManager contract address
NFTLotteryManager: '0xC4A31c54E52851Ad17E32A159Bb4492CD78A6641',  // test network's NFTLotteryManager contract address
PwPointManager: '0x7471CD003741EF2E0B091471b24ec52B45CcB4Ef',  // test network's PwPointManager contract address
PaymentManager: '0x0900852693602169FaFBD448f6eB552e1F9A6D42',  // test network's PaymentManager contract address
PwFoodManager: '0x77D84E211c6bd9E8A21A7609D2213cc53b63f568',  // test network's PwFoodManager contract address
PwUSDStaking: '0xd34d083A2179F0a4b5C40A469Ee51bd9B5b3434B',  // test network's PwUSDStaking contract address
NFTMarketplace: '0x7842CA17eD34850A5958c84757c39D589188eC6D',  // test network's NFTMarketplace contract address
RareNFTTransactionIndexer: '0x0755039ED065b063b6ED19D6c88e60d7ea211Eb7',  // test network's RareNFTTransactionIndexer contract address
PetWorld: '0xD7c2a41985Cc7D3a594174574AdFDE89b2c8E3AF',  // test network's PetWorld contract address
PetWorldManager: '0x257b58d5456b2871915F06a58f6Ee0CE2521dC3f',  // test network's PetWorldManager contract address
PwPointBurner: '0x16a051A20ced2BB8eD9bB8Ba98Dd2dCd8C99310B',  // test network's PwPointBurner contract address
    PetWorldStaking: '0x4826E7BdDe35498c3E8884DE2A1039Ce650E2289',  // test network's PetWorldStaking contract address
    PwReverseBurner: '0x423702762d5FD86a80e277d135e174854CcA31aE',  // test network's PwReverseBurner contract address
  },
  [window.CONTRACT_NETWORKS.MAIN]: {
    PetWorldManager: '0x...',  
    PetWorldStaking: '0x...',  
    PwFoodManager: '0x...',  
    PwPointBurner: '0x...',  
    PwReverseBurner: '0x...',  
    PwUSDStaking: '0x...',  
    RareNFTTransactionIndexer: '0x...',  
    PwPointManager: '0x...',  
    NFTLotteryManager: '0x...',  
    NFTFeedingManager: '0x...',  
    PaymentManager: '0x...',  
    NFTMarketplace: '0x...',  
    NFTManager: '0x...',  
    PwPoint: '0x...',  
    PwBounty: '0x...',  
    PwReverse: '0x...',  
    PwFood: '0x...',  
    PwUSD: '0x...',  
    PetWorld: '0x...',  
    PwNFT: '0x...',  
    petNftAddress: '0x...',  
  },
  [window.CONTRACT_NETWORKS.LOCAL]: {
    PetWorldManager: '0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f',  
    PetWorldStaking: '0x1fA02b2d6A771842690194Cf62D91bdd92BfE28d',  
    PwFoodManager: '0x36b58F5C1969B7b6591D752ea6F5486D069010AB',  
    PwPointBurner: '0xB0D4afd8879eD9F52b28595d31B441D079B2Ca07',  
    PwReverseBurner: '0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6',  
    PwUSDStaking: '0x8198f5d8F8CfFE8f9C413d98a0A55aEB8ab9FbB7',  
    RareNFTTransactionIndexer: '0x202CCe504e04bEd6fC0521238dDf04Bc9E8E15aB',  
    PwPointManager: '0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD',  
    NFTLotteryManager: '0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43',  
    NFTFeedingManager: '0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2',  
    PaymentManager: '0x51A1ceB83B83F1985a81C295d1fF28Afef186E02',  
    NFTMarketplace: '0x0355B7B8cb128fA5692729Ab3AAa199C1753f726',  
    NFTManager: '0x21dF544947ba3E8b3c32561399E88B52Dc8b2823',  
    PwPoint: '0x922D6956C99E12DFeB3224DEA977D0939758A1Fe',  
    PwBounty: '0x1fA02b2d6A771842690194Cf62D91bdd92BfE28d',  
    PwReverse: '0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6',  
    PwFood: '0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f',  
    PwUSD: '0x4C4a2f8c81640e47606d3fd77B353E87Ba015584',  
    PetWorld: '0xcbEAF3BDe82155F56486Fb5a1072cb8baAf547cc',  
    PwNFT: '0x04C89607413713Ec9775E14b954286519d836FEf',  
    petNftAddress: '0x04C89607413713Ec9775E14b954286519d836FEf',  
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