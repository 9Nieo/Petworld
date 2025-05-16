// NFTLotteryManager token contract ABI
window.NFTLotteryManagerABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_vrfWrapper"
      },
      {
        "type": "address",
        "name": "_linkAddress"
      }
    ]
  },
  {
    "type": "error",
    "name": "OnlyVRFWrapperCanFulfill",
    "inputs": [
      {
        "type": "address",
        "name": "have"
      },
      {
        "type": "address",
        "name": "want"
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
    "name": "EggQueued",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "bytes",
        "name": "requestType",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "count",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FreeNFTClaimed",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "nftId",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "InitialTotalsSet",
    "inputs": [
      {
        "type": "uint256",
        "name": "rareTotal",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "legendaryTotal",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "NFTLotteryResult",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "tokenId",
        "indexed": false
      },
      {
        "type": "uint8",
        "name": "quality",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "nftId",
        "indexed": false
      },
      {
        "type": "string",
        "name": "lotteryType",
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
    "name": "Received",
    "inputs": [
      {
        "type": "address",
        "name": "",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "SpecialEggPaused",
    "inputs": [
      {
        "type": "bool",
        "name": "paused",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "VRFRequestFulfilled",
    "inputs": [
      {
        "type": "uint256",
        "name": "requestId",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "randomWords",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "VRFRequestPrice",
    "inputs": [
      {
        "type": "uint256",
        "name": "requestId",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "price",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "VRFRequested",
    "inputs": [
      {
        "type": "uint256",
        "name": "requestId",
        "indexed": false
      },
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "bytes",
        "name": "requestType",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "batchOpenCommonEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      },
      {
        "type": "uint256",
        "name": "_count"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "batchOpenLegendaryEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      },
      {
        "type": "uint256",
        "name": "_count"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "batchOpenRareEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      },
      {
        "type": "uint256",
        "name": "_count"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "callbackGasLimit",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint32",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "claimEggs",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claimFreeNFT",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "inviter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claimInviteRewardPoint",
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
    "name": "commonEggInviteRewardPoint",
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
    "name": "depositBNBForVRF",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getBalance",
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
    "name": "getContractBalance",
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
    "name": "getLinkBalance",
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
    "name": "getLinkToken",
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
    "name": "getPendingEggs",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "rareEggs"
      },
      {
        "type": "uint256",
        "name": "legendaryEggs"
      }
    ]
  },
  {
    "type": "function",
    "name": "getRequestStatus",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "requestId"
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": "fulfilled"
      },
      {
        "type": "bool",
        "name": "exists"
      },
      {
        "type": "uint256",
        "name": "randomWords"
      }
    ]
  },
  {
    "type": "function",
    "name": "getUserPendingRequests",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "hasClaimableEggs",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "user"
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
    "name": "hasClaimedFreeNFT",
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
    "name": "i_vrfV2PlusWrapper",
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
    "name": "initialLegendaryEggExcellentRate",
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
    "name": "initialLegendaryEggLegendaryRate",
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
    "name": "initialLegendaryEggRareRate",
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
    "name": "initialLegendaryTotal",
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
    "name": "initialRareEggExcellentRate",
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
    "name": "initialRareEggGoodRate",
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
    "name": "initialRareEggRareRate",
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
    "name": "initialRareTotal",
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
    "name": "initialTotalsSet",
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
    "name": "isUseNativePayment",
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
    "name": "legendaryEggInviteRewardPoint",
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
    "name": "linkAddress",
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
    "name": "numWords",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint32",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "openCommonEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "openLegendaryEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "openRareEgg",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_token"
      }
    ],
    "outputs": []
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
    "name": "paymentManager",
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
    "name": "pendingLegendaryEggs",
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
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "pendingRareEggs",
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
        "type": "uint256",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "pwPointManager",
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
    "name": "rareEggInviteRewardPoint",
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
    "name": "rawFulfillRandomWords",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "_requestId"
      },
      {
        "type": "uint256[]",
        "name": "_randomWords"
      }
    ],
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
    "name": "requestConfirmations",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint16",
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "setInitialTotals",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setIsUseNativePayment",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "bool",
        "name": "_isUseNativePayment"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setLinkAddress",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_linkAddress"
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
        "name": "_nftFeedingManager"
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
    "name": "setPaymentManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_paymentManager"
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
    "name": "setPwPointManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwPointManager"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setSpecialEggPaused",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "bool",
        "name": "_paused"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setVRFConfig",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint32",
        "name": "_callbackGasLimit"
      },
      {
        "type": "uint16",
        "name": "_requestConfirmations"
      },
      {
        "type": "uint32",
        "name": "_numWords"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setVRFWrapper",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_vrfWrapper"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "specialEggPaused",
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
    "name": "totalRegisteredUsers",
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
  },
  {
    "type": "function",
    "name": "tryGetAvailableNFTId",
    "constant": false,
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
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "userRequests",
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
  },
  {
    "type": "function",
    "name": "vrfRequests",
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
        "type": "bool",
        "name": "fulfilled"
      },
      {
        "type": "bool",
        "name": "exists"
      },
      {
        "type": "uint256",
        "name": "randomWords"
      },
      {
        "type": "address",
        "name": "user"
      },
      {
        "type": "bytes",
        "name": "requestType"
      }
    ]
  },
  {
    "type": "function",
    "name": "vrf_wrapper",
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
    "name": "withdrawLink",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawNative",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "amount"
      }
    ],
    "outputs": []
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NFTLotteryManagerABI;
}