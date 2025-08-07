import { ref, push, onValue, off, set, get, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import notificationService from './notificationService';

class FirebaseMessagingService {
  constructor() {
    this.messagesRef = ref(database, 'messages');
    this.listeners = new Map();
    this.onlineStatusRef = ref(database, 'onlineStatus');
    this.typingRef = ref(database, 'typing');
    this.lastActivityRef = ref(database, 'lastActivity');
  }

  // Send a message
  async sendMessage(chatId, message) {
    const messageData = {
      id: Date.now().toString(),
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: serverTimestamp(),
      type: message.type || 'text'
    };

    const chatRef = ref(database, `messages/${chatId}`);
    const newMessageRef = push(chatRef);
    
    try {
      await set(newMessageRef, messageData);
      console.log('Message sent successfully:', messageData);
      return { success: true, messageId: newMessageRef.key };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  // Set user online status with activity tracking
  async setUserOnline(userId, userName) {
    const userStatusRef = ref(database, `onlineStatus/${userId}`);
    const lastActivityRef = ref(database, `lastActivity/${userId}`);
    
    try {
      await set(userStatusRef, {
        online: true,
        name: userName,
        lastSeen: serverTimestamp(),
        lastActivity: serverTimestamp()
      });
      
      // Update last activity every 10 seconds to keep user "active"
      this.activityInterval = setInterval(async () => {
        await set(lastActivityRef, serverTimestamp());
      }, 10000);
      
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  // Set user offline status
  async setUserOffline(userId) {
    const userStatusRef = ref(database, `onlineStatus/${userId}`);
    
    try {
      await set(userStatusRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
      
      // Clear activity interval
      if (this.activityInterval) {
        clearInterval(this.activityInterval);
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Set typing status
  async setTypingStatus(chatId, userId, isTyping) {
    const typingRef = ref(database, `typing/${chatId}/${userId}`);
    
    try {
      if (isTyping) {
        await set(typingRef, {
          isTyping: true,
          timestamp: serverTimestamp()
        });
      } else {
        await set(typingRef, null);
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }

  // Listen to typing status
  listenToTyping(chatId, callback) {
    const typingRef = ref(database, `typing/${chatId}`);
    
    const listener = onValue(typingRef, (snapshot) => {
      const typingUsers = {};
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const userId = childSnapshot.key;
          const data = childSnapshot.val();
          if (data && data.isTyping) {
            typingUsers[userId] = data;
          }
        });
      }
      callback(typingUsers);
    });

    return listener;
  }

  // Check if user is actually online (within 30 seconds)
  async isUserActuallyOnline(userId) {
    const lastActivityRef = ref(database, `lastActivity/${userId}`);
    
    try {
      const snapshot = await get(lastActivityRef);
      if (snapshot.exists()) {
        const lastActivity = snapshot.val();
        const now = Date.now();
        const thirtySecondsAgo = now - (30 * 1000); // 30 seconds in milliseconds
        
        return lastActivity > thirtySecondsAgo;
      }
      return false;
    } catch (error) {
      console.error('Error checking user activity:', error);
      return false;
    }
  }

  // Update user activity (throttled to avoid too many Firebase calls)
  async updateUserActivity(userId) {
    if (this.activityThrottle) {
      clearTimeout(this.activityThrottle);
    }
    
    this.activityThrottle = setTimeout(async () => {
      const lastActivityRef = ref(database, `lastActivity/${userId}`);
      try {
        await set(lastActivityRef, serverTimestamp());
      } catch (error) {
        console.error('Error updating user activity:', error);
      }
    }, 2000); // Throttle to every 2 seconds
  }

  // Listen to messages in a chat
  listenToMessages(chatId, callback, currentUserId = null) {
    const chatRef = ref(database, `messages/${chatId}`);
    
    // Remove existing listener if any
    if (this.listeners.has(chatId)) {
      off(chatRef, 'value', this.listeners.get(chatId));
    }

    const listener = onValue(chatRef, (snapshot) => {
      const messages = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      // Sort messages by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      console.log('Received messages:', messages);
      
      // Update unread count based on real messages
      if (currentUserId && messages.length > 0) {
        notificationService.updateUnreadCountFromMessages(chatId, messages, currentUserId);
      }
      
      callback(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    this.listeners.set(chatId, listener);
  }

  // Stop listening to messages
  stopListeningToMessages(chatId) {
    if (this.listeners.has(chatId)) {
      const chatRef = ref(database, `messages/${chatId}`);
      off(chatRef, 'value', this.listeners.get(chatId));
      this.listeners.delete(chatId);
    }
  }

  // Get chat history
  async getChatHistory(chatId) {
    const chatRef = ref(database, `messages/${chatId}`);
    
    try {
      const snapshot = await get(chatRef);
      const messages = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      
      // Sort messages by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      console.log('Loaded chat history:', messages);
      return messages;
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  // Create a new chat
  async createChat(chatId, participants) {
    const chatRef = ref(database, `chats/${chatId}`);
    
    try {
      await set(chatRef, {
        id: chatId,
        participants,
        createdAt: serverTimestamp(),
        lastMessage: null
      });
      console.log('Chat created successfully:', chatId);
      return { success: true };
    } catch (error) {
      console.error('Error creating chat:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's chats
  async getUserChats(userId) {
    const chatsRef = ref(database, 'chats');
    
    try {
      const snapshot = await get(chatsRef);
      const chats = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const chat = childSnapshot.val();
          if (chat.participants && chat.participants.includes(userId)) {
            chats.push(chat);
          }
        });
      }
      
      return chats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  // Update last message in chat
  async updateLastMessage(chatId, message) {
    const chatRef = ref(database, `chats/${chatId}`);
    
    try {
      await set(chatRef, {
        lastMessage: {
          text: message.text,
          senderId: message.senderId,
          timestamp: serverTimestamp()
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }

  // Check if user is online
  async isUserOnline(userId) {
    const userStatusRef = ref(database, `onlineStatus/${userId}`);
    try {
      const snapshot = await get(userStatusRef);
      if (snapshot.exists()) {
        const status = snapshot.val();
        return status.online || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking user online status:', error);
      return false;
    }
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach((listener, chatId) => {
      this.stopListeningToMessages(chatId);
    });
    
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }
  }
}

export default new FirebaseMessagingService(); 