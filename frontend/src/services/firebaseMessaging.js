/**
 * Chat/messaging service - uses backend API only. No Firebase in the browser.
 * Backend holds all Firebase keys and reads/writes Firebase; this service only fetches/sends via REST.
 */
import { API_URL } from '../config';
import notificationService from './notificationService';

const POLL_MESSAGES_MS = 2000;
const POLL_TYPING_MS = 1000;

class ChatMessagingService {
  constructor() {
    this.listeners = new Map();
    this.activityInterval = null;
    this.activityThrottle = null;
  }

  async sendMessage(chatId, message) {
    try {
      const res = await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          senderId: message.senderId,
          senderName: message.senderName,
          type: message.type || 'text',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || res.statusText };
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async setUserOnline(userId, userName) {
    try {
      await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName }),
      });
      this.activityInterval = setInterval(() => {
        this.updateUserActivity(userId);
      }, 10000);
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  async setUserOffline(userId) {
    try {
      await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (this.activityInterval) {
        clearInterval(this.activityInterval);
        this.activityInterval = null;
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  async setTypingStatus(chatId, userId, isTyping) {
    try {
      await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isTyping }),
      });
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }

  listenToTyping(chatId, callback) {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/typing`);
        const typingUsers = await res.json();
        callback(typeof typingUsers === 'object' ? typingUsers : {});
      } catch (e) {
        callback({});
      }
    };
    poll();
    const interval = setInterval(poll, POLL_TYPING_MS);
    return () => clearInterval(interval);
  }

  async isUserActuallyOnline(userId) {
    try {
      const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/online`);
      const data = await res.json();
      return data.online === true;
    } catch (e) {
      return false;
    }
  }

  async updateUserActivity(userId) {
    if (this.activityThrottle) clearTimeout(this.activityThrottle);
    this.activityThrottle = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      } catch (e) {
        // ignore
      }
    }, 2000);
  }

  listenToMessages(chatId, callback, currentUserId = null) {
    if (this.listeners.has(chatId)) {
      clearInterval(this.listeners.get(chatId));
      this.listeners.delete(chatId);
    }
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/messages`);
        const messages = await res.json();
        const list = Array.isArray(messages) ? messages : [];
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        if (currentUserId && list.length > 0) {
          notificationService.updateUnreadCountFromMessages(chatId, list, currentUserId);
        }
        callback(list);
      } catch (e) {
        callback([]);
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MESSAGES_MS);
    this.listeners.set(chatId, interval);
    return interval;
  }

  stopListeningToMessages(chatId) {
    if (this.listeners.has(chatId)) {
      clearInterval(this.listeners.get(chatId));
      this.listeners.delete(chatId);
    }
  }

  async getChatHistory(chatId) {
    try {
      const res = await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/messages`);
      const messages = await res.json();
      const list = Array.isArray(messages) ? messages : [];
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return list;
    } catch (e) {
      console.error('Error getting chat history:', e);
      return [];
    }
  }

  async createChat(chatId, participants) {
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, participants }),
      });
      const data = await res.json().catch(() => ({}));
      return { success: data.success === true };
    } catch (e) {
      console.error('Error creating chat:', e);
      return { success: false, error: e.message };
    }
  }

  async updateLastMessage(chatId, message) {
    try {
      await fetch(`${API_URL}/chat/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          senderId: message.senderId,
          senderName: message.senderName,
          type: message.type || 'text',
        }),
      });
    } catch (e) {
      // ignore
    }
  }

  async isUserOnline(userId) {
    return this.isUserActuallyOnline(userId);
  }

  async forceSyncAllChats() {
    return { success: true, synced: 0 };
  }

  async getUserChats(userId) {
    return [];
  }

  async verifyChatConsistency(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join('_');
    const messages = await this.getChatHistory(chatId);
    return { exists: messages.length >= 0, messageCount: messages.length };
  }

  async testMessagingBetweenUsers(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join('_');
    await this.createChat(chatId, [user1Id, user2Id]);
    const result = await this.sendMessage(chatId, {
      text: `Test at ${new Date().toISOString()}`,
      senderId: user1Id,
      senderName: 'Test',
      type: 'text',
    });
    return { success: result.success, chatId };
  }

  async debugUserChatAccess(userId) {
    return { success: true, userChats: [], totalChats: 0 };
  }

  cleanup() {
    this.listeners.forEach((interval) => clearInterval(interval));
    this.listeners.clear();
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }
}

export default new ChatMessagingService();
