
// src/content.js

(async () => {
    const detectedForms = FormMapper.detectForms();
    Utils.log(`Detected ${detectedForms.length} forms.`);

    // Listen for messages from Background/Popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'CMD_FILL_FORM') {
            const { profile } = msg.payload;
            Utils.log('Received profile to fill', profile);

            let totalFilled = 0;
            detectedForms.forEach(form => {
                totalFilled += FormMapper.fillForm(form, profile);
            });

            if (detectedForms.length === 0) {
                // Retry detection?
                const newForms = FormMapper.detectForms();
                newForms.forEach(form => {
                    totalFilled += FormMapper.fillForm(form, profile);
                });
            }

            sendResponse({ success: true, count: totalFilled });
        }
    });

    // Check for auto-fill if the vault is unlocked
    // We send a message to background asking for auto-fill data if enabled
    try {
        const response = await chrome.runtime.sendMessage({ action: 'CMD_AUTOFILL_REQUEST', url: window.location.href });
        if (response && response.profile) {
            Utils.log('Auto-filling form');
            detectedForms.forEach(form => {
                FormMapper.fillForm(form, response.profile);
            });
        }
    } catch (e) {
        // Background might not be listening or ready
        // Ignore
    }

})();
