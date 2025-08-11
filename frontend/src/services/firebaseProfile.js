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

// Force sync all profiles to ensure consistency
export const forceSyncAllProfiles = async () => {
  try {
    console.log('🔄 Force syncing all profiles...');
    
    // Load profiles from backend
    const response = await fetch('/api/profiles');
    if (!response.ok) {
      throw new Error('Failed to fetch backend profiles');
    }
    
    const backendProfiles = await response.json();
    console.log(`📊 Backend profiles found: ${backendProfiles.length}`);
    
    // Load current Firebase profiles
    const currentFirebaseProfiles = await loadAllProfiles();
    console.log(`📊 Current Firebase profiles: ${currentFirebaseProfiles.length}`);
    
    // Create a map of existing Firebase profiles
    const firebaseProfileMap = new Map();
    currentFirebaseProfiles.forEach(profile => {
      const key = profile.id || profile.userId;
      if (key) firebaseProfileMap.set(key, profile);
    });
    
    // Sync backend profiles to Firebase
    let syncedCount = 0;
    let updatedCount = 0;
    
    for (const backendProfile of backendProfiles) {
      const profileKey = backendProfile.userId || backendProfile.id;
      
      if (!firebaseProfileMap.has(profileKey)) {
        // New profile - save to Firebase
        const firebaseProfile = {
          id: profileKey,
          userId: profileKey,
          name: backendProfile.name,
          age: backendProfile.age,
          major: backendProfile.major,
          location: backendProfile.location,
          image: backendProfile.image,
          instagram: backendProfile.instagram,
          allergies: backendProfile.allergies,
          answers: backendProfile.answers,
          score: backendProfile.score,
          isTestProfile: true,
          lastSynced: Date.now()
        };
        
        await saveProfile(firebaseProfile);
        syncedCount++;
        console.log(`✅ Synced new profile: ${backendProfile.name}`);
      } else {
        // Profile exists - check if update needed
        const existingProfile = firebaseProfileMap.get(profileKey);
        if (existingProfile.lastSynced < Date.now() - 86400000) { // 24 hours
          // Update existing profile
          const updatedProfile = {
            ...existingProfile,
            name: backendProfile.name,
            age: backendProfile.age,
            major: backendProfile.major,
            location: backendProfile.location,
            image: backendProfile.image,
            instagram: backendProfile.instagram,
            allergies: backendProfile.allergies,
            answers: backendProfile.answers,
            score: backendProfile.score,
            lastSynced: Date.now()
          };
          
          await saveProfile(updatedProfile);
          updatedCount++;
          console.log(`🔄 Updated profile: ${backendProfile.name}`);
        }
      }
    }
    
    console.log(`✅ Force sync complete: ${syncedCount} new, ${updatedCount} updated`);
    return { success: true, synced: syncedCount, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Error during force sync:', error);
    return { success: false, error: error.message };
  }
};

// Get profile by any ID field
export const getProfileById = async (profileId) => {
  try {
    // Try Firebase first
    let profile = await loadProfile(profileId);
    
    if (!profile) {
      // Try backend as fallback
      try {
        const response = await fetch(`/api/profile/user/${profileId}`);
        if (response.ok) {
          const backendProfile = await response.json();
          if (backendProfile.hasProfile) {
            profile = backendProfile.profile;
            // Save to Firebase for future use
            await saveProfile(profile);
          }
        }
      } catch (backendError) {
        console.error('Backend fallback failed:', backendError);
      }
    }
    
    return profile;
  } catch (error) {
    console.error('Error getting profile by ID:', error);
    return null;
  }
}; 