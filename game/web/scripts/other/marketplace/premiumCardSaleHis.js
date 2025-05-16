/**
 * Transaction history related functionalities
 * Used to display and operate on the transaction history of NFTs
 */

// Global variables
let transactionIndexerContract = null;
let currentTransactionPage = 0;
let currentTransactionQuality = 'all';
let currentTransactionSortMethod = 'time';
let transactionHistoryTotalPages = 1;

// Quality enumeration values
const TransactionQuality = {
  RARE: 3,
  LEGENDARY: 4
};

// Quality name mapping
const qualityNames = {
  3: 'RARE',
  4: 'LEGENDARY'
};

/**
 * Initialize transaction history related event listeners and functionalities
 */
function initTransactionHistory() {
  // Get DOM elements
  const viewTransactionHistoryBtn = document.getElementById('viewTransactionHistoryBtn');
  const transactionHistoryModal = document.getElementById('transactionHistoryModal');
  const transactionHistoryClose = document.querySelector('.transaction-history-close');
  const transactionSortSelect = document.getElementById('transactionSortSelect');
  const transactionQualitySelect = document.getElementById('transactionQualitySelect');
  const thPrevPage = document.getElementById('thPrevPage');
  const thNextPage = document.getElementById('thNextPage');
  
  // Update transaction history button text
  if (viewTransactionHistoryBtn) {
    const buttonText = document.createTextNode('Advanced Card Transaction History');
    const buttonIcon = viewTransactionHistoryBtn.querySelector('.btn-icon');
    viewTransactionHistoryBtn.innerHTML = '';
    if (buttonIcon) {
      viewTransactionHistoryBtn.appendChild(buttonIcon);
    }
    viewTransactionHistoryBtn.appendChild(buttonText);
  }
  
  // Update quality selector, keeping only rare and legendary
  if (transactionQualitySelect) {
    // Clear existing options
    transactionQualitySelect.innerHTML = '';
    
    // Add "All" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All High Qualities';
    transactionQualitySelect.appendChild(allOption);
    
    // Add rare and legendary options
    const rareOption = document.createElement('option');
    rareOption.value = '3';
    rareOption.textContent = 'Rare';
    transactionQualitySelect.appendChild(rareOption);
    
    const legendaryOption = document.createElement('option');
    legendaryOption.value = '4';
    legendaryOption.textContent = 'Legendary';
    transactionQualitySelect.appendChild(legendaryOption);
  }
  
  // Bind click event to view transaction history button
  if (viewTransactionHistoryBtn) {
    viewTransactionHistoryBtn.addEventListener('click', showTransactionHistoryModal);
  }
  
  // Bind close modal event
  if (transactionHistoryClose) {
    transactionHistoryClose.addEventListener('click', hideTransactionHistoryModal);
  }
  
  // Click outside modal to close
  window.addEventListener('click', function(event) {
    if (event.target === transactionHistoryModal) {
      hideTransactionHistoryModal();
    }
  });
  
  // Bind sort selection event
  if (transactionSortSelect) {
    transactionSortSelect.addEventListener('change', function(event) {
      currentTransactionSortMethod = event.target.value;
      currentTransactionPage = 0;
      loadTransactionHistory();
    });
  }
  
  // Bind quality selection event
  if (transactionQualitySelect) {
    transactionQualitySelect.addEventListener('change', function(event) {
      currentTransactionQuality = event.target.value;
      currentTransactionPage = 0;
      loadTransactionHistory();
    });
  }
  
  // Bind pagination events
  if (thPrevPage) {
    thPrevPage.addEventListener('click', function() {
      if (currentTransactionPage > 0) {
        currentTransactionPage--;
        loadTransactionHistory();
      }
    });
  }
  
  if (thNextPage) {
    thNextPage.addEventListener('click', function() {
      if (currentTransactionPage < transactionHistoryTotalPages - 1) {
        currentTransactionPage++;
        loadTransactionHistory();
      }
    });
  }
}

/**
 * Show transaction history modal
 */
function showTransactionHistoryModal() {
  const transactionHistoryModal = document.getElementById('transactionHistoryModal');
  if (transactionHistoryModal) {
    transactionHistoryModal.style.display = 'block';
    // Change title to Advanced Card Transaction History
    const titleElement = transactionHistoryModal.querySelector('h2');
    if (titleElement) {
      titleElement.textContent = 'Advanced Card Transaction History';
    }
    initTransactionIndexerContract();
  }
}

/**
 * Hide transaction history modal
 */
function hideTransactionHistoryModal() {
  const transactionHistoryModal = document.getElementById('transactionHistoryModal');
  if (transactionHistoryModal) {
    transactionHistoryModal.style.display = 'none';
  }
}

/**
 * Initialize RareNFTTransactionIndexer contract
 */
async function initTransactionIndexerContract() {
  try {
    // Use the web3 instance already initialized on the marketplace page
    if (!window.web3) {
      // Try to use the already connected Ethereum provider
      if (window.ethereum) {
        console.log('Using window.ethereum as provider');
        window.web3 = new Web3(window.ethereum);
      } else if (window.rareNFTTransactionIndexerContract) {
        // If the contract has already been initialized in marketplace.js, use it directly
        console.log('Using initialized rareNFTTransactionIndexerContract');
        transactionIndexerContract = window.rareNFTTransactionIndexerContract;
        loadTransactionHistory();
        return;
      } else {
        console.error('Web3 is not available, unable to initialize transaction indexer contract');
        showTransactionError('Web3 is not available, please connect your wallet and try again');
        return;
      }
    }
    
    if (transactionIndexerContract) {
      // Contract is already initialized, load transaction history directly
      loadTransactionHistory();
      return;
    }
    
    // Show loading animation
    showTransactionHistoryLoading(true);
    
    // First, try to use the already initialized contract
    if (window.rareNFTTransactionIndexerContract) {
      transactionIndexerContract = window.rareNFTTransactionIndexerContract;
      console.log('Using globally initialized transaction indexer contract');
      loadTransactionHistory();
      return;
    }
    
    // Initialize contract
    const getContractAddressFunc = window.getContractAddress || 
                                 (window.contractAddresses && window.contractAddresses.getContractAddress);
    
    if (!getContractAddressFunc) {
      throw new Error('Unable to get contract address function');
    }
    
    transactionIndexerContract = window.initRareNFTTransactionIndexerContract(
      window.web3, 
      getContractAddressFunc
    );
    
    if (!transactionIndexerContract) {
      throw new Error('Transaction indexer contract initialization failed');
    }
    
    console.log('Transaction history indexer contract initialized successfully');
    loadTransactionHistory();
  } catch (error) {
    console.error('Failed to initialize transaction indexer contract:', error);
    showTransactionError('Failed to initialize transaction history functionality: ' + error.message);
    showTransactionHistoryLoading(false);
  }
}

/**
 * Load transaction history data
 */
async function loadTransactionHistory() {
  if (!transactionIndexerContract) {
    console.error('Transaction indexer contract not initialized');
    return;
  }
  
  try {
    // Show loading animation
    showTransactionHistoryLoading(true);
    
    let transactions = [];
    
    // Load transaction history based on filter conditions
    if (currentTransactionQuality === 'all') {
      // Load all qualities (only rare and legendary)
      if (currentTransactionSortMethod === 'time') {
        // Sort by time
        let result = await transactionIndexerContract.methods.getTransactionsByTime(currentTransactionPage).call();
        console.log("Raw time result:", result);
        console.log("Time sorting result with levels:", result.levels);
        // Filter to keep only rare and legendary
        result = filterHighQualityTransactions(result);
        console.log("Filtered time result with levels:", result.levels);
        transactions = formatTransactions(result);
      } else {
        // Sort by price
        let result = await transactionIndexerContract.methods.getTransactionsByPrice(currentTransactionPage).call();
        console.log("Raw price result:", result);
        console.log("Price sorting result with levels:", result.levels);
        // Filter to keep only rare and legendary
        result = filterHighQualityTransactions(result);
        console.log("Filtered price result with levels:", result.levels);
        transactions = formatTransactions(result);
      }
    } else {
      // Load specific quality
      const quality = parseInt(currentTransactionQuality);
      if (currentTransactionSortMethod === 'time') {
        // Sort by time
        const result = await transactionIndexerContract.methods.getQualityTransactionsByTime(quality, currentTransactionPage).call();
        console.log("Raw quality time result:", result);
        console.log("Quality time sorting result with levels:", result.levels);
        transactions = formatQualityTransactions(result, quality);
      } else {
        // Sort by price
        const result = await transactionIndexerContract.methods.getQualityTransactionsByPrice(quality, currentTransactionPage).call();
        console.log("Raw quality price result:", result);
        console.log("Quality price sorting result with levels:", result.levels);
        transactions = formatQualityTransactions(result, quality);
      }
    }
    
    // Check if transaction data has level property
    console.log("Transactions with level information:", transactions.map(tx => ({id: tx.tokenId, level: tx.level})));
    
    // Get total pages information
    await updateTransactionPaginationInfo();
    
    // Render transaction records
    renderTransactionHistory(transactions);
  } catch (error) {
    console.error('Failed to load transaction history:', error);
    showTransactionError('Failed to load transaction history: ' + error.message);
  } finally {
    // Hide loading animation
    showTransactionHistoryLoading(false);
  }
}

/**
 * Filter transaction records, keeping only rare and legendary qualities
 * @param {Object} result - Transaction record result returned by the contract
 * @returns {Object} Filtered result
 */
function filterHighQualityTransactions(result) {
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
    if (quality === TransactionQuality.RARE || quality === TransactionQuality.LEGENDARY) {
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
 * Format all quality transaction records
 * @param {Object} result - Transaction record result returned by the contract
 * @returns {Array} Formatted transaction record array
 */
function formatTransactions(result) {
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
 * Format specific quality transaction records
 * @param {Object} result - Specific quality transaction record result returned by the contract
 * @param {number} quality - Quality value
 * @returns {Array} Formatted transaction record array
 */
function formatQualityTransactions(result, quality) {
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
function renderTransactionHistory(transactions) {
  const tableBody = document.getElementById('transactionHistoryBody');
  if (!tableBody) return;
  
  // Clear table
  tableBody.innerHTML = '';
  
  // If there are no records
  if (!transactions || transactions.length === 0) {
    const noDataRow = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.colSpan = 6;
    noDataCell.textContent = 'No advanced card transaction records found';
    noDataCell.style.textAlign = 'center';
    noDataCell.style.padding = '20px 0';
    noDataRow.appendChild(noDataCell);
    tableBody.appendChild(noDataRow);
    return;
  }
  
  // Check the logs
  console.log('Rendering transactions with levels:', transactions.map(tx => ({id: tx.tokenId, level: tx.level})));
  
  // Create table rows
  transactions.forEach(tx => {
    const row = document.createElement('tr');
    
    // Token ID cell
    const tokenIdCell = document.createElement('td');
    tokenIdCell.textContent = tx.tokenId;
    row.appendChild(tokenIdCell);
    
    // Quality cell
    const qualityCell = document.createElement('td');
    const qualityName = qualityNames[tx.quality] || 'UNKNOWN';
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
    buyerCell.textContent = formatAddress(tx.buyer);
    buyerCell.className = 'address-cell';
    buyerCell.title = tx.buyer;
    row.appendChild(buyerCell);
    
    // Price cell
    const priceCell = document.createElement('td');
    priceCell.textContent = (parseFloat(formatWeiToEther(tx.price))).toFixed(2) + ' USD';
    row.appendChild(priceCell);
    
    // Transaction time cell
    const timeCell = document.createElement('td');
    timeCell.textContent = formatTimestamp(tx.timestamp);
    row.appendChild(timeCell);
    
    // Add row to table
    tableBody.appendChild(row);
  });
}

/**
 * Update transaction history pagination information
 */
async function updateTransactionPaginationInfo() {
  try {
    // Get total count
    let totalItems = 0;
    
    if (currentTransactionQuality === 'all') {
      // Get total number of all transactions (note that it cannot be filtered, so it will show the number of all transactions)
      if (currentTransactionSortMethod === 'time') {
        const count = await transactionIndexerContract.methods.getTimeIndicesCount().call();
        totalItems = parseInt(count);
      } else {
        const count = await transactionIndexerContract.methods.getPriceIndicesCount().call();
        totalItems = parseInt(count);
      }
    } else {
      // Get total number of specific quality transactions
      const quality = parseInt(currentTransactionQuality);
      const count = await transactionIndexerContract.methods.getQualityTransactionCount(quality).call();
      totalItems = parseInt(count);
    }
    
    // Calculate total pages (10 items per page)
    const pageSize = 10;
    transactionHistoryTotalPages = Math.ceil(totalItems / pageSize) || 1;
    
    // Update pagination information UI
    updateTransactionPaginationUI(totalItems);
  } catch (error) {
    console.error('Failed to get transaction history pagination information:', error);
  }
}

/**
 * Update transaction history pagination UI
 * @param {number} totalItems - Total item count
 */
function updateTransactionPaginationUI(totalItems) {
  const pageInfoElement = document.querySelector('.th-page-info');
  const prevPageBtn = document.getElementById('thPrevPage');
  const nextPageBtn = document.getElementById('thNextPage');
  
  if (pageInfoElement) {
    const currentPageDisplay = currentTransactionPage + 1;
    const totalPages = transactionHistoryTotalPages || 1;
    
    // Get i18n translation, if available
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
    prevPageBtn.disabled = currentTransactionPage <= 0;
  }
  
  // Disable/enable next page button
  if (nextPageBtn) {
    nextPageBtn.disabled = currentTransactionPage >= transactionHistoryTotalPages - 1;
  }
}

/**
 * Show/hide transaction history loading animation
 * @param {boolean} show - Whether to show loading animation
 */
function showTransactionHistoryLoading(show) {
  const loadingElement = document.querySelector('.transaction-history-loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

/**
 * Show transaction history error message
 * @param {string} message - Error message
 */
function showTransactionError(message) {
  const tableBody = document.getElementById('transactionHistoryBody');
  if (!tableBody) return;
  
  // Clear table
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
function formatWeiToEther(wei) {
  if (!window.web3 || !window.web3.utils) {
    const weiNum = typeof wei === 'string' ? wei : wei.toString();
    return (parseInt(weiNum) / 1e18).toFixed(6);
  }
  
  return window.web3.utils.fromWei(wei.toString(), 'ether');
}

/**
 * Format address to abbreviated form
 * @param {string} address - Full address
 * @returns {string} Abbreviated address
 */
function formatAddress(address) {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

/**
 * Format timestamp to readable time
 * @param {number} timestamp - Unix timestamp (seconds)
 * @returns {string} Formatted time string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initTransactionHistory();
}); 