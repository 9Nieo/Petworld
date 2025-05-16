// Contract utility functions

/**
 * Asynchronously load a JavaScript script
 * @param {string} scriptPath - The path of the script
 * @returns {Promise<boolean>} - Returns true if loaded successfully, false if failed
 */
async function loadContractScript(scriptPath) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = scriptPath;
        script.type = 'text/javascript';
        script.onload = function() {
            console.log(`Script ${scriptPath} loaded successfully`);
            resolve(true);
        };
        script.onerror = function() {
            console.error(`Script ${scriptPath} failed to load`);
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

/**
 * Check if the contract ABI has been loaded
 * @param {string} abiName - ABI variable name
 * @returns {boolean} - Returns true if loaded, otherwise false
 */
function isContractABILoaded(abiName) {
    return typeof window[abiName] !== 'undefined';
} 