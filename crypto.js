
// src/crypto.js

const PBKDF2_ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12; // AES-GCM standard
const KEY_ALGO = 'AES-GCM';

const CryptoUtils = {
  /**
   * Generates a random salt.
   * @returns {Uint8Array}
   */
  generateSalt: () => {
    return crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  },

  /**
   * Derives a CryptoKey from the master password using PBKDF2.
   * @param {string} password 
   * @param {Uint8Array} salt 
   * @returns {Promise<CryptoKey>}
   */
  deriveKey: async (password, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: KEY_ALGO, length: 256 },
      true, // Key is extractable (required for session storage persistence)
      ["encrypt", "decrypt"]
    );
  },

  /**
   * Encrypts an object using the provided key.
   * @param {Object} data - The data directly (will be JSON stringified)
   * @param {CryptoKey} key 
   * @returns {Promise<{ciphertext: string, iv: string, salt: string}>} - Base64 encoded strings
   */
  encryptData: async (data, key) => {
    // Note: We normally need the salt used to derive the key to be stored with the data 
    // IF the key is re-derived each time.
    // However, here the key is passed in.
    // We assume the caller handles salt management if the key needs to be re-derived later.
    // Actually, usually you store salt + iv + ciphertext.

    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: KEY_ALGO, iv: iv },
      key,
      encodedData
    );

    return {
      ciphertext: CryptoUtils.bufferToBase64(encryptedBuffer),
      iv: CryptoUtils.bufferToBase64(iv)
    };
  },

  /**
   * Decrypts ciphertext.
   * @param {string} ciphertextBase64 
   * @param {string} ivBase64 
   * @param {CryptoKey} key 
   * @returns {Promise<Object>} The original data object
   */
  decryptData: async (ciphertextBase64, ivBase64, key) => {
    const ciphertext = CryptoUtils.base64ToBuffer(ciphertextBase64);
    const iv = CryptoUtils.base64ToBuffer(ivBase64);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: KEY_ALGO, iv: iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decryptedBuffer));
    } catch (e) {
      console.error("Decryption failed:", e);
      throw new Error("Failed to decrypt data. Wrong password?");
    }
  },

  bufferToBase64: (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  base64ToBuffer: (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
};

// Export for ES modules or global usage depending on context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoUtils;
} else {
  // Use self for Service Workers or window for UI
  (typeof self !== 'undefined' ? self : window).CryptoUtils = CryptoUtils;
}
