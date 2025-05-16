// NFTFeedingManager token contract ABI
window.NFTFeedingManagerABI = [
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
    "name": "ConfigUpdated",
    "inputs": [
      {
        "type": "uint256",
        "name": "quality",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "pwpotReward",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "pwbotReward",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ContractAddressUpdated",
    "inputs": [
      {
        "type": "string",
        "name": "contractType",
        "indexed": true
      },
      {
        "type": "address",
        "name": "newAddress",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTFed",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "uint256",
        "name": "foodAmount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "cyclesAdded",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTLevelUp",
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "newLevel",
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
    "name": "NFTRegistered",
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "quality",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "feedingHours",
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
    "name": "RegistrarAuthorized",
    "inputs": [
      {
        "type": "address",
        "name": "registrar",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "RegistrarRevoked",
    "inputs": [
      {
        "type": "address",
        "name": "registrar",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "RewardsClaimed",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "uint256",
        "name": "totalPwpotRewards",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "totalPwbotRewards",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "DEFAULT_FEEDING_HOURS",
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
    "name": "HOURS_PER_CYCLE",
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
    "name": "LEVEL_2_THRESHOLD",
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
    "name": "LEVEL_3_THRESHOLD",
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
    "name": "LEVEL_4_THRESHOLD",
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
    "name": "LEVEL_5_THRESHOLD",
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
    "name": "MAX_FEEDING_HOURS",
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
    "name": "MAX_LEVEL",
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
    "name": "SECONDS_PER_CYCLE",
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
    "name": "authorizeRegistrar",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "registrar"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "authorizedRegistrars",
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
    "name": "claimRewards",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "feedMultipleNFTs",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256[]",
        "name": "tokenIds"
      },
      {
        "type": "uint256",
        "name": "totalFoodAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "feedNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      },
      {
        "type": "uint256",
        "name": "foodAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getNFTLevelInfo",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      }
    ],
    "outputs": [
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
    "name": "getRemainingFeedingHours",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
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
    "name": "getTotalClaimableRewardCycles",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "tokenId"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "totalCycles"
      },
      {
        "type": "uint256",
        "name": "pwpotReward"
      },
      {
        "type": "uint256",
        "name": "pwbotReward"
      }
    ]
  },
  {
    "type": "function",
    "name": "nftFeeding",
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
        "name": "feedingHours"
      },
      {
        "type": "uint256",
        "name": "lastClaimTime"
      },
      {
        "type": "uint256",
        "name": "lastFeedTime"
      },
      {
        "type": "uint256",
        "name": "quality"
      },
      {
        "type": "bool",
        "name": "isActive"
      },
      {
        "type": "uint256",
        "name": "accumulatedCycles"
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
    "name": "nftLotteryManager",
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
    "name": "pwfoodReceiver",
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
    "name": "pwfoodToken",
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
    "name": "pwnft",
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
    "name": "pwpointManager",
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
    "name": "registerNFT",
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
    "name": "revokeRegistrar",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "registrar"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "rewardConfigs",
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
        "name": "pwpotReward"
      },
      {
        "type": "uint256",
        "name": "pwbotReward"
      }
    ]
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
    "name": "setNftLotteryManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_nftLotteryManager"
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
        "name": "_pwnft"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwfoodReceiver",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_newAddress"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwfoodToken",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwfoodToken"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwpointManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwpointManager"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setUserInviter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "user"
      },
      {
        "type": "address",
        "name": "inviter"
      }
    ],
    "outputs": []
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
    "name": "userInviter",
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
        "type": "address",
        "name": ""
      }
    ]
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NFTFeedingManagerABI;
}