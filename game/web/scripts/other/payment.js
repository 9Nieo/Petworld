document.addEventListener('DOMContentLoaded', () => {
    const debug = {
        log: function() {
            const args = Array.from(arguments);
            console.log('[宠物世界支付]', ...args);
        },
        error: function() {
            const args = Array.from(arguments);
            console.error('[宠物世界支付错误]', ...args);
        },
        warn: function() {
            const args = Array.from(arguments);
            console.warn('[宠物世界支付警告]', ...args);
        }
    };
    
    // Get DOM elements
    const closeBtn = document.querySelector('.close-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const tokenSelect = document.getElementById('token-select');
    const tokenBalance = document.getElementById('token-balance');
    const itemImage = document.getElementById('item-image');
    const itemName = document.getElementById('item-name');
    const itemPrice = document.getElementById('item-price');
    const summaryPrice = document.getElementById('summary-price');
    const totalPrice = document.getElementById('total-price');
    const statusMessage = document.getElementById('status-message');
    
    // Web3 instance and current address
    let web3 = null;
    let currentAddress = null;
    
    // Payment information
    let paymentInfo = {
        itemId: '',
        itemName: '',
        itemImage: '',
        price: 0,
        contractMethod: '',
        methodParams: []
    };
    
    // Supported tokens list
    let supportedTokens = [];
    
    // Get supported tokens from global config
    if (window.SUPPORTED_PAYMENT_TOKENS) {
        supportedTokens = window.SUPPORTED_PAYMENT_TOKENS;
        debug.log('Loaded supported payment tokens from global config:', supportedTokens);
    } else {
        // Default support USDT
        supportedTokens = [
            {
                id: 'USDT',
                name: 'USDT',
                contractAddress: '0x998abeb3E57409262aE5b751f60747921B33613E',
                icon: '../../resources/images/icons/usdt.png',
                decimals: 18,
                isDefault: true
            }
        ];
        debug.log('Using default payment token configuration:', supportedTokens);
    }
    
    // Token contract cache
    const tokenContracts = {};
    
    // Selected token
    let selectedToken = null;
    
    // PaymentManager contract instance
    let paymentManagerContract = null;
    
    // Initialize
    init();
    
    /**
     * Initialize function
     */
    function init() {
        debug.log('Initializing payment page...');
        
        // Bind button events
        closeBtn.addEventListener('click', handleClose);
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleClose);
        
        // Bind token selection event
        tokenSelect.addEventListener('change', handleTokenChange);
        
        // Check wallet status in local storage
        checkStoredWalletConnection();
        
        // Try to get Web3 instance from parent window
        if (!web3) {
            if (window.parent && window.parent.gameWeb3) {
                debug.log('Get gameWeb3 instance from parent window');
                web3 = window.parent.gameWeb3;
                initializeContracts();
                // Estimate gas fee
                estimateGasFee();
            } else if (window.gameWeb3) {
                debug.log('Use global gameWeb3 instance');
                web3 = window.gameWeb3;
                initializeContracts();
                // Estimate gas fee
                estimateGasFee();
            } else if (window.ethereum) {
                debug.log('Use window.ethereum to create Web3 instance');
                web3 = new Web3(window.ethereum);
                initializeContracts();
                // Estimate gas fee
                estimateGasFee();
            } else if (window.web3) {
                debug.log('Use window.web3 to create Web3 instance');
                web3 = new Web3(window.web3.currentProvider);
                initializeContracts();
                // Estimate gas fee
                estimateGasFee();
            }
        }
        
        // Request Web3 instance and wallet address
        requestWalletData();
        
        // Listen for payment information
        window.addEventListener('message', handleParentMessage);
        
        // Populate token selection dropdown
        populateTokenSelect();
        
        // Display supported tokens list
        displaySupportedTokens();
        
        // Localize content
        localizeContent();
        
        // Set default token (ensure a default token is selected even in the initialization phase)
        if (tokenSelect.options.length > 0 && supportedTokens.length > 0) {
            tokenSelect.selectedIndex = 0;
            // Manually set the default selected token
            selectedToken = supportedTokens[0];
            debug.log('Default token set:', selectedToken);
            // Trigger a change event to update the balance display
            const changeEvent = new Event('change');
            tokenSelect.dispatchEvent(changeEvent);
        }
        
        // Immediately request payment information
        if (window.parent) {
            // Delay a small period to ensure the parent window is ready to receive messages
            setTimeout(() => {
                debug.log('Requesting payment information...');
                window.parent.postMessage({
                    type: 'requestData',
                    action: 'getPaymentInfo'
                }, '*');
            }, 300);
        }
    }
    
    /**
     * Check wallet connection status in local storage
     */
    function checkStoredWalletConnection() {
        const storedConnected = localStorage.getItem('walletConnected');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedConnected === 'true' && storedAddress) {
            debug.log('Restore wallet connection status from local storage:', storedAddress);
            currentAddress = storedAddress;
        }
    }
    
    /**
     * Request Web3 and wallet data
     */
    function requestWalletData() {
        debug.log('Requesting Web3 and wallet data');
        
        if (window.parent) {
            window.parent.postMessage({
                type: 'requestData',
                pageType: 'payment',
                action: 'getWalletInfo'
            }, '*');
            
            // Request payment information at the same time
            window.parent.postMessage({
                type: 'requestData',
                action: 'getPaymentInfo'
            }, '*');
        } else {
            debug.error('Unable to access parent window, possibly running in a standalone page');
        }
        
        // If there is a global wallet state, also try to use it
        if (window.walletAddress) {
            currentAddress = window.walletAddress;
            debug.log('Get wallet address from global variable:', currentAddress);
        }
    }
    
    /**
     * Handle messages from the parent window
     */
    function handleParentMessage(event) {
        const message = event.data;
        
        if (!message || typeof message !== 'object') return;
        
        debug.log('Received message:', message);
        
        switch (message.type) {
            case 'walletInfo':
                // Receive wallet information
                if (message.data && message.data.connected) {
                    debug.log('Wallet connected:', message.data.address);
                    currentAddress = message.data.address;
                    // If there is already a Web3 instance, initialize payment
                    if (web3) {
                        initializeContracts();
                    }
                } else if (!currentAddress) {
                    debug.error('Wallet not connected');
                    showStatus('Please connect your wallet first', 'error');
                    confirmBtn.disabled = true;
                }
                break;
                
            case 'web3Ready':
                // Receive Web3 instance
                if (message.data) {
                    debug.log('Received Web3 instance data:', message.data);
                    
                    // Priority 1: Check if private key wallet is available
                    if (window.parent && window.parent.SecureWalletManager && 
                        window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                        debug.log('Using private key wallet Web3 instance');
                        web3 = window.parent.SecureWalletManager.getWeb3();
                        currentAddress = window.parent.SecureWalletManager.getAddress();
                        
                        if (web3 && currentAddress) {
                            debug.log('Private key wallet Web3 and address obtained successfully');
                            // Initialize payment functionality
                            estimateGasFee();
                            initializeContracts();
                        } else {
                            debug.warn('Private key wallet not fully ready, falling back to connected wallet');
                        }
                    }
                    
                    // Priority 2: If private key wallet not available, use connected wallet
                    if (!web3) {
                    // Web3 passing is limited, so we try to create a new instance using the available Provider
                    try {
                        if (window.ethereum) {
                            debug.log('Create Web3 instance using window.ethereum');
                            web3 = new Web3(window.ethereum);
                        } else if (window.web3) {
                            debug.log('Create Web3 instance using window.web3');
                            web3 = new Web3(window.web3.currentProvider);
                        } else if (window.parent && window.parent.ethereum) {
                            debug.log('Create Web3 instance using parent.ethereum');
                            web3 = new Web3(window.parent.ethereum);
                        } else if (window.parent && window.parent.web3) {
                            debug.log('Create Web3 instance using parent.web3');
                            web3 = new Web3(window.parent.web3.currentProvider);
                        } else if (window.parent && window.parent.gameWeb3) {
                            debug.log('Use parent.gameWeb3 directly');
                            web3 = window.parent.gameWeb3;
                        } else {
                            debug.error('Unable to create Web3 instance: no available Provider');
                            showStatus('Unable to connect to blockchain: no Provider found', 'error');
                        }
                        
                        // If a Web3 instance is successfully created, initialize
                        if (web3) {
                            debug.log('Web3 instance created, initializing payment functionality');
                            // Try to estimate gas fee
                            estimateGasFee();
                            // If there is already an address, initialize payment
                            if (currentAddress) {
                                initializeContracts();
                            }
                        }
                    } catch (error) {
                        debug.error('Error creating Web3 instance:', error);
                        }
                    }
                }
                break;
                
            case 'paymentInfo':
                // Receive payment information
                if (message.data) {
                    debug.log('Received payment information:', message.data);
                    
                    // Ensure we have a complete payment information object
                    paymentInfo = Object.assign({}, paymentInfo, message.data);
                    
                    // Ensure the price is a valid number
                    if (typeof paymentInfo.price === 'string') {
                        paymentInfo.price = parseFloat(paymentInfo.price) || 0;
                    } else if (typeof paymentInfo.itemPrice === 'string') {
                        paymentInfo.price = parseFloat(paymentInfo.itemPrice) || 0;
                    }
                    
                    // Ensure the quantity is a number
                    if (paymentInfo.itemQuantity && typeof paymentInfo.itemQuantity === 'string') {
                        paymentInfo.itemQuantity = parseInt(paymentInfo.itemQuantity) || 1;
                    }
                    
                    // If price is not set but itemPrice is, use itemPrice
                    if ((!paymentInfo.price || paymentInfo.price === 0) && paymentInfo.itemPrice) {
                        if (typeof paymentInfo.itemPrice === 'string') {
                            paymentInfo.price = parseFloat(paymentInfo.itemPrice.replace(/[^\d.-]/g, '')) || 0;
                        } else {
                            paymentInfo.price = paymentInfo.itemPrice;
                        }
                    }
                    
                    // If there is quantity information and the quantity is greater than 1, update the price
                    if (paymentInfo.itemQuantity && paymentInfo.itemQuantity > 1) {
                        // Save the unit price for later calculation
                        const basePrice = paymentInfo.basePrice || paymentInfo.price;
                        paymentInfo.basePrice = basePrice; // Store the unit price
                        paymentInfo.price = basePrice * paymentInfo.itemQuantity;
                        debug.log(`Updated price: ${basePrice} x ${paymentInfo.itemQuantity} = ${paymentInfo.price}`);
                    }
                    
                    debug.log('Processed payment information:', paymentInfo);
                    updatePaymentDisplay();
                    estimateGasFee();
                }
                break;
        }
    }
    
    /**
     * Initialize contracts
     */
    function initializeContracts() {
        try {
            debug.log('Initializing payment contracts...');

            // Initialize token contracts
            initializeTokenContracts();
            
            // Initialize PaymentManager contract
            initializePaymentManagerContract();
            
            // Initialize payment
            initializePayment();
        } catch (error) {
            debug.error('Failed to initialize contracts:', error);
            showStatus('Failed to initialize contracts', 'error');
        }
    }
    
    /**
     * Initialize payment
     */
    function initializePayment() {
        // Update payment display
        updatePaymentDisplay();
        
        // Default select the first token
        if (tokenSelect.options.length > 0) {
            tokenSelect.selectedIndex = 0;
            handleTokenChange();
        }
    }
    
    /**
     * Initialize token contracts
     */
    function initializeTokenContracts() {
        // Determine which Web3 instance to use
        let activeWeb3 = null;
        
        // Priority 1: Use private key wallet Web3 if available
        if (window.parent && window.parent.SecureWalletManager && 
            window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
            activeWeb3 = window.parent.SecureWalletManager.getWeb3();
            debug.log('Using private key wallet Web3 for token contracts');
        } else if (web3) {
            activeWeb3 = web3;
            debug.log('Using connected wallet Web3 for token contracts');
        }
        
        if (!activeWeb3) {
            debug.error('No Web3 instance available, cannot create token contracts');
            return;
        }
        
        try {
            supportedTokens.forEach(token => {
                // Check if it has been initialized
                if (tokenContracts[token.id]) {
                    debug.log(`${token.id} contract already initialized, skipping`);
                    return;
                }
                
                const address = token.contractAddress;
                if (!address) {
                    debug.warn(`Cannot find contract address for ${token.id}`);
                    return;
                }
                
                // Use initERC20Contract function to initialize token contract
                if (typeof window.initERC20Contract === 'function') {
                    tokenContracts[token.id] = window.initERC20Contract(activeWeb3, address);
                    if (tokenContracts[token.id]) {
                        debug.log(`${token.id} contract initialized successfully, address: ${address}`);
                    } else {
                        debug.error(`${token.id} contract initialization failed`);
                    }
                } else {
                    // If initERC20Contract function is not found, use the generic ABI to manually create
                    const abi = window.GENERIC_ERC20_ABI;
                    if (!abi) {
                        debug.warn('Cannot find generic ERC20 ABI');
                        return;
                    }
                    
                    tokenContracts[token.id] = new activeWeb3.eth.Contract(abi, address);
                    debug.log(`${token.id} contract initialized successfully, address: ${address}`);
                }
            });
            
            debug.log('Token contracts initialized');
        } catch (error) {
            debug.error('Failed to initialize token contracts:', error);
        }
    }
    
    /**
     * Initialize PaymentManager contract
     */
    function initializePaymentManagerContract() {
        // Determine which Web3 instance to use
        let activeWeb3 = null;
        
        // Priority 1: Use private key wallet Web3 if available
        if (window.parent && window.parent.SecureWalletManager && 
            window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
            activeWeb3 = window.parent.SecureWalletManager.getWeb3();
            debug.log('Using private key wallet Web3 for PaymentManager contract');
        } else if (web3) {
            activeWeb3 = web3;
            debug.log('Using connected wallet Web3 for PaymentManager contract');
        }
        
        if (!activeWeb3) {
            debug.error('No Web3 instance available, cannot initialize PaymentManager contract');
            return;
        }
        
        try {
            // Get PaymentManager contract address
            const network = window.currentNetwork || 'MAIN';
            let paymentManagerAddress;
            
            if (typeof window.getContractAddress === 'function') {
                paymentManagerAddress = window.getContractAddress('PaymentManager');
            } else if (window.contractAddresses && window.contractAddresses[network]) {
                paymentManagerAddress = window.contractAddresses[network].PaymentManager;
            }
            
            if (!paymentManagerAddress) {
                debug.warn('Cannot get PaymentManager contract address');
                return;
            }
            
            // Get PaymentManager contract ABI
            const abi = window.PaymentManagerABI;
            if (!abi) {
                debug.warn('Cannot get PaymentManager contract ABI');
                return;
            }
            
            // Create contract instance
            paymentManagerContract = new activeWeb3.eth.Contract(abi, paymentManagerAddress);
            debug.log('PaymentManager contract initialized successfully, address:', paymentManagerAddress);
        } catch (error) {
            debug.error('Failed to initialize PaymentManager contract:', error);
        }
    }
    
    /**
     * Populate token select dropdown
     */
    function populateTokenSelect() {
        // Clear existing options
        tokenSelect.innerHTML = '';
        
        // Add styles to select to ensure it displays options with icons correctly
        tokenSelect.classList.add('token-select-custom');
        
        // Create and add custom styles to ensure the dropdown displays icons correctly
        if (!document.getElementById('token-select-style')) {
            const style = document.createElement('style');
            style.id = 'token-select-style';
            style.textContent = `
                .token-select-custom {
                    padding: 8px;
                }
                .token-option-wrapper {
                    display: flex;
                    align-items: center;
                    padding: 5px;
                }
                .token-icon-small {
                    width: 20px;
                    height: 20px;
                    margin-right: 10px;
                    object-fit: contain;
                    vertical-align: middle;
                }
                /* Styles for selected options */
                .token-select-custom option:checked, 
                .token-select-custom option:hover {
                    box-shadow: 0 0 10px 100px #4caf50 inset;
                    background-color: #4caf50;
                    color: white;
                }
                /* Firefox needs special handling */
                @-moz-document url-prefix() {
                    .token-select-custom {
                        text-indent: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create a custom container for displaying the currently selected token
        const currentSelectionDiv = document.createElement('div');
        currentSelectionDiv.id = 'current-token-selection';
        currentSelectionDiv.className = 'current-token-selection';
        currentSelectionDiv.style.display = 'flex';
        currentSelectionDiv.style.alignItems = 'center';
        currentSelectionDiv.style.marginBottom = '10px';
        currentSelectionDiv.style.borderRadius = '4px';
        currentSelectionDiv.style.border = '1px solid #ddd';
        currentSelectionDiv.style.padding = '8px 12px';
        
        // If the container does not exist, add it to the DOM
        const containerElement = tokenSelect.parentNode;
        if (containerElement && !document.getElementById('current-token-selection')) {
            containerElement.insertBefore(currentSelectionDiv, tokenSelect);
        }
        
        // Add supported tokens
        supportedTokens.forEach(token => {
            const option = document.createElement('option');
            option.value = token.id;
            option.setAttribute('data-icon', token.icon);
            option.setAttribute('data-name', token.name);
            option.textContent = token.name;
            tokenSelect.appendChild(option);
        });
        
        // When the selection changes, update the display
        tokenSelect.addEventListener('change', updateTokenSelectionDisplay);
        
        // Initial display setup
        if (supportedTokens.length > 0) {
            updateTokenSelectionDisplay();
        }
        
        // Update the currently selected token display
        function updateTokenSelectionDisplay() {
            const selectedOption = tokenSelect.options[tokenSelect.selectedIndex];
            const tokenId = selectedOption.value;
            const token = supportedTokens.find(t => t.id === tokenId);
            
            if (token && currentSelectionDiv) {
                currentSelectionDiv.innerHTML = '';
                
                const iconImg = document.createElement('img');
                iconImg.src = token.icon;
                iconImg.alt = token.name;
                iconImg.className = 'token-icon-small';
                iconImg.style.width = '24px';
                iconImg.style.height = '24px';
                iconImg.style.marginRight = '10px';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = token.name;
                nameSpan.style.fontWeight = 'bold';
                
                currentSelectionDiv.appendChild(iconImg);
                currentSelectionDiv.appendChild(nameSpan);
            }
        }
    }
    
    /**
     * Update payment information display
     */
    function updatePaymentDisplay() {
        if (!paymentInfo || (!paymentInfo.itemName && !paymentInfo.itemId)) {
            debug.log('Incomplete payment information, waiting for complete information');
            return;
        }
        
        // Get default token
        const defaultToken = supportedTokens.find(token => token.isDefault) || supportedTokens[0];
        
        // Determine if it is pet food
        const isPwfood = 
            paymentInfo.itemId === 'pwfood' || 
            paymentInfo.itemType === 'food' ||
            (paymentInfo.itemName && paymentInfo.itemName.toLowerCase().includes('食物')) ||
            (paymentInfo.itemName && paymentInfo.itemName.toLowerCase().includes('food')) ||
            (paymentInfo.itemImage && paymentInfo.itemImage.toLowerCase().includes('pwfood'));
        
        // Update product information
        // Use itemName first, if not then try using id
        itemName.textContent = paymentInfo.itemName || paymentInfo.itemId || '';
        
        // Pet food display special handling
        if (isPwfood && paymentInfo.foodQuantity) {
            // Display "Purchase X USD, get Y pet food" format
            if (paymentInfo.description) {
                itemName.textContent = paymentInfo.description;
            } else {
                const amount = paymentInfo.price || 1;
                const foodAmount = paymentInfo.foodQuantity || (3000 * amount);
                itemName.textContent = `Purchase ${amount} USD, get ${foodAmount} pet food`;
            }
        } else if (paymentInfo.itemQuantity && paymentInfo.itemQuantity > 1) {
            // Normal product display quantity
            itemName.textContent += ` (${paymentInfo.itemQuantity}个)`;
        }

        // For PWFood use emoji, other products use icons
        if (isPwfood) {
            debug.log('Detected PWFood product, using emoji display');
            // Create emoji fallback element
            const emojiElement = document.createElement('div');
            emojiElement.className = 'emoji-fallback';
            emojiElement.textContent = '🍖';
            emojiElement.style.fontSize = '32px';
            emojiElement.style.display = 'flex';
            emojiElement.style.alignItems = 'center';
            emojiElement.style.justifyContent = 'center';
            emojiElement.style.width = '80px';
            emojiElement.style.height = '80px';
            
            // Replace image element
            const imageParent = itemImage.parentNode;
            if (imageParent) {
                imageParent.replaceChild(emojiElement, itemImage);
            }
        } else {
            // Other products use icons
            let srcPath = '';
            if (paymentInfo.itemImage) {
                const original = paymentInfo.itemImage;
                const filename = original.substring(original.lastIndexOf('/') + 1);
                const iconFile = filename.startsWith('egg-') ? filename.replace('egg-', '') : filename;
                srcPath = `../../resources/images/icons/${iconFile}`;
                debug.log(`Using image: ${srcPath}`);
            }
            itemImage.src = srcPath;
            itemImage.alt = paymentInfo.itemName || '';
        }
        
        // Ensure we have a valid price
        let price = 0;
        if (paymentInfo.price !== undefined && paymentInfo.price !== null) {
            price = parseFloat(paymentInfo.price);
        } else if (paymentInfo.itemPrice !== undefined && paymentInfo.itemPrice !== null) {
            // Try to extract numbers from itemPrice
            if (typeof paymentInfo.itemPrice === 'string') {
                // Remove non-numeric characters (keep decimal point)
                price = parseFloat(paymentInfo.itemPrice.replace(/[^\d.-]/g, '')) || 0;
            } else {
                price = parseFloat(paymentInfo.itemPrice) || 0;
            }
        }
            
        debug.log(`Update display price: ${price} ${defaultToken.name}`);
        
        // Format price to two decimal places
        const formattedPrice = price.toFixed(2);
        
        // Update all price displays
        // Pet food special handling display
        if (isPwfood) {
            // Display "X USD USDT"
            itemPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
            summaryPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
            totalPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
        } else {
            // Normal product display
            itemPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
            summaryPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
            totalPrice.textContent = `${formattedPrice} ${defaultToken.name}`;
        }
    }
    
    /**
     * Handle token selection change
     */
    async function handleTokenChange() {
        const tokenId = tokenSelect.value;
        
        // Find selected token
        selectedToken = supportedTokens.find(token => token.id === tokenId);
        
        if (!selectedToken) {
            debug.error('Invalid token selection');
            
            // Restore selection to default token
            if (supportedTokens.length > 0) {
                selectedToken = supportedTokens[0];
                debug.log('Restored to default token:', selectedToken);
            }
            return;
        }
        
        debug.log('Selected token:', selectedToken);
        
        // Update balance display
        try {
            // Priority 1: Check if private key wallet is available and ready
            let activeWeb3 = null;
            let activeAddress = null;
            
            if (window.parent && window.parent.SecureWalletManager && 
                window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                debug.log('Using private key wallet for balance check');
                activeWeb3 = window.parent.SecureWalletManager.getWeb3();
                activeAddress = window.parent.SecureWalletManager.getAddress();
            } else if (currentAddress && web3) {
                debug.log('Using connected wallet for balance check');
                activeWeb3 = web3;
                activeAddress = currentAddress;
            }
            
            if (activeAddress && activeWeb3 && tokenContracts[tokenId]) {
                debug.log('Getting token balance...', {
                    token: selectedToken.name,
                    address: activeAddress,
                    contractAddress: selectedToken.contractAddress
                });
                
                // Get token balance with enhanced error handling
                const contract = tokenContracts[tokenId];
                
                // Verify contract has the correct address
                if (contract._address && contract._address.toLowerCase() !== selectedToken.contractAddress.toLowerCase()) {
                    debug.warn('Contract address mismatch, recreating contract instance');
                    // Recreate contract with correct address
                    if (window.GENERIC_ERC20_ABI) {
                        tokenContracts[tokenId] = new activeWeb3.eth.Contract(window.GENERIC_ERC20_ABI, selectedToken.contractAddress);
                    } else {
                        throw new Error('GENERIC_ERC20_ABI not available');
                    }
                }
                
                // Try to get balance with timeout protection
                const balancePromise = tokenContracts[tokenId].methods.balanceOf(activeAddress).call();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Balance check timeout')), 10000)
                );
                
                const balance = await Promise.race([balancePromise, timeoutPromise]);
                
                // Format balance according to token precision
                const formattedBalance = selectedToken.decimals > 0 
                    ? parseInt(balance) / Math.pow(10, selectedToken.decimals)
                    : balance;
                
                // Update balance display
                tokenBalance.textContent = `${formattedBalance} ${selectedToken.name}`;
                debug.log('Token balance retrieved successfully:', formattedBalance);
            } else {
                debug.warn('Cannot get token balance - missing requirements:', {
                    hasAddress: !!activeAddress,
                    hasWeb3: !!activeWeb3,
                    hasContract: !!tokenContracts[tokenId]
                });
                tokenBalance.textContent = `0 ${selectedToken.name}`;
            }
        } catch (error) {
            debug.error('Failed to get token balance:', error);
            tokenBalance.textContent = `0 ${selectedToken.name}`;
            
            // Try to reinitialize the token contract if balance check failed
            if (selectedToken.contractAddress) {
                try {
                    debug.log('Attempting to reinitialize token contract...');
                    let reinitWeb3 = web3;
                    
                    // Use private key wallet Web3 if available
                    if (window.parent && window.parent.SecureWalletManager && 
                        window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
                        reinitWeb3 = window.parent.SecureWalletManager.getWeb3();
                    }
                    
                    if (reinitWeb3 && window.GENERIC_ERC20_ABI) {
                        tokenContracts[tokenId] = new reinitWeb3.eth.Contract(
                            window.GENERIC_ERC20_ABI, 
                            selectedToken.contractAddress
                        );
                        debug.log('Token contract reinitialized');
                    }
                } catch (reinitError) {
                    debug.error('Failed to reinitialize token contract:', reinitError);
                }
            }
        }
        
        // Update total price display
        totalPrice.textContent = `${paymentInfo.price} ${selectedToken.name}`;
    }
    
    /**
     * Check and approve token transfer permission
     * @param {Object} tokenContract - Token contract instance
     * @param {string} spender - Spender address
     * @param {string} amount - Amount to approve
     * @returns {Promise<boolean>} - Whether approval is successful
     */
    async function checkAndApproveToken(tokenContract, spender, amount) {
        debug.log('Checking token approval:', { spender, amount });
        
        // Determine active wallet and Web3 instance
        let activeWeb3 = null;
        let activeAddress = null;
        let usePrivateKeyWallet = false;
        
        if (window.parent && window.parent.SecureWalletManager && 
            window.parent.SecureWalletManager.shouldUsePrivateKeyForTransactions()) {
            debug.log('Using private key wallet for approval');
            activeWeb3 = window.parent.SecureWalletManager.getWeb3();
            activeAddress = window.parent.SecureWalletManager.getAddress();
            usePrivateKeyWallet = true;
        } else if (currentAddress && web3) {
            debug.log('Using connected wallet for approval');
            activeWeb3 = web3;
            activeAddress = currentAddress;
        }
        
        if (!tokenContract || !activeAddress || !activeWeb3) {
            debug.error('Token contract not initialized or wallet not connected');
            return false;
        }
        
        try {
            // Check existing allowance
            const allowance = await tokenContract.methods.allowance(activeAddress, spender).call();
            debug.log('Current allowance:', allowance);
            
            if (activeWeb3.utils.toBN(allowance).gte(activeWeb3.utils.toBN(amount))) {
                debug.log('Enough allowance');
                return true;
            }
            
            debug.log('Need to approve token transfer');
            showStatus('Please confirm authorization in your wallet...', 'info');
            
            // Approve larger amount to avoid frequent authorization
            const largeAmount = activeWeb3.utils.toWei('1000000', 'ether');
            
            // Send authorization transaction
            let receipt;
            if (usePrivateKeyWallet) {
                // Use private key wallet for approval
                receipt = await window.parent.SecureWalletManager.sendContractTransaction(
                    tokenContract,
                    'approve',
                    [spender, largeAmount],
                    { gas: 100000 }
                );
            } else {
                // Use connected wallet for approval
                receipt = await tokenContract.methods
                .approve(spender, largeAmount)
                    .send({ from: activeAddress });
            }
            
            debug.log('Token approval successful:', receipt);
            showStatus('Authorization successful!', 'success');
            return true;
        } catch (error) {
            debug.error('Token approval failed:', error);
            showStatus(`Authorization failed: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Handle confirm payment
     */
    async function handleConfirm() {
        debug.log('User clicked confirm payment');
        
        // If no token is selected, automatically select the default token
        if (!selectedToken && supportedTokens.length > 0) {
            selectedToken = supportedTokens[0];
            debug.log('Automatically selected default token:', selectedToken);
            tokenSelect.selectedIndex = 0;
        }
        
        if (!selectedToken) {
            debug.error('No token selected and no available tokens');
            showStatus('Please select a payment token', 'error');
            return;
        }
        
        if (!currentAddress) {
            showStatus('Wallet not connected, cannot pay', 'error');
            return;
        }
        
        // Try to reinitialize Web3 (if not already initialized)
        if (!web3) {
            debug.log('Attempting to reinitialize Web3...');
            if (window.ethereum) {
                debug.log('Using window.ethereum to create Web3 instance');
                web3 = new Web3(window.ethereum);
            } else if (window.web3) {
                debug.log('Using window.web3 to create Web3 instance');
                web3 = new Web3(window.web3.currentProvider);
            } else if (window.parent && window.parent.ethereum) {
                debug.log('Using parent.ethereum to create Web3 instance');
                web3 = new Web3(window.parent.ethereum);
            } else if (window.parent && window.parent.web3) {
                debug.log('Using parent.web3 to create Web3 instance');
                web3 = new Web3(window.parent.web3.currentProvider);
            } else if (window.parent && window.parent.gameWeb3) {
                debug.log('Using parent.gameWeb3 directly');
                web3 = window.parent.gameWeb3;
            }
        }
        
        if (!web3) {
            showStatus('Web3 not initialized, cannot pay', 'error');
            return;
        }
        
        try {
            // Show processing status
            showStatus('Processing payment...', 'info');
            
            // Disable confirm button
            confirmBtn.disabled = true;
            
            // Record payment information
            debug.log('Confirming payment:', {
                item: paymentInfo.itemName,
                price: paymentInfo.price,
                token: selectedToken.name,
                address: currentAddress
            });
            
            // Ensure token contract is initialized
            if (!tokenContracts[selectedToken.id]) {
                if (typeof window.initERC20Contract === 'function' && selectedToken.contractAddress) {
                    debug.log(`Initializing ${selectedToken.name} contract...`);
                    tokenContracts[selectedToken.id] = window.initERC20Contract(web3, selectedToken.contractAddress);
                } else if (window.GENERIC_ERC20_ABI && selectedToken.contractAddress) {
                    debug.log(`Using generic ABI to initialize ${selectedToken.name} contract...`);
                    tokenContracts[selectedToken.id] = new web3.eth.Contract(window.GENERIC_ERC20_ABI, selectedToken.contractAddress);
                }
            }
            
            // Ensure PaymentManager contract is initialized
            if (!paymentManagerContract) {
                initializePaymentManagerContract();
            }
            
            // If PaymentManager contract and token contract exist, check authorization
            if (paymentManagerContract && tokenContracts[selectedToken.id]) {
                const paymentManagerAddress = await paymentManagerContract._address;
                
                // Add check for price, ensure it is not undefined
                const price = paymentInfo && paymentInfo.price !== undefined ? paymentInfo.price : 0;
                const priceInWei = web3.utils.toWei(String(price), 'ether');
                
                debug.log('Checking PaymentManager authorization...', {
                    token: selectedToken.name,
                    paymentManager: paymentManagerAddress,
                    amount: priceInWei
                });
                
                // Check and authorize
                const approved = await checkAndApproveToken(
                    tokenContracts[selectedToken.id], 
                    paymentManagerAddress,
                    priceInWei
                );
                
                if (!approved) {
                    debug.error('PaymentManager authorization failed');
                    showStatus('PaymentManager authorization failed, cannot continue payment', 'error');
                    confirmBtn.disabled = false;
                    return;
                }
                
                debug.log('PaymentManager authorization successful, can continue payment');
            } else {
                debug.warn('Cannot check PaymentManager authorization, will try direct payment');
            }
            
            // Notify parent window that payment has started
            window.parent.postMessage({
                type: 'paymentStarted'
            }, '*');
            
            // Send confirmed message to parent window to execute purchase callback function
            window.parent.postMessage({
                type: 'paymentConfirmed'
            }, '*');
            
            // Close payment window
            setTimeout(() => {
                // Use a more specific message to tell parent window to close the payment iframe
                window.parent.postMessage({
                    type: 'closePayment',
                    data: { success: true }
                }, '*');
            }, 500);
            
        } catch (error) {
            debug.error('Payment failed:', error);
            
            // Enable confirm button
            confirmBtn.disabled = false;
            
            // Show error
            showStatus('Payment failed: ' + error.message, 'error');
            
            // Notify parent window that payment failed
            window.parent.postMessage({
                type: 'paymentResult',
                data: {
                    success: false,
                    error: error.message
                }
            }, '*');
        } finally {
            confirmBtn.disabled = false;
        }
    }
    
    /**
     * Handle closing payment
     */
    function handleClose() {
        debug.log('User closed payment');
        
        // Send cancel message to parent window
        window.parent.postMessage({
            type: 'paymentCancelled'
        }, '*');
        
        // Close payment window
        // Use a more specific message to tell parent window to close the payment iframe
        window.parent.postMessage({
            type: 'closePayment',
            data: { cancelled: true }
        }, '*');
    }
    
    /**
     * Display status message
     * @param {string} message - Message content
     * @param {string} type - Message type (info, success, error, warning)
     */
    function showStatus(message, type = 'info') {
        if (!statusMessage) return;
        
        // Set message content
        statusMessage.textContent = message;
        
        // Remove old type class
        statusMessage.classList.remove('info', 'success', 'error', 'warning');
        
        // Add new type class
        statusMessage.classList.add(type);
        
        // Display message
        statusMessage.style.display = 'block';
    }
    
    /**
     * Localize content
     */
    function localizeContent() {
        // Only execute if i18n is available
        if (!window.i18n) return;
        
        // Update page title
        document.title = i18n.t('payment.title') || 'Confirm payment - Pet World';
        
        // Update text using data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = i18n.t(key);
            
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
     * Display supported tokens list
     */
    function displaySupportedTokens() {
        const tokenListElement = document.getElementById('supported-tokens-list');
        if (!tokenListElement) return;
        
        // Clear existing content
        tokenListElement.innerHTML = '';
        
        // Add each supported token
        supportedTokens.forEach(token => {
            const tokenItem = document.createElement('div');
            tokenItem.className = 'token-item';
            tokenItem.innerHTML = `
                <img src="${token.icon}" alt="${token.name}">
                <span>${token.name}</span>
            `;
            tokenListElement.appendChild(tokenItem);
        });
    }

    /**
     * Estimate transaction gas fee
     */
    async function estimateGasFee() {
        try {
            if (!web3) {
                debug.warn('Cannot estimate gas fee, Web3 not initialized');
                return;
            }

            // Get gas price
            const gasPrice = await web3.eth.getGasPrice();
            debug.log('Current gas price:', web3.utils.fromWei(gasPrice, 'gwei'), 'Gwei');

            // Calculate base gas limit
            let baseGasLimit;
            let quantity = 1; // Default quantity
            
            // Adjust gas estimate based on payment type and quantity
            if (paymentInfo) {
                // Get purchase quantity
                if (paymentInfo.itemQuantity && typeof paymentInfo.itemQuantity === 'number') {
                    quantity = paymentInfo.itemQuantity;
                } else if (paymentInfo.itemQuantity && typeof paymentInfo.itemQuantity === 'string') {
                    quantity = parseInt(paymentInfo.itemQuantity) || 1;
                } else if (paymentInfo.batchCount && typeof paymentInfo.batchCount === 'number') {
                    quantity = paymentInfo.batchCount;
                } else if (paymentInfo.batchCount && typeof paymentInfo.batchCount === 'string') {
                    quantity = parseInt(paymentInfo.batchCount) || 1;
                }
                
                // Ensure quantity is within a reasonable range
                quantity = Math.max(1, Math.min(quantity, 10));
                
                debug.log('Estimated gas fee for the item quantity:', quantity);
                
                // Set base gas limit based on item type
                if (paymentInfo.itemType === 'egg' || 
                    (paymentInfo.itemId && paymentInfo.itemId.includes('egg')) ||
                    (paymentInfo.itemImage && paymentInfo.itemImage.includes('egg'))) {
                    
                    // Set different base gas limits based on egg type
                    if (paymentInfo.itemId === 'egg-legendary' || 
                        (paymentInfo.itemName && paymentInfo.itemName.toLowerCase().includes('legendary'))) {
                        baseGasLimit = 500000; // Legendary egg base gas limit
                    } else if (paymentInfo.itemId === 'egg-rare' || 
                              (paymentInfo.itemName && paymentInfo.itemName.toLowerCase().includes('rare'))) {
                        baseGasLimit = 500000; // Rare egg base gas limit
                    } else {
                        baseGasLimit = 500000; // Common egg base gas limit
                    }
                    
                    // Batch purchase will increase gas consumption
                    // In fact, batch purchase is not linearly increasing gas, but increasing incrementally, here we use a smooth curve for estimation
                    const gasMultiplier = 1 + (quantity - 1) * 0.5; // Multiplier is 1 when quantity is 1, 5.5 when quantity is 10

                    debug.log('Egg item gas estimate base value:', baseGasLimit, 'multiplier:', gasMultiplier);
                    
                    // The final gas limit
                    let gasLimit = Math.floor(baseGasLimit * gasMultiplier);
                    
                    // Ensure gas limit is within a reasonable range
                    gasLimit = Math.min(gasLimit, 10000000); // 上限1000万Gas
                    
                    debug.log('Final egg item gas estimate:', gasLimit);
                    
                    // Calculate total gas fee
                    const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));
                    
                    // Convert to a more readable BNB unit
                    const gasFeeInBNB = parseFloat(web3.utils.fromWei(gasFee.toString(), 'ether')).toFixed(5);
                    
                    // Update display
                    const gasFeeElement = document.getElementById('gas-fee');
                    if (gasFeeElement) {
                        gasFeeElement.textContent = `~${gasFeeInBNB} BNB`;
                        debug.log('Gas fee estimate:', gasFeeInBNB, 'BNB');
                    }
                    
                    return;
                } else if (paymentInfo.itemType === 'food' || 
                          (paymentInfo.itemId && paymentInfo.itemId === 'pwfood') ||
                          (paymentInfo.itemName && paymentInfo.itemName.toLowerCase().includes('food'))) {
                    baseGasLimit = 150000; // The base gas limit for food
                } else {
                    // Default estimate
                    baseGasLimit = 150000;
                }
            } else {
                // Default value when no specific information
                baseGasLimit = 150000;
            }

            // Calculate total gas fee
            const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(baseGasLimit));
            
            // Convert to a more readable BNB unit
            const gasFeeInBNB = parseFloat(web3.utils.fromWei(gasFee.toString(), 'ether')).toFixed(5);
            
            // Update display
            const gasFeeElement = document.getElementById('gas-fee');
            if (gasFeeElement) {
                gasFeeElement.textContent = `~${gasFeeInBNB} BNB`;
                debug.log('Gas fee estimate:', gasFeeInBNB, 'BNB');
            }
        } catch (error) {
            debug.error('Failed to estimate gas fee:', error);
            // If estimation fails, keep the default value
        }
    }
}); 