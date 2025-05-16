/**
 * PwPointBurner Contract Initialization File
 * This file is responsible for initializing the PwPointBurner contract instance
 */

/**
 * Initialize PwPointBurner contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwPointBurner contract instance
 */
function initPwPointBurnerContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwPointBurner contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'LOCAL';
        let pwPointBurnerAddress;
        
        if (typeof getContractAddress === 'function') {
            pwPointBurnerAddress = getContractAddress('PwPointBurner');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwPointBurnerAddress = window.contractAddresses[network].PwPointBurner;
        } else {
            console.error('Unable to get PwPointBurner contract address');
            return null;
        }
        
        if (!pwPointBurnerAddress) {
            console.error('PwPointBurner contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwPointBurnerABI;
        if (!abi) {
            console.error('Unable to get PwPointBurner contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwPointBurnerAddress);
        console.log('PwPointBurner contract initialized successfully, address:', pwPointBurnerAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwPointBurner contract:', error);
        return null;
    }
}

/**
 * Get the current cycle
 * @param {Object} contract - PwPointBurner contract instance
 * @returns {Promise<string>} Current cycle
 */
async function getCurrentCycle(contract) {
    if (!contract) {
        console.error('Failed to get current cycle: Contract instance is empty');
        return '0';
    }
    
    try {
        const currentCycle = await contract.methods.currentCycle().call();
        return currentCycle;
    } catch (error) {
        console.error('Failed to get current cycle:', error);
        return '0';
    }
}

/**
 * Get cycle statistics
 * @param {Object} contract - PwPointBurner contract instance
 * @param {string} cycleNumber - Cycle number
 * @returns {Promise<Object>} Cycle statistics
 */
async function getCycleStats(contract, cycleNumber) {
    if (!contract || !cycleNumber) {
        console.error('Failed to get cycle statistics: Contract instance or cycle number is empty');
        return null;
    }
    
    try {
        const stats = await contract.methods.cycleStats(cycleNumber).call();
        return {
            totalBurnedPoints: stats.totalBurnedPoints,
            distributionClaimed: stats.distributionClaimed,
            petWorldDistributed: stats.petWorldDistributed
        };
    } catch (error) {
        console.error(`Failed to get statistics for cycle (${cycleNumber}):`, error);
        return null;
    }
}

/**
 * Get the user's burn record for a specific cycle
 * @param {Object} contract - PwPointBurner contract instance
 * @param {string} userAddress - User address
 * @param {string} recordIndex - Record index
 * @returns {Promise<Object>} User burn record
 */
async function getUserBurnRecord(contract, userAddress, recordIndex) {
    if (!contract || !userAddress) {
        console.error('Failed to get user burn record: Contract instance or user address is empty');
        return null;
    }
    
    try {
        const record = await contract.methods.userBurnRecords(userAddress, recordIndex).call();
        return {
            pointsPerCycle: record.pointsPerCycle,
            startCycle: record.startCycle,
            endCycle: record.endCycle,
            lastClaimedCycle: record.lastClaimedCycle,
            fullyProcessed: record.fullyProcessed,
            markedForDeletion: record.markedForDeletion
        };
    } catch (error) {
        console.error(`Failed to get burn record for user (${userAddress}) at index (${recordIndex}):`, error);
        return null;
    }
}

/**
 * Get the average burned points over the past 7 days
 * @param {Object} contract - PwPointBurner contract instance
 * @returns {Promise<Object>} Average burned points and related data
 */
async function getSevenDayAveragePoints(contract) {
    if (!contract) {
        console.error('Failed to get 7-day average burned points: Contract instance is empty');
        return null;
    }
    
    try {
        const averageData = await contract.methods.getSevenDayAveragePoints().call();
        return {
            averagePoints: averageData.averagePoints,
            cyclePoints: averageData.cyclePoints,
            cycles: averageData.cycles
        };
    } catch (error) {
        console.error('Failed to get 7-day average burned points:', error);
        return null;
    }
}

// Export functions to the global object
window.initPwPointBurnerContract = initPwPointBurnerContract;
window.getCurrentCycle = getCurrentCycle;
window.getCycleStats = getCycleStats;
window.getUserBurnRecord = getUserBurnRecord;
window.getSevenDayAveragePoints = getSevenDayAveragePoints; 