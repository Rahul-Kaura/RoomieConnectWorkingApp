// API Configuration
export const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://roomieconnect-backend.onrender.com'  // Live backend URL
  : 'http://localhost:4000';

// Distance API Configuration
export const DISTANCE_API_CONFIG = {
    // Option 1: Google Maps Distance Matrix API (Most Accurate)
    GOOGLE_MAPS: {
        enabled: false, // Set to true if you have an API key
        apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
        url: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        requiresKey: true
    },
    
    // Option 2: OpenRouteService API (Free tier available)
    OPENROUTE: {
        enabled: false, // Set to true if you want to use this
        apiKey: 'YOUR_OPENROUTE_API_KEY', // Optional for basic usage
        url: 'https://api.openrouteservice.org/v2/matrix/driving-car',
        requiresKey: false
    },
    
    // Option 3: Free Distance Matrix API (No key required)
    FREE_DISTANCE: {
        enabled: true, // Currently enabled - no API key needed
        url: 'https://api.distancematrix.ai/maps/api/distancematrix/json',
        requiresKey: false
    },
    
    // Option 4: Alternative Free Distance API
    ALTERNATIVE_FREE: {
        enabled: true, // Alternative free API
        url: 'https://api.distancematrix.ai/maps/api/distancematrix/json',
        requiresKey: false
    },
    
    // Option 5: Simple Distance API (Very reliable)
    SIMPLE_DISTANCE: {
        enabled: true, // Simple calculation API
        url: 'https://api.distancematrix.ai/maps/api/distancematrix/json',
        requiresKey: false
    },
    
    // Option 6: Use fallback calculation (Always available)
    FALLBACK: {
        enabled: true, // Always enabled as backup
        requiresKey: false
    }
};

// Get the best available distance API
export const getDistanceAPI = () => {
    if (DISTANCE_API_CONFIG.GOOGLE_MAPS.enabled && DISTANCE_API_CONFIG.GOOGLE_MAPS.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
        return 'GOOGLE_MAPS';
    }
    if (DISTANCE_API_CONFIG.OPENROUTE.enabled) {
        return 'OPENROUTE';
    }
    if (DISTANCE_API_CONFIG.FREE_DISTANCE.enabled) {
        return 'FREE_DISTANCE';
    }
    if (DISTANCE_API_CONFIG.ALTERNATIVE_FREE.enabled) {
        return 'ALTERNATIVE_FREE';
    }
    if (DISTANCE_API_CONFIG.SIMPLE_DISTANCE.enabled) {
        return 'SIMPLE_DISTANCE';
    }
    return 'FALLBACK';
}; 