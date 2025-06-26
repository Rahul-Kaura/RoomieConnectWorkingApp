const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001; // Running on a different port than the frontend

app.use(cors());
app.use(bodyParser.json());

// In-memory "database" to store user profiles
const profiles = [];
let nextId = 1;

// Endpoint to submit questionnaire answers
app.post('/submit', (req, res) => {
    const { name, answers, score } = req.body;
    if (!name || !answers || score === undefined) {
        return res.status(400).send({ error: 'Missing name, answers, or score' });
    }

    const newProfile = {
        id: nextId++,
        name,
        answers,
        score,
        timestamp: new Date()
    };

    profiles.push(newProfile);
    console.log('New profile submitted:', newProfile);
    res.status(201).send({ message: 'Profile submitted successfully', profile: newProfile });
});

// Endpoint to get matches for a user
app.get('/match/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const currentUser = profiles.find(p => p.id === userId);

    if (!currentUser) {
        return res.status(404).send({ error: 'User not found' });
    }

    // Simple matching algorithm: find users with the closest overall score
    const otherUsers = profiles.filter(p => p.id !== userId);

    // First, find all potential matches within a 2-point score difference, as you suggested.
    const potentialMatches = otherUsers.filter(otherUser => {
        const scoreDifference = Math.abs(currentUser.score - otherUser.score);
        return scoreDifference <= 2;
    });

    // Now, calculate compatibility for just those potential matches.
    const matches = potentialMatches.map(otherUser => {
        const scoreDifference = Math.abs(currentUser.score - otherUser.score);
        // Lower difference is a better match. Let's create a compatibility score from 0 to 100.
        const compatibility = Math.max(0, 100 - (scoreDifference * 10));
        return {
            userId: otherUser.id,
            name: otherUser.name,
            compatibility: compatibility.toFixed(2),
            score: otherUser.score
        };
    });

    // Sort by best compatibility
    matches.sort((a, b) => b.compatibility - a.compatibility);
    
    // Return top 3 matches
    const topMatches = matches.slice(0, 3);

    res.send({ matches: topMatches });
});


app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
}); 