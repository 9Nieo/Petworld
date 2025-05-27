/**
 * Session Manager for Wallet Authentication
 * Handles persistent storage of authentication sessions
 */

class WalletSessionManager {
    constructor() {
        this.sessionFilePath = 'game/web/resources/wallets/walletSession.json';
        this.sessionData = null;
        this.isLoaded = false;
    }

    /**
     * Initialize session manager
     */
    async init() {
        try {
            await this.loadSession();
            console.log('WalletSessionManager initialized');
        } catch (error) {
            console.error('Failed to initialize WalletSessionManager:', error);
        }
    }

    /**
     * Load session data from file
     */
    async loadSession() {
        try {
            // Try to load from localStorage first (fallback)
            const localData = localStorage.getItem('wallet_session_data');
            if (localData) {
                this.sessionData = JSON.parse(localData);
                this.isLoaded = true;
                console.log('Session data loaded from localStorage');
                return;
            }

            // If no localStorage data, initialize empty session
            this.sessionData = {
                lastAuthTime: null,
                activeKeyId: null,
                masterPasswordHash: null,
                autoLockTime: '24h',
                isAuthenticated: false,
                timestamp: Date.now()
            };
            this.isLoaded = true;
            console.log('Initialized empty session data');
        } catch (error) {
            console.error('Failed to load session:', error);
            // Initialize with default data on error
            this.sessionData = {
                lastAuthTime: null,
                activeKeyId: null,
                masterPasswordHash: null,
                autoLockTime: '24h',
                isAuthenticated: false,
                timestamp: Date.now()
            };
            this.isLoaded = true;
        }
    }

    /**
     * Save session data
     */
    async saveSession() {
        try {
            if (!this.sessionData) return;

            // Update timestamp
            this.sessionData.timestamp = Date.now();

            // Save to localStorage for persistence
            localStorage.setItem('wallet_session_data', JSON.stringify(this.sessionData));
            
            // Also save to sessionStorage for cross-tab compatibility
            sessionStorage.setItem('wallet_session_auth', JSON.stringify({
                masterPasswordHash: this.sessionData.masterPasswordHash,
                activeKeyId: this.sessionData.activeKeyId,
                timestamp: this.sessionData.timestamp
            }));

            console.log('Session data saved successfully');
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    /**
     * Save authentication session
     */
    async saveAuthSession(masterPassword, activeKeyId, autoLockTime = '24h') {
        try {
            this.sessionData = {
                lastAuthTime: Date.now(),
                activeKeyId: activeKeyId,
                masterPasswordHash: btoa(masterPassword), // Base64 encode
                autoLockTime: autoLockTime,
                isAuthenticated: true,
                timestamp: Date.now()
            };

            await this.saveSession();
            console.log('Authentication session saved');
        } catch (error) {
            console.error('Failed to save auth session:', error);
        }
    }

    /**
     * Check if session is valid based on auto-lock time
     */
    isSessionValid() {
        if (!this.sessionData || !this.sessionData.lastAuthTime || !this.sessionData.isAuthenticated) {
            return false;
        }

        const autoLockTime = this.sessionData.autoLockTime || '24h';
        
        // Never auto-lock
        if (autoLockTime === 'never') {
            return true;
        }

        const timeSinceAuth = Date.now() - this.sessionData.lastAuthTime;
        const autoLockMs = this.getAutoLockTimeInMs(autoLockTime);

        return timeSinceAuth < autoLockMs;
    }

    /**
     * Get session data if valid
     */
    getValidSession() {
        if (this.isSessionValid()) {
            return {
                masterPasswordHash: this.sessionData.masterPasswordHash,
                activeKeyId: this.sessionData.activeKeyId,
                autoLockTime: this.sessionData.autoLockTime,
                lastAuthTime: this.sessionData.lastAuthTime
            };
        }
        return null;
    }

    /**
     * Clear session data
     */
    async clearSession() {
        try {
            this.sessionData = {
                lastAuthTime: null,
                activeKeyId: null,
                masterPasswordHash: null,
                autoLockTime: '24h',
                isAuthenticated: false,
                timestamp: Date.now()
            };

            // Clear from all storage locations
            localStorage.removeItem('wallet_session_data');
            sessionStorage.removeItem('wallet_session_auth');
            localStorage.removeItem('wallet_last_auth_time');

            await this.saveSession();
            console.log('Session cleared');
        } catch (error) {
            console.error('Failed to clear session:', error);
        }
    }

    /**
     * Update auto-lock time setting
     */
    async updateAutoLockTime(autoLockTime) {
        if (this.sessionData) {
            this.sessionData.autoLockTime = autoLockTime;
            await this.saveSession();
        }
    }

    /**
     * Convert auto-lock time string to milliseconds
     */
    getAutoLockTimeInMs(autoLockTime) {
        switch (autoLockTime) {
            case '24h': return 24 * 60 * 60 * 1000;
            case '3d': return 3 * 24 * 60 * 60 * 1000;
            case '7d': return 7 * 24 * 60 * 60 * 1000;
            case '14d': return 14 * 24 * 60 * 60 * 1000;
            case '30d': return 30 * 24 * 60 * 60 * 1000;
            case '90d': return 90 * 24 * 60 * 60 * 1000;
            case 'never': return Infinity;
            default: return 24 * 60 * 60 * 1000; // Default to 24 hours
        }
    }

    /**
     * Get current auto-lock time
     */
    getAutoLockTime() {
        return this.sessionData ? this.sessionData.autoLockTime : '24h';
    }

    /**
     * Check if session manager is ready
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Get session status for debugging
     */
    getSessionStatus() {
        if (!this.sessionData) return 'No session data';
        
        const isValid = this.isSessionValid();
        const timeSinceAuth = this.sessionData.lastAuthTime ? 
            Date.now() - this.sessionData.lastAuthTime : null;
        
        return {
            isValid,
            isAuthenticated: this.sessionData.isAuthenticated,
            activeKeyId: this.sessionData.activeKeyId,
            autoLockTime: this.sessionData.autoLockTime,
            timeSinceAuth,
            lastAuthTime: this.sessionData.lastAuthTime
        };
    }
}

// Create global instance
window.WalletSessionManager = new WalletSessionManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletSessionManager;
}

console.log('Wallet Session Manager loaded'); 