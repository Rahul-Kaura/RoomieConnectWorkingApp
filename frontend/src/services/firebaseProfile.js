import { database } from '../firebase';
import { ref, set, get, child } from 'firebase/database';

export const saveProfile = async (profile) => {
  console.log('Saving profile to Firebase:', profile);
  console.log('Profile ID:', profile.id);
  console.log('Firebase path: profiles/' + profile.id);
  await set(ref(database, `profiles/${profile.id}`), profile);
  console.log('Profile saved successfully');
};

export const loadProfile = async (userId) => {
  console.log('Loading profile from Firebase for user ID:', userId);
  console.log('Firebase path: profiles/' + userId);
  const snapshot = await get(child(ref(database), `profiles/${userId}`));
  console.log('Firebase snapshot exists:', snapshot.exists());
  if (snapshot.exists()) {
    const profile = snapshot.val();
    console.log('Loaded profile data:', profile);
    return profile;
  } else {
    console.log('No profile found for user ID:', userId);
    return null;
  }
};

export const loadAllProfiles = async () => {
  const snapshot = await get(child(ref(database), 'profiles'));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
}; 