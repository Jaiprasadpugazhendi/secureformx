
// src/profileManager.js

const ProfileManager = {
    createProfile: (name, data) => {
        return {
            id: Date.now().toString(), // Simple ID
            name: name,
            ...data // Contains: name, email, phone, address, etc.
        };
    },

    validateProfile: (profile) => {
        if (!profile.name || profile.name.trim() === '') return false;
        // Add more validation if needed
        return true;
    },

    /**
     * Adds or updates a profile in the profiles list
     * @param {Array} profiles 
     * @param {Object} newProfile 
     */
    saveProfileToList: (profiles, newProfile) => {
        const index = profiles.findIndex(p => p.id === newProfile.id);
        if (index >= 0) {
            profiles[index] = newProfile;
        } else {
            profiles.push(newProfile);
        }
        return profiles;
    },

    deleteProfile: (profiles, id) => {
        return profiles.filter(p => p.id !== id);
    }
};

if (typeof window !== 'undefined') {
    window.ProfileManager = ProfileManager;
}
