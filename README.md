# 🏠 Roomie Connect - AI-Powered Roommate Matching App

A sophisticated, modern roommate matching application built with React.js, featuring AI-powered matching algorithms, real-time messaging, and a beautiful dark/light theme toggle system.

## ✨ Features

### 🎨 **Modern UI/UX Design**
- **Dark/Light Theme Toggle** - Seamlessly switch between themes
- **Indigo/Purple Color Scheme** - Professional, modern aesthetic
- **VR Headset Logo Design** - Unique branding throughout the app
- **Responsive Design** - Works perfectly on all devices
- **Smooth Animations** - Professional transitions and effects

### 🤖 **AI-Powered Matching**
- **Smart Algorithm** - Intelligent roommate compatibility scoring
- **Profile Matching** - Find perfect roommates based on preferences
- **Real-time Updates** - Live profile synchronization
- **Match Percentage** - Clear compatibility indicators

### 💬 **Communication Features**
- **Real-time Messaging** - Instant chat with potential roommates
- **Firebase Integration** - Reliable message delivery
- **Chat History** - Never lose important conversations
- **Notification System** - Stay updated on new messages

### 🔐 **Authentication & Security**
- **Auth0 Integration** - Secure, enterprise-grade authentication
- **User Profiles** - Comprehensive roommate profiles
- **Privacy Controls** - Secure data handling
- **Session Management** - Persistent login states

## 🖼️ Screenshots

### 🏠 **Welcome Screen**
![Welcome Screen](screenshots/welcome-screen.png)
*Dark-themed welcome screen with VR headset logo and theme toggle*

### 💬 **Chat Interface**
![Chat Interface](screenshots/chat-interface.png)
*Real-time messaging with dark theme and purple accents*

### 👥 **Match Cards**
![Match Cards](screenshots/match-cards.png)
*User profile cards with matching percentages and details*

### ⚙️ **Help & Navigation**
![Help & Navigation](screenshots/help-navigation.png)
*Comprehensive help menu and navigation controls*

### 📱 **Loading & Profile Building**
![Loading & Profile](screenshots/loading-profile.png)
*Profile building interface with progress indicators*

## 🚀 **Getting Started**

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Auth0 account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rahul-Kaura/RoomieConnectWorkingApp.git
   cd RoomieConnectWorkingApp
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create .env files with your credentials
   cp .env.example .env
   ```

4. **Start the application**
   ```bash
   # Frontend (in frontend directory)
   npm start
   
   # Backend (in backend directory)
   npm start
   ```

## 🛠️ **Tech Stack**

### **Frontend**
- **React.js** - Modern UI framework
- **CSS3** - Advanced styling with animations
- **Firebase** - Real-time database and messaging
- **Auth0** - Authentication service

### **Backend**
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Firebase Admin** - Backend services
- **WebSocket** - Real-time communication

### **Infrastructure**
- **Firebase Hosting** - Frontend deployment
- **Firebase Functions** - Serverless backend
- **GitHub Actions** - CI/CD pipeline

## 🎯 **Key Components**

### **Theme System**
- **Dark Theme** - Default modern aesthetic
- **Light Theme** - Clean, bright alternative
- **Theme Persistence** - Remembers user preferences
- **Smooth Transitions** - Beautiful theme switching

### **Matching Algorithm**
- **Compatibility Scoring** - AI-powered matching
- **Profile Analysis** - Comprehensive user evaluation
- **Real-time Updates** - Live matching results
- **Filtering Options** - Customizable preferences

### **User Interface**
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliant
- **Performance** - Optimized for speed
- **Cross-browser** - Works everywhere

## 🔧 **Configuration**

### **Environment Variables**
```env
# Firebase
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id

# Auth0
REACT_APP_AUTH0_DOMAIN=your_domain
REACT_APP_AUTH0_CLIENT_ID=your_client_id
```

### **Firebase Setup**
1. Create a new Firebase project
2. Enable Authentication, Firestore, and Hosting
3. Add your web app configuration
4. Set up security rules

### **Auth0 Setup**
1. Create an Auth0 application
2. Configure callback URLs
3. Set up user management
4. Configure social connections

## 📱 **Deployment**

### **Frontend (Firebase Hosting)**
```bash
cd frontend
npm run build
firebase deploy
```

### **Backend (Firebase Functions)**
```bash
cd backend
firebase deploy --only functions
```

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Team**

- **Rahul** - Lead Developer & UI/UX Designer
- **Ryan** - Backend Development & API Design
- **Andreas** - Frontend Development
- **Arnav** - Testing & Quality Assurance
- **Vedant** - DevOps & Deployment
- **Kent** - Documentation & Support

## 🙏 **Acknowledgments**

- **AI Integration** - Powered by advanced machine learning algorithms
- **Firebase Team** - Excellent backend services
- **Auth0** - Secure authentication solutions
- **React Community** - Amazing open-source framework

## 📞 **Support**

- **Issues** - [GitHub Issues](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/issues)
- **Discussions** - [GitHub Discussions](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/discussions)
- **Email** - support@roomieconnect.com

---

<div align="center">

**Made with ❤️ by the Roomie Connect Team**

*Connecting roommates, one match at a time*

[![GitHub stars](https://img.shields.io/github/stars/Rahul-Kaura/RoomieConnectWorkingApp?style=social)](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Rahul-Kaura/RoomieConnectWorkingApp?style=social)](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/network/members)
[![GitHub issues](https://img.shields.io/github/issues/Rahul-Kaura/RoomieConnectWorkingApp)](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/issues)
[![GitHub license](https://img.shields.io/github/license/Rahul-Kaura/RoomieConnectWorkingApp)](https://github.com/Rahul-Kaura/RoomieConnectWorkingApp/blob/main/LICENSE)

</div>
