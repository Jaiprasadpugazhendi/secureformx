
# SecureFormX

SecureFormX is a privacy-first Chrome Extension that autofills forms using locally encrypted user profiles.

## Features

- **Local Encryption**: All data is encrypted with AES-256 (GCM) using a key derived from your master password (PBKDF2).
- **Zero-Knowledge**: Your master password and keys are never stored on disk. They exist only in memory (Session) while unlocked.
- **Multiple Profiles**: Manage separate identities for Personal, Work, Shopping, etc.
- **Smart Form Detection**: Auto-detects Name, Email, Phone, Address, and more.
- **Secure Wipe**: Instantly delete all encrypted data from the browser.

## Architecture

1. **Popup & Options UI**: Acts as a thin client. Sends commands to the Background Service Worker.
2. **Background Service Worker**:
   - Manages the **Session Key** (stored in `chrome.storage.session` which is memory-only and encrypted by Chrome).
   - Handles **Encryption/Decryption** operations using the Web Crypto API.
   - Persists encrypted blobs to `chrome.storage.local`.
3. **Content Script**:
   - Injected into web pages.
   - Detects forms using heuristics (`FormMapper`).
   - Receives fill commands from the user via the Popup.

## Setup Instructions

1. **Load Unpacked**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" (top right).
   - Click "Load unpacked" and select the `secureformx` folder.

2. **Initialize Vault**:
   - Click the extension icon.
   - You will be prompted to set up a new Master Password.
   - This password is the ONLY way to decrypt your data. **Do not forget it.**

3. **Create Profile**:
   - Go to Options (via the link in Popup or right-click extension -> Options).
   - Add a new profile (e.g., "Personal").
   - Fill in your details.

4. **Autofill**:
   - Navigate to a page with a form (e.g., a signup page).
   - Click the SecureFormX icon.
   - Unlock if needed.
   - Select your profile and click "Autofill Form".

## Security Details

- **Algorithm**: AES-GCM (256-bit).
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations.
- **Salt**: 16-byte random salt, stored alongside the vault.
- **IV**: 12-byte random IV for every encryption operation.

## Future Roadmap

- [ ] Support checking for weak passwords.
- [ ] Export/Import encrypted backups.
- [ ] Support credit card fields (requires strict security checks).
- [ ] Biometric unlock (via WebAuthn).
