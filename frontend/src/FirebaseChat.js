import React, { useState, useEffect, useRef } from 'react';
import firebaseMessaging from './services/firebaseMessaging';
import notificationService from './services/notificationService';
import { off, ref } from 'firebase/database';
import { database } from './firebase';
import './FirebaseChat.css';

const FirebaseChat = ({ currentUser, matchedUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(notificationService.getPermission());
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessage, setLastReadMessage] = useState(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const chatId = currentUser && matchedUser ? 
    [currentUser.id, matchedUser.id].sort().join('_') : null;

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

  useEffect(() => {
    if (chatId) {
      // Set current user as online
      firebaseMessaging.setUserOnline(currentUser.id, currentUser.name);
      
      // Create chat if it doesn't exist
      firebaseMessaging.createChat(chatId, [currentUser.id, matchedUser.id]);
      
      // Load chat history
      loadChatHistory();
      
      // Listen for new messages
      firebaseMessaging.listenToMessages(chatId, (newMessages) => {
          // Check if there are new messages from other users
          if (newMessages.length > messages.length) {
            const latestMessage = newMessages[newMessages.length - 1];
            if (latestMessage.senderId !== currentUser.id) {
              // Show notification for new message
              notificationService.showMessageNotification(
                latestMessage.senderName || 'Someone',
                latestMessage.text
              );
              setUnreadCount(prev => prev + 1);
            }
          }
        setMessages(newMessages);
        }, currentUser.id);
      
      // Listen to typing status
      const typingListener = firebaseMessaging.listenToTyping(chatId, (typingUsers) => {
        const otherUserTyping = Object.keys(typingUsers).some(userId => 
          userId !== currentUser.id && typingUsers[userId].isTyping
        );
        setIsOtherUserTyping(otherUserTyping);
      });
      
      // Check if other user is online
      const checkOnlineStatus = async () => {
        const online = await firebaseMessaging.isUserActuallyOnline(matchedUser.id);
        setIsOtherUserOnline(online);
      };
      checkOnlineStatus();
      
      // Check online status every 10 seconds
      const onlineStatusInterval = setInterval(checkOnlineStatus, 10000);
      
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
          clearInterval(onlineStatusInterval);
        firebaseMessaging.stopListeningToMessages(chatId);
          // Set user as offline when leaving chat
          firebaseMessaging.setUserOffline(currentUser.id);
          // Stop typing
          firebaseMessaging.setTypingStatus(chatId, currentUser.id, false);
          // Clean up typing listener
          if (typingListener) {
            off(ref(database, `typing/${chatId}`), 'value', typingListener);
          }
          // Remove activity listeners
          document.removeEventListener('mousemove', trackActivity);
          document.removeEventListener('click', trackActivity);
          document.removeEventListener('keypress', trackActivity);
          document.removeEventListener('scroll', trackActivity);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }
  }, [chatId, currentUser.id, currentUser.name]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    setIsLoading(true);
    try {
      const history = await firebaseMessaging.getChatHistory(chatId);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark messages as read when user scrolls to bottom or sends a message
  const markAsRead = () => {
    setUnreadCount(0);
    notificationService.markChatAsRead(chatId);
    setLastReadMessage(messages.length > 0 ? messages[messages.length - 1].id : null);
  };

  // Mark as read when user opens chat
  useEffect(() => {
    if (chatId && messages.length > 0) {
      notificationService.markChatAsRead(chatId);
    }
  }, [chatId]); // Only run when chatId changes (when opening a new chat)

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  // Handle typing detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Set typing status
    firebaseMessaging.setTypingStatus(chatId, currentUser.id, value.length > 0);
    
    // Clear typing status after 2 seconds of no typing
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      firebaseMessaging.setTypingStatus(chatId, currentUser.id, false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    // Clear typing status
    firebaseMessaging.setTypingStatus(chatId, currentUser.id, false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const messageData = {
      text: newMessage.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      type: 'text'
    };

    try {
      const result = await firebaseMessaging.sendMessage(chatId, messageData);
      if (result.success) {
        setNewMessage('');
        // Update last message in chat
        firebaseMessaging.updateLastMessage(chatId, messageData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleNotificationPermission = async () => {
    const permission = await notificationService.requestPermission();
    setNotificationPermission(permission);
  };

  if (!currentUser || !matchedUser) {
    return (
      <div className="firebase-chat-container">
        <div className="firebase-chat-header">
          <h3>Chat</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="firebase-chat-messages">
          <p>Please select a matched user to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="firebase-chat-container">
      <div className="firebase-chat-header">
        <div className="chat-user-info">
          <div className="user-avatar">
            {getUserInitials(matchedUser.name)}
          </div>
          <div className="user-details">
            <h3>{matchedUser.name}</h3>
            <span className={`user-status ${isOtherUserOnline ? 'online' : 'offline'}`}>
              {isOtherUserOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="header-actions">
            <div 
                className="bouncing-logo"
                onClick={() => {
                    // Close the chat and go back to matches screen
                    if (onClose) {
                        onClose();
                    }
                }}
                style={{ cursor: 'pointer' }}
            >
                <svg width="24" height="24" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="20,55 55,20 90,55" stroke="#ffffff" strokeWidth="3" fill="none" />
                    <rect x="28" y="55" width="54" height="35" rx="8" stroke="#ffffff" strokeWidth="3" fill="none" />
                    <path d="M55 85 C 55 80, 40 75, 40 65 A 8 8 0 0 1 55 65 A 8 8 0 0 1 70 65 C 70 75, 55 80, 55 85 Z" stroke="#ffffff" strokeWidth="2" fill="none" />
                </svg>
            </div>
            {notificationService.isSupported() && notificationPermission !== 'granted' && (
                <button 
                    onClick={handleNotificationPermission}
                    className="notification-button"
                    title="Enable notifications"
                >
                    🔔
                </button>
            )}
        <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>

      <div className="firebase-chat-messages">
        {isLoading ? (
          <div className="loading-messages">
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
            ))}
            {isOtherUserTyping && (
              <div className="message received">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="firebase-chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={!chatId}
        />
        <button type="submit" disabled={!newMessage.trim() || !chatId}>
          Send
        </button>
      </form>
    </div>
  );
};

export default FirebaseChat; 