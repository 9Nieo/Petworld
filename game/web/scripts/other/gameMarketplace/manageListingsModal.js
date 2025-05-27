/**
 * NFT Listing Management Modal Functionality - Game Mode
 * Allows users to view and manage their listed NFTs
 */

// create an immediately invoked function expression to avoid global scope pollution
(function() {
    // define DOM element variables
    let modal;
    let modalContent;
    let closeBtn;
    let listingsList;
    let loadingIndicator;
    let statusMessage;
    let emptyMessage;
    
    // save Web3 instance and contract instances
    let web3;
    let marketplaceContract;
    let pwNFTContract;
    
    // save user's listed NFTs
    let userListings = [];
    
    // flag to indicate if the modal window has been initialized
    let isInitialized = false;
    
    // NFT price update cooldown time (1 hour, in seconds)
    const NFT_PRICE_UPDATE_COOLDOWN = 60 * 60; // 1小时 = 60分钟 * 60秒
    
    // Debug object for manage listings modal
    const debug = {
        log: function(message, ...args) {
            console.log('[Manage Listings Modal]', message, ...args);
        },
        error: function(message, ...args) {
            console.error('[Manage Listings Modal]', message, ...args);
        },
        warn: function(message, ...args) {
            console.warn('[Manage Listings Modal]', message, ...args);
        }
    };

    /**
     * Check if private key wallet should be used
     * @returns {boolean} - Whether private key wallet should be used
     */
    function shouldUsePrivateKeyWallet() {
        if (!window.SecureWalletManager) {
            return false;
        }
        
        try {
            return window.SecureWalletManager.isWalletReady() && 
                   window.SecureWalletManager.getWeb3() && 
                   window.SecureWalletManager.getAddress();
        } catch (error) {
            debug.error('Error checking private key wallet status:', error);
            return false;
        }
    }
    
    /**
     * Get private key wallet status
     * @returns {object} - Private key wallet status
     */
    function getPrivateKeyWalletStatus() {
        if (!window.SecureWalletManager) {
            return { hasWallet: false, activeAddress: null, isReady: false };
        }
        
        try {
            const isReady = window.SecureWalletManager.isWalletReady();
            const address = window.SecureWalletManager.getAddress();
            const web3Instance = window.SecureWalletManager.getWeb3();
            
            return {
                hasWallet: isReady && !!address && !!web3Instance,
                activeAddress: address,
                isReady: isReady,
                web3Available: !!web3Instance
            };
        } catch (error) {
            debug.error('Error getting private key wallet status:', error);
            return { hasWallet: false, activeAddress: null, isReady: false };
        }
    }
    
    /**
     * initialize the NFT listing management modal
     * @param {Object} web3Instance - Web3 instance
     * @param {Object} marketplaceContractInstance - Marketplace contract instance
     * @param {Object} nftContractInstance - NFT contract instance
     */
    function init(web3Instance, marketplaceContractInstance, nftContractInstance) {
        try {
            // save Web3 and contract instances
            web3 = web3Instance;
            marketplaceContract = marketplaceContractInstance;
            pwNFTContract = nftContractInstance;
            
            // if the modal already exists, return directly
            if (document.getElementById('manage-listings-modal-game')) {
                modal = document.getElementById('manage-listings-modal-game');
                listingsList = modal.querySelector('.listings-list');
                loadingIndicator = modal.querySelector('.loading-spinner');
                statusMessage = modal.querySelector('.status-message');
                emptyMessage = modal.querySelector('.empty-listings-message');
                closeBtn = modal.querySelector('.nft-modal-close');
                
                // rebind events
                bindEvents();
                
                isInitialized = true;
                return;
            }
            
            // create the modal DOM structure
            createModalDOM();
            
            // bind events
            bindEvents();
            
            isInitialized = true;
            console.log('game mode NFT listing management modal initialized successfully');
        } catch (error) {
            console.error('game mode NFT listing management modal initialization failed:', error);
            isInitialized = false;
        }
    }
    
    /**
     * create the modal DOM structure
     */
    function createModalDOM() {
        // create the modal container
        modal = document.createElement('div');
        modal.id = 'manage-listings-modal-game';
        modal.className = 'nft-modal game-modal';
        modal.style.display = 'none';
        
        // create the modal content
        modalContent = document.createElement('div');
        modalContent.className = 'nft-modal-content manage-listings-content game-modal-content';
        
        // create the close button
        closeBtn = document.createElement('span');
        closeBtn.className = 'nft-modal-close';
        closeBtn.innerHTML = '&times;';
        
        // create the title
        const title = document.createElement('h2');
        title.textContent = 'Manage My Listed NFTs';
        title.setAttribute('data-i18n', 'market.manageListings');
        
        // create the loading indicator
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-spinner';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p data-i18n="loading">加载中...</p>';
        
        // create the empty message
        emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-listings-message';
        emptyMessage.textContent = 'You have no listed NFTs';
        emptyMessage.setAttribute('data-i18n', 'market.noListings');
        emptyMessage.style.display = 'none';
        
        // create the listed NFTs list
        listingsList = document.createElement('div');
        listingsList.className = 'listings-list';
        
        // create the status message
        statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        statusMessage.style.display = 'none';
        
        // add all elements to the modal content
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(loadingIndicator);
        modalContent.appendChild(emptyMessage);
        modalContent.appendChild(listingsList);
        modalContent.appendChild(statusMessage);
        
        // add the modal content to the modal container
        modal.appendChild(modalContent);
        
        // add the modal to the body
        document.body.appendChild(modal);
    }
    
    /**
     * bind events
     */
    function bindEvents() {
        if (!closeBtn || !modal) {
            console.error('bind events failed: DOM elements are undefined');
            return;
        }
        
        // close button click event
        closeBtn.addEventListener('click', hideModal);
        
        // click outside the modal to close it
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideModal();
            }
        });
        
        // listen to the NFT listing event, so the list can be refreshed
        window.addEventListener('nft.listed', () => {
            if (modal && modal.style.display === 'block') {
                loadUserListings();
            }
        });
    }
    
    /**
     * show the modal
     */
    async function showModal() {
        // if the modal is not initialized, try to initialize
        if (!isInitialized || !modal) {
            // if web3 and contract instances exist, try to reinitialize
            if (web3 && marketplaceContract && pwNFTContract) {
                init(web3, marketplaceContract, pwNFTContract);
            } else {
                console.error('cannot show the NFT listing management modal: the modal is not initialized or the required contract instances are not set');
                return;
            }
        }
        
        // ensure the modal window elements exist
        if (!modal) {
            console.error('cannot show the NFT listing management modal: the modal element does not exist');
            return;
        }
        
        // show the modal
        modal.style.display = 'block';
        
        // reset the modal state
        resetModal();
        
        // load the user's listed NFTs
        await loadUserListings();
    }
    
    /**
     * hide the modal
     */
    function hideModal() {
        if (modal) {
            modal.style.display = 'none';
            resetModal();
        }
    }
    
    /**
     * reset the modal state
     */
    function resetModal() {
        // ensure the DOM elements exist
        if (!listingsList) {
            return;
        }
        
        // clear the listed NFTs list
        listingsList.innerHTML = '';
        
        // hide the status message
        if (statusMessage) {
            statusMessage.style.display = 'none';
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }
        
        // hide the empty message
        if (emptyMessage) {
            emptyMessage.style.display = 'none';
        }
        
        // show the loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }
    
    /**
     * load the user's listed NFTs
     */
    async function loadUserListings() {
        try {
            // show the loading indicator
            loadingIndicator.style.display = 'block';
            
            // clear the listed NFTs list
            listingsList.innerHTML = '';
            
            // hide the empty message
            emptyMessage.style.display = 'none';
            
            // Check if using private key wallet
            const usingPrivateKey = shouldUsePrivateKeyWallet();
            debug.log('Using private key wallet for loading listings:', usingPrivateKey);
            
            // get the current user address
            let userAddress;
            if (usingPrivateKey) {
                const walletStatus = getPrivateKeyWalletStatus();
                userAddress = walletStatus.activeAddress;
                
                if (!userAddress) {
                    throw new Error('Private key wallet address not available');
                }
                
                // Ensure we're using the correct Web3 instance
                web3 = window.SecureWalletManager.getWeb3();
                if (!web3) {
                    throw new Error('Failed to get Web3 instance from private key wallet');
                }
                
                debug.log('Using private key wallet address:', userAddress);
            } else {
            const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
            
            if (!userAddress) {
                    throw new Error('External wallet not connected');
                }
                
                debug.log('Using external wallet address:', userAddress);
            }
            
            // load the user's listed NFTs
            userListings = await loadUserListedNFTs(userAddress);
            
            // render the listed NFTs list
            renderListingsList();
            
            // show the corresponding interface based on the number of listed NFTs
            if (userListings.length === 0) {
                // show the message that there are no listed NFTs
                emptyMessage.style.display = 'block';
            }
            
            // hide the loading indicator
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('failed to load the user\'s listed NFTs:', error);
            // show the error message
            showStatus('failed to load the listed NFTs: ' + error.message, 'error');
            // hide the loading indicator
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * load the user's listed NFTs
     * @param {string} userAddress - user wallet address
     * @returns {Array} the array of the user's listed NFTs
     */
    async function loadUserListedNFTs(userAddress) {
        try {
            // store the user's listed NFTs
            const listedNFTs = [];
            
            // Ensure we have a valid marketplace contract
            if (!marketplaceContract || !marketplaceContract.methods) {
                debug.warn('Marketplace contract not available for loading user listings');
                return listedNFTs;
            }
            
            // Ensure we're using the correct Web3 instance for contract calls
            let contractToUse = marketplaceContract;
            
            // Check if we need to use private key wallet Web3
            if (shouldUsePrivateKeyWallet()) {
                const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                if (privateKeyWeb3) {
                    debug.log('Using private key wallet Web3 for contract calls in loadUserListedNFTs');
                    
                    // Test private key Web3 connectivity first
                    try {
                        const networkId = await privateKeyWeb3.eth.net.getId();
                        const blockNumber = await privateKeyWeb3.eth.getBlockNumber();
                        debug.log('Private key Web3 connectivity test passed:', { networkId, blockNumber });
                        
                        // Recreate contract with private key Web3
                        contractToUse = new privateKeyWeb3.eth.Contract(
                            marketplaceContract.options.jsonInterface,
                            marketplaceContract.options.address
                        );
                        
                        // Also recreate pwNFTContract if needed for balance checks
                        if (pwNFTContract && pwNFTContract.options) {
                            try {
                                const privateKeyPwNFTContract = new privateKeyWeb3.eth.Contract(
                                    pwNFTContract.options.jsonInterface,
                                    pwNFTContract.options.address
                                );
                                // Test the contract
                                await privateKeyPwNFTContract.methods.name().call();
                                pwNFTContract = privateKeyPwNFTContract;
                                debug.log('Successfully recreated pwNFTContract with private key Web3');
                            } catch (pwNFTError) {
                                debug.warn('Failed to recreate pwNFTContract with private key Web3:', pwNFTError);
                            }
                        }
                        
                    } catch (connectivityError) {
                        debug.error('Private key Web3 connectivity test failed:', connectivityError);
                        debug.log('Falling back to original Web3 instance');
                        // Keep using original contracts
                    }
                } else {
                    debug.warn('Private key Web3 not available, using original Web3');
                }
            }
            
            // Skip PetNFTService - directly get listed NFTs from marketplace contract
            debug.log('Loading user listed NFTs directly from marketplace contract for user:', userAddress);
            
            // Debug: Check if user has any NFTs at all
            try {
                if (pwNFTContract && pwNFTContract.methods && pwNFTContract.methods.balanceOf) {
                    debug.log('Checking user NFT balance...');
                    const userNFTBalance = await pwNFTContract.methods.balanceOf(userAddress).call();
                    debug.log(`User ${userAddress} owns ${userNFTBalance} NFTs in total`);
                    
                    if (userNFTBalance > 0) {
                        // Check a few NFTs to see if any are listed
                        for (let i = 0; i < Math.min(userNFTBalance, 3); i++) {
                            try {
                                const tokenId = await pwNFTContract.methods.tokenOfOwnerByIndex(userAddress, i).call();
                                const owner = await pwNFTContract.methods.ownerOf(tokenId).call();
                                debug.log(`NFT #${tokenId} owned by: ${owner} (marketplace: ${contractToUse.options.address})`);
                                
                                if (owner.toLowerCase() === contractToUse.options.address.toLowerCase()) {
                                    debug.log(`NFT #${tokenId} is in marketplace custody - checking listing`);
                                    try {
                                        const listing = await contractToUse.methods.listings(tokenId).call();
                                        debug.log(`NFT #${tokenId} listing:`, listing);
                                    } catch (listingError) {
                                        debug.log(`Failed to get listing for NFT #${tokenId}:`, listingError);
                                    }
                                }
                            } catch (tokenError) {
                                debug.log(`Error checking NFT at index ${i}:`, tokenError);
                            }
                        }
                    } else {
                        debug.log('User has no NFTs');
                    }
                } else {
                    debug.warn('pwNFTContract not available or missing balanceOf method');
                }
            } catch (balanceError) {
                debug.warn('Failed to check user NFT balance:', balanceError);
            }
            
            // Method 1: Use userListings mapping directly (since getUserListedItemCount doesn't exist)
            try {
                console.log('Trying to use userListings mapping to load user\'s listed NFTs');
                
                if (!contractToUse.methods.userListings) {
                    debug.log('userListings mapping not available, skipping to next method');
                    throw new Error('userListings mapping not available');
                }
                
                // Test contract connectivity first
                try {
                    const contractAddress = contractToUse.options.address;
                    debug.log('Testing contract connectivity for address:', contractAddress);
                    
                    // First check if contract exists at address
                    const web3Instance = contractToUse.currentProvider ? 
                        (contractToUse.currentProvider.web3 || contractToUse.currentProvider) : 
                        (shouldUsePrivateKeyWallet() ? window.SecureWalletManager.getWeb3() : web3);
                    
                    if (web3Instance && web3Instance.eth) {
                        const code = await web3Instance.eth.getCode(contractAddress);
                        if (!code || code === '0x' || code === '0x0') {
                            throw new Error('No contract code found at address: ' + contractAddress);
                        }
                        debug.log('Contract code exists at address');
                    }
                    
                    // Test with a simple call
                    const testCall = await contractToUse.methods.FEE_PERCENTAGE().call();
                    debug.log('Contract connectivity test passed, FEE_PERCENTAGE:', testCall);
                } catch (connectivityError) {
                    debug.error('Contract connectivity test failed:', connectivityError);
                    
                    // If connectivity test fails, try to use a simpler approach
                    debug.log('Attempting to continue without connectivity test...');
                    // Don't throw error, just log and continue
                }
                
                let index = 0;
                let hasMore = true;
                const maxItems = 100; // Prevent infinite loops
                
                // Iterate through userListings mapping until we reach the end
                while (hasMore && index < maxItems) {
                    try {
                        debug.log(`Attempting to get userListings[${userAddress}][${index}]`);
                        
                        // Get the tokenId at this index
                        const tokenId = await contractToUse.methods.userListings(userAddress, index).call();
                        
                        debug.log(`Found tokenId ${tokenId} at index ${index} for user ${userAddress}`);
                        
                        // In Solidity arrays, accessing beyond bounds throws an error
                        // So if we get here, we have a valid tokenId
                        // However, tokenId could be 0 if it was explicitly set to 0
                        
                        // Get the listing information to verify it's valid
                        let listing;
                        try {
                            listing = await contractToUse.methods.listings(tokenId).call();
                            debug.log(`Listing info for tokenId ${tokenId}:`, listing);
                        } catch (listingError) {
                            console.warn(`Failed to get listing info for NFT #${tokenId}:`, listingError);
                            index++;
                            continue;
                        }
                        
                        // Check if the listing is active and belongs to the user
                        if (listing && listing.active && listing.seller && 
                            listing.seller.toLowerCase() === userAddress.toLowerCase()) {
                            
                            debug.log(`Valid active listing found for NFT #${tokenId}`);
                            
                            // Get the NFT metadata
                                    const nftData = await fetchNFTData(tokenId);
                                    
                            // Check the price update cooldown
                                    const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                                    
                            // Add to the list
                                    listedNFTs.push({
                                        tokenId: tokenId,
                                        price: listing.price,
                                paymentToken: listing.paymentToken,
                                        seller: listing.seller,
                                        ...nftData,
                                        level: listing.level || 1,
                                        accumulatedFood: listing.accumulatedFood || 0,
                                        inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                        priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft,
                                        lastPriceUpdateTime: listing.lastPriceUpdateTime || '0'
                                    });
                            
                            debug.log(`Added NFT #${tokenId} to listed NFTs`);
                        } else {
                            debug.log(`NFT #${tokenId} is not active or not owned by user. Active: ${listing?.active}, Seller: ${listing?.seller}`);
                                }
                        
                        index++;
                            } catch (error) {
                        debug.log(`Error at index ${index}:`, error.message);
                        
                        if (error.message && (
                            error.message.includes("Returned values aren't valid") ||
                            error.message.includes("execution reverted") ||
                            error.message.includes("invalid opcode") ||
                            error.message.includes("revert") ||
                            error.message.includes("out of bounds") ||
                            error.message.includes("array access")
                        )) {
                            debug.log(`No more user listings at index ${index} (reached end of array)`);
                            hasMore = false;
                        } else {
                            console.warn(`Unexpected error getting user listing at index ${index}:`, error);
                            hasMore = false;
                        }
                            }
                        }
                        
                        if (listedNFTs.length > 0) {
                    console.log(`Found ${listedNFTs.length} listed NFTs through userListings mapping`);
                            return listedNFTs;
                }
            } catch (error) {
                console.warn('Failed to load user\'s listed NFTs through userListings mapping:', error);
            }
            
            // Method 2: Try to iterate through all quality listings to find user's NFTs
            try {
                console.log('Trying to find user\'s NFTs by iterating through quality listings');
                
                // Quality enum: 0=COMMON, 1=GOOD, 2=EXCELLENT, 3=RARE, 4=LEGENDARY
                // Common NFTs cannot be listed, so start from GOOD (1)
                const qualities = [1, 2, 3, 4]; // GOOD, EXCELLENT, RARE, LEGENDARY
                
                for (const quality of qualities) {
                    debug.log(`Checking quality ${quality} listings for user NFTs`);
                    
                    try {
                        let qualityIndex = 0;
                        let hasMoreInQuality = true;
                        const maxQualityItems = 200; // Prevent infinite loops
                        
                        while (hasMoreInQuality && qualityIndex < maxQualityItems) {
                            try {
                                const tokenId = await contractToUse.methods.qualityListings(quality, qualityIndex).call();
                                debug.log(`Found tokenId ${tokenId} in quality ${quality} at index ${qualityIndex}`);
                                
                                // Get the listing information
                                const listing = await contractToUse.methods.listings(tokenId).call();
                                
                                // Check if this listing belongs to our user
                                if (listing && listing.active && listing.seller && 
                                    listing.seller.toLowerCase() === userAddress.toLowerCase()) {
                                    
                                    debug.log(`Found user's NFT #${tokenId} in quality ${quality} listings`);
                                    
                                    // Get the NFT metadata
                                const nftData = await fetchNFTData(tokenId);
                                
                                    // Check the price update cooldown
                                const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                                
                                    // Add to the list (avoid duplicates)
                                    if (!listedNFTs.find(nft => nft.tokenId === tokenId)) {
                                listedNFTs.push({
                                    tokenId: tokenId,
                                    price: listing.price,
                                            paymentToken: listing.paymentToken,
                                    seller: listing.seller,
                                            ...nftData,
                                    level: listing.level || 1,
                                    accumulatedFood: listing.accumulatedFood || 0,
                                    inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                    priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft,
                                            lastPriceUpdateTime: listing.lastPriceUpdateTime || '0'
                                        });
                                        
                                        debug.log(`Added user's NFT #${tokenId} from quality listings`);
                                    }
                                }
                                
                                qualityIndex++;
                            } catch (qualityError) {
                                if (qualityError.message && (
                                    qualityError.message.includes("Returned values aren't valid") ||
                                    qualityError.message.includes("execution reverted") ||
                                    qualityError.message.includes("invalid opcode") ||
                                    qualityError.message.includes("revert")
                                )) {
                                    debug.log(`Reached end of quality ${quality} listings at index ${qualityIndex}`);
                                    hasMoreInQuality = false;
                                } else {
                                    console.warn(`Error getting quality ${quality} listing at index ${qualityIndex}:`, qualityError);
                                    hasMoreInQuality = false;
                                }
                            }
                        }
                    } catch (qualityIterationError) {
                        console.warn(`Error iterating through quality ${quality} listings:`, qualityIterationError);
                        }
                    }
                    
                    if (listedNFTs.length > 0) {
                    console.log(`Found ${listedNFTs.length} listed NFTs through quality listings iteration`);
                        return listedNFTs;
                }
            } catch (error) {
                console.warn('Failed to load user\'s listed NFTs through quality listings iteration:', error);
            }
            
            // Method 3: Try to get all market items and filter by user (fallback method)
            try {
                console.log('try to get all listed items in the market and filter the user\'s items');
                // check if there is a method to get all listed items
                if (marketplaceContract.methods.getAllMarketItems || 
                    marketplaceContract.methods.getMarketItemsCount) {
                    
                    let marketItems = [];
                    
                    // use getAllMarketItems method
                    if (marketplaceContract.methods.getAllMarketItems) {
                        marketItems = await marketplaceContract.methods.getAllMarketItems().call();
                    } 
                    // use getMarketItemsCount and getMarketItemAtIndex methods
                    else if (marketplaceContract.methods.getMarketItemsCount) {
                        const itemCount = await marketplaceContract.methods.getMarketItemsCount().call();
                        for (let i = 0; i < itemCount; i++) {
                            const item = await marketplaceContract.methods.getMarketItemAtIndex(i).call();
                            marketItems.push(item);
                        }
                    }
                    
                    // filter out the user's listed items
                    for (const item of marketItems) {
                        if (item.seller && item.seller.toLowerCase() === userAddress.toLowerCase() && 
                            item.sold !== true && item.price !== '0') {
                            
                            const tokenId = item.tokenId;
                            const nftData = await fetchNFTData(tokenId);
                            
                            // check the price update cooldown
                            const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                            
                            listedNFTs.push({
                                tokenId: tokenId,
                                price: item.price,
                                paymentToken: item.paymentTokenAddress || item.paymentToken,
                                seller: item.seller,
                                lastPriceUpdateTime: item.lastPriceUpdateTime || '0',
                                level: item.level || 1,
                                accumulatedFood: item.accumulatedFood || 0,
                                inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft,
                                ...nftData
                            });
                        }
                    }
                    
                    if (listedNFTs.length > 0) {
                        console.log(`found ${listedNFTs.length} listed NFTs through filtering the market items`);
                        return listedNFTs;
                    }
                }
            } catch (error) {
                console.warn('failed to get all listed items in the market:', error);
            }
            
            // Method 4: Simple direct check - try to find any NFTs that might be listed
            try {
                console.log('Trying simple direct check for known NFT IDs...');
                
                // Check some common NFT IDs that might be listed
                const commonTokenIds = [];
                
                // Generate some possible token IDs to check
                for (let i = 1; i <= 50; i++) {
                    commonTokenIds.push(i);
                }
                
                for (const tokenId of commonTokenIds) {
                    try {
                        // Check if this NFT exists and is listed
                        const listing = await contractToUse.methods.listings(tokenId).call();
                        
                        if (listing && listing.active && listing.seller && 
                            listing.seller.toLowerCase() === userAddress.toLowerCase()) {
                            
                            debug.log(`Found user's listed NFT #${tokenId} through direct check`);
                            
                            // Get the NFT metadata
                            const nftData = await fetchNFTData(tokenId);
                            
                            // Check the price update cooldown
                            const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                            
                            // Add to the list (avoid duplicates)
                            if (!listedNFTs.find(nft => nft.tokenId === tokenId)) {
                                listedNFTs.push({
                                    tokenId: tokenId,
                                    price: listing.price,
                                    paymentToken: listing.paymentToken,
                                    seller: listing.seller,
                                    ...nftData,
                                    level: listing.level || 1,
                                    accumulatedFood: listing.accumulatedFood || 0,
                                    inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                    priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft,
                                    lastPriceUpdateTime: listing.lastPriceUpdateTime || '0'
                                });
                                
                                debug.log(`Added user's NFT #${tokenId} from direct check`);
                            }
                        }
                    } catch (directCheckError) {
                        // Ignore errors for non-existent NFTs
                        if (!directCheckError.message.includes("Returned values aren't valid") &&
                            !directCheckError.message.includes("execution reverted")) {
                            debug.log(`Error checking NFT #${tokenId}:`, directCheckError.message);
                        }
                    }
                }
                
                if (listedNFTs.length > 0) {
                    console.log(`Found ${listedNFTs.length} listed NFTs through direct check`);
                    return listedNFTs;
                }
            } catch (error) {
                console.warn('Failed to load user\'s listed NFTs through direct check:', error);
            }
            
            console.log('all methods tried, found the listed NFTs:', listedNFTs.length);
            return listedNFTs;
        } catch (error) {
            console.error('failed to load the user\'s listed NFTs:', error);
            throw error;
        }
    }
    
    /**
     * get the NFT data
     * @param {string} tokenId - the tokenId of the NFT
     * @returns {Object} the data of the NFT
     */
    async function fetchNFTData(tokenId) {
        try {
            // get the metadata URI of the NFT
            const tokenURI = await pwNFTContract.methods.tokenURI(tokenId).call();
            
            // default NFT data
            let nftData = {
                name: `NFT #${tokenId}`,
                image: '',
                description: '',
                quality: 'COMMON',
                attributes: []
            };
            
            try {
                // try to get the metadata
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                
                // update the NFT data
                nftData.name = metadata.name || nftData.name;
                nftData.image = metadata.image || nftData.image;
                nftData.description = metadata.description || nftData.description;
                
                // get the quality from the metadata
                if (metadata.attributes) {
                    const qualityAttr = metadata.attributes.find(attr => attr.trait_type === 'Quality' || attr.trait_type === '品质');
                    if (qualityAttr) {
                        nftData.quality = qualityAttr.value;
                    }
                    nftData.attributes = metadata.attributes;
                }
            } catch (error) {
                console.warn(`failed to get the metadata of NFT #${tokenId}:`, error);
            }
            
            return nftData;
        } catch (error) {
            console.error(`failed to get the data of NFT #${tokenId}:`, error);
            return {
                name: `NFT #${tokenId}`,
                image: '',
                description: '',
                quality: 'COMMON',
                attributes: []
            };
        }
    }
    
    /**
     * render the listed NFTs list
     */
    function renderListingsList() {
        // clear the list
        listingsList.innerHTML = '';
        
        // iterate the listed NFTs
        userListings.forEach(listing => {
            // create the list item
            const listingItem = document.createElement('div');
            listingItem.className = 'listing-item';
            listingItem.setAttribute('data-token-id', listing.tokenId);
            
            // NFT image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'listing-image';
            
            // NFT image
            const image = document.createElement('img');
            // handle the image path
            let imageSrc = listing.image || '';
            
            // check if the image path is an IPFS path
            if (imageSrc.startsWith('ipfs://')) {
                // convert the IPFS path to the HTTP gateway URL
                imageSrc = imageSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // if there is no image or the image path is invalid, use the default image
            image.src = imageSrc || '../../resources/images/default-pet.png';
            image.alt = listing.name || `NFT #${listing.tokenId}`;
            
            // when the image loading fails, show the placeholder image
            image.onerror = function() {
                this.src = '../../resources/images/default-pet.png';
                // add the contain class to avoid the placeholder image being cropped
                this.classList.add('contain-image');
            };
            
            // check the image ratio after the image loading
            image.onload = function() {
                // if the image is a rectangle, use the contain mode to avoid being cropped
                if (Math.abs(this.naturalWidth / this.naturalHeight - 1) > 0.2) {
                    this.classList.add('contain-image');
                }
            };
            
            // add the image to the container
            imageContainer.appendChild(image);
            
            // NFT info container
            const infoContainer = document.createElement('div');
            infoContainer.className = 'listing-info';
            
            // NFT name
            const nameElement = document.createElement('div');
            nameElement.className = 'listing-name';
            nameElement.textContent = listing.name || `NFT #${listing.tokenId}`;
            
            // NFT ID
            const idElement = document.createElement('div');
            idElement.className = 'listing-id';
            idElement.textContent = `ID: ${listing.tokenId}`;
            
            // NFT quality
            const qualityElement = document.createElement('div');
            qualityElement.className = 'listing-quality';
            qualityElement.textContent = `Quality: ${listing.quality}`;
            qualityElement.setAttribute('data-i18n-quality', listing.quality.toLowerCase());
            
            // NFT level - add the level display
            const levelElement = document.createElement('div');
            levelElement.className = 'listing-level';
            levelElement.textContent = `等级: ${listing.level || 1}`;
            levelElement.style.color = '#0070f3';
            levelElement.style.fontWeight = 'bold';
            levelElement.style.fontSize = '14px';
            levelElement.style.marginTop = '5px';
            
            // NFT price
            const priceContainer = document.createElement('div');
            priceContainer.className = 'listing-price-container';
            
            // price label
            const priceLabel = document.createElement('span');
            priceLabel.className = 'price-label';
            priceLabel.textContent = 'Price: ';
            priceLabel.setAttribute('data-i18n', 'market.price');
            
            // price value
            const priceValue = document.createElement('span');
            priceValue.className = 'price-value';
            
            // format the price
            const priceInEther = web3.utils.fromWei(listing.price, 'ether');
            priceValue.textContent = `${priceInEther} ${getTokenSymbol(listing.paymentToken)}`;
            
            // add the price label and value to the price container
            priceContainer.appendChild(priceLabel);
            priceContainer.appendChild(priceValue);
            
            // if the NFT is in the price update cooldown, show the cooldown info
            if (listing.inPriceUpdateCooldown) {
                const cooldownInfo = document.createElement('div');
                cooldownInfo.className = 'price-cooldown-info';
                cooldownInfo.textContent = `Price update cooldown: ${formatTimeLeft(listing.priceUpdateCooldownTimeLeft)}`;
                cooldownInfo.style.color = '#e74c3c';
                cooldownInfo.style.fontSize = '12px';
                cooldownInfo.style.marginTop = '5px';
                
                // add the cooldown info to the price container
                priceContainer.appendChild(cooldownInfo);
            }
            
            // actions container
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'listing-actions';
            
            // cancel listing button
            const cancelButton = document.createElement('button');
            cancelButton.className = 'action-btn cancel-listing-btn';
            cancelButton.textContent = 'Cancel listing';
            cancelButton.setAttribute('data-i18n', 'market.cancelListing');
            // Ensure text color is explicitly set to white and background color is set to red
            cancelButton.style.color = 'white';
            cancelButton.style.backgroundColor = '#ef5350';
            cancelButton.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent the event from bubbling up
                handleCancelListing(listing);
            });
            
            // update price button
            const updateButton = document.createElement('button');
            updateButton.className = 'action-btn update-price-btn';
            updateButton.textContent = 'Update price';
            updateButton.setAttribute('data-i18n', 'market.updatePrice');
            // Ensure text color is explicitly set to white and background color is set to green
            updateButton.style.color = 'white';
            updateButton.style.backgroundColor = '#66bb6a';
            
            // if the NFT is in the price update cooldown, disable the update price button
            if (listing.inPriceUpdateCooldown) {
                updateButton.disabled = true;
                updateButton.classList.add('disabled');
                // Change background color when disabled but keep text color visible
                updateButton.style.backgroundColor = '#cccccc';
                updateButton.style.color = '#666666';
                updateButton.title = `NFT #${listing.tokenId} needs to wait ${formatTimeLeft(listing.priceUpdateCooldownTimeLeft)} to update the price`;
            } else {
                // add the click event handler
                updateButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent the event from bubbling up
                    handleUpdatePrice(listing);
                });
            }
            
            // add the buttons to the actions container
            actionsContainer.appendChild(updateButton);
            actionsContainer.appendChild(cancelButton);
            
            // add the elements to the info container
            infoContainer.appendChild(nameElement);
            infoContainer.appendChild(idElement);
            infoContainer.appendChild(qualityElement);
            infoContainer.appendChild(levelElement);
            infoContainer.appendChild(priceContainer);
            
            // add the image container, info container and actions container to the listing item
            listingItem.appendChild(imageContainer);
            listingItem.appendChild(infoContainer);
            listingItem.appendChild(actionsContainer);
            
            // add the listing item to the listings list
            listingsList.appendChild(listingItem);
            
            // try to apply the internationalization
            if (window.applyI18n && typeof window.applyI18n === 'function') {
                window.applyI18n(listingItem);
            }
        });
        
        // if there is no listed NFT, show the empty message
        if (userListings.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
        }
        
        // add the cooldown related CSS styles
        addCooldownStyles();
    }
    
    /**
     * add the cooldown related CSS styles
     */
    function addCooldownStyles() {
        // check if the style already exists
        const styleId = 'nft-cooldown-styles';
        if (document.getElementById(styleId)) {
            return;
        }
        
        // create the style element
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .action-btn.disabled {
                opacity: 0.7;
                cursor: not-allowed;
                background-color: #ccc !important;
                color: #666 !important;
            }
            
            .price-cooldown-info {
                color: #e74c3c;
                font-size: 12px;
                margin-top: 5px;
            }
            
            .action-btn.cancel-listing-btn {
                background-color: #ef5350;
                color: white;
            }
            
            .action-btn.update-price-btn {
                background-color: #66bb6a;
                color: white;
            }
        `;
        
        // add to the document head
        document.head.appendChild(style);
    }
    
    /**
     * get the token symbol
     * @param {string} tokenAddress - the token address
     * @returns {string} the token symbol
     */
    function getTokenSymbol(tokenAddress) {
        // check the supportedMarketTokens module
        if (window.supportedMarketTokens && typeof window.supportedMarketTokens.getSymbolByAddress === 'function') {
            return window.supportedMarketTokens.getSymbolByAddress(tokenAddress);
        }
        
        // default return
        return 'TOKEN';
    }
    
    /**
     * handle the cancel listing
     * @param {Object} listing - the listing info
     */
    async function handleCancelListing(listing) {
        try {
            // show the loading status
            showStatus('Processing...', 'info');
            
            // Check if using private key wallet
            const usingPrivateKey = shouldUsePrivateKeyWallet();
            debug.log('Using private key wallet for cancel listing:', usingPrivateKey);
            
            // get the user address
            let userAddress;
            if (usingPrivateKey) {
                const walletStatus = getPrivateKeyWalletStatus();
                userAddress = walletStatus.activeAddress;
                
                if (!userAddress) {
                    throw new Error('Private key wallet address not available');
                }
                
                // Ensure we're using the correct Web3 instance
                web3 = window.SecureWalletManager.getWeb3();
                if (!web3) {
                    throw new Error('Failed to get Web3 instance from private key wallet');
                }
            } else {
            const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
            
            if (!userAddress) {
                    throw new Error('External wallet not connected');
                }
            }
            
            // confirm the user is the seller
            if (listing.seller.toLowerCase() !== userAddress.toLowerCase()) {
                throw new Error('You are not the seller of this NFT');
            }
            
            // call the contract to cancel the listing
            let receipt;
            if (usingPrivateKey) {
                // Use private key wallet for cancel listing transaction
                receipt = await window.SecureWalletManager.sendContractTransaction(
                    marketplaceContract,
                    'cancelListing',
                    [listing.tokenId],
                    {
                        gas: 300000
                    }
                );
            } else {
                // Use connected wallet
                receipt = await marketplaceContract.methods.cancelListing(listing.tokenId).send({ 
                    from: userAddress,
                    gas: 300000
                });
            }
            
            console.log('NFT canceled listing successfully:', receipt);
            
            // show the success message
            showStatus('NFT has been canceled!', 'success');
            
            // trigger the NFT delisted event
            const delistedEvent = new CustomEvent('nft.delisted', {
                detail: {
                    tokenId: listing.tokenId
                }
            });
            window.dispatchEvent(delistedEvent);
            
            // remove from the listings list
            const index = userListings.findIndex(item => item.tokenId === listing.tokenId);
            if (index !== -1) {
                userListings.splice(index, 1);
            }
            
            // render the listings list
            renderListingsList();
            
            // if there is no listed NFT, show the empty message
            if (userListings.length === 0) {
                emptyMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('failed to cancel the listing of NFT:', error);
            showStatus('failed to cancel the listing of NFT: ' + error.message, 'error');
        }
    }
    
    /**
     * handle the update price
     * @param {Object} listing - the listing info
     */
    async function handleUpdatePrice(listing) {
        try {
            // check the price update cooldown again
            const cooldownInfo = await checkPriceUpdateCooldown(listing.tokenId);
            if (cooldownInfo.inCooldown) {
                // if still in the cooldown, show the error message and prevent the update
                showStatus(`NFT is still in the price update cooldown, need to wait ${formatTimeLeft(cooldownInfo.timeLeft)} to update the price`, 'error');
                return;
            }
            
            // check if the update price container already exists, if exists, remove it
            const existingContainer = document.querySelector('.update-price-container');
            if (existingContainer) {
                existingContainer.remove();
            }
            
            // create the update price container
            const updatePriceContainer = document.createElement('div');
            updatePriceContainer.className = 'update-price-container';
            updatePriceContainer.style.position = 'fixed';
            updatePriceContainer.style.top = '40%';
            updatePriceContainer.style.left = '50%';
            updatePriceContainer.style.transform = 'translate(-50%, -50%)';
            updatePriceContainer.style.zIndex = '2500';  // Higher z-index to appear above everything
            updatePriceContainer.style.width = '90%';
            updatePriceContainer.style.maxWidth = '350px';
            updatePriceContainer.style.backgroundColor = '#fff';
            updatePriceContainer.style.borderRadius = '8px';
            updatePriceContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
            
            // create the background overlay, for closing the modal
            const overlay = document.createElement('div');
            overlay.className = 'update-price-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
            overlay.style.zIndex = '2400';  // Just below the update price container
            
            // click the overlay to close the modal
            overlay.addEventListener('click', () => {
                overlay.remove();
                updatePriceContainer.remove();
            });
            
            // title
            const title = document.createElement('h3');
            title.textContent = 'Update NFT price';
            title.setAttribute('data-i18n', 'market.updateNFTPrice');
            title.style.textAlign = 'center';
            title.style.margin = '15px 0';
            title.style.fontSize = '18px';
            title.style.color = '#333';
            
            // create the form
            const form = document.createElement('div');
            form.className = 'update-price-form';
            form.style.padding = '0 20px 20px';
            
            // current price display
            const currentPrice = document.createElement('div');
            currentPrice.className = 'current-price';
            currentPrice.innerHTML = `Current price: <strong>${web3.utils.fromWei(listing.price, 'ether')} ${getTokenSymbol(listing.paymentToken)}</strong>`;
            currentPrice.style.marginBottom = '15px';
            currentPrice.style.fontSize = '14px';
            
            // new price input
            const priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.className = 'new-price-input';
            priceInput.min = '0';
            priceInput.step = '0.001';
            priceInput.placeholder = 'Enter the new price';
            priceInput.style.width = '100%';
            priceInput.style.padding = '10px';
            priceInput.style.border = '1px solid #ddd';
            priceInput.style.borderRadius = '4px';
            priceInput.style.fontSize = '14px';
            priceInput.style.boxSizing = 'border-box';
            priceInput.style.marginBottom = '15px';
            
            // set the default value to the current price
            priceInput.value = web3.utils.fromWei(listing.price, 'ether');
            
            // cooldown note (if there is the last update time)
            if (listing.lastPriceUpdateTime && listing.lastPriceUpdateTime !== '0') {
                const lastUpdateTime = new Date(parseInt(listing.lastPriceUpdateTime) * 1000);
                const lastUpdateInfo = document.createElement('div');
                lastUpdateInfo.className = 'last-update-info';
                lastUpdateInfo.innerHTML = `Last update time: <strong>${lastUpdateTime.toLocaleString()}</strong>`;
                lastUpdateInfo.style.marginBottom = '10px';
                lastUpdateInfo.style.fontSize = '12px';
                lastUpdateInfo.style.color = '#666';
                
                // add to the form
                form.appendChild(lastUpdateInfo);
                
                // add the cooldown note
                const cooldownNote = document.createElement('div');
                cooldownNote.className = 'cooldown-note';
                cooldownNote.textContent = 'Note: Each price update has a 1 hour cooldown';
                cooldownNote.style.marginBottom = '15px';
                cooldownNote.style.fontSize = '12px';
                cooldownNote.style.color = '#e74c3c';
                
                // add to the form
                form.appendChild(cooldownNote);
            }
            
            // buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'price-buttons';
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.justifyContent = 'space-between';
            buttonsContainer.style.gap = '10px';
            
            // cancel button
            const cancelButton = document.createElement('button');
            cancelButton.className = 'action-btn cancel-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.setAttribute('data-i18n', 'button.cancel');
            cancelButton.style.flex = '1';
            cancelButton.style.padding = '10px';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '4px';
            cancelButton.style.backgroundColor = '#f1f1f1';
            cancelButton.style.color = '#666';
            cancelButton.style.cursor = 'pointer';
            
            // confirm button
            const confirmButton = document.createElement('button');
            confirmButton.className = 'action-btn confirm-btn';
            confirmButton.textContent = 'Confirm update';
            confirmButton.setAttribute('data-i18n', 'button.confirm');
            confirmButton.style.flex = '1';
            confirmButton.style.padding = '10px';
            confirmButton.style.border = 'none';
            confirmButton.style.borderRadius = '4px';
            confirmButton.style.backgroundColor = '#4CAF50';
            confirmButton.style.color = 'white';
            confirmButton.style.cursor = 'pointer';
            
            // 添加事件处理
            cancelButton.addEventListener('click', () => {
                // remove the update price container and the overlay
                overlay.remove();
                updatePriceContainer.remove();
            });
            
            confirmButton.addEventListener('click', async () => {
                // get the new price
                const newPrice = priceInput.value;
                
                if (!newPrice || parseFloat(newPrice) <= 0) {
                    alert('Please enter a valid price');
                    return;
                }
                
                try {
                    // 再次检查价格更新冷却期
                    const finalCheck = await checkPriceUpdateCooldown(listing.tokenId);
                    if (finalCheck.inCooldown) {
                        throw new Error(`NFT is still in the price update cooldown, need to wait ${formatTimeLeft(finalCheck.timeLeft)} to update the price`);
                    }
                    
                    // show the loading status
                    showStatus('Updating price...', 'info');
                    
                    // remove the modal and the overlay
                    overlay.remove();
                    updatePriceContainer.remove();
                    
                    // Check if using private key wallet
                    const usingPrivateKey = shouldUsePrivateKeyWallet();
                    debug.log('Using private key wallet for price update:', usingPrivateKey);
                    
                    // get the user address
                    let userAddress;
                    if (usingPrivateKey) {
                        const walletStatus = getPrivateKeyWalletStatus();
                        userAddress = walletStatus.activeAddress;
                        
                        if (!userAddress) {
                            throw new Error('Private key wallet address not available');
                        }
                        
                        // Ensure we're using the correct Web3 instance
                        web3 = window.SecureWalletManager.getWeb3();
                        if (!web3) {
                            throw new Error('Failed to get Web3 instance from private key wallet');
                        }
                    } else {
                    const accounts = await web3.eth.getAccounts();
                        userAddress = accounts[0];
                    
                    if (!userAddress) {
                            throw new Error('External wallet not connected');
                        }
                    }
                    
                    // calculate the price (convert to Wei)
                    const priceInWei = web3.utils.toWei(newPrice, 'ether');
                    
                    // call the contract to update the price
                    let receipt;
                    try {
                        if (usingPrivateKey) {
                            // Use private key wallet for price update transaction
                        // first try to use the updateListingPrice method
                        if (marketplaceContract.methods.updateListingPrice) {
                                receipt = await window.SecureWalletManager.sendContractTransaction(
                                    marketplaceContract,
                                    'updateListingPrice',
                                    [listing.tokenId, priceInWei],
                                    {
                                        gas: 300000
                                    }
                                );
                        } 
                        // alternative method: try to use the updateListing method
                        else if (marketplaceContract.methods.updateListing) {
                                receipt = await window.SecureWalletManager.sendContractTransaction(
                                    marketplaceContract,
                                    'updateListing',
                                    [listing.tokenId, priceInWei],
                                    {
                                        gas: 300000
                                    }
                                );
                        }
                        // alternative method: try to use the updatePrice method
                        else if (marketplaceContract.methods.updatePrice) {
                                receipt = await window.SecureWalletManager.sendContractTransaction(
                                    marketplaceContract,
                                    'updatePrice',
                                    [listing.tokenId, priceInWei],
                                    {
                                        gas: 300000
                                    }
                                );
                        }
                        // if none of the above methods are available, throw an exception
                        else {
                            throw new Error('Contract does not support price update function');
                            }
                        } else {
                            // Use connected wallet
                            // first try to use the updateListingPrice method
                            if (marketplaceContract.methods.updateListingPrice) {
                                receipt = await marketplaceContract.methods.updateListingPrice(listing.tokenId, priceInWei).send({ 
                                    from: userAddress,
                                    gas: 300000
                                });
                            } 
                            // alternative method: try to use the updateListing method
                            else if (marketplaceContract.methods.updateListing) {
                                receipt = await marketplaceContract.methods.updateListing(listing.tokenId, priceInWei).send({ 
                                    from: userAddress,
                                    gas: 300000
                                });
                            }
                            // alternative method: try to use the updatePrice method
                            else if (marketplaceContract.methods.updatePrice) {
                                receipt = await marketplaceContract.methods.updatePrice(listing.tokenId, priceInWei).send({ 
                                    from: userAddress,
                                    gas: 300000
                                });
                            }
                            // if none of the above methods are available, throw an exception
                            else {
                                throw new Error('Contract does not support price update function');
                            }
                        }
                    } catch (contractError) {
                        console.error('failed to call the price update method:', contractError);
                        
                        // check if the error is caused by the cooldown
                        if (contractError.message.includes('cooldown') || 
                            contractError.message.includes('Cooldown') || 
                            contractError.message.includes('period not passed')) {
                            throw new Error('Price update operation is in cooldown, please try again later');
                        }
                        
                        throw contractError;
                    }
                    
                    console.log('NFT price updated successfully:', receipt);
                    
                    // show the success message
                    showStatus('NFT price has been updated!', 'success');
                    
                    // trigger the NFT price updated event
                    const priceUpdatedEvent = new CustomEvent('nft.priceUpdated', {
                        detail: {
                            tokenId: listing.tokenId,
                            newPrice: priceInWei,
                            paymentToken: listing.paymentToken
                        }
                    });
                    window.dispatchEvent(priceUpdatedEvent);
                    
                    // update the listing info
                    listing.price = priceInWei;
                    listing.lastPriceUpdateTime = Math.floor(Date.now() / 1000).toString();
                    listing.inPriceUpdateCooldown = true;
                    listing.priceUpdateCooldownTimeLeft = NFT_PRICE_UPDATE_COOLDOWN;
                    
                    // reload the listings list
                    await loadUserListings();
                } catch (error) {
                    console.error('failed to update the NFT price:', error);
                    showStatus('failed to update the NFT price: ' + error.message, 'error');
                }
            });
            
            // add the buttons to the buttons container
            buttonsContainer.appendChild(cancelButton);
            buttonsContainer.appendChild(confirmButton);
            
            // add the elements to the form
            form.appendChild(currentPrice);
            form.appendChild(priceInput);
            form.appendChild(buttonsContainer);
            
            // add the title and the form to the container
            updatePriceContainer.appendChild(title);
            updatePriceContainer.appendChild(form);
            
            // add the overlay and the container to the modal content
            modalContent.appendChild(overlay);
            modalContent.appendChild(updatePriceContainer);
            
            // set the focus to the price input
            setTimeout(() => {
                priceInput.focus();
                priceInput.select(); // select all the text for easy input
            }, 100);
        } catch (error) {
            console.error('failed to create the update price container:', error);
            showStatus('failed to create the update price container: ' + error.message, 'error');
        }
    }
    
    /**
     * show the status message
     * @param {string} message - the message content
     * @param {string} type - the message type (info, success, error)
     */
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
    }
    
    /**
     * check if the NFT is in the price update cooldown
     * @param {number} tokenId - the NFT token ID
     * @returns {Promise<{inCooldown: boolean, timeLeft: number}>} - the cooldown status and the remaining time (seconds)
     */
    async function checkPriceUpdateCooldown(tokenId) {
        try {
            // Ensure we have a valid marketplace contract
            if (!marketplaceContract || !marketplaceContract.methods) {
                debug.warn('Marketplace contract not available for cooldown check');
                return { inCooldown: false, timeLeft: 0 };
            }
            
            // Ensure we're using the correct Web3 instance for contract calls
            let contractToUse = marketplaceContract;
            
            // Check if we need to use private key wallet Web3
            if (shouldUsePrivateKeyWallet()) {
                const privateKeyWeb3 = window.SecureWalletManager.getWeb3();
                if (privateKeyWeb3 && privateKeyWeb3 !== web3) {
                    debug.log('Using private key wallet Web3 for contract calls in checkPriceUpdateCooldown');
                    // Recreate contract with private key Web3 if needed
                    try {
                        contractToUse = new privateKeyWeb3.eth.Contract(
                            marketplaceContract.options.jsonInterface,
                            marketplaceContract.options.address
                        );
                    } catch (error) {
                        debug.warn('Failed to recreate contract with private key Web3, using original:', error);
                    }
                }
            }
            
            // get the NFT listing info
            let listingInfo;
            try {
                listingInfo = await contractToUse.methods.listings(tokenId).call();
            } catch (error) {
                // Handle specific error types
                if (error.message && (
                    error.message.includes("Returned values aren't valid") ||
                    error.message.includes("execution reverted") ||
                    error.message.includes("invalid opcode") ||
                    error.message.includes("revert")
                )) {
                    // These errors usually mean the NFT has never been listed or price updated
                    debug.log(`NFT #${tokenId} has no listing history (contract error indicates no price update history)`);
                    return { inCooldown: false, timeLeft: 0 };
                } else {
                    throw error; // Re-throw other types of errors
                }
            }
            
            // if the NFT has never updated the price, then it is not in the cooldown
            if (!listingInfo || listingInfo.lastPriceUpdateTime === '0') {
                return { inCooldown: false, timeLeft: 0 };
            }
            
            // get the last price update time
            const lastPriceUpdateTime = parseInt(listingInfo.lastPriceUpdateTime);
            
            // get the current time (seconds)
            const currentTime = Math.floor(Date.now() / 1000);
            
            // calculate the cooldown end time
            const cooldownEndTime = lastPriceUpdateTime + NFT_PRICE_UPDATE_COOLDOWN;
            
            // if the current time is less than the cooldown end time, then the NFT is still in the cooldown
            if (currentTime < cooldownEndTime) {
                // calculate the remaining cooldown time (seconds)
                const timeLeft = cooldownEndTime - currentTime;
                debug.log(`NFT #${tokenId} is in price update cooldown, ${timeLeft} seconds remaining`);
                return { inCooldown: true, timeLeft: timeLeft };
            }
            
            // not in the cooldown
            debug.log(`NFT #${tokenId} is not in price update cooldown`);
            return { inCooldown: false, timeLeft: 0 };
        } catch (error) {
            console.error(`检查NFT #${tokenId}价格更新冷却期失败:`, error);
            // default not in the cooldown
            return { inCooldown: false, timeLeft: 0 };
        }
    }
    
    /**
     * format the remaining time to a friendly display
     * @param {number} seconds - the remaining seconds
     * @returns {string} - the formatted time string
     */
    function formatTimeLeft(seconds) {
        // if the remaining time is less than 1 minute, show the seconds
        if (seconds < 60) {
            return `${seconds} s`;
        }
        
        // if the remaining time is less than 1 hour, show the minutes
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes} m ${remainingSeconds > 0 ? remainingSeconds + ' s' : ''}`;
        }
        
        // if the remaining time is greater than or equal to 1 hour, show the hours
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} h ${minutes > 0 ? minutes + ' m' : ''}`;
    }
    
    // export the public methods
    window.manageListingsModal = {
        init,
        showModal,
        hideModal
    };
})(); 