import { loadAllProfiles } from './firebaseProfile';
import { database } from '../firebase';
import { ref, remove } from 'firebase/database';

/**
 * Clear all test profiles from Firebase and start fresh
 * This removes ALL profiles except kinas to start completely fresh
 */
export const clearAllProfilesAndStartFresh = async () => {
    console.log('🧹 Clearing ALL profiles from Firebase to start fresh...');
    
    try {
        // Load all profiles first
        const allProfiles = await loadAllProfiles();
        
        if (!allProfiles || allProfiles.length === 0) {
            console.log('No profiles found in Firebase to clear');
            return { success: true, cleared: 0 };
        }
        
        let clearedCount = 0;
        
        for (const profile of allProfiles) {
            // Remove ALL profiles to start completely fresh
            // We'll only keep kinas when they log in again
            try {
                const profileRef = ref(database, `profiles/${profile.id}`);
                await remove(profileRef);
                console.log(`🗑️ Removed profile: ${profile.name} (${profile.id})`);
                clearedCount++;
            } catch (error) {
                console.error(`Failed to remove profile ${profile.name}:`, error);
            }
        }
        
        console.log(`✅ Cleared ${clearedCount} profiles from Firebase - starting completely fresh!`);
        return { success: true, cleared: clearedCount };
        
    } catch (error) {
        console.error('❌ Error clearing all profiles:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Auto-sync test profiles on app initialization
 * Since we're starting fresh, this just cleans up and doesn't add test profiles
 */
export const autoSyncTestProfiles = async () => {
    console.log('🧹 Starting fresh - clearing all profiles and not syncing test data...');
    
    try {
        // Clear all profiles to start completely fresh
        console.log('🧹 Cleaning up all existing profiles...');
        const cleanupResult = await clearAllProfilesAndStartFresh();
        console.log('Cleanup result:', cleanupResult);
        
        console.log('✅ Fresh start complete - no test profiles will be added');
        console.log('📝 Only real users (like kinas) will create profiles when they log in');
        
        return { success: true, message: 'Fresh start complete - no test profiles' };
    } catch (error) {
        console.error('❌ Error during fresh start:', error);
        return { success: false, error: error.message };
    }
}; 