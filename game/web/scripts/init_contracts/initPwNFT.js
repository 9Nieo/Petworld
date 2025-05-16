/**
 * PwNFT Contract Initialization File
 * This file is responsible for initializing the PwNFT contract instance
 */

/**
 * Initialize PwNFT contract
 * @param {Object} web3 - Web3 instance
 * @param {Function} getContractAddress - Function to get the contract address
 * @returns {Object} PwNFT contract instance
 */
function initPwNFTContract(web3, getContractAddress) {
    if (!web3) {
        console.error('Failed to initialize PwNFT contract: Web3 not initialized');
        return null;
    }
    
    try {
        // Get contract address
        const network = window.currentNetwork || 'TEST';
        let pwNftAddress;
        
        if (typeof getContractAddress === 'function') {
            pwNftAddress = getContractAddress('PwNFT');
        } else if (window.contractAddresses && window.contractAddresses[network]) {
            pwNftAddress = window.contractAddresses[network].PwNFT;
        } else {
            console.error('Unable to get PwNFT contract address');
            return null;
        }
        
        if (!pwNftAddress) {
            console.error('PwNFT contract address is empty');
            return null;
        }
        
        // Get contract ABI
        const abi = window.PwNFTABI;
        if (!abi) {
            console.error('Unable to get PwNFT contract ABI');
            return null;
        }
        
        // Create contract instance
        const contract = new web3.eth.Contract(abi, pwNftAddress);
        console.log('PwNFT contract initialized successfully, address:', pwNftAddress);
        
        return contract;
    } catch (error) {
        console.error('Failed to initialize PwNFT contract:', error);
        return null;
    }
}

/**
 * Get the number of NFTs owned by the user
 * @param {Object} contract - PwNFT contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<string>} Number of NFTs owned by the user
 */
async function getOwnedNFTCount(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user NFT count: Contract instance or user address is empty');
        return '0';
    }
    
    try {
        const count = await contract.methods.balanceOf(userAddress).call();
        return count;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) NFT count:`, error);
        return '0';
    }
}

/**
 * Get the NFT ID owned by the user at a specific index
 * @param {Object} contract - PwNFT contract instance
 * @param {string} userAddress - User address
 * @param {number} index - Index
 * @returns {Promise<string>} NFT ID at the specified index
 */
async function getTokenOfOwnerByIndex(contract, userAddress, index) {
    if (!contract || !userAddress) {
        console.error('Failed to get user NFT ID: Contract instance or user address is empty');
        return null;
    }
    
    try {
        const tokenId = await contract.methods.tokenOfOwnerByIndex(userAddress, index).call();
        return tokenId;
    } catch (error) {
        console.error(`Failed to get NFT ID for user (${userAddress}) at index ${index}:`, error);
        return null;
    }
}

/**
 * Get the metadata URI of the NFT
 * @param {Object} contract - PwNFT contract instance
 * @param {string} tokenId - NFT ID
 * @returns {Promise<string>} NFT metadata URI
 */
async function getTokenURI(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to get NFT metadata URI: Contract instance or Token ID is empty');
        return null;
    }
    
    try {
        const uri = await contract.methods.tokenURI(tokenId).call();
        return uri;
    } catch (error) {
        console.error(`Failed to get metadata URI for NFT (${tokenId}):`, error);
        return null;
    }
}

/**
 * Get all NFTs owned by the user
 * @param {Object} contract - PwNFT contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<Array>} List of user NFTs
 */
async function getUserPwNFTs(contract, userAddress) {
    if (!contract || !userAddress) {
        console.error('Failed to get user NFTs: Contract instance or user address is empty');
        return [];
    }
    
    try {
        // Get the number of NFTs owned by the user
        const nftCount = await getOwnedNFTCount(contract, userAddress);
        
        if (nftCount === '0') {
            return [];
        }
        
        // Get all NFT IDs
        const tokenIds = [];
        for (let i = 0; i < parseInt(nftCount); i++) {
            const tokenId = await getTokenOfOwnerByIndex(contract, userAddress, i);
            if (tokenId) {
                tokenIds.push(tokenId);
            }
        }
        
        // Get details for all NFTs
        const nftDetails = await Promise.all(
            tokenIds.map(async (tokenId) => {
                const tokenURI = await getTokenURI(contract, tokenId);
                
                // Parse JSON data from tokenURI
                let metadata = null;
                try {
                    if (tokenURI && tokenURI.startsWith('http')) {
                        const response = await fetch(tokenURI);
                        metadata = await response.json();
                    } else if (tokenURI && tokenURI.startsWith('data:application/json;base64,')) {
                        // Handle base64 encoded JSON data
                        const base64Data = tokenURI.replace('data:application/json;base64,', '');
                        const jsonString = atob(base64Data);
                        metadata = JSON.parse(jsonString);
                    }
                } catch (error) {
                    console.error(`Failed to parse metadata for NFT (ID:${tokenId}):`, error);
                }
                
                return {
                    tokenId,
                    tokenURI,
                    metadata
                };
            })
        );
        
        return nftDetails;
    } catch (error) {
        console.error(`Failed to get user (${userAddress}) NFTs:`, error);
        return [];
    }
}

/**
 * Check if the NFT exists
 * @param {Object} contract - PwNFT contract instance
 * @param {string} tokenId - NFT ID
 * @returns {Promise<boolean>} Whether the NFT exists
 */
async function pwNftExists(contract, tokenId) {
    if (!contract || !tokenId) {
        console.error('Failed to check if NFT exists: Contract instance or Token ID is empty');
        return false;
    }
    
    try {
        // Use ownerOf function to check if NFT exists; if it doesn't, an exception will be thrown
        await contract.methods.ownerOf(tokenId).call();
        return true;
    } catch (error) {
        // If an exception is thrown, it means the NFT does not exist
        console.log(`NFT (${tokenId}) does not exist`);
        return false;
    }
}

// Export functions to the global object
window.initPwNFTContract = initPwNFTContract;
window.getOwnedNFTCount = getOwnedNFTCount;
window.getTokenOfOwnerByIndex = getTokenOfOwnerByIndex;
window.getTokenURI = getTokenURI;
window.getUserPwNFTs = getUserPwNFTs;
window.pwNftExists = pwNftExists; 