/**
 * Chinese locale for the application
 */
(function() {

  window.APP_LOCALES = window.APP_LOCALES || {};
  
  /**
   * Chinese localization configuration
   */
  const zhTwTranslations = {
    // common terms
    common: {
      connect: "連接",
      disconnect: "斷開連接",
      connecting: "連接中",
      cancel: "取消",
      retry: "重試",
      error: "錯誤",
      success: "成功",
      wallet: "錢包",
      loading: "加載中",
      close: "關閉",
      yes: "是",
      no: "否",
      ok: "確定",
      confirm: "確認",
      warning: "警告",
      info: "信息",
      back: "返回",
      next: "下一步",
      previous: "上一頁",
      save: "保存",
      delete: "刪除",
      edit: "編輯",
      create: "創建",
      update: "更新",
      settings: "設定",
      help: "幫助",
      logout: "登出",
      login: "登錄",
      register: "註冊",
      search: "搜索",
      share: "分享",
      copy: "複製",
      paste: "粘貼",
      cut: "剪切",
      reset: "重置",
      all: "全部",
      copyright: "© 2025 寵物世界 - 版權所有",
      pageInfo: "第 {{current}} 頁，共 {{total}} 頁",
      pageInfoWithTotal: "第 {{current}} 頁，共 {{total}} 頁（{{items}} 條記錄）",
      featureNotImplemented: "{feature}即將上線，敬請期待！"
    },
    
    errors: {
      notFound: "未找到",
      serverError: "伺服器錯誤",
      connectionFailed: "連接失敗",
      unknownError: "未知錯誤",
      invalidInput: "無效輸入",
      requiredField: "此字段為必填項"
    },
    quality: {
      common: "普通",
      good: "優秀",
      excellent: "卓越",
      rare: "稀有",
      legendary: "傳奇"
    },
    navigation: {
      home: "首頁",
      profile: "個人資料",
      settings: "設定",
      pets: "我的寵物",
      inventory: "庫存",
      shop: "商店",
      market: "市場",
      play: "遊戲",
      about: "關於",
      contact: "聯絡我們",
      more: "更多",
      stableStaking: "穩定幣質押",
      pwStaking: "PW質押",
      burn: "燃燒",
      reverseBurn: "反向燃燒",
      exchange: "兌換",
      staking: "PW質押",
      reverseburn: "反向燃燒",
    },
    
    // wallet connection
    wallet: {
      title: "連接錢包",
      noWallet: "未連接錢包",
      pleaseConnect: "請連接您的錢包以繼續",
      connectingTo: "正在連接{walletName}...",
      confirmInWallet: "請在您的錢包中確認連接請求",
      connectWallet: "連接錢包",
      connectWalletDescription: "連接您的錢包以與區塊鏈交互",
      connect: "連接錢包",
      disconnect: "斷開連接",
      connecting: "連接中...",
      connected: "已連接",
      notConnected: "未連接錢包",
      connectHint: "連接錢包後即可領養可愛的寵物！",
      walletAddress: "錢包地址",
      walletBalance: "餘額",
      connectError: "連接錢包失敗",
      chooseWallet: "選擇要連接的錢包",
      copyAddress: "複製地址",
      addressCopied: "地址已複製到剪貼板！",
      emptyWallet: "未連接錢包",
      metamask: "MetaMask",
      walletConnect: "WalletConnect",
      connectUsingMetamask: "使用MetaMask瀏覽器擴展連接",
      connectUsingWalletConnect: "使用WalletConnect連接",
      okx: "OKX錢包",
      connectUsingOKX: "使用OKX錢包擴展連接",
      
      // wallet types
      metamask: {
        name: "MetaMask",
        description: "連接到您的MetaMask錢包"
      },
      walletconnect: {
        name: "WalletConnect",
        description: "使用WalletConnect連接"
      },
      okx: {
        name: "OKX錢包",
        description: "連接到您的OKX錢包"
      },
      
      // connection states
      states: {
        connecting: "正在連接錢包...",
        connected: "錢包已連接",
        disconnected: "錢包已斷開連接",
        error: "連接錯誤"
      },
      
      // error messages
      errors: {
        walletNotDetected: "未檢測到{walletName}。請安裝插件並重試。",
        failedToConnect: "連接{walletName}失敗: {message}",
        userRejected: "連接請求被拒絕",
        noAddressReturned: "未能獲取錢包地址",
        unsupportedWallet: "不支持的錢包類型: {walletType}"
      },
      
      // installation guide
      install: {
        metamask: "點擊此處安裝MetaMask",
        okx: "點擊此處安裝OKX錢包"
      },
      
      // localhost warning for WalletConnect
      localhostWarning: {
        title: "在本地環境(localhost)使用WalletConnect存在限制",
        description: "由於安全原因，WalletConnect在localhost環境下可能無法正常工作。這是因為:",
        reasons: [
          "WalletConnect需要HTTPS環境或安全上下文",
          "本地開發環境使用的HTTP協議不滿足安全要求"
        ],
        solutions: {
          title: "解決方案:",
          options: [
            "將應用部署到支持HTTPS的伺服器",
            "使用MetaMask等瀏覽器插件錢包進行本地測試",
            "使用本地HTTPS伺服器(如ngrok, localtunnel等)"
          ]
        }
      }
    },

    // application specific items
    app: {
      title: "寵物世界"
    },

    // game specific items
    game: {
      title: "寵物世界",
      selectMode: "寵物世界 - 選擇模式",
      sfx: "音效音量",
      bgm: "背景音樂",
      graphics: "圖形質量",
      graphicsLow: "低",
      graphicsMedium: "中",
      graphicsHigh: "高"
    },
    
    // button texts
    button: {
      back: "返回",
      close: "關閉",
      cancel: "取消",
      confirm: "確認",
      buy: "購買",
      create: "創建",
      edit: "編輯",
      delete: "刪除",
      save: "保存",
      load: "加載",
      submit: "提交",
      send: "發送",
      add: "添加",
      view: "查看",
      adopt: "領養",
      feed: "喂食",
      play: "玩耍",
      reward: "獎勵",
      refresh: "刷新",
      viewAll: "查看全部",
      loadMore: "加載更多",
      max: "最大",
      claim: "領取",
      confirm: "確認",
      approve: "授權",
      ok: "確定",
    },
    
    // home welcome text
    home: {
      welcome: {
        title: "歡迎來到寵物世界遊戲!",
        description: "探索、收集、培養你的專屬寵物"
      },
      myAssets: "我的資產"
    },
    
    // settings related
    settings: {
      title: "設置",
      appSettings: "應用設置",
      account: "帳戶設置",
      display: "顯示設置",
      audioSettings: "音效設置",
      languageSettings: "語言設置",
      language: "語言",
      audio: "音頻設置",
      game: "遊戲設置",
      performance: "性能設置",
      resetSettings: "重置設置",
      saveSettings: "保存設置",
      settingsSaved: "設置保存成功！",
      confirmReset: "確定要將所有設置重置為默認值嗎？",
      masterVolume: "主音量",
      soundEffects: "音效音量",
      backgroundMusic: "背景音樂",
      voiceVolume: "語音音量",
      muteBackground: "後台靜音",
      uiLanguage: "界面語言",
      resetBtn: "重置設置",
      saveBtn: "保存設置",
      saved: "設置保存成功",
      resetSuccess: "設置已重置為默認值",
      languageChanged: "語言切換成功",
      languageChangeFailed: "語言切換失敗",
      resetButton: "恢復默認設置",
      saveButton: "保存設置",
      theme: "主題",
      tokenSettings: "代幣設置",
      tokenDescription: "代幣描述",
      importTokens: "導入代幣",
      tokenStatus: "代幣狀態",
      tokenDeployed: "代幣已部署",
      tokenNotDeployed: "代幣未部署",
      themeOptions: {
        light: "淺色主題",
        dark: "深色主題",
        auto: "跟隨系統"
      },
      nickname: "用戶昵稱",
      notification: "通知設置",
      notificationOptions: {
        game: "遊戲通知",
        system: "系統消息",
        activity: "活動提醒"
      }
    },
    
    // asset related
    asset: {
      token: "遊戲代幣",
      nftPets: "NFT寵物",
      equipment: "遊戲裝備",
      count: "只",
      pieces: "件"
    },
    
    // network related
    network: {
      wrongNetwork: "錯誤的網絡連接",
      pleaseSwitch: "請將您的錢包切換到 {requiredNetwork} 網絡以繼續使用寵物世界。",
      switchNetwork: "切換網絡",
      networkChanged: "網絡已切換",
      checkingNetwork: "檢查網絡中...",
      currentNetwork: "當前網絡",
      requiredNetwork: "需要的網絡",
      switchFailed: "網絡切換失敗",
      tryManually: "請嘗試在錢包中手動切換網絡",
      addNetwork: "添加網絡",
      bscTestnet: "幣安智能鏈測試網",
      bscMainnet: "幣安智能鏈主網"
    },
    stableStaking: {
      title: "穩定幣質押",
      description: "質押穩定幣賺取收益",
      stats: {
        currentCycle: "當前周期",
        nextCycle: "下一周期",
        rewardRate: "收益率",
        totalStaked: "總質押量",
        totalClaimed: "總收益",
      },
      tabs: {
          stake: "質押",
          withdraw: "提領",
      },
      form: {
        selectStableCoin: "選擇穩定幣",
        stakeAmount: "質押金額",
        balance: "餘額",
        max: "最大",
        stake: "質押",
        withdraw: "提領",
        withdrawAmount: "提領金額",
        selectStakedCoin: "選擇質押幣",
        stakedBalance: "質押餘額",
        selectStakedRecord: "選擇質押記錄",
        selectPlaceHolder: "選擇穩定幣",
        selectStakingRecord: "選擇質押記錄",
        selectRecordPlaceholder: "選擇質押記錄",
      },
      history: {
        title: "質押歷史",
        stableCoin: "穩定幣",
        amount: "金額",
        status: "狀態",
        lastClaimed: "最後領取",
        pendingRewards: "待領取收益",
        actions: "操作",
        noHistory: "沒有質押歷史",
        cycle: "周期",
      },
      notification: {
        noRewards: "沒有收益",
        stakeSuccess: "質押成功",
        stakeFailed: "質押失敗",
        withdrawSuccess: "提領成功",
        withdrawFailed: "提領失敗",
        claimSuccess: "領取成功",
        claimFailed: "領取失敗",
        claimAllSuccess: "全部領取成功",
        claimAllFailed: "全部領取失敗",
        insufficientAuth: "授權不足",
        authSuccess: "授權成功",
        authFailed: "授權失敗",
        invalidAmount: "無效金額",
        amountMultiple10: "金額必須是10的倍數",
        noStakingRecord: "沒有質押記錄",
        loadingData: "加載數據中...",
        dataRefreshFailed: "刷新數據失敗",
        walletConnectionError: "錢包連接錯誤",
        contractInitError: "合約初始化錯誤",
        unknownError: "未知錯誤",
        connectWallet: "連接錢包",
        selectCoin: "選擇穩定幣",
        approveConfirmation: "授權確認",
        approving: "授權中...",
        approveSuccess: "授權成功",
        approveFailed: "授權失敗",
      }
    },
    // pets related
    pets: {
      title: "我的寵物",
      myPets: "我的寵物",
      myPetsList: "我的寵物列表",
      adoptNew: "領養新寵物",
      adoptHint: "點擊蛋領取你的第一個寵物!",
      level: "等級",
      details: "寵物詳情",
      feedAll: "餵養全部",
      claimAll: "領取全部",
      feedFriend: "餵養好友寵物",
      sort: {
        levelDesc: "等級: 從高到低",
        levelAsc: "等級: 從低到高",
        rarityDesc: "稀有度: 從高到低",
        rarityAsc: "稀有度: 從低到高"
      },
      noPets: "您還沒有寵物",
      noPetsDesc: "前往商店獲取您的第一只寵物！",
      viewDetails: "查看詳情",
      feedPet: "喂食",
      petStats: "寵物狀態",
      refreshing: "刷新中...",
      refreshSuccess: "刷新成功！",
      refreshFailed: "刷新失敗，請重試",
      loadingPets: "正在加載寵物數據..."
    },
    
    // market related
    market: {
      title: "寵物市場",
      searchPlaceholder: "搜索寵物...",
      sortPriceAsc: "價格: 從低到高",
      sortPriceDesc: "價格: 從高到低",
      sortLevelAsc: "等級: 從低到高",
      sortLevelDesc: "等級: 從高到低",
      price: "價格",
      price_low_to_high: "價格: 從低到高",
      price_high_to_low: "價格: 從高到低",
      marketplace: "市場",
      listNFT: "上架NFT",
      manageListings: "管理我的上架",
      viewTransactionHistory: "高級卡片交易記錄",
      transactionHistoryTitle: "高級卡片交易記錄",
      sortBy: "排序方式",
      sortByTime: "按時間排序",
      sortByPrice: "按價格排序",
      filterByQuality: "按品質篩選",
      allQualities: "所有高級品質",
      noTransactions: "沒有找到高級卡片交易記錄",
      loadingTransactions: "加載交易歷史...",
      rarity: {
        free: "免費",
        common: "普通",
        good: "優秀",
        excellent: "精良",
        rare: "稀有",
        legendary: "傳奇"
      }
    },
    
    // footer related
    footer: {
      about: "關於我們",
      terms: "服務條款",
      privacy: "隱私政策",
      help: "幫助中心"
    },
    
    // index related
    index: {
      welcome: "歡迎來到寵物世界!",
      selectMode: "請選擇你想要進入的遊戲模式",
      gameMode: "遊戲模式",
      gameModeDesc: "沉浸式寵物養成遊戲體驗，與寵物互動，完成任務獲得獎勵",
      simpleMode: "普通模式",
      simpleModeDesc: "簡潔界面，輕鬆管理您的寵物和資產",
      enterGame: "進入遊戲",
      enterApp: "進入應用"
    },
    
    // quality levels
    GOOD: "優秀",
    EXCELLENT: "精良",
    RARE: "稀有",
    LEGENDARY: "傳奇",
    nft: {
      tokenId: "代幣ID",
      quality: "品質",
      seller: "賣家",
      buyer: "買家",
      price: "價格",
      transactionTime: "交易時間",
      paymentTokenAddress: "支付代幣地址",
    },
    
    // public keys
    buy: "購買",
    details: "詳情",
    level: "等級: {level}",
    lottery:{
      batchResultTitle:"批次結果",
      summary:"摘要",
    },
    // shop page
    shop: {
      title: "商店",
      subtitle: "獲取稀有寵物",
      description: "在這裡購買彩蛋來獲取稀有寵物，或者購買寵物食物",
      freePwFoodDesc:"每24小時，每個地址可以領取10個寵物食物",
      
      // items
      items: {
        commonEgg: "普通蛋",
        rareEgg: "稀有蛋",
        legendaryEgg: "傳奇蛋",
        pwfood: "寵物食物",
        freeNFT: "免費寵物",
        claimEggs: "領取未領取的寵物",
        freePwFood: "免費寵物食物"
      },
      
      // item descriptions
      commonEggDesc: "開出普通和優質寵物的機率更高",
      rareEggDesc: "有較高機率開出稀有寵物",
      legendaryEggDesc: "有機率開出傳說級別的稀有寵物",
      pwfoodDesc: "用來餵養您的寵物，恢復飽食度",
      freeNFTDesc: "每個地址可免費領取一個寵物NFT",
      claimEggsDesc: "領取抽獎後未領取的寵物NFT",
      
      // claim texts
      claim: "領取",
      alreadyClaimed: "已領取",
      claimed: "已領取",
      freeNFTClaimSuccess: "免費NFT領取成功！",
      alreadyClaimedFreeNFT: "您已經領取過免費NFT",
      
      // claim texts
      claimEggsConfirmTitle: "領取未領取的寵物",
      claimEggsConfirm: "確認領取",
      claimEggsCancel: "取消",
      claimEggsSuccess: "成功領取了 {count} 個寵物！",
      noPendingEggs: "無可領取寵物",
      pendingEggsCount: "您有 {total} 個未領取的寵物：稀有 {rare} 個，傳說 {legendary} 個",
      
      // buying status
      buying: "購買中...",
      buySuccess: "購買成功！",
      buyFailed: "購買失敗",
      buyCommonEggSuccess: "普通蛋購買成功!",
      buyRareEggSuccess: "稀有蛋購買成功!",
      buyLegendaryEggSuccess: "傳奇蛋購買成功!",
      buyCommonEggFailed: "普通蛋購買失敗",
      buyRareEggFailed: "稀有蛋購買失敗",
      buyLegendaryEggFailed: "傳奇蛋購買失敗",
      buyingCommonEgg: "購買普通蛋中...",
      buyingRareEgg: "購買稀有蛋中...",
      buyingLegendaryEgg: "購買傳奇蛋中...",
      
      // shop related
      inviterTip: "請輸入邀請人地址，讓自己和好友都能獲得獎勵",
      foodAmount: "購買金額（$）：",
      foodAmountTip: "輸入1-10000之間的整數金額",
      batchAmount: "數量 (1-5):",
      quantity: "數量",
      price: "價格",
      total: "總計",
      batchPurchasing: "批量購買中...",
      batchEggs: "個蛋",
      unclaimedEggs: "未領取蛋",
      rareEggs: "稀有蛋",
      legendaryEggs: "傳奇蛋",
      confirmClaim: "確認領取",
      claimUnclaimedEggs: "領取未領取蛋",
      nowCanClaim:"可以領取",
      batchAmountTip:"請輸入1-5之間的整數",
      inviterPlaceholder: "邀請人地址 (可選)",
      totalPrice: "總價格",
      notification: {
        // General
        success: "成功!",
        error: "發生錯誤",
        warning: "警告",
        info: "資訊",
        
        noClaimableEggs: "沒有可領取的寵物",
        requiredNFTFirst: "請先領取免費寵物NFT",
        // Payment process
        paymentProcessing: "支付處理中...",
        paymentSuccess: "支付成功!",
        paymentFailed: "支付失敗: {message}",
        paymentCancelled: "支付取消",
        
        // Authorization
        checkingApprovals: "檢查必要的授權...",
        requestingApproval: "請求代幣授權...",
        authorizationSuccess: "授權成功",
        authorizationFailed: "代幣授權失敗: {message}",
        userCancelledAuth: "您取消了授權交易",
        
        // Purchase process
        purchasingEggs: "購買 {eggName}...",
        purchasingFood: "購買寵物食物...",
        purchaseSuccess: "購買成功!",
        purchaseFailed: "購買失敗",
        purchaseEggsSuccess: "恭喜! 成功購買了 {count} {eggName}",
        purchaseFoodSuccess: "恭喜! 成功購買了 {quantity} 寵物食物",
        purchaseNoLotteryResult: "成功購買了蛋, 請檢查您的收藏以獲得新寵物。",
        purchaseNoLotteryDisplay: "成功購買了蛋, 但無法顯示抽獎結果",
        
        // Claim process
        claimingNFT: "領取免費寵物...",
        claimingFood: "領取免費寵物食物...",
        claimingEggs: "領取未領取的寵物...",
        claimNFTSuccess: "免費寵物領取成功! 請檢查您的遊戲中的新寵物",
        claimFoodSuccess: "免費寵物食物領取成功! 獲得 {count} 寵物食物",
        claimEggsSuccess: "成功領取了 {count} 個寵物! 請檢查它們",
        
        // Validation errors
        amountInputError: "請輸入整數金額",
        amountRangeError: "請輸入1到{min}和{max}之間的金額",
        invalidLotteryResult: "無效的抽獎結果",
        
        // Status messages
        alreadyClaimedNFT: "您已經領取過免費寵物",
        alreadyClaimedFood: "今天已經領取過免費寵物食物, 請明天再來",
        noClaimableEggs: "您沒有可領取的寵物",
        requiredNFTFirst: "請先領取免費寵物NFT",
        
        // Input issues
        invalidInviterAddress: "邀請人地址格式無效, 使用預設地址",
        amountInputNotFound: "找不到金額輸入框",
        
        // Result notifications
        pendingRareEggs: "成功購買了蛋, 請等待1分鐘後在\"領取未領取的寵物\"模組中領取您的寵物",
        claimSuccess: "領取成功!",
        claimFailed: "領取失敗: {message}",

        pendingClaimAlert: "保留中領取提醒",
        pendingClaimAlertMessage: "成功購買了蛋, 請等待1分鐘後在\"領取未領取的寵物\"模組中領取您的寵物",
        pendingClaimAlertTip: "區塊鏈需要1分鐘來確認交易, 請耐心等待",
      }
    },
    exchange: {
      title: "兌換",
      description: "兌換不同類型的代幣和資產",
      reverseToPoint: "反向轉換",
      reverseToPointRate: "PWR -> PWP比率",
      max: "最大",
      youWillGet: "您將獲得",
      inputAmount: "輸入金額",
      inputBountyAmount: "輸入PWB金額",
      swap: "兌換",
      requiredReverseAmount: "所需反向金額",
      bothToPointRate: "PWR和PWB -> PWP比率",
    },
    staking: {
      overview: '質押總覽',
      totalStaked: '總質押量',
      rewardRate: '年化收益率',
      rewardPool: '獎勵池',
      currentCycle: '當前周期',
      nextCycle: '下一周期',
      yourBalance: '您的餘額',
      yourStaked: '您的質押',
      pendingRewards: '待領取收益',
      lastClaimedCycle: '最後領取周期',
      claim: '領取',
      stake: '質押',
      withdraw: '提領',
      donate: '捐贈',
      amount: '金額',
      max: '最大',
      availableBalance: '可用餘額',
      stakeNow: '立即質押',
      withdrawNow: '立即提領',
      donateNow: '立即捐贈',
      donateHint: '捐贈到質押池',
      availableBalance: '可用餘額',
      stakedBalance: '質押餘額',
      yourStaking: '您的質押',
      stakeWithdraw: '質押/提領',
      donateAmount: '捐贈金額',
    },
    // more features menu related
    moreFeatures: {
      stableStaking: {
        title: "穩定幣質押",
        description: "質押穩定幣賺取收益",
        comingSoon: "穩定幣質押功能即將上線，敬請期待！"
      },
      pwStaking: {
        title: "PW質押",
        description: "質押PW代幣參與生態治理並獲得獎勵",
        comingSoon: "PW質押功能即將上線，敬請期待！"
      },
      burn: {
        title: "燃燒",
        description: "燃燒代幣減少供應，提高稀缺性",
        comingSoon: "燃燒功能即將上線，敬請期待！"
      },
      reverseBurn: {
        title: "反向燃燒",
        description: "特殊的通縮機制，讓您獲得更多獎勵",
        comingSoon: "反向燃燒功能即將上線，敬請期待！"
      },
      exchange: {
        title: "兌換",
        description: "兌換不同類型的代幣和資產",
        comingSoon: "兌換功能即將上線，敬請期待！"
      }
    },
    
    // stablecoin staking related
    modals: {
      staking: {
        title: "穩定幣質押",
        refreshBtn: "刷新",
        staked: "已質押",
        reward: "獎勵",
        apr: "年化收益率",
        stakeTab: "質押",
        withdrawTab: "提取",
        rewardsTab: "獎勵",
        stakeHistory: "質押歷史",
        chooseStablecoin: "選擇穩定幣",
        inputAmount: "輸入金額",
        amountPlaceholder: "請輸入質押金額",
        max: "最大",
        balance: "餘額",
        stakeBtn: "質押",
        unstakeBtn: "解除質押",
        harvestBtn: "領取獎勵",
        date: "日期",
        coin: "幣種",
        amount: "金額",
        status: "狀態",
        action: "操作",
        statusPending: "處理中",
        statusCompleted: "已完成",
        nothingStaked: "暫無質押記錄",
        availableRewards: "可領取獎勵",
        rewardsInfo: "質押穩定幣可每日獲得PWUSD獎勵",
        viewDetails: "查看詳情",
        stakeSuccess: "質押成功",
        stakeError: "質押失敗: {message}",
        withdrawSuccess: "提取成功",
        withdrawError: "提取失敗: {message}",
        harvestSuccess: "獎勵領取成功",
        harvestError: "獎勵領取失敗: {message}",
        insufficientBalance: "餘額不足",
        connectWalletToStake: "請連接錢包以進行質押操作",
        walletNotConnected: "錢包未連接",
        enterValidAmount: "請輸入有效金額",
        pwusdContract: "PWUSD合約:",
        stakingContract: "質押合約:",
        overview: '質押總覽',
        totalStaked: '總質押量',
        rewardRate: '年化收益率',
        rewardPool: '獎勵池',
        currentCycle: '當前周期',
        nextCycle: '下一周期'
      }
    },
    
    // burn related
    burn: {
      title: "代幣燃燒",
      currentCycle: "當前周期",
      nextCycle: "距離下一周期",
      totalBurned: "總燃燒點數",
      petWorldDistributed: "本周期PW獎勵",
      burnRate: "燃燒比率",
      yourBalance: "您的餘額",
      yourStats: "您的燃燒統計",
      yourBurned: "已燃燒點數",
      claimable: "可領取PetWorld",
      amount: "數量",
      burnPoints: "燃燒PwPoint",
      cycles: "周期數",
      cyclesHint: "選擇燃燒的周期數量(3-250周)",
      burnButton: "燃燒",
      claimRewards: "領取獎勵",
      claimInfo: "完成燃燒後，可以在此領取您應得的PetWorld代幣",
      claimCycles: "選擇領取周期",
      claimButton: "全部領取",
      yourRecords: "您的燃燒記錄",
      noRecords: "暫無燃燒記錄",
      expiryWarning: "重要: 燃燒後1200周期內必須領取獎勵，否則將失去所有PwPoints和PW獎勵。"
    },
    
    payment: {
      title: "確認支付",
      supportedTokens: "支持的支付代幣",
      selectToken: "選擇支付代幣",
      itemPrice: "商品價格",
      gasFee: "Gas費用（預估）",
      total: "總計",
      balance: "餘額",
      confirm: "確認支付",
      cancel: "取消"
    },

    // loading page
    loading: {
      title: "寵物世界正在加載",
      description: "正在獲取您的寵物NFT數據，請稍候...",
      connecting: "正在連接區塊鏈...",
      loadingAssets: "正在加載遊戲資源...",
      initializingGame: "正在初始化遊戲...",
      loadingPets: "正在加載您的寵物...",
      loadingComplete: "加載完成！",
      enteringWorld: "正在進入寵物世界...",
      tip1: "提示：定期喂食您的寵物，讓它們保持愉快！",
      tip2: "提示：稀有寵物具有特殊能力！",
      tip3: "提示：您可以在市場上交易您的寵物！",
      tip4: "提示：質押您的代幣以賺取獎勵！",
      tip5: "提示：完成每日任務獲得額外獎勵！"
    }
  };
  
  // register Chinese translation
  if (window.i18n) {
    window.i18n.registerTranslations('zh_tw', zhTwTranslations);
  }
  
  // export to global variable
  window.APP_LOCALES['zh_tw'] = zhTwTranslations;
  
  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { zh_tw: zhTwTranslations };
  }
})(); 