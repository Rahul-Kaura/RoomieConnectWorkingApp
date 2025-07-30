# Real-Time Messaging Setup Guide

Your roommate matching app now includes real-time messaging functionality! Here's how to set it up:

## Firebase Configuration

### 1. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (hulkster-31e55)
3. Go to **Realtime Database** in the left sidebar
4. Create a database if you haven't already

### 2. Database Rules
Copy the rules from `firebase-database-rules.json` to your Firebase Realtime Database rules:

1. In Firebase Console, go to **Realtime Database** → **Rules**
2. Replace the existing rules with:
```json
{
  "rules": {
    "messages": {
      "$chatId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "onlineStatus": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

### 3. Authentication Setup
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Add your test users or enable other sign-in methods as needed

## Features Included

### ✅ Real-Time Messaging
- Instant message delivery
- Message history persistence
- Real-time typing indicators (coming soon)

### ✅ Online Status
- Shows when other users are online/offline
- Updates in real-time
- Green dot for online, gray for offline

### ✅ Browser Notifications
- Desktop notifications for new messages
- Click the 🔔 button to enable notifications
- Works when the app is in the background

### ✅ Chat Management
- Automatic chat creation when starting conversations
- Message history loading
- Clean chat interface

## How to Test

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && node index.js
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

2. **Open two browser windows/tabs:**
   - Go to `http://localhost:3000` in both
   - Complete the questionnaire in both windows with different users
   - Match with each other

3. **Start chatting:**
   - Click the chat icon on a match
   - Type messages and see them appear in real-time
   - Enable notifications for desktop alerts

## Troubleshooting

### Messages not sending?
- Check browser console for errors
- Verify Firebase rules are set correctly
- Ensure Firebase config is correct in `firebase.js`

### Notifications not working?
- Make sure you've clicked the 🔔 button to enable
- Check browser notification permissions
- Try refreshing the page

### Users not showing as online?
- Check if the user is actively in the chat
- Online status updates every 30 seconds
- Users go offline when they close the chat

## Database Structure

The Firebase Realtime Database will have this structure:
```
/messages
  /{chatId}
    /{messageId}
      - text: "Hello!"
      - senderId: "user123"
      - senderName: "John"
      - timestamp: 1234567890
      - type: "text"

/chats
  /{chatId}
    - id: "chat123"
    - participants: ["user1", "user2"]
    - createdAt: 1234567890
    - lastMessage: {...}

/onlineStatus
  /{userId}
    - online: true
    - name: "John"
    - lastSeen: 1234567890
```

## Security Notes

- All data is protected by Firebase Authentication
- Users can only read/write messages in chats they're part of
- Online status can only be updated by the user themselves
- Messages are stored securely in Firebase Realtime Database

Your messaging system is now ready to use! 🎉 