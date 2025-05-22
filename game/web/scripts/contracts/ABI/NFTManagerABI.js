// NFTManager token contract ABI
window.NFTManagerABI = [
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
    "type": "event",
    "anonymous": false,
    "name": "NFTMinted",
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "uint8",
        "name": "quality",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "qualityId",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "timestamp",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTStatusChanged",
    "inputs": [
      {
        "type": "uint8",
        "name": "quality",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "id",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "active",
        "indexed": false
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
    "name": "StatusManagerAuthorized",
    "inputs": [
      {
        "type": "address",
        "name": "manager",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "authorized",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "_tokenURIs",
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
        "type": "string",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "addNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      },
      {
        "type": "string",
        "name": "_uri"
      },
      {
        "type": "uint256",
        "name": "_maxSupply"
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
    "name": "addNFTWithStatus",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      },
      {
        "type": "string",
        "name": "_uri"
      },
      {
        "type": "uint256",
        "name": "_maxSupply"
      },
      {
        "type": "bool",
        "name": "_active"
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
    "name": "authorizedMinters",
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
    "name": "authorizedStatusManagers",
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
    "name": "batchSetNFTStatus",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      },
      {
        "type": "uint256[]",
        "name": "_ids"
      },
      {
        "type": "bool",
        "name": "_active"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "currentMaxName",
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
    "name": "getAvailableNFTCount",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "total"
      },
      {
        "type": "uint256",
        "name": "available"
      }
    ]
  },
  {
    "type": "function",
    "name": "getNFTInfoByName",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "_name"
      },
      {
        "type": "uint8",
        "name": "_quality"
      }
    ],
    "outputs": [
      {
        "type": "string",
        "name": "uri"
      },
      {
        "type": "uint256",
        "name": "maxSupply"
      },
      {
        "type": "uint256",
        "name": "minted"
      },
      {
        "type": "bool",
        "name": "active"
      },
      {
        "type": "uint256",
        "name": "remaining"
      }
    ]
  },
  {
    "type": "function",
    "name": "getRemainingByName",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "_name"
      },
      {
        "type": "uint8",
        "name": "_quality"
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
    "name": "mintNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      },
      {
        "type": "uint256",
        "name": "_id"
      },
      {
        "type": "uint256",
        "name": "_tokenId"
      }
    ],
    "outputs": [
      {
        "type": "string",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "mintTimestamps",
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
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "nftCountByQuality",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
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
    "name": "nftIdByName",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": ""
      },
      {
        "type": "uint8",
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
    "name": "nfts",
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
        "type": "string",
        "name": "uri"
      },
      {
        "type": "uint256",
        "name": "maxSupply"
      },
      {
        "type": "uint256",
        "name": "minted"
      },
      {
        "type": "bool",
        "name": "active"
      },
      {
        "type": "uint256",
        "name": "name"
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
    "name": "renounceOwnership",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setMinterAuthorization",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_minter"
      },
      {
        "type": "bool",
        "name": "_authorized"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setNFTStatus",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint8",
        "name": "_quality"
      },
      {
        "type": "uint256",
        "name": "_id"
      },
      {
        "type": "bool",
        "name": "_active"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setStatusManagerAuthorization",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_manager"
      },
      {
        "type": "bool",
        "name": "_authorized"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "tokenQuality",
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
        "type": "uint8",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "tokenQualityId",
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
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "totalLegendaryRemaining",
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
    "name": "totalRareRemaining",
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
  module.exports = NFTManagerABI;
}