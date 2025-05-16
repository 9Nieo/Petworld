/**
 * Game Mode - Transaction History Related Functions
 * Used to display and operate on the transaction history of NFTs
 */

// Global variables
let gameTransactionIndexerContract = null;
let currentGameTransactionPage = 0;
let currentGameTransactionQuality = 'all';
let currentGameTransactionSortMethod = 'time';
let gameTransactionHistoryTotalPages = 1;

// Quality enumeration values
const GameTransactionQuality = {
  RARE: 3,
  LEGENDARY: 4
};

// Quality name mapping
const gameQualityNames = {
  3: 'RARE',
  4: 'LEGENDARY'
};

/**
 * Initialize transaction history related event listeners and functions
 */
function initGameTransactionHistory() {
  // Set button ID
  const viewTransactionHistoryBtnId = 'viewGameTransactionHistoryBtn';
  
  // If the button does not exist, create and add it to the market action area
  if (!document.getElementById(viewTransactionHistoryBtnId)) {
    createTransactionHistoryButton(viewTransactionHistoryBtnId);
  }
  
  // If the modal does not exist, create and add it to the page
  if (!document.getElementById('gameTransactionHistoryModal')) {
    createTransactionHistoryModal();
  }
  
  // Get DOM elements
  const viewTransactionHistoryBtn = document.getElementById(viewTransactionHistoryBtnId);
  const transactionHistoryModal = document.getElementById('gameTransactionHistoryModal');
  const transactionHistoryClose = transactionHistoryModal.querySelector('.transaction-history-close');
  const transactionSortSelect = document.getElementById('gameTransactionSortSelect');
  const transactionQualitySelect = document.getElementById('gameTransactionQualitySelect');
  const thPrevPage = document.getElementById('gameTHPrevPage');
  const thNextPage = document.getElementById('gameTHNextPage');
  
  // Bind click event to view transaction history button
  if (viewTransactionHistoryBtn) {
    viewTransactionHistoryBtn.addEventListener('click', showGameTransactionHistoryModal);
  }
  
  // Bind close modal event
  if (transactionHistoryClose) {
    transactionHistoryClose.addEventListener('click', hideGameTransactionHistoryModal);
  }
  
  // Close when clicking outside the modal
  window.addEventListener('click', function(event) {
    if (event.target === transactionHistoryModal) {
      hideGameTransactionHistoryModal();
    }
  });
  
  // Bind sorting selection event
  if (transactionSortSelect) {
    transactionSortSelect.addEventListener('change', function(event) {
      currentGameTransactionSortMethod = event.target.value;
      currentGameTransactionPage = 0;
      loadGameTransactionHistory();
    });
  }
  
  // Bind quality selection event
  if (transactionQualitySelect) {
    transactionQualitySelect.addEventListener('change', function(event) {
      currentGameTransactionQuality = event.target.value;
      currentGameTransactionPage = 0;
      loadGameTransactionHistory();
    });
  }
  
  // Bind pagination events
  if (thPrevPage) {
    thPrevPage.addEventListener('click', function() {
      if (currentGameTransactionPage > 0) {
        currentGameTransactionPage--;
        loadGameTransactionHistory();
      }
    });
  }
  
  if (thNextPage) {
    thNextPage.addEventListener('click', function() {
      if (currentGameTransactionPage < gameTransactionHistoryTotalPages - 1) {
        currentGameTransactionPage++;
        loadGameTransactionHistory();
      }
    });
  }
}

/**
 * Create transaction history button and add it to the market action area
 * @param {string} buttonId - Button ID
 */
function createTransactionHistoryButton(buttonId) {
  const marketActions = document.querySelector('.market-actions');
  if (!marketActions) return;
  
  const button = document.createElement('button');
  button.id = buttonId;
  button.className = 'action-btn transaction-history-btn';
  button.setAttribute('data-i18n', 'market.viewTransactionHistory');
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'btn-icon';
  iconSpan.innerHTML = '&#128202;'; // Chart icon
  
  button.appendChild(iconSpan);
  button.appendChild(document.createTextNode('Premium Card Transaction History'));
  
  marketActions.appendChild(button);
}

/**
 * Create transaction history modal and add it to the page
 */
function createTransactionHistoryModal() {
  const modalHTML = `
    <div class="transaction-history-modal" id="gameTransactionHistoryModal">
      <div class="transaction-history-content">
        <span class="transaction-history-close">&times;</span>
        <h2>Premium Card Transaction History</h2>
        
        <div class="transaction-history-filters">
          <div class="filter-group">
            <label for="gameTransactionQualitySelect">Quality Filter:</label>
            <select id="gameTransactionQualitySelect">
              <option value="all">All Premium Qualities</option>
              <option value="3">Rare</option>
              <option value="4">Legendary</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="gameTransactionSortSelect">Sort Method:</label>
            <select id="gameTransactionSortSelect">
              <option value="time">By Time</option>
              <option value="price">By Price</option>
            </select>
          </div>
        </div>
        
        <div class="transaction-history-loading">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
        
        <div class="transaction-history-container">
          <table class="transaction-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Quality</th>
                <th>Level</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Transaction Time</th>
              </tr>
            </thead>
            <tbody id="gameTransactionHistoryBody">
              <!-- Transaction records will be dynamically loaded here -->
            </tbody>
          </table>
        </div>
        
        <div class="transaction-history-pagination">
          <button class="th-page-btn" id="gameTHPrevPage">Previous Page</button>
          <span class="th-page-info">Page 1 of 1</span>
          <button class="th-page-btn" id="gameTHNextPage">Next Page</button>
        </div>
      </div>
    </div>
  `;
  
  // Add to the page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // If CSS needs to be added, it can be dynamically added here
  if (!document.querySelector('link[href*="premiumCardSaleHis.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '../../css/other/marketplace/premiumCardSaleHis.css';
    document.head.appendChild(link);
  }
}

/**
 * Show transaction history modal
 */
function showGameTransactionHistoryModal() {
  const transactionHistoryModal = document.getElementById('gameTransactionHistoryModal');
  if (transactionHistoryModal) {
    transactionHistoryModal.style.display = 'block';
    // Change title to Premium Card Transaction History
    const titleElement = transactionHistoryModal.querySelector('h2');
    if (titleElement) {
      titleElement.textContent = 'Premium Card Transaction History';
    }
    initGameTransactionIndexerContract();
  }
}

/**
 * Hide transaction history modal
 */
function hideGameTransactionHistoryModal() {
  const transactionHistoryModal = document.getElementById('gameTransactionHistoryModal');
  if (transactionHistoryModal) {
    transactionHistoryModal.style.display = 'none';
  }
}

/**
 * Initialize RareNFTTransactionIndexer contract
 */
async function initGameTransactionIndexerContract() {
  try {
    // If the contract is already initialized, directly load transaction history
    if (gameTransactionIndexerContract) {
      loadGameTransactionHistory();
      return;
    }
    
    // Show loading animation
    showGameTransactionHistoryLoading(true);
    
    // First, try to use the already initialized contract
    if (window.rareNFTTransactionIndexerContract) {
      gameTransactionIndexerContract = window.rareNFTTransactionIndexerContract;
      console.log('Using globally initialized transaction indexer contract');
      loadGameTransactionHistory();
      return;
    }
    
    // Get Web3 instance - prioritize using parent window or existing instance to avoid creating a new connection
    let web3Instance = null;
    
    // First, try to use the existing Web3 instance
    if (window.web3Instance) {
      web3Instance = window.web3Instance;
    } else if (window.gameWeb3) { 
      // In game mode, the main page usually stores the web3 instance in gameWeb3
      web3Instance = window.gameWeb3;
    } else if (window.parent && window.parent.gameWeb3) {
      // Try to get the instance from the parent window (if in iframe)
      web3Instance = window.parent.gameWeb3;
    } else if (window.nftMarketplace && window.nftMarketplace.web3) {
      web3Instance = window.nftMarketplace.web3;
    } else if (window.ethereum) {
      // Only create a new Web3 instance when there is no existing instance, but do not request a new connection
      try {
        // Create a new Web3 instance but do not initiate a connection request
        web3Instance = new Web3(window.ethereum);
        console.log('Created a new Web3 instance but did not request connection');
      } catch (error) {
        console.error('Failed to create Web3 instance:', error);
        showGameTransactionError('Failed to create Web3 instance, but you can still view the history');
      }
    } else {
      console.log('No Web3 provider detected, but will still attempt to get transaction history');
    }
    
    // Even without a web3 instance, try to get data in read-only mode
    if (!web3Instance) {
      // Try to create a read-only Web3 instance using a public RPC node
      try {
        // Use Infura or other public RPC service
        const publicRpcUrl = "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"; // Public Infura URL
        web3Instance = new Web3(new Web3.providers.HttpProvider(publicRpcUrl));
        console.log('Created a read-only Web3 instance using public RPC');
      } catch (error) {
        console.error('Failed to create read-only Web3 instance:', error);
        showGameTransactionError('Unable to create Web3 instance, but you can still view cached transaction history');
      }
    }
    
    // Store Web3 instance for later use
    if (web3Instance) {
      window.web3Instance = web3Instance;
    }
    
    // Get contract address function
    const getContractAddressFunc = window.getContractAddress || 
                                 (window.contractAddresses && window.contractAddresses.getContractAddress);
    
    if (!getContractAddressFunc) {
      console.warn('Unable to get contract address function, but will still attempt to get transaction history');
    }
    
    // Get contract ABI
    const abi = window.RareNFTTransactionIndexerABI;
    if (!abi) {
      throw new Error('Unable to get RareNFTTransactionIndexer contract ABI');
    }
    
    // Get contract address
    const network = window.currentNetwork || 'LOCAL';
    let rareNFTTransactionIndexerAddress;
    
    if (typeof getContractAddressFunc === 'function') {
      rareNFTTransactionIndexerAddress = getContractAddressFunc('RareNFTTransactionIndexer');
    } else if (window.contractAddresses && window.contractAddresses[network]) {
      rareNFTTransactionIndexerAddress = window.contractAddresses[network].RareNFTTransactionIndexer;
    } else {
      console.warn('Unable to get RareNFTTransactionIndexer contract address, but will still attempt to get transaction history');
    }
    
    if (!rareNFTTransactionIndexerAddress) {
      console.warn('RareNFTTransactionIndexer contract address is empty, but will still attempt to get transaction history');
    }
    
    // Only create contract instance when both web3 instance and address are available
    if (web3Instance && rareNFTTransactionIndexerAddress) {
      // Create contract instance
      gameTransactionIndexerContract = new web3Instance.eth.Contract(abi, rareNFTTransactionIndexerAddress);
      
      if (!gameTransactionIndexerContract) {
        throw new Error('Transaction indexer contract initialization failed');
      }
      
      // Store globally for use by other modules
      window.rareNFTTransactionIndexerContract = gameTransactionIndexerContract;
      
      console.log('Game mode transaction history indexer contract initialized successfully');
      loadGameTransactionHistory();
    } else {
      // If unable to create contract, show error but allow user to view any cached data
      showGameTransactionError('Unable to initialize contract, but you can still view cached transaction history');
      // Hide loading animation
      showGameTransactionHistoryLoading(false);
    }
  } catch (error) {
    console.error('Failed to initialize transaction indexer contract:', error);
    showGameTransactionError('Failed to initialize transaction history functionality, but you can still view cached transaction history');
    showGameTransactionHistoryLoading(false);
  }
}

/**
 * Load transaction history data
 */
async function loadGameTransactionHistory() {
  if (!gameTransactionIndexerContract) {
    console.error('Transaction indexer contract not initialized');
    showGameTransactionError('Transaction history is temporarily unavailable. Please ensure your wallet is connected on the main page and try again later.');
    showGameTransactionHistoryLoading(false);
    return;
  }
  
  try {
    // Show loading animation
    showGameTransactionHistoryLoading(true);
    
    let transactions = [];
    
    // Load transaction history based on filter criteria
    if (currentGameTransactionQuality === 'all') {
      // Load all qualities (only rare and legendary)
      if (currentGameTransactionSortMethod === 'time') {
        // Sort by time
        let result = await gameTransactionIndexerContract.methods.getTransactionsByTime(currentGameTransactionPage).call();
        console.log("Game mode - Raw time result:", result);
        console.log("Game mode - Time sorting result with levels:", result.levels);
        // Filter to keep only rare and legendary
        result = filterGameHighQualityTransactions(result);
        console.log("Game mode - Filtered time result with levels:", result.levels);
        transactions = formatGameTransactions(result);
      } else {
        // Sort by price
        let result = await gameTransactionIndexerContract.methods.getTransactionsByPrice(currentGameTransactionPage).call();
        console.log("Game mode - Raw price result:", result);
        console.log("Game mode - Price sorting result with levels:", result.levels);
        // Filter to keep only rare and legendary
        result = filterGameHighQualityTransactions(result);
        console.log("Game mode - Filtered price result with levels:", result.levels);
        transactions = formatGameTransactions(result);
      }
    } else {
      // Load specific quality
      const quality = parseInt(currentGameTransactionQuality);
      if (currentGameTransactionSortMethod === 'time') {
        // Sort by time
        const result = await gameTransactionIndexerContract.methods.getQualityTransactionsByTime(quality, currentGameTransactionPage).call();
        console.log("Game mode - Raw quality time result:", result);
        console.log("Game mode - Quality time sorting result with levels:", result.levels);
        transactions = formatGameQualityTransactions(result, quality);
      } else {
        // Sort by price
        const result = await gameTransactionIndexerContract.methods.getQualityTransactionsByPrice(quality, currentGameTransactionPage).call();
        console.log("Game mode - Raw quality price result:", result);
        console.log("Game mode - Quality price sorting result with levels:", result.levels);
        transactions = formatGameQualityTransactions(result, quality);
      }
    }
    
    // Check if transaction data has level property
    console.log("Game mode - Transactions with level information:", transactions.map(tx => ({id: tx.tokenId, level: tx.level})));
    
    // Get total pages information
    await updateGameTransactionPaginationInfo();
    
    // Render transaction records
    renderGameTransactionHistory(transactions);
  } catch (error) {
    console.error('Failed to load transaction history:', error);
    let errorMessage = 'Failed to load transaction history.';
    
    // Friendly messages for specific error types
    if (error.message && error.message.includes('account') && error.message.includes('connected')) {
      errorMessage = 'Browsing transaction history does not require a connected wallet. To filter personal transaction records, please ensure you are connected on the main page.';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Network connection issue. Please check your network connection and try again later.';
    } else if (error.message && error.message.includes('contract')) {
      errorMessage = 'Contract connection issue. Please ensure you have connected your wallet on the main page and are on the correct network.';
    }
    
    showGameTransactionError(errorMessage);
  } finally {
    // Hide loading animation
    showGameTransactionHistoryLoading(false);
  }
}

/**
 * Filter transaction records to keep only rare and legendary qualities
 * @param {Object} result - Transaction record result returned by the contract
 * @returns {Object} Filtered result
 */
function filterGameHighQualityTransactions(result) {
  const { tokenIds, sellers, buyers, qualities, prices, timestamps, levels } = result;
  
  // Create new arrays to store filtered results
  const filteredTokenIds = [];
  const filteredSellers = [];
  const filteredBuyers = [];
  const filteredQualities = [];
  const filteredPrices = [];
  const filteredTimestamps = [];
  const filteredLevels = [];
  
  // Iterate and filter
  for (let i = 0; i < tokenIds.length; i++) {
    const quality = parseInt(qualities[i]);
    if (quality === GameTransactionQuality.RARE || quality === GameTransactionQuality.LEGENDARY) {
      filteredTokenIds.push(tokenIds[i]);
      filteredSellers.push(sellers[i]);
      filteredBuyers.push(buyers[i]);
      filteredQualities.push(qualities[i]);
      filteredPrices.push(prices[i]);
      filteredTimestamps.push(timestamps[i]);
      if (levels && levels[i]) {
        filteredLevels.push(levels[i]);
      }
    }
  }
  
  // Return filtered result
  return {
    tokenIds: filteredTokenIds,
    sellers: filteredSellers,
    buyers: filteredBuyers,
    qualities: filteredQualities,
    prices: filteredPrices,
    timestamps: filteredTimestamps,
    levels: filteredLevels
  };
}

/**
 * Format transaction records for all qualities
 * @param {Object} result - Transaction record result returned by the contract
 * @returns {Array} Formatted transaction record array
 */
function formatGameTransactions(result) {
  const { tokenIds, sellers, buyers, qualities, prices, timestamps, levels } = result;
  const transactions = [];
  
  for (let i = 0; i < tokenIds.length; i++) {
    transactions.push({
      tokenId: parseInt(tokenIds[i]),
      seller: sellers[i],
      buyer: buyers[i],
      quality: parseInt(qualities[i]),
      price: prices[i],
      timestamp: parseInt(timestamps[i]),
      level: levels && levels[i] ? parseInt(levels[i]) : 1
    });
  }
  
  return transactions;
}

/**
 * Format transaction records for specific quality
 * @param {Object} result - Transaction record result returned by the contract for specific quality
 * @param {number} quality - Quality value
 * @returns {Array} Formatted transaction record array
 */
function formatGameQualityTransactions(result, quality) {
  const { tokenIds, sellers, buyers, prices, timestamps, levels } = result;
  const transactions = [];
  
  for (let i = 0; i < tokenIds.length; i++) {
    transactions.push({
      tokenId: parseInt(tokenIds[i]),
      seller: sellers[i],
      buyer: buyers[i],
      quality: quality,
      price: prices[i],
      timestamp: parseInt(timestamps[i]),
      level: levels && levels[i] ? parseInt(levels[i]) : 1
    });
  }
  
  return transactions;
}

/**
 * Render transaction history records
 * @param {Array} transactions - Transaction record array
 */
function renderGameTransactionHistory(transactions) {
  const tableBody = document.getElementById('gameTransactionHistoryBody');
  if (!tableBody) return;
  
  // Clear the table
  tableBody.innerHTML = '';
  
  // If there are no records
  if (!transactions || transactions.length === 0) {
    const noDataRow = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.colSpan = 6;
    noDataCell.textContent = 'No premium card transaction records found';
    noDataCell.style.textAlign = 'center';
    noDataCell.style.padding = '20px 0';
    noDataRow.appendChild(noDataCell);
    tableBody.appendChild(noDataRow);
    return;
  }
  
  // Check the logs
  console.log('Rendering game transactions with levels:', transactions.map(tx => ({id: tx.tokenId, level: tx.level})));
  
  // Create table rows
  transactions.forEach(tx => {
    const row = document.createElement('tr');
    
    // Token ID cell
    const tokenIdCell = document.createElement('td');
    tokenIdCell.textContent = tx.tokenId;
    row.appendChild(tokenIdCell);
    
    // Quality cell
    const qualityCell = document.createElement('td');
    const qualityName = gameQualityNames[tx.quality] || 'UNKNOWN';
    qualityCell.textContent = qualityName;
    qualityCell.className = `quality-${qualityName}`;
    row.appendChild(qualityCell);
    
    // Level cell (replacing the original seller cell)
    const levelCell = document.createElement('td');
    const levelValue = tx.level ? tx.level : 1;
    levelCell.textContent = levelValue;
    levelCell.className = 'level-cell';
    levelCell.style.fontWeight = 'bold';
    levelCell.style.color = '#4d7bef';
    levelCell.style.textAlign = 'center';
    row.appendChild(levelCell);
    
    // Buyer cell
    const buyerCell = document.createElement('td');
    buyerCell.textContent = formatGameAddress(tx.buyer);
    buyerCell.className = 'address-cell';
    buyerCell.title = tx.buyer;
    row.appendChild(buyerCell);
    
    // Price cell
    const priceCell = document.createElement('td');
    priceCell.textContent = (parseFloat(formatGameWeiToEther(tx.price))).toFixed(2) + ' USD';
    row.appendChild(priceCell);
    
    // Transaction time cell
    const timeCell = document.createElement('td');
    timeCell.textContent = formatGameTimestamp(tx.timestamp);
    row.appendChild(timeCell);
    
    // Add row to table
    tableBody.appendChild(row);
  });
}

/**
 * Update transaction history pagination information
 */
async function updateGameTransactionPaginationInfo() {
  try {
    // Get total count
    let totalItems = 0;
    
    if (currentGameTransactionQuality === 'all') {
      // Get total count of all transactions
      if (currentGameTransactionSortMethod === 'time') {
        const count = await gameTransactionIndexerContract.methods.getTimeIndicesCount().call();
        totalItems = parseInt(count);
      } else {
        const count = await gameTransactionIndexerContract.methods.getPriceIndicesCount().call();
        totalItems = parseInt(count);
      }
    } else {
      // Get total count of specific quality transactions
      const quality = parseInt(currentGameTransactionQuality);
      const count = await gameTransactionIndexerContract.methods.getQualityTransactionCount(quality).call();
      totalItems = parseInt(count);
    }
    
    // Calculate total pages (10 items per page)
    const pageSize = 10;
    gameTransactionHistoryTotalPages = Math.ceil(totalItems / pageSize) || 1;
    
    // Update pagination UI
    updateGameTransactionPaginationUI(totalItems);
  } catch (error) {
    console.error('Failed to get transaction history pagination information:', error);
  }
}

/**
 * Update transaction history pagination UI
 * @param {number} totalItems - Total item count
 */
function updateGameTransactionPaginationUI(totalItems) {
  const pageInfoElement = document.querySelector('#gameTransactionHistoryModal .th-page-info');
  const prevPageBtn = document.getElementById('gameTHPrevPage');
  const nextPageBtn = document.getElementById('gameTHNextPage');
  
  if (pageInfoElement) {
    const currentPageDisplay = currentGameTransactionPage + 1;
    const totalPages = gameTransactionHistoryTotalPages || 1;
    
    // Get i18n translation if available
    if (window.i18n && window.i18n.t) {
      pageInfoElement.textContent = window.i18n.t('common.pageInfoWithTotal', {
        current: currentPageDisplay, 
        total: totalPages,
        items: totalItems
      });
    } else {
      pageInfoElement.textContent = `Page ${currentPageDisplay} of ${totalPages} (${totalItems} records)`;
    }
  }
  
  // Disable/enable previous page button
  if (prevPageBtn) {
    prevPageBtn.disabled = currentGameTransactionPage <= 0;
  }
  
  // Disable/enable next page button
  if (nextPageBtn) {
    nextPageBtn.disabled = currentGameTransactionPage >= gameTransactionHistoryTotalPages - 1;
  }
}

/**
 * Show/hide transaction history loading animation
 * @param {boolean} show - Whether to show loading animation
 */
function showGameTransactionHistoryLoading(show) {
  const loadingElement = document.querySelector('#gameTransactionHistoryModal .transaction-history-loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

/**
 * Show transaction history error message
 * @param {string} message - Error message
 */
function showGameTransactionError(message) {
  const tableBody = document.getElementById('gameTransactionHistoryBody');
  if (!tableBody) return;
  
  // Clear the table
  tableBody.innerHTML = '';
  
  // Create error row
  const errorRow = document.createElement('tr');
  const errorCell = document.createElement('td');
  errorCell.colSpan = 6;
  errorCell.textContent = message;
  errorCell.style.textAlign = 'center';
  errorCell.style.padding = '20px 0';
  errorCell.style.color = '#ff6b6b';
  errorRow.appendChild(errorCell);
  tableBody.appendChild(errorRow);
}

/**
 * Format Wei to Ether
 * @param {string|number} wei - Value in Wei
 * @returns {string} Value in Ether
 */
function formatGameWeiToEther(wei) {
  const web3Instance = window.web3Instance;
  
  if (!web3Instance || !web3Instance.utils) {
    const weiNum = typeof wei === 'string' ? wei : wei.toString();
    return (parseInt(weiNum) / 1e18).toFixed(6);
  }
  
  return web3Instance.utils.fromWei(wei.toString(), 'ether');
}

/**
 * Format address to abbreviated form
 * @param {string} address - Full address
 * @returns {string} Abbreviated address
 */
function formatGameAddress(address) {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

/**
 * Format timestamp to readable time
 * @param {number} timestamp - Unix timestamp (seconds)
 * @returns {string} Formatted time string
 */
function formatGameTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

// Export initialization function
window.initGameTransactionHistory = initGameTransactionHistory; 