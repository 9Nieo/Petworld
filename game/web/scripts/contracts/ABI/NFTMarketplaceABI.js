// NFTMarketplace token contract ABI
window.NFTMarketplaceABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ContractRenounced",
    "inputs": [
      {
        "type": "address",
        "name": "previousOwner",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "IndexingFailed",
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "bytes",
        "name": "reason",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ListingCancelled",
    "inputs": [
      {
        "type": "address",
        "name": "seller",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "uint8",
        "name": "quality",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ListingCreated",
    "inputs": [
      {
        "type": "address",
        "name": "seller",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "paymentToken",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "price",
        "indexed": false
      },
      {
        "type": "uint8",
        "name": "quality",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "level",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "accumulatedFood",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ListingSold",
    "inputs": [
      {
        "type": "address",
        "name": "seller",
        "indexed": true
      },
      {
        "type": "address",
        "name": "buyer",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "paymentToken",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "price",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "fee",
        "indexed": false
      },
      {
        "type": "uint8",
        "name": "quality",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "MarketplaceInitialized",
    "inputs": [
      {
        "type": "address",
        "name": "pwnftAddress",
        "indexed": false
      },
      {
        "type": "address",
        "name": "nftManager",
        "indexed": false
      },
      {
        "type": "address",
        "name": "feeReceiver",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "MarketplacePaused",
    "inputs": [
      {
        "type": "address",
        "name": "account",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "MarketplaceUnpaused",
    "inputs": [
      {
        "type": "address",
        "name": "account",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTReturnedToSeller",
    "inputs": [
      {
        "type": "address",
        "name": "seller",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTTransferredToMarketplace",
    "inputs": [
      {
        "type": "address",
        "name": "seller",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "type": "address",
        "name": "previousOwner",
        "indexed": true
      },
      {
        "type": "address",
        "name": "newOwner",
        "indexed": true
      }
    ]
  },
  {
    "type": "function",
    "name": "ACTION_COOLDOWN",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "FEE_DENOMINATOR",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "FEE_PERCENTAGE",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "MAX_PRICE",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "_qualityListingExists",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": ""
      },
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "_userListingExists",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": ""
      },
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "acceptedTokens",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "acceptedTokensList",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "addAcceptedToken",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "buyNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "calculateFee",
    "constant": true,
    "stateMutability": "pure",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "price"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "cancelListing",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "createListing",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "address",
        "name": "paymentToken"
      },
      {
        "type": "uint256",
        "name": "price"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "feeReceiver",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "indexerEnabled",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "bool",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "initialize",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwnftAddress"
      },
      {
        "type": "address",
        "name": "_nftManager"
      },
      {
        "type": "address",
        "name": "_feeReceiver"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "initialized",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "bool",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "listings",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": "seller"
      },
      {
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "address",
        "name": "paymentToken"
      },
      {
        "type": "uint256",
        "name": "price"
      },
      {
        "type": "bool",
        "name": "active"
      },
      {
        "type": "uint256",
        "name": "lastListTime"
      },
      {
        "type": "uint256",
        "name": "lastDelistTime"
      },
      {
        "type": "uint256",
        "name": "lastPriceUpdateTime"
      },
      {
        "type": "uint8",
        "name": "quality"
      },
      {
        "type": "uint256",
        "name": "level"
      },
      {
        "type": "uint256",
        "name": "accumulatedFood"
      }
    ]
  },
  {
    "type": "function",
    "name": "nftFeedingManager",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "nftManager",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "onERC721Received",
    "constant": true,
    "stateMutability": "pure",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": ""
      },
      {
        "type": "address",
        "name": ""
      },
      {
        "type": "uint256",
        "name": ""
      },
      {
        "type": "bytes",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "bytes4",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "owner",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "pwnftAddress",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "qualityListings",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": ""
      },
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "removeAcceptedToken",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "renounceContractOwnership",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setFeeReceiver",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_feeReceiver"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setIndexerEnabled",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "bool",
        "name": "_enabled"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setNFTFeedingManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_feedingManager"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setNFTManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_nftManager"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwnftAddress"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setTransactionIndexer",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_indexer"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "testSetInitialized",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transactionIndexer",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "address",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "transferContractOwnership",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "newOwner"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "newOwner"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "updateListingPrice",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "uint256",
        "name": "newPrice"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "userListings",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": ""
      },
      {
        "type": "uint256",
        "name": ""
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": ""
      }
    ]
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NFTMarketplaceABI;
}