import React, { useState, useEffect, useRef } from 'react';
import Sentiment from 'sentiment';
import axios from 'axios';
import './Chatbot.css';
import ChatScreen from './ChatScreen';
import { saveProfile, loadProfile, loadAllProfiles } from './services/firebaseProfile';
import notificationService from './services/notificationService';
import firebaseMessaging from './services/firebaseMessaging';
import { DISTANCE_API_CONFIG, getDistanceAPI } from './config';

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
        text: "For distance matching, could you please provide your city and state? (e.g., 'New York, NY') or type 'detect' to automatically detect your location",
        category: 'location',
        weight: 0, // No weight, just for data collection
        keywords: ['detect'], // Allow 'detect' keyword for automatic detection
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
            <div className="chatbot-loading-screen" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f5f5f5',
                color: '#20b2aa'
            }}>
                <div className="loading-spinner-cool"></div>
                <p className="loading-text" style={{ 
                    marginTop: '50px', 
                    fontSize: '24px', 
                    color: '#666', 
                    fontWeight: '500',
                    textAlign: 'center'
                }}>
                    Finding your top roommate matches...
                </p>
            </div>
        </div>
    );
}

function MatchResultsGrid({ matches, onStartChat, currentUser, onResetToHome, onOpenSettings, onTogglePin }) {
    const [unreadCounts, setUnreadCounts] = React.useState({});
    const [pinnedMatches, setPinnedMatches] = React.useState(new Set());
    const [expandedMatch, setExpandedMatch] = React.useState(null);
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
    const handleTogglePin = (matchId) => {
        const newPinnedMatches = new Set(pinnedMatches);
        if (newPinnedMatches.has(matchId)) {
            newPinnedMatches.delete(matchId);
        } else {
            newPinnedMatches.add(matchId);
        }
        setPinnedMatches(newPinnedMatches);
        savePinnedMatches(newPinnedMatches);
        
        // Call parent function to re-sort matches
        if (onTogglePin) {
            onTogglePin(matchId, newPinnedMatches.has(matchId));
        }
    };

    // Handle expand card
    const handleExpandCard = (match) => {
        setExpandedMatch(match);
    };

    // Handle close expanded card
    const handleCloseExpanded = () => {
        setExpandedMatch(null);
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
                const chatId = [currentUser.id, match.id].sort().join('_');
                
                // Get chat history to calculate real unread count
                try {
                    const messages = await firebaseMessaging.getChatHistory(chatId);
                    
                    // If this is the first time loading this chat, mark all existing messages as read
                    if (!notificationService.lastReadTimestamps.has(chatId)) {
                        notificationService.markAllExistingAsRead(chatId, messages);
                        realCounts[match.id] = 0;
                        console.log(`First time loading ${match.name} - marked all existing as read`);
                    } else {
                        // Calculate unread count for messages since last read
                        const unreadCount = notificationService.updateUnreadCountFromMessages(chatId, messages, currentUser.id);
                        realCounts[match.id] = unreadCount;
                        console.log(`Initialized unread count for ${match.name}: ${unreadCount}`);
                    }
                } catch (error) {
                    console.error(`Error getting chat history for ${match.name}:`, error);
                    realCounts[match.id] = 0;
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
                const chatId = [currentUser.id, match.id].sort().join('_');
                const count = notificationService.getUnreadCount(chatId);
                realCounts[match.id] = count;
            });
            setUnreadCounts(realCounts);
            console.log('Updated unread counts:', realCounts);
        }, 5000);

        return () => clearInterval(interval);
    }, [matches, currentUser.id]);

    return (
        <div className="chatbot-container-isolated">
        <div className="match-results-outer">
                <div className="shared-header">
                    <div className="header-content">
                    <h2 className="shared-header-title">Your Top Matches</h2>
                        <div className="header-actions">
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
                            <button 
                                className="settings-button"
                                onClick={onOpenSettings}
                                title="Edit Profile"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2579 9.77251 19.9887C9.5799 19.7195 9.31074 19.5149 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.74206 9.96512 4.01128 9.77251C4.2805 9.5799 4.48514 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            {notificationService.getTotalUnreadCount() > 0 && (
                                <div className="total-notifications-badge">
                                    {notificationService.getTotalUnreadCount() > 99 ? '99+' : notificationService.getTotalUnreadCount()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            <div className="match-results-grid">
                {(matches || []).slice(0, 10).map((match, i) => {
                    const isPinned = pinnedMatches.has(match.id);
                    return (
                        <div className={`match-card ${isPinned ? 'pinned' : ''}`} key={match.userId || match.name}>
                            <div className="match-card-header">
                                <div className="match-card-pin-button" onClick={() => handleTogglePin(match.id)}>
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
                                <div className="match-card-expand-button" onClick={() => handleExpandCard(match)}>
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
                                        {/* Four arrows from center to corners */}
                                        {/* Top-left arrow */}
                                        <line x1="12" y1="12" x2="6" y2="6"></line>
                                        <line x1="6" y1="6" x2="8" y2="6"></line>
                                        <line x1="6" y1="6" x2="6" y2="8"></line>
                                        {/* Top-right arrow */}
                                        <line x1="12" y1="12" x2="18" y2="6"></line>
                                        <line x1="18" y1="6" x2="16" y2="6"></line>
                                        <line x1="18" y1="6" x2="18" y2="8"></line>
                                        {/* Bottom-left arrow */}
                                        <line x1="12" y1="12" x2="6" y2="18"></line>
                                        <line x1="6" y1="18" x2="8" y2="18"></line>
                                        <line x1="6" y1="18" x2="6" y2="16"></line>
                                        {/* Bottom-right arrow */}
                                        <line x1="12" y1="12" x2="18" y2="18"></line>
                                        <line x1="18" y1="18" x2="16" y2="18"></line>
                                        <line x1="18" y1="18" x2="18" y2="16"></line>
                                    </svg>
                                </div>
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
                            <div className="match-card-chat-icon" onClick={() => onStartChat(match)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                {unreadCounts[match.id] > 0 && (
                                    <div className={`unread-badge ${unreadCounts[match.id] > 0 ? 'has-unread' : ''}`}>
                                        {unreadCounts[match.id] > 99 ? '99+' : unreadCounts[match.id]}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                                })}
            </div>
        </div>
        
        {/* Expanded Card Modal */}
        {expandedMatch && (
            <div className="expanded-card-overlay" onClick={handleCloseExpanded}>
                <div className="expanded-card-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="expanded-card-header">
                        <h3 className="expanded-card-title">{expandedMatch.name}</h3>
                        <button className="expanded-card-close" onClick={handleCloseExpanded}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="expanded-card-content">
                        <div className="expanded-card-avatar">
                            {renderUserAvatar(expandedMatch)}
                        </div>
                        <div className="expanded-card-details">
                            <div className="expanded-card-info-item">
                                <strong>Age:</strong> {expandedMatch.age || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Major:</strong> {expandedMatch.major || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Location:</strong> {expandedMatch.location || 'Not specified'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Allergies:</strong> {expandedMatch.allergyInfo || 'N/A'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Instagram:</strong> {expandedMatch.instagram && expandedMatch.instagram.trim() ? `@${expandedMatch.instagram}` : 'N/A'}
                            </div>
                            <div className="expanded-card-info-item">
                                <strong>Match Score:</strong> {expandedMatch.compatibility}%
                            </div>
                            {expandedMatch.distance !== null && (
                                <div className="expanded-card-info-item">
                                    <strong>Distance:</strong> {expandedMatch.distance} miles away
                                </div>
                            )}
                        </div>
                        <div className="expanded-card-actions">
                            <button className="expanded-card-chat-button" onClick={() => onStartChat(expandedMatch)}>
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
        <div className="chatbot-container-isolated">
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
    const [currentQuestionId, setCurrentQuestionId] = useState('upload_image');
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
            const matchResponse = await axios.get(`http://localhost:3001/match/${profileId}`);
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
            if (existingProfile) {
                setShowMatchLoading(true);
                try {
                    const matchResponse = await axios.get(`http://localhost:3001/match/${existingProfile.userId}`);
                    setMatchResults({
                        matches: matchResponse.data.matches,
                        score: matchResponse.data.compatibilityScore
                    });
                    setShowMatchResults(true);
                } catch (err) {
                    console.error('Error finding matches on load:', err);
                } finally {
                    setShowMatchLoading(false);
                }
            } else {
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
                    setTimeout(() => {
                calculateAndSubmit(finalAnswers);
                    }, 5000); // 5 seconds loading
                }, 1000); // 1 second after end message
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

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
            setTimeout(() => askNextQuestion(currentQuestionId, trimmedInput), 500);
            return;
        }

        if (currentQuestionId === 'upload_image') {
            if (trimmedInput.toLowerCase() === 'skip') {
                const userMessage = { text: 'skip', sender: 'user' };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                setTimeout(() => askNextQuestion(currentQuestionId, 'skip'), 500);
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
                    setInput(detectedLocation);
                    // Move to next question after successful detection
                    setTimeout(() => askNextQuestion(currentQuestionId, detectedLocation), 1000);
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
        
        setTimeout(() => askNextQuestion(currentQuestionId, normalizedAnswer), 500);
    };
    
    const calculateAndSubmit = async (finalAnswers) => {
        setShowMatchLoading(true);
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
    
        await saveProfile(profile);
        // After saving, load all profiles and calculate matches
        const allProfiles = await loadAllProfiles();
        const matches = await getMatches(profile, allProfiles);
        setMatchResults({ matches });
        setShowMatchResults(true);
        setShowMatchLoading(false);
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
                        console.log(`${apiType} API response:`, data);
                        
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
            
            console.log('All APIs failed, using improved fallback calculation');
            return calculateDistanceFallback(location1, location2);
        } catch (error) {
            console.error('Error calculating distance with API:', error);
            console.log('Using improved fallback calculation due to error');
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
        
        const matchesWithDistance = await Promise.all(
            allProfiles
            .filter(p => p.id !== currentProfile.id)
                .map(async (otherUser) => {
                    // Calculate compatibility based on normalized answers
                    let compatibilityScore = 0;
                    let totalQuestions = 0;
                    
                    // Compare answers for each question
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
                    
                    // Calculate percentage
                    const compatibility = totalQuestions > 0 ? (compatibilityScore / totalQuestions) * 100 : 0;
                    
                    // Calculate distance if both users have location data
                    let distance = null;
                    if (currentProfile.location && otherUser.location) {
                        distance = await calculateDistance(currentProfile.location, otherUser.location);
                    }
                    
                return {
                    ...otherUser,
                    compatibility: compatibility.toFixed(2),
                        distance: distance,
                        isPinned: pinnedMatches.has(otherUser.id), // Check if pinned
                    };
                })
        );
        
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
                
                // Third priority: Distance (closer first)
                if (a.distance !== null && b.distance !== null) {
                    return a.distance - b.distance;
                }
                if (a.distance !== null && b.distance === null) return -1;
                if (a.distance === null && b.distance !== null) return 1;
                
                // Fourth priority: Compatibility score
                return parseFloat(b.compatibility) - parseFloat(a.compatibility);
            })
            .slice(0, 10); // Show more matches since we're sorting by multiple criteria
    };

    // On mount, if existingProfile is present, fetch matches for that profile
    useEffect(() => {
        if (existingProfile && existingProfile.id) {
            (async () => {
                const allProfiles = await loadAllProfiles();
                const matches = await getMatches(existingProfile, allProfiles);
                setMatchResults({ matches });
                setShowMatchResults(true);
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
            const response = await axios.post('http://localhost:3001/submit', profile);
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
                setTimeout(() => askNextQuestion('upload_image', 'image_uploaded'), 500);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleStartChat = async (match) => {
        const chatId = [currentUser.id, match.id].sort().join('_');
        
        // Mark this chat as read when user clicks on it
        notificationService.markChatAsRead(chatId);
        
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

    const handleTogglePin = (matchId, isPinned) => {
        // Update the matches with the new pinned status
        const updatedMatches = matchResults.matches.map(match => {
            if (match.id === matchId) {
                return { ...match, isPinned: isPinned };
            }
            return match;
        });
        
        // Re-sort the matches based on the new pinned status
        const sortedMatches = updatedMatches.sort((a, b) => {
            // First priority: Pinned matches
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            
            // Second priority: Unread notifications
            const aUnreadCount = notificationService.getUnreadCount([currentUser.id, a.id].sort().join('_'));
            const bUnreadCount = notificationService.getUnreadCount([currentUser.id, b.id].sort().join('_'));
            if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
            if (aUnreadCount === 0 && bUnreadCount > 0) return 1;
            
            // Third priority: Distance (closer first)
            if (a.distance !== null && b.distance !== null) {
                return a.distance - b.distance;
            }
            if (a.distance !== null && b.distance === null) return -1;
            if (a.distance === null && b.distance !== null) return 1;
            
            // Fourth priority: Compatibility score
            return parseFloat(b.compatibility) - parseFloat(a.compatibility);
        });
        
        setMatchResults({ ...matchResults, matches: sortedMatches });
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

    if (activeMatch) {
        return <ChatScreen 
            currentUser={currentUser} 
            matchedUser={activeMatch} 
            onBack={() => setActiveMatch(null)} 
        />;
    }
    
    if (showMatchLoading) return <MatchLoadingScreen />;
    if (showSettings) return <SettingsScreen currentUser={currentUser} userProfile={existingProfile} onBack={handleCloseSettings} onSave={handleSaveSettings} />;
    if (showMatchResults) return <MatchResultsGrid matches={matchResults.matches} onStartChat={handleStartChat} currentUser={currentUser} onResetToHome={handleResetToHome} onOpenSettings={handleOpenSettings} onTogglePin={handleTogglePin} />;

    return (
        <div className="chatbot-container-isolated">
            <div className="chatbot-header">
                <h2 className="chatbot-header-title">RoomieConnect AI</h2>
                <p className="chatbot-header-subtitle">Your personal roommate finder</p>
            </div>
                <div className="chatbot-messages" ref={messagesEndRef}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`chatbot-message ${msg.sender}`}>
                        {msg.image && <img src={msg.image} alt="User upload" className="chatbot-message-image" />}
                        {msg.text && <p>{msg.text}</p>}
                        </div>
                    ))}
            </div>
            <div className="chatbot-input-area">
                <input
                    type="text"
                    className="chatbot-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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