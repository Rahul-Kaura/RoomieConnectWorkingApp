import React, { useState, useEffect } from 'react';
import Chatbot, { MatchResultsGrid } from './Chatbot';
import Login from './Login';
import './App.css';
import AnimatedCredits from './AnimatedCredits';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { loadProfile, monitorNewProfiles, stopListeningToProfiles } from './services/firebaseProfile';
import { testMessagingSetup } from './testMessaging';
import { autoSyncTestProfiles } from './services/syncTestProfiles';
import { generateMatches, createSampleProfiles } from './services/matchingService';
// import TestGeminiDebug from './TestGeminiDebug';
// import SimpleTest from './SimpleTest';

function App() {
  const { isAuthenticated, user, isLoading, logout } = useAuth0();
  const [view, setView] = useState('homeLoading'); // Start with home loading animation
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [globalProfileMonitor, setGlobalProfileMonitor] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadingStartTime, setProfileLoadingStartTime] = useState(null);
  const [matches, setMatches] = useState([]); // Added state for matches

  // Set initial theme class on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }, []);

  // Remove auto-transition - let homeLoading stay until user clicks

  // Debug when userProfile changes
  useEffect(() => {
    console.log('=== USERPROFILE CHANGE DEBUG ===');
    console.log('userProfile changed to:', userProfile);
    console.log('Current view:', view);
    console.log('=== END USERPROFILE CHANGE DEBUG ===');
  }, [userProfile]);

  // Set currentUser from Auth0 user
  useEffect(() => {
    if (isAuthenticated && user && !currentUser) {
      // Check if user has a stored name in localStorage, otherwise use email as fallback
      const storedName = localStorage.getItem('userName');
      const userName = storedName || user.name || user.email;
      
      console.log('Auth0 User:', user);
      console.log('User ID (sub):', user.sub);
      console.log('Stored name:', storedName);
      console.log('Final userName:', userName);
      
      setCurrentUser({ id: user.sub, name: userName, email: user.email });
    }
    if (!isAuthenticated) {
      console.log('User not authenticated, clearing state');
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('userProfile');
      localStorage.removeItem('userName'); // Clear stale userName too
      setView('welcome');
    }
  }, [isAuthenticated, user]);

  // Get the display name for welcome message
  const getDisplayName = () => {
    // Priority: userProfile name > currentUser name > stored name > Auth0 user name > email
    if (userProfile && userProfile.name) {
      return userProfile.name;
    }
    if (currentUser && currentUser.name) {
      return currentUser.name;
    }
    if (user) {
      return user.name || user.email;
    }
    return localStorage.getItem('userName') || 'User';
  };

  // Check for profile in Firebase when currentUser changes
  useEffect(() => {
    // Start loading profiles immediately when we have a currentUser, even during homeLoading
    if (currentUser) {
      console.log('=== PROFILE LOADING DEBUG ===');
      console.log('Loading profile for user ID:', currentUser.id);
      console.log('Current user object:', currentUser);
      
      // Start profile loading timer
      setIsProfileLoading(true);
      setProfileLoadingStartTime(Date.now());
      
      (async () => {
        try {
          // First try to load from localStorage for faster loading
          const storedProfile = localStorage.getItem('userProfile');
          console.log('localStorage userProfile:', storedProfile);
          if (storedProfile) {
            try {
              const parsedProfile = JSON.parse(storedProfile);
              console.log('Found profile in localStorage:', parsedProfile);
              console.log('Parsed profile ID:', parsedProfile.id);
              console.log('Current user ID:', currentUser.id);
              console.log('IDs match:', parsedProfile.id === currentUser.id);
              // Only use localStorage profile if it matches the current user
              if (parsedProfile.id === currentUser.id) {
                setUserProfile(parsedProfile);
                console.log('✅ Using profile from localStorage - should go to matches!');
                // Profile loaded quickly from localStorage
                setIsProfileLoading(false);
                return; // Early return if localStorage profile is valid
              } else {
                console.log('❌ localStorage profile ID mismatch, will load from Firebase');
              }
            } catch (e) {
              console.log('❌ Error parsing localStorage profile:', e);
            }
          } else {
            console.log('❌ No profile found in localStorage');
          }
          
          // Then try to load from Firebase (this will override localStorage if different)
        const profile = await loadProfile(currentUser.id);
          console.log('Firebase loadProfile result:', profile);
        if (profile) {
          console.log('✅ Profile found in Firebase:', profile);
          setUserProfile(profile);
          localStorage.setItem('userProfile', JSON.stringify(profile));
            console.log('✅ Profile saved to localStorage');
            
            // Generate matches for this profile
            try {
              console.log('🔍 Generating matches for user profile...');
              const userMatches = await generateMatches(profile);
              console.log('✅ Generated matches:', userMatches.length);
              setMatches(userMatches);
            } catch (error) {
              console.error('❌ Error generating matches:', error);
            }
        } else {
            console.log('❌ No profile found in Firebase for user:', currentUser.id);
            // Check if we have any localStorage profile even if it doesn't match exactly
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              try {
                const parsedProfile = JSON.parse(storedProfile);
                console.log('⚠️ Using localStorage profile as fallback:', parsedProfile);
                setUserProfile(parsedProfile);
              } catch (e) {
                console.log('❌ Cannot parse localStorage fallback profile');
              }
            }
          }
        } catch (error) {
          console.error('❌ Error loading profile:', error);
          // Try to use localStorage profile as fallback
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            try {
              const parsedProfile = JSON.parse(storedProfile);
              console.log('⚠️ Using localStorage profile after Firebase error:', parsedProfile);
              setUserProfile(parsedProfile);
            } catch (e) {
              console.log('❌ Cannot parse localStorage profile after error');
            }
          }
        }
        
        // Profile loading complete (either success or failure)
        setIsProfileLoading(false);
        console.log('=== END PROFILE LOADING DEBUG ===');
      })();
    }
  }, [currentUser]);

  // Test messaging setup and create sample profiles when app loads
  useEffect(() => {
    // Run messaging test and create sample profiles after a short delay to ensure Firebase is initialized
    const timer = setTimeout(async () => {
      testMessagingSetup();
      
      // Create sample profiles for testing
      try {
        console.log('🎯 Creating sample profiles for matching...');
        await createSampleProfiles();
        console.log('✅ Sample profiles created successfully!');
      } catch (error) {
        console.error('Error creating sample profiles:', error);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Global profile monitoring for all users
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.id) {
      console.log('🌍 App: Starting global profile monitoring...');
      
      // Monitor for new profiles globally
      const monitor = monitorNewProfiles((newProfiles, allProfiles) => {
        console.log(`🆕 App: Global new profiles detected: ${newProfiles.map(p => p.name).join(', ')}`);
        
        // Show global notification about new profiles
        if (newProfiles.length > 0) {
          // Use browser notification if available
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Roommates Available!', {
              body: `${newProfiles.length} new potential roommate${newProfiles.length > 1 ? 's' : ''} just joined RoomieConnect!`,
              icon: '/logo192.png',
              tag: 'new-profiles'
            });
          }
          
          // Also show in-app notification if user is not on matches screen
          if (view !== 'matches') {
            // You could add a toast notification here
            console.log('💡 User not on matches screen, new profiles available');
          }
        }
      });
      
      setGlobalProfileMonitor(monitor);
      
      return () => {
        if (monitor) {
          console.log('🛑 App: Stopping global profile monitoring...');
          stopListeningToProfiles(monitor);
        }
      };
    }
  }, [isAuthenticated, currentUser, view]);

  const handleWelcomeContinue = () => {
    console.log('=== WELCOME CONTINUE DEBUG ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('userProfile exists:', !!userProfile);
    console.log('userProfile:', userProfile);
    
    if (isAuthenticated) {
      if (userProfile) {
        console.log('✅ User has profile, going to matches view');
        // Start custom loading screen for 5 seconds
        setView('loading');
        
        // Simple 5-second loading timer
        setTimeout(() => {
          console.log('⏰ Custom loading complete, transitioning to matches');
          setView('matches');
        }, 5000); // 5 seconds
        
      } else {
        console.log('❌ No user profile, going to chatbot');
        setView('chatbot');
      }
    } else {
      console.log('❌ Not authenticated, going to login');
      setView('login');
    }
    console.log('=== END WELCOME CONTINUE DEBUG ===');
  };

  const handleContinue = () => {
    if (userProfile) {
      setView('matches');
    } else {
      setView('chatbot');
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    // Reset app state first
    setCurrentUser(null);
    setUserProfile(null);
    setView('welcome');
    
    // Then logout from Auth0 without external redirect
    logout({ 
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    
    // Don't remove userProfile from localStorage on logout to preserve data
    // localStorage.removeItem('userProfile');
  };

  const handleUpdateUser = async (updatedProfile) => {
    console.log('🔄 Profile updated from chatbot:', updatedProfile);
    
    // Update the user profile state
    setUserProfile(updatedProfile);
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // Generate matches for the updated profile
    try {
      console.log('🔍 Generating matches for updated profile...');
      const userMatches = await generateMatches(updatedProfile);
      console.log('✅ Generated matches for updated profile:', userMatches.length);
      setMatches(userMatches);
      
      // Navigate to matches view
      setView('matches');
    } catch (error) {
      console.error('❌ Error generating matches for updated profile:', error);
      // Still navigate to matches even if generation fails
      setView('matches');
    }
  };

  const resetToHome = () => {
    setView('welcome');
  };

  const handleStartChat = (match) => {
    console.log('Starting chat with match:', match);
    // For now, show an alert with match info instead of going to chatbot
    alert(`Starting chat with ${match.name}!\n\nThis would open a chat window in a real app.\n\nMatch details:\n- Compatibility: ${match.compatibilityScore}%\n- Major: ${match.major}\n- Bio: ${match.bio || 'No bio available'}`);
  };

  const handleOpenSettings = () => {
    console.log('Opening settings...');
    // In a real app, you would navigate to a settings page
    setView('settings'); // Assuming a 'settings' view exists
  };

  const handleProfileComplete = (profile) => {
    console.log('Profile completed:', profile);
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };

  const handleNavigateToMatches = () => {
    console.log('Navigating to matches...');
    setView('matches');
  };

  const renderContent = () => {
    if (isLoading) return (
      <div>
        {/* <SimpleTest />
        <TestGeminiDebug /> */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)'
        }}>
          <div className="loading-spinner-cool"></div>
          <p style={{ 
            marginTop: '30px', 
            fontSize: '18px', 
            color: '#20b2aa', 
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Welcome to RoomieConnect...
          </p>
        </div>
      </div>
    );
    
    switch (view) {
      case 'homeLoading':
        return (
          <div>
            {/* <SimpleTest />
        <TestGeminiDebug /> */}
            <div 
              className="home-loading-screen screen-transition" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Home loading screen clicked!');
                setView('welcome');
              }} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)',
                color: '#20b2aa',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                zIndex: 1000
              }}
            >
            {/* Home loading animation */}
            <div className="home-loading-container">
              <div className="home-loading-particles">
                <div className="home-particle"></div>
                <div className="home-particle"></div>
                <div className="home-particle"></div>
                <div className="home-particle"></div>
                <div className="home-particle"></div>
              </div>
              
              <div className="home-loading-logo">
                <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* New VR Headset Design */}
                  {/* Triangular roof */}
                  <polyline points="25,70 70,25 115,70" stroke="#6366f1" strokeWidth="6" fill="none" />
                  {/* Rectangular body */}
                  <rect x="35" y="70" width="70" height="45" rx="10" stroke="#6366f1" strokeWidth="6" fill="none" />
                  {/* Central inverted U opening */}
                  <path d="M50 95 Q70 100 90 95" stroke="#6366f1" strokeWidth="4" fill="none" />
                  {/* Two circular elements on sides */}
                  <circle cx="45" cy="80" r="5" fill="#6366f1" />
                  <circle cx="95" cy="80" r="5" fill="#6366f1" />
                </svg>
              </div>
              
              <div className="home-loading-text">
                ROOMIE<br/>CONNECT
              </div>
            </div>
            
            <p style={{ 
              marginTop: '40px', 
              fontSize: '16px', 
              color: '#20b2aa', 
              fontWeight: '400',
              textAlign: 'center',
              opacity: 0.8,
              animation: 'textPulse 2s ease-in-out infinite'
            }}>
              Click anywhere to start
            </p>
          </div>
        );
      case 'loading':
        return (
          <div className="custom-loading-screen" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)',
            color: '#20b2aa',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Custom RoomieConnect Loading Animation */}
            <div className="roomie-loading-container">
              {/* Floating Match Cards Animation */}
              <div className="floating-cards">
                <div className="floating-card card-1">
                  <div className="card-avatar">A</div>
                  <div className="card-info">
                    <div className="card-name">Alex</div>
                    <div className="card-score">95%</div>
                  </div>
                </div>
                <div className="floating-card card-2">
                  <div className="card-avatar">S</div>
                  <div className="card-info">
                    <div className="card-name">Sarah</div>
                    <div className="card-score">88%</div>
                  </div>
                </div>
                <div className="floating-card card-3">
                  <div className="card-avatar">M</div>
                  <div className="card-info">
                    <div className="card-name">Mike</div>
                    <div className="card-score">92%</div>
                  </div>
                </div>
                <div className="floating-card card-4">
                  <div className="card-avatar">J</div>
                  <div className="card-info">
                    <div className="card-name">Jordan</div>
                    <div className="card-score">87%</div>
                  </div>
                </div>
              </div>

              {/* Central Logo with Pulse Animation */}
              <div className="loading-logo-container">
                <div className="loading-logo">
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* House Icon */}
                    <path d="M60 20L20 50V90H40V70H80V90H100V50L60 20Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="2"/>
                    {/* Heart Icon */}
                    <path d="M60 100C60 100 45 85 35 75C25 65 25 50 35 40C45 30 60 40 60 40C60 40 75 30 85 40C95 50 95 65 85 75C75 85 60 100 60 100Z" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
                  </svg>
                </div>
                
                {/* Rotating Ring */}
                <div className="loading-ring"></div>
                <div className="loading-ring-2"></div>
              </div>

              {/* Loading Text with Typewriter Effect */}
              <div className="loading-text-container">
                <h1 className="loading-title">Finding Your Perfect Matches</h1>
                <div className="loading-subtitle">
                  <span className="loading-dots">Analyzing compatibility</span>
                  <span className="loading-dots-animated">...</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="custom-progress-container">
                <div className="custom-progress-bar">
                  <div className="custom-progress-fill"></div>
                </div>
                <div className="progress-text">Matching in progress...</div>
              </div>
            </div>

            {/* Background Particles */}
            <div className="loading-particles">
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
            </div>
          </div>
        );
      case 'login':
        return <Login onContinue={handleContinue} />;
      case 'chatbot':
        return (
          <Chatbot 
            currentUser={currentUser} 
            existingProfile={userProfile} 
            onResetToHome={resetToHome}
            onUpdateUser={handleUpdateUser}
            onProfileComplete={handleProfileComplete}
            onNavigateToMatches={handleNavigateToMatches}
          />
        );
      case 'matches':
        return <MatchResultsGrid 
          matches={matches} 
          onStartChat={handleStartChat} 
          currentUser={currentUser} 
          onResetToHome={resetToHome} 
          onOpenSettings={handleOpenSettings}
        />;
      case 'welcome':
      default:
        return (
          <div>
            {/* <SimpleTest />
        <TestGeminiDebug /> */}
            <div className="welcome-screen screen-transition" onClick={handleWelcomeContinue} style={{ cursor: 'pointer' }}>
            <div className="logo-container animated-logo">
                <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* New VR Headset Design */}
                  {/* Triangular roof */}
                  <polyline points="20,55 55,20 90,55" stroke="#6366f1" strokeWidth="5" fill="none" />
                  {/* Rectangular body */}
                  <rect x="28" y="55" width="54" height="35" rx="8" stroke="#6366f1" strokeWidth="5" fill="none" />
                  {/* Central inverted U opening */}
                  <path d="M40 75 Q55 80 70 75" stroke="#6366f1" strokeWidth="3" fill="none" />
                  {/* Two circular elements on sides */}
                  <circle cx="35" cy="65" r="4" fill="#6366f1" />
                  <circle cx="75" cy="65" r="4" fill="#6366f1" />
                </svg>
            </div>
            <h1 className="home-title">ROOMIE<br/>CONNECT</h1>
            <p className="home-subtitle">Click anywhere to start</p>
            {isAuthenticated && user && (
              <p className="welcome-back-message">Welcome Back, {getDisplayName()}</p>
            )}
            <AnimatedCredits />
            {isAuthenticated && (
              <button
                className="logout-corner-button"
                onClick={e => { e.stopPropagation(); handleLogout(); }}
                style={{ position: 'fixed', bottom: 20, right: 20, fontSize: 12, padding: '6px 12px', borderRadius: 16, background: '#eee', color: '#333', border: 'none', cursor: 'pointer', opacity: 0.7 }}
              >
                Log Out
              </button>
            )}
          </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
}

export default function WrappedApp() {
  const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;

  if (!auth0Domain || !auth0ClientId) {
    console.error('❌ Auth0 configuration missing. Please set REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID in your .env file');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Configuration Error</h2>
        <p>Auth0 credentials are not configured. Please check your .env file.</p>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <App />
    </Auth0Provider>
  );
}