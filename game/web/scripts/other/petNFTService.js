// PetNFTService - Handles pet NFT retrieval and metadata processing functionality

/**
 * PetNFTService - Handles pet NFT retrieval and metadata processing functionality
 */
const PetNFTService = (function() {
    // Private variables
    let web3 = null;
    let pwNFTContract = null;
    let nftManagerContract = null;
    let isInitialized = false;
    let petNftAddress = null;
    
    const nftCache = {
        byContract: {},
        byUser: {},
        allNfts: [],
        lastUpdate: 0
    };
    
    // local pets image path
    const LOCAL_PETS_IMAGE_PATH = '../../resources/images/pets/';
    
    // contract total minted cache
    const contractTotalMinted = {};
    
    // debug tool
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[PetNFTService]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[PetNFTService error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[PetNFTService warning]', ...args);
        }
    };
    
    // record NFT refresh time
    const refreshTimes = {
        byAddress: {}, // by address
        byContract: {}, // by contract
        byAddressContract: {} // by address and contract
    };
    
    /**
     * initialize NFT service and contract connection
     * @returns {Promise<boolean>} initialization success
     */
    async function init() {
        debug.log('initialize NFT service');
        
        if (isInitialized) {
            debug.log('NFT service already initialized');
            return true;
        }
        
        try {
            // initialize specific NFT address
            initPetNftAddress();
            
            // load Web3 library
            if (typeof Web3 === 'undefined' && window.Web3) {
                window.Web3 = window.Web3;
                debug.log('load Web3 library from global object');
            }
            
            // if web3 instance does not exist, try to create one
            if (!web3) {
                debug.log('Web3 instance does not exist, try to create');
                
                // try to get from window
                if (window.homeWeb3) {
                    web3 = window.homeWeb3;
                    debug.log('use global homeWeb3 instance');
                }
                // try to get from ethereum object
                else if (window.ethereum) {
                    try {
                        if (typeof Web3 !== 'undefined') {
                            web3 = new Web3(window.ethereum);
                            debug.log('use window.ethereum to create Web3 instance');
                        } else if (window.Web3) {
                            web3 = new window.Web3(window.ethereum);
                            debug.log('use window.Web3 and window.ethereum to create Web3 instance');
                        } else {
                            debug.error('Web3 library not found, cannot create Web3 instance');
                        }
                    } catch (ethError) {
                        debug.error('failed to create Web3 instance from ethereum:', ethError);
                    }
                }
                // try to get from web3 object
                else if (window.web3) {
                    try {
                        if (typeof Web3 !== 'undefined') {
                            web3 = new Web3(window.web3.currentProvider);
                            debug.log('use window.web3.currentProvider to create Web3 instance');
                        } else if (window.Web3) {
                            web3 = new window.Web3(window.web3.currentProvider);
                            debug.log('use window.Web3 and window.web3.currentProvider to create Web3 instance');
                        } else {
                            debug.error('Web3 library not found, cannot create Web3 instance');
                        }
                    } catch (oldWeb3Error) {
                        debug.error('failed to create Web3 instance from old web3:', oldWeb3Error);
                    }
                }
                
                // if still no web3 instance, return false
                if (!web3) {
                    debug.error('cannot create valid Web3 instance');
                    return false;
                }
            }
            
            // check if web3 is valid
            if (!web3.eth) {
                debug.error('web3 instance is invalid, missing eth module');
                return false;
            }
            
            // get contract address function
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'MAIN';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // check if there is already a contract instance
            if (pwNFTContract && pwNFTContract.methods) {
                debug.log('use existing PwNFT contract instance');
            } else if (typeof window.initPwNFTContract === 'function') {
                try {
                    debug.log('initialize PwNFT contract...');
                    pwNFTContract = window.initPwNFTContract(web3, getContractAddressFunc);
                    
                    if (pwNFTContract) {
                        debug.log('PwNFT contract initialized successfully, address:', pwNFTContract._address);
                    } else {
                        debug.error('PwNFT contract initialization returned null');
                    }
                } catch (nftError) {
                    debug.error('failed to initialize PwNFT contract:', nftError);
                }
            } else {
                debug.error('cannot find initPwNFTContract function');
            }
            
            // check NFTManager contract
            if (nftManagerContract && nftManagerContract.methods) {
                debug.log('use existing NFTManager contract instance');
            } else if (typeof window.initNFTManagerContract === 'function') {
                try {
                    debug.log('initialize NFTManager contract...');
                    nftManagerContract = window.initNFTManagerContract(web3, getContractAddressFunc);
                    
                    if (nftManagerContract) {
                        debug.log('NFTManager contract initialized successfully, address:', nftManagerContract._address);
                    } else {
                        debug.error('NFTManager contract initialization returned null');
                    }
                } catch (managerError) {
                    debug.error('failed to initialize NFTManager contract:', managerError);
                }
            } else {
                debug.warn('cannot find initNFTManagerContract function');
            }
            
            // check if contract is initialized successfully
            if (!pwNFTContract || !pwNFTContract.methods) {
                debug.error('PwNFT contract initialization failed');
                return false;
            }
            
            isInitialized = true;
            debug.log('NFT service initialized successfully');
            return true;
            
        } catch (error) {
            debug.error('failed to initialize contracts:', error);
            return false;
        }
    }
    
    /**
     * initialize specific NFT address
     */
    function initPetNftAddress() {
        // try to get from config
        try {
            // default address (use if failed to get)
            const defaultAddress = "0x0000000000000000000000000000000000000000";
            
            // get current network
            const network = window.currentNetwork || 'MAIN';
            debug.log('current network:', network);
            
            // check if contractAddresses exists
            if (!window.contractAddresses) {
                debug.warn('window.contractAddresses is undefined, use default address');
                petNftAddress = defaultAddress;
                return;
            }
            
            // check if contractAddresses for current network exists
            if (!window.contractAddresses[network]) {
                debug.warn(`contractAddresses['${network}'] is undefined, use default address`);
                petNftAddress = defaultAddress;
                return;
            }
            
            // try to get petNftAddress
            petNftAddress = window.contractAddresses[network].PwNFT ||
                            defaultAddress;
            
            debug.log('specific NFT address initialized to:', petNftAddress);
        } catch (error) {
            // use default address if error
            debug.warn('failed to initialize specific NFT address, use default address:', error);
            petNftAddress = "0x0000000000000000000000000000000000000000";
        }
    }
    
    /**
     * get specific NFT address
     * @returns {string} specific NFT address
     */
    function getPetNftAddress() {
        if (!petNftAddress) {
            initPetNftAddress();
        }
        return petNftAddress;
    }
    

    
    /**
     * create default NFT metadata
     * @param {string} tokenId - NFT's ID
     * @param {Object} nftData - optional NFT real data object
     * @returns {object} default metadata
     */
    function createDefaultMetadata(tokenId, nftData = null) {
        debug.log(`create default metadata for NFT #${tokenId}`);
        
        // if real NFT data is provided, use it first
        if (nftData && nftData.metadata) {
            debug.log(`use NFT #${tokenId} real data`);
            return {
                ...nftData.metadata,
                // ensure at least the following fields
                name: nftData.metadata.name || `Pet #${tokenId}`,
                description: nftData.metadata.description || "A virtual pet from PetWorld",
                // if image URL exists, use it; otherwise still use null (do not add default placeholder)
                image: nftData.metadata.image || null,
                // ensure attributes exist
                attributes: nftData.metadata.attributes || []
            };
        }
        
        // if no real data is provided, use default data
        debug.log(`create default metadata for NFT #${tokenId} (no real data)`);
        return {
            name: `Pet #${tokenId}`,
            description: "A cute virtual pet",
            // do not add default placeholder, keep as null
            image: null,
            attributes: []
        };
    }
    
    /**
     * get NFT metadata
     * @param {string} tokenURI - NFT's URI
     * @param {string} tokenId - NFT's ID
     * @param {Object} nftData - optional NFT data object
     * @returns {Promise<object>} NFT metadata
     */
    async function fetchNFTMetadata(tokenURI, tokenId, nftData = null) {
        debug.log(`start to get NFT #${tokenId} metadata`);
        
        try {
            let metadata = null;
            
            // 检查是否为base64编码的数据
            if (tokenURI.startsWith('data:application/json;base64,')) {
                debug.log('detect base64 encoded metadata');
                const base64 = tokenURI.split(',')[1];
                const jsonStr = atob(base64);
                metadata = JSON.parse(jsonStr);
            } 
            // check if it is IPFS URI
            else if (tokenURI.startsWith('ipfs://')) {
                debug.log('detect IPFS link');
                const ipfsHash = tokenURI.replace('ipfs://', '');
                const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                debug.log(`convert IPFS link to: ${ipfsUrl}`);
                
                const response = await fetch(ipfsUrl);
                metadata = await response.json();
            } 
            // handle HTTP/HTTPS URL
            else if (tokenURI.startsWith('http')) {
                debug.log('detect HTTP link');
                const response = await fetch(tokenURI);
                metadata = await response.json();
            }
            // handle other URI format
            else {
                debug.log('unknown URI format, try to handle as URL');
                try {
                    const response = await fetch(tokenURI);
                    metadata = await response.json();
                } catch (error) {
                    debug.error(`cannot get metadata: ${error.message}`);
                    // use default metadata, pass in real nft data
                    metadata = createDefaultMetadata(tokenId, nftData);
                }
            }
            
            // if metadata is successfully fetched but no image, keep as null (do not set default image)
            if (metadata && !metadata.image && nftData && nftData.metadata && nftData.metadata.image) {
                debug.log('metadata has no image, but nftData has image, use nftData image');
                metadata.image = nftData.metadata.image;
            }
            
            // save original image URL
            if (metadata && metadata.image) {
                // ensure save original image URL
                metadata.originalImageUrl = metadata.image;
                debug.log(`save original image URL for NFT #${tokenId}: ${metadata.originalImageUrl}`);
                
                // handle IPFS image link
                if (metadata.image.startsWith('ipfs://')) {
                    const ipfsHash = metadata.image.replace('ipfs://', '');
                    metadata.image = `https://ipfs.io/ipfs/${ipfsHash}`;
                    debug.log(`convert IPFS image link to: ${metadata.image}`);
                }
                
                // handle relative path
                if (metadata.image.startsWith('./')) {
                    metadata.image = metadata.image.replace('./', '/');
                    debug.log(`convert relative path to: ${metadata.image}`);
                }
                
                // ensure resource path is correct
                if (!metadata.image.startsWith('http') && !metadata.image.startsWith('/')) {
                    metadata.image = '/' + metadata.image;
                    debug.log(`correct resource path to: ${metadata.image}`);
                }
                
                debug.log(`NFT #${tokenId} final image URL: ${metadata.image}`);
            }
            
            debug.log(`successfully get NFT #${tokenId} metadata:`, metadata);
            return metadata;
            
        } catch (error) {
            debug.error(`cannot get NFT #${tokenId} metadata:`, error);
            // use default metadata, pass in real nft data
            return createDefaultMetadata(tokenId, nftData);
        }
    }
    
    /**
     * get NFT info by index
     * @param {Object} contract - NFT contract
     * @param {string} address - user address
     * @param {number} index - NFT index
     * @returns {Promise<Object|null>} NFT object or null
     */
    async function fetchNFTByIndex(contract, address, index) {
        try {
            // get tokenId
            let tokenId;
            try {
                // try to use ERC721Enumerable method to get tokenId
                tokenId = await contract.methods.tokenOfOwnerByIndex(address, index).call();
                debug.log(`use tokenOfOwnerByIndex to get tokenId for NFT index #${index}: ${tokenId}`);
            } catch (enumError) {
                debug.warn(`contract does not support tokenOfOwnerByIndex method: ${enumError.message}`);
                
                // if contract does not support enumeration method, try to use other way to get tokenId
                if (index > 0) {
                    // if not the first index, cannot handle non-enumeration contract
                    throw new Error('contract does not support enumeration interface, cannot get multiple NFTs');
                }
                
                // for non-enumeration contract, try to get first tokenId
                try {
                    // try to check if user has any token by balance
                    const balance = await contract.methods.balanceOf(address).call();
                    if (parseInt(balance) === 0) {
                        throw new Error('user does not have any token of this contract');
                    }
                    
                    // try to get tokenId by special way, here use default value or known value
                    // note: actually need to decide how to get tokenId based on specific contract
                    tokenId = "1"; // default try to get tokenId 1, need to adjust based on actual contract
                    
                    // verify if this tokenId belongs to user
                    try {
                        const tokenOwner = await contract.methods.ownerOf(tokenId).call();
                        if (tokenOwner.toLowerCase() !== address.toLowerCase()) {
                            throw new Error(`TokenId ${tokenId} does not belong to user ${address}`);
                        }
                    } catch (ownerError) {
                        // try other possible tokenId
                        debug.warn(`TokenId ${tokenId} does not belong to user ${address}, try to iterate possible tokenId`);
                        
                        // iterate some common tokenId to try
                        const possibleIds = ["0", "1", "2", "3", "4", "5", "10", "100"];
                        let foundValidToken = false;
                        
                        for (const possibleId of possibleIds) {
                            try {
                                const owner = await contract.methods.ownerOf(possibleId).call();
                                if (owner.toLowerCase() === address.toLowerCase()) {
                                    tokenId = possibleId;
                                    foundValidToken = true;
                                    debug.log(`find tokenId belongs to user: ${tokenId}`);
                                    break;
                                }
                            } catch (e) {
                                // ignore error, continue to try
                            }
                        }
                        
                        if (!foundValidToken) {
                            throw new Error('cannot determine the specific tokenId that user owns');
                        }
                    }
                } catch (balanceError) {
                    throw balanceError;
                }
            }
            
            // get tokenURI
            let tokenURI;
            try {
                tokenURI = await contract.methods.tokenURI(tokenId).call();
            } catch (uriError) {
                debug.error(`failed to get tokenURI for NFT #${tokenId}:`, uriError);
                try {
                    tokenURI = await contract.methods.uri(tokenId).call();
                } catch (altUriError) {
                    debug.error(`failed to get tokenURI for NFT #${tokenId} by uri method:`, altUriError);
                }
            }
                            
            // get NFT's name and symbol
            let name = 'Unknown Pet';
            let symbol = 'PET';
                            
            try {
                name = await contract.methods.name().call();
                symbol = await contract.methods.symbol().call();
            } catch (nameError) {
                debug.warn('failed to get NFT name and symbol, use default value');
            }
                            
            // get metadata or create default metadata
            let metadata;
            if (tokenURI) {
                // create a initial nft object, for backup when failed to get metadata
                const initialNft = {
                    tokenId: tokenId,
                    contractAddress: contract._address,
                    owner: address,
                    metadata: {
                        name: name ? `${name} #${tokenId}` : `宠物 #${tokenId}`,
                        description: `${symbol || 'PET'} NFT`,
                        // do not set default image, keep as null
                        image: null
                    }
                };
                metadata = await fetchNFTMetadata(tokenURI, tokenId, initialNft);
            } else {
                // if failed to get URI, use default metadata (do not set default image)
                metadata = {
                    name: name ? `${name} #${tokenId}` : `Pet #${tokenId}`,
                    description: `${symbol || 'PET'} NFT`,
                    // do not set default image, keep as null
                    image: null
                };
            }
            
            // check if quality attribute exists, if not, add default quality
            let hasQuality = false;
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
                hasQuality = metadata.attributes.some(attr => attr.trait_type === "Quality");
            } else {
                metadata.attributes = [];
            }
            
            // if no quality attribute, create a default one
            if (!hasQuality) {
                // get quality (default is COMMON)
                const qualities = ['COMMON', 'GOOD', 'EXCELLENT', 'RARE', 'LEGENDARY'];
                const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
                metadata.attributes.push({ trait_type: "Quality", value: randomQuality });
            }
            
            // check if other required attributes exist, if not, add default values
            const requiredAttributes = ["Level", "Health", "Energy", "Hunger"];
            const defaultValues = {
                "Level": Math.floor(Math.random() * 10) + 1,
                "Health": Math.floor(Math.random() * 31) + 70,
                "Energy": Math.floor(Math.random() * 31) + 70,
                "Hunger": Math.floor(Math.random() * 31) + 70
            };
            
            for (const attr of requiredAttributes) {
                if (!metadata.attributes.some(a => a.trait_type === attr)) {
                    metadata.attributes.push({ trait_type: attr, value: defaultValues[attr] });
                }
            }
                            
            // create NFT object
            return {
                tokenId: tokenId,
                contractAddress: contract._address,
                owner: address,
                metadata: metadata
            };
        } catch (error) {
            debug.error(`failed to get NFT index #${index} info:`, error);
            return null;
        }
    }
    
    /**
     * get NFT quality name
     * @param {string} qualityId - quality ID
     * @returns {string} quality name
     */
    function getQualityName(qualityId) {
        const qualityMap = {
            'COMMON': 'Common',
            'GOOD': 'Good',
            'EXCELLENT': 'Excellent',
            'RARE': 'Rare',
            'LEGENDARY': 'Legendary'
        };
        
        return qualityMap[qualityId] || 'Unknown';
    }
    
    /**
     * load user's NFTs
     * @param {string} userAddress - user wallet address
     * @param {Object} options - additional options
     * @returns {Promise<Array>} - NFT array
     */
    async function loadUserNFTs(userAddress, options = {}) {
        if (!userAddress || !utils.isValidAddress(userAddress)) {
            debug.error('invalid user address', userAddress);
            return [];
        }
        
        debug.log('load user NFTs', userAddress);
        
        // normalize user address
        userAddress = utils.toChecksumAddress(userAddress);
        
        // apply options
        const optionsWithDefaults = {
            forceRefresh: false,
            ...options
        };
        
        // check cache
        if (!optionsWithDefaults.forceRefresh) {
            const cachedNFTs = getCachedNFTs({ userAddress });
            if (cachedNFTs && cachedNFTs.length > 0) {
                debug.log(`return ${cachedNFTs.length} NFTs from cache`);
                return cachedNFTs;
            }
        }
        
        try {
            let nfts = [];
            
            // load NFTs from web3 - this reflects the real ownership on blockchain
            try {
                const contractNFTs = await nftContract.methods.getNFTsByOwner(userAddress).call();
                if (contractNFTs && contractNFTs.length > 0) {
                    debug.log(`get ${contractNFTs.length} NFT tokenIds from contract`);
                    
                    // Promise.all handle all NFT queries
                    const nftPromises = contractNFTs.map(async tokenId => {
                        try {
                            // try to get NFT data
                            const nft = await loadSpecificNFT(tokenId, { contractAddress: petWorldNftAddress });
                            if (nft) {
                                return {
                                    ...nft,
                                    owner: userAddress,
                                    contractAddress: petWorldNftAddress
                                };
                            }
                            return null;
                        } catch (err) {
                            debug.error(`failed to load NFT token ${tokenId}:`, err);
                            return null;
                        }
                    });
                    
                    // wait for all promises to complete
                    const resolvedNfts = await Promise.all(nftPromises);
                    
                    // filter null values and add to nfts list
                    nfts = nfts.concat(resolvedNfts.filter(nft => nft !== null));
                }
            } catch (err) {
                debug.error('failed to get NFT list from contract:', err);
            }
            
            // remove duplicates, ensure no duplicate tokenIds
            const uniqueNftMap = new Map();
            nfts.forEach(nft => {
                if (!uniqueNftMap.has(nft.tokenId)) {
                    uniqueNftMap.set(nft.tokenId, nft);
                } else {
                    debug.warn(`found duplicate NFT in loadUserNFTs, tokenId: ${nft.tokenId}`);
                }
            });
            
            // convert Map to array
            const uniqueNfts = Array.from(uniqueNftMap.values());
            debug.log(`remove duplicates, ensure no duplicate tokenIds: ${uniqueNfts.length}/${nfts.length}`);
            
            // cache results
            if (uniqueNfts.length > 0) {
                cacheNFTs(uniqueNfts, userAddress, petWorldNftAddress);
                saveRefreshTime({ userAddress });
            }
            
            return uniqueNfts;
        } catch (err) {
            debug.error('failed to load user NFTs:', err);
            return [];
        }
    }
    
    /**
     * load specified NFT by contract address
     * @param {string} nftContractAddress - NFT contract address, use default petNftAddress if empty
     * @param {string|Object} userAddress - user wallet address or object containing address
     * @param {Object} options - optional parameters
     * @param {boolean} options.useCache - whether to use cache, default is true
     * @returns {Promise<Array>} NFT array
     */
    async function loadNFTByContractAddress(nftContractAddress, userAddress, options = {}) {
        // if no contract address provided, use default petNftAddress
        const contractAddress = nftContractAddress || getPetNftAddress();
        const useCache = options.useCache !== undefined ? options.useCache : true;
        
        // check and handle possible address object
        let addressStr = userAddress;
        if (userAddress && typeof userAddress === 'object') {
            // if input is wallet connection object, extract address field
            addressStr = userAddress.address || userAddress.walletAddress || null;
            debug.log(`extract user address from object: ${addressStr}`);
        }
        
        debug.log(`load NFT by contract address: ${contractAddress}, user address: ${addressStr}, use cache: ${useCache}`);
        
        if (!contractAddress) {
            debug.error('contract address is empty, cannot load NFT');
            return [];
        }
        
        if (!addressStr) {
            debug.error('user address is empty, cannot load NFT');
            return [];
        }
        
        // if use cache, try to get data from cache first
        if (useCache) {
            const cachedNfts = getCachedNFTs({ 
                userAddress: addressStr, 
                contractAddress: contractAddress,
                forceUpdate: options.forceUpdate || false 
            });
            
            if (cachedNfts.length > 0) {
                debug.log(`get ${cachedNfts.length} NFTs from cache for contract ${contractAddress}`);
                return cachedNfts;
            }
            
            debug.log('no data in cache or cache expired, load from blockchain');
        }
        
        // ensure contract is initialized
        const initialized = await init();
        if (!initialized) {
            debug.error('NFT service not initialized, cannot load NFT');
            return [];
        }
        
        try {
            debug.log('create contract instance...');
            
            // create contract instance
            const contractInstance = new web3.eth.Contract(window.PwNFTABI, contractAddress);
            
            if (!contractInstance || !contractInstance.methods) {
                debug.error('failed to create contract instance');
                return [];
            }
            
            // get number of NFTs owned by user
            debug.log(`query number of NFTs owned by user(${addressStr})`);
            const balance = await contractInstance.methods.balanceOf(addressStr).call();
            const totalNFTCount = parseInt(balance);
            debug.log(`number of NFTs owned by user: ${totalNFTCount}`);
            
            if (totalNFTCount === 0) {
                debug.log('user does not have any NFTs of this contract');
                return [];
            }
            
            // check if contract supports enumeration interface
            let supportsEnumeration = true;
            try {
                // check if contract supports enumeration interface
                if (!contractInstance.methods.tokenOfOwnerByIndex) {
                    debug.warn('contract does not support enumeration interface(tokenOfOwnerByIndex)');
                    supportsEnumeration = false;
                } else {
                    // try to call to verify interface is available
                    await contractInstance.methods.tokenOfOwnerByIndex(addressStr, 0).call();
                }
            } catch (enumError) {
                debug.warn('contract does not support enumeration interface:', enumError.message);
                supportsEnumeration = false;
            }
            
            // select different loading strategies based on whether contract supports enumeration interface
            let validNFTs = [];
            
            if (supportsEnumeration) {
                debug.log('use enumeration interface to load NFT');
                const limit = options.limit || 20;
                const startIndex = options.startIndex || 0;
                const endIndex = Math.min(startIndex + limit, totalNFTCount);
                
                // load NFT
                const tasks = [];
                for (let i = startIndex; i < endIndex; i++) {
                    tasks.push(fetchNFTByIndex(contractInstance, addressStr, i));
                }
                
                const results = await Promise.all(tasks);
                validNFTs = results.filter(result => result !== null);
                
                debug.log(`successfully loaded ${validNFTs.length} NFTs, failed ${results.length - validNFTs.length} NFTs`);
            } else {
                debug.log('contract does not support enumeration interface, use alternative method to load all possible NFTs');
                
                // get total minted, for limiting search range
                const totalMinted = await getTotalMinted(contractInstance);
                debug.log(`total minted: ${totalMinted}`);
                
                // determine search range based on balance and totalMinted
                const maxPossibleId = totalMinted > 0 ? totalMinted : Math.max(100, totalNFTCount * 10);
                debug.log(`based on total minted, search range is 0-${maxPossibleId}`);
                
                // create an array containing possible token IDs
                const possibleIds = [];
                
                // add some small common IDs first (more likely to be used)
                for (let i = 0; i <= 10; i++) {
                    possibleIds.push(i.toString());
                }
                
                // then add more targeted ID ranges
                const step = maxPossibleId <= 100 ? 1 : // if total is small, use 1 step
                           maxPossibleId <= 1000 ? 5 : // if total is medium, use 5 step
                           10; // if total is large, use 10 step
                
                for (let i = 10; i <= maxPossibleId; i += step) {
                    possibleIds.push(i.toString());
                }
                
                const foundIds = new Set(); // for tracking found token IDs
                
                debug.log(`start querying ${possibleIds.length} possible tokenIds`);
                
                // parallel process batch queries, to speed up
                const batchSize = 10;
                for (let i = 0; i < possibleIds.length; i += batchSize) {
                    const batch = possibleIds.slice(i, i + batchSize);
                    
                    // parallel process current batch
                    const batchPromises = batch.map(async (possibleId) => {
                        try {
                            const owner = await contractInstance.methods.ownerOf(possibleId).call();
                            if (owner.toLowerCase() === addressStr.toLowerCase()) {
                                // found tokenId owned by user
                                debug.log(`found tokenId owned by user: ${possibleId}`);
                                
                                // get token info
                                try {
                                    // get tokenURI
                                    let tokenURI;
                                    try {
                                        tokenURI = await contractInstance.methods.tokenURI(possibleId).call();
                                    } catch (uriError) {
                                        try {
                                            tokenURI = await contractInstance.methods.uri(possibleId).call();
                                        } catch (e) {
                                            // ignore error
                                        }
                                    }
                                    
                                    // get name and symbol
                                    let name = 'unknown pet';
                                    let symbol = 'PET';
                                    try {
                                        name = await contractInstance.methods.name().call();
                                        symbol = await contractInstance.methods.symbol().call();
                                    } catch (e) {
                                        // ignore error
                                    }
                                    
                                    // get metadata
                                    let metadata;
                                    if (tokenURI) {
                                        metadata = await fetchNFTMetadata(tokenURI, possibleId);
                                    } else {
                                        // if cannot get metadata, create default metadata but keep original URL
                                        metadata = {
                                            name: name ? `${name} #${possibleId}` : `pet #${possibleId}`,
                                            description: `${symbol || 'PET'} NFT`,
                                            image: null  // do not set default image, keep as null
                                        };
                                    }
                                    
                                    // get quality
                                    const qualities = ['COMMON', 'GOOD', 'EXCELLENT', 'RARE', 'LEGENDARY'];
                                    const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
                                    
                                    // create NFT object
                                    const nftObj = {
                                        tokenId: possibleId,
                                        contractAddress: contractAddress,
                                        owner: addressStr,
                                        metadata: {
                                            ...metadata,
                                            attributes: metadata.attributes || [
                                                { trait_type: "Quality", value: randomQuality },
                                                { trait_type: "Level", value: Math.floor(Math.random() * 10) + 1 },
                                                { trait_type: "Health", value: Math.floor(Math.random() * 31) + 70 },
                                                { trait_type: "Energy", value: Math.floor(Math.random() * 31) + 70 },
                                                { trait_type: "Hunger", value: Math.floor(Math.random() * 31) + 70 }
                                            ]
                                        }
                                    };
                                    
                                    // if no image URL, keep as null, do not set default image
                                    if (!nftObj.metadata.image) {
                                        // keep image URL as null, not set placeholder image
                                        debug.log(`NFT #${possibleId} has no image URL, keep as null`);
                                    }
                                    
                                    return nftObj;
                                } catch (dataError) {
                                    debug.error(`failed to get data for tokenId ${possibleId}:`, dataError);
                                    return null;
                                }
                            }
                        } catch (e) {
                            // ignore error, continue trying
                        }
                        return null;
                    });
                    
                    // wait for current batch to complete
                    const batchResults = await Promise.all(batchPromises);
                    
                    // add valid results
                    for (const result of batchResults) {
                        if (result && !foundIds.has(result.tokenId)) {
                            validNFTs.push(result);
                            foundIds.add(result.tokenId);
                        }
                    }
                    
                    // if enough NFTs found (at least as many as balance)
                    if (validNFTs.length >= totalNFTCount) {
                        debug.log(`found ${validNFTs.length} NFTs, reached or exceeded user's balance ${totalNFTCount}`);
                        break;
                    }
                }
                
                debug.log(`finally found ${validNFTs.length} NFTs, user has ${totalNFTCount} NFTs`);
                
                // if still cannot find enough NFTs, try denser search
                if (validNFTs.length < totalNFTCount) {
                    debug.log('try denser search to find remaining NFTs');
                    
                    // determine number of tokenIds still need to be found
                    const remainingToFind = totalNFTCount - validNFTs.length;
                    debug.log(`still need to find ${remainingToFind} NFTs`);
                    
                    // determine dense search range (based on total minted)
                    const denseScanMax = Math.min(totalMinted, 500); // search up to 500
                    
                    // skip found tokenIds
                    for (let i = 0; i <= denseScanMax && validNFTs.length < totalNFTCount; i++) {
                        if (foundIds.has(i.toString())) continue; // skip found tokenIds
                        
                        try {
                            const owner = await contractInstance.methods.ownerOf(i.toString()).call();
                            if (owner.toLowerCase() === addressStr.toLowerCase()) {
                                // found tokenId owned by user
                                debug.log(`found tokenId owned by user: ${i}`);
                                
                                // get token info and metadata, keep consistent logic with batch processing part
                                try {
                                    // get tokenURI
                                    let tokenURI;
                                    try {
                                        tokenURI = await contractInstance.methods.tokenURI(i.toString()).call();
                                    } catch (uriError) {
                                        try {
                                            tokenURI = await contractInstance.methods.uri(i.toString()).call();
                                        } catch (e) {
                                            // ignore error
                                        }
                                    }
                                    
                                    // get name and symbol
                                    let name = 'unknown pet';
                                    let symbol = 'PET';
                                    try {
                                        name = await contractInstance.methods.name().call();
                                        symbol = await contractInstance.methods.symbol().call();
                                    } catch (e) {
                                        // ignore error
                                    }
                                    
                                    // get metadata
                                    let metadata;
                                    if (tokenURI) {
                                        metadata = await fetchNFTMetadata(tokenURI, i.toString());
                                    } else {
                                        // if cannot get metadata, create default metadata
                                        metadata = {
                                            name: name ? `${name} #${i}` : `pet #${i}`,
                                            description: `${symbol || 'PET'} NFT`,
                                            image: null  // do not set default image, keep as null
                                        };
                                    }
                                    
                                    // get quality
                                    const qualities = ['COMMON', 'GOOD', 'EXCELLENT', 'RARE', 'LEGENDARY'];
                                    const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
                                    
                                    // create NFT object
                                    const nftObj = {
                                        tokenId: i.toString(),
                                        contractAddress: contractAddress,
                                        owner: addressStr,
                                        metadata: {
                                            ...metadata,
                                            attributes: metadata.attributes || [
                                                { trait_type: "Quality", value: randomQuality },
                                                { trait_type: "Level", value: Math.floor(Math.random() * 10) + 1 },
                                                { trait_type: "Health", value: Math.floor(Math.random() * 31) + 70 },
                                                { trait_type: "Energy", value: Math.floor(Math.random() * 31) + 70 },
                                                { trait_type: "Hunger", value: Math.floor(Math.random() * 31) + 70 }
                                            ]
                                        }
                                    };
                                    
                                    validNFTs.push(nftObj);
                                    foundIds.add(i.toString());
                                } catch (dataError) {
                                    debug.error(`failed to get metadata for tokenId ${i}:`, dataError);
                                    // create basic NFT object even if metadata cannot be retrieved
                                    validNFTs.push({
                                        tokenId: i.toString(),
                                        contractAddress: contractAddress,
                                        owner: addressStr,
                                        metadata: {
                                            name: `pet #${i}`,
                                            description: "a virtual pet from PetWorld",
                                            image: null,
                                            originalImageUrl: null, // explicitly set original URL to null
                                            attributes: [
                                                { trait_type: "Quality", value: "COMMON" }
                                            ]
                                        }
                                    });
                                    foundIds.add(i.toString());
                                }
                                
                                // if found all NFTs, stop searching
                                if (validNFTs.length >= totalNFTCount) {
                                    debug.log(`found all ${totalNFTCount} NFTs, stop searching`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // ignore error, continue trying
                        }
                    }
                }
            }
            
            // process image path for all NFTs (only process URL format, do not replace with placeholder image)
            for (const nft of validNFTs) {
                if (nft && nft.metadata) {
                    await processNFTImage(nft);
                }
            }
            
            // save new loaded NFTs to cache
            if (validNFTs.length > 0) {
                cacheNFTs(validNFTs, addressStr, contractAddress);
            }
            
            return validNFTs;
            
        } catch (error) {
            debug.error(`failed to load NFTs by contract address:`, error);
            return [];
        }
    }
    
    /**
     * get pet image URL
     * @param {Object} nft - NFT data object
     * @returns {string} image URL
     */
    function getPetImageUrl(nft) {
        // default placeholder image
        const placeholderImage = '../../assets/images/pet-placeholder.jpg';
        
        // if no metadata, return placeholder image
        if (!nft.metadata) {
            debug.log(`NFT ${nft.tokenId || 'unknown'} has no metadata, use placeholder image`);
            return placeholderImage;
        }
        
        // try to get pet type from name
        let petType = '';
        if (nft.metadata.name) {
            // extract pet type - usually format is "type #ID" or "type"
            const nameMatch = nft.metadata.name.match(/^([A-Za-z\s]+)(?:\s*#\d+)?$/);
            if (nameMatch && nameMatch[1]) {
                petType = nameMatch[1].trim();
                debug.log(`extract pet type from NFT name "${nft.metadata.name}": "${petType}"`);
            }
        }
        
        // if can extract pet type, try to get image from local resource
        if (petType) {
            // return corresponding local image resource path
            const localImageUrl = `${LOCAL_PETS_IMAGE_PATH}${petType}.jpg`;
            debug.log(`use local pet image path: ${localImageUrl}`);
            return localImageUrl;
        }
        
        // if cannot get pet type from name, but metadata has image URL, use metadata URL
        if (nft.metadata.image) {
            debug.log(`use image URL in metadata: ${nft.metadata.image}`);
            return nft.metadata.image;
        }
        
        // if cannot get any image, return placeholder image
        debug.log(`NFT ${nft.tokenId || 'unknown'} cannot get any image, use placeholder image`);
        return placeholderImage;
    }
    
    /**
     * check NFT image and return best available image URL
     * use local image first, then use network image
     * @param {Object} nft - NFT object
     * @returns {Promise<Object>} object containing best image URL and source information
     */
    async function getBestPetImageUrl(nft) {
        if (!nft || !nft.metadata) {
            debug.warn('invalid NFT object, cannot get image URL');
            return {
                imageUrl: '../../resources/images/pets/pet_placeholder.jpg',
                source: 'placeholder',
                isLocal: false
            };
        }
        
        // extract name from NFT metadata
        const name = nft.metadata.name || '';
        const tokenId = nft.tokenId || 'unknown';
        
        debug.log(`get best image URL for NFT #${tokenId} (${name})`);
        
        // extract pet type name from name (remove possible #number part)
        let petName = '';
        if (name) {
            // remove possible # and number suffix, only keep name part
            petName = name.split('#')[0].trim();
            debug.log(`extract pet name from "${name}": "${petName}"`);
        }
        
        // if no valid name, use tokenId as fallback
        if (!petName) {
            petName = tokenId.toString();
            debug.log(`use tokenId as pet name: "${petName}"`);
        }
        
        // build local image path
        const localImagePath = `/resources/images/pets/${petName}.jpg`;
        debug.log(`try to find local image: ${localImagePath}`);
        
        // create cache key, prevent duplicate check same image
        const cacheKey = `image_check_${petName}`;
        
        // check if there is cached result
        if (window.sessionStorage) {
            try {
                const cachedResult = sessionStorage.getItem(cacheKey);
                if (cachedResult) {
                    const parsedResult = JSON.parse(cachedResult);
                    debug.log(`use cached image check result: ${parsedResult.imageUrl} (${parsedResult.source})`);
                    return parsedResult;
                }
            } catch (e) {
                debug.warn('failed to read cached result from session storage:', e);
            }
        }
        
        // check if local image exists
        let localImageExists = false;
        try {
            // create a hidden Image object to test if local image exists
            const testImage = new Image();
            testImage.style.display = 'none';
            
            // use Promise to wait for image load or fail
            localImageExists = await new Promise((resolve) => {
                testImage.onload = function() {
                    resolve(true);
                };
                testImage.onerror = function() {
                    resolve(false);
                };
                // add timestamp to avoid cache problem
                testImage.src = localImagePath + "?t=" + Date.now();
            });
            
            debug.log(`local image check result (${petName}): ${localImageExists ? 'exists' : 'not exists'}`);
        } catch (error) {
            debug.warn(`failed to check local image (${petName}):`, error);
            localImageExists = false;
        }
        
        // decide which image to use
        let result;
        if (localImageExists) {
            // if local image exists, use local image
            result = {
                imageUrl: localImagePath,
                source: 'local',
                originalUrl: nft.metadata.image || nft.originalImageUrl || null,
                isLocal: true
            };
            debug.log(`use local image: ${localImagePath}`);
        } else {
            // if local image not exists, use network image
            // network image priority: nft.originalImageUrl > metadata.originalImageUrl > metadata.image
            const networkImageUrl = nft.originalImageUrl || 
                                 (nft.metadata.originalImageUrl ? nft.metadata.originalImageUrl : nft.metadata.image);
            
            if (networkImageUrl) {
                result = {
                    imageUrl: networkImageUrl,
                    source: 'network',
                    isLocal: false
                };
                debug.log(`use network image: ${networkImageUrl}`);
                
                // handle IPFS and other special URL formats
                if (networkImageUrl.startsWith('ipfs://')) {
                    const ipfsUrl = networkImageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    result.imageUrl = ipfsUrl;
                    debug.log(`IPFS link converted to: ${ipfsUrl}`);
                }
            } else {
                // if no network image, use placeholder image
                result = {
                    imageUrl: '/resources/images/pets/pet_placeholder.jpg',
                    source: 'placeholder',
                    isLocal: false
                };
                debug.log(`cannot get valid image, use placeholder image`);
            }
        }
        
        // save result to sessionStorage cache, avoid duplicate check
        if (window.sessionStorage) {
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify(result));
            } catch (e) {
                debug.warn('failed to save image check result to session storage:', e);
            }
        }
        
        return result;
    }
    
    /**
     * update NFT object's image URL to best image URL
     * @param {Object} nft - NFT object
     * @returns {Promise<Object>} updated NFT object
     */
    async function updateNFTWithBestImage(nft) {
        if (!nft) return nft;
        
        try {
            // get best image URL
            const imageResult = await getBestPetImageUrl(nft);
            
            // ensure metadata object exists
            if (!nft.metadata) {
                nft.metadata = {};
            }
            
            // save original image URL
            if (nft.metadata.image && !nft.originalImageUrl) {
                nft.originalImageUrl = nft.metadata.image;
            }
            
            // update image URL
            nft.metadata.image = imageResult.imageUrl;
            
            // add image source information
            nft.imageSource = imageResult.source;
            nft.isLocalImage = imageResult.isLocal;
            
            return nft;
        } catch (error) {
            debug.error(`failed to update NFT image: ${error}`);
            return nft; // return original NFT object
        }
    }
    
    /**
     * batch update NFT list's image URL to best image URL
     * @param {Array} nfts - NFT object array
     * @returns {Promise<Array>} updated NFT object array
     */
    async function updateNFTsWithBestImages(nfts) {
        if (!nfts || !Array.isArray(nfts) || nfts.length === 0) {
            return [];
        }
        
        debug.log(`start batch update ${nfts.length} NFTs' image URL`);
        
        // parallel process all NFTs
        const updatedNfts = await Promise.all(
            nfts.map(nft => updateNFTWithBestImage(nft))
        );
        
        debug.log(`finished updating ${updatedNfts.length} NFTs' image URL`);
        return updatedNfts;
    }
    
    /**
     * process NFT image, ensure URL is correct
     * @param {Object} nft - NFT object
     */
    async function processNFTImage(nft) {
        if (!nft || !nft.metadata) return;
        
        try {
            // ensure image URL exists
            if (!nft.metadata.image) {
                debug.log(`NFT ${nft.tokenId} has no image URL, try to use getPetImageUrl to get`);
                nft.metadata.image = getPetImageUrl(nft);
                return;
            }
            
            // save original URL to nft object
            nft.originalImageUrl = nft.metadata.image;
            debug.log(`NFT ${nft.tokenId} save original image URL: ${nft.originalImageUrl}`);
            
            // only process specific URL format, other URL keep as is
            if (nft.metadata.image.startsWith('ipfs://')) {
                // convert IPFS URL format
                nft.metadata.image = nft.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
                debug.log(`NFT ${nft.tokenId} IPFS image URL converted to: ${nft.metadata.image}`);
            } else if (nft.metadata.image.startsWith('./')) {
                // convert relative path
                nft.metadata.image = nft.metadata.image.replace('./', '/');
                debug.log(`NFT ${nft.tokenId} relative path converted to: ${nft.metadata.image}`);
            } else if (!nft.metadata.image.startsWith('http') && !nft.metadata.image.startsWith('/')) {
                // ensure resource path is correct
                nft.metadata.image = '/' + nft.metadata.image;
                debug.log(`NFT ${nft.tokenId} resource path corrected to: ${nft.metadata.image}`);
            }
            
            // if URL changed, log it
            if (nft.originalImageUrl !== nft.metadata.image) {
                debug.log(`NFT ${nft.tokenId} image URL changed from ${nft.originalImageUrl} to: ${nft.metadata.image}`);
            }
            
            // log final URL
            debug.log(`NFT ${nft.tokenId} final image URL: ${nft.metadata.image}`);
        } catch (error) {
            debug.error(`failed to process NFT ${nft.tokenId} image: ${error}`);
            // try to use getPetImageUrl if error
            nft.metadata.image = getPetImageUrl(nft);
        }
    }
    
    /**
     * load specific NFT
     * @param {string|Object} userAddress - user wallet address or object containing address
     * @param {Object} options - optional parameters
     * @returns {Promise<Array>} NFT array
     */
    async function loadSpecificNFT(userAddress, options = {}) {
        
        // check and process possible address object
        let addressStr = userAddress;
        if (userAddress && typeof userAddress === 'object') {
            // if input is wallet connection object, extract address field
            addressStr = userAddress.address || userAddress.walletAddress || null;
            debug.log(`extract user address from object: ${addressStr}`);
        }
        
        const specificAddress = getPetNftAddress();
        debug.log(`use specific NFT address: ${specificAddress}, user address: ${addressStr}`);
        return loadNFTByContractAddress(specificAddress, addressStr, options);
    }
    
    /**
     * cache NFT data
     * @param {Array} nfts - NFT array
     * @param {string} userAddress - user address
     * @param {string} contractAddress - contract address
     */
    function cacheNFTs(nfts, userAddress = null, contractAddress = null) {
        if (!nfts || !Array.isArray(nfts) || nfts.length === 0) {
            debug.warn('try to cache empty NFT array');
            return;
        }
        
        debug.log(`caching ${nfts.length} NFTs, execute deduplication logic`);
        
        // record cache time
        nftCache.lastUpdate = Date.now();
        
        // create tokenId mapping table for deduplication
        const tokenIdMap = new Map();
        for (const nft of nfts) {
            if (!nft || !nft.tokenId) {
                debug.warn('try to cache invalid NFT object');
                continue;
            }
            
            // use tokenId as key, keep first one if multiple same tokenId NFTs
            if (!tokenIdMap.has(nft.tokenId)) {
                tokenIdMap.set(nft.tokenId, nft);
            } else {
                debug.warn(`found duplicate NFT, tokenId: ${nft.tokenId}, ignore duplicate`);
            }
        }
        
        // get deduplicated NFT array
        const uniqueNfts = Array.from(tokenIdMap.values());
        debug.log(`deduplicated NFT count: ${uniqueNfts.length} (original count: ${nfts.length})`);
        
        // iterate deduplicated NFTs and update cache
        uniqueNfts.forEach(nft => {
            const nftId = `${nft.contractAddress || contractAddress}_${nft.tokenId}`;
            
            // ensure NFT has contractAddress property
            if (!nft.contractAddress && contractAddress) {
                nft.contractAddress = contractAddress;
            }
            
            // ensure NFT has owner property
            if (!nft.owner && userAddress) {
                nft.owner = userAddress;
            }
            
            // update allNfts cache, ensure no duplicate
            const existingIndex = nftCache.allNfts.findIndex(
                cachedNft => cachedNft.tokenId === nft.tokenId && 
                             cachedNft.contractAddress === nft.contractAddress
            );
            
            if (existingIndex >= 0) {
                // update existing NFT
                nftCache.allNfts[existingIndex] = { ...nft };
            } else {
                // add new NFT
                nftCache.allNfts.push({ ...nft });
            }
            
            // cache by contract address
            const contractAddr = nft.contractAddress || contractAddress;
            if (contractAddr) {
                if (!nftCache.byContract[contractAddr]) {
                    nftCache.byContract[contractAddr] = {};
                }
                nftCache.byContract[contractAddr][nft.tokenId] = { ...nft };
            }
            
            // cache by user address
            const ownerAddr = nft.owner || userAddress;
            if (ownerAddr) {
                if (!nftCache.byUser[ownerAddr]) {
                    nftCache.byUser[ownerAddr] = {};
                }
                nftCache.byUser[ownerAddr][nftId] = { ...nft };
            }
        });
        
        
        // save refresh time
        saveRefreshTime(userAddress, contractAddress);
        
        // save to localStorage as persistent cache
        try {
            localStorage.setItem('nftCache', JSON.stringify(nftCache));
            localStorage.setItem('nftRefreshTimes', JSON.stringify(refreshTimes));
            debug.log('NFT cache saved to localStorage');
        } catch (error) {
            debug.warn('failed to save NFT cache to localStorage:', error);
        }
    }
    
    /**
     * save NFT refresh time
     * @param {string} userAddress - user address
     * @param {string} contractAddress - contract address
     */
    function saveRefreshTime(userAddress = null, contractAddress = null) {
        const now = Date.now();
        
        // save refresh time by address
        if (userAddress) {
            refreshTimes.byAddress[userAddress] = now;
        }
        
        // save refresh time by contract address
        if (contractAddress) {
            refreshTimes.byContract[contractAddress] = now;
        }
        
        // save refresh time by address and contract address combination
        if (userAddress && contractAddress) {
            const key = `${userAddress}_${contractAddress}`;
            refreshTimes.byAddressContract[key] = now;
        }
        
        // save refresh time to localStorage
        try {
            localStorage.setItem('nftRefreshTimes', JSON.stringify(refreshTimes));
        } catch (error) {
            debug.warn('failed to save refresh time to localStorage:', error);
        }
    }
    
    /**
     * load refresh time record
     */
    function loadRefreshTimes() {
        try {
            const saved = localStorage.getItem('nftRefreshTimes');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(refreshTimes, parsed);
                debug.log('loaded refresh time record from localStorage');
            }
        } catch (error) {
            debug.warn('failed to load refresh time record from localStorage:', error);
        }
    }
    
    /**
     * get last refresh time
     * @param {Object} options - options
     * @param {string} options.userAddress - user address
     * @param {string} options.contractAddress - contract address
     * @returns {number} last refresh time, 0 if not found
     */
    function getLastRefreshTime(options = {}) {
        const { userAddress, contractAddress } = options;
        
        // load refresh time record when first used
        if (Object.keys(refreshTimes.byAddress).length === 0 && 
            Object.keys(refreshTimes.byContract).length === 0 && 
            Object.keys(refreshTimes.byAddressContract).length === 0) {
            loadRefreshTimes();
        }
        
        // check address and contract combination first
        if (userAddress && contractAddress) {
            const key = `${userAddress}_${contractAddress}`;
            if (refreshTimes.byAddressContract[key]) {
                return refreshTimes.byAddressContract[key];
            }
        }
        
        // check contract address first
        if (contractAddress && refreshTimes.byContract[contractAddress]) {
            return refreshTimes.byContract[contractAddress];
        }
        
        // check user address last
        if (userAddress && refreshTimes.byAddress[userAddress]) {
            return refreshTimes.byAddress[userAddress];
        }
        
        return 0; // return 0 if no refresh record found
    }
    
    /**
     * check if NFT data needs refresh
     * @param {Object} options - options
     * @param {string} options.userAddress - user address
     * @param {string} options.contractAddress - contract address
     * @param {number} options.refreshInterval - refresh interval (ms), default 1 hour
     * @returns {boolean} if needs refresh
     */
    function needsRefresh(options = {}) {
        const { 
            userAddress, 
            contractAddress, 
            refreshInterval = 3600000 // default 1 hour
        } = options;
        
        // get last refresh time
        const lastRefresh = getLastRefreshTime({ userAddress, contractAddress });
        
        // if no refresh record, needs refresh
        if (lastRefresh === 0) {
            return true;
        }
        
        // check if over refresh interval
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefresh;
        
        return timeSinceLastRefresh > refreshInterval;
    }
    
    /**
     * refresh NFT data
     * @param {string|Object} userAddress - user address or object containing address
     * @param {Object} options - options
     * @param {boolean} options.forceUpdate - whether to force refresh from blockchain
     * @param {string} options.contractAddress - specified contract address
     * @param {number} options.refreshInterval - auto refresh interval (ms), default 1 hour
     * @param {boolean} options.skipIntervalCheck - whether to skip interval check, ignore refreshInterval
     * @returns {Promise<Object>} object containing NFT data
     */
    async function refreshNFTs(userAddress, options = {}) {
        const { 
            forceUpdate = false, 
            contractAddress = getPetNftAddress(),
            refreshInterval = 3600000, // default 1 hour
            skipIntervalCheck = false
        } = options;
        
        // check and process possible address object
        let addressStr = userAddress;
        if (userAddress && typeof userAddress === 'object') {
            // if input is wallet connection object, extract address field
            addressStr = userAddress.address || userAddress.walletAddress || null;
            debug.log(`extract user address from object: ${addressStr}`);
        }
        
        debug.log(`refresh NFT data, user address: ${addressStr}, force update: ${forceUpdate}`);
        
        if (!addressStr) {
            debug.error('failed to refresh NFT: user address is empty');
            return { success: false, error: 'user address is empty', nfts: [] };
        }
        
        // check if needs refresh
        const shouldRefresh = skipIntervalCheck || forceUpdate || needsRefresh({
            userAddress: addressStr,
            contractAddress,
            refreshInterval
        });
        
        if (!shouldRefresh) {
            debug.log(`skip refresh NFT data, last refresh time: ${getLastRefreshTime({ userAddress: addressStr, contractAddress })}`);
            
            // get data from cache
            const cachedNfts = getCachedNFTs({
                userAddress: addressStr,
                contractAddress
            });
            
            return { 
                success: true, 
                nfts: cachedNfts, 
                totalCount: cachedNfts.length,
                fromCache: true,
                lastRefresh: getLastRefreshTime({ userAddress: addressStr, contractAddress })
            };
        }
        
        try {
            let nfts = [];
            
            // if force update, clear cache for specific contract first
            if (forceUpdate) {
                debug.log('force refresh NFT data from blockchain');
                clearNFTCache({ 
                    contractAddress: contractAddress 
                });
            }
            
            // load specific NFT
            await loadSpecificNFT(addressStr, { 
                forceUpdate,
                contractAddress
            });
            
            // get data from cache
            nfts = getCachedNFTs({
                userAddress: addressStr,
                contractAddress
            });
            
            if (!nfts || nfts.length === 0) {
                debug.log('no NFT data found');
                return { 
                    success: true, 
                    nfts: [], 
                    totalCount: 0,
                    fromCache: false,
                    lastRefresh: getLastRefreshTime({ userAddress: addressStr, contractAddress })
                };
            }
            
            // print NFT detailed info
            printNFTsInfo(nfts);
            
            // analyze NFT image URL format
            const urlAnalysis = analyzeImageUrls(nfts);
            
            // test NFT image URL
            const testedNfts = await testImageUrls(nfts);
            
            // update refresh time
            saveRefreshTime(addressStr, contractAddress);
            
            return {
                success: true,
                nfts: testedNfts,
                totalCount: testedNfts.length,
                urlAnalysis,
                fromCache: false,
                lastRefresh: Date.now()
            };
        } catch (error) {
            debug.error('failed to refresh NFT data:', error);
            return { 
                success: false, 
                error: error.message || 'unknown error', 
                nfts: [],
                totalCount: 0
            };
        }
    }
    
    /**
     * get NFT data from cache
     * @param {Object} options - query options
     * @returns {Array} array of NFTs matching conditions
     */
    function getCachedNFTs(options = {}) {
        const { 
            userAddress, 
            contractAddress, 
            tokenId,
            forceUpdate = false,
            maxAge = 3600000 // default max cache time 1 hour (ms)
        } = options;
        
        // load cache from localStorage (if needed)
        if (nftCache.allNfts.length === 0) {
            try {
                const savedCache = localStorage.getItem('nftCache');
                if (savedCache) {
                    const parsedCache = JSON.parse(savedCache);
                    // update cache (keep reference unchanged)
                    Object.assign(nftCache, parsedCache);
                    debug.log(`loaded ${nftCache.allNfts.length} NFT data from localStorage`);
                }
            } catch (error) {
                debug.warn('failed to load NFT cache from localStorage:', error);
            }
        }
        
        // check if cache is expired
        const now = Date.now();
        const cacheAge = now - nftCache.lastUpdate;
        
        if (forceUpdate || cacheAge > maxAge) {
            debug.log(`cache is expired or force updated, age: ${cacheAge}ms, max age: ${maxAge}ms`);
            return []; // return empty array to indicate need to reload
        }
        
        // query by specific tokenId
        if (contractAddress && tokenId) {
            if (nftCache.byContract[contractAddress] && nftCache.byContract[contractAddress][tokenId]) {
                debug.log(`found specific NFT: contract ${contractAddress}, tokenId ${tokenId}`);
                return [nftCache.byContract[contractAddress][tokenId]];
            }
            return [];
        }
        
        // query by contract address
        if (contractAddress) {
            if (nftCache.byContract[contractAddress]) {
                const nfts = Object.values(nftCache.byContract[contractAddress]);
                debug.log(`found ${nfts.length} NFTs for contract ${contractAddress}`);
                return nfts;
            }
            return [];
        }
        
        // query by user address
        if (userAddress) {
            if (nftCache.byUser[userAddress]) {
                const nfts = Object.values(nftCache.byUser[userAddress]);
                debug.log(`found ${nfts.length} NFTs for user ${userAddress}`);
                return nfts;
            }
            return [];
        }
        
        // return all NFTs
        debug.log(`return all cached NFTs: ${nftCache.allNfts.length}`);
        return [...nftCache.allNfts];
    }
    
    /**
     * clear NFT cache
     * @param {Object} options - clear options
     */
    function clearNFTCache(options = {}) {
        const { userAddress, contractAddress, all = false } = options;
        
        if (all) {
            // clear all cache
            nftCache.byContract = {};
            nftCache.byUser = {};
            nftCache.allNfts = [];
            nftCache.lastUpdate = 0;
            debug.log('cleared all NFT cache');
            
            // clear cache in localStorage
            try {
                localStorage.removeItem('nftCache');
            } catch (error) {
                debug.warn('failed to clear NFT cache in localStorage:', error);
            }
            
            return;
        }
        
        // clear by contract address
        if (contractAddress) {
            if (nftCache.byContract[contractAddress]) {
                // get tokenId list to delete
                const tokenIds = Object.keys(nftCache.byContract[contractAddress]);
                
                // delete data in byContract
                delete nftCache.byContract[contractAddress];
                
                // clear related NFTs in allNfts
                nftCache.allNfts = nftCache.allNfts.filter(
                    nft => nft.contractAddress !== contractAddress
                );
                
                // clear related NFTs in byUser
                Object.keys(nftCache.byUser).forEach(addr => {
                    const userCache = nftCache.byUser[addr];
                    tokenIds.forEach(tokenId => {
                        const nftId = `${contractAddress}_${tokenId}`;
                        if (userCache[nftId]) {
                            delete userCache[nftId];
                        }
                    });
                });
                
                debug.log(`cleared NFT cache for contract ${contractAddress}`);
            }
        }
        
        // clear by user address
        if (userAddress) {
            if (nftCache.byUser[userAddress]) {
                // delete data in byUser
                delete nftCache.byUser[userAddress];
                
                // delete user's NFTs from allNfts
                nftCache.allNfts = nftCache.allNfts.filter(
                    nft => nft.owner !== userAddress
                );
                
                // delete user's NFTs from byContract
                Object.keys(nftCache.byContract).forEach(addr => {
                    const contractCache = nftCache.byContract[addr];
                    
                    Object.keys(contractCache).forEach(tokenId => {
                        if (contractCache[tokenId].owner === userAddress) {
                            delete contractCache[tokenId];
                        }
                    });
                });
                
                debug.log(`cleared NFT cache for user ${userAddress}`);
            }
        }
        
        // update last cache time
        nftCache.lastUpdate = Date.now();
        
        // update cache in localStorage
        try {
            localStorage.setItem('nftCache', JSON.stringify(nftCache));
        } catch (error) {
            debug.warn('failed to update NFT cache in localStorage:', error);
        }
    }
    
    /**
     * test image URL is valid
     * @param {Array} nfts - NFT array
     * @returns {Promise<Array>} NFT array with test results
     */
    async function testImageUrls(nfts) {
        debug.log('start testing NFT image URLs...');
        
        const testPromises = nfts.map((nft, index) => {
            return new Promise(resolve => {
                // determine image URL to test
                let imageUrl = null;
                let testResults = {
                    currentImageSuccess: false,
                    originalImageSuccess: false
                };
                
                // initialize status variables
                let currentImageResolved = false;
                let originalImageResolved = true; // default to resolved, unless there is an original URL
                
                // function to check if both image tests are completed
                function checkBothResolved() {
                    if (currentImageResolved && originalImageResolved) {
                        // add test results to NFT object
                        nft.imageTestResults = testResults;
                        resolve(nft);
                    }
                }
                
                if (nft && nft.metadata) {
                    // test current displayed image URL first
                    imageUrl = nft.metadata.image;
                    
                    // get original URL
                    const originalUrl = nft.originalImageUrl || 
                                       (nft.metadata ? nft.metadata.originalImageUrl : null);
                    
                    // set test timeout
                    const timeoutDuration = 5000; // 5 seconds
                    
                    // test current image URL
                    if (imageUrl) {
                        const img = new Image();
                        // variable already defined outside, no need to redefine
                        
                        // set timeout
                        const currentTimeout = setTimeout(() => {
                            if (!currentImageResolved) {
                                debug.warn(`❌ NFT #${index + 1} (ID: ${nft.tokenId}) image load timeout: ${imageUrl}`);
                                currentImageResolved = true;
                                checkBothResolved();
                            }
                        }, timeoutDuration);
                        
                        img.onload = function() {
                            debug.log(`✅ NFT #${index + 1} (ID: ${nft.tokenId}) image loaded successfully: ${imageUrl}`);
                            testResults.currentImageSuccess = true;
                            clearTimeout(currentTimeout);
                            currentImageResolved = true;
                            checkBothResolved();
                        };
                        
                        img.onerror = function() {
                            debug.error(`❌ NFT #${index + 1} (ID: ${nft.tokenId}) image load failed: ${imageUrl}`);
                            clearTimeout(currentTimeout);
                            currentImageResolved = true;
                            checkBothResolved();
                        };
                        
                        img.src = imageUrl;
                    } else {
                        currentImageResolved = true;
                        debug.warn(`NFT #${index + 1} (ID: ${nft.tokenId || 'unknown'}) has no current image URL`);
                    }
                    
                    // test original image URL (if different from current URL)
                    // variable already defined outside, no need to redefine
                    
                    if (originalUrl && originalUrl !== imageUrl) {
                        originalImageResolved = false;
                        const origImg = new Image();
                        
                        // set timeout
                        const originalTimeout = setTimeout(() => {
                            if (!originalImageResolved) {
                                debug.warn(`❌ NFT #${index + 1} (ID: ${nft.tokenId}) original image load timeout: ${originalUrl}`);
                                originalImageResolved = true;
                                checkBothResolved();
                            }
                        }, timeoutDuration);
                        
                        origImg.onload = function() {
                            debug.log(`✅ NFT #${index + 1} (ID: ${nft.tokenId}) original image loaded successfully: ${originalUrl}`);
                            testResults.originalImageSuccess = true;
                            clearTimeout(originalTimeout);
                            originalImageResolved = true;
                            checkBothResolved();
                        };
                        
                        origImg.onerror = function() {
                            debug.error(`❌ NFT #${index + 1} (ID: ${nft.tokenId}) original image load failed: ${originalUrl}`);
                            clearTimeout(originalTimeout);
                            originalImageResolved = true;
                            checkBothResolved();
                        };
                        
                        origImg.src = originalUrl;
                    }
                } else {
                    debug.warn(`⚠️ NFT #${index + 1} has no image URL`);
                    // ensure both statuses are set to completed
                    currentImageResolved = true;
                    originalImageResolved = true;
                    resolve(nft);
                }
                
                // check again, in case all conditions are met but resolve is not triggered
                checkBothResolved();
            });
        });
        
        // wait for all tests to complete
        return Promise.all(testPromises);
    }
    
    /**
     * analyze NFT image URL format
     * @param {Array} nfts - NFT array
     * @returns {Object} URL analysis results
     */
    function analyzeImageUrls(nfts) {
        debug.log('analyze NFT image URL format...');
        
        const urlPatterns = {
            current: {
                http: 0,
                https: 0,
                ipfs: 0,
                relative: 0,
                absolute: 0,
                placeholder: 0,
                empty: 0,
                other: 0
            },
            original: {
                http: 0,
                https: 0,
                ipfs: 0,
                relative: 0,
                absolute: 0,
                placeholder: 0,
                empty: 0,
                other: 0
            }
        };
        
        const urlExamples = {
            current: {},
            original: {}
        };
        
        nfts.forEach(nft => {
            // analyze current image URL
            if (!nft || !nft.metadata || !nft.metadata.image) {
                urlPatterns.current.empty++;
            } else {
                analyzeUrl(nft.metadata.image, urlPatterns.current, urlExamples.current);
            }
            
            // analyze original image URL
            const originalUrl = nft.originalImageUrl || 
                              (nft.metadata ? nft.metadata.originalImageUrl : null);
            
            if (!originalUrl) {
                urlPatterns.original.empty++;
            } else {
                analyzeUrl(originalUrl, urlPatterns.original, urlExamples.original);
            }
        });
        
        // helper function: analyze single URL and update statistics
        function analyzeUrl(url, patterns, examples) {
            if (url.startsWith('http://')) {
                patterns.http++;
                if (!examples.http) examples.http = url;
            } else if (url.startsWith('https://')) {
                patterns.https++;
                if (!examples.https) examples.https = url;
                
                if (url.includes('placehold.co')) {
                    patterns.placeholder++;
                }
            } else if (url.startsWith('ipfs://')) {
                patterns.ipfs++;
                if (!examples.ipfs) examples.ipfs = url;
            } else if (url.startsWith('/')) {
                patterns.absolute++;
                if (!examples.absolute) examples.absolute = url;
            } else if (url.startsWith('./')) {
                patterns.relative++;
                if (!examples.relative) examples.relative = url;
            } else {
                patterns.other++;
                if (!examples.other) examples.other = url;
            }
        }
        
        // log analysis results
        debug.log('current URL pattern statistics:');
        debug.log('HTTP URLs:', urlPatterns.current.http);
        debug.log('HTTPS URLs:', urlPatterns.current.https);
        debug.log('IPFS URLs:', urlPatterns.current.ipfs);
        debug.log('absolute path:', urlPatterns.current.absolute);
        debug.log('relative path:', urlPatterns.current.relative);
        debug.log('placeholder URLs:', urlPatterns.current.placeholder);
        debug.log('empty URLs:', urlPatterns.current.empty);
        debug.log('other formats:', urlPatterns.current.other);
        
        debug.log('original URL pattern statistics:');
        debug.log('HTTP URLs:', urlPatterns.original.http);
        debug.log('HTTPS URLs:', urlPatterns.original.https);
        debug.log('IPFS URLs:', urlPatterns.original.ipfs);
        debug.log('absolute path:', urlPatterns.original.absolute);
        debug.log('relative path:', urlPatterns.original.relative);
        debug.log('placeholder URLs:', urlPatterns.original.placeholder);
        debug.log('empty URLs:', urlPatterns.original.empty);
        debug.log('other formats:', urlPatterns.original.other);
        
        return {
            patterns: urlPatterns,
            examples: urlExamples
        };
    }
    
    /**
     * print NFT detailed information to console
     * @param {Array} nfts - NFT array
     */
    function printNFTsInfo(nfts) {
        debug.log('=================== NFT detailed information ===================');
        debug.log(`total ${nfts.length} NFTs found`);
        
        nfts.forEach((nft, index) => {
            debug.log(`\n--------- NFT #${index + 1} ---------`);
            debug.log('TokenID:', nft.tokenId);
            debug.log('contract address:', nft.contractAddress);
            debug.log('owner:', nft.owner);
            
            if (nft.metadata) {
                debug.log('name:', nft.metadata.name);
                debug.log('description:', nft.metadata.description);
                debug.log('image URL:', nft.metadata.image);
                
                if (nft.originalImageUrl) {
                    debug.log('original image URL:', nft.originalImageUrl);
                } else if (nft.metadata.originalImageUrl) {
                    debug.log('original image URL:', nft.metadata.originalImageUrl);
                }
                
                if (nft.metadata.attributes && nft.metadata.attributes.length > 0) {
                    debug.log('attributes:');
                    nft.metadata.attributes.forEach(attr => {
                        debug.log(`  ${attr.trait_type}: ${attr.value}`);
                    });
                }
            }
        });
        
        debug.log('\n=================== end ===================');
    }
    
    /**
     * get total minted NFTs of contract
     * @param {Object} contract - NFT contract instance
     * @returns {Promise<number>} total minted NFTs
     */
    async function getTotalMinted(contract) {
        if (!contract || !contract.methods) {
            debug.error('failed to get total minted NFTs: contract instance is empty');
            return 0;
        }
        
        try {
            // check contract cache
            const contractAddress = contract._address;
            if (contractTotalMinted[contractAddress] !== undefined) {
                debug.log(`using cached total minted NFTs: ${contractTotalMinted[contractAddress]}`);
                return contractTotalMinted[contractAddress];
            }
            
            // check if contract supports totalMinted method
            if (typeof contract.methods.totalMinted !== 'function') {
                debug.warn('contract does not support totalMinted method, using alternative method to estimate minted amount');
                
                // try using _nextTokenId as alternative
                if (typeof contract.methods._nextTokenId === 'function') {
                    const nextTokenId = await contract.methods._nextTokenId().call();
                    const totalMinted = parseInt(nextTokenId);
                    debug.log(`using _nextTokenId to estimate total minted: ${totalMinted}`);
                    contractTotalMinted[contractAddress] = totalMinted;
                    return totalMinted;
                }
                
                debug.warn('unable to determine total minted, using default value 1000');
                contractTotalMinted[contractAddress] = 1000;
                return 1000;
            }
            
            // call totalMinted method to get total minted
            const totalMinted = await contract.methods.totalMinted().call();
            const mintedCount = parseInt(totalMinted);
            debug.log(`got total minted: ${mintedCount}`);
            
            // cache result
            contractTotalMinted[contractAddress] = mintedCount;
            
            return mintedCount;
        } catch (error) {
            debug.error('failed to get total minted:', error);
            return 0;
        }
    }
    
    // public API
    return {
        init,
        loadUserNFTs,
        loadNFTByContractAddress,
        loadSpecificNFT,
        fetchNFTMetadata,
        getQualityName,
        getPetNftAddress,
        cacheNFTs,
        getCachedNFTs,
        clearNFTCache,
        refreshNFTs,
        testImageUrls,
        analyzeImageUrls,
        printNFTsInfo,
        needsRefresh,
        getLastRefreshTime,
        getTotalMinted,
        getPetImageUrl, 
        getBestPetImageUrl,
        updateNFTWithBestImage,
        updateNFTsWithBestImages
    };
})();

// export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetNFTService;
} else {
    window.PetNFTService = PetNFTService;
} 