/**
 * NFT Market Card Component
 * Provides creation, rendering, and interaction functionalities for NFT market cards
 */
(function() {
    // Quality constants
    const QUALITY_NAMES = {
        0: 'Common',
        1: 'Good',
        2: 'Excellent',
        3: 'Rare',
        4: 'Legendary'
    };
    
    const QUALITY_CLASSES = {
        0: 'common',
        1: 'good',
        2: 'excellent',
        3: 'purple-rare',  // Changed to be consistent with petCard.js, using purple-rare instead of rare
        4: 'legendary'
    };
    
    // Default placeholder image
    const PLACEHOLDER_IMAGE = '../../assets/images/pet-placeholder.png';
    
    /**
     * Format price based on token precision
     * @param {string} price - Original price (large integer string)
     * @param {string} tokenAddress - Token contract address
     * @param {string} tokenSymbol - Token symbol
     * @returns {string} Formatted price
     */
    function formatTokenPrice(price, tokenAddress, tokenSymbol) {
        // Default precision is 18 (ETH default)
        let decimals = 18;
        
        // If it's ETH (zero address) or unspecified address, use default precision
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
            // Use web3's fromWei to handle ETH
            if (window.web3 && typeof window.web3.utils !== 'undefined') {
                return window.web3.utils.fromWei(price, 'ether');
            }
        } 
        // Try to get precision from SupportedMarketTokens
        else if (window.SupportedMarketTokens) {
            const tokenInfo = window.SupportedMarketTokens.getMarketTokenByAddress(tokenAddress);
            if (tokenInfo && typeof tokenInfo.decimals !== 'undefined') {
                decimals = tokenInfo.decimals;
            } else if (tokenSymbol) {
                // If not found by address, try to find by symbol
                const tokenInfoBySymbol = window.SupportedMarketTokens.getMarketTokenBySymbol(tokenSymbol);
                if (tokenInfoBySymbol && typeof tokenInfoBySymbol.decimals !== 'undefined') {
                    decimals = tokenInfoBySymbol.decimals;
                }
            }
        }
        
        try {
            // Convert price string to BigInt for calculation
            const priceBigInt = BigInt(price);
            const divisor = BigInt(10) ** BigInt(decimals);
            
            // Calculate integer and fractional parts
            const integerPart = (priceBigInt / divisor).toString();
            const fractionalPart = (priceBigInt % divisor).toString().padStart(decimals, '0');
            
            // Remove trailing zeros from fractional part
            const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
            
            // Combine integer and fractional parts
            if (trimmedFractionalPart.length > 0) {
                return `${integerPart}.${trimmedFractionalPart}`;
            } else {
                return integerPart;
            }
        } catch (error) {
            console.error('Error formatting token price:', error);
            // Fallback to simple division or web3.fromWei on error
            if (window.web3 && typeof window.web3.utils !== 'undefined') {
                return window.web3.utils.fromWei(price, 'ether');
            }
            return price;
        }
    }
    
    /**
     * Create market item card
     * @param {Object} nft - NFT data
     * @returns {HTMLElement} - Card DOM element
     */
    function createMarketItemCard(nft) {
        if (!nft) return null;
        
        try {
            const card = document.createElement('div');
            card.className = `market-item ${getQualityClass(nft.quality)}`;
            card.setAttribute('data-token-id', nft.tokenId);
            
            // Create quality tag
            const qualityTag = document.createElement('div');
            qualityTag.className = `quality-tag quality-${getQualityClass(nft.quality)}`;
            qualityTag.textContent = getQualityName(nft.quality);
            card.appendChild(qualityTag);
            
            // Create image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'item-image';
            
            // Create image element
            const image = document.createElement('img');
            // Get image URL - try multiple sources
            let imageUrl = nft.image || nft.imageUrl || '';
            
            // If it's metadata format
            if (nft.metadata && nft.metadata.image) {
                imageUrl = nft.metadata.image;
            }
            
            // Use PetNFTService to get image URL (if available)
            if (window.PetNFTService && typeof window.PetNFTService.getPetImageUrl === 'function') {
                const serviceUrl = window.PetNFTService.getPetImageUrl(nft);
                if (serviceUrl) {
                    imageUrl = serviceUrl;
                }
            }
            
            // If no image, use placeholder
            if (!imageUrl) {
                imageUrl = PLACEHOLDER_IMAGE;
            }
            
            image.src = imageUrl;
            image.alt = nft.name || `NFT #${nft.tokenId}`;
            
            // Image load error handling
            image.onerror = function() {
                // Try using backup image
                if (image.src !== PLACEHOLDER_IMAGE) {
                    image.src = PLACEHOLDER_IMAGE;
                } else {
                    // Use emoji instead of image
                    this.outerHTML = '<div style="font-size: 4rem; margin: 20px auto;">🖼️</div>';
                }
            };
            
            // Add image to container
            imageContainer.appendChild(image);
            card.appendChild(imageContainer);
            
            // Create info container
            const infoContainer = document.createElement('div');
            infoContainer.className = 'item-info';
            
            // Create name
            const name = document.createElement('h4');
            name.textContent = nft.name || (nft.metadata && nft.metadata.name) || `NFT #${nft.tokenId}`;
            infoContainer.appendChild(name);
            
            // Create Token ID
            const tokenId = document.createElement('div');
            tokenId.className = 'item-token-id';
            tokenId.textContent = `ID: ${nft.tokenId}`;
            infoContainer.appendChild(tokenId);
            
            // Create NFT level display
            const levelElement = document.createElement('div');
            levelElement.className = 'item-pet-level';
            levelElement.textContent = `Level: ${nft.level || '1'}`;
            infoContainer.appendChild(levelElement);
            
            // Create quality
            const itemQuality = document.createElement('div');
            itemQuality.className = 'item-quality';
            itemQuality.textContent = getQualityName(nft.quality);
            infoContainer.appendChild(itemQuality);
            
            // Create price container
            const priceContainer = document.createElement('div');
            priceContainer.className = 'item-price';
            
            // Format price
            const formattedPrice = formatTokenPrice(nft.price, nft.paymentToken, nft.paymentTokenSymbol);
            
            // Create price value
            const priceValue = document.createElement('span');
            priceValue.className = 'price-value';
            priceValue.textContent = formattedPrice;
            priceContainer.appendChild(priceValue);
            
            // Create price currency
            const priceCurrency = document.createElement('span');
            priceCurrency.className = 'price-currency';
            priceCurrency.textContent = nft.paymentTokenSymbol || '';
            priceContainer.appendChild(document.createTextNode(' '));
            priceContainer.appendChild(priceCurrency);
            
            // Add price to info container
            infoContainer.appendChild(priceContainer);
            
            // Add info container to card
            card.appendChild(infoContainer);
            
            // Create button container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'item-buttons';
            
            // Create buy button
            const buyButton = document.createElement('button');
            buyButton.className = 'item-btn buy-btn';
            buyButton.textContent = 'Buy';
            buyButton.setAttribute('data-i18n', 'button.buy');
            buttonsContainer.appendChild(buyButton);
            
            // Create details button
            const detailsButton = document.createElement('button');
            detailsButton.className = 'item-btn details-btn';
            detailsButton.textContent = 'Details';
            detailsButton.setAttribute('data-i18n', 'button.details');
            buttonsContainer.appendChild(detailsButton);
            
            // Add button container to card
            card.appendChild(buttonsContainer);
            
            return card;
        } catch (error) {
            console.error('Error creating market item card:', error);
            return null;
        }
    }
    
    /**
     * Render market item list
     * @param {Array} items - NFT data array
     * @param {Element|string} container - Container element or CSS selector
     * @param {Object} callbacks - Callback function object {onBuyClick, onDetailsClick}
     */
    function renderMarketItems(items, container, callbacks = {}) {
        // Get container element
        const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        
        if (!containerEl) {
            console.error('Unable to find render container');
            return;
        }
        
        // Clear container
        containerEl.innerHTML = '';
        
        if (!items || items.length === 0) {
            containerEl.innerHTML = '<div class="no-items-message">No NFTs found matching the criteria</div>';
            return;
        }
        
        // Render each NFT card
        items.forEach(item => {
            const card = createMarketItemCard(item);
            
            // Bind buy button event
            const buyBtn = card.querySelector('.buy-btn');
            if (buyBtn && callbacks.onBuyClick) {
                buyBtn.addEventListener('click', () => {
                    console.log('Buy button clicked', item);
                    callbacks.onBuyClick(item);
                });
            }
            
            // Bind details button event
            const detailsBtn = card.querySelector('.details-btn');
            if (detailsBtn && callbacks.onDetailsClick) {
                detailsBtn.addEventListener('click', () => {
                    console.log('Details button clicked', item);
                    callbacks.onDetailsClick(item);
                });
            }
            
            containerEl.appendChild(card);
        });
    }
    
    /**
     * Get NFT quality name
     * @param {number} qualityId - Quality ID
     * @returns {string} Quality name
     */
    function getQualityName(qualityId) {
        // Ensure qualityId is a number
        const qualityNum = parseInt(qualityId);
        return QUALITY_NAMES[qualityNum] || 'Unknown';
    }
    
    /**
     * Get CSS class name for NFT quality
     * @param {number} qualityId - Quality ID
     * @returns {string} CSS class name
     */
    function getQualityClass(qualityId) {
        // Ensure qualityId is a number
        const qualityNum = parseInt(qualityId);
        return QUALITY_CLASSES[qualityNum] || 'unknown';
    }
    
    /**
     * Create NFT detail modal content
     * @param {Object} nft - NFT data object
     * @param {Function} onBuyCallback - Buy button callback function
     * @param {Function} onCancelCallback - Cancel button callback function
     */
    function populateNFTDetailModal(nft, onBuyCallback, onCancelCallback) {
        const modal = document.getElementById('nftDetailModal');
        if (!modal) return;
        
        console.log('Showing NFT details:', nft);
        console.log('Level:', nft.level);
        console.log('Accumulated Food:', nft.accumulatedFood);
        
        // Ensure NFT's quality property is a number type
        const quality = parseInt(nft.quality);
        
        const modalImage = document.getElementById('nftDetailImage');
        const tokenIdElem = document.getElementById('nftTokenId');
        const nameElem = document.getElementById('nftName');
        const qualityElem = document.getElementById('nftQuality');
        const sellerElem = document.getElementById('nftSeller');
        const priceElem = document.getElementById('nftPrice');
        const paymentTokenAddressElem = document.getElementById('nftPaymentTokenAddress');
        const listTimeElem = document.getElementById('nftListTime');
        const buyBtn = modal.querySelector('.buy-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        // Get pet level and accumulated food elements
        const levelElem = document.getElementById('nftLevel');
        const foodElem = document.getElementById('nftFood');
        
        // Use PetNFTService to get image
        modalImage.src = window.PetNFTService && typeof window.PetNFTService.getPetImageUrl === 'function' 
            ? window.PetNFTService.getPetImageUrl(nft) 
            : (nft.metadata && nft.metadata.image ? nft.metadata.image : PLACEHOLDER_IMAGE);
        
        modalImage.onerror = function() {
            this.onerror = null;
            // If local resource fails to load, try loading from metadata URL
            if (nft.metadata && nft.metadata.image && this.src !== nft.metadata.image) {
                this.src = nft.metadata.image;
            } else {
                // If metadata URL also fails, use placeholder image
                this.src = PLACEHOLDER_IMAGE;
            }
        };
        
        tokenIdElem.textContent = nft.tokenId;
        nameElem.textContent = nft.metadata && nft.metadata.name ? nft.metadata.name : `NFT #${nft.tokenId}`;
        qualityElem.textContent = getQualityName(quality);
        sellerElem.textContent = formatAddress(nft.seller);
        
        // Set level and accumulated food values
        if (levelElem) {
            levelElem.textContent = nft.level || '1';
        }
        
        if (foodElem) {
            foodElem.textContent = nft.accumulatedFood || '0';
        }
        
        // Show price and token information
        const tokenSymbol = nft.paymentTokenSymbol || 'USD';
        const formattedPrice = formatTokenPrice(nft.price, nft.paymentToken, tokenSymbol);
        priceElem.textContent = `${formattedPrice} ${tokenSymbol}`;
        
        // Format payment token address to show symbol and address
        if (paymentTokenAddressElem) {
            paymentTokenAddressElem.textContent = `${tokenSymbol} (${nft.paymentToken || '0x0000000000000000000000000000000000000000'})`;
        }
        
        // Show listing time (if available)
        if (listTimeElem) {
            if (nft.listTime) {
                const date = new Date(nft.listTime);
                listTimeElem.textContent = date.toLocaleString();
                listTimeElem.parentElement.style.display = '';
            } else {
                listTimeElem.parentElement.style.display = 'none';
            }
        }
        
        // Bind buy button event
        if (buyBtn) {
            buyBtn.onclick = () => {
                if (typeof onBuyCallback === 'function') {
                    onBuyCallback(nft);
                }
            };
        }
        
        // Bind cancel button event
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (typeof onCancelCallback === 'function') {
                    onCancelCallback();
                }
            };
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Bind close button event
        const closeBtn = modal.querySelector('.nft-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                if (typeof onCancelCallback === 'function') {
                    onCancelCallback();
                }
            };
        }
        
        // Click outside modal to close
        window.onclick = function(event) {
            if (event.target === modal && typeof onCancelCallback === 'function') {
                onCancelCallback();
            }
        };
    }
    
    /**
     * Format address display
     * @param {string} address - Ethereum address
     * @returns {string} Formatted address
     */
    function formatAddress(address) {
        if (!address) return '';
        if (address.length <= 10) return address;
        return address.slice(0, 6) + '...' + address.slice(-4);
    }
    
    /**
     * Filter NFT list
     * @param {Array} items - NFT data array
     * @param {Object} filters - Filter conditions
     * @returns {Array} Filtered NFT array
     */
    function filterMarketItems(items, filters = {}) {
        if (!items || !items.length) return [];
        
        let filtered = [...items];
        
        // If quality filter is specified and not "all", apply quality filter
        if (filters.quality && filters.quality !== 'all') {
            filtered = filtered.filter(item => item.quality == filters.quality);
        }
        
        // Filter by search text
        if (filters.searchText) {
            const search = filters.searchText.toLowerCase();
            filtered = filtered.filter(item => {
                const name = item.metadata && item.metadata.name ? item.metadata.name.toLowerCase() : '';
                const description = item.metadata && item.metadata.description ? item.metadata.description.toLowerCase() : '';
                const tokenId = item.tokenId.toString();
                
                return name.includes(search) || 
                       description.includes(search) || 
                       tokenId.includes(search);
            });
        }
        
        // Sort by price or ID
        if (filters.sort) {
            switch (filters.sort) {
                case 'price-asc':
                    filtered.sort((a, b) => {
                        // Convert BigInt to string then compare
                        return BigInt(a.price) > BigInt(b.price) ? 1 : -1;
                    });
                    break;
                case 'price-desc':
                    filtered.sort((a, b) => {
                        // Convert BigInt to string then compare
                        return BigInt(b.price) > BigInt(a.price) ? 1 : -1;
                    });
                    break;
                case 'id-desc':
                    filtered.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
                    break;
                case 'id-asc':
                    filtered.sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
                    break;
                default:
                    // Default to ID descending sort
                    filtered.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
            }
        }
        
        return filtered;
    }
    
    // Public API
    window.MarketItemCard = {
        createMarketItemCard,
        renderMarketItems,
        populateNFTDetailModal,
        getQualityName,
        getQualityClass,
        filterMarketItems,
        formatTokenPrice
    };
})(); 