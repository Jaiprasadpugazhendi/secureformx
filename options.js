
// options/options.js

const els = {
    authSection: document.getElementById('auth-section'),
    dashboard: document.getElementById('dashboard'),
    status: document.getElementById('status'),
    masterPass: document.getElementById('masterPassword'),
    authBtn: document.getElementById('authBtn'),
    lockBtn: document.getElementById('lockBtn'),
    authTitle: document.getElementById('authTitle'),
    authHint: document.getElementById('authHint'),
    setupHint: document.getElementById('setup-hint'),

    profilesContainer: document.getElementById('profilesContainer'),
    addProfileBtn: document.getElementById('addProfileBtn'),
    editor: document.getElementById('editor'),
    editorTitle: document.getElementById('editorTitle'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    profileForm: document.getElementById('profileForm'),

    wipeBtn: document.getElementById('wipeBtn'),

    // Form fields
    p_id: document.getElementById('p_id'),
    p_name: document.getElementById('p_name'),
    p_fullname: document.getElementById('p_fullname'),
    p_email: document.getElementById('p_email'),
    p_phone: document.getElementById('p_phone'),
    p_address: document.getElementById('p_address'),
    p_city: document.getElementById('p_city'),
    p_zip: document.getElementById('p_zip'),
    p_country: document.getElementById('p_country'),
};

let profiles = [];
let isSetupMode = false;

// --- Initialization ---

async function init() {
    const resp = await chrome.runtime.sendMessage({ action: 'CMD_CHECK_STATUS' });
    if (resp.hasVault) {
        if (resp.locked) {
            showAuth('unlock');
        } else {
            showDashboard();
        }
    } else {
        showAuth('setup');
    }
}

function showAuth(mode) {
    els.authSection.hidden = false;
    els.dashboard.hidden = true;
    els.lockBtn.hidden = true;

    if (mode === 'setup') {
        isSetupMode = true;
        els.authTitle.textContent = "Setup Secure Vault";
        els.authBtn.textContent = "Create Vault";
        els.authHint.hidden = true;
        els.setupHint.hidden = false;
    } else {
        isSetupMode = false;
        els.authTitle.textContent = "Unlock Vault";
        els.authBtn.textContent = "Unlock";
        els.authHint.hidden = false;
        els.setupHint.hidden = true;
    }
}

async function showDashboard() {
    els.authSection.hidden = true;
    els.dashboard.hidden = false;
    els.lockBtn.hidden = false;

    const resp = await chrome.runtime.sendMessage({ action: 'CMD_GET_PROFILES' });
    if (resp.profiles) {
        profiles = resp.profiles;
        renderProfiles();
    }
}

// --- Auth Actions ---

els.authBtn.addEventListener('click', async () => {
    const password = els.masterPass.value;
    if (!password) return;

    Utils.setStatus(els.status, 'Processing...', 'info');

    if (isSetupMode) {
        // Create Vault
        const resp = await chrome.runtime.sendMessage({ action: 'CMD_CREATE_VAULT', payload: { password } });
        if (resp.success) {
            els.masterPass.value = '';
            showDashboard();
        }
    } else {
        // Unlock
        const resp = await chrome.runtime.sendMessage({ action: 'CMD_UNLOCK', payload: { password } });
        if (resp.success) {
            els.masterPass.value = '';
            showDashboard();
        } else {
            Utils.setStatus(els.status, 'Incorrect Password', 'error');
        }
    }
});

els.lockBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'CMD_LOCK' });
    location.reload();
});

// --- Profile Management ---

function renderProfiles() {
    els.profilesContainer.innerHTML = '';
    profiles.forEach(p => {
        const div = document.createElement('div');
        div.className = 'profile-item';
        div.innerHTML = `
      <div class="profile-info">
        <strong>${p.name}</strong>
        <span>${p.email || 'No email'}</span>
      </div>
      <button class="btn-text" data-id="${p.id}">Edit</button>
    `;
        div.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            editProfile(p.id);
        });
        els.profilesContainer.appendChild(div);
    });
}

els.addProfileBtn.addEventListener('click', () => {
    resetEditor();
    els.editor.hidden = false;
    els.editorTitle.textContent = "New Profile";
});

function editProfile(id) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    els.p_id.value = p.id;
    els.p_name.value = p.name || '';
    els.p_fullname.value = p.fullName || ''; // Mapping keys from FormMapper?
    // FormMapper uses keys like 'name', 'email'. 
    // Let's stick to standard internal keys: name, email, phone, address, fullName.

    els.p_email.value = p.email || '';
    els.p_phone.value = p.phone || '';
    els.p_address.value = p.address || '';
    els.p_city.value = p.city || '';
    els.p_zip.value = p.zip || '';
    els.p_country.value = p.country || '';

    els.editor.hidden = false;
    els.editorTitle.textContent = "Edit Profile";
}

els.cancelEditBtn.addEventListener('click', () => {
    els.editor.hidden = true;
});

els.profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = els.p_id.value;

    // Construct data
    const data = {
        name: els.p_name.value,

        // Fields mapped to auto-fill
        // Utils.FieldTypes.NAME -> [name, fullname...]
        // We should store: name (profile name), fullname (value), email (value)...
        fullName: els.p_fullname.value,
        name: els.p_fullname.value, // redundant/fallback
        email: els.p_email.value,
        phone: els.p_phone.value,
        address: els.p_address.value,
        city: els.p_city.value,
        zip: els.p_zip.value,
        country: els.p_country.value
    };

    if (id) {
        // Update existing
        const idx = profiles.findIndex(p => p.id === id);
        if (idx >= 0) {
            profiles[idx] = { ...profiles[idx], ...data };
        }
    } else {
        // Create new
        const newP = ProfileManager.createProfile(data.name, data);
        profiles.push(newP);
    }

    // Save to backend
    await saveProfiles();

    renderProfiles();
    els.editor.hidden = true;
    Utils.setStatus(els.status, 'Profile saved.', 'success');
});

async function saveProfiles() {
    await chrome.runtime.sendMessage({
        action: 'CMD_SAVE_PROFILES',
        payload: { profiles }
    });
}

// --- Danger Zone ---

els.wipeBtn.addEventListener('click', async () => {
    if (confirm("Are you sure? This will delete ALL data permanently.")) {
        await chrome.runtime.sendMessage({ action: 'CMD_WIPE' });
        location.reload();
    }
});

// Run
init();
