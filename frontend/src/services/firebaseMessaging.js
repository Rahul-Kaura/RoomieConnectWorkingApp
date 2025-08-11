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
    console.log('🚀 Sending message:', { chatId, message });
    
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
      console.log('✅ Message sent successfully:', messageData);
      
      // Verify message was actually saved
      const savedMessage = await get(newMessageRef);
      if (savedMessage.exists()) {
        console.log('✅ Message verified in database:', savedMessage.val());
      } else {
        console.error('❌ Message not found in database after sending');
      }
      
      return { success: true, messageId: newMessageRef.key };
    } catch (error) {
      console.error('❌ Error sending message:', error);
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
    console.log('👂 Setting up message listener for chat:', chatId, 'User:', currentUserId);
    
    const chatRef = ref(database, `messages/${chatId}`);
    
    // Remove existing listener if any
    if (this.listeners.has(chatId)) {
      console.log('🔄 Removing existing listener for chat:', chatId);
      off(chatRef, 'value', this.listeners.get(chatId));
    }

    const listener = onValue(chatRef, (snapshot) => {
      console.log('📨 Message listener triggered for chat:', chatId);
      console.log('Snapshot exists:', snapshot.exists());
      console.log('Snapshot value:', snapshot.val());
      
      const messages = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const message = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          messages.push(message);
          console.log('📝 Found message:', message);
        });
      }
      
      // Sort messages by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      console.log('📊 Total messages in chat:', messages.length);
      console.log('📋 Sorted messages:', messages);
      
      // Update unread count based on real messages
      if (currentUserId && messages.length > 0) {
        const unreadCount = notificationService.updateUnreadCountFromMessages(chatId, messages, currentUserId);
        console.log('🔔 Updated unread count for user:', currentUserId, 'Count:', unreadCount);
      }
      
      callback(messages);
    }, (error) => {
      console.error('❌ Error listening to messages for chat:', chatId, error);
    });

    this.listeners.set(chatId, listener);
    console.log('✅ Message listener set up successfully for chat:', chatId);
    return listener;
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
    console.log('📚 Getting chat history for chat:', chatId);
    
    const chatRef = ref(database, `messages/${chatId}`);
    
    try {
      const snapshot = await get(chatRef);
      console.log('📖 Chat history snapshot exists:', snapshot.exists());
      console.log('📖 Chat history snapshot value:', snapshot.val());
      
      const messages = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const message = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          messages.push(message);
          console.log('📝 Retrieved message:', message);
        });
      }
      
      // Sort messages by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      console.log('📊 Total messages retrieved:', messages.length);
      console.log('📋 Sorted chat history:', messages);
      
      return messages;
    } catch (error) {
      console.error('❌ Error getting chat history for chat:', chatId, error);
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

  // Force sync all chats to ensure consistency
  async forceSyncAllChats() {
    try {
      console.log('🔄 Force syncing all chats...');
      
      // Get all chat references
      const chatsSnapshot = await get(ref(database, 'messages'));
      if (!chatsSnapshot.exists()) {
        console.log('No chats found to sync');
        return { success: true, synced: 0 };
      }
      
      let syncedCount = 0;
      const chatIds = Object.keys(chatsSnapshot.val());
      
      for (const chatId of chatIds) {
        try {
          // Get chat messages
          const chatRef = ref(database, `messages/${chatId}`);
          const chatSnapshot = await get(chatRef);
          
          if (chatSnapshot.exists()) {
            const messages = [];
            chatSnapshot.forEach((childSnapshot) => {
              messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
            
            // Sort messages by timestamp
            messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            
            // Update last message in chat
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              await this.updateLastMessage(chatId, lastMessage);
              syncedCount++;
              console.log(`✅ Synced chat ${chatId}: ${messages.length} messages`);
            }
          }
        } catch (chatError) {
          console.error(`Error syncing chat ${chatId}:`, chatError);
        }
      }
      
      console.log(`✅ Force sync complete: ${syncedCount} chats synced`);
      return { success: true, synced: syncedCount };
      
    } catch (error) {
      console.error('❌ Error during force sync:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all chat IDs for a user
  async getUserChats(userId) {
    try {
      const chatsSnapshot = await get(ref(database, 'messages'));
      if (!chatsSnapshot.exists()) {
        return [];
      }
      
      const userChats = [];
      const chatIds = Object.keys(chatsSnapshot.val());
      
      for (const chatId of chatIds) {
        // Check if this chat involves the user
        if (chatId.includes(userId)) {
          userChats.push(chatId);
        }
      }
      
      return userChats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  // Verify chat consistency between users
  async verifyChatConsistency(user1Id, user2Id) {
    try {
      const chatId = [user1Id, user2Id].sort().join('_');
      console.log(`🔍 Verifying chat consistency for: ${chatId}`);
      
      // Check if chat exists
      const chatRef = ref(database, `messages/${chatId}`);
      const chatSnapshot = await get(chatRef);
      
      if (!chatSnapshot.exists()) {
        console.log(`❌ Chat ${chatId} does not exist`);
        return { exists: false, messageCount: 0 };
      }
      
      // Count messages
      let messageCount = 0;
      chatSnapshot.forEach(() => {
        messageCount++;
      });
      
      console.log(`✅ Chat ${chatId} exists with ${messageCount} messages`);
      return { exists: true, messageCount };
      
    } catch (error) {
      console.error('Error verifying chat consistency:', error);
      return { exists: false, messageCount: 0, error: error.message };
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

  // Test messaging between specific users
  async testMessagingBetweenUsers(user1Id, user2Id) {
    try {
      console.log('🧪 Testing messaging between users:', user1Id, 'and', user2Id);
      
      // Generate chat ID
      const chatId = [user1Id, user2Id].sort().join('_');
      console.log('💬 Generated chat ID:', chatId);
      
      // Check if chat exists
      const chatRef = ref(database, `messages/${chatId}`);
      const chatSnapshot = await get(chatRef);
      console.log('📁 Chat exists:', chatSnapshot.exists());
      
      if (chatSnapshot.exists()) {
        console.log('📁 Chat data:', chatSnapshot.val());
      }
      
      // Check if users can access the chat
      const canRead = await get(chatRef);
      console.log('👀 Can read chat:', canRead.exists());
      
      // Try to send a test message
      const testMessage = {
        text: `Test message from ${user1Id} to ${user2Id} at ${new Date().toISOString()}`,
        senderId: user1Id,
        senderName: `Test User ${user1Id}`,
        type: 'text'
      };
      
      console.log('📤 Sending test message:', testMessage);
      const result = await this.sendMessage(chatId, testMessage);
      console.log('📤 Test message result:', result);
      
      // Wait a moment and check if message was received
      setTimeout(async () => {
        const updatedHistory = await this.getChatHistory(chatId);
        console.log('📥 Updated chat history after test message:', updatedHistory);
      }, 1000);
      
      return { success: true, chatId, testMessage: result };
      
    } catch (error) {
      console.error('❌ Error testing messaging between users:', error);
      return { success: false, error: error.message };
    }
  }

  // Debug chat access for a specific user
  async debugUserChatAccess(userId) {
    try {
      console.log('🔍 Debugging chat access for user:', userId);
      
      // Get all chats
      const chatsSnapshot = await get(ref(database, 'messages'));
      if (!chatsSnapshot.exists()) {
        console.log('❌ No chats found in database');
        return { success: false, error: 'No chats found' };
      }
      
      const chatIds = Object.keys(chatsSnapshot.val());
      console.log('📁 Found chat IDs:', chatIds);
      
      const userChats = [];
      for (const chatId of chatIds) {
        if (chatId.includes(userId)) {
          const chatData = chatsSnapshot.val()[chatId];
          console.log(`📁 Chat ${chatId} data:`, chatData);
          userChats.push({ chatId, data: chatData });
        }
      }
      
      console.log('👤 User chats:', userChats);
      return { success: true, userChats, totalChats: chatIds.length };
      
    } catch (error) {
      console.error('❌ Error debugging user chat access:', error);
      return { success: false, error: error.message };
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