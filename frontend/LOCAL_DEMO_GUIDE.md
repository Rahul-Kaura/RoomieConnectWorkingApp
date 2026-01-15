# 🚀 Local Frontend Demo Guide

This guide will help you run the RoomieConnect frontend application on your local machine for testing and development.

## ⚡ Quick Start (Automated)

For a faster setup, you can use our quick start scripts:

### Mac/Linux:
```bash
cd frontend
./quick-start.sh
```

### Windows:
```cmd
cd frontend
quick-start.bat
```

The script will:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Create `.env` file from `.env.example` if needed
- ✅ Install dependencies automatically
- ✅ Start the development server

**Note:** You'll still need to configure your `.env` file with your credentials before the app will work fully.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (for cloning the repository)

### Verify Installation

```bash
node --version   # Should show v14.x.x or higher
npm --version    # Should show 6.x.x or higher
```

## 🔧 Step 1: Environment Setup

### Create Environment Variables File

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Create a `.env` file in the `frontend` directory:
   ```bash
   touch .env
   ```

3. Add the following environment variables to your `.env` file:

```env
# Auth0 Configuration (Required)
REACT_APP_AUTH0_DOMAIN=dev-s2103new01u1y2di.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=drjmUYWyCnE4JOZZdcpmax2D5m2HmeAt

# Firebase Configuration (Required)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_DATABASE_URL=your_firebase_database_url
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id

# Optional: Claude API (for AI-powered features)
REACT_APP_CLAUDE_API_KEY=your_claude_api_key_here

# Optional: Gemini API (for chatbot features)
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. Click on the web app icon `</>`
6. Copy the configuration values from the `firebaseConfig` object

**Note:** If you don't have Firebase credentials yet, you can use the existing project mentioned in `SETUP_COMPLETE.md`:
- Project ID: `hulkster-31e55`

## 📦 Step 2: Install Dependencies

1. Make sure you're in the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install all required dependencies:
   ```bash
   npm install
   ```

   This will install all packages listed in `package.json` (React, Firebase, Auth0, etc.)

   **Expected output:** Should complete without errors and show a list of installed packages.

   **Note:** This may take a few minutes on first install.

## 🎯 Step 3: Start the Development Server

1. Start the React development server:
   ```bash
   npm start
   ```

2. The application will automatically:
   - Start the development server
   - Open your default browser to `http://localhost:3000`
   - Enable hot-reload (changes will refresh automatically)

3. You should see the RoomieConnect welcome screen!

## 🧪 Step 4: Testing the Application

### Basic Functionality Tests

1. **Welcome Screen**
   - ✅ Verify the welcome screen loads
   - ✅ Check theme toggle (dark/light mode)
   - ✅ Verify animations are working

2. **Authentication**
   - ✅ Click "Login" or "Get Started"
   - ✅ Complete Auth0 login flow
   - ✅ Verify you're redirected back to the app
   - ✅ Check that your profile loads

3. **Profile Creation**
   - ✅ Complete the questionnaire
   - ✅ Verify profile is saved
   - ✅ Check that matches appear

4. **Messaging**
   - ✅ Click on a match
   - ✅ Send a test message
   - ✅ Verify message appears in real-time
   - ✅ Check message history persists

5. **Theme Switching**
   - ✅ Toggle between dark and light themes
   - ✅ Verify theme persists on page refresh
   - ✅ Check all UI elements adapt correctly

### Testing Checklist

- [ ] App loads without errors
- [ ] Auth0 login works
- [ ] Profile creation works
- [ ] Matches are displayed
- [ ] Messaging works
- [ ] Theme toggle works
- [ ] Responsive design (test on mobile)
- [ ] No console errors

## 🔍 Step 5: Development Tips

### Running on a Different Port

If port 3000 is already in use:

```bash
PORT=3001 npm start
```

Or create a `.env` file entry:
```env
PORT=3001
```

### Viewing Console Logs

Open your browser's Developer Tools:
- **Chrome/Edge:** `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- **Firefox:** `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- **Safari:** `Cmd+Option+I` (enable Developer menu first)

### Hot Reload

The development server supports hot-reload:
- Save any file in `src/` directory
- Changes will automatically refresh in the browser
- No need to manually refresh!

## 🐛 Troubleshooting

### Issue: "Port 3000 is already in use"

**Solution:**
```bash
# Option 1: Use a different port
PORT=3001 npm start

# Option 2: Kill the process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Auth0 configuration missing"

**Solution:**
1. Verify your `.env` file exists in the `frontend` directory
2. Check that environment variables start with `REACT_APP_`
3. Restart the development server after adding/changing `.env` variables
4. Make sure there are no spaces around the `=` sign in `.env`

### Issue: "Firebase connection errors"

**Solution:**
1. Verify all Firebase environment variables are set correctly
2. Check Firebase project is active in Firebase Console
3. Ensure Firebase Realtime Database is enabled
4. Verify Firebase security rules allow your operations
5. Check browser console for specific error messages

### Issue: "npm install fails"

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try installing with verbose output
npm install --verbose

# If using Node v17+, you may need to use legacy OpenSSL
export NODE_OPTIONS=--openssl-legacy-provider
npm start
```

### Issue: "App loads but shows blank screen"

**Solution:**
1. Check browser console for JavaScript errors
2. Verify all environment variables are set
3. Check network tab for failed API calls
4. Ensure backend server is running (if required)
5. Try clearing browser cache and hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)

### Issue: "Hot reload not working"

**Solution:**
1. Save the file again (sometimes needed)
2. Check file watcher limits (especially on Linux)
3. Restart the development server
4. Check if file is being ignored by `.gitignore`

## 📱 Testing on Mobile Devices

### Option 1: Network Access (Same WiFi)

1. Find your computer's local IP address:
   ```bash
   # Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows:
   ipconfig
   ```

2. Start the dev server with host binding:
   ```bash
   HOST=0.0.0.0 npm start
   ```

3. On your mobile device, navigate to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

### Option 2: Use ngrok (Tunnel)

1. Install ngrok: [https://ngrok.com/](https://ngrok.com/)
2. Start your dev server: `npm start`
3. In another terminal:
   ```bash
   ngrok http 3000
   ```
4. Use the ngrok URL on your mobile device

## 🎨 Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (irreversible)
npm run eject
```

## 📚 Additional Resources

- **React Documentation:** [https://react.dev/](https://react.dev/)
- **Firebase Docs:** [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **Auth0 Docs:** [https://auth0.com/docs](https://auth0.com/docs)
- **Create React App:** [https://create-react-app.dev/](https://create-react-app.dev/)

## 🎉 Success!

If you've followed all steps, you should now have:
- ✅ Frontend running on `http://localhost:3000`
- ✅ All dependencies installed
- ✅ Environment variables configured
- ✅ Application ready for testing and development

## 🆘 Need Help?

- Check the main `README.md` for project overview
- Review `SETUP_COMPLETE.md` for setup status
- Check `MESSAGING_SETUP.md` for messaging configuration
- Review browser console for specific error messages
- Check Firebase Console for database issues

---

**Happy Testing! 🚀**
