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
      copyright: "© 2025 Petworld - All Rights Reserved",
      pageInfo: "Page {{current}} of {{total}}",
      pageInfoWithTotal: "Page {{current}} of {{total}} ({{items}} records)",
      featureNotImplemented: "{feature} coming soon, stay tuned!"
    },
    // Loading page
    loading: {
      title: "Petworld is Loading",
      description: "Retrieving your pet NFT data, please wait...",
      connecting: "Connecting to the blockchain...",
      loadingAssets: "Loading game assets...",
      initializingGame: "Initializing game...",
      loadingPets: "Loading your pets...",
      loadingComplete: "Loading complete!",
      enteringWorld: "Entering the Petworld...",
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
      connectUsingOKX: "Connect using OKX Wallet extension",
      
      // Wallet choice modal
      choiceTitle: "Choose Connection Method",
      choiceDescription: "To access all features, please connect your wallet or use a private key",
      connectWalletDesc: "Connect MetaMask, OKX or other supported wallets",
      usePrivateKey: "Use Private Key (Recommended)",
      usePrivateKeyDesc: "Securely store and use your private key locally",
      skipForNow: "Skip for now",
      
      // Private key setup
      setupPrivateKey: "Setup Private Key Wallet",
      securityWarning: "Your private key will be encrypted and stored locally. Never share it with anyone!",
      masterPassword: "Master Password",
      masterPasswordDesc: "This password will protect your stored private key",
      walletName: "Wallet Name",
      walletNameDesc: "A friendly name to identify this wallet",
      privateKey: "Private Key",
      privateKeyDesc: "64 hex characters (with or without 0x prefix)",
      setup: "Setup Wallet",
      cancel: "Cancel",
      
      // Messages
      enterMasterPassword: "Please enter a master password",
      passwordTooShort: "Password must be at least 6 characters",
      enterWalletName: "Please enter a wallet name",
      enterPrivateKey: "Please enter your private key",
      invalidPrivateKey: "Invalid private key format. Must be 64 hex characters.",
      setting: "Setting up...",
      setupSuccess: "Wallet setup successful!",
      setupFailed: "Wallet setup failed",
      setupError: "Error setting up wallet",
      authFailed: "Authentication failed",
      recommendedReason: "Recommended: Seamless operations without frequent signing"
    },

    // Application-specific terms
    app: {
      title: "Petworld"
    },

    // Game-specific terms
    game: {
      title: "Petworld",
      selectMode: "Petworld - Select Mode",
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
        title: "Welcome to Petworld Game!",
        description: "Explore, collect, and raise your own pets"
      },
      myAssets: "My Assets"
    },

    // Network detection
    network: {
      wrongNetwork: "Wrong Network Connection",
      pleaseSwitch: "Please switch your wallet to {requiredNetwork} network to continue using Petworld.",
      switchNetwork: "Switch Network",
      networkChanged: "Network switched successfully",
      checkingNetwork: "Checking network...",
      currentNetwork: "Current Network",
      requiredNetwork: "Required Network",
      switchFailed: "Network switch failed",
      tryManually: "Please try to switch networks manually in your wallet",
      addNetwork: "Add Network",
      bscTestnet: "BSC Testnet",
      bscMainnet: "Binance Smart Chain",

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
      approve: "Approve",
      ok: "OK",
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
      saveButton: "Save Settings",
      
      // Wallet Settings
      walletSettings: "Wallet Settings",
      securityWarning: "Your private key will be encrypted and stored locally. Never share your private key with anyone!",
      privateKeyLabel: "BNB Private Key (64 hex characters)",
      walletPasswordLabel: "Encryption Password",
      unlockPasswordLabel: "Enter Password to Unlock",
      walletAddress: "Wallet Address",
      storeKey: "Store Key",
      unlockWallet: "Unlock Wallet",
      lockWallet: "Lock Wallet",
      removeKey: "Remove Key",
      walletDescription: "Store your BNB private key securely to interact with blockchain features. Your key is encrypted before storage.",
      
      // Gas Price Settings
      gasPriceLimitLabel: "Max Gas Price (gwei)",
      gasPriceInfo: "Range will be shown based on current network",
      saveGasLimit: "Save Gas Limit",
      gasPriceSaved: "Gas price limit saved successfully",
      gasPriceSaveFailed: "Failed to save gas price limit",
      invalidGasPrice: "Please enter a valid gas price for current network",
      gasPriceRangeError: "Gas price must be within the allowed range for current network",
      
      // Wallet Status Messages
      walletDisconnected: "Wallet not configured",
      walletReady: "Private key wallet is ready",
      walletLoading: "Private key wallet is loading...",
      walletNotConfigured: "Private key wallet not configured",
      
      // Wallet Action Messages
      enterPrivateKey: "Please enter your private key",
      enterPassword: "Please enter an encryption password",
      passwordTooShort: "Password must be at least 6 characters",
      invalidPrivateKey: "Invalid private key format. Must be 64 hex characters.",
      keyStoredAndActivated: "Private key stored and activated successfully! You can now use it across all pages.",
      keyStoreFailed: "Failed to store private key",
      confirmRemoveKey: "Are you sure you want to remove your stored private key? This action cannot be undone.",
      keyRemoved: "Private key removed successfully",
      
      // Auto-lock Settings
      autoLockTimeLabel: "Auto-lock Time",
      autoLockDescription: "Choose how long before the wallet automatically locks for security.",
      autoLock24h: "24 Hours",
      autoLock3d: "3 Days",
      autoLock7d: "7 Days",
      autoLock14d: "14 Days",
      autoLock30d: "30 Days",
      autoLock90d: "90 Days",
      autoLockNever: "Never Auto-lock",
      saveAutoLock: "Save Auto-lock Time",
      autoLockTimeSaved: "Auto-lock time saved successfully",
      autoLockTimeSaveFailed: "Failed to save auto-lock time",
      selectAutoLockTime: "Please select an auto-lock time",
      
      // Lock/Unlock Messages
      walletLocked: "Wallet locked successfully",
      walletUnlocked: "Wallet unlocked successfully",
      unlockFailed: "Failed to unlock wallet. Please check your password.",
      enterUnlockPassword: "Please enter your password to unlock the wallet",
      
      // Multi-key Management
      masterPasswordLabel: "Master Password",
      masterPasswordDescription: "Enter your master password to access your stored private keys.",
      setupMasterPasswordLabel: "Create Master Password",
      setupMasterPasswordDescription: "This password will protect all your stored private keys.",
      keyNameLabel: "Wallet Name",
      activeKeyLabel: "Active Wallet",
      activeKeyDescription: "Select which wallet to use for transactions.",
      storedKeysLabel: "Stored Wallets",
      addNewKey: "Add New Wallet",
      addKey: "Add Wallet",
      setupWallet: "Setup Wallet",
      authenticate: "Authenticate",
      logout: "Logout",
      cancel: "Cancel",
      edit: "Edit",
      remove: "Remove",
      switchTo: "Switch",
      
      // Multi-key Status Messages
      authSuccess: "Authentication successful",
      authFailed: "Authentication failed. Please check your password.",
      walletSetupSuccess: "Wallet setup successful!",
      walletSetupFailed: "Wallet setup failed",
      keyAdded: "Wallet added successfully!",
      keyAddFailed: "Failed to add wallet",
      keySwitched: "Switched to selected wallet",
      keySwitchFailed: "Failed to switch wallet",
      keyRemoved: "Wallet removed successfully",
      keyRemoveFailed: "Failed to remove wallet",
      keyNameUpdated: "Wallet name updated successfully",
      keyNameUpdateFailed: "Failed to update wallet name",
      confirmLogout: "Are you sure you want to logout? You will need to re-enter your master password.",
      loggedOut: "Logged out successfully",
      noKeysStored: "No wallets stored",
      
      // Multi-key Input Validation
      enterMasterPassword: "Please enter a master password",
      enterKeyName: "Please enter a name for your wallet",
      enterNewKeyName: "Enter new name for this wallet:",
      
      // Multi-key Status Display
      walletAuth: "Authentication required",
      walletSetup: "No wallets configured",
      walletReady: "Wallet ready",
      walletLocked: "Wallet locked",
      walletLoading: "Wallet loading..."
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
        selectStakedRecord: "Select Staked Record",
        selectPlaceholder: "Select Stable Coin",
        selectStakingRecord: "Select Staking Record",
        selectRecordPlaceholder: "Select Staking Record",
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
        cycle: "Cycle {cycle}",
        notClaimed: "Not Claimed",
      },
      notification: {
        noRewards: "No rewards available",
        stakeSuccess: "Stake successful",
        stakeFailed: "Stake failed",
        withdrawSuccess: "Withdraw successful",
        withdrawFailed: "Withdraw failed",
        claimSuccess: "Claim successful",
        claimFailed: "Claim failed",
        claimAllSuccess: "All rewards claimed successfully",
        claimAllFailed: "Failed to claim all rewards",
        insufficientAuth: "Insufficient authorization",
        authSuccess: "Authorization successful",
        authFailed: "Authorization failed",
        invalidAmount: "Invalid amount",
        amountMultiple10: "Amount must be multiple of 10",
        noStakingRecord: "No staking record selected",
        loadingData: "Loading data...",
        dataRefreshFailed: "Failed to refresh data",
        walletConnectionError: "Wallet connection error",
        contractInitError: "Contract initialization error",
        unknownError: "An unknown error occurred",
        connectWallet: "Connect Wallet",
        selectCoin: "Select Coin",
        approveConfirmation: "Approve Confirmation",
        approving: "Approving...",
        approveSuccess: "Approve successful",
        approveFailed: "Approve failed",
        claimConfirmation: "Claim Confirmation",
        
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
      welcome: "Welcome to Petworld!",
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
      transactionTime: "Transaction Time",
      paymentTokenAddress: "Payment Token"
    },
    
    // Common keys
    buy: "Buy",
    details: "Details",
    level: "Level: {level}",
    lottery:{
      batchResultTitle:"Batch Result",
      summary:"Summary",
    },

    // Shop-related terms
    shop: {
      title: "Shop",
      subtitle: "Get Rare Pets",
      description: "Buy eggs to get rare pets, or buy pet food",
      freePwFoodDesc:"Every 24 hours, each address can claim 10 pet food",
      
      // items
      items: {
        commonEgg: "Common Egg",
        rareEgg: "Rare Egg",
        legendaryEgg: "Legendary Egg",
        pwfood: "Pet Food",
        freeNFT: "Free Pet",
        claimEggs: "Claim Unclaimed Pets",
        freePwFood: "Free Pet Food"
      },
      
      // item descriptions
      commonEggDesc: "Higher chance to get common and excellent pets",
      rareEggDesc: "Higher chance to get rare pets",
      legendaryEggDesc: "Higher chance to get legendary pets",
      pwfoodDesc: "Used to feed your pets, restore satiety",
      freeNFTDesc: "Each address can claim one free pet NFT",
      claimEggsDesc: "Claim unclaimed pets after lottery",
      
      // claim texts
      claim: "Claim",
      alreadyClaimed: "Already Claimed",
      claimed: "Claimed",
      freeNFTClaimSuccess: "Free NFT claim successful!",
      alreadyClaimedFreeNFT: "You have already claimed the free NFT",
      
      // claim texts
      claimEggsConfirmTitle: "Claim Unclaimed Pets",
      claimEggsConfirm: "Confirm Claim",
      claimEggsCancel: "Cancel",
      claimEggsSuccess: "Successfully claimed {count} pets!",
      noPendingEggs: "No pending pets",
      pendingEggsCount: "You have {total} pending pets: {rare} rare and {legendary} legendary",
      
      // buying status
      buying: "Buying...",
      buySuccess: "Purchase successful!",
      buyFailed: "Purchase failed",
      buyCommonEggSuccess: "Common egg purchase successful!",
      buyRareEggSuccess: "Rare egg purchase successful!",
      buyLegendaryEggSuccess: "Legendary egg purchase successful!",
      buyCommonEggFailed: "Common egg purchase failed",
      buyRareEggFailed: "Rare egg purchase failed",
      buyLegendaryEggFailed: "Legendary egg purchase failed",
      buyingCommonEgg: "Buying common egg...",
      buyingRareEgg: "Buying rare egg...",
      buyingLegendaryEgg: "Buying legendary egg...",
      
      // shop related
      inviterTip: "Please enter the inviter address, so you and your friends can get rewards",
      foodAmount: "Purchase amount ($):",
      foodAmountTip: "Enter an integer amount between 1 and 10000",
      batchAmount: "Quantity (1-5):",
      quantity: "Quantity",
      price: "Price",
      total: "Total",
      batchPurchasing: "Batch purchasing...",
      batchEggs: "eggs",
      unclaimedEggs: "Unclaimed eggs",
      rareEggs: "Rare eggs",
      legendaryEggs: "Legendary eggs",
      confirmClaim: "Confirm claim",
      claimUnclaimedEggs: "Claim unclaimed eggs",
      nowCanClaim:"Now can claim",
      batchAmountTip:"Enter an integer amount between 1 and 5",
      inviterPlaceholder: "Inviter address (optional)",
      totalPrice: "Total price",
      notification: {
        // General
        success: "Success!",
        error: "Error occurred",
        warning: "Warning",
        info: "Information",
        
       
        noClaimableEggs: "No claimable pets",
        requiredNFTFirst: "Claim free pet first",
        
        // Payment process
        paymentProcessing: "Payment processing...",
        paymentSuccess: "Payment successful!",
        paymentFailed: "Payment failed: {message}",
        paymentCancelled: "Payment cancelled",
        
        // Authorization
        checkingApprovals: "Checking necessary approvals...",
        requestingApproval: "Requesting token approval...",
        authorizationSuccess: "Authorization successful",
        authorizationFailed: "Token authorization failed: {message}",
        userCancelledAuth: "You canceled the authorization transaction",
        
        // Purchase process
        purchasingEggs: "Purchasing {eggName}...",
        purchasingFood: "Purchasing pet food...",
        purchaseSuccess: "Purchase successful!",
        purchaseFailed: "Purchase failed",
        purchaseEggsSuccess: "Congratulations! Successfully purchased {count} {eggName}",
        purchaseFoodSuccess: "Congratulations! Successfully purchased {quantity} pet food",
        purchaseFoodSuccessModal: "Successfully purchased {quantity} pet food!",
        purchaseFoodTip: "Pet food has been added to your inventory. Use it to feed your pets and keep them happy!",
        purchaseNoLotteryResult: "Successfully purchased eggs, please check your collection for new pets.",
        purchaseNoLotteryDisplay: "Successfully purchased eggs, but unable to display lottery results",
        
        // Claim process
        claimingNFT: "Claiming free pet...",
        claimingFood: "Claiming free pet food...",
        claimingEggs: "Claiming unclaimed pets...",
        claimNFTSuccess: "Free pet claim successful! Please check your new pet in the game",
        claimFoodSuccess: "Free pet food claim successful! Get {count} pet food",
        claimFreeFoodSuccessModal: "Successfully claimed {count} free pet food!",
        claimFreeFoodTip: "Come back tomorrow to claim more free pet food. Feed your pets regularly to keep them healthy!",
        claimEggsSuccess: "Successfully claimed {count} pets! Please check them in the game",
        
        // Validation errors
        amountInputError: "Please enter an integer amount",
        amountRangeError: "Please enter an amount between 1 and {min} and {max}",
        invalidLotteryResult: "Invalid lottery result",
        
        // Status messages
        alreadyClaimedNFT: "You have already claimed the free pet",
        alreadyClaimedFood: "Today has claimed the free pet food, please come back tomorrow",
        noClaimableEggs: "You do not have claimable pets",
        requiredNFTFirst: "Please claim the free pet NFT first",
        
        // Input issues
        invalidInviterAddress: "The inviter address format is invalid, using the default address",
        amountInputNotFound: "Cannot find the amount input box",
        
        // Result notifications
        pendingRareEggs: "Successfully purchased eggs, please wait for 1 minute and then claim your new pet in the \"claim unclaimed pets\" module",
        claimSuccess: "Claim successful!",
        claimFailed: "Claim failed: {message}",

        pendingClaimAlert: "Pending Claim Alert",
        pendingClaimAlertMessage: "Successfully purchased eggs, please wait for 1 minute and then claim your new pet in the \"claim unclaimed pets\" module",
        pendingClaimAlertTip: "Blockchain will take 1 minute to confirm the transaction, please wait patiently",
      }
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
      claimButton: "Claim All",
      yourRecords: "Your Burning Records",
      noRecords: "No burning records found",
      expiryWarning: "Important: You must claim your rewards within 1200 cycles after burning, otherwise they will expire and you will lose all PwPoints and PW rewards."
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