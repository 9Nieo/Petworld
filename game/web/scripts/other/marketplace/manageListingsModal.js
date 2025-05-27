/**
 * NFT listing management modal functionality
 * Allows users to view and manage their listed NFTs
 */

(function() {
    // define the DOM element variables
    let modal;
    let modalContent;
    let closeBtn;
    let listingsList;
    let loadingIndicator;
    let statusMessage;
    let emptyMessage;
    
    // store the web3 instance and contract instances
    let web3;
    let marketplaceContract;
    let pwNFTContract;
    
    // store the user's listed NFTs
    let userListings = [];
    
    // flag to indicate if the modal window has been initialized
    let isInitialized = false;
    
    // NFT price update cooldown time (1 hour, in seconds)
    const NFT_PRICE_UPDATE_COOLDOWN = 60 * 60; // 1小时 = 60分钟 * 60秒
    
    /**
     * initialize the NFT listing management modal
     * @param {Object} web3Instance - Web3 instance
     * @param {Object} marketplaceContractInstance - Marketplace contract instance
     * @param {Object} nftContractInstance - NFT contract instance
     */
    function init(web3Instance, marketplaceContractInstance, nftContractInstance) {
        try {
            // store the web3 instance and contract instances
            web3 = web3Instance;
            marketplaceContract = marketplaceContractInstance;
            pwNFTContract = nftContractInstance;
            
            // if the modal already exists, return directly
            if (document.getElementById('manage-listings-modal')) {
                modal = document.getElementById('manage-listings-modal');
                listingsList = modal.querySelector('.listings-list');
                loadingIndicator = modal.querySelector('.loading-spinner');
                statusMessage = modal.querySelector('.status-message');
                emptyMessage = modal.querySelector('.empty-listings-message');
                closeBtn = modal.querySelector('.nft-modal-close');
                
                // rebind the events
                bindEvents();
                
                isInitialized = true;
                return;
            }
            
            // create the modal DOM structure
            createModalDOM();
            
            // bind the events
            bindEvents();
            
            isInitialized = true;
            console.log('NFT management modal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize NFT management modal:', error);
            isInitialized = false;
        }
    }
    
    /**
     * create the modal DOM structure
     */
    function createModalDOM() {
        // create the modal container
        modal = document.createElement('div');
        modal.id = 'manage-listings-modal';
        modal.className = 'nft-modal';
        modal.style.display = 'none';
        
        // create the modal content
        modalContent = document.createElement('div');
        modalContent.className = 'nft-modal-content manage-listings-content';
        
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
     * bind the events
     */
    function bindEvents() {
        if (!closeBtn || !modal) {
            console.error('Failed to bind events: DOM elements not defined');
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
        // if the modal is not initialized, try to initialize it first
        if (!isInitialized || !modal) {
            // if the web3 and contract instances exist, try to reinitialize it
            if (web3 && marketplaceContract && pwNFTContract) {
                init(web3, marketplaceContract, pwNFTContract);
            } else {
                console.error('Failed to show NFT management modal: the modal is not initialized or the required contract instances are not set');
                alert('System error: Failed to show NFT management modal, please refresh the page and try again');
                return;
            }
        }
        
        // ensure the modal window elements exist
        if (!modal) {
            console.error('Failed to show NFT management modal: the modal elements do not exist');
            alert('System error: Failed to show NFT management modal, please refresh the page and try again');
            return;
        }
        
        // show the modal
        modal.style.display = 'block';
        
        // reset the modal status
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
     * reset the modal status
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
            const usingPrivateKey = window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet();
            console.log('Using private key wallet for loading user listings:', usingPrivateKey);
            
            // get the current user address
            let userAddress;
            if (usingPrivateKey) {
                userAddress = window.SecureWalletManager.getAddress();
            } else {
                const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
            }
            
            if (!userAddress) {
                throw new Error('Wallet not connected');
            }
            
            console.log('Loading listings for user address:', userAddress);
            
            // load the user's all listed NFTs
            userListings = await loadUserListedNFTs(userAddress);
            
            // render the listed NFTs list
            renderListingsList();
        } catch (error) {
            console.error('Failed to load the user\'s listed NFTs:', error);
            showStatus('Failed to load the listed NFTs: ' + error.message, 'error');
        } finally {
            // hide the loading indicator
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * load the user's all listed NFTs
     * @param {string} userAddress - the user address
     * @returns {Array} the listed NFTs array
     */
    async function loadUserListedNFTs(userAddress) {
        try {
            const listings = [];
            
            // check if there is a NFTMarketplaceContract class
            if (window.NFTMarketplaceContract) {
                // use the NFTMarketplaceContract class
                const marketplaceInstance = new window.NFTMarketplaceContract(web3);
                
                // check if there is a getUserMarketItems method
                if (window.getUserMarketItems) {
                    const userItems = await window.getUserMarketItems(marketplaceContract, userAddress);
                    if (userItems && userItems.created && userItems.created.length > 0) {
                        // handle the created items
                        for (const item of userItems.created) {
                            if (item.sold) continue; // skip the sold items
                            
                            // get the NFT's metadata
                            const nftData = await fetchNFTData(item.tokenId);
                            
                            // check the price update cooldown
                            const cooldownInfo = await checkPriceUpdateCooldown(item.tokenId);
                            
                            listings.push({
                                tokenId: item.tokenId,
                                price: item.price,
                                seller: item.seller,
                                nftContract: item.nftContract,
                                metadata: nftData.metadata,
                                level: item.level || 1,
                                accumulatedFood: item.accumulatedFood || 0,
                                inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft,
                                lastPriceUpdateTime: item.lastPriceUpdateTime || '0'
                            });
                        }
                    }
                } else {
                    // use the alternative method to get
                    // here we need to get the user's all listed NFTs
                    let index = 0;
                    let hasMore = true;
                    
                    while (hasMore) {
                        try {
                            // get the user's listed NFT tokenId
                            const tokenId = await marketplaceContract.methods.userListings(userAddress, index).call();
                            
                            // check if the tokenId is valid (if it is 0, it may represent that there are no more listed items)
                            if (tokenId == 0 && index > 0) {
                                hasMore = false;
                                break;
                            }
                            
                            // get the listing details of the tokenId
                            const listing = await marketplaceContract.methods.listings(tokenId).call();
                            
                            // check if the listing is still valid
                            if (listing.active && listing.seller.toLowerCase() === userAddress.toLowerCase()) {
                                // get the NFT's metadata
                                const nftData = await fetchNFTData(tokenId);
                                
                                // check the price update cooldown
                                const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                                
                                listings.push({
                                    tokenId: tokenId,
                                    price: listing.price,
                                    seller: listing.seller,
                                    paymentToken: listing.paymentToken,
                                    active: listing.active,
                                    lastListTime: listing.lastListTime,
                                    lastPriceUpdateTime: listing.lastPriceUpdateTime,
                                    quality: listing.quality,
                                    level: listing.level || 1,
                                    accumulatedFood: listing.accumulatedFood || 0,
                                    metadata: nftData.metadata,
                                    inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                    priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft
                                });
                            }
                            
                            index++;
                        } catch (error) {
                            console.log('Failed to get the user\'s listed NFT index, possibly reached the end of the list:', error.message);
                            // when there are no more NFTs, an error will be thrown
                            hasMore = false;
                        }
                    }
                }
            } else {
                // do not use the tokenOfOwnerByIndex method, use the marketplace contract directly to get the user's listed NFTs
                try {
                    // use the marketplace contract method directly to get the user's listed NFTs list
                    let index = 0;
                    let hasMore = true;
                    
                    // loop to get all the listed NFTs
                    while (hasMore) {
                        try {
                            // get the user's listed NFT tokenId from the marketplace contract
                            const tokenId = await marketplaceContract.methods.userListings(userAddress, index).call();
                            
                            // check if the tokenId is valid (if it is 0, it may represent that there are no more listed items)
                            if (tokenId == 0 && index > 0) {
                                hasMore = false;
                                break;
                            }
                            
                            // get the listing details of the tokenId
                            const listing = await marketplaceContract.methods.listings(tokenId).call();
                            
                            // check if the listing is still valid
                            if (listing.active && listing.seller.toLowerCase() === userAddress.toLowerCase()) {
                                // get the NFT's metadata
                                const nftData = await fetchNFTData(tokenId);
                                
                                // check the price update cooldown
                                const cooldownInfo = await checkPriceUpdateCooldown(tokenId);
                                
                                listings.push({
                                    tokenId: tokenId,
                                    price: listing.price,
                                    seller: listing.seller,
                                    paymentToken: listing.paymentToken,
                                    active: listing.active,
                                    lastListTime: listing.lastListTime,
                                    lastPriceUpdateTime: listing.lastPriceUpdateTime,
                                    quality: listing.quality,
                                    level: listing.level || 1,
                                    accumulatedFood: listing.accumulatedFood || 0,
                                    metadata: nftData.metadata,
                                    inPriceUpdateCooldown: cooldownInfo.inCooldown,
                                    priceUpdateCooldownTimeLeft: cooldownInfo.timeLeft
                                });
                            }
                            
                            index++;
                        } catch (error) {
                            console.log('Failed to get the user\'s listed NFT index, possibly reached the end of the list:', error.message);
                            // when there are no more NFTs, an error will be thrown
                            hasMore = false;
                        }
                    }
                } catch (error) {
                    console.error('Failed to get the user\'s listed NFTs list:', error);
                }
            }
            
            return listings;
        } catch (error) {
            console.error('Failed to load the user\'s listed NFTs:', error);
            return [];
        }
    }
    
    /**
     * get the NFT's data (including the metadata)
     * @param {string} tokenId - the NFT's tokenId
     * @returns {Object} the NFT data
     */
    async function fetchNFTData(tokenId) {
        try {
            // first try to use the PetNFTService
            if (window.PetNFTService && window.PetNFTService.loadUserNFTs) {
                const nfts = await window.PetNFTService.loadUserNFTs(null, false, 100, true);
                const foundNFT = nfts.find(nft => nft.tokenId === tokenId);
                if (foundNFT) {
                    return foundNFT;
                }
            }
            
            // if the PetNFTService is not available or the NFT is not found, get the NFT data from the contract directly
            const tokenURI = await pwNFTContract.methods.tokenURI(tokenId).call();
            
            // get the metadata
            let metadata = { name: `NFT #${tokenId}`, image: null };
            try {
                // try to get the metadata
                const response = await fetch(tokenURI);
                if (response.ok) {
                    metadata = await response.json();
                }
            } catch (error) {
                console.warn('Failed to get the NFT\'s metadata:', error);
            }
            
            return {
                tokenId: tokenId,
                contractAddress: pwNFTContract.options.address,
                metadata: metadata
            };
        } catch (error) {
            console.error('Failed to get the NFT data:', error);
            return {
                tokenId: tokenId,
                contractAddress: pwNFTContract.options.address,
                metadata: { name: `NFT #${tokenId}`, image: null }
            };
        }
    }
    
    /**
     * render the listed NFTs list
     */
    function renderListingsList() {
        // clear the listed NFTs list
        listingsList.innerHTML = '';
        
        // if there are no listed NFTs, show the empty message
        if (userListings.length === 0) {
            emptyMessage.style.display = 'block';
            return;
        }
        
        // hide the empty message
        emptyMessage.style.display = 'none';
        
        // render each listed NFT
        userListings.forEach(listing => {
            const listingItem = document.createElement('div');
            listingItem.className = 'listing-item';
            listingItem.setAttribute('data-token-id', listing.tokenId);
            
            // NFT image
            const listingImage = document.createElement('div');
            listingImage.className = 'listing-image';
            if (listing.metadata && listing.metadata.image) {
                const img = document.createElement('img');
                img.src = listing.metadata.image;
                img.alt = listing.metadata.name || `NFT #${listing.tokenId}`;
                img.onerror = function() {
                    this.onerror = null;
                    this.src = '../../assets/images/pet-placeholder.png';
                };
                listingImage.appendChild(img);
            } else {
                // if there is no image, show the placeholder
                listingImage.textContent = '🐾';
            }
            
            // NFT information
            const listingInfo = document.createElement('div');
            listingInfo.className = 'listing-info';
            
            const listingName = document.createElement('div');
            listingName.className = 'listing-name';
            listingName.textContent = listing.metadata && listing.metadata.name ? listing.metadata.name : `NFT #${listing.tokenId}`;
            
            const listingTokenId = document.createElement('div');
            listingTokenId.className = 'listing-token-id';
            listingTokenId.textContent = `Token ID: ${listing.tokenId}`;
            
            // add the NFT level display
            const listingLevel = document.createElement('div');
            listingLevel.className = 'listing-level';
            listingLevel.textContent = `Level: ${listing.level || 1}`;
            listingLevel.style.color = '#0070f3';
            listingLevel.style.fontWeight = 'bold';
            listingLevel.style.fontSize = '14px';
            
            // get the token symbol
            let tokenSymbol = 'ETH';
            if (listing.paymentToken && listing.paymentToken !== '0x0000000000000000000000000000000000000000') {
                // try to get the token information from the SupportedMarketTokens
                if (window.SupportedMarketTokens) {
                    const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(listing.paymentToken);
                    if (tokenInfo) {
                        tokenSymbol = tokenInfo.symbol;
                    }
                }
            }
            
            const listingPrice = document.createElement('div');
            listingPrice.className = 'listing-price';
            const formattedPrice = web3.utils.fromWei(listing.price, 'ether');
            listingPrice.textContent = `Price: ${formattedPrice} ${tokenSymbol}`;
            
            // if the NFT is in the price update cooldown, add the cooldown information
            if (listing.inPriceUpdateCooldown) {
                const cooldownInfo = document.createElement('div');
                cooldownInfo.className = 'price-cooldown-info';
                cooldownInfo.textContent = `Price update cooldown: ${formatTimeLeft(listing.priceUpdateCooldownTimeLeft)}`;
                cooldownInfo.style.color = '#e74c3c';
                cooldownInfo.style.fontSize = '12px';
                cooldownInfo.style.marginTop = '5px';
                
                listingInfo.appendChild(listingName);
                listingInfo.appendChild(listingTokenId);
                listingInfo.appendChild(listingLevel);
                listingInfo.appendChild(listingPrice);
                listingInfo.appendChild(cooldownInfo);
            } else {
                listingInfo.appendChild(listingName);
                listingInfo.appendChild(listingTokenId);
                listingInfo.appendChild(listingLevel);
                listingInfo.appendChild(listingPrice);
            }
            
            // the operation buttons
            const listingActions = document.createElement('div');
            listingActions.className = 'listing-actions';
            
            const updateButton = document.createElement('button');
            updateButton.className = 'update-btn';
            updateButton.textContent = 'Update price';
            updateButton.setAttribute('data-i18n', 'market.updatePrice');
            
            // if the NFT is in the price update cooldown, disable the update price button
            if (listing.inPriceUpdateCooldown) {
                updateButton.disabled = true;
                updateButton.style.opacity = '0.5';
                updateButton.style.cursor = 'not-allowed';
                updateButton.title = `Need to wait ${formatTimeLeft(listing.priceUpdateCooldownTimeLeft)} to update the price`;
            } else {
                updateButton.onclick = function(event) {
                    event.stopPropagation();
                    handleUpdatePrice(listing);
                };
            }
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'cancel-btn';
            cancelButton.textContent = 'Cancel listing';
            cancelButton.setAttribute('data-i18n', 'market.cancelListing');
            cancelButton.onclick = function(event) {
                event.stopPropagation();
                handleCancelListing(listing);
            };
            
            listingActions.appendChild(updateButton);
            listingActions.appendChild(cancelButton);
            
            // assemble the complete listed NFT item
            listingItem.appendChild(listingImage);
            listingItem.appendChild(listingInfo);
            listingItem.appendChild(listingActions);
            
            // add to the listed NFTs list
            listingsList.appendChild(listingItem);
        });
        
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
            .price-cooldown-info {
                color: #e74c3c;
                font-size: 12px;
                margin-top: 5px;
            }
        `;
        
        // add to the document head
        document.head.appendChild(style);
    }
    
    /**
     * handle the cancel listing
     * @param {Object} listing - the listed NFT information
     */
    async function handleCancelListing(listing) {
        try {
            // Check if using private key wallet
            const usingPrivateKey = window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet();
            console.log('Using private key wallet for cancel listing:', usingPrivateKey);
            
            // get the current user address
            let userAddress;
            if (usingPrivateKey) {
                userAddress = window.SecureWalletManager.getAddress();
            } else {
                const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
            }
            
            if (!userAddress) {
                throw new Error('Wallet not connected');
            }
            
            // show the status information
            showStatus('Preparing to delist the NFT...', 'info');
            
            // send the delist transaction
            let transaction;
            if (usingPrivateKey) {
                // Use private key wallet for cancel listing transaction
                transaction = await window.SecureWalletManager.sendContractTransaction(
                    marketplaceContract,
                    'cancelListing',
                    [listing.tokenId],
                    {
                        gas: 200000
                    }
                );
            } else {
                // Use connected wallet
                transaction = await marketplaceContract.methods.cancelListing(listing.tokenId).send({
                    from: userAddress,
                    gas: 200000
                });
            }
            
            // show the success information
            showStatus('NFT delisted successfully!', 'success');
            
            // remove the NFT from the list
            userListings = userListings.filter(item => item.tokenId !== listing.tokenId);
            
            // render the listed NFTs list
            renderListingsList();
            
            // trigger the event to notify the delisting success
            const event = new CustomEvent('nft.delisted', { 
                detail: { 
                    tokenId: listing.tokenId,
                    transaction: transaction
                } 
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to delist the NFT:', error);
            showStatus('Failed to delist the NFT: ' + error.message, 'error');
        }
    }
    
    /**
     * check if the NFT is in the price update cooldown
     * @param {number} tokenId - the NFT tokenId
     * @returns {Promise<{inCooldown: boolean, timeLeft: number}>} - the cooldown status and the remaining time (seconds)
     */
    async function checkPriceUpdateCooldown(tokenId) {
        try {
            // get the NFT listing information
            const listingInfo = await marketplaceContract.methods.listings(tokenId).call();
            
            // if the NFT has never updated the price, it is not in the cooldown
            if (listingInfo.lastPriceUpdateTime === '0') {
                return { inCooldown: false, timeLeft: 0 };
            }
            
            // get the last price update time
            const lastPriceUpdateTime = parseInt(listingInfo.lastPriceUpdateTime);
            
            // get the current time (seconds)
            const currentTime = Math.floor(Date.now() / 1000);
            
            // calculate the cooldown end time
            const cooldownEndTime = lastPriceUpdateTime + NFT_PRICE_UPDATE_COOLDOWN;
            
            // if the current time is less than the cooldown end time, the NFT is still in the cooldown
            if (currentTime < cooldownEndTime) {
                // calculate the remaining cooldown time (seconds)
                const timeLeft = cooldownEndTime - currentTime;
                return { inCooldown: true, timeLeft: timeLeft };
            }
            
            // not in the cooldown
            return { inCooldown: false, timeLeft: 0 };
        } catch (error) {
            console.error(`Failed to check the NFT #${tokenId} price update cooldown:`, error);
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
            return `${seconds} seconds`;
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
     * handle the update price
     * @param {Object} listing - the listed NFT information
     */
    async function handleUpdatePrice(listing) {
        try {
            // check the price update cooldown again
            const cooldownInfo = await checkPriceUpdateCooldown(listing.tokenId);
            if (cooldownInfo.inCooldown) {
                // if still in the cooldown, show the error message and prevent the update
                showStatus(`NFT is still in the price update cooldown, please wait for ${formatTimeLeft(cooldownInfo.timeLeft)} to update the price`, 'error');
                return;
            }
            
            // create the price input dialog
            const newPriceStr = prompt(`Update the price of NFT #${listing.tokenId}\n\nNote: After updating the price, there will be a 1 hour cooldown\n\nNew price (${getTokenSymbol(listing.paymentToken)}):`, web3.utils.fromWei(listing.price, 'ether'));
            
            // if the user cancels, return directly
            if (newPriceStr === null) {
                return;
            }
            
            // validate the new price
            const newPrice = parseFloat(newPriceStr);
            if (isNaN(newPrice) || newPrice <= 0) {
                throw new Error('Please enter a valid price');
            }
            
            // Check if using private key wallet
            const usingPrivateKey = window.SecureWalletManager && window.SecureWalletManager.shouldUsePrivateKeyWallet();
            console.log('Using private key wallet for price update:', usingPrivateKey);
            
            // get the current user address
            let userAddress;
            if (usingPrivateKey) {
                userAddress = window.SecureWalletManager.getAddress();
            } else {
                const accounts = await web3.eth.getAccounts();
                userAddress = accounts[0];
            }
            
            if (!userAddress) {
                throw new Error('Wallet not connected');
            }
            
            // show the status information
            showStatus('Preparing to update the price...', 'info');
            
            // convert the price to Wei
            const priceInWei = web3.utils.toWei(newPriceStr, 'ether');
            
            // send the update price transaction
            let transaction;
            if (usingPrivateKey) {
                // Use private key wallet for price update transaction
                transaction = await window.SecureWalletManager.sendContractTransaction(
                    marketplaceContract,
                    'updateListingPrice',
                    [listing.tokenId, priceInWei],
                    {
                        gas: 200000
                    }
                );
            } else {
                // Use connected wallet
                transaction = await marketplaceContract.methods.updateListingPrice(
                    listing.tokenId,
                    priceInWei
                ).send({
                    from: userAddress,
                    gas: 200000
                });
            }
            
            // show the success information
            showStatus('Price updated successfully!', 'success');
            
            // update the price in the listing
            listing.price = priceInWei;
            listing.lastPriceUpdateTime = Math.floor(Date.now() / 1000).toString();
            listing.inPriceUpdateCooldown = true;
            listing.priceUpdateCooldownTimeLeft = NFT_PRICE_UPDATE_COOLDOWN;
            
            // re-render the listings list
            renderListingsList();
            
            // trigger the event to notify the price update success
            const event = new CustomEvent('nft.priceUpdated', { 
                detail: { 
                    tokenId: listing.tokenId,
                    newPrice: priceInWei,
                    transaction: transaction
                } 
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to update the price:', error);
            showStatus('Failed to update the price: ' + error.message, 'error');
        }
    }
    
    /**
     * show the status information
     * @param {string} message - the message content
     * @param {string} type - the message type (info, success, error, warning)
     */
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
        statusMessage.style.display = 'block';
        
        // if the status is success, set the timer to hide it automatically
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
    }
    
    // expose the interface to the global
    window.ManageListingsModal = {
        init,
        showModal,
        hideModal
    };
})(); 