/**
 * PetWorld Sound Manager
 * 
 * Manages audio playback, volume control, and muting for the game.
 * Handles background music and sound effects, respecting user settings.
 */

class SoundManager {
    constructor() {
        // Initialize audio context and elements
        this.initialized = false;
        this.backgroundMusic = null;
        this.soundEffects = {};
        this.backgroundMusicPath = '../../resources/sounds/backgrounMusic.mp3';
        
        // Audio settings 
        this.settings = {
            musicVolume: 60, // Default music volume (0-100)
            muteBackground: false, // Default mute state
        };
        
        // State flags
        this.isMusicPlaying = false;
        this.isInitializing = false;
        
        // Debug flag for logging
        this.debug = false;
    }
    
    /**
     * Initialize the sound manager
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    init() {
        // Prevent multiple initialization attempts
        if (this.initialized || this.isInitializing) {
            return Promise.resolve(this.initialized);
        }
        
        this.isInitializing = true;
        this.log('Initializing sound manager...');
        
        // Load saved settings
        this.loadSettings();
        
        // Create background music element
        this.backgroundMusic = new Audio(this.backgroundMusicPath);
        this.backgroundMusic.loop = true;
        
        // Set initial volume based on settings
        this.setMusicVolume(this.settings.musicVolume);
        
        // Add event listeners
        this.backgroundMusic.addEventListener('error', (e) => {
            this.error('Error loading background music:', e);
        });
        
        this.backgroundMusic.addEventListener('ended', () => {
            // Should not happen with loop=true, but just in case
            if (!this.settings.muteBackground && this.isMusicPlaying) {
                this.log('Background music ended, restarting...');
                this.playBackgroundMusic();
            }
        });
        
        // Mark as initialized
        this.initialized = true;
        this.isInitializing = false;
        
        this.log('Sound manager initialized successfully');
        return Promise.resolve(true);
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
            
            if (savedSettings.audio) {
                // Update music volume if defined in settings
                if (savedSettings.audio.musicVolume !== undefined) {
                    this.settings.musicVolume = savedSettings.audio.musicVolume;
                }
                
                // Update mute state if defined in settings
                if (savedSettings.audio.muteBackground !== undefined) {
                    this.settings.muteBackground = savedSettings.audio.muteBackground;
                }
            }
            
            this.log('Loaded audio settings:', this.settings);
        } catch (error) {
            this.error('Error loading audio settings from localStorage:', error);
        }
    }
    
    /**
     * Play background music if not already playing
     * Respects mute setting
     */
    playBackgroundMusic() {
        if (!this.initialized) {
            this.init().then(() => this.playBackgroundMusic());
            return;
        }
        
        // Don't play if muted
        if (this.settings.muteBackground) {
            this.log('Background music is muted, not playing');
            return;
        }
        
        // Reload music if it was paused
        if (!this.isMusicPlaying) {
            try {
                this.log('Playing background music...');
                
                // Setting volume before play
                this.backgroundMusic.volume = this.settings.musicVolume / 100;
                
                // Use play with promise handling to catch autoplay restrictions
                const playPromise = this.backgroundMusic.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.isMusicPlaying = true;
                        this.log('Background music started playing');
                    }).catch(error => {
                        this.error('Autoplay prevented:', error);
                        // We'll try again when user interacts with the page
                        this.setupAutoplayFix();
                    });
                } else {
                    this.isMusicPlaying = true;
                }
            } catch (error) {
                this.error('Error playing background music:', error);
            }
        }
    }
    
    /**
     * Setup event listeners to enable audio on user interaction
     * This is needed because many browsers block autoplay until user interacts with the page
     */
    setupAutoplayFix() {
        const resumeAudio = () => {
            // Try to play background music again after user interaction
            if (!this.isMusicPlaying && !this.settings.muteBackground) {
                this.log('User interacted with page, trying to play music again');
                this.playBackgroundMusic();
            }
            
            // Remove event listeners after first interaction
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        
        this.log('Set up event listeners for autoplay fix');
    }
    
    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (!this.initialized || !this.backgroundMusic) return;
        
        try {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.isMusicPlaying = false;
            this.log('Background music stopped');
        } catch (error) {
            this.error('Error stopping background music:', error);
        }
    }
    
    /**
     * Set music volume
     * @param {number} volume - Volume level (0-100)
     */
    setMusicVolume(volume) {
        // Validate volume range
        volume = Math.max(0, Math.min(100, volume));
        
        // Update settings
        this.settings.musicVolume = volume;
        
        // Apply volume if music is initialized
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = volume / 100;
            this.log(`Set music volume to ${volume}%`);
        }
    }
    
    /**
     * Set mute state
     * @param {boolean} muted - Whether background music should be muted
     */
    setMuteBackground(muted) {
        this.settings.muteBackground = muted;
        
        if (muted) {
            this.stopBackgroundMusic();
            this.log('Background music muted');
        } else {
            this.playBackgroundMusic();
            this.log('Background music unmuted');
        }
    }
    
    /**
     * Toggle mute state
     * @returns {boolean} New mute state
     */
    toggleMuteBackground() {
        const newMuteState = !this.settings.muteBackground;
        this.setMuteBackground(newMuteState);
        return newMuteState;
    }
    
    /**
     * Apply settings from external source
     * @param {Object} settings - Audio settings object
     */
    applySettings(settings) {
        if (!settings) return;
        
        // Apply volume setting if provided
        if (settings.musicVolume !== undefined) {
            this.setMusicVolume(settings.musicVolume);
        }
        
        // Apply mute setting if provided
        if (settings.muteBackground !== undefined) {
            this.setMuteBackground(settings.muteBackground);
        }
        
        this.log('Applied external audio settings');
    }
    
    /**
     * Load and play a sound effect
     * @param {string} name - Sound effect name/id
     * @param {string} path - Path to sound file
     */
    playSoundEffect(name, path) {
        // For future implementation
        this.log(`Playing sound effect: ${name}`);
    }
    
    /**
     * Log message if debugging is enabled
     */
    log(...args) {
        if (this.debug) {
            console.log('[SoundManager]', ...args);
        }
    }
    
    /**
     * Log error message
     */
    error(...args) {
        console.error('[SoundManager Error]', ...args);
    }
}

// Create singleton instance
window.SoundManager = window.SoundManager || new SoundManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SoundManager;
} 