/**
 * Profile service: all storage and reads go through the backend.
 * Backend owns Firebase profile creation/storage; frontend only fetches from backend.
 */
import { API_URL } from '../config';

/**
 * Save a user profile (backend persists to Firebase).
 */
export const saveProfile = async (profile) => {
  if (!profile || !profile.id) {
    console.warn('saveProfile: profile or profile.id is missing, skip save');
    return profile;
  }
  const data = {
    ...profile,
    userId: profile.userId ?? profile.id,
    lastUpdated: profile.lastUpdated ?? new Date().toISOString(),
  };
  const response = await fetch(`${API_URL}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to save profile');
  }
  return response.json();
};

/**
 * Load one profile by userId (from backend → Firebase).
 */
export const loadProfile = async (userId) => {
  if (!userId) return null;
  try {
    const response = await fetch(`${API_URL}/profile/user/${encodeURIComponent(userId)}`);
    if (!response.ok) return null;
    const { hasProfile, profile } = await response.json();
    return hasProfile ? profile : null;
  } catch (e) {
    console.error('loadProfile error:', e);
    return null;
  }
};

/**
 * Load all profiles (from backend → Firebase).
 */
export const loadAllProfiles = async () => {
  try {
    const response = await fetch(`${API_URL}/profiles`);
    if (!response.ok) return [];
    const list = await response.json();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('loadAllProfiles error:', e);
    return [];
  }
};

const POLL_INTERVAL_MS = 15000;

/**
 * Listen to profile list (polls backend; no Firebase in frontend for profiles).
 */
export const listenToProfiles = (callback) => {
  const poll = async () => {
    const list = await loadAllProfiles();
    callback(list);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL_MS);
  return () => clearInterval(interval);
};

/**
 * Stop listening (no-op for polling; clearInterval is returned by listenToProfiles).
 */
export const stopListeningToProfiles = (listenerCleanup) => {
  if (typeof listenerCleanup === 'function') listenerCleanup();
};

/**
 * Profile count from backend.
 */
export const getProfileCount = async () => {
  const list = await loadAllProfiles();
  return list.length;
};

/**
 * Monitor for new profile additions (polls backend).
 */
export const monitorNewProfiles = (callback) => {
  let previousCount = 0;
  let previousProfiles = [];

  const poll = async () => {
    const currentProfiles = await loadAllProfiles();
    const currentCount = currentProfiles.length;

    if (currentCount > previousCount) {
      const newProfiles = currentProfiles.filter(
        (profile) => !previousProfiles.some((prev) => (prev.id || prev.userId) === (profile.id || profile.userId))
      );
      if (newProfiles.length > 0) {
        callback(newProfiles, currentProfiles);
      }
    }
    previousCount = currentCount;
    previousProfiles = currentProfiles;
  };

  poll();
  const interval = setInterval(poll, POLL_INTERVAL_MS);
  return () => clearInterval(interval);
};

/**
 * Backend owns Firebase; no client-side sync needed.
 */
export const forceSyncAllProfiles = async () => {
  console.log('Profile storage is backend-owned; no client sync needed.');
  return { success: true, synced: 0, updated: 0 };
};

/**
 * Get profile by id (fetches from backend).
 */
export const getProfileById = async (profileId) => {
  return loadProfile(profileId);
};
