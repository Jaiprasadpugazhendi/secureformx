
// src/utils.js

const Utils = {
    /**
     * Defines the field types we are looking for.
     */
    FieldTypes: {
        NAME: ['name', 'fullname', 'first-name', 'last-name', 'firstname', 'lastname', 'user'],
        EMAIL: ['email', 'e-mail', 'mail'],
        PHONE: ['phone', 'tel', 'mobile', 'cell'],
        ADDRESS: ['address', 'street', 'city', 'state', 'zip', 'postal', 'country'],
        UNKNOWN: []
    },

    log: (msg, data = null) => {
        if (data) {
            console.log(`[SecureFormX] ${msg}`, data);
        } else {
            console.log(`[SecureFormX] ${msg}`);
        }
    },

    /**
     * Sleep function for async delays.
     * @param {number} ms 
     */
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),

    /**
     * Helper to set status in the UI (if we pass the element).
     */
    setStatus: (element, message, type = 'info') => {
        if (!element) return;
        element.textContent = message;
        element.className = `status ${type}`; // Expects css classes .info, .error, .success
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status';
        }, 3000);
    }
};

if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
