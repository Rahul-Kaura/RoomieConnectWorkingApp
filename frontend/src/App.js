import React, { useState, useEffect } from 'react';
import Chatbot, { MatchResultsGrid } from './Chatbot';
import Login from './Login';
import HomePage from './HomePage';
import './App.css';
import { useAuth0 } from '@auth0/auth0-react';
import { loadProfile, saveProfile, monitorNewProfiles, stopListeningToProfiles } from './services/firebaseProfile';
import { testMessagingSetup } from './testMessaging';
// import { autoSyncTestProfiles } from './services/syncTestProfiles'; // Unused for now
import { generateMatches, createSampleProfiles } from './services/matchingService';
// import TestGeminiDebug from './TestGeminiDebug';
// import SimpleTest from './SimpleTest';

function App() {
  const { isAuthenticated, user, isLoading, logout } = useAuth0();
  const [view, setView] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_globalProfileMonitor, setGlobalProfileMonitor] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_isProfileLoading, setIsProfileLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [_profileLoadingStartTime, setProfileLoadingStartTime] = useState(null);
  const [matches, setMatches] = useState([]); // Added state for matches

  // Single source of truth for theme: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Sync theme to body class and localStorage whenever theme changes (runs on mount and when theme updates)
  useEffect(() => {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('dark-theme', !isLight);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // ignore localStorage errors (e.g. private browsing)
    }
  }, [theme]);

  const handleThemeChange = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };


  // Set currentUser from Auth0 user
  useEffect(() => {
    if (isAuthenticated && user && !currentUser) {
      // Check if user has a stored name in localStorage, otherwise use email as fallback
      const storedName = localStorage.getItem('userName');
      const userName = storedName || user.name || user.email;
      
      setCurrentUser({ id: user.sub, name: userName, email: user.email });
    }
    if (!isAuthenticated) {
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('userProfile');
      localStorage.removeItem('userName'); // Clear stale userName too
      setView('home');
    }
  }, [isAuthenticated, user, currentUser]);

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
      // Start profile loading timer
      setIsProfileLoading(true);
      setProfileLoadingStartTime(Date.now());
      
      (async () => {
        try {
          // First try to load from localStorage for faster loading
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            try {
              const parsedProfile = JSON.parse(storedProfile);
              // Only use localStorage profile if it matches the current user
              if (parsedProfile.id === currentUser.id) {
                setUserProfile(parsedProfile);
                // Profile loaded quickly from localStorage
                setIsProfileLoading(false);
                return; // Early return if localStorage profile is valid
              }
            } catch (e) {
              // Error parsing localStorage profile
            }
          }
          
          // Then try to load from Firebase (this will override localStorage if different)
        const profile = await loadProfile(currentUser.id);
        if (profile) {
          setUserProfile(profile);
          localStorage.setItem('userProfile', JSON.stringify(profile));
            
            // Generate matches for this profile
            try {
              const userMatches = await generateMatches(profile);
              setMatches(userMatches);
            } catch (error) {
              // Error generating matches
            }
        } else {
            // Check if we have any localStorage profile even if it doesn't match exactly
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              try {
                const parsedProfile = JSON.parse(storedProfile);
                setUserProfile(parsedProfile);
              } catch (e) {
                // Cannot parse localStorage fallback profile
              }
            }
          }
        } catch (error) {
          // Try to use localStorage profile as fallback
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            try {
              const parsedProfile = JSON.parse(storedProfile);
              setUserProfile(parsedProfile);
            } catch (e) {
              // Cannot parse localStorage profile after error
            }
          }
        }
        
        // Profile loading complete (either success or failure)
        setIsProfileLoading(false);
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
        await createSampleProfiles();
      } catch (error) {
        // Error creating sample profiles
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // When opening matches view, load profiles from backend (Firebase) and refresh matches
  useEffect(() => {
    if (view !== 'matches' || !currentUser?.id || !userProfile) return;
    (async () => {
      try {
        const profile = await loadProfile(currentUser.id);
        const profileToUse = profile || userProfile;
        if (profile) {
          setUserProfile(profile);
          localStorage.setItem('userProfile', JSON.stringify(profile));
        }
        const userMatches = await generateMatches(profileToUse);
        setMatches(userMatches);
      } catch (e) {
        try {
          const userMatches = await generateMatches(userProfile);
          setMatches(userMatches);
        } catch (err) {
          // keep existing matches on error
        }
      }
    })();
  }, [view, currentUser?.id]);

  // Global profile monitoring for all users
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.id) {
      // Monitor for new profiles globally
      const monitor = monitorNewProfiles((newProfiles, allProfiles) => {
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
        }
      });
      
      setGlobalProfileMonitor(monitor);
      
      return () => {
        if (monitor) {
          stopListeningToProfiles(monitor);
        }
      };
    }
  }, [isAuthenticated, currentUser, view]);

  const handleWelcomeContinue = () => {
    if (isAuthenticated) {
      if (userProfile) {
        // Start custom loading screen for 5 seconds
        setView('loading');
        
        // Simple 5-second loading timer
        setTimeout(() => {
          setView('matches');
        }, 5000); // 5 seconds
        
      } else {
        setView('chatbot');
      }
    } else {
      setView('login');
    }
  };

  const handleContinue = () => {
    if (userProfile) {
      setView('matches');
    } else {
      setView('chatbot');
    }
  };

  const handleLogout = () => {
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
    // Update the user profile state
    setUserProfile(updatedProfile);
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // Persist to Firebase so profile is stored
    if (updatedProfile?.id) {
      try {
        await saveProfile(updatedProfile);
      } catch (e) {
        console.error('Failed to save profile to Firebase:', e);
      }
    }
    
    // Generate matches for the updated profile
    try {
      const userMatches = await generateMatches(updatedProfile);
      setMatches(userMatches);
      
      // Navigate to matches view
      setView('matches');
    } catch (error) {
      // Still navigate to matches even if generation fails
      setView('matches');
    }
  };

  const resetToHome = () => {
    setView('home');
  };

  const handleStartChat = (match) => {
    // For now, show an alert with match info instead of going to chatbot
    alert(`Starting chat with ${match.name}!\n\nThis would open a chat window in a real app.\n\nMatch details:\n- Compatibility: ${match.compatibilityScore}%\n- Major: ${match.major}\n- Bio: ${match.bio || 'No bio available'}`);
  };

  const handleOpenSettings = () => {
    // In a real app, you would navigate to a settings page
    setView('settings'); // Assuming a 'settings' view exists
  };

  const handleProfileComplete = async (profile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));
    // Persist to Firebase so created/completed profile is stored
    if (profile?.id) {
      try {
        await saveProfile(profile);
      } catch (e) {
        console.error('Failed to save profile to Firebase:', e);
      }
    }
  };

  const handleNavigateToMatches = () => {
    setView('matches');
  };

  const renderContent = () => {
    if (isLoading) return (
      <div>
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
      case 'home':
        return (
          <HomePage
            isAuthenticated={isAuthenticated}
            getDisplayName={getDisplayName}
            onLogin={() => setView('login')}
            onLogout={handleLogout}
            onContinue={handleWelcomeContinue}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        );
      case 'loading':
        return (
          <div className="custom-loading-screen" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            background: '#0a0a0a',
            color: '#20b2aa',
            position: 'fixed',
            top: 0,
            left: 0,
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
                  <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="25,70 70,25 115,70" stroke="#6366f1" strokeWidth="6" fill="none" />
                    <rect x="35" y="70" width="70" height="45" rx="10" stroke="#6366f1" strokeWidth="6" fill="none" />
                    <path d="M50 95 Q70 100 90 95" stroke="#6366f1" strokeWidth="4" fill="none" />
                    <circle cx="45" cy="80" r="5" fill="#6366f1" />
                    <circle cx="95" cy="80" r="5" fill="#6366f1" />
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
          userProfile={userProfile}
          onStartChat={handleStartChat} 
          currentUser={currentUser} 
          onResetToHome={resetToHome} 
          onOpenSettings={handleOpenSettings}
        />;
      default:
        return (
          <HomePage
            isAuthenticated={isAuthenticated}
            getDisplayName={getDisplayName}
            onLogin={() => setView('login')}
            onLogout={handleLogout}
            onContinue={handleWelcomeContinue}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
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
