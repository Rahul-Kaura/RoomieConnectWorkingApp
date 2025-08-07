import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your Firebase config here (already set up for chat)
const firebaseConfig = {
  apiKey: "AIzaSyDGaoXPGeK4C-09CmWACCyYFz2zXu1364w",
  authDomain: "hulkster-31e55.firebaseapp.com",
  databaseURL: "https://hulkster-31e55-default-rtdb.firebaseio.com",
  projectId: "hulkster-31e55",
  storageBucket: "hulkster-31e55.firebasestorage.app",
  messagingSenderId: "34629015129",
  appId: "1:34629015129:web:73d10a40505881f0ce0348"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app; 