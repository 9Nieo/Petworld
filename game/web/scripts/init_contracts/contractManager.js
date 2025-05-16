/**
 * contract manager
 * responsible for managing and sharing all initialized contract instances
 * the contract instances will remain unchanged regardless of which page the user switches to
 */

// store all initialized contract instances
window.contractInstances = window.contractInstances || {};

// record the initialized contract names
window.initializedContracts = window.initializedContracts || [];

/**
 * initialize all contracts
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - the function to get the contract address
 * @param {Array} contractsToInit - the list of contracts to initialize, if null, initialize all contracts
 * @returns {Object} the collection of initialized contract instances
 */
async function initAllContracts(web3, getContractAddress, contractsToInit = null) {
    if (!web3) {
        console.error('failed to initialize the contracts: Web3 is not initialized');
        return {};
    }
    
    // if the contracts to initialize are not specified, initialize all supported contracts
    const contracts = contractsToInit || [
        'PwPoint',
        'PwBounty',
        'PwFood',
        'NFTFeedingManager',
        'NFTLotteryManager',
        'NFTManager',
        'NFTMarketplace',
        'PaymentManager',
        'PetWorldManager',
        'PetWorldStaking',
        'PwFoodManager',
        'PwPointBurner',
        'PwPointManager',
        'PwReverseBurner',
        'PwUSDStaking',
        'RareNFTTransactionIndexer',
        'PetWorld',
        'PwNFT'
    ];
    
    console.log('start to initialize the contracts...');
    
    // store the initialization results
    const results = {};
    
    // initialize all contracts in parallel
    for (const contractName of contracts) {
        // if the contract has been initialized, skip
        if (window.contractInstances[contractName]) {
            console.log(`the contract ${contractName} has been initialized, skip`);
            results[contractName] = window.contractInstances[contractName];
            continue;
        }
        
        try {
            let contract = null;
            
            // call the corresponding initialization function based on the contract name
            switch (contractName) {
                case 'PwPoint':
                    if (typeof window.initPwPointContract === 'function') {
                        contract = window.initPwPointContract(web3, getContractAddress);
                    }
                    break;
                case 'PwBounty':
                    if (typeof window.initPwBountyContract === 'function') {
                        contract = window.initPwBountyContract(web3, getContractAddress);
                    }
                    break;
                case 'PwFood':
                    if (typeof window.initPwFoodContract === 'function') {
                        contract = window.initPwFoodContract(web3, getContractAddress);
                    }
                    break;
                case 'NFTFeedingManager':
                    if (typeof window.initNFTFeedingManagerContract === 'function') {
                        contract = window.initNFTFeedingManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'NFTLotteryManager':
                    if (typeof window.initNFTLotteryManagerContract === 'function') {
                        contract = window.initNFTLotteryManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'NFTManager':
                    if (typeof window.initNFTManagerContract === 'function') {
                        contract = window.initNFTManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'NFTMarketplace':
                    if (typeof window.initNFTMarketplaceContract === 'function') {
                        contract = window.initNFTMarketplaceContract(web3, getContractAddress);
                    }
                    break;
                case 'PaymentManager':
                    if (typeof window.initPaymentManagerContract === 'function') {
                        contract = window.initPaymentManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'PetWorldManager':
                    if (typeof window.initPetWorldManagerContract === 'function') {
                        contract = window.initPetWorldManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'PetWorldStaking':
                    if (typeof window.initPetWorldStakingContract === 'function') {
                        contract = window.initPetWorldStakingContract(web3, getContractAddress);
                    }
                    break;
                case 'PwFoodManager':
                    if (typeof window.initPwFoodManagerContract === 'function') {
                        contract = window.initPwFoodManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'PwPointBurner':
                    if (typeof window.initPwPointBurnerContract === 'function') {
                        contract = window.initPwPointBurnerContract(web3, getContractAddress);
                    }
                    break;
                case 'PwPointManager':
                    if (typeof window.initPwPointManagerContract === 'function') {
                        contract = window.initPwPointManagerContract(web3, getContractAddress);
                    }
                    break;
                case 'PwReverseBurner':
                    if (typeof window.initPwReverseBurnerContract === 'function') {
                        contract = window.initPwReverseBurnerContract(web3, getContractAddress);
                    }
                    break;
                case 'PwUSDStaking':
                    if (typeof window.initPwUSDStakingContract === 'function') {
                        contract = window.initPwUSDStakingContract(web3, getContractAddress);
                    }
                    break;
                case 'RareNFTTransactionIndexer':
                    if (typeof window.initRareNFTTransactionIndexerContract === 'function') {
                        contract = window.initRareNFTTransactionIndexerContract(web3, getContractAddress);
                    }
                    break;
                case 'PetWorld':
                    if (typeof window.initPetWorldContract === 'function') {
                        contract = window.initPetWorldContract(web3, getContractAddress);
                    }
                    break;
                case 'PwNFT':
                    if (typeof window.initPwNFTContract === 'function') {
                        contract = window.initPwNFTContract(web3, getContractAddress);
                    }
                    break;
                default:
                    console.warn(`unknown contract type: ${contractName}`);
                    break;
            }
            
            // save the initialization results
            if (contract) {
                window.contractInstances[contractName] = contract;
                window.initializedContracts.push(contractName);
                results[contractName] = contract;
                console.log(`the contract ${contractName} is initialized successfully`);
            } else {
                console.error(`failed to initialize the contract ${contractName}: the initialization function is not available or returns null`);
            }
        } catch (error) {
            console.error(`failed to initialize the contract ${contractName}:`, error);
        }
    }
    
    console.log('the contracts are initialized successfully, the initialized contracts:', window.initializedContracts);
    return results;
}

/**
 * get the initialized contract instance
 * @param {string} contractName - the contract name
 * @returns {Object} the contract instance, if not exists, return null
 */
function getContract(contractName) {
    return window.contractInstances[contractName] || null;
}

/**
 * check if the contract is initialized
 * @param {string} contractName - the contract name
 * @returns {boolean} whether the contract is initialized
 */
function isContractInitialized(contractName) {
    return !!window.contractInstances[contractName];
}

/**
 * get all initialized contracts
 * @returns {Object} all initialized contract instances
 */
function getAllContracts() {
    return window.contractInstances;
}

/**
 * clear all contract instances
 * usually used when the user logs out or needs to reinitialize
 */
function clearAllContracts() {
    window.contractInstances = {};
    window.initializedContracts = [];
    console.log('all contract instances are cleared');
}

// export the functions to the global object
window.initAllContracts = initAllContracts;
window.getContract = getContract;
window.isContractInitialized = isContractInitialized;
window.getAllContracts = getAllContracts;
window.clearAllContracts = clearAllContracts; 