import { loadAllProfiles } from './firebaseProfile';
import { API_URL } from '../config';

/**
 * Generate matches for a given user profile
 * @param {Object} userProfile - The current user's profile
 * @returns {Promise<Array>} Array of matched profiles
 */
export const generateMatches = async (userProfile) => {
  try {
    if (!userProfile || !userProfile.id) {
      return [];
    }

    // Try to load all profiles from Firebase
    let allProfiles = [];
    try {
      allProfiles = await loadAllProfiles();
    } catch (firebaseError) {
      // Fallback to backend API
      try {
        const response = await fetch(`${API_URL}/api/profiles`);
        if (response.ok) {
          allProfiles = await response.json();
        }
      } catch (backendError) {
        return [];
      }
    }

    // Filter out the current user
    const otherProfiles = allProfiles.filter(
      profile => profile.id !== userProfile.id && 
                 profile.userId !== userProfile.id &&
                 profile.userId !== userProfile.userId
    );

    if (otherProfiles.length === 0) {
      return [];
    }

    // Calculate compatibility scores for each profile
    const matches = otherProfiles.map(otherProfile => {
      let compatibilityScore = 0;
      let totalQuestions = 0;

      // Compare answers if both profiles have them
      if (userProfile.answers && otherProfile.answers) {
        userProfile.answers.forEach(userAnswer => {
          const otherAnswer = otherProfile.answers.find(
            a => a.questionId === userAnswer.questionId
          );
          
          if (otherAnswer) {
            totalQuestions++;
            if (userAnswer.answer === otherAnswer.answer) {
              compatibilityScore += 1; // Perfect match
            } else if (userAnswer.answer && otherAnswer.answer) {
              const userLower = userAnswer.answer.toLowerCase();
              const otherLower = otherAnswer.answer.toLowerCase();
              
              // Check for similar answers
              if (userLower.includes(otherLower) || otherLower.includes(userLower)) {
                compatibilityScore += 0.8; // Similar match
              } else {
                compatibilityScore += 0.2; // Different answers
              }
            }
          }
        });
      }

      // Calculate compatibility percentage
      const compatibility = totalQuestions > 0 
        ? (compatibilityScore / totalQuestions) * 100 
        : 50; // Default to 50% if no answers to compare

      // Calculate distance if coordinates are available
      let distance = 'N/A';
      if (userProfile.coordinates && otherProfile.coordinates) {
        const distInMiles = calculateDistance(
          userProfile.coordinates.lat,
          userProfile.coordinates.lng,
          otherProfile.coordinates.lat,
          otherProfile.coordinates.lng
        );
        distance = `${Math.round(distInMiles)} mi`;
      }

      return {
        userId: otherProfile.userId || otherProfile.id,
        profileId: otherProfile.profileId || otherProfile.id,
        id: otherProfile.id || otherProfile.userId,
        name: otherProfile.name || 'Unknown',
        compatibility: compatibility.toFixed(2),
        distance,
        location: otherProfile.location || 'N/A',
        score: otherProfile.score || compatibility.toFixed(2),
        answers: otherProfile.answers || [],
        image: otherProfile.image || '',
        major: otherProfile.major || '',
        age: otherProfile.age || '',
        allergyInfo: extractAllergyInfo(otherProfile.answers || []),
        instagram: otherProfile.instagram || ''
      };
    });

    // Sort by compatibility score (highest first)
    matches.sort((a, b) => parseFloat(b.compatibility) - parseFloat(a.compatibility));

    return matches;

  } catch (error) {
    return [];
  }
};

/**
 * Create sample profiles for testing/demo purposes
 * @returns {Promise<void>}
 */
export const createSampleProfiles = async () => {
  try {
    // Check if profiles already exist
    const existingProfiles = await loadAllProfiles();
    if (existingProfiles.length > 0) {
      return;
    }

    // For now, this is a no-op as sample profiles should be created via the backend
    // or through the syncTestProfiles service
    
  } catch (error) {
    // Error creating sample profiles
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract allergy information from answers
 * @param {Array} answers - Array of answer objects
 * @returns {string} Clean allergy information
 */
function extractAllergyInfo(answers) {
  const allergyAnswer = answers.find(a => 
    a.questionId && (
      a.questionId.toString().includes('allergy') || 
      a.question.toLowerCase().includes('allergy')
    )
  );
  
  if (allergyAnswer && allergyAnswer.answer) {
    return allergyAnswer.answer;
  }
  
  return 'No allergies specified';
}
