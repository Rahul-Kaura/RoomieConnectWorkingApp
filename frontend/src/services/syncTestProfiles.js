import axios from 'axios';
import { saveProfile } from './firebaseProfile';
import { API_URL } from '../config';

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
    // Only sync in development or if specifically requested
    if (process.env.NODE_ENV === 'development' || localStorage.getItem('forceSyncTestProfiles')) {
        console.log('🚀 Auto-syncing test profiles...');
        const result = await syncTestProfilesToFirebase();
        
        if (result.success) {
            console.log('🎉 Test profiles are ready for matching!');
            // Remove force sync flag if it was set
            localStorage.removeItem('forceSyncTestProfiles');
        } else {
            console.log('⚠️ Test profile sync failed, matches may use fallback profiles');
        }
        
        return result;
    }
    
    return { success: true, message: 'Sync skipped in production' };
}; 