
// src/background.js

try {
    importScripts('crypto.js', 'storage.js');
} catch (e) {
    console.error(e);
}

// Key for storage session
const SESSION_KEY_NAME = 'masterKeyJWK';

// --- Session Management ---

async function getSessionKey() {
    const stored = await chrome.storage.session.get(SESSION_KEY_NAME);
    if (!stored[SESSION_KEY_NAME]) return null;

    // Import key
    return crypto.subtle.importKey(
        "jwk",
        stored[SESSION_KEY_NAME],
        { name: "AES-GCM", length: 256 },
        true, // extractable
        ["encrypt", "decrypt"]
    );
}

async function setSessionKey(cryptoKey) {
    const jwk = await crypto.subtle.exportKey("jwk", cryptoKey);
    await chrome.storage.session.set({ [SESSION_KEY_NAME]: jwk });
}

async function clearSession() {
    await chrome.storage.session.remove(SESSION_KEY_NAME);
}

// --- Message Handlers ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            const { action, payload } = message;

            if (action === 'CMD_CHECK_STATUS') {
                const hasVault = await StorageService.hasVault();
                const key = await getSessionKey();
                sendResponse({
                    hasVault: hasVault,
                    locked: !key
                });
                return;
            }

            if (action === 'CMD_CREATE_VAULT') {
                // payload: { password }
                await StorageService.initVault({ profiles: [] }, payload.password);
                // Automatically unlock?
                // We need to derive the key again or use one we just made. 
                // For simplicity, just leverage initVault's implicit work or do full unlock flow.
                const { key } = await StorageService.unlockVault(payload.password);
                await setSessionKey(key);
                sendResponse({ success: true });
                return;
            }

            if (action === 'CMD_UNLOCK') {
                // payload: { password }
                try {
                    const { key } = await StorageService.unlockVault(payload.password);
                    await setSessionKey(key);
                    sendResponse({ success: true });
                } catch (e) {
                    sendResponse({ success: false, error: e.message });
                }
                return;
            }

            if (action === 'CMD_LOCK') {
                await clearSession();
                sendResponse({ success: true });
                return;
            }

            // -- Protected Routes (Require Key) --
            const key = await getSessionKey();
            if (!key) {
                sendResponse({ error: 'LOCKED' });
                return;
            }

            // Load data to process
            // We assume StorageService.unlockVault is for getting KEY + Data.
            // But here we already have KEY. We need to just decrypt.
            // StorageService doesn't have a "decrypt with key" load method exposed directly 
            // except "saveVaultWithKey".
            // We should really implement "loadVaultWithKey". 
            // But we can replicate logic or update StorageService.
            // Let's rely on manually calling decrypt here using utils provided by StorageService code pattern.

            const stored = await chrome.storage.local.get(['vault_salt', 'vault_iv', 'vault_data']);
            if (!stored.vault_data) {
                sendResponse({ error: 'NO_VAULT' });
                return;
            }

            let vaultData;
            try {
                vaultData = await CryptoUtils.decryptData(stored.vault_data, stored.vault_iv, key);
            } catch (e) {
                // If decryption fails with valid session key? Should not happen unless data corrupted or key wrong (unlikely if session maintained).
                sendResponse({ error: 'DECRYPT_FAILED' });
                return;
            }

            if (action === 'CMD_GET_PROFILES') {
                sendResponse({ profiles: vaultData.profiles || [] });
            }

            else if (action === 'CMD_SAVE_PROFILES') {
                // payload: { profiles }
                vaultData.profiles = payload.profiles;
                await StorageService.saveVaultWithKey(vaultData, key);
                sendResponse({ success: true });
            }

            else if (action === 'CMD_WIPE') {
                await StorageService.clearVault();
                await clearSession();
                sendResponse({ success: true });
            }

        } catch (err) {
            console.error(err);
            sendResponse({ error: err.message });
        }
    })();
    return true; // Keep channel open
});
