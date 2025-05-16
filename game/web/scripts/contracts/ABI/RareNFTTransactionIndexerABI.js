// RareNFTTransactionIndexer token contract ABI
window.RareNFTTransactionIndexerABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_marketplace"
      }
    ]
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
    "type": "event",
    "anonymous": false,
    "name": "LowPriceTransactionRemoved",
    "inputs": [
      {
        "type": "uint256",
        "name": "lowestIndex",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "price",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "MarketplaceUpdated",
    "inputs": [
      {
        "type": "address",
        "name": "oldMarketplace",
        "indexed": true
      },
      {
        "type": "address",
        "name": "newMarketplace",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "OldTransactionRemoved",
    "inputs": [
      {
        "type": "uint256",
        "name": "oldestIndex",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "timestamp",
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
    "type": "event",
    "anonymous": false,
    "name": "TransactionIndexed",
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "transactionIndex",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "price",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "timestamp",
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
    "type": "function",
    "name": "MAX_RECORDS",
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
    "name": "PAGE_SIZE",
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
    "name": "getPriceIndicesCount",
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
    "name": "getQualityTransactionCount",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "quality"
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
    "name": "getQualityTransactionsByPrice",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "quality"
      },
      {
        "type": "uint256",
        "name": "page"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "address[]",
        "name": "sellers"
      },
      {
        "type": "address[]",
        "name": "buyers"
      },
      {
        "type": "uint256[]",
        "name": "prices"
      },
      {
        "type": "uint256[]",
        "name": "timestamps"
      },
      {
        "type": "uint256[]",
        "name": "levels"
      },
      {
        "type": "uint256[]",
        "name": "accumulatedFoods"
      }
    ]
  },
  {
    "type": "function",
    "name": "getQualityTransactionsByTime",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "quality"
      },
      {
        "type": "uint256",
        "name": "page"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "address[]",
        "name": "sellers"
      },
      {
        "type": "address[]",
        "name": "buyers"
      },
      {
        "type": "uint256[]",
        "name": "prices"
      },
      {
        "type": "uint256[]",
        "name": "timestamps"
      },
      {
        "type": "uint256[]",
        "name": "levels"
      },
      {
        "type": "uint256[]",
        "name": "accumulatedFoods"
      }
    ]
  },
  {
    "type": "function",
    "name": "getTimeIndicesCount",
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
    "name": "getTransactionCount",
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
    "name": "getTransactionsByPrice",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "page"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "address[]",
        "name": "sellers"
      },
      {
        "type": "address[]",
        "name": "buyers"
      },
      {
        "type": "uint8[]",
        "name": "qualities"
      },
      {
        "type": "uint256[]",
        "name": "prices"
      },
      {
        "type": "uint256[]",
        "name": "timestamps"
      },
      {
        "type": "uint256[]",
        "name": "levels"
      },
      {
        "type": "uint256[]",
        "name": "accumulatedFoods"
      }
    ]
  },
  {
    "type": "function",
    "name": "getTransactionsByTime",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "page"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "address[]",
        "name": "sellers"
      },
      {
        "type": "address[]",
        "name": "buyers"
      },
      {
        "type": "uint8[]",
        "name": "qualities"
      },
      {
        "type": "uint256[]",
        "name": "prices"
      },
      {
        "type": "uint256[]",
        "name": "timestamps"
      },
      {
        "type": "uint256[]",
        "name": "levels"
      },
      {
        "type": "uint256[]",
        "name": "accumulatedFoods"
      }
    ]
  },
  {
    "type": "function",
    "name": "indexTransaction",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "address",
        "name": "seller"
      },
      {
        "type": "address",
        "name": "buyer"
      },
      {
        "type": "uint8",
        "name": "qualityValue"
      },
      {
        "type": "uint256",
        "name": "price"
      },
      {
        "type": "uint256",
        "name": "timestamp"
      },
      {
        "type": "uint256",
        "name": "level"
      },
      {
        "type": "uint256",
        "name": "accumulatedFood"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "marketplace",
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
    "name": "setMarketplace",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_marketplace"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transactions",
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
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "address",
        "name": "seller"
      },
      {
        "type": "address",
        "name": "buyer"
      },
      {
        "type": "uint8",
        "name": "quality"
      },
      {
        "type": "uint256",
        "name": "price"
      },
      {
        "type": "uint256",
        "name": "timestamp"
      },
      {
        "type": "uint256",
        "name": "index"
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
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RareNFTTransactionIndexerABI;
}