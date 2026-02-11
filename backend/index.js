require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const {
  saveProfileToFirebase,
  getProfileFromFirebase,
  getAllProfilesFromFirebase,
  pushMessage,
  getMessages,
  setTyping,
  getTyping,
  setOnlineStatus,
  setLastActivity,
  getLastActivity,
  createChat,
  updateLastMessage,
} = require('./firebase');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://roomieconnect-frontend.onrender.com', 'https://roomieconnectworkingapp.vercel.app']
        : ['http://localhost:3000'],
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- State Management ---
// Starting fresh with no test profiles - only real users
const profiles = [];
let nextId = 1;
const users = [];
let nextUserId = 1;

// --- Helper Functions ---

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat)/2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

function getCleanAllergyInfo(answers) {
    const allergyAnswer = answers.find(a => a.questionId === 'allergies');
    if (!allergyAnswer) {
        return 'N/A';
    }
    
    const answer = allergyAnswer.answer.toLowerCase();
    const noAllergyKeywords = ['no', 'none', 'n/a', 'not applicable', 'no allergies', 'none that i know of'];
    
    if (noAllergyKeywords.some(keyword => answer.includes(keyword))) {
        return 'No allergies';
    }
    
    return allergyAnswer.answer;
}

async function getCoordinates(address) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: address,
                format: 'json',
                limit: 1,
            },
            headers: {
                'User-Agent': 'RoomieConnect/1.0 (hulkster@example.com)' // Nominatim requires a User-Agent
            }
        });
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }
    } catch (error) {
        console.error('Nominatim API error:', error.message);
    }
    return null;
}

// --- API Endpoints ---

// User Management
app.post('/register', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).send({ error: 'Name and email are required' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).send({ error: 'User with this email already exists' });
    }
    const newUser = { id: nextUserId++, name, email };
    users.push(newUser);
    console.log('New user registered:', newUser);
    res.status(201).send(newUser);
});

app.post('/login', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).send({ error: 'Email is required' });
    }
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).send({ error: 'User not found. Please register first.' });
    }
    res.send(user);
});



// --- Profile API (backend owns Firebase storage; frontend fetches from backend) ---

// Create or update a profile (full profile object). Persists to Firebase.
app.post('/profile', async (req, res) => {
    const profile = req.body;
    if (!profile || !profile.id) {
        return res.status(400).json({ error: 'Profile and profile.id are required' });
    }
    try {
        const saved = await saveProfileToFirebase(profile);
        if (saved) {
            console.log('Profile saved to Firebase:', profile.name || profile.id);
            return res.status(200).json(saved);
        }
    } catch (e) {
        console.error('Firebase save error:', e);
        // Fall through to in-memory so app still works without Firebase
    }
    // Fallback: in-memory when Firebase not configured or write failed
    const existingIndex = profiles.findIndex(p => p.userId === profile.id);
    const payload = { ...profile, userId: profile.userId || profile.id };
    if (existingIndex >= 0) {
        profiles[existingIndex] = { ...profiles[existingIndex], ...payload };
        return res.status(200).json(profiles[existingIndex]);
    }
    profiles.push(payload);
    return res.status(201).json(payload);
});

// Legacy submit (answers + score). Also persists to Firebase.
app.post('/submit', async (req, res) => {
    const { id, name, answers, score, image, major, location } = req.body;
    if (!name || !answers || score === undefined) {
        return res.status(400).send({ error: 'Missing name, answers, or score' });
    }

    const coordinates = location ? await getCoordinates(location) : null;
    const userId = id;

    const profileForFirebase = {
        id: userId,
        userId,
        name,
        answers,
        score,
        image: image || '',
        major: major || '',
        location: location || '',
        coordinates,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
    };

    try {
        const saved = await saveProfileToFirebase(profileForFirebase);
        if (saved) {
            console.log('Profile submitted to Firebase:', name);
            return res.status(201).json(saved);
        }
    } catch (e) {
        console.error('Firebase submit error:', e);
    }

    const existingIndex = profiles.findIndex(p => p.userId === userId);
    const profilePayload = {
        id: userId,
        profileId: existingIndex >= 0 ? profiles[existingIndex].profileId : nextId++,
        userId,
        name,
        answers,
        score,
        image: image || '',
        major: major || '',
        location: location || '',
        coordinates,
        timestamp: new Date(),
    };

    if (existingIndex >= 0) {
        profiles[existingIndex] = profilePayload;
        return res.status(200).send(profilePayload);
    }
    profiles.push(profilePayload);
    return res.status(201).send(profilePayload);
});

app.get('/match/:id', (req, res) => {
    const profileId = parseInt(req.params.id, 10);
    const currentUserProfile = profiles.find(p => p.profileId === profileId);

    if (!currentUserProfile) {
        return res.status(404).send({ error: 'User profile not found' });
    }

    const matches = profiles
        .filter(p => p.profileId !== profileId)
        .map(otherUser => {
            // Calculate compatibility based on normalized answers
            let compatibilityScore = 0;
            let totalQuestions = 0;
            
            // Compare answers for each question
            currentUserProfile.answers.forEach(currentAnswer => {
                const otherAnswer = otherUser.answers.find(a => a.questionId === currentAnswer.questionId);
                if (otherAnswer) {
                    totalQuestions++;
                    if (currentAnswer.answer === otherAnswer.answer) {
                        compatibilityScore += 1; // Perfect match
                    } else if (currentAnswer.answer && otherAnswer.answer) {
                        // Check for similar answers (e.g., "yes" vs "yeah")
                        const currentLower = currentAnswer.answer.toLowerCase();
                        const otherLower = otherAnswer.answer.toLowerCase();
                        if (currentLower.includes(otherLower) || otherLower.includes(currentLower)) {
                            compatibilityScore += 0.8; // Similar match
                        } else {
                            compatibilityScore += 0.2; // Different answers
                        }
                    }
                }
            });
            
            // Calculate percentage
            const compatibility = totalQuestions > 0 ? (compatibilityScore / totalQuestions) * 100 : 0;
            
            let distance = 'N/A';
            if (currentUserProfile.coordinates && otherUser.coordinates) {
                const distInMiles = getDistance(
                    currentUserProfile.coordinates.lat,
                    currentUserProfile.coordinates.lng,
                    otherUser.coordinates.lat,
                    otherUser.coordinates.lng
                );
                distance = `${Math.round(distInMiles)} mi`;
            }
            
        return {
                userId: otherUser.userId,
                profileId: otherUser.profileId,
            name: otherUser.name,
            compatibility: compatibility.toFixed(2),
                distance,
                location: otherUser.location || 'N/A',
                score: otherUser.score,
                answers: otherUser.answers,
                image: otherUser.image || '',
                major: otherUser.major || '',
                allergyInfo: getCleanAllergyInfo(otherUser.answers)
            };
        })
        .sort((a, b) => b.compatibility - a.compatibility);
    
    res.send({ matches: matches.slice(0, 3) });
});

function normalizeProfile(profile) {
    if (!profile) return profile;
    if (!profile.id && profile.userId) return { ...profile, id: profile.userId };
    return profile;
}

// Get one profile (from Firebase, fallback in-memory)
app.get('/profile/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        let userProfile = await getProfileFromFirebase(userId);
        if (!userProfile) {
            userProfile = profiles.find(p => p.userId === userId);
        }
        res.send({ hasProfile: !!userProfile, profile: normalizeProfile(userProfile) });
    } catch (e) {
        console.error('Profile fetch error:', e);
        const userProfile = profiles.find(p => p.userId === userId);
        res.send({ hasProfile: !!userProfile, profile: normalizeProfile(userProfile) });
    }
});

// List all profiles (from Firebase, fallback in-memory)
app.get('/profiles', async (req, res) => {
    try {
        let list = await getAllProfilesFromFirebase();
        if (!list || list.length === 0) {
            list = profiles;
        }
        res.json(list.map(normalizeProfile));
    } catch (e) {
        console.error('Profiles fetch error:', e);
        res.json(profiles.map(normalizeProfile));
    }
});

// Debug endpoint: Reset all profiles
app.post('/reset-profiles', (req, res) => {
    profiles.length = 0;
    nextId = 1;
    res.send({ success: true, message: 'All profiles reset.' });
});

// --- Chat API (Firebase in backend only; browser gets data via these routes) ---
app.post('/chat/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;
    const { text, senderId, senderName, type } = req.body;
    if (!chatId || !text || !senderId) {
        return res.status(400).json({ error: 'chatId, text, senderId required' });
    }
    try {
        const messageId = await pushMessage(chatId, {
            text,
            senderId,
            senderName: senderName || 'User',
            type: type || 'text',
        });
        if (!messageId) return res.status(503).json({ error: 'Chat storage unavailable' });
        const messages = await getMessages(chatId);
        const last = messages[messages.length - 1];
        await updateLastMessage(chatId, last || { text, senderId });
        res.status(201).json({ success: true, messageId });
    } catch (e) {
        console.error('Chat send error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/chat/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;
    try {
        const messages = await getMessages(chatId);
        res.json(messages);
    } catch (e) {
        console.error('Chat history error:', e);
        res.status(500).json([]);
    }
});

app.post('/chat/:chatId/typing', async (req, res) => {
    const { chatId } = req.params;
    const { userId, isTyping } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
        await setTyping(chatId, userId, !!isTyping);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.get('/chat/:chatId/typing', async (req, res) => {
    const { chatId } = req.params;
    try {
        const typing = await getTyping(chatId);
        res.json(typing);
    } catch (e) {
        res.json({});
    }
});

app.post('/chat', async (req, res) => {
    const { chatId, participants } = req.body;
    if (!chatId || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'chatId and participants required' });
    }
    try {
        const ok = await createChat(chatId, participants);
        res.json({ success: ok });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.post('/users/:userId/online', async (req, res) => {
    const { userId } = req.params;
    const { name } = req.body;
    try {
        await setOnlineStatus(userId, { online: true, name: name || null });
        await setLastActivity(userId);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.post('/users/:userId/offline', async (req, res) => {
    const { userId } = req.params;
    try {
        await setOnlineStatus(userId, { online: false });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.post('/users/:userId/activity', async (req, res) => {
    const { userId } = req.params;
    try {
        await setLastActivity(userId);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.get('/users/:userId/online', async (req, res) => {
    const { userId } = req.params;
    try {
        const last = await getLastActivity(userId);
        if (!last) return res.json({ online: false });
        const thirtySecondsAgo = Date.now() - 30 * 1000;
        res.json({ online: last > thirtySecondsAgo });
    } catch (e) {
        res.json({ online: false });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
}); 