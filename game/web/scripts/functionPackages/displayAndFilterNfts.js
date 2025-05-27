    // Debug utility
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[Display NFTs Debug]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[Display NFTs Error]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[Display NFTs Warning]', ...args);
        }
    };

    // Local state variables
    let isLoadingInBackground = false;

    /**
     * Load specific NFT
     * @param {string} address - Address
     * @param {boolean} forceUpdate - Whether to force update
     */
    async function loadSpecificNFT(address, forceUpdate = false) {
        debug.log('Load specific NFT, address:', address, 'force update:', forceUpdate);
        
        if (!window.PetNFTService) {
            debug.error('PetNFTService is undefined, cannot load specific NFT');
            if (typeof showNoNFTsMessage === 'function') {
                showNoNFTsMessage();
            } else {
                debug.error('showNoNFTsMessage function not available');
            }
            return;
        }
        
        // Get petGrid element - try both .pet-grid and .pets-grid
        let petGrid = document.querySelector('.pet-grid');
        if (!petGrid) {
            petGrid = document.querySelector('.pets-grid');
        }
        if (!petGrid) {
            debug.error('Pet grid element not found (tried both .pet-grid and .pets-grid)');
            return;
        }
        
        // Clear existing pet cards
        petGrid.innerHTML = '';
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = window.i18n ? window.i18n.t('pets.loadingPets') : 'Loading specific NFT...';
        petGrid.appendChild(loadingIndicator);
        
        try {
            // Set a flag to prevent duplicate loading
            if (isLoadingInBackground) {
                debug.log('Duplicate loading operation in progress, skipping');
                return;
            }
            
            isLoadingInBackground = true;
            
            // Use PetNFTService's refreshNFTs function
            const result = await window.PetNFTService.refreshNFTs(address, {
                forceUpdate: forceUpdate,
                refreshInterval: 3600000, // 1 hour
                skipIntervalCheck: forceUpdate, // Skip interval check when force updating
                removeDuplicates: true // Add duplicate removal flag
            });
            
            // Mark loading completed
            isLoadingInBackground = false;
            
            // Clear loading indicator
            petGrid.innerHTML = '';
            
            if (!result.success) {
                debug.error('Failed to refresh NFT data:', result.error);
                petGrid.innerHTML = `<div class="error-message">${window.i18n ? window.i18n.t('pets.refreshFailed') : 'Failed to load specific NFT data'}</div>`;
                
                // Add retry button
                const retryButton = document.createElement('button');
                retryButton.textContent = window.i18n ? window.i18n.t('button.refresh') : 'Retry';
                retryButton.className = 'retry-btn';
                retryButton.addEventListener('click', () => loadSpecificNFT(address, true)); // Retry with force update
                petGrid.appendChild(retryButton);
                return;
            }
            
            let nfts = result.nfts || [];
            
            // Process NFT data deduplication - use a more reliable method
            const tokenIdSet = new Set(); // Used to check uniqueness
            const uniqueNfts = [];
            
            for (const nft of nfts) {
                const tokenId = nft.tokenId || nft.token_id;
                if (!tokenId) {
                    debug.warn(`NFT missing tokenId, skipping:`, nft);
                    continue;
                }
                
                // If tokenId is not in the set, add to the result array
                if (!tokenIdSet.has(tokenId)) {
                    tokenIdSet.add(tokenId);
                    uniqueNfts.push(nft);
                } else {
                    debug.warn(`Filtering out duplicate NFT: TokenID ${tokenId}`);
                }
            }
            
            nfts = uniqueNfts;
            
            if (nfts.length === 0) {
                debug.log('No specific NFT found');
                if (typeof showNoNFTsMessage === 'function') {
                    showNoNFTsMessage();
                } else {
                    petGrid.innerHTML = `<div class="no-pets-message">No pets found</div>`;
                }
                return;
            }
            
            // Log deduplication results
            debug.log(`Original NFT count: ${result.nfts.length}, deduplicated count: ${nfts.length}`);
            
            // Save deduplicated NFTs to cache
            window.PetNFTService.updateCachedNFTs(nfts);
            
            // Update global userNFTs variable if it exists
            if (typeof window.userNFTs !== 'undefined') {
                window.userNFTs = nfts;
            }
            
            // Set global status if variables exist
            if (typeof window.totalNFTCount !== 'undefined') {
                window.totalNFTCount = nfts.length;
            }
            if (typeof window.hasLoadedNFT !== 'undefined') {
                window.hasLoadedNFT = true;
            }
            if (typeof window.hasReachedEnd !== 'undefined') {
                window.hasReachedEnd = true; // Because we loaded all NFTs at once
            }
            
            // Reset current page to the first page if variable exists
            if (typeof window.currentPage !== 'undefined') {
                window.currentPage = 1;
            }
            
            // Use pagination to render pets
            debug.log(`Found ${nfts.length} NFTs, using pagination to render`);
            
            // Check if we need to apply the saved quality filter
            const currentQualityFilter = window.currentQualityFilter || 'all';
            if (currentQualityFilter !== 'all') {
                debug.log(`Using saved quality filter: ${currentQualityFilter}`);
                // Update quality filter label UI
                document.querySelectorAll('.quality-tab').forEach(tab => {
                    const qualityId = tab.getAttribute('data-quality');
                    if (qualityId === currentQualityFilter) {
                        // Remove active class from all tabs
                        document.querySelectorAll('.quality-tab').forEach(t => {
                            t.classList.remove('active');
                            t.style.backgroundColor = '#f0f0f0';
                            t.style.color = 'inherit';
                            t.style.borderColor = '#ddd';
                        });
                        
                        // Add active class to the current quality
                        tab.classList.add('active');
                        
                        // Apply corresponding styles
                        if (currentQualityFilter === 'LEGENDARY') {
                            tab.style.backgroundColor = '#ff9800';
                            tab.style.borderColor = '#f57c00';
                        } else if (currentQualityFilter === 'RARE') {
                            tab.style.backgroundColor = '#673ab7';
                            tab.style.borderColor = '#512da8';
                        } else if (currentQualityFilter === 'EXCELLENT') {
                            tab.style.backgroundColor = '#2196f3';
                            tab.style.borderColor = '#1976d2';
                        } else if (currentQualityFilter === 'GOOD') {
                            tab.style.backgroundColor = '#4caf50';
                            tab.style.borderColor = '#388e3c';
                        } else if (currentQualityFilter === 'COMMON') {
                            tab.style.backgroundColor = '#9e9e9e';
                            tab.style.borderColor = '#757575';
                        }
                        tab.style.color = 'white';
                    }
                });
                
                // Apply filter
                if (typeof filterPetsByQuality === 'function') {
                    filterPetsByQuality();
                } else if (typeof window.filterPetsByQuality === 'function') {
                    window.filterPetsByQuality();
                } else {
                    debug.warn('filterPetsByQuality function not available');
                }
            } else {
                if (typeof renderPetsPage === 'function') {
                    renderPetsPage(window.currentPage || 1);
                } else if (typeof window.renderPetsPage === 'function') {
                    window.renderPetsPage(window.currentPage || 1);
                } else {
                    debug.warn('renderPetsPage function not available');
                }
            }
            
        } catch (error) {
            // Mark loading completed
            isLoadingInBackground = false;
            
            debug.error('Failed to load specific NFT:', error);
            petGrid.innerHTML = `<div class="error-message">${window.i18n ? window.i18n.t('pets.refreshFailed') : 'Failed to load specific NFT data'}</div>`;
            
            // Add retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = window.i18n ? window.i18n.t('button.refresh') : 'Retry';
            retryButton.className = 'retry-btn';
            retryButton.addEventListener('click', () => loadSpecificNFT(address, true)); // Retry with force update
            petGrid.appendChild(retryButton);
        }
    }
    /**
     * Create pagination controls
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     */
    function createPagination(currentPage, totalPages) {
        // Get petGrid element
        const petGrid = document.querySelector('.pet-grid');
        if (!petGrid) {
            debug.error('Pet grid element not found in createPagination');
            return;
        }
        
        // Remove existing pagination controls
        const existingPagination = document.querySelector('.pagination-container');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // Create pagination container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.style.gridColumn = '1 / -1';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.alignItems = 'center';
        paginationContainer.style.marginTop = '20px';
        paginationContainer.style.marginBottom = '10px';
        paginationContainer.style.gap = '8px';
        paginationContainer.style.flexWrap = 'wrap';
        
        // Create pagination controls
        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';
        paginationControls.style.display = 'flex';
        paginationControls.style.alignItems = 'center';
        paginationControls.style.gap = '8px';
        paginationContainer.appendChild(paginationControls);
        
        // First page button
        const firstPageBtn = document.createElement('button');
        firstPageBtn.textContent = 'First Page';
        firstPageBtn.className = 'pagination-btn first-btn' + (currentPage === 1 ? ' disabled' : '');
        firstPageBtn.disabled = currentPage === 1;
        firstPageBtn.addEventListener('click', () => {
            const currentPageNum = window.currentPage || currentPage;
            const currentQualityFilter = window.currentQualityFilter || 'all';
            
            if (currentPageNum !== 1) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    if (typeof renderFilteredNFTs === 'function') {
                        renderFilteredNFTs(1);
                    } else if (typeof window.renderFilteredNFTs === 'function') {
                        window.renderFilteredNFTs(1);
                    } else {
                        renderPetsPage(1);
                    }
                } else {
                    renderPetsPage(1);
                }
            }
        });
        paginationControls.appendChild(firstPageBtn);
        
        // Previous page button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous Page';
        prevBtn.className = 'pagination-btn prev-btn' + (currentPage === 1 ? ' disabled' : '');
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            const currentPageNum = window.currentPage || currentPage;
            const currentQualityFilter = window.currentQualityFilter || 'all';
            
            if (currentPageNum > 1) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    if (typeof renderFilteredNFTs === 'function') {
                        renderFilteredNFTs(currentPageNum - 1);
                    } else if (typeof window.renderFilteredNFTs === 'function') {
                        window.renderFilteredNFTs(currentPageNum - 1);
                    } else {
                        renderPetsPage(currentPageNum - 1);
                    }
                } else {
                    renderPetsPage(currentPageNum - 1);
                }
            }
        });
        paginationControls.appendChild(prevBtn);
        
        // Page number display
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `${currentPage}/${totalPages} page`;
        pageInfo.style.margin = '0 10px';
        paginationControls.appendChild(pageInfo);
        
        // Next page button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next Page';
        nextBtn.className = 'pagination-btn next-btn' + (currentPage === totalPages ? ' disabled' : '');
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            const currentPageNum = window.currentPage || currentPage;
            const currentQualityFilter = window.currentQualityFilter || 'all';
            
            if (currentPageNum < totalPages) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    if (typeof renderFilteredNFTs === 'function') {
                        renderFilteredNFTs(currentPageNum + 1);
                    } else if (typeof window.renderFilteredNFTs === 'function') {
                        window.renderFilteredNFTs(currentPageNum + 1);
                    } else {
                        renderPetsPage(currentPageNum + 1);
                    }
                } else {
                    renderPetsPage(currentPageNum + 1);
                }
            }
        });
        paginationControls.appendChild(nextBtn);
        
        // Last page button
        const lastPageBtn = document.createElement('button');
        lastPageBtn.textContent = 'Last Page';
        lastPageBtn.className = 'pagination-btn last-btn' + (currentPage === totalPages ? ' disabled' : '');
        lastPageBtn.disabled = currentPage === totalPages;
        lastPageBtn.addEventListener('click', () => {
            const currentPageNum = window.currentPage || currentPage;
            const currentQualityFilter = window.currentQualityFilter || 'all';
            
            if (currentPageNum !== totalPages) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    if (typeof renderFilteredNFTs === 'function') {
                        renderFilteredNFTs(totalPages);
                    } else if (typeof window.renderFilteredNFTs === 'function') {
                        window.renderFilteredNFTs(totalPages);
                    } else {
                        renderPetsPage(totalPages);
                    }
                } else {
                    renderPetsPage(totalPages);
                }
            }
        });
        paginationControls.appendChild(lastPageBtn);
        
        // Jump to specified page
        const pageJumpContainer = document.createElement('div');
        pageJumpContainer.style.display = 'flex';
        pageJumpContainer.style.alignItems = 'center';
        pageJumpContainer.style.marginLeft = '10px';
        
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.min = '1';
        pageInput.max = totalPages.toString();
        pageInput.value = currentPage.toString();
        pageInput.className = 'page-input';
        pageInput.style.width = '50px';
        pageInput.style.textAlign = 'center';
        pageInput.style.marginRight = '5px';
        
        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = 'Jump';
        jumpBtn.className = 'pagination-btn jump-btn';
        jumpBtn.addEventListener('click', () => {
            const pageNum = parseInt(pageInput.value);
            const currentPageNum = window.currentPage || currentPage;
            const currentQualityFilter = window.currentQualityFilter || 'all';
            
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPageNum) {
                scrollToTop();
                // Apply current quality filter after rendering
                if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                    if (typeof renderFilteredNFTs === 'function') {
                        renderFilteredNFTs(pageNum);
                    } else if (typeof window.renderFilteredNFTs === 'function') {
                        window.renderFilteredNFTs(pageNum);
                    } else {
                        renderPetsPage(pageNum);
                    }
                } else {
                    renderPetsPage(pageNum);
                }
            } else {
                pageInput.value = currentPageNum.toString();
            }
        });
        
        pageJumpContainer.appendChild(pageInput);
        pageJumpContainer.appendChild(jumpBtn);
        paginationControls.appendChild(pageJumpContainer);
        
        // Add to bottom of grid
        petGrid.appendChild(paginationContainer);
    }
        /**
     * Render pet data for specified page
     * @param {number} page - Page number
     */
        async function renderPetsPage(page) {
            debug.log(`Render pet data for page ${page}`);
            
            // Get petGrid element
            const petGrid = document.querySelector('.pet-grid');
            if (!petGrid) {
                debug.error('Pet grid element not found');
                return;
            }
            
            // Update current page number
            if (typeof window.currentPage !== 'undefined') {
                window.currentPage = page;
            }
            
            // Get all NFTs from PetNFTService
            let nfts = window.PetNFTService.getCachedNFTs();
            
            // Remove duplicates: process NFTs by tokenId
            const nftMap = new Map();
            for (const nft of nfts) {
                // Only keep the first instance of each tokenId
                if (!nftMap.has(nft.tokenId)) {
                    nftMap.set(nft.tokenId, nft);
                } else {
                    debug.warn(`Duplicate NFT found, tokenId: ${nft.tokenId}, ignoring duplicate`);
                }
            }
            
            // Convert Map back to array
            nfts = Array.from(nftMap.values());
            const totalNFTCount = nfts.length;
            
            // Update global variables if they exist
            if (typeof window.totalNFTCount !== 'undefined') {
                window.totalNFTCount = totalNFTCount;
            }
            if (typeof window.userNFTs !== 'undefined') {
                window.userNFTs = nfts;
            }
            
            debug.log(`Total ${nfts.length} NFTs (after removing duplicates)`);
            
            if (totalNFTCount === 0) {
                debug.log('No NFT data found');
                if (typeof showNoNFTsMessage === 'function') {
                    showNoNFTsMessage();
                } else {
                    petGrid.innerHTML = `<div class="no-pets-message">No pets found</div>`;
                }
                return;
            }
            
            // Check if there is a saved quality filter in localStorage
            const savedQualityFilter = localStorage.getItem('petQualityFilter');
            const currentQualityFilter = window.currentQualityFilter || 'all';
            if (savedQualityFilter && savedQualityFilter !== 'all' && savedQualityFilter !== currentQualityFilter) {
                debug.log(`Found saved quality filter: ${savedQualityFilter}, applying it`);
                
                // Update current quality filter
                if (typeof window.currentQualityFilter !== 'undefined') {
                    window.currentQualityFilter = savedQualityFilter;
                }
                
                // Update UI to show selected quality tab
                document.querySelectorAll('.quality-tab').forEach(tab => {
                    tab.classList.remove('active');
                    
                    // Reset all tab styles
                    tab.style.backgroundColor = '#f0f0f0';
                    tab.style.color = 'inherit';
                    tab.style.borderColor = '#ddd';
                    
                    // If it is the saved quality tab, set it to active
                    if (tab.getAttribute('data-quality') === currentQualityFilter) {
                        tab.classList.add('active');
                        
                        // Set styles based on quality
                        if (currentQualityFilter === 'LEGENDARY') {
                            tab.style.backgroundColor = '#ff9800';
                            tab.style.borderColor = '#f57c00';
                        } else if (currentQualityFilter === 'RARE') {
                            tab.style.backgroundColor = '#673ab7';
                            tab.style.borderColor = '#512da8';
                        } else if (currentQualityFilter === 'EXCELLENT') {
                            tab.style.backgroundColor = '#2196f3';
                            tab.style.borderColor = '#1976d2';
                        } else if (currentQualityFilter === 'GOOD') {
                            tab.style.backgroundColor = '#4caf50';
                            tab.style.borderColor = '#388e3c';
                        } else if (currentQualityFilter === 'COMMON') {
                            tab.style.backgroundColor = '#9e9e9e';
                            tab.style.borderColor = '#757575';
                        }
                        tab.style.color = 'white';
                    }
                });
                
                // Apply filter condition
                if (typeof filterPetsByQuality === 'function') {
                    filterPetsByQuality();
                } else if (typeof window.filterPetsByQuality === 'function') {
                    window.filterPetsByQuality();
                } else {
                    debug.warn('filterPetsByQuality function not available');
                }
                return;
            }
            
            // Calculate start and end indices
            const itemsPerPage = window.itemsPerPage || 6;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalNFTCount);
            
            debug.log(`Displaying NFTs ${startIndex + 1} to ${endIndex}, page: ${page}, total pages: ${Math.ceil(totalNFTCount / itemsPerPage)}`);
            
            // Get current page NFTs - create deep copy to avoid modifying original data
            const currentPageNFTs = nfts.slice(startIndex, endIndex).map(nft => {
                // Create deep copy to ensure original object is not modified
                const nftCopy = JSON.parse(JSON.stringify(nft));
                
                // Ensure original image URL is preserved
                if (nftCopy.originalImageUrl) {
                    debug.log(`Using nft.originalImageUrl: ${nftCopy.originalImageUrl} instead of ${nftCopy.metadata.image}`);
                    nftCopy.metadata.image = nftCopy.originalImageUrl;
                } else if (nftCopy.metadata && nftCopy.metadata.originalImageUrl) {
                    debug.log(`Using nft.metadata.originalImageUrl: ${nftCopy.metadata.originalImageUrl} instead of ${nftCopy.metadata.image}`);
                    nftCopy.metadata.image = nftCopy.metadata.originalImageUrl;
                }
                
                return nftCopy;
            });
            
            // Clear existing pet cards
            petGrid.innerHTML = '';
            
            // Create a wrapper container to save count information, avoiding it being treated as a pet card
            const infoContainer = document.createElement('div');
            infoContainer.className = 'nft-info-container';
            infoContainer.style.gridColumn = '1 / -1'; // Make it span all columns
            
            // If it exists, keep NFT count information
            const countInfo = document.createElement('div');
            countInfo.className = 'nft-count-info';
            countInfo.textContent = `Found ${totalNFTCount} NFTs (displaying ${startIndex + 1} - ${endIndex})`;
            
            // Add count information to container
            infoContainer.appendChild(countInfo);
            
            // Add container to pet grid
            petGrid.appendChild(infoContainer);
            
            // Use Set to record added tokenIds, avoiding duplicate additions
            const addedTokenIds = new Set();
            
            // Display current page pets
            for (const nft of currentPageNFTs) {
                try {
                    const tokenId = nft.tokenId || nft.token_id;
                    
                    // Skip already added tokenIds
                    if (addedTokenIds.has(tokenId)) {
                        debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already added in this render`);
                        continue;
                    }
                    
                    // Check if there is already a card with the same tokenId, avoiding duplicate creation
                    const existingCard = petGrid.querySelector(`.pet-card[data-token-id="${tokenId}"]`);
                    if (existingCard) {
                        debug.warn(`Skipping duplicate card creation, TokenID: ${tokenId} already exists in DOM`);
                        continue;
                    }
                    
                    // Use PetCard.appendCardToContainer to create and add card
                    await PetCard.appendCardToContainer(nft, petGrid);
                    
                    // Record added tokenId
                    addedTokenIds.add(tokenId);
                } catch (error) {
                    const tokenId = nft.tokenId || nft.token_id || 'Unknown';
                    debug.error(`Failed to create pet card, TokenID: ${tokenId}:`, error);
                    // Create an error提示卡片
                    const errorCard = document.createElement('div');
                    errorCard.className = 'pet-card error';
                    errorCard.innerHTML = `<div class="error-message">Failed to load card (ID: ${tokenId})</div>`;
                    petGrid.appendChild(errorCard);
                }
            }
            
            // Initialize pet card interactions
            if (typeof initPetCardInteractions === 'function') {
                initPetCardInteractions();
            } else if (typeof window.initPetCardInteractions === 'function') {
                window.initPetCardInteractions();
            }
            
            // Create or update pagination controls
            createPagination(page, Math.ceil(totalNFTCount / itemsPerPage));
            
            // Apply current quality filter after rendering
            if (currentQualityFilter !== 'all') {
                if (typeof filterPetsByQuality === 'function') {
                    filterPetsByQuality();
                } else if (typeof window.filterPetsByQuality === 'function') {
                    window.filterPetsByQuality();
                }
            }
        }
        
    /**
     * Scroll to page top
     */
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
        /**
     * Get NFT quality name
     * @param {number} qualityId - Quality ID
     * @returns {string} Quality name
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

    // Export functions to global scope for use by pets.js
    window.loadSpecificNFT = loadSpecificNFT;
    window.createPagination = createPagination;
    window.renderPetsPage = renderPetsPage;
    window.scrollToTop = scrollToTop;
    window.getQualityName = getQualityName;
    
    // Also export as a module for potential future use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            loadSpecificNFT,
            createPagination,
            renderPetsPage,
            scrollToTop,
            getQualityName
        };
    }
    
    console.log('[DisplayAndFilterNfts] Module loaded and functions exported to global scope');    