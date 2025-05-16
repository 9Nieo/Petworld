/**
 * English locale for the application
 */
(function() {
  // ensure global i18n object exists
  window.APP_LOCALES = window.APP_LOCALES || {};
  
  const enTranslations = {
    // Common terms
    common: {
      connect: "Connect",
      disconnect: "Disconnect",
      connecting: "Connecting",
      cancel: "Cancel",
      retry: "Retry",
      error: "Error",
      success: "Success",
      wallet: "Wallet",
      loading: "Loading",
      close: "Close",
      yes: "Yes",
      no: "No",
      ok: "OK",
      confirm: "Confirm",
      warning: "Warning",
      info: "Information",
      back: "Back",
      next: "Next",
      previous: "Previous",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
      settings: "Settings",
      help: "Help",
      logout: "Logout",
      login: "Login",
      register: "Register",
      search: "Search",
      share: "Share",
      copy: "Copy",
      paste: "Paste",
      reset: "Reset",
      all: "All",
      copyright: "© 2025 Pet World - All Rights Reserved",
      pageInfo: "Page {{current}} of {{total}}",
      pageInfoWithTotal: "Page {{current}} of {{total}} ({{items}} records)",
      featureNotImplemented: "{feature} coming soon, stay tuned!"
    },
    // Loading page
    loading: {
      title: "Pet World is Loading",
      description: "Retrieving your pet NFT data, please wait...",
      connecting: "Connecting to the blockchain...",
      loadingAssets: "Loading game assets...",
      initializingGame: "Initializing game...",
      loadingPets: "Loading your pets...",
      loadingComplete: "Loading complete!",
      enteringWorld: "Entering the Pet World...",
      tip1: "Tip: Feed your pets regularly to keep them happy!",
      tip2: "Tip: Rare pets have special abilities!",
      tip3: "Tip: You can trade your pets in the marketplace!",
      tip4: "Tip: Stake your tokens to earn rewards!",
      tip5: "Tip: Complete daily quests for bonus rewards!"
    },
    
    // Wallet connection
    wallet: {
      title: "Connect Wallet",
      noWallet: "No wallet connected",
      pleaseConnect: "Please connect your wallet to continue",
      connectingTo: "Connecting to {walletName}...",
      confirmInWallet: "Please confirm the connection request in your wallet",
      connect: "Connect Wallet",
      disconnect: "Disconnect",
      notConnected: "No wallet connected",
      connectHint: "Connect your wallet to start adopting cute pets!",
      
      // Wallet types
      metamask: {
        name: "MetaMask",
        description: "Connect to your MetaMask wallet"
      },
      walletconnect: {
        name: "WalletConnect",
        description: "Connect using WalletConnect"
      },
      okx: {
        name: "OKX Wallet",
        description: "Connect to your OKX wallet"
      },
      
      // Connection states
      states: {
        connecting: "Connecting wallet...",
        connected: "Wallet connected",
        disconnected: "Wallet disconnected",
        error: "Connection error"
      },
      
      // Errors
      errors: {
        walletNotDetected: "No {walletName} detected. Please install the extension and try again.",
        failedToConnect: "Failed to connect to {walletName}: {message}",
        userRejected: "Connection request was rejected",
        noAddressReturned: "Could not get wallet address",
        unsupportedWallet: "Unsupported wallet type: {walletType}"
      },
      
      // Installation guides
      install: {
        metamask: "Click here to install MetaMask",
        okx: "Click here to install OKX Wallet"
      },
      
      // Localhost warning for WalletConnect
      localhostWarning: {
        title: "Limitations in localhost environment",
        description: "Due to security reasons, WalletConnect may not work properly in a localhost environment due to:",
        reasons: [
          "WalletConnect requires HTTPS or a secure context",
          "Local development environment using HTTP doesn't meet security requirements"
        ],
        solutions: {
          title: "Solutions:",
          options: [
            "Deploy the application to an HTTPS-enabled server",
            "Use browser extension wallets like MetaMask for local testing",
            "Use a local HTTPS server (like ngrok, localtunnel, etc.)"
          ]
        }
      },
      connectWallet: "Connect Wallet",
      connectWalletDescription: "Connect your wallet to interact with the blockchain.",
      walletAddress: "Wallet Address",
      walletBalance: "Balance",
      connectError: "Failed to connect wallet",
      chooseWallet: "Choose a wallet to connect",
      copyAddress: "Copy Address",
      addressCopied: "Address copied to clipboard!",
      emptyWallet: "No wallet connected",
      connectUsingMetamask: "Connect using MetaMask browser extension",
      connectUsingWalletConnect: "Connect using WalletConnect",
      connectUsingOKX: "Connect using OKX Wallet extension"
    },

    // Application-specific terms
    app: {
      title: "Pet World"
    },

    // Game-specific terms
    game: {
      title: "Pet World",
      selectMode: "Pet World - Select Mode",
      sfx: "Sound Effects",
      bgm: "Background Music",
      graphics: "Graphics Quality",
      graphicsLow: "Low",
      graphicsMedium: "Medium",
      graphicsHigh: "High"
    },

    // Navigation terms
    navigation: {
      home: "Home",
      pets: "My Pets",
      shop: "Shop",
      market: "Marketplace",
      settings: "Settings",
      more: "More",
      stableStaking: "Stable Staking",
      pwStaking: "PW Staking",
      burn: "Burn",
      reverseBurn: "Reverse Burn",
      exchange: "Exchange",
      staking: "PW Staking",
      reverseburn: "Reverse Burn",
    },

    // Tab labels
    tabs: {
      pets: "My Pets",
      marketplace: "Marketplace",
      activities: "Activities",
      settings: "Settings"
    },

    // Home welcome text
    home: {
      welcome: {
        title: "Welcome to Pet World Game!",
        description: "Explore, collect, and raise your own pets"
      },
      myAssets: "My Assets"
    },

    // Network detection
    network: {
      wrongNetwork: "Wrong Network Connection",
      pleaseSwitch: "Please switch your wallet to {requiredNetwork} network to continue using Pet World.",
      switchNetwork: "Switch Network",
      networkChanged: "Network switched successfully",
      checkingNetwork: "Checking network...",
      currentNetwork: "Current Network",
      requiredNetwork: "Required Network",
      switchFailed: "Network switch failed",
      tryManually: "Please try to switch networks manually in your wallet",
      addNetwork: "Add Network",
      bscTestnet: "BSC Testnet",
      bscMainnet: "Binance Smart Chain"
    },

    // Button labels
    button: {
      save: "Save",
      cancel: "Cancel",
      connect: "Connect Wallet",
      disconnect: "Disconnect",
      back: "Back",
      refresh: "Refresh",
      view: "View",
      trade: "Trade",
      use: "Use",
      transfer: "Transfer",
      buy: "Buy",
      feed: "Feed",
      max: "Max",
      claim: "Claim",
      confirm: "Confirm",
    },
    quality: {
      common: "Common",
      good: "Good",
      excellent: "Excellent",
      rare: "Rare",
      legendary: "Legendary"
    },
    // Settings-related terms
    settings: {
      title: "Settings",
      appSettings: "App Settings",
      account: "Account Settings",
      display: "Display Settings",
      audioSettings: "Audio Settings",
      languageSettings: "Language Settings",
      bgMusic: "Background Music",
      soundEffects: "Sound Effects",
      masterVolume: "Master Volume",
      voiceVolume: "Voice Volume",
      muteBackground: "Mute in Background",
      resetBtn: "Reset Settings",
      saveBtn: "Save Settings",
      saved: "Settings saved successfully",
      resetSuccess: "Settings reset to defaults",
      theme: "Theme",
      tokenSettings: "Token Settings",
      tokenDescription: "Token Description",
      importTokens: "Import Tokens",
      tokenStatus: "Token Status",
      tokenDeployed: "Token Deployed",
      tokenNotDeployed: "Token Not Deployed",
      themeOptions: {
        light: "Light Theme",
        dark: "Dark Theme",
        auto: "Follow System"
      },
      nickname: "Nickname",
      notification: "Notification Settings",
      notificationOptions: {
        game: "Game Notifications",
        system: "System Messages",
        activity: "Activity Reminders"
      },
      languageChanged: "Language changed successfully",
      languageChangeFailed: "Failed to change language",
      language: "Language",
      audio: "Audio Settings",
      game: "Game Settings",
      performance: "Performance Settings",
      resetSettings: "Reset Settings",
      saveSettings: "Save Settings",
      settingsSaved: "Settings saved successfully!",
      confirmReset: "Are you sure you want to reset all settings to defaults?",
      backgroundMusic: "Background Music",
      uiLanguage: "UI Language",
      resetButton: "Reset to Defaults",
      saveButton: "Save Settings"
    },

    // Asset-related terms
    asset: {
      count: "pets",
      pieces: "items"
    },

    // Network-related terms
    network: {
      ethereum: "Ethereum Mainnet",
      binance: "Binance Smart Chain",
      polygon: "Polygon"
    },

    // Pet-related terms
    pets: {
      title: "My Pets",
      noPets: "You don't have any pets yet",
      adoptNew: "Adopt New Pet",
      adoptHint: "Click the egg to adopt your first pet!",
      feed: "Feed",
      play: "Play",
      details: "Pet Details",
      myPets: "My Pets",
      myPetsList: "My Pets List",
      level: "Level",
      feedAll: "Feed All",
      claimAll: "Claim All",
      feedFriend: "Feed Friend Pet",
      sort: {
        levelDesc: "Level: High to Low",
        levelAsc: "Level: Low to High",
        rarityDesc: "Rarity: High to Low",
        rarityAsc: "Rarity: Low to High"
      }
    },
    stableStaking: {
      title: "Stable Staking",
      description: "Stake stablecoins to earn rewards",
      stats: {
        currentCycle: "Current Cycle",
        nextCycle: "Next Cycle",
        rewardRate: "Reward Rate",
        totalStaked: "Total Staked",
        totalClaimed: "Total Rewards",
      },
      tabs: {
          stake: "Staking",
          withdraw: "Withdraw",
      },
      form: {
        selectStableCoin: "Select Stable Coin",
        stakeAmount: "Stake Amount",
        balance: "Balance",
        max: "Max",
        stake: "Stake",
        withdraw: "Withdraw",
        withdrawAmount: "Withdraw Amount",
        selectStakedCoin: "Select Staked Coin",
        stakedBalance: "Staked Balance",
      },
      history: {
        title: "Staking History",
        stableCoin: "Stable Coin",
        amount: "Amount",
        status: "Status",
        lastClaimed: "Last Claimed",
        pendingRewards: "Pending Rewards",
        actions: "Actions",
        noHistory: "No staking history found",
        cycle: "Cycle",
      },
      notification: {
        noRewards: "No rewards available",
      }
    },
    // Market-related terms
    market: {
      title: "Pet Marketplace",
      searchPlaceholder: "Search pets...",
      sortPriceAsc: "Price: Low to High",
      sortPriceDesc: "Price: High to Low",
      sortLevelAsc: "Level: Low to High",
      sortLevelDesc: "Level: High to Low",
      price: "Price",
      corgi: "Corgi",
      search_marketplace: "Search marketplace...",
      price_low_to_high: "Price: Low to High",
      price_high_to_low: "Price: High to Low",
      marketplace: "Marketplace",
      listNFT: "List NFT",
      manageListings: "Manage My Listings",
      viewTransactionHistory: "Premium Card Transactions",
      transactionHistoryTitle: "Premium Card Transaction Records",
      sortBy: "Sort By",
      sortByTime: "Sort by Time",
      sortByPrice: "Sort by Price",
      filterByQuality: "Filter by Quality",
      allQualities: "All Premium Qualities",
      noTransactions: "No premium card transaction records found",
      loadingTransactions: "Loading transaction history...",
      rarity:{
        free: "Free",
        common: "Common",
        good: "Good",
        excellent: "Excellent",
        rare: "Rare",
        legendary: "Legendary"
      }
    },
    exchange: {
      title: "Exchange",
      description: "Exchange different types of tokens and assets",
      reverseToPoint: "Reverse to Point",
      reverseToPointRate: "PWR -> PWP Rate",
      max: "Max",
      youWillGet: "You will get",
      inputAmount: "Input Amount",
      inputBountyAmount: "Input PWB Amount",
      swap: "Swap",
      requiredReverseAmount: "Required Reverse Amount",
      bothToPointRate: "PWR and PWB -> PWP Rate",
    },
    // Footer-related terms
    footer: {
      about: "About Us",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      help: "Help Center"
    },

    // Index page terms
    index: {
      welcome: "Welcome to Pet World!",
      selectMode: "Please select your preferred game mode",
      gameMode: "Game Mode",
      gameModeDesc: "Immersive pet-raising game experience, interact with pets and complete tasks for rewards",
      simpleMode: "Simple Mode",
      simpleModeDesc: "Clean interface, easily manage your pets and assets",
      enterGame: "Enter Game",
      enterApp: "Enter App"
    },
    
    // Quality levels
    GOOD: "GOOD",
    EXCELLENT: "EXCELLENT",
    RARE: "RARE",
    LEGENDARY: "LEGENDARY",
    nft: {
      tokenId: "Token ID",
      quality: "Quality",
      seller: "Seller",
      buyer: "Buyer",
      price: "Price",
      transactionTime: "Transaction Time"
    },
    
    // Common keys
    buy: "Buy",
    details: "Details",
    level: "Level: {level}",

    // Shop-related terms
    shop: {
      title: "Lottery Shop",
      items: {
        freeNFT: "Free Pet",
        commonEgg: "Common Egg",
        rareEgg: "Rare Egg",
        legendaryEgg: "Legendary Egg",
        pwfood: "Pet Food",
        claimEggs: "Claim Pending Pets",
        freePwFoodDesc: "Every 24 hours, each address can claim 10 free pet food",
        freePwFood: "Free PwFood"
      },
      freeNFTDesc: "Each address can claim one free pet NFT",
      commonEggDesc: "Higher chance to get common and good quality pets",
      rareEggDesc: "Higher chance to get rare pets",
      legendaryEggDesc: "Chance to get legendary rare pets",
      pwfoodDesc: "Feed your pets to restore their hunger",
      claimEggsDesc: "Claim your pets from lottery that haven't been claimed",
      claim: "Claim",
      inviterTip: "Fill in an inviter address to let them get rewards",
      
      // Claiming pending pets related
      claimEggsConfirmTitle: "Claim Pending Pets",
      claimEggsConfirm: "Confirm Claim",
      claimEggsCancel: "Cancel",
      claimEggsSuccess: "Successfully claimed {count} pets!",
      noPendingEggs: "No pending pets",
      pendingEggsCount: "You have {total} pending pets: {rare} rare and {legendary} legendary",
      foodAmount: "Purchase Amount ($):",
      foodAmountTip: "Enter an integer between 1-10000",
      quantity: "Quantity",
      price: "Price",
      total: "Total"
    },
    
    // More features menu related
    moreFeatures: {
      stableStaking: {
        title: "Stable Staking",
        description: "Stake stablecoins to earn rewards",
        comingSoon: "Stable staking feature coming soon, stay tuned!"
      },
      pwStaking: {
        title: "PW Staking",
        description: "Stake PW tokens to participate in governance and earn rewards",
        comingSoon: "PW staking feature coming soon, stay tuned!"
      },
      burn: {
        title: "Burn",
        description: "Burn tokens to reduce supply and increase scarcity",
        comingSoon: "Burn feature coming soon, stay tuned!"
      },
      reverseBurn: {
        title: "Reverse Burn",
        description: "Special deflationary mechanism to earn more rewards",
        comingSoon: "Reverse burn feature coming soon, stay tuned!"
      },
      exchange: {
        title: "Exchange",
        description: "Exchange different types of tokens and assets",
        comingSoon: "Exchange feature coming soon, stay tuned!"
      }
    },

    // Burn related
    burn: {
      title: "Token Burning",
      currentCycle: "Current Cycle",
      nextCycle: "Next Cycle In",
      totalBurned: "Total Burned Points",
      petWorldDistributed: "This Cycle PW Rewards",
      burnRate: "Burn Rate",
      yourBalance: "Your Balance",
      yourStats: "Your Burning Stats",
      yourBurned: "Points Burned",
      claimable: "Claimable PetWorld",
      amount: "Amount",
      burnPoints: "Burn PwPoint",
      cycles: "Number of Cycles",
      cyclesHint: "Select the number of cycles (3-250)",
      burnButton: "Burn",
      claimRewards: "Claim Rewards",
      claimInfo: "After burning, claim your PetWorld tokens here",
      claimCycles: "Select Cycles to Claim",
      claimButton: "Claim",
      yourRecords: "Your Burning Records",
      noRecords: "No burning records found"
    },

    staking: {
      overview: 'Staking Overview',
      totalStaked: 'Total Staked',
      rewardRate: 'Annual Reward Rate',
      rewardPool: 'Reward Pool',
      currentCycle: 'Current Cycle',
      nextCycle: 'Next Cycle',
      yourBalance: 'Your Balance',
      yourStaked: 'Your Staked',
      pendingRewards: 'Pending Rewards',
      lastClaimedCycle: 'Last Claimed Cycle',
      claim: 'Claim',
      stake: 'Stake',
      withdraw: 'Withdraw',
      donate: 'Donate',
      amount: 'Amount',
      max: 'Max',
      availableBalance: 'Available Balance',
      stakeNow: 'Stake Now',
      withdrawNow: 'Withdraw Now',
      donateNow: 'Donate Now',
      donateHint: 'Donate to the Staking Pool',
      availableBalance: 'Available Balance',
      stakedBalance: 'Staked Balance',
      yourStaking: 'Your Staking',
      stakeWithdraw: 'Stake/Withdraw',
      donateAmount: 'Donate Amount',
    },

    // Payment related
    payment: {
      title: "Confirm Payment",
      supportedTokens: "Supported Payment Tokens",
      selectToken: "Select Payment Token",
      itemPrice: "Item Price",
      gasFee: "Gas Fee (Estimated)",
      total: "Total",
      balance: "Balance",
      confirm: "Confirm Payment",
      cancel: "Cancel"
    }
  };
  
  // Add stablecoin staking translations
  enTranslations.modals = enTranslations.modals || {};
  enTranslations.modals.staking = {
    title: "Stablecoin Staking",
    refreshBtn: "Refresh",
    staked: "Staked",
    reward: "Reward",
    apr: "APR",
    stakeTab: "Stake",
    withdrawTab: "Withdraw",
    rewardsTab: "Rewards",
    stakeHistory: "Staking History",
    chooseStablecoin: "Choose Stablecoin",
    inputAmount: "Input Amount",
    amountPlaceholder: "Enter staking amount",
    max: "Max",
    balance: "Balance",
    stakeBtn: "Stake",
    unstakeBtn: "Unstake",
    harvestBtn: "Harvest",
    date: "Date",
    coin: "Coin",
    amount: "Amount",
    status: "Status",
    action: "Action",
    statusPending: "Pending",
    statusCompleted: "Completed",
    nothingStaked: "No staking record",
    availableRewards: "Available Rewards",
    rewardsInfo: "Stake stablecoins to receive PWUSD rewards daily",
    viewDetails: "View Details",
    stakeSuccess: "Staking Successful",
    stakeError: "Staking Failed: {message}",
    withdrawSuccess: "Withdrawal Successful",
    withdrawError: "Withdrawal Failed: {message}",
    harvestSuccess: "Reward Harvested Successfully",
    harvestError: "Harvest Failed: {message}",
    insufficientBalance: "Insufficient Balance",
    connectWalletToStake: "Please connect wallet to stake",
    walletNotConnected: "Wallet Not Connected",
    enterValidAmount: "Please enter a valid amount",
    pwusdContract: "PWUSD Contract:",
    stakingContract: "Staking Contract:"
  };
  
  // register English translations
  if (window.i18n) {
    window.i18n.registerTranslations('en', enTranslations);
  }
  
  // export to global variable
  window.APP_LOCALES['en'] = enTranslations;
  
  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { en: enTranslations };
  }
})(); 