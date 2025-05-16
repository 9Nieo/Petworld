// PwFoodManager token contract ABI
window.PwFoodManagerABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwFood"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "type": "address",
        "name": "token"
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "DirectPurchase",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "address",
        "name": "payToken",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "payAmount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "pwfoodAmount",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FreePwFoodClaimed",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
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
    "name": "PaymentProcessed",
    "inputs": [
      {
        "type": "address",
        "name": "user",
        "indexed": true
      },
      {
        "type": "address",
        "name": "token",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "pwfoodAmount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "recordIndex",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "TokensMinted",
    "inputs": [
      {
        "type": "address",
        "name": "to",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "TokensTransferred",
    "inputs": [
      {
        "type": "address",
        "name": "from",
        "indexed": true
      },
      {
        "type": "address",
        "name": "to",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "dollarAmount",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "DEFAULT_MINT_AMOUNT",
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
    "name": "MAX_DOLLAR_AMOUNT",
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
    "name": "MIN_DOLLAR_AMOUNT",
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
    "name": "PWFOOD_DAY_REWARD",
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
    "name": "PWFOOD_PER_DOLLAR",
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
    "name": "buyPwFood",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "payToken"
      },
      {
        "type": "uint256",
        "name": "dollarAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "calculatePwFoodAmount",
    "constant": true,
    "stateMutability": "pure",
    "payable": false,
    "inputs": [
      {
        "type": "uint256",
        "name": "dollarAmount"
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
    "name": "claimFreePwFood",
    "constant": false,
    "payable": false,
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
        "name": "foodBalance"
      }
    ]
  },
  {
    "type": "function",
    "name": "initMint",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "initMintCount",
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
    "name": "lastClaimTime",
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
    "name": "processedPayments",
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
        "name": ""
      }
    ]
  },
  {
    "type": "function",
    "name": "pwFood",
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
    "name": "setNFTLotteryManager",
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
    "name": "setPwFood",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwFood"
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
    "type": "receive",
    "stateMutability": "payable"
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PwFoodManagerABI;
}