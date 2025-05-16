// PwPointManager token contract ABI
window.PwPointManagerABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwPoint"
      },
      {
        "type": "address",
        "name": "_pwBounty"
      },
      {
        "type": "address",
        "name": "_pwReverse"
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
    "name": "DailyTaskClaimed",
    "inputs": [
      {
        "type": "address",
        "name": "to",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "pointAmount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "bountyAmount",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "MintPwBounty",
    "inputs": [
      {
        "type": "address",
        "name": "minter",
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
    "name": "MintPwPoint",
    "inputs": [
      {
        "type": "address",
        "name": "minter",
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
    "name": "MintPwReverse",
    "inputs": [
      {
        "type": "address",
        "name": "minter",
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
    "name": "TokensSwapped",
    "inputs": [
      {
        "type": "address",
        "name": "from",
        "indexed": true
      },
      {
        "type": "string",
        "name": "swapType",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "pointAmount",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "receivedBounty",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "receivedReverse",
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
    "name": "addPwBountyMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "addPwBountyTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "addPwPointMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "addPwPointTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "addPwReverseMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "addPwReverseTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claimNftReward",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "uint256",
        "name": "pointAmount"
      },
      {
        "type": "uint256",
        "name": "bountyAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getBalances",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": "pointBalance"
      },
      {
        "type": "uint256",
        "name": "bountyBalance"
      },
      {
        "type": "uint256",
        "name": "reverseBalance"
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
    "name": "inviteReward",
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
      },
      {
        "type": "uint256",
        "name": "pointAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "mintPwBounty",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "mintPwPoint",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "mintPwReverse",
    "constant": false,
    "payable": false,
    "inputs": [],
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
    "name": "pwBounty",
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
    "name": "pwBountyMinters",
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
    "name": "pwBountyTransferAllowed",
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
    "name": "pwPoint",
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
    "name": "pwPointMinters",
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
    "name": "pwPointTransferAllowed",
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
    "name": "pwReverse",
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
    "name": "pwReverseMinters",
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
    "name": "pwReverseTransferAllowed",
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
    "name": "removePwBountyMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removePwBountyTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removePwPointMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removePwPointTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removePwReverseMinter",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "minter"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removePwReverseTransferAllowed",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "account"
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
    "name": "setPwBounty",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwBounty"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwPoint",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwPoint"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setPwReverse",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "_pwReverse"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setupMinters",
    "constant": false,
    "payable": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "swapBothForPoint",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "from"
      },
      {
        "type": "uint256",
        "name": "bountyAmount"
      },
      {
        "type": "uint256",
        "name": "reverseAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "swapReverseForPoint",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "from"
      },
      {
        "type": "uint256",
        "name": "reverseAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "totalPwBountyTransferred",
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
    "name": "totalPwPointTransferred",
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
    "name": "totalPwReverseTransferred",
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
    "name": "transferPwBounty",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transferPwPoint",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transferPwReverse",
    "constant": false,
    "payable": false,
    "inputs": [
      {
        "type": "address",
        "name": "to"
      },
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
  module.exports = PwPointManagerABI;
}