const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

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
// Test profiles for development
const profiles = [
    {
        id: 1,
        userId: 'test-user-1',
        name: 'Alex Chen',
        age: '22',
        major: 'Computer Science',
        location: 'Berkeley, CA',
        lat: 37.8715,
        lng: -122.2730,
        image: 'https://randomuser.me/api/portraits/men/32.jpg',
        instagram: 'alexchen_cs',
        allergies: 'No allergies',
        answers: [
            { questionId: 'intro', answer: 'morning' },
            { questionId: 'cleanliness', answer: 'tidy' },
            { questionId: 'noise', answer: 'quiet' },
            { questionId: 'guests', answer: 'private' },
            { questionId: 'smoking', answer: 'no' }
        ]
    },
    {
        id: 2,
        userId: 'test-user-2',
        name: 'Jacob',
        age: '21',
        major: 'Engineering',
        location: 'San Francisco, CA',
        lat: 37.7749,
        lng: -122.4194,
        image: 'https://randomuser.me/api/portraits/men/75.jpg',
        instagram: 'jacob_eng',
        allergies: 'No allergies',
        answers: [
            { questionId: 'intro', answer: 'night' },
            { questionId: 'cleanliness', answer: 'relaxed' },
            { questionId: 'noise', answer: 'music' },
            { questionId: 'guests', answer: 'merrier' },
            { questionId: 'smoking', answer: 'bothers me' }
        ]
    }
];
let nextId = 6;
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



// Profile & Matching
app.post('/submit', async (req, res) => {
    const { id, name, answers, score, image, major, location } = req.body;
    if (!name || !answers || score === undefined) {
        return res.status(400).send({ error: 'Missing name, answers, or score' });
    }

    const coordinates = location ? await getCoordinates(location) : null;

    const newProfile = {
        profileId: nextId++,
        userId: id, // This is now a string (Auth0 user.sub)
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

app.get('/profile/user/:userId', (req, res) => {
    const userId = req.params.userId; // Use string, not parseInt
    const userProfile = profiles.find(p => p.userId === userId);
    console.log('Profile lookup for userId:', userId, 'Found:', !!userProfile);
    res.send({ hasProfile: !!userProfile, profile: userProfile });
});

// Debug endpoint: List all profiles
app.get('/profiles', (req, res) => {
    res.json(profiles);
});

// Debug endpoint: Reset all profiles
app.post('/reset-profiles', (req, res) => {
    profiles.length = 0;
    nextId = 1;
    res.send({ success: true, message: 'All profiles reset.' });
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
}); 