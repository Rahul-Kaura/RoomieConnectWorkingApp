import React, { useState, useEffect, useRef } from 'react';
import Sentiment from 'sentiment';
import axios from 'axios';
import './Chatbot.css';
import ChatScreen from './ChatScreen';
import { saveProfile, loadProfile, loadAllProfiles, monitorNewProfiles, stopListeningToProfiles } from './services/firebaseProfile';
import notificationService from './services/notificationService';
import firebaseMessaging from './services/firebaseMessaging';
import { DISTANCE_API_CONFIG, getDistanceAPI, API_URL } from './config';

// Claude Sonnet 3.5 API configuration
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// AI Roommate Analyst System Prompt
const ROOMMATE_ANALYST_PROMPT = `You are an expert roommate compatibility analyst with deep expertise in psychology, sociology, and conflict resolution. Your role is to:

1. ANALYZE user responses to understand their personality, lifestyle, and preferences
2. ASK 1-2 targeted follow-up questions based on what's unclear or needs more detail
3. EVALUATE compatibility factors and provide detailed scoring
4. CREATE comprehensive user backgrounds for roommate matching
5. PROVIDE specific recommendations based on AI analysis

CRITICAL GUIDELINES:
- Ask about ALLERGIES, DIETARY RESTRICTIONS, and MEDICAL CONDITIONS if not mentioned
- Focus on areas that need clarification (e.g., if they say "I'm clean" but don't elaborate)
- Ask about COMMUNICATION preferences, NOISE tolerance, STUDY habits
- Ask about SOCIAL preferences, GUEST policies, FINANCIAL expectations
- Ask about SCHEDULE conflicts, MAJOR/ACTIVITY impacts on living
- Vary questions based on their specific background and responses
- Be warm, professional, and thorough in your approach

IMPORTANT: Always ask follow-up questions that reveal deeper insights about living habits, communication styles, and potential compatibility issues.`;

// AI Analysis Functions
const callClaudeAPI = async (messages, systemPrompt = ROOMMATE_ANALYST_PROMPT) => {
    if (CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY') {
        console.warn('Claude API key not configured. Please set REACT_APP_CLAUDE_API_KEY environment variable.');
        return {
            success: false,
            error: 'API key not configured. Please contact support to set up Claude integration.'
        };
    }

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
            success: true,
            content: data.content[0].text,
            usage: data.usage
        };
    } catch (error) {
        console.error('Error calling Claude API:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Analyze user's initial response and generate follow-up questions
const analyzeUserResponse = async (userResponse, conversationHistory) => {
    const messages = [
        ...conversationHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        })),
        {
            role: 'user',
            content: `User Response: "${userResponse}"

As a roommate compatibility analyst, analyze this response and provide:

1. PERSONAL ACKNOWLEDGMENT: Acknowledge specific details they shared
2. FOLLOW-UP QUESTIONS: Ask 1-2 targeted questions about areas that need clarification
3. PRELIMINARY ANALYSIS: Brief analysis of what you've learned so far

CRITICAL: Ask about allergies, dietary restrictions, medical conditions if not mentioned.
Focus on areas that need more detail based on their specific response.

Format your response exactly as:
ACKNOWLEDGMENT: [personal acknowledgment]
FOLLOW-UP: [1-2 specific questions]
ANALYSIS: [brief analysis]`
        }
    ];

    const result = await callClaudeAPI(messages);
    if (!result.success) {
        return {
            acknowledgment: `Thank you for sharing that information with me. I can see you're ${userResponse.includes('major') ? 'a student' : 'someone'} who values ${userResponse.includes('clean') ? 'cleanliness' : 'organization'}.`,
            followUpQuestions: [
                "Can you tell me more about your study schedule and how you prefer to manage noise during study times?",
                "Do you have any allergies, dietary restrictions, or medical conditions I should know about for roommate compatibility?"
            ],
            analysis: "I'm gathering information about your lifestyle and preferences to find the best roommate match."
        };
    }

    // Parse Claude's response
    const content = result.content;
    const acknowledgment = content.match(/ACKNOWLEDGMENT:\s*(.+?)(?=\n|$)/)?.[1] || "Thank you for sharing that information with me.";
    
    const followUpQuestions = [];
    const followUpMatch = content.match(/FOLLOW-UP:\s*(.+?)(?=\n|$)/);
    if (followUpMatch) {
        const questionsText = followUpMatch[1];
        // Split by common question separators
        const questions = questionsText.split(/[.!?]\s+/).filter(q => q.trim().length > 10);
        followUpQuestions.push(...questions.slice(0, 2)); // Take first 2 questions
    }
    
    // Fallback questions if parsing fails
    if (followUpQuestions.length === 0) {
        followUpQuestions.push(
            "Can you tell me more about your study schedule and noise preferences?",
            "Do you have any allergies, dietary restrictions, or medical conditions I should know about?"
        );
    }

    const analysis = content.match(/ANALYSIS:\s*(.+?)(?=\n|$)/)?.[1] || "I'm analyzing your responses to understand your compatibility factors.";

    return {
        acknowledgment,
        followUpQuestions,
        analysis
    };
};

// Generate final comprehensive analysis and user background
const generateFinalAnalysis = async (conversationHistory, userProfile) => {
    const messages = [
        ...conversationHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        })),
        {
            role: 'user',
            content: `Based on the entire conversation, provide a comprehensive roommate compatibility analysis:

1. USER BACKGROUND: Create a detailed background summary for their profile
2. COMPATIBILITY SCORE: Overall score (0-100) with detailed breakdown
3. KEY FACTORS: Specific compatibility factors with scores (0-10 each)
4. ROOMMATE RECOMMENDATIONS: Specific recommendations for matching

CRITICAL REQUIREMENTS:
- Make the background PERSONAL and specific to what they shared
- Include their major, study habits, social preferences, cleanliness standards
- Mention any allergies, dietary restrictions, or medical conditions
- Provide specific, actionable roommate recommendations
- Use bullet points (•) for better readability

Format exactly as:
BACKGROUND: [detailed background summary in bullet points]
COMPATIBILITY SCORE: [total]/100
KEY FACTORS:
• [factor 1]: [score]/10
• [factor 2]: [score]/10
• [factor 3]: [score]/10
RECOMMENDATIONS: [specific roommate recommendations in bullet points]`
        }
    ];

    const result = await callClaudeAPI(messages);
    if (!result.success) {
        return {
            background: "Based on our conversation, I've gathered comprehensive information about your preferences and lifestyle.",
            compatibilityScore: 75,
            keyFactors: [
                "Communication Style: 8/10",
                "Living Habits: 7/10",
                "Social Preferences: 8/10",
                "Study Environment: 9/10",
                "Conflict Resolution: 7/10"
            ],
            recommendations: "You would be most compatible with roommates who value open communication, respect quiet study time, and have similar cleanliness standards."
        };
    }

    // Parse Claude's response
    const content = result.content;
    const background = content.match(/BACKGROUND:\s*(.+?)(?=\n|$)/)?.[1] || "Based on our conversation, I've gathered comprehensive information about your preferences and lifestyle.";
    
    const keyFactors = [];
    const factorsMatch = content.match(/KEY FACTORS:\s*\n((?:•\s*.+\n?)+)/);
    if (factorsMatch) {
        const factorsText = factorsMatch[1];
        const factorMatches = factorsText.matchAll(/•\s*(.+?):\s*(\d+)\/10/g);
        for (const match of factorMatches) {
            keyFactors.push(`${match[1]}: ${match[2]}/10`);
        }
    }

    // Fallback factors if parsing fails
    if (keyFactors.length === 0) {
        keyFactors.push(
            "Communication Style: 8/10",
            "Living Habits: 7/10",
            "Social Preferences: 8/10",
            "Study Environment: 9/10",
            "Conflict Resolution: 7/10"
        );
    }

    const scoreMatch = content.match(/COMPATIBILITY SCORE:\s*(\d+)/);
    const compatibilityScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    const recommendations = content.match(/RECOMMENDATIONS:\s*(.+?)(?=\n|$)/)?.[1] || "You would be most compatible with roommates who value open communication, respect quiet study time, and have similar cleanliness standards.";

    return {
        background,
        compatibilityScore,
        keyFactors,
        recommendations
    };
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
                            {/* New VR Headset Design */}
                            {/* Triangular roof */}
                            <path d="M8 15 L20 8 L32 15" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-roof"/>
                            {/* Rectangular body */}
                            <rect x="10" y="15" width="20" height="18" rx="3" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-body"/>
                            {/* Central inverted U opening */}
                            <path d="M16 25 Q20 30 24 25" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-opening"/>
                            {/* Two circular elements on sides */}
                            <circle cx="14" cy="20" r="2" fill="url(#logoGradient)" className="logo-circle-1"/>
                            <circle cx="26" cy="20" r="2" fill="url(#logoGradient)" className="logo-circle-2"/>
                        </svg>
                    </div>
                    <h2 className="chatbot-header-title">
                        <span className="logo-text-roomie">Roomie</span>
                        <span className="logo-text-connect">Connect</span>
                        <span className="logo-text-ai">AI</span>
                    </h2>
                </div>
                <p className="chatbot-header-subtitle animated-subtitle">AI-Powered Roommate Compatibility Specialist</p>
            </div>
            <div className="chatbot-loading-screen" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '1',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                color: '#6366f1',
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
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                                <div style={{ fontSize: '14px', color: '#e5e7eb', textAlign: 'center' }}>
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
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                                <div style={{ fontSize: '14px', color: '#e5e7eb', textAlign: 'center' }}>
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
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                                <div style={{ fontSize: '14px', color: '#e5e7eb', textAlign: 'center' }}>
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

                <p className="loading-text" style={{ color: '#e5e7eb' }}>
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
                    await forceSyncAllChats();
                    
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
                                `${newProfiles.length} new potential roommate${newMatchCount > 1 ? 's' : ''} available!`
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
                                    {/* New VR Headset Design */}
                                    {/* Triangular roof */}
                                            <path className="header-logo-roof" d="M25 55 L55 25 L85 55" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    {/* Rectangular body */}
                                            <rect className="header-logo-body" x="30" y="55" width="50" height="35" rx="6" stroke="#ffffff" strokeWidth="3" fill="none" />
                                    {/* Central inverted U opening */}
                                            <path className="header-logo-opening" d="M40 70 Q55 75 70 70" stroke="#ffffff" strokeWidth="2" fill="none" />
                                    {/* Two circular elements on sides */}
                                            <circle className="header-logo-circle-1" cx="35" cy="65" r="4" fill="#ffffff" />
                                            <circle className="header-logo-circle-2" cx="75" cy="65" r="4" fill="#ffffff" />
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
                            {/* Background Summary Section */}
                            {expandedCard.background && (
                                <div className="expanded-card-info-item expanded-card-background">
                                    <strong>Background Summary:</strong>
                                    <div className="background-text">
                                        {expandedCard.background}
                                    </div>
                                </div>
                            )}
                            {/* Compatibility Factors */}
                            {expandedCard.compatibilityFactors && expandedCard.compatibilityFactors.length > 0 && (
                                <div className="expanded-card-info-item expanded-card-factors">
                                    <strong>Compatibility Factors:</strong>
                                    <div className="factors-list">
                                        {expandedCard.compatibilityFactors.map((factor, index) => (
                                            <div key={index} className="factor-item">
                                                {factor}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="expanded-card-actions">
                            <button className="expanded-card-chat-button" onClick={() => onStartChat(expandedCard)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1 2-2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
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

// Add missing functions for the AI-powered chatbot
const getMatches = (userProfile, allProfiles) => {
    if (!userProfile || !allProfiles || allProfiles.length === 0) {
        return [];
    }

    // Filter out the current user
    const otherProfiles = allProfiles.filter(profile => 
        profile.id !== userProfile.id && profile.userId !== userProfile.id
    );

    // Calculate compatibility scores
    const scoredProfiles = otherProfiles.map(profile => {
        const score = calculateCompatibilityScore(userProfile, profile);
        return {
            ...profile,
            compatibilityScore: score
        };
    });

    // Sort by compatibility score (highest first)
    return scoredProfiles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
};

const calculateCompatibilityScore = (user1, user2) => {
    let score = 0;
    let totalFactors = 0;

    // Basic compatibility factors
    if (user1.major && user2.major && user1.major === user2.major) {
        score += 20; // Same major
        totalFactors++;
    }

    if (user1.cleanliness && user2.cleanliness && user1.cleanliness === user2.cleanliness) {
        score += 15; // Similar cleanliness standards
        totalFactors++;
    }

    if (user1.studyHabits && user2.studyHabits && user1.studyHabits === user2.studyHabits) {
        score += 15; // Similar study habits
        totalFactors++;
    }

    if (user1.socialPreferences && user2.socialPreferences && user1.socialPreferences === user2.socialPreferences) {
        score += 15; // Similar social preferences
        totalFactors++;
    }

    // Default score if no factors match
    if (totalFactors === 0) {
        score = 50; // Neutral compatibility
    } else {
        score = Math.min(100, score); // Cap at 100
    }

    return score;
};

const Chatbot = ({ currentUser, existingProfile, onResetToHome, onUpdateUser }) => {
    const [messages, setMessages] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [conversationStep, setConversationStep] = useState('initial');
    const [userProfile, setUserProfile] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [allProfiles, setAllProfiles] = useState([]);
    const [matches, setMatches] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (existingProfile && existingProfile.id) {
            (async () => {
                try {
                    console.log('🔄 Loading existing profile and profiles for matching...');
                    
                    // Load all profiles from Firebase
                    let allProfiles = await loadAllProfiles();
                    console.log(`📊 Firebase profiles found: ${allProfiles.length}`);
                    
                    // Ensure current profile is included in allProfiles
                    const currentProfileExists = allProfiles.some(p => 
                        (p.id === existingProfile.id) || (p.userId === existingProfile.id)
                    );
                    
                    if (!currentProfileExists) {
                        console.log('➕ Adding current profile to allProfiles');
                        allProfiles.push(existingProfile);
                    }
                    
                    console.log(`📊 Total profiles available: ${allProfiles.length}`);
                    setAllProfiles(allProfiles);
                    
                    // Get matches using the consolidated profile list
                    const matches = getMatches(existingProfile, allProfiles);
                    setMatches(matches);
                    console.log(`🎯 Found ${matches.length} potential matches`);
                    
                } catch (error) {
                    console.error('❌ Error loading profiles:', error);
                }
            })();
        }
    }, [existingProfile]);

    // Start the AI-powered conversation
    const startConversation = () => {
        const initialMessage = {
            id: Date.now(),
            text: "Hi! I'm your AI roommate compatibility specialist! 🏠\n\nTo find your perfect match, I need to understand your background and preferences. Please share:\n\n• Your name, age, and major\n• Where you're from\n• Your personality and lifestyle\n• Study habits and schedule\n• Social preferences (introvert/extrovert)\n• Cleanliness standards\n• Any allergies, dietary restrictions, or medical conditions\n• What you're looking for in a roommate\n\nTake your time and be detailed - this helps me find the best match!",
            sender: 'assistant',
            timestamp: new Date()
        };
        
        setMessages([initialMessage]);
        setConversationStep('waiting_for_response');
    };

    // Handle user response with AI analysis
    const handleUserResponse = async (userInput) => {
        if (!userInput.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            text: userInput,
            sender: 'user',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setIsAnalyzing(true);
        setConversationStep('analyzing');

        try {
            // Analyze user response with AI
            const analysis = await analyzeUserResponse(userInput, messages);
            
            // Add AI acknowledgment
            const acknowledgmentMessage = {
                id: Date.now() + 1,
                text: analysis.acknowledgment,
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, acknowledgmentMessage]);

            // Add follow-up questions
            if (analysis.followUpQuestions.length > 0) {
                const followUpMessage = {
                    id: Date.now() + 2,
                    text: analysis.followUpQuestions.join('\n\n'),
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, followUpMessage]);
                setConversationStep('waiting_for_followup');
            } else {
                // No more questions needed, generate final analysis
                await generateFinalResults();
            }

        } catch (error) {
            console.error('Error analyzing user response:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "I apologize, but I'm having trouble analyzing your response. Please try again or contact support.",
                sender: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Generate final results and user profile
    const generateFinalResults = async () => {
        setIsAnalyzing(true);
        
        try {
            // Generate final AI analysis
            const finalAnalysis = await generateFinalAnalysis(messages, userProfile);
            
            // Create user profile with AI-generated background
            const profile = {
                id: currentUser?.id || `user-${Date.now()}`,
                name: currentUser?.name || 'User',
                background: finalAnalysis.background,
                compatibilityScore: finalAnalysis.compatibilityScore,
                keyFactors: finalAnalysis.keyFactors,
                recommendations: finalAnalysis.recommendations,
                conversationHistory: messages,
                createdAt: new Date().toISOString()
            };
            
            setUserProfile(profile);
            
            // Save profile to Firebase
            await saveProfile(profile);
            
            // Add completion message
            const completionMessage = {
                id: Date.now(),
                text: `Perfect! I've analyzed your responses and created your roommate compatibility profile.\n\n🎯 Your Compatibility Score: ${finalAnalysis.compatibilityScore}/100\n\n📋 Key Factors:\n${finalAnalysis.keyFactors.map(factor => `• ${factor}`).join('\n')}\n\n💡 Recommendations:\n${finalAnalysis.recommendations}\n\nYour profile is now ready for roommate matching!`,
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, completionMessage]);
            setConversationStep('complete');
            setIsComplete(true);
            
        } catch (error) {
            console.error('Error generating final results:', error);
            const errorMessage = {
                id: Date.now(),
                text: "I apologize, but I'm having trouble generating your final analysis. Please try again or contact support.",
                sender: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle follow-up responses
    const handleFollowUpResponse = async (userInput) => {
        if (!userInput.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            text: userInput,
            sender: 'user',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Generate final results after follow-up
        await generateFinalResults();
    };

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Start conversation when component mounts
    useEffect(() => {
        if (conversationStep === 'initial') {
            startConversation();
        }
    }, []);

    return (
        <div className="chatbot-container">
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
                            {/* VR Headset Design */}
                            <path d="M8 15 L20 8 L32 15" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-roof"/>
                            <rect x="10" y="15" width="20" height="18" rx="3" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-body"/>
                            <path d="M16 25 Q20 30 24 25" stroke="url(#logoGradient)" strokeWidth="2" fill="none" className="logo-opening"/>
                            <circle cx="14" cy="20" r="2" fill="url(#logoGradient)" className="logo-circle-1"/>
                            <circle cx="26" cy="20" r="2" fill="url(#logoGradient)" className="logo-circle-2"/>
                        </svg>
                    </div>
                    <h2 className="chatbot-header-title">
                        <span className="logo-text-roomie">Roomie</span>
                        <span className="logo-text-connect">Connect</span>
                        <span className="logo-text-ai">AI</span>
                    </h2>
                </div>
                <p className="chatbot-header-subtitle animated-subtitle">AI-Powered Roommate Compatibility Specialist</p>
            </div>

            <div className="chatbot-messages">
                {messages.map((message) => (
                    <div key={message.id} className={`message ${message.sender}`}>
                        <div className="message-content">
                            {message.text}
                        </div>
                        <div className="message-timestamp">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                
                {isAnalyzing && (
                    <div className="message assistant">
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span>🤔 Analyzing your response...</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            <div className="chatbot-input">
                {conversationStep === 'waiting_for_response' && (
                    <div className="input-container">
                        <textarea
                            placeholder="Share your background and preferences..."
                            value={currentQuestion || ''}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUserResponse(currentQuestion);
                                    setCurrentQuestion('');
                                }
                            }}
                            rows={4}
                        />
                        <button 
                            onClick={() => {
                                handleUserResponse(currentQuestion);
                                setCurrentQuestion('');
                            }}
                            disabled={!currentQuestion?.trim() || isAnalyzing}
                        >
                            Send
                        </button>
                    </div>
                )}

                {conversationStep === 'waiting_for_followup' && (
                    <div className="input-container">
                        <textarea
                            placeholder="Answer the follow-up questions..."
                            value={currentQuestion || ''}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFollowUpResponse(currentQuestion);
                                    setCurrentQuestion('');
                                }
                            }}
                            rows={4}
                        />
                        <button 
                            onClick={() => {
                                handleFollowUpResponse(currentQuestion);
                                setCurrentQuestion('');
                            }}
                            disabled={!currentQuestion?.trim() || isAnalyzing}
                        >
                            Send
                        </button>
                    </div>
                )}

                {conversationStep === 'complete' && (
                    <div className="completion-actions">
                        <button onClick={() => onResetToHome()} className="primary-button">
                            View Matches
                        </button>
                        <button onClick={() => window.location.reload()} className="secondary-button">
                            Start Over
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export { MatchResultsGrid };
export default Chatbot;