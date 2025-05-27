/**
 * Contract approval management file
 * This file is responsible for handling all contract approval related functionalities
 */

/**
 * Batch approve PWFOOD tokens to NFTFeedingManager contract
 * @param {Object} pwfoodContract - PWFOOD token contract instance
 * @param {string} spenderAddress - The address of the contract to be authorized
 * @param {number} amount - The amount to be approved
 * @param {string} userAddress - The user's wallet address
 * @returns {Promise<Object>} The authorization result
 */
async function approvePWFOOD(pwfoodContract, spenderAddress, amount, userAddress) {
  if (!pwfoodContract) {
    console.error('Failed to authorize PWFOOD: PWFOOD contract instance is empty');
    return { success: false, error: 'PWFOOD contract instance is empty' };
  }
  
  if (!spenderAddress) {
    console.error('Failed to authorize PWFOOD: The authorized address is empty');
    return { success: false, error: 'The authorized address is empty' };
  }
  
  if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) {
    console.error('Failed to authorize PWFOOD: Invalid approval amount');
    return { success: false, error: 'Invalid approval amount' };
  }
  
  try {
    // Process the token amount, set to the maximum value for future feeding
    const amountToApprove = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
    
    // Check if using private key wallet
    const shouldUsePrivateKey = window.SecureWalletManager && 
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
    
    if (shouldUsePrivateKey) {
      console.log('Using private key wallet for PWFOOD approval');
      
      // Use SecureWalletManager for private key transactions
      const receipt = await window.SecureWalletManager.sendContractTransaction(
        pwfoodContract,
        'approve',
        [spenderAddress, amountToApprove]
      );
      
      console.log('Private key authorization PWFOOD transaction submitted:', receipt.transactionHash);
      return { 
        success: true, 
        transaction: receipt
      };
    } else {
      console.log('Using connected wallet for PWFOOD approval');
      
    // Send the authorization transaction
    const gasEstimate = await pwfoodContract.methods.approve(spenderAddress, amountToApprove).estimateGas({ from: userAddress });
    const transaction = await pwfoodContract.methods.approve(spenderAddress, amountToApprove).send({
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.5) // Add 50% gas as a buffer
    });
    
      console.log('Connected wallet authorization PWFOOD transaction submitted:', transaction);
    return { 
      success: true, 
      transaction: transaction
    };
    }
  } catch (error) {
    console.error('Failed to authorize PWFOOD:', error);
    return { success: false, error: error.message || 'Failed to authorize PWFOOD' };
  }
}

/**
 * Check the token allowance
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {string} ownerAddress - The token owner address
 * @param {string} spenderAddress - The address of the contract to be authorized
 * @returns {Promise<string>} The allowance
 */
async function checkTokenAllowance(tokenContract, ownerAddress, spenderAddress) {
  if (!tokenContract || !ownerAddress || !spenderAddress) {
    console.error('Failed to check token allowance: Invalid parameters');
    return '0';
  }
  
  try {
    const allowance = await tokenContract.methods.allowance(ownerAddress, spenderAddress).call();
    return allowance;
  } catch (error) {
    console.error('Failed to check token allowance:', error);
    return '0';
  }
}

/**
 * Get the ERC20 token balance
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {string} ownerAddress - The token owner address
 * @returns {Promise<string>} The token balance
 */
async function getTokenBalance(tokenContract, ownerAddress) {
  if (!tokenContract || !ownerAddress) {
    console.error('Failed to get token balance: Invalid parameters');
    return '0';
  }
  
  try {
    const balance = await tokenContract.methods.balanceOf(ownerAddress).call();
    return balance;
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return '0';
  }
}

/**
 * Check if authorization is needed
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {string} ownerAddress - The token owner address
 * @param {string} spenderAddress - The address of the contract to be authorized
 * @param {string} requiredAmount - The amount to be authorized
 * @returns {Promise<Object>} The check result
 */
async function checkIfApprovalNeeded(tokenContract, ownerAddress, spenderAddress, requiredAmount) {
  if (!tokenContract || !ownerAddress || !spenderAddress) {
    return { 
      needsApproval: true, 
      reason: 'Invalid parameters, unable to determine authorization status' 
    };
  }
  
  try {
    // Check the token balance
    const balance = await getTokenBalance(tokenContract, ownerAddress);
    if (BigInt(balance) < BigInt(requiredAmount)) {
      return {
        needsApproval: false,
        sufficientFunds: false,
        reason: 'Insufficient balance',
        balance,
        requiredAmount
      };
    }
    
    // Check the token allowance
    const allowance = await checkTokenAllowance(tokenContract, ownerAddress, spenderAddress);
    const needsApproval = BigInt(allowance) < BigInt(requiredAmount);
    
    return {
      needsApproval,
      sufficientFunds: true,
      currentAllowance: allowance,
      requiredAmount,
      balance
    };
  } catch (error) {
    console.error('Failed to check authorization requirements:', error);
    return { 
      needsApproval: true, 
      reason: 'Failed to check authorization: ' + (error.message || 'Unknown error') 
    };
  }
}

/**
 * General ERC20 token authorization
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {string} spenderAddress - The address of the contract to be authorized
 * @param {string} amount - The authorization amount (string format, supports large values)
 * @param {string} userAddress - The user's wallet address
 * @param {boolean} isMaxAmount - Whether to authorize the maximum amount
 * @returns {Promise<Object>} The authorization result
 */
async function approveERC20Token(tokenContract, spenderAddress, amount, userAddress, isMaxAmount = false) {
  if (!tokenContract) {
    console.error('Failed to authorize token: Token contract instance is empty');
    return { success: false, error: 'Token contract instance is empty' };
  }
  
  if (!spenderAddress) {
    console.error('Failed to authorize token: The authorized address is empty');
    return { success: false, error: 'The authorized address is empty' };
  }
  
  if (!userAddress) {
    console.error('Failed to authorize token: The user address is empty');
    return { success: false, error: 'The user address is empty' };
  }
  
  try {
    // If the maximum authorization amount is requested
    const amountToApprove = isMaxAmount 
      ? "115792089237316195423570985008687907853269984665640564039457584007913129639935" // 2^256 - 1
      : amount;
    
    console.log('Preparing to authorize amount:', amountToApprove);
    
    // Check if using private key wallet
    const shouldUsePrivateKey = window.SecureWalletManager && 
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
    
    if (shouldUsePrivateKey) {
      console.log('Using private key wallet for token approval');
      
      // Use SecureWalletManager for private key transactions
      const receipt = await window.SecureWalletManager.sendContractTransaction(
        tokenContract,
        'approve',
        [spenderAddress, amountToApprove]
      );
      
      console.log('Private key authorization token transaction submitted:', receipt.transactionHash);
      return { 
        success: true, 
        transaction: receipt
      };
    } else {
      console.log('Using connected wallet for token approval');
      
      // Use traditional connected wallet method
    const gasEstimate = await tokenContract.methods.approve(spenderAddress, amountToApprove).estimateGas({ from: userAddress });
    const transaction = await tokenContract.methods.approve(spenderAddress, amountToApprove).send({
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.5) // Add 50% gas as a buffer
    });
    
      console.log('Connected wallet authorization token transaction submitted:', transaction);
    return { 
      success: true, 
      transaction: transaction
    };
    }
  } catch (error) {
    console.error('Failed to authorize token:', error);
    return { success: false, error: error.message || 'Failed to authorize token' };
  }
}

/**
 * Revoke ERC20 token authorization
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {string} spenderAddress - The address of the contract to be authorized
 * @param {string} userAddress - The user's wallet address
 * @returns {Promise<Object>} The revocation result
 */
async function revokeERC20Approval(tokenContract, spenderAddress, userAddress) {
  if (!tokenContract || !spenderAddress || !userAddress) {
    console.error('Failed to revoke authorization: Invalid parameters');
    return { success: false, error: 'Invalid parameters' };
  }
  
  try {
    // Check if using private key wallet
    const shouldUsePrivateKey = window.SecureWalletManager && 
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
    
    if (shouldUsePrivateKey) {
      console.log('Using private key wallet for token revocation');
      
      // Use SecureWalletManager for private key transactions
      const receipt = await window.SecureWalletManager.sendContractTransaction(
        tokenContract,
        'approve',
        [spenderAddress, '0']
      );
      
      console.log('Private key revocation token authorization transaction submitted:', receipt.transactionHash);
      return { 
        success: true, 
        transaction: receipt
      };
    } else {
      console.log('Using connected wallet for token revocation');
      
    // Revoking authorization actually sets the authorization amount to 0
    const gasEstimate = await tokenContract.methods.approve(spenderAddress, '0').estimateGas({ from: userAddress });
    const transaction = await tokenContract.methods.approve(spenderAddress, '0').send({
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.5)
    });
    
      console.log('Connected wallet revocation token authorization transaction submitted:', transaction);
    return { 
      success: true, 
      transaction: transaction
    };
    }
  } catch (error) {
    console.error('Failed to revoke token authorization:', error);
    return { success: false, error: error.message || 'Failed to revoke token authorization' };
  }
}

/**
 * Batch check and authorize multiple contracts
 * @param {Object} tokenContract - ERC20 token contract instance
 * @param {Array<string>} spenderAddresses - The array of authorized contract addresses
 * @param {string} userAddress - The user's wallet address
 * @returns {Promise<Object>} The batch authorization result
 */
async function batchApproveContracts(tokenContract, spenderAddresses, userAddress) {
  if (!tokenContract || !spenderAddresses || !userAddress) {
    console.error('Failed to batch authorize: Invalid parameters');
    return { success: false, error: 'Invalid parameters' };
  }
  
  if (!Array.isArray(spenderAddresses) || spenderAddresses.length === 0) {
    console.error('Failed to batch authorize: Invalid contract address array');
    return { success: false, error: 'Invalid contract address array' };
  }
  
  const results = [];
  let allSuccess = true;
  
  for (const spenderAddress of spenderAddresses) {
    // First check the current authorization limit
    const currentAllowance = await checkTokenAllowance(tokenContract, userAddress, spenderAddress);
    
    // If there is already enough authorization, skip
    if (currentAllowance !== '0') {
      results.push({
        spenderAddress,
        success: true,
        skipped: true,
        message: 'Already authorized, skipping'
      });
      continue;
    }
    
    // Execute authorization
    const result = await approveERC20Token(tokenContract, spenderAddress, '0', userAddress, true);
    
    if (!result.success) {
      allSuccess = false;
    }
    
    results.push({
      spenderAddress,
      ...result
    });
  }
  
  return {
    success: allSuccess,
    results
  };
}

/**
 * Set all required approvals for purchasing eggs
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - The user's wallet address
 * @param {Object} tokenContract - The payment token contract instance
 * @param {string} amount - The amount to be approved (optional, use a large amount if not provided)
 * @returns {Promise<boolean>} - Whether all approvals are successful
 */
async function setupEggApprovals(web3, userAddress, tokenContract, amount = null) {
  if (!web3 || !userAddress || !tokenContract) {
    console.error('Failed to set approvals: Invalid parameters');
    return false;
  }
  
  try {
    console.log('Setting all required approvals for purchasing eggs...');
    
    // Get the required contract addresses
    const network = window.currentNetwork || 'TEST';
    let nftLotteryManagerAddress = null, paymentManagerAddress = null;
    
    // Use a safer way to get contract addresses
    if (typeof window.getContractAddress === 'function') {
      try {
        nftLotteryManagerAddress = window.getContractAddress('NFTLotteryManager');
        console.log('Got NFTLotteryManager address:', nftLotteryManagerAddress);
      } catch (err) {
        console.warn('Failed to get NFTLotteryManager address using getContractAddress:', err.message);
        // Continue trying other methods to get the address
      }
      
      try {
        paymentManagerAddress = window.getContractAddress('PaymentManager');
        console.log('Got PaymentManager address:', paymentManagerAddress);
      } catch (err) {
        console.warn('Failed to get PaymentManager address using getContractAddress:', err.message);
        // Continue trying other methods to get the address
      }
    }
    
    // If getContractAddress fails to get the address, try to get it directly from contractAddresses
    if (!nftLotteryManagerAddress || !paymentManagerAddress) {
      if (window.contractAddresses) {
        // Try multiple network environments
        const networks = [network, 'TEST', 'MAIN'];
        
        for (const net of networks) {
          if (window.contractAddresses[net]) {
            if (!nftLotteryManagerAddress && window.contractAddresses[net].NFTLotteryManager) {
              nftLotteryManagerAddress = window.contractAddresses[net].NFTLotteryManager;
              console.log(`Got NFTLotteryManager address from ${net} network:`, nftLotteryManagerAddress);
            }
            
            if (!paymentManagerAddress && window.contractAddresses[net].PaymentManager) {
              paymentManagerAddress = window.contractAddresses[net].PaymentManager;
              console.log(`Got PaymentManager address from ${net} network:`, paymentManagerAddress);
            }
            
            // If both addresses are found, stop searching
            if (nftLotteryManagerAddress && paymentManagerAddress) {
              break;
            }
          }
        }
      }
    }
    
    // Ensure all addresses are valid
    if (!nftLotteryManagerAddress || !paymentManagerAddress) {
      console.error('Failed to get required contract addresses', {
        nftLotteryManagerAddress: nftLotteryManagerAddress || 'undefined',
        paymentManagerAddress: paymentManagerAddress || 'undefined'
      });
      
      // If at least one address is available, continue processing
      if (!nftLotteryManagerAddress && !paymentManagerAddress) {
        return false;
      }
    }
    
    console.log('Required contracts to be authorized:', {
      NFTLotteryManager: nftLotteryManagerAddress || 'undefined',
      PaymentManager: paymentManagerAddress || 'undefined'
    });
    
    // Create an array to store all authorization checks and authorization operations
    const contracts = [];
    
    if (nftLotteryManagerAddress) {
      contracts.push({ name: 'NFTLotteryManager', address: nftLotteryManagerAddress });
    }
    
    if (paymentManagerAddress) {
      contracts.push({ name: 'PaymentManager', address: paymentManagerAddress });
    }
    
    if (contracts.length === 0) {
      console.error('No valid contract addresses available for authorization');
      return false;
    }
    
    // Batch authorize all contracts
    return await batchApproveTokensForContracts(web3, tokenContract, contracts, userAddress, amount);
  } catch (error) {
    console.error('Failed to set egg authorization:', error);
    return false;
  }
}

/**
 * Check and ensure that all required approvals for领取免费NFT have been set
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - The user's wallet address
 * @param {Object} pwPointContract - PwPoint token contract instance
 * @returns {Promise<boolean>} - Whether all approvals are successful
 */
async function ensureFreeNFTApprovals(web3, userAddress, pwPointContract) {
  if (!web3 || !userAddress) {
    console.error('Failed to set free NFT authorization: Invalid parameters');
    return false;
  }
  
  try {
    console.log('Checking all required approvals for领取免费NFT...');
    
    // Get the required contract addresses
    const network = window.currentNetwork || 'TEST';
    let nftLotteryManagerAddress = null, pwPointManagerAddress = null;
    
    // Use a safer way to get contract addresses
    if (typeof window.getContractAddress === 'function') {
      try {
        nftLotteryManagerAddress = window.getContractAddress('NFTLotteryManager');
        console.log('Got NFTLotteryManager address:', nftLotteryManagerAddress);
      } catch (err) {
        console.warn('Failed to get NFTLotteryManager address using getContractAddress:', err.message);
        // Continue trying other methods to get the address
      }
      
      try {
        pwPointManagerAddress = window.getContractAddress('PwPointManager');
        console.log('Got PwPointManager address:', pwPointManagerAddress);
      } catch (err) {
        console.warn('Failed to get PwPointManager address using getContractAddress:', err.message);
        // Continue trying other methods to get the address
      }
    }
    
    // If getContractAddress fails to get the address, try to get it directly from contractAddresses
    if (!nftLotteryManagerAddress || !pwPointManagerAddress) {
      if (window.contractAddresses) {
        // Try multiple network environments
        const networks = [network, 'TEST', 'LOCAL'];
        
        for (const net of networks) {
          if (window.contractAddresses[net]) {
            if (!nftLotteryManagerAddress && window.contractAddresses[net].NFTLotteryManager) {
              nftLotteryManagerAddress = window.contractAddresses[net].NFTLotteryManager;
              console.log(`Got NFTLotteryManager address from ${net} network:`, nftLotteryManagerAddress);
            }
            
            if (!pwPointManagerAddress && window.contractAddresses[net].PwPointManager) {
              pwPointManagerAddress = window.contractAddresses[net].PwPointManager;
              console.log(`Got PwPointManager address from ${net} network:`, pwPointManagerAddress);
            }
            
            // If both addresses are found, stop searching
            if (nftLotteryManagerAddress && pwPointManagerAddress) {
              break;
            }
          }
        }
      }
    }
    
    // Ensure all addresses are valid
    if (!nftLotteryManagerAddress || !pwPointManagerAddress) {
      console.error('Failed to get required contract addresses', {
        nftLotteryManagerAddress: nftLotteryManagerAddress || 'undefined',
        pwPointManagerAddress: pwPointManagerAddress || 'undefined'
      });
      
      // If at least one address is available, continue processing
      if (!nftLotteryManagerAddress && !pwPointManagerAddress) {
        return false;
      }
    }
    
    console.log('Required contracts to be authorized:', {
      NFTLotteryManager: nftLotteryManagerAddress || 'undefined',
      PwPointManager: pwPointManagerAddress || 'undefined'
    });
    
    // Create an array to store all authorization checks and authorization operations
    const contracts = [];
    
    if (nftLotteryManagerAddress) {
      contracts.push({ name: 'NFTLotteryManager', address: nftLotteryManagerAddress });
    }
    
    if (pwPointManagerAddress) {
      contracts.push({ name: 'PwPointManager', address: pwPointManagerAddress });
    }
    
    if (contracts.length === 0) {
      console.error('No valid contract addresses available for authorization');
      return false;
    }
    
    // If no PwPoint contract instance is provided, try to get or create it
    if (!pwPointContract) {
      try {
        if (typeof initPwPointContract === 'function' && web3) {
          pwPointContract = initPwPointContract(web3, window.getContractAddress);
        } else {
          // Try to directly create a contract instance
          let pwPointAddress = null;
          
          // Safely get PwPoint address
          try {
            pwPointAddress = window.getContractAddress 
              ? window.getContractAddress('PwPoint')
              : null;
          } catch (err) {
            console.warn('Failed to get PwPoint address:', err.message);
          }
          
          // If getContractAddress fails to get the address, try to get it from contractAddresses
          if (!pwPointAddress && window.contractAddresses) {
            for (const net of [network, 'TEST', 'LOCAL']) {
              if (window.contractAddresses[net] && window.contractAddresses[net].PwPoint) {
                pwPointAddress = window.contractAddresses[net].PwPoint;
                break;
              }
            }
          }
          
          const pwPointABI = window.PwPointABI || window.GENERIC_ERC20_ABI;
          if (!pwPointABI || !pwPointAddress) {
            console.error('Failed to get PwPoint contract information', {
              pwPointABI: !!pwPointABI,
              pwPointAddress
            });
            return false;
          }
          pwPointContract = new web3.eth.Contract(pwPointABI, pwPointAddress);
        }
      } catch (error) {
        console.error('Failed to create PwPoint contract instance:', error);
        return false;
      }
    }
    
    if (!pwPointContract) {
      console.error('Failed to get PwPoint contract instance');
      return false;
    }
    
    // Batch authorize all contracts
    return await batchApproveTokensForContracts(web3, pwPointContract, contracts, userAddress);
  } catch (error) {
    console.error('Failed to set free NFT authorization:', error);
    return false;
  }
}

/**
 * Batch authorize tokens to multiple contracts
 * @param {Object} web3 - Web3 instance
 * @param {Object} tokenContract - Token contract instance 
 * @param {Array<Object>} contracts - Contract array, format: [{ name: 'name', address: 'address' }]
 * @param {string} userAddress - User wallet address
 * @param {string} amount - Authorization amount (if not provided, use a large amount)
 * @returns {Promise<boolean>} - Whether all approvals are successful
 */
async function batchApproveTokensForContracts(web3, tokenContract, contracts, userAddress, amount = null) {
  if (!web3 || !tokenContract || !contracts || !userAddress) {
    console.error('Failed to batch authorize tokens: Invalid parameters', {
      web3: !!web3,
      tokenContract: !!tokenContract,
      contracts: !!contracts,
      userAddress: !!userAddress
    });
    return false;
  }
  
  if (!contracts.length) {
    console.error('Failed to batch authorize tokens: Empty contract list');
    return false;
  }
  
  // Ensure tokenContract is a valid contract instance
  if (!tokenContract.methods || !tokenContract.methods.allowance) {
    console.error('Failed to batch authorize tokens: Invalid token contract instance', tokenContract);
    return false;
  }
  
  try {
    // Set a large authorization amount
    const largeAmount = amount || web3.utils.toWei('10000000', 'ether');
    
    console.log('Starting batch authorization, number of contracts:', contracts.length);
    
    // Record successful and failed authorizations
    const approvalResults = {
      success: [],
      failed: []
    };
    
    // Check and set authorization for each contract
    for (const contract of contracts) {
      console.log(`Checking ${contract.name} authorization...`);
      
      // Skip invalid contract addresses
      if (!contract.address || contract.address === '0x0000000000000000000000000000000000000000') {
        console.warn(`Skipping ${contract.name}, invalid address:`, contract.address);
        approvalResults.failed.push({
          name: contract.name,
          reason: 'Invalid contract address'
        });
        continue;
      }
      
      try {
        // Check existing authorization
        let allowance;
        try {
          allowance = await tokenContract.methods.allowance(userAddress, contract.address).call();
          console.log(`${contract.name} current authorization amount:`, allowance);
        } catch (allowanceError) {
          console.error(`Failed to get ${contract.name} authorization amount:`, allowanceError);
          approvalResults.failed.push({
            name: contract.name,
            reason: 'Failed to get authorization amount',
            error: allowanceError.message
          });
          continue;
        }
        
        // Check if authorization is sufficient
        let hasEnoughAllowance = false;
        try {
          hasEnoughAllowance = web3.utils.toBN(allowance).gte(web3.utils.toBN(largeAmount));
        } catch (bnError) {
          console.error(`Failed to check ${contract.name} authorization amount:`, bnError);
          // Use string comparison as a fallback
          hasEnoughAllowance = BigInt(allowance) >= BigInt(largeAmount);
        }
        
        if (hasEnoughAllowance) {
          console.log(`${contract.name} has enough authorization`);
          approvalResults.success.push({
            name: contract.name,
            status: 'Has enough authorization'
          });
          continue;
        }
        
        console.log(`Need to approve ${contract.name} token transfer`);
        
        // Send authorization transaction
        try {
          // Check if using private key wallet
          const shouldUsePrivateKey = window.SecureWalletManager && 
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
          
          let receipt;
          if (shouldUsePrivateKey) {
            console.log(`Using private key wallet for ${contract.name} token approval`);
            
            // Use SecureWalletManager for private key transactions
            receipt = await window.SecureWalletManager.sendContractTransaction(
              tokenContract,
              'approve',
              [contract.address, largeAmount]
            );
          } else {
            console.log(`Using connected wallet for ${contract.name} token approval`);
            
            // Use traditional connected wallet method
            receipt = await tokenContract.methods
            .approve(contract.address, largeAmount)
            .send({ from: userAddress });
          }
          
          console.log(`${contract.name} token approval successful:`, receipt.transactionHash);
          
          approvalResults.success.push({
            name: contract.name,
            status: 'Authorization successful',
            txHash: receipt.transactionHash
          });
        } catch (approvalError) {
          console.error(`Failed to authorize ${contract.name}:`, approvalError);
          
          approvalResults.failed.push({
            name: contract.name,
            reason: 'Failed to authorize transaction',
            error: approvalError.message
          });
          
          // If user denies transaction, break the entire batch authorization process
          if (approvalError.message && approvalError.message.includes('User denied transaction signature')) {
            console.warn('User denied transaction, breaking authorization process');
            return false;
          }
        }
      } catch (error) {
        console.error(`Error processing ${contract.name} authorization:`, error);
        approvalResults.failed.push({
          name: contract.name,
          reason: 'Error processing authorization',
          error: error.message
        });
      }
    }
    
    console.log('Batch authorization completed, results:', approvalResults);
    
    // If any authorization fails, return false
    if (approvalResults.failed.length > 0) {
      console.warn(`${approvalResults.failed.length} contracts authorization failed`);
      return false;
    }
    
    console.log('All necessary authorizations have been set');
    return true;
  } catch (error) {
    console.error('Failed to batch authorize tokens:', error);
    return false;
  }
}

/**
 * Set all necessary approvals for the NFT marketplace
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - User wallet address
 * @param {Object} pwNFTContract - PwNFT contract instance
 * @param {Object} erc20TokenContract - Payment token contract instance (optional)
 * @returns {Promise<boolean>} - Whether all approvals are successful
 */
async function setupNFTMarketplaceApprovals(web3, userAddress, pwNFTContract, erc20TokenContract = null) {
  if (!web3 || !userAddress || !pwNFTContract) {
    console.error('Failed to set NFT marketplace authorization: Missing parameters');
    return false;
  }
  
  try {
    console.log('Setting all necessary approvals for the NFT marketplace...');
    
    // Get the contract addresses that need authorization
    const network = window.currentNetwork || 'MAIN';
    let paymentManagerAddress, nftMarketplaceAddress;
    
    if (typeof window.getContractAddress === 'function') {
      paymentManagerAddress = window.getContractAddress('PaymentManager');
      nftMarketplaceAddress = window.getContractAddress('NFTMarketplace');
    } else if (window.contractAddresses && window.contractAddresses[network]) {
      paymentManagerAddress = window.contractAddresses[network].PaymentManager;
      nftMarketplaceAddress = window.contractAddresses[network].NFTMarketplace;
    } else {
      console.error('Failed to get required contract addresses');
      return false;
    }
    
    // Ensure all addresses are valid
    if (!paymentManagerAddress || !nftMarketplaceAddress) {
      console.error('One or more contract addresses are empty', {
        paymentManagerAddress,
        nftMarketplaceAddress
      });
      return false;
    }
    
    console.log('Contracts that need authorization:', {
      PaymentManager: paymentManagerAddress,
      NFTMarketplace: nftMarketplaceAddress
    });
    
    // 1. Authorize NFTMarketplace to operate user's NFT
    console.log('Authorizing NFTMarketplace to operate user\'s NFT...');
    try {
      // Check the authorization status of the NFTMarketplace contract
      const isApprovedForAll = await pwNFTContract.methods.isApprovedForAll(userAddress, nftMarketplaceAddress).call();
      
      if (!isApprovedForAll) {
        console.log('Need to set NFT authorization for NFTMarketplace');
        
        // Check if using private key wallet
        const shouldUsePrivateKey = window.SecureWalletManager && 
                                   window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                   window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
        
        let receipt;
        if (shouldUsePrivateKey) {
          console.log('Using private key wallet for NFT authorization');
          
          // Use SecureWalletManager for private key transactions
          receipt = await window.SecureWalletManager.sendContractTransaction(
            pwNFTContract,
            'setApprovalForAll',
            [nftMarketplaceAddress, true]
          );
        } else {
          console.log('Using connected wallet for NFT authorization');
          
          // Use traditional connected wallet method
          receipt = await pwNFTContract.methods
          .setApprovalForAll(nftMarketplaceAddress, true)
          .send({ from: userAddress });
        }
        
        console.log('NFT authorization for NFTMarketplace successful:', receipt.transactionHash);
      } else {
        console.log('NFTMarketplace already has NFT operation authorization');
      }
    } catch (error) {
      console.error('Failed to authorize NFTMarketplace to operate NFT:', error);
      return false;
    }
    
    // 2. If an ERC20 token contract is provided, authorize the PaymentManager contract to operate the user's tokens
    if (erc20TokenContract) {
      console.log('Authorizing PaymentManager to operate user\'s ERC20 tokens...');
      
      try {
        // Check the authorization status of the PaymentManager contract
        const allowance = await erc20TokenContract.methods.allowance(userAddress, paymentManagerAddress).call();
        const largeAmount = web3.utils.toWei('10000000', 'ether'); // 设置一个较大的授权额度
        
        if (web3.utils.toBN(allowance).lt(web3.utils.toBN(largeAmount))) {
          console.log('Need to set ERC20 token authorization for PaymentManager');
          
          // Check if using private key wallet
          const shouldUsePrivateKey = window.SecureWalletManager && 
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
          
          let receipt;
          if (shouldUsePrivateKey) {
            console.log('Using private key wallet for ERC20 authorization');
            
            // Use SecureWalletManager for private key transactions
            receipt = await window.SecureWalletManager.sendContractTransaction(
              erc20TokenContract,
              'approve',
              [paymentManagerAddress, largeAmount]
            );
          } else {
            console.log('Using connected wallet for ERC20 authorization');
            
            // Use traditional connected wallet method
            receipt = await erc20TokenContract.methods
            .approve(paymentManagerAddress, largeAmount)
            .send({ from: userAddress });
          }
          
          console.log('ERC20 token authorization for PaymentManager successful:', receipt.transactionHash);
        } else {
          console.log('PaymentManager already has ERC20 token operation authorization');
        }
      } catch (error) {
        console.error('Failed to authorize PaymentManager to operate ERC20 tokens:', error);
        return false;
      }
      
      // 3. Authorize NFTMarketplace to operate user's ERC20 tokens (for purchasing NFTs)
      console.log('Authorizing NFTMarketplace to operate user\'s ERC20 tokens...');
      
      try {
        // Check the authorization status of the NFTMarketplace contract
        const allowance = await erc20TokenContract.methods.allowance(userAddress, nftMarketplaceAddress).call();
        const largeAmount = web3.utils.toWei('10000000', 'ether'); // 设置一个较大的授权额度
        
        if (web3.utils.toBN(allowance).lt(web3.utils.toBN(largeAmount))) {
          console.log('Need to set ERC20 token authorization for NFTMarketplace');
          
          // Check if using private key wallet
          const shouldUsePrivateKey = window.SecureWalletManager && 
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                     window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
          
          let receipt;
          if (shouldUsePrivateKey) {
            console.log('Using private key wallet for ERC20 authorization');
            
            // Use SecureWalletManager for private key transactions
            receipt = await window.SecureWalletManager.sendContractTransaction(
              erc20TokenContract,
              'approve',
              [nftMarketplaceAddress, largeAmount]
            );
          } else {
            console.log('Using connected wallet for ERC20 authorization');
            
            // Use traditional connected wallet method
            receipt = await erc20TokenContract.methods
            .approve(nftMarketplaceAddress, largeAmount)
            .send({ from: userAddress });
          }
          
          console.log('ERC20 token authorization for NFTMarketplace successful:', receipt.transactionHash);
        } else {
          console.log('NFTMarketplace already has ERC20 token operation authorization');
        }
      } catch (error) {
        console.error('Failed to authorize NFTMarketplace to operate ERC20 tokens:', error);
        return false;
      }
    }
    
    console.log('All NFT marketplace related authorizations have been set');
    return true;
  } catch (error) {
    console.error('Failed to set NFT marketplace authorization:', error);
    return false;
  }
}

/**
 * Handle token authorization for PwPointBurner
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - User wallet address
 * @param {Object} pwPointContract - PwPoint token contract instance
 * @param {Object} petWorldContract - PetWorld token contract instance (optional)
 * @param {Object} pwPointBurnerContract - PwPointBurner contract instance (optional)
 * @param {Object} petWorldManagerContract - PetWorldManager contract instance (optional)
 * @param {string} amount - Authorization amount, not provided will be the maximum value
 * @returns {Promise<boolean>} - Whether authorization is successful
 */
async function setupBurnerApprovals(web3, userAddress, pwPointContract, petWorldContract = null, pwPointBurnerContract = null, petWorldManagerContract = null, amount = null) {
    if (!web3 || !userAddress || !pwPointContract) {
        console.error('Failed to set PwPointBurner authorization: Missing required parameters');
        return false;
    }

    try {
        console.log('Starting to set PwPointBurner authorization...');
        
        // Get contract addresses
        const network = window.currentNetwork || 'MAIN';
        const contractAddresses = window.contractAddresses && window.contractAddresses[network];
        
        if (!contractAddresses) {
            console.error('Failed to get contract addresses');
            return false;
        }
        
        // Get PwPointBurner contract address
        let pwPointBurnerAddress;
        if (pwPointBurnerContract && pwPointBurnerContract.options) {
            pwPointBurnerAddress = pwPointBurnerContract.options.address;
        } else {
            pwPointBurnerAddress = contractAddresses.PwPointBurner;
            if (!pwPointBurnerAddress) {
                console.error('Failed to get PwPointBurner contract address');
                return false;
            }
        }
        
        // Get PetWorldManager contract address (if needed)
        let petWorldManagerAddress;
        if (petWorldContract && petWorldManagerContract && petWorldManagerContract.options) {
            petWorldManagerAddress = petWorldManagerContract.options.address;
        } else if (petWorldContract) {
            petWorldManagerAddress = contractAddresses.PetWorldManager;
            if (!petWorldManagerAddress) {
                console.error('Failed to get PetWorldManager contract address');
                // Do not return false, because PetWorld authorization is optional
            }
        }
        
        // Determine the authorization amount
        const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256 - 1
        const approvalAmount = amount ? web3.utils.toWei(amount.toString(), 'ether') : maxUint256;
        
        // Check the authorization status of PwPoint for PwPointBurner
        const pwPointApproval = await checkIfApprovalNeeded(
            pwPointContract,
            userAddress,
            pwPointBurnerAddress,
            approvalAmount
        );
        
        // If needed, authorize PwPoint
        if (pwPointApproval.needsApproval) {
            console.log('Authorizing PwPoint tokens to PwPointBurner contract...');
            const pwPointApproveTx = await approveERC20Token(
                pwPointContract,
                pwPointBurnerAddress,
                amount ? approvalAmount : null, // If no quantity is specified, use the maximum value
                userAddress,
                !amount // If no quantity is specified, use the maximum value
            );
            
            if (!pwPointApproveTx) {
                console.error('PwPoint authorization failed');
                return false;
            }
            
            console.log('PwPoint authorization for PwPointBurner successful:', pwPointApproveTx.transactionHash || 'Authorized');
        } else {
            console.log('PwPoint already has enough authorization for PwPointBurner');
        }
          
        // If needed, authorize PetWorld (optional)
        if (petWorldContract && petWorldManagerAddress) {
            // Check the authorization status of PetWorld for PetWorldManager
            const petWorldApproval = await checkIfApprovalNeeded(
                petWorldContract,
                userAddress,
                petWorldManagerAddress,
                approvalAmount
            );
            
            // If needed, authorize PetWorld
            if (petWorldApproval.needsApproval) {
                console.log('Authorizing PetWorld tokens to PetWorldManager contract...');
                const petWorldApproveTx = await approveERC20Token(
                    petWorldContract,
                    petWorldManagerAddress,
                    amount ? approvalAmount : null, // If no quantity is specified, use the maximum value
                    userAddress,
                    !amount // If no quantity is specified, use the maximum value
                );
                
                if (!petWorldApproveTx) {
                    console.error('PetWorld authorization failed');
                    // Do not return false, because PwPoint authorization has already been completed
                } else {
                    console.log('PetWorld authorization for PetWorldManager successful:', petWorldApproveTx.transactionHash || 'Authorized');
                }
            } else {
                console.log('PetWorld already has enough authorization for PetWorldManager');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Failed to set burner authorization:', error);
        return false;
    }
}

/**
 * Set PetWorld staking required authorization
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - User wallet address
 * @param {Object} petWorldContract - PetWorld token contract instance
 * @param {string} amount - Authorization amount, not provided will be the maximum value
 * @returns {Promise<boolean>} - Whether authorization is successful
 */
async function setupPetWorldStakingApprovals(web3, userAddress, petWorldContract, amount = null) {
  if (!web3 || !userAddress || !petWorldContract) {
    console.error('Failed to set PetWorld staking authorization: Missing required parameters');
    return false;
  }
  
  try {
    console.log('Setting PetWorld staking required authorization...');
    
    // Get the contract address that needs authorization
    const network = window.currentNetwork || 'MAIN';
    let petWorldStakingAddress;
    
    if (typeof window.getContractAddress === 'function') {
      petWorldStakingAddress = window.getContractAddress('PetWorldStaking');
    } else if (window.contractAddresses && window.contractAddresses[network]) {
      petWorldStakingAddress = window.contractAddresses[network].PetWorldStaking;
    } else {
      console.error('Failed to get PetWorldStaking contract address');
      return false;
    }
    
    // 确保地址有效
    if (!petWorldStakingAddress) {
      console.error('PetWorldStaking contract address is empty');
      return false;
    }
    
    console.log('Contracts that need authorization:', {
      PetWorldStaking: petWorldStakingAddress
    });
    
    // Set a larger authorization amount, if no specific quantity is provided
    const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
    const approvalAmount = amount ? web3.utils.toWei(amount.toString(), 'ether') : maxUint256;
    
    // 检查当前授权额度
    const allowance = await petWorldContract.methods.allowance(userAddress, petWorldStakingAddress).call();
    console.log('PetWorldStaking current authorization amount:', allowance);
    
    if (web3.utils.toBN(allowance).gte(web3.utils.toBN(approvalAmount))) {
      console.log('PetWorldStaking already has enough authorization');
      return true;
    }
    
    console.log('Need to approve PetWorld tokens for PetWorldStaking');
    
    // Check if using private key wallet
    const shouldUsePrivateKey = window.SecureWalletManager && 
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                               window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
    
    let receipt;
    if (shouldUsePrivateKey) {
      console.log('Using private key wallet for PetWorld authorization');
      
      // Use SecureWalletManager for private key transactions
      receipt = await window.SecureWalletManager.sendContractTransaction(
        petWorldContract,
        'approve',
        [petWorldStakingAddress, approvalAmount]
      );
    } else {
      console.log('Using connected wallet for PetWorld authorization');
    
    // Send the authorization transaction
      receipt = await petWorldContract.methods
      .approve(petWorldStakingAddress, approvalAmount)
      .send({ from: userAddress });
    }
    
    console.log('PetWorld token authorization for PetWorldStaking successful:', receipt.transactionHash);
    return true;
  } catch (error) {
    console.error('Failed to set PetWorld staking authorization:', error);
    return false;
  }
}

/**
 * Set PwReverseBurner related approvals, including authorization for PwReverse tokens
 * @param {Object} web3 - Web3 instance
 * @param {string} userAddress - User wallet address
 * @param {Object} pwReverseContract - PwReverse token contract instance
 * @param {Object} pwReverseBurnerContract - PwReverseBurner contract instance (optional)
 * @param {Object} pwPointManagerContract - PwPointManager contract instance (optional)
 * @param {string} amount - Authorization amount, not provided will be the maximum value
 * @returns {Promise<boolean>} - Whether authorization is successful
 */
async function setupReverseBurnerApprovals(web3, userAddress, pwReverseContract, pwReverseBurnerContract = null, pwPointManagerContract = null, amount = null) {
    if (!web3 || !userAddress || !pwReverseContract) {
        console.error('Failed to set PwReverseBurner authorization: Missing required parameters');
        return false;
    }

    try {
        console.log('Starting to set PwReverseBurner authorization...');
        
        // Get the contract address that needs authorization
        const network = window.currentNetwork || 'MAIN';
        const contractAddresses = window.contractAddresses && window.contractAddresses[network];
        
        if (!contractAddresses) {
            console.error('Failed to get contract addresses');
            return false;
        }
        
        // Get PwReverseBurner contract address
        let pwReverseBurnerAddress;
        if (pwReverseBurnerContract && pwReverseBurnerContract.options) {
            pwReverseBurnerAddress = pwReverseBurnerContract.options.address;
        } else {
            pwReverseBurnerAddress = contractAddresses.PwReverseBurner;
            if (!pwReverseBurnerAddress) {
                console.error('Failed to get PwReverseBurner contract address');
                return false;
            }
        }
        
        // Get PwPointManager contract address
        let pwPointManagerAddress;
        if (pwPointManagerContract && pwPointManagerContract.options) {
            pwPointManagerAddress = pwPointManagerContract.options.address;
        } else {
            pwPointManagerAddress = contractAddresses.PwPointManager;
            if (!pwPointManagerAddress) {
                console.error('Failed to get PwPointManager contract address');
                return false;
            }
        }
        
        // Determine the authorization amount
        const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256 - 1
        const approvalAmount = amount ? web3.utils.toWei(amount.toString(), 'ether') : maxUint256;
        
        // Check the authorization status of PwReverse for PwPointManager
        const pwReverseForManagerApproval = await checkIfApprovalNeeded(
            pwReverseContract,
            userAddress,
            pwPointManagerAddress,
            approvalAmount
        );
        
        // If needed, authorize PwReverse for PwPointManager
        if (pwReverseForManagerApproval.needsApproval) {
            console.log('Authorizing PwReverse tokens to PwPointManager contract...');
            const pwReverseApproveTx = await approveERC20Token(
                pwReverseContract,
                pwPointManagerAddress,
                amount ? approvalAmount : null, // If no quantity is specified, use the maximum value
                userAddress,
                !amount // If no quantity is specified, use the maximum value
            );
            
            if (!pwReverseApproveTx.success) {
                console.error('PwReverse authorization for PwPointManager failed');
                return false;
            }
            
            console.log('PwReverse authorization for PwPointManager successful:', pwReverseApproveTx.transaction?.transactionHash || 'Authorized');
        } else {
            console.log('PwReverse already has enough authorization for PwPointManager');
        }
        
        // Check the authorization status of PwReverse for PwReverseBurner
        const pwReverseForBurnerApproval = await checkIfApprovalNeeded(
            pwReverseContract,
            userAddress,
            pwReverseBurnerAddress,
            approvalAmount
        );
        
        // If needed, authorize PwReverse for PwReverseBurner
        if (pwReverseForBurnerApproval.needsApproval) {
            console.log('Authorizing PwReverse tokens to PwReverseBurner contract...');
            const pwReverseApproveTx = await approveERC20Token(
                pwReverseContract,
                pwReverseBurnerAddress,
                amount ? approvalAmount : null, // If no quantity is specified, use the maximum value
                userAddress,
                !amount // If no quantity is specified, use the maximum value
            );
            
            if (!pwReverseApproveTx.success) {
                console.error('PwReverse authorization for PwReverseBurner failed');
                return false;
            }
            
            console.log('PwReverse authorization for PwReverseBurner successful:', pwReverseApproveTx.transaction?.transactionHash || 'Authorized');
        } else {
            console.log('PwReverse already has enough authorization for PwReverseBurner');
        }
        
        return true;
    } catch (error) {
        console.error('Failed to set reverse burner authorization:', error);
        return false;
    }
}

/**
 * Check and authorize NFT for marketplace
 * @param {Object} pwNFTContract - PwNFT contract instance
 * @param {string} marketplaceAddress - Marketplace contract address
 * @param {string} userAddress - User wallet address
 * @returns {Promise<boolean>} Whether authorization is successful
 */
async function approveNFTForMarketplace(pwNFTContract, marketplaceAddress, userAddress) {
    if (!pwNFTContract || !marketplaceAddress || !userAddress) {
        console.error('Failed to authorize NFT: Missing required parameters');
        return false;
    }
    
    try {
        console.log('Checking NFT authorization status...');
        
        // Check if already authorized
        const isApproved = await pwNFTContract.methods.isApprovedForAll(userAddress, marketplaceAddress).call();
        
        if (isApproved) {
            console.log('NFT is already authorized for marketplace');
            return true;
        }
        
        console.log('Need to authorize NFT for marketplace');
        
        // Check if using private key wallet
        const shouldUsePrivateKey = window.SecureWalletManager && 
                                   window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                   window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
        
        if (shouldUsePrivateKey) {
            console.log('Using private key wallet for NFT approval');
            
            // Use SecureWalletManager for private key transactions
            const receipt = await window.SecureWalletManager.sendContractTransaction(
                pwNFTContract,
                'setApprovalForAll',
                [marketplaceAddress, true]
            );
            
            console.log('Private key NFT authorization successful:', receipt.transactionHash);
            return true;
        } else {
            console.log('Using connected wallet for NFT approval');
        
        // Estimate Gas
        const gasEstimate = await pwNFTContract.methods.setApprovalForAll(marketplaceAddress, true).estimateGas({
            from: userAddress
        });
        
        // Increase Gas limit to ensure transaction success
        const gas = Math.max(300000, Math.floor(gasEstimate * 1.5));
        
        // Send authorization transaction
        const receipt = await pwNFTContract.methods.setApprovalForAll(marketplaceAddress, true).send({
            from: userAddress,
            gas: gas
        });
        
            console.log('Connected wallet NFT authorization successful:', receipt.transactionHash);
        return true;
        }
    } catch (error) {
        console.error('Failed to authorize NFT:', error);
        return false;
    }
}

/**
 * Diagnose and fix NFT listing authorization issues
 * @param {Object} pwNFTContract - PwNFT contract instance
 * @param {Object} marketplaceContract - NFT marketplace contract instance
 * @param {string} userAddress - User wallet address
 * @param {number} tokenId - NFT token ID
 * @returns {Promise<Object>} - Diagnosis and repair results
 */
async function diagnoseAndFixNFTApproval(pwNFTContract, marketplaceContract, userAddress, tokenId) {
    if (!pwNFTContract || !marketplaceContract || !userAddress) {
        return {
            success: false,
            message: 'Missing required parameters, cannot diagnose NFT authorization issues',
            details: {
                hasNFTContract: !!pwNFTContract,
                hasMarketplaceContract: !!marketplaceContract,
                hasUserAddress: !!userAddress
            }
        };
    }

    try {
        console.log('Starting to diagnose NFT authorization issues...');
        const result = {
            success: false,
            message: '',
            diagnostics: {
                ownershipVerified: false,
                hasApprovalForAll: false,
                hasTokenApproval: false,
                fixAttempted: false,
                fixSucceeded: false
            }
        };

        // Ensure the marketplace contract address is correct
        const marketplaceAddress = marketplaceContract._address || marketplaceContract.options.address;
        if (!marketplaceAddress) {
            result.message = 'Failed to get NFT marketplace contract address';
            return result;
        }
        console.log('NFT marketplace contract address:', marketplaceAddress);

        // Step 1: Check if the user actually owns this NFT
        try {
            const owner = await pwNFTContract.methods.ownerOf(tokenId).call();
            result.diagnostics.ownershipVerified = (owner.toLowerCase() === userAddress.toLowerCase());
            console.log(`NFT #${tokenId} owner verification:`, result.diagnostics.ownershipVerified ? 'Success' : 'Failed', 'Owner:', owner);
            
            if (!result.diagnostics.ownershipVerified) {
                result.message = `You are not the owner of this NFT (Actual owner: ${owner})`;
                return result;
            }
        } catch (ownerError) {
            console.error('Error checking NFT ownership:', ownerError);
            result.message = 'Failed to verify NFT ownership, possibly the NFT does not exist';
            return result;
        }

        // Step 2: Check global authorization (setApprovalForAll)
        try {
            const isApprovedForAll = await pwNFTContract.methods.isApprovedForAll(userAddress, marketplaceAddress).call();
            result.diagnostics.hasApprovalForAll = isApprovedForAll;
            console.log('Global NFT authorization status:', isApprovedForAll ? 'Authorized' : 'Not authorized');
        } catch (approvalCheckError) {
            console.error('Error checking global NFT authorization status:', approvalCheckError);
            result.message = 'Failed to check NFT global authorization status';
            return result;
        }

        // Step 3: Check single NFT authorization (approve)
        if (!result.diagnostics.hasApprovalForAll) {
            try {
                const approvedAddress = await pwNFTContract.methods.getApproved(tokenId).call();
                result.diagnostics.hasTokenApproval = (approvedAddress.toLowerCase() === marketplaceAddress.toLowerCase());
                console.log('Single NFT authorization status:', result.diagnostics.hasTokenApproval ? 'Authorized' : 'Not authorized', 'Approved address:', approvedAddress);
            } catch (tokenApprovalError) {
                console.warn('Error checking single NFT authorization:', tokenApprovalError);
                // Continue processing, as it may just be a query error
            }
        }

        // If there is any authorization, no need to repair
        if (result.diagnostics.hasApprovalForAll || result.diagnostics.hasTokenApproval) {
            result.success = true;
            result.message = 'Effective NFT authorization detected';
            return result;
        }

        // Step 4: Try to repair authorization issues (use setApprovalForAll first)
        console.log('Attempting to repair NFT authorization issues...');
        result.diagnostics.fixAttempted = true;

        try {
            // Check if using private key wallet
            const shouldUsePrivateKey = window.SecureWalletManager && 
                                       window.SecureWalletManager.shouldUsePrivateKeyForTransactions &&
                                       window.SecureWalletManager.shouldUsePrivateKeyForTransactions();
            
            if (shouldUsePrivateKey) {
                console.log('Using private key wallet for NFT approval repair');
                
                // Use SecureWalletManager for private key transactions
                const approveReceipt = await window.SecureWalletManager.sendContractTransaction(
                    pwNFTContract,
                    'setApprovalForAll',
                    [marketplaceAddress, true]
                );
                
                console.log('Private key NFT authorization transaction submitted:', approveReceipt.transactionHash);
            } else {
                console.log('Using connected wallet for NFT approval repair');
                
            // Estimate Gas
            const gasEstimate = await pwNFTContract.methods.setApprovalForAll(marketplaceAddress, true).estimateGas({
                from: userAddress
            });
            
            // Use a higher Gas limit to ensure transaction success
            const gas = Math.max(350000, Math.floor(gasEstimate * 1.5));
            
            // Send authorization transaction
            const approveReceipt = await pwNFTContract.methods.setApprovalForAll(marketplaceAddress, true).send({
                from: userAddress,
                gas: gas
            });
            
                console.log('Connected wallet NFT authorization transaction submitted:', approveReceipt.transactionHash);
            }
            
            // Wait for a moment to ensure authorization takes effect
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify authorization success
            const verifyApproval = await pwNFTContract.methods.isApprovedForAll(userAddress, marketplaceAddress).call();
            
            result.diagnostics.fixSucceeded = verifyApproval;
            
            if (verifyApproval) {
                result.success = true;
                result.message = 'NFT authorization issues successfully repaired';
            } else {
                result.message = 'NFT authorization transaction completed, but verification failed';
            }
        } catch (fixError) {
            console.error('Error repairing NFT authorization issues:', fixError);
            result.message = 'Failed to repair NFT authorization issues: ' + (fixError.message || 'Unknown error');
        }

        return result;
    } catch (error) {
        console.error('Error diagnosing NFT authorization issues:', error);
        return {
            success: false,
            message: 'Error during diagnosis: ' + (error.message || 'Unknown error')
        };
    }
}

// Export all functions to the global object
window.ContractApprovalManager = {
  approvePWFOOD,
  checkTokenAllowance,
  getTokenBalance,
  checkIfApprovalNeeded,
  approveERC20Token,
  revokeERC20Approval,
  batchApproveContracts,
  setupEggApprovals,
  ensureFreeNFTApprovals,
  batchApproveTokensForContracts,
  setupNFTMarketplaceApprovals,
  setupBurnerApprovals,
  setupPetWorldStakingApprovals,
  setupReverseBurnerApprovals,
  approveNFTForMarketplace,
  diagnoseAndFixNFTApproval
};

// If running in Node environment, export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ContractApprovalManager;
} 