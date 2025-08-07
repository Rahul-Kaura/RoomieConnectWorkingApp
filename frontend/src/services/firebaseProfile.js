import { database } from '../firebase';
import { ref, set, get, child } from 'firebase/database';

export const saveProfile = async (profile) => {
  await set(ref(database, `profiles/${profile.id}`), profile);
};

export const loadProfile = async (userId) => {
  const snapshot = await get(child(ref(database), `profiles/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
};

export const loadAllProfiles = async () => {
  const snapshot = await get(child(ref(database), 'profiles'));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
}; 