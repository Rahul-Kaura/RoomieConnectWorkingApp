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
 * Since we're starting fresh, this clears ALL profiles including kinas for testing
 */
export const autoSyncTestProfiles = async () => {
    console.log('🧹 Starting completely fresh - clearing ALL profiles including kinas for testing...');
    
    try {
        // Clear all profiles including kinas to start completely fresh for testing
        console.log('🧹 Clearing all existing profiles including kinas...');
        const cleanupResult = await clearAllProfilesIncludingKinas();
        console.log('Cleanup result:', cleanupResult);
        
        console.log('✅ Fresh start complete - ALL profiles cleared including kinas!');
        console.log('🆕 You can now test the AI chatbot from scratch!');
        
        return { success: true, message: 'Fresh start complete - all profiles cleared for testing' };
    } catch (error) {
        console.error('❌ Error during fresh start:', error);
        return { success: false, error: error.message };
    }
}; 

/**
 * Clear ALL profiles from Firebase including kinas - for testing purposes
 * This removes EVERYTHING to start completely fresh
 */
export const clearAllProfilesIncludingKinas = async () => {
    console.log('🧹 Clearing ALL profiles from Firebase including kinas - starting completely fresh for testing...');
    
    try {
        // Load all profiles first
        const allProfiles = await loadAllProfiles();
        
        if (!allProfiles || allProfiles.length === 0) {
            console.log('No profiles found in Firebase to clear');
            return { success: true, cleared: 0 };
        }
        
        let clearedCount = 0;
        
        for (const profile of allProfiles) {
            // Remove ALL profiles including kinas to start completely fresh
            try {
                const profileRef = ref(database, `profiles/${profile.id}`);
                await remove(profileRef);
                console.log(`🗑️ Removed profile: ${profile.name} (${profile.id})`);
                clearedCount++;
            } catch (error) {
                console.error(`Failed to remove profile ${profile.name}:`, error);
            }
        }
        
        console.log(`✅ Cleared ${clearedCount} profiles from Firebase - including kinas!`);
        console.log('🆕 Now you can test the chatbot from scratch!');
        return { success: true, cleared: clearedCount };
        
    } catch (error) {
        console.error('❌ Error clearing all profiles:', error);
        return { success: false, error: error.message };
    }
}; 

/**
 * Manual function to clear all profiles immediately - can be called from browser console
 * Usage: clearAllProfilesNow() in browser console
 */
export const clearAllProfilesNow = async () => {
    console.log('🧹 MANUAL CLEAR: Clearing ALL profiles immediately...');
    
    try {
        const result = await clearAllProfilesIncludingKinas();
        
        if (result.success) {
            console.log('✅ MANUAL CLEAR SUCCESS: All profiles cleared!');
            console.log('🆕 You can now test the AI chatbot from scratch!');
            
            // Also clear localStorage to ensure complete fresh start
            localStorage.removeItem('theme');
            localStorage.removeItem('userProfile');
            console.log('🗑️ LocalStorage also cleared for complete fresh start');
            
            // Reload the page to ensure everything is fresh
            console.log('🔄 Reloading page in 3 seconds for complete fresh start...');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } else {
            console.error('❌ MANUAL CLEAR FAILED:', result.error);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error during manual clear:', error);
        return { success: false, error: error.message };
    }
};

// Make it available globally for browser console access
if (typeof window !== 'undefined') {
    window.clearAllProfilesNow = clearAllProfilesNow;
    console.log('🛠️ Manual clear function available: clearAllProfilesNow()');
} 