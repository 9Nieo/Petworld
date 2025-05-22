(function() {
  window.APP_LOCALES = window.APP_LOCALES || {};
  
  const esTranslations = {
    // common terms
    common: {
        connect: "Conectar",
        disconnect: "Desconectar",
        connecting: "Conectando",
        cancel: "Cancelar",
        retry: "Reintentar",
        error: "Error",
        success: "Éxito",
        wallet: "Billetera",
        loading: "Cargando",
        close: "Cerrar",
        yes: "Sí",
        no: "No",
        ok: "Aceptar",
        confirm: "Confirmar",
        warning: "Advertencia",
        info: "Información",
        back: "Volver",
        next: "Siguiente",
        previous: "Anterior",
        save: "Guardar",
        delete: "Eliminar",
        edit: "Editar",
        create: "Crear",
        update: "Actualizar",
        settings: "Configuración",
        help: "Ayuda",
        logout: "Cerrar sesión",
        login: "Iniciar sesión",
        register: "Registrar",
        search: "Buscar",
        share: "Compartir",
        copy: "Copiar",
        paste: "Pegar",
        cut: "Cortar",
        reset: "Reiniciar",
        all: "Todos",
        copyright: "© 2025 Petworld - All rights reserved",
        pageInfo: "Página {{current}} de {{total}}",
        pageInfoWithTotal: "Página {{current}} de {{total}} ({{items}} registros)",
        featureNotImplemented: "{feature} estará disponible pronto, ¡espere!"
      },
      
      errors: {
        notFound: "No encontrado",
        serverError: "Error del servidor",
        connectionFailed: "Error de conexión",
        unknownError: "Error desconocido",
        invalidInput: "Entrada inválida",
        requiredField: "Este campo es obligatorio"
      },
      quality: {
        common: "Común",
        good: "Bueno",
        excellent: "Excelente",
        rare: "Raro",
        legendary: "Legendario"
      },
      navigation: {
        home: "Inicio",
        profile: "Perfil",
        settings: "Configuración",
        pets: "Mis mascotas",
        inventory: "Inventario",
        shop: "Tienda",
        market: "Mercado",
        play: "Jugar",
        about: "Acerca de",
        contact: "Contacto",
        more: "Más",
        stableStaking: "Stake Estable",
        pwStaking: "Stake PW",
        burn: "Quemar",
        reverseBurn: "Reverse Burn",
        exchange: "Intercambiar",
        staking: "PW Staking",
        reverseburn: "Reverse burn",
      },
      
      // wallet connection
      wallet: {
        title: "Conectar billetera",
        noWallet: "No está conectado",
        pleaseConnect: "Por favor, conecte su billetera para continuar",
        connectingTo: "Conectando a {walletName}...",
        confirmInWallet: "Por favor, confirme la solicitud de conexión en su billetera",
        connectWallet: "Conectar billetera",
        connectWalletDescription: "Conecte su billetera para interactuar con la blockchain",
        connect: "Conectar billetera",
        disconnect: "Desconectar",
        connecting: "Conectando...",
        connected: "Conectado",
        notConnected: "No está conectado",
        connectHint: "Conecte su billetera para interactuar con la blockchain",
        walletAddress: "Dirección de billetera",
        walletBalance: "Saldo",
        connectError: "Error al conectar la billetera",
        chooseWallet: "Seleccione la billetera que desea conectar",
        copyAddress: "Copiar dirección",
        addressCopied: "¡La dirección se ha copiado al portapapeles!",
        emptyWallet: "No está conectado",
        metamask: "MetaMask",
        walletConnect: "WalletConnect",
        connectUsingMetamask: "Usar la extensión de navegador MetaMask para conectar",
        connectUsingWalletConnect: "Usar WalletConnect para conectar",
        okx: "OKX Wallet",
        connectUsingOKX: "Usar la extensión de navegador OKX para conectar",
        
        // wallet types
        metamask: {
          name: "MetaMask",
          description: "Conecte su MetaMask wallet"
        },
        walletconnect: {
          name: "WalletConnect",
          description: "Conecte usando WalletConnect"
        },
        okx: {
          name: "OKX Wallet",
          description: "Conecte su OKX wallet"
        },
        
        // connection states
        states: {
          connecting: "Conectando wallet...",
          connected: "Wallet conectado",
          disconnected: "Wallet desconectado",
          error: "Error de conexión"
        },
        
        // error messages
        errors: {
          walletNotDetected: "No se detectó {walletName}. Por favor, instale la extensión y vuelva a intentarlo.",
          failedToConnect: "Error al conectar {walletName}: {message}",
          userRejected: "Solicitud de conexión rechazada",
          noAddressReturned: "No se pudo obtener la dirección de la billetera",
          unsupportedWallet: "Tipo de billetera no soportado: {walletType}"
        },
        
        // installation guide
        install: {
          metamask: "Haga clic aquí para instalar MetaMask",
          okx: "Haga clic aquí para instalar OKX Wallet"
        },
        
        // localhost warning for WalletConnect
        localhostWarning: {
          title: "En el entorno local (localhost) hay limitaciones al usar WalletConnect",
          description: "Debido a razones de seguridad, WalletConnect puede no funcionar correctamente en el entorno local. Esto se debe a que:",
          reasons: [
            "WalletConnect requiere un entorno HTTPS o un contexto de seguridad",
            "El entorno de desarrollo local utiliza el protocolo HTTP, que no cumple con los requisitos de seguridad"
          ],
          solutions: {
            title: "Soluciones:",
            options: [
              "Implemente una aplicación que soporte HTTPS",
              "Use una billetera de navegador como MetaMask para pruebas locales",
              "Use un servidor HTTPS local (como ngrok, localtunnel, etc.)"
            ]
          }
        }
      },
  
      // application specific items
      app: {
        title: "Mundo de mascotas"
      },
  
      // game specific items
      game: {
        title: "Mundo de mascotas",
        selectMode: "Mundo de mascotas - Seleccione el modo",
        sfx: "Volumen de efectos de sonido",
        bgm: "Volumen de música de fondo",
        graphics: "Calidad gráfica",
        graphicsLow: "Bajo",
        graphicsMedium: "Medio",
        graphicsHigh: "Alto"
      },
      
      // button texts
      button: {
        back: "Volver",
        close: "Cerrar",
        cancel: "Cancelar",
        confirm: "Confirmar",
        buy: "Comprar",
        create: "Crear",
        edit: "Editar",
        delete: "Eliminar",
        save: "Guardar",
        load: "Cargar",
        submit: "Enviar",
        send: "Enviar",
        add: "Agregar",
        view: "Ver",
        adopt: "Adoptar",
        feed: "Alimentar",
        play: "Jugar",
        reward: "Recompensa",
        refresh: "Refrescar",
        viewAll: "Ver todo",
        loadMore: "Cargar más",
        max: "Máximo",
        claim: "Reclamar",
        confirm: "Confirmar",
        approve: "Aprobar",
        ok:"Aceptar",
      },
      
      // home welcome text
      home: {
        welcome: {
          title: "Bienvenido al juego del mundo de mascotas!",
          description: "Explora, recolecta y cultiva tu mascota exclusiva"
        },
        myAssets: "Mis activos"
      },
      
      // settings related
      settings: {
        title: "Configuración",
        appSettings: "Configuración de la aplicación",
        account: "Configuración de la cuenta",
        display: "Configuración de visualización",
        audioSettings: "Configuración de audio",
        languageSettings: "Configuración de idioma",
        language: "Idioma",
        audio: "Configuración de audio",
        game: "Configuración de juego",
        performance: "Configuración de rendimiento",
        resetSettings: "Reiniciar configuración",
        saveSettings: "Guardar configuración",
        settingsSaved: "Configuración guardada correctamente!",
        confirmReset: "¿Estás seguro de querer reiniciar todas las configuraciones a sus valores predeterminados?",
        masterVolume: "Volumen principal",
        soundEffects: "Volumen de efectos de sonido",
        backgroundMusic: "Volumen de música de fondo",
        voiceVolume: "Volumen de voz",
        muteBackground: "Silenciar fondo",
        uiLanguage: "Idioma de la interfaz de usuario",
        resetBtn: "Reiniciar configuración",
        saveBtn: "Guardar configuración",
        saved: "Configuración guardada correctamente",
        resetSuccess: "Configuración reiniciada a valores predeterminados",
        languageChanged: "Idioma cambiado correctamente",
        languageChangeFailed: "Error al cambiar el idioma",
        resetButton: "Restablecer configuración",
        saveButton: "Guardar configuración",
        theme: "Tema",
        tokenSettings: "Configuración de tokens",
        tokenDescription: "Descripción del token",
        importTokens: "Importar tokens",
        tokenStatus: "Estado del token",
        tokenDeployed: "Token desplegado",
        tokenNotDeployed: "Token no desplegado",
        themeOptions: {
          light: "Tema claro",
          dark: "Tema oscuro",
          auto: "Seguir el sistema"
        },
        nickname: "Apodo del usuario",
        notification: "Configuración de notificaciones",
        notificationOptions: {
          game: "Notificaciones de juego",
          system: "Notificaciones del sistema",
          activity: "Recordatorios de actividades"
        }
      },
      
      // asset related
      asset: {
        token: "Token de juego",
        nftPets: "NFT mascotas",
        equipment: "Equipo de juego",
        count: "Unidades",
        pieces: "Piezas"
      },
      
      // network related
      network: {
        wrongNetwork: "Red de conexión incorrecta",
        pleaseSwitch: "Por favor, cambie su billetera a la red {requiredNetwork} para continuar usando el mundo de mascotas.",
        switchNetwork: "Cambiar red",
        networkChanged: "Red cambiada",
        checkingNetwork: "Revisando red...",
        currentNetwork: "Red actual",
        requiredNetwork: "Red requerida",
        switchFailed: "Error al cambiar la red",
        tryManually: "Por favor, intente cambiar manualmente la red en su billetera",
        addNetwork: "Agregar red",
        bscTestnet: "Red de prueba de Binance Smart Chain",
        bscMainnet: "Red principal de Binance Smart Chain"
      },
      stableStaking: {
        title: "Stake Estable",
        description: "Stake stablecoins to earn rewards",
        stats: {
          currentCycle: "Ciclo actual",
          nextCycle: "Siguiente ciclo",
          rewardRate: "Tasa de recompensa",
          totalStaked: "Total stake",
          totalClaimed: "Total claimed",
        },
        tabs: {
            stake: "Stake",
            withdraw: "Withdraw",
        },
        form: {
          selectStableCoin: "Seleccionar moneda estable",
          stakeAmount: "Cantidad stake",
          balance: "Saldo",
          max: "Máximo",
          stake: "Stake",
          withdraw: "Withdraw",
          withdrawAmount: "Withdraw amount",
          selectStakedCoin: "Seleccionar moneda stake",
          stakedBalance: "Saldo stake",
          selectStakedRecord: "Seleccionar registro stake",
          selectPlaceholder: "Seleccionar moneda estable",
          selectStakingRecord: "Seleccionar registro stake",
          selectRecordPlaceholder: "Seleccionar registro stake",
        },
        history: {
          title: "Historial stake",
          stableCoin: "Moneda estable",
          amount: "Cantidad",
          status: "Estado",
          lastClaimed: "Último reclamado",
          pendingRewards: "Recompensas pendientes",
          actions: "Acciones",
          noHistory: "No hay historial stake",
          cycle: "Ciclo",
        },
        notification: {
          noRewards: "No hay recompensas disponibles",
          stakeSuccess: "La apuesta fue exitosa",
          stakeFailed: "La apuesta falló",
          withdrawSuccess: "Retirada exitosa",
          withdrawFailed: "Retirada fallida",
          claimSuccess: "Reclamación exitosa",
          claimFailed: "Reclamación fallida",
          claimAllSuccess: "Todas las recompensas reclamadas exitosamente",
          claimAllFailed: "No se pudieron reclamar todas las recompensas",
          insufficientAuth: "Autorización insuficiente",
          authSuccess: "Autorización exitosa",
          authFailed: "Autorización fallida",
          invalidAmount: "Cantidad inválida",
          amountMultiple10: "La cantidad debe ser múltiplo de 10",
          noStakingRecord: "No hay registro de stake seleccionado",
          loadingData: "Cargando datos...",
          dataRefreshFailed: "Error al actualizar los datos",
          walletConnectionError: "Error de conexión de billetera",
          contractInitError: "Error al inicializar el contrato",
          unknownError: "Ocurrió un error desconocido",
          connectWallet: "Conectar billetera",
          selectCoin: "Seleccionar moneda",
          approveConfirmation: "Confirmación de aprobación",
          approving: "Aprobando...",
          approveSuccess: "Aprobación exitosa",
          approveFailed: "Aprobación fallida",
        }
      },
      // pets related
      pets: {
        title: "Mis mascotas",
        myPets: "Mis mascotas",
        myPetsList: "Mis mascotas lista",
        adoptNew: "Adoptar nueva mascota",
        adoptHint: "¡Haz click en un huevo para adoptar tu primera mascota!",
        level: "Nivel",
        details: "Detalles de la mascota",
        feedAll: "Alimentar todas",
        claimAll: "Reclamar todas",
        feedFriend: "Alimentar mascota de un amigo",
        sort: {
          levelDesc: "Nivel: de alto a bajo",
          levelAsc: "Nivel: de bajo a alto",
          rarityDesc: "Raridad: de alto a bajo",
          rarityAsc: "Raridad: de bajo a alto"
        },
        noPets: "No tienes mascotas",
        noPetsDesc: "Ve a la tienda para obtener tu primera mascota!",
        viewDetails: "Ver detalles",
        feedPet: "Alimentar",
        petStats: "Estado de la mascota",
        refreshing: "Refrescando...",
        refreshSuccess: "Refresco exitoso!",
        refreshFailed: "Refresco fallido, por favor, inténtelo de nuevo",
        loadingPets: "Cargando datos de mascotas..."
      },
      
      // market related
      market: {
        title: "Mercado de mascotas",
        searchPlaceholder: "Buscar mascota...",
        sortPriceAsc: "Precio: de bajo a alto",
        sortPriceDesc: "Precio: de alto a bajo",
        sortLevelAsc: "Nivel: de bajo a alto",
        sortLevelDesc: "Nivel: de alto a bajo",
        price: "Precio",
        price_low_to_high: "Precio: de bajo a alto",
        price_high_to_low: "Precio: de alto a bajo",
        marketplace: "Mercado",
        listNFT: "Listar NFT",
        manageListings: "Gestionar mis listados",
        viewTransactionHistory: "Historial de transacciones de tarjetas avanzadas",
        transactionHistoryTitle: "Historial de transacciones de tarjetas avanzadas",
        sortBy: "Ordenar por",
        sortByTime: "Ordenar por tiempo",
        sortByPrice: "Ordenar por precio",
        filterByQuality: "Filtrar por calidad",
        allQualities: "Todas las calidades",
        noTransactions: "No se encontraron transacciones de tarjetas avanzadas",
        loadingTransactions: "Cargando historial de transacciones...",
        rarity: {
          free: "Gratis",
          common: "Común",
          good: "Bueno",
          excellent: "Excelente",
          rare: "Raro",
          legendary: "Legendario"
        }
      },
      
      // footer related
      footer: {
        about: "Acerca de nosotros",
        terms: "Términos de servicio",
        privacy: "Política de privacidad",
        help: "Centro de ayuda"
      },
      
      // index related
      index: {
        welcome: "¡Bienvenido al mundo de mascotas!",
        selectMode: "Por favor, seleccione el modo de juego que desea entrar",
        gameMode: "Modo de juego",   
        gameModeDesc: "Experiencia de juego de mascotas inmersiva, interactúa con tu mascota, completa tareas y recibe recompensas",
        simpleMode: "Modo simple",
        simpleModeDesc: "Interfaz simple, fácil de gestionar sus mascotas y activos",
        enterGame: "Entrar al juego",
        enterApp: "Entrar a la aplicación"
      },
      
      // quality levels
      GOOD: "Bueno",
      EXCELLENT: "Excelente",
      RARE: "Raro",
      LEGENDARY: "Legendario",
      nft: {
        tokenId: "ID de token",
        quality: "Calidad",
        seller: "Vendedor",
        buyer: "Comprador",
        price: "Precio",
        transactionTime: "Tiempo de transacción",
        paymentTokenAddress: "Dirección del token de pago",
      },
      
      // public keys
      buy: "Comprar",
      details: "Detalles",
      level: "Nivel: {level}",
      
      lottery:{
        batchResultTitle:"Resultado de lote",
        summary:"Resumen",
      },
      // shop page
      shop: {
        title: "Tienda",
        subtitle: "Obtenga mascotas raras",
        description: "Compre huevos aquí para obtener mascotas raras, o compre comida para mascotas",
        freePwFoodDesc:"Cada 24 horas, cada dirección puede reclamar 10 comidas para mascotas",
        
        // items
        items: {
          commonEgg: "Huevo común",
          rareEgg: "Huevo raro",
          legendaryEgg: "Huevo legendario",
          pwfood: "Comida para mascotas",
          freeNFT: "Mascota gratis",
          claimEggs: "Reclamar mascotas no reclamadas",
          freePwFood: "Comida para mascotas gratis"
        },
        
        // item descriptions
        commonEggDesc: "Tiene una probabilidad de abrir un huevo común",
        rareEggDesc: "Tiene una probabilidad de abrir un huevo raro",
        legendaryEggDesc: "Tiene una probabilidad de abrir un huevo legendario",
        pwfoodDesc: "Usado para alimentar a su mascota, para restaurar la saciedad",
        freeNFTDesc: "Cada dirección puede reclamar un NFT de mascota gratis",
        claimEggsDesc: "Reclamar NFT de mascota no reclamada",
        
        // claim texts
        claim: "Reclamar",
        alreadyClaimed: "Ya reclamado",
        claimed: "Ya reclamado",
        freeNFTClaimSuccess: "Mascota gratis reclamada con éxito!",
        alreadyClaimedFreeNFT: "Ya has reclamado la mascota gratis",
        
        // claim texts
        claimEggsConfirmTitle: "Reclamar mascotas no reclamadas",
        claimEggsConfirm: "Confirmar reclamación",
        claimEggsCancel: "Cancelar",
        claimEggsSuccess: "¡Se han reclamado {count} mascotas con éxito!",
        noPendingEggs: "No hay mascotas pendientes de reclamación",
        pendingEggsCount: "Tienes {total} mascotas pendientes de reclamación: raras {rare} y legendarias {legendary}",
        
        // buying status
        buying: "Comprando...",
        buySuccess: "Compra exitosa!",
        buyFailed: "Compra fallida",
        buyCommonEggSuccess: "Huevo común comprado con éxito!",
        buyRareEggSuccess: "Huevo raro comprado con éxito!",
        buyLegendaryEggSuccess: "Huevo legendario comprado con éxito!",
        buyCommonEggFailed: "Huevo común comprado fallido",
        buyRareEggFailed: "Huevo raro comprado fallido",
        buyLegendaryEggFailed: "Huevo legendario comprado fallido",
        buyingCommonEgg: "Comprando huevo común...",
        buyingRareEgg: "Comprando huevo raro...",
        buyingLegendaryEgg: "Comprando huevo legendario...",
        
        // shop related
        inviterTip: "Rellene la dirección del invitado para que reciba una recompensa",
        foodAmount: "Cantidad de compra (USD):",
        foodAmountTip: "Ingrese un número entero entre 1 y 10,000",
        batchAmount: "Cantidad (1-5):",
        quantity: "Cantidad",
        price: "Precio",
        total: "Total",
        batchPurchasing: "Comprando en lotes...",
        batchEggs: "huevos",
        unclaimedEggs: "Huevos no reclamados",
        rareEggs: "Huevos raros",
        legendaryEggs: "Huevos legendarios",
        confirmClaim: "Confirmar reclamación",
        claimUnclaimedEggs: "Reclamar huevos no reclamados",
        nowCanClaim:"Puede reclamar",
        batchAmountTip:"Ingrese un número entero entre 1 y 5",
        inviterPlaceholder: "Dirección del invitado (opcional)",
        totalPrice: "Precio total",
        notification: {
          // General
          success: "¡Éxito!",
          error: "Error ocurrido",
          warning: "Advertencia",
          info: "Información",
          
          noClaimableEggs: "No hay mascotas reclamables",
          requiredNFTFirst: "Reclama la mascota gratis primero",
          // Payment process
          paymentProcessing: "Procesando pago...",
          paymentSuccess: "Pago exitoso!",
          paymentFailed: "Pago fallido: {message}",
          paymentCancelled: "Pago cancelado",
          
          // Authorization
          checkingApprovals: "Verificando aprobaciones necesarias...",
          requestingApproval: "Solicitando aprobación de token...",
          authorizationSuccess: "Aprobación exitosa",
          authorizationFailed: "Aprobación de token fallida: {message}",
          userCancelledAuth: "Cancelaste la transacción de aprobación",
          
          // Purchase process
          purchasingEggs: "Comprando {eggName}...",
          purchasingFood: "Comprando comida para mascotas...",
          purchaseSuccess: "Compra exitosa!",
          purchaseFailed: "Compra fallida",
          purchaseEggsSuccess: "¡Felicitaciones! ¡Compraste {count} {eggName} con éxito!",
          purchaseFoodSuccess: "¡Felicitaciones! ¡Compraste {quantity} comida para mascotas con éxito!",
          purchaseNoLotteryResult: "¡Compraste huevos con éxito, por favor, verifica tu colección para obtener nuevas mascotas.",
          purchaseNoLotteryDisplay: "¡Compraste huevos con éxito, pero no se puede mostrar el resultado de la lotería",
          
          // Claim process
          claimingNFT: "Reclamando mascota gratis...",
          claimingFood: "Reclamando comida para mascotas gratis...",
          claimingEggs: "Reclamando mascotas no reclamadas...",
          claimNFTSuccess: "¡Reclamaste la mascota gratis con éxito! Por favor, verifica tu nueva mascota en el juego",
          claimFoodSuccess: "¡Reclamaste la comida para mascotas gratis con éxito! Obtén {count} comida para mascotas",
          claimEggsSuccess: "¡Reclamaste {count} mascotas con éxito! Por favor, verifícalas en el juego",
          
          // Validation errors
          amountInputError: "Por favor, ingrese una cantidad entera",
          amountRangeError: "Por favor, ingrese una cantidad entre 1 y {min} y {max}",
          invalidLotteryResult: "Resultado de lotería inválido",
          
          // Status messages
          alreadyClaimedNFT: "Ya has reclamado la mascota gratis",
          alreadyClaimedFood: "Hoy has reclamado la comida para mascotas gratis, por favor, vuelve mañana",
          noClaimableEggs: "No tienes mascotas reclamables",
          requiredNFTFirst: "Por favor, reclama el NFT de mascota gratis primero",
          
          // Input issues
          invalidInviterAddress: "El formato de la dirección del invitado es inválido, usando la dirección predeterminada",
          amountInputNotFound: "No se puede encontrar la casilla de entrada de la cantidad",
          
          // Result notifications
          pendingRareEggs: "¡Compraste huevos con éxito, por favor, espera 1 minuto y luego reclama tu nueva mascota en el módulo \"reclamar mascotas no reclamadas\"",
          claimSuccess: "Reclamación exitosa!",
          claimFailed: "Reclamación fallida: {message}",

          pendingClaimAlert: "Alerta de reclamación pendiente",
          pendingClaimAlertMessage: "¡Compraste huevos con éxito, por favor, espera 1 minuto y luego reclama tu nueva mascota en el módulo \"reclamar mascotas no reclamadas\"",
          pendingClaimAlertTip: "La blockchain tomará 1 minuto para confirmar la transacción, por favor, espera pacientemente",
        }
      },
      exchange: {
        title: "Intercambio",
        description: "Intercambiar diferentes tipos de tokens y activos",
        reverseToPoint: "Intercambiar de vuelta",
        reverseToPointRate: "PWR -> PWP Ratio",
        max: "Máximo",
        youWillGet: "Obtendrás",
        inputAmount: "Ingrese la cantidad",
        inputBountyAmount: "Ingrese la cantidad de PWB",
        swap: "Intercambiar",
        requiredReverseAmount: "Cantidad requerida",
        bothToPointRate: "PWR y PWB -> PWP Ratio",
      },
      staking: {
        overview: 'Resumen de staking',
        totalStaked: 'Cantidad total stakeada',
        rewardRate: 'Tasa de recompensa',
        rewardPool: 'Pool de recompensas',
        currentCycle: 'Ciclo actual',
        nextCycle: 'Siguiente ciclo',
        yourBalance: 'Tu saldo',
        yourStaked: 'Tu stake',
        pendingRewards: 'Recompensas pendientes',
        lastClaimedCycle: 'Último ciclo reclamado',
        claim: 'Reclamar',
        stake: 'Stakear',
        withdraw: 'Retirar',
        donate: 'Donar',
        amount: 'Cantidad',
        max: 'Máximo',
        availableBalance: 'Saldo disponible',
        stakeNow: 'Stakear ahora',
        withdrawNow: 'Retirar ahora',
        donateNow: 'Donar ahora',
        donateHint: 'Donar al pool de staking',
        availableBalance: 'Saldo disponible',
        stakedBalance: 'Saldo stakeado',
        yourStaking: 'Tu stake',
        stakeWithdraw: 'Stakear/Retirar',
        donateAmount: 'Cantidad de donación',
        
      },
      // more features menu related
      moreFeatures: {
        stableStaking: {
          title: "Stake estable",
          description: "Stake stablecoins to earn rewards",
          comingSoon: "Stake estable feature is coming soon！"
        },
        pwStaking: {
          title: "Stake PW",
          description: "Stake PW tokens to participate in ecosystem governance and earn rewards",
          comingSoon: "Stake PW feature is coming soon！"
        },
        burn: {
          title: "Burn",
          description: "Burn tokens to reduce supply, increase scarcity",
          comingSoon: "Burn feature is coming soon！"
        },
        reverseBurn: {
          title: "Reverse burn",
          description: "Special deflationary mechanism, get more rewards",
          comingSoon: "Reverse burn feature is coming soon！"
        },
        exchange: {
          title: "Exchange",
          description: "Exchange different types of tokens and assets",
          comingSoon: "Exchange feature is coming soon！"
        }
      },
      
      // stablecoin staking related
      modals: {
        staking: {
          title: "Stake estable",
          refreshBtn: "Refresh",
          staked: "Stakeado",
          reward: "Recompensa",
          apr: "Tasa de recompensa",
          stakeTab: "Stakear",
          withdrawTab: "Retirar",
          rewardsTab: "Recompensas",
          stakeHistory: "Historial stake",
          chooseStablecoin: "Seleccionar moneda estable",
          inputAmount: "Ingrese la cantidad",
          amountPlaceholder: "Ingrese la cantidad stake",
          max: "Máximo",
          balance: "Saldo",
          stakeBtn: "Stakear",
          unstakeBtn: "Desstakear",
          harvestBtn: "Reclamar recompensas",
          date: "Fecha",
          coin: "Moneda",
          amount: "Cantidad",
          status: "Estado",
          action: "Acción",
          statusPending: "Procesando",
          statusCompleted: "Completado",
          nothingStaked: "Sin historial stake",
          availableRewards: "Recompensas disponibles",
          rewardsInfo: "Stakear moneda estable para obtener recompensas diarias de PWUSD",
          viewDetails: "Ver detalles",
          stakeSuccess: "Stake exitoso",
          stakeError: "Stake fallido: {message}",
          withdrawSuccess: "Retirar exitoso",
          withdrawError: "Retirar fallido: {message}",
          harvestSuccess: "Recompensas reclamadas exitosamente",
          harvestError: "Recompensas reclamadas fallidas: {message}",
          insufficientBalance: "Saldo insuficiente",
          connectWalletToStake: "Conecte su billetera paraStakear",
          walletNotConnected: "Billetera no conectada",
          enterValidAmount: "Ingrese una cantidad válida",
          pwusdContract: "PWUSD contrato:",
          stakingContract: "Stake contrato:",
          overview: 'Stake total',
          totalStaked: 'Total stake',
          rewardRate: 'Reward rate',
          rewardPool: 'Reward pool',
          currentCycle: 'Current cycle',
          nextCycle: 'Next cycle'
        }
      },
      
      // burn related
      burn: {
        title: "Burn",
        currentCycle: "Current cycle",
        nextCycle: "Next cycle",
        totalBurned: "Total burned",
        petWorldDistributed: "This cycle PW reward",
        burnRate: "Burn rate",
        yourBalance: "Your balance",
        yourStats: "Your burn stats",
        yourBurned: "Burned points",
        claimable: "Claimable",
        amount: "Amount",
        burnPoints: "Burn PwPoint",
        cycles: "Cycles",
        cyclesHint: "Select the number of cycles to burn (3-250 cycles)",
        burnButton: "Burn",
        claimRewards: "Claim rewards",
        claimInfo: "After burning, you can claim your PetWorld tokens here",
        claimCycles: "Select the number of cycles to claim",
        claimButton: "Claim All",
        yourRecords: "Your burn records",
        noRecords: "No burn records",
        expiryWarning: "Importante: Debes reclamar tus recompensas dentro de 1200 ciclos después de quemar, de lo contrario se perderán y perderás todos los PwPoints y recompensas PW."
      },
      
      payment: {
        title: "Confirm payment",
        supportedTokens: "Supported payment tokens",
        selectToken: "Select payment token",
        itemPrice: "Item price",
        gasFee: "Gas fee (estimated)",
        total: "Total",
        balance: "Balance",
        confirm: "Confirm payment",
        cancel: "Cancel"
      },
  
      // loading page
      loading: {
        title: "Petworld is loading",
        description: "Getting your pet NFT data, please wait...",
        connecting: "Connecting to blockchain...",
        loadingAssets: "Loading game assets...",
        initializingGame: "Initializing game...",
        loadingPets: "Loading your pets...",
        loadingComplete: "Loading complete!",
        enteringWorld: "Entering Petworld...",
        tip1: "Tip: Feed your pets regularly to keep them happy!",
        tip2: "Tip: Rare pets have special abilities!",
        tip3: "Tip: You can trade your pets on the marketplace!",
        tip4: "Tip: Stake your tokens to earn rewards!",
        tip5: "Tip: Complete daily tasks for extra rewards!"
      },
      
    };

  if (window.i18n) {
    window.i18n.registerTranslations('es', esTranslations);
  }
  
  window.APP_LOCALES['es'] = esTranslations;
  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { es: esTranslations };
  }
})(); 