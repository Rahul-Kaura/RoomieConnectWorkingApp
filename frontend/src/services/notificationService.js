class NotificationService {
  constructor() {
    this.permission = 'default';
    this.unreadCounts = new Map(); // Track unread counts per chat
    this.lastReadTimestamps = new Map(); // Track when user last read each chat
    this.init();
  }

  async init() {
    if (this.isSupported()) {
      this.permission = Notification.permission;
    }
    
    // Load last read timestamps from localStorage
    this.loadLastReadTimestamps();
  }

  // Load last read timestamps from localStorage
  loadLastReadTimestamps() {
    try {
      const stored = localStorage.getItem('roomieConnect_lastReadTimestamps');
      if (stored) {
        const timestamps = JSON.parse(stored);
        Object.keys(timestamps).forEach(chatId => {
          this.lastReadTimestamps.set(chatId, timestamps[chatId]);
        });
        console.log('Loaded last read timestamps from localStorage');
      }
    } catch (error) {
      console.error('Error loading last read timestamps:', error);
    }
  }

  // Save last read timestamps to localStorage
  saveLastReadTimestamps() {
    try {
      const timestamps = {};
      this.lastReadTimestamps.forEach((timestamp, chatId) => {
        timestamps[chatId] = timestamp;
      });
      localStorage.setItem('roomieConnect_lastReadTimestamps', JSON.stringify(timestamps));
    } catch (error) {
      console.error('Error saving last read timestamps:', error);
    }
  }

  async requestPermission() {
    if (!this.isSupported()) {
      console.log('Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  showNotification(title, options = {}) {
    if (!this.isSupported() || this.permission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  showMessageNotification(senderName, messageText) {
    const title = `New message from ${senderName}`;
    const options = {
      body: messageText,
      tag: 'new-message', // Group similar notifications
      renotify: true, // Show new notification even if one exists
      actions: [
        {
          action: 'open',
          title: 'Open Chat'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    return this.showNotification(title, options);
  }

  // Mark chat as read (called when user opens a chat)
  markChatAsRead(chatId) {
    const currentTime = Date.now();
    this.lastReadTimestamps.set(chatId, currentTime);
    this.unreadCounts.set(chatId, 0);
    this.updateBadge();
    this.saveLastReadTimestamps(); // Save to localStorage
    console.log(`Marked chat ${chatId} as read at: ${currentTime}`);
  }

  // Mark all existing messages as read (for first-time app opening)
  markAllExistingAsRead(chatId, messages) {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.timestamp) {
        this.lastReadTimestamps.set(chatId, lastMessage.timestamp);
        this.unreadCounts.set(chatId, 0);
        this.updateBadge();
        this.saveLastReadTimestamps(); // Save to localStorage
        console.log(`Marked all existing messages as read for ${chatId} at: ${lastMessage.timestamp}`);
        return true;
      }
    }
    return false;
  }

  // Calculate unread count based on messages since last read
  calculateUnreadCount(chatId, messages) {
    const lastReadTime = this.lastReadTimestamps.get(chatId) || 0;
    let unreadCount = 0;

    if (messages && messages.length > 0) {
      messages.forEach(message => {
        if (message.timestamp && message.timestamp > lastReadTime) {
          unreadCount++;
        }
      });
    }

    return unreadCount;
  }

  // Update unread count for a specific chat based on messages
  updateUnreadCountFromMessages(chatId, messages, currentUserId) {
    const lastReadTime = this.lastReadTimestamps.get(chatId);
    let unreadCount = 0;

    if (messages && messages.length > 0) {
      // If no last read time is set, set it to the timestamp of the last message
      // This prevents counting all existing messages as unread
      if (!lastReadTime) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.timestamp) {
          this.lastReadTimestamps.set(chatId, lastMessage.timestamp);
          console.log(`Initialized last read time for ${chatId} to: ${lastMessage.timestamp}`);
          return 0; // No unread messages since we just marked everything as read
        }
      }

      messages.forEach(message => {
        // Only count messages from other users that are newer than last read
        if (message.senderId !== currentUserId && 
            message.timestamp && 
            message.timestamp > lastReadTime) {
          unreadCount++;
        }
      });
    }

    this.unreadCounts.set(chatId, unreadCount);
    this.updateBadge();
    console.log(`Updated unread count for ${chatId}: ${unreadCount} (last read: ${lastReadTime})`);
    return unreadCount;
  }

  // Update unread count for a specific chat (legacy method)
  updateUnreadCount(chatId, count) {
    console.log(`Manually updating unread count for ${chatId}: ${count}`);
    this.unreadCounts.set(chatId, count);
    this.updateBadge();
  }

  // Get total unread count across all chats
  getTotalUnreadCount() {
    let total = 0;
    for (const count of this.unreadCounts.values()) {
      total += count;
    }
    console.log(`Total unread count: ${total}`);
    return total;
  }

  // Get unread count for specific chat
  getUnreadCount(chatId) {
    const count = this.unreadCounts.get(chatId) || 0;
    console.log(`Getting unread count for ${chatId}: ${count}`);
    return count;
  }

  // Update browser badge (if supported)
  updateBadge() {
    const totalUnread = this.getTotalUnreadCount();
    
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(totalUnread).catch(error => {
        console.log('Badge not supported:', error);
      });
    }
    
    // Update document title
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) RoomieConnect`;
    } else {
      document.title = 'RoomieConnect';
    }
  }

  // Clear unread count for a chat
  clearUnreadCount(chatId) {
    this.unreadCounts.delete(chatId);
    this.lastReadTimestamps.set(chatId, Date.now());
    this.updateBadge();
  }

  // Clear all unread counts
  clearAllUnreadCounts() {
    this.unreadCounts.clear();
    this.lastReadTimestamps.clear();
    this.updateBadge();
  }

  isSupported() {
    return 'Notification' in window;
  }

  getPermission() {
    return this.permission;
  }
}

export default new NotificationService(); 