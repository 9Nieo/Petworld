/**
 * Generic Modal Dialog Component - Provides popup, confirmation, input, and other functionalities
 */
const ModalDialog = (function() {
    // Dialog container ID
    const CONTAINER_ID = 'modal-dialog-container';
    
    // Current active dialog ID counter
    let currentDialogId = 0;
    
    // Created dialog instances
    const activeDialogs = new Map();
    
    // Dialog queue system
    let pendingDialog = null; // Store the latest request, not a queue
    
    /**
     * Process the dialog to be displayed
     */
    function processPendingDialog() {
        if (!pendingDialog) {
            return;
        }
        
        // If there is currently a dialog displayed, wait for it to close before showing the next one
        if (activeDialogs.size > 0) {
            return;
        }
        
        const nextDialog = pendingDialog;
        pendingDialog = null; // Clear reference, indicating it has been processed
        
        // Show the next dialog and handle the result
        _showModalInternal(nextDialog.options)
            .then(result => {
                nextDialog.resolve(result);
                // Check if there are new popup requests
                setTimeout(processPendingDialog, 50);
            })
            .catch(error => {
                nextDialog.reject(error);
                // Check if there are new popup requests
                setTimeout(processPendingDialog, 50);
            });
    }
    
    /**
     * Create styles
     */
    function createStyles() {
        if (document.getElementById('modal-dialog-styles')) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'modal-dialog-styles';
        styleEl.textContent = `
            #${CONTAINER_ID} {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                pointer-events: none;
            }
            
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: all;
                backdrop-filter: blur(2px);
            }
            
            .modal-dialog {
                position: relative;
                background-color: white;
                border-radius: 8px;
                padding: 24px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                transform: translateY(-20px);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
                max-width: 90%;
                width: 400px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                pointer-events: all;
                overflow: hidden;
                margin: 0 16px;
            }
            
            .modal-dialog.with-animation {
                animation: modal-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            
            .modal-dialog.active {
                transform: translateY(0);
                opacity: 1;
            }
            
            .modal-header {
                margin-bottom: 16px;
                position: relative;
            }
            
            .modal-title {
                font-size: 1.3rem;
                font-weight: 600;
                color: white;
                margin: 0;
                padding-right: 30px;
            }
            
            .modal-close {
                position: absolute;
                top: 0;
                right: 0;
                background: none;
                border: none;
                font-size: 1.5rem;
                line-height: 1;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .modal-close:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .modal-body {
                margin-bottom: 24px;
                overflow-y: auto;
                max-height: calc(80vh - 140px);
                color: #444;
            }
            
            .modal-input-group {
                margin-bottom: 16px;
            }
            
            .modal-input-label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #555;
            }
            
            .modal-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 1rem;
                transition: border-color 0.2s;
            }
            
            .modal-input:focus {
                border-color: #4a90e2;
                outline: none;
                box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
            }
            
            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            .modal-btn {
                padding: 8px 16px;
                font-size: 0.9rem;
                font-weight: 500;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s, transform 0.1s;
                border: none;
            }
            
            .modal-btn:active {
                transform: translateY(1px);
            }
            
            .modal-btn-primary {
                background-color: #4a90e2;
                color: white;
            }
            
            .modal-btn-primary:hover {
                background-color: #3a80d2;
            }
            
            .modal-btn-secondary {
                background-color: #f1f3f5;
                color: #333;
            }
            
            .modal-btn-secondary:hover {
                background-color: #e9ecef;
            }
            
            .modal-error {
                color: #e53935;
                font-size: 0.85rem;
                margin-top: 6px;
                display: none;
            }
            
            .modal-error.visible {
                display: block;
            }
            
            @keyframes modal-bounce {
                0% {
                    transform: translateY(40px);
                    opacity: 0;
                }
                70% {
                    transform: translateY(-7px);
                }
                100% {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 480px) {
                .modal-dialog {
                    width: 100%;
                    max-width: 100%;
                    margin: 0 12px;
                    padding: 16px;
                }
                
                .modal-title {
                    font-size: 1.1rem;
                }
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Ensure the dialog container exists
     * @returns {HTMLElement} Dialog container
     */
    function ensureContainer() {
        let container = document.getElementById(CONTAINER_ID);
        
        if (!container) {
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            document.body.appendChild(container);
        }
        
        return container;
    }
    
    /**
     * Show dialog - Public API, will queue the dialog
     * @param {Object} options - Dialog configuration
     * @returns {Promise} Returns a promise for user action
     */
    function showModal(options = {}) {
        return new Promise((resolve, reject) => {
            // Store the latest popup request, overriding the old one
            pendingDialog = {
                options,
                resolve,
                reject
            };
            
            // Try to process the popup request
            processPendingDialog();
        });
    }
    
    /**
     * Internal implementation to show dialog
     * @param {Object} options - Dialog configuration
     * @returns {Promise} Returns a promise for user action
     */
    function _showModalInternal(options = {}) {
        createStyles();
        const container = ensureContainer();
        
        // Generate unique ID
        const dialogId = `modal-dialog-${++currentDialogId}`;
        
        // Create dialog element
        const dialogElement = document.createElement('div');
        dialogElement.id = dialogId;
        dialogElement.className = 'modal-dialog';
        if (options.animation !== false) {
            dialogElement.classList.add('with-animation');
        }
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        
        // Build dialog content
        const titleHtml = options.title ? `<h3 class="modal-title">${options.title}</h3>` : '';
        const closeButton = options.showClose !== false ? 
            `<button class="modal-close" type="button" aria-label="Close">×</button>` : '';
        
        // Build input fields (if any)
        let inputHtml = '';
        if (options.input) {
            const inputType = options.inputType || 'text';
            const inputValue = options.inputValue || '';
            const placeholder = options.placeholder || '';
            const label = options.inputLabel || '';
            
            inputHtml = `
                <div class="modal-input-group">
                    ${label ? `<label class="modal-input-label">${label}</label>` : ''}
                    <input 
                        type="${inputType}" 
                        class="modal-input" 
                        value="${inputValue}" 
                        placeholder="${placeholder}"
                        ${options.inputAttributes ? options.inputAttributes.join(' ') : ''}
                    >
                    <div class="modal-error"></div>
                </div>
            `;
        }
        
        // Build buttons
        const buttons = options.buttons || [
            {
                text: options.confirmText || 'Confirm',
                type: 'primary',
                action: 'confirm'
            }
        ];
        
        // If there is a cancel button text but no cancel button defined, add one
        if (options.cancelText && !buttons.some(btn => btn.action === 'cancel')) {
            buttons.push({
                text: options.cancelText,
                type: 'secondary',
                action: 'cancel'
            });
        }
        
        const buttonsHtml = buttons.map(btn => {
            return `<button 
                type="button" 
                class="modal-btn modal-btn-${btn.type || 'secondary'}" 
                data-action="${btn.action || ''}"
            >${btn.text}</button>`;
        }).join('');
        
        // Assemble dialog HTML
        dialogElement.innerHTML = `
            <div class="modal-header">
                ${titleHtml}
                ${closeButton}
            </div>
            <div class="modal-body">
                ${options.content || ''}
                ${inputHtml}
            </div>
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        `;
        
        // Add to DOM
        container.appendChild(backdrop);
        container.appendChild(dialogElement);
        
        // Create promise to handle user action
        const modalPromise = new Promise((resolve, reject) => {
            activeDialogs.set(dialogId, { resolve, reject, element: dialogElement });
            
            // Bind button click events
            const buttons = dialogElement.querySelectorAll('.modal-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-action');
                    let inputValue = null;
                    let validationError = false;
                    
                    // If there are input fields, get the input value
                    if (options.input && (action === 'confirm' || action === 'ok')) {
                        const inputEl = dialogElement.querySelector('.modal-input');
                        inputValue = inputEl.value;
                        
                        // Validate input value
                        if (options.inputValidator && typeof options.inputValidator === 'function') {
                            const errorMsg = options.inputValidator(inputValue);
                            if (errorMsg) {
                                const errorEl = dialogElement.querySelector('.modal-error');
                                errorEl.textContent = errorMsg;
                                errorEl.classList.add('visible');
                                validationError = true;
                                return; // Do not close the dialog
                            }
                        }
                    }
                    
                    if (!validationError) {
                        // Close the dialog
                        closeDialog(dialogId, {
                            action: action,
                            value: inputValue
                        });
                    }
                });
            });
            
            // Bind close button event
            const closeBtn = dialogElement.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    closeDialog(dialogId, { action: 'close' });
                });
            }
            
            // Bind backdrop click event (if allowed)
            if (options.closeOnBackdrop !== false) {
                backdrop.addEventListener('click', () => {
                    closeDialog(dialogId, { action: 'backdrop' });
                });
            }
            
            // Bind ESC key event (if allowed)
            if (options.closeOnEsc !== false) {
                const escHandler = (e) => {
                    if (e.key === 'Escape') {
                        closeDialog(dialogId, { action: 'esc' });
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
            }
            
            // Auto-focus input field (if any)
            if (options.input) {
                setTimeout(() => {
                    const inputEl = dialogElement.querySelector('.modal-input');
                    if (inputEl) inputEl.focus();
                }, 100);
            } else if (options.autoFocus !== false) {
                // Otherwise focus the default button
                setTimeout(() => {
                    const defaultBtn = dialogElement.querySelector('.modal-btn-primary');
                    if (defaultBtn) defaultBtn.focus();
                }, 100);
            }
        });
        
        // Show dialog (add animation)
        setTimeout(() => {
            backdrop.style.opacity = '1';
            dialogElement.classList.add('active');
        }, 10);
        
        return modalPromise;
    }
    
    /**
     * Close dialog
     * @param {string} dialogId - Dialog ID
     * @param {Object} result - Return result
     */
    function closeDialog(dialogId, result = {}) {
        const dialogInfo = activeDialogs.get(dialogId);
        if (!dialogInfo) return;
        
        const { element, resolve } = dialogInfo;
        const backdrop = element.previousElementSibling;
        
        // Add close animation
        element.classList.remove('active');
        element.style.opacity = '0';
        backdrop.style.opacity = '0';
        
        // Remove elements
        setTimeout(() => {
            if (element.parentNode) element.parentNode.removeChild(element);
            if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
            activeDialogs.delete(dialogId);
            
            // If there are no active dialogs, remove the container
            if (activeDialogs.size === 0) {
                const container = document.getElementById(CONTAINER_ID);
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            }
            
            // Process the dialog to be displayed
            setTimeout(processPendingDialog, 50);
        }, 300);
        
        // Resolve promise
        resolve(result);
    }
    
    /**
     * Show confirmation dialog
     * @param {string} content - Dialog content
     * @param {Object} options - Dialog configuration
     * @returns {Promise} Returns a promise for user action
     */
    function confirm(content, options = {}) {
        return showModal({
            title: options.title || 'Confirm',
            content: content,
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            ...options
        });
    }
    
    /**
     * Show input dialog
     * @param {Object} options - Dialog configuration
     * @returns {Promise} Returns a promise for user input
     */
    function prompt(options = {}) {
        return showModal({
            title: options.title || 'Please Enter',
            input: true,
            inputType: options.inputType || 'text',
            inputValue: options.inputValue || '',
            placeholder: options.placeholder || '',
            inputLabel: options.inputLabel || '',
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            inputValidator: options.validator,
            ...options
        });
    }
    
    /**
     * Show alert dialog
     * @param {string} content - Dialog content
     * @param {Object} options - Dialog configuration
     * @returns {Promise} Returns a promise for user action
     */
    function alert(content, options = {}) {
        return showModal({
            title: options.title || 'Notice',
            content: content,
            confirmText: options.confirmText || 'Confirm',
            closeOnBackdrop: false,
            ...options
        });
    }
    
    /**
     * Close all dialogs
     */
    function closeAll() {
        // Clear pending dialog
        pendingDialog = null;
        
        activeDialogs.forEach((info, dialogId) => {
            closeDialog(dialogId, { action: 'force-close' });
        });
    }
    
    // Export public API
    return {
        show: showModal,
        alert,
        confirm,
        prompt,
        closeAll
    };
})();

// Compatibility for CommonJS and browser environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ModalDialog;
} else {
    window.ModalDialog = ModalDialog;
} 