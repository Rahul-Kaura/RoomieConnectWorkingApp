/**
 * Firebase Admin SDK - used by backend for profile storage (single source of truth).
 * Requires FIREBASE_DATABASE_URL and either FIREBASE_SERVICE_ACCOUNT_JSON (string)
 * or GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON).
 */
const admin = require('firebase-admin');

let db = null;

function getDatabase() {
  if (db) return db;
  if (!admin.apps.length) {
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      console.warn('FIREBASE_DATABASE_URL not set; profile storage will use in-memory fallback.');
      return null;
    }
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        credential = admin.credential.cert(serviceAccount);
      } catch (e) {
        console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
        return null;
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    } else {
      console.warn('Neither FIREBASE_SERVICE_ACCOUNT_JSON nor GOOGLE_APPLICATION_CREDENTIALS set; profile storage will use in-memory fallback.');
      return null;
    }
    admin.initializeApp({ credential, databaseURL });
  }
  db = admin.database();
  return db;
}

async function saveProfileToFirebase(profile) {
  const database = getDatabase();
  if (!database || !profile || !profile.id) return null;
  const ref = database.ref('profiles').child(profile.id);
  const data = {
    ...profile,
    userId: profile.userId ?? profile.id,
    lastUpdated: profile.lastUpdated ?? new Date().toISOString(),
  };
  await ref.set(data);
  return data;
}

async function getProfileFromFirebase(userId) {
  const database = getDatabase();
  if (!database) return null;
  const snapshot = await database.ref('profiles').child(userId).once('value');
  return snapshot.exists() ? snapshot.val() : null;
}

async function getAllProfilesFromFirebase() {
  const database = getDatabase();
  if (!database) return [];
  const snapshot = await database.ref('profiles').once('value');
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val());
}

// --- Chat (messages, typing, online status) - backend only ---
function serverTimestamp() {
  return Date.now();
}

async function pushMessage(chatId, message) {
  const database = getDatabase();
  if (!database) return null;
  const ref = database.ref(`messages/${chatId}`).push();
  const data = {
    ...message,
    timestamp: message.timestamp || serverTimestamp(),
  };
  await ref.set(data);
  return ref.key;
}

async function getMessages(chatId) {
  const database = getDatabase();
  if (!database) return [];
  const snapshot = await database.ref(`messages/${chatId}`).once('value');
  if (!snapshot.exists()) return [];
  const messages = [];
  snapshot.forEach((child) => {
    messages.push({ id: child.key, ...child.val() });
  });
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return messages;
}

async function setTyping(chatId, userId, isTyping) {
  const database = getDatabase();
  if (!database) return;
  const ref = database.ref(`typing/${chatId}/${userId}`);
  if (isTyping) {
    await ref.set({ isTyping: true, timestamp: serverTimestamp() });
  } else {
    await ref.set(null);
  }
}

async function getTyping(chatId) {
  const database = getDatabase();
  if (!database) return {};
  const snapshot = await database.ref(`typing/${chatId}`).once('value');
  if (!snapshot.exists()) return {};
  const out = {};
  snapshot.forEach((child) => {
    const data = child.val();
    if (data && data.isTyping) out[child.key] = data;
  });
  return out;
}

async function setOnlineStatus(userId, data) {
  const database = getDatabase();
  if (!database) return;
  const ts = serverTimestamp();
  await database.ref(`onlineStatus/${userId}`).set({
    online: data.online,
    name: data.name || null,
    lastSeen: ts,
    lastActivity: data.lastActivity ?? ts,
  });
}

async function setLastActivity(userId) {
  const database = getDatabase();
  if (!database) return;
  await database.ref(`lastActivity/${userId}`).set(serverTimestamp());
}

async function getLastActivity(userId) {
  const database = getDatabase();
  if (!database) return null;
  const snapshot = await database.ref(`lastActivity/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
}

async function createChat(chatId, participants) {
  const database = getDatabase();
  if (!database) return false;
  await database.ref(`chats/${chatId}`).set({
    id: chatId,
    participants,
    createdAt: serverTimestamp(),
    lastMessage: null,
  });
  return true;
}

async function updateLastMessage(chatId, message) {
  const database = getDatabase();
  if (!database) return;
  await database.ref(`chats/${chatId}`).update({
    lastMessage: {
      text: message.text,
      senderId: message.senderId,
      timestamp: serverTimestamp(),
    },
  });
}

module.exports = {
  getDatabase,
  saveProfileToFirebase,
  getProfileFromFirebase,
  getAllProfilesFromFirebase,
  serverTimestamp,
  pushMessage,
  getMessages,
  setTyping,
  getTyping,
  setOnlineStatus,
  setLastActivity,
  getLastActivity,
  createChat,
  updateLastMessage,
};
