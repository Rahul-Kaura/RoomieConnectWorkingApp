const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { StreamChat } = require('stream-chat');

const app = express();
const port = 3001;

// GetStream.io Credentials
const streamApiKey = 'dvs4w5jx9dyc';
const streamApiSecret = 'cxap2747ujezft5v8kf477v3ugrsyv9qbnb2gtzwk3vvtf34tz4asfvs847k9up5';
const streamClient = StreamChat.getInstance(streamApiKey, streamApiSecret);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- State Management ---
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
        return res.status(401).send({ error: 'Invalid credentials' });
    }
    res.send(user);
});

// GetStream Token Generation
app.post('/getstream-token', async (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) {
        return res.status(400).send({ error: 'User ID and name are required' });
    }

    try {
        // Create or update the user in GetStream
        await streamClient.upsertUser({
            id: userId.toString(),
            name: name,
            // You can add other custom fields here, like a profile image
        });

        // Create a token for the user
        const token = streamClient.createToken(userId.toString());
        res.send({ token });
    } catch (error) {
        console.error('GetStream token generation error:', error);
        res.status(500).send({ error: 'Could not generate GetStream token' });
    }
});

// Profile & Matching
app.post('/submit', async (req, res) => {
    const { id, name, answers, score, image, major, location } = req.body;
    if (!name || !answers || score === undefined) {
        return res.status(400).send({ error: 'Missing name, answers, or score' });
    }

    const coordinates = location ? await getCoordinates(location) : null;

    const newProfile = {
        profileId: nextId++,
        userId: id,
        name,
        answers,
        score,
        image: image || '',
        major: major || '',
        location: location || '',
        coordinates,
        timestamp: new Date()
    };

    profiles.push(newProfile);
    console.log('New profile submitted:', newProfile);
    res.status(201).send(newProfile);
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
            const scoreDifference = Math.abs(currentUserProfile.score - otherUser.score);
            const compatibility = Math.max(0, 100 - (scoreDifference * 10));
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

app.get('/profile/user/:userId', (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const userProfile = profiles.find(p => p.userId === userId);
    res.send({ hasProfile: !!userProfile, profile: userProfile });
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
}); 