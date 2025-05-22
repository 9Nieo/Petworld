/**
 * English locale for the application
 */
(function() {
    // ensure global i18n object exists
    window.APP_LOCALES = window.APP_LOCALES || {};
    
    const jaTranslations = {
      // Common terms
      common: {
        connect: "接続",
        disconnect: "切断",
        connecting: "接続中",
        cancel: "キャンセル",
        retry: "再試行",
        error: "エラー",
        success: "成功",
        wallet: "ウォレット",
        loading: "ローディング",
        close: "閉じる",
        yes: "はい",
        no: "いいえ",
        ok: "OK",
        confirm: "確認",
        warning: "警告",
        info: "情報",
        back: "戻る",
        next: "次へ",
        previous: "前へ",
        delete: "削除",
        edit: "編集",
        create: "作成",
        update: "更新",
        settings: "設定",
        help: "ヘルプ",
        logout: "ログアウト",
        login: "ログイン",
        register: "登録",
        search: "検索",
        share: "シェア",
        copy: "コピー",
        paste: "ペースト",
        reset: "リセット",
        all: "すべて",
        copyright: "© 2025 Petworld - すべての権利は予約されています",
        pageInfo: "ページ {{current}} of {{total}}",
        pageInfoWithTotal: "ページ {{current}} of {{total}} ({{items}} records)",
        featureNotImplemented: "{feature} はまだ実装されていません、しばらくお待ちください！"
      },
      // Loading page
      loading: {
        title: "PetWorld はローディング中です",
        description: "あなたのペット NFT データを取得中です、しばらくお待ちください...",
        connecting: "ブロックチェーンに接続中...",
        loadingAssets: "ゲームアセットをロード中...",
        initializingGame: "ゲームを初期化中...",
        loadingPets: "あなたのペットをロード中...",
        loadingComplete: "ローディングが完了しました！",
        enteringWorld: "PetWorld に入ります...",
        tip1: "Tip: 定期的にあなたのペットを餌を与えてあげてください！",
        tip2: "Tip: レアなペットは特別な能力を持っています！",
        tip3: "Tip: あなたは市場でペットを取引することができます！",
        tip4: "Tip: トークンをステーキングして報酬を獲得できます！",
        tip5: "Tip: 毎日のクエストを完了してボーナス報酬を獲得できます！"
      },
      
      // Wallet connection
      wallet: {
        title: "ウォレットを接続",
        noWallet: "ウォレットが接続されていません",
        pleaseConnect: "ウォレットを接続して続けてください",
        connectingTo: "ウォレットに接続中...",
        confirmInWallet: "ウォレットで接続要求を確認してください",
        connect: "ウォレットを接続",
        disconnect: "切断",
        notConnected: "ウォレットが接続されていません",
        connectHint: "ウォレットを接続して可愛いペットを領養することができます！",
        
        // Wallet types
        metamask: {
          name: "MetaMask",
          description: "MetaMask ウォレットに接続"
        },
        walletconnect: {
          name: "WalletConnect",
          description: "WalletConnect ウォレットに接続"
        },
        okx: {
          name: "OKX Wallet",
          description: "OKX ウォレットに接続"
        },
        
        // Connection states
        states: {
          connecting: "ウォレットに接続中...",
          connected: "ウォレットが接続されています",
          disconnected: "ウォレットが切断されています",
          error: "接続エラー"
        },
        
        // Errors
        errors: {
          walletNotDetected: "{walletName} が検出されません。拡張機能をインストールして再試行してください。",
          failedToConnect: "{walletName} に接続できません: {message}",
          userRejected: "接続要求が拒否されました",
          noAddressReturned: "ウォレットアドレスを取得できませんでした",
          unsupportedWallet: "サポートされていないウォレットタイプ: {walletType}"
        },
        
        // Installation guides
        install: {
          metamask: "ここをクリックして MetaMask をインストール",
          okx: "ここをクリックして OKX ウォレットをインストール"
        },
        
        // Localhost warning for WalletConnect
        localhostWarning: {
          title: "ローカルホスト環境での制限",
          description: "セキュリティ上の理由から、ローカルホスト環境では WalletConnect が適切に動作しない可能性があります。",
          reasons: [
            "WalletConnect は HTTPS または安全なコンテキストが必要です",
            "HTTP で開発環境を使用するとセキュリティ要件を満たせません"
          ],
          solutions: {
            title: "解決策:",
            options: [
              "HTTPS が有効なサーバーにアプリケーションをデプロイしてください",
              "ローカルテストには MetaMask のようなブラウザ拡張ウォレットを使用してください",
              "ローカル HTTPS サーバー (ngrok, localtunnel など) を使用してください"
            ]
          }
        },
        connectWallet: "ウォレットを接続",
        connectWalletDescription: "ブロックチェーンとやり取りするためにウォレットを接続してください。",
        walletAddress: "ウォレットアドレス",
        walletBalance: "バランス",
        connectError: "ウォレット接続に失敗しました",
        chooseWallet: "接続するウォレットを選択してください",
        copyAddress: "アドレスをコピー",
        addressCopied: "アドレスがクリップボードにコピーされました！",
        emptyWallet: "ウォレットが接続されていません",
        connectUsingMetamask: "MetaMask ブラウザ拡張を使用して接続",
        connectUsingWalletConnect: "WalletConnect を使用して接続",
        connectUsingOKX: "OKX ウォレット拡張を使用して接続"
      },
  
      // Application-specific terms
      app: {
        title: "PetWorld"
      },
  
      // Game-specific terms
      game: {
        title: "PetWorld",
        selectMode: "PetWorld - モードを選択",
        sfx: "サウンドエフェクト",
        bgm: "背景音楽",
        graphics: "グラフィックス品質",
        graphicsLow: "低",
        graphicsMedium: "中",
        graphicsHigh: "高"
      },
  
      // Navigation terms
      navigation: {
        home: "ホーム",
        pets: "ペット",
        shop: "ショップ",
        market: "マーケットプレイス",
        settings: "設定",
        more: "もっと",
        stableStaking: "安定したステーキング",
        pwStaking: "PW ステーキング",
        burn: "燃やす",
        reverseBurn: "リバース バーン",
        exchange: "交換",
        staking: "PW ステーキング",
        reverseburn: "リバースバーン",
      },
  
      // Tab labels
      tabs: {
        pets: "ペット",
        marketplace: "マーケットプレイス",
        activities: "アクティビティ",
        settings: "設定"
      },
  
      // Home welcome text
      home: {
        welcome: {
          title: "PetWorld ゲームへようこそ！",
          description: "探索、収集、そしてあなたのペットを育てましょう"
        },
        myAssets: "私の資産"
      },
  
      // Network detection
      network: {
        wrongNetwork: "間違ったネットワーク接続",
        pleaseSwitch: "PetWorld を続けるには、ウォレットを {requiredNetwork} ネットワークに切り替えてください。",
        switchNetwork: "ネットワークを切り替える",
        networkChanged: "ネットワークが切り替えられました",
        checkingNetwork: "ネットワークを確認中...",
        currentNetwork: "現在のネットワーク",
        requiredNetwork: "必要なネットワーク",
        switchFailed: "ネットワーク切り替えに失敗しました",
        tryManually: "手動でネットワークを切り替えてください",
        addNetwork: "ネットワークを追加",
        bscTestnet: "BSC テストネット",
        bscMainnet: "BSC メインネット"
      },
  
      // Button labels
      button: {
        save: "保存",
        cancel: "キャンセル",
        connect: "ウォレットを接続",
        disconnect: "切断",
        back: "戻る",
        refresh: "更新",
        view: "表示",
        trade: "取引",
        use: "使用",
        transfer: "転送",
        buy: "購入",
        feed: "餌",
        max: "最大",
        claim: "主張",
        confirm: "確認",
        approve: "承認",
        ok: "OK",
      },
      quality: {
        common: "一般的な",
        good: "良い",
        excellent: "優れた",
        rare: "珍しい",
        legendary: "伝説の"
      },
      // Settings-related terms
      settings: {
        title: "設定",
        appSettings: "アプリ設定",
        account: "アカウント設定",
        display: "表示設定",
        audioSettings: "音声設定",
        languageSettings: "言語設定",
        bgMusic: "背景音楽",
        soundEffects: "サウンドエフェクト",
        masterVolume: "マスター音量",
        voiceVolume: "声量",
        muteBackground: "背景でミュート",
        resetBtn: "設定をリセット",
        saveBtn: "設定を保存",
        saved: "設定が正常に保存されました",
        resetSuccess: "設定がデフォルトにリセットされました",
        theme: "テーマ",
        tokenSettings: "トークン設定",
        tokenDescription: "トークンの説明",
        importTokens: "トークンをインポート",
        tokenStatus: "トークンのステータス",
        tokenDeployed: "トークンがデプロイされました",
        tokenNotDeployed: "トークンがデプロイされていません",
        themeOptions: {
          light: "ライトテーマ",
          dark: "ダークテーマ",
          auto: "システムに従う"
        },
        nickname: "ニックネーム",
        notification: "通知設定",
        notificationOptions: {
          game: "ゲーム通知",
          system: "システムメッセージ",
          activity: "アクティビティのリマインダー"
        },
        languageChanged: "言語が正常に変更されました",
        languageChangeFailed: "言語の変更に失敗しました",
        language: "言語",
        audio: "音声設定",
        game: "ゲーム設定",
        performance: "パフォーマンス設定",
        resetSettings: "設定をリセット",
        saveSettings: "設定を保存",
        settingsSaved: "設定が正常に保存されました！",
        confirmReset: "本当にすべての設定をデフォルトにリセットしますか？",
        backgroundMusic: "背景音楽",
        uiLanguage: "UI言語",
        resetButton: "デフォルトにリセット",
        saveButton: "設定を保存"
      },
  
      // Asset-related terms
      asset: {
        count: "ペット",
        pieces: "アイテム"
      },
  
      // Network-related terms
      network: {
        ethereum: "Ethereum メインネット",
        binance: "Binance Smart Chain",
        polygon: "Polygon"
      },
  
      // Pet-related terms
      pets: {
        title: "私のペット",
        noPets: "まだペットがいません",
        adoptNew: "新しいペットを領養",
        adoptHint: "クリックして最初のペットを領養してください！",
        feed: "餌",
        play: "遊ぶ",
        details: "ペットの詳細",
        myPets: "私のペット",
        myPetsList: "私のペットリスト",
        level: "レベル",
        feedAll: "すべて餌",
        claimAll: "すべて主張",
        feedFriend: "友達のペットを餌",
        sort: {
          levelDesc: "レベル: 高いから低い",
          levelAsc: "レベル: 低いから高い",
          rarityDesc: "珍しさ: 高いから低い",
          rarityAsc: "珍しさ: 低いから高い"
        }
      },
      stableStaking: {
        title: "安定したステーキング",
        description: "安定したコインをステーキングして報酬を獲得",
        stats: {
          currentCycle: "現在のサイクル",
          nextCycle: "次のサイクル",
          rewardRate: "報酬率",
          totalStaked: "総ステーキング",
          totalClaimed: "総報酬",
        },
        tabs: {
            stake: "ステーキング",
            withdraw: "引き出す",
        },
        form: {
          selectStableCoin: "安定したコインを選択",
          stakeAmount: "ステーキング量",
          balance: "バランス",
          max: "最大",
          stake: "ステーキング",
          withdraw: "引き出す",
          withdrawAmount: "引き出す量",
          selectStakedCoin: "ステーキングされたコインを選択",
          stakedBalance: "ステーキングされたバランス",
          selectStakedRecord: "ステーキングされたレコードを選択",
          selectPlaceHolder: "安定したコインを選択",
          selectStakingRecord: "ステーキングされたレコードを選択",
          selectRecordPlaceholder: "ステーキングされたレコードを選択",
        },
        history: {
          title: "ステーキング履歴",
          stableCoin: "安定したコイン",
          amount: "量",
          status: "ステータス",
          lastClaimed: "最後の主張",
          pendingRewards: "保留中の報酬",
          actions: "アクション",
          noHistory: "ステーキング履歴が見つかりません",
          cycle: "サイクル",
        },
        notification: {
          noRewards: "利用可能な報酬はありません",
          stakeSuccess: "ステーキング成功",
          stakeFailed: "ステーキング失敗",
          withdrawSuccess: "引き出し成功",
          withdrawFailed: "引き出し失敗",
          claimSuccess: "主張成功",
          claimFailed: "主張失敗",
          claimAllSuccess: "すべての報酬が正常に主張されました",
          claimAllFailed: "すべての報酬を主張できませんでした",
          insufficientAuth: "不足している認証",
          authSuccess: "認証成功",
          authFailed: "認証失敗",
          invalidAmount: "無効な金額",
          amountMultiple10: "金額は10の倍数でなければなりません",
          noStakingRecord: "ステーキング記録が選択されていません",
          loadingData: "データを読み込んでいます...",
          dataRefreshFailed: "データの更新に失敗しました",
          walletConnectionError: "ウォレット接続エラー",
          contractInitError: "コントラクト初期化エラー",
          unknownError: "不明なエラーが発生しました",
          connectWallet: "ウォレットを接続",
          selectCoin: "コインを選択",
          approveConfirmation: "承認確認",
          approving: "承認中...",
          approveSuccess: "承認成功",
          approveFailed: "承認失敗",
        }
      },
      // Market-related terms
      market: {
        title: "ペットマーケットプレイス",
        searchPlaceholder: "ペットを検索...",
        sortPriceAsc: "価格: 低から高",
        sortPriceDesc: "価格: 高から低",
        sortLevelAsc: "レベル: 低から高",
        sortLevelDesc: "レベル: 高から低",
        price: "価格",
        corgi: "コーギー",
        search_marketplace: "マーケットプレイスを検索...",
        price_low_to_high: "価格: 低から高",
        price_high_to_low: "価格: 高から低",
        marketplace: "マーケットプレイス",
        listNFT: "NFTをリスト",
        manageListings: "私のリストを管理",
        viewTransactionHistory: "プレミアムカード取引履歴",
        transactionHistoryTitle: "プレミアムカード取引履歴",
        sortBy: "ソート",
        sortByTime: "時間でソート",
        sortByPrice: "価格でソート",
        filterByQuality: "品質でフィルター",
        allQualities: "すべてのプレミアム品質",
        noTransactions: "プレミアムカード取引履歴が見つかりません",
        loadingTransactions: "取引履歴を読み込んでいます...",
        rarity:{
          free: "無料",
          common: "一般的な",
          good: "良い",
          excellent: "優れた",
          rare: "珍しい",
          legendary: "伝説の"
        }
      },
      exchange: {
        title: "交換",
        description: "異なるタイプのトークンと資産を交換",
        reverseToPoint: "ポイントに戻す",
        reverseToPointRate: "PWR -> PWP レート",
        max: "最大",
        youWillGet: "あなたは手に入れるでしょう",
        inputAmount: "入力量",
        inputBountyAmount: "入力 PWB 量",
        swap: "交換",
        requiredReverseAmount: "必要な逆量",
        bothToPointRate: "PWR と PWB -> PWP レート",
      },
      // Footer-related terms
      footer: {
        about: "私たちについて",
        terms: "利用規約",
        privacy: "プライバシーポリシー",
        help: "ヘルプセンター"
      },
  
      // Index page terms
      index: {
        welcome: "Petworld へようこそ！",
        selectMode: "あなたの好きなゲームモードを選択してください",
        gameMode: "ゲームモード",
        gameModeDesc: "身に覚えのないペット育成ゲーム体験、ペットとのインタラクションと報酬のためのタスクを完了する",
        simpleMode: "シンプルモード",
        simpleModeDesc: "クリーンなインターフェース、ペットと資産を簡単に管理できます",
        enterGame: "ゲームに入る",
        enterApp: "アプリに入る"
      },
      
      // Quality levels
      GOOD: "良い",
      EXCELLENT: "優れた",
      RARE: "珍しい",
      LEGENDARY: "伝説の",
      nft: {
        tokenId: "トークン ID",
        quality: "品質",
        seller: "売却者",
        buyer: "購入者",
        price: "価格",
        transactionTime: "取引時間",
        paymentTokenAddress: "支払いトークンアドレス",
      },
      
      // Common keys
      buy: "購入",
      details: "詳細",
      level: "レベル: {level}",
      lottery:{
        batchResultTitle:"ロットリー結果",
        summary:"概要",
      },
      // Shop-related terms
      shop: {
        title: "ショップ",
        subtitle: "レアなペットを手に入れる",
        description: "卵を買ってレアなペットを手に入れる、またはペットフードを買う",
        freePwFoodDesc:"24時間ごとに、各アドレスは10のペットフードを主張できます",
        
        // items
        items: {
          commonEgg: "普通の卵",
          rareEgg: "珍しい卵",
          legendaryEgg: "伝説の卵",
          pwfood: "ペットフード",
          freeNFT: "無料のペット",
          claimEggs: "未主張のペットを主張",
          freePwFood: "無料のペットフード"
        },
        
        // item descriptions
        commonEggDesc: "より高い確率で一般的なペットと優れたペットを手に入れる",
        rareEggDesc: "より高い確率で珍しいペットを手に入れる",
        legendaryEggDesc: "より高い確率で伝説のペットを手に入れる",
        pwfoodDesc: "ペットを餌させるために使用され、満腹度を回復する",
        freeNFTDesc: "各アドレスは1つの無料のペットNFTを主張できます",
        claimEggsDesc: "ロットリー後、未主張のペットを主張",
        
        // claim texts
        claim: "主張",
        alreadyClaimed: "すでに主張されています",
        claimed: "主張されています",
        freeNFTClaimSuccess: "無料のNFT主張成功!",
        alreadyClaimedFreeNFT: "あなたはすでに無料のNFTを主張しました",
        
        // claim texts
        claimEggsConfirmTitle: "未主張のペットを主張",
        claimEggsConfirm: "主張する",
        claimEggsCancel: "キャンセル",
        claimEggsSuccess: "成功しました {count} ペットを主張しました!",
        noPendingEggs: "保留中のペットがありません",
        pendingEggsCount: "あなたは {total} 保留中のペット: {rare} 珍しいと {legendary} 伝説の",
        
        // buying status
        buying: "購入中...",
        buySuccess: "購入成功!",
        buyFailed: "購入失敗",
        buyCommonEggSuccess: "普通の卵の購入成功!",
        buyRareEggSuccess: "珍しい卵の購入成功!",
        buyLegendaryEggSuccess: "伝説の卵の購入成功!",
        buyCommonEggFailed: "普通の卵の購入失敗",
        buyRareEggFailed: "珍しい卵の購入失敗",
        buyLegendaryEggFailed: "伝説の卵の購入失敗",
        buyingCommonEgg: "普通の卵を購入中...",
        buyingRareEgg: "珍しい卵を購入中...",
        buyingLegendaryEgg: "伝説の卵を購入中...",
        
        // shop related
        inviterTip: "招待者アドレスを入力してください, あなたとあなたの友達は報酬を獲得できます",
        foodAmount: "購入量 ($):",
        foodAmountTip: "1から10000の整数を入力してください",
        batchAmount: "数量 (1-5):",
        quantity: "数量",
        price: "価格",
        total: "合計",
        batchPurchasing: "バッチ購入中...",
        batchEggs: "卵",
        unclaimedEggs: "未主張の卵",
        rareEggs: "珍しい卵",
        legendaryEggs: "伝説の卵",
        confirmClaim: "主張する",
        claimUnclaimedEggs: "未主張の卵を主張",
        nowCanClaim:"今すぐ主張できます",
        batchAmountTip:"1から5の整数を入力してください",
        inviterPlaceholder: "招待者アドレス (オプション)",
        totalPrice: "合計価格",
        notification: {
          // General
          success: "成功!",
          error: "エラーが発生しました",
          warning: "警告",
          info: "情報",
          
          noClaimableEggs: "主張可能なペットがありません",
          requiredNFTFirst: "無料のペットを先に主張してください",
          // Payment process
          paymentProcessing: "支払い処理中...",
          paymentSuccess: "支払い成功!",
          paymentFailed: "支払い失敗: {message}",
          paymentCancelled: "支払いキャンセル",
          
          // Authorization
          checkingApprovals: "必要な認証を確認しています...",
          requestingApproval: "トークン認証を要求しています...",
          authorizationSuccess: "認証成功",
          authorizationFailed: "トークン認証失敗: {message}",
          userCancelledAuth: "認証取引をキャンセルしました",
          
          // Purchase process
          purchasingEggs: "{eggName}を購入しています...",
          purchasingFood: "ペットフードを購入しています...",
          purchaseSuccess: "購入成功!",
          purchaseFailed: "購入失敗",
          purchaseEggsSuccess: "おめでとうございます! {count} {eggName}を購入しました",
          purchaseFoodSuccess: "おめでとうございます! {quantity} ペットフードを購入しました",
          purchaseNoLotteryResult: "成功しました, 新しいペットをあなたのコレクションで確認してください。",
          purchaseNoLotteryDisplay: "成功しました, しかし、抽選結果を表示できません",
          
          // Claim process
          claimingNFT: "無料のペットを主張しています...",
          claimingFood: "無料のペットフードを主張しています...",
          claimingEggs: "保留中のペットを主張しています...",
          claimNFTSuccess: "無料のペット主張成功! 新しいペットをゲームで確認してください",
          claimFoodSuccess: "無料のペットフード主張成功! {count} ペットフードを獲得してください",
          claimEggsSuccess: "成功しました {count} ペットを主張しました! ゲームで確認してください",
          
          // Validation errors
          amountInputError: "整数の金額を入力してください",
          amountRangeError: "1と{min}と{max}の間の金額を入力してください",
          invalidLotteryResult: "無効な抽選結果",
          
          // Status messages
          alreadyClaimedNFT: "無料のペットをすでに主張しました",
          alreadyClaimedFood: "今日は無料のペットフードを主張しました, 明日再びお越しください",
          noClaimableEggs: "主張可能なペットがありません",
          requiredNFTFirst: "無料のペットNFTを先に主張してください",
          
          // Input issues
          invalidInviterAddress: "招待者アドレスの形式が無効です, デフォルトのアドレスを使用してください",
          amountInputNotFound: "金額入力ボックスが見つかりません",
          
          // Result notifications
          pendingRareEggs: "成功しました, 1分後に\"保留中のペットを主張\"モジュールで新しいペットを主張してください",
          claimSuccess: "主張成功!",
          claimFailed: "主張失敗: {message}",

          pendingClaimAlert: "保留中の主張アラート",
          pendingClaimAlertMessage: "成功しました, 1分後に\"保留中のペットを主張\"モジュールで新しいペットを主張してください",
          pendingClaimAlertTip: "ブロックチェーンは1分間で取引を確認するので、お待ちください",
        }
      },
      
      // More features menu related
      moreFeatures: {
        stableStaking: {
          title: "安定したステーキング",
          description: "安定したコインをステーキングして報酬を獲得",
          comingSoon: "安定したステーキング機能はすぐに来る、気をつけてください！"
        },
        pwStaking: {
          title: "PW ステーキング",
          description: "PW トークンをステーキングして治理に参加し、報酬を獲得",
          comingSoon: "PW ステーキング機能はすぐに来る、気をつけてください！"
        },
        burn: {
          title: "燃やす",
          description: "トークンを燃やして供給を減らし、希少性を高める",
          comingSoon: "燃やす機能はすぐに来る、気をつけてください！"
        },
        reverseBurn: {
          title: "逆燃やす",
          description: "特別な通貨の減少メカニズムで、より多くの報酬を獲得",
          comingSoon: "逆燃やす機能はすぐに来る、気をつけてください！"
        },
        exchange: {
          title: "交換",
          description: "異なるタイプのトークンと資産を交換",
          comingSoon: "交換機能はすぐに来る、気をつけてください！"
        }
      },
  
      // Burn related
      burn: {
        title: "トークン燃やす",
        currentCycle: "現在のサイクル",
        nextCycle: "次のサイクル",
        totalBurned: "総燃やされたポイント",
        petWorldDistributed: "このサイクルのPW報酬",
        burnRate: "燃やす率",
        yourBalance: "あなたのバランス",
        yourStats: "あなたの燃やす統計",
        yourBurned: "燃やされたポイント",
        claimable: "請求できる PetWorld",
        amount: "量",
        burnPoints: "燃やす PwPoint",
        cycles: "サイクル数",
        cyclesHint: "サイクル数を選択してください (3-250)",
        burnButton: "燃やす",
        claimRewards: "報酬を主張",
        claimInfo: "燃やした後、ここであなたのPetWorldトークンを主張できます",
        claimCycles: "主張するサイクルを選択",
        claimButton: "すべて主張",
        yourRecords: "あなたの燃やす記録",
        noRecords: "燃やす記録が見つかりません",
        expiryWarning: "重要: 燃やした後、1200サイクル以内に報酬を主張しない場合、すべてのPwPointsとPW報酬が失われます。"
      },
  
      staking: {
        overview: 'ステーキングの概要',
        totalStaked: '総ステーキング',
        rewardRate: '年間報酬率',
        rewardPool: '報酬プール',
        currentCycle: '現在のサイクル',
        nextCycle: '次のサイクル',
        yourBalance: 'あなたのバランス',
        yourStaked: 'あなたのステーキング',
        pendingRewards: '保留中の報酬',
        lastClaimedCycle: '最後の主張サイクル',
        claim: '主張',
        stake: 'ステーキング',
        withdraw: '引き出す',
        donate: '寄付',
        amount: '量',
        max: '最大',
        availableBalance: '利用可能なバランス',
        stakeNow: '今すぐステーキング',
        withdrawNow: '今すぐ引き出す',
        donateNow: '今すぐ寄付',
        donateHint: 'ステーキングプールに寄付',
        availableBalance: '利用可能なバランス',
        stakedBalance: 'ステーキングされたバランス',
        yourStaking: 'あなたのステーキング',
        stakeWithdraw: 'ステーキング/引き出す',
        donateAmount: '寄付量',
      },
  
      // Payment related
      payment: {
        title: "支払いを確認",
        supportedTokens: "サポートされている支払いトークン",
        selectToken: "支払いトークンを選択",
        itemPrice: "アイテム価格",
        gasFee: "ガス料金 (推定)",
        total: "合計",
        balance: "バランス",
        confirm: "支払いを確認",
        cancel: "キャンセル"
      }
    };
    
    // Add stablecoin staking translations
    jaTranslations.modals = jaTranslations.modals || {};
    jaTranslations.modals.staking = {
      title: "安定したコインステーキング",
      refreshBtn: "更新",
      staked: "ステーキングされた",
      reward: "報酬",
      apr: "APR",
      stakeTab: "ステーキング",
      withdrawTab: "引き出す",
      rewardsTab: "報酬",
      stakeHistory: "ステーキング履歴",
      chooseStablecoin: "安定したコインを選択",
      inputAmount: "入力量",
      amountPlaceholder: "ステーキング量を入力",
      max: "最大",
      balance: "バランス",
      stakeBtn: "ステーキング",
      unstakeBtn: "ステーキング解除",
      harvestBtn: "収穫",
      date: "日付",
      coin: "コイン",
      amount: "量",
      status: "ステータス",
      action: "アクション",
      statusPending: "保留中",
      statusCompleted: "完了",
      nothingStaked: "ステーキング履歴が見つかりません",
      availableRewards: "利用可能な報酬",
      rewardsInfo: "安定したコインをステーキングしてPWUSD報酬を毎日受け取る",
      viewDetails: "詳細を見る",
      stakeSuccess: "ステーキング成功",
      stakeError: "ステーキング失敗: {message}",
      withdrawSuccess: "引き出し成功",
      withdrawError: "引き出し失敗: {message}",
      harvestSuccess: "報酬収穫成功",
      harvestError: "収穫失敗: {message}",
      insufficientBalance: "バランスが不足しています",
      connectWalletToStake: "ステーキングするにはウォレットを接続してください",
      walletNotConnected: "ウォレットが接続されていません",
      enterValidAmount: "有効な量を入力してください",
      pwusdContract: "PWUSD契約:",
      stakingContract: "ステーキング契約:"
    };
    
    // register English translations
    if (window.i18n) {
      window.i18n.registerTranslations('ja', jaTranslations);
    }
    
    // export to global variable
    window.APP_LOCALES['ja'] = jaTranslations;
    
    // CommonJS export
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { ja: jaTranslations };
    }
  })(); 