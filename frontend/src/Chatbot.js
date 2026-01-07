import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';
import { API_URL } from './config';
import { saveProfile } from './services/firebaseProfile';

// Claude Sonnet 3.5 API configuration
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// AI Roommate Expert System Prompt
const ROOMMATE_EXPERT_PROMPT = `You are an expert roommate compatibility analyst with deep expertise in psychology, sociology, and conflict resolution. Your role is to:

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
const callClaudeAPI = async (messages, systemPrompt = ROOMMATE_EXPERT_PROMPT) => {
    if (!CLAUDE_API_KEY) {
        console.warn('Claude API key not configured. Please set REACT_APP_CLAUDE_API_KEY environment variable.');
        return {
            success: false,
            error: 'API key not configured. Please set REACT_APP_CLAUDE_API_KEY environment variable.'
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
            content: data.content[0].text
        };
    } catch (error) {
        console.error('Error calling Claude API:', error);
        return { success: false, error: error.message };
    }
};

const Chatbot = ({ currentUser, existingProfile, onResetToHome, onUpdateUser, onProfileComplete, onNavigateToMatches }) => {
    const [messages, setMessages] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [conversationStep, setConversationStep] = useState('initial');
    const [collectedAnswers, setCollectedAnswers] = useState([]);
    const [userInfo, setUserInfo] = useState({ name: '', major: '', location: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (conversationStep === 'initial') {
            startConversation();
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startConversation = () => {
        const initialMessage = {
            id: Date.now(),
            text: "Hi! I'm your AI roommate specialist! 🏠\n\nTell me about yourself - your name, age, major, and what you're looking for in a roommate. I'll ask a few follow-up questions to find your perfect match!",
            sender: 'assistant',
            timestamp: new Date()
        };
        
        setMessages([initialMessage]);
        setConversationStep('waiting_for_response');
    };

    // Extract information from user input
    const extractUserInfo = (text) => {
        const lowerText = text.toLowerCase();
        const info = { ...userInfo };
        
        // Extract name (look for "I'm", "my name is", "I am", etc.)
        const nameMatch = text.match(/(?:my name is|i'm|i am|call me|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (nameMatch && !info.name) {
            info.name = nameMatch[1];
        }
        
        // Extract major
        const majorMatch = text.match(/(?:major|studying|study|degree in)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (majorMatch && !info.major) {
            info.major = majorMatch[1];
        }
        
        // Extract location
        const locationMatch = text.match(/(?:live in|from|located in|location is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (locationMatch && !info.location) {
            info.location = locationMatch[1];
        }
        
        return info;
    };

    const handleUserResponse = async (userInput) => {
        if (!userInput.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: userInput,
            sender: 'user',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Extract and store user info
        const extractedInfo = extractUserInfo(userInput);
        setUserInfo(extractedInfo);
        
        // Store the answer
        setCollectedAnswers(prev => [...prev, {
            questionId: 'initial_intro',
            answer: userInput
        }]);
        
        setIsAnalyzing(true);
        setConversationStep('analyzing');

        // Simulate AI analysis
        setTimeout(() => {
            const acknowledgmentMessage = {
                id: Date.now() + 1,
                text: "Thank you for sharing that information! I can see you're a thoughtful person who values good communication.",
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, acknowledgmentMessage]);

            const followUpMessage = {
                id: Date.now() + 2,
                text: "I have a couple of follow-up questions:\n\n1. How do you prefer to handle conflicts with roommates?\n2. What's your typical daily schedule like during the week?",
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, followUpMessage]);
            setConversationStep('waiting_for_followup');
            setIsAnalyzing(false);
        }, 2000);
    };

    const handleFollowUpResponse = async (userInput) => {
        if (!userInput.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: userInput,
            sender: 'user',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Store the follow-up answer
        setCollectedAnswers(prev => [...prev, {
            questionId: 'followup_questions',
            answer: userInput
        }]);
        
        setIsAnalyzing(true);

        // Simulate final analysis
        setTimeout(() => {
            const completionMessage = {
                id: Date.now() + 3,
                text: "Perfect! I've analyzed your responses and created your roommate profile. Your compatibility score is 85%.\n\nI've created a detailed background for you that will be shown to potential roommates. Ready to see your matches?",
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, completionMessage]);
            setConversationStep('complete');
            setIsAnalyzing(false);
        }, 2000);
    };

    const handleSend = () => {
        if (conversationStep === 'waiting_for_response') {
            handleUserResponse(currentQuestion);
        } else if (conversationStep === 'waiting_for_followup') {
            handleFollowUpResponse(currentQuestion);
        }
        setCurrentQuestion('');
    };

    const handleCompleteConversation = async () => {
        if (!currentUser) {
            console.error('No current user available');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Prepare profile data - use extracted info or fallback to currentUser
            const userName = userInfo.name || currentUser.name || currentUser.email?.split('@')[0] || 'User';
            const profileData = {
                id: currentUser.id,
                userId: currentUser.id,
                name: userName,
                answers: collectedAnswers.length > 0 ? collectedAnswers : [
                    { questionId: 'intro', answer: messages.find(m => m.sender === 'user')?.text || '' }
                ],
                score: 85, // Default score, can be calculated later
                major: userInfo.major || '',
                location: userInfo.location || '',
                image: '',
                timestamp: new Date().toISOString()
            };

            // Submit to backend
            const answersToSubmit = collectedAnswers.length > 0 ? collectedAnswers : [
                { questionId: 'intro', answer: messages.find(m => m.sender === 'user')?.text || '' }
            ];
            
            const response = await fetch(`${API_URL}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: currentUser.id,
                    name: userName,
                    answers: answersToSubmit,
                    score: 85,
                    major: userInfo.major || '',
                    location: userInfo.location || '',
                    image: ''
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit profile to backend');
            }

            const backendProfile = await response.json();
            console.log('Profile submitted to backend:', backendProfile);

            // Save to Firebase
            const firebaseProfile = {
                ...profileData,
                profileId: backendProfile.profileId
            };
            await saveProfile(firebaseProfile);
            console.log('Profile saved to Firebase:', firebaseProfile);

            // Update parent component
            if (onProfileComplete) {
                onProfileComplete(firebaseProfile);
            }

            // Navigate to matches
            if (onNavigateToMatches) {
                onNavigateToMatches();
            } else if (onResetToHome) {
                // Fallback to reset if no navigate function provided
                onResetToHome();
            }
        } catch (error) {
            console.error('Error submitting profile:', error);
            alert('Failed to save your profile. Please try again.');
            setIsSubmitting(false);
        }
    };

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
                                    handleSend();
                                }
                            }}
                            rows={4}
                        />
                        <button 
                            onClick={handleSend}
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
                                    handleSend();
                                }
                            }}
                            rows={4}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!currentQuestion?.trim() || isAnalyzing}
                        >
                            Send
                        </button>
                    </div>
                )}

                {conversationStep === 'complete' && (
                    <div className="completion-actions">
                        <button 
                            onClick={handleCompleteConversation} 
                            className="primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving Profile...' : 'View Matches'}
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

// Simple MatchResultsGrid component
const MatchResultsGrid = ({ matches, onStartChat, currentUser, onResetToHome, onOpenSettings }) => {
    return (
        <div className="match-results-outer">
            <div className="match-results-container">
                <div className="match-results-header">
                    <h1 className="match-results-title">Your Perfect Matches</h1>
                    <p className="match-results-subtitle">Based on your preferences and lifestyle</p>
                </div>
                <div className="no-matches-content">
                    <div className="no-matches-icon">🏠</div>
                    <p>Complete your profile to find compatible matches.</p>
                    <button onClick={onResetToHome} className="primary-button">
                        Complete Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export { MatchResultsGrid };
export default Chatbot;
