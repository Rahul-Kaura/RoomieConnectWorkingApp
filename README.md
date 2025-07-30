# 🏠 RoomieConnect - Smart Roommate Matching App

A modern, intelligent roommate matching application that uses advanced algorithms to connect compatible roommates based on lifestyle preferences, location, and personality traits.

## ✨ Features

### 🎯 **Smart Matching Algorithm**
- **Keyword-based compatibility scoring** for precise matches
- **Multi-criteria sorting**: Pinned matches, unread notifications, distance, compatibility
- **Real-time distance calculation** using external APIs
- **Location-based matching** with automatic geolocation detection

### 💬 **Real-Time Messaging**
- **Instant messaging** between matched users
- **Unread message notifications** with real-time counters
- **Typing indicators** and online/offline status
- **Message persistence** with Firebase Realtime Database

### 🎨 **Modern UI/UX with Cool Animations**
- **Smooth screen transitions** with fade-in slide effects
- **Cool loading animations** with color-changing spinners
- **"Powered by AI" animation** with cycling dots
- **Interactive match cards** with pin/unpin functionality
- **Custom avatars** with fallback initials
- **Bouncing RoomieConnect logo** for navigation
- **Professional loading experience** with 2-second animations

### ⚙️ **User Management**
- **Firebase Authentication** (Email/Password & Google Sign-in)
- **Profile customization** with settings screen
- **Age validation** (18-25 years)
- **Instagram handle integration**
- **Allergy information tracking**

### 📍 **Location Services**
- **Automatic location detection** using browser geolocation
- **Reverse geocoding** to get city/state from coordinates
- **Accurate distance calculation** between users
- **Multiple distance API fallbacks** for reliability

### 🔔 **Smart Notifications**
- **Real-time unread message counts**
- **Bouncing notification badges**
- **Total notification counter**
- **Persistent notification state**

### 🎭 **Enhanced Animations**
- **Color-changing loading spinner** (teal → blue → purple → red)
- **Pulsing scale effects** and glowing shadows
- **Smooth 0.3-0.5s transitions** between all screens
- **Cycling dots animation** for "Powered by AI" text
- **Professional loading experience** with consistent timing

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Modern web browser with geolocation support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/roomieconnect.git
   cd roomieconnect
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project
   - Enable Authentication (Email/Password & Google)
   - Create a Realtime Database
   - Update `frontend/src/firebase.js` with your config

4. **Environment Configuration**
   ```bash
   # Create .env file in frontend directory
   cd frontend
   cp .env.example .env
   # Add your Firebase configuration
   ```

5. **Start the application**
   ```bash
   # Start backend (from root directory)
   npm run server
   
   # Start frontend (from frontend directory)
   cd frontend
   npm start
   ```

## 🏗️ Architecture

### Frontend (React.js)
- **React 18** with functional components and hooks
- **Firebase SDK** for authentication and real-time database
- **Enhanced CSS3 animations** for smooth user experience
- **Responsive design** with mobile-first approach
- **Cool loading animations** and smooth transitions

### Backend (Node.js/Express)
- **Express.js** server for API endpoints
- **Firebase Admin SDK** for server-side operations
- **CORS enabled** for cross-origin requests
- **Error handling** and validation

### Database (Firebase)
- **Firebase Realtime Database** for real-time features
- **Firebase Authentication** for user management
- **Structured data** for profiles, matches, and messages

## 📱 Key Components

### Welcome Screen
- **Interactive welcome screen** with "Click anywhere to start"
- **Personalized welcome message** for returning users
- **"Powered by AI" animation** with cycling dots
- **Smooth transitions** to next screen

### Loading Experience
- **Cool color-changing spinner** animation
- **2-second loading duration** for smooth experience
- **Pulsing text effects** and glowing shadows
- **Professional loading screen** design

### Chatbot Questionnaire
- **Interactive questionnaire** with keyword validation
- **Smart answer normalization** for better matching
- **Location detection** integration
- **Profile image upload** support

### Match Results
- **2-column grid layout** with scroll functionality
- **Pin/unpin matches** for priority sorting
- **Real-time distance display**
- **Compatibility percentage** calculation

### Messaging System
- **Real-time chat interface**
- **Message history** persistence
- **Unread message tracking**
- **Online status indicators**

### Settings Screen
- **Profile editing** capabilities
- **Location detection** button
- **Form validation** and error handling
- **Real-time updates** to match results

## 🔧 Configuration

### Distance APIs
The app supports multiple distance calculation APIs:

1. **Google Maps Distance Matrix** (Most accurate, requires API key)
2. **Free Distance Matrix API** (No key required, currently enabled)
3. **Fallback calculation** (Always available, mathematical)

Configure in `frontend/src/config.js`:
```javascript
export const DISTANCE_API_CONFIG = {
    GOOGLE_MAPS: {
        enabled: false,
        apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
        url: 'https://maps.googleapis.com/maps/api/distancematrix/json'
    },
    FREE_DISTANCE: {
        enabled: true,
        url: 'https://api.distancematrix.ai/maps/api/distancematrix/json'
    }
};
```

### Firebase Configuration
Update `frontend/src/firebase.js` with your Firebase project details:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
1. **Build the project**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Deploy to Netlify**
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `build`

### Backend Deployment (Heroku/Railway)
1. **Prepare for deployment**
   ```bash
   cd backend
   # Ensure package.json has start script
   ```

2. **Deploy to Heroku**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

3. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FIREBASE_PROJECT_ID=your-project-id
   ```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Welcome screen with smooth transitions
- [ ] Loading screen animations
- [ ] Questionnaire completion
- [ ] Match generation and display
- [ ] Real-time messaging
- [ ] Location detection
- [ ] Settings updates
- [ ] Pin/unpin functionality
- [ ] Mobile responsiveness

### Browser Compatibility
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (not supported)

## 🔒 Security Features

- **Firebase Authentication** with secure token management
- **Input validation** and sanitization
- **CORS protection** on backend
- **Environment variable** protection
- **Secure API key** management

## 📊 Performance Optimizations

- **Lazy loading** for match results
- **Optimized animations** with CSS transforms
- **Efficient state management** with React hooks
- **Cached distance calculations**
- **Compressed images** and assets
- **Smooth transitions** for better perceived performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the Firebase documentation
- Review the browser console for errors

## 🎉 Acknowledgments

- Firebase for backend services
- React team for the amazing framework
- OpenStreetMap for geocoding services
- Distance Matrix APIs for location calculations

---

**Made with ❤️ for better roommate connections** 