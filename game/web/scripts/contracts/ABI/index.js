const PwPointABI = require('./PwPointABI.js');
const PwFoodABI = require('./PwFoodABI.js');
const PwBountyABI = require('./PwBountyABI.js');
const PwReverseABI = require('./PwReverseABI.js');
const PwNFTABI = require('./PwNFTABI.js');
const PwUSDABI = require('./PwUSDABI.js');
const NFTManagerABI = require('./NFTManagerABI.js');
const NFTFeedingManagerABI = require('./NFTFeedingManagerABI.js');
const NFTLotteryManagerABI = require('./NFTLotteryManagerABI.js');
const PwPointManagerABI = require('./PwPointManagerABI.js');
const PaymentManagerABI = require('./PaymentManagerABI.js');
const PwFoodManagerABI = require('./PwFoodManagerABI.js');
const PwUSDStakingABI = require('./PwUSDStakingABI.js');
const NFTMarketplaceABI = require('./NFTMarketplaceABI.js');
const RareNFTTransactionIndexerABI = require('./RareNFTTransactionIndexerABI.js');

// In the browser environment, all ABIs are exposed to the global object in their respective files

module.exports = {
  PwPointABI,
  PwFoodABI,
  PwBountyABI,
  PwReverseABI,
  PwNFTABI,
  PwUSDABI,
  NFTManagerABI,
  NFTFeedingManagerABI,
  NFTLotteryManagerABI,
  PwPointManagerABI,
  PaymentManagerABI,
  PwFoodManagerABI,
  PwUSDStakingABI,
  NFTMarketplaceABI,
  RareNFTTransactionIndexerABI
};