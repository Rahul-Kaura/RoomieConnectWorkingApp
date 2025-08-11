import { ref, set, get, child, onValue, off } from 'firebase/database';
import { database } from '../firebase';

export const saveProfile = async (profile) => {
  const profileRef = ref(database, `profiles/${profile.id}`);
  await set(profileRef, profile);
  return profile;
};

export const loadProfile = async (userId) => {
  const snapshot = await get(child(ref(database), `profiles/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
};

export const loadAllProfiles = async () => {
  const snapshot = await get(child(ref(database), 'profiles'));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

// Real-time profile listening for automatic updates
export const listenToProfiles = (callback) => {
  const profilesRef = ref(database, 'profiles');
  
  const listener = onValue(profilesRef, (snapshot) => {
    if (snapshot.exists()) {
      const profiles = Object.values(snapshot.val());
      callback(profiles);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error listening to profiles:', error);
    callback([]);
  });
  
  return listener;
};

// Stop listening to profiles
export const stopListeningToProfiles = (listener) => {
  if (listener) {
    off(ref(database, 'profiles'), 'value', listener);
  }
};

// Get profile count for monitoring
export const getProfileCount = async () => {
  const snapshot = await get(child(ref(database, 'profiles')));
  return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
};

// Monitor for new profile additions
export const monitorNewProfiles = (callback) => {
  let previousCount = 0;
  let previousProfiles = [];
  
  const listener = onValue(ref(database, 'profiles'), (snapshot) => {
    if (snapshot.exists()) {
      const currentProfiles = Object.values(snapshot.val());
      const currentCount = currentProfiles.length;
      
      // Check if new profiles were added
      if (currentCount > previousCount) {
        const newProfiles = currentProfiles.filter(profile => 
          !previousProfiles.some(prev => prev.id === profile.id)
        );
        
        if (newProfiles.length > 0) {
          console.log(`🆕 New profiles detected: ${newProfiles.length}`, newProfiles.map(p => p.name));
          callback(newProfiles, currentProfiles);
        }
      }
      
      previousCount = currentCount;
      previousProfiles = currentProfiles;
    }
  }, (error) => {
    console.error('Error monitoring new profiles:', error);
  });
  
  return listener;
}; 