import axios from 'axios';
import { saveProfile, loadAllProfiles } from './firebaseProfile';
import { database } from '../firebase';
import { ref, remove } from 'firebase/database';
import { API_URL } from '../config';

/**
 * Clear all test profiles from Firebase
 * This removes profiles marked as test profiles or with test-related names
 */
export const clearTestProfiles = async () => {
    console.log('🧹 Clearing test profiles from Firebase...');
    
    try {
        // Load all profiles first
        const allProfiles = await loadAllProfiles();
        
        if (!allProfiles || allProfiles.length === 0) {
            console.log('No profiles found in Firebase to clear');
            return { success: true, cleared: 0 };
        }
        
        let clearedCount = 0;
        // Removed 'Alex Chen' from this list to preserve him
        const testNames = ['Maya Patel', 'Jordan Kim', 'Sofia Rodriguez', 'Marcus Johnson', 'Test', 'Kidres', 'Sterski', 'Serski'];
        
        for (const profile of allProfiles) {
            // Remove if it's marked as test profile or has test-related names
            if (profile.isTestProfile || 
                testNames.includes(profile.name) ||
                profile.name?.toLowerCase().includes('test') ||
                profile.id?.includes('test-user') ||
                profile.id?.includes('demo-')) {
                
                try {
                    const profileRef = ref(database, `profiles/${profile.id}`);
                    await remove(profileRef);
                    console.log(`🗑️ Removed test profile: ${profile.name} (${profile.id})`);
                    clearedCount++;
                } catch (error) {
                    console.error(`Failed to remove profile ${profile.name}:`, error);
                }
            }
        }
        
        console.log(`✅ Cleared ${clearedCount} test profiles from Firebase`);
        return { success: true, cleared: clearedCount };
        
    } catch (error) {
        console.error('❌ Error clearing test profiles:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Sync backend test profiles to Firebase
 * This ensures the 5 original test profiles are available in Firebase for matching
 */
export const syncTestProfilesToFirebase = async () => {
    console.log('🔄 Syncing backend test profiles to Firebase...');
    
    try {
        // Load profiles from backend
        const response = await axios.get(`${API_URL}/profiles`);
        const backendProfiles = response.data;
        
        console.log(`Found ${backendProfiles.length} backend profiles to sync`);
        
        // Convert backend profiles to Firebase format and save each one
        const syncPromises = backendProfiles.map(async (backendProfile) => {
            try {
                // Convert backend profile format to frontend profile format
                const firebaseProfile = {
                    id: backendProfile.userId, // Use userId as the Firebase key
                    name: backendProfile.name,
                    age: backendProfile.age,
                    major: backendProfile.major,
                    location: backendProfile.location,
                    image: backendProfile.image,
                    instagram: backendProfile.instagram,
                    allergies: backendProfile.allergies,
                    answers: backendProfile.answers,
                    score: calculateScoreFromAnswers(backendProfile.answers),
                    isTestProfile: true // Mark as test profile
                };
                
                console.log(`💾 Saving ${backendProfile.name} to Firebase...`);
                await saveProfile(firebaseProfile);
                console.log(`✅ ${backendProfile.name} synced successfully`);
                
                return { success: true, name: backendProfile.name };
            } catch (error) {
                console.error(`❌ Failed to sync ${backendProfile.name}:`, error);
                return { success: false, name: backendProfile.name, error };
            }
        });
        
        const results = await Promise.all(syncPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`🎉 Sync complete: ${successful.length} successful, ${failed.length} failed`);
        
        if (successful.length > 0) {
            console.log('✅ Successfully synced:', successful.map(r => r.name).join(', '));
        }
        
        if (failed.length > 0) {
            console.log('❌ Failed to sync:', failed.map(r => r.name).join(', '));
        }
        
        return {
            success: successful.length > 0,
            total: backendProfiles.length,
            successful: successful.length,
            failed: failed.length,
            results
        };
        
    } catch (error) {
        console.error('❌ Failed to load backend profiles for sync:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Calculate compatibility score from answers
 * This replicates the scoring logic from the chatbot
 */
const calculateScoreFromAnswers = (answers) => {
    if (!answers || answers.length === 0) return 0;
    
    // Simple scoring: each compatible answer gets 1 point
    // This is a simplified version - the actual scoring in chatbot is more complex
    const compatibilityMap = {
        'morning': 1,
        'tidy': 1,
        'quiet': 1,
        'private': 0.5,
        'no': 1, // for smoking
        'night': 0.8,
        'relaxed': 0.8,
        'music': 0.7,
        'merrier': 0.9,
        'between': 0.9
    };
    
    const totalScore = answers.reduce((sum, answer) => {
        const score = compatibilityMap[answer.answer] || 0.5;
        return sum + score;
    }, 0);
    
    return totalScore / answers.length;
};

/**
 * Auto-sync test profiles on app initialization
 * Call this when the app starts to ensure test profiles are available
 */
export const autoSyncTestProfiles = async () => {
    console.log('🔄 Force syncing Alex Chen to Firebase for visibility...');
    
    try {
        // Temporarily enable cleanup to remove Serski
        console.log('🧹 Cleaning up unwanted test profiles...');
        const cleanupResult = await clearTestProfiles();
        console.log('Cleanup result:', cleanupResult);
        
        // Always sync to ensure Alex Chen is available for matching
        const result = await syncTestProfilesToFirebase();
        
        if (result.success && result.successful > 0) {
            console.log('✅ Alex Chen synced to Firebase successfully');
            console.log(`📊 Sync results: ${result.successful} successful, ${result.failed} failed`);
        } else {
            console.log('⚠️ Sync completed but no new profiles added (may already exist)');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error syncing Alex Chen:', error);
        return { success: false, error: error.message };
    }
}; 