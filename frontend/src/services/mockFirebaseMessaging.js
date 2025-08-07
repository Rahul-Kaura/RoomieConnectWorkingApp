class MockFirebaseMessagingService {
  constructor() {
    this.messages = new Map(); // chatId -> messages array
    this.listeners = new Map(); // chatId -> callback function
    this.chats = new Map(); // chatId -> chat data
  }

  // Send a message
  async sendMessage(chatId, message) {
    const messageData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: Date.now(),
      type: message.type || 'text'
    };

    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    
    this.messages.get(chatId).push(messageData);
    
    // Simulate real-time update
    setTimeout(() => {
      const listener = this.listeners.get(chatId);
      if (listener) {
        listener(this.messages.get(chatId));
      }
    }, 100);

    return { success: true, messageId: messageData.id };
  }

  // Listen to messages in a chat
  listenToMessages(chatId, callback) {
    this.listeners.set(chatId, callback);
    
    // Immediately call with current messages
    const currentMessages = this.messages.get(chatId) || [];
    callback([...currentMessages]);
  }

  // Stop listening to messages
  stopListeningToMessages(chatId) {
    this.listeners.delete(chatId);
  }

  // Get chat history
  async getChatHistory(chatId) {
    return this.messages.get(chatId) || [];
  }

  // Create a new chat
  async createChat(chatId, participants) {
    this.chats.set(chatId, {
      id: chatId,
      participants,
      createdAt: Date.now(),
      lastMessage: null
    });
    return { success: true };
  }

  // Get user's chats
  async getUserChats(userId) {
    const userChats = [];
    for (const [chatId, chat] of this.chats) {
      if (chat.participants && chat.participants.includes(userId)) {
        userChats.push(chat);
      }
    }
    return userChats;
  }

  // Update last message in chat
  async updateLastMessage(chatId, message) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.lastMessage = {
        text: message.text,
        senderId: message.senderId,
        timestamp: Date.now()
      };
    }
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.clear();
  }

  // Add some demo messages for testing
  addDemoMessages(chatId) {
    const demoMessages = [
      {
        id: 'demo1',
        text: 'Hey! I saw we matched! 👋',
        senderId: 'user2',
        senderName: 'Demo User',
        timestamp: Date.now() - 300000, // 5 minutes ago
        type: 'text'
      },
      {
        id: 'demo2',
        text: 'Hi there! Yes, we did! How are you doing?',
        senderId: 'user1',
        senderName: 'Current User',
        timestamp: Date.now() - 240000, // 4 minutes ago
        type: 'text'
      },
      {
        id: 'demo3',
        text: 'I\'m doing great! Are you looking for a roommate too?',
        senderId: 'user2',
        senderName: 'Demo User',
        timestamp: Date.now() - 180000, // 3 minutes ago
        type: 'text'
      }
    ];

    this.messages.set(chatId, demoMessages);
  }
}

export default new MockFirebaseMessagingService(); 