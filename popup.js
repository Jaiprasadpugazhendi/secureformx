
// popup/popup.js

const els = {
    viewLogin: document.getElementById('view-login'),
    viewMain: document.getElementById('view-main'),
    viewSetup: document.getElementById('view-setup'),
    status: document.getElementById('status'),
    masterPass: document.getElementById('masterPassword'),
    unlockBtn: document.getElementById('unlockBtn'),
    setupBtn: document.getElementById('setupBtn'),
    goToOptionsBtn: document.getElementById('goToOptionsBtn'),
    profileSelect: document.getElementById('profileSelect'),
    fillBtn: document.getElementById('fillBtn'),
    optionsBtn: document.getElementById('optionsBtn'),
    lockBtn: document.getElementById('lockBtn')
};

let profiles = [];

async function checkStatus() {
    const resp = await chrome.runtime.sendMessage({ action: 'CMD_CHECK_STATUS' });
    if (!resp) return;

    if (!resp.hasVault) {
        showView('setup');
    } else if (resp.locked) {
        showView('login');
    } else {
        loadProfiles();
    }
}

function showView(name) {
    els.viewLogin.hidden = true;
    els.viewMain.hidden = true;
    els.viewSetup.hidden = true;
    els.lockBtn.hidden = true;

    if (name === 'login') els.viewLogin.hidden = false;
    if (name === 'setup') els.viewSetup.hidden = false;
    if (name === 'main') {
        els.viewMain.hidden = false;
        els.lockBtn.hidden = false;
    }
}

async function loadProfiles() {
    const resp = await chrome.runtime.sendMessage({ action: 'CMD_GET_PROFILES' });
    if (resp.error) {
        Utils.setStatus(els.status, 'Error loading profiles', 'error');
        return;
    }

    profiles = resp.profiles || [];
    updateProfileSelect();
    showView('main');
}

function updateProfileSelect() {
    els.profileSelect.innerHTML = '';
    if (profiles.length === 0) {
        const opt = document.createElement('option');
        opt.text = "No profiles found";
        els.profileSelect.add(opt);
        els.fillBtn.disabled = true;
        return;
    }

    els.fillBtn.disabled = false;
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.text = p.name;
        els.profileSelect.add(opt);
    });
}

// Event Listeners

els.unlockBtn.addEventListener('click', async () => {
    const password = els.masterPass.value;
    if (!password) return;

    Utils.setStatus(els.status, 'Unlocking...', 'info');
    const resp = await chrome.runtime.sendMessage({ action: 'CMD_UNLOCK', payload: { password } });

    if (resp.success) {
        els.masterPass.value = '';
        loadProfiles();
    } else {
        Utils.setStatus(els.status, 'Incorrect Password', 'error');
    }
});

els.lockBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'CMD_LOCK' });
    checkStatus();
});

els.setupBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

els.goToOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

els.optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

els.fillBtn.addEventListener('click', async () => {
    const profileId = els.profileSelect.value;
    const profile = profiles.find(p => p.id === profileId);

    if (!profile) return;

    Utils.setStatus(els.status, 'Filling...', 'info');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
        const resp = await chrome.tabs.sendMessage(tab.id, {
            action: 'CMD_FILL_FORM',
            payload: { profile }
        });

        if (resp && resp.success) {
            Utils.setStatus(els.status, `Filled ${resp.count} fields!`, 'success');
            // window.close(); // Optional: close popup
        } else {
            Utils.setStatus(els.status, 'No forms filled.', 'info');
        }
    } catch (e) {
        Utils.setStatus(els.status, 'Could not communicate with page. Reload?', 'error');
    }
});

// Init
checkStatus();
