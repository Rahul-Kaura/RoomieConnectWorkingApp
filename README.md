# RoomieConnect - AI-Powered Roommate Matching Platform

## 🏠 Overview

RoomieConnect is a sophisticated AI-powered platform that helps college students and young professionals find compatible roommates through intelligent matching algorithms and real-time communication features.

## ✨ Key Features

### 🤖 **AI-Powered Roommate Specialist**
- **Claude Sonnet 3.5 Integration** - Advanced AI analysis of user responses
- **Intelligent Background Gathering** - Comprehensive initial question with AI-powered analysis
- **Dynamic Follow-up Questions** - 2-3 personalized questions based on AI analysis of responses
- **Smart Compatibility Scoring** - AI-generated compatibility factors and final scores (0-100)
- **Detailed Profile Analysis** - Comprehensive summaries and roommate recommendations
- **Fallback Mode** - Graceful degradation when AI is unavailable

### 🎯 **Intelligent Matching Algorithm**
- Compatibility scoring based on lifestyle preferences
- Location-based distance calculations
- Weighted question responses for accurate matching
- Real-time match percentage display

### 💬 **Real-Time Messaging**
- Firebase-powered instant messaging
- Typing indicators and online status
- Unread message notifications
- Professional messaging UI with animations

### 📱 **Responsive Design**
- Desktop-optimized layout (450px chatbot container)
- Mobile-first responsive design
- Touch-friendly interface elements
- Consistent user experience across devices

### ⭐ **Advanced User Management**
- Pin favorite matches for priority display
- Smart sorting: pinned → unread → recent → distance
- **Expandable Profile Cards** - View detailed background summaries and compatibility factors
- **AI-Generated Insights** - See comprehensive analysis of each potential roommate
- Carousel navigation with page indicators

## 🛠 Technology Stack

### **Frontend**
- **React** - Component-based UI framework
- **CSS3** - Custom styling with animations and responsive design
- **Auth0** - User authentication and authorization
- **Firebase Realtime Database** - Profile storage and real-time messaging
- **Axios** - HTTP client for API communication

### **Backend**
- **Node.js** - Server runtime environment
- **Express.js** - Web application framework
- **CORS** - Cross-origin resource sharing
- **Geolocation APIs** - Distance calculation and location services

### **Deployment**
- **Frontend**: Vercel (https://roomieconnectworkingapp.vercel.app)
- **Backend**: Render (https://roomieconnect-backend.onrender.com)
- **Database**: Firebase Realtime Database
- **Authentication**: Auth0

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Firebase account and project
- Auth0 account and application
- Git for version control

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Rahul-Kaura/RoomieConnectWorkingApp.git
cd RoomieConnectWorkingApp
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Create .env file with your configurations
REACT_APP_AUTH0_DOMAIN=your-auth0-domain
REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
REACT_APP_FIREBASE_DATABASE_URL=your-firebase-database-url
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id

# Claude AI Integration (Optional but recommended)
REACT_APP_CLAUDE_API_KEY=your-claude-api-key

npm start
```

**Note:** For the AI-powered roommate specialist features, you'll need a Claude API key. See [CLAUDE_SETUP.md](frontend/CLAUDE_SETUP.md) for detailed setup instructions.

### 3. Backend Setup
```bash
cd backend
npm install

# Create .env file for production environment variables
PORT=3001

npm start
```

## 🔧 Configuration

### Firebase Configuration
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Configure authentication rules
4. Add your Firebase config to the frontend environment variables

### Auth0 Configuration
1. Create an Auth0 application at https://manage.auth0.com
2. Configure allowed callback URLs and logout URLs
3. Set up user management and social login providers
4. Use the provided script to create test users (see `scripts/` directory)

## 📁 Project Structure

```
RoomieConnectWorkingApp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.js
│   │   ├── Chatbot.js
│   │   ├── FirebaseChat.js
│   │   └── config.js
│   ├── public/
│   └── package.json
├── backend/
│   ├── index.js
│   └── package.json
├── scripts/
│   ├── create-auth0-test-users.js
│   ├── package.json
│   └── README.md
├── render.yaml
└── README.md
```

## 🎮 Usage

### For Users
1. **Sign Up/Login**: Use Auth0 authentication
2. **Complete Chatbot**: Answer lifestyle and preference questions
3. **Browse Matches**: View compatibility scores and profiles
4. **Pin Favorites**: Star users to keep them at the top
5. **Start Conversations**: Real-time messaging with matches

### For Developers
1. **Test Profiles**: Use provided Auth0 test accounts
2. **Profile Management**: Sync test profiles via admin scripts
3. **Monitoring**: Check Firebase console for user data
4. **Deployment**: Automatic deployment via GitHub integration

## 🔐 Authentication & Test Users

The application includes 5 pre-configured test users for development:

| Name | Email | Password | Age | Major |
|------|-------|----------|-----|-------|
| Jacob Williams | jacob.williams@test.com | TestPass123! | 22 | Computer Science |
| Emma Davis | emma.davis@test.com | TestPass123! | 21 | Biology |
| Michael Chen | michael.chen@test.com | TestPass123! | 23 | Engineering |
| Sarah Johnson | sarah.johnson@test.com | TestPass123! | 20 | Psychology |
| Alex Rodriguez | alex.rodriguez@test.com | TestPass123! | 22 | Business |

See `TEST_LOGIN_CREDENTIALS.md` for detailed compatibility testing scenarios.

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: Teal gradient (#20b2aa to #26a69a)
- **Typography**: Apple system fonts with optimized readability
- **Animations**: Subtle floating logos and hover effects
- **Icons**: Custom SVG icons for all interactive elements

### Responsive Breakpoints
- **Desktop**: 769px and above (fixed chatbot container)
- **Mobile**: 768px and below (full-screen layout)
- **Touch Optimization**: 44px minimum touch targets

### Accessibility
- High contrast ratios for text readability
- Keyboard navigation support
- Screen reader friendly markup
- Touch-friendly interaction zones

## 🔍 Troubleshooting

### Common Issues

**Chatbot not loading questions:**
- Check Firebase configuration
- Verify user authentication status
- Clear localStorage and refresh

**Matches not appearing:**
- Ensure backend is running and accessible
- Check API URL configuration in `config.js`
- Verify test profile sync in Firebase

**Authentication errors:**
- Verify Auth0 domain and client ID
- Check callback URLs in Auth0 dashboard
- Ensure HTTPS in production

**Real-time messaging issues:**
- Confirm Firebase Realtime Database rules
- Check network connectivity
- Verify user permissions

## 📊 Performance Optimizations

### Frontend
- Component lazy loading
- Image optimization and caching
- Efficient state management
- Debounced API calls

### Backend
- Optimized distance calculations
- Efficient matching algorithms
- CORS configuration for security
- Error handling and fallbacks

### Database
- Structured data organization
- Efficient queries and indexing
- Real-time sync optimization
- Data persistence strategies

## 🚀 Deployment

### Automatic Deployment
- **Frontend**: Connected to Vercel via GitHub
- **Backend**: Connected to Render via GitHub
- **Triggers**: Automatic deployment on `main` branch push

### Manual Deployment
```bash
# Frontend (Vercel)
vercel --prod

# Backend (Render)
git push origin main
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Rahul Kaura** - Initial work - [GitHub](https://github.com/Rahul-Kaura)

## 🙏 Acknowledgments

- Auth0 for authentication services
- Firebase for real-time database
- OpenStreetMap for location services
- Vercel and Render for deployment platforms

## 📞 Support

For support, email rahul.kaura@example.com or create an issue in the GitHub repository.

---

**Built with ❤️ for college students seeking the perfect roommate match!** 
# Updated Sat Aug  9 11:09:48 PDT 2025
