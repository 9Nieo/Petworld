/**
 * Pet World - Lottery Result Display Script
 * This file handles the display, interaction logic, and cross-page communication for lottery results
 */

// Initialize state
const lotteryResult = {
    // Quality mapping
    qualityMapping: {
        0: { name: 'Common', color: 'common', emoji: '🐾' },
        1: { name: 'Good', color: 'good', emoji: '🐾✨' },
        2: { name: 'Excellent', color: 'excellent', emoji: '🐾⭐' },
        3: { name: 'Rare', color: 'rare', emoji: '🐾💫' },
        4: { name: 'Legendary', color: 'legendary', emoji: '🐾🌟' }
    },
    
    // Lottery type mapping
    lotteryTypeMapping: {
        'CommonEgg': 'Common Egg',
        'RareEgg': 'Rare Egg',
        'LegendaryEgg': 'Legendary Egg',
        'FreeNFT': 'Free Pet'
    },
    
    // Current result
    currentResult: null,
    
    // Batch results
    batchResults: null,
    
    // Whether it is batch mode
    isBatchMode: false,

    // NFT name mapping
    nftNameMapping: {},

    // NFT type mapping
    nftTypeMapping: {},

    // Web3 instance
    web3: null,

    // NFTManager contract instance
    nftManagerContract: null,

    // Debug mode
    debug: false
};

/**
 * Initialize after document load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize message listener
    initMessageListener();
    
    // Bind close button event
    bindCloseButtons();
    
    // Bind view pet button
    bindViewPetButton();
    
    // Respond to URL parameters
    handleUrlParams();
    
    // Check if there is a result saved in localStorage
    checkSavedResult();
    
    // Localize content
    localizeContent();
    
    // Initialize Web3
    initWeb3();
    
    // Log
    log('Lottery result page loaded');
});

/**
 * Initialize Web3 and contract instance
 */
function initWeb3() {
    if (window.ethereum) {
        lotteryResult.web3 = new window.Web3(window.ethereum);
        log('Initialize Web3 using Ethereum provider');
        
        // Initialize NFTManager contract
        initNFTManagerContract();
    } else if (window.web3) {
        lotteryResult.web3 = new window.Web3(window.web3.currentProvider);
        log('Initialize Web3 using current provider');
        
        // Initialize NFTManager contract
        initNFTManagerContract();
    } else {
        // Request Web3 instance from parent window
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'requestWeb3' }, '*');
            log('Request Web3 instance from parent window');
        } else {
            log('Cannot find Web3 provider');
        }
    }
}

/**
 * Initialize NFTManager contract
 */
function initNFTManagerContract() {
    try {
        if (lotteryResult.web3) {
            // Get contract address
            let nftManagerAddress;
            
            // Try multiple ways to get contract address
            if (typeof getContractAddress === 'function') {
                nftManagerAddress = getContractAddress('NFTManager');
                log('Using getContractAddress to get contract address:', nftManagerAddress);
            } else if (window.contractAddress && typeof window.contractAddress.getContractAddress === 'function') {
                nftManagerAddress = window.contractAddress.getContractAddress('NFTManager');
                log('Using window.contractAddress.getContractAddress to get contract address:', nftManagerAddress);
            } else if (window.contractAddresses) {
                const network = window.currentNetwork || window.network || 'TEST';
                nftManagerAddress = window.contractAddresses[network]?.NFTManager;
                log('Get contract address from contractAddresses object:', nftManagerAddress);
            } else if (window.parent && window.parent !== window) {
                // Request contract address from parent window
                log('Try to get contract address from parent window');
                window.parent.postMessage({ type: 'requestContractAddress', contract: 'NFTManager' }, '*');
                
                // Set a timeout, if the parent window does not respond, try other methods
                setTimeout(() => {
                    if (!lotteryResult.nftManagerContract) {
                        log('Request contract address from parent window timeout, try other methods');
                        // Try to get value from localStorage
                        const storedAddress = localStorage.getItem('NFTManagerAddress');
                        if (storedAddress) {
                            log('Get contract address from localStorage:', storedAddress);
                            createContractInstance(storedAddress);
                        }
                    }
                }, 1000);
                
                return;
            }
            
            // If the contract address is not found, try to get it from localStorage
            if (!nftManagerAddress) {
                nftManagerAddress = localStorage.getItem('NFTManagerAddress');
                log('Get contract address from localStorage:', nftManagerAddress);
            }
            
            if (!nftManagerAddress) {
                log('Cannot get NFTManager contract address');
                return;
            }
            
            // Create contract instance
            createContractInstance(nftManagerAddress);
        }
    } catch (error) {
        log('Initialize NFTManager contract failed:', error);
    }
    
    // Helper function to create contract instance
    function createContractInstance(address) {
        try {
            // Save address to localStorage
            localStorage.setItem('NFTManagerAddress', address);
            
            if (window.NFTManagerABI) {
                lotteryResult.nftManagerContract = new lotteryResult.web3.eth.Contract(
                    window.NFTManagerABI,
                    address
                );
                log('NFTManager contract initialized:', address);
                
                // Trigger any pending result processing
                if (lotteryResult.currentResult) {
                    log('After contract initialization, process pending results');
                    fetchNFTInfo(lotteryResult.currentResult)
                        .then(() => {
                            updateResultUI(lotteryResult.currentResult);
                        })
                        .catch(e => {
                            log('Error processing pending results:', e);
                        });
                }
            } else {
                log('Cannot find NFTManagerABI, try to load ABI');
                // Try to load ABI dynamically
                loadNFTManagerABI(address);
            }
        } catch (e) {
            log('Failed to create contract instance:', e);
        }
    }
    
    // Helper function to load ABI dynamically
    function loadNFTManagerABI(address) {
        const script = document.createElement('script');
        script.src = '../../scripts/contracts/ABI/NFTManagerABI.js';
        script.onload = function() {
            log('NFTManagerABI loaded successfully');
            if (window.NFTManagerABI) {
                createContractInstance(address);
            }
        };
        script.onerror = function() {
            log('Failed to load NFTManagerABI');
        };
        document.head.appendChild(script);
    }
}

/**
 * Initialize message listener, receive lottery result data from parent window
 */
function initMessageListener() {
    log('Initialize message listener');
    window.addEventListener('message', function(event) {
        log('Received message:', event.data);
        
        if (event.data && event.data.type) {
            switch (event.data.type) {
                case 'lotteryResult':
                    // Single lottery result
                    if (event.data.data) {
                        log('Received single lottery result:', event.data.data);
                        handleLotteryResult(event.data.data);
                    } else {
                        log('Lottery result data is empty');
                        // Try to get from localStorage
                        checkSavedResult();
                    }
                    break;
                    
                case 'lotteryBatchResults':
                    // Batch lottery results
                    if (event.data.data && Array.isArray(event.data.data)) {
                        log('Received batch lottery results:', event.data.data);
                        handleLotteryBatchResults(event.data.data);
                    } else {
                        log('Batch lottery result data is empty or not an array');
                        // Try to get from localStorage
                        const savedBatchResults = localStorage.getItem('lastLotteryBatchResults');
                        if (savedBatchResults) {
                            try {
                                const results = JSON.parse(savedBatchResults);
                                if (Array.isArray(results) && results.length > 0) {
                                    handleLotteryBatchResults(results);
                                    return;
                                }
                            } catch (e) {
                                log('Failed to parse batch lottery results from localStorage:', e);
                            }
                        }
                        
                        // If no batch results are found, try to find single result
                        checkSavedResult();
                    }
                    break;
                    
                default:
                    log('Unhandled message type:', event.data.type);
            }
        } else {
            log('Received invalid message structure');
        }
    });
    
    // Notify parent window iframe is ready
    if (window.parent) {
        setTimeout(() => {
            window.parent.postMessage({ type: 'iframeReady' }, '*');
            log('Notify parent window iframe is ready');
        }, 500);
    }
}

/**
 * Bind close button event
 */
function bindCloseButtons() {
    // Top close button
    const closeBtn = document.getElementById('close-result-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLotteryResult);
        // Ensure button is visible
        closeBtn.style.display = 'flex';
        log('Top close button event bound');
    } else {
        log('Top close button element not found');
    }
    
    // Bottom close button
    const closeActionBtn = document.getElementById('close-action-btn');
    if (closeActionBtn) {
        closeActionBtn.addEventListener('click', closeLotteryResult);
        log('Bottom close button event bound');
    } else {
        log('Bottom close button element not found');
    }
    
    // Click overlay to close
    const overlay = document.getElementById('lottery-overlay');
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            // Close only when clicking on the overlay, not on the content area
            if (event.target === overlay) {
                closeLotteryResult();
            }
        });
        log('Overlay click close event bound');
    } else {
        log('Overlay element not found');
    }
}

/**
 * Bind view pet button
 */
function bindViewPetButton() {
    const viewPetBtn = document.getElementById('view-pet-btn');
    if (viewPetBtn) {
        viewPetBtn.addEventListener('click', () => {
            if (lotteryResult.isBatchMode) {
                // In batch mode, navigate to the pet list page
                const petsPageUrl = `/game.html?view=pets`;
                
                // Notify parent window to navigate to the pet list page
                if (window.parent && window.parent !== window) {
                    log('Notify parent window to navigate to:', petsPageUrl);
                    window.parent.postMessage({
                        action: 'navigate',
                        url: petsPageUrl
                    }, '*');
                } else {
                    // Direct navigation
                    log('Direct navigation to:', petsPageUrl);
                    window.location.href = petsPageUrl;
                }
            } else if (lotteryResult.currentResult) {
                // In single mode, navigate to the specific pet page
                const petId = lotteryResult.currentResult.tokenId;
                navigateToPetDetail(petId);
            }
            
            // Close lottery result popup
            closeLotteryResult();
        });
    }
}

/**
 * Close lottery result popup
 */
function closeLotteryResult() {
    const container = document.getElementById('lottery-container');
    if (container) {
        // Add exiting animation class
        container.classList.add('exiting');
        
        // Notify parent window after animation ends
        setTimeout(() => {
            notifyParentWindowClosed();
        }, 300); // Match CSS animation duration
    } else {
        notifyParentWindowClosed();
    }
}

/**
 * Notify parent window that the popup is closed
 */
function notifyParentWindowClosed() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'lotteryResultClosed'
        }, '*');
    }
    
    // If it's a standalone page, go back one page
    if (window.parent === window) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

/**
 * Handle URL parameters
 */
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if there is a debug parameter
    if (urlParams.has('debug') && urlParams.get('debug') === 'true') {
        lotteryResult.debug = true;
        log('Debug mode enabled');
    }
    
    // Check if there is a result parameter, allow passing result data through URL
    if (urlParams.has('result')) {
        try {
            const resultData = JSON.parse(decodeURIComponent(urlParams.get('result')));
            handleLotteryResult(resultData);
        } catch (error) {
            log('Failed to parse URL result parameter:', error);
        }
    }
}

/**
 * Check saved lottery result in localStorage
 */
function checkSavedResult() {
    try {
        // Check single result
        const savedResult = localStorage.getItem('lastLotteryResult');
        if (savedResult) {
            const resultData = JSON.parse(savedResult);
            handleLotteryResult(resultData);
            // Clear the stored result after displaying it
            localStorage.removeItem('lastLotteryResult');
            return resultData;
        }
        
        // Check batch results
        const savedBatchResults = localStorage.getItem('lastLotteryBatchResults');
        if (savedBatchResults) {
            const batchResultsData = JSON.parse(savedBatchResults);
            handleLotteryBatchResults(batchResultsData);
            // Clear the stored result after displaying it
            localStorage.removeItem('lastLotteryBatchResults');
        }
    } catch (error) {
        log('Failed to check saved lottery result in localStorage:', error);
    }
}

/**
 * Handle the lottery result obtained
 */
function handleLotteryResult(result) {
    log('Handle lottery result:', result);
    
    // Show loading state before displaying the result
    showLoadingState();
    
    // If there is no result or the result is invalid, try to get it from URL parameters
    if (!result || !result.tokenId) {
        log('Lottery result is invalid, try to get it from URL parameters');
        const urlResult = handleUrlParams();
        if (urlResult) {
            result = urlResult;
        } else {
            log('No valid data in URL parameters, try to get it from localStorage');
            // Try to get it from localStorage
            const savedResult = checkSavedResult();
            if (savedResult) {
                result = savedResult;
            } else {
                log('No valid lottery result data found');
                document.getElementById('loading-message').innerText = 'No lottery result data found';
                return;
            }
        }
    }
    
    // Save current result to global object
    lotteryResult.currentResult = result;
    lotteryResult.isBatchMode = false;
    
    // Handle the problem of inconsistent quality name key names
    if (!result.qualityName && result.quality_name) {
        result.qualityName = result.quality_name;
    }
    
    // Handle the problem of inconsistent pet type key names
    if (!result.nftType && result.pet_type) {
        result.nftType = result.pet_type;
    }
    
    // Ensure the container has an appropriate class identifier (non-batch mode)
    const container = document.getElementById('lottery-container');
    if (container) {
        container.classList.remove('batch-mode');
    }
    
    log('Prepare to update UI to display lottery result:', result);
    
    // If the result already contains complete information, display it directly
    if (result.imageUrl || result.image) {
        log('Result already contains image information, display it directly');
        updateResultUI(result);
        
        // Hide loading message
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        showResultPage();
        playCelebrationAnimation(result);
        return;
    }
    
    // Get more pet information from parent window or NFTManager contract
    fetchNFTInfo(result)
        .then(() => {
            log('Pet additional information obtained, prepare to update UI');
            // Update UI to display lottery result
            updateResultUI(result);
            
            // Hide loading message
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            
            // Show result page
            showResultPage();
            
            // Play celebration animation
            playCelebrationAnimation(result);
        })
        .catch(error => {
            log('Failed to get NFT information:', error);
            
            // Even if getting additional information fails, try to display the basic result
            updateResultUI(result);
            
            // Hide loading message
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            
            showResultPage();
        });
}

/**
 * Get NFT information from NFTManager
 * @param {Object} result - Lottery result object
 * @returns {Promise} Promise object
 */
async function fetchNFTInfo(result) {
    if (!result || !result.tokenId) {
        log('Lottery result lacks tokenId, cannot get NFT information');
        return;
    }
    
    try {
        // If the result already contains an image URL, use it directly
        if (result.imageUrl) {
            log('Lottery result already contains image URL, use it directly:', result.imageUrl);
            return;
        }
        
        // If the contract is not initialized, try to initialize it
        if (!lotteryResult.nftManagerContract) {
            log('NFTManager contract is not initialized, try to reinitialize it');
            initNFTManagerContract();
            
            // Wait 1 second before retrying
            if (!lotteryResult.nftManagerContract) {
                log('Waiting for contract initialization...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // If still not initialized successfully, use the backup method
                if (!lotteryResult.nftManagerContract) {
                    log('Contract initialization failed, try to use the backup method to get pet information');
                    return await fetchPetDetailsFromParent(result);
                }
            }
        }
        
        // Try to get pet metadata
        try {
            // Get NFT URI
            const tokenId = result.tokenId;
            let nftURI;
            
            try {
                if (typeof lotteryResult.nftManagerContract.methods._tokenURIs === 'function') {
                    nftURI = await lotteryResult.nftManagerContract.methods._tokenURIs(tokenId).call();
                    log('Using _tokenURIs method to get pet URI:', nftURI);
                } else if (typeof lotteryResult.nftManagerContract.methods.tokenURI === 'function') {
                    nftURI = await lotteryResult.nftManagerContract.methods.tokenURI(tokenId).call();
                    log('Using tokenURI method to get pet URI:', nftURI);
                } else {
                    log('Contract does not have _tokenURIs or tokenURI method, try other ways to get pet information');
                    
                    // Try to get pet information from parent window
                    return await fetchPetDetailsFromParent(result);
                }
            } catch (uriError) {
                log('Failed to get pet URI:', uriError);
                // Try to get pet information from parent window
                return await fetchPetDetailsFromParent(result);
            }
            
            if (!nftURI) {
                log('Failed to get pet URI, try to get pet information from parent window');
                return await fetchPetDetailsFromParent(result);
            }
            
            // Get pet quality ID
            try {
                if (typeof lotteryResult.nftManagerContract.methods.tokenQualityId === 'function') {
                    const qualityId = await lotteryResult.nftManagerContract.methods.tokenQualityId(tokenId).call();
                    log('Got pet quality ID:', qualityId);
                    // Update quality
                    result.qualityId = qualityId;
                }
            } catch (qualityError) {
                log('Failed to get pet quality ID:', qualityError);
            }
            
            // Parse NFT URI to get metadata
            if (nftURI) {
                try {
                    // Parse according to URI type
                    if (nftURI.startsWith('http')) {
                        // HTTP URL
                        const response = await fetch(nftURI);
                        const metadata = await response.json();
                        
                        if (metadata) {
                            processMetadata(metadata, result);
                            log('Successfully got and processed pet metadata from HTTP URL');
                        }
                    } else if (nftURI.startsWith('data:application/json;base64,')) {
                        // Base64 encoded JSON
                        const base64Data = nftURI.replace('data:application/json;base64,', '');
                        const jsonString = atob(base64Data);
                        const metadata = JSON.parse(jsonString);
                        
                        if (metadata) {
                            processMetadata(metadata, result);
                            log('Successfully got and processed pet metadata from Base64 data');
                        }
                    } else if (nftURI.startsWith('ipfs://')) {
                        // IPFS link
                        const ipfsHash = nftURI.replace('ipfs://', '');
                        const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                        
                        try {
                            const response = await fetch(ipfsGatewayUrl);
                            const metadata = await response.json();
                            
                            if (metadata) {
                                processMetadata(metadata, result);
                                log('Successfully got and processed pet metadata from IPFS');
                            }
                        } catch (ipfsError) {
                            log('Failed to get metadata from IPFS, try backup gateway:', ipfsError);
                            // Try backup gateway
                            const backupGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                            const backupResponse = await fetch(backupGatewayUrl);
                            const backupMetadata = await backupResponse.json();
                            
                            if (backupMetadata) {
                                processMetadata(backupMetadata, result);
                                log('Successfully got and processed pet metadata from backup IPFS gateway');
                            }
                        }
                    } else {
                        log('Unknown URI format, cannot parse:', nftURI);
                        // Try parent window method
                        return await fetchPetDetailsFromParent(result);
                    }
                } catch (metadataError) {
                    log('Failed to parse metadata:', metadataError);
                    // Try parent window method
                    return await fetchPetDetailsFromParent(result);
                }
            }
        } catch (error) {
            log('Failed to get pet information:', error);
            // Use default values
            lotteryResult.nftNameMapping[result.tokenId] = `Pet #${result.tokenId}`;
            lotteryResult.nftTypeMapping[result.tokenId] = 'Unknown type';
            
            // Try parent window method
            return await fetchPetDetailsFromParent(result);
        }
    } catch (outerError) {
        log('Failed to get NFT information:', outerError);
        // Use default values
        lotteryResult.nftNameMapping[result.tokenId] = `Pet #${result.tokenId}`;
        lotteryResult.nftTypeMapping[result.tokenId] = 'Unknown type';
    }
    
    // Process metadata helper function
    function processMetadata(metadata, result) {
        // Save pet name
        const petName = metadata.name || `Unknown pet`;
        lotteryResult.nftNameMapping[result.tokenId] = petName;
        // Set directly to result object
        result.petName = petName;
        
        // Save pet type
        lotteryResult.nftTypeMapping[result.tokenId] = metadata.species || metadata.type || 'Unknown type';
        result.petType = lotteryResult.nftTypeMapping[result.tokenId];
        
        // Save image URL
        if (metadata.image) {
            // Process IPFS image URL
            if (metadata.image.startsWith('ipfs://')) {
                const ipfsHash = metadata.image.replace('ipfs://', '');
                result.imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
            } else {
                result.imageUrl = metadata.image;
            }
            log('Set pet image URL:', result.imageUrl);
        }
        
        // Save other attributes
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
            // Iterate through attributes to find type and quality information
            for (const attr of metadata.attributes) {
                if (attr.trait_type === 'Type' || attr.trait_type === 'Species') {
                    const typeValue = attr.value || lotteryResult.nftTypeMapping[result.tokenId];
                    lotteryResult.nftTypeMapping[result.tokenId] = typeValue;
                    result.petType = typeValue;
                } else if (attr.trait_type === 'Name') {
                    // Some metadata may contain name in attributes
                    result.petName = attr.value || result.petName;
                    lotteryResult.nftNameMapping[result.tokenId] = result.petName;
                }
            }
        }
    }
    
    // Helper function to fetch pet details from parent window
    async function fetchPetDetailsFromParent(result) {
        return new Promise((resolve) => {
            // Check if parent window exists
            if (window.parent && window.parent !== window) {
                log('Attempting to fetch pet details from parent window');
                
                // Create message handler function
                const messageHandler = (event) => {
                    if (event.data && event.data.type === 'petDetails' && event.data.tokenId == result.tokenId) {
                        log('Received pet details from parent window:', event.data);
                        
                        // Remove event listener
                        window.removeEventListener('message', messageHandler);
                        
                        // Process received data
                        const petData = event.data.data;
                        if (petData) {
                            if (petData.name) {
                                // Set to mapping and result object
                                lotteryResult.nftNameMapping[result.tokenId] = petData.name;
                                result.petName = petData.name;
                                result.displayName = petData.name;
                            }
                            if (petData.type) {
                                lotteryResult.nftTypeMapping[result.tokenId] = petData.type;
                                result.petType = petData.type;
                                result.nftType = petData.type;
                            }
                            if (petData.imageUrl) {
                                result.imageUrl = petData.imageUrl;
                                result.image = petData.imageUrl;
                            }
                            
                            // Update UI
                            updateResultUI(result);
                        }
                        
                        resolve();
                    }
                };
                
                // Add message listener
                window.addEventListener('message', messageHandler);
                
                // Send request to parent window
                window.parent.postMessage({
                    type: 'requestPetDetails',
                    tokenId: result.tokenId
                }, '*');
                
                // Set timeout to avoid infinite waiting
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                    log('Request pet details from parent window timeout');
                    resolve();
                }, 3000);
            } else {
                log('No parent window or running in standalone page');
                resolve();
            }
        });
    }
}

/**
 * Process possible IPFS URLs and convert them to HTTP URLs
 * @param {string} url - Original image URL
 * @returns {string} Processed URL
 */
function handleImageUrl(url) {
    if (!url) return null;
    
    // Process IPFS links
    if (url.startsWith('ipfs://')) {
        // Convert IPFS links to HTTP links
        const ipfsHash = url.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    // If it's base64 image data, keep it as is
    if (url.startsWith('data:image/')) {
        return url;
    }
    
    // If it's a known image domain or relative URL, keep it as is
    return url;
}

/**
 * Update result UI display
 * @param {Object} result - Lottery result object
 */
function updateResultUI(result) {
    log('Update UI to display lottery result:', result);
    
    // Show container
    const container = document.getElementById('lottery-container');
    if (container) {
        container.style.display = 'flex';
    }
    
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Directly hide loading message
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    // Show result content and bottom buttons
    const resultContent = document.querySelector('.result-content');
    if (resultContent) {
        resultContent.style.display = 'flex';
    }
    
    const resultFooter = document.querySelector('.result-footer');
    if (resultFooter) {
        resultFooter.style.display = 'flex';
    }
    
    // Set title
    document.getElementById('result-title').innerHTML = '<i class="fas fa-gift"></i> lottery result';
    
    // Get quality corresponding color
    const qualityColorMap = {
        'COMMON': '#94a3b8',  // Gray blue
        'GOOD': '#4ade80',    // Clean green
        'EXCELLENT': '#38bdf8', // Light blue
        'RARE': '#a855f7',    // Purple
        'LEGENDARY': '#f59e0b' // Orange
    };
    
    // Get quality value and corresponding color
    const qualityName = (result.qualityName || '').toUpperCase();
    const qualityColor = qualityColorMap[qualityName] || '#94a3b8';
    
    // Set quality label and color
    const qualityElement = document.getElementById('pet-quality');
    if (qualityElement) {
        qualityElement.textContent = result.qualityName ? i18n.t(`quality.${result.qualityName.toLowerCase()}`) : '普通';
        qualityElement.className = `value quality-${result.qualityName ? result.qualityName.toLowerCase() : 'common'}`;
        qualityElement.innerHTML = `<i class="fas fa-star"></i> ${qualityElement.textContent}`;
    }
    
    // Set quality label
    const qualityBadge = document.getElementById('quality-badge');
    if (qualityBadge) {
        qualityBadge.textContent = result.qualityName ? i18n.t(`quality.${result.qualityName.toLowerCase()}`) : '普通';
        qualityBadge.className = `quality-badge quality-${result.qualityName ? result.qualityName.toLowerCase() : 'common'}`;
    }
    
    // Set pet image background color
    const petImageBox = document.getElementById('pet-image-box');
    if (petImageBox) {
        petImageBox.className = `pet-image quality-${result.qualityName ? result.qualityName.toLowerCase() : 'common'}`;
    }
    
    // Set pet emoji
    const petEmoji = document.getElementById('pet-emoji');
    if (petEmoji) {
        const emojiMap = {
            'COMMON': '🐾',      // Common
            'GOOD': '🐾✨',      // Good
            'EXCELLENT': '🐾⭐',  // Excellent
            'RARE': '🐾💫',      // Rare
            'LEGENDARY': '🐾🌟'   // Legendary
        };
        petEmoji.textContent = emojiMap[qualityName] || '🐾';
    }
    
    // Set pet name - increase lookup order
    const petName = document.getElementById('pet-name');
    const petNameDisplay = document.getElementById('pet-name-display');
    // Lookup order: petName > displayName > global mapping > default name
    const displayName = result.petName || 
                        result.displayName || 
                        lotteryResult.nftNameMapping[result.tokenId] || 
                        `Unknown pet`;
    
    if (petName) {
        petName.textContent = displayName;
    }
    
    if (petNameDisplay) {
        petNameDisplay.innerHTML = `<i class="fas fa-tag"></i> ${displayName}`;
    }
    
    // Set pet ID
    const petId = document.getElementById('pet-id');
    if (petId) {
        petId.innerHTML = `<i class="fas fa-fingerprint"></i> #${result.tokenId || 'Unknown'}`;
    }
    
    // Set pet type
    const petType = document.getElementById('pet-type');
    if (petType) {
        // Use petType field if available, otherwise use other possible field names
        const typeValue = result.petType || result.type || result.nftType || lotteryResult.nftTypeMapping[result.tokenId] || 'Unknown';
        petType.innerHTML = `<i class="fas fa-paw"></i> ${typeValue}`;
    }
    
    // Set pet rarity
    const petRarity = document.getElementById('pet-rarity');
    if (petRarity) {
        petRarity.innerHTML = `<i class="fas fa-gem"></i> ${result.rarityLevel || result.qualityDisplay || 'Common'}`;
    }
    
    // Set lottery type
    const lotteryType = document.getElementById('lottery-type');
    if (lotteryType) {
        lotteryType.innerHTML = `<i class="fas fa-egg"></i> ${result.lotteryTypeName || 'Common egg'}`;
    }
    
    // Set pet image
    const petImage = document.getElementById('pet-image');
    if (petImage) {
        // Check various possible fields that may contain image URL
        let imageUrl = result.imageUrl || result.image || result.img || result.petImage;
        
        // Process possible IPFS URLs
        imageUrl = imageUrl ? handleImageUrl(imageUrl) : null;
        
        if (imageUrl) {
            // Use provided image URL directly
            petImage.src = imageUrl;
            petImage.style.display = 'block';
            
            // Hide emoji
            if (petEmoji) petEmoji.style.display = 'none';
            
            log('Using image URL:', imageUrl);
        } else if (result.tokenURI && typeof result.tokenURI === 'string') {
            // Try using image from tokenURI
            try {
                // Check if it's JSON format
                if (result.tokenURI.startsWith('{')) {
                    const metadata = JSON.parse(result.tokenURI);
                    if (metadata.image) {
                        const metadataImageUrl = handleImageUrl(metadata.image);
                        petImage.src = metadataImageUrl;
                        petImage.style.display = 'block';
                        // Hide emoji
                        if (petEmoji) petEmoji.style.display = 'none';
                        log('Extracted image from tokenURI:', metadataImageUrl);
                    }
                } else if (result.tokenURI.startsWith('data:application/json;base64,')) {
                    // Base64 encoded JSON
                    const base64Data = result.tokenURI.replace('data:application/json;base64,', '');
                    const jsonString = atob(base64Data);
                    const metadata = JSON.parse(jsonString);
                    if (metadata.image) {
                        const metadataImageUrl = handleImageUrl(metadata.image);
                        petImage.src = metadataImageUrl;
                        petImage.style.display = 'block';
                        // Hide emoji
                        if (petEmoji) petEmoji.style.display = 'none';
                        log('Extracted image from base64 tokenURI:', metadataImageUrl);
                    }
                }
            } catch (e) {
                log('Failed to parse tokenURI:', e);
            }
        } else {
            // Use default image
            petImage.src = '../../resources/images/pets/pet-placeholder.png';
            log('Using default image');
            
            // Show emoji as fallback
            if (petEmoji) petEmoji.style.display = 'block';
        }
        
        // Set image load error handling
        setupImageErrorHandling(petImage, petEmoji, result);
    }
    
    // Show result page
    showResultPage();
    
    // Play celebration animation (adjust effect based on quality)
    playCelebrationAnimation(result);
}

/**
 * Show result page
 */
function showResultPage() {
    // Get container element
    const container = document.getElementById('lottery-container');
    const overlay = document.getElementById('lottery-overlay');
    
    // Show container
    if (container) {
        container.style.display = 'flex';
    }
    
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Ensure content is visible
    const resultContent = document.querySelector('.result-content');
    if (resultContent) {
        resultContent.style.display = 'flex';
    }
    
    // Handle footer visibility - hide in batch mode
    const resultFooter = document.querySelector('.result-footer');
    if (resultFooter) {
        if (lotteryResult.isBatchMode) {
            resultFooter.style.display = 'none';
        } else {
            resultFooter.style.display = 'flex';
        }
    }
    
    // Fade in/out animation
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.display = 'flex';
        
        // Trigger reflow to apply animation
        void overlay.offsetWidth;
        
        overlay.style.opacity = '1';
    }
    
    // Container animation
    if (container) {
        container.classList.add('entering');
        
        // Set appropriate max height based on content
        adjustContainerHeight(container);
        
        // Remove animation class to avoid repetition
        setTimeout(() => {
            container.classList.remove('entering');
        }, 500);
    }
    
    // Ensure close button is visible and available
    const closeBtn = document.getElementById('close-result-btn');
    if (closeBtn) {
        closeBtn.style.display = 'flex';
    }
    
    // Hide loading message
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    log('Result page displayed, loading state hidden');
}

/**
 * Adjust container height based on content
 * @param {HTMLElement} container - The lottery result container
 */
function adjustContainerHeight(container) {
    if (!container) return;
    
    // Check if in batch mode
    const isBatch = container.classList.contains('batch-mode');
    
    // Get content and footer elements
    const content = container.querySelector('.result-content');
    const footer = container.querySelector('.result-footer');
    const header = container.querySelector('.result-header');
    
    if (!content || !footer || !header) return;
    
    // Reset any inline heights
    content.style.maxHeight = '';
    
    // For batch mode, ensure we have enough space for content
    if (isBatch) {
        // Let CSS handle the heights in batch mode
        return;
    }
    
    // For single mode, make sure content has enough space
    setTimeout(() => {
        // Force a small delay to ensure the DOM has updated
        const viewportHeight = window.innerHeight;
        const headerHeight = header.offsetHeight;
        const footerHeight = footer.offsetHeight;
        const maxContentHeight = viewportHeight - headerHeight - footerHeight - 40; // 40px for margins
        
        // Set a reasonable min height
        const minHeight = 350;
        content.style.minHeight = `${Math.max(minHeight, maxContentHeight)}px`;
        
        log('Adjusted container heights - viewport:', viewportHeight, 
            'header:', headerHeight, 
            'footer:', footerHeight, 
            'content max height:', maxContentHeight);
    }, 100);
}

/**
 * Play celebration animation
 * @param {Object} result - Lottery result object
 */
function playCelebrationAnimation(result) {
    // Get quality value
    const qualityName = (result.qualityName || '').toUpperCase();
    
    // Based on quality decide confetti count
    let confettiCount = 30; // Default value
    
    if (qualityName === 'GOOD') {
        confettiCount = 50;
    } else if (qualityName === 'EXCELLENT') {
        confettiCount = 80;
    } else if (qualityName === 'RARE') {
        confettiCount = 120;
    } else if (qualityName === 'LEGENDARY') {
        confettiCount = 150;
    }
    
    // Create confetti
    createConfetti(confettiCount, qualityName);
    
    // Add pet image animation effect
    const petImageBox = document.getElementById('pet-image-box');
    if (petImageBox) {
        petImageBox.classList.add('entering');
    }
    
    // Add legendary effect
    if (qualityName === 'LEGENDARY') {
        // Play sound effect (if available)
        const audio = new Audio('../../resources/sounds/legendary.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => log('Failed to play sound:', e));
    }
}

/**
 * Create confetti effect
 * @param {number} count - Confetti count
 * @param {string} qualityName - Quality name
 */
function createConfetti(count = 50, qualityName = 'COMMON') {
    const container = document.getElementById('confetti-container') || document.body;
    const colors = getConfettiColors(qualityName);
    
    // Clear existing confetti
    if (container.id === 'confetti-container') {
        container.innerHTML = '';
    }
    
    // Create confetti elements
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random position
        confetti.style.left = `${Math.random() * 100}%`;
        
        // Random delay
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        // Random size
        const size = Math.floor(Math.random() * 8) + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size * 1.5}px`;
        
        // Random rotation
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        // Random color
        const colorIndex = Math.floor(Math.random() * colors.length);
        confetti.style.backgroundColor = colors[colorIndex];
        
        // Random shape
        const shapes = ['', 'circle', 'square'];
        const shapeIndex = Math.floor(Math.random() * shapes.length);
        if (shapes[shapeIndex] === 'circle') {
            confetti.style.borderRadius = '50%';
        } else if (shapes[shapeIndex] === 'square') {
            confetti.style.borderRadius = '0';
        }
        
        // Add to container
        container.appendChild(confetti);
        
        // Set auto removal
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

/**
 * Get confetti colors based on quality
 * @param {string} qualityName - Quality name
 * @returns {Array<string>} Color array
 */
function getConfettiColors(qualityName) {
    // Base colors
    const baseColors = ['#3b82f6', '#60a5fa', '#ffffff', '#f8fafc'];
    
    // Return different colors based on quality
    switch(qualityName) {
        case 'GOOD':
            return ['#4ade80', '#a7f3d0', '#ffffff', '#10b981'];
        case 'EXCELLENT':
            return ['#38bdf8', '#7dd3fc', '#ffffff', '#0284c7'];
        case 'RARE':
            return ['#a855f7', '#d8b4fe', '#ffffff', '#7e22ce'];
        case 'LEGENDARY':
            return ['#f59e0b', '#fcd34d', '#ffffff', '#ffedd5', '#92400e'];
        default:
            return baseColors;
    }
}

/**
 * Localize content
 */
function localizeContent() {
    try {
        // Check if i18n object is available
        if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
            // Translate quality mapping
            lotteryResult.qualityMapping = {
                0: { name: i18n.t('market.rarity.common') || 'common', color: 'common', emoji: '🐾' },
                1: { name: i18n.t('market.rarity.good') || 'good', color: 'good', emoji: '🐾✨' },
                2: { name: i18n.t('market.rarity.excellent') || 'excellent', color: 'excellent', emoji: '🐾⭐' },
                3: { name: i18n.t('market.rarity.rare') || 'rare', color: 'rare', emoji: '🐾💫' },
                4: { name: i18n.t('market.rarity.legendary') || 'legendary', color: 'legendary', emoji: '🐾🌟' }
            };
            
            // Translate lottery type mapping
            lotteryResult.lotteryTypeMapping = {
                'CommonEgg': i18n.t('shop.items.commonEgg') || 'common egg',
                'RareEgg': i18n.t('shop.items.rareEgg') || 'rare egg',
                'LegendaryEgg': i18n.t('shop.items.legendaryEgg') || 'legendary egg',
                'FreeNFT': i18n.t('shop.items.freeNFT') || 'free pet'
            };
            
            // Translate interface elements
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (key) {
                    const translation = i18n.t(key);
                    if (translation) {
                        element.textContent = translation;
                    }
                }
            });
            
            // Translate buttons
            const closeActionBtn = document.getElementById('close-action-btn');
            if (closeActionBtn) {
                closeActionBtn.textContent = i18n.t('button.close') || 'close';
            }
            
            const viewPetBtn = document.getElementById('view-pet-btn');
            if (viewPetBtn) {
                viewPetBtn.textContent = i18n.t('button.viewPet') || 'view pet';
            }
            
            // If there is a current result, update UI to use translated text
            if (lotteryResult.currentResult) {
                updateResultUI(lotteryResult.currentResult);
            }
        } else {
            log('i18n object is not available, cannot localize content');
        }
    } catch (error) {
        log('Error localizing content:', error);
    }
}

/**
 * Record logs
 * Only output in debug mode
 */
function log(...args) {
    if (lotteryResult.debug || localStorage.getItem('debug') === 'true') {
        console.log('[Lottery Result]', ...args);
    }
}

/**
 * Create sample results
 * For testing display effects
 * @param {number} quality - Quality level (0-4)
 * @returns {Object} Sample result object
 */
function createTestResult(quality = 0) {
    return {
        user: '0x1234567890abcdef1234567890abcdef12345678',
        tokenId: Math.floor(Math.random() * 10000),
        quality: quality,
        qualityName: lotteryResult.qualityMapping[quality].name,
        nftId: Math.floor(Math.random() * 100000),
        lotteryType: ['CommonEgg', 'RareEgg', 'LegendaryEgg', 'FreeNFT'][Math.floor(Math.random() * 4)],
        lotteryTypeName: ''
    };
}

/**
 * Add styles for batch lottery results
 */
function addBatchResultStyles() {
    // Check if styles are already added
    if (document.getElementById('batch-result-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'batch-result-styles';
    style.textContent = `
        .batch-results-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 10px;
        }
        
        .batch-summary {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
        }
        
        .batch-summary h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: #fff;
        }
        
        .quality-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .quality-item {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            padding: 6px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 120px;
        }
        
        .quality-name {
            font-weight: 500;
        }
        
        .quality-count {
            font-weight: bold;
        }
        
        .batch-results-list {
            margin-bottom: 20px;
        }
        
        .batch-results-list h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: #fff;
        }
        
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .result-card {
            background-color: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        
        .result-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .card-image {
            position: relative;
            width: 100%;
            height: 120px;
            background-color: rgba(0, 0, 0, 0.2);
        }
        
        .card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .card-quality {
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            background-color: #8e8e8e;
        }
        
        .card-info {
            padding: 8px;
        }
        
        .card-type {
            font-size: 11px;
            color: #aaa;
            margin-bottom: 4px;
        }
        
        .card-name {
            font-size: 13px;
            font-weight: bold;
            color: white;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .card-token-id {
            font-size: 10px;
            color: #888;
        }
        
        /* Hide footer in batch mode */
        .lottery-result-container.batch-mode .result-footer {
            display: none !important;
        }
    `;
    
    // Add styles to document
    document.head.appendChild(style);
}

/**
 * Process batch lottery results
 * @param {Array<Object>} results - Lottery results array
 */
function handleLotteryBatchResults(results) {
    
    // Add styles
    addBatchResultStyles();
    
    // Validate results
    if (!results || !Array.isArray(results) || results.length === 0) {
        log('Batch lottery results are invalid');
        document.getElementById('loading-message').innerText = 'No valid lottery result data found';
        return;
    }

    // Show loading state
    showLoadingState();
    
    // Set batch mode flag
    lotteryResult.isBatchMode = true;
    
    // Ensure container has appropriate class identifier (batch mode)
    const container = document.getElementById('lottery-container');
    if (container) {
        container.classList.add('batch-mode');
    }
    
    // Preprocess result data - ensure all necessary fields exist
    const processedResults = results.map(result => {
        // Handle missing quality name
        if (!result.qualityName && result.quality !== undefined) {
            const qualityNames = {
                0: 'COMMON',
                1: 'GOOD',
                2: 'EXCELLENT',
                3: 'RARE',
                4: 'LEGENDARY'
            };
            result.qualityName = qualityNames[result.quality] || 'Unknown';
        }
        
        // Handle missing lottery type name
        if (!result.lotteryTypeName && result.lotteryType) {
            const lotteryTypeNames = {
                'CommonEgg': 'COMMON EGG',
                'RareEgg': 'RARE EGG',
                'LegendaryEgg': 'LEGENDARY EGG',
                'FreeNFT': 'FREE NFT',
                'ClaimEgg': 'CLAIM EGG'
            };
            result.lotteryTypeName = lotteryTypeNames[result.lotteryType] || result.lotteryType;
        }
        
        // Use petName as display name if it exists
        if (result.petName && !result.displayName) {
            result.displayName = result.petName;
        }
        
        return result;
    });
    
    // Save batch results to global object
    lotteryResult.batchResults = processedResults;
    
    // Asynchronously fetch detailed information for each pet
    Promise.all(processedResults.map(fetchPetDetailsFromParentWindow))
        .then(updatedResults => {
            // Count different quality results
            const qualityCounts = countQualityResults(updatedResults);
            log('Quality counts:', qualityCounts);
            
            // Update UI to display batch results
            updateBatchResultUI(updatedResults, qualityCounts);
            
            // Show result page
            showResultPage();
            
            // Play celebration animation
            playCelebrationAnimation({ quality: updatedResults[0].quality });
        })
        .catch(error => {
            log('Failed to fetch pet details:', error);
            
            // Even if there is an error, try to display basic results
            const qualityCounts = countQualityResults(processedResults);
            updateBatchResultUI(processedResults, qualityCounts);
            showResultPage();
            playCelebrationAnimation({ quality: processedResults[0].quality });
        });
}

/**
 * Show loading state
 */
function showLoadingState() {
    // Ensure container is hidden until data is loaded
    const container = document.getElementById('lottery-container');
    if (container) {
        container.style.display = 'none';
    }
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    // Update loading message
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.textContent = i18n && typeof i18n.t === 'function' 
            ? i18n.t('lottery.loading') || 'Loading lottery results...'
            : 'Loading lottery results...';
        loadingMessage.style.display = 'block';
    }
    
    log('Loading state shown');
}

/**
 * Count the number of different quality results
 * @param {Array<Object>} results - Lottery results array
 * @returns {Object} Quality count result
 */
function countQualityResults(results) {
    const counts = {
        COMMON: 0,
        GOOD: 0,
        EXCELLENT: 0,
        RARE: 0,
        LEGENDARY: 0
    };
    
    results.forEach(result => {
        // If qualityName is a string, use it directly
        if (result.qualityName && typeof result.qualityName === 'string') {
            const qualityUpper = result.qualityName.toUpperCase();
            if (counts[qualityUpper] !== undefined) {
                counts[qualityUpper]++;
            }
        }
        // If quality is a number, convert it and use it
        else if (result.quality !== undefined) {
            const qualityMap = {
                0: 'COMMON',
                1: 'GOOD',
                2: 'EXCELLENT',
                3: 'RARE',
                4: 'LEGENDARY'
            };
            const qualityName = qualityMap[result.quality];
            if (qualityName && counts[qualityName] !== undefined) {
                counts[qualityName]++;
            }
        }
    });
    
    return counts;
}

/**
 * Update batch result UI
 * @param {Array} results - Lottery results array
 * @param {Object} qualityCounts - Quality count result
 */
function updateBatchResultUI(results, qualityCounts) {
    // Set title
    document.getElementById('result-title').innerHTML = '<i class="fas fa-gift"></i> ' + i18n.t('lottery.batchResultTitle', {count: results.length}) || `获得 ${results.length} 个新宠物`;
    
    // Get batch result container
    const batchContainer = document.querySelector('.result-content');
    if (!batchContainer) return;
    
    // Add batch mode style class
    batchContainer.classList.add('batch-mode');
    
    // Clear content
    batchContainer.innerHTML = '';
    
    // Add quality statistics
    batchContainer.innerHTML += createQualitySummaryHTML(qualityCounts);
    
    // Add results list
    batchContainer.innerHTML += createResultsListHTML(results);
    
    // Hide loading message
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    // Hide footer buttons in batch mode
    const resultFooter = document.querySelector('.result-footer');
    if (resultFooter) {
        resultFooter.style.display = 'none';
    }
    
    // Show result page
    showResultPage();
    
    // Show result container
    batchContainer.style.display = 'block';
    
    // Play appropriate celebration animation
    if (qualityCounts.LEGENDARY > 0) {
        playCelebrationAnimation({qualityName: 'LEGENDARY'});
    } else if (qualityCounts.RARE > 0) {
        playCelebrationAnimation({qualityName: 'RARE'});
    } else if (qualityCounts.EXCELLENT > 0) {
        playCelebrationAnimation({qualityName: 'EXCELLENT'});
    } else {
        playCelebrationAnimation({qualityName: 'COMMON'});
    }
}

/**
 * Create HTML for quality statistics of batch lottery results
 * @param {Object} qualityCounts - Quality count result
 * @returns {string} Generated HTML string
 */
function createQualitySummaryHTML(qualityCounts) {
    const qualityNames = {
        'COMMON': i18n.t('quality.common'),
        'GOOD': i18n.t('quality.good'),
        'EXCELLENT': i18n.t('quality.excellent'),
        'RARE': i18n.t('quality.rare'),
        'LEGENDARY': i18n.t('quality.legendary')
    };
    
    // Create quality statistics HTML
    let qualityHTML = '';
    
    for (const quality in qualityCounts) {
        if (qualityCounts[quality] > 0) {
            qualityHTML += `
                <div class="quality-count-item quality-${quality.toLowerCase()}">
                    <span class="quality-label">${qualityNames[quality] || quality}</span>
                    <span class="quality-count">${qualityCounts[quality]}</span>
                </div>
            `;
        }
    }
    
    return `
        <div class="batch-summary">
            <div class="summary-title">${i18n.t('lottery.summary') || 'Lottery Result Summary'}</div>
            <div class="quality-counts">
                ${qualityHTML}
            </div>
        </div>
    `;
}

/**
 * Create results list HTML
 * @param {Array} results - Lottery results array
 * @returns {string} Generated HTML string
 */
function createResultsListHTML(results) {
    let resultsHTML = '';
    
    // Create card for each pet
    results.forEach(result => {
        // Get pet name and type
        const petName = result.petName || result.displayName || lotteryResult.nftNameMapping[result.tokenId] || `Pet #${result.tokenId}`;
        const petType = result.petType || result.nftType || lotteryResult.nftTypeMapping[result.tokenId] || 'Unknown';
        const qualityName = (result.qualityName || 'COMMON').toUpperCase();
        const qualityLabel = i18n.t(`quality.${qualityName.toLowerCase()}`) || qualityName;
        
        // Get image URL
        let imageUrl = result.imageUrl || result.image || '../../resources/images/pets/pet-placeholder.png';
        
        // Create card
        resultsHTML += `
            <div class="result-card" data-id="${result.tokenId}" onclick="navigateToPetDetail(${result.tokenId})">
                <div class="card-header quality-${qualityName.toLowerCase()}">${qualityLabel}</div>
                <div class="card-body">
                    <div class="card-image">
                        <img src="${imageUrl}" alt="${petName}" onerror="this.src='../../resources/images/pets/pet-placeholder.png'">
                    </div>
                    <div class="card-info">
                        <div class="card-id">#${result.tokenId}</div>
                        <div class="card-name">${petName}</div>
                        <div class="card-type">${petType}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return `<div class="results-grid">${resultsHTML}</div>`;
}

/**
 * Navigate to pet detail page
 * @param {string} petId - Pet ID
 */
function navigateToPetDetail(petId) {
    if (!petId) return;
    
    // Notify parent window to navigate to pet detail page
    try {
        window.parent.postMessage({
            type: 'navigateToPet',
            petId: petId
        }, '*');
        
        // Close lottery result window
        closeLotteryResult();
    } catch (error) {
        log('Failed to navigate to pet detail page:', error);
    }
}

/**
 * Get color corresponding to quality
 * @param {string} qualityName - Quality name
 * @returns {string} Color code
 */
function getQualityColor(qualityName) {
    const quality = (qualityName || '').toUpperCase();
    switch (quality) {
        case 'COMMON': return '#8e8e8e';
        case 'GOOD': return '#4caf50';
        case 'EXCELLENT': return '#2196f3';
        case 'RARE': return '#ff9800';
        case 'LEGENDARY': return '#f44336';
        default: return '#8e8e8e';
    }
}

/**
 * Try to get pet details from parent window
 * @param {Object} result - Result object containing tokenId
 * @returns {Promise<Object>} Updated result object
 */
function fetchPetDetailsFromParentWindow(result) {
    return new Promise((resolve) => {
        // If there is no tokenId, return the original result
        if (!result || !result.tokenId) {
            resolve(result);
            return;
        }
        
        const tokenId = result.tokenId;
        log('Try to get pet details from parent window:', tokenId);
        
        // Check if there is complete information
        if (result.imageUrl && result.petName) {
            log('Result has complete information, no need to get:', result);
            resolve(result);
            return;
        }
        
        // Check if parent window exists
        if (!window.parent || window.parent === window) {
            log('Unable to access parent window, returning original result');
            resolve(result);
            return;
        }
        
        // Create a timeout mechanism
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            log('Timeout getting pet details from parent window, returning original result');
            resolve(result);
        }, 3000);
        
        // Create message handling function
        function handleMessage(event) {
            if (event.data && event.data.type === 'petDetails' && 
                event.data.tokenId == tokenId && event.data.data) {
                
                log('Received pet details from parent window:', event.data.data);
                
                // Clear timeout and remove listener
                clearTimeout(timeout);
                window.removeEventListener('message', handleMessage);
                
                // Update result object
                const petData = event.data.data;
                const updatedResult = { ...result };
                
                if (petData.name) {
                    updatedResult.petName = petData.name;
                    updatedResult.displayName = petData.name;
                }
                
                if (petData.type) {
                    updatedResult.petType = petData.type;
                    updatedResult.nftType = petData.type;
                }
                
                if (petData.imageUrl) {
                    updatedResult.imageUrl = petData.imageUrl;
                    updatedResult.image = petData.imageUrl;
                }
                
                if (petData.quality) {
                    if (!updatedResult.qualityName) {
                        updatedResult.qualityName = petData.quality;
                    }
                }
                
                // Save pet name and type to global mapping for other functions
                lotteryResult.nftNameMapping[tokenId] = petData.name || updatedResult.petName || `Pet #${tokenId}`;
                lotteryResult.nftTypeMapping[tokenId] = petData.type || updatedResult.petType || 'Unknown type';
                
                // Return updated result
                resolve(updatedResult);
            }
        }
        
        // Add message listener
        window.addEventListener('message', handleMessage);
        
        // Send request to parent window
        window.parent.postMessage({
            type: 'requestPetDetails',
            tokenId: tokenId.toString()
        }, '*');
    });
}

// Modify image loading error handling, add a backup plan to get details from parent window
function setupImageErrorHandling(petImage, petEmoji, result) {
    if (!petImage) return;
    
    petImage.onerror = () => {
        log('Pet image loading failed, trying to get details from parent window');
        
        // If there is tokenId, try to get more details from parent window
        if (result.tokenId) {
            fetchPetDetailsFromParentWindow(result)
                .then(petData => {
                    if (petData && petData.imageUrl) {
                        log('Got image URL from parent window:', petData.imageUrl);
                        // Handle possible IPFS URL
                        const processedUrl = handleImageUrl(petData.imageUrl);
                        petImage.src = processedUrl;
                        
                        // Hide emoji
                        if (petEmoji) petEmoji.style.display = 'none';
                        
                        // Update other possible fields
                        if (petData.name && !result.petName) {
                            result.petName = petData.name;
                            const nameElement = document.getElementById('pet-name');
                            if (nameElement) nameElement.textContent = petData.name;
                            
                            const nameDisplay = document.getElementById('pet-name-display');
                            if (nameDisplay) nameDisplay.innerHTML = `<i class="fas fa-tag"></i> ${petData.name}`;
                        }
                        
                        if (petData.type && !result.petType) {
                            result.petType = petData.type;
                            const typeElement = document.getElementById('pet-type');
                            if (typeElement) typeElement.innerHTML = `<i class="fas fa-paw"></i> ${petData.type}`;
                        }
                    } else {
                        // If unable to get image, use default image
                        fallbackToDefaultImage();
                    }
                })
                .catch(error => {
                    log('Failed to get pet details:', error);
                    fallbackToDefaultImage();
                });
        } else {
            fallbackToDefaultImage();
        }
        
        // Fallback to default image helper function
        function fallbackToDefaultImage() {
            log('Using default image');
            petImage.src = '../../resources/images/pets/pet-placeholder.png';
            // Show emoji
            if (petEmoji) petEmoji.style.display = 'block';
        }
    };
}

// Export as a global object
window.lotteryResultModule = {
    show: handleLotteryResult,
    showBatch: handleLotteryBatchResults,
    close: closeLotteryResult,
    test: (quality) => handleLotteryResult(createTestResult(quality)),
    testBatch: (count = 10) => {
        const results = [];
        for (let i = 0; i < count; i++) {
            // Randomly generate results with different qualities
            const quality = Math.floor(Math.random() * 10);
            results.push(createTestResult(quality));
        }
        handleLotteryBatchResults(results);
    }
}; 