import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

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
            text: "Hi! I'm your AI roommate compatibility specialist! 🏠\n\nTo find your perfect match, I need to understand your background and preferences. Please share:\n\n• Your name, age, and major\n• Where you're from\n• Your personality and lifestyle\n• Study habits and schedule\n• Social preferences (introvert/extrovert)\n• Cleanliness standards\n• Any allergies, dietary restrictions, or medical conditions\n• What you're looking for in a roommate\n\nTake your time and be detailed - this helps me find the best match!",
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

    const handleCompleteConversation = () => {
        if (onResetToHome) {
            onResetToHome();
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
