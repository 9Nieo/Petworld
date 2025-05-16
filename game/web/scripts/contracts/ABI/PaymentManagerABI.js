// PaymentManager token contract ABI
window.PaymentManagerABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_initialReceiver"
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
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ContractPaused",
    "inputs": [
      {
        "type": "address",
        "name": "by",
        "indexed": true
      }
    ]
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
    "name": "ContractUnpaused",
    "inputs": [
      {
        "type": "address",
        "name": "by",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "EmergencyWithdrawAll",
    "inputs": [
      {
        "type": "address",
        "name": "to",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "ethAmount",
        "indexed": false
      },
      {
        "type": "address[]",
        "name": "tokens"
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
    "name": "PWFoodPaymentProcessed",
    "inputs": [
      {
        "type": "address",
        "name": "payer",
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
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "PaymentReceived",
    "inputs": [
      {
        "type": "address",
        "name": "token",
        "indexed": true
      },
      {
        "type": "address",
        "name": "from",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
        "indexed": false
      },
      {
        "type": "string",
        "name": "purchaseType",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "recordIndex",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "TokenWithdrawalFailed",
    "inputs": [
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
        "type": "string",
        "name": "reason",
        "indexed": false
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
    "name": "MAX_QUANTITY",
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
    "name": "authorizedPaymentAgents",
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
    "name": "commonLotteryPrice",
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
    "name": "emergencyWithdrawAll",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "to"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "legendaryLotteryPrice",
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
    "name": "pause",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "paused",
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
    "name": "payForCommonLottery",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "uint256",
        "name": "quantity"
      },
      {
        "type": "address",
        "name": "originalPayer"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "payForLegendaryLottery",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "uint256",
        "name": "quantity"
      },
      {
        "type": "address",
        "name": "originalPayer"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "payForPWFood",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "uint256",
        "name": "dollarAmount"
      },
      {
        "type": "address",
        "name": "payer"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "payForRareLottery",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "uint256",
        "name": "quantity"
      },
      {
        "type": "address",
        "name": "originalPayer"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "payersList",
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
    "name": "paymentReceiver",
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
    "name": "paymentRecords",
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
        "name": "payer"
      },
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "uint256",
        "name": "amount"
      },
      {
        "type": "string",
        "name": "purchaseType"
      },
      {
        "type": "uint256",
        "name": "timestamp"
      }
    ]
  },
  {
    "type": "function",
    "name": "pwFoodManager",
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
    "name": "pwfoodPrice",
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
    "name": "rareLotteryPrice",
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
    "name": "setPaymentAgentAuthorization",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "agent"
      },
      {
        "type": "bool",
        "name": "status"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPaymentReceiver",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "receiver"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwFoodManager",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwFoodManager"
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
    "name": "unpause",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "userPayments",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": ""
      },
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
    "type": "receive",
    "stateMutability": "payable"
  }
];

// Also supports CommonJS module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManagerABI;
}