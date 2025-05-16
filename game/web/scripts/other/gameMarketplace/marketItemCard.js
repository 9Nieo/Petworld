/**
 * NFT Market Card Component
 * Provides the creation, rendering, and interaction functionality of NFT market cards - Game mode version
 */
window.MarketItemCard = (function() {
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
        3: 'purple-rare',  // Use purple-rare instead of rare
        4: 'legendary'
    };
    
    // Default placeholder image
    const PLACEHOLDER_IMAGE = '../../resources/images/placeholder.png';
    
    /**
     * Format price based on token precision
     * @param {string} price - Original price (large integer string)
     * @param {string} tokenAddress - Token contract address
     * @param {string} tokenSymbol - Token symbol
     * @returns {string} Formatted price
     */
    function formatTokenPrice(price, tokenAddress, tokenSymbol) {
        try {
            // Default precision is 18
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
            return price;
        }
    }
    
    /**
     * Create NFT market card element
     * @param {Object} nft - NFT data object
     * @returns {HTMLElement} Card DOM element
     */
    function createMarketItemCard(nft) {
        // Create card container
        const card = document.createElement('div');
        card.className = `market-item ${getQualityClass(nft.quality)}`;
        card.setAttribute('data-token-id', nft.tokenId);
        card.setAttribute('data-quality', nft.quality);
        
        // Quality tag
        const qualityTag = document.createElement('div');
        qualityTag.className = `quality-tag quality-${getQualityClass(nft.quality)}`;
        qualityTag.textContent = getQualityName(nft.quality);
        
        // Item image
        const itemImage = document.createElement('div');
        itemImage.className = 'item-image';
        
        const img = document.createElement('img');
        
        // Get image URL - try multiple sources
        let imageUrl = nft.imageUrl || '';
        
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
        
        img.src = imageUrl;
        img.alt = nft.name || (nft.metadata && nft.metadata.name ? nft.metadata.name : `NFT #${nft.tokenId}`);
        
        // Handle image load failure
        img.onerror = function() {
            // If available, try to get image from metadata
            if (nft.metadata && nft.metadata.image && this.src !== nft.metadata.image) {
                this.src = nft.metadata.image;
            } else if (nft.imageUrl && this.src !== nft.imageUrl) {
                // Try to load directly from imageUrl
                this.src = nft.imageUrl;
            } else {
                // All attempts failed, use placeholder
                this.src = PLACEHOLDER_IMAGE;
            }
            
            // If it fails again, show an emoji
            this.onerror = function() {
                this.outerHTML = `<div style="font-size:4rem;">🖼️</div>`;
            };
        };
        
        itemImage.appendChild(img);
        
        // Item information
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        
        // Name - try to get name from metadata
        const itemName = document.createElement('h4');
        let displayName = nft.name || `NFT #${nft.tokenId}`;
        if (nft.metadata && nft.metadata.name) {
            displayName = nft.metadata.name;
        }
        itemName.textContent = displayName;
        itemName.style.color = '#333'; // Ensure title color visibility
        
        // NFT ID
        const itemTokenId = document.createElement('div');
        itemTokenId.className = 'item-token-id';
        itemTokenId.textContent = `ID: ${nft.tokenId}`;
        
        // Add pet level display
        const itemLevel = document.createElement('div');
        itemLevel.className = 'item-pet-level';
        itemLevel.textContent = `Level: ${nft.level || '1'}`;
        
        // Price area
        const itemPrice = document.createElement('div');
        itemPrice.className = 'item-price';
        
        // Format price and display token symbol
        const tokenSymbol = getTokenSymbol(nft.paymentToken);
        const formattedPrice = formatTokenPrice(nft.price, nft.paymentToken, tokenSymbol);
        
        // Price includes value and currency display
        const priceValue = document.createElement('span');
        priceValue.className = 'price-value';
        priceValue.textContent = formattedPrice;
        
        const priceCurrency = document.createElement('span');
        priceCurrency.className = 'price-currency';
        priceCurrency.textContent = tokenSymbol;
        
        itemPrice.appendChild(priceValue);
        itemPrice.appendChild(document.createTextNode(' '));
        itemPrice.appendChild(priceCurrency);
        
        // Action buttons
        const buyBtn = document.createElement('button');
        buyBtn.className = 'item-btn buy-btn';
        buyBtn.textContent = 'Buy';
        buyBtn.setAttribute('data-i18n', 'button.buy');
        buyBtn.style.color = 'white'; // Force to white
        buyBtn.style.borderRadius = '0'; // Ensure button is rectangular
        
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'item-btn details-btn';
        detailsBtn.textContent = 'Details';
        detailsBtn.setAttribute('data-i18n', 'button.details');
        detailsBtn.style.color = '#333'; // Ensure details button text is dark
        detailsBtn.style.borderRadius = '0'; // Ensure button is rectangular
        
        // Assemble card
        card.appendChild(qualityTag);
        card.appendChild(itemImage);
        
        itemInfo.appendChild(itemName);
        itemInfo.appendChild(itemTokenId);
        itemInfo.appendChild(itemLevel);
        itemInfo.appendChild(itemPrice);
        
        card.appendChild(itemInfo);
        card.appendChild(buyBtn);
        card.appendChild(detailsBtn);
        
        return card;
    }
    
    /**
     * Render NFT cards to specified container
     * @param {Array} items - NFT data array
     * @param {HTMLElement|string} container - Container element or container selector
     * @param {Object} options - Additional options (callback functions, etc.)
     */
    function renderMarketItems(items, container, options = {}) {
        // Get container element
        const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        
        if (!containerEl) {
            console.error('Unable to find render container');
            return;
        }
        
        // Clear container
        containerEl.innerHTML = '';
        
        if (!items || items.length === 0) {
            containerEl.innerHTML = '<div class="no-items-message" data-i18n="market.noItems">No items found matching the criteria</div>';
            return;
        }
        
        // Render each NFT card
        items.forEach(item => {
            const card = createMarketItemCard(item);
            
            // If a callback function is provided, bind events
            if (options.onBuyClick && typeof options.onBuyClick === 'function') {
                const buyBtn = card.querySelector('.buy-btn');
                if (buyBtn) {
                    buyBtn.addEventListener('click', () => options.onBuyClick(item));
                }
            }
            
            if (options.onDetailsClick && typeof options.onDetailsClick === 'function') {
                const detailsBtn = card.querySelector('.details-btn');
                if (detailsBtn) {
                    detailsBtn.addEventListener('click', () => options.onDetailsClick(item));
                }
            }
            
            containerEl.appendChild(card);
        });
    }
    
    /**
     * Get quality name
     * @param {number} qualityId - Quality ID
     * @returns {string} Quality name
     */
    function getQualityName(qualityId) {
        return QUALITY_NAMES[qualityId] || 'Unknown';
    }
    
    /**
     * Get quality CSS class name
     * @param {number} qualityId - Quality ID
     * @returns {string} CSS class name
     */
    function getQualityClass(qualityId) {
        return QUALITY_CLASSES[qualityId] || 'common';
    }
    
    /**
     * Get token symbol
     * @param {string} tokenAddress - Token contract address
     * @returns {string} Token symbol
     */
    function getTokenSymbol(tokenAddress) {
        if (!tokenAddress) return 'ETH';
        
        if (window.SupportedMarketTokens) {
            const token = window.SupportedMarketTokens.getMarketTokenByAddress(tokenAddress);
            if (token) {
                return token.symbol;
            }
        }
        
        return 'TOKEN';
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
        
        // If quality filter is specified and not "all", perform quality filtering
        if (filters.quality && filters.quality !== 'all') {
            filtered = filtered.filter(item => item.quality == filters.quality);
        }
        
        // Filter by search text
        if (filters.searchText) {
            const search = filters.searchText.toLowerCase();
            filtered = filtered.filter(item => {
                const name = item.name ? item.name.toLowerCase() : '';
                const metadata = item.metadata || {};
                const metadataName = metadata.name ? metadata.name.toLowerCase() : '';
                const description = metadata.description ? metadata.description.toLowerCase() : '';
                const tokenId = item.tokenId.toString();
                
                return name.includes(search) || 
                       metadataName.includes(search) ||
                       description.includes(search) || 
                       tokenId.includes(search);
            });
        }
        
        // Sort by price or ID
        if (filters.sort) {
            switch (filters.sort) {
                case 'price-asc':
                    filtered.sort((a, b) => BigInt(a.price) - BigInt(b.price));
                    break;
                case 'price-desc':
                    filtered.sort((a, b) => BigInt(b.price) - BigInt(a.price));
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
    
    // Return public API
    return {
        createCard: createMarketItemCard,
        getQualityName: getQualityName,
        getQualityClass: getQualityClass,
        formatTokenPrice: formatTokenPrice,
        renderMarketItems: renderMarketItems,
        filterMarketItems: filterMarketItems,
        getTokenSymbol: getTokenSymbol
    };
})(); 