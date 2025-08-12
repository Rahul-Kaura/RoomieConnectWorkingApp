import React, { useState, useEffect, useRef } from 'react';
import Sentiment from 'sentiment';
import axios from 'axios';
import './Chatbot.css';
import ChatScreen from './ChatScreen';
import { saveProfile, loadProfile, loadAllProfiles, monitorNewProfiles, stopListeningToProfiles } from './services/firebaseProfile';
import notificationService from './services/notificationService';
import firebaseMessaging from './services/firebaseMessaging';
import { DISTANCE_API_CONFIG, getDistanceAPI, API_URL } from './config';

const questions = {
    'upload_image': {
        text: (name) => `Welcome, ${name}! To get started, would you like to upload a profile picture? You can upload a file or type 'skip' to continue.`,
        category: 'image',
        keywords: ['skip'],
        getNext: () => 'intro'
    },
    'name': {
        text: "Great! Let's start by getting to know you. What's your name?",
        category: 'personal',
        weight: 0,
        keywords: [], // Free text input for name
        getNext: () => 'upload_image'
    },
    'intro': {
        text: `Awesome! Now, to find you the best possible match, I'm just going to ask a few quick questions. Let's get started! Are you more of a morning person or a total night owl? (Say "morning" or "night")`,
        category: 'lifestyle', 
        weight: 0.2,
        keywords: ['morning', 'night', 'owl', 'early', 'late'],
        getNext: () => 'cleanliness'
    },
    'cleanliness': {
        text: "What's your take on cleanliness? Are you super tidy, pretty relaxed, or somewhere in between? (Say 'tidy', 'relaxed', or 'between')",
        category: 'lifestyle',
        weight: 0.2,
        keywords: ['tidy', 'clean', 'neat', 'relaxed', 'messy', 'organized', 'between'],
        getNext: (answer) => {
            const lower = answer.toLowerCase();
            if (lower.includes('tidy') || lower.includes('clean') || lower.includes('neat')) {
                return 'cleanliness_followup_tidy';
            }
            return 'cleanliness_followup_relaxed';
        }
    },
    'cleanliness_followup_tidy': {
        text: (answer) => `Being tidy is a great quality! Does that hold up even when things get super busy? (Say 'yes' or 'no')`,
        category: 'lifestyle', 
        weight: 0.0, 
        isFollowUp: true, 
        originalQuestionId: 'cleanliness',
        keywords: ['yes', 'no', 'sometimes', 'maybe', 'usually', 'always'],
        getNext: () => 'noise'
    },
    'cleanliness_followup_relaxed': {
        text: (answer) => `"Relaxed" is cool. To get a better sense, what's your rule on leaving dishes in the sink for a bit? (Say 'okay' or 'not okay')`,
        category: 'lifestyle', 
        weight: 0.0, 
        isFollowUp: true, 
        originalQuestionId: 'cleanliness',
        keywords: ['okay', 'fine', 'not okay', 'never', 'sometimes', 'rarely'],
        getNext: () => 'noise'
    },
    'noise': {
        text: "Imagine you're chilling in your room. Do you prefer a quiet, library-like atmosphere, or are you cool with some background music or the TV on? (Say 'quiet' or 'music')",
        category: 'lifestyle',
        weight: 0.15,
        keywords: ['quiet', 'library', 'music', 'tv', 'background', 'silent', 'noisy'],
        getNext: () => 'guests'
    },
    'guests': {
        text: "What's your policy on guests? Are you a 'the more the merrier' type, or do you prefer to keep your space more private? (Say 'merrier' or 'private')",
        category: 'lifestyle',
        weight: 0.15,
        keywords: ['merrier', 'private', 'often', 'rarely', 'sometimes', 'love guests', 'few guests'],
        getNext: (answer) => {
            const lower = answer.toLowerCase();
            if (lower.includes('merrier') || lower.includes('often') || lower.includes('love guests')) {
                return 'guests_followup';
            }
            return 'smoking';
        }
    },
    'guests_followup': {
        text: (answer) => `Okay, so more of a party vibe with guests. Got it. How do you feel about overnight guests during the week? (Say 'okay' or 'not okay')`,
        category: 'lifestyle', 
        weight: 0.0, 
        isFollowUp: true, 
        originalQuestionId: 'guests',
        keywords: ['okay', 'fine', 'not okay', 'never', 'sometimes', 'rarely', 'yes', 'no'],
        getNext: () => 'smoking'
    },
    'smoking': {
        text: "Just gotta ask about smoking or vaping – is that something you do, or does it bother you if others do? (Say 'yes', 'no', or 'bothers me')",
        category: 'lifestyle',
        weight: 0.1,
        keywords: ['yes', 'no', 'sometimes', 'bothers me', 'doesn\'t bother me', 'never'],
        getNext: () => 'alcohol'
    },
    'alcohol': {
        text: "What's your general attitude about having alcohol in the apartment? (Say 'okay' or 'not okay')",
        category: 'lifestyle',
        weight: 0.1,
        keywords: ['okay', 'fine', 'not okay', 'never', 'sometimes', 'rarely', 'yes', 'no'],
        getNext: () => 'study_habits'
    },
    'study_habits': {
        text: "Alright, let's switch gears to study habits. Where do you usually get your best work done?",
        category: 'academic',
        weight: 0.05,
        keywords: ['room', 'library', 'cafe', 'kitchen', 'desk', 'bed', 'outside'],
        getNext: () => 'major'
    },
    'major': {
        text: "What's your major?",
        category: 'academic',
        weight: 0.05,
        keywords: [], // Free text input for major
        getNext: () => 'personality'
    },
    'personality': {
        text: "When it comes to your future roommate, are you hoping to find a new bestie, or are you more about just keeping things friendly and respectful?",
        category: 'personality',
        weight: 0.05,
        keywords: ['bestie', 'friend', 'friendly', 'respectful', 'casual', 'close'],
        getNext: () => 'weekends'
    },
    'weekends': {
        text: "What does a typical weekend look like for you?",
        category: 'personality',
        weight: 0.05,
        keywords: ['home', 'out', 'party', 'study', 'work', 'relax', 'social', 'quiet'],
        getNext: () => 'hobbies'
    },
    'hobbies': {
        text: "So, what do you do for fun? Tell me about your hobbies!",
        category: 'personality',
        weight: 0.05,
        keywords: ['gaming', 'reading', 'sports', 'music', 'art', 'cooking', 'travel', 'netflix', 'gym'],
        getNext: () => 'sharing'
    },
    'sharing': {
        text: "Okay, just a couple more things! How do you feel about sharing stuff, like kitchen supplies or snacks?",
        category: 'practical',
        weight: 0.05,
        keywords: ['yes', 'no', 'sometimes', 'rarely', 'okay', 'fine', 'not okay'],
        getNext: () => 'temperature'
    },
    'temperature': {
        text: "Are you someone who's always cold and needs the heat on, or do you prefer things on the cooler side?",
        category: 'practical',
        weight: 0.05,
        keywords: ['cold', 'heat', 'cool', 'warm', 'hot', 'freezing', 'chilly'],
        getNext: () => 'common_items'
    },
    'common_items': {
        text: "When it comes to big items for the common space, like a coffee maker or a TV, how do you think that should be handled?",
        category: 'practical',
        weight: 0.05,
        keywords: ['split', 'share', 'buy together', 'separate', 'each person', 'one person'],
        getNext: () => 'pets'
    },
    'pets': {
        text: "Almost done! How do you feel about pets? Would you be cool with a furry (or scaly) roommate? (Say 'yes', 'no', or 'maybe')",
        category: 'other',
        weight: 0.025,
        keywords: ['yes', 'no', 'maybe', 'depends', 'love pets', 'allergic', 'okay'],
        getNext: () => 'location'
    },
    'location': {
        text: "For distance matching, type 'detect' to automatically detect your location or 'skip' to continue without location",
        category: 'location',
        weight: 0, // No weight, just for data collection
        keywords: ['detect', 'skip'], // Only allow 'detect' or 'skip'
        getNext: () => 'age'
    },
    'age': {
        text: "What's your age? (Enter a number between 18-25)",
        category: 'personal',
        weight: 0.025, // Small weight for age compatibility
        keywords: [], // Free text input for age
        getNext: () => 'allergies'
    },
    'allergies': {
        text: "Last one: Is there anything important I should know, like any major allergies? (Say 'no' or describe your allergies)",
        category: 'other',
        weight: 0.025,
        keywords: ['no', 'none', 'n/a', 'yes', 'peanuts', 'cats', 'dogs', 'dust'],
        getNext: () => 'instagram'
    },
    'instagram': {
        text: "What's your Instagram handle? (Just type the username without @, or type 'skip' if you prefer not to share)",
        category: 'social',
        weight: 0, // No weight for matching, just for display
        keywords: ['skip', 'none', 'n/a', 'no', 'prefer not to share'],
        getNext: () => 'end'
    },
    'end': {
        text: "That's everything! Thanks so much. I'm crunching the numbers now to find your best matches.",
        isEnd: true
    }
};

function MatchLoadingScreen() {
    return (
        <div className="chatbot-container-isolated screen-transition">
            <div className="chatbot-header">
                <div className="animated-logo-container">
                    <div className="logo-icon">
                        <svg viewBox="0 0 40 40" className="logo-svg">
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7"/>
                                </linearGradient>
                            </defs>
                            <circle cx="20" cy="12" r="6" fill="url(#logoGradient)" className="logo-head"/>
                            <rect x="14" y="20" width="12" height="16" rx="6" fill="url(#logoGradient)" className="logo-body"/>
                            <circle cx="10" cy="12" r="4" fill="url(#logoGradient)" className="logo-companion logo-companion-1"/>
                            <circle cx="30" cy="12" r="4" fill="url(#logoGradient)" className="logo-companion logo-companion-2"/>
                            <path d="M15 28 Q20 32 25 28" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-connection"/>
                        </svg>
                    </div>
                    <h2 className="chatbot-header-title">
                        <span className="logo-text-roomie">Roomie</span>
                        <span className="logo-text-connect">Connect</span>
                        <span className="logo-text-ai">AI</span>
                    </h2>
                </div>
                <p className="chatbot-header-subtitle animated-subtitle">Your personal roommate finder</p>
            </div>
            <div className="chatbot-loading-screen" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '1',
                background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)',
                color: '#20b2aa',
                position: 'relative'
            }}>
                {/* Awwwards-inspired UI transition animation */}
                <div className="loading-spinner-cool">
                    <div className="loading-ui-screens">
                        {/* Screen 1: Chatbot Interface */}
                        <div className="loading-screen-card loading-screen-1">
                            <div className="loading-screen-content">
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #20b2aa 0%, #26a69a 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                    fontSize: '24px', 
                                    fontWeight: '700',
                                    color: 'white'
                                }}>
                                    💬
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                                    Complete your profile
                                </div>
                            </div>
                        </div>

                        {/* Screen 2: Profile Setup */}
                        <div className="loading-screen-card loading-screen-2">
                            <div className="loading-screen-content">
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #20b2aa 0%, #26a69a 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: 'white'
                                }}>
                                    👤
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                                    Building your profile
                                </div>
                            </div>
                        </div>

                        {/* Screen 3: Matches Preview */}
                        <div className="loading-screen-card loading-screen-3">
                            <div className="loading-screen-content">
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #20b2aa 0%, #26a69a 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: 'white'
                                }}>
                                    🏠
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                                    Finding perfect matches
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="loading-progress-bar">
                        <div className="loading-progress-fill"></div>
                    </div>
                </div>

                <p className="loading-text">
                    Creating your perfect roommate connections...
                </p>
            </div>
        </div>
    );
}

function MatchResultsGrid({ matches, onStartChat, currentUser, onResetToHome, onOpenSettings }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [expandedCard, setExpandedCard] = useState(null);
    const [pinnedMatches, setPinnedMatches] = useState(new Set());
    const [allProfiles, setAllProfiles] = useState([]);
    const [profileMonitor, setProfileMonitor] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [showHelpTooltip, setShowHelpTooltip] = useState(false);
    const [helpTooltipPosition, setHelpTooltipPosition] = useState({ x: 0, y: 0 });
    const [headerAnimationPhase, setHeaderAnimationPhase] = useState('title');
    const [isMobile, setIsMobile] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Function to validate and fix profile data
    const validateAndFixProfiles = (profileList) => {
        const fixedProfiles = profileList.map(profile => {
            // Ensure profile has a valid ID
            if (!profile.id && !profile.userId) {
                console.warn(`⚠️ Profile ${profile.name} has no ID, generating one...`);
                return {
                    ...profile,
                    id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
            }
            
            // Ensure both id and userId are set
            if (!profile.id && profile.userId) {
                return { ...profile, id: profile.userId };
            }
            
            if (profile.id && !profile.userId) {
                return { ...profile, userId: profile.id };
            }
            
            return profile;
        });
        
        console.log('🔧 Profile validation complete:', fixedProfiles.map(p => ({ name: p.name, id: p.id, userId: p.userId })));
        return fixedProfiles;
    };

    // Function to get consistent match ID (not dependent on page position)
    const getMatchId = (match) => {
        // Use id or userId if available, otherwise use name + some unique property
        return match.id || match.userId || match.name || `match-${Math.random()}`;
    };
    
    const cardsPerPage = 2; // Keep consistent 2 cards per page for both mobile and desktop
    const totalPages = Math.ceil((matches || []).length / cardsPerPage);
    
    // Debug logging for pagination
    console.log(`📱 MatchResultsGrid Pagination Debug:`, {
        totalMatches: matches?.length || 0,
        cardsPerPage,
        totalPages,
        currentPage,
        isMobile,
        matchNames: matches?.map(m => m.name) || []
    });
    
    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    };
    
    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
    };
    
    // Function to get consistent chat ID between two users
    const getChatId = (user1Id, user2Id) => {
        // Ensure we have valid IDs
        const id1 = user1Id || currentUser.id;
        const id2 = user2Id;
        
        if (!id1 || !id2) {
            console.error('❌ Invalid user IDs for chat:', { id1, id2, currentUser: currentUser.id });
            return null;
        }
        
        // Sort IDs to ensure consistent chat ID regardless of who initiates
        const sortedIds = [id1, id2].sort();
        const chatId = sortedIds.join('_');
        
        console.log(`💬 Generated chat ID: ${id1} + ${id2} = ${chatId}`);
        return chatId;
    };

    const getCurrentMatches = () => {
        // Sort matches: pinned first, then by unread messages, then by recent activity, then by distance
        const sortedMatches = [...(matches || [])].sort((a, b) => {
            const aKey = getMatchId(a);
            const bKey = getMatchId(b);
            const aIsPinned = pinnedMatches.has(aKey);
            const bIsPinned = pinnedMatches.has(bKey);
            
            // Pinned matches come first
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            
            // Then sort by unread messages
            const aUnread = unreadCounts[a.id] || 0;
            const bUnread = unreadCounts[b.id] || 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            
            // Then by last message timestamp (more recent first)
            const aTimestamp = a.lastMessageTimestamp || 0;
            const bTimestamp = b.lastMessageTimestamp || 0;
            if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
            
            // Finally by distance (closer first)
            const aDistance = a.distance || 999;
            const bDistance = b.distance || 999;
            return aDistance - bDistance;
        });
        
        const startIndex = currentPage * cardsPerPage;
        return sortedMatches.slice(startIndex, startIndex + cardsPerPage);
    };
    const placeholderImages = [
        'https://randomuser.me/api/portraits/women/44.jpg',
        'https://randomuser.me/api/portraits/women/65.jpg',
        'https://randomuser.me/api/portraits/women/68.jpg',
        'https://randomuser.me/api/portraits/men/75.jpg',
    ];

    // Load pinned matches from localStorage
    React.useEffect(() => {
        const storedPinned = localStorage.getItem(`pinnedMatches_${currentUser.id}`);
        if (storedPinned) {
            setPinnedMatches(new Set(JSON.parse(storedPinned)));
        }
    }, [currentUser.id]);

    // Save pinned matches to localStorage
    const savePinnedMatches = (pinnedSet) => {
        localStorage.setItem(`pinnedMatches_${currentUser.id}`, JSON.stringify([...pinnedSet]));
    };

    // Toggle pin status
    const handleTogglePin = (match, index) => {
        // Use consistent ID logic that doesn't depend on page position
        const matchId = getMatchId(match);
        
        const newPinnedMatches = new Set(pinnedMatches);
        if (newPinnedMatches.has(matchId)) {
            newPinnedMatches.delete(matchId);
        } else {
            newPinnedMatches.add(matchId);
        }
        setPinnedMatches(newPinnedMatches);
        savePinnedMatches(newPinnedMatches);
        
        // Force a re-render by resetting current page to 0 to show pinned items at top
        setCurrentPage(0);
        
        // If we just pinned a match, ensure it appears at the front by triggering a state update
        setTimeout(() => {
            // This slight delay ensures the pinned state is properly propagated
            setCurrentPage(0); // Reset to first page to see the newly pinned match
        }, 100);
    };

    // Handle expand card
    const handleExpandCard = (match) => {
        setExpandedCard(match);
    };

    // Handle close expanded card
    const handleCloseExpanded = () => {
        setExpandedCard(null);
    };

    // Function to get user initials
    const getUserInitials = (name) => {
        if (!name) return '?';
        const nameParts = name.trim().split(' ');
        if (nameParts.length >= 2) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            return nameParts[0][0].toUpperCase();
        }
        return '?';
    };

    // Function to render user avatar (image or initials)
    const renderUserAvatar = (match) => {
        const imageUrl = match.image;
        
        if (imageUrl) {
            return <img className="match-card-img" src={imageUrl} alt={match.name} />;
        } else {
            const initials = getUserInitials(match.name);
            return (
                <div className="match-card-img-initials">
                    {initials}
                </div>
            );
        }
    };

    // Get real unread counts from notification service
    useEffect(() => {
        const initializeUnreadCounts = async () => {
            const realCounts = {};
            
            for (const match of matches) {
                // Ensure match has a valid ID
                const matchId = match.id || match.userId;
                if (!matchId) {
                    console.error(`❌ Match ${match.name} has no valid ID:`, match);
                    realCounts[match.name] = 0; // Use name as fallback key
                    continue;
                }
                
                const chatId = getChatId(currentUser.id, matchId);
                
                if (!chatId) {
                    console.error(`❌ Could not generate chat ID for ${match.name} (ID: ${matchId})`);
                    realCounts[match.name] = 0; // Use name as fallback key
                    continue;
                }
                
                // Get chat history to calculate real unread count
                try {
                    const messages = await firebaseMessaging.getChatHistory(chatId);
                    
                    // If this is the first time loading this chat, mark all existing messages as read
                    if (!notificationService.lastReadTimestamps.has(chatId)) {
                        notificationService.markAllExistingAsRead(chatId, messages);
                        realCounts[match.name] = 0;
                        console.log(`First time loading ${match.name} - marked all existing as read`);
                    } else {
                        // Calculate unread count for messages since last read
                        const unreadCount = notificationService.updateUnreadCountFromMessages(chatId, messages, currentUser.id);
                        realCounts[match.name] = unreadCount;
                        console.log(`Initialized unread count for ${match.name}: ${unreadCount}`);
                    }
                } catch (error) {
                    console.error(`Error getting chat history for ${match.name}:`, error);
                    realCounts[match.name] = 0;
                }
            }
            
            setUnreadCounts(realCounts);
            console.log('Total unread count:', notificationService.getTotalUnreadCount());
        };
        
        if (matches.length > 0 && currentUser.id) {
            initializeUnreadCounts();
        }
    }, [matches, currentUser.id]);

    // Update unread counts every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const realCounts = {};
            matches.forEach((match) => {
                // Ensure match has a valid ID
                const matchId = match.id || match.userId;
                if (!matchId) {
                    console.error(`❌ Match ${match.name} has no valid ID during periodic update:`, match);
                    realCounts[match.name] = 0; // Use name as fallback key
                    return;
                }
                
                const chatId = getChatId(currentUser.id, matchId);
                if (chatId) {
                const count = notificationService.getUnreadCount(chatId);
                    realCounts[match.name] = count; // Use name as fallback key
                } else {
                    realCounts[match.name] = 0; // Use name as fallback key
                }
            });
            setUnreadCounts(realCounts);
            console.log('Updated unread counts:', realCounts);
        }, 5000);

        return () => clearInterval(interval);
    }, [matches, currentUser.id]);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            const width = window.innerWidth;
            const isMobileDevice = width <= 768;
            console.log(`📱 Mobile detection: width=${width}px, isMobile=${isMobileDevice}`);
            setIsMobile(isMobileDevice);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Header animation cycle effect
    useEffect(() => {
        // Show "Your Top Matches" for 3 seconds, then switch to animated logo
        const titleTimer = setTimeout(() => {
            setHeaderAnimationPhase('logo');
        }, 3000);

        return () => clearTimeout(titleTimer);
    }, []);

    // Real-time profile monitoring for automatic updates
    React.useEffect(() => {
        if (currentUser && currentUser.id) {
            console.log('🔍 MatchResultsGrid: Starting real-time profile monitoring...');
            
            // Load initial profiles with retry mechanism
            const loadInitialProfiles = async () => {
                try {
                    console.log('📊 Loading initial profiles...');
                    let profiles = await loadAllProfiles();
                    
                    // If no profiles loaded, try to force sync from backend
                    if (!profiles || profiles.length === 0) {
                        console.log('⚠️ No profiles loaded, attempting backend sync...');
                        // Import and use forceSyncAllProfiles dynamically
                        const { forceSyncAllProfiles } = await import('./services/firebaseProfile');
                        await forceSyncAllProfiles();
                        profiles = await loadAllProfiles();
                    }
                    
                    // Validate and fix profiles
                    const validatedProfiles = validateAndFixProfiles(profiles);
                    setAllProfiles(validatedProfiles);
                    console.log(`📊 Loaded ${validatedProfiles.length} initial profiles:`, validatedProfiles.map(p => ({ name: p.name, id: p.id, userId: p.userId })));
                    
                    // Force a comprehensive sync to ensure all users can see each other
                    console.log('🔄 Force syncing all profiles to ensure visibility...');
                    const { forceSyncAllProfiles: syncProfiles } = await import('./services/firebaseProfile');
                    await syncProfiles();
                    
                    // Reload profiles after sync
                    const syncedProfiles = await loadAllProfiles();
                    const finalProfiles = validateAndFixProfiles(syncedProfiles);
                    setAllProfiles(finalProfiles);
                    console.log(`✅ Final profile count after sync: ${finalProfiles.length}`);
                    
                    // Log all available profiles for debugging
                    console.log('🔍 All available profiles after sync:', finalProfiles.map(p => ({
                        name: p.name,
                        id: p.id,
                        userId: p.userId,
                        profileId: p.profileId
                    })));
                    
                } catch (error) {
                    console.error('❌ Error loading initial profiles:', error);
                }
            };
            
            loadInitialProfiles();
            
            // Immediate sync to ensure all users can see each other
            const immediateSync = async () => {
                try {
                    console.log('🚀 Performing immediate profile sync for visibility...');
                    const { forceSyncAllProfiles } = await import('./services/firebaseProfile');
                    await forceSyncAllProfiles();
                    await firebaseMessaging.forceSyncAllChats();
                    
                    // Reload profiles after immediate sync
                    const syncedProfiles = await loadAllProfiles();
                    const finalProfiles = validateAndFixProfiles(syncedProfiles);
                    setAllProfiles(finalProfiles);
                    console.log(`✅ Immediate sync complete: ${finalProfiles.length} profiles available`);
                } catch (error) {
                    console.error('❌ Error during immediate sync:', error);
                }
            };
            
            // Run immediate sync after a short delay to ensure Firebase is ready
            setTimeout(immediateSync, 2000);
            
            // Force refresh all profiles to ensure visibility
            const forceRefreshProfiles = async () => {
                try {
                    console.log('🚀 Force refreshing all profiles for maximum visibility...');
                    
                    // Force sync from backend
                    const { forceSyncAllProfiles } = await import('./services/firebaseProfile');
                    await forceSyncAllProfiles();
                    
                    // Force sync all chats
                    await firebaseMessaging.forceSyncAllChats();
                    
                    // Reload profiles
                    const refreshedProfiles = await loadAllProfiles();
                    const finalProfiles = validateAndFixProfiles(refreshedProfiles);
                    setAllProfiles(finalProfiles);
                    
                    console.log(`✅ Force refresh complete: ${finalProfiles.length} profiles available`);
                    console.log('🔍 Force refreshed profiles:', finalProfiles.map(p => ({
                        name: p.name,
                        id: p.id,
                        userId: p.userId,
                        profileId: p.profileId
                    })));
                    
                } catch (error) {
                    console.error('❌ Error during force refresh:', error);
                }
            };
            
            // Run force refresh after a longer delay to ensure everything is loaded
            setTimeout(forceRefreshProfiles, 5000);
            
            // Monitor for new profiles and automatically refresh
            const monitor = monitorNewProfiles((newProfiles, allCurrentProfiles) => {
                console.log(`🆕 MatchResultsGrid: New profiles detected: ${newProfiles.map(p => p.name).join(', ')}`);
                
                // Update all profiles list
                setAllProfiles(allCurrentProfiles);
                
                // Show notification about new potential matches
                if (newProfiles.length > 0) {
                    notificationService.showMessageNotification(
                        'New Roommates Available!',
                        `${newProfiles.length} new potential roommate${newProfiles.length > 1 ? 's' : ''} just joined!`
                    );
                }
            });
            
            setProfileMonitor(monitor);
            
            // Periodic refresh as backup (every 30 seconds for better synchronization)
            const periodicRefresh = setInterval(async () => {
                try {
                    console.log('🔄 MatchResultsGrid: Periodic profile refresh...');
                    let profiles = await loadAllProfiles();
                    
                    // If profiles seem stale, force a sync
                    if (profiles.length < allProfiles.length) {
                        console.log('⚠️ Profile count decreased, forcing sync...');
                        const { forceSyncAllProfiles } = await import('./services/firebaseProfile');
                        await forceSyncAllProfiles();
                        profiles = await loadAllProfiles();
                    }
                    
                    const validatedProfiles = validateAndFixProfiles(profiles);
                    setAllProfiles(validatedProfiles);
                    
                    // Check if we have new profiles that weren't detected by real-time monitoring
                    if (validatedProfiles.length > allProfiles.length) {
                        const newProfiles = validatedProfiles.filter(profile => 
                            !allProfiles.some(existing => existing.id === profile.id)
                        );
                        
                        if (newProfiles.length > 0) {
                            console.log(`🆕 Periodic refresh found new profiles: ${newProfiles.map(p => p.name).join(', ')}`);
                            notificationService.showMessageNotification(
                                'New Roommates Found!',
                                `${newProfiles.length} new potential roommate${newProfiles.length > 1 ? 's' : ''} available!`
                            );
                        }
                    }
                } catch (error) {
                    console.error('❌ Error during periodic profile refresh:', error);
                }
            }, 30000); // 30 seconds for better synchronization
            
            return () => {
                if (monitor) {
                    console.log('🛑 MatchResultsGrid: Stopping profile monitoring...');
                    stopListeningToProfiles(monitor);
                }
                clearInterval(periodicRefresh);
            };
        }
    }, [currentUser]);

    return (
        <div className="chatbot-container-isolated">
        <div className="match-results-outer">
                <div className="shared-header">
                    <div className="header-content">
                        {/* Animated Header Content */}
                        <div className="animated-header-content">
                            {headerAnimationPhase === 'title' ? (
                                <h2 className="shared-header-title animated-title title-phase">Your Top Matches</h2>
                            ) : (
                                <div className="animated-logo-header logo-phase">
                                    <div className="header-logo-icon">
                                        <svg className="header-logo-svg" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* House roof */}
                                            <polyline className="header-logo-head" points="20,55 55,20 90,55" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    {/* House body */}
                                            <rect className="header-logo-body" x="28" y="55" width="54" height="35" rx="8" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    {/* Door */}
                                            <path className="header-logo-door" d="M55 85 C 55 80, 40 75, 40 65 A 8 8 0 0 1 55 65 A 8 8 0 0 1 70 65 C 70 75, 55 80, 55 85 Z" stroke="#ffffff" strokeWidth="2" fill="none" />
                                    {/* Connection lines */}
                                            <line className="header-logo-connection" x1="90" y1="55" x2="110" y2="45" stroke="#ffffff" strokeWidth="2" strokeDasharray="3,3" />
                                            <line className="header-logo-connection" x1="90" y1="55" x2="110" y2="65" stroke="#ffffff" strokeWidth="2" strokeDasharray="3,3" />
                                </svg>
                            </div>
                                    <div className="header-logo-text">
                                        <span className="header-logo-roomie">Roomie</span>
                                        <span className="header-logo-connect">Connect</span>
                            </div>
                                    {/* Floating particles for enhanced visual effect */}
                                    <div className="floating-particle"></div>
                                    <div className="floating-particle"></div>
                                    <div className="floating-particle"></div>
                                </div>
                            )}
                        </div>
                        
                        <div className="header-actions">
                            {/* Sync button */}
                            <button 
                                className={`refresh-sync-button hover-blue-animation ${isSyncing ? 'loading' : ''}`}
                                onClick={async () => {
                                    if (isSyncing) return; // Prevent multiple clicks
                                    
                                    try {
                                        setIsSyncing(true);
                                        console.log('🔄 Starting comprehensive refresh and sync...');
                                        
                                        // Set a 5-second timeout to ensure button doesn't get stuck
                                        const syncTimeout = setTimeout(() => {
                                            console.log('⏰ Sync timeout reached, resetting button state');
                                            setIsSyncing(false);
                                        }, 5000);
                                        
                                        // First refresh profiles
                                        const profiles = await loadAllProfiles();
                                        const validatedProfiles = validateAndFixProfiles(profiles);
                                        setAllProfiles(validatedProfiles);
                                        console.log('✅ Profiles refreshed:', validatedProfiles.length);
                                        
                                        // Then sync profiles and chats
                                        const { forceSyncAllProfiles } = await import('./services/firebaseProfile');
                                        await forceSyncAllProfiles();
                                        await firebaseMessaging.forceSyncAllChats();
                                        console.log('✅ Comprehensive sync completed');
                                        
                                        // Clear timeout since sync completed successfully
                                        clearTimeout(syncTimeout);
                                        
                                        // Show success notification
                                        notificationService.showMessageNotification(
                                            'Sync Complete!',
                                            'All profiles and chats have been synchronized.'
                                        );
                                    } catch (error) {
                                        console.error('❌ Error during refresh and sync:', error);
                                        notificationService.showMessageNotification(
                                            'Sync Error',
                                            'There was an issue during synchronization. Please try again.'
                                        );
                                    } finally {
                                        // Always reset syncing state
                                        setIsSyncing(false);
                                        console.log('🔄 Sync button state reset to normal');
                                    }
                                }}
                                title="Refresh profiles and sync all data"
                                disabled={isSyncing}
                            >
                                <svg className="refresh-sync-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                    <path d="M21 3v5h-5"></path>
                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                    <path d="M3 21v-5h5"></path>
                                </svg>
                                {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                            
                            {/* Notification bell */}
                            <button 
                                className="notification-bell-button hover-blue-animation"
                                onClick={() => {
                                    // Show notification permission request or notification center
                                    if ('Notification' in window && Notification.permission === 'default') {
                                        Notification.requestPermission();
                                    } else {
                                        // Show notification center or refresh matches
                                        notificationService.showMessageNotification(
                                            'Notifications',
                                            'You have notifications enabled!'
                                        );
                                    }
                                }}
                                title="Notifications"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <defs>
                                        <linearGradient id="bellGold" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FFE585"/>
                                            <stop offset="45%" stopColor="#F5C94C"/>
                                            <stop offset="70%" stopColor="#D9A628"/>
                                            <stop offset="100%" stopColor="#B17A18"/>
                                        </linearGradient>
                                        <radialGradient id="bellHighlight" cx="35%" cy="30%" r="60%">
                                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75"/>
                                            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0"/>
                                        </radialGradient>
                                        <filter id="bellShadow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.25"/>
                                        </filter>
                                    </defs>
                                    <g filter="url(#bellShadow)">
                                        {/* Bell body */}
                                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill="url(#bellGold)" stroke="#9A6A12" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                        {/* Top loop */}
                                        <circle cx="12" cy="7" r="1.2" fill="#D5A12A" stroke="#9A6A12" strokeWidth="0.6"/>
                                        {/* Clapper */}
                                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" fill="#C1861C" stroke="#8E5B0C" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        {/* Gloss highlight */}
                                        <path d="M7.2 9.2c.8-2.6 3.2-3.6 5.4-3.4" fill="none" stroke="url(#bellHighlight)" strokeWidth="1.1" strokeLinecap="round"/>
                                    </g>
                                </svg>
                                {/* Show unread count badge if there are unread messages */}
                                {notificationService.getTotalUnreadCount() > 0 && (
                                    <div className="notification-badge">
                                        {notificationService.getTotalUnreadCount() > 99 ? '99+' : notificationService.getTotalUnreadCount()}
                                    </div>
                                )}
                            </button>
                            
                            {/* Roomie Connect button */}
                            <div 
                                className="bouncing-logo-matches"
                                onClick={onResetToHome}
                                style={{ cursor: 'pointer' }}
                            >
                                <svg width="32" height="32" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="20,55 55,20 90,55" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    <rect x="28" y="55" width="54" height="35" rx="8" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    <path d="M55 85 C 55 80, 40 75, 40 65 A 8 8 0 0 1 55 65 A 8 8 0 0 1 70 65 C 70 75, 55 80, 55 85 Z" stroke="#ffffff" strokeWidth="2" fill="none" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            <div className="match-results-carousel">
            <div className="match-results-grid">
                    {getCurrentMatches().map((match, i) => {
                    const uniqueKey = getMatchId(match);
                    const isPinned = pinnedMatches.has(uniqueKey);
                    return (
                        <div className={`match-card ${isPinned ? 'pinned' : ''}`} key={uniqueKey}>
                            <div className="match-card-header">
                                <div className="match-card-pin-button hover-blue-animation" onClick={() => handleTogglePin(match, i)}>
                                    <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill={isPinned ? "#FFD700" : "none"} 
                                        stroke={isPinned ? "#FFD700" : "#6b7280"} 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </div>
                                                                    {!isMobile && (
                                    <div className="match-card-expand-button hover-blue-animation" onClick={() => handleExpandCard(match)}>
                                        <svg 
                                            width="20" 
                                            height="20" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="#6b7280" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        >
                                            {/* Rounded square outline */}
                                            <rect x="2" y="2" width="20" height="20" rx="4" ry="4"></rect>
                                            {/* Four arrows from near-center to corners */}
                                            {/* Top-left arrow */}
                                            <line x1="9" y1="9" x2="6" y2="6"></line>
                                            <line x1="6" y1="6" x2="8" y2="6"></line>
                                            <line x1="6" y1="6" x2="6" y2="8"></line>
                                            {/* Top-right arrow */}
                                            <line x1="15" y1="9" x2="18" y2="6"></line>
                                            <line x1="18" y1="6" x2="16" y2="6"></line>
                                            <line x1="18" y1="6" x2="18" y2="8"></line>
                                            {/* Bottom-left arrow */}
                                            <line x1="9" y1="15" x2="6" y2="18"></line>
                                            <line x1="6" y1="18" x2="8" y2="18"></line>
                                            <line x1="6" y1="18" x2="6" y2="16"></line>
                                            {/* Bottom-right arrow */}
                                            <line x1="15" y1="15" x2="18" y2="18"></line>
                                            <line x1="18" y1="18" x2="16" y2="18"></line>
                                            <line x1="18" y1="18" x2="18" y2="16"></line>
                                        </svg>
                                    </div>
                                )}
                                {isPinned && <div className="pinned-badge">📌 Pinned</div>}
                            </div>
                            {renderUserAvatar(match)}
                            <div className="match-card-name">{match.name}</div>
                            <div className="match-card-age">Age: {match.age || 'Not specified'}</div>
                            <div className="match-card-major">Major: {match.major || 'Not specified'}</div>
                                <div className="match-card-allergies">Allergies: {match.allergyInfo || 'N/A'}</div>
                            <div className="match-card-instagram">Instagram: {match.instagram && match.instagram.trim() ? `@${match.instagram}` : 'N/A'}</div>
                            <div className="match-card-info">
                                <div>Match: {match.compatibility}%</div>
                                {match.distance !== null && <div className="match-card-distance">📍 {match.distance} miles away</div>}
                                {match.location && <div className="match-card-location">📍 {match.location}</div>}
                            </div>
                            <div className="match-card-chat-icon hover-blue-animation" onClick={() => onStartChat(match)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                {(() => {
                                    // Ensure match has a valid ID
                                    const matchId = match.id || match.userId;
                                    if (!matchId) {
                                        console.error(`❌ Match ${match.name} has no valid ID for unread badge:`, match);
                                        return null;
                                    }
                                    
                                    const chatId = getChatId(currentUser.id, matchId);
                                    const unreadCount = chatId ? unreadCounts[match.name] || 0 : 0; // Use name as key
                                    return unreadCount > 0 ? (
                                        <div className={`unread-badge ${unreadCount > 0 ? 'has-unread' : ''}`}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                    </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    );
                })}
                </div>
                
                {/* Navigation Controls */}
                {(totalPages > 1 || isMobile) && (
                    <div className="carousel-navigation">
                        {console.log(`🔍 Rendering navigation: totalPages=${totalPages}, isMobile=${isMobile}`)}
                        
                        {/* Debug info - only show on mobile */}
                        {isMobile && (
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '10px',
                                background: 'red',
                                color: 'white',
                                padding: '2px 6px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                zIndex: 1000
                            }}>
                                Mobile: {totalPages} pages
                            </div>
                        )}
                        
                        {/* Only show pagination arrows if there are multiple pages */}
                        {totalPages > 1 ? (
                            <>
                        <button 
                            className="carousel-nav-button carousel-nav-prev" 
                            onClick={handlePreviousPage}
                            disabled={currentPage === 0}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15,18 9,12 15,6"></polyline>
                            </svg>
                        </button>
                        
                        <div className="carousel-indicators">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <div 
                                    key={i} 
                                    className={`carousel-indicator ${i === currentPage ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(i)}
                                />
                            ))}
            </div>
                        
                        <button 
                            className="carousel-nav-button carousel-nav-next" 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages - 1}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9,18 15,12 9,6"></polyline>
                                    </svg>
                                </button>
                            </>
                        ) : (
                            /* On mobile with single page, show placeholder for spacing */
                            <div style={{ flex: 1 }}></div>
                        )}
                        
                        {/* Help button for navigation - always show on mobile */}
                        <button 
                            className="carousel-help-button"
                            onClick={() => {
                                // Show help tooltip
                                const helpTooltip = document.createElement('div');
                                helpTooltip.className = 'carousel-help-tooltip';
                                helpTooltip.innerHTML = `
                                    <div class="help-content">
                                        <h4>Navigation & Button Help</h4>
                                        <div class="help-item">
                                            <span class="help-icon">🏠</span>
                                            <span class="help-text">Home - Return to main screen</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">🔄</span>
                                            <span class="help-text">Refresh & Sync - Load new profiles and sync all data</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">🔔</span>
                                            <span class="help-text">Notifications - Enable/check notifications</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    {/* Main gear body with 12 teeth */}
                                                    <path d="M12 2a10 10 0 0 0-7.35 16.76l.65-.65a2 2 0 0 1 2.83 0L9 19.17a2 2 0 0 1 0 2.83l-.65.65A10 10 0 0 0 12 22a10 10 0 0 0 7.35-16.76l.65-.65a2 2 0 0 1-2.83 0L15 4.83a2 2 0 0 1 0-2.83l.65-.65A10 10 0 0 0 12 2z"/>
                                                    {/* Center circle */}
                                                    <circle cx="12" cy="12" r="3"/>
                                                    {/* 12 gear teeth around the perimeter */}
                                                    <path d="M12 1v3" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M12 20v3" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M23 12h-3" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M4 12H1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M20.5 3.5l-2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M5.6 18.4L3.5 20.5" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M20.5 20.5l-2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M5.6 5.6L3.5 3.5" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M18.4 5.6l2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M3.5 3.5l2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M18.4 18.4l2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                    <path d="M3.5 20.5l2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                                                </svg>
                                            </span>
                                            <span class="help-text">Settings - Edit your profile</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">◀</span>
                                            <span class="help-text">Previous page - Go to previous matches</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">●</span>
                                            <span class="help-text">Page dots - Click to jump to specific page</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">▶</span>
                                            <span class="help-text">Next page - Go to next matches</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">📌</span>
                                            <span class="help-text">Pin matches to keep them at the top</span>
                                        </div>
                                        <div class="help-item">
                                            <span class="help-icon">💬</span>
                                            <span class="help-text">Chat button to start conversation</span>
                                        </div>
                                    </div>
                                `;
                                
                                // Position tooltip
                                helpTooltip.style.position = 'absolute';
                                helpTooltip.style.bottom = '60px';
                                helpTooltip.style.right = '20px';
                                helpTooltip.style.zIndex = '1000';
                                
                                // Add to DOM
                                document.body.appendChild(helpTooltip);
                                
                                // Auto-remove after 10 seconds
                                setTimeout(() => {
                                    if (helpTooltip.parentNode) {
                                        helpTooltip.parentNode.removeChild(helpTooltip);
                                    }
                                }, 10000);
                                
                                // Also remove on click outside
                                const removeTooltip = (e) => {
                                    if (!helpTooltip.contains(e.target) && !e.target.closest('.carousel-help-button')) {
                                        if (helpTooltip.parentNode) {
                                            helpTooltip.parentNode.removeChild(helpTooltip);
                                        }
                                        document.removeEventListener('click', removeTooltip);
                                    }
                                };
                                
                                setTimeout(() => {
                                    document.addEventListener('click', removeTooltip);
                                }, 100);
                            }}
                            title="Navigation Help"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        
                        {/* Settings button moved to bottom navigation */}
                            <button
                                className="carousel-settings-button"
                                onClick={onOpenSettings}
                                title="Edit Profile"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {/* Main gear body with 12 teeth */}
                                    <path d="M12 2a10 10 0 0 0-7.35 16.76l.65-.65a2 2 0 0 1 2.83 0L9 19.17a2 2 0 0 1 0 2.83l-.65.65A10 10 0 0 0 12 22a10 10 0 0 0 7.35-16.76l-.65.65a2 2 0 0 1-2.83 0L15 4.83a2 2 0 0 1 0-2.83l.65-.65A10 10 0 0 0 12 2z"/>
                                    {/* Center circle */}
                                    <circle cx="12" cy="12" r="3"/>
                                    {/* 12 gear teeth around the perimeter */}
                                    <path d="M12 1v3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M12 20v3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M23 12h-3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M4 12H1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M20.5 3.5l-2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M5.6 18.4L3.5 20.5" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M20.5 20.5l-2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M5.6 5.6L3.5 3.5" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M18.4 5.6l2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M3.5 3.5l2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M18.4 18.4l2.1 2.1" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M3.5 20.5l2.1-2.1" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        {/* Expanded Card Modal */}
        {expandedCard && (
            <div className="expanded-card-overlay" onClick={handleCloseExpanded}>
                <div className="expanded-card-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="expanded-card-header">
                        <h3 className="expanded-card-title">{expandedCard.name}</h3>
                        <button className="expanded-card-close" onClick={handleCloseExpanded}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="expanded-card-content">
                        <div className="expanded-card-avatar">
                            {renderUserAvatar(expandedCard)}
                        </div>
                        <div className="expanded-card-details">
                            <div className="expanded-card-info-item">
                                <strong>Age:</strong> {expandedCard.age || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Major:</strong> {expandedCard.major || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Location:</strong> {expandedCard.location || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Allergies:</strong> {expandedCard.allergyInfo || 'N/A'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Instagram:</strong> {expandedCard.instagram && expandedCard.instagram.trim() ? `@${expandedCard.instagram}` : 'N/A'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Match Score:</strong> {expandedCard.compatibility}%
                            </div>
                            {expandedCard.distance !== null && (
                                <div className="expanded-card-info-item">
                                    <strong>Distance:</strong> {expandedCard.distance} miles away
                                </div>
                            )}
                        </div>
                        <div className="expanded-card-actions">
                            <button className="expanded-card-chat-button" onClick={() => onStartChat(expandedCard)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Start Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}

function SettingsScreen({ currentUser, userProfile, onBack, onSave }) {
    const [name, setName] = useState(userProfile?.name || currentUser?.name || '');
    const [major, setMajor] = useState(userProfile?.major || '');
    const [age, setAge] = useState(userProfile?.age || '');
    const [location, setLocation] = useState(userProfile?.location || '');
    const [allergies, setAllergies] = useState(userProfile?.allergyInfo || '');
    const [instagram, setInstagram] = useState(userProfile?.instagram || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // Function to detect user's location
    const detectLocation = async () => {
        setIsDetectingLocation(true);
        
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
            setIsDetectingLocation(false);
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get city and state
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`
            );
            
            if (!response.ok) {
                throw new Error('Failed to get location data');
            }
            
            const data = await response.json();
            
            if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
                const state = data.address.state || '';
                
                if (city && state) {
                    const formattedLocation = `${city}, ${state}`;
                    setLocation(formattedLocation);
                    console.log('Detected location:', formattedLocation);
                } else {
                    alert('Could not determine your city and state. Please enter manually.');
                }
            } else {
                alert('Could not determine your location. Please enter manually.');
            }
        } catch (error) {
            console.error('Error detecting location:', error);
            if (error.code === 1) {
                alert('Location access denied. Please enable location services or enter your location manually.');
            } else if (error.code === 2) {
                alert('Location unavailable. Please enter your location manually.');
            } else if (error.code === 3) {
                alert('Location request timed out. Please enter your location manually.');
            } else {
                alert('Error detecting location. Please enter your location manually.');
            }
        } finally {
            setIsDetectingLocation(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedProfile = {
                ...userProfile,
                name: name,
                major: major,
                age: age,
                location: location,
                allergyInfo: allergies,
                instagram: instagram
            };
            
            // Update localStorage with the new name
            localStorage.setItem('userName', name);
            
            await onSave(updatedProfile);
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="chatbot-container-isolated" style={{ height: '100vh', maxHeight: 'none', minHeight: 'none' }}>
            <div className="shared-header">
                <div className="header-content">
                    <h2 className="shared-header-title">Edit Profile</h2>
                    <div className="header-actions">
                        <button 
                            className="back-button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Back button clicked - event:', e);
                                console.log('onBack function:', onBack);
                                if (onBack) {
                                    onBack();
                                } else {
                                    console.error('onBack function is not defined');
                                }
                            }}
                            style={{
                                zIndex: 9999,
                                position: 'relative',
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)',
                                minWidth: '60px',
                                minHeight: '36px'
                            }}
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </div>
            <div className="settings-content">
                <div className="settings-section">
                    <label className="settings-label">Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="settings-input"
                        placeholder="Enter your name"
                    />
                </div>
                <div className="settings-section">
                    <label className="settings-label">Major:</label>
                    <input
                        type="text"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className="settings-input"
                        placeholder="Enter your major"
                    />
                </div>
                <div className="settings-section">
                    <label className="settings-label">Age:</label>
                    <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="settings-input"
                        placeholder="Enter your age (18-25)"
                    />
                </div>
                <div className="settings-section">
                    <label className="settings-label">Location:</label>
                    <div className="location-input-container">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="settings-input"
                            placeholder="Enter your city and state (e.g., 'New York, NY')"
                        />
                        <button
                            type="button"
                            onClick={detectLocation}
                            disabled={isDetectingLocation}
                            className="detect-location-button"
                        >
                            {isDetectingLocation ? (
                                <div className="detect-location-spinner"></div>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <div className="settings-section">
                    <label className="settings-label">Allergies:</label>
                    <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        className="settings-input"
                        placeholder="Enter allergies or 'N/A'"
                    />
                </div>
                <div className="settings-section">
                    <label className="settings-label">Instagram Handle:</label>
                    <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="settings-input"
                        placeholder="Enter Instagram handle (without @)"
                    />
                </div>
                <div className="settings-actions">
                    <button 
                        className="save-button"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Notification({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`notification ${type}`}>
            <div className="notification-content">
                <span className="notification-icon">
                    {type === 'success' ? '✅' : '❌'}
                </span>
                <span className="notification-message">{message}</span>
                <button className="notification-close" onClick={onClose}>×</button>
            </div>
        </div>
    );
}

const Chatbot = ({ currentUser, existingProfile, onResetToHome, onUpdateUser }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [currentQuestionId, setCurrentQuestionId] = useState('name');
    const [answers, setAnswers] = useState([]);
    const messagesEndRef = useRef(null);
    const [showMatchLoading, setShowMatchLoading] = useState(false);
    const [showMatchResults, setShowMatchResults] = useState(false);
    const [matchResults, setMatchResults] = useState({ matches: [], score: 0 });
    const [userImage, setUserImage] = useState(null);
    const [userMajor, setUserMajor] = useState('');
    const [userLocation, setUserLocation] = useState('');
    const [userAge, setUserAge] = useState('');
    const [userInstagram, setUserInstagram] = useState('');
    const [activeMatch, setActiveMatch] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [needsName, setNeedsName] = useState(false);
    const [profileMonitor, setProfileMonitor] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Track user activity for online status
    useEffect(() => {
        if (currentUser && currentUser.id) {
            // Set user as online when component mounts
            firebaseMessaging.setUserOnline(currentUser.id, currentUser.name);
            
            // Track user activity (mouse movements, clicks, etc.)
            const trackActivity = () => {
                firebaseMessaging.updateUserActivity(currentUser.id);
            };
            
            // Handle page visibility changes
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    // User switched tabs or minimized browser
                    firebaseMessaging.setUserOffline(currentUser.id);
                } else {
                    // User returned to the app
                    firebaseMessaging.setUserOnline(currentUser.id, currentUser.name);
                }
            };
            
            // Add activity listeners
            document.addEventListener('mousemove', trackActivity);
            document.addEventListener('click', trackActivity);
            document.addEventListener('keypress', trackActivity);
            document.addEventListener('scroll', trackActivity);
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            return () => {
                // Set user as offline when component unmounts
                firebaseMessaging.setUserOffline(currentUser.id);
                // Remove activity listeners
                document.removeEventListener('mousemove', trackActivity);
                document.removeEventListener('click', trackActivity);
                document.removeEventListener('keypress', trackActivity);
                document.removeEventListener('scroll', trackActivity);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }, [currentUser]);

    const fetchMatches = async (profileId) => {
        setShowMatchLoading(true);
        try {
            const matchResponse = await axios.get(`${API_URL}/match/${profileId}`);
            setMatchResults({
                matches: matchResponse.data.matches,
                score: matchResponse.data.compatibilityScore
            });
            setShowMatchResults(true);
        } catch (err) {
            console.error('Error finding matches:', err);
        } finally {
            setShowMatchLoading(false);
        }
    };
    
    useEffect(() => {
        const loadProfile = async () => {
            console.log('Chatbot loadProfile - existingProfile:', existingProfile);
            console.log('Chatbot loadProfile - currentUser:', currentUser);
            
            // Clear any corrupted profile data
            if (existingProfile && (!existingProfile.userId || existingProfile.userId === 'undefined:1')) {
                console.log('Clearing corrupted profile data...');
                localStorage.removeItem('userProfile');
                localStorage.removeItem('userName');
                // Force a fresh start
                setMessages([]);
                setCurrentQuestionId('name');
                const firstQuestion = questions['name'];
                const botMessage = {
                    text: firstQuestion.text,
                    sender: 'bot'
                };
                setMessages([botMessage]);
                return;
            }
            
            if (existingProfile && existingProfile.userId && existingProfile.userId !== 'undefined:1') {
                console.log('Found valid existing profile, loading matches...');
                setShowMatchLoading(true);
                try {
                    console.log('Calling API:', `${API_URL}/match/${existingProfile.userId}`);
                    const matchResponse = await axios.get(`${API_URL}/match/${existingProfile.userId}`);
                    setMatchResults({
                        matches: matchResponse.data.matches,
                        score: matchResponse.data.compatibilityScore
                    });
                    setShowMatchResults(true);
                } catch (err) {
                    console.error('Error finding matches on load:', err);
                    console.error('API URL:', API_URL);
                    // Clear corrupted profile and start fresh
                    localStorage.removeItem('userProfile');
                    localStorage.removeItem('userName');
                    setMessages([]);
                    setCurrentQuestionId('name');
                    const firstQuestion = questions['name'];
                    const botMessage = {
                        text: firstQuestion.text,
                        sender: 'bot'
                    };
                    setMessages([botMessage]);
                } finally {
                    setShowMatchLoading(false);
                }
            } else {
                console.log('No existing profile, starting with name question...');
                // Always start with the name question
                const firstQuestion = questions['name'];
                const botMessage = {
                    text: firstQuestion.text,
                    sender: 'bot'
                };
                setMessages([botMessage]);
                setCurrentQuestionId('name');
            }
        };

        loadProfile();
    }, [currentUser, existingProfile]);

    // Force initial message if no messages exist and no profile
    useEffect(() => {
        if (messages.length === 0 && !existingProfile && currentUser) {
            const firstQuestion = questions['name'];
            const botMessage = {
                text: firstQuestion.text,
                sender: 'bot'
            };
            setMessages([botMessage]);
            setCurrentQuestionId('name');
        }
    }, [messages.length, existingProfile, currentUser]);

    // Fallback - if still no messages after 1 second, force the first question
    useEffect(() => {
        const timer = setTimeout(() => {
            if (messages.length === 0 && currentUser && !showMatchLoading && !showMatchResults) {
                const firstQuestion = questions['name'];
                const botMessage = {
                    text: firstQuestion.text,
                    sender: 'bot'
                };
                setMessages([botMessage]);
                setCurrentQuestionId('name');
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentUser, showMatchLoading, showMatchResults]);

    useEffect(() => {
        if (existingProfile && existingProfile.id) {
            fetchMatches(existingProfile.profileId);
        }
    }, [existingProfile]);
    
    const askNextQuestion = (prevQuestionId, userAnswer) => {
        const prevQuestion = questions[prevQuestionId];
        let nextQuestionId;
        if (prevQuestion && typeof prevQuestion.getNext === 'function') {
            nextQuestionId = prevQuestion.getNext(userAnswer);
        } else if (prevQuestion && prevQuestion.getNext !== undefined) {
            nextQuestionId = prevQuestion.getNext;
        } else {
            nextQuestionId = undefined;
        }

        if (nextQuestionId && questions[nextQuestionId]) {
            const nextQuestion = questions[nextQuestionId];
            let botMessageText;
            
            // Special handling for upload_image question to use the provided name
            if (nextQuestionId === 'upload_image' && prevQuestionId === 'name') {
                botMessageText = nextQuestion.text(userAnswer); // userAnswer is the name
            } else {
                botMessageText = typeof nextQuestion.text === 'function' ? nextQuestion.text(userAnswer) : nextQuestion.text;
            }
            
            const botMessage = {
                text: botMessageText,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
            setCurrentQuestionId(nextQuestionId);

            if (nextQuestion.isEnd) {
                const finalAnswers = [...answers, { question: prevQuestion.text, answer: userAnswer, score: scoreAnswer(userAnswer, prevQuestionId) }];
                // Show end message, then loading, then matches
                setTimeout(() => {
                    setShowMatchLoading(true);
                    
                    // Set a maximum timeout to prevent infinite loading
                    const maxTimeout = setTimeout(() => {
                        console.log('Forcing match completion due to timeout...');
                        setShowMatchLoading(false);
                        setMatchResults({ 
                            matches: [
                                { 
                                    id: 'demo-1', 
                                    name: 'Alex Chen', 
                                    compatibility: 85, 
                                    major: 'Computer Science', 
                                    location: 'Berkeley, CA',
                                    age: '22',
                                    image: 'https://randomuser.me/api/portraits/men/32.jpg',
                                    instagram: 'alexchen_cs',
                                    allergies: 'No allergies'
                                },
                                { 
                                    id: 'demo-2', 
                                    name: 'Maya Patel', 
                                    compatibility: 78, 
                                    major: 'Biology', 
                                    location: 'Stanford, CA',
                                    age: '21',
                                    image: 'https://randomuser.me/api/portraits/women/68.jpg',
                                    instagram: 'maya_bio',
                                    allergies: 'Peanuts'
                                },
                                { 
                                    id: 'demo-3', 
                                    name: 'Jordan Kim', 
                                    compatibility: 72, 
                                    major: 'Business', 
                                    location: 'San Francisco, CA',
                                    age: '23',
                                    image: 'https://randomuser.me/api/portraits/men/75.jpg',
                                    instagram: 'jordankim_biz',
                                    allergies: 'No allergies'
                                }
                            ] 
                        });
                        setShowMatchResults(true);
                    }, 6500); // 6.5 second timeout to match animation duration
                    
                    setTimeout(async () => {
                        try {
                            await calculateAndSubmit(finalAnswers);
                            clearTimeout(maxTimeout); // Clear timeout if successful
                        } catch (error) {
                            console.error('calculateAndSubmit failed:', error);
                            // The maxTimeout will handle this case
                        }
                    }, 3000); // 3 seconds loading
                }, 1000); // 1 second after end message
            }
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "end",
                    inline: "nearest"
                });
            }
        }, 200); // Longer delay to ensure DOM has fully updated
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        if (currentQuestionId === 'name') {
            // Handle name input - no validation needed, just store the name
            const userMessage = { text: trimmedInput, sender: 'user' };
            setMessages(prev => [...prev, userMessage]);
            
            // Store the name in localStorage for future use
            localStorage.setItem('userName', trimmedInput);
            
            // Update the currentUser object with the provided name
            if (currentUser) {
                const updatedUser = { ...currentUser, name: trimmedInput };
                // Update the parent component's currentUser
                if (onUpdateUser) {
                    onUpdateUser(updatedUser);
                }
            }
            
            setInput('');
            setTimeout(() => askNextQuestion(currentQuestionId, trimmedInput), 300);
            return;
        }

        if (currentQuestionId === 'upload_image') {
            if (trimmedInput.toLowerCase() === 'skip') {
                const userMessage = { text: 'skip', sender: 'user' };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                setTimeout(() => askNextQuestion(currentQuestionId, 'skip'), 300);
            } else {
                setMessages(prev => [...prev, { text: "Please type 'skip' or upload an image.", sender: 'bot' }]);
            }
            return;
        }

        // Handle location detection
        if (currentQuestionId === 'location' && trimmedInput.toLowerCase() === 'detect') {
            const userMessage = { text: 'detect', sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
            
            // Show detecting message
            setMessages(prev => [...prev, { text: "🔍 Detecting your location...", sender: 'bot' }]);
            
            try {
                const detectedLocation = await detectUserLocation();
                if (detectedLocation) {
                    setUserLocation(detectedLocation);
                    setMessages(prev => [...prev, { text: `📍 Detected: ${detectedLocation}`, sender: 'bot' }]);
                    // Clear input and move to next question after successful detection
                    setInput('');
                    setTimeout(() => askNextQuestion(currentQuestionId, detectedLocation), 600);
                } else {
                    setMessages(prev => [...prev, { text: "Could not detect your location. Please enter it manually (e.g., 'New York, NY')", sender: 'bot' }]);
                }
            } catch (error) {
                setMessages(prev => [...prev, { text: "Location detection failed. Please enter your location manually (e.g., 'New York, NY')", sender: 'bot' }]);
            }
            return;
        }

        const currentQuestion = questions[currentQuestionId];
        const userAnswer = trimmedInput;

        // Validate user input against keywords (skip validation for free text questions)
        if (currentQuestion.keywords && currentQuestion.keywords.length > 0 && currentQuestionId !== 'instagram') {
            const lowerCaseInput = userAnswer.toLowerCase();
            
            // Check for common variations and synonyms
            const commonVariations = {
                'yes': ['yeah', 'yep', 'sure', 'ok', 'okay', 'fine'],
                'no': ['nope', 'nah', 'not really', 'not at all'],
                'maybe': ['perhaps', 'possibly', 'might', 'could be'],
                'sometimes': ['occasionally', 'rarely', 'now and then'],
                'okay': ['ok', 'fine', 'good', 'alright'],
                'not okay': ['not ok', 'bad', 'not good', 'no way'],
                'quiet': ['silent', 'peaceful', 'calm'],
                'music': ['tv', 'background', 'sound'],
                'tidy': ['clean', 'neat', 'organized'],
                'relaxed': ['messy', 'casual', 'easygoing'],
                'morning': ['early', 'dawn', 'sunrise'],
                'night': ['late', 'evening', 'owl'],
                'merrier': ['party', 'social', 'lots of guests'],
                'private': ['few guests', 'rarely', 'seldom'],
                'cold': ['freezing', 'chilly', 'need heat'],
                'heat': ['warm', 'hot', 'heating'],
                'cool': ['cold', 'chilly', 'air conditioning'],
                'warm': ['hot', 'heat', 'warmth'],
                'bothers me': ['bothersome', 'annoying', 'irritating'],
                'doesn\'t bother me': ['fine with it', 'okay with it', 'no problem'],
                'love pets': ['love animals', 'pet friendly', 'animal lover'],
                'allergic': ['allergies', 'sensitive', 'reaction'],
                'none': ['no', 'n/a', 'not applicable', 'no allergies'],
                'peanuts': ['peanut', 'nuts', 'tree nuts'],
                'cats': ['cat', 'feline'],
                'dogs': ['dog', 'canine'],
                'dust': ['dusty', 'dust mites'],
                'split': ['share', 'divide', 'half'],
                'share': ['split', 'together', 'both'],
                'buy together': ['split cost', 'share cost', 'joint purchase'],
                'separate': ['each person', 'individual', 'own'],
                'each person': ['separate', 'individual', 'own'],
                'one person': ['single', 'individual', 'alone'],
                'room': ['bedroom', 'private space'],
                'library': ['study room', 'quiet space', 'campus library'],
                'cafe': ['coffee shop', 'starbucks', 'restaurant'],
                'kitchen': ['kitchen table', 'dining room'],
                'desk': ['study desk', 'work area'],
                'bed': ['bedroom', 'in bed'],
                'outside': ['outdoors', 'park', 'campus'],
                'home': ['house', 'apartment', 'dorm'],
                'out': ['outside', 'partying', 'socializing'],
                'party': ['partying', 'going out', 'social'],
                'study': ['studying', 'homework', 'academic'],
                'work': ['working', 'job', 'employment'],
                'relax': ['relaxing', 'chill', 'rest'],
                'social': ['socializing', 'friends', 'people'],
                'gaming': ['games', 'video games', 'console'],
                'reading': ['books', 'novels', 'literature'],
                'sports': ['athletics', 'exercise', 'fitness'],
                'art': ['painting', 'drawing', 'creative'],
                'cooking': ['baking', 'food', 'kitchen'],
                'travel': ['trips', 'vacation', 'exploring'],
                'netflix': ['tv', 'streaming', 'movies'],
                'gym': ['workout', 'exercise', 'fitness'],
                'bestie': ['best friend', 'close friend', 'bff'],
                'friend': ['friendly', 'buddy', 'pal'],
                'friendly': ['nice', 'kind', 'approachable'],
                'respectful': ['polite', 'considerate', 'courteous'],
                'casual': ['relaxed', 'easygoing', 'laid back'],
                'close': ['intimate', 'personal', 'deep']
            };
            
            let isValid = currentQuestion.keywords.some(keyword => lowerCaseInput.includes(keyword));
            
            // If not valid with direct keywords, check variations
            if (!isValid) {
                for (const [keyword, variations] of Object.entries(commonVariations)) {
                    if (currentQuestion.keywords.includes(keyword)) {
                        if (variations.some(variation => lowerCaseInput.includes(variation))) {
                            isValid = true;
                            break;
                        }
                    }
                }
            }

            if (!isValid) {
                const keywordList = currentQuestion.keywords.join(', ');
                setMessages(prev => [...prev, { 
                    text: `I need a specific answer. Please use one of these keywords: ${keywordList}. For example, you could say "${currentQuestion.keywords[0]}" or "${currentQuestion.keywords[1]}".`, 
                    sender: 'bot' 
                }]);
                setInput(''); // Clear input if invalid
                return;
            }
        }

        const userMessage = { text: userAnswer, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);

        const normalizedAnswer = normalizeAnswer(userAnswer, currentQuestionId);
        const newAnswer = { 
            questionId: currentQuestion.isFollowUp ? currentQuestion.originalQuestionId : currentQuestionId,
            question: typeof currentQuestion.text === 'function' 
                ? currentQuestion.text(userAnswer) 
                : currentQuestion.text, 
            answer: normalizedAnswer, 
            score: scoreAnswer(normalizedAnswer, currentQuestionId) 
        };
        
        if (currentQuestion.category === 'location') setUserLocation(normalizedAnswer);
        if (currentQuestionId === 'major') setUserMajor(normalizedAnswer);
        if (currentQuestionId === 'age') {
            const age = parseInt(userAnswer);
            if (isNaN(age) || age < 18 || age > 25) {
                setMessages(prev => [...prev, { 
                    text: "Please enter a valid age between 18 and 25.", 
                    sender: 'bot' 
                }]);
                setInput(''); // Clear input if invalid
                return;
            }
            setUserAge(userAnswer);
        }
        if (currentQuestionId === 'instagram') setUserInstagram(normalizedAnswer);

        setAnswers(prev => [...prev, newAnswer]);
        setInput('');
        
                            setTimeout(() => askNextQuestion(currentQuestionId, normalizedAnswer), 300);
    };
    
    const calculateAndSubmit = async (finalAnswers) => {
        setShowMatchLoading(true);
        
        // First, always save the profile regardless of what happens next
        const totalWeight = finalAnswers.reduce((sum, ans) => {
            const qId = Object.keys(questions).find(key => questions[key].text === ans.question);
            const question = questions[qId] || {};
            return sum + (question.weight || 0);
        }, 0);
    
        const weightedScore = finalAnswers.reduce((sum, ans) => {
            const qId = Object.keys(questions).find(key => questions[key].text === ans.question);
            const question = questions[qId] || {};
            return sum + (ans.score * (question.weight || 0));
        }, 0);
    
        const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        
        // Get the stored name from localStorage
        const storedName = localStorage.getItem('userName') || currentUser?.name || 'Unknown';
    
        const profile = {
            id: currentUser.id,
            name: storedName,
            answers: finalAnswers,
            score: finalScore,
            image: userImage,
            major: userMajor,
            location: userLocation,
            age: userAge,
            instagram: userInstagram,
        };
    
        // ALWAYS save the profile first - this should never fail the entire process
        try {
            console.log('Saving profile:', profile);
        await saveProfile(profile);
            console.log('Profile saved successfully!');
        } catch (saveError) {
            console.error('Error saving profile, but continuing with matches:', saveError);
            // Don't fail the entire process if profile saving fails
        }

        // Now try to find matches - if this fails, we still have the saved profile
        try {
            console.log('Loading all profiles for matching...');
        // After saving, load all profiles and calculate matches
        const allProfiles = await loadAllProfiles();
            console.log('Found profiles:', allProfiles?.length || 0);
            
            // If we can't load profiles from Firebase, use backend test profiles
            let matches = [];
            if (allProfiles && allProfiles.length > 0) {
                matches = await getMatches(profile, allProfiles);
                console.log('Found matches from Firebase:', matches?.length || 0);
            } else {
                console.log('No Firebase profiles found, loading backend profiles...');
                try {
                    // Load profiles directly from backend
                    const backendProfilesResponse = await axios.get(`${API_URL}/profiles`);
                    if (backendProfilesResponse.data && backendProfilesResponse.data.length > 0) {
                        console.log('Loaded backend profiles:', backendProfilesResponse.data.length);
                        matches = await getMatches(profile, backendProfilesResponse.data);
                        console.log('Found matches from backend profiles:', matches?.length || 0);
                    } else {
                        throw new Error('No backend profiles available');
                    }
                } catch (backendError) {
                    console.error('Backend profiles failed:', backendError);
                    console.log('Using fallback demo profiles...');
                    try {
                        const backendResponse = await submitProfile(profile);
                        if (backendResponse && backendResponse.matches) {
                            matches = backendResponse.matches;
                            console.log('Found matches from backend:', matches?.length || 0);
                        } else {
                            throw new Error('Backend submit failed');
                        }
                    } catch (submitError) {
                        console.error('Backend submit also failed:', submitError);
                        // Use hardcoded demo matches as final fallback
                        matches = [
                            { 
                                id: 'demo-1', 
                                name: 'Alex Chen', 
                                compatibility: 85, 
                                major: 'Computer Science', 
                                location: 'Berkeley, CA',
                                age: '22',
                                image: 'https://randomuser.me/api/portraits/men/32.jpg',
                                instagram: 'alexchen_cs',
                                allergies: 'No allergies',
                                answers: [
                                    { questionId: 'intro', answer: 'morning' },
                                    { questionId: 'cleanliness', answer: 'tidy' },
                                    { questionId: 'noise', answer: 'quiet' },
                                    { questionId: 'guests', answer: 'private' },
                                    { questionId: 'smoking', answer: 'no' }
                                ]
                            },
                            { 
                                id: 'demo-2', 
                                name: 'Maya Patel', 
                                compatibility: 78, 
                                major: 'Biology', 
                                location: 'Stanford, CA',
                                age: '21',
                                image: 'https://randomuser.me/api/portraits/women/68.jpg',
                                instagram: 'maya_bio',
                                allergies: 'Peanuts',
                                answers: [
                                    { questionId: 'intro', answer: 'night' },
                                    { questionId: 'cleanliness', answer: 'relaxed' },
                                    { questionId: 'noise', answer: 'music' },
                                    { questionId: 'guests', answer: 'merrier' },
                                    { questionId: 'smoking', answer: 'bothers me' }
                                ]
                            }
                        ];
                        console.log('Using hardcoded demo matches as final fallback');
                    }
                }
            }
            
        setMatchResults({ matches });
        setShowMatchResults(true);
        } catch (matchError) {
            console.error('Error finding matches, but profile was saved:', matchError);
            // Instead of showing error, show demo matches as ultimate fallback
            console.log('Using ultimate fallback demo matches...');
            const demoMatches = [
                { 
                    id: 'demo-1', 
                    name: 'Alex Chen', 
                    compatibility: 85, 
                    major: 'Computer Science', 
                    location: 'Berkeley, CA',
                    age: '22',
                    image: 'https://randomuser.me/api/portraits/men/32.jpg',
                    instagram: 'alexchen_cs',
                    allergies: 'No allergies',
                    answers: [
                        { questionId: 'intro', answer: 'morning' },
                        { questionId: 'cleanliness', answer: 'tidy' },
                        { questionId: 'noise', answer: 'quiet' },
                        { questionId: 'guests', answer: 'private' },
                        { questionId: 'smoking', answer: 'no' }
                    ]
                },
                { 
                    id: 'demo-2', 
                    name: 'Maya Patel', 
                    compatibility: 78, 
                    major: 'Biology', 
                    location: 'Stanford, CA',
                    age: '21',
                    image: 'https://randomuser.me/api/portraits/women/68.jpg',
                    instagram: 'maya_bio',
                    allergies: 'Peanuts',
                    answers: [
                        { questionId: 'intro', answer: 'night' },
                        { questionId: 'cleanliness', answer: 'relaxed' },
                        { questionId: 'noise', answer: 'music' },
                        { questionId: 'guests', answer: 'merrier' },
                        { questionId: 'smoking', answer: 'bothers me' }
                    ]
                },
                { 
                    id: 'demo-3', 
                    name: 'Jordan Kim', 
                    compatibility: 72, 
                    major: 'Business', 
                    location: 'San Francisco, CA',
                    age: '23',
                    image: 'https://randomuser.me/api/portraits/men/75.jpg',
                    instagram: 'jordankim_biz',
                    allergies: 'No allergies',
                    answers: [
                        { questionId: 'intro', answer: 'morning' },
                        { questionId: 'cleanliness', answer: 'between' },
                        { questionId: 'noise', answer: 'quiet' },
                        { questionId: 'guests', answer: 'merrier' },
                        { questionId: 'smoking', answer: 'no' }
                    ]
                }
            ];
            setMatchResults({ matches: demoMatches });
            setShowMatchResults(true);
        } finally {
        setShowMatchLoading(false);
        }
    };

    const calculateDistance = async (location1, location2) => {
        if (location1.toLowerCase().trim() === location2.toLowerCase().trim()) {
            return 0;
        }
        const apiType = getDistanceAPI();
        console.log(`Using distance API: ${apiType} for ${location1} to ${location2}`);
        
        try {
            if (apiType === 'GOOGLE_MAPS') {
                const response = await fetch(
                    `${DISTANCE_API_CONFIG.GOOGLE_MAPS.url}?origins=${encodeURIComponent(location1)}&destinations=${encodeURIComponent(location2)}&units=imperial&key=${DISTANCE_API_CONFIG.GOOGLE_MAPS.apiKey}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'OK' && data.rows[0] && data.rows[0].elements[0]) {
                        const element = data.rows[0].elements[0];
                        if (element.status === 'OK') {
                            const distanceInMiles = element.distance.value * 0.000621371;
                            console.log(`Google Maps distance: ${Math.round(distanceInMiles)} miles`);
                            return Math.round(distanceInMiles);
                        }
                    }
                }
            } else if (apiType === 'FREE_DISTANCE' || apiType === 'ALTERNATIVE_FREE' || apiType === 'SIMPLE_DISTANCE') {
                try {
                    const response = await fetch(
                        `${DISTANCE_API_CONFIG.FREE_DISTANCE.url}?origins=${encodeURIComponent(location1)}&destinations=${encodeURIComponent(location2)}&units=imperial&key=free`,
                        {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                            },
                            timeout: 5000
                        }
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Only log API response if it contains useful data
                        if (data.status === 'OK') {
                            console.log(`${apiType} API response: OK`);
                        }
                        
                        if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
                            const element = data.rows[0].elements[0];
                            if (element.status === 'OK' && element.distance) {
                                const distanceInMiles = element.distance.value * 0.000621371;
                                console.log(`${apiType} distance: ${Math.round(distanceInMiles)} miles`);
                                return Math.round(distanceInMiles);
                            }
                        }
                    }
                } catch (apiError) {
                    console.log(`${apiType} API failed:`, apiError);
                }
            }
            
            console.log('Distance APIs unavailable, using fallback calculation');
            return calculateDistanceFallback(location1, location2);
        } catch (error) {
            console.error('Error calculating distance with API:', error);
            console.log('Using fallback distance calculation');
            return calculateDistanceFallback(location1, location2);
        }
    };

    // Fallback distance calculation (improved accuracy)
    const calculateDistanceFallback = (location1, location2) => {
        const loc1 = location1.toLowerCase().trim();
        const loc2 = location2.toLowerCase().trim();
        
        // Extract city and state from location strings
        const parseLocation = (location) => {
            const parts = location.split(',').map(part => part.trim());
            return {
                city: parts[0] || '',
                state: parts[1] || ''
            };
        };
        
        const loc1Parsed = parseLocation(loc1);
        const loc2Parsed = parseLocation(loc2);
        
        // If same city and state, distance is 0
        if (loc1Parsed.city === loc2Parsed.city && loc1Parsed.state === loc2Parsed.state) {
            return 0;
        }
        
        // Major city distances (approximate)
        const majorCities = {
            'new york': { lat: 40.7128, lng: -74.0060 },
            'los angeles': { lat: 34.0522, lng: -118.2437 },
            'chicago': { lat: 41.8781, lng: -87.6298 },
            'houston': { lat: 29.7604, lng: -95.3698 },
            'phoenix': { lat: 33.4484, lng: -112.0740 },
            'philadelphia': { lat: 39.9526, lng: -75.1652 },
            'san antonio': { lat: 29.4241, lng: -98.4936 },
            'san diego': { lat: 32.7157, lng: -117.1611 },
            'dallas': { lat: 32.7767, lng: -96.7970 },
            'san jose': { lat: 37.3382, lng: -121.8863 },
            'austin': { lat: 30.2672, lng: -97.7431 },
            'jacksonville': { lat: 30.3322, lng: -81.6557 },
            'fort worth': { lat: 32.7555, lng: -97.3308 },
            'columbus': { lat: 39.9612, lng: -82.9988 },
            'charlotte': { lat: 35.2271, lng: -80.8431 },
            'san francisco': { lat: 37.7749, lng: -122.4194 },
            'indianapolis': { lat: 39.7684, lng: -86.1581 },
            'seattle': { lat: 47.6062, lng: -122.3321 },
            'denver': { lat: 39.7392, lng: -104.9903 },
            'washington': { lat: 38.9072, lng: -77.0369 },
            'boston': { lat: 42.3601, lng: -71.0589 },
            'el paso': { lat: 31.7619, lng: -106.4850 },
            'nashville': { lat: 36.1627, lng: -86.7816 },
            'detroit': { lat: 42.3314, lng: -83.0458 },
            'oklahoma city': { lat: 35.4676, lng: -97.5164 },
            'portland': { lat: 45.5152, lng: -122.6784 },
            'las vegas': { lat: 36.1699, lng: -115.1398 },
            'memphis': { lat: 35.1495, lng: -90.0490 },
            'louisville': { lat: 38.2527, lng: -85.7585 },
            'baltimore': { lat: 39.2904, lng: -76.6122 },
            'milwaukee': { lat: 43.0389, lng: -87.9065 },
            'albuquerque': { lat: 35.0844, lng: -106.6504 },
            'tucson': { lat: 32.2226, lng: -110.9747 },
            'fresno': { lat: 36.7378, lng: -119.7871 },
            'sacramento': { lat: 38.5816, lng: -121.4944 },
            'atlanta': { lat: 33.7490, lng: -84.3880 },
            'kansas city': { lat: 39.0997, lng: -94.5786 },
            'long beach': { lat: 33.7701, lng: -118.1937 },
            'colorado springs': { lat: 38.8339, lng: -104.8214 },
            'miami': { lat: 25.7617, lng: -80.1918 },
            'raleigh': { lat: 35.7796, lng: -78.6382 },
            'omaha': { lat: 41.2565, lng: -95.9345 },
            'minneapolis': { lat: 44.9778, lng: -93.2650 },
            'cleveland': { lat: 41.4993, lng: -81.6944 },
            'tulsa': { lat: 36.1540, lng: -95.9928 },
            'arlington': { lat: 32.7357, lng: -97.1081 },
            'new orleans': { lat: 29.9511, lng: -90.0715 },
            'wichita': { lat: 37.6872, lng: -97.3301 },
            'bakersfield': { lat: 35.3733, lng: -119.0187 },
            'tampa': { lat: 27.9506, lng: -82.4572 },
            'aurora': { lat: 39.7294, lng: -104.8319 },
            'honolulu': { lat: 21.3099, lng: -157.8581 },
            'anaheim': { lat: 33.8366, lng: -117.9143 },
            'santa ana': { lat: 33.7455, lng: -117.8677 },
            'corpus christi': { lat: 27.8006, lng: -97.3964 },
            'riverside': { lat: 33.9533, lng: -117.3962 },
            'lexington': { lat: 38.0406, lng: -84.5037 },
            'stockton': { lat: 37.9577, lng: -121.2908 },
            'henderson': { lat: 36.0395, lng: -114.9817 },
            'saint paul': { lat: 44.9537, lng: -93.0900 },
            'st. louis': { lat: 38.6270, lng: -90.1994 },
            'cincinnati': { lat: 39.1031, lng: -84.5120 },
            'pittsburgh': { lat: 40.4406, lng: -79.9959 },
            'greensboro': { lat: 36.0726, lng: -79.7920 },
            'anchorage': { lat: 61.2181, lng: -149.9003 },
            'plano': { lat: 33.0198, lng: -96.6989 },
            'orlando': { lat: 28.5383, lng: -81.3792 },
            'newark': { lat: 40.7357, lng: -74.1724 },
            'durham': { lat: 35.9940, lng: -78.8986 },
            'chula vista': { lat: 32.6401, lng: -117.0842 },
            'toledo': { lat: 41.6528, lng: -83.5379 },
            'fort wayne': { lat: 41.0793, lng: -85.1394 },
            'st. petersburg': { lat: 27.7731, lng: -82.6400 },
            'laredo': { lat: 27.5064, lng: -99.5075 },
            'jersey city': { lat: 40.7178, lng: -74.0431 },
            'chandler': { lat: 33.3062, lng: -111.8413 },
            'madison': { lat: 43.0731, lng: -89.4012 },
            'lubbock': { lat: 33.5779, lng: -101.8552 },
            'scottsdale': { lat: 33.4942, lng: -111.9261 },
            'reno': { lat: 39.5296, lng: -119.8138 },
            'buffalo': { lat: 42.8864, lng: -78.8784 },
            'gilbert': { lat: 33.3528, lng: -111.7890 },
            'glendale': { lat: 33.5387, lng: -112.1860 },
            'north las vegas': { lat: 36.1989, lng: -115.1175 },
            'winston-salem': { lat: 36.0999, lng: -80.2442 },
            'chesapeake': { lat: 36.7682, lng: -76.2875 },
            'norfolk': { lat: 36.8508, lng: -76.2859 },
            'fremont': { lat: 37.5485, lng: -121.9886 },
            'garland': { lat: 32.9126, lng: -96.6389 },
            'irvine': { lat: 33.6846, lng: -117.8265 },
            'hialeah': { lat: 25.8576, lng: -80.2781 },
            'richmond': { lat: 37.5407, lng: -77.4360 },
            'boise': { lat: 43.6150, lng: -116.2023 },
            'spokane': { lat: 47.6588, lng: -117.4260 },
            'baton rouge': { lat: 30.4515, lng: -91.1871 },
            'tacoma': { lat: 47.2529, lng: -122.4443 },
            'san bernardino': { lat: 34.1083, lng: -117.2898 },
            'grand rapids': { lat: 42.9634, lng: -85.6681 },
            'huntsville': { lat: 34.7304, lng: -86.5861 },
            'salt lake city': { lat: 40.7608, lng: -111.8910 },
            'frisco': { lat: 33.1507, lng: -96.8236 },
            'yonkers': { lat: 40.9312, lng: -73.8987 },
            'norwalk': { lat: 33.9022, lng: -118.0817 },
            'new haven': { lat: 41.3083, lng: -72.9279 },
            'north hialeah': { lat: 25.9053, lng: -80.3100 },
            'gilbert': { lat: 33.3528, lng: -111.7890 },
            'glendale': { lat: 33.5387, lng: -112.1860 },
            'north las vegas': { lat: 36.1989, lng: -115.1175 },
            'winston-salem': { lat: 36.0999, lng: -80.2442 },
            'chesapeake': { lat: 36.7682, lng: -76.2875 },
            'norfolk': { lat: 36.8508, lng: -76.2859 },
            'fremont': { lat: 37.5485, lng: -121.9886 },
            'garland': { lat: 32.9126, lng: -96.6389 },
            'irvine': { lat: 33.6846, lng: -117.8265 },
            'hialeah': { lat: 25.8576, lng: -80.2781 },
            'richmond': { lat: 37.5407, lng: -77.4360 },
            'boise': { lat: 43.6150, lng: -116.2023 },
            'spokane': { lat: 47.6588, lng: -117.4260 },
            'baton rouge': { lat: 30.4515, lng: -91.1871 },
            'tacoma': { lat: 47.2529, lng: -122.4443 },
            'san bernardino': { lat: 34.1083, lng: -117.2898 },
            'grand rapids': { lat: 42.9634, lng: -85.6681 },
            'huntsville': { lat: 34.7304, lng: -86.5861 },
            'salt lake city': { lat: 40.7608, lng: -111.8910 },
            'frisco': { lat: 33.1507, lng: -96.8236 },
            'yonkers': { lat: 40.9312, lng: -73.8987 },
            'norwalk': { lat: 33.9022, lng: -118.0817 },
            'new haven': { lat: 41.3083, lng: -72.9279 },
            'north hialeah': { lat: 25.9053, lng: -80.3100 }
        };
        
        // Check if both locations are major cities
        const city1 = majorCities[loc1Parsed.city];
        const city2 = majorCities[loc2Parsed.city];
        
        if (city1 && city2) {
            // Calculate distance using Haversine formula
            const R = 3959; // Earth's radius in miles
            const dLat = (city2.lat - city1.lat) * Math.PI / 180;
            const dLng = (city2.lng - city1.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            console.log(`Calculated distance between ${loc1Parsed.city} and ${loc2Parsed.city}: ${Math.round(distance)} miles`);
            return Math.round(distance);
        }
        
        // If same state but different city, estimate based on state size
        if (loc1Parsed.state === loc2Parsed.state && loc1Parsed.state) {
            const stateDistances = {
                'ca': 120, 'tx': 180, 'ny': 100, 'fl': 150, 'il': 80,
                'pa': 90, 'oh': 70, 'mi': 100, 'ga': 120, 'nc': 90,
                'va': 80, 'tn': 100, 'mo': 90, 'in': 70, 'ky': 80,
                'al': 100, 'ms': 80, 'ar': 90, 'la': 100, 'ok': 120,
                'ks': 100, 'ne': 120, 'nd': 100, 'sd': 100, 'mn': 100,
                'ia': 80, 'wi': 80, 'az': 120, 'nm': 120, 'co': 120,
                'ut': 100, 'wy': 120, 'mt': 150, 'id': 120, 'wa': 100,
                'or': 100, 'nv': 120, 'ak': 200, 'hi': 50, 'me': 80,
                'nh': 60, 'vt': 60, 'ma': 70, 'ri': 30, 'ct': 50,
                'nj': 60, 'de': 30, 'md': 50, 'wv': 60, 'sc': 80
            };
            
            const stateKey = loc1Parsed.state.toLowerCase();
            const distance = stateDistances[stateKey] || 80;
            console.log(`Same state distance (${loc1Parsed.state}): ${distance} miles`);
            return distance;
        }
        
        // If different states, estimate based on region
        const getRegionDistance = (state1, state2) => {
            const regions = {
                northeast: ['ny', 'ma', 'ct', 'ri', 'nh', 'vt', 'me', 'nj', 'pa', 'de', 'md'],
                southeast: ['fl', 'ga', 'sc', 'nc', 'va', 'wv', 'ky', 'tn', 'al', 'ms', 'ar', 'la'],
                midwest: ['il', 'in', 'oh', 'mi', 'wi', 'mn', 'ia', 'mo', 'ks', 'ne', 'nd', 'sd'],
                southwest: ['tx', 'ok', 'nm', 'az'],
                west: ['ca', 'or', 'wa', 'nv', 'id', 'ut', 'co', 'wy', 'mt', 'ak', 'hi']
            };
            
            const getRegion = (state) => {
                for (const [region, states] of Object.entries(regions)) {
                    if (states.includes(state.toLowerCase())) {
                        return region;
                    }
                }
                return 'other';
            };
            
            const region1 = getRegion(state1);
            const region2 = getRegion(state2);
            
            if (region1 === region2) {
                return 300; // Same region
            }
            
            // Cross-region distances
            const regionDistances = {
                'northeast-southeast': 800, 'northeast-midwest': 600, 'northeast-southwest': 1200, 'northeast-west': 2500,
                'southeast-midwest': 800, 'southeast-southwest': 600, 'southeast-west': 2200,
                'midwest-southwest': 800, 'midwest-west': 1500,
                'southwest-west': 800
            };
            
            const key = [region1, region2].sort().join('-');
            return regionDistances[key] || 1500;
        };
        
        const distance = getRegionDistance(loc1Parsed.state, loc2Parsed.state);
        console.log(`Cross-region distance: ${distance} miles`);
        return distance;
    };

    const getMatches = async (currentProfile, allProfiles) => {
        // Get pinned matches from localStorage
        const storedPinned = localStorage.getItem(`pinnedMatches_${currentUser.id}`);
        const pinnedMatches = storedPinned ? new Set(JSON.parse(storedPinned)) : new Set();
        
        console.log('🔍 getMatches debug:', {
            currentProfile: currentProfile,
            currentProfileId: currentProfile.id,
            allProfilesCount: allProfiles.length,
            allProfileIds: allProfiles.map(p => ({ id: p.id, userId: p.userId, name: p.name }))
        });
        
        const matchesWithDistance = await Promise.all(
            allProfiles
            .filter(p => {
                // Fix: Handle multiple ID field variations to ensure all profiles are visible
                const currentId = currentProfile.id || currentProfile.userId;
                const otherId = p.id || p.userId;
                
                // Don't match with self
                if (currentId === otherId) {
                    console.log(`❌ Filtering out self: ${currentId} === ${otherId}`);
                    return false;
                }
                
                // Ensure profile has required fields
                if (!p.name) {
                    console.log(`❌ Filtering out profile without name:`, p);
                    return false;
                }
                
                console.log(`✅ Including profile: ${p.name} (ID: ${otherId})`);
                return true;
            })
                .map(async (otherUser) => {
                    // Calculate compatibility based on normalized answers
                    let compatibilityScore = 0;
                    let totalQuestions = 0;
                    
                    // Compare answers for each question
                    if (currentProfile.answers && otherUser.answers) {
                    currentProfile.answers.forEach(currentAnswer => {
                        const otherAnswer = otherUser.answers.find(a => a.questionId === currentAnswer.questionId);
                        if (otherAnswer) {
                            totalQuestions++;
                            if (currentAnswer.answer === otherAnswer.answer) {
                                compatibilityScore += 1; // Perfect match
                            } else if (currentAnswer.answer && otherAnswer.answer) {
                                // Check for similar answers (e.g., "yes" vs "yeah")
                                const currentLower = currentAnswer.answer.toLowerCase();
                                const otherLower = otherAnswer.answer.toLowerCase();
                                if (currentLower.includes(otherLower) || otherLower.includes(currentLower)) {
                                    compatibilityScore += 0.8; // Similar match
                                } else {
                                    compatibilityScore += 0.2; // Different answers
                                }
                            }
                        }
                    });
                    }
                    
                    // Calculate percentage
                const compatibility = totalQuestions > 0 ? (compatibilityScore / totalQuestions) * 100 : 50; // Default to 50% if no answers
                    
                    // Calculate distance if both users have location data
                    let distance = null;
                    if (currentProfile.location && otherUser.location) {
                        distance = await calculateDistance(currentProfile.location, otherUser.location);
                    }
                    
                // Use consistent ID for matching
                const matchId = otherUser.id || otherUser.userId;
                    
                return {
                    ...otherUser,
                    id: matchId, // Ensure consistent ID field
                    compatibility: compatibility.toFixed(2),
                        distance: distance,
                    isPinned: pinnedMatches.has(matchId), // Check if pinned using consistent ID
                    };
                })
        );
        
        console.log(`🎯 Found ${matchesWithDistance.length} potential matches`);
        
        return matchesWithDistance
            .sort((a, b) => {
                // First priority: Pinned matches
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                
                // Second priority: Unread notifications
                const aUnreadCount = notificationService.getUnreadCount([currentUser.id, a.id].sort().join('_'));
                const bUnreadCount = notificationService.getUnreadCount([currentUser.id, b.id].sort().join('_'));
                if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
                if (aUnreadCount === 0 && bUnreadCount > 0) return 1;
                
                // Third priority: Recent message activity (users with recent conversations)
                const aChatId = [currentUser.id, a.id].sort().join('_');
                const bChatId = [currentUser.id, b.id].sort().join('_');
                const aLastRead = notificationService.lastReadTimestamps.get(aChatId) || 0;
                const bLastRead = notificationService.lastReadTimestamps.get(bChatId) || 0;
                
                // If one user has recent activity and the other doesn't, prioritize the active one
                const hasRecentActivityA = aLastRead > 0;
                const hasRecentActivityB = bLastRead > 0;
                
                if (hasRecentActivityA && !hasRecentActivityB) return -1;
                if (!hasRecentActivityA && hasRecentActivityB) return 1;
                
                // If both have recent activity, sort by most recent
                if (hasRecentActivityA && hasRecentActivityB) {
                    return bLastRead - aLastRead; // Most recent first
                }
                
                // Fourth priority: Distance (closer first)
                if (a.distance !== null && b.distance !== null) {
                    return a.distance - b.distance;
                }
                if (a.distance !== null && b.distance === null) return -1;
                if (a.distance === null && b.distance !== null) return 1;
                
                // Fifth priority: Compatibility score
                return parseFloat(b.compatibility) - parseFloat(a.compatibility);
            })
            .slice(0, 50); // Show more matches since we're sorting by multiple criteria
    };

    // On mount, if existingProfile is present, fetch matches for that profile
    useEffect(() => {
        if (existingProfile && existingProfile.id) {
            (async () => {
                try {
                    console.log('🔄 Loading matches for existing profile:', existingProfile.id);
                    
                    // First try to load from Firebase
                    let allProfiles = await loadAllProfiles();
                    console.log(`📊 Firebase profiles loaded: ${allProfiles.length}`);
                    
                    // If no Firebase profiles, try backend
                    if (!allProfiles || allProfiles.length === 0) {
                        console.log('🔄 No Firebase profiles, trying backend...');
                        try {
                            const backendResponse = await axios.get(`${API_URL}/profiles`);
                            if (backendResponse.data && backendResponse.data.length > 0) {
                                // Convert backend profiles to Firebase format
                                allProfiles = backendResponse.data.map(backendProfile => ({
                                    id: backendProfile.userId || backendProfile.id,
                                    userId: backendProfile.userId || backendProfile.id,
                                    name: backendProfile.name,
                                    age: backendProfile.age,
                                    major: backendProfile.major,
                                    location: backendProfile.location,
                                    image: backendProfile.image,
                                    instagram: backendProfile.instagram,
                                    allergies: backendProfile.allergies,
                                    answers: backendProfile.answers,
                                    score: backendProfile.score,
                                    isTestProfile: true
                                }));
                                console.log(`📊 Backend profiles converted: ${allProfiles.length}`);
                            }
                        } catch (backendError) {
                            console.error('Error loading backend profiles:', backendError);
                        }
                    }
                    
                    // Ensure current profile is included in allProfiles
                    const currentProfileExists = allProfiles.some(p => 
                        (p.id === existingProfile.id) || (p.userId === existingProfile.id)
                    );
                    
                    if (!currentProfileExists) {
                        console.log('➕ Adding current profile to allProfiles');
                        allProfiles.push(existingProfile);
                    }
                    
                    console.log(`🎯 Total profiles available: ${allProfiles.length}`);
                    console.log('Profile IDs:', allProfiles.map(p => ({ id: p.id, userId: p.userId, name: p.name })));
                    
                    // Get matches using the consolidated profile list
                const matches = await getMatches(existingProfile, allProfiles);
                    console.log(`✅ Matches found: ${matches.length}`);
                    
                    setMatchResults({ matches, score: existingProfile.score || 0 });
                setShowMatchResults(true);
                    
                } catch (error) {
                    console.error('Error loading matches:', error);
                    // Fallback: try to get matches from backend API
                    try {
                        console.log('🔄 Fallback: trying backend API...');
                        const matchResponse = await axios.get(`${API_URL}/match/${existingProfile.id}`);
                        setMatchResults({
                            matches: matchResponse.data.matches,
                            score: matchResponse.data.compatibilityScore
                        });
                        setShowMatchResults(true);
                    } catch (fallbackError) {
                        console.error('Fallback also failed:', fallbackError);
                    }
                }
            })();
        }
    }, [existingProfile]);

    const normalizeAnswer = (answer, questionId) => {
        const currentQuestion = questions[questionId];
        if (!currentQuestion.keywords || currentQuestion.keywords.length === 0) {
            // Special handling for Instagram handles
            if (questionId === 'instagram') {
                const trimmedAnswer = answer.trim().toLowerCase();
                if (trimmedAnswer === 'skip' || trimmedAnswer === 'none' || trimmedAnswer === 'n/a' || trimmedAnswer === 'no' || trimmedAnswer === 'prefer not to share' || trimmedAnswer === '') {
                    return '';
                }
                // Remove @ symbol if present and return clean handle
                return answer.trim().replace(/^@/, '');
            }
            return answer; // Return original answer for other free text questions
        }
        
        const lowerCaseInput = answer.toLowerCase();
        
        // Check for common variations and synonyms
        const commonVariations = {
            'yes': ['yeah', 'yep', 'sure', 'ok', 'okay', 'fine'],
            'no': ['nope', 'nah', 'not really', 'not at all'],
            'maybe': ['perhaps', 'possibly', 'might', 'could be'],
            'sometimes': ['occasionally', 'rarely', 'now and then'],
            'okay': ['ok', 'fine', 'good', 'alright'],
            'not okay': ['not ok', 'bad', 'not good', 'no way'],
            'quiet': ['silent', 'peaceful', 'calm'],
            'music': ['tv', 'background', 'sound'],
            'tidy': ['clean', 'neat', 'organized'],
            'relaxed': ['messy', 'casual', 'easygoing'],
            'morning': ['early', 'dawn', 'sunrise'],
            'night': ['late', 'evening', 'owl'],
            'merrier': ['party', 'social', 'lots of guests'],
            'private': ['few guests', 'rarely', 'seldom'],
            'cold': ['freezing', 'chilly', 'need heat'],
            'heat': ['warm', 'hot', 'heating'],
            'cool': ['cold', 'chilly', 'air conditioning'],
            'warm': ['hot', 'heat', 'warmth'],
            'bothers me': ['bothersome', 'annoying', 'irritating'],
            'doesn\'t bother me': ['fine with it', 'okay with it', 'no problem'],
            'love pets': ['love animals', 'pet friendly', 'animal lover'],
            'allergic': ['allergies', 'sensitive', 'reaction'],
            'none': ['no', 'n/a', 'not applicable', 'no allergies'],
            'peanuts': ['peanut', 'nuts', 'tree nuts'],
            'cats': ['cat', 'feline'],
            'dogs': ['dog', 'canine'],
            'dust': ['dusty', 'dust mites'],
            'split': ['share', 'divide', 'half'],
            'share': ['split', 'together', 'both'],
            'buy together': ['split cost', 'share cost', 'joint purchase'],
            'separate': ['each person', 'individual', 'own'],
            'each person': ['separate', 'individual', 'own'],
            'one person': ['single', 'individual', 'alone'],
            'room': ['bedroom', 'private space'],
            'library': ['study room', 'quiet space', 'campus library'],
            'cafe': ['coffee shop', 'starbucks', 'restaurant'],
            'kitchen': ['kitchen table', 'dining room'],
            'desk': ['study desk', 'work area'],
            'bed': ['bedroom', 'in bed'],
            'outside': ['outdoors', 'park', 'campus'],
            'home': ['house', 'apartment', 'dorm'],
            'out': ['outside', 'partying', 'socializing'],
            'party': ['partying', 'going out', 'social'],
            'study': ['studying', 'homework', 'academic'],
            'work': ['working', 'job', 'employment'],
            'relax': ['relaxing', 'chill', 'rest'],
            'social': ['socializing', 'friends', 'people'],
            'gaming': ['games', 'video games', 'console'],
            'reading': ['books', 'novels', 'literature'],
            'sports': ['athletics', 'exercise', 'fitness'],
            'art': ['painting', 'drawing', 'creative'],
            'cooking': ['baking', 'food', 'kitchen'],
            'travel': ['trips', 'vacation', 'exploring'],
            'netflix': ['tv', 'streaming', 'movies'],
            'gym': ['workout', 'exercise', 'fitness'],
            'bestie': ['best friend', 'close friend', 'bff'],
            'friend': ['friendly', 'buddy', 'pal'],
            'friendly': ['nice', 'kind', 'approachable'],
            'respectful': ['polite', 'considerate', 'courteous'],
            'casual': ['relaxed', 'easygoing', 'laid back'],
            'close': ['intimate', 'personal', 'deep']
        };
        
        // First check direct keywords
        for (const keyword of currentQuestion.keywords) {
            if (lowerCaseInput.includes(keyword)) {
                return keyword;
            }
        }
        
        // Then check variations
        for (const [keyword, variations] of Object.entries(commonVariations)) {
            if (currentQuestion.keywords.includes(keyword)) {
                if (variations.some(variation => lowerCaseInput.includes(variation))) {
                    return keyword;
                }
            }
        }
        
        return answer; // Return original if no match found
    };

    const scoreAnswer = (answer, questionId) => {
        const sentiment = new Sentiment();
        const result = sentiment.analyze(answer);
        return result.score;
    };
    
    const submitProfile = async (profile) => {
        try {
            const response = await axios.post(`${API_URL}/submit`, profile);
            return response.data;
        } catch (error) {
            console.error('Error submitting profile:', error);
            return null;
        }
    };

    const handleImageUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].size > 5 * 1024 * 1024) {
                alert("File is too large! Please select a file smaller than 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setUserImage(event.target.result);
                const userMessage = { text: 'Image uploaded!', sender: 'user' };
                setMessages(prev => [...prev, userMessage]);
                setTimeout(() => askNextQuestion('upload_image', 'image_uploaded'), 300);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleStartChat = async (match) => {
        console.log('🚀 Starting chat with:', match);
        console.log('Current user:', currentUser);
        console.log('Match user:', match);
        
        // Generate consistent chat ID
        const chatId = getChatId(currentUser.id, match.id);
        console.log('💬 Generated chat ID:', chatId);
        
        if (!chatId) {
            console.error('❌ Failed to generate chat ID');
            return;
        }
        
        // Ensure both users are in the chat
        try {
            await firebaseMessaging.createChat(chatId, [currentUser.id, match.id]);
            console.log('✅ Chat created/verified for ID:', chatId);
            
            // Force sync messages to ensure consistency
            const existingMessages = await firebaseMessaging.getChatHistory(chatId);
            console.log(`📨 Found ${existingMessages.length} existing messages in chat`);
            
            // Mark messages as read for current user
            if (existingMessages.length > 0) {
        notificationService.markChatAsRead(chatId);
                console.log('✅ Marked chat as read');
            }
            
        } catch (error) {
            console.error('❌ Error setting up chat:', error);
        }
        
        setActiveMatch(match);
    };

    const handleResetToHome = () => {
        // Complete reset to initial home screen
        setShowMatchResults(false);
        setShowMatchLoading(false);
        setActiveMatch(null);
        setMatchResults({ matches: [], score: 0 });
        // Reset chatbot to initial state
        setMessages([]);
        setInput('');
        setCurrentQuestionId('upload_image');
        setAnswers([]);
        setUserImage(null);
        setUserMajor('');
        setUserLocation('');
        setUserAge('');
        setUserInstagram('');
        setShowSettings(false);
        // Call the parent function to return to welcome screen
        if (onResetToHome) {
            onResetToHome();
        }
    };

    const handleOpenSettings = () => {
        setShowSettings(true);
    };

    const handleCloseSettings = () => {
        console.log('handleCloseSettings called');
        console.log('Current showSettings state:', showSettings);
        setShowSettings(false);
        console.log('setShowSettings(false) called');
    };

    const handleSaveSettings = async (updatedProfile) => {
        setIsLoading(true);
        setError(null);
        try {
            await saveProfile(updatedProfile);
            
            // Update localStorage with the new name
            if (updatedProfile.name) {
                localStorage.setItem('userName', updatedProfile.name);
            }
            
            // Update the currentUser object with the new name
            if (currentUser && updatedProfile.name) {
                const updatedUser = { ...currentUser, name: updatedProfile.name };
                // You might want to update the parent component's currentUser here
                // For now, we'll update the local state
                if (onUpdateUser) {
                    onUpdateUser(updatedUser);
                }
            }
            
            // Refresh matches with updated profile
            const allProfiles = await loadAllProfiles();
            const matches = await getMatches(updatedProfile, allProfiles);
            setMatchResults({ matches });
            setShowSettings(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('Failed to save profile. Please try again.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const detectUserLocation = async () => {
        if (!navigator.geolocation) {
            return null;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get city and state
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`
            );
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            
            if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
                const state = data.address.state || '';
                
                if (city && state) {
                    return `${city}, ${state}`;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error detecting location:', error);
            return null;
        }
    };

    // Debug logging
    console.log('Chatbot render state:', {
        activeMatch,
        showMatchLoading,
        showSettings,
        showMatchResults,
        messages: messages.length,
        currentQuestionId,
        existingProfile: !!existingProfile,
        currentUser: !!currentUser
    });

    // Real-time profile monitoring for automatic match updates
    useEffect(() => {
        if (currentUser && currentUser.id) {
            console.log('🔍 Starting real-time profile monitoring...');
            
            // Monitor for new profiles and automatically refresh matches
            const monitor = monitorNewProfiles((newProfiles, allProfiles) => {
                console.log(`🆕 New profiles detected: ${newProfiles.map(p => p.name).join(', ')}`);
                
                // If we have an existing profile, refresh matches with new profiles
                if (existingProfile && existingProfile.id) {
                    console.log('🔄 Refreshing matches due to new profiles...');
                    refreshMatchesWithNewProfiles(allProfiles);
                }
            });
            
            setProfileMonitor(monitor);
            
            return () => {
                if (monitor) {
                    console.log('🛑 Stopping profile monitoring...');
                    stopListeningToProfiles(monitor);
                }
            };
        }
    }, [currentUser, existingProfile]);

    // Function to refresh matches when new profiles are detected
    const refreshMatchesWithNewProfiles = async (allProfiles) => {
        if (!existingProfile || !existingProfile.id) return;
        
        try {
            console.log('🔄 Refreshing matches with new profiles...');
            const newMatches = await getMatches(existingProfile, allProfiles);
            
            // Update match results if we have new matches
            if (newMatches && newMatches.length > 0) {
                setMatchResults({ matches: newMatches, score: existingProfile.score || 0 });
                console.log(`✅ Matches refreshed: ${newMatches.length} matches found`);
                
                // Show notification about new matches
                const currentMatchCount = matchResults.matches.length;
                if (newMatches.length > currentMatchCount) {
                    const newMatchCount = newMatches.length - currentMatchCount;
                    notificationService.showMessageNotification(
                        'New Matches Available!',
                        `${newMatchCount} new potential roommate${newMatchCount > 1 ? 's' : ''} found!`
                    );
                }
            }
        } catch (error) {
            console.error('Error refreshing matches with new profiles:', error);
        }
    };

    // Function to get consistent chat ID between two users
    const getChatId = (user1Id, user2Id) => {
        // Ensure we have valid IDs
        const id1 = user1Id || currentUser.id;
        const id2 = user2Id;
        
        if (!id1 || !id2) {
            console.error('❌ Invalid user IDs for chat:', { id1, id2, currentUser: currentUser.id });
            return null;
        }
        
        // Sort IDs to ensure consistent chat ID regardless of who initiates
        const sortedIds = [id1, id2].sort();
        const chatId = sortedIds.join('_');
        
        console.log(`💬 Generated chat ID: ${id1} + ${id2} = ${chatId}`);
        return chatId;
    };

    if (activeMatch) {
        return <ChatScreen 
            currentUser={currentUser} 
            matchedUser={activeMatch} 
            onBack={() => setActiveMatch(null)} 
        />;
    }
    
    if (showMatchLoading) return <MatchLoadingScreen />;
    if (showSettings) return <SettingsScreen currentUser={currentUser} userProfile={existingProfile} onBack={handleCloseSettings} onSave={handleSaveSettings} />;
    if (showMatchResults) {
        console.log(`📊 MatchResultsGrid Debug: matches=${matchResults.matches.length}, score=${matchResults.score}`);
        console.log(`📊 Match names:`, matchResults.matches.map(m => m.name));
        return <MatchResultsGrid matches={matchResults.matches} onStartChat={handleStartChat} currentUser={currentUser} onResetToHome={handleResetToHome} onOpenSettings={handleOpenSettings} />;
    }

    return (
        <div className="chatbot-container-isolated">
            <div className="chatbot-header">
                <div className="professional-logo-container">
                    <div className="professional-logo-icon">
                        <svg viewBox="0 0 48 48" className="professional-logo-svg">
                            <defs>
                                <linearGradient id="professionalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
                                    <stop offset="100%" stopColor="#e0f2f1" stopOpacity="0.9"/>
                                </linearGradient>
                                <filter id="professionalGlow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge> 
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Modern house icon */}
                            <polyline className="professional-roof" points="12,24 24,8 36,24" stroke="url(#professionalGradient)" strokeWidth="2.5" fill="none" filter="url(#professionalGlow)"/>
                            <rect className="professional-body" x="16" y="24" width="16" height="20" rx="3" stroke="url(#professionalGradient)" strokeWidth="2.5" fill="none" filter="url(#professionalGlow)"/>
                            {/* Door with modern styling */}
                            <path className="professional-door" d="M24 40 C 24 36, 20 34, 20 28 A 3 3 0 0 1 24 28 A 3 3 0 0 1 28 28 C 28 34, 24 36, 24 40 Z" stroke="url(#professionalGradient)" strokeWidth="2" fill="none" filter="url(#professionalGlow)"/>
                            {/* Connection dots */}
                            <circle className="professional-connection-1" cx="36" cy="24" r="1.5" fill="url(#professionalGradient)" filter="url(#professionalGlow)"/>
                            <circle className="professional-connection-2" cx="38" cy="22" r="1" fill="url(#professionalGradient)" filter="url(#professionalGlow)"/>
                            <circle className="professional-connection-3" cx="38" cy="26" r="1" fill="url(#professionalGradient)" filter="url(#professionalGlow)"/>
                        </svg>
            </div>
                    <div className="professional-logo-text">
                        <span className="professional-text-roomie">Roomie</span>
                        <span className="professional-text-connect">Connect</span>
                    </div>
                </div>
                <p className="chatbot-header-subtitle animated-subtitle">Your personal roommate finder</p>
            </div>
            <div className="chatbot-messages">
                {messages.length === 0 ? (
                    <div className="message bot">
                        <p>Loading...</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            {msg.image && <img src={msg.image} alt="User upload" className="message-image" />}
                        {msg.text && <p>{msg.text}</p>}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} style={{ height: '1px' }} />
            </div>
            <div className="chatbot-input-area">
                <input
                    type="text"
                    className="chatbot-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type your answer..."
                />
                {currentQuestionId === 'upload_image' && (
                    <label className="chatbot-upload-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.3 0-2.5.5-3.5 1.4-1-1.3-2.8-2-4.6-1.7-2.3.4-4 2.3-4.3 4.6-.3 2.8 1.4 5.4 4 5.9"></path><path d="M12 13v9"></path><path d="m9 16 3-3 3 3"></path></svg>
                        <input type="file" onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                    </label>
                )}
                <button className="chatbot-send-button" onClick={handleSend}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;