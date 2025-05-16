/**
 * Contract address update tool
 * Used to automatically update the contractAddresses.js file after deploying contracts
 */
const fs = require('fs');
const path = require('path');

/**
 * Update contract address configuration file
 * @param {string} network - Network environment (test, main, local)
 * @param {Object} deployedContracts - Object of deployed contract addresses {contractName: address}
 */
function updateContractAddresses(network, deployedContracts) {
  // Get the path of the contractAddresses.js file
  const configFilePath = path.resolve(__dirname, 'contractAddresses.js');
  
  // Read the file content
  let configContent = fs.readFileSync(configFilePath, 'utf8');
  
  // Convert the network name to uppercase to match the contractAddresses.js
  const networkKey = network.toUpperCase();
  
  // Extract the contract address configuration section for different networks
  const startPattern = `window.contractAddresses = window.contractAddresses || {`;
  const endPattern = `};`;
  
  const startIndex = configContent.indexOf(startPattern);
  const endIndex = configContent.indexOf(endPattern, startIndex) + endPattern.length;
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Unable to find the contract address configuration section in contractAddresses.js');
  }
  
  // Get the configuration object string
  const configSection = configContent.substring(startIndex, endIndex);
  
  // Extract the window.CONTRACT_NETWORKS object
  let networkEnvs = {};
  const networksMatch = configContent.match(/window\.CONTRACT_NETWORKS\s*=\s*window\.CONTRACT_NETWORKS\s*\|\|\s*\{[^}]*\}/);
  if (networksMatch) {
    try {
      // Create a temporary object to parse CONTRACT_NETWORKS
      eval(`const window = {}; ${networksMatch[0]}; networkEnvs = window.CONTRACT_NETWORKS;`);
    } catch (error) {
      console.error('Failed to parse CONTRACT_NETWORKS:', error);
      // Use default values
      networkEnvs = { TEST: 'TEST', MAIN: 'MAIN', LOCAL: 'LOCAL' };
    }
  } else {
    // Not found, use default values
    networkEnvs = { TEST: 'TEST', MAIN: 'MAIN', LOCAL: 'LOCAL' };
  }
  
  // Check if networkKey is in the values of networkEnvs
  let targetNetworkKey = networkKey;
  for (const [key, value] of Object.entries(networkEnvs)) {
    if (value === networkKey) {
      targetNetworkKey = key;
      break;
    }
  }
  
  // Build the regular expression for replacement
  const regex = new RegExp(`\\[window\\.CONTRACT_NETWORKS\\.${targetNetworkKey}\\]\\s*:\\s*\\{[^{]*?\\},`, 's');
  
  // If the target network's configuration block cannot be found, throw an error
  if (!regex.test(configContent)) {
    throw new Error(`The configuration block for the ${targetNetworkKey} network was not found in contractAddresses.js`);
  }
  
  // Generate the updated network configuration block
  let updatedNetworkConfig = `  [window.CONTRACT_NETWORKS.${targetNetworkKey}]: {\n`;
  
  // Use regular expression to extract the current network's configuration block
  const networkBlockMatch = configContent.match(regex);
  if (networkBlockMatch) {
    const networkBlock = networkBlockMatch[0];
    
    // Extract all contract configuration lines
    const contractLines = networkBlock.match(/([a-zA-Z0-9_]+):\s*'[^']*',\s*\/\/\s*.*/g) || [];
    
    // Create a mapping of contract names to comments
    const commentMap = {};
    contractLines.forEach(line => {
      const [full, contractName, comment] = line.match(/([a-zA-Z0-9_]+):\s*'[^']*',(.*)/);
      commentMap[contractName] = comment;
    });
    
    // Iterate through all contracts in the current configuration
    for (const line of contractLines) {
      const contractName = line.match(/([a-zA-Z0-9_]+):/)[1];
      // If this contract is in the deployed contracts, use the new address
      if (deployedContracts[contractName] !== undefined) {
        updatedNetworkConfig += `    ${contractName}: '${deployedContracts[contractName]}',${commentMap[contractName]}\n`;
        console.log(`Updated ${networkKey} network's ${contractName} contract address to: ${deployedContracts[contractName]}`);
      } else {
        // Otherwise, keep the original configuration
        updatedNetworkConfig += `${line}\n`;
      }
    }
    
    // Check if there are deployed contracts not in the current configuration
    for (const [contractName, address] of Object.entries(deployedContracts)) {
      if (!commentMap[contractName]) {
        updatedNetworkConfig += `    ${contractName}: '${address}',  // ${networkKey.toLowerCase()} network's ${contractName} contract address\n`;
        console.log(`Added new contract ${contractName} address for ${networkKey} network: ${address}`);
      }
    }
  } else {
    // If no existing configuration matched, create a new configuration block
    for (const [contractName, address] of Object.entries(deployedContracts)) {
      updatedNetworkConfig += `    ${contractName}: '${address}',  // ${networkKey.toLowerCase()} network's ${contractName} contract address\n`;
      console.log(`Added ${networkKey} network's ${contractName} contract address: ${address}`);
    }
  }
  
  updatedNetworkConfig += `  },`;
  
  // Replace the configuration block
  const updatedContent = configContent.replace(regex, updatedNetworkConfig);
  
  // Write the updated content
  fs.writeFileSync(configFilePath, updatedContent, 'utf8');
  console.log(`Successfully updated contract address configuration for ${networkKey} network`);
}

module.exports = updateContractAddresses; 