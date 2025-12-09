
// src/storage.js

// Depends on CryptoUtils

const StorageService = {
    /**
     * Checks if a vault exists in local storage.
     * @returns {Promise<boolean>}
     */
    hasVault: async () => {
        const result = await chrome.storage.local.get(['vault_salt', 'vault_iv', 'vault_data']);
        return !!(result.vault_salt && result.vault_iv && result.vault_data);
    },

    /**
     * Initializes a new vault or overwrites existing one with provided data.
     * Use this to simple save profiles.
     * @param {Object} data - The plain object to store (e.g. { profiles: [] })
     * @param {string} password - The master password to encrypt with
     */
    initVault: async (data, password) => {
        const salt = CryptoUtils.generateSalt();
        const key = await CryptoUtils.deriveKey(password, salt);

        const encrypted = await CryptoUtils.encryptData(data, key);

        await chrome.storage.local.set({
            vault_salt: CryptoUtils.bufferToBase64(salt.buffer), // salt is ArrayBuffer/Uint8Array
            vault_iv: encrypted.iv,
            vault_data: encrypted.ciphertext
        });
    },

    /**
     * Saves the data using an ALREADY DERIVED key.
     * This is for when the user is already logged in.
     * @param {Object} data 
     * @param {CryptoKey} key 
     */
    saveVaultWithKey: async (data, key) => {
        const encrypted = await CryptoUtils.encryptData(data, key);
        // We keep the SAME salt, but we regenerate IV in encryptData which is good.
        // Wait, if we change the IV, we must save it.
        // We assume the salt stored in 'vault_salt' is valid for the key we are using.
        // Ideally we re-fetch the salt to be sure, or just update iv and data.

        await chrome.storage.local.set({
            vault_iv: encrypted.iv, // Update IV
            vault_data: encrypted.ciphertext
        });
    },

    /**
     * Loads and decrypts the vault.
     * @param {string} password 
     * @returns {Promise<Object>} The decrypted data
     */
    unlockVault: async (password) => {
        const stored = await chrome.storage.local.get(['vault_salt', 'vault_iv', 'vault_data']);
        if (!stored.vault_salt || !stored.vault_iv || !stored.vault_data) {
            throw new Error("No vault found.");
        }

        const salt = CryptoUtils.base64ToBuffer(stored.vault_salt);
        const key = await CryptoUtils.deriveKey(password, salt);

        const data = await CryptoUtils.decryptData(
            stored.vault_data,
            stored.vault_iv,
            key
        );

        return { data, key }; // Return key so we can keep it in memory
    },

    /**
     * Securely wipes all data.
     */
    clearVault: async () => {
        await chrome.storage.local.clear();
    }
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
