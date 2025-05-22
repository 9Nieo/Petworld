(function() {
  window.APP_LOCALES = window.APP_LOCALES || {};
  
  const koTranslations = {
    // Common terms
    common: {
      connect: "연결",
      disconnect: "연결 해제",
      connecting: "연결 중",
      cancel: "취소",
      retry: "다시 시도",
      error: "오류",
      success: "성공",
      wallet: "지갑",
      loading: "로딩",
      close: "닫기",
      yes: "예",
      no: "아니오",
      ok: "확인",
      confirm: "확인",
      warning: "경고",
      info: "정보",
      back: "뒤로",
      next: "다음",
      previous: "이전",
      delete: "삭제",
      edit: "수정",
      create: "생성",
      update: "업데이트",
      settings: "설정",
      help: "도움말",
      logout: "로그아웃",
      login: "로그인",
      register: "등록",
      search: "검색",
      share: "공유",
      copy: "복사",
      paste: "붙여넣기",
      reset: "초기화",
      all: "모두",
      copyright: "© 2025 PetWorld - 모든 권리 보유",
      pageInfo: "페이지 {{current}} of {{total}}",
      pageInfoWithTotal: "페이지 {{current}} of {{total}} ({{items}} 레코드)",
      featureNotImplemented: "{feature} 준비중, 잠시만 기다려주세요!"
    },
    // Loading page
    loading: {
      title: "PetWorld가 로딩 중입니다",
      description: "Pet NFT 데이터를 검색 중입니다. 잠시만 기다려주세요...",
      connecting: "블록체인에 연결 중입니다...",
      loadingAssets: "게임 자산을 로딩 중입니다...",
      initializingGame: "게임을 초기화 중입니다...",
      loadingPets: "펫을 로딩 중입니다...",
      loadingComplete: "로딩이 완료되었습니다!",
      enteringWorld: "Petworld에 진입 중입니다...",
      tip1: "Tip: 정기적으로 펫을 먹여 행복하게 유지하세요!",
      tip2: "Tip: 희귀 펫은 특별한 능력을 가지고 있습니다!",
      tip3: "Tip: 당신은 시장에서 펫을 거래할 수 있습니다!",
      tip4: "Tip: 토큰을 스테이크하여 보상을 얻으세요!",
      tip5: "Tip: 일일 퀘스트를 완료하여 보너스 보상을 얻으세요!"
    },
    
    // Wallet connection
    wallet: {
      title: "지갑 연결",
      noWallet: "지갑이 연결되지 않았습니다",
      pleaseConnect: "지갑을 연결하여 계속 진행하세요",
      connectingTo: "지갑에 연결 중입니다...",
      confirmInWallet: "지갑에서 연결 요청을 확인하세요",
      connect: "지갑 연결",
      disconnect: "연결 해제",
      notConnected: "지갑이 연결되지 않았습니다",
      connectHint: "지갑을 연결하여 귀여운 펫을 입양하세요!",
      
      // Wallet types
      metamask: {
        name: "MetaMask",
        description: "지갑에 연결하세요"
      },
      walletconnect: {
        name: "WalletConnect",
        description: "WalletConnect 사용"
      },
      okx: {
        name: "OKX 지갑",
        description: "OKX 지갑에 연결하세요"
      },
      
      // Connection states
      states: {
        connecting: "지갑 연결 중입니다...",
        connected: "지갑 연결됨",
        disconnected: "지갑 연결 해제됨",
        error: "연결 오류"
      },
      
      // Errors
      errors: {
        walletNotDetected: "{walletName} 감지되지 않음. 확장 프로그램을 설치하고 다시 시도하세요.",
        failedToConnect: "{walletName}에 연결 실패: {message}",
        userRejected: "연결 요청 거절됨",
        noAddressReturned: "지갑 주소를 가져오지 못함",
        unsupportedWallet: "지갑 유형 지원되지 않음: {walletType}"
      },
      
      // Installation guides
      install: {
        metamask: "여기를 클릭하여 MetaMask 설치",
        okx: "여기를 클릭하여 OKX 지갑 설치"
      },
      
      // Localhost warning for WalletConnect
      localhostWarning: {
        title: "localhost 환경에서의 제한",
        description: "보안 이유로, WalletConnect는 localhost 환경에서 제대로 작동하지 않을 수 있습니다:",
        reasons: [
          "WalletConnect는 HTTPS 또는 보안 컨텍스트가 필요합니다",
          "HTTP로 개발 환경을 사용하면 보안 요구 사항을 충족하지 못할 수 있습니다"
        ],
        solutions: {
          title: "해결 방법:",
          options: [
            "HTTPS 활성화 서버에 애플리케이션 배포",
            "로컬 테스트에 브라우저 확장 지갑(MetaMask) 사용",
            "로컬 HTTPS 서버(ngrok, localtunnel 등) 사용"
          ]
        }
      },
      connectWallet: "지갑 연결",
      connectWalletDescription: "지갑을 연결하여 블록체인과 상호 작용하세요.",
      walletAddress: "지갑 주소",
      walletBalance: "잔액",
      connectError: "지갑 연결 실패",
      chooseWallet: "지갑 선택",
      copyAddress: "주소 복사",
      addressCopied: "주소가 클립보드에 복사되었습니다!",
      emptyWallet: "지갑이 연결되지 않음",
      connectUsingMetamask: "MetaMask 브라우저 확장 프로그램 사용",
      connectUsingWalletConnect: "WalletConnect 사용",
      connectUsingOKX: "OKX 지갑 확장 프로그램 사용"
    },

    // Application-specific terms
    app: {
      title: "PetWorld"
    },

    // Game-specific terms
    game: {
      title: "PetWorld",
      selectMode: "PetWorld - 모드 선택",
      sfx: "사운드 효과",
      bgm: "배경 음악",
      graphics: "그래픽 퀄리티",
      graphicsLow: "저",
      graphicsMedium: "중",
      graphicsHigh: "고"
    },

    // Navigation terms
    navigation: {
      home: "홈",
      pets: "내 펫",
      shop: "상점",
      market: "시장",
      settings: "설정",
      more: "더 많은",
      stableStaking: "안정적인 스테이킹",
      pwStaking: "PW 스테이킹",
      burn: "불태우기",
      reverseBurn: "리버스 번",
      exchange: "교환",
      staking: "PW 스테이킹",
      reverseburn: "리버스 번",
    },

    // Tab labels
    tabs: {
      pets: "내 펫",
      marketplace: "시장",
      activities: "활동",
      settings: "설정"
    },

    // Home welcome text
    home: {
      welcome: {
        title: "Petworld 게임에 오신 것을 환영합니다!",
        description: "탐험, 수집, 그리고 자신의 펫을 키우세요"
      },
      myAssets: "내 자산"
    },

    // Network detection
    network: {
      wrongNetwork: "잘못된 네트워크 연결",
      pleaseSwitch: "Petworld를 계속 사용하려면 지갑을 {requiredNetwork} 네트워크로 전환하세요.",
      switchNetwork: "네트워크 전환",
      networkChanged: "네트워크 전환 성공",
      checkingNetwork: "네트워크 확인 중...",
      currentNetwork: "현재 네트워크",
      requiredNetwork: "필요한 네트워크",
      switchFailed: "네트워크 전환 실패",
      tryManually: "지갑에서 수동으로 네트워크를 전환하세요",
      addNetwork: "네트워크 추가",
      bscTestnet: "BSC 테스트넷",
      bscMainnet: "BSC 메인넷"
    },

    // Button labels
    button: {
      save: "저장",
      cancel: "취소",
      connect: "지갑 연결",
      disconnect: "연결 해제",
      back: "뒤로",
      refresh: "새로고침",
      view: "보기",
      trade: "거래",
      use: "사용",
      transfer: "전송",
      buy: "구매",
      feed: "먹이",
      max: "최대",
      claim: "클레임",
      confirm: "확인",
      approve: "승인",
      ok: "확인",
    },
    quality: {
      common: "일반",
      good: "좋음",
      excellent: "최고",
      rare: "희귀",
      legendary: "전설"
    },
    // Settings-related terms
    settings: {
      title: "설정",
      appSettings: "앱 설정",
      account: "계정 설정",
      display: "표시 설정",
      audioSettings: "오디오 설정",
      languageSettings: "언어 설정",
      bgMusic: "배경 음악",
      soundEffects: "사운드 효과",
      masterVolume: "마스터 볼륨",
      voiceVolume: "음성 볼륨",
      muteBackground: "배경에서 음소거",
      resetBtn: "설정 초기화",
      saveBtn: "설정 저장",
      saved: "설정이 성공적으로 저장되었습니다",
      resetSuccess: "설정이 기본값으로 초기화되었습니다",
      theme: "테마",
      tokenSettings: "토큰 설정",
      tokenDescription: "토큰 설명",
      importTokens: "토큰 가져오기",
      tokenStatus: "토큰 상태",
      tokenDeployed: "토큰 배포됨",
      tokenNotDeployed: "토큰 배포되지 않음",
      themeOptions: {
        light: "라이트 테마",
        dark: "다크 테마",
        auto: "시스템 따라가기"
      },
      nickname: "닉네임",
      notification: "알림 설정",
      notificationOptions: {
        game: "게임 알림",
        system: "시스템 메시지",
        activity: "활동 알림"
      },
      languageChanged: "언어가 성공적으로 변경되었습니다",
      languageChangeFailed: "언어 변경 실패",
      language: "언어",
      audio: "오디오 설정",
      game: "게임 설정",
      performance: "성능 설정",
      resetSettings: "설정 초기화",
      saveSettings: "설정 저장",
      settingsSaved: "설정이 성공적으로 저장되었습니다!",
      confirmReset: "모든 설정을 기본값으로 초기화하시겠습니까?",
      backgroundMusic: "배경 음악",
      uiLanguage: "UI 언어",
      resetButton: "기본값으로 초기화",
      saveButton: "설정 저장"
    },

    // Asset-related terms
    asset: {
      count: "펫",
      pieces: "아이템"
    },

    // Network-related terms
    network: {
      ethereum: "이더리움 메인넷",
      binance: "빗썸 스마트 체인",
      polygon: "폴리곤"
    },

    // Pet-related terms
    pets: {
      title: "내 펫",
      noPets: "아직 펫이 없습니다",
      adoptNew: "새로운 펫 입양",
      adoptHint: "클릭하여 첫 번째 펫을 입양하세요!",
      feed: "먹이",
      play: "플레이",
      details: "펫 세부 정보",
      myPets: "내 펫",
      myPetsList: "내 펫 목록",
      level: "레벨",
      feedAll: "모두 먹이기",
      claimAll: "모두 클레임",
      feedFriend: "친구 펫 먹이기",
      sort: {
        levelDesc: "레벨: 높은 순서로",
        levelAsc: "레벨: 낮은 순서로",
        rarityDesc: "희귀도: 높은 순서로",
        rarityAsc: "희귀도: 낮은 순서로"
      }
    },
    stableStaking: {
      title: "안정적인 스테이킹",
      description: "안정적인 코인을 스테이킹하여 보상을 얻으세요",
      stats: {
        currentCycle: "현재 주기",
        nextCycle: "다음 주기",
        rewardRate: "보상 수익률",
        totalStaked: "총 스테이킹",
        totalClaimed: "총 보상",
      },
      tabs: {
          stake: "스테이킹",
          withdraw: "출금",
      },
      form: {
        selectStableCoin: "안정적인 코인 선택",
        stakeAmount: "스테이킹 금액",
        balance: "잔액",
        max: "최대",
        stake: "스테이킹",
        withdraw: "출금",
        withdrawAmount: "출금 금액",
        selectStakedCoin: "스테이킹 코인 선택",
        stakedBalance: "스테이킹 잔액",
        selectStakedRecord: "스테이킹 레코드 선택",
        selectPlaceHolder: "안정적인 코인 선택",
        selectStakingRecord: "스테이킹 레코드 선택",
        selectRecordPlaceholder: "스테이킹 레코드 선택",
      },
      history: {
        title: "스테이킹 기록",
        stableCoin: "안정적인 코인",
        amount: "금액",
        status: "상태",
        lastClaimed: "마지막 클레임",
        pendingRewards: "보류 보상",
        actions: "작업",
        noHistory: "스테이킹 기록 없음",
        cycle: "주기",
      },
      notification: {
        noRewards: "보상 없음",
        stakeSuccess: "스테이킹 성공",
        stakeFailed: "스테이킹 실패",
        withdrawSuccess: "출금 성공",
        withdrawFailed: "출금 실패",
        claimSuccess: "클레임 성공",
        claimFailed: "클레임 실패",
        claimAllSuccess: "모든 보상 클레임 성공",
        claimAllFailed: "모든 보상 클레임 실패",
        insufficientAuth: "인증 부족",
        authSuccess: "인증 성공",
        authFailed: "인증 실패",
        invalidAmount: "유효하지 않은 금액",
        amountMultiple10: "금액은 10의 배수여야 합니다",
        noStakingRecord: "스테이킹 기록 없음",
        loadingData: "데이터 로딩 중...",
        dataRefreshFailed: "데이터 새로고침 실패",
        walletConnectionError: "지갑 연결 오류",
        contractInitError: "컨트랙트 초기화 오류",
        unknownError: "알 수 없는 오류가 발생했습니다",
        connectWallet: "지갑 연결",
        selectCoin: "코인 선택",
        approveConfirmation: "승인 확인",
        approving: "승인 중...",
        approveSuccess: "승인 성공",
        approveFailed: "승인 실패",
      }
    },
    // Market-related terms
    market: {
      title: "펫 시장",
      searchPlaceholder: "펫 검색...",
      sortPriceAsc: "가격: 낮은 순서로",
      sortPriceDesc: "가격: 높은 순서로",
      sortLevelAsc: "레벨: 낮은 순서로",
      sortLevelDesc: "레벨: 높은 순서로",
      price: "가격",
      corgi: "코기",
      search_marketplace: "시장 검색...",
      price_low_to_high: "가격: 낮은 순서로",
      price_high_to_low: "가격: 높은 순서로",
      marketplace: "시장",
      listNFT: "NFT 나열",
      manageListings: "내 나열 관리",
      viewTransactionHistory: "프리미엄 카드 거래 내역",
      transactionHistoryTitle: "프리미엄 카드 거래 기록",
      sortBy: "정렬 기준",
      sortByTime: "시간 순서로",
      sortByPrice: "가격 순서로",
      filterByQuality: "퀄리티 필터",
      allQualities: "모든 프리미엄 퀄리티",
      noTransactions: "프리미엄 카드 거래 기록 없음",
      loadingTransactions: "거래 기록 로딩 중...",
      rarity:{
        free: "무료",
        common: "일반",
        good: "좋음",
        excellent: "최고",
        rare: "희귀",
        legendary: "전설"
      }
    },
    exchange: {
      title: "교환",
      description: "다양한 토큰과 자산 교환",
      reverseToPoint: "포인트로 되돌리기",
      reverseToPointRate: "PWR -> PWP 비율",
      max: "최대",
      youWillGet: "얻을 것",
      inputAmount: "입력 금액",
      inputBountyAmount: "Input PWB 금액",
      swap: "교환",
      requiredReverseAmount: "필요한 역방향 금액",
      bothToPointRate: "PWR 및 PWB -> PWP 비율",
    },
    // Footer-related terms
    footer: {
      about: "우리에 대해",
      terms: "이용 약관",
      privacy: "개인 정보 보호",
      help: "도움말 센터"
    },

    // Index page terms
    index: {
      welcome: "PetWorld에 오신 것을 환영합니다!",
      selectMode: "좋아하는 게임 모드를 선택하세요",
      gameMode: "게임 모드",
      gameModeDesc: "몰입형 펫 키우기 게임 경험, 펫과 상호 작용하고 보상을 위해 작업을 완료하세요",
      simpleMode: "간단한 모드",
      simpleModeDesc: "깨끗한 인터페이스, 쉽게 펫과 자산을 관리하세요",
      enterGame: "게임 입장",
      enterApp: "앱 입장"
    },
    
    // Quality levels
    GOOD: "좋음",
    EXCELLENT: "최고",
    RARE: "희귀",
    LEGENDARY: "전설",
    nft: {
      tokenId: "토큰 ID",
      quality: "퀄리티",
      seller: "판매자",
      buyer: "구매자",
      price: "가격",
      transactionTime: "거래 시간"
    },
    
    // Common keys
    buy: "구매",
    details: "세부 정보",
    level: "레벨: {level}",
    lottery:{
      batchResultTitle:"로또 결과",
      summary:"요약",
    },
    // Shop-related terms
    shop: {
      title: "상점",
      subtitle: "희귀 펫 얻기",
      description: "희귀 펫을 얻으려면 알을 구매하거나 펫 음식을 구매하세요",
      freePwFoodDesc:"매일 24시간, 각 주소는 10 펫 음식을 클레임할 수 있습니다",
      
      // items
      items: {
        commonEgg: "일반 알",
        rareEgg: "희귀 알",
        legendaryEgg: "전설 알",
        pwfood: "펫 음식",
        freeNFT: "무료 펫",
        claimEggs: "보류 펫 클레임",
        freePwFood: "무료 펫 음식"
      },
      
      // item descriptions
      commonEggDesc: "일반 및 최고 펫 획득 확률 높음",
      rareEggDesc: "희귀 펫 획득 확률 높음",
      legendaryEggDesc: "전설 펫 획득 확률 높음",
      pwfoodDesc: "펫을 위해 사용되며 포만감 복구",
      freeNFTDesc: "각 주소는 하루에 한 번 무료 펫 NFT를 클레임할 수 있습니다",
      claimEggsDesc: "로또 후 보류 펫 클레임",
      
      // claim texts
      claim: "클레임",
      alreadyClaimed: "이미 클레임",
      claimed: "클레임",
      freeNFTClaimSuccess: "무료 펫 NFT 클레임 성공!",
      alreadyClaimedFreeNFT: "이미 무료 펫 NFT를 클레임했습니다",
      
      // claim texts
      claimEggsConfirmTitle: "보류 펫 클레임",
      claimEggsConfirm: "클레임 확인",
      claimEggsCancel: "취소",
      claimEggsSuccess: "성공적으로 {count} 펫을 클레임했습니다!",
      noPendingEggs: "보류 펫 없음",
      pendingEggsCount: "당신은 {total} 보류 펫을 가지고 있습니다: {rare} 희귀와 {legendary} 전설",
      
      // buying status
      buying: "Buying...",
      buySuccess: "구매 성공!",
      buyFailed: "구매 실패",
      buyCommonEggSuccess: "일반 알 구매 성공!",
      buyRareEggSuccess: "희귀 알 구매 성공!",
      buyLegendaryEggSuccess: "전설 알 구매 성공!",
      buyCommonEggFailed: "일반 알 구매 실패",
      buyRareEggFailed: "희귀 알 구매 실패",
      buyLegendaryEggFailed: "전설 알 구매 실패",
      buyingCommonEgg: "일반 알 구매 중...",
      buyingRareEgg: "희귀 알 구매 중...",
      buyingLegendaryEgg: "전설 알 구매 중...",
      
      // shop related
      inviterTip: "초대자 주소를 입력하세요, 그래서 당신과 당신의 친구들이 보상을 받을 수 있습니다",
      foodAmount: "구매 금액 ($):",
      foodAmountTip: "1과 10000 사이의 정수 금액을 입력하세요",
      batchAmount: "수량 (1-5):",
      quantity: "수량",
      price: "가격",
      total: "총계",
      batchPurchasing: "일괄 구매 중...",
      batchEggs: "알",
      unclaimedEggs: "보류 알",
      rareEggs: "희귀 알",
      legendaryEggs: "전설 알",
      confirmClaim: "클레임 확인",
      claimUnclaimedEggs: "보류 알 클레임",
      nowCanClaim:"지금 클레임 가능",
      batchAmountTip:"1과 5 사이의 정수 금액을 입력하세요",
      inviterPlaceholder: "초대자 주소 (선택 사항)",
      totalPrice: "총 가격",
      notification: {
        // General
        success: "성공!",
        error: "오류가 발생했습니다",
        warning: "경고",
        info: "정보",
        
        noClaimableEggs: "클레임 가능한 펫 없음",
        requiredNFTFirst: "무료 펫 NFT를 먼저 클레임하세요",
        // Payment process
        paymentProcessing: "결제 처리 중...",
        paymentSuccess: "결제 성공!",
        paymentFailed: "결제 실패: {message}",
        paymentCancelled: "결제 취소",
        
        // Authorization
        checkingApprovals: "필요한 인증 확인 중...",
        requestingApproval: "토큰 인증 요청 중...",
        authorizationSuccess: "인증 성공",
        authorizationFailed: "토큰 인증 실패: {message}",
        userCancelledAuth: "인증 거래를 취소했습니다",
        
        // Purchase process
        purchasingEggs: "구매 {eggName}...",
        purchasingFood: "구매 펫 음식...",
        purchaseSuccess: "구매 성공!",
        purchaseFailed: "구매 실패",
        purchaseEggsSuccess: "축하합니다! 성공적으로 {count} {eggName}을 구매했습니다",
        purchaseFoodSuccess: "축하합니다! 성공적으로 {quantity} 펫 음식을 구매했습니다",
        purchaseNoLotteryResult: "성공적으로 구매했습니다, 새로운 펫을 확인하세요.",
        purchaseNoLotteryDisplay: "성공적으로 구매했습니다, 하지만 결과를 표시할 수 없습니다",
        
        // Claim process
        claimingNFT: "무료 펫 클레임...",
        claimingFood: "무료 펫 음식 클레임...",
        claimingEggs: "보류 펫 클레임...",
        claimNFTSuccess: "무료 펫 클레임 성공! 게임에서 새로운 펫을 확인하세요",
        claimFoodSuccess: "무료 펫 음식 클레임 성공! {count} 펫 음식을 얻으세요",
        claimEggsSuccess: "성공적으로 {count} 펫을 클레임했습니다! 게임에서 확인하세요",
        
        // Validation errors
        amountInputError: "정수 금액을 입력하세요",
        amountRangeError: "1과 {min} 사이의 금액을 입력하세요",
        invalidLotteryResult: "유효하지 않은 결과",
        
        // Status messages
        alreadyClaimedNFT: "무료 펫을 이미 클레임했습니다",
        alreadyClaimedFood: "오늘 무료 펫 음식을 클레임했습니다, 내일 다시 시도하세요",
        noClaimableEggs: "클레임 가능한 펫 없음",
        requiredNFTFirst: "무료 펫 NFT를 먼저 클레임하세요",
        
        // Input issues
        invalidInviterAddress: "초대자 주소 형식이 유효하지 않습니다, 기본 주소를 사용하세요",
        amountInputNotFound: "금액 입력 상자를 찾을 수 없습니다",
        
        // Result notifications
        pendingRareEggs: "성공적으로 구매했습니다, 1분 후에 \"보류 펫 클레임\" 모듈에서 새로운 펫을 클레임하세요",
        claimSuccess: "클레임 성공!",
        claimFailed: "클레임 실패: {message}",

        pendingClaimAlert: "보류 클레임 알림",
        pendingClaimAlertMessage: "성공적으로 구매했습니다, 1분 후에 \"보류 펫 클레임\" 모듈에서 새로운 펫을 클레임하세요",
        pendingClaimAlertTip: "블록체인은 1분 동안 거래를 확인하므로, 참고하세요",
      }
    },
    
    // More features menu related
    moreFeatures: {
      stableStaking: {
        title: "안정적인 스테이킹",
        description: "안정적인 코인을 스테이킹하여 보상을 얻으세요",
        comingSoon: "안정적인 스테이킹 기능 준비 중, 오늘 중에 오세요!"
      },
      pwStaking: {
        title: "PW 스테이킹",
        description: "PW 토큰을 스테이킹하여 참여하고 보상을 얻으세요",
        comingSoon: "PW 스테이킹 기능 준비 중, 오늘 중에 오세요!"
      },
      burn: {
        title: "번",
        description: "토큰을 번역하여 공급을 줄이고 희소성을 높이세요",
        comingSoon: "번 기능 준비 중, 오늘 중에 오세요!"
      },
      reverseBurn: {
        title: "리버스 번",
        description: "특별한 번역 메커니즘을 통해 더 많은 보상을 얻으세요",
        comingSoon: "리버스 번 기능 준비 중, 오늘 중에 오세요!"
      },
      exchange: {
        title: "교환",
        description: "다양한 토큰과 자산을 교환하세요",
        comingSoon: "교환 기능 준비 중, 오늘 중에 오세요!"
      }
    },

    // Burn related
    burn: {
      title: "토큰 번",
      currentCycle: "현재 주기",
      nextCycle: "다음 주기",
      totalBurned: "총 번 포인트",
      petWorldDistributed: "이 주기 PW 보상",
      burnRate: "번 비율",
      yourBalance: "잔액",
      yourStats: "번 통계",
      yourBurned: "번 포인트",
      claimable: "클레임 가능한 PetWorld",
      amount: "금액",
      burnPoints: "번 PwPoint",
      cycles: "주기 수",
      cyclesHint: "3-250 사이의 정수를 입력하세요",
      burnButton: "번",
      claimRewards: "보상 클레임",
      claimInfo: "번 후, 여기에 PetWorld 토큰을 클레임하세요",
      claimCycles: "클레임할 주기 선택",
      claimButton: "모두 클레임",
      yourRecords: "번 기록",
      noRecords: "번 기록 없음",
      expiryWarning: "중요: 번 후 1200 주기 내에 보상을 클레임해야 합니다, 그렇지 않으면 모든 PwPoints와 PW 보상이 손실됩니다."
    },

    staking: {
      overview: '스테이킹 개요',
      totalStaked: '총 스테이킹',
      rewardRate: '연간 보상 수익률',
      rewardPool: '보상 풀',
      currentCycle: '현재 주기',
      nextCycle: '다음 주기',
      yourBalance: '잔액',
      yourStaked: '스테이킹',
      pendingRewards: '보류 보상',
      lastClaimedCycle: '마지막 클레임 주기',
      claim: '클레임',
      stake: '스테이킹',
      withdraw: '출금',
      donate: '기부',
      amount: '금액',
      max: '최대',
      availableBalance: '사용 가능한 잔액',
      stakeNow: '스테이킹 지금',
      withdrawNow: '출금 지금',
      donateNow: '기부 지금',
      donateHint: '기부 스테이킹 풀',
      stakedBalance: '스테이킹 잔액',
      yourStaking: '스테이킹',
      stakeWithdraw: '스테이킹/출금',
      donateAmount: '기부 금액',
    },

    // Payment related
    payment: {
      title: "결제 확인",
      supportedTokens: "지원되는 결제 토큰",
      selectToken: "결제 토큰 선택",
      itemPrice: "아이템 가격",
      gasFee: "가스 요금 (예상)",
      total: "총계",
      balance: "잔액",
      confirm: "결제 확인",
      cancel: "취소"
    }
  };
  
  // Add stablecoin staking translations
  koTranslations.modals = koTranslations.modals || {};
  koTranslations.modals.staking = {
    title: "안정적인 코인 스테이킹",
    refreshBtn: "새로고침",
    staked: "스테이킹",
    reward: "보상",
    apr: "APR",
    stakeTab: "스테이킹",
    withdrawTab: "출금",
    rewardsTab: "보상",
    stakeHistory: "스테이킹 기록",
    chooseStablecoin: "안정적인 코인 선택",
    inputAmount: "입력 금액",
    amountPlaceholder: "스테이킹 금액 입력",
    max: "최대",
    balance: "잔액",
    stakeBtn: "스테이킹",
    unstakeBtn: "출금",
    harvestBtn: "수확",
    date: "날짜",
    coin: "코인",
    amount: "금액",
    status: "상태",
    action: "작업",
    statusPending: "보류",
    statusCompleted: "완료",
    nothingStaked: "스테이킹 기록 없음",
    availableRewards: "사용 가능한 보상",
    rewardsInfo: "안정적인 코인을 스테이킹하여 매일 PWUSD 보상을 받으세요",
    viewDetails: "세부 정보 보기",
    stakeSuccess: "스테이킹 성공",
    stakeError: "스테이킹 실패: {message}",
    withdrawSuccess: "출금 성공",
    withdrawError: "출금 실패: {message}",
    harvestSuccess: "보상 수확 성공",
    harvestError: "수확 실패: {message}",
    insufficientBalance: "잔액 부족",
    connectWalletToStake: "스테이킹을 위해 지갑 연결",
    walletNotConnected: "지갑 연결 안됨",
    enterValidAmount: "유효한 금액 입력",
    pwusdContract: "PWUSD 계약:",
    stakingContract: "스테이킹 계약:"
  };

  if (window.i18n) {
    window.i18n.registerTranslations('ko', koTranslations);
  }
  
  window.APP_LOCALES['ko'] = koTranslations;
  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ko: koTranslations };
  }
})(); 
