import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

// Gemini API configuration
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Debug API key
console.log('=== Environment Debug ===');
console.log('Gemini API Key loaded:', !!GEMINI_API_KEY);
console.log('API Key value:', GEMINI_API_KEY ? 'Present' : 'Missing');
console.log('API Key length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
console.log('API Key first 10 chars:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) : 'None');
console.log('API Key last 10 chars:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 10) : 'None');
console.log('REACT_APP_GEMINI_API_KEY:', process.env.REACT_APP_GEMINI_API_KEY);
console.log('=== End Environment Debug ===');

// AI Roommate Expert System Prompt
const ROOMMATE_EXPERT_PROMPT = `You are a friendly roommate compatibility expert. Your job is to:

1. Read the user's response carefully
2. Ask 1-2 short, specific follow-up questions
3. Keep responses concise (2-3 sentences max)
4. Be conversational and helpful

IMPORTANT: 
- Keep it brief and to the point
- Ask questions based on what they specifically mentioned
- Don't write long explanations
- Be warm but concise

Now ask 1-2 short follow-up questions:`;

// AI Analysis Functions
const callGeminiAPI = async (messages, systemPrompt = ROOMMATE_EXPERT_PROMPT) => {
    console.log('=== Gemini API Call Debug ===');
    console.log('API Key present:', !!GEMINI_API_KEY);
    console.log('API Key length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
    console.log('API URL:', GEMINI_API_URL);
    console.log('Messages:', messages);
    
    if (!GEMINI_API_KEY) {
        const error = 'API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.';
        console.error(error);
        return { success: false, error };
    }

    try {
        // Convert messages to Gemini format
        const userMessage = messages[messages.length - 1]?.content || '';
        const fullPrompt = `${systemPrompt}\n\nUser Response: ${userMessage}`;
        
        console.log('🔍 Full prompt being sent to Gemini:', fullPrompt);
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 200,
            }
        };
        
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Success Response:', data);
        
        return {
            success: true,
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
        };
    } catch (error) {
        console.error('❌ Error calling Gemini API:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return { success: false, error: error.message };
    }
};

const Chatbot = ({ currentUser, existingProfile, onResetToHome, onUpdateUser }) => {
    const [messages, setMessages] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [conversationStep, setConversationStep] = useState('initial');
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

    const handleUserResponse = async (userInput) => {
        if (!userInput.trim()) return;

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
            console.log('🤖 Calling Gemini API with user input:', userInput);
            console.log('🔑 API Key available:', !!GEMINI_API_KEY);
            console.log('🔑 API Key value:', GEMINI_API_KEY);
            
            // Call Gemini AI to analyze the user's response
            const messages = [
                {
                    role: 'user',
                    content: `Please analyze this user's response and ask 1-2 relevant follow-up questions as a roommate expert:\n\n"${userInput}"`
                }
            ];

            console.log('📤 Sending messages to Gemini:', messages);
            const aiResponse = await callGeminiAPI(messages);
            console.log('📥 AI Response received:', aiResponse);
            
            if (aiResponse.success) {
                console.log('✅ AI Response successful:', aiResponse.content);
                
                const acknowledgmentMessage = {
                    id: Date.now() + 1,
                    text: "Thank you for sharing that information! I can see you're a thoughtful person who values good communication.",
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, acknowledgmentMessage]);

                const followUpMessage = {
                    id: Date.now() + 2,
                    text: aiResponse.content,
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, followUpMessage]);
                setConversationStep('waiting_for_followup');
            } else {
                console.error('❌ AI API failed:', aiResponse.error);
                // Use fallback questions instead of showing error
                const fallbackQuestions = [
                    "That's interesting! Can you tell me more about your study habits and how you prefer to spend your evenings?",
                    "Thanks for sharing! What about your cleanliness preferences - are you someone who likes things very organized or more relaxed?",
                    "Great to know! How would you describe your social style - do you prefer quiet nights in or are you more outgoing?",
                    "Interesting! What are your thoughts on having guests over and noise levels in your living space?"
                ];
                
                const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
                
                const fallbackMessage = {
                    id: Date.now() + 1,
                    text: "Thanks for sharing that! " + randomQuestion,
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, fallbackMessage]);
                setConversationStep('waiting_for_followup');
            }
        } catch (error) {
            console.error('Error in AI analysis:', error);
            // Show error message instead of fallback
            const errorMessage = {
                id: Date.now() + 1,
                text: `Error: ${error.message}. Please check the console for details.`,
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, errorMessage]);
            setConversationStep('waiting_for_response');
        }
        
        setIsAnalyzing(false);
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
        setIsAnalyzing(true);

        try {
            // Get all previous messages for context
            const allMessages = [...messages, userMessage];
            const conversationContext = allMessages
                .filter(msg => msg.sender === 'user')
                .map(msg => msg.text)
                .join('\n\n');

            // Call Gemini AI for final analysis
            const messages = [
                {
                    role: 'user',
                    content: `Based on this conversation, create a brief profile summary:\n\n"${conversationContext}"\n\nKeep it short and indicate the profile is complete.`
                }
            ];

            const aiResponse = await callGeminiAPI(messages);
            
            if (aiResponse.success) {
                console.log('✅ Final AI analysis successful:', aiResponse.content);
                const completionMessage = {
                    id: Date.now() + 3,
                    text: aiResponse.content + "\n\nReady to see your matches?",
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, completionMessage]);
                setConversationStep('complete');
            } else {
                console.log('⚠️ AI analysis failed, using fallback completion message');
                // Fallback message
                const completionMessage = {
                    id: Date.now() + 3,
                    text: "Perfect! I've analyzed your responses and created your roommate profile. Your compatibility score is 85%.\n\nI've created a detailed background for you that will be shown to potential roommates. Ready to see your matches?",
                    sender: 'assistant',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, completionMessage]);
                setConversationStep('complete');
            }
        } catch (error) {
            console.error('Error in final AI analysis:', error);
            // Fallback message
            const completionMessage = {
                id: Date.now() + 3,
                text: "Perfect! I've analyzed your responses and created your roommate profile. Your compatibility score is 85%.\n\nI've created a detailed background for you that will be shown to potential roommates. Ready to see your matches?",
                sender: 'assistant',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, completionMessage]);
            setConversationStep('complete');
        }
        
        setIsAnalyzing(false);
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
        console.log('🎯 Chatbot completion - creating user profile...');
        
        if (!currentUser) {
            console.error('❌ No current user found');
            return;
        }

        try {
            // Extract user information from conversation
            const userMessages = messages.filter(msg => msg.sender === 'user');
            const conversationText = userMessages.map(msg => msg.text).join('\n\n');
            
            console.log('📝 Conversation text:', conversationText);
            
            // Create a basic profile from the conversation
            const userProfile = {
                id: currentUser.id,
                name: currentUser.name || 'User',
                email: currentUser.email || '',
                bio: conversationText,
                // Extract basic info from conversation (you can enhance this)
                major: extractInfo(conversationText, ['computer science', 'business', 'engineering', 'psychology', 'art', 'medicine']),
                age: extractAge(conversationText),
                cleanliness: extractInfo(conversationText, ['clean', 'very clean', 'messy', 'moderately clean']),
                sleepSchedule: extractInfo(conversationText, ['early bird', 'night owl', 'flexible']),
                socialPreference: extractInfo(conversationText, ['social', 'introverted', 'very social']),
                studyHabits: extractInfo(conversationText, ['quiet study', 'group study', 'flexible']),
                interests: extractInterests(conversationText),
                year: 'Unknown',
                location: 'Unknown',
                createdAt: new Date().toISOString(),
                // Add some default values for better matching
                isTestProfile: false,
                lastUpdated: new Date().toISOString()
            };

            console.log('👤 Created user profile:', userProfile);

            // Save profile to Firebase
            const { saveProfile } = await import('./services/firebaseProfile');
            await saveProfile(userProfile);
            console.log('✅ Profile saved to Firebase');

            // Update the parent component with the profile
            if (onUpdateUser) {
                console.log('📤 Calling onUpdateUser with profile:', userProfile);
                onUpdateUser(userProfile);
            } else {
                console.log('⚠️ onUpdateUser callback not provided');
                // Fallback: navigate to home
                if (onResetToHome) {
                    onResetToHome();
                }
            }
        } catch (error) {
            console.error('❌ Error creating profile:', error);
            // Still navigate to home even if profile creation fails
            if (onResetToHome) {
                onResetToHome();
            }
        }
    };

    // Helper function to extract information from conversation
    const extractInfo = (text, options) => {
        const lowerText = text.toLowerCase();
        for (const option of options) {
            if (lowerText.includes(option.toLowerCase())) {
                return option;
            }
        }
        return options[0] || 'Unknown';
    };

    // Helper function to extract age
    const extractAge = (text) => {
        const ageMatch = text.match(/\b(\d{1,2})\b/);
        return ageMatch ? parseInt(ageMatch[1]) : 20;
    };

    // Helper function to extract interests
    const extractInterests = (text) => {
        const commonInterests = ['gaming', 'music', 'sports', 'reading', 'cooking', 'travel', 'art', 'photography', 'hiking', 'movies'];
        const foundInterests = commonInterests.filter(interest => 
            text.toLowerCase().includes(interest)
        );
        return foundInterests.length > 0 ? foundInterests : ['General'];
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
                        <button onClick={handleCompleteConversation} className="primary-button">
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

// Enhanced MatchResultsGrid component with pagination
const MatchResultsGrid = ({ matches, onStartChat, currentUser, onResetToHome, onOpenSettings }) => {
    console.log('🎯 MatchResultsGrid - matches:', matches);
    console.log('🎯 MatchResultsGrid - matches length:', matches?.length);

    const [currentPage, setCurrentPage] = useState(0);
    const matchesPerPage = 4;

    if (!matches || matches.length === 0) {
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
    }

    const totalPages = Math.ceil(matches.length / matchesPerPage);
    const startIndex = currentPage * matchesPerPage;
    const endIndex = startIndex + matchesPerPage;
    const currentMatches = matches.slice(startIndex, endIndex);

    const goToNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="match-results-outer">
            <div className="match-results-container">
                <div className="match-results-header">
                    <h1 className="match-results-title">Your Perfect Matches</h1>
                    <p className="match-results-subtitle">Based on your preferences and lifestyle</p>
                    <div className="matches-count">
                        <span className="matches-number">{matches.length}</span>
                        <span className="matches-label">roommates found</span>
                    </div>
                </div>
                
                <div className="match-results-carousel">
                    <div className="match-results-grid">
                        {currentMatches.map((match, index) => (
                            <div key={match.id || index} className="match-card">
                                <div className="match-card-header">
                                    <div className="match-avatar">
                                        {match.name ? match.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="match-info">
                                        <h3 className="match-name">{match.name || 'Unknown'}</h3>
                                        <p className="match-major">{match.major || 'Undecided'}</p>
                                        <p className="match-year">{match.year || 'Unknown Year'}</p>
                                    </div>
                                    <div className="match-score">
                                        <div className="score-circle">
                                            {match.compatibilityScore || 0}%
                                        </div>
                                        <span className="score-label">Match</span>
                                    </div>
                                </div>
                                
                                <div className="match-details">
                                    <p className="match-bio">{match.bio || 'No bio available'}</p>
                                    
                                    {match.matchReasons && match.matchReasons.length > 0 && (
                                        <div className="match-reasons">
                                            <h4>Why you're a great match:</h4>
                                            <ul>
                                                {match.matchReasons.map((reason, reasonIndex) => (
                                                    <li key={reasonIndex}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    <div className="match-tags">
                                        {match.interests && match.interests.slice(0, 3).map((interest, interestIndex) => (
                                            <span key={interestIndex} className="interest-tag">
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="match-actions">
                                    <button 
                                        onClick={() => onStartChat(match)} 
                                        className="chat-button primary-button"
                                    >
                                        💬 Start Chat
                                    </button>
                                    <button className="view-profile-button secondary-button">
                                        👤 View Profile
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Pagination Navigation */}
                    {totalPages > 1 && (
                        <div className="carousel-navigation">
                            <button 
                                className="carousel-nav-button"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 0}
                            >
                                ←
                            </button>
                            
                            <div className="carousel-indicators">
                                {Array.from({ length: totalPages }, (_, index) => (
                                    <button
                                        key={index}
                                        className={`carousel-indicator ${currentPage === index ? 'active' : ''}`}
                                        onClick={() => goToPage(index)}
                                    />
                                ))}
                            </div>
                            
                            <button 
                                className="carousel-nav-button"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages - 1}
                            >
                                →
                            </button>
                            
                            {/* Help Button */}
                            <button 
                                className="carousel-help-button"
                                onClick={() => {/* Add help functionality */}}
                                title="Help"
                            >
                                ❓
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { MatchResultsGrid };
export default Chatbot;
