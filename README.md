# FindHousing - Smart Real-Time Roommate Matching App

FindHousing is an intelligent web application that helps you find the perfect roommate by considering not just personality and lifestyle, but also distance, match percentage, and real-time communication. The app uses a conversational AI chatbot to collect user preferences, calculates compatibility scores, and enables instant messaging between matches.

## Key Features

- **Conversational AI Chatbot**: Users answer questions in a friendly, chat-based interface, making the onboarding process engaging and natural.
- **Smart Matching Algorithm**: Matches are determined using a weighted scoring system that takes into account lifestyle, habits, and preferences.
- **Distance Awareness**: The app factors in your location and shows how far away your top matches are, so you can find roommates nearby or in your preferred area.
- **Match Percentage**: Each match is ranked by a compatibility percentage, so you can see at a glance who is most compatible with you.
- **Real-Time Messaging**: Instantly chat with your matches using a modern, responsive chat interface powered by Stream Chat for seamless, live conversations.
- **Modern Full-Stack Architecture**: Built with React (frontend) and Node.js/Express (backend) for a fast, smooth user experience.

## Tech Stack

- **Frontend**: React.js, Axios, Sentiment
- **Backend**: Node.js, Express.js, Stream Chat API

## How It Works

1. **Sign Up & Chatbot Onboarding**: New users are guided through a series of questions by the AI chatbot to build a detailed roommate profile.
2. **Smart Matching**: The backend calculates compatibility scores, taking into account your answers and location.
3. **See Your Matches**: View your top matches, including their match percentage and distance from you.
4. **Start a Conversation**: Click to start a real-time chat with any of your matches and get to know them instantly.

## Getting Started

1. **Clone the Repository**
    ```bash
    git clone https://github.com/Rahul-Kaura/FindHousing-Real-time-Messaging-.git
    cd FindHousing-Real-time-Messaging-
    ```
2. **Install Dependencies**
    ```bash
    # Backend
    cd backend
    npm install
    # Frontend
    cd ../frontend
    npm install
    ```
3. **Run the App**
    - Start the backend:
    ```bash
      cd backend
    node index.js
    ```
    - Start the frontend:
    ```bash
      cd ../frontend
    npm start
    ```
    - Open [http://localhost:3000](http://localhost:3000) in your browser.

## Real-Time Messaging

FindHousing uses [Stream Chat](https://getstream.io/chat/) to enable live, real-time messaging between users. Once matched, you can chat instantly—no refresh needed, and all messages are delivered in real time.

---

**Note:** This project currently uses in-memory storage for rapid prototyping. For production, a persistent database is recommended. 