
// src/form-mapper.js

// Uses Utils.FieldTypes

const FormMapper = {
    /**
     * Scans the document for forms and inputs.
     * @returns {Array<Object>} List of detected forms and their fields.
     */
    detectForms: () => {
        const forms = document.querySelectorAll('form');
        const detected = [];

        forms.forEach((form, index) => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
            const fields = inputs.map(input => FormMapper.classifyField(input)).filter(f => f.type !== 'unknown');

            if (fields.length > 0) {
                detected.push({
                    id: form.id || `form-${index}`,
                    element: form,
                    fields: fields
                });
            }
        });

        // Also catch loose inputs if no form tag (some sites do this)
        // For simplicity, we stick to <form> tags or maybe look for groups of inputs.

        return detected;
    },

    /**
     * Classifies a single input element.
     * @param {HTMLElement} input 
     */
    classifyField: (input) => {
        // Skip hidden, submit, buttons
        if (['hidden', 'submit', 'button', 'image', 'reset'].includes(input.type)) {
            return { type: 'unknown', element: input };
        }

        const attrs = [
            input.name,
            input.id,
            input.getAttribute('autocomplete'),
            input.placeholder
        ].map(s => (s || '').toLowerCase());

        // Check label
        let labelText = '';
        if (input.labels && input.labels.length > 0) {
            labelText = input.labels[0].textContent;
        } else {
            // Try to find a nearby label?
            // Simple heuristic: check parent text
        }
        attrs.push(labelText.toLowerCase());

        const scores = {
            name: 0,
            email: 0,
            phone: 0,
            address: 0
        };

        // Scoring
        const checkRegex = (pattern, weight, category) => {
            attrs.forEach(str => {
                if (str.includes(pattern)) scores[category] += weight;
            });
        };

        // Heuristics
        // NAME
        Utils.FieldTypes.NAME.forEach(kw => checkRegex(kw, 2, 'name'));

        // EMAIL
        if (input.type === 'email') scores.email += 5;
        Utils.FieldTypes.EMAIL.forEach(kw => checkRegex(kw, 2, 'email'));

        // PHONE
        if (input.type === 'tel') scores.phone += 5;
        Utils.FieldTypes.PHONE.forEach(kw => checkRegex(kw, 2, 'phone'));

        // ADDRESS
        Utils.FieldTypes.ADDRESS.forEach(kw => checkRegex(kw, 2, 'address'));

        // Determine winner
        let max = 0;
        let type = 'unknown';

        for (const [key, val] of Object.entries(scores)) {
            if (val > max) {
                max = val;
                type = key;
            }
        }

        return {
            type,
            element: input,
            score: max
        };
    },

    /**
     * Fills a form with profile data.
     * @param {Object} formMeta - The detected form object
     * @param {Object} profile - The decrypted profile object
     */
    fillForm: (formMeta, profile) => {
        let filledCount = 0;
        formMeta.fields.forEach(field => {
            if (profile[field.type]) {
                // Handle value injection
                // Trigger generic events to ensure React/frameworks pick up the change
                const val = profile[field.type];
                field.element.value = val;
                field.element.dispatchEvent(new Event('input', { bubbles: true }));
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
        });
        return filledCount;
    }
};

if (typeof window !== 'undefined') {
    window.FormMapper = FormMapper;
}
