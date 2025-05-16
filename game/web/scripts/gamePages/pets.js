// Pet page script
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const sortSelect = document.querySelector('.sort-select');
    const adoptPetBtn = document.querySelector('.adopt-pet-btn');
    const petsGrid = document.querySelector('.pets-grid');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    let prevPageBtn = document.getElementById('prevPageBtn');
    let nextPageBtn = document.getElementById('nextPageBtn');
    const paginationLinks = document.getElementById('paginationLinks');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // pet data, initially empty, will be fetched from parent page
    let petsData = [];
    
    // pagination related variables
    let currentPage = 1;
    let pageSize = 6;
    let totalNFTs = 0;
    let allNFTs = [];
    
    // current selected quality filter
    let currentQualityFilter = 'all';
    
    // initialization
    init();
    
    /**
     * Initialization function
     */
    function init() {
        console.log('Initializing pet page......');
        
        // print if required components exist
        console.log('Required component check:');
        console.log('- web3:', typeof window.web3 !== 'undefined');
        console.log('- NFTFeedingManagerABI:', typeof window.NFTFeedingManagerABI !== 'undefined');
        console.log('- PetNFTService:', typeof window.PetNFTService !== 'undefined');
        console.log('- initNFTFeedingManagerContract:', typeof window.initNFTFeedingManagerContract !== 'undefined');
        
        // add quality filter
        addQualityFilter();
        
        // load last selected quality filter from local storage
        const savedQualityFilter = localStorage.getItem('petQualityFilter');
        if (savedQualityFilter) {
            console.log('Loaded quality filter from local storage:', savedQualityFilter);
            currentQualityFilter = savedQualityFilter;
            
            // find the corresponding tab and set it to active state
            const qualityTab = document.querySelector(`.quality-tab[data-quality="${savedQualityFilter}"]`);
            if (qualityTab) {
                // remove active class and style from all tabs
                document.querySelectorAll('.quality-tab').forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.backgroundColor = '#f0f0f0';
                    tab.style.color = 'inherit';
                    tab.style.borderColor = '#ddd';
                });
                
                // set selected style
                qualityTab.classList.add('active');
                
                // set active state style
                if (savedQualityFilter === 'LEGENDARY') {
                    qualityTab.style.backgroundColor = '#ff9800';
                    qualityTab.style.borderColor = '#f57c00';
                } else if (savedQualityFilter === 'RARE') {
                    qualityTab.style.backgroundColor = '#673ab7';
                    qualityTab.style.borderColor = '#512da8';
                } else if (savedQualityFilter === 'EXCELLENT') {
                    qualityTab.style.backgroundColor = '#2196f3';
                    qualityTab.style.borderColor = '#1976d2';
                } else if (savedQualityFilter === 'GOOD') {
                    qualityTab.style.backgroundColor = '#4caf50';
                    qualityTab.style.borderColor = '#388e3c';
                } else if (savedQualityFilter === 'COMMON') {
                    qualityTab.style.backgroundColor = '#9e9e9e';
                    qualityTab.style.borderColor = '#757575';
                } else {
                    qualityTab.style.backgroundColor = '#4d7bef';
                    qualityTab.style.borderColor = '#3a68d8';
                }
                
                qualityTab.style.color = 'white';
            }
        }
        
        // load NFTFeedingManager initialization script
        if (typeof window.initNFTFeedingManagerContract === 'undefined') {
            console.log('Loading initNFTFeedingManager.js script...');
            const script = document.createElement('script');
            script.src = '../../scripts/init_contracts/initNFTFeedingManager.js';
            script.onload = function() {
                console.log('initNFTFeedingManager.jsScript loaded successfully, initializing contract...');
                // initialize NFTFeedingManager contract
                initNFTFeedingManagerContract();
            };
            script.onerror = function() {
                console.error('initNFTFeedingManager.jsScript failed to load');
            };
            document.head.appendChild(script);
        }
        
        // ensure contract ABI is loaded
        if (typeof window.NFTFeedingManagerABI === 'undefined') {
            console.log('Attempting to load NFTFeedingManagerABI...');
            
            // async load NFTFeedingManagerABI script
            const script = document.createElement('script');
            script.src = '../../scripts/contracts/ABI/NFTFeedingManagerABI.js';
            script.onload = function() {
                console.log('NFTFeedingManagerABI loaded successfully');
                // after loading successfully, initialize contract
                if (typeof window.initNFTFeedingManagerContract !== 'undefined') {
                    initNFTFeedingManagerContract();
                } else {
                    console.log('NFTFeedingManagerABI loaded, but initNFTFeedingManagerContract is undefined, waiting for script loading');
                }
            };
            script.onerror = function() {
                console.error('NFTFeedingManagerABI loading failed');
            };
            document.head.appendChild(script);
        }
        
        // Initializing PetNFTService
        if (window.PetNFTService) {
            console.log('Initializing PetNFTService...');
            window.PetNFTService.init().then(success => {
                console.log('PetNFTService initialization' + (success ? 'succeeded' : 'failed'));
                
                // after PetNFTService initialization, initialize NFTFeedingManager contract
                if (success && typeof window.NFTFeedingManagerABI !== 'undefined' && 
                    typeof window.initNFTFeedingManagerContract !== 'undefined') {
                    initNFTFeedingManagerContract();
                }
            });
        } else {
            console.warn('PetNFTService not found, cannot initialize');
        }
        
        // After initializing Web3, initializing contract
        if (typeof window.ethereum !== 'undefined') {
            console.log('Ethereum provider detected, initializing Web3...');
            window.web3 = new Web3(window.ethereum);
            
            // after Web3 initialization, immediately try to initialize contract
            if (typeof window.NFTFeedingManagerABI !== 'undefined' && 
                typeof window.initNFTFeedingManagerContract !== 'undefined') {
                initNFTFeedingManagerContract();
            }
        } else if (typeof window.web3 !== 'undefined') {
            console.log('using existing Web3 instance');
            
            // using existing Web3 instance to initialize contract
            if (typeof window.NFTFeedingManagerABI !== 'undefined' && 
                typeof window.initNFTFeedingManagerContract !== 'undefined') {
                initNFTFeedingManagerContract();
            }
        } else {
            console.warn('Web3 or Ethereum provider not detected');
        }
        
        // Bind sort select event
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const sortType = sortSelect.value;
                console.log('Sort method changed:', sortType);
                
                // if NFT data already exists, apply sorting directly and display the first page
                if (allNFTs.length > 0) {
                    allNFTs = sortNFTs(allNFTs, sortType);
                    currentPage = 1; // reset to the first page
                    displayPaginatedNFTs();
                }
            });
        }
        
        // Bind feed friend NFT button event
        const feedFriendNFTBtn = document.getElementById('feedFriendNFTBtn');
        if (feedFriendNFTBtn) {
            feedFriendNFTBtn.addEventListener('click', handleFeedFriendNFTClick);
        }
        
        // bind batch operation buttons
        initBatchActionButtons();
        
        // bind page size selection event
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', function() {
                pageSize = parseInt(this.value);
                currentPage = 1; // reset to the first page
                displayPaginatedNFTs();
                updatePaginationControls();
            });
        }
        
        // bind previous page button event
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    displayPaginatedNFTs();
                    updatePaginationControls();
                }
            });
        }
        
        // bind next page button event
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', function() {
                const totalPages = Math.ceil(totalNFTs / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    displayPaginatedNFTs();
                    updatePaginationControls();
                }
            });
        }
        
        // bind global events of game pet cards
        bindPetCardEvents();
        
        // listen to messages from parent page
        window.addEventListener('message', handleParentMessage);
        
        // localize content
        localizeContent();
        
        // load NFT pets
        loadNFTPets();
        
        // preload ModalDialog component
        loadModalDialogComponent();
    }
    
    /**
     * add quality filter function
     */
    function addQualityFilter() {
        console.log('adding quality filter');
        
        // create quality filter container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'quality-filter-container';
        filterContainer.style.marginBottom = '20px';
        
        // create quality filter
        const qualityFilter = document.createElement('div');
        qualityFilter.className = 'quality-filter';
        qualityFilter.style.display = 'flex';
        qualityFilter.style.flexWrap = 'wrap';
        qualityFilter.style.gap = '10px';
        
        // create quality tab
        const qualityLabels = [
            { id: 'all', name: 'all' },
            { id: 'COMMON', name: 'common' },
            { id: 'GOOD', name: 'good' },
            { id: 'EXCELLENT', name: 'excellent' },
            { id: 'RARE', name: 'rare' },
            { id: 'LEGENDARY', name: 'legendary' }
        ];
        
        // add each quality tab
        qualityLabels.forEach(quality => {
            const tab = document.createElement('div');
            tab.className = 'quality-tab' + (quality.id === 'all' ? ' active' : '');
            tab.setAttribute('data-quality', quality.id);
            tab.textContent = quality.name;
            
            // set style
            tab.style.padding = '6px 15px';
            tab.style.borderRadius = '5px';
            tab.style.backgroundColor = '#f0f0f0';
            tab.style.cursor = 'pointer';
            tab.style.transition = 'all 0.3s';
            tab.style.border = '1px solid #ddd';
            tab.style.fontSize = '0.9rem';
            
            // set active state style
            if (quality.id === 'all') {
                tab.style.backgroundColor = '#4d7bef';
                tab.style.color = 'white';
                tab.style.borderColor = '#3a68d8';
            }
            
            // if i18n support is needed
            if (quality.id !== 'all') {
                tab.setAttribute('data-i18n', `quality.${quality.id.toLowerCase()}`);
            } else {
                tab.setAttribute('data-i18n', 'common.all');
            }
            
            // add click event
            tab.addEventListener('click', handleQualityTabClick);
            
            qualityFilter.appendChild(tab);
        });
        
        // add quality filter to container
        filterContainer.appendChild(qualityFilter);
        
        // add quality filter container to page
        const petsContainer = document.querySelector('.pets-container');
        const petsHeader = document.querySelector('.pets-header');
        
        // insert after pets-header
        if (petsContainer && petsHeader) {
            petsContainer.insertBefore(filterContainer, petsHeader.nextSibling);
        }
    }
    
    /**
     * handle quality tab click
     */
    function handleQualityTabClick(event) {
        // remove active class from all tabs
        document.querySelectorAll('.quality-tab').forEach(tab => {
            tab.classList.remove('active');
            // reset style
            tab.style.backgroundColor = '#f0f0f0';
            tab.style.color = 'inherit';
            tab.style.borderColor = '#ddd';
        });
        
        // add active class and style to the clicked tab
        event.currentTarget.classList.add('active');
        
        // set active state style
        const qualityId = event.currentTarget.getAttribute('data-quality');
        if (qualityId === 'LEGENDARY') {
            event.currentTarget.style.backgroundColor = '#ff9800';
            event.currentTarget.style.borderColor = '#f57c00';
        } else if (qualityId === 'RARE') {
            event.currentTarget.style.backgroundColor = '#673ab7';
            event.currentTarget.style.borderColor = '#512da8';
        } else if (qualityId === 'EXCELLENT') {
            event.currentTarget.style.backgroundColor = '#2196f3';
            event.currentTarget.style.borderColor = '#1976d2';
        } else if (qualityId === 'GOOD') {
            event.currentTarget.style.backgroundColor = '#4caf50';
            event.currentTarget.style.borderColor = '#388e3c';
        } else if (qualityId === 'COMMON') {
            event.currentTarget.style.backgroundColor = '#9e9e9e';
            event.currentTarget.style.borderColor = '#757575';
        } else {
            event.currentTarget.style.backgroundColor = '#4d7bef';
            event.currentTarget.style.borderColor = '#3a68d8';
        }
        
        event.currentTarget.style.color = 'white';
        
        // get selected quality
        currentQualityFilter = qualityId;
        console.log('selected quality:', currentQualityFilter);
        
        // save current filter condition to localStorage
        localStorage.setItem('petQualityFilter', currentQualityFilter);
        console.log('saved quality filter condition to localStorage:', currentQualityFilter);
        
        // [important modification] clear previous filter result cache when quality changes
        window.filteredNFTsByQuality = null;
        
        // switch to all quality, ensure pagination controls visibility will be checked again
        if (qualityId === 'all') {
            // show pagination controls (if needed)
            resetPaginationControlsVisibility();
        }
        
        // filter all pet cards, not only current page's
        filterPetsByQuality();
    }
    
    /**
     * reset pagination controls visibility
     */
    function resetPaginationControlsVisibility() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            // reset to visible
            paginationContainer.style.display = 'flex';
            console.log('reset pagination controls to visible');
        }
    }
    
    /**
     * filter pets by quality
     */
    function filterPetsByQuality() {
        console.log('start to filter pets by quality: ' + currentQualityFilter);
        
        // if selected "all", show all pet cards
        if (currentQualityFilter === 'all') {
            // reset pagination controls visibility
            resetPaginationControlsVisibility();
            
            // reset to original all data
            totalNFTs = allNFTs.length;
            currentPage = 1; // reset to the first page
            
            console.log(`show all pets, total ${totalNFTs} pets`);
            
            // display paginated NFTs
            displayPaginatedNFTs();
            // update pagination controls
            updatePaginationControls();
        } else {
            // reset pagination controls visibility
            resetPaginationControlsVisibility();
            
            // filter all pet data by quality
            const filteredNFTs = allNFTs.filter(nft => {
                // get quality info from NFT metadata
                let quality = 'COMMON'; // default quality
                if (nft.metadata && nft.metadata.attributes) {
                    const qualityAttr = nft.metadata.attributes.find(attr => 
                        attr.trait_type === 'Quality' || 
                        attr.trait_type === 'Rarity' || 
                        attr.trait_type === 'quality' || 
                        attr.trait_type === 'rarity'
                    );
                    if (qualityAttr) {
                        quality = String(qualityAttr.value).toUpperCase();
                    }
                }
                
                // more powerful quality matching logic
                return matchesQuality(quality, currentQualityFilter);
            });
            
            console.log(`filtered ${filteredNFTs.length} pets with ${getQualityName(currentQualityFilter)} quality`);
            
            // no pet matches the condition, display a message
            if (filteredNFTs.length === 0) {
                petsGrid.innerHTML = '';
                const message = document.createElement('div');
                message.className = 'no-pets-message';
                message.textContent = `no pets with ${getQualityName(currentQualityFilter)} quality`;
                petsGrid.appendChild(message);
                
                // hide pagination controls
                hidePaginationControls();
                return;
            }
            
            // [important modification] save filtered NFTs as a separate variable, not directly operate allNFTs
            window.filteredNFTsByQuality = [...filteredNFTs];
            
            // update total number and current page
            totalNFTs = filteredNFTs.length;
            currentPage = 1; // reset to the first page
            
            console.log(`filtered ${totalNFTs} NFTs, total ${Math.ceil(totalNFTs / pageSize)} pages`);
            
            // display current page's NFTs
            displayFilteredNFTs();
            
            // update pagination controls
            updatePaginationControls();
            
            // ensure pagination controls visible (if there are multiple pages)
            showPaginationIfNeeded();
        }
    }
    
    /**
     * ensure pagination controls visible (if there are multiple pages)
     */
    function showPaginationIfNeeded() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            const totalPages = Math.ceil(totalNFTs / pageSize);
            console.log(`check if pagination controls should be displayed: total pages=${totalPages}, page size=${pageSize}, total pets=${totalNFTs}`);
            
            if (totalPages > 1) {
                // if there are multiple pages, display pagination controls
                paginationContainer.style.display = 'flex';
                console.log('display pagination controls - multiple pages');
            } else if (totalNFTs <= pageSize) {
                // if the number of pets is less than or equal to the number of pets per page, hide pagination controls
                paginationContainer.style.display = 'none';
                console.log('hide pagination controls - not enough pets');
            } else {
                // other cases, set to visible
                paginationContainer.style.display = 'flex';
                console.log('display pagination controls - default case');
            }
        } else {
            console.error('pagination container element not found');
        }
    }
    
    /**
     * display filtered NFTs
     */
    function displayFilteredNFTs() {
        // check if the filtered NFT array exists
        if (!window.filteredNFTsByQuality || window.filteredNFTsByQuality.length === 0) {
            console.error('filtered NFT array does not exist or is empty');
            return;
        }
        
        // calculate the current page's NFTs
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalNFTs);
        
        // create a deep copy to avoid modifying the original data
        const currentPageNFTs = window.filteredNFTsByQuality.slice(startIndex, endIndex).map(nft => {
            return JSON.parse(JSON.stringify(nft));
        });
        
        console.log(`display filtered NFTs for page ${currentPage}, ${currentPageNFTs.length} pets, range: ${startIndex+1}-${endIndex}`);
        
        // clear and fill the pet grid
        petsGrid.innerHTML = '';
        
        // preprocess all NFTs to display, keep the original value
        currentPageNFTs.forEach(nft => {
            // add standardized quality info to each NFT, this will be used when creating the card
            if (nft.metadata && nft.metadata.attributes) {
                const qualityAttr = nft.metadata.attributes.find(attr => 
                    attr.trait_type === 'Quality' || 
                    attr.trait_type === 'Rarity' || 
                    attr.trait_type === 'quality' || 
                    attr.trait_type === 'rarity'
                );
                
                if (qualityAttr) {
                    // record the original quality value
                    nft._originalQuality = qualityAttr.value;
                    
                    // set the displayed quality according to the current filter condition
                    nft.normalizedQuality = currentQualityFilter;
                    console.log(`NFT #${nft.tokenId} set quality to: "${currentQualityFilter}" (original value: "${qualityAttr.value}")`);
                }
            }
            
            // ensure the feedingInfo data (if exists) is preserved
            if (nft.feedingInfo) {
                console.log(`preserve the feeding info of NFT #${nft.tokenId}`);
            }
        });
        
        // use the game mode pet card component to create the card
        currentPageNFTs.forEach(nft => {
            if (window.GamePetCard) {
                console.log(`process the pet card creation of NFT #${nft.tokenId}...`);
                
                // use the game mode pet card component to create the card
                const card = window.GamePetCard.appendCardToContainer(nft, petsGrid);
                
                // ensure the card has quality data attribute
                if (card) {
                    // record the original data to ensure correct restoration
                    const originalRarity = card.dataset.rarity;
                    const originalLevel = card.dataset.level;
                    const originalFeedingHours = card.dataset.feedingHours;
                    const originalAccumulatedFood = card.dataset.accumulatedFood;
                    
                    // actively set the quality data attribute, use the current filtered quality
                    card.dataset.quality = currentQualityFilter;
                    card.dataset.filteredQuality = currentQualityFilter;
                    
                    // check the quality displayed in the card element
                    const rarityElement = card.querySelector('.game-pet-rarity');
                    if (rarityElement) {
                        // get the correct quality name
                        const qualityName = getQualityName(currentQualityFilter);
                        console.log(`NFT #${nft.tokenId} card quality name should be: "${qualityName}", current display: "${rarityElement.textContent}"`);
                        
                        // if the display is inconsistent, force update
                        if (rarityElement.textContent !== qualityName) {
                            rarityElement.textContent = qualityName;
                            console.log(`NFT #${nft.tokenId} quality display has been corrected to: "${qualityName}"`);
                        }
                        
                        // check and correct the card style class
                        const correctClass = getQualityClass(currentQualityFilter);
                        
                        // remove all quality related classes
                        ['common', 'good', 'excellent', 'purple-rare', 'legendary', 'uncommon'].forEach(cls => {
                            if (card.classList.contains(cls)) {
                                card.classList.remove(cls);
                            }
                        });
                        
                        // add the correct class
                        card.classList.add(correctClass);
                        console.log(`NFT #${nft.tokenId} card style class has been corrected to: "${correctClass}"`);
                        
                        // update the reward display
                        let qualityRewards;
                        
                        // check if the getQualityRewards function is available
                        if (window.GamePetCard && typeof window.GamePetCard.getQualityRewards === 'function') {
                            qualityRewards = window.GamePetCard.getQualityRewards(currentQualityFilter);
                        } else {
                            // if not available, use a simple fallback plan
                            console.log(`GamePetCard.getQualityRewards function is not available, use fallback plan`);
                            const basicRewardMap = {
                                'COMMON': { pwp: 1, pwb: 2 },
                                'GOOD': { pwp: 10, pwb: 20 },
                                'EXCELLENT': { pwp: 100, pwb: 200 },
                                'RARE': { pwp: 800, pwb: 2000 },
                                'LEGENDARY': { pwp: 5000, pwb: 15000 }
                            };
                            qualityRewards = basicRewardMap[currentQualityFilter] || basicRewardMap['COMMON'];
                        }
                        
                        const pwpRewardElement = card.querySelector('.pwp-reward');
                        const pwbRewardElement = card.querySelector('.pwb-reward');
                        
                        if (pwpRewardElement && qualityRewards && qualityRewards.pwp !== undefined) {
                            // get the original level (from the card data)
                            const nftLevel = parseInt(card.dataset.level) || 1;
                            
                            // calculate the level reward multiplier
                            const levelMultiplier = nftLevel; // 1=1x, 2=2x, 3=3x, etc.
                            
                            // apply the level multiplier to calculate the final hourly reward
                            const hourlyPwp = qualityRewards.pwp * levelMultiplier;
                            const hourlyPwb = qualityRewards.pwb * levelMultiplier;
                            
                            pwpRewardElement.textContent = `${hourlyPwp} PWP`;
                            pwbRewardElement.textContent = `${hourlyPwb} PWB`;
                            
                            console.log(`updated the reward display of NFT #${nft.tokenId}, calculation formula: base reward × level(${nftLevel})x:
                            - PWP: ${qualityRewards.pwp} × ${nftLevel} = ${hourlyPwp}
                            - PWB: ${qualityRewards.pwb} × ${nftLevel} = ${hourlyPwb}`);
                        }
                    }
                    
                    // ensure the level and other attributes remain unchanged
                    if (originalLevel !== card.dataset.level) {
                        console.log(`correct the level of NFT #${nft.tokenId} from ${card.dataset.level} to ${originalLevel}`);
                        card.dataset.level = originalLevel;
                        
                        // update the level display
                        const levelElement = card.querySelector('.game-pet-level');
                        if (levelElement) {
                            levelElement.textContent = `Lv.${originalLevel}`;
                        }
                    }
                    
                    // ensure the feeding hours remains unchanged
                    if (originalFeedingHours !== card.dataset.feedingHours) {
                        console.log(`correct the feeding hours of NFT #${nft.tokenId} from ${card.dataset.feedingHours} to ${originalFeedingHours}`);
                        card.dataset.feedingHours = originalFeedingHours;
                        
                        // update the feeding hours display
                        if (window.GamePetCard && typeof window.GamePetCard.updatePetSatiety === 'function') {
                            window.GamePetCard.updatePetSatiety(card, parseInt(originalFeedingHours));
                        } else {
                            // simple fallback implementation
                            console.log(`GamePetCard.updatePetSatiety function is not available, use fallback plan`);
                            const MAX_FEEDING_HOURS = 168; // maximum feeding hours (7 days)
                            const feedingHours = parseInt(originalFeedingHours);
                            
                            // calculate the satiety percentage
                            const satietyPercent = Math.round((feedingHours / MAX_FEEDING_HOURS) * 100);
                            
                            // update the UI elements
                            const healthBar = card.querySelector('.game-stat-health .game-stat-value');
                            const healthNumber = card.querySelector('.game-stat-health .game-stat-number');
                            
                            if (healthBar) {
                                healthBar.style.width = `${satietyPercent}%`;
                            }
                            
                            if (healthNumber) {
                                healthNumber.textContent = `${feedingHours}/${MAX_FEEDING_HOURS}h`;
                            }
                        }
                    }
                    
                    // ensure the accumulated food remains unchanged
                    if (originalAccumulatedFood !== card.dataset.accumulatedFood) {
                        console.log(`correct the accumulated food of NFT #${nft.tokenId} from ${card.dataset.accumulatedFood} to ${originalAccumulatedFood}`);
                        card.dataset.accumulatedFood = originalAccumulatedFood;
                        
                        // update the level progress display
                        const levelProgressBar = card.querySelector('.game-stat-level .game-stat-value');
                        const levelProgressText = card.querySelector('.game-stat-level .game-stat-number');
                        
                        if (levelProgressBar && levelProgressText) {
                            let progress;
                            
                            // check if the calculateLevelProgress function is available
                            if (window.GamePetCard && typeof window.GamePetCard.calculateLevelProgress === 'function') {
                                progress = window.GamePetCard.calculateLevelProgress(
                                    parseInt(originalLevel), 
                                    parseInt(originalAccumulatedFood)
                                );
                            } else {
                                // simple fallback implementation
                                console.log(`GamePetCard.calculateLevelProgress function is not available, use fallback plan`);
                                const level = parseInt(originalLevel);
                                const accFood = parseInt(originalAccumulatedFood);
                                
                                // simplified level target calculation
                                let target;
                                if (level === 1) target = 1000;      // to level 2, need 1000
                                else if (level === 2) target = 3000;  // to level 3, need 3000
                                else if (level === 3) target = 10000; // to level 4, need 10000
                                else if (level === 4) target = 30000; // to level 5, need 30000
                                else target = 999999;                 // already at the highest level

                                // calculate the progress percentage
                                const percent = level >= 5 ? 100 : Math.min(100, Math.floor((accFood / target) * 100));
                                
                                progress = { target, percent };
                            }
                            
                            levelProgressBar.style.width = `${progress.percent}%`;
                            levelProgressText.textContent = `${originalAccumulatedFood}/${progress.target}`;
                        }
                    }
                }
            }
        });
    }
    
    /**
     * check if the NFT quality matches the specified filter condition
     * @param {string} nftQuality - NFT quality value
     * @param {string} filterQuality - filter condition
     * @returns {boolean} whether it matches
     */
    function matchesQuality(nftQuality, filterQuality) {
        // normalize the quality value (convert to uppercase)
        const normalizedNftQuality = String(nftQuality).toUpperCase();
        const normalizedFilterQuality = String(filterQuality).toUpperCase();
        
        // exact match
        if (normalizedNftQuality === normalizedFilterQuality) {
            return true;
        }
        
        // match the alias
        if (normalizedFilterQuality === 'LEGENDARY' && 
            (normalizedNftQuality === 'LEGEND' || normalizedNftQuality === 'EPIC')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && 
            (normalizedNftQuality === 'PURPLE' || normalizedNftQuality === 'PURPLE-RARE')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'GOOD' && 
            normalizedNftQuality === 'UNCOMMON') {
            return true;
        }
        
        if (normalizedFilterQuality === 'COMMON' && 
            normalizedNftQuality === 'NORMAL') {
            return true;
        }
        
        // fuzzy match (only as a fallback option)
        if (normalizedFilterQuality === 'LEGENDARY' && 
            normalizedNftQuality.includes('LEGEND')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && 
            normalizedNftQuality.includes('RARE')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'EXCELLENT' && 
            normalizedNftQuality.includes('EXCEL')) {
            return true;
        }
        
        // number quality matching (if the quality is represented by a number)
        if (normalizedFilterQuality === 'LEGENDARY' && 
            (normalizedNftQuality === '4' || normalizedNftQuality === '5')) {
            return true;
        }
        
        if (normalizedFilterQuality === 'RARE' && normalizedNftQuality === '3') {
            return true;
        }
        
        if (normalizedFilterQuality === 'EXCELLENT' && normalizedNftQuality === '2') {
            return true;
        }
        
        if (normalizedFilterQuality === 'GOOD' && normalizedNftQuality === '1') {
            return true;
        }
        
        if (normalizedFilterQuality === 'COMMON' && normalizedNftQuality === '0') {
            return true;
        }
        
        return false;
    }
    
    /**
     * get the quality name
     * @param {string} qualityId - quality ID
     * @returns {string} quality name
     */
    function getQualityName(qualityId) {
        const qualityMap = {
            'COMMON': 'COMMON',
            'GOOD': 'GOOD',
            'EXCELLENT': 'EXCELLENT',
            'RARE': 'RARE',
            'LEGENDARY': 'LEGENDARY',
            'all': 'all'
        };
        
        return qualityMap[qualityId] || 'unknown';
    }
    
    /**
     * initialize the NFTFeedingManager contract
     */
    function initNFTFeedingManagerContract() {
        console.log('开始初始化NFTFeedingManager合约...');
        
        // check if the necessary components are loaded
        if (!window.initNFTFeedingManagerContract) {
            console.error('failed to initialize the NFTFeedingManager contract: initNFTFeedingManagerContract is not defined');
            return;
        }
        
        if (!window.NFTFeedingManagerABI) {
            console.error('failed to initialize the NFTFeedingManager contract: NFTFeedingManagerABI is not defined');
            return;
        }
        
        if (!window.web3) {
            console.error('failed to initialize the NFTFeedingManager contract: web3 is not defined');
            return;
        }
        
        try {
            // use the script provided Initialization function to create a contract instance
            console.log('call window.initNFTFeedingManagerContract to initialize the contract...');
            window.nftFeedingManagerContract = window.initNFTFeedingManagerContract(
                window.web3, 
                window.getContractAddress
            );
            
            if (window.nftFeedingManagerContract) {
                console.log('NFTFeedingManager contract initialized successfully, contract address:', 
                    window.nftFeedingManagerContract.options.address);
                
                // use the script provided getNFTFeedingInfo function
                console.log('set the getNFTFeedingInfo function...');
                if (typeof window.getNFTFeedingInfo === 'function') {
                    // use the defined function
                    console.log('use the script provided getNFTFeedingInfo function');
                } else {
                    // define the function to get the NFT feeding info
                    window.getNFTFeedingInfo = async function(contract, tokenId) {
                        try {
                            console.log(`try to get the NFT #${tokenId} feeding info from the contract...`);
                            
                            // first try to use the nftFeeding mapping to get the info
                            if (contract.methods.nftFeeding) {
                                console.log(`use the nftFeeding(${tokenId}) method to get the info`);
                                const feedingInfo = await contract.methods.nftFeeding(tokenId).call();
                                console.log(`the original feeding data of NFT #${tokenId}:`, JSON.stringify(feedingInfo, null, 2));
                                return feedingInfo;
                            }
                            
                            // if there is no nftFeeding method, try to use the getNFTFeedingInfo method
                            if (contract.methods.getNFTFeedingInfo) {
                                console.log(`use the getNFTFeedingInfo(${tokenId}) method to get the info`);
                                const feedingInfo = await contract.methods.getNFTFeedingInfo(tokenId).call();
                                console.log(`the original feeding data of NFT #${tokenId}:`, JSON.stringify(feedingInfo, null, 2));
                                return feedingInfo;
                            }
                            
                            console.error(`failed to get the NFT #${tokenId} feeding info: the contract has no available query method`);
                            return null;
                        } catch (error) {
                            console.error(`failed to get the NFT #${tokenId} feeding info:`, error);
                            console.error('error stack:', error.stack);
                            return null;
                        }
                    };
                    console.log('the custom getNFTFeedingInfo function has been defined');
                }
                
                // try to initialize the NFTFeedingManagerContract class instance
                if (window.NFTFeedingManagerContract) {
                    try {
                        console.log('try to create the NFTFeedingManagerContract instance...');
                        window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                        console.log('NFTFeedingManagerContract instance created successfully');
                    } catch (contractError) {
                        console.error('failed to create the NFTFeedingManagerContract instance:', contractError);
                    }
                } else {
                    console.log('NFTFeedingManagerContract class is not available, check if NFTFeedingManager.js has been loaded');
                    
                    // check if NFTFeedingManager.js has been loaded, if not, try to load it
                    if (!document.querySelector('script[src*="NFTFeedingManager.js"]')) {
                        console.log('try to load the NFTFeedingManager.js dynamically...');
                        const script = document.createElement('script');
                        script.src = '../../scripts/contracts/NFTFeedingManager.js';
                        script.onload = function() {
                            console.log('NFTFeedingManager.js loaded successfully, try to create the instance');
                            if (window.NFTFeedingManagerContract && window.web3) {
                                try {
                                    window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                                    console.log('successfully created the NFTFeedingManagerContract instance after delayed loading');
                                } catch (delayedError) {
                                    console.error('failed to create the NFTFeedingManagerContract instance after delayed loading:', delayedError);
                                }
                            } else {
                                console.error('even though NFTFeedingManager.js has been loaded, the NFTFeedingManagerContract class is still not available');
                            }
                        };
                        script.onerror = function() {
                            console.error('failed to load the NFTFeedingManager.js');
                        };
                        document.head.appendChild(script);
                    }
                }
                
                // test if the contract can work normally
                testNFTFeedingManagerContract();
            } else {
                console.error('failed to initialize the NFTFeedingManager contract: return null');
            }
        } catch (error) {
            console.error('failed to initialize the NFTFeedingManager contract:', error);
            console.error('error stack:', error.stack);
        }
    }
    
    /**
     * test the NFTFeedingManager contract
     */
    async function testNFTFeedingManagerContract() {
        if (!window.nftFeedingManagerContract) {
            console.log('failed to test the NFTFeedingManager contract: the contract is not initialized');
            return;
        }
        
        try {
            // try to get some constants or status variables from the contract
            console.log('test the NFTFeedingManager contract...');
            
            // get the default feeding hours
            if (window.nftFeedingManagerContract.methods.DEFAULT_FEEDING_HOURS) {
                const defaultHours = await window.nftFeedingManagerContract.methods.DEFAULT_FEEDING_HOURS().call();
                console.log('DEFAULT_FEEDING_HOURS:', defaultHours);
            } else {
                console.log('DEFAULT_FEEDING_HOURS method is not available');
            }
            
            // get the maximum feeding hours
            if (window.nftFeedingManagerContract.methods.MAX_FEEDING_HOURS) {
                const maxHours = await window.nftFeedingManagerContract.methods.MAX_FEEDING_HOURS().call();
                console.log('MAX_FEEDING_HOURS:', maxHours);
            } else {
                console.log('MAX_FEEDING_HOURS method is not available');
            }
            
            // list all the available methods
            console.log('available contract methods:');
            for (const methodName in window.nftFeedingManagerContract.methods) {
                if (typeof window.nftFeedingManagerContract.methods[methodName] === 'function' && 
                    methodName !== 'constructor' && !methodName.startsWith('0x')) {
                    console.log(`- ${methodName}`);
                }
            }
            
            console.log('NFTFeedingManager contract test completed');
        } catch (error) {
            console.error('failed to test the NFTFeedingManager contract:', error);
        }
    }
    
    /**
     * load the NFT pet data
     */
    function loadNFTPets() {
        console.log('load the NFT pet data...');
        
        // get the user address
        const userAddress = localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
        
        if (userAddress && window.PetNFTService) {
            // show a more beautiful loading indicator
            if (petsGrid) {
                petsGrid.innerHTML = `
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>${window.i18n ? window.i18n.t('pets.loading') : 'loading your pets...'}</p>
                        <p class="loading-subtext">${window.i18n ? window.i18n.t('pets.loadingHint') : 'the first loading may take a long time'}</p>
                    </div>
                `;
                
                // add styles to the loading-indicator
                const loadingIndicator = petsGrid.querySelector('.loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'flex';
                    loadingIndicator.style.flexDirection = 'column';
                    loadingIndicator.style.alignItems = 'center';
                    loadingIndicator.style.justifyContent = 'center';
                    loadingIndicator.style.minHeight = '300px';
                    loadingIndicator.style.width = '100%';
                    loadingIndicator.style.padding = '20px';
                    
                    const spinner = loadingIndicator.querySelector('.spinner');
                    if (spinner) {
                        spinner.style.width = '50px';
                        spinner.style.height = '50px';
                        spinner.style.border = '5px solid #f3f3f3';
                        spinner.style.borderTop = '5px solid #3498db';
                        spinner.style.borderRadius = '50%';
                        spinner.style.animation = 'spin 1s linear infinite';
                        
                        // add animation
                        const styleSheet = document.createElement('style');
                        styleSheet.textContent = `
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `;
                        document.head.appendChild(styleSheet);
                    }
                    
                    const loadingSubtext = loadingIndicator.querySelector('.loading-subtext');
                    if (loadingSubtext) {
                        loadingSubtext.style.marginTop = '10px';
                        loadingSubtext.style.fontSize = '0.9rem';
                        loadingSubtext.style.color = '#777';
                    }
                }
            }
            
            // try to get the data from the cache first
            const cachedNFTs = window.PetNFTService.getCachedNFTs({
                userAddress: userAddress
            });
            
            if (cachedNFTs && cachedNFTs.length > 0) {
                console.log(`loaded ${cachedNFTs.length} NFT pets from the cache`);
                // preprocess and prepare the data
                prepareNFTDataBeforeDisplay(cachedNFTs, true);
                
                // refresh the NFT data in the background
                setTimeout(() => {
                    console.log('refreshing the NFT data in the background...');
                    window.PetNFTService.refreshNFTs(userAddress, { skipIntervalCheck: true })
                        .then(result => {
                            if (result.success && result.nfts && result.nfts.length > 0) {
                                console.log(`refreshed the NFT data in the background, got ${result.nfts.length} NFTs`);
                                prepareNFTDataBeforeDisplay(result.nfts, false);
                            }
                        })
                        .catch(error => {
                            console.error('failed to refresh the NFT data in the background:', error);
                        });
                }, 1000);
            } else {
                // no NFT data in the cache, refresh to get
                console.log('no NFT data in the cache, refresh to get');
                window.PetNFTService.refreshNFTs(userAddress)
                    .then(result => {
                        console.log('NFT refresh result:', result);
                        if (result.success && result.nfts && result.nfts.length > 0) {
                            console.log(`successfully got ${result.nfts.length} NFTs`);
                            prepareNFTDataBeforeDisplay(result.nfts, true);
                        } else {
                            showNoNFTsMessage();
                        }
                    })
                    .catch(error => {
                        console.error('failed to refresh the NFT data:', error);
                        showNoNFTsMessage();
                    });
            }
        } else {
            // the user wallet is not connected or the PetNFTService is not available
            console.log('the user wallet is not connected or the PetNFTService is not available');
            if (petsGrid) {
                showWalletNotConnectedMessage();
            }
        }
    }
    
    /**
     * preprocess the NFT data, then display
     * @param {Array} nfts - NFT data array
     * @param {boolean} applyFilter - whether to apply the quality filter, default is true
     */
    function prepareNFTDataBeforeDisplay(nfts, applyFilter = true) {
        console.log(`start to preprocess ${nfts.length} NFT data...`);
        
        // show the loading status
        updateLoadingMessage('preparing the NFT data...');
        
        // build a promise array, for processing the data preparation of each NFT
        const preparePromises = nfts.map(async (nft, index) => {
            try {
                // preload the metadata image resource for each NFT
                if (nft.metadata && nft.metadata.image) {
                    try {
                        // preload the image
                        await preloadImage(nft.metadata.image);
                        console.log(`NFT #${nft.tokenId} image preloaded`);
                    } catch (imgError) {
                        console.warn(`NFT #${nft.tokenId} image preload failed:`, imgError);
                        // continue to process, not block the display
                    }
                }
                
                // get the feeding info
                if (!nft.feedingInfo && window.getNFTFeedingInfo && window.nftFeedingManagerContract) {
                    try {
                        // update the loading message
                        if (index === 0 || index === Math.floor(nfts.length / 2)) {
                            updateLoadingMessage(`getting the feeding info of the pet (${index+1}/${nfts.length})...`);
                        }
                        
                        // get the pet feeding info
                        const feedingInfo = await window.getNFTFeedingInfo(
                            window.nftFeedingManagerContract, 
                            nft.tokenId
                        );
                        
                        if (feedingInfo) {
                            nft.feedingInfo = feedingInfo;
                            console.log(`successfully got the feeding info of NFT #${nft.tokenId}`);
                        }
                    } catch (feedingError) {
                        console.warn(`failed to get the feeding info of NFT #${nft.tokenId}:`, feedingError);
                        // continue to process, not block the display
                    }
                }
                
                return nft;
            } catch (error) {
                console.error(`failed to process NFT #${nft.tokenId || index}:`, error);
                return nft; // even if there is an error, return the original NFT
            }
        });
        
        // wait for all the preprocess to complete
        Promise.all(preparePromises)
            .then(preparedNFTs => {
                console.log(`all the NFT data preprocess completed, ready to display ${preparedNFTs.length} pets`);
                updateLoadingMessage('ready to display the pets...');
                
                // after the preprocess is completed, display the NFT
                setTimeout(() => {
                    displayNFTPets(preparedNFTs, applyFilter);
                }, 300); // a brief delay to ensure the UI update
            })
            .catch(error => {
                console.error('failed to preprocess the NFT data:', error);
                // even if there is an error, still try to display the NFT
                displayNFTPets(nfts, applyFilter);
            });
    }
    
    /**
     * preload the image
     * @param {string} url - the image URL
     * @returns {Promise} the image loading Promise
     */
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }
    
    /**
     * update the loading message
     * @param {string} message - the loading message
     */
    function updateLoadingMessage(message) {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            const messageElement = loadingIndicator.querySelector('p:not(.loading-subtext)');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
    
    /**
     * display the NFT pet card
     * @param {Array} nfts - the NFT data array
     * @param {boolean} applyFilter - whether to apply the quality filter, default is true
     */
    function displayNFTPets(nfts, applyFilter = true) {
        // remove the loading indicator
        const loadingIndicator = petsGrid.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            }, 300);
        }
        
        if (!nfts || nfts.length === 0) {
            showNoNFTsMessage();
            return;
        }
        
        // sort the NFTs (if there is a selected sorting method)
        if (sortSelect && sortSelect.value) {
            nfts = sortNFTs(nfts, sortSelect.value);
        }
        
        // save all the NFT data
        allNFTs = [...nfts];
        totalNFTs = nfts.length;
        
        // if there is a saved quality filter and need to apply the filter, then apply the filter
        if (applyFilter && currentQualityFilter !== 'all') {
            console.log(`apply the saved quality filter: ${currentQualityFilter}`);
            filterPetsByQuality();
            return; // filterPetsByQuality will handle the display and pagination
        }
        
        // display the NFTs in pagination
        displayPaginatedNFTs();
        
        // update the pagination controls
        updatePaginationControls();
    }
    
    /**
     * display the NFTs in the current page
     */
    function displayPaginatedNFTs() {
        // clear the existing pet cards
        petsGrid.innerHTML = '';
        
        // calculate the NFTs in the current page
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalNFTs);
        const currentPageNFTs = allNFTs.slice(startIndex, endIndex);
        
        console.log(`display the NFTs in the current page ${currentPage}, got ${currentPageNFTs.length} pets, current quality filter: ${currentQualityFilter}`);
        
        // use the game mode pet card to create the pet cards
        currentPageNFTs.forEach(nft => {
            if (window.GamePetCard) {
                console.log(`processing the pet card creation of NFT #${nft.tokenId}...`);
                
                // preprocess the quality information, ensure the card and the filter logic use the same quality value
                let correctQuality = 'COMMON'; // default quality
                if (nft.metadata && nft.metadata.attributes) {
                    const qualityAttr = nft.metadata.attributes.find(attr => 
                        attr.trait_type === 'Quality' || 
                        attr.trait_type === 'Rarity' || 
                        attr.trait_type === 'quality' || 
                        attr.trait_type === 'rarity'
                    );
                    if (qualityAttr) {
                        correctQuality = String(qualityAttr.value).toUpperCase();
                        // record the current NFT's quality information
                        console.log(`NFT #${nft.tokenId} original quality value: "${qualityAttr.value}", normalized: "${correctQuality}"`);
                    }
                }
                
                // temporary save the correct quality to the NFT object, ensure the card creation use the correct quality
                // note: use the NFT's original quality in the all mode, and apply the current filter quality in the specific quality filter mode
                nft.normalizedQuality = currentQualityFilter !== 'all' ? currentQualityFilter : correctQuality;
                
                // check if there is feeding info, if not, try to get from the NFTFeedingManager contract
                if (!nft.feedingInfo && window.getNFTFeedingInfo && window.nftFeedingManagerContract) {
                    console.log(`NFT #${nft.tokenId} has no feeding info, try to get from the contract...`);
                    
                    try {
                        // get the feeding info asynchronously, but not block the UI rendering
                        window.getNFTFeedingInfo(window.nftFeedingManagerContract, nft.tokenId)
                            .then(feedingInfo => {
                                if (feedingInfo) {
                                    console.log(`successfully got the feeding info of NFT #${nft.tokenId}:`, feedingInfo);
                                    
                                    // add the feeding info to the NFT data
                                    nft.feedingInfo = feedingInfo;
                                    console.log(`successfully added the feeding info to the NFT #${nft.tokenId} data`);
                                    
                                    // find the corresponding card and update the feeding hours display
                                    const petCards = document.querySelectorAll('.game-pet-card');
                                    console.log(`find the corresponding card of NFT #${nft.tokenId}, got ${petCards.length} cards`);
                                    
                                    let found = false;
                                    for (const card of petCards) {
                                        if (card.dataset.tokenId === nft.tokenId) {
                                            console.log(`find the corresponding card of NFT #${nft.tokenId}, start to update the feeding hours`);
                                            found = true;
                                            
                                            // calculate the real feeding hours
                                            // note: not use the non-existent method, use the feedingInfo.feedingHours directly
                                            const realFeedingHours = parseInt(feedingInfo.feedingHours) || 0;
                                            console.log(`NFT #${nft.tokenId} real feeding hours: ${realFeedingHours} hours`);
                                            
                                            // update the feeding hours display
                                            window.GamePetCard.updatePetSatiety(card, realFeedingHours);
                                            console.log(`NFT #${nft.tokenId} feeding hours display updated to ${realFeedingHours} hours`);
                                        }
                                    }
                                    
                                    if (!found) {
                                        console.log(`cannot find the corresponding card of NFT #${nft.tokenId}, cannot update the feeding hours`);
                                    }
                                } else {
                                    console.log(`cannot get the valid feeding info of NFT #${nft.tokenId}`);
                                }
                            })
                            .catch(error => {
                                console.error(`failed to get the feeding info of NFT #${nft.tokenId}:`, error);
                            });
                    } catch (error) {
                        console.error(`failed to process the feeding info of NFT #${nft.tokenId}:`, error);
                    }
                } else if (nft.feedingInfo) {
                    console.log(`NFT #${nft.tokenId} already has the feeding info:`, nft.feedingInfo);
                } else {
                    console.log(`NFT #${nft.tokenId} cannot get the feeding info, the contract or the method is not available`);
                }
                
                // use the game mode pet card component
                const card = window.GamePetCard.appendCardToContainer(nft, petsGrid);
                console.log(`NFT #${nft.tokenId} pet card created and added to the page`);
                
                // ensure the card has the quality data attribute, for filtering
                if (card) {
                    // set the quality data attribute
                    // in the all mode, use the NFT's original quality, in the specific quality filter mode, use the current filter quality
                    const qualityToUse = currentQualityFilter !== 'all' ? currentQualityFilter : correctQuality;
                    card.dataset.quality = qualityToUse;
                    
                    // check if the displayed quality in the card element is consistent with the expected quality
                    const rarityElement = card.querySelector('.game-pet-rarity');
                    if (rarityElement) {
                        const displayedQuality = rarityElement.textContent;
                        
                        // get the expected quality name according to the quality to use
                        const expectedQualityName = getQualityName(qualityToUse);
                        
                        console.log(`NFT #${nft.tokenId} card displayed quality: "${displayedQuality}", expected: "${expectedQualityName}"`);
                        
                        // if the displayed quality is not consistent with the expected quality, force update
                        if (displayedQuality !== expectedQualityName) {
                            rarityElement.textContent = expectedQualityName;
                            console.log(`NFT #${nft.tokenId} quality display updated to: "${expectedQualityName}"`);
                        }
                        
                        // handle the case of inconsistent quality class styles
                        const rarityClass = card.className.split(' ').find(cls => 
                            ['common', 'good', 'excellent', 'purple-rare', 'legendary', 'uncommon'].includes(cls)
                        );
                        
                        // get the correct style class
                        const correctClass = getQualityClass(qualityToUse);
                        
                        // if the style class is not matched, update the style class
                        if (rarityClass !== correctClass) {
                            console.log(`NFT #${nft.tokenId} card style class not matched: current="${rarityClass}", expected="${correctClass}"`);
                            
                            // remove all the quality related classes
                            ['common', 'good', 'excellent', 'purple-rare', 'legendary', 'uncommon'].forEach(cls => {
                                if (card.classList.contains(cls)) {
                                    card.classList.remove(cls);
                                }
                            });
                            
                            // add the correct class
                            card.classList.add(correctClass);
                            console.log(`NFT #${nft.tokenId} card style class updated to: "${correctClass}"`);
                        }
                    }
                    
                    console.log(`NFT #${nft.tokenId} card data attributes:`, {
                        tokenId: card.dataset.tokenId,
                        feedingHours: card.dataset.feedingHours,
                        contractAddress: card.dataset.contractAddress,
                        quality: card.dataset.quality
                    });
                }
            } else {
                console.error('GamePetCard component is not available');
            }
        });
        
        // remove the code that applies the quality filter again after the page is flipped, this will cause the quality display problem in the all quality mode after flipping the page
        // if the quality filter is needed, it will be handled by the filterPetsByQuality function when the page quality tag is clicked
        // if (currentQualityFilter !== 'all') {
        //     filterPetsByQuality();
        // }
    }
    
    /**
     * update the pagination controls
     */
    function updatePaginationControls() {
        // calculate the total pages
        const totalPages = Math.ceil(totalNFTs / pageSize);
        
        // update the page number information
        if (paginationInfo) {
            const startIndex = (currentPage - 1) * pageSize + 1;
            const endIndex = Math.min(startIndex + pageSize - 1, totalNFTs);
            paginationInfo.textContent = `${startIndex}-${endIndex} / ${totalNFTs}`;
        }
        
        // update the page number links
        if (paginationLinks) {
            paginationLinks.innerHTML = '';
            
            // decide which pages to display
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            // adjust, ensure always display 5 pages (if there are enough pages)
            if (endPage - startPage < 4 && totalPages > 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            console.log(`pagination controls: total pages=${totalPages}, current page=${currentPage}, displayed page range=${startPage}-${endPage}`);
            
            // generate the page number links
            for (let i = startPage; i <= endPage; i++) {
                const pageItem = document.createElement('span');
                pageItem.className = `page-item${i === currentPage ? ' active' : ''}`;
                
                const pageLink = document.createElement('a');
                pageLink.className = 'page-link';
                pageLink.textContent = i;

                pageLink.addEventListener('click', () => {
                    console.log(`click the page number button: ${i}, current quality filter: ${currentQualityFilter}`);
                    currentPage = i;
                    
                    // decide what to display based on whether the current is in the filtering mode
                    if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                        displayFilteredNFTs();
                    } else {
                        displayPaginatedNFTs();
                    }
                    
                    updatePaginationControls();
                });
                
                pageItem.appendChild(pageLink);
                paginationLinks.appendChild(pageItem);
            }
        }
        
        // update the previous and next page button status
        if (prevPageBtn && prevPageBtn.parentElement) {
            if (currentPage <= 1) {
                prevPageBtn.parentElement.classList.add('disabled');
            } else {
                prevPageBtn.parentElement.classList.remove('disabled');
            }
        }
        
        if (nextPageBtn && nextPageBtn.parentElement) {
            if (currentPage >= totalPages) {
                nextPageBtn.parentElement.classList.add('disabled');
            } else {
                nextPageBtn.parentElement.classList.remove('disabled');
            }
        }

        if (prevPageBtn) {
            // remove the existing event listener
            prevPageBtn.replaceWith(prevPageBtn.cloneNode(true));
            // get the button reference again
            prevPageBtn = document.getElementById('prevPageBtn');
            
            // add the new event listener
            prevPageBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    console.log(`click the previous page button, jump to the page ${currentPage}, current quality filter: ${currentQualityFilter}`);
                    
                    // decide what to display based on whether the current is in the filtering mode
                    if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                        displayFilteredNFTs();
                    } else {
                        displayPaginatedNFTs();
                    }
                    
                    updatePaginationControls();
                }
            });
        }
        
        if (nextPageBtn) {
            // remove the existing event listener
            nextPageBtn.replaceWith(nextPageBtn.cloneNode(true));
            // get the button reference again
            nextPageBtn = document.getElementById('nextPageBtn');
            
            // add the new event listener
            nextPageBtn.addEventListener('click', function() {
                const totalPages = Math.ceil(totalNFTs / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    console.log(`click the next page button, jump to the page ${currentPage}, current quality filter: ${currentQualityFilter}`);
                    
                    // decide what to display based on whether the current is in the filtering mode
                    if (currentQualityFilter !== 'all' && window.filteredNFTsByQuality) {
                        displayFilteredNFTs();
                    } else {
                        displayPaginatedNFTs();
                    }
                    
                    updatePaginationControls();
                }
            });
        }
        
        // display/hide the pagination controls
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            if (totalNFTs <= pageSize) {
                paginationContainer.style.display = 'none';
                console.log('hide the pagination controls - not enough data for one page');
            } else {
                paginationContainer.style.display = 'flex';
                console.log('display the pagination controls - multiple pages of data');
            }
        } else {
            console.error('cannot find the pagination container element');
        }
    }
    
    /**
     * sort the NFTs by the type
     * @param {Array} nfts - the NFT data array
     * @param {string} sortType - the sort type
     * @returns {Array} the sorted NFT array
     */
    function sortNFTs(nfts, sortType) {
        return [...nfts].sort((a, b) => {
        switch (sortType) {
            case 'level-desc':
                    return (getAttributeValue(b, 'level') || 0) - (getAttributeValue(a, 'level') || 0);
                
            case 'level-asc':
                    return (getAttributeValue(a, 'level') || 0) - (getAttributeValue(b, 'level') || 0);
                
            case 'rarity-desc':
                    return getRarityValue(b) - getRarityValue(a);
                
            case 'rarity-asc':
                    return getRarityValue(a) - getRarityValue(b);
                    
                default:
                    return 0;
            }
        });
    }
    
    /**
     * get the attribute value from the NFT
     * @param {Object} nft - the NFT data
     * @param {string} traitType - the attribute type
     * @returns {number|null} the attribute value
     */
    function getAttributeValue(nft, traitType) {
        if (!nft.metadata || !nft.metadata.attributes) return null;
        
        const attribute = nft.metadata.attributes.find(
            attr => attr.trait_type.toLowerCase() === traitType.toLowerCase()
        );
        
        return attribute ? parseInt(attribute.value) : null;
    }
    
    /**
     * get the rarity value from the NFT
     * @param {Object} nft - the NFT data
     * @returns {number} the rarity value
     */
    function getRarityValue(nft) {
        if (!nft.metadata || !nft.metadata.attributes) return 1;
        
        const rarityAttr = nft.metadata.attributes.find(attr => 
            attr.trait_type.toLowerCase() === 'rarity' || 
            attr.trait_type.toLowerCase() === 'quality'
        );
        
        if (!rarityAttr) return 1;
        
        const value = rarityAttr.value.toLowerCase();
        if (value.includes('legendary') || value.includes('Legendary')) return 4;
        if (value.includes('rare') || value.includes('Rare')) return 3;
        if (value.includes('uncommon') || value.includes('Uncommon')) return 2;
        return 1;
    }
    
    /**
     * show the no NFT message
     */
    function showNoNFTsMessage() {
        // remove the loading indicator
        const loadingIndicator = petsGrid.querySelector('.loading-indicator');
        if (loadingIndicator) {
            petsGrid.removeChild(loadingIndicator);
        }
        
        // clear the pet grid
        petsGrid.innerHTML = '';
        
        // create the no NFT message
        const noNFTsMessage = document.createElement('div');
        noNFTsMessage.className = 'no-pets-message';
        noNFTsMessage.innerHTML = `
            <div class="no-pets-icon">🐾</div>
            <h3>${window.i18n ? window.i18n.t('pets.noPets') : 'You have no pets yet'}</h3>
            <p>${window.i18n ? window.i18n.t('pets.noPetsDesc') : 'Visit the shop to buy your first pet NFT!'}</p>
            <a href="shop.html" class="adopt-pet-btn">${window.i18n ? window.i18n.t('navigation.shop') : 'Visit the shop'}</a>
        `;
        petsGrid.appendChild(noNFTsMessage);
        
        // hide the pagination controls
        hidePaginationControls();
        
        // reset the pagination variables
        totalNFTs = 0;
        allNFTs = [];
    }
    
    /**
     * show the wallet not connected message
     */
    function showWalletNotConnectedMessage() {
        // remove the loading indicator
        const loadingIndicator = petsGrid.querySelector('.loading-indicator');
        if (loadingIndicator) {
            petsGrid.removeChild(loadingIndicator);
        }
        
        // clear the pet grid
        petsGrid.innerHTML = '';
        
        // create the not connected wallet message
        const notConnectedMessage = document.createElement('div');
        notConnectedMessage.className = 'no-pets-message';
        notConnectedMessage.innerHTML = `
            <img src="../../resources/images/wallet/wallet_disconnected.png" alt="${window.i18n ? window.i18n.t('wallet.notConnected') : 'Wallet not connected'}" />
            <h3>${window.i18n ? window.i18n.t('wallet.notConnected') : 'Wallet not connected'}</h3>
            <p>${window.i18n ? window.i18n.t('wallet.connectToView') : 'Connect your wallet to view your pet NFTs'}</p>
            <button class="connect-wallet-btn-large">${window.i18n ? window.i18n.t('wallet.connect') : 'Connect wallet'}</button>
        `;
        
        // bind the connect wallet button click event
        const connectButton = notConnectedMessage.querySelector('.connect-wallet-btn-large');
        if (connectButton) {
            connectButton.addEventListener('click', () => {
                // send the connect wallet request to the parent page
                window.parent.postMessage({
                    type: 'action',
                    action: 'connectWallet'
                }, '*');
            });
        }
        
        petsGrid.appendChild(notConnectedMessage);
        
        // hide the pagination controls
        hidePaginationControls();
        
        // reset the pagination variables
        totalNFTs = 0;
        allNFTs = [];
    }
    
    /**
     * hide the pagination controls
     */
    function hidePaginationControls() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
            console.log('hide the pagination controls - no matching pets');
        }
    }
    
    /**
     * bind the game pet card events
     */
    function bindPetCardEvents() {
        // use the GamePetCard component to bind the global events
        if (window.GamePetCard) {
            window.GamePetCard.bindGlobalEvents({
                onAction: function(data) {
                    console.log('pet action:', data);
                    
                    // execute the corresponding action based on the action type
                    switch (data.action) {
                            case 'feed':
                            handleFeedAction(data.tokenId, data.contractAddress, data.element);
                                break;
                    }
                }
            });
        }
    }
    
    /**
     * handle the feed action
     * this function now interacts with the NFTFeedingManager.sol contract, using the real blockchain feeding function
     */
    function handleFeedAction(petId, contractAddress, petCard) {
        console.log(`feed the pet: ${petId} (contract: ${contractAddress})`);
        
        if (!petCard || !window.GamePetCard) return;
        
        // get the current feeding hours and the user input feed hours
        const currentFeedingHours = parseInt(petCard.dataset.feedingHours) || 0;
        const feedHours = parseInt(petCard.dataset.feedHours) || 0; // modify: remove the default 24 hours, only use the user input feed hours
        
        console.log(`current feeding hours: ${currentFeedingHours}, feed hours: ${feedHours}`);
        
        // calculate the maximum feedable hours
        const maxFeedingHours = window.GamePetCard.MAX_FEEDING_HOURS;
        const maxFeedHours = maxFeedingHours - currentFeedingHours;
        const actualFeedHours = Math.min(feedHours, maxFeedHours);
        
        // if the pet has reached the maximum feeding time or there is no actual feeding, do not execute the operation
        if (maxFeedHours <= 0 || actualFeedHours <= 0) {
            console.log("the pet is full, cannot feed anymore!");
            window.GamePetCard.showFeedingMessage(petCard, "the pet is full, cannot feed anymore!", "error");
            return;
        }
        
        console.log(`prepare to feed: ${actualFeedHours} hours, max feeding hours: ${maxFeedingHours}`);
        
        // get the user address
        const userAddress = localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
        if (!userAddress) {
            console.error('feed failed: wallet not connected');
            window.GamePetCard.showFeedingMessage(petCard, "feed failed: wallet not connected", "error");
            return;
        }
        
        // check if the NFTFeedingManager contract is initialized
        if (!window.nftFeedingManagerContract) {
            console.error('feed failed: NFTFeedingManager contract not initialized');
            window.GamePetCard.showFeedingMessage(petCard, "feed failed: contract not initialized", "error");
            return;
        }
        
        // show the processing message
        window.GamePetCard.showFeedingMessage(petCard, "processing the feed request...", "info");
        
        // first check if the NFTFeedingManagerContract class instance exists
        if (!window.feedingManagerContract) {
            console.log('NFTFeedingManagerContract instance does not exist, try to initialize');
            if (window.NFTFeedingManagerContract && window.web3) {
                try {
                    window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                    console.log('successfully created the NFTFeedingManagerContract instance');
                } catch (error) {
                    console.error('failed to create the NFTFeedingManagerContract instance:', error);
                    window.GamePetCard.showFeedingMessage(petCard, "failed to create the contract instance", "error");
                    return;
                }
            } else {
                // try to load the NFTFeedingManagerContract class dynamically
                console.log('try to load the NFTFeedingManagerContract class dynamically');
                try {
                    // check if the script has been loaded
                    if (!document.querySelector('script[src*="NFTFeedingManager.js"]')) {
                        // create and load the script
                        const script = document.createElement('script');
                        script.src = '../../scripts/contracts/NFTFeedingManager.js';
                        script.onload = function() {
                            console.log('NFTFeedingManager.js loaded successfully, try to create the instance');
                            if (window.NFTFeedingManagerContract && window.web3) {
                                try {
                                    window.feedingManagerContract = new window.NFTFeedingManagerContract(window.web3);
                                    // trigger the feed action again
                                    handleFeedAction(petId, contractAddress, petCard);
                                } catch (error) {
                                    console.error('failed to create the NFTFeedingManagerContract instance:', error);
                                    window.GamePetCard.showFeedingMessage(petCard, "failed to create the contract instance", "error");
                                }
                                return;
                            } else {
                                window.GamePetCard.showFeedingMessage(petCard, "failed to initialize the feed contract", "error");
                            }
                        };
                        script.onerror = function() {
                            console.error('failed to load the NFTFeedingManager.js');
                            window.GamePetCard.showFeedingMessage(petCard, "failed to load the feed contract", "error");
                        };
                        document.head.appendChild(script);
                        return; // wait for the script to be loaded
                    } else {
                        // the script has been loaded but the class does not exist, create a temporary wrapper object
                        console.log('use the initialized basic contract instance, create a temporary wrapper object');
                        window.feedingManagerContract = {
                            feedNFT: async function(tokenId, hours, userAddress) {
                                try {
                                    // check if the approval is needed
                                    if (window.ContractApprovalManager) {
                                        // get the PWFOOD token contract
                                        const pwfoodAddress = window.getContractAddress('PwFood');
                                        if (!pwfoodAddress) {
                                            return { success: false, error: 'failed to get the PWFOOD contract address' };
                                        }
                                        
                                        // create the PWFOOD contract instance
                                        const erc20ABI = window.GENERIC_ERC20_ABI || [
                                            {
                                                "constant": true,
                                                "inputs": [{"name": "owner", "type": "address"}],
                                                "name": "balanceOf",
                                                "outputs": [{"name": "", "type": "uint256"}],
                                                "type": "function"
                                            },
                                            {
                                                "constant": false,
                                                "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}],
                                                "name": "approve",
                                                "outputs": [{"name": "", "type": "bool"}],
                                                "type": "function"
                                            },
                                            {
                                                "constant": true,
                                                "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
                                                "name": "allowance",
                                                "outputs": [{"name": "", "type": "uint256"}],
                                                "type": "function"
                                            }
                                        ];
                                        
                                        const pwfoodContract = new window.web3.eth.Contract(erc20ABI, pwfoodAddress);
                                        
                                        // check the approval and balance status
                                        const approvalStatus = await window.ContractApprovalManager.checkIfApprovalNeeded(
                                            pwfoodContract,
                                            userAddress,
                                            window.nftFeedingManagerContract.options.address,
                                            hours.toString()
                                        );
                                        
                                        // check the balance
                                        if (approvalStatus.sufficientFunds === false) {
                                            return {
                                                success: false,
                                                error: 'PWFOOD token balance is insufficient',
                                                requiredAmount: hours,
                                                balance: approvalStatus.balance
                                            };
                                        }
                                        
                                        // check the approval
                                        if (approvalStatus.needsApproval) {
                                            return {
                                                success: false,
                                                needApproval: true,
                                                error: 'need to approve the PWFOOD token',
                                                requiredAmount: hours,
                                                allowance: approvalStatus.currentAllowance,
                                                pwfoodContract: pwfoodContract,
                                                feedingManagerAddress: window.nftFeedingManagerContract.options.address
                                            };
                                        }
                                    }
                                    
                                    // directly call the feedNFT method of the contract
                                    const gasEstimate = await window.nftFeedingManagerContract.methods.feedNFT(tokenId, hours).estimateGas({
                                        from: userAddress
                                    });
                                    
                                    const transaction = await window.nftFeedingManagerContract.methods.feedNFT(tokenId, hours).send({
                                        from: userAddress,
                                        gas: Math.floor(gasEstimate * 1.5) // increase 50% of the gas as a buffer
                                    });
                                    
                                    // after the feed is successful, get the latest feeding information
                                    let updatedFeedingInfo = null;
                                    try {
                                        if (window.getNFTFeedingInfo) {
                                            updatedFeedingInfo = await window.getNFTFeedingInfo(window.nftFeedingManagerContract, tokenId);
                                        }
                                    } catch (infoError) {
                                        console.error('failed to get the latest feeding information:', infoError);
                                    }
                                    
                                    return {
                                        success: true,
                                        transaction: transaction,
                                        tokenId: tokenId,
                                        hours: hours,
                                        feedingInfo: updatedFeedingInfo
                                    };
                                } catch (error) {
                                    console.error(`failed to feed the NFT(ID:${tokenId}):`, error);
                                    
                                    // extract the error message
                                    let errorMessage = error.message || 'failed to feed the NFT';
                                    
                                    // handle the common errors
                                    if (errorMessage.includes('execution reverted')) {
                                        if (error.data) {
                                            errorMessage = `failed to execute the contract: ${error.data}`;
                                        } else {
                                            errorMessage = "failed to execute the contract, possible reasons: 1) the NFT is not registered 2) the maximum feeding limit is exceeded";
                                        }
                                    } else if (errorMessage.includes('insufficient funds')) {
                                        errorMessage = 'the account balance is insufficient to pay the Gas fee';
                                    }
                                    
                                    return { success: false, error: errorMessage };
                                }
                            }
                        };
                    }
                } catch (loadError) {
                    console.error('failed to load or initialize the NFTFeedingManagerContract:', loadError);
                    window.GamePetCard.showFeedingMessage(petCard, "failed to initialize the feed contract", "error");
                    return;
                }
            }
        }
        
        // use the feedingManagerContract to feed the NFT
        window.feedingManagerContract.feedNFT(petId, actualFeedHours, userAddress)
            .then(result => {
                console.log('feed result:', result);
                
                if (result.success) {
                    // feed successfully, update the UI
                    console.log('feed successfully!');
                    
                    // get the latest feeding information
                    const newFeedingHours = result.feedingInfo ? 
                        parseInt(result.feedingInfo.feedingHours) : 
                        (currentFeedingHours + actualFeedHours);
                    
                    // update the satiety display
                    window.GamePetCard.updatePetSatiety(petCard, newFeedingHours);
                    
                    // update the feeding information in the NFT data
                    const nftIndex = allNFTs.findIndex(nft => nft.tokenId === petId);
                    if (nftIndex !== -1) {
                        const nft = allNFTs[nftIndex];
                        if (result.feedingInfo) {
                            nft.feedingInfo = result.feedingInfo;
                        } else if (nft.feedingInfo) {
                            nft.feedingInfo.feedingHours = newFeedingHours;
                            nft.feedingInfo.lastFeedTime = Math.floor(Date.now() / 1000);
                        }
                    }
                    
                    // show the success message
                    window.GamePetCard.showFeedingMessage(petCard, `feed successfully for ${actualFeedHours} hours`, "success");
                    
                    // send the event to the parent page
                    window.parent.postMessage({
                        type: 'petAction',
                        action: 'feed',
                        petId: petId,
                        contractAddress: contractAddress,
                        feedHours: actualFeedHours,
                        newFeedingHours: newFeedingHours,
                        transaction: result.transaction
                    }, '*');
                } else {
                    // handle different error cases
                    console.error('failed to feed:', result.error);
                    
                    if (result.needApproval) {
                        // need to approve the token
                        window.GamePetCard.showFeedingMessage(petCard, "need to approve the PWFOOD token, please confirm in the wallet", "info");
                        
                        // try to approve the token
                        if (result.pwfoodContract && result.feedingManagerAddress && window.ContractApprovalManager) {
                            window.ContractApprovalManager.approveERC20Token(
                                result.pwfoodContract, 
                                result.feedingManagerAddress, 
                                result.requiredAmount, 
                                userAddress,
                                true // use the maximum approval
                            ).then(approveResult => {
                                if (approveResult.success) {
                                    window.GamePetCard.showFeedingMessage(petCard, "approve successfully, please try to feed again", "success");
                                } else {
                                    window.GamePetCard.showFeedingMessage(petCard, "failed to approve: " + (approveResult.error || "unknown error"), "error");
                                }
                            }).catch(error => {
                                console.error('failed to approve:', error);
                                window.GamePetCard.showFeedingMessage(petCard, "failed to approve: " + (error || "unknown error"), "error");
                            });
                        } else {
                            window.GamePetCard.showFeedingMessage(petCard, "failed to execute the approval operation", "error");
                        }
                    } else if (result.error.includes('PWFOOD token balance is insufficient')) {
                        window.GamePetCard.showFeedingMessage(petCard, "PWFOOD token balance is insufficient", "error");
                    } else {
                        window.GamePetCard.showFeedingMessage(petCard, "failed to feed: " + result.error, "error");
                    }
                }
            })
            .catch(error => {
                console.error('failed to feed:', error);
                window.GamePetCard.showFeedingMessage(petCard, "failed to feed: " + (error || "unknown error"), "error");
            });
    }
    
    /**
     * update the pet stats
     */
    function updatePetStats(data) {
        const { petId, newStats } = data;
        if (!petId || !newStats) return;
        
        // update the data in allNFTs
        const nftIndex = allNFTs.findIndex(nft => nft.tokenId === petId);
        if (nftIndex !== -1) {
            // update the data in memory
            if (newStats.health !== undefined && allNFTs[nftIndex].metadata && allNFTs[nftIndex].metadata.attributes) {
                const healthAttr = allNFTs[nftIndex].metadata.attributes.find(attr => attr.trait_type.toLowerCase() === 'health');
                if (healthAttr) {
                    healthAttr.value = newStats.health;
                } else {
                    allNFTs[nftIndex].metadata.attributes.push({ trait_type: 'Health', value: newStats.health });
                }
            }
            
            if (newStats.energy !== undefined && allNFTs[nftIndex].metadata && allNFTs[nftIndex].metadata.attributes) {
                const energyAttr = allNFTs[nftIndex].metadata.attributes.find(attr => attr.trait_type.toLowerCase() === 'energy');
                if (energyAttr) {
                    energyAttr.value = newStats.energy;
                } else {
                    allNFTs[nftIndex].metadata.attributes.push({ trait_type: 'Energy', value: newStats.energy });
                }
            }
            
            if (newStats.mood !== undefined && allNFTs[nftIndex].metadata && allNFTs[nftIndex].metadata.attributes) {
                const moodAttr = allNFTs[nftIndex].metadata.attributes.find(attr => attr.trait_type.toLowerCase() === 'mood');
                if (moodAttr) {
                    moodAttr.value = newStats.mood;
                } else {
                    allNFTs[nftIndex].metadata.attributes.push({ trait_type: 'Mood', value: newStats.mood });
                }
            }
        }
        
        // find the corresponding pet card
        const petCards = document.querySelectorAll('.game-pet-card');
        let targetCard = null;
        
        petCards.forEach(card => {
            if (card.dataset.tokenId === petId) {
                targetCard = card;
            }
        });
        
        // if the card is found and the GamePetCard component is available, update the stats
        if (targetCard && window.GamePetCard) {
            window.GamePetCard.updatePetStats(targetCard, newStats);
        }
    }
    
    /**
     * handle the pet level up
     */
    function handlePetLevelUp(data) {
        const { petId, newLevel } = data;
        if (!petId || !newLevel) return;
        
        // update the data in allNFTs
        const nftIndex = allNFTs.findIndex(nft => nft.tokenId === petId);
        if (nftIndex !== -1 && allNFTs[nftIndex].metadata && allNFTs[nftIndex].metadata.attributes) {
            const levelAttr = allNFTs[nftIndex].metadata.attributes.find(attr => attr.trait_type.toLowerCase() === 'level');
            if (levelAttr) {
                levelAttr.value = newLevel;
            } else {
                allNFTs[nftIndex].metadata.attributes.push({ trait_type: 'Level', value: newLevel });
            }
            
            // if the level sorting is used, it may need to be sorted again
            if (sortSelect && (sortSelect.value === 'level-desc' || sortSelect.value === 'level-asc')) {
                allNFTs = sortNFTs(allNFTs, sortSelect.value);
                // if the current page needs to be displayed again, update the pagination
                displayPaginatedNFTs();
                updatePaginationControls();
            }
        }
        
        // find the corresponding pet card
        const petCards = document.querySelectorAll('.game-pet-card');
        let targetCard = null;
        
        petCards.forEach(card => {
            if (card.dataset.tokenId === petId) {
                targetCard = card;
            }
        });
        
        // if the card is found and the GamePetCard component is available, update the level
        if (targetCard && window.GamePetCard) {
            window.GamePetCard.updatePetLevel(targetCard, newLevel);
        }
    }
    
    /**
     * handle the adopt button click
     */
    function handleAdoptButtonClick() {
        // send the adopt request to the parent page
        window.parent.postMessage({
            type: 'petAction',
            action: 'adopt'
        }, '*');
    }
    
    /**
     * localize the content
     */
    function localizeContent() {
        // only execute when i18n is available
        if (!window.i18n) return;
        
        // update the page title
        document.title = i18n.t('pets.title') || '我的宠物 - 宠物世界';
        
        // update the text using the data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translation = i18n.t(key);
            
            // check if there are parameters
            const argsAttr = el.getAttribute('data-i18n-args');
            if (argsAttr) {
                try {
                    const args = JSON.parse(argsAttr);
                    // handle the parameter replacement
                    Object.keys(args).forEach(argKey => {
                        translation = translation.replace(`{${argKey}}`, args[argKey]);
                    });
                } catch (e) {
                    console.error('failed to parse the data-i18n-args:', e);
                }
            }
            
            if (translation) {
                if (el.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
    }
    
    /**
     * bind the batch action buttons
     */
    function initBatchActionButtons() {
        const feedAllBtn = document.getElementById('feedAllPetsBtn');
        const claimAllBtn = document.getElementById('claimAllRewardsBtn');
        
        if (feedAllBtn) {
            feedAllBtn.addEventListener('click', handleFeedAllPets);
            console.log('Batch feed button bound');
        } else {
            console.error('batch feed button not found');
        }
        
        if (claimAllBtn) {
            claimAllBtn.addEventListener('click', handleClaimAllRewards);
            console.log('Batch claim rewards button bound');
        } else {
            console.error('batch claim rewards button not found');
        }
    }
    
    /**
     * preload the ModalDialog component
     */
    function loadModalDialogComponent() {
        if (!window.ModalDialog) {
            const script = document.createElement('script');
            script.src = '../../scripts/other/modalDialog.js';
            script.onload = function() {
                console.log('ModalDialog module loaded successfully');
            };
            script.onerror = function() {
                console.error('ModalDialog module loading failed');
            };
            document.head.appendChild(script);
        }
    }
    
    /**
     * load the function package script
     * @param {string} scriptPath - the script path
     * @returns {Promise} return the loading result
     */
    function loadFunctionPackage(scriptPath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => resolve(true);
            script.onerror = (error) => reject(error);
            document.head.appendChild(script);
        });
    }
    
    /**
     * batch feed all pets
     */
    async function handleFeedAllPets() {
        console.log('start to handle the batch feed...');
        
        // check the current account and NFT data
        if (!window.web3 || !window.ethereum) {
            showGameMessage('please connect the wallet first', 'error');
            return;
        }
        
        // check if there is a connected account
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                showGameMessage('please connect the wallet first', 'error');
                return;
            }
        } catch (error) {
            console.error('failed to get the account:', error);
            showGameMessage('failed to get the wallet account', 'error');
            return;
        }
        
        // check if there are NFTs
        if (!allNFTs || allNFTs.length === 0) {
            showGameMessage('you have no pets to feed', 'error');
            return;
        }
        
        // load the PetFeeding module
        try {
            if (!window.PetFeeding) {
                console.log('loading the PetFeeding module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetFeeding.js');
                
                if (!window.PetFeeding) {
                    throw new Error('failed to load the PetFeeding module');
                }
            }
        } catch (error) {
            console.error('failed to load the PetFeeding module:', error);
            showGameMessage('failed to load the feed module, please refresh the page and try again', 'error');
            return;
        }
        
        // ensure the ModalDialog is loaded
        let promptFn = window.prompt;
        let confirmFn = window.confirm;
        let alertFn = window.alert;
        
        if (window.ModalDialog) {
            promptFn = async (message, defaultValue) => {
                try {
                    const result = await window.ModalDialog.prompt({
                        title: 'feed time',
                        content: message,
                        inputValue: defaultValue || '',
                        confirmText: 'confirm',
                        cancelText: 'cancel',
                        inputType: 'number'
                    });
                    
                    if (result.action === 'confirm') {
                        return result.value;
                    }
                    return null;
                } catch (error) {
                    console.error('modal error:', error);
                    return window.prompt(message, defaultValue);
                }
            };
            
            confirmFn = async (message) => {
                try {
                    const result = await window.ModalDialog.confirm(message, {
                        title: 'confirm operation',
                        confirmText: 'confirm',
                        cancelText: 'cancel'
                    });
                    return result.action === 'confirm';
                } catch (error) {
                    console.error('modal error:', error);
                    return window.confirm(message);
                }
            };
            
            alertFn = async (message) => {
                try {
                    await window.ModalDialog.alert(message, {
                        title: 'prompt'
                    });
                } catch (error) {
                    console.error('modal error:', error);
                    window.alert(message);
                }
            };
        }
        
        // prompt the user to input the feed time
        let feedingHoursPerNFT = 24; // default feed 24 hours
        const userInputHours = await promptFn('please input the feed time for each pet (hours):', '24');
        
        if (userInputHours === null) {
            // the user cancelled the input
            showGameMessage('the feed operation is cancelled', 'info');
            return;
        }
        
        const parsedHours = parseInt(userInputHours);
        if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 1000) {
            showGameMessage('please input a valid feed time (1-1000 hours)', 'error');
            return;
        }
        
        feedingHoursPerNFT = parsedHours;
        
        // show the processing message
        showGameMessage(`preparing to batch feed (${feedingHoursPerNFT} hours/pet)...`, 'info');
        
        try {
            // set the maximum feed time limit option
            const options = {
                maxFeedingHours: 168 // default maximum feed time is 7 days (168 hours)
            };
            
            // use the PetFeeding.feedAllPets function to batch feed
            const feedingResult = await window.PetFeeding.feedAllPets(allNFTs, feedingHoursPerNFT, options);
            
            if (!feedingResult.success) {
                // check if the authorization is needed
                if (feedingResult.needApproval) {
                    const doApprove = await confirmFn(`you need to authorize the PWFOOD token to the contract, do you want to authorize? \nneed to authorize: at least ${feedingResult.requiredAmount} PWFOOD`);
                    
                    if (doApprove) {
                        try {
                            // execute the authorization
                            showGameMessage('authorizing the PWFOOD token...', 'info');
                            
                            // check if the ContractApprovalManager is available
                            if (!window.ContractApprovalManager) {
                                console.log('ContractApprovalManager is not available, trying to load...');
                                try {
                                    await loadFunctionPackage('../../scripts/other/ContractApprovalManager.js');
                                } catch (error) {
                                    console.error('failed to load the ContractApprovalManager:', error);
                                    throw new Error('failed to load the authorization manager');
                                }
                            }
                            
                            // get the current connected account
                            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                            const currentAddress = accounts[0];
                            
                            const approvalResult = await window.ContractApprovalManager.approveERC20Token(
                                feedingResult.pwfoodContract,
                                feedingResult.feedingManagerAddress,
                                '115792089237316195423570985008687907853269984665640564039457584007913129639935', // max uint256
                                currentAddress,
                                true
                            );
                            
                            if (approvalResult.success) {
                                showGameMessage('authorization successful, starting to batch feed', 'success');
                                // try to batch feed again
                                setTimeout(async () => {
                                    await handleFeedAllPets();
                                }, 1000);
                            } else {
                                showGameMessage('failed to authorize: ' + (approvalResult.error || 'unknown error'), 'error');
                            }
                        } catch (approvalError) {
                            console.error('failed to authorize:', approvalError);
                            showGameMessage('failed to authorize: ' + (approvalError.message || 'unknown error'), 'error');
                        }
                    } else {
                        showGameMessage('the authorization is cancelled', 'info');
                    }
                    return;
                }
                
                // the balance is insufficient
                if (feedingResult.error && feedingResult.error.includes('balance is insufficient')) {
                    showGameMessage(`PWFOOD balance is insufficient, need ${feedingResult.requiredAmount} PWFOOD, current balance ${feedingResult.balance} PWFOOD`, 'error');
                    await alertFn(`your PWFOOD balance is insufficient to feed all pets! \nneed: ${feedingResult.requiredAmount} PWFOOD\ncurrent balance: ${feedingResult.balance} PWFOOD`);
                    return;
                }
                
                // display the information for the invalid NFTs
                if (feedingResult.invalidNfts && feedingResult.invalidNfts.length > 0) {
                    const message = `there are ${feedingResult.invalidNfts.length} pets that are skipped because of the feed time limit`;
                    showGameMessage(message, 'warning');
                    console.log('skipped pets:', feedingResult.invalidNfts);
                }
                
                // other errors
                showGameMessage('failed to batch feed: ' + feedingResult.error, 'error');
                return;
            }
            
            // display the success result
            if (feedingResult.successCount > 0) {
                let message = `successfully fed ${feedingResult.successCount} pets, each ${feedingHoursPerNFT} hours`;
                
                if (feedingResult.failCount > 0) {
                    message += `, failed ${feedingResult.failCount} pets`;
                }
                
                if (feedingResult.skippedCount > 0) {
                    message += `, skipped ${feedingResult.skippedCount} pets (exceed the limit)`;
                }
                
                showGameMessage(message, 'success');
                
                // refresh the NFT display
                setTimeout(() => {
                    loadNFTPets();
                }, 2000);
            } else if (feedingResult.failCount > 0) {
                showGameMessage(`all feed attempts failed, please check the PWFOOD balance or network status`, 'error');
            }
        } catch (error) {
            console.error('failed to batch feed:', error);
            showGameMessage('failed to batch feed: ' + (error.message || 'unknown error'), 'error');
        }
    }
    
    /**
     * batch claim all pet rewards
     */
    async function handleClaimAllRewards() {
        console.log('start to handle the batch claim...');
        
        // check the current account and NFT data
        if (!window.web3 || !window.ethereum) {
            showGameMessage('please connect the wallet first', 'error');
            return;
        }
        
        // check if there is a connected account
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                showGameMessage('please connect the wallet first', 'error');
                return;
            }
        } catch (error) {
            console.error('failed to get the account:', error);
            showGameMessage('failed to get the wallet account', 'error');
            return;
        }
        
        // check if there are NFTs
        if (!allNFTs || allNFTs.length === 0) {
            showGameMessage('you have no pets to claim rewards', 'error');
            return;
        }
        
        // load the PetRewards module
        try {
            if (!window.PetRewards) {
                console.log('loading the PetRewards module...');
                await loadFunctionPackage('../../scripts/functionPackages/PetRewards.js');
                
                if (!window.PetRewards) {
                    throw new Error('failed to load the PetRewards module');
                }
            }
        } catch (error) {
            console.error('failed to load the PetRewards module:', error);
            showGameMessage('failed to load the reward module, please refresh the page and try again', 'error');
            return;
        }
        
        // ensure the ModalDialog is loaded
        let confirmFn = window.confirm;
        
        if (window.ModalDialog) {
            confirmFn = async (message) => {
                try {
                    const result = await window.ModalDialog.confirm(message, {
                        title: 'confirm operation',
                        confirmText: 'confirm',
                        cancelText: 'cancel'
                    });
                    return result.action === 'confirm';
                } catch (error) {
                    console.error('modal error:', error);
                    return window.confirm(message);
                }
            };
        }
        
        // display the processing message
        showGameMessage('preparing to claim rewards, please wait...', 'info');
        
        // use the new reward module to handle the claim of all NFTs
        const nftIds = allNFTs.map(nft => nft.token_id);
        console.log(`preparing to claim ${nftIds.length} NFTs' rewards`);
        
        // confirm the user operation
        const confirmMessage = `are you sure to claim ${nftIds.length} pets' rewards?`;
        const userConfirmed = await confirmFn(confirmMessage);
        
        if (!userConfirmed) {
            console.log('the user cancelled the claim operation');
            showGameMessage('the claim operation is cancelled', 'info');
            return;
        }
        
        try {
            // call the claimAllRewards method of the PetRewards module
            const result = await window.PetRewards.claimAllRewards(allNFTs);
            
            if (result.success) {
                const pwp = result.pwpotRewards || result.totalPwpotRewards || 0;
                const pwb = result.pwbotRewards || result.totalPwbotRewards || 0;
                
                // if there are NFTs that are filtered out, display more detailed information
                let successMessage = '';
                if (result.filteredOutCount && result.filteredOutCount > 0) {
                    successMessage = `successfully claimed rewards! got ${pwp} PWP and ${pwb} PWB (filtered out ${result.filteredOutCount} pets without rewards)`;
                } else {
                    successMessage = `successfully claimed rewards! got ${pwp} PWP and ${pwb} PWB`;
                }
                
                showGameMessage(successMessage, 'success');
                
                // update the UI display
                console.log('the claim operation is successful:', result);
                
                // refresh the NFT display
                setTimeout(() => {
                    loadNFTPets();
                }, 2000);
            } else {
                if (result.error && result.error.includes('no rewards to claim')) {
                    // maybe provide more detailed information
                    if (result.filteredInfo) {
                        showGameMessage(`current no rewards to claim, checked ${result.filteredInfo.totalChecked} pets`, 'warning');
                        console.log('no rewards to claim, detailed information:', result.filteredInfo);
                    } else {
                        showGameMessage('current no rewards to claim', 'warning');
                    }
                } else {
                    showGameMessage(`failed to claim rewards: ${result.error}`, 'error');
                }
                console.error('failed to claim rewards:', result.error);
            }
        } catch (error) {
            console.error('failed to claim rewards:', error);
            showGameMessage(`failed to claim rewards: ${error.message || 'unknown error'}`, 'error');
        }
    }
    
    /**
     * display the game message
     * @param {string} message - the message content
     * @param {string} type - the message type: 'info', 'success', 'warning', 'error'
     */
    function showGameMessage(message, type = 'info') {
        // create the message element
        const msgElement = document.createElement('div');
        msgElement.className = `game-message ${type}`;
        msgElement.textContent = message;
        
        // add to the document
        document.body.appendChild(msgElement);
        
        // display the message
        setTimeout(() => {
            msgElement.classList.add('show');
        }, 10);
        
        // set the auto remove
        setTimeout(() => {
            msgElement.classList.remove('show');
            setTimeout(() => {
                if (msgElement.parentNode) {
                    msgElement.parentNode.removeChild(msgElement);
                }
            }, 300);
        }, 5000);
    }
    
    /**
     * handle the message from the parent page
     */
    function handleParentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        switch (message.type) {
            case 'petsData':
                // received the pets data
                petsData = message.data;
                renderPets(petsData);
                break;
                
            case 'petStatsUpdated':
                // pet stats updated
                updatePetStats(message.data);
                break;
                
            case 'petLevelUp':
                // pet level up
                handlePetLevelUp(message.data);
                break;
        }
    }
    
    /**
     * render the pets list
     * @param {Array} pets - the pets data (if provided)
     */
    function renderPets(pets) {
        if (!petsGrid) return;
        
        // clear the existing content
        petsGrid.innerHTML = '';
        
        // display the loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="spinner"></div>
            <p>${window.i18n ? window.i18n.t('pets.loading') : 'loading pets...'}</p>
        `;
        petsGrid.appendChild(loadingIndicator);
        
        // try to use PetNFTService to load the NFT pets data
        if (window.PetNFTService) {
            console.log('using PetNFTService to load the NFT pets data');
            
            // get the user address (from localStorage or sessionStorage)
            const userAddress = localStorage.getItem('walletAddress') || sessionStorage.getItem('walletAddress');
            
            if (userAddress) {
                // Initializing PetNFTService
                window.PetNFTService.init().then(success => {
                    if (success) {
                        console.log('PetNFTService initialized successfully');
                        
                        // try to get the NFTs from the cache first
                        let cachedNFTs = window.PetNFTService.getCachedNFTs({
                            userAddress: userAddress
                        });
                        
                        if (cachedNFTs && cachedNFTs.length > 0) {
                            console.log(`loaded ${cachedNFTs.length} NFT pets from the cache`);
                            displayNFTPets(cachedNFTs, true);
                        } else {
                            // if there is no NFTs in the cache, refresh to get the latest data
                            console.log('no NFTs in the cache, trying to refresh to get the latest data');
                            window.PetNFTService.refreshNFTs(userAddress)
                                .then(result => {
                                    console.log('NFT pets loading result:', result);
                                    if (result.success && result.nfts && result.nfts.length > 0) {
                                        console.log(`successfully loaded ${result.nfts.length} NFT pets`);
                                        displayNFTPets(result.nfts, true);
                                    } else {
                                        showNoNFTsMessage();
                                    }
                                })
                                .catch(error => {
                                    console.error('failed to load the NFT pets:', error);
                                    showNoNFTsMessage();
                                });
                        }
                    } else {
                        console.error('failed to initialize PetNFTService');
                        showNoNFTsMessage();
                    }
                });
            } else {
                console.log('no user address found, showing the wallet not connected message');
                showWalletNotConnectedMessage();
            }
        } else {
            console.error('PetNFTService is not available');
            showNoNFTsMessage();
        }
    }
    
    /**
     * get the CSS class name for the quality
     * @param {string} qualityId - the quality ID
     * @returns {string} the CSS class name
     */
    function getQualityClass(qualityId) {
        const classMap = {
            'COMMON': 'common',
            'GOOD': 'good',
            'EXCELLENT': 'excellent',
            'RARE': 'purple-rare',
            'LEGENDARY': 'legendary',
            'all': ''
        };
        
        return classMap[qualityId] || 'common';
    }
    
    /**
     * handle the click of the feed friend NFT button
     */
    function handleFeedFriendNFTClick() {
        console.log('opening the feed friend NFT dialog');
        // check if the FeedFriendDialog module is loaded
        if (window.FeedFriendDialog) {
            window.FeedFriendDialog.show();
        } else {
            console.log('FeedFriendDialog module is not loaded, trying to load...');
            // try to load the FeedFriendDialog module
            const script = document.createElement('script');
            script.src = '../../scripts/other/feedFriendDialog.js';
            script.onload = function() {
                console.log('FeedFriendDialog module loaded successfully, showing the dialog');
                if (window.FeedFriendDialog) {
                    window.FeedFriendDialog.show();
                } else {
                    console.error('FeedFriendDialog module loaded successfully but not initialized correctly');
                    showGameMessage('failed to open the feed dialog, please refresh the page and try again', 'error');
                }
            };
            script.onerror = function() {
                console.error('failed to load the FeedFriendDialog module');
                showGameMessage('failed to load the feed dialog, please refresh the page and try again', 'error');
            };
            document.head.appendChild(script);
        }
    }
}); 
