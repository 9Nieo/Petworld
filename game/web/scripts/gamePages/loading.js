// Loading page script

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize loading page
    initLoadingPage();
});

/**
 * Get random emojis from the list
 */
function getRandomEmojis(count) {
    const petEmojis = [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🦁', '🐯', '🦄', '🐮', '🐷', '🐸', '🐙', '🐵',
        '🐔', '🐧', '🐦', '🐤', '🐣', '🦆', '🦅', '🦉',
        '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌',
        '🐞', '🐜', '🦂', '🦀', '🐍', '🦎', '🐢', '🐊',
        '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛',
        '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂',
        '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌',
        '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓',
        '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝',
        '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️',
        '🦔', '🐉', '🐲', '🦕', '🦖', '🦈', '🐬', '🐳',
        '🐋', '🦭', '🐟', '🐠', '🐡', '🦐', '🦞', '🦀',
        '🦑', '🐙', '🦪', '🦂', '🕷️', '🕸️', '🦗', '🦟',
        '🐜', '🐝', '🪲', '🐞', '🦋', '🐛', '🦠', '🦠'
    ];
    
    const shuffled = [...petEmojis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(' ');
}

/**
 * Initialize loading page
 */
function initLoadingPage() {
    console.log('Initializing loading page...');
    
    // Replace the top emoji container with logo image
    const emojiContainer = document.querySelector('#loadingContainer > div');
    if (emojiContainer) {
        emojiContainer.innerHTML = '<img src="../../resources/images/icons/logo.png" alt="PetWorld Logo" style="width: 150px; height: 150px;">';
    }
    
    // Load progress bar and text elements
    const progressBar = document.getElementById('loadingProgressBar');
    const progressText = document.getElementById('loadingProgressText');
    const loadingContainer = document.getElementById('loadingContainer');
    const gameContainer = document.getElementById('gameContainer');
    const petEmoji = document.getElementById('loadingPetEmoji');
    
    // Set initial pet emojis (random 3)
    if (petEmoji) {
        petEmoji.textContent = getRandomEmojis(3);
    }
    
    // Start pet emoji rotation
    startPetEmojiRotation(petEmoji);
    
    // Add tip element
    addTipElement(loadingContainer);
    
    // Ensure page elements exist
    if (!progressBar || !progressText || !loadingContainer || !gameContainer) {
        console.error('Key elements of the loading page not found');
        return;
    }
    
    // Hide game container, show loading container
    gameContainer.style.display = 'none';
    loadingContainer.style.display = 'flex';
    
    // Simulate initial loading progress
    let progress = 0;
    updateProgress(progress);
    
    // Listen for NFT loading complete event
    window.addEventListener('nftRefreshed', () => {
        console.log('Detected NFT refresh event, loading complete');
        // Set loading complete
        progress = 100;
        updateProgress(progress);
        
        // Show game page after a short delay
        setTimeout(() => {
            hideLoadingPage();
        }, 500);
    });
    
    // Set maximum loading time (show game page after 15 seconds regardless)
    const maxLoadingTime = 15000; // 15 seconds
    const loadingInterval = 300; // Update progress every 300ms
    const progressStep = 5; // Increase progress by 5% each time
    
    // Simulate loading progress
    const progressInterval = setInterval(() => {
        // Only increase progress if not reached 90%
        if (progress < 90) {
            progress += progressStep;
            updateProgress(progress);
        }
    }, loadingInterval);
    
    // Timeout handling
    setTimeout(() => {
        clearInterval(progressInterval);
        
        // If not completed yet, force completion
        if (progress < 100) {
            console.log('Loading timeout, forcing to show game page');
            progress = 100;
            updateProgress(progress);
            
            // Show game page after a short delay
            setTimeout(() => {
                hideLoadingPage();
            }, 500);
        }
    }, maxLoadingTime);
    
    // Check if pet elements already exist in the page
    checkExistingPets();
    
    // Start rotating tips
    startRotatingTips();
}

/**
 * Rotate pet emoji
 * @param {HTMLElement} emojiElement - Element displaying pet emoji
 */
function startPetEmojiRotation(emojiElement) {
    if (!emojiElement) return;
    
    // Switch emoji every 3.5 seconds
    const emojiInterval = setInterval(() => {
        // Fade out effect
        emojiElement.style.opacity = '0';
        
        setTimeout(() => {
            // Update emoji - show 3 random emojis
            emojiElement.textContent = getRandomEmojis(3);
            
            // Fade in effect
            emojiElement.style.opacity = '1';
        }, 300);
    }, 3500);
    
    // Listen for game page loaded event, stop switching emoji
    window.addEventListener('gamePageLoaded', () => {
        clearInterval(emojiInterval);
    });
    
    // Set initial styles for fade in and out effects
    emojiElement.style.transition = 'opacity 0.3s ease';
    emojiElement.style.opacity = '1';
}

/**
 * Add tip element to loading container
 * @param {HTMLElement} container - Loading container element
 */
function addTipElement(container) {
    // Create tip element
    const tipElement = document.createElement('div');
    tipElement.className = 'loading-tip';
    tipElement.id = 'loadingTip';
    
    // If tip element already exists, do not add again
    if (document.getElementById('loadingTip')) {
        return;
    }
    
    // Add to container, place before progress bar
    const progressContainer = container.querySelector('.loading-progress-container');
    if (progressContainer) {
        container.insertBefore(tipElement, progressContainer);
    } else {
        container.appendChild(tipElement);
    }
    
    // Set styles
    tipElement.style.margin = '20px 0';
    tipElement.style.color = '#6E8CA7';
    tipElement.style.fontSize = '14px';
    tipElement.style.textAlign = 'center';
    tipElement.style.maxWidth = '400px';
    tipElement.style.minHeight = '42px'; // Fixed height to avoid jumping when switching tips
    tipElement.style.transition = 'opacity 0.5s ease';
}

/**
 * Start rotating tips
 */
function startRotatingTips() {
    const tipElement = document.getElementById('loadingTip');
    if (!tipElement) return;
    
    // Get i18n instance, use default tips if not available
    const i18n = window.i18n;
    
    // Default tips (if i18n is not available)
    const defaultTips = [
        "💡 Tip: Feed your pets regularly to keep them happy!",
        "✨ Tip: Rare pets have special abilities!",
        "🛍️ Tip: You can trade your pets in the market!",
        "🔄 Tip: Stake your tokens to earn rewards!",
        "🎁 Tip: Complete daily tasks for extra rewards!"
    ];
    
    // Current tip index
    let currentTipIndex = 0;
    
    // Update tip function
    const updateTip = () => {
        // Fade out effect
        tipElement.style.opacity = '0';
        
        setTimeout(() => {
            // Get tip text (preferably use i18n, otherwise use default tips)
            let tipText = '';
            
            if (i18n && typeof i18n.t === 'function') {
                // Use i18n to get tip
                let translationKey = `loading.tip${currentTipIndex + 1}`;
                tipText = i18n.t(translationKey);
                
                // If translation does not exist (returns key name), use default tip
                if (tipText === translationKey) {
                    tipText = defaultTips[currentTipIndex];
                } else {
                    // Add emoji to translation text
                    tipText = addEmojiToTip(tipText, currentTipIndex);
                }
            } else {
                // Use default tip
                tipText = defaultTips[currentTipIndex];
            }
            
            // Set tip text
            tipElement.textContent = tipText;
            
            // Fade in effect
            tipElement.style.opacity = '1';
            
            // Update index
            currentTipIndex = (currentTipIndex + 1) % (defaultTips.length);
        }, 500);
    };
    
    // Add emoji to tip
    function addEmojiToTip(tip, index) {
        // If tip already contains emoji, do not add again
        if (tip.match(/[\u{1F300}-\u{1F6FF}]/u)) {
            return tip;
        }
        
        // Choose emoji based on index
        const emojis = ['💡', '✨', '🛍️', '🔄', '🎁'];
        const emoji = emojis[index % emojis.length];
        
        // Add emoji in front of tip
        return `${emoji} ${tip}`;
    }
    
    // Set initial tip
    updateTip();
    
    // Switch tip every 5 seconds
    const tipInterval = setInterval(updateTip, 5000);
    
    // Listen for game page loaded event, stop switching tips
    window.addEventListener('gamePageLoaded', () => {
        clearInterval(tipInterval);
    });
    
    // Listen for page unload event, clear timer
    window.addEventListener('beforeunload', () => {
        clearInterval(tipInterval);
    });
}

/**
 * Check if pet elements already exist in the page
 * If they exist, it means they have already been loaded, and the game page can be displayed directly
 */
function checkExistingPets() {
    // Wait for a while to ensure DOM is fully loaded
    setTimeout(() => {
        const farmAnimalsContainer = document.getElementById('farm-animals-container');
        if (farmAnimalsContainer && farmAnimalsContainer.children.length > 0) {
            console.log('Detected existing pet elements in the page, displaying game page directly');
            // Set loading complete
            updateProgress(100);
            
            // Show game page after a short delay
            setTimeout(() => {
                hideLoadingPage();
            }, 500);
        } else {
            console.log('No pet elements detected in the page, waiting for loading to complete');
        }
    }, 1000);
}

/**
 * Update loading progress
 * @param {number} percent - loading percentage
 */
function updateProgress(percent) {
    const progressBar = document.getElementById('loadingProgressBar');
    const progressText = document.getElementById('loadingProgressText');
    
    if (progressBar && progressText) {
        // Update progress bar width
        progressBar.style.width = `${percent}%`;
        
        // Update progress text
        progressText.textContent = `${percent}%`;
        
        // Add completion emoji when progress reaches 100%
        if (percent >= 100) {
            progressText.textContent = `${percent}% 🎉`;
        }
    }
}

/**
 * Hide loading page, show game page
 */
function hideLoadingPage() {
    const loadingContainer = document.getElementById('loadingContainer');
    const gameContainer = document.getElementById('gameContainer');
    
    if (loadingContainer && gameContainer) {
        // Add fade out effect
        loadingContainer.classList.add('fade-out');
        
        // After animation ends, hide loading container and show game container
        setTimeout(() => {
            loadingContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            
            // Add fade in effect
            gameContainer.classList.add('fade-in');
            
            // Trigger window resize event to ensure all elements are laid out correctly
            window.dispatchEvent(new Event('resize'));
            
            // Trigger custom event to notify that the game page has loaded
            window.dispatchEvent(new CustomEvent('gamePageLoaded'));
        }, 500); // Match with CSS transition time
    }
} 