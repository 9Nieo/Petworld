/**
 * PetDetailPopup - Pet detail popup component
 * 
 * A popup component for displaying detailed information about pets, including name, ID, level, hunger, etc.
 */

class PetDetailPopup {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            appendTo: document.body,
            animationDuration: 300,
            showCloseButton: true,
            closeOnBackgroundClick: true,
            closeOnEsc: true,
            ...options
        };

        // State
        this.isOpen = false;
        this.currentPet = null;
        this.feedingManagerContract = null;

        // Initialize DOM
        this.createDom();
        this.setupEventListeners();
        
        // Initialize contract after DOM is loaded
        setTimeout(() => {
            this.initContract();
        }, 100);
    }

    /**
     * Initialize NFTFeedingManager contract
     */
    async initContract() {
        try {
            console.log('Starting to initialize NFTFeedingManager contract...');
            
            // Check if a global contract instance already exists
            if (window.nftFeedingManagerContract) {
                console.log('Using existing global NFTFeedingManager contract instance');
                this.feedingManagerContract = window.nftFeedingManagerContract;
                console.log('NFTFeedingManager contract initialized successfully:', !!this.feedingManagerContract);
                return;
            }
            
            // Check Web3 instance and necessary initialization functions
            if (!window.initNFTFeedingManagerContract) {
                console.warn('Missing initNFTFeedingManagerContract function, may need to load related scripts');
                return;
            }
            
            // Try to get the appropriate Web3 instance
            let web3Instance = null;
            
            // First try using gameWeb3 (set by home.js)
            if (window.gameWeb3) {
                console.log('Using gameWeb3 instance');
                web3Instance = window.gameWeb3;
            } 
            // Then try using window.web3
            else if (window.web3 && window.web3.eth) {
                console.log('Using window.web3 instance');
                web3Instance = window.web3;
            } 
            // Finally try creating a new instance with the ethereum provider
            else if (window.ethereum) {
                console.log('Creating new Web3 instance with window.ethereum');
                
                // Ensure Web3 class is available
                if (typeof Web3 === 'undefined' && typeof window.Web3 !== 'undefined') {
                    Web3 = window.Web3;
                }
                
                if (typeof Web3 !== 'undefined') {
                    web3Instance = new Web3(window.ethereum);
                } else {
                    console.error('Web3 class is not available, cannot create instance');
                    return;
                }
            }
            
            if (!web3Instance) {
                console.warn('Unable to get Web3 instance, will use mock data');
                return;
            }
            
            // Validate Web3 instance
            if (!web3Instance.eth || typeof web3Instance.eth.Contract !== 'function') {
                console.error('Invalid Web3 instance:', web3Instance);
                
                // Try to debug output the current web3 instance status
                console.log('Web3 instance details:', {
                    hasEth: !!web3Instance.eth,
                    hasContract: web3Instance.eth ? (typeof web3Instance.eth.Contract) : 'N/A',
                    providers: web3Instance.currentProvider ? 'Available' : 'None'
                });
                
                return;
            }
            
            console.log('Using Web3 instance:', web3Instance);
            
            // Get contract address function
            const getContractAddressFunc = window.getContractAddress || function(name) {
                const network = window.currentNetwork || 'LOCAL';
                if (window.contractAddresses && window.contractAddresses[network]) {
                    return window.contractAddresses[network][name];
                }
                return null;
            };
            
            // Initialize contract
            try {
                this.feedingManagerContract = window.initNFTFeedingManagerContract(web3Instance, getContractAddressFunc);
                
                // Save to global variable for reuse
                if (this.feedingManagerContract) {
                    window.nftFeedingManagerContract = this.feedingManagerContract;
                }
                
                console.log('NFTFeedingManager contract initialized successfully:', !!this.feedingManagerContract);
            } catch (contractError) {
                console.error('Error initializing contract instance:', contractError);
            }
        } catch (error) {
            console.error('Failed to initialize NFTFeedingManager contract:', error);
        }
    }

    /**
     * Create DOM structure
     */
    createDom() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'pet-detail-popup-container';
        this.container.style.display = 'none';

        // Create background overlay
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'pet-detail-popup-backdrop';
        this.container.appendChild(this.backdrop);

        // Create popup content
        this.popup = document.createElement('div');
        this.popup.className = 'pet-detail-popup';
        this.container.appendChild(this.popup);

        // Create close button
        if (this.config.showCloseButton) {
            this.closeButton = document.createElement('button');
            this.closeButton.className = 'pet-detail-popup-close';
            this.closeButton.innerHTML = '&times;';
            this.popup.appendChild(this.closeButton);
        }

        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'pet-detail-popup-content';
        this.popup.appendChild(this.contentContainer);

        // Add loading indicator
        this.loader = document.createElement('div');
        this.loader.className = 'pet-detail-popup-loader';
        this.loader.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
        this.loader.style.display = 'none';
        this.popup.appendChild(this.loader);

        // Add to page
        this.config.appendTo.appendChild(this.container);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close button click event
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }

        // Close on background click
        if (this.config.closeOnBackgroundClick) {
            this.backdrop.addEventListener('click', () => this.close());
        }

        // Close on ESC key
        if (this.config.closeOnEsc) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }
    }

    /**
     * Show popup
     * @param {Object} petData - Pet data
     */
    async show(petData) {
        if (!petData) return;
        
        this.currentPet = petData;
        
        // Clear content
        this.contentContainer.innerHTML = '';
        
        // Show loading indicator
        this.showLoader();
        
        // Show popup
        this.container.style.display = 'flex';
        setTimeout(() => {
            this.container.classList.add('active');
            this.popup.classList.add('active');
        }, 10);
        
        this.isOpen = true;
        
        // First show basic information
        const petInfo = this.createBasicPetInfo(petData);
        this.contentContainer.appendChild(petInfo);
        
        // If contract is not initialized, try to initialize again
        if (!this.feedingManagerContract && window.initNFTFeedingManagerContract) {
            await this.initContract();
        }
        
        // Then asynchronously load contract data
        try {
            // Check if contract and tokenId are valid
            if (this.feedingManagerContract && petData.tokenId) {
                const contractData = await this.getContractData(petData.tokenId);
                // Update pet information
                this.updatePetInfoWithContractData(contractData);
            } else {
                console.log('Contract not initialized or TokenID invalid, using default data');
                // Use default data
                this.updatePetInfoWithFallbackData();
            }
        } catch (error) {
            console.error('Failed to get pet contract data:', error);
            // Use default data
            this.updatePetInfoWithFallbackData();
        } finally {
            // Hide loading indicator
            this.hideLoader();
        }
    }

    /**
     * Show loading indicator
     */
    showLoader() {
        if (this.loader) {
            this.loader.style.display = 'flex';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoader() {
        if (this.loader) {
            this.loader.style.display = 'none';
        }
    }

    /**
     * Get pet data from contract
     * @param {string|number} tokenId - Pet's TokenID
     * @returns {Promise<Object>} Pet contract data
     */
    async getContractData(tokenId) {
        if (!this.feedingManagerContract || !tokenId) {
            throw new Error('Contract not initialized or TokenID invalid');
        }
        
        try {
            console.log('Getting pet feeding information:', tokenId);
            
            // Try to access contract using different methods
            let feedingInfo;
            let remainingHours;
            let maxFeedingHours;
            let levelInfo;
            
            try {
                // First try to get feeding information
                feedingInfo = await this.feedingManagerContract.methods.nftFeeding(tokenId).call()
                    .catch(error => {
                        console.warn('Failed to get nftFeeding information, NFT may not be registered:', error);
                        return {
                            feedingHours: 0,
                            level: 1,
                            isActive: false,
                            quality: 0,
                            accumulatedFood: 0
                        };
                    });
                
                console.log('Obtained feeding information:', feedingInfo);
                
                // If NFT is not registered, use default values
                if (!feedingInfo.isActive) {
                    return {
                        feedingInfo,
                        remainingHours: 0,
                        maxFeedingHours: 168, // Default maximum feeding time
                        feedingPercentage: 0,
                        level: 1,
                        accumulatedFood: 0,
                        isActive: false
                    };
                }
                
                // Get remaining feeding time
                remainingHours = await this.feedingManagerContract.methods.getRemainingFeedingHours(tokenId).call()
                    .catch(error => {
                        console.warn('Failed to get remaining feeding time:', error);
                        return 0;
                    });
                
                // Get maximum feeding time
                maxFeedingHours = await this.feedingManagerContract.methods.MAX_FEEDING_HOURS().call()
                    .catch(error => {
                        console.warn('Failed to get maximum feeding time:', error);
                        return 168; // Default 7 days
                    });
                
                // Get level information
                levelInfo = await this.feedingManagerContract.methods.getNFTLevelInfo(tokenId).call()
                    .catch(error => {
                        console.warn('Failed to get level information:', error);
                        return {
                            level: parseInt(feedingInfo.level) || 1,
                            accumulatedFood: parseInt(feedingInfo.accumulatedFood) || 0
                        };
                    });
            } catch (methodError) {
                console.error('Failed to call contract method:', methodError);
                throw methodError;
            }
            
            // Calculate hunger percentage
            const feedingPercentage = maxFeedingHours > 0 ? 
                Math.floor((parseInt(remainingHours) / parseInt(maxFeedingHours)) * 100) : 0;
            
            return {
                feedingInfo,
                remainingHours: parseInt(remainingHours),
                maxFeedingHours: parseInt(maxFeedingHours),
                feedingPercentage,
                level: parseInt(levelInfo.level),
                accumulatedFood: parseInt(levelInfo.accumulatedFood),
                isActive: feedingInfo.isActive
            };
        } catch (error) {
            console.error('Failed to get pet data from contract:', error);
            throw error;
        }
    }

    /**
     * Update pet information with contract data
     * @param {Object} contractData - Pet data obtained from contract
     */
    updatePetInfoWithContractData(contractData) {
        if (!contractData || !this.currentPet) return;
        
        // Update level information
        const levelSpan = this.contentContainer.querySelector('.pet-info-level span:last-child');
        if (levelSpan) {
            levelSpan.textContent = contractData.level || 1;
        }
        
        // Update hunger information
        const hungerBar = this.contentContainer.querySelector('.progress-value');
        const hungerValue = this.contentContainer.querySelector('.hunger-value');
        
        if (hungerBar) {
            const percentage = contractData.feedingPercentage;
            hungerBar.style.width = `${percentage}%`;
            
            // Change color
            hungerBar.classList.remove('low', 'medium', 'high');
            if (percentage < 30) {
                hungerBar.classList.add('low');
            } else if (percentage < 70) {
                hungerBar.classList.add('medium');
            } else {
                hungerBar.classList.add('high');
            }
        }
        
        if (hungerValue) {
            hungerValue.textContent = `${contractData.feedingPercentage}%`;
        }
        
        // Add additional contract information
        const wrapper = this.contentContainer.querySelector('.pet-info-wrapper');
        if (wrapper) {
            // Check if additional information area already exists
            let extraInfoDiv = wrapper.querySelector('.pet-contract-extra-info');
            if (!extraInfoDiv) {
                extraInfoDiv = document.createElement('div');
                extraInfoDiv.className = 'pet-contract-extra-info';
                wrapper.appendChild(extraInfoDiv);
            }
            
            // Show accumulated food information, excluding status
            extraInfoDiv.innerHTML = `
                <div class="pet-attribute">
                    <span>Accumulated Feeding:</span>
                    <span>${contractData.accumulatedFood || 0}</span>
                </div>
                <div class="pet-attribute">
                    <span>Remaining Time:</span>
                    <span>${contractData.remainingHours || 0} hours</span>
                </div>
            `;
        }
    }

    /**
     * Update pet information with default data (when contract data retrieval fails)
     */
    updatePetInfoWithFallbackData() {
        if (!this.currentPet) return;
        
        // Provide default values
        const defaultData = {
            level: this.currentPet.level || 1,
            feedingPercentage: this.currentPet.hunger || Math.floor(Math.random() * 100),
            accumulatedFood: 0,
            remainingHours: 0,
            isActive: false
        };
        
        // Update UI with default data
        this.updatePetInfoWithContractData(defaultData);
    }

    /**
     * Close popup
     */
    close() {
        this.container.classList.remove('active');
        this.popup.classList.remove('active');
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.contentContainer.innerHTML = '';
            this.currentPet = null;
        }, this.config.animationDuration);
        
        this.isOpen = false;
    }

    /**
     * Create basic pet information DOM structure
     * @param {Object} petData - Pet data
     * @returns {HTMLElement} Pet information DOM element
     */
    createBasicPetInfo(petData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pet-info-wrapper';
        
        // Pet name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'pet-info-name';
        nameDiv.innerHTML = `<h2>${petData.name || 'Unknown Pet'}</h2>`;
        wrapper.appendChild(nameDiv);
        
        // Pet ID
        const idDiv = document.createElement('div');
        idDiv.className = 'pet-info-id';
        idDiv.innerHTML = `<span>ID: </span><span>${petData.id || petData.tokenId || 'N/A'}</span>`;
        wrapper.appendChild(idDiv);
        
        // Pet level - will use placeholder, waiting for contract data update
        const levelDiv = document.createElement('div');
        levelDiv.className = 'pet-info-level';
        const level = petData.level || '...';
        levelDiv.innerHTML = `<span>Level: </span><span>${level}</span>`;
        wrapper.appendChild(levelDiv);
        
        // Pet hunger - will use placeholder, waiting for contract data update
        const hungerDiv = document.createElement('div');
        hungerDiv.className = 'pet-info-hunger';
        const hunger = petData.hunger || 50;
        
        // Create hunger progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressValue = document.createElement('div');
        progressValue.className = 'progress-value';
        progressValue.style.width = `${hunger}%`;
        
        // Set hunger color
        if (hunger < 30) {
            progressValue.classList.add('low');
        } else if (hunger < 70) {
            progressValue.classList.add('medium');
        } else {
            progressValue.classList.add('high');
        }
        
        progressBar.appendChild(progressValue);
        
        hungerDiv.innerHTML = `<span>Hunger: </span>`;
        hungerDiv.appendChild(progressBar);
        hungerDiv.innerHTML += `<span class="hunger-value">${hunger}%</span>`;
        
        wrapper.appendChild(hungerDiv);
        
        // Add more pet details
        if (petData.attributes || petData.metadata?.attributes) {
            const attributes = petData.attributes || petData.metadata?.attributes || [];
            const attributesDiv = document.createElement('div');
            attributesDiv.className = 'pet-info-attributes';
            
            
            if (attributesDiv.children.length > 0) {
                wrapper.appendChild(attributesDiv);
            }
        }
        
        return wrapper;
    }

    /**
     * Get quality name
     * @param {number|string} qualityId - Quality ID
     * @returns {string} Quality name
     */
    getQualityName(qualityId) {
        const qualityId_num = parseInt(qualityId);
        const qualityMap = {
            0: 'Common',
            1: 'Excellent',
            2: 'Fine',
            3: 'Rare',
            4: 'Legendary'
        };
        return qualityMap[qualityId_num] || 'Unknown';
    }

    /**
     * Find specific attribute from attributes array
     * @param {Array} attributes - Attributes array
     * @param {string} traitType1 - First possible trait_type name
     * @param {string} traitType2 - Second possible trait_type name
     * @returns {string|number|null} Attribute value or null
     */
    findAttribute(attributes, traitType1, traitType2) {
        if (!Array.isArray(attributes)) return null;
        
        const attr = attributes.find(a => 
            (a.trait_type === traitType1 || a.trait_type === traitType2) ||
            (a.trait_type && a.trait_type.toLowerCase() === traitType1.toLowerCase()) ||
            (a.trait_type && a.trait_type.toLowerCase() === traitType2.toLowerCase())
        );
        
        return attr ? attr.value : null;
    }

    /**
     * Update i18n text
     * @param {Object} i18n - i18n instance
     */
    updateI18n(i18n) {
        if (!i18n || !this.currentPet) return;
        
        // Redisplay current pet information, applying new language
        this.show(this.currentPet);
    }
}

// Export as a global variable
window.PetDetailPopup = PetDetailPopup; 